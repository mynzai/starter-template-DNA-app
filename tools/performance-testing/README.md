# 🚀 DNA Performance Testing & Optimization Suite

A comprehensive performance testing and optimization platform for all DNA template types, providing automated load testing, regression detection, performance monitoring, and budget enforcement.

## 🎯 Features

### 🔥 Load Testing Suite
- **K6 Load Testing**: High-performance API testing with scenarios for baseline, spike, stress, and endurance
- **Lighthouse CI**: Automated web performance testing with Core Web Vitals validation
- **Mobile Performance**: React Native and Flutter app performance testing with Detox integration
- **Custom Scenarios**: Configurable test scenarios for different template types

### 📊 Regression Detection
- **Baseline Management**: Create and maintain performance baselines for all templates
- **Automated Comparison**: Continuous comparison against established baselines
- **Trend Analysis**: Track performance trends over time with statistical significance
- **Alert System**: Immediate notifications when regressions are detected

### 🔧 Optimization Engine
- **Bottleneck Analysis**: Automated identification of performance bottlenecks
- **Smart Recommendations**: AI-powered optimization suggestions based on analysis
- **Implementation Guidance**: Step-by-step instructions for performance improvements
- **Impact Estimation**: Predicted performance gains from optimizations

### 📈 Continuous Monitoring
- **Real-time Tracking**: 24/7 performance monitoring with configurable intervals
- **Multi-target Support**: Monitor APIs, web apps, mobile apps, and system resources
- **Prometheus Integration**: Industry-standard metrics collection and storage
- **Automated Remediation**: Trigger scaling and healing actions based on alerts

### 💰 Performance Budgets
- **SLA Enforcement**: Define and enforce performance SLAs for each template type
- **Budget Violations**: Track and report budget violations with severity levels
- **Compliance Reporting**: Generate compliance reports for stakeholders
- **CI/CD Integration**: Fail builds when performance budgets are exceeded

## 📦 Installation

```bash
# Install the performance testing suite
cd tools/performance-testing
npm install

# Make CLI globally available
npm link

# Verify installation
dna-perf --version
```

## 🚀 Quick Start

### 1. Interactive Setup

```bash
# Run interactive setup to configure your environment
dna-perf setup
```

### 2. Create Performance Baselines

```bash
# Create baseline for high-performance API
dna-perf baseline create high-performance-api --version 1.0.0

# Create baseline for data visualization
dna-perf baseline create data-visualization --version 1.0.0

# List all baselines
dna-perf baseline list
```

### 3. Run Performance Tests

```bash
# Run comprehensive performance tests
dna-perf test --type all --users 100 --duration 10m

# Run API-specific tests
dna-perf test --type api --users 50 --duration 5m

# Run web performance tests
dna-perf test --type web --env staging
```

### 4. Check Performance Budgets

```bash
# Check if template meets performance budgets
dna-perf budget check high-performance-api

# Generate budget compliance report
dna-perf budget report --days 30
```

### 5. Run Regression Tests

```bash
# Check for performance regressions
dna-perf regression high-performance-api --version 1.1.0

# Fail CI/CD pipeline on regression
dna-perf regression data-visualization --fail-on-regression
```

## 🎯 Performance Targets

### High-Performance API Platform
- **Throughput**: 48,000+ requests/second
- **Response Time**: <50ms average, <100ms p95, <200ms p99
- **Error Rate**: <0.1%
- **Availability**: 99.9%

### Real-time Collaboration Platform
- **Latency**: <150ms end-to-end
- **Connection Time**: <500ms
- **Concurrent Users**: 10,000+
- **Availability**: 99.95%

### Data Visualization Platform
- **Render Time**: <2s for 1M+ data points
- **Frame Rate**: 60fps sustained
- **Memory Usage**: <2GB for large datasets
- **Export Time**: <30s for high-resolution exports

### AI-Powered SaaS Platform
- **AI Response Time**: <3s
- **Cold Start**: <2s
- **Throughput**: 5,000 requests/second
- **Availability**: 99.8%

