use axum::{
    body::Body,
    extract::{ConnectInfo, Request},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use governor::{
    clock::{Clock, DefaultClock},
    middleware::NoOpMiddleware,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter as GovernorRateLimiter,
};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::time::Instant;
use tower::{Layer, Service};
use tracing::{debug, warn};

use crate::{
    config::RateLimitingConfig,
    metrics::{record_rate_limit_hit, record_rate_limit_miss},
};

#[derive(Clone)]
pub struct RateLimiter {
    redis_pool: deadpool_redis::Pool,
    config: RateLimitingConfig,
    // Fallback in-memory rate limiter
    fallback_limiter: Arc<GovernorRateLimiter<NotKeyed, InMemoryState, DefaultClock, NoOpMiddleware>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RateLimitData {
    count: u32,
    window_start: u64,
    expires_at: u64,
}

#[derive(Debug, Clone)]
pub struct RateLimitInfo {
    pub allowed: bool,
    pub requests_remaining: u32,
    pub reset_time: u64,
    pub retry_after: Option<u64>,
}

impl RateLimiter {
    pub async fn new(
        redis_pool: deadpool_redis::Pool,
        config: RateLimitingConfig,
    ) -> anyhow::Result<Self> {
        // Create fallback in-memory rate limiter
        let quota = Quota::per_second(nonzero_ext::nonzero!(config.requests_per_second))
            .allow_burst(nonzero_ext::nonzero!(config.burst_size));
        
        let fallback_limiter = Arc::new(GovernorRateLimiter::direct(quota));

        Ok(Self {
            redis_pool,
            config,
            fallback_limiter,
        })
    }

    /// Check if a request should be rate limited
    pub async fn check_rate_limit(&self, identifier: &str) -> anyhow::Result<RateLimitInfo> {
        if !self.config.enabled {
            return Ok(RateLimitInfo {
                allowed: true,
                requests_remaining: self.config.requests_per_second,
                reset_time: 0,
                retry_after: None,
            });
        }

        // Try Redis-based rate limiting first
        match self.check_redis_rate_limit(identifier).await {
            Ok(info) => {
                if info.allowed {
                    record_rate_limit_miss("redis");
                } else {
                    record_rate_limit_hit("redis");
                }
                Ok(info)
            }
            Err(e) => {
                warn!("Redis rate limiting failed, falling back to in-memory: {}", e);
                // Fall back to in-memory rate limiting
                self.check_fallback_rate_limit(identifier).await
            }
        }
    }

    /// Redis-based sliding window rate limiting
    async fn check_redis_rate_limit(&self, identifier: &str) -> anyhow::Result<RateLimitInfo> {
        let mut conn = self.redis_pool.get().await?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let window_start = now - (now % 60); // 1-minute windows
        let key = format!("{}{}:{}", self.config.redis_key_prefix, identifier, window_start);
        
        // Use Redis pipeline for atomic operations
        let pipe = redis::pipe()
            .atomic()
            .incr(&key, 1)
            .expire(&key, 60)
            .query_async::<_, (u32,)>(&mut conn)
            .await?;

        let current_count = pipe.0;
        let remaining = self.config.requests_per_second.saturating_sub(current_count);
        let allowed = current_count <= self.config.requests_per_second;
        
        let reset_time = window_start + 60;
        let retry_after = if !allowed {
            Some(reset_time - now)
        } else {
            None
        };

        debug!(
            "Rate limit check for {}: {}/{} requests, allowed: {}",
            identifier, current_count, self.config.requests_per_second, allowed
        );

        Ok(RateLimitInfo {
            allowed,
            requests_remaining: remaining,
            reset_time,
            retry_after,
        })
    }

    /// Fallback in-memory rate limiting using governor
    async fn check_fallback_rate_limit(&self, _identifier: &str) -> anyhow::Result<RateLimitInfo> {
        let result = self.fallback_limiter.check();
        
        let allowed = result.is_ok();
        if allowed {
            record_rate_limit_miss("fallback");
        } else {
            record_rate_limit_hit("fallback");
        }

        Ok(RateLimitInfo {
            allowed,
            requests_remaining: if allowed { 
                self.config.requests_per_second 
            } else { 
                0 
            },
            reset_time: SystemTime::now()
                .duration_since(UNIX_EPOCH)?
                .as_secs() + 60,
            retry_after: if !allowed { Some(1) } else { None },
        })
    }

    /// Get rate limit status for an identifier
    pub async fn get_rate_limit_status(&self, identifier: &str) -> anyhow::Result<RateLimitInfo> {
        if !self.config.enabled {
            return Ok(RateLimitInfo {
                allowed: true,
                requests_remaining: self.config.requests_per_second,
                reset_time: 0,
                retry_after: None,
            });
        }

        let mut conn = self.redis_pool.get().await?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let window_start = now - (now % 60);
        let key = format!("{}{}:{}", self.config.redis_key_prefix, identifier, window_start);
        
        let current_count: u32 = conn.get(&key).await.unwrap_or(0);
        let remaining = self.config.requests_per_second.saturating_sub(current_count);
        let allowed = current_count < self.config.requests_per_second;
        
        Ok(RateLimitInfo {
            allowed,
            requests_remaining: remaining,
            reset_time: window_start + 60,
            retry_after: None,
        })
    }

    /// Clean up expired rate limit keys
    pub async fn cleanup_expired_keys(&self) -> anyhow::Result<u64> {
        let mut conn = self.redis_pool.get().await?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let cutoff = now - 120; // Clean up keys older than 2 minutes
        
        // This is a simplified cleanup - in production you might want a more sophisticated approach
        let pattern = format!("{}*", self.config.redis_key_prefix);
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(&pattern)
            .query_async(&mut conn)
            .await?;

        let mut deleted = 0;
        for key in keys {
            // Extract timestamp from key and check if expired
            if let Some(timestamp_str) = key.split(':').last() {
                if let Ok(timestamp) = timestamp_str.parse::<u64>() {
                    if timestamp < cutoff {
                        let _: () = conn.del(&key).await?;
                        deleted += 1;
                    }
                }
            }
        }

        if deleted > 0 {
            debug!("Cleaned up {} expired rate limit keys", deleted);
        }

        Ok(deleted)
    }
}

/// Extract client identifier from request
fn extract_client_identifier(headers: &HeaderMap, addr: Option<&SocketAddr>) -> String {
    // Priority order for client identification:
    // 1. API key from Authorization header
    // 2. X-Forwarded-For header (for proxied requests)
    // 3. X-Real-IP header
    // 4. Client IP address

    // Check for API key
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];
                return format!("api_key:{}", &token[..std::cmp::min(20, token.len())]);
            }
        }
    }

    // Check for forwarded IP
    if let Some(forwarded) = headers.get("x-forwarded-for") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            let ip = forwarded_str.split(',').next().unwrap_or("").trim();
            if !ip.is_empty() {
                return format!("ip:{}", ip);
            }
        }
    }

    // Check for real IP
    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(ip_str) = real_ip.to_str() {
            return format!("ip:{}", ip_str);
        }
    }

    // Fall back to client address
    if let Some(addr) = addr {
        format!("ip:{}", addr.ip())
    } else {
        "unknown".to_string()
    }
}

