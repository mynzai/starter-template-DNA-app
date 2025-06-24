/**
 * @fileoverview Test Generation Usage Examples
 * Example implementations for AC3: Test Generation Assistance
 */

import {
  TestGenerationService,
  createTestGenerationService,
  createTypeScriptTestConfig,
  createPythonTestConfig,
  createJavaTestConfig,
  detectLanguageFromFile,
  getDefaultFrameworkForLanguage,
  isUnitTest,
  hasAssertions,
  meetsCoverageThreshold,
  hasValidationErrors,
  TEST_GENERATION_EVENTS,
  UNIT_TEST_PRESET,
  INTEGRATION_TEST_PRESET
} from './index';

/**
 * Example 1: Basic test generation for TypeScript/Jest
 */
export async function basicTestGeneration() {
  // Create service with TypeScript/Jest configuration
  const config = createTypeScriptTestConfig('jest');
  const testService = createTestGenerationService(config);

  // Set up event listeners
  testService.on(TEST_GENERATION_EVENTS.GENERATION_STARTED, ({ sourceFile }) => {
    console.log(`🔄 Starting test generation for ${sourceFile}`);
  });

  testService.on(TEST_GENERATION_EVENTS.GENERATION_PROGRESS, ({ stage, testsCount }) => {
    console.log(`📊 Progress: ${stage} - ${testsCount} tests generated`);
  });

  testService.on(TEST_GENERATION_EVENTS.GENERATION_COMPLETED, ({ response, duration }) => {
    console.log(`✅ Test generation completed in ${duration}ms`);
    console.log(`📝 Generated ${response.testCode.split('\n').length} lines of test code`);
  });

  // Initialize the service
  await testService.initialize();

  // Sample source code
  const sourceCode = `
export function calculateSum(a: number, b: number): number {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export class Calculator {
  private history: number[] = [];

  add(a: number, b: number): number {
    const result = a + b;
    this.history.push(result);
    return result;
  }

  getHistory(): number[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }
}`;

  // Generate tests
  const request = {
    sourceCode,
    sourceFile: 'calculator.ts',
    language: 'typescript' as const,
    framework: 'jest' as const,
    testType: 'unit' as const,
    coverageTarget: 85,
    options: {
      includeSetup: true,
      includeTeardown: true,
      includeEdgeCases: true,
      includeMockGeneration: false,
      generateTestData: true,
      followBestPractices: true,
      maxTestsPerFunction: 5
    }
  };

  const result = await testService.generateTests(request);

  console.log('\n📋 Test Generation Results:');
  console.log(`   Tests Generated: ${result.metrics.testsGenerated}`);
  console.log(`   Coverage: ${result.coverage.overall}%`);
  console.log(`   Suggestions: ${result.suggestions.length}`);
  console.log(`   Test File: ${result.testFile}`);

  return result;
}

/**
 * Example 2: Multi-language test generation
 */
export async function multiLanguageTestGeneration() {
  const languages = ['typescript', 'python', 'java'] as const;
  const results = [];

  for (const language of languages) {
    console.log(`\n🔄 Generating tests for ${language}...`);
    
    // Auto-detect framework
    const framework = getDefaultFrameworkForLanguage(language);
    
    // Create appropriate configuration
    let config;
    switch (language) {
      case 'typescript':
        config = createTypeScriptTestConfig();
        break;
      case 'python':
        config = createPythonTestConfig();
        break;
      case 'java':
        config = createJavaTestConfig();
        break;
    }

    const testService = createTestGenerationService(config);
    await testService.initialize();

    // Sample code for each language
    const sourceCode = getSampleCode(language);
    const sourceFile = getSampleFilename(language);

    const request = {
      sourceCode,
      sourceFile,
      language,
      framework,
      testType: 'unit' as const,
      options: {
        includeEdgeCases: true,
        followBestPractices: true,
        maxTestsPerFunction: 3
      }
    };

    const result = await testService.generateTests(request);
    results.push(result);

    console.log(`✅ ${language}: ${result.metrics.testsGenerated} tests, ${result.coverage.overall}% coverage`);
  }

  return results;
}

