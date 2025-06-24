/**
 * @fileoverview Test Generation Module
 * Exports for AC3: Test Generation Assistance for multiple frameworks
 */

// Main service
export { TestGenerationService } from './test-generation-service';

// Supporting services
export { TestFrameworkManager } from './test-framework-manager';
export { TestPatternEngine } from './test-pattern-engine';
export { CoverageAnalyzer } from './coverage-analyzer';
export { TestValidator } from './test-validator';
export { TestOptimizer } from './test-optimizer';

// Types
export type {
  // Core request/response types
  TestGenerationRequest,
  TestGenerationResponse,
  TestGenerationOptions,
  TestGenerationConfig,
  TestGenerationMetrics,
  
  // Language and framework types
  SupportedTestLanguage,
  TestFramework,
  TestType,
  TestFrameworkConfig,
  FrameworkDetectionResult,
  
  // Test suite and test types
  TestSuite,
  GeneratedTest,
  TestAssertion,
  TestMock,
  TestData,
  
  // Pattern and template types
  TestPattern,
  TestPatternVariable,
  TestPatternCategory,
  
  // Coverage types
  CoverageAnalysisResult,
  FileCoverageResult,
  CoverageGap,
  UncoveredLine,
  CoverageThreshold,
  CoverageConfig,
  CoverageReporter,
  
  // Validation types
  TestValidationResult,
  ValidationError,
  ValidationWarning,
  
  // Optimization types
  TestOptimizationResult,
  OptimizationSuggestion,
  
  // Suggestion types
  TestSuggestion,
  
  // Execution types
  TestExecutionResult,
  TestError,
  AssertionResult,
  TestExecutionMetadata,
  
  // Analytics types
  TestAnalyticsData,
  TestPerformanceMetrics,
  TestQualityMetrics,
  TestTrends,
  TestSmell,
  PerformanceBottleneck,
  TrendData,
  
  // Configuration types
  TestConfigFile,
  TestGenerationPreset,
  TestReportConfig,
  SmartTestSelection,
  
  // Maintenance types
  TestMaintenance,
  OutdatedTest,
  BrokenTest,
  RedundantTest,
  MaintenanceSuggestion,
  RefactoringOpportunity,
  
  // Resource types
  ResourceRequirement
} from './types';

// Utility functions for creating configurations
export const createTestGenerationConfig = (
  language: SupportedTestLanguage,
  framework: TestFramework,
  options?: Partial<TestGenerationOptions>
): TestGenerationConfig => ({
  defaultLanguage: language,
  defaultFramework: framework,
  defaultOptions: {
    includeSetup: true,
    includeTeardown: true,
    includeEdgeCases: true,
    includeMockGeneration: true,
    includeIntegrationTests: false,
    includeE2ETests: false,
    generateTestData: true,
    optimizeForCI: true,
    followBestPractices: true,
    maxTestsPerFunction: 5,
    complexityThreshold: 10,
    ...options
  },
  presets: [],
  validation: {
    enabled: true,
    strict: false,
    rules: ['no-duplicate-tests', 'proper-assertions', 'mock-usage']
  },
  optimization: {
    enabled: true,
    aggressive: false,
    parallelization: true
  },
  reporting: {
    format: 'html',
    includeCoverage: true,
    includeMetrics: true,
    includeSuggestions: true,
    includeCodeSamples: true,
    outputPath: './test-reports',
    timestamp: true
  },
  maintenance: {
    enabled: true,
    frequency: 'weekly',
    autoFix: false
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 2000
  }
});

export const createJavaScriptTestConfig = (framework: 'jest' | 'mocha' | 'vitest' = 'jest') => 
  createTestGenerationConfig('javascript', framework);

export const createTypeScriptTestConfig = (framework: 'jest' | 'vitest' | 'mocha' = 'jest') => 
  createTestGenerationConfig('typescript', framework);

export const createPythonTestConfig = (framework: 'pytest' | 'unittest' = 'pytest') => 
  createTestGenerationConfig('python', framework);

export const createJavaTestConfig = (framework: 'junit5' | 'junit4' | 'testng' = 'junit5') => 
  createTestGenerationConfig('java', framework);

export const createCSharpTestConfig = (framework: 'nunit' | 'xunit' | 'mstest' = 'nunit') => 
  createTestGenerationConfig('csharp', framework);

export const createGoTestConfig = () => 
  createTestGenerationConfig('go', 'go-test');

export const createRustTestConfig = () => 
  createTestGenerationConfig('rust', 'rust-test');

// Factory function for creating test generation service
export const createTestGenerationService = (config?: Partial<TestGenerationConfig>) => {
  return new TestGenerationService(config);
};

// Type guards
export const isUnitTest = (test: GeneratedTest): boolean => {
  return test.type === 'unit';
};

export const isIntegrationTest = (test: GeneratedTest): boolean => {
  return test.type === 'integration';
};

export const isE2ETest = (test: GeneratedTest): boolean => {
  return test.type === 'e2e';
};

