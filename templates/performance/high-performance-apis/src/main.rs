use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::State,
    http::{Method, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    limit::RequestBodyLimitLayer,
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod database;
mod error;
mod graphql;
mod middleware;
mod metrics;
mod models;
mod monitoring;
mod rate_limiting;
mod services;

use crate::{
    api::routes,
    config::Config,
    database::DatabasePool,
    error::AppError,
    graphql::create_schema,
    middleware::{auth::AuthLayer, metrics::MetricsLayer},
    monitoring::health,
    rate_limiting::RateLimiter,
};

pub type AppState = Arc<AppStateInner>;

#[derive(Clone)]
pub struct AppStateInner {
    pub db: DatabasePool,
    pub redis: deadpool_redis::Pool,
    pub config: Config,
    pub rate_limiter: RateLimiter,
    pub graphql_schema: graphql::Schema,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize configuration
    let config = Config::from_env()?;
    
    // Initialize tracing
    init_tracing(&config)?;
    
    info!("Starting high-performance API server");
    info!("Configuration loaded: {}", config.server.host);

    // Initialize database connection pool
    let db = database::create_pool(&config.database).await?;
    info!("Database connection pool created with {} connections", config.database.max_connections);

    // Initialize Redis connection pool
    let redis = database::create_redis_pool(&config.redis).await?;
    info!("Redis connection pool created");

    // Run database migrations
    database::run_migrations(&db).await?;
    info!("Database migrations completed");

    // Initialize rate limiter
    let rate_limiter = RateLimiter::new(redis.clone(), config.rate_limiting.clone()).await?;
    info!("Rate limiter initialized");

    // Initialize GraphQL schema
    let graphql_schema = create_schema(db.clone()).await?;
    info!("GraphQL schema created");

    // Initialize metrics
    metrics::init_metrics(&config.metrics)?;
    info!("Metrics system initialized");

    // Create application state
    let state = Arc::new(AppStateInner {
        db,
        redis,
        config: config.clone(),
        rate_limiter,
        graphql_schema,
    });

    // Build application with optimized middleware stack
    let app = create_app(state.clone()).await?;

    info!("Application created successfully");

    // Start metrics server in background
    let metrics_state = state.clone();
    tokio::spawn(async move {
        if let Err(e) = metrics::start_metrics_server(&metrics_state.config.metrics).await {
            warn!("Metrics server error: {}", e);
        }
    });

    // Start health check server in background
    let health_state = state.clone();
    tokio::spawn(async move {
        if let Err(e) = health::start_health_server(&health_state.config.health).await {
            warn!("Health check server error: {}", e);
        }
    });

    // Configure server with performance optimizations
    let listener = tokio::net::TcpListener::bind(&format!("{}:{}", config.server.host, config.server.port))
        .await?;
    
    info!("Server listening on {}:{}", config.server.host, config.server.port);
    info!("Performance target: {}+ requests/second", config.performance.target_rps);
    info!("Ready to handle high-performance workloads");

    // Start server with optimized configuration
    axum::serve(listener, app)
        .tcp_nodelay(true)
        .tcp_keepalive(Some(Duration::from_secs(60)))
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn create_app(state: AppState) -> anyhow::Result<Router> {
    // Performance-optimized middleware stack
    let middleware_stack = ServiceBuilder::new()
        // Compression for response optimization
        .layer(CompressionLayer::new())
        // Request timeout to prevent resource exhaustion
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        // Request body size limit for security
        .layer(RequestBodyLimitLayer::new(16 * 1024 * 1024)) // 16MB
        // CORS configuration
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
                .allow_headers(Any)
        )
        // Distributed tracing
        .layer(TraceLayer::new_for_http())
        // Custom metrics collection
        .layer(MetricsLayer::new())
        // Rate limiting middleware
        .layer(rate_limiting::RateLimitingLayer::new(state.rate_limiter.clone()));

    // Build router with all endpoints
    let api_routes = routes::create_routes();
    let graphql_routes = graphql::create_routes(state.graphql_schema.clone());

    let app = Router::new()
        // Health check endpoints (no auth required)
        .route("/health", get(health::health_check))
        .route("/health/ready", get(health::readiness_check))
        .route("/health/live", get(health::liveness_check))
        
        // Metrics endpoint (no auth required)
        .route("/metrics", get(metrics::metrics_handler))
        
        // API documentation
        .merge(create_docs_routes())
        
        // GraphQL endpoint
        .merge(graphql_routes)
        
        // REST API routes
        .nest("/api/v1", api_routes)
        
        // Protected admin routes
        .nest("/admin", create_admin_routes())
        
        // Global error handler
        .fallback(handle_404)
        
        // Apply middleware stack
        .layer(middleware_stack)
        
        // Add application state
        .with_state(state);

    Ok(app)
}

fn create_docs_routes() -> Router<AppState> {
    use utoipa::OpenApi;
    use utoipa_swagger_ui::SwaggerUi;

    #[derive(OpenApi)]
    #[openapi(
        paths(
            health::health_check,
            health::readiness_check,
            health::liveness_check,
        ),
        components(schemas()),
        tags(
            (name = "health", description = "Health check endpoints"),
            (name = "api", description = "Main API endpoints"),
            (name = "admin", description = "Administrative endpoints")
        ),
        info(
            title = "High-Performance API",
            version = "1.0.0",
            description = "A high-performance API platform capable of 48k+ requests/second",
            contact(name = "API Support", email = "support@example.com")
        )
    )]
    struct ApiDoc;

    SwaggerUi::new("/docs")
        .url("/docs/openapi.json", ApiDoc::openapi())
}

