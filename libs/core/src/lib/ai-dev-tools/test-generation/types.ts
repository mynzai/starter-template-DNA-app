/**
 * @fileoverview Test Generation Types
 * Type definitions for AC3: Test Generation Assistance
 */

export interface TestGenerationRequest {
  sourceCode: string;
  sourceFile: string;
  language: SupportedTestLanguage;
  framework?: TestFramework;
  testType: TestType;
  coverageTarget?: number;
  options?: TestGenerationOptions;
}

export interface TestGenerationResponse {
  id: string;
  sourceFile: string;
  testFile: string;
  testCode: string;
  framework: TestFramework;
  testType: TestType;
  coverage: CoverageAnalysisResult;
  suggestions: TestSuggestion[];
  metrics: TestGenerationMetrics;
  timestamp: number;
}

export interface TestGenerationOptions {
  includeSetup?: boolean;
  includeTeardown?: boolean;
  includeEdgeCases?: boolean;
  includeMockGeneration?: boolean;
  includeIntegrationTests?: boolean;
  includeE2ETests?: boolean;
  generateTestData?: boolean;
  optimizeForCI?: boolean;
  followBestPractices?: boolean;
  customPatterns?: TestPattern[];
  maxTestsPerFunction?: number;
  complexityThreshold?: number;
}

export type SupportedTestLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'scala'
  | 'cpp'
  | 'c';

export type TestFramework = 
  // JavaScript/TypeScript
  | 'jest'
  | 'mocha'
  | 'jasmine'
  | 'vitest'
  | 'cypress'
  | 'playwright'
  | 'testing-library'
  | 'enzyme'
  
  // Python
  | 'pytest'
  | 'unittest'
  | 'nose2'
  | 'behave'
  
  // Java
  | 'junit5'
  | 'junit4'
  | 'testng'
  | 'mockito'
  | 'spring-test'
  
  // C#
  | 'nunit'
  | 'mstest'
  | 'xunit'
  
  // Go
  | 'go-test'
  | 'testify'
  | 'ginkgo'
  
  // Rust
  | 'rust-test'
  | 'rstest'
  
  // PHP
  | 'phpunit'
  | 'codeception'
  
  // Ruby
  | 'rspec'
  | 'minitest'
  
  // Swift
  | 'xctest'
  | 'quick-nimble'
  
  // Kotlin
  | 'junit-kotlin'
  | 'kotest'
  
  // Dart/Flutter
  | 'flutter-test'
  | 'test-dart'
  
  // C++
  | 'gtest'
  | 'catch2'
  | 'boost-test';

export type TestType = 
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'api'
  | 'component'
  | 'snapshot'
  | 'visual'
  | 'performance'
  | 'security'
  | 'contract'
  | 'mutation';

export interface TestFrameworkConfig {
  framework: TestFramework;
  language: SupportedTestLanguage;
  version?: string;
  dependencies: string[];
  setupFiles: string[];
  configFiles: TestConfigFile[];
  testFilePattern: string;
  testDirectory: string;
  mockingLibrary?: string;
  assertionLibrary?: string;
  runner?: string;
  coverage?: CoverageConfig;
  plugins?: string[];
  presets?: string[];
}

export interface TestConfigFile {
  filename: string;
  content: string;
  type: 'config' | 'setup' | 'teardown' | 'helper';
  required: boolean;
}

export interface CoverageConfig {
  enabled: boolean;
  threshold: CoverageThreshold;
  reporters: CoverageReporter[];
  collectFrom: string[];
  exclude: string[];
  collectCoverageFrom?: string[];
}

export interface CoverageThreshold {
  global: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
  perFile?: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
}

export type CoverageReporter = 
  | 'text'
  | 'html'
  | 'lcov'
  | 'json'
  | 'clover'
  | 'cobertura'
  | 'text-summary'
  | 'json-summary';

export interface CoverageAnalysisResult {
  overall: number;
  branches: number;
  functions: number;
  lines: number;
  statements: number;
  files: FileCoverageResult[];
  uncoveredLines: UncoveredLine[];
  threshold: CoverageThreshold;
  meetThreshold: boolean;
  gaps: CoverageGap[];
}

export interface FileCoverageResult {
  filename: string;
  coverage: number;
  lines: {
    total: number;
    covered: number;
    uncovered: number[];
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    uncovered: number[];
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    uncovered: string[];
    percentage: number;
  };
  statements: {
    total: number;
    covered: number;
    uncovered: number[];
    percentage: number;
  };
}

export interface UncoveredLine {
  filename: string;
  line: number;
  type: 'branch' | 'function' | 'statement';
  code: string;
  reason: string;
  suggestion: string;
}