/// Rate limiting middleware
#[derive(Clone)]
pub struct RateLimitingLayer {
    rate_limiter: RateLimiter,
}

impl RateLimitingLayer {
    pub fn new(rate_limiter: RateLimiter) -> Self {
        Self { rate_limiter }
    }
}

impl<S> Layer<S> for RateLimitingLayer {
    type Service = RateLimitingService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RateLimitingService {
            inner,
            rate_limiter: self.rate_limiter.clone(),
        }
    }
}

#[derive(Clone)]
pub struct RateLimitingService<S> {
    inner: S,
    rate_limiter: RateLimiter,
}

impl<S> Service<Request> for RateLimitingService<S>
where
    S: Service<Request, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = std::pin::Pin<Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(
        &mut self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request) -> Self::Future {
        let rate_limiter = self.rate_limiter.clone();
        let mut inner = self.inner.clone();

        Box::pin(async move {
            // Extract client identifier
            let headers = request.headers();
            let connect_info = request.extensions().get::<ConnectInfo<SocketAddr>>();
            let client_id = extract_client_identifier(headers, connect_info.map(|ci| &ci.0));

            // Check rate limit
            match rate_limiter.check_rate_limit(&client_id).await {
                Ok(rate_limit_info) => {
                    if rate_limit_info.allowed {
                        // Request is allowed, proceed
                        let response = inner.call(request).await?;
                        
                        // Add rate limit headers to response
                        let mut response = response;
                        let headers = response.headers_mut();
                        
                        headers.insert(
                            "X-RateLimit-Limit",
                            rate_limiter.config.requests_per_second.to_string().parse().unwrap(),
                        );
                        headers.insert(
                            "X-RateLimit-Remaining",
                            rate_limit_info.requests_remaining.to_string().parse().unwrap(),
                        );
                        headers.insert(
                            "X-RateLimit-Reset",
                            rate_limit_info.reset_time.to_string().parse().unwrap(),
                        );

                        Ok(response)
                    } else {
                        // Request is rate limited
                        let mut response = Response::builder()
                            .status(StatusCode::TOO_MANY_REQUESTS)
                            .header("content-type", "application/json")
                            .header(
                                "X-RateLimit-Limit",
                                rate_limiter.config.requests_per_second.to_string(),
                            )
                            .header(
                                "X-RateLimit-Remaining",
                                "0",
                            )
                            .header(
                                "X-RateLimit-Reset",
                                rate_limit_info.reset_time.to_string(),
                            );

                        if let Some(retry_after) = rate_limit_info.retry_after {
                            response = response.header("Retry-After", retry_after.to_string());
                        }

                        let body = serde_json::json!({
                            "error": "Rate limit exceeded",
                            "message": format!(
                                "Rate limit of {} requests per minute exceeded. Try again in {} seconds.",
                                rate_limiter.config.requests_per_second,
                                rate_limit_info.retry_after.unwrap_or(60)
                            ),
                            "retry_after": rate_limit_info.retry_after
                        });

                        let response = response
                            .body(Body::from(body.to_string()))
                            .unwrap();

                        Ok(response)
                    }
                }
                Err(e) => {
                    warn!("Rate limiting error: {}", e);
                    // On error, allow the request to proceed
                    inner.call(request).await
                }
            }
        })
    }
}