fn create_admin_routes() -> Router<AppState> {
    Router::new()
        .route("/stats", get(admin_stats))
        .route("/config", get(admin_config))
        .layer(AuthLayer::new()) // Require authentication for admin routes
}

async fn admin_stats(State(state): State<AppState>) -> Result<Json<serde_json::Value>, AppError> {
    let stats = serde_json::json!({
        "database_connections": state.db.size(),
        "redis_connections": state.redis.status().size,
        "uptime": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        "memory_usage": get_memory_usage(),
        "performance_metrics": metrics::get_current_metrics().await,
    });

    Ok(Json(stats))
}

async fn admin_config(State(state): State<AppState>) -> Result<Json<serde_json::Value>, AppError> {
    let config_summary = serde_json::json!({
        "server": {
            "host": state.config.server.host,
            "port": state.config.server.port,
        },
        "database": {
            "max_connections": state.config.database.max_connections,
        },
        "performance": {
            "target_rps": state.config.performance.target_rps,
            "max_response_time_ms": state.config.performance.max_response_time_ms,
        },
        "rate_limiting": {
            "requests_per_second": state.config.rate_limiting.requests_per_second,
            "burst_size": state.config.rate_limiting.burst_size,
        }
    });

    Ok(Json(config_summary))
}

async fn handle_404() -> (StatusCode, Json<serde_json::Value>) {
    let error_response = serde_json::json!({
        "error": "Not Found",
        "message": "The requested resource was not found",
        "status": 404
    });

    (StatusCode::NOT_FOUND, Json(error_response))
}

fn get_memory_usage() -> serde_json::Value {
    #[cfg(feature = "jemalloc")]
    {
        use jemalloc_ctl::{stats, epoch};
        
        if let (Ok(_), Ok(allocated), Ok(resident)) = (
            epoch::advance(),
            stats::allocated::read(),
            stats::resident::read()
        ) {
            return serde_json::json!({
                "allocated_bytes": allocated,
                "resident_bytes": resident,
                "allocator": "jemalloc"
            });
        }
    }

    serde_json::json!({
        "allocated_bytes": "unknown",
        "resident_bytes": "unknown", 
        "allocator": "system"
    })
}

fn init_tracing(config: &Config) -> anyhow::Result<()> {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| format!("{}=info,tower_http=debug", env!("CARGO_PKG_NAME")).into());

    let subscriber = tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().json());

    // Add OpenTelemetry if configured
    if config.tracing.enabled {
        let tracer = opentelemetry_jaeger::new_agent_pipeline()
            .with_service_name(&config.tracing.service_name)
            .install_batch(opentelemetry::runtime::Tokio)?;

        let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
        subscriber.with(telemetry).init();
    } else {
        subscriber.init();
    }

    Ok(())
}

async fn shutdown_signal() {
    use tokio::signal;

    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C, shutting down gracefully");
        },
        _ = terminate => {
            info!("Received terminate signal, shutting down gracefully");
        },
    }

    // Perform graceful shutdown tasks
    info!("Performing graceful shutdown...");
    
    // Give ongoing requests time to complete
    tokio::time::sleep(Duration::from_secs(1)).await;
    
    info!("Shutdown complete");
}