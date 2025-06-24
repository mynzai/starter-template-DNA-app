/**
 * @fileoverview Test Generation Service
 * AI-powered test generation for AC3: Test Generation Assistance
 */

import { EventEmitter } from 'events';
import {
  TestGenerationRequest,
  TestGenerationResponse,
  TestGenerationConfig,
  TestFramework,
  SupportedTestLanguage,
  TestType,
  TestSuite,
  GeneratedTest,
  CoverageAnalysisResult,
  TestSuggestion,
  TestGenerationMetrics,
  FrameworkDetectionResult,
  TestValidationResult,
  TestOptimizationResult,
  TestAnalyticsData
} from './types';
import { AIService } from '../../ai/ai-service';
import { TestFrameworkManager } from './test-framework-manager';
import { TestPatternEngine } from './test-pattern-engine';
import { CoverageAnalyzer } from './coverage-analyzer';
import { TestValidator } from './test-validator';
import { TestOptimizer } from './test-optimizer';

export class TestGenerationService extends EventEmitter {
  private aiService?: AIService;
  private frameworkManager: TestFrameworkManager;
  private patternEngine: TestPatternEngine;
  private coverageAnalyzer: CoverageAnalyzer;
  private testValidator: TestValidator;
  private testOptimizer: TestOptimizer;
  private initialized = false;

  private defaultConfig: TestGenerationConfig = {
    defaultLanguage: 'typescript',
    defaultFramework: 'jest',
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
      complexityThreshold: 10
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
  };

