/**
 * @fileoverview Core types for the comprehensive testing framework
 */

// Framework Types
export type Framework = 'flutter' | 'react-native' | 'nextjs' | 'tauri' | 'sveltekit';

// Test Types
export type TestType = 'unit' | 'integration' | 'e2e' | 'performance' | 'accessibility' | 'security';

// Test Result Interfaces
export interface TestResult {
  framework: Framework;
  testType: TestType;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  coverage?: CoverageMetrics;
  performanceMetrics?: PerformanceMetrics;
}

export interface CoverageMetrics {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  bundleSize?: number;
  renderTime?: number;
  timeToInteractive?: number;
}

export interface SecurityMetrics {
  vulnerabilities: SecurityVulnerability[];
  codeSmells: CodeSmell[];
  technicalDebt: TechnicalDebtMetrics;
}

export interface SecurityVulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
  file: string;
  line?: number;
  cwe?: string;
  remediation?: string;
}

export interface CodeSmell {
  type: string;
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
  description: string;
  file: string;
  line?: number;
  suggestion?: string;
}

export interface TechnicalDebtMetrics {
  debtRatio: number;
  maintainabilityIndex: number;
  cyclomaticComplexity: number;
  duplicatedLines: number;
  codeSmellsCount: number;
}

export interface AccessibilityMetrics {
  score: number;
  violations: AccessibilityViolation[];
  wcagLevel: 'A' | 'AA' | 'AAA';
}

export interface AccessibilityViolation {
  id: string;
  description: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  nodes: AccessibilityNode[];
}

export interface AccessibilityNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

// Quality Gate Interfaces
export interface QualityGateConfig {
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  security: {
    maxCritical: number;
    maxHigh: number;
    maxMedium: number;
  };
  performance: {
    maxExecutionTime: number;
    maxMemoryUsage: number;
    maxBundleSize?: number;
    maxRenderTime?: number;
  };
  accessibility: {
    minScore: number;
    wcagLevel: 'A' | 'AA' | 'AAA';
    maxViolations: number;
  };
  technicalDebt: {
    maxDebtRatio: number;
    minMaintainabilityIndex: number;
    maxComplexity: number;
  };
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  results: {
    coverage: boolean;
    security: boolean;
    performance: boolean;
    accessibility: boolean;
    technicalDebt: boolean;
  };
  failures: QualityGateFailure[];
  recommendations: string[];
}

export interface QualityGateFailure {
  gate: string;
  metric: string;
  expected: number | string;
  actual: number | string;
  impact: 'critical' | 'major' | 'minor';
  remediation: string;
}

// Test Configuration Interfaces
export interface TestConfig {
  framework: Framework;
  testTypes: TestType[];
  coverage: {
    enabled: boolean;
    threshold: CoverageMetrics;
    reportPath: string;
  };
  performance: {
    enabled: boolean;
    benchmarks: PerformanceBenchmark[];
  };
  security: {
    enabled: boolean;
    scanners: SecurityScanner[];
  };
  accessibility: {
    enabled: boolean;
    wcagLevel: 'A' | 'AA' | 'AAA';
    axeConfig?: any;
  };
  qualityGates: QualityGateConfig;
}

export interface PerformanceBenchmark {
  name: string;
  metric: string;
  threshold: number;
  tolerance: number;
}

export interface SecurityScanner {
  name: string;
  command: string;
  args: string[];
  outputFormat: 'json' | 'xml' | 'sarif';
}

// Test Generation Interfaces
export interface TestGenerationConfig {
  targetPath: string;
  testPath: string;
  framework: Framework;
  patterns: TestPattern[];
  templates: TestTemplate[];
  coverageTargets?: {
    lines?: number;
    functions?: number;
    branches?: number;
    statements?: number;
  };
  maxTests?: number;
}

export interface TestPattern {
  name: string;
  pattern: RegExp;
  testType: TestType;
  template: string;
  priority: number;
}

export interface TestTemplate {
  name: string;
  framework: Framework;
  testType: TestType;
  template: string;
  variables: Record<string, any>;
}

// Adapter Interfaces
export interface TestAdapter {
  framework: Framework;
  runTests(config: TestConfig): Promise<TestResult[]>;
  generateTests(config: TestGenerationConfig): Promise<string[]>;
  validateQualityGates(results: TestResult[], config: QualityGateConfig): Promise<QualityGateResult>;
}

export interface FrameworkAdapter {
  framework: Framework;
  setupTest(): Promise<void>;
  teardownTest(): Promise<void>;
  runUnitTests(): Promise<TestResult[]>;
  runIntegrationTests(): Promise<TestResult[]>;
  runE2ETests(): Promise<TestResult[]>;
  runPerformanceTests(): Promise<TestResult[]>;
  runAccessibilityTests(): Promise<TestResult[]>;
  runSecurityTests(): Promise<TestResult[]>;
  getCoverage(): Promise<CoverageMetrics>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  getSecurityMetrics(): Promise<SecurityMetrics>;
  getAccessibilityMetrics(): Promise<AccessibilityMetrics>;
}

// Report Interfaces
export interface TestReport {
  framework: Framework;
  timestamp: Date;
  duration: number;
  summary: TestSummary;
  results: TestResult[];
  coverage: CoverageMetrics;
  performance: PerformanceMetrics;
  security: SecurityMetrics;
  accessibility: AccessibilityMetrics;
  qualityGate: QualityGateResult;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  successRate: number;
}

// Events for monitoring and notifications
export interface TestEvent {
  type: 'test-started' | 'test-completed' | 'test-failed' | 'quality-gate-failed' | 'report-generated';
  timestamp: Date;
  framework: Framework;
  data: any;
}

export type TestEventHandler = (event: TestEvent) => void;

// Coverage types for coverage-reporter.ts
export type FrameworkType = Framework;

export interface CoverageReport {
  framework: Framework;
  timestamp: Date;
  metrics: CoverageDetailedMetrics;
  thresholds: CoverageThreshold;
  passed: boolean;
  failures: string[];
  outputPath: string;
  projectPath?: string;
  detailedFiles?: any[];
}

export interface CoverageDetailedMetrics {
  lines: CoverageData;
  functions: CoverageData;
  branches: CoverageData;
  statements: CoverageData;
}

export interface CoverageData {
  total: number;
  covered: number;
  percentage: number;
  uncovered: CoverageUncoveredItem[];
}

export interface CoverageUncoveredItem {
  file: string;
  line: number;
  column?: number;
  reason: string;
}

export interface CoverageThreshold {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface CoverageConfig {
  enabled: boolean;
  threshold: CoverageThreshold;
  outputPath: string;
  formats: ('json' | 'html' | 'text' | 'lcov')[];
  excludePatterns: string[];
  includePatterns: string[];
}

// Additional types for compatibility
export type DNAModuleId = string;

export interface TemplateGenerationResult {
  success: boolean;
  outputPath: string;
  generatedFiles: string[];
  errors: string[];
  warnings: string[];
  metrics: {
    executionTime: number;
    filesGenerated: number;
    linesOfCode: number;
  };
}

export interface GeneratedTest {
  name: string;
  filePath: string;
  content: string;
  framework: Framework;
  testType: TestType;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}