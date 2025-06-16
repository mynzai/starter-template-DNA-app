# High-Performance API Platform

A production-ready, high-performance API platform built with Axum (Rust) capable of handling 48,000+ requests per second. Features comprehensive monitoring, auto-scaling, GraphQL/REST endpoints, and client library generation.

## 🚀 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Requests/Second** | 48,000+ | Under load testing |
| **Response Time** | <50ms | 95th percentile |
| **Memory Usage** | <512MB | Peak load |
| **CPU Usage** | <80% | Normal operation |

## ✨ Features

### 🔥 High-Performance Core
- **Axum Web Framework**: Async-first, built on Tokio
- **Optimized Connection Pooling**: PostgreSQL + Redis
- **Memory-Efficient**: Custom allocator (mimalloc/jemalloc)
- **Zero-Copy Operations**: Minimized memory allocations
- **CPU Optimization**: Native target compilation

### 📊 Comprehensive Monitoring
- **Prometheus Metrics**: Request latency, throughput, errors
- **Grafana Dashboards**: Real-time performance visualization
- **Health Checks**: Readiness, liveness, and dependency checks
- **Distributed Tracing**: Jaeger integration for request tracing
- **Performance Analytics**: Automated bottleneck detection

### 🛡️ Production-Ready Features
- **Rate Limiting**: Redis-backed with sliding window
- **Authentication**: JWT + API key support
- **Security**: CORS, input validation, SQL injection prevention
- **Auto-Scaling**: Kubernetes HPA with CPU/memory metrics
- **Load Balancing**: Nginx with health-based routing

### 🔗 API Generation
- **GraphQL**: Schema-first with async resolvers
- **REST Endpoints**: Auto-generated from schemas
- **OpenAPI Documentation**: Interactive Swagger UI
- **Client Libraries**: TypeScript (React Native) + Dart (Flutter)
- **API Versioning**: Backward-compatible migrations

## 🛠 Quick Start

### Prerequisites

```bash
# Install Rust (1.75+)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (18+) for tooling
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker for containerization
curl -fsSL https://get.docker.com | sh
```

### Development Setup

```bash
# Clone the template
git clone <repository-url> my-api-platform
cd my-api-platform

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Run database migrations
cargo install sqlx-cli
sqlx migrate run

# Start development server
cargo run

# Or use npm script
npm run dev
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Scale API instances
docker-compose up -d --scale api=3

# View logs
docker-compose logs -f api
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app={{projectName}}-api

# View auto-scaling status
kubectl get hpa {{projectName}}-api-hpa

# Monitor performance
kubectl port-forward svc/{{projectName}}-grafana 3001:3000
```

## 📈 Performance Optimization

### Database Optimization

```rust
// Connection pool configuration
let pool = PgPoolOptions::new()
    .max_connections(100)
    .min_connections(5)
    .max_lifetime(Duration::from_secs(3600))
    .idle_timeout(Duration::from_secs(600))
    .acquire_timeout(Duration::from_secs(30))
    .after_connect(|conn, _meta| {
        Box::pin(async move {
            // Enable performance optimizations
            sqlx::query("SET jit = on").execute(conn).await?;
            sqlx::query("SET work_mem = '256MB'").execute(conn).await?;
            Ok(())
        })
    })
    .connect(&database_url)
    .await?;
```

### Request Handling Optimization

```rust
// Optimized middleware stack
let middleware_stack = ServiceBuilder::new()
    .layer(CompressionLayer::new())
    .layer(TimeoutLayer::new(Duration::from_secs(30)))
    .layer(RequestBodyLimitLayer::new(16 * 1024 * 1024))
    .layer(RateLimitingLayer::new(rate_limiter))
    .layer(MetricsLayer::new());
```

### Memory Optimization

```toml
# Cargo.toml optimizations
[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"

# Global allocator
[dependencies]
mimalloc = { version = "0.1", default-features = false }
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
SERVER_WORKERS=8

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/db
DATABASE_MAX_CONNECTIONS=100
DATABASE_MIN_CONNECTIONS=5

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_MAX_SIZE=50

# Performance Configuration
PERFORMANCE_TARGET_RPS=48000
PERFORMANCE_MAX_RESPONSE_TIME_MS=50
PERFORMANCE_WORKER_THREADS=8

# Rate Limiting
RATE_LIMITING_ENABLED=true
RATE_LIMITING_RPS=1000
RATE_LIMITING_BURST_SIZE=5000

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
TRACING_ENABLED=true
TRACING_JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

### Custom Configuration

```rust
// config/custom.yaml
server:
  host: "0.0.0.0"
  port: 3000
  workers: 8

performance:
  target_rps: 48000
  max_response_time_ms: 50
  enable_compression: true
  enable_http2: true

rate_limiting:
  enabled: true
  requests_per_second: 1000
  burst_size: 5000
