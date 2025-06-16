use anyhow::Result;
use deadpool_redis::{Config as RedisConfig, Runtime};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::time::Duration;
use tracing::{info, warn};

use crate::config::{DatabaseConfig, RedisConfig as AppRedisConfig};

pub type DatabasePool = Pool<Postgres>;
pub type RedisPool = deadpool_redis::Pool;

/// Create an optimized PostgreSQL connection pool for high performance
pub async fn create_pool(config: &DatabaseConfig) -> Result<DatabasePool> {
    info!("Creating PostgreSQL connection pool with {} max connections", config.max_connections);

    let pool = PgPoolOptions::new()
        // Connection pool sizing for high performance
        .max_connections(config.max_connections)
        .min_connections(config.min_connections)
        
        // Connection lifecycle management
        .max_lifetime(Some(config.max_lifetime))
        .idle_timeout(Some(config.idle_timeout))
        .acquire_timeout(config.acquire_timeout)
        
        // Performance optimizations
        .test_before_acquire(true)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                // Set session-level optimizations
                sqlx::query("SET statement_timeout = '30s'")
                    .execute(conn)
                    .await?;
                    
                sqlx::query("SET lock_timeout = '30s'")
                    .execute(conn)
                    .await?;
                    
                // Enable JIT for complex queries (PostgreSQL 11+)
                sqlx::query("SET jit = on")
                    .execute(conn)
                    .await
                    .ok(); // Ignore errors for older PostgreSQL versions
                    
                // Set work memory for sorting and hash operations
                sqlx::query("SET work_mem = '256MB'")
                    .execute(conn)
                    .await?;
                    
                // Enable parallel query execution
                sqlx::query("SET max_parallel_workers_per_gather = 4")
                    .execute(conn)
                    .await?;
                
                Ok(())
            })
        })
        
        // Enable SQL logging in development
        .sqlx_logging(config.sqlx_logging)
        
        // Connect to database
        .connect(&config.url)
        .await?;

    // Test the connection
    let mut conn = pool.acquire().await?;
    sqlx::query("SELECT 1")
        .fetch_one(&mut *conn)
        .await?;

    info!("PostgreSQL connection pool created successfully");
    Ok(pool)
}

/// Create an optimized Redis connection pool for rate limiting and caching
pub async fn create_redis_pool(config: &AppRedisConfig) -> Result<RedisPool> {
    info!("Creating Redis connection pool with {} max connections", config.max_size);

    let redis_config = RedisConfig::from_url(&config.url);
    
    let pool = redis_config
        .builder()?
        .max_size(config.max_size)
        .wait_timeout(Some(config.timeouts.wait))
        .create_timeout(Some(config.timeouts.create))
        .recycle_timeout(Some(config.timeouts.recycle))
        .runtime(Runtime::Tokio1)
        .build()?;

    // Test the Redis connection
    {
        let mut conn = pool.get().await?;
        redis::cmd("PING")
            .query_async::<_, String>(&mut conn)
            .await?;
    }

    info!("Redis connection pool created successfully");
    Ok(pool)
}

/// Run database migrations
pub async fn run_migrations(pool: &DatabasePool) -> Result<()> {
    info!("Running database migrations");

    // Create migrations table if it doesn't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Run initial schema migration
    run_migration(
        pool,
        "001_initial_schema",
        "Create initial database schema",
        r#"
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            is_verified BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for performance
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

        -- API keys table for authentication
        CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            key_hash VARCHAR(255) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            permissions TEXT[] NOT NULL DEFAULT '{}',
            expires_at TIMESTAMP WITH TIME ZONE,
            last_used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

        -- Rate limiting table (can be used as fallback to Redis)
        CREATE TABLE IF NOT EXISTS rate_limits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            identifier VARCHAR(255) NOT NULL,
            window_start TIMESTAMP WITH TIME ZONE NOT NULL,
            requests_count INTEGER NOT NULL DEFAULT 0,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        );

        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_identifier_window 
        ON rate_limits(identifier, window_start);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

        -- Performance metrics table
        CREATE TABLE IF NOT EXISTS performance_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            endpoint VARCHAR(255) NOT NULL,
            method VARCHAR(10) NOT NULL,
            response_time_ms INTEGER NOT NULL,
            status_code INTEGER NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_status ON performance_metrics(status_code);

        -- Audit log table
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id),
            action VARCHAR(255) NOT NULL,
            resource_type VARCHAR(255),
            resource_id UUID,
            details JSONB,
            ip_address INET,
            user_agent TEXT,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_details ON audit_logs USING GIN(details);
        "#,
    )
    .await?;

    // Add performance optimization migration
    run_migration(
        pool,
        "002_performance_optimizations",
        "Add performance optimizations and partitioning",
        r#"
        -- Enable performance-related extensions
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
        CREATE EXTENSION IF NOT EXISTS pg_trgm;

        -- Create partitioned table for high-volume performance metrics
        CREATE TABLE IF NOT EXISTS performance_metrics_partitioned (
            LIKE performance_metrics INCLUDING ALL
        ) PARTITION BY RANGE (timestamp);

        -- Create daily partitions for the last 7 days and next 7 days
        DO $$
        DECLARE
            start_date DATE := CURRENT_DATE - INTERVAL '7 days';
            end_date DATE := CURRENT_DATE + INTERVAL '7 days';
            current_date DATE := start_date;
            partition_name TEXT;
        BEGIN
            WHILE current_date <= end_date LOOP
                partition_name := 'performance_metrics_' || to_char(current_date, 'YYYY_MM_DD');
                
                EXECUTE format('
                    CREATE TABLE IF NOT EXISTS %I PARTITION OF performance_metrics_partitioned
                    FOR VALUES FROM (%L) TO (%L)',
                    partition_name,
                    current_date,
                    current_date + INTERVAL '1 day'
                );
                
                current_date := current_date + INTERVAL '1 day';
            END LOOP;
        END $$;

        -- Create materialized view for performance analytics
        CREATE MATERIALIZED VIEW IF NOT EXISTS performance_summary AS
        SELECT 
            endpoint,
            method,
            DATE_TRUNC('hour', timestamp) as hour,
            COUNT(*) as request_count,
            AVG(response_time_ms) as avg_response_time,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time,
            COUNT(*) FILTER (WHERE status_code >= 400) as error_count
        FROM performance_metrics
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY endpoint, method, hour;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_summary_unique 
        ON performance_summary(endpoint, method, hour);

        -- Create function to refresh performance summary
        CREATE OR REPLACE FUNCTION refresh_performance_summary()
        RETURNS void AS $$
        BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY performance_summary;
        END;
        $$ LANGUAGE plpgsql;
        "#,
    )
    .await?;

    info!("Database migrations completed successfully");
    Ok(())
}

