/**
 * @fileoverview Tests for the core testing framework
 */

import { TestingFramework } from '../core/testing-framework';
import { QualityGateEngine } from '../core/quality-gates';
import {
  Framework,
  TestConfig,
  TestResult,
  TestAdapter,
  TestGenerationConfig,
  QualityGateConfig,
  QualityGateResult,
} from '../types';

// Mock test adapter for testing
class MockTestAdapter implements TestAdapter {
  framework: Framework = 'nextjs';

  async runTests(config: TestConfig): Promise<TestResult[]> {
    return [
      {
        framework: 'nextjs',
        testType: 'unit',
        name: 'Mock Test',
        status: 'passed',
        duration: 100,
        coverage: {
          lines: 85,
          functions: 90,
          branches: 80,
          statements: 85,
        },
        performanceMetrics: {
          executionTime: 100,
          memoryUsage: 1024 * 1024, // 1MB
        },
      },
    ];
  }

  async generateTests(config: TestGenerationConfig): Promise<string[]> {
    return ['test1.spec.ts', 'test2.spec.ts'];
  }

  async validateQualityGates(
    results: TestResult[],
    config: QualityGateConfig
  ): Promise<QualityGateResult> {
    const qualityGateEngine = new QualityGateEngine();
    return qualityGateEngine.validateQualityGates(results, config);
  }
}