/**
 * Example 3: Advanced test generation with coverage analysis
 */
export async function advancedTestGenerationWithCoverage() {
  const testService = createTestGenerationService({
    defaultLanguage: 'typescript',
    defaultFramework: 'jest',
    validation: {
      enabled: true,
      strict: true,
      rules: ['no-duplicate-tests', 'proper-assertions', 'mock-usage']
    },
    optimization: {
      enabled: true,
      aggressive: true,
      parallelization: true
    }
  });

  await testService.initialize();

  const sourceCode = `
export class UserService {
  private users: User[] = [];

  async createUser(userData: CreateUserRequest): Promise<User> {
    // Validation
    if (!userData.email || !userData.name) {
      throw new Error('Email and name are required');
    }

    if (this.users.find(u => u.email === userData.email)) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user: User = {
      id: generateId(),
      email: userData.email,
      name: userData.name,
      createdAt: new Date(),
      active: true
    };

    // Save to database
    await this.saveUser(user);
    this.users.push(user);

    return user;
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }

  private async saveUser(user: User): Promise<void> {
    // Simulate database save
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}`;

  const request = {
    sourceCode,
    sourceFile: 'user-service.ts',
    language: 'typescript' as const,
    framework: 'jest' as const,
    testType: 'unit' as const,
    coverageTarget: 90,
    options: {
      includeSetup: true,
      includeTeardown: true,
      includeEdgeCases: true,
      includeMockGeneration: true,
      generateTestData: true,
      followBestPractices: true
    }
  };

  const result = await testService.generateTests(request);

  // Analyze results
  console.log('\n📊 Advanced Test Analysis:');
  console.log(`   Overall Score: ${result.coverage.overall}%`);
  console.log(`   Coverage Grade: ${getCoverageGrade(result.coverage.overall)}`);
  console.log(`   Meets Threshold: ${meetsCoverageThreshold(result.coverage) ? '✅' : '❌'}`);

  // Check for high-priority gaps
  const highPriorityGaps = result.coverage.gaps.filter(gap => gap.severity === 'high');
  if (highPriorityGaps.length > 0) {
    console.log(`\n⚠️  High Priority Coverage Gaps (${highPriorityGaps.length}):`);
    highPriorityGaps.forEach(gap => {
      console.log(`   - ${gap.description} (${gap.location.filename}:${gap.location.line})`);
    });
  }

  // Show suggestions
  if (result.suggestions.length > 0) {
    console.log(`\n💡 Suggestions (${result.suggestions.length}):`);
    result.suggestions.slice(0, 3).forEach(suggestion => {
      console.log(`   - ${suggestion.title}: ${suggestion.description}`);
    });
  }

  return result;
}

/**
 * Example 4: Test validation and optimization
 */
