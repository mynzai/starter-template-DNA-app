use axum::{extract::State, http::StatusCode, response::Response};
use metrics::{counter, gauge, histogram, register_counter, register_gauge, register_histogram};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use std::{sync::Arc, time::Instant};
use tokio::time::{Duration, interval};
use tracing::{error, info, warn};

use crate::{config::MetricsConfig, AppState};

static mut PROMETHEUS_HANDLE: Option<PrometheusHandle> = None;

/// Initialize the metrics system
pub fn init_metrics(config: &MetricsConfig) -> anyhow::Result<()> {
    if !config.enabled {
        info!("Metrics collection is disabled");
        return Ok(());
    }

    info!("Initializing metrics collection");

    let builder = PrometheusBuilder::new();
    let handle = builder.install()?;

    unsafe {
        PROMETHEUS_HANDLE = Some(handle);
    }

    // Register core metrics
    register_core_metrics();

    info!("Metrics system initialized successfully");
    Ok(())
}

/// Register core application metrics
fn register_core_metrics() {
    // HTTP request metrics
    register_counter!("http_requests_total", "Total number of HTTP requests");
    register_histogram!("http_request_duration_seconds", "HTTP request duration in seconds");
    register_counter!("http_requests_errors_total", "Total number of HTTP request errors");

    // Database metrics
    register_gauge!("database_connections_active", "Number of active database connections");
    register_gauge!("database_connections_idle", "Number of idle database connections");
    register_histogram!("database_query_duration_seconds", "Database query duration in seconds");
    register_counter!("database_queries_total", "Total number of database queries");

    // Redis metrics
    register_gauge!("redis_connections_active", "Number of active Redis connections");
    register_counter!("redis_commands_total", "Total number of Redis commands");
    register_histogram!("redis_command_duration_seconds", "Redis command duration in seconds");

    // Rate limiting metrics
    register_counter!("rate_limit_hits_total", "Total number of rate limit hits");
    register_counter!("rate_limit_misses_total", "Total number of requests allowed");

    // Performance metrics
    register_gauge!("memory_usage_bytes", "Memory usage in bytes");
    register_gauge!("cpu_usage_percentage", "CPU usage percentage");
    register_gauge!("requests_per_second", "Current requests per second");

    // GraphQL metrics
    register_counter!("graphql_queries_total", "Total number of GraphQL queries");
    register_histogram!("graphql_query_duration_seconds", "GraphQL query duration in seconds");
    register_counter!("graphql_errors_total", "Total number of GraphQL errors");

    // Business metrics
    register_gauge!("active_users", "Number of currently active users");
    register_counter!("api_operations_total", "Total number of API operations");
}

/// Start the metrics collection server
pub async fn start_metrics_server(config: &MetricsConfig) -> anyhow::Result<()> {
    if !config.enabled {
        return Ok(());
    }

    let bind_addr = format!("{}:{}", config.host, config.port);
    info!("Starting metrics server on {}", bind_addr);

    let app = axum::Router::new()
        .route(&config.path, axum::routing::get(metrics_handler));

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    
    axum::serve(listener, app)
        .await?;

    Ok(())
}

/// Metrics endpoint handler
pub async fn metrics_handler() -> Result<Response<String>, StatusCode> {
    unsafe {
        if let Some(handle) = &PROMETHEUS_HANDLE {
            let metrics = handle.render();
            Ok(Response::builder()
                .header("content-type", "text/plain; version=0.0.4")
                .body(metrics)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?)
        } else {
            Err(StatusCode::SERVICE_UNAVAILABLE)
        }
    }
}

/// Record HTTP request metrics
pub fn record_http_request(
    method: &str,
    path: &str,
    status_code: u16,
    duration: Duration,
) {
    let labels = [
        ("method", method),
        ("path", path),
        ("status", &status_code.to_string()),
    ];

    counter!("http_requests_total", &labels).increment(1);
    histogram!("http_request_duration_seconds", &labels).record(duration.as_secs_f64());

    if status_code >= 400 {
        counter!("http_requests_errors_total", &labels).increment(1);
    }
}

/// Record database metrics
pub fn record_database_query(query_type: &str, duration: Duration, success: bool) {
    let labels = [
        ("query_type", query_type),
        ("success", if success { "true" } else { "false" }),
    ];

    counter!("database_queries_total", &labels).increment(1);
    histogram!("database_query_duration_seconds", &labels).record(duration.as_secs_f64());
}

