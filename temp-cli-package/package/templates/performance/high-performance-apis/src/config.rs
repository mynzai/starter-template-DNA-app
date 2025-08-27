use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub rate_limiting: RateLimitingConfig,
    pub metrics: MetricsConfig,
    pub health: HealthConfig,
    pub performance: PerformanceConfig,
    pub tracing: TracingConfig,
    pub security: SecurityConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: Option<usize>,
    pub keep_alive: Duration,
    pub client_timeout: Duration,
    pub client_shutdown: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub max_lifetime: Duration,
    pub idle_timeout: Duration,
    pub acquire_timeout: Duration,
    pub sqlx_logging: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConfig {
    pub url: String,
    pub max_size: usize,
    pub timeouts: RedisTimeouts,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisTimeouts {
    pub wait: Duration,
    pub create: Duration,
    pub recycle: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitingConfig {
    pub enabled: bool,
    pub requests_per_second: u32,
    pub burst_size: u32,
    pub redis_key_prefix: String,
    pub cleanup_interval: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    pub path: String,
    pub collection_interval: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    pub database_check: bool,
    pub redis_check: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    pub target_rps: u32,
    pub max_response_time_ms: u64,
    pub enable_compression: bool,
    pub enable_http2: bool,
    pub connection_pool_size: usize,
    pub worker_threads: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TracingConfig {
    pub enabled: bool,
    pub service_name: String,
    pub jaeger_endpoint: Option<String>,
    pub sample_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub jwt_secret: String,
    pub jwt_expiration: Duration,
    pub bcrypt_cost: u32,
    pub cors_origins: Vec<String>,
    pub trusted_proxies: Vec<String>,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenvy::dotenv().ok();

        let config = Config {
            server: ServerConfig {
                host: std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: std::env::var("SERVER_PORT")
                    .unwrap_or_else(|_| "3000".to_string())
                    .parse()?,
                workers: std::env::var("SERVER_WORKERS")
                    .ok()
                    .and_then(|v| v.parse().ok()),
                keep_alive: Duration::from_secs(
                    std::env::var("SERVER_KEEP_ALIVE_SECS")
                        .unwrap_or_else(|_| "60".to_string())
                        .parse()?
                ),
                client_timeout: Duration::from_secs(
                    std::env::var("SERVER_CLIENT_TIMEOUT_SECS")
                        .unwrap_or_else(|_| "30".to_string())
                        .parse()?
                ),
                client_shutdown: Duration::from_secs(
                    std::env::var("SERVER_CLIENT_SHUTDOWN_SECS")
                        .unwrap_or_else(|_| "5".to_string())
                        .parse()?
                ),
            },
            
            database: DatabaseConfig {
                url: std::env::var("DATABASE_URL")
                    .unwrap_or_else(|_| "{{databaseUrl}}".to_string()),
                max_connections: std::env::var("DATABASE_MAX_CONNECTIONS")
                    .unwrap_or_else(|_| "{{maxConnections}}".to_string())
                    .parse()?,
                min_connections: std::env::var("DATABASE_MIN_CONNECTIONS")
                    .unwrap_or_else(|_| "5".to_string())
                    .parse()?,
                max_lifetime: Duration::from_secs(
                    std::env::var("DATABASE_MAX_LIFETIME_SECS")
                        .unwrap_or_else(|_| "3600".to_string())
                        .parse()?
                ),
                idle_timeout: Duration::from_secs(
                    std::env::var("DATABASE_IDLE_TIMEOUT_SECS")
                        .unwrap_or_else(|_| "600".to_string())
                        .parse()?
                ),
                acquire_timeout: Duration::from_secs(
                    std::env::var("DATABASE_ACQUIRE_TIMEOUT_SECS")
                        .unwrap_or_else(|_| "30".to_string())
                        .parse()?
                ),
                sqlx_logging: std::env::var("DATABASE_SQLX_LOGGING")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
            },

            redis: RedisConfig {
                url: std::env::var("REDIS_URL")
                    .unwrap_or_else(|_| "{{redisUrl}}".to_string()),
                max_size: std::env::var("REDIS_MAX_SIZE")
                    .unwrap_or_else(|_| "50".to_string())
                    .parse()?,
                timeouts: RedisTimeouts {
                    wait: Duration::from_secs(
                        std::env::var("REDIS_WAIT_TIMEOUT_SECS")
                            .unwrap_or_else(|_| "30".to_string())
                            .parse()?
                    ),
                    create: Duration::from_secs(
                        std::env::var("REDIS_CREATE_TIMEOUT_SECS")
                            .unwrap_or_else(|_| "30".to_string())
                            .parse()?
                    ),
                    recycle: Duration::from_secs(
                        std::env::var("REDIS_RECYCLE_TIMEOUT_SECS")
                            .unwrap_or_else(|_| "30".to_string())
                            .parse()?
                    ),
                },
            },

            rate_limiting: RateLimitingConfig {
                enabled: std::env::var("RATE_LIMITING_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
                requests_per_second: std::env::var("RATE_LIMITING_RPS")
                    .unwrap_or_else(|_| "{{rateLimitRps}}".to_string())
                    .parse()?,
                burst_size: std::env::var("RATE_LIMITING_BURST_SIZE")
                    .unwrap_or_else(|_| "5000".to_string())
                    .parse()?,
                redis_key_prefix: std::env::var("RATE_LIMITING_REDIS_PREFIX")
                    .unwrap_or_else(|_| "rl:".to_string()),
                cleanup_interval: Duration::from_secs(
                    std::env::var("RATE_LIMITING_CLEANUP_INTERVAL_SECS")
                        .unwrap_or_else(|_| "300".to_string())
                        .parse()?
                ),
            },

            metrics: MetricsConfig {
                enabled: std::env::var("METRICS_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
                host: std::env::var("METRICS_HOST")
                    .unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: std::env::var("METRICS_PORT")
                    .unwrap_or_else(|_| "9090".to_string())
                    .parse()?,
                path: std::env::var("METRICS_PATH")
                    .unwrap_or_else(|_| "/metrics".to_string()),
                collection_interval: Duration::from_secs(
                    std::env::var("METRICS_COLLECTION_INTERVAL_SECS")
                        .unwrap_or_else(|_| "15".to_string())
                        .parse()?
                ),
            },

            health: HealthConfig {
                enabled: std::env::var("HEALTH_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
                host: std::env::var("HEALTH_HOST")
                    .unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: std::env::var("HEALTH_PORT")
                    .unwrap_or_else(|_| "8080".to_string())
                    .parse()?,
                database_check: std::env::var("HEALTH_DATABASE_CHECK")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
                redis_check: std::env::var("HEALTH_REDIS_CHECK")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
            },

            performance: PerformanceConfig {
                target_rps: std::env::var("PERFORMANCE_TARGET_RPS")
                    .unwrap_or_else(|_| "48000".to_string())
                    .parse()?,
                max_response_time_ms: std::env::var("PERFORMANCE_MAX_RESPONSE_TIME_MS")
                    .unwrap_or_else(|_| "50".to_string())
                    .parse()?,
                enable_compression: std::env::var("PERFORMANCE_ENABLE_COMPRESSION")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
                enable_http2: std::env::var("PERFORMANCE_ENABLE_HTTP2")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()?,
                connection_pool_size: std::env::var("PERFORMANCE_CONNECTION_POOL_SIZE")
                    .unwrap_or_else(|_| "1000".to_string())
                    .parse()?,
                worker_threads: std::env::var("PERFORMANCE_WORKER_THREADS")
                    .ok()
                    .and_then(|v| v.parse().ok()),
            },

            tracing: TracingConfig {
                enabled: std::env::var("TRACING_ENABLED")
                    .unwrap_or_else(|_| "false".to_string())
                    .parse()?,
                service_name: std::env::var("TRACING_SERVICE_NAME")
                    .unwrap_or_else(|_| "high-performance-api".to_string()),
                jaeger_endpoint: std::env::var("TRACING_JAEGER_ENDPOINT").ok(),
                sample_rate: std::env::var("TRACING_SAMPLE_RATE")
                    .unwrap_or_else(|_| "0.1".to_string())
                    .parse()?,
            },

            security: SecurityConfig {
                jwt_secret: std::env::var("JWT_SECRET")
                    .unwrap_or_else(|_| "your-super-secret-jwt-key".to_string()),
                jwt_expiration: Duration::from_secs(
                    std::env::var("JWT_EXPIRATION_SECS")
                        .unwrap_or_else(|_| "3600".to_string())
                        .parse()?
                ),
                bcrypt_cost: std::env::var("BCRYPT_COST")
                    .unwrap_or_else(|_| "12".to_string())
                    .parse()?,
                cors_origins: std::env::var("CORS_ORIGINS")
                    .unwrap_or_else(|_| "*".to_string())
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .collect(),
                trusted_proxies: std::env::var("TRUSTED_PROXIES")
                    .unwrap_or_else(|_| "".to_string())
                    .split(',')
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_string())
                    .collect(),
            },
        };

        // Validate configuration
        config.validate()?;

        Ok(config)
    }

    fn validate(&self) -> anyhow::Result<()> {
        // Validate server configuration
        if self.server.port == 0 {
            anyhow::bail!("Server port cannot be 0");
        }

        // Validate database configuration
        if self.database.max_connections < self.database.min_connections {
            anyhow::bail!("Database max_connections must be >= min_connections");
        }

        // Validate performance targets
        if self.performance.target_rps < 1000 {
            anyhow::bail!("Performance target RPS should be at least 1000 for high-performance scenarios");
        }

        if self.performance.max_response_time_ms > 1000 {
            anyhow::bail!("Max response time should be <= 1000ms for high-performance scenarios");
        }

        // Validate rate limiting
        if self.rate_limiting.enabled && self.rate_limiting.requests_per_second == 0 {
            anyhow::bail!("Rate limiting requests_per_second cannot be 0 when enabled");
        }

        // Validate security
        if self.security.jwt_secret.len() < 32 {
            anyhow::bail!("JWT secret should be at least 32 characters long");
        }

        if self.security.bcrypt_cost < 10 || self.security.bcrypt_cost > 15 {
            anyhow::bail!("BCrypt cost should be between 10 and 15");
        }

        // Validate tracing
        if self.tracing.enabled && self.tracing.jaeger_endpoint.is_none() {
            anyhow::bail!("Tracing is enabled but no Jaeger endpoint specified");
        }

        if self.tracing.sample_rate < 0.0 || self.tracing.sample_rate > 1.0 {
            anyhow::bail!("Tracing sample rate must be between 0.0 and 1.0");
        }

        Ok(())
    }

    /// Get optimized Tokio runtime configuration based on performance settings
    pub fn tokio_runtime_config(&self) -> tokio::runtime::Builder {
        let mut builder = tokio::runtime::Builder::new_multi_thread();
        
        // Set worker threads based on configuration or CPU count
        if let Some(worker_threads) = self.performance.worker_threads {
            builder.worker_threads(worker_threads);
        } else {
            // Use CPU count * 2 for high-performance scenarios
            let cpu_count = num_cpus::get();
            builder.worker_threads(cpu_count * 2);
        }

        // Enable I/O driver
        builder.enable_io();
        
        // Enable time driver for timeouts
        builder.enable_time();
        
        // Thread name prefix
        builder.thread_name_fn(|| {
            static ATOMIC_ID: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
            let id = ATOMIC_ID.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            format!("api-worker-{}", id)
        });

        builder
    }

    /// Check if we're running in development mode
    pub fn is_development(&self) -> bool {
        std::env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string()) == "development"
    }

    /// Check if we're running in production mode
    pub fn is_production(&self) -> bool {
        std::env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string()) == "production"
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 3000,
                workers: None,
                keep_alive: Duration::from_secs(60),
                client_timeout: Duration::from_secs(30),
                client_shutdown: Duration::from_secs(5),
            },
            database: DatabaseConfig {
                url: "postgresql://postgres:password@localhost:5432/api_db".to_string(),
                max_connections: 100,
                min_connections: 5,
                max_lifetime: Duration::from_secs(3600),
                idle_timeout: Duration::from_secs(600),
                acquire_timeout: Duration::from_secs(30),
                sqlx_logging: true,
            },
            redis: RedisConfig {
                url: "redis://localhost:6379".to_string(),
                max_size: 50,
                timeouts: RedisTimeouts {
                    wait: Duration::from_secs(30),
                    create: Duration::from_secs(30),
                    recycle: Duration::from_secs(30),
                },
            },
            rate_limiting: RateLimitingConfig {
                enabled: true,
                requests_per_second: 1000,
                burst_size: 5000,
                redis_key_prefix: "rl:".to_string(),
                cleanup_interval: Duration::from_secs(300),
            },
            metrics: MetricsConfig {
                enabled: true,
                host: "0.0.0.0".to_string(),
                port: 9090,
                path: "/metrics".to_string(),
                collection_interval: Duration::from_secs(15),
            },
            health: HealthConfig {
                enabled: true,
                host: "0.0.0.0".to_string(),
                port: 8080,
                database_check: true,
                redis_check: true,
            },
            performance: PerformanceConfig {
                target_rps: 48000,
                max_response_time_ms: 50,
                enable_compression: true,
                enable_http2: true,
                connection_pool_size: 1000,
                worker_threads: None,
            },
            tracing: TracingConfig {
                enabled: false,
                service_name: "high-performance-api".to_string(),
                jaeger_endpoint: None,
                sample_rate: 0.1,
            },
            security: SecurityConfig {
                jwt_secret: "your-super-secret-jwt-key-change-this".to_string(),
                jwt_expiration: Duration::from_secs(3600),
                bcrypt_cost: 12,
                cors_origins: vec!["*".to_string()],
                trusted_proxies: vec![],
            },
        }
    }
}