/// Background task to clean up expired rate limit keys
pub async fn start_cleanup_task(rate_limiter: RateLimiter) {
    let cleanup_interval = rate_limiter.config.cleanup_interval;
    let mut interval = tokio::time::interval(cleanup_interval);

    loop {
        interval.tick().await;
        
        if let Err(e) = rate_limiter.cleanup_expired_keys().await {
            warn!("Rate limit cleanup failed: {}", e);
        }
    }
}

/// Rate limiting statistics
#[derive(Debug, Serialize)]
pub struct RateLimitStats {
    pub enabled: bool,
    pub requests_per_second: u32,
    pub burst_size: u32,
    pub active_keys: u64,
}

impl RateLimiter {
    /// Get rate limiting statistics
    pub async fn get_stats(&self) -> anyhow::Result<RateLimitStats> {
        let active_keys = if self.config.enabled {
            let mut conn = self.redis_pool.get().await?;
            let pattern = format!("{}*", self.config.redis_key_prefix);
            let keys: Vec<String> = redis::cmd("KEYS")
                .arg(&pattern)
                .query_async(&mut conn)
                .await
                .unwrap_or_default();
            keys.len() as u64
        } else {
            0
        };

        Ok(RateLimitStats {
            enabled: self.config.enabled,
            requests_per_second: self.config.requests_per_second,
            burst_size: self.config.burst_size,
            active_keys,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::RateLimitingConfig;
    use std::time::Duration;

    #[tokio::test]
    async fn test_extract_client_identifier() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", "Bearer test_token_123".parse().unwrap());
        
        let identifier = extract_client_identifier(&headers, None);
        assert!(identifier.starts_with("api_key:"));
        assert!(identifier.contains("test_token_123"));
    }

    #[tokio::test]
    async fn test_rate_limit_info() {
        let info = RateLimitInfo {
            allowed: true,
            requests_remaining: 100,
            reset_time: 1234567890,
            retry_after: None,
        };
        
        assert!(info.allowed);
        assert_eq!(info.requests_remaining, 100);
    }
}