/// Record Redis metrics
pub fn record_redis_command(command: &str, duration: Duration, success: bool) {
    let labels = [
        ("command", command),
        ("success", if success { "true" } else { "false" }),
    ];

    counter!("redis_commands_total", &labels).increment(1);
    histogram!("redis_command_duration_seconds", &labels).record(duration.as_secs_f64());
}

/// Record rate limiting metrics
pub fn record_rate_limit_hit(identifier: &str) {
    let labels = [("identifier_type", identifier)];
    counter!("rate_limit_hits_total", &labels).increment(1);
}

pub fn record_rate_limit_miss(identifier: &str) {
    let labels = [("identifier_type", identifier)];
    counter!("rate_limit_misses_total", &labels).increment(1);
}

/// Record GraphQL metrics
pub fn record_graphql_query(query_name: &str, duration: Duration, success: bool) {
    let labels = [
        ("query", query_name),
        ("success", if success { "true" } else { "false" }),
    ];

    counter!("graphql_queries_total", &labels).increment(1);
    histogram!("graphql_query_duration_seconds", &labels).record(duration.as_secs_f64());

    if !success {
        counter!("graphql_errors_total", &labels).increment(1);
    }
}

/// Update system resource metrics
pub fn update_system_metrics(state: &AppState) {
    // Database connection metrics
    let db_stats = state.db.size();
    let db_idle = state.db.num_idle();
    gauge!("database_connections_active").set((db_stats - db_idle) as f64);
    gauge!("database_connections_idle").set(db_idle as f64);

    // Redis connection metrics  
    let redis_status = state.redis.status();
    gauge!("redis_connections_active").set((redis_status.size - redis_status.available) as f64);

    // Memory usage (if jemalloc is available)
    if let Ok(memory_usage) = get_memory_usage() {
        gauge!("memory_usage_bytes").set(memory_usage as f64);
    }

    // CPU usage (simplified)
    if let Ok(cpu_usage) = get_cpu_usage() {
        gauge!("cpu_usage_percentage").set(cpu_usage);
    }
}

/// Get current memory usage in bytes
#[cfg(feature = "jemalloc")]
fn get_memory_usage() -> anyhow::Result<usize> {
    use jemalloc_ctl::{stats, epoch};
    
    epoch::advance()?;
    let allocated = stats::allocated::read()?;
    Ok(allocated)
}

#[cfg(not(feature = "jemalloc"))]
fn get_memory_usage() -> anyhow::Result<usize> {
    // Fallback: return 0 if jemalloc is not available
    Ok(0)
}

/// Get current CPU usage percentage (simplified implementation)
fn get_cpu_usage() -> anyhow::Result<f64> {
    // This is a simplified implementation
    // In production, you might want to use a more sophisticated approach
    // like reading from /proc/stat on Linux or using system APIs
    
    static mut LAST_MEASUREMENT: Option<Instant> = None;
    static mut LAST_CPU_TIME: std::time::Duration = std::time::Duration::ZERO;
    
    unsafe {
        let now = Instant::now();
        if let Some(last_time) = LAST_MEASUREMENT {
            let elapsed = now.duration_since(last_time);
            if elapsed > Duration::from_secs(1) {
                LAST_MEASUREMENT = Some(now);
                // This is a placeholder - implement actual CPU measurement
                return Ok(50.0); // Return 50% as placeholder
            }
        } else {
            LAST_MEASUREMENT = Some(now);
        }
    }
    
    Ok(0.0)
}

/// Performance metrics collector
pub struct PerformanceCollector {
    request_count: Arc<std::sync::atomic::AtomicU64>,
    last_measurement: Arc<std::sync::Mutex<Instant>>,
}

impl PerformanceCollector {
    pub fn new() -> Self {
        Self {
            request_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            last_measurement: Arc::new(std::sync::Mutex::new(Instant::now())),
        }
    }