async fn run_migration(
    pool: &DatabasePool,
    version: &str,
    description: &str,
    sql: &str,
) -> Result<()> {
    // Check if migration already ran
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM _migrations WHERE version = $1"
    )
    .bind(version)
    .fetch_one(pool)
    .await?;

    if existing > 0 {
        info!("Migration {} already applied, skipping", version);
        return Ok(());
    }

    info!("Running migration: {}", description);

    // Start transaction
    let mut tx = pool.begin().await?;

    // Execute migration SQL
    for statement in sql.split(';') {
        let statement = statement.trim();
        if !statement.is_empty() {
            if let Err(e) = sqlx::query(statement).execute(&mut *tx).await {
                warn!("Error executing migration statement: {}", e);
                warn!("Statement: {}", statement);
                tx.rollback().await?;
                return Err(e.into());
            }
        }
    }

    // Record migration
    sqlx::query(
        "INSERT INTO _migrations (version, description) VALUES ($1, $2)"
    )
    .bind(version)
    .bind(description)
    .execute(&mut *tx)
    .await?;

    // Commit transaction
    tx.commit().await?;

    info!("Migration {} completed successfully", version);
    Ok(())
}

/// Database health check
pub async fn health_check(pool: &DatabasePool) -> Result<bool> {
    match sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(pool)
        .await
    {
        Ok(1) => Ok(true),
        Ok(_) => Ok(false),
        Err(e) => {
            warn!("Database health check failed: {}", e);
            Ok(false)
        }
    }
}

/// Redis health check
pub async fn redis_health_check(pool: &RedisPool) -> Result<bool> {
    match pool.get().await {
        Ok(mut conn) => {
            match redis::cmd("PING")
                .query_async::<_, String>(&mut conn)
                .await
            {
                Ok(response) if response == "PONG" => Ok(true),
                Ok(_) => Ok(false),
                Err(e) => {
                    warn!("Redis health check failed: {}", e);
                    Ok(false)
                }
            }
        }
        Err(e) => {
            warn!("Failed to get Redis connection: {}", e);
            Ok(false)
        }
    }
}

/// Get database pool statistics
pub async fn get_pool_stats(pool: &DatabasePool) -> serde_json::Value {
    serde_json::json!({
        "size": pool.size(),
        "idle": pool.num_idle(),
        "connections": pool.size() - pool.num_idle()
    })
}

/// Get Redis pool statistics
pub fn get_redis_pool_stats(pool: &RedisPool) -> serde_json::Value {
    let status = pool.status();
    serde_json::json!({
        "size": status.size,
        "available": status.available,
        "max_size": status.max_size
    })
}

/// Cleanup old performance metrics (should be run periodically)
pub async fn cleanup_old_metrics(pool: &DatabasePool, retention_days: i32) -> Result<u64> {
    let rows_affected = sqlx::query(
        "DELETE FROM performance_metrics WHERE timestamp < NOW() - $1::interval"
    )
    .bind(format!("{} days", retention_days))
    .execute(pool)
    .await?
    .rows_affected();

    if rows_affected > 0 {
        info!("Cleaned up {} old performance metric records", rows_affected);
    }

    Ok(rows_affected)
}

/// Optimize database performance by updating statistics
pub async fn optimize_database(pool: &DatabasePool) -> Result<()> {
    info!("Running database optimization");

    // Update table statistics for query planner
    sqlx::query("ANALYZE")
        .execute(pool)
        .await?;

    // Refresh materialized views
    sqlx::query("SELECT refresh_performance_summary()")
        .execute(pool)
        .await
        .ok(); // Don't fail if the function doesn't exist

    info!("Database optimization completed");
    Ok(())
}