export interface CoverageGap {
  type: 'missing_branch' | 'missing_function' | 'missing_edge_case' | 'missing_error_handling';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    filename: string;
    line: number;
    function?: string;
  };
  suggestedTest: string;
  priority: number;
}

export interface TestSuggestion {
  id: string;
  type: 'improvement' | 'coverage' | 'performance' | 'maintainability' | 'best_practice';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  currentCode?: string;
  suggestedCode: string;
  reasoning: string;
  confidence: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface TestGenerationMetrics {
  generationTime: number;
  testsGenerated: number;
  functionsTestedCount: number;
  totalFunctions: number;
  coverageImprovement: number;
  complexity: number;
  maintainabilityScore: number;
  aiConfidence: number;
  humanReviewRecommended: boolean;
  estimatedExecutionTime: number;
  resourceRequirements: ResourceRequirement[];
}

export interface ResourceRequirement {
  type: 'memory' | 'cpu' | 'network' | 'disk';
  amount: number;
  unit: string;
  reason: string;
}

export interface TestPattern {
  id: string;
  name: string;
  description: string;
  language: SupportedTestLanguage;
  framework: TestFramework;
  pattern: string;
  variables: TestPatternVariable[];
  examples: string[];
  category: TestPatternCategory;
  complexity: number;
  applicableTestTypes: TestType[];
}

export interface TestPatternVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: string;
}

export type TestPatternCategory = 
  | 'setup'
  | 'assertion'
  | 'mocking'
  | 'data-generation'
  | 'error-handling'
  | 'async-testing'
  | 'performance'
  | 'integration'
  | 'ui-testing'
  | 'api-testing';

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: GeneratedTest[];
  setup?: string;
  teardown?: string;
  dependencies: string[];
  estimatedRunTime: number;
  parallelizable: boolean;
  tags: string[];
}

export interface GeneratedTest {
  id: string;
  name: string;
  description: string;
  type: TestType;
  code: string;
  assertions: TestAssertion[];
  mocks: TestMock[];
  testData: TestData[];
  expectedResult: any;
  tags: string[];
  skip?: boolean;
  skipReason?: string;
  timeout?: number;
  retries?: number;
  complexity: number;
}

export interface TestAssertion {
  type: 'equality' | 'truthiness' | 'type' | 'error' | 'custom';
  expected: any;
  actual: string;
  message?: string;
  line: number;
}

export interface TestMock {
  target: string;
  type: 'function' | 'module' | 'class' | 'api';
  mockImplementation?: string;
  returnValue?: any;
  throwError?: string;
  callCount?: number;
  calledWith?: any[];
}

export interface TestData {
  id: string;
  type: 'input' | 'output' | 'fixture' | 'mock_data';
  name: string;
  value: any;
  description: string;
  generator?: string;
  category: 'valid' | 'invalid' | 'edge_case' | 'boundary';
}

export interface FrameworkDetectionResult {
  framework: TestFramework;
  confidence: number;
  evidence: string[];
  version?: string;
  configFiles: string[];
  testFiles: string[];
  dependencies: string[];
}

export interface TestOptimizationResult {
  originalTests: number;
  optimizedTests: number;
  duplicatesRemoved: number;
  redundantTestsRemoved: number;
  combinedTests: number;
  executionTimeReduction: number;
  suggestions: OptimizationSuggestion[];
}

export interface OptimizationSuggestion {
  type: 'combine' | 'remove' | 'refactor' | 'parallelize' | 'mock';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  testIds: string[];
  code?: string;
}

export interface TestExecutionResult {
  id: string;
  testSuiteId: string;
  testId: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: TestError;
  output?: string;
  coverage?: FileCoverageResult;
  assertions: AssertionResult[];
  metadata: TestExecutionMetadata;
}

export interface TestError {
  type: 'assertion' | 'runtime' | 'timeout' | 'setup' | 'teardown';
  message: string;
  stack?: string;
  line?: number;
  column?: number;
  expected?: any;
  actual?: any;
}

export interface AssertionResult {
  line: number;
  type: string;
  passed: boolean;
  message?: string;
  expected?: any;
  actual?: any;
}

export interface TestExecutionMetadata {
  environment: string;
  nodeVersion?: string;
  framework: TestFramework;
  frameworkVersion: string;
  runId: string;
  timestamp: number;
  ci: boolean;
  parallel: boolean;
  retries: number;
}

export interface TestValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  score: number;
}

export interface ValidationError {
  type: 'syntax' | 'logic' | 'framework' | 'dependency' | 'best_practice';
  severity: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
  rule: string;
  fix?: string;
}

