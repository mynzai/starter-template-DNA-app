# Comprehensive Testing Framework

A comprehensive testing framework for the DNA template system that ensures 80%+ coverage, zero technical debt, and quality gates across all supported frameworks.

## Features

- **Multi-Framework Support**: Flutter, React Native, Next.js, Tauri, SvelteKit
- **Comprehensive Test Types**: Unit, Integration, E2E, Performance, Accessibility, Security
- **Quality Gates**: Automated quality enforcement with 80%+ coverage threshold
- **Zero Technical Debt**: Proactive debt detection and prevention
- **Automatic Test Generation**: AI-powered test creation for components, services, and APIs
- **Rich Reporting**: HTML, JSON, Markdown, and JUnit report formats
- **CI/CD Integration**: GitHub Actions, GitLab CI, CircleCI support
- **Progress Tracking**: Session-based progress monitoring and analytics

## Quick Start

### Installation

```bash
npm install @starter-template-dna/testing
```

### Basic Usage

```typescript
import { TestingFramework, TestRunner, createDefaultTestConfig } from '@starter-template-dna/testing';

// Initialize test runner
const testRunner = new TestRunner();

// Run tests for Next.js project
const result = await testRunner.runTests({
  frameworks: ['nextjs'],
  projectPath: './my-project',
  parallel: true,
  generateReports: true,
  reportFormats: ['html', 'json'],
});

console.log(`Tests: ${result.summary.totalTests}`);
console.log(`Coverage: ${result.summary.overallCoverage}%`);
console.log(`Quality Gates: ${result.summary.qualityGatesPassed}/${result.summary.totalFrameworks}`);
```

### CLI Usage

```bash
# Run comprehensive tests
dna-cli test --framework nextjs --types unit integration e2e

# Generate tests automatically
dna-cli test generate --framework nextjs --source ./src --output ./tests

# Validate quality gates
dna-cli test validate --framework nextjs --results ./test-results.json

# Watch mode
dna-cli test watch --framework nextjs --types unit
```

## Framework Support

### Next.js Testing

```typescript
import { NextjsTestAdapter } from '@starter-template-dna/testing';

const adapter = new NextjsTestAdapter('./my-nextjs-app');

// Supports:
// - Jest unit tests with React Testing Library
// - Playwright E2E tests
// - Lighthouse performance audits
// - Axe accessibility testing
// - ESLint security analysis
```

### React Native Testing

```typescript
import { ReactNativeTestAdapter } from '@starter-template-dna/testing';

const adapter = new ReactNativeTestAdapter('./my-rn-app');

// Supports:
// - Jest unit tests with React Native Testing Library
// - Detox E2E tests
// - Performance profiling
// - Accessibility testing
// - Security auditing
```

### Flutter Testing

```typescript
import { FlutterTestAdapter } from '@starter-template-dna/testing';

const adapter = new FlutterTestAdapter('./my-flutter-app');

// Supports:
// - Widget tests
// - Integration tests
// - Golden file testing
// - Performance profiling
// - Accessibility testing
```

### Tauri Testing

```typescript
import { TauriTestAdapter } from '@starter-template-dna/testing';

const adapter = new TauriTestAdapter('./my-tauri-app');

// Supports:
// - Rust unit tests with Cargo
// - Frontend tests with Jest
// - Integration tests
// - Performance benchmarks
// - Security auditing (Cargo audit + npm audit)
```

## Test Generation

### Automatic Test Generation

```typescript
import { TestGenerationEngine } from '@starter-template-dna/testing';

const generator = new TestGenerationEngine();

const files = await generator.generateTests({
  targetPath: './src',
  testPath: './tests',
  framework: 'nextjs',
  patterns: [], // Uses default patterns
  templates: [], // Uses default templates
});

console.log(`Generated ${files.length} test files`);
```

### Custom Test Patterns

```typescript
import { TestPattern } from '@starter-template-dna/testing';

const customPattern: TestPattern = {
  name: 'api-route',
  pattern: /export\s+default\s+function\s+handler/,
  testType: 'integration',
  template: 'api-test',
  priority: 8,
};

generator.registerPattern(customPattern);
```

### Custom Test Templates

```typescript
import { TestTemplate } from '@starter-template-dna/testing';

const customTemplate: TestTemplate = {
  name: 'api-test',
  framework: 'nextjs',
  testType: 'integration',
  template: `
import { createMocks } from 'node-mocks-http';
import handler from '{{importPath}}';