  constructor(private config: Partial<TestGenerationConfig> = {}) {
    super();
    this.config = { ...this.defaultConfig, ...config };
    this.frameworkManager = new TestFrameworkManager();
    this.patternEngine = new TestPatternEngine();
    this.coverageAnalyzer = new CoverageAnalyzer();
    this.testValidator = new TestValidator();
    this.testOptimizer = new TestOptimizer();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize AI service
      if (!this.aiService) {
        this.aiService = new AIService({
          defaultProvider: this.config.ai!.provider,
          fallbackProviders: ['anthropic', 'openai'],
          loadBalancing: {
            strategy: 'cost-optimized',
            enableFailover: true,
            maxRetries: 2
          }
        });
        await this.aiService.initialize();
      }

      // Initialize components
      await this.frameworkManager.initialize();
      await this.patternEngine.initialize();
      await this.coverageAnalyzer.initialize();

      this.initialized = true;
      this.emit('service:initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('service:error', { error: errorMessage });
      throw error;
    }
  }

  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResponse> {
    if (!this.initialized) {
      throw new Error('TestGenerationService not initialized');
    }

    const startTime = Date.now();
    this.emit('generation:started', { sourceFile: request.sourceFile });

    try {
      // Auto-detect framework if not provided
      const framework = request.framework || await this.detectFramework(request);
      
      // Analyze source code
      const codeAnalysis = await this.analyzeSourceCode(request.sourceCode, request.language);
      
      this.emit('generation:progress', { 
        sourceFile: request.sourceFile, 
        stage: 'analysis_complete',
        functions: codeAnalysis.functions.length
      });

      // Generate test suite
      const testSuite = await this.generateTestSuite(request, framework, codeAnalysis);
      
      this.emit('generation:progress', { 
        sourceFile: request.sourceFile, 
        stage: 'tests_generated',
        testsCount: testSuite.tests.length
      });

      // Analyze coverage
      const coverage = await this.analyzeCoverage(request.sourceCode, testSuite);
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(request, testSuite, coverage);
      
      // Validate tests
      if (this.config.validation!.enabled) {
        const validation = await this.validateTests(testSuite, framework);
        if (!validation.valid && this.config.validation!.strict) {
          throw new Error(`Test validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Optimize tests
      if (this.config.optimization!.enabled) {
        const optimization = await this.optimizeTests(testSuite);
        this.emit('generation:optimized', { 
          sourceFile: request.sourceFile,
          optimization 
        });
      }

      // Calculate metrics
      const metrics = this.calculateMetrics(testSuite, coverage, startTime);

      // Generate test file content
      const testCode = await this.generateTestFileContent(testSuite, framework, request.language);

      const response: TestGenerationResponse = {
        id: `test-gen-${Date.now()}`,
        sourceFile: request.sourceFile,
        testFile: this.generateTestFileName(request.sourceFile, framework),
        testCode,
        framework,
        testType: request.testType,
        coverage,
        suggestions,
        metrics,
        timestamp: Date.now()
      };

      this.emit('generation:completed', { 
        sourceFile: request.sourceFile, 
        response,
        duration: Date.now() - startTime 
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('generation:error', { 
        sourceFile: request.sourceFile, 
        error: errorMessage 
      });
      throw error;
    }
  }

  async detectFramework(request: TestGenerationRequest): Promise<TestFramework> {
    const detection = await this.frameworkManager.detectFramework(
      request.sourceFile,
      request.language
    );
    
    if (detection.confidence < 0.5) {
      // Use default framework for language
      return this.getDefaultFrameworkForLanguage(request.language);
    }
    
    return detection.framework;
  }

  async analyzeSourceCode(sourceCode: string, language: SupportedTestLanguage): Promise<any> {
    // Use AI to analyze source code and extract testable functions/methods
    const analysisPrompt = this.buildCodeAnalysisPrompt(sourceCode, language);
    
    const aiResponse = await this.aiService?.generate({
      prompt: analysisPrompt,
      options: { 
        maxTokens: this.config.ai!.maxTokens,
        temperature: this.config.ai!.temperature 
      }
    });

    if (!aiResponse?.content) {
      throw new Error('Failed to analyze source code with AI');
    }

    try {
      const analysis = JSON.parse(aiResponse.content);
      return {
        functions: analysis.functions || [],
        classes: analysis.classes || [],
        exports: analysis.exports || [],
        imports: analysis.imports || [],
        complexity: analysis.complexity || 0,
        testability: analysis.testability || 0
      };
    } catch (parseError) {
      // Fallback to basic analysis
      return this.performBasicCodeAnalysis(sourceCode, language);
    }
  }

  async generateTestSuite(
    request: TestGenerationRequest, 
    framework: TestFramework, 
    analysis: any
  ): Promise<TestSuite> {
    const tests: GeneratedTest[] = [];
    let testIdCounter = 1;

    // Generate tests for each function
    for (const func of analysis.functions) {
      const functionTests = await this.generateTestsForFunction(
        func,
        request,
        framework,
        testIdCounter
      );
      tests.push(...functionTests);
      testIdCounter += functionTests.length;
    }

    // Generate tests for classes
    for (const cls of analysis.classes) {
      const classTests = await this.generateTestsForClass(
        cls,
        request,
        framework,
        testIdCounter
      );
      tests.push(...classTests);
      testIdCounter += classTests.length;
    }

    // Generate integration tests if requested
    if (request.options?.includeIntegrationTests) {
      const integrationTests = await this.generateIntegrationTests(
        analysis,
        request,
        framework,
        testIdCounter
      );
      tests.push(...integrationTests);
    }

    const testSuite: TestSuite = {
      id: `suite-${Date.now()}`,
      name: `Tests for ${request.sourceFile}`,
      description: `Generated test suite for ${request.sourceFile}`,
      tests,
      dependencies: this.frameworkManager.getDependencies(framework),
      estimatedRunTime: tests.reduce((sum, test) => sum + (test.timeout || 5000), 0),
      parallelizable: this.config.optimization!.parallelization,
      tags: [request.testType, framework, request.language]
    };

    // Add setup and teardown if requested
    if (request.options?.includeSetup) {
      testSuite.setup = this.generateSetupCode(framework, request.language);
    }
    
    if (request.options?.includeTeardown) {
      testSuite.teardown = this.generateTeardownCode(framework, request.language);
    }

    return testSuite;
  }

  async generateTestsForFunction(
    func: any,
    request: TestGenerationRequest,
    framework: TestFramework,
    startId: number
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];
    const maxTests = request.options?.maxTestsPerFunction || 5;

    // Generate basic functionality test
    tests.push(await this.generateBasicFunctionTest(func, framework, request.language, startId));

    // Generate edge case tests if requested
    if (request.options?.includeEdgeCases && tests.length < maxTests) {
      const edgeCaseTests = await this.generateEdgeCaseTests(
        func, 
        framework, 
        request.language, 
        startId + tests.length,
        maxTests - tests.length
      );
      tests.push(...edgeCaseTests);
    }

    // Generate error handling tests
    if (tests.length < maxTests) {
      const errorTests = await this.generateErrorHandlingTests(
        func,
        framework,
        request.language,
        startId + tests.length,
        maxTests - tests.length
      );
      tests.push(...errorTests);
    }

    return tests;
  }

  async generateTestsForClass(
    cls: any,
    request: TestGenerationRequest,
    framework: TestFramework,
    startId: number
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];

    // Generate constructor tests
    if (cls.constructor) {
      tests.push(await this.generateConstructorTest(cls, framework, request.language, startId));
    }

    // Generate method tests
    for (const method of cls.methods || []) {
      const methodTests = await this.generateTestsForFunction(
        method,
        request,
        framework,
        startId + tests.length
      );
      tests.push(...methodTests);
    }

    return tests;
  }

  async generateIntegrationTests(
    analysis: any,
    request: TestGenerationRequest,
    framework: TestFramework,
    startId: number
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];

    // Generate API integration tests
    if (analysis.exports.some((exp: any) => exp.type === 'api')) {
      const apiTests = await this.generateAPIIntegrationTests(
        analysis,
        framework,
        request.language,
        startId
      );
      tests.push(...apiTests);
    }

    // Generate database integration tests
    if (analysis.imports.some((imp: any) => imp.includes('database') || imp.includes('db'))) {
      const dbTests = await this.generateDatabaseIntegrationTests(
        analysis,
        framework,
        request.language,
        startId + tests.length
      );
      tests.push(...dbTests);
    }

    return tests;
  }

  async analyzeCoverage(sourceCode: string, testSuite: TestSuite): Promise<CoverageAnalysisResult> {
    return await this.coverageAnalyzer.analyzeCoverage(sourceCode, testSuite);
  }

  async generateSuggestions(
    request: TestGenerationRequest,
    testSuite: TestSuite,
    coverage: CoverageAnalysisResult
  ): Promise<TestSuggestion[]> {
    const suggestions: TestSuggestion[] = [];

    // Coverage improvement suggestions
    if (coverage.overall < (request.coverageTarget || 80)) {
      suggestions.push(...await this.generateCoverageSuggestions(coverage));
    }

    // Performance suggestions
    suggestions.push(...await this.generatePerformanceSuggestions(testSuite));

    // Best practice suggestions
    if (request.options?.followBestPractices) {
      suggestions.push(...await this.generateBestPracticeSuggestions(testSuite, request.language));
    }

    // Framework-specific suggestions
    suggestions.push(...await this.generateFrameworkSuggestions(testSuite, request.framework!));

    return suggestions;
  }

  async validateTests(testSuite: TestSuite, framework: TestFramework): Promise<TestValidationResult> {
    return await this.testValidator.validate(testSuite, framework);
  }

  async optimizeTests(testSuite: TestSuite): Promise<TestOptimizationResult> {
    return await this.testOptimizer.optimize(testSuite);
  }

  private calculateMetrics(
    testSuite: TestSuite, 
    coverage: CoverageAnalysisResult, 
    startTime: number
  ): TestGenerationMetrics {
    const totalFunctions = testSuite.tests.reduce((sum, test) => {
      return sum + (test.code.match(/function|method/gi) || []).length;
    }, 0);

    return {
      generationTime: Date.now() - startTime,
      testsGenerated: testSuite.tests.length,
      functionsTestedCount: testSuite.tests.filter(t => t.type === 'unit').length,
      totalFunctions,
      coverageImprovement: coverage.overall,
      complexity: testSuite.tests.reduce((sum, test) => sum + test.complexity, 0) / testSuite.tests.length,
      maintainabilityScore: this.calculateMaintainabilityScore(testSuite),
      aiConfidence: 0.85, // Mock confidence score
      humanReviewRecommended: coverage.overall < 70 || testSuite.tests.some(t => t.complexity > 8),
      estimatedExecutionTime: testSuite.estimatedRunTime,
      resourceRequirements: [
        {
          type: 'memory',
          amount: testSuite.tests.length * 50,
          unit: 'MB',
          reason: 'Test execution memory requirements'
        }
      ]
    };
  }

  private async generateTestFileContent(
    testSuite: TestSuite, 
    framework: TestFramework, 
    language: SupportedTestLanguage
  ): Promise<string> {
    const template = await this.patternEngine.getTemplate(framework, language, 'test-file');
    
    return this.patternEngine.renderTemplate(template, {
      testSuite,
      imports: this.generateImports(framework, language),
      setup: testSuite.setup,
      teardown: testSuite.teardown,
      tests: testSuite.tests.map(test => this.generateTestCode(test, framework, language)).join('\n\n')
    });
  }

  // Helper methods
  private getDefaultFrameworkForLanguage(language: SupportedTestLanguage): TestFramework {
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
  }

  private buildCodeAnalysisPrompt(sourceCode: string, language: SupportedTestLanguage): string {
    return `Analyze the following ${language} code and extract information needed for test generation:

Code:
\`\`\`${language}
${sourceCode}
\`\`\`

Please return a JSON object with the following structure:
{
  "functions": [
    {
      "name": "functionName",
      "parameters": [{"name": "param", "type": "string"}],
      "returnType": "type",
      "complexity": 5,
      "isAsync": false,
      "isExported": true
    }
  ],
  "classes": [
    {
      "name": "ClassName",
      "constructor": {...},
      "methods": [...],
      "properties": [...]
    }
  ],
  "exports": [...],
  "imports": [...],
  "complexity": 10,
  "testability": 8
}

Focus on extracting testable units and their characteristics.`;
  }

  private performBasicCodeAnalysis(sourceCode: string, language: SupportedTestLanguage): any {
    // Basic regex-based analysis as fallback
    const functionRegex = /(?:function|def|func|fn)\s+(\w+)/g;
    const classRegex = /(?:class|struct)\s+(\w+)/g;
    
    const functions = [];
    let match;
    
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      functions.push({
        name: match[1],
        parameters: [],
        returnType: 'unknown',
        complexity: 3,
        isAsync: sourceCode.includes('async'),
        isExported: sourceCode.includes('export')
      });
    }

    const classes = [];
    while ((match = classRegex.exec(sourceCode)) !== null) {
      classes.push({
        name: match[1],
        methods: [],
        properties: []
      });
    }

    return {
      functions,
      classes,
      exports: [],
      imports: [],
      complexity: Math.min(10, sourceCode.split('\n').length / 10),
      testability: functions.length > 0 ? 7 : 3
    };
  }

  private async generateBasicFunctionTest(
    func: any,
    framework: TestFramework,
    language: SupportedTestLanguage,
    id: number
  ): Promise<GeneratedTest> {
    const template = await this.patternEngine.getPattern(framework, 'basic-function-test');
    
    return {
      id: `test-${id}`,
      name: `should test ${func.name} basic functionality`,
      description: `Tests the basic functionality of ${func.name}`,
      type: 'unit',
      code: this.patternEngine.renderTemplate(template.pattern, {
        functionName: func.name,
        parameters: func.parameters,
        framework
      }),
      assertions: [
        {
          type: 'equality',
          expected: 'mockResult',
          actual: `${func.name}(mockInput)`,
          line: 1
        }
      ],
      mocks: [],
      testData: [
        {
          id: `data-${id}`,
          type: 'input',
          name: 'mockInput',
          value: this.generateMockInput(func.parameters),
          description: 'Mock input for basic test',
          category: 'valid'
        }
      ],
      expectedResult: 'mockResult',
      tags: ['unit', 'basic'],
      complexity: func.complexity || 3,
      timeout: 5000
    };
  }

  private async generateEdgeCaseTests(
    func: any,
    framework: TestFramework,
    language: SupportedTestLanguage,
    startId: number,
    maxTests: number
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];
    const edgeCases = ['null', 'undefined', 'empty', 'boundary'];
    
    for (let i = 0; i < Math.min(maxTests, edgeCases.length); i++) {
      tests.push({
        id: `test-${startId + i}`,
        name: `should handle ${edgeCases[i]} input`,
        description: `Tests ${func.name} with ${edgeCases[i]} input`,
        type: 'unit',
        code: `// Test for ${edgeCases[i]} case\nexpect(${func.name}(${edgeCases[i]})).toBeDefined();`,
        assertions: [
          {
            type: 'truthiness',
            expected: true,
            actual: `${func.name}(${edgeCases[i]})`,
            line: 1
          }
        ],
        mocks: [],
        testData: [],
        expectedResult: null,
        tags: ['unit', 'edge-case'],
        complexity: 2,
        timeout: 5000
      });
    }
    
    return tests;
  }

  private async generateErrorHandlingTests(
    func: any,
    framework: TestFramework,
    language: SupportedTestLanguage,
    startId: number,
    maxTests: number
  ): Promise<GeneratedTest[]> {
    return [
      {
        id: `test-${startId}`,
        name: `should throw error for invalid input`,
        description: `Tests that ${func.name} throws appropriate errors`,
        type: 'unit',
        code: `expect(() => ${func.name}(invalidInput)).toThrow();`,
        assertions: [
          {
            type: 'error',
            expected: 'Error',
            actual: `${func.name}(invalidInput)`,
            line: 1
          }
        ],
        mocks: [],
        testData: [],
        expectedResult: null,
        tags: ['unit', 'error-handling'],
        complexity: 3,
        timeout: 5000
      }
    ];
  }

  private async generateConstructorTest(
    cls: any,
    framework: TestFramework,
    language: SupportedTestLanguage,
    id: number
  ): Promise<GeneratedTest> {
    return {
      id: `test-${id}`,
      name: `should create ${cls.name} instance`,
      description: `Tests ${cls.name} constructor`,
      type: 'unit',
      code: `const instance = new ${cls.name}();\nexpect(instance).toBeInstanceOf(${cls.name});`,
      assertions: [
        {
          type: 'type',
          expected: cls.name,
          actual: `new ${cls.name}()`,
          line: 2
        }
      ],
      mocks: [],
      testData: [],
      expectedResult: null,
      tags: ['unit', 'constructor'],
      complexity: 2,
      timeout: 5000
    };
  }

  private async generateAPIIntegrationTests(
    analysis: any,
    framework: TestFramework,
    language: SupportedTestLanguage,
    startId: number
  ): Promise<GeneratedTest[]> {
    // Mock implementation for API integration tests
    return [
      {
        id: `test-${startId}`,
        name: 'should handle API requests',
        description: 'Integration test for API endpoints',
        type: 'integration',
        code: '// API integration test placeholder',
        assertions: [],
        mocks: [],
        testData: [],
        expectedResult: null,
        tags: ['integration', 'api'],
        complexity: 5,
        timeout: 10000
      }
    ];
  }

  private async generateDatabaseIntegrationTests(
    analysis: any,
    framework: TestFramework,
    language: SupportedTestLanguage,
    startId: number
  ): Promise<GeneratedTest[]> {
    // Mock implementation for database integration tests
    return [
      {
        id: `test-${startId}`,
        name: 'should handle database operations',
        description: 'Integration test for database operations',
        type: 'integration',
        code: '// Database integration test placeholder',
        assertions: [],
        mocks: [],
        testData: [],
        expectedResult: null,
        tags: ['integration', 'database'],
        complexity: 6,
        timeout: 15000
      }
    ];
  }

  private async generateCoverageSuggestions(coverage: CoverageAnalysisResult): Promise<TestSuggestion[]> {
    return coverage.gaps.map(gap => ({
      id: `coverage-${Date.now()}-${Math.random()}`,
      type: 'coverage',
      severity: gap.severity,
      title: `Improve coverage for ${gap.type}`,
      description: gap.description,
      suggestedCode: gap.suggestedTest,
      reasoning: `Current coverage is below target threshold`,
      confidence: 0.8,
      estimatedEffort: 'medium',
      tags: ['coverage', gap.type]
    }));
  }

  private async generatePerformanceSuggestions(testSuite: TestSuite): Promise<TestSuggestion[]> {
    const suggestions: TestSuggestion[] = [];
    
    const slowTests = testSuite.tests.filter(test => (test.timeout || 5000) > 10000);
    if (slowTests.length > 0) {
      suggestions.push({
        id: `perf-${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        title: 'Optimize slow tests',
        description: `${slowTests.length} tests have long timeouts`,
        suggestedCode: '// Consider mocking external dependencies',
        reasoning: 'Long-running tests slow down CI/CD pipeline',
        confidence: 0.7,
        estimatedEffort: 'medium',
        tags: ['performance', 'timeout']
      });
    }
    
    return suggestions;
  }

  private async generateBestPracticeSuggestions(
    testSuite: TestSuite, 
    language: SupportedTestLanguage
  ): Promise<TestSuggestion[]> {
    const suggestions: TestSuggestion[] = [];
    
    // Check for tests without assertions
    const testsWithoutAssertions = testSuite.tests.filter(test => test.assertions.length === 0);
    if (testsWithoutAssertions.length > 0) {
      suggestions.push({
        id: `best-practice-${Date.now()}`,
        type: 'best_practice',
        severity: 'high',
        title: 'Add assertions to tests',
        description: `${testsWithoutAssertions.length} tests lack proper assertions`,
        suggestedCode: 'expect(result).toBeDefined();',
        reasoning: 'Tests without assertions provide no verification',
        confidence: 0.9,
        estimatedEffort: 'low',
        tags: ['best-practice', 'assertions']
      });
    }
    
    return suggestions;
  }

  private async generateFrameworkSuggestions(
    testSuite: TestSuite, 
    framework: TestFramework
  ): Promise<TestSuggestion[]> {
    // Framework-specific suggestions
    const suggestions: TestSuggestion[] = [];
    
    if (framework === 'jest') {
      suggestions.push({
        id: `jest-${Date.now()}`,
        type: 'improvement',
        severity: 'low',
        title: 'Use Jest snapshot testing',
        description: 'Consider using snapshot tests for component outputs',
        suggestedCode: 'expect(component).toMatchSnapshot();',
        reasoning: 'Snapshot tests help catch unexpected changes',
        confidence: 0.6,
        estimatedEffort: 'low',
        tags: ['jest', 'snapshot']
      });
    }
    
    return suggestions;
  }

  private generateTestFileName(sourceFile: string, framework: TestFramework): string {
    const baseName = sourceFile.replace(/\.[^/.]+$/, '');
    const extension = sourceFile.split('.').pop();
    
    const testExtensions: Record<string, string> = {
      'js': 'test.js',
      'ts': 'test.ts',
      'py': '_test.py',
      'java': 'Test.java',
      'cs': 'Tests.cs',
      'go': '_test.go',
      'rs': '_test.rs',
      'php': 'Test.php',
      'rb': '_test.rb',
      'swift': 'Tests.swift',
      'kt': 'Test.kt',
      'dart': '_test.dart'
    };
    
    const testExt = testExtensions[extension || 'js'] || 'test.js';
    return `${baseName}.${testExt}`;
  }

  private generateSetupCode(framework: TestFramework, language: SupportedTestLanguage): string {
    const setupTemplates: Record<TestFramework, string> = {
      'jest': 'beforeEach(() => {\n  // Setup code\n});',
      'mocha': 'beforeEach(function() {\n  // Setup code\n});',
      'pytest': '@pytest.fixture\ndef setup():\n    # Setup code\n    pass',
      'junit5': '@BeforeEach\nvoid setUp() {\n    // Setup code\n}',
      'nunit': '[SetUp]\npublic void SetUp() {\n    // Setup code\n}',
      'go-test': 'func setup() {\n    // Setup code\n}',
      'rust-test': '#[test]\nfn setup() {\n    // Setup code\n}',
      'phpunit': 'protected function setUp(): void {\n    // Setup code\n}',
      'rspec': 'before do\n  # Setup code\nend',
      'xctest': 'override func setUp() {\n    // Setup code\n}',
      'flutter-test': 'setUp(() {\n  // Setup code\n});'
    };
    
    return setupTemplates[framework] || '// Setup code';
  }

  private generateTeardownCode(framework: TestFramework, language: SupportedTestLanguage): string {
    const teardownTemplates: Record<TestFramework, string> = {
      'jest': 'afterEach(() => {\n  // Teardown code\n});',
      'mocha': 'afterEach(function() {\n  // Teardown code\n});',
      'pytest': '@pytest.fixture\ndef teardown():\n    # Teardown code\n    pass',
      'junit5': '@AfterEach\nvoid tearDown() {\n    // Teardown code\n}',
      'nunit': '[TearDown]\npublic void TearDown() {\n    // Teardown code\n}',
      'go-test': 'func teardown() {\n    // Teardown code\n}',
      'rust-test': '#[test]\nfn teardown() {\n    // Teardown code\n}',
      'phpunit': 'protected function tearDown(): void {\n    // Teardown code\n}',
      'rspec': 'after do\n  # Teardown code\nend',
      'xctest': 'override func tearDown() {\n    // Teardown code\n}',
      'flutter-test': 'tearDown(() {\n  // Teardown code\n});'
    };
    
    return teardownTemplates[framework] || '// Teardown code';
  }

  private generateImports(framework: TestFramework, language: SupportedTestLanguage): string {
    const importTemplates: Record<TestFramework, string> = {
      'jest': "import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';",
      'mocha': "const { describe, it } = require('mocha');\nconst { expect } = require('chai');",
      'pytest': 'import pytest',
      'junit5': 'import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;',
      'nunit': 'using NUnit.Framework;',
      'go-test': 'import (\n    "testing"\n)',
      'rust-test': '#[cfg(test)]\nmod tests {\n    use super::*;',
      'phpunit': 'use PHPUnit\\Framework\\TestCase;',
      'rspec': "require 'rspec'",
      'xctest': 'import XCTest',
      'flutter-test': "import 'package:flutter_test/flutter_test.dart';"
    };
    
    return importTemplates[framework] || '// Import statements';
  }

  private generateTestCode(test: GeneratedTest, framework: TestFramework, language: SupportedTestLanguage): string {
    const testTemplates: Record<TestFramework, string> = {
      'jest': `test('${test.name}', () => {\n  ${test.code}\n});`,
      'mocha': `it('${test.name}', function() {\n  ${test.code}\n});`,
      'pytest': `def test_${test.name.replace(/\s+/g, '_')}():\n    ${test.code.replace(/\n/g, '\n    ')}`,
      'junit5': `@Test\nvoid ${test.name.replace(/\s+/g, '_')}() {\n    ${test.code}\n}`,
      'nunit': `[Test]\npublic void ${test.name.replace(/\s+/g, '_')}() {\n    ${test.code}\n}`,
      'go-test': `func Test${test.name.replace(/\s+/g, '_')}(t *testing.T) {\n    ${test.code}\n}`,
      'rust-test': `#[test]\nfn test_${test.name.replace(/\s+/g, '_')}() {\n    ${test.code}\n}`,
      'phpunit': `public function test${test.name.replace(/\s+/g, '_')}() {\n    ${test.code}\n}`,
      'rspec': `it '${test.name}' do\n  ${test.code.replace(/\n/g, '\n  ')}\nend`,
      'xctest': `func test${test.name.replace(/\s+/g, '_')}() {\n    ${test.code}\n}`,
      'flutter-test': `test('${test.name}', () {\n  ${test.code}\n});`
    };
    
    return testTemplates[framework] || `// ${test.name}\n${test.code}`;
  }

  private generateMockInput(parameters: any[]): any {
    if (!parameters || parameters.length === 0) return null;
    
    const mockValues: Record<string, any> = {
      'string': 'test',
      'number': 42,
      'boolean': true,
      'array': [],
      'object': {},
      'function': () => {}
    };
    
    if (parameters.length === 1) {
      return mockValues[parameters[0].type] || 'mockValue';
    }
    
    return parameters.map(param => mockValues[param.type] || 'mockValue');
  }

  private calculateMaintainabilityScore(testSuite: TestSuite): number {
    // Simple maintainability calculation
    const avgComplexity = testSuite.tests.reduce((sum, test) => sum + test.complexity, 0) / testSuite.tests.length;
    const assertionRatio = testSuite.tests.reduce((sum, test) => sum + test.assertions.length, 0) / testSuite.tests.length;
    
    return Math.max(0, Math.min(100, (10 - avgComplexity) * 10 + assertionRatio * 20));
  }

  getMetrics(): TestAnalyticsData | null {
    // Return test analytics data if available
    return null;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.emit('service:shutdown');
  }
}