    pub fn record_request(&self) {
        self.request_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn calculate_rps(&self) -> f64 {
        let mut last_time = self.last_measurement.lock().unwrap();
        let now = Instant::now();
        let elapsed = now.duration_since(*last_time);
        
        if elapsed >= Duration::from_secs(1) {
            let count = self.request_count.swap(0, std::sync::atomic::Ordering::Relaxed);
            *last_time = now;
            
            let rps = count as f64 / elapsed.as_secs_f64();
            gauge!("requests_per_second").set(rps);
            
            rps
        } else {
            0.0
        }
    }
}

/// Start background metrics collection
pub async fn start_metrics_collection(state: AppState, config: MetricsConfig) {
    if !config.enabled {
        return;
    }

    info!("Starting background metrics collection");
    let mut interval = interval(config.collection_interval);

    loop {
        interval.tick().await;
        
        tokio::spawn({
            let state = state.clone();
            async move {
                collect_system_metrics(&state).await;
            }
        });
    }
}

async fn collect_system_metrics(state: &AppState) {
    // Update system resource metrics
    update_system_metrics(state);

    // Collect database performance metrics
    collect_database_metrics(state).await;

    // Collect Redis performance metrics
    collect_redis_metrics(state).await;

    // Update business metrics
    update_business_metrics(state).await;
}

async fn collect_database_metrics(state: &AppState) {
    let start = Instant::now();
    
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE is_active = true")
        .fetch_one(&state.db)
        .await
    {
        Ok(count) => {
            gauge!("active_users").set(count as f64);
            record_database_query("count_active_users", start.elapsed(), true);
        }
        Err(e) => {
            warn!("Failed to collect user metrics: {}", e);
            record_database_query("count_active_users", start.elapsed(), false);
        }
    }
}

async fn collect_redis_metrics(state: &AppState) {
    let start = Instant::now();
    
    match state.redis.get().await {
        Ok(mut conn) => {
            match redis::cmd("INFO").query_async::<_, String>(&mut conn).await {
                Ok(_) => {
                    record_redis_command("info", start.elapsed(), true);
                }
                Err(e) => {
                    warn!("Redis INFO command failed: {}", e);
                    record_redis_command("info", start.elapsed(), false);
                }
            }
        }
        Err(e) => {
            warn!("Failed to get Redis connection for metrics: {}", e);
            record_redis_command("connection", start.elapsed(), false);
        }
    }
}

async fn update_business_metrics(state: &AppState) {
    // Update API operations counter based on recent activity
    // This would typically query your application-specific metrics
    
    // Example: Count API operations in the last minute
    match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM performance_metrics WHERE timestamp > NOW() - INTERVAL '1 minute'"
    )
    .fetch_one(&state.db)
    .await
    {
        Ok(count) => {
            counter!("api_operations_total").increment(count as u64);
        }
        Err(e) => {
            warn!("Failed to collect API operation metrics: {}", e);
        }
    }
}

/// Get current metrics summary
pub async fn get_current_metrics() -> serde_json::Value {
    unsafe {
        if let Some(handle) = &PROMETHEUS_HANDLE {
            let metrics_text = handle.render();
            
            // Parse key metrics from Prometheus format
            let mut parsed_metrics = serde_json::Map::new();
            
            for line in metrics_text.lines() {
                if line.starts_with("http_requests_total") {
                    if let Some(value) = extract_metric_value(line) {
                        parsed_metrics.insert("total_requests".to_string(), value.into());
                    }
                } else if line.starts_with("requests_per_second") {
                    if let Some(value) = extract_metric_value(line) {
                        parsed_metrics.insert("requests_per_second".to_string(), value.into());
                    }
                } else if line.starts_with("memory_usage_bytes") {
                    if let Some(value) = extract_metric_value(line) {
                        parsed_metrics.insert("memory_usage_bytes".to_string(), value.into());
                    }
                }
            }
            
            serde_json::Value::Object(parsed_metrics)
        } else {
            serde_json::json!({
                "error": "Metrics system not initialized"
            })
        }
    }
}

fn extract_metric_value(line: &str) -> Option<f64> {
    line.split_whitespace()
        .last()
        .and_then(|s| s.parse().ok())
}

/// Middleware for automatic metrics collection
pub struct MetricsMiddleware {
    collector: Arc<PerformanceCollector>,
}

impl MetricsMiddleware {
    pub fn new() -> Self {
        Self {
            collector: Arc::new(PerformanceCollector::new()),
        }
    }

    pub fn record_request(&self) {
        self.collector.record_request();
    }

    pub fn get_current_rps(&self) -> f64 {
        self.collector.calculate_rps()
    }
}

impl Default for MetricsMiddleware {
    fn default() -> Self {
        Self::new()
    }
}