export const hasAssertions = (test: GeneratedTest): boolean => {
  return test.assertions.length > 0;
};

export const hasMocks = (test: GeneratedTest): boolean => {
  return test.mocks.length > 0;
};

export const isAsyncTest = (test: GeneratedTest): boolean => {
  return test.code.includes('async') || test.code.includes('await');
};

export const isComplexTest = (test: GeneratedTest): boolean => {
  return test.complexity > 7;
};

// Coverage helpers
export const meetsCoverageThreshold = (result: CoverageAnalysisResult): boolean => {
  return result.meetThreshold;
};

export const getCoverageGrade = (coverage: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (coverage >= 90) return 'A';
  if (coverage >= 80) return 'B';
  if (coverage >= 70) return 'C';
  if (coverage >= 60) return 'D';
  return 'F';
};

export const getHighPriorityGaps = (result: CoverageAnalysisResult): CoverageGap[] => {
  return result.gaps.filter(gap => gap.severity === 'high' || gap.severity === 'critical');
};

// Validation helpers
export const hasValidationErrors = (result: TestValidationResult): boolean => {
  return result.errors.length > 0;
};

export const getValidationGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  return getCoverageGrade(score);
};

export const getCriticalErrors = (result: TestValidationResult): ValidationError[] => {
  return result.errors.filter(error => error.severity === 'error');
};

// Optimization helpers
export const hasOptimizationOpportunities = (result: TestOptimizationResult): boolean => {
  return result.suggestions.length > 0;
};

export const getHighImpactOptimizations = (result: TestOptimizationResult): OptimizationSuggestion[] => {
  return result.suggestions.filter(suggestion => suggestion.impact === 'high');
};

export const calculateOptimizationBenefit = (result: TestOptimizationResult): number => {
  const testReduction = ((result.originalTests - result.optimizedTests) / result.originalTests) * 100;
  return Math.round(testReduction + result.executionTimeReduction);
};

// Framework detection helpers
export const detectLanguageFromFile = (filename: string): SupportedTestLanguage => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, SupportedTestLanguage> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'scala': 'scala',
    'cpp': 'cpp',
    'cc': 'cpp',
    'c': 'c'
  };
  
  return languageMap[extension || 'js'] || 'javascript';
};

export const getDefaultFrameworkForLanguage = (language: SupportedTestLanguage): TestFramework => {
  const defaults: Record<SupportedTestLanguage, TestFramework> = {
    'javascript': 'jest',
    'typescript': 'jest',
    'python': 'pytest',
    'java': 'junit5',
    'csharp': 'nunit',
    'go': 'go-test',
    'rust': 'rust-test',
    'php': 'phpunit',
    'ruby': 'rspec',
    'swift': 'xctest',
    'kotlin': 'junit-kotlin',
    'dart': 'flutter-test',
    'scala': 'junit5',
    'cpp': 'gtest',
    'c': 'gtest'
  };
  
  return defaults[language];
};

export const getSupportedFrameworksForLanguage = (language: SupportedTestLanguage): TestFramework[] => {
  const frameworks: Record<SupportedTestLanguage, TestFramework[]> = {
    'javascript': ['jest', 'mocha', 'jasmine', 'vitest', 'cypress', 'playwright'],
    'typescript': ['jest', 'vitest', 'mocha', 'cypress', 'playwright'],
    'python': ['pytest', 'unittest', 'nose2', 'behave'],
    'java': ['junit5', 'junit4', 'testng', 'mockito', 'spring-test'],
    'csharp': ['nunit', 'mstest', 'xunit'],
    'go': ['go-test', 'testify', 'ginkgo'],
    'rust': ['rust-test', 'rstest'],
    'php': ['phpunit', 'codeception'],
    'ruby': ['rspec', 'minitest'],
    'swift': ['xctest', 'quick-nimble'],
    'kotlin': ['junit-kotlin', 'kotest'],
    'dart': ['flutter-test', 'test-dart'],
    'scala': ['junit5'],
    'cpp': ['gtest', 'catch2', 'boost-test'],
    'c': ['gtest']
  };
  
  return frameworks[language] || [];
};

// Event constants
export const TEST_GENERATION_EVENTS = {
  // Service lifecycle
  SERVICE_INITIALIZED: 'service:initialized',
  SERVICE_ERROR: 'service:error',
  SERVICE_SHUTDOWN: 'service:shutdown',
  
  // Generation process
  GENERATION_STARTED: 'generation:started',
  GENERATION_PROGRESS: 'generation:progress',
  GENERATION_COMPLETED: 'generation:completed',
  GENERATION_ERROR: 'generation:error',
  GENERATION_OPTIMIZED: 'generation:optimized',
  
  // Framework manager
  FRAMEWORK_DETECTED: 'framework:detected',
  FRAMEWORK_SETUP_CREATED: 'framework:setup_created',
  
  // Pattern engine
  PATTERN_CREATED: 'pattern:created',
  PATTERN_UPDATED: 'pattern:updated',
  PATTERN_DELETED: 'pattern:deleted',
  
  // Validation
  VALIDATION_COMPLETED: 'validation:completed',
  VALIDATION_ERROR: 'validation:error',
  
  // Coverage analysis
  COVERAGE_ANALYZED: 'coverage:analyzed',
  COVERAGE_IMPROVED: 'coverage:improved',
  
  // Optimization
  OPTIMIZATION_COMPLETED: 'optimization:completed',
  OPTIMIZATION_APPLIED: 'optimization:applied'
} as const;

