/**
 * @fileoverview Tests for the Quality Gates Engine
 */

import { QualityGateEngine } from '../core/quality-gates';
import {
  QualityGateConfig,
  TestResult,
  CoverageMetrics,
  PerformanceMetrics,
  SecurityMetrics,
  AccessibilityMetrics,
} from '../types';

describe('QualityGateEngine', () => {
  let qualityGateEngine: QualityGateEngine;

  beforeEach(() => {
    qualityGateEngine = new QualityGateEngine();
  });

  describe('coverage validation', () => {
    it('should pass when coverage meets thresholds', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'unit',
          name: 'Test 1',
          status: 'passed',
          duration: 100,
          coverage: {
            lines: 85,
            functions: 90,
            branches: 80,
            statements: 85,
          },
        },
      ];

      const config: QualityGateConfig = {
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
          maxExecutionTime: 30000,
          maxMemoryUsage: 200 * 1024 * 1024,
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

      const result = await qualityGateEngine.validateQualityGates(results, config);

      expect(result.passed).toBe(true);
      expect(result.results.coverage).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should fail when coverage is below thresholds', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'unit',
          name: 'Test 1',
          status: 'passed',
          duration: 100,
          coverage: {
            lines: 70, // Below threshold
            functions: 75, // Below threshold
            branches: 65, // Below threshold
            statements: 70, // Below threshold
          },
        },
      ];

      const config: QualityGateConfig = {
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
          maxExecutionTime: 30000,
          maxMemoryUsage: 200 * 1024 * 1024,
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

      const result = await qualityGateEngine.validateQualityGates(results, config);

      expect(result.passed).toBe(false);
      expect(result.results.coverage).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.failures.some(f => f.metric === 'lines')).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('performance validation', () => {
    it('should pass when performance meets thresholds', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'performance',
          name: 'Performance Test',
          status: 'passed',
          duration: 100,
          performanceMetrics: {
            executionTime: 25000, // Below threshold
            memoryUsage: 150 * 1024 * 1024, // Below threshold
            bundleSize: 1.5 * 1024 * 1024, // Below threshold
          },
        },
      ];

      const config: QualityGateConfig = {
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
          maxExecutionTime: 30000,
          maxMemoryUsage: 200 * 1024 * 1024,
          maxBundleSize: 2 * 1024 * 1024,
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

      const result = await qualityGateEngine.validateQualityGates(results, config);

      expect(result.results.performance).toBe(true);
    });

    it('should fail when performance exceeds thresholds', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'performance',
          name: 'Performance Test',
          status: 'passed',
          duration: 100,
          performanceMetrics: {
            executionTime: 35000, // Above threshold
            memoryUsage: 250 * 1024 * 1024, // Above threshold
            bundleSize: 3 * 1024 * 1024, // Above threshold
          },
        },
      ];

      const config: QualityGateConfig = {
        coverage: {
          lines: 0, // Set to 0 to avoid coverage failures
          functions: 0,
          branches: 0,
          statements: 0,
        },
        security: {
          maxCritical: 0,
          maxHigh: 0,
          maxMedium: 5,
        },
        performance: {
          maxExecutionTime: 30000,
          maxMemoryUsage: 200 * 1024 * 1024,
          maxBundleSize: 2 * 1024 * 1024,
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

      const result = await qualityGateEngine.validateQualityGates(results, config);

      expect(result.passed).toBe(false);
      expect(result.results.performance).toBe(false);
      expect(result.failures.some(f => f.metric === 'execution-time')).toBe(true);
      expect(result.failures.some(f => f.metric === 'memory-usage')).toBe(true);
      expect(result.failures.some(f => f.metric === 'bundle-size')).toBe(true);
    });
  });

  describe('security validation', () => {
    it('should pass when no vulnerabilities exist', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'security',
          name: 'Security Test',
          status: 'passed',
          duration: 100,
        },
      ];

      const config: QualityGateConfig = {
        coverage: {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
        security: {
          maxCritical: 0,
          maxHigh: 0,
          maxMedium: 5,
        },
        performance: {
          maxExecutionTime: 30000,
          maxMemoryUsage: 200 * 1024 * 1024,
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

      const result = await qualityGateEngine.validateQualityGates(results, config);

      expect(result.results.security).toBe(true);
    });
  });

  describe('overall scoring', () => {
    it('should calculate correct overall score', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'unit',
          name: 'Test 1',
          status: 'passed',
          duration: 100,
          coverage: {
            lines: 85,
            functions: 90,
            branches: 80,
            statements: 85,
          },
          performanceMetrics: {
            executionTime: 25000,
            memoryUsage: 150 * 1024 * 1024,
          },
        },
      ];

      const config: QualityGateConfig = {
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
          maxExecutionTime: 30000,
          maxMemoryUsage: 200 * 1024 * 1024,
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

      const result = await qualityGateEngine.validateQualityGates(results, config);

      expect(result.score).toBe(100); // All gates should pass
      expect(result.passed).toBe(true);
    });

    it('should provide recommendations for improvements', async () => {
      const results: TestResult[] = [
        {
          framework: 'nextjs',
          testType: 'unit',
          name: 'Test 1',
          status: 'passed',
          duration: 100,
          coverage: {
            lines: 70, // Below threshold
            functions: 75,
            branches: 65,
            statements: 70,
          },
          performanceMetrics: {
            executionTime: 35000, // Above threshold
            memoryUsage: 250 * 1024 * 1024, // Above threshold
          },
        },
      ];

      const config: QualityGateConfig = {
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
          maxExecutionTime: 30000,
          maxMemoryUsage: 200 * 1024 * 1024,
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

      const result = await qualityGateEngine.validateQualityGates(results, config);

      expect(result.passed).toBe(false);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('coverage'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('performance') || r.includes('memory'))).toBe(true);
    });
  });
});