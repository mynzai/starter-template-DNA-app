# High-Performance API Setup Guide

This guide will help you set up the Axum-based high-performance API platform capable of 48k+ requests/second.

## Prerequisites

- Rust 1.75.0 or later
- Docker 20.0.0 or later
- Node.js 18.0.0+ (for client libraries)
- PostgreSQL database access
- Redis instance access
- Basic knowledge of Rust and API development

## Rust Development Environment

### Install Rust
```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### Install Required Tools
```bash
# Install cargo-watch for development
cargo install cargo-watch

# Install diesel CLI for database management
cargo install diesel_cli --no-default-features --features postgres

# Install cargo-audit for security scanning
cargo install cargo-audit
```

## Database Setup

### PostgreSQL Configuration

#### Option A: Docker PostgreSQL (Recommended for Development)
```bash
# Start PostgreSQL with Docker
docker run --name postgres-api \
  -e POSTGRES_USER=api_user \
  -e POSTGRES_PASSWORD=api_password \
  -e POSTGRES_DB=high_performance_api \
  -p 5432:5432 \
  -d postgres:15

# Verify connection
docker exec -it postgres-api psql -U api_user -d high_performance_api
```

#### Option B: Managed PostgreSQL
Use a managed service like:
- **Supabase**: Free tier with excellent performance
- **Railway**: Simple setup and deployment
- **AWS RDS**: Enterprise-grade with fine-tuning options
- **Google Cloud SQL**: Integrated with Google Cloud ecosystem

### Database Optimization Settings

For maximum performance, configure your PostgreSQL instance:

```sql
-- In postgresql.conf or via SQL commands
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.7;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Reload configuration
SELECT pg_reload_conf();
```

## Redis Setup

### Docker Redis (Development)
```bash
# Start Redis with Docker
docker run --name redis-api \
  -p 6379:6379 \
  -d redis:7-alpine

# Test connection
docker exec -it redis-api redis-cli ping
```

### Redis Configuration for High Performance
```bash
# Create redis.conf with optimizations
cat > redis.conf << EOF
# Memory optimization
maxmemory 512mb
maxmemory-policy allkeys-lru

# Network optimization
tcp-keepalive 60
tcp-backlog 511

# Persistence (disable for pure cache)
save ""
appendonly no

# Performance
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
EOF

# Start Redis with custom config
docker run --name redis-api-optimized \
  -v $(pwd)/redis.conf:/usr/local/etc/redis/redis.conf \
  -p 6379:6379 \
  -d redis:7-alpine redis-server /usr/local/etc/redis/redis.conf
```

## Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8080
WORKERS=4

# Database
DATABASE_URL=postgresql://api_user:api_password@localhost:5432/high_performance_api
DATABASE_MAX_CONNECTIONS=100
DATABASE_MIN_CONNECTIONS=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_MAX_CONNECTIONS=50

# Performance Settings
RATE_LIMIT_RPS=1000
REQUEST_TIMEOUT_MS=30000
KEEPALIVE_TIMEOUT_S=75

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Project Setup

1. Clone and enter the project directory
2. Install Rust dependencies:
```bash
cargo build
```

3. Set up the database schema:
```bash
# Run migrations
diesel migration run

# Or if using sqlx
cargo sqlx migrate run
```

4. Generate API documentation:
```bash
cargo doc --open
```

## Development Workflow

### Local Development
```bash
# Run with hot reload
cargo watch -x run

# Run with specific configuration
RUST_LOG=debug cargo run

# Run tests
cargo test

# Run with release optimizations (for performance testing)
cargo run --release
```

### Performance Testing
```bash
# Install performance testing tools
cargo install drill
npm install -g autocannon

# Basic load test with autocannon
autocannon -c 100 -d 30s http://localhost:8080/api/health

# More comprehensive testing with drill
echo "
benchmark 'API Performance Test' {
  request {
    url = 'http://localhost:8080/api/health'
    method = 'GET'
  }
  
  exec {
    duration = '30s'
    concurrent = 100
  }
}
" > performance-test.yml

drill --benchmark performance-test.yml --stats
```

## Monitoring and Observability

### Prometheus Metrics
The template includes built-in Prometheus metrics. Set up monitoring:

```bash
# Docker Compose for monitoring stack
cat > docker-compose.monitoring.yml << EOF
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
EOF

# Prometheus configuration
cat > prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['host.docker.internal:9090']
EOF

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

