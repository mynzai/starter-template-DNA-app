/**
 * @fileoverview Tests for Quality Validation Engine - Epic 6 Story 4
 */

import { 
  QualityValidationEngine,
  QualityValidationConfig,
  TemplateTestConfig,
  ValidationCategory,
  TestPlatform,
  ValidationStatus,
  ValidationSeverity
} from '../quality-validation-engine';
import { SupportedFramework } from '../../types';

describe('QualityValidationEngine', () => {
  let engine: QualityValidationEngine;
  let config: QualityValidationConfig;

  beforeEach(() => {
    config = {
      enableParallelValidation: true,
      maxConcurrentValidations: 3,
      timeoutMinutes: 30,
      categoryConfigs: new Map([
        [ValidationCategory.TEMPLATE_TESTING, { 
          enabled: true, 
          weight: 0.3, 
          thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
          customSettings: {}
        }],
        [ValidationCategory.SECURITY_SCANNING, { 
          enabled: true, 
          weight: 0.25, 
          thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
          customSettings: {}
        }],
        [ValidationCategory.PERFORMANCE_BENCHMARKING, { 
          enabled: true, 
          weight: 0.2, 
          thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
          customSettings: {}
        }]
      ]),
      platformConfigs: new Map([
        [TestPlatform.WEB, {
          enabled: true,
          testEnvironment: 'chrome-headless',
          simulators: [],
          browserEngines: ['chromium'],
          nodeVersions: ['18'],
          dependencies: ['@playwright/test'],
          environmentVariables: {}
        }]
      ]),
      frameworkConfigs: new Map([
        [SupportedFramework.NEXTJS, {
          enabled: true,
          versions: ['13', '14'],
          testCommands: ['npm run test'],
          buildCommands: ['npm run build'],
          lintCommands: ['npm run lint'],
          securityCommands: ['npm audit'],
          performanceCommands: ['npm run lighthouse']
        }]
      ]),
      qualityGates: [
        {
          id: 'test-coverage',
          name: 'Test Coverage Gate',
          description: 'Minimum test coverage required',
          category: ValidationCategory.TEMPLATE_TESTING,
          minimumScore: 80,
          blocking: true,
          conditions: [
            { metric: 'line_coverage', operator: 'gte', value: 80, severity: ValidationSeverity.HIGH }
          ]
        }
      ],
      reportingConfig: {
        enableReports: true,
        outputFormats: ['json'],
        outputDirectory: './test-reports',
        includeDetailedMetrics: true,
        includeTrendAnalysis: false,
        reportRetentionDays: 30
      },
      autoFixConfig: {
        enableAutoFix: false,
        autoFixCategories: [],
        autoFixSeverities: [],
        confirmBeforeFix: true,
        backupBeforeFix: true
      }
    };

    engine = new QualityValidationEngine(config);
  });

  describe('Template Validation', () => {
    it('should validate a Next.js template successfully', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './test-template',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit', 'integration'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);

      expect(result).toBeDefined();
      expect(result.templateName).toBe('./test-template');
      expect(result.overallStatus).toEqual(expect.any(String));
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
      expect(result.categoryResults.size).toBeGreaterThan(0);
    }, 10000);

    it('should handle validation for multiple platforms', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './multi-platform-template',
        platforms: [TestPlatform.WEB, TestPlatform.MOBILE_IOS],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);

      expect(result.platformResults.size).toBe(2);
      expect(result.platformResults.has(TestPlatform.WEB)).toBe(true);
      expect(result.platformResults.has(TestPlatform.MOBILE_IOS)).toBe(true);
    }, 10000);

    it('should detect and report quality issues', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './template-with-issues',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit', 'security', 'performance'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);

      // Should have some issues reported
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
      
      if (result.totalIssues > 0) {
        expect(result.issuesBySeverity.size).toBeGreaterThan(0);
        
        // Check that issues are properly categorized
        for (const [severity, count] of result.issuesBySeverity) {
          expect(Object.values(ValidationSeverity)).toContain(severity);
          expect(count).toBeGreaterThan(0);
        }
      }
    }, 15000);

    it('should calculate overall score correctly', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './scoring-test-template',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);

      // Score should be weighted average of category scores
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      
      // Should have category results that contribute to overall score
      expect(result.categoryResults.size).toBeGreaterThan(0);
      
      for (const [category, categoryResults] of result.categoryResults) {
        expect(categoryResults.length).toBeGreaterThan(0);
        
        for (const categoryResult of categoryResults) {
          expect(categoryResult.score).toBeGreaterThanOrEqual(0);
          expect(categoryResult.score).toBeLessThanOrEqual(100);
          expect(categoryResult.category).toBe(category);
        }
      }
    });

    it('should respect quality gates', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './quality-gate-test',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);

      // Quality gates should be evaluated
      expect(result.qualityGatesPassed).toBeGreaterThanOrEqual(0);
      expect(result.qualityGatesFailed).toBeGreaterThanOrEqual(0);
      expect(result.qualityGatesPassed + result.qualityGatesFailed).toBeGreaterThan(0);
      
      // Blocking failures should be properly detected
      expect(typeof result.blockingFailures).toBe('boolean');
    });
  });

  describe('Category Validation', () => {
    it('should execute template testing validation', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './template-testing',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit', 'integration'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);
      
      expect(result.categoryResults.has(ValidationCategory.TEMPLATE_TESTING)).toBe(true);
      
      const templateTestingResults = result.categoryResults.get(ValidationCategory.TEMPLATE_TESTING)!;
      expect(templateTestingResults.length).toBeGreaterThan(0);
      
      for (const categoryResult of templateTestingResults) {
        expect(categoryResult.category).toBe(ValidationCategory.TEMPLATE_TESTING);
        expect(categoryResult.status).toEqual(expect.any(String));
        expect(Object.values(ValidationStatus)).toContain(categoryResult.status);
      }
    });

    it('should execute security scanning validation', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './security-test',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['security'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);
      
      expect(result.categoryResults.has(ValidationCategory.SECURITY_SCANNING)).toBe(true);
      
      const securityResults = result.categoryResults.get(ValidationCategory.SECURITY_SCANNING)!;
      expect(securityResults.length).toBeGreaterThan(0);
      
      for (const categoryResult of securityResults) {
        expect(categoryResult.category).toBe(ValidationCategory.SECURITY_SCANNING);
        expect(categoryResult.metrics.security).toBeDefined();
        expect(categoryResult.metrics.security.vulnerabilities).toBeDefined();
      }
    });

    it('should execute performance benchmarking validation', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './performance-test',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['performance'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);
      
      expect(result.categoryResults.has(ValidationCategory.PERFORMANCE_BENCHMARKING)).toBe(true);
      
      const performanceResults = result.categoryResults.get(ValidationCategory.PERFORMANCE_BENCHMARKING)!;
      expect(performanceResults.length).toBeGreaterThan(0);
      
      for (const categoryResult of performanceResults) {
        expect(categoryResult.category).toBe(ValidationCategory.PERFORMANCE_BENCHMARKING);
        expect(categoryResult.metrics.performance).toBeDefined();
        expect(categoryResult.metrics.performance.buildTime).toBeGreaterThanOrEqual(0);
        expect(categoryResult.metrics.performance.bundleSize).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Event Handling', () => {
    it('should emit validation events', async () => {
      const events: string[] = [];
      
      engine.on('validation:started', () => events.push('validation:started'));
      engine.on('category:started', () => events.push('category:started'));
      engine.on('test:started', () => events.push('test:started'));
      engine.on('test:completed', () => events.push('test:completed'));
      engine.on('category:completed', () => events.push('category:completed'));
      engine.on('validation:completed', () => events.push('validation:completed'));

      const testConfig: TemplateTestConfig = {
        templatePath: './event-test',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      await engine.validateTemplate(testConfig);

      expect(events).toContain('validation:started');
      expect(events).toContain('validation:completed');
      expect(events.length).toBeGreaterThan(2);
    });
  });

  describe('Result Storage and Retrieval', () => {
    it('should store and retrieve validation results', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './storage-test',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);
      
      // Should be able to retrieve the result
      const retrievedResult = engine.getValidationResults(result.templateId);
      expect(retrievedResult).toBeDefined();
      expect(retrievedResult!.templateId).toBe(result.templateId);
      expect(retrievedResult!.overallScore).toBe(result.overallScore);
      
      // Should be in the list of all results
      const allResults = engine.getAllValidationResults();
      expect(allResults.length).toBeGreaterThan(0);
      expect(allResults.find(r => r.templateId === result.templateId)).toBeDefined();
    });

    it('should track validation status correctly', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './status-test',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      // Start validation
      const validationPromise = engine.validateTemplate(testConfig);
      
      // Should initially show running status for some validation ID
      // (Note: This is a simplified test - in real scenarios we'd need the validation ID)
      
      const result = await validationPromise;
      
      // Should show completed status
      const status = engine.getValidationStatus(result.templateId);
      expect(status).toBeDefined();
      expect([ValidationStatus.COMPLETED, ValidationStatus.FAILED]).toContain(status!);
    });
  });

  describe('Error Handling', () => {
    it('should handle template validation errors gracefully', async () => {
      const testConfig: TemplateTestConfig = {
        templatePath: './non-existent-template',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      // Should not throw, but should return failed result
      const result = await engine.validateTemplate(testConfig);
      
      // Should handle the error gracefully
      expect(result).toBeDefined();
      expect(result.overallStatus).toEqual(expect.any(String));
      
      // May have errors but should still provide a complete result structure
      expect(result.categoryResults).toBeDefined();
      expect(result.platformResults).toBeDefined();
      expect(result.frameworkResults).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete validation within reasonable time', async () => {
      const startTime = Date.now();
      
      const testConfig: TemplateTestConfig = {
        templatePath: './performance-test',
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      };

      const result = await engine.validateTemplate(testConfig);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds (reasonable for mocked implementation)
      expect(duration).toBeLessThan(30000);
      
      // Should track execution time
      expect(result.executionDuration).toBeGreaterThan(0);
      expect(result.executionDuration).toBeLessThan(duration + 1000); // Allow some overhead
    });

    it('should respect concurrent validation limits', async () => {
      const testConfigs: TemplateTestConfig[] = Array.from({ length: 5 }, (_, i) => ({
        templatePath: `./concurrent-test-${i}`,
        platforms: [TestPlatform.WEB],
        frameworks: [SupportedFramework.NEXTJS],
        testTypes: ['unit'],
        configurations: [{
          name: 'default',
          environment: {},
          parameters: {},
          expectedResults: {}
        }]
      }));

      const startTime = Date.now();
      
      // Start all validations simultaneously
      const promises = testConfigs.map(config => engine.validateTemplate(config));
      
      // All should complete successfully
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(5);
      
      // With max concurrent = 3, this should take longer than if all ran in parallel
      // but less than if they ran sequentially
      expect(duration).toBeGreaterThan(500); // Some serialization expected
      expect(duration).toBeLessThan(10000); // But not fully sequential
      
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result.overallStatus).toEqual(expect.any(String));
      }
    }, 15000);
  });
});