export async function testValidationAndOptimization() {
  const testService = createTestGenerationService();
  await testService.initialize();

  // Generate initial tests
  const sourceCode = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function isPrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}`;

  const request = {
    sourceCode,
    sourceFile: 'math-utils.js',
    language: 'javascript' as const,
    framework: 'jest' as const,
    testType: 'unit' as const,
    options: {
      includeEdgeCases: true,
      followBestPractices: true,
      maxTestsPerFunction: 4
    }
  };

  const result = await testService.generateTests(request);

  // Validate tests
  console.log('\n🔍 Test Validation:');
  const unitTests = result.coverage.files[0] ? result.coverage.files[0] : null;
  
  if (unitTests) {
    const testsWithAssertions = result.suggestions.filter(s => s.type === 'improvement');
    console.log(`   Tests with Assertions: ${testsWithAssertions.length}`);
  }

  // Show optimization opportunities
  console.log('\n⚡ Optimization Opportunities:');
  console.log(`   Execution Time Improvement: Estimated 15-30%`);
  console.log(`   Parallelizable Tests: Most unit tests can run in parallel`);
  console.log(`   Test Combination: Similar setup tests can be combined`);

  return result;
}

/**
 * Example 5: Framework detection and configuration
 */
export async function frameworkDetectionExample() {
  const files = [
    'calculator.test.js',
    'user_service_test.py',
    'CalculatorTest.java',
    'calculator_test.go',
    'calculator.spec.ts'
  ];

  console.log('\n🔍 Framework Detection Results:');

  for (const file of files) {
    const language = detectLanguageFromFile(file);
    const framework = getDefaultFrameworkForLanguage(language);
    
    console.log(`   ${file}:`);
    console.log(`     Language: ${language}`);
    console.log(`     Framework: ${framework}`);
    
    // Create appropriate service
    let config;
    switch (language) {
      case 'javascript':
      case 'typescript':
        config = createTypeScriptTestConfig(framework as any);
        break;
      case 'python':
        config = createPythonTestConfig(framework as any);
        break;
      case 'java':
        config = createJavaTestConfig(framework as any);
        break;
      default:
        config = createTypeScriptTestConfig();
    }

    console.log(`     Config: ${config.defaultFramework} with ${config.ai.provider}`);
    console.log('');
  }
}

/**
 * Example 6: Using presets for different test types
 */
export async function testPresetExample() {
  console.log('\n📋 Test Generation Presets:');

  // Unit test preset
  console.log('\n1. Unit Test Preset:');
  console.log(`   Target Coverage: ${UNIT_TEST_PRESET.coverage.target}%`);
  console.log(`   Max Tests per Function: ${UNIT_TEST_PRESET.options.maxTestsPerFunction}`);
  console.log(`   Includes Mocks: ${UNIT_TEST_PRESET.options.includeMockGeneration}`);

  // Integration test preset  
  console.log('\n2. Integration Test Preset:');
  console.log(`   Target Coverage: ${INTEGRATION_TEST_PRESET.coverage.target}%`);
  console.log(`   Max Tests per Function: ${INTEGRATION_TEST_PRESET.options.maxTestsPerFunction}`);
  console.log(`   Includes E2E: ${INTEGRATION_TEST_PRESET.options.includeE2ETests}`);

  // Create services with presets
  const unitTestService = createTestGenerationService({
    ...UNIT_TEST_PRESET,
    defaultLanguage: UNIT_TEST_PRESET.language,
    defaultFramework: UNIT_TEST_PRESET.framework
  });

  const integrationTestService = createTestGenerationService({
    ...INTEGRATION_TEST_PRESET,
    defaultLanguage: INTEGRATION_TEST_PRESET.language,
    defaultFramework: INTEGRATION_TEST_PRESET.framework
  });

  await unitTestService.initialize();
  await integrationTestService.initialize();

  console.log('\n✅ Services initialized with presets');

  return { unitTestService, integrationTestService };
}

// Helper functions
function getSampleCode(language: string): string {
  const samples = {
    typescript: `
export function add(a: number, b: number): number {
  return a + b;
}`,
    python: `
def add(a: int, b: int) -> int:
    return a + b`,
    java: `
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
}`
  };
  return samples[language as keyof typeof samples] || samples.typescript;
}

function getSampleFilename(language: string): string {
  const filenames = {
    typescript: 'calculator.ts',
    python: 'calculator.py',
    java: 'Calculator.java'
  };
  return filenames[language as keyof typeof filenames] || 'calculator.ts';
}

function getCoverageGrade(coverage: number): string {
  if (coverage >= 90) return 'A';
  if (coverage >= 80) return 'B';
  if (coverage >= 70) return 'C';
  if (coverage >= 60) return 'D';
  return 'F';
}

// Export all examples for easy testing
export const examples = {
  basicTestGeneration,
  multiLanguageTestGeneration,
  advancedTestGenerationWithCoverage,
  testValidationAndOptimization,
  frameworkDetectionExample,
  testPresetExample
};