### Mobile AI Assistants
- **App Launch**: <2s (React Native), <1.5s (Flutter)
- **Memory Usage**: <150MB (RN), <120MB (Flutter)
- **Battery Drain**: <5%/hour (RN), <4%/hour (Flutter)
- **Crash Rate**: <0.1% (RN), <0.05% (Flutter)

### Web Performance (General)
- **First Contentful Paint**: <1.8s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Performance Score**: 85+ (Lighthouse)

## 🔧 Configuration

### Load Testing Configuration

```javascript
// k6-config.js
export const config = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m'
    },
    stress: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5m', target: 200 },
        { duration: '10m', target: 400 }
      ]
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<100', 'avg<50'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>48000']
  }
};
```

### Lighthouse CI Configuration

```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.85}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 3000}]
      }
    }
  }
}
```

### Performance Budget Configuration

```json
{
  "high-performance-api": {
    "sla": {
      "availability": 99.9,
      "response_time": 50,
      "throughput": 48000,
      "error_rate": 0.1
    },
    "limits": {
      "memory_usage": 512,
      "cpu_usage": 80
    },
    "enforcement": "strict"
  }
}
```

## 📊 Usage Examples

### Load Testing Different Template Types

```bash
# Test Epic 3 Story 3 - High-Performance API
dna-perf test --type api \
  --users 1000 \
  --duration 15m \
  --env production

# Test Epic 3 Story 4 - Data Visualization
dna-perf test --type web \
  --users 100 \
  --duration 10m \
  --output ./reports/dataviz

# Test Epic 2 Stories - Mobile AI Assistants
dna-perf test --type mobile \
  --users 50 \
  --duration 5m \
  --output ./reports/mobile
```

### Automated Performance Analysis

```bash
# Analyze performance bottlenecks
dna-perf optimize high-performance-api \
  --input ./reports/load-test-results.json \
  --output ./reports/optimization-analysis.json

# Generate optimization recommendations
dna-perf optimize data-visualization \
  --input ./reports/lighthouse-results.json
```

### Continuous Monitoring

```bash
# Start monitoring with custom targets
dna-perf monitor \
  --interval 30 \
  --targets "api/health,api/users,api/graphql"

# Monitor specific services
dna-perf monitor \
  --interval 60 \
  --targets "collaboration/rooms,visualization/datasets"
```

### CI/CD Integration

```bash
# Performance validation in CI pipeline
dna-perf ci --template high-performance-api

# Budget-only check for fast feedback
dna-perf ci --template data-visualization --budget-only

# Regression-only check for release validation
dna-perf ci --template ai-saas-platform --regression-only
```

## 📈 Monitoring & Alerting

### Real-time Performance Monitoring

The monitoring system provides:

- **Continuous Tracking**: Monitor key metrics every 30 seconds
- **Multi-target Support**: APIs, web apps, mobile apps, system resources
- **Real-time Alerts**: Immediate notifications when thresholds are exceeded
- **Automated Remediation**: Trigger scaling actions based on performance

### Alert Configuration

```javascript
const alertThresholds = {
  api: {
    response_time: { warning: 100, critical: 500 },
    error_rate: { warning: 0.01, critical: 0.05 },
    availability: { warning: 0.99, critical: 0.95 }
  },
  web: {
    performance_score: { warning: 0.8, critical: 0.6 },
    largest_contentful_paint: { warning: 2500, critical: 4000 }
  }
};
```

### Prometheus Metrics

Key metrics exposed for monitoring:

- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total HTTP requests counter
- `performance_score` - Lighthouse performance score gauge
- `error_rate` - Application error rate gauge
- `availability` - Service availability gauge

## 🎯 Performance Budgets

### Budget Enforcement Levels

- **Strict**: Block deployments on any violation
- **Moderate**: Warning notifications with optional blocking
- **Warning**: Log violations without blocking

### Template-Specific Budgets

Each template type has customized performance budgets:

```json
{
  "high-performance-api": {
    "enforcement": "strict",
    "sla": {
      "throughput": 48000,
      "response_time": 50,
      "error_rate": 0.1
    }
  },
  "data-visualization": {
    "enforcement": "warning",
    "sla": {
      "render_time": 2000,
      "frame_rate": 60,
      "memory_usage": 2048
    }
  }
}
```

## 🔍 Regression Detection

### Baseline Management