// Default configurations
export const DEFAULT_TEST_GENERATION_OPTIONS: TestGenerationOptions = {
  includeSetup: true,
  includeTeardown: true,
  includeEdgeCases: true,
  includeMockGeneration: true,
  includeIntegrationTests: false,
  includeE2ETests: false,
  generateTestData: true,
  optimizeForCI: true,
  followBestPractices: true,
  maxTestsPerFunction: 5,
  complexityThreshold: 10
};

export const DEFAULT_COVERAGE_THRESHOLD: CoverageThreshold = {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
};

// Test generation presets
export const UNIT_TEST_PRESET: TestGenerationPreset = {
  name: 'Unit Testing',
  description: 'Comprehensive unit test generation',
  language: 'typescript',
  framework: 'jest',
  testTypes: ['unit'],
  options: {
    includeSetup: true,
    includeTeardown: true,
    includeEdgeCases: true,
    includeMockGeneration: true,
    includeIntegrationTests: false,
    includeE2ETests: false,
    generateTestData: true,
    optimizeForCI: true,
    followBestPractices: true,
    maxTestsPerFunction: 5,
    complexityThreshold: 8
  },
  patterns: ['basic-function-test', 'edge-case-test', 'error-handling-test'],
  coverage: {
    target: 85,
    strict: false
  },
  optimization: {
    enabled: true,
    aggressive: false
  }
};

export const INTEGRATION_TEST_PRESET: TestGenerationPreset = {
  name: 'Integration Testing',
  description: 'API and database integration tests',
  language: 'typescript',
  framework: 'jest',
  testTypes: ['integration', 'api'],
  options: {
    includeSetup: true,
    includeTeardown: true,
    includeEdgeCases: false,
    includeMockGeneration: false,
    includeIntegrationTests: true,
    includeE2ETests: false,
    generateTestData: true,
    optimizeForCI: true,
    followBestPractices: true,
    maxTestsPerFunction: 3,
    complexityThreshold: 12
  },
  patterns: ['api-test', 'database-test', 'service-integration-test'],
  coverage: {
    target: 70,
    strict: false
  },
  optimization: {
    enabled: false,
    aggressive: false
  }
};

export const E2E_TEST_PRESET: TestGenerationPreset = {
  name: 'End-to-End Testing',
  description: 'Complete user journey tests',
  language: 'typescript',
  framework: 'playwright',
  testTypes: ['e2e'],
  options: {
    includeSetup: true,
    includeTeardown: true,
    includeEdgeCases: false,
    includeMockGeneration: false,
    includeIntegrationTests: false,
    includeE2ETests: true,
    generateTestData: true,
    optimizeForCI: false,
    followBestPractices: true,
    maxTestsPerFunction: 2,
    complexityThreshold: 15
  },
  patterns: ['user-journey-test', 'page-interaction-test'],
  coverage: {
    target: 60,
    strict: false
  },
  optimization: {
    enabled: false,
    aggressive: false
  }
};

/**
 * Version information for the test generation module
 */
export const TEST_GENERATION_VERSION = '1.0.0';

/**
 * Supported languages for test generation
 */
export const SUPPORTED_LANGUAGES: SupportedTestLanguage[] = [
  'javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 
  'php', 'ruby', 'swift', 'kotlin', 'dart', 'scala', 'cpp', 'c'
];

/**
 * Supported test frameworks
 */
export const SUPPORTED_FRAMEWORKS: TestFramework[] = [
  'jest', 'mocha', 'jasmine', 'vitest', 'cypress', 'playwright', 'testing-library', 'enzyme',
  'pytest', 'unittest', 'nose2', 'behave',
  'junit5', 'junit4', 'testng', 'mockito', 'spring-test',
  'nunit', 'mstest', 'xunit',
  'go-test', 'testify', 'ginkgo',
  'rust-test', 'rstest',
  'phpunit', 'codeception',
  'rspec', 'minitest',
  'xctest', 'quick-nimble',
  'junit-kotlin', 'kotest',
  'flutter-test', 'test-dart',
  'gtest', 'catch2', 'boost-test'
];

/**
 * Available test types
 */
export const TEST_TYPES: TestType[] = [
  'unit', 'integration', 'e2e', 'api', 'component', 'snapshot', 
  'visual', 'performance', 'security', 'contract', 'mutation'
];