describe('TestingFramework', () => {
  let framework: TestingFramework;
  let mockAdapter: MockTestAdapter;

  beforeEach(() => {
    framework = new TestingFramework();
    mockAdapter = new MockTestAdapter();
  });

  describe('adapter registration', () => {
    it('should register a test adapter', () => {
      framework.registerAdapter(mockAdapter);
      
      expect(framework.isFrameworkSupported('nextjs')).toBe(true);
      expect(framework.getAvailableFrameworks()).toContain('nextjs');
    });

    it('should handle multiple adapters', () => {
      const mockFlutterAdapter = { ...mockAdapter, framework: 'flutter' as Framework };
      
      framework.registerAdapter(mockAdapter);
      framework.registerAdapter(mockFlutterAdapter);
      
      expect(framework.getAvailableFrameworks()).toContain('nextjs');
      expect(framework.getAvailableFrameworks()).toContain('flutter');
    });
  });

  describe('test execution', () => {
    beforeEach(() => {
      framework.registerAdapter(mockAdapter);
    });

    it('should run tests for a framework', async () => {
      const config: TestConfig = {
        framework: 'nextjs',
        testTypes: ['unit'],
        coverage: {
          enabled: true,
          threshold: { lines: 80, functions: 80, branches: 80, statements: 80 },
          reportPath: './coverage',
        },
        performance: {
          enabled: true,
          benchmarks: [],
        },
        security: {
          enabled: true,
          scanners: [],
        },
        accessibility: {
          enabled: true,
          wcagLevel: 'AA',
        },
        qualityGates: {
          coverage: { lines: 80, functions: 80, branches: 80, statements: 80 },
          security: { maxCritical: 0, maxHigh: 0, maxMedium: 5 },
          performance: {
            maxExecutionTime: 30000,
            maxMemoryUsage: 200 * 1024 * 1024,
            maxBundleSize: 2 * 1024 * 1024,
            maxRenderTime: 3000,
          },
          accessibility: { minScore: 95, wcagLevel: 'AA', maxViolations: 0 },
          technicalDebt: {
            maxDebtRatio: 5,
            minMaintainabilityIndex: 60,
            maxComplexity: 10,
          },
        },
      };

      const report = await framework.runTests('nextjs', config);

      expect(report.framework).toBe('nextjs');
      expect(report.results).toHaveLength(1);
      expect(report.results[0].status).toBe('passed');
      expect(report.qualityGate).toBeDefined();
      expect(report.coverage.lines).toBe(85);
    });

    it('should handle test failures gracefully', async () => {
      // Mock adapter that throws an error
      const failingAdapter: TestAdapter = {
        framework: 'flutter',
        async runTests() {
          throw new Error('Test execution failed');
        },
        async generateTests() {
          return [];
        },
        async validateQualityGates() {
          return {
            passed: false,
            score: 0,
            results: {
              coverage: false,
              security: false,
              performance: false,
              accessibility: false,
              technicalDebt: false,
            },
            failures: [],
            recommendations: [],
          };
        },
      };

      framework.registerAdapter(failingAdapter);

      const config: TestConfig = {
        framework: 'flutter',
        testTypes: ['unit'],
        coverage: { enabled: true, threshold: { lines: 80, functions: 80, branches: 80, statements: 80 }, reportPath: './coverage' },
        performance: { enabled: true, benchmarks: [] },
        security: { enabled: true, scanners: [] },
        accessibility: { enabled: true, wcagLevel: 'AA' },
        qualityGates: {
          coverage: { lines: 80, functions: 80, branches: 80, statements: 80 },
          security: { maxCritical: 0, maxHigh: 0, maxMedium: 5 },
          performance: { maxExecutionTime: 30000, maxMemoryUsage: 200 * 1024 * 1024 },
          accessibility: { minScore: 95, wcagLevel: 'AA', maxViolations: 0 },
          technicalDebt: { maxDebtRatio: 5, minMaintainabilityIndex: 60, maxComplexity: 10 },
        },
      };

      await expect(framework.runTests('flutter', config)).rejects.toThrow('Test execution failed');
    });
  });

  describe('test generation', () => {
    beforeEach(() => {
      framework.registerAdapter(mockAdapter);
    });

    it('should generate tests for a framework', async () => {
      const config: TestGenerationConfig = {
        targetPath: './src',
        testPath: './tests',
        framework: 'nextjs',
        patterns: [],
        templates: [],
      };

      const files = await framework.generateTests('nextjs', config);

      expect(files).toHaveLength(2);
      expect(files).toContain('test1.spec.ts');
      expect(files).toContain('test2.spec.ts');
    });
  });

  describe('quality gate validation', () => {
    beforeEach(() => {
      framework.registerAdapter(mockAdapter);
    });

    it('should validate quality gates', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'unit',
          name: 'Test 1',
          status: 'passed',
          duration: 100,
          coverage: { lines: 85, functions: 90, branches: 80, statements: 85 },
        },
      ];

      const config: TestConfig = {
        framework: 'nextjs',
        testTypes: ['unit'],
        coverage: { enabled: true, threshold: { lines: 80, functions: 80, branches: 80, statements: 80 }, reportPath: './coverage' },
        performance: { enabled: true, benchmarks: [] },
        security: { enabled: true, scanners: [] },
        accessibility: { enabled: true, wcagLevel: 'AA' },
        qualityGates: {
          coverage: { lines: 80, functions: 80, branches: 80, statements: 80 },
          security: { maxCritical: 0, maxHigh: 0, maxMedium: 5 },
          performance: { maxExecutionTime: 30000, maxMemoryUsage: 200 * 1024 * 1024 },
          accessibility: { minScore: 95, wcagLevel: 'AA', maxViolations: 0 },
          technicalDebt: { maxDebtRatio: 5, minMaintainabilityIndex: 60, maxComplexity: 10 },
        },
      };

      const qualityGateResult = await framework.validateQualityGates('nextjs', results, config);

      expect(qualityGateResult.passed).toBe(true);
      expect(qualityGateResult.score).toBeGreaterThan(0);
      expect(qualityGateResult.results.coverage).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should emit events during test execution', async () => {
      const events: any[] = [];
      
      framework.onEvent((event) => {
        events.push(event);
      });

      framework.registerAdapter(mockAdapter);

      const config: TestConfig = {
        framework: 'nextjs',
        testTypes: ['unit'],
        coverage: { enabled: true, threshold: { lines: 80, functions: 80, branches: 80, statements: 80 }, reportPath: './coverage' },
        performance: { enabled: true, benchmarks: [] },
        security: { enabled: true, scanners: [] },
        accessibility: { enabled: true, wcagLevel: 'AA' },
        qualityGates: {
          coverage: { lines: 80, functions: 80, branches: 80, statements: 80 },
          security: { maxCritical: 0, maxHigh: 0, maxMedium: 5 },
          performance: { maxExecutionTime: 30000, maxMemoryUsage: 200 * 1024 * 1024 },
          accessibility: { minScore: 95, wcagLevel: 'AA', maxViolations: 0 },
          technicalDebt: { maxDebtRatio: 5, minMaintainabilityIndex: 60, maxComplexity: 10 },
        },
      };

      await framework.runTests('nextjs', config);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'test-started')).toBe(true);
      expect(events.some(e => e.type === 'test-completed')).toBe(true);
    });
  });

  describe('aggregated metrics', () => {
    it('should calculate aggregated metrics across frameworks', async () => {
      const reports = [
        {
          framework: 'nextjs' as Framework,
          timestamp: new Date(),
          duration: 1000,
          summary: { total: 10, passed: 8, failed: 2, skipped: 0, successRate: 80 },
          results: [],
          coverage: { lines: 85, functions: 90, branches: 80, statements: 85 },
          performance: { executionTime: 1000, memoryUsage: 1024 * 1024 },
          security: { vulnerabilities: [], codeSmells: [], technicalDebt: { debtRatio: 2, maintainabilityIndex: 80, cyclomaticComplexity: 5, duplicatedLines: 0, codeSmellsCount: 0 } },
          accessibility: { score: 95, violations: [], wcagLevel: 'AA' as const },
          qualityGate: { passed: true, score: 90, results: { coverage: true, security: true, performance: true, accessibility: true, technicalDebt: true }, failures: [], recommendations: [] },
        },
        {
          framework: 'flutter' as Framework,
          timestamp: new Date(),
          duration: 1500,
          summary: { total: 15, passed: 12, failed: 3, skipped: 0, successRate: 80 },
          results: [],
          coverage: { lines: 75, functions: 80, branches: 70, statements: 75 },
          performance: { executionTime: 1500, memoryUsage: 2 * 1024 * 1024 },
          security: { vulnerabilities: [], codeSmells: [], technicalDebt: { debtRatio: 3, maintainabilityIndex: 75, cyclomaticComplexity: 8, duplicatedLines: 0, codeSmellsCount: 0 } },
          accessibility: { score: 90, violations: [], wcagLevel: 'AA' as const },
          qualityGate: { passed: false, score: 75, results: { coverage: false, security: true, performance: true, accessibility: true, technicalDebt: true }, failures: [], recommendations: [] },
        },
      ];

      const metrics = await framework.getAggregatedMetrics(reports);

      expect(metrics.totalTests).toBe(25);
      expect(metrics.passedTests).toBe(20);
      expect(metrics.failedTests).toBe(5);
      expect(metrics.coverageAverage).toBe(80); // (85 + 75) / 2
      expect(metrics.qualityGatesPassed).toBe(1);
      expect(metrics.frameworks).toEqual(['nextjs', 'flutter']);
    });
  });
});