```bash
# Create baseline from current performance
dna-perf baseline create high-performance-api \
  --version 1.0.0 \
  --commit abc123

# Compare current performance to baseline
dna-perf regression high-performance-api \
  --version 1.1.0 \
  --fail-on-regression

# List all available baselines
dna-perf baseline list
```

### Statistical Analysis

The regression detection system provides:

- **Trend Analysis**: Track performance changes over time
- **Statistical Significance**: Determine if changes are meaningful
- **Confidence Intervals**: Understand the reliability of measurements
- **Automated Alerts**: Immediate notification of significant regressions

## 📄 Reporting

### Report Types

- **Summary Reports**: High-level performance overview
- **Detailed Analysis**: In-depth performance breakdown
- **Trend Reports**: Performance trends over time
- **Compliance Reports**: Budget compliance status

### Report Formats

- **HTML**: Interactive web reports with charts
- **JSON**: Machine-readable data for integration
- **PDF**: Printable reports for stakeholders

```bash
# Generate comprehensive HTML report
dna-perf report \
  --type detailed \
  --format html \
  --output ./reports/performance-summary.html

# Generate JSON data for integration
dna-perf report \
  --type summary \
  --format json \
  --output ./reports/metrics.json
```

## 🔧 Advanced Configuration

### Custom Test Scenarios

Create custom K6 test scenarios:

```javascript
// custom-scenario.js
export const options = {
  scenarios: {
    'data-visualization-load': {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 200
    }
  }
};
```

### Custom Optimization Rules

Define template-specific optimization rules:

```json
{
  "rules": {
    "high-response-time": {
      "condition": "response_time > 100",
      "recommendations": [
        "Enable database connection pooling",
        "Implement Redis caching",
        "Add CDN for static assets"
      ]
    }
  }
}
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd tools/performance-testing
          npm install
      
      - name: Run performance tests
        run: |
          dna-perf ci --template ${{ matrix.template }}
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
    
    strategy:
      matrix:
        template:
          - high-performance-api
          - data-visualization
          - ai-saas-platform
```

### Jenkins Pipeline

```groovy
pipeline {
  agent any
  
  stages {
    stage('Performance Tests') {
      steps {
        script {
          sh 'cd tools/performance-testing && npm install'
          
          // Run performance validation
          def result = sh(
            script: 'dna-perf ci --template high-performance-api',
            returnStatus: true
          )
          
          if (result != 0) {
            error("Performance tests failed")
          }
        }
      }
    }
  }
  
  post {
    always {
      publishHTML([
        allowMissing: false,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'reports',
        reportFiles: 'performance-report.html',
        reportName: 'Performance Report'
      ])
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**Tests Failing with Timeout**
```bash
# Increase timeout for slow environments
dna-perf test --type api --timeout 30s
```

**High Memory Usage During Tests**
```bash
# Reduce concurrent users
dna-perf test --type all --users 10 --duration 2m
```

**Baseline Creation Fails**
```bash
# Check if target services are running
curl http://localhost:3000/health

# Create baseline with lower load
dna-perf baseline create api --users 5
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=dna-perf:* dna-perf test --type api

# Save detailed logs
dna-perf test --type all --output ./logs --verbose
```

## 📚 API Reference

### Load Testing API

```javascript
import { runLoadTests } from './scripts/run-load-tests.js';

const results = await runLoadTests({
  type: 'api',
  users: 100,
  duration: '5m',
  templateType: 'high-performance-api'
});
```

### Baseline Management API

```javascript
import { BaselineManager } from './regression-tests/baseline-manager.js';

const manager = new BaselineManager();
await manager.createBaseline('api', testResults);
const comparison = await manager.compareToBaseline('api', currentResults);
```

### Performance Analysis API

```javascript
import { PerformanceAnalyzer } from './optimization-engine/performance-analyzer.js';

const analyzer = new PerformanceAnalyzer();
const analysis = await analyzer.analyzePerformance(testResults, 'api');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all performance targets are met
5. Submit a pull request

### Development Guidelines

- Maintain >90% test coverage
- Follow performance best practices
- Document all new features
- Include performance impact analysis

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built for comprehensive performance validation and optimization** 🚀