describe('{{className}} API', () => {
  it('should handle GET requests', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});`,
  variables: {},
};

generator.registerTemplate(customTemplate);
```

## Quality Gates

### Default Quality Gate Configuration

```typescript
const qualityGates = {
  coverage: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
  security: {
    maxCritical: 0,
    maxHigh: 0,
    maxMedium: 5,
  },
  performance: {
    maxExecutionTime: 30000, // 30 seconds
    maxMemoryUsage: 200 * 1024 * 1024, // 200MB
    maxBundleSize: 2 * 1024 * 1024, // 2MB
    maxRenderTime: 3000, // 3 seconds
  },
  accessibility: {
    minScore: 95,
    wcagLevel: 'AA',
    maxViolations: 0,
  },
  technicalDebt: {
    maxDebtRatio: 5,
    minMaintainabilityIndex: 60,
    maxComplexity: 10,
  },
};
```

### Custom Quality Gates

```typescript
import { createFrameworkQualityGateConfig } from '@starter-template-dna/testing';

// Get framework-specific defaults
const nextjsGates = createFrameworkQualityGateConfig('nextjs');

// Customize for your project
const customGates = {
  ...nextjsGates,
  coverage: {
    lines: 90, // Higher coverage requirement
    functions: 90,
    branches: 85,
    statements: 90,
  },
  performance: {
    ...nextjsGates.performance,
    maxBundleSize: 1.5 * 1024 * 1024, // Stricter bundle size
  },
};
```

## Reporting

### HTML Reports

Rich interactive HTML reports with:
- Test results overview
- Coverage visualization
- Performance metrics
- Quality gate status
- Failure details and recommendations

### JSON Reports

Machine-readable reports for CI/CD integration:

```json
{
  "framework": "nextjs",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": 45000,
  "summary": {
    "total": 150,
    "passed": 142,
    "failed": 8,
    "skipped": 0,
    "successRate": 94.67
  },
  "coverage": {
    "lines": 87.5,
    "functions": 89.2,
    "branches": 84.1,
    "statements": 87.8
  },
  "qualityGate": {
    "passed": true,
    "score": 92.5,
    "results": {
      "coverage": true,
      "security": true,
      "performance": true,
      "accessibility": true,
      "technicalDebt": true
    }
  }
}
```

### Custom Report Formats

```typescript
import { TestReportGenerator, ReportFormat } from '@starter-template-dna/testing';

const generator = new TestReportGenerator();

await generator.generateFormattedReports(report, {
  formats: ['json', 'html', 'junit'],
  outputDir: './test-reports',
});
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run comprehensive tests
        run: npx dna-cli test --framework nextjs --types unit integration e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### GitLab CI

```yaml
test:
  stage: test
  script:
    - npm ci
    - npx dna-cli test --framework nextjs --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## Progress Tracking

### Session Management

```typescript
import { ProgressTracker } from '@starter-template-dna/testing';

const tracker = new ProgressTracker();

// Start a session
const sessionId = await tracker.startSession({
  type: 'testing',
  frameworks: ['nextjs'],
  projectPath: './my-project',
});

// Update progress
await tracker.updateSession(sessionId, {
  testsRun: 50,
  testsPassed: 45,
  coverage: 85.2,
});

// End session
await tracker.endSession(sessionId, {
  success: true,
  metrics: { /* final metrics */ },
});
```

### Analytics

```typescript
// Get session statistics
const stats = await tracker.getSessionStats('week');

console.log(`Sessions this week: ${stats.totalSessions}`);
console.log(`Success rate: ${(stats.completedSessions / stats.totalSessions * 100).toFixed(1)}%`);
console.log(`Average coverage: ${stats.averageCoverage.toFixed(1)}%`);
console.log(`Quality gate success: ${stats.qualityGateSuccessRate.toFixed(1)}%`);
```

## DNA Module Integration

### Using the Testing DNA Module

```typescript
import { ComprehensiveTestingModule } from '@starter-template-dna/testing';

const testingModule = new ComprehensiveTestingModule();

await testingModule.configure({
  targetFramework: 'nextjs',
  testTypes: ['unit', 'integration', 'e2e', 'performance', 'accessibility'],
  coverageThresholds: {
    lines: 85,
    functions: 85,
    branches: 80,
    statements: 85,
  },
  qualityGates: {
    enforceStrict: true,
    failOnCoverageThreshold: true,
    failOnSecurityVulnerabilities: true,
    failOnPerformanceRegression: true,
  },
  ciIntegration: {
    enabled: true,
    provider: 'github-actions',
    reportFormats: ['json', 'html', 'junit'],
  },
  testGeneration: {
    autoGenerate: true,
    overwriteExisting: false,
    includeSnapshots: true,
    includeMocks: true,
  },
});

await testingModule.install();
```

## Advanced Configuration

### Framework-Specific Settings

```typescript
const config = createDefaultTestConfig('nextjs');

// Customize for Next.js
config.performance.benchmarks.push({
  name: 'Core Web Vitals',
  metric: 'timeToInteractive',
  threshold: 2500, // 2.5 seconds
  tolerance: 10,
});

config.accessibility.axeConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'aria-labels': { enabled: true },
  },
};
```

### Custom Test Environment

```typescript
import { TestConfig } from '@starter-template-dna/testing';

const customConfig: TestConfig = {
  framework: 'nextjs',
  testTypes: ['unit', 'integration', 'e2e', 'performance', 'accessibility', 'security'],
  coverage: {
    enabled: true,
    threshold: { lines: 90, functions: 90, branches: 85, statements: 90 },
    reportPath: './coverage',
  },
  performance: {
    enabled: true,
    benchmarks: [
      {
        name: 'Page Load Time',
        metric: 'renderTime',
        threshold: 1500, // 1.5 seconds
        tolerance: 10,
      },
    ],
  },
  security: {
    enabled: true,
    scanners: [
      {
        name: 'custom-security-scanner',
        command: 'npx',
        args: ['my-security-tool', '--json'],
        outputFormat: 'json',
      },
    ],
  },
  accessibility: {
    enabled: true,
    wcagLevel: 'AAA', // Highest standard
  },
  qualityGates: {
    coverage: { lines: 90, functions: 90, branches: 85, statements: 90 },
    security: { maxCritical: 0, maxHigh: 0, maxMedium: 0 },
    performance: { maxExecutionTime: 25000, maxMemoryUsage: 150 * 1024 * 1024 },
    accessibility: { minScore: 98, wcagLevel: 'AAA', maxViolations: 0 },
    technicalDebt: { maxDebtRatio: 3, minMaintainabilityIndex: 70, maxComplexity: 8 },
  },
};
```

## API Reference

### Core Classes

- **TestingFramework**: Main orchestrator for test execution
- **TestRunner**: High-level interface for running tests
- **QualityGateEngine**: Quality gate validation and enforcement
- **TestGenerationEngine**: Automatic test generation
- **TestReportGenerator**: Report generation in multiple formats
- **ProgressTracker**: Session tracking and analytics

### Framework Adapters

- **FlutterTestAdapter**: Flutter-specific testing
- **ReactNativeTestAdapter**: React Native testing with Detox
- **NextjsTestAdapter**: Next.js testing with Playwright
- **TauriTestAdapter**: Tauri desktop application testing

### Utility Functions

- **createDefaultTestConfig**: Generate default configuration for frameworks
- **createFrameworkQualityGateConfig**: Framework-specific quality gates
- **mergeTestConfig**: Merge custom configuration with defaults

## Best Practices

### Test Organization

1. **Co-locate tests**: Keep tests close to source code
2. **Use descriptive names**: Test names should describe behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies**: Keep tests isolated
5. **Test edge cases**: Include error conditions and boundaries

### Coverage Strategy

1. **Aim for 80%+ coverage**: Minimum threshold for quality gates
2. **Focus on critical paths**: Prioritize business logic
3. **Include integration tests**: Test component interactions
4. **Avoid testing implementation details**: Test behavior, not internals

### Performance Testing

1. **Set realistic thresholds**: Based on actual user requirements
2. **Test on realistic hardware**: Use CI environments similar to production
3. **Monitor trends**: Track performance over time
4. **Test different scenarios**: Various data sizes and user flows

### Security Testing

1. **Regular dependency audits**: Automated scanning in CI
2. **Static code analysis**: Use ESLint security plugins
3. **Input validation testing**: Test with malicious inputs
4. **Authentication testing**: Verify access controls

## Troubleshooting

### Common Issues

#### Test Generation Fails

```bash
# Check file permissions
ls -la src/

# Verify framework support
dna-cli test --help

# Enable verbose logging
dna-cli test generate --verbose
```

#### Quality Gates Failing

```bash
# Check specific failures
dna-cli test validate --results ./test-results.json

# Run with detailed output
dna-cli test --verbose --fail-fast
```

#### Performance Issues

```bash
# Run only performance tests
dna-cli test --types performance

# Check system resources
top
free -h
```

#### Coverage Too Low

```bash
# Generate coverage report
dna-cli test --coverage --types unit

# Identify uncovered files
open coverage/lcov-report/index.html
```

### Debug Mode

```bash
# Enable debug logging
dna-cli test --debug --verbose

# Set environment variables
DEBUG=dna-testing:* dna-cli test
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on contributing to the testing framework.

## License

MIT License - see [LICENSE](../../LICENSE) for details.