```

## 📊 Monitoring & Observability

### Metrics Collection

```rust
// Custom metrics
use metrics::{counter, histogram, gauge};

// Request metrics
counter!("http_requests_total", &[("method", "GET"), ("path", "/api/users")]).increment(1);
histogram!("http_request_duration_seconds").record(duration.as_secs_f64());

// Business metrics
gauge!("active_users").set(user_count as f64);
```

### Health Checks

```bash
# Health check endpoints
curl http://localhost:8080/health          # Basic health
curl http://localhost:8080/health/ready    # Readiness check
curl http://localhost:8080/health/live     # Liveness check

# Metrics endpoint
curl http://localhost:9090/metrics         # Prometheus metrics
```

### Grafana Dashboards

Access Grafana at `http://localhost:3001` (admin/admin) to view:

- **API Performance**: Request rate, latency, error rate
- **Resource Usage**: CPU, memory, database connections
- **Business Metrics**: Active users, API operations
- **Infrastructure**: Pod scaling, network traffic

## 🔗 API Usage

### REST Endpoints

```bash
# User management
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{id}
PUT    /api/v1/users/{id}
DELETE /api/v1/users/{id}

# Authentication
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
```

### GraphQL

```graphql
# Query users
query GetUsers {
  users {
    id
    email
    fullName
    isActive
    createdAt
  }
}

# Create user
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    fullName
  }
}
```

### Client Libraries

#### TypeScript (React Native)

```typescript
import { ApiClient } from './generated/client';

const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

// Type-safe API calls
const users = await client.users.getUsers();
const user = await client.users.createUser({
  email: 'user@example.com',
  fullName: 'John Doe'
});
```

#### Dart (Flutter)

```dart
import 'package:your_app_client/your_app_client.dart';

final client = ApiClient(
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',
);

// Type-safe API calls
final users = await client.users.getUsers();
final user = await client.users.createUser(
  CreateUserRequest(
    email: 'user@example.com',
    fullName: 'John Doe',
  ),
);
```

## 🧪 Testing & Benchmarking

### Unit Tests

```bash
# Run all tests
cargo test

# Run with coverage
cargo test --coverage

# Run specific test
cargo test test_rate_limiting
```

### Performance Benchmarks

```bash
# Run benchmarks
cargo bench

# Specific benchmark
cargo bench --bench performance_benchmark

# Generate reports
cargo bench -- --output-format html
```

### Load Testing

```bash
# Using wrk
npm run benchmark:wrk

# Using Artillery
npm run benchmark:artillery

# Custom load test
artillery run load-tests/artillery.yml
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## 🚀 Production Deployment

### Performance Tuning

```bash
# OS-level optimizations
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
echo 'net.core.netdev_max_backlog = 5000' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65535' >> /etc/sysctl.conf

# File descriptor limits
echo '* soft nofile 65535' >> /etc/security/limits.conf
echo '* hard nofile 65535' >> /etc/security/limits.conf
```

### Container Optimization

```dockerfile
# Multi-stage build for minimal image
FROM rust:1.75-slim as builder
# ... build steps ...

FROM debian:bookworm-slim
# Runtime optimizations
ENV MALLOC_ARENA_MAX=2
ENV RUST_LOG=info
COPY --from=builder /app/target/release/app ./app
```

### Kubernetes Scaling

```yaml
# HPA configuration
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔍 Troubleshooting

### Performance Issues

**High Latency (>50ms)**
```bash
# Check database connections
curl http://localhost:8080/admin/stats

# Monitor query performance
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC;

# Check connection pool
SELECT count(*) as active_connections FROM pg_stat_activity;
```

**Memory Usage High**
```bash
# Check memory metrics
curl http://localhost:9090/metrics | grep memory_usage

# Profile with jemalloc
MALLOC_CONF=prof:true cargo run

# Monitor with Grafana
# Navigate to Memory Usage dashboard
```

**Rate Limiting Issues**
```bash
# Check Redis connection
redis-cli ping

# View rate limit keys
redis-cli keys "rl:*"

# Monitor rate limit metrics
curl http://localhost:9090/metrics | grep rate_limit
```

### Common Solutions

| Issue | Solution |
|-------|----------|
| High CPU usage | Increase worker threads, optimize queries |
| Memory leaks | Check connection pool settings, update allocator |
| Database timeouts | Increase connection pool, optimize queries |
| Rate limit errors | Adjust RPS limits, check Redis connectivity |
| Slow startup | Optimize Docker image, reduce dependency loading |

## 📚 Documentation

- [API Reference](./docs/api-reference.md)
- [Architecture Guide](./docs/architecture.md)
- [Performance Tuning](./docs/performance-tuning.md)
- [Deployment Guide](./docs/deployment.md)
- [Monitoring Setup](./docs/monitoring.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure benchmarks pass performance targets
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built for extreme performance and production scalability** 🚀