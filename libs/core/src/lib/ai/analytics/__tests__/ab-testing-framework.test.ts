import { ABTestingFramework, ABTest, ABTestVariant } from '../ab-testing-framework';
import { PromptExecutionResult } from '../../prompts/prompt-template';

describe('ABTestingFramework', () => {
  let framework: ABTestingFramework;
  
  beforeEach(() => {
    framework = new ABTestingFramework({
      enableAutoOptimization: false,
      trafficSplitMethod: 'random',
      minimumTestDuration: 1 // 1 hour for testing
    });
  });

  afterEach(async () => {
    await framework.destroy();
  });

  describe('Test Creation', () => {
    it('should create a valid A/B test', async () => {
      const testConfig = {
        name: 'Prompt Optimization Test',
        description: 'Testing different prompt variations',
        variants: [
          {
            id: 'control',
            name: 'Control',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 50,
            isControl: true
          },
          {
            id: 'variant-a',
            name: 'Optimized Version',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 50,
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      };

      const test = await framework.createTest(testConfig);

      expect(test.id).toBeDefined();
      expect(test.name).toBe(testConfig.name);
      expect(test.status).toBe('draft');
      expect(test.variants).toHaveLength(2);
      expect(test.variants.find(v => v.isControl)).toBeDefined();
    });

    it('should reject test with invalid variant weights', async () => {
      const testConfig = {
        name: 'Invalid Test',
        description: 'Test with invalid weights',
        variants: [
          {
            id: 'control',
            name: 'Control',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 40, // Total: 90%
            isControl: true
          },
          {
            id: 'variant-a',
            name: 'Variant A',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 50, // Total: 90%
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      };

      await expect(framework.createTest(testConfig)).rejects.toThrow('must sum to 100');
    });

    it('should reject test without control variant', async () => {
      const testConfig = {
        name: 'No Control Test',
        description: 'Test without control',
        variants: [
          {
            id: 'variant-a',
            name: 'Variant A',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 50,
            isControl: false
          },
          {
            id: 'variant-b',
            name: 'Variant B',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 50,
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      };

      await expect(framework.createTest(testConfig)).rejects.toThrow('control variant required');
    });
  });

  describe('Test Lifecycle', () => {
    let test: ABTest;

    beforeEach(async () => {
      test = await framework.createTest({
        name: 'Lifecycle Test',
        description: 'Testing lifecycle',
        variants: [
          {
            id: 'control',
            name: 'Control',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 50,
            isControl: true
          },
          {
            id: 'variant-a',
            name: 'Variant A',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 50,
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 10,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      });
    });

    it('should start a test successfully', async () => {
      const startedTest = await framework.startTest(test.id);
      
      expect(startedTest.status).toBe('running');
      expect(startedTest.startDate).toBeDefined();
    });

    it('should pause a running test', async () => {
      await framework.startTest(test.id);
      const pausedTest = await framework.pauseTest(test.id);
      
      expect(pausedTest.status).toBe('paused');
    });

    it('should complete a test and analyze results', async () => {
      await framework.startTest(test.id);
      
      // Add some mock executions
      const controlExecution: PromptExecutionResult = {
        context: {
          templateId: 'template-1',
          version: '1.0.0',
          executedAt: Date.now(),
          variables: {}
        },
        success: true,
        responseTime: 1000,
        tokenUsage: { prompt: 100, completion: 200, total: 300 },
        cost: 0.01,
        provider: 'openai',
        quality: { score: 0.8 }
      };

      const variantExecution: PromptExecutionResult = {
        ...controlExecution,
        context: { ...controlExecution.context, version: '1.1.0' },
        responseTime: 800,
        quality: { score: 0.9 }
      };

      // Record executions for both variants
      for (let i = 0; i < 15; i++) {
        await framework.recordExecution(test.id, 'control', controlExecution);
        await framework.recordExecution(test.id, 'variant-a', variantExecution);
      }

      const completedTest = await framework.completeTest(test.id);
      
      expect(completedTest.status).toBe('completed');
      expect(completedTest.endDate).toBeDefined();
      expect(completedTest.results).toBeDefined();
      expect(completedTest.results!.variants).toHaveProperty('control');
      expect(completedTest.results!.variants).toHaveProperty('variant-a');
    });
  });

  describe('Variant Assignment', () => {
    let test: ABTest;

    beforeEach(async () => {
      test = await framework.createTest({
        name: 'Assignment Test',
        description: 'Testing variant assignment',
        variants: [
          {
            id: 'control',
            name: 'Control',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 70,
            isControl: true
          },
          {
            id: 'variant-a',
            name: 'Variant A',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 30,
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      });
      
      await framework.startTest(test.id);
    });

    it('should assign variants to users', () => {
      const variant1 = framework.assignVariant(test.id, 'user-1');
      const variant2 = framework.assignVariant(test.id, 'user-2');
      
      expect(variant1).toBeDefined();
      expect(variant2).toBeDefined();
      expect(['control', 'variant-a']).toContain(variant1!.id);
      expect(['control', 'variant-a']).toContain(variant2!.id);
    });

    it('should maintain consistent assignment for same user', () => {
      const assignment1 = framework.assignVariant(test.id, 'user-1');
      const assignment2 = framework.assignVariant(test.id, 'user-1');
      
      expect(assignment1?.id).toBe(assignment2?.id);
    });

    it('should not assign variants for non-running tests', () => {
      const draftTest = {
        ...test,
        id: 'draft-test',
        status: 'draft' as const
      };
      
      const variant = framework.assignVariant(draftTest.id, 'user-1');
      expect(variant).toBeNull();
    });
  });

  describe('Results Analysis', () => {
    let test: ABTest;

    beforeEach(async () => {
      test = await framework.createTest({
        name: 'Analysis Test',
        description: 'Testing results analysis',
        variants: [
          {
            id: 'control',
            name: 'Control',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 50,
            isControl: true
          },
          {
            id: 'variant-a',
            name: 'Variant A',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 50,
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 20,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      });
      
      await framework.startTest(test.id);
    });

    it('should analyze test results with sufficient data', async () => {
      // Add executions with clear performance difference
      const controlExecution: PromptExecutionResult = {
        context: {
          templateId: 'template-1',
          version: '1.0.0',
          executedAt: Date.now(),
          variables: {}
        },
        success: true,
        responseTime: 1000,
        tokenUsage: { prompt: 100, completion: 200, total: 300 },
        cost: 0.01,
        provider: 'openai'
      };

      const variantExecution: PromptExecutionResult = {
        ...controlExecution,
        context: { ...controlExecution.context, version: '1.1.0' },
        success: true,
        responseTime: 600 // 40% improvement
      };

      // Add enough data for analysis
      for (let i = 0; i < 25; i++) {
        await framework.recordExecution(test.id, 'control', controlExecution);
        await framework.recordExecution(test.id, 'variant-a', variantExecution);
      }

      const results = await framework.analyzeTestResults(test.id);
      
      expect(results.testId).toBe(test.id);
      expect(results.variants.control).toBeDefined();
      expect(results.variants['variant-a']).toBeDefined();
      expect(results.variants.control.sampleSize).toBe(25);
      expect(results.variants['variant-a'].sampleSize).toBe(25);
    });

    it('should return insufficient_data status with small sample', async () => {
      const execution: PromptExecutionResult = {
        context: {
          templateId: 'template-1',
          version: '1.0.0',
          executedAt: Date.now(),
          variables: {}
        },
        success: true,
        responseTime: 1000,
        tokenUsage: { prompt: 100, completion: 200, total: 300 },
        cost: 0.01,
        provider: 'openai'
      };

      // Add insufficient data
      for (let i = 0; i < 5; i++) {
        await framework.recordExecution(test.id, 'control', execution);
        await framework.recordExecution(test.id, 'variant-a', execution);
      }

      const results = await framework.analyzeTestResults(test.id);
      
      expect(results.status).toBe('insufficient_data');
    });
  });

  describe('Event Emission', () => {
    it('should emit events during test lifecycle', async () => {
      const events: string[] = [];
      
      framework.on('test:created', () => events.push('created'));
      framework.on('test:started', () => events.push('started'));
      framework.on('variant:assigned', () => events.push('assigned'));
      framework.on('execution:recorded', () => events.push('recorded'));
      framework.on('test:completed', () => events.push('completed'));

      const test = await framework.createTest({
        name: 'Event Test',
        description: 'Testing event emission',
        variants: [
          {
            id: 'control',
            name: 'Control',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 50,
            isControl: true
          },
          {
            id: 'variant-a',
            name: 'Variant A',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 50,
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 5,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      });

      await framework.startTest(test.id);
      
      const variant = framework.assignVariant(test.id, 'user-1');
      
      const execution: PromptExecutionResult = {
        context: {
          templateId: 'template-1',
          version: '1.0.0',
          executedAt: Date.now(),
          variables: {}
        },
        success: true,
        responseTime: 1000,
        tokenUsage: { prompt: 100, completion: 200, total: 300 },
        cost: 0.01,
        provider: 'openai'
      };

      await framework.recordExecution(test.id, variant!.id, execution);
      await framework.completeTest(test.id);

      expect(events).toContain('created');
      expect(events).toContain('started');
      expect(events).toContain('assigned');
      expect(events).toContain('recorded');
      expect(events).toContain('completed');
    });
  });

  describe('Hash-based Assignment', () => {
    let framework: ABTestingFramework;

    beforeEach(() => {
      framework = new ABTestingFramework({
        trafficSplitMethod: 'hash'
      });
    });

    it('should provide deterministic assignment with hash method', async () => {
      const test = await framework.createTest({
        name: 'Hash Test',
        description: 'Testing hash-based assignment',
        variants: [
          {
            id: 'control',
            name: 'Control',
            templateId: 'template-1',
            templateVersion: '1.0.0',
            weight: 50,
            isControl: true
          },
          {
            id: 'variant-a',
            name: 'Variant A',
            templateId: 'template-1',
            templateVersion: '1.1.0',
            weight: 50,
            isControl: false
          }
        ],
        targetMetric: 'success_rate' as const,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        createdBy: 'test-user'
      });

      await framework.startTest(test.id);

      const assignment1 = framework.assignVariant(test.id, 'consistent-user');
      const assignment2 = framework.assignVariant(test.id, 'consistent-user');
      const assignment3 = framework.assignVariant(test.id, 'consistent-user');

      expect(assignment1?.id).toBe(assignment2?.id);
      expect(assignment2?.id).toBe(assignment3?.id);
    });
  });
});