export interface ValidationWarning {
  type: 'performance' | 'maintainability' | 'readability' | 'convention';
  message: string;
  line?: number;
  column?: number;
  suggestion: string;
}

export interface TestAnalyticsData {
  testSuiteId: string;
  generationMetrics: TestGenerationMetrics;
  executionResults: TestExecutionResult[];
  coverageHistory: CoverageAnalysisResult[];
  performanceMetrics: TestPerformanceMetrics;
  qualityMetrics: TestQualityMetrics;
  trends: TestTrends;
}

export interface TestPerformanceMetrics {
  averageExecutionTime: number;
  slowestTests: string[];
  fastestTests: string[];
  memoryUsage: number;
  cpuUsage: number;
  parallelizationEfficiency: number;
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  type: 'setup' | 'execution' | 'teardown' | 'io' | 'computation';
  description: string;
  impact: number;
  suggestion: string;
  testIds: string[];
}

export interface TestQualityMetrics {
  maintainabilityIndex: number;
  duplicateCodePercentage: number;
  testSmells: TestSmell[];
  complexity: number;
  readabilityScore: number;
  assertionRatio: number;
  mockingRatio: number;
}

export interface TestSmell {
  type: 'assertion_roulette' | 'eager_test' | 'mystery_guest' | 'sensitive_equality' | 'general_fixture';
  description: string;
  severity: 'low' | 'medium' | 'high';
  testIds: string[];
  suggestion: string;
}

export interface TestTrends {
  coverageTrend: TrendData[];
  executionTimeTrend: TrendData[];
  passRateTrend: TrendData[];
  testCountTrend: TrendData[];
  qualityTrend: TrendData[];
}

export interface TrendData {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface TestGenerationPreset {
  name: string;
  description: string;
  language: SupportedTestLanguage;
  framework: TestFramework;
  testTypes: TestType[];
  options: TestGenerationOptions;
  patterns: string[];
  coverage: {
    target: number;
    strict: boolean;
  };
  optimization: {
    enabled: boolean;
    aggressive: boolean;
  };
}

export interface TestReportConfig {
  format: 'html' | 'json' | 'xml' | 'markdown' | 'text';
  includeCoverage: boolean;
  includeMetrics: boolean;
  includeSuggestions: boolean;
  includeCodeSamples: boolean;
  template?: string;
  outputPath: string;
  timestamp: boolean;
}

export interface SmartTestSelection {
  enabled: boolean;
  strategy: 'changed_files' | 'dependency_graph' | 'risk_based' | 'ml_prediction';
  confidence: number;
  selectedTests: string[];
  skippedTests: string[];
  reasoning: string[];
  estimatedTimeReduction: number;
}

export interface TestMaintenance {
  outdatedTests: OutdatedTest[];
  brokenTests: BrokenTest[];
  redundantTests: RedundantTest[];
  improvementSuggestions: MaintenanceSuggestion[];
  refactoringOpportunities: RefactoringOpportunity[];
}

export interface OutdatedTest {
  testId: string;
  reason: string;
  lastUpdated: number;
  relatedChanges: string[];
  updateSuggestion: string;
}

export interface BrokenTest {
  testId: string;
  error: TestError;
  possibleCauses: string[];
  fixSuggestions: string[];
  priority: number;
}

export interface RedundantTest {
  testId: string;
  duplicateOf: string[];
  similarity: number;
  combinationSuggestion: string;
}

export interface MaintenanceSuggestion {
  type: 'update' | 'remove' | 'combine' | 'split' | 'refactor';
  description: string;
  priority: number;
  effort: 'low' | 'medium' | 'high';
  benefit: 'low' | 'medium' | 'high';
  testIds: string[];
}

export interface RefactoringOpportunity {
  type: 'extract_common' | 'parameterize' | 'reduce_duplication' | 'improve_readability';
  description: string;
  impact: 'low' | 'medium' | 'high';
  code: string;
  testIds: string[];
}

export interface TestGenerationConfig {
  defaultLanguage: SupportedTestLanguage;
  defaultFramework: TestFramework;
  defaultOptions: TestGenerationOptions;
  presets: TestGenerationPreset[];
  validation: {
    enabled: boolean;
    strict: boolean;
    rules: string[];
  };
  optimization: {
    enabled: boolean;
    aggressive: boolean;
    parallelization: boolean;
  };
  reporting: TestReportConfig;
  maintenance: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    autoFix: boolean;
  };
  ai: {
    provider: 'openai' | 'anthropic' | 'ollama';
    model: string;
    temperature: number;
    maxTokens: number;
  };
}