### Logging Configuration
```bash
# Install structured logging
cargo add tracing tracing-subscriber

# Set log levels for development
export RUST_LOG="high_performance_api=debug,axum=info,tower=info"
```

## Production Deployment

### Docker Deployment
```bash
# Build optimized Docker image
docker build -t high-performance-api:latest .

# Run with production settings
docker run -d \
  --name api-prod \
  -p 8080:8080 \
  -e DATABASE_URL="your-prod-db-url" \
  -e REDIS_URL="your-prod-redis-url" \
  -e RUST_LOG="info" \
  --restart unless-stopped \
  high-performance-api:latest
```

### Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-performance-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: high-performance-api
  template:
    metadata:
      labels:
        app: high-performance-api
    spec:
      containers:
      - name: api
        image: high-performance-api:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: database-url
---
apiVersion: v1
kind: Service
metadata:
  name: high-performance-api-service
spec:
  selector:
    app: high-performance-api
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

### Horizontal Pod Autoscaler
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: high-performance-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Performance Optimization

### Compiler Optimizations
Add to `Cargo.toml`:

```toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = true

[profile.release-with-debug]
inherits = "release"
debug = true
strip = false
```

### Database Connection Pooling
```rust
// Optimal pool settings for high performance
let pool = PgPoolOptions::new()
    .max_connections(100)
    .min_connections(10)
    .acquire_timeout(Duration::from_secs(30))
    .idle_timeout(Duration::from_secs(600))
    .max_lifetime(Duration::from_secs(1800))
    .connect(&database_url)
    .await?;
```

### Load Balancing
```nginx
# nginx.conf for load balancing
upstream api_backend {
    least_conn;
    server 127.0.0.1:8080 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8081 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8082 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-api.com;
    
    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

## Testing and Quality Assurance

### Unit Tests
```bash
# Run all tests
cargo test

# Run with coverage
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage/
```

### Integration Tests
```bash
# Run integration tests with test database
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_api cargo test --test integration_tests
```

### Load Testing
```bash
# Comprehensive load test
cat > load-test.js << EOF
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  const response = http.get('http://localhost:8080/api/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 50ms': (r) => r.timings.duration < 50,
  });
}
EOF

# Run with k6
k6 run load-test.js
```

## Security Configuration

### JWT Authentication
```bash
# Generate a secure JWT secret
openssl rand -hex 64
```

### Rate Limiting
The template includes Redis-based rate limiting. Configure limits based on your needs:

```rust
// Rate limiting configuration
let rate_limit = RateLimit::new(
    1000,  // requests per second per IP
    Duration::from_secs(1),
    redis_client.clone(),
);
```

### CORS Configuration
```rust
let cors = CorsLayer::new()
    .allow_origin(["http://localhost:3000".parse().unwrap()])
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers(Any);
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check database connection pool sizes
   - Monitor for memory leaks with `valgrind`
   - Adjust Rust allocator: `export MALLOC_ARENA_MAX=2`

2. **Database Connection Errors**
   - Verify connection string format
   - Check network connectivity
   - Monitor connection pool metrics

3. **Performance Issues**
   - Enable release mode for testing: `cargo run --release`
   - Check database query performance
   - Monitor system resources (CPU, RAM, I/O)

4. **Redis Connection Issues**
   - Verify Redis is running: `redis-cli ping`
   - Check connection limits
   - Monitor Redis memory usage

### Performance Benchmarking
```bash
# System resource monitoring during load tests
htop  # or top on older systems
iostat -x 1
vmstat 1

# Application-specific metrics
curl http://localhost:9090/metrics | grep http_requests
```

## Estimated Setup Time

- **Development environment**: 15-20 minutes
- **Database and Redis setup**: 10-15 minutes
- **Project configuration**: 5-10 minutes
- **Performance testing setup**: 10-15 minutes
- **Production deployment**: 30-60 minutes

## Performance Targets

After proper setup, you should achieve:
- **Throughput**: 48,000+ requests/second
- **Response Time**: <50ms for simple endpoints
- **Memory Usage**: <512MB under load
- **CPU Usage**: <80% at maximum throughput

## Next Steps

1. Customize API endpoints for your business logic
2. Set up monitoring dashboards
3. Configure CI/CD pipelines
4. Implement comprehensive logging
5. Set up backup and disaster recovery
6. Performance tune for your specific workload

## Getting Help

- [Axum Documentation](https://docs.rs/axum/)
- [Tokio Guide](https://tokio.rs/tokio/tutorial)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
- [Database Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)

Ready to serve millions of requests! ⚡🚀