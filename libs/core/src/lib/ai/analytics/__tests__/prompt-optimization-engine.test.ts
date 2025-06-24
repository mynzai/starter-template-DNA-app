import { PromptOptimizationEngine, OptimizationRecommendation } from '../prompt-optimization-engine';
import { PromptPerformanceAnalytics } from '../prompt-performance-analytics';
import { ABTestingFramework } from '../ab-testing-framework';
import { PromptTemplate, PromptExecutionResult } from '../../prompts/prompt-template';

describe('PromptOptimizationEngine', () => {
  let engine: PromptOptimizationEngine;
  let analytics: PromptPerformanceAnalytics;
  let abTesting: ABTestingFramework;

  beforeEach(() => {
    analytics = new PromptPerformanceAnalytics({
      enableRealTimeAnalytics: true,
      enableAnomalyDetection: true
    });
    
    abTesting = new ABTestingFramework({
      enableAutoOptimization: false
    });
    
    engine = new PromptOptimizationEngine(analytics, abTesting);
  });

  afterEach(async () => {
    await engine.destroy();
    await analytics.destroy();
    await abTesting.destroy();
  });

  const createMockTemplate = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => ({
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template',
    template: 'Generate a summary of the following text: {{text}}',
    variables: [
      {
        name: 'text',
        type: 'string',
        description: 'Text to summarize',
        required: true
      }
    ],
    category: 'summarization',
    tags: ['test'],
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'test-user',
    isActive: true,
    ...overrides
  });

  const createMockReport = (overrides: any = {}) => ({
    templateId: 'template-1',
    period: { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() },
    summary: {
      avgResponseTime: 2000,
      totalExecutions: 1000,
      successRate: 0.95,
      avgTokenUsage: 500,
      avgCost: 0.02,
      lastExecuted: Date.now(),
      qualityScore: 0.8,
      ...overrides.summary
    },
    trends: [],
    anomalies: [],
    recommendations: [],
    ...overrides
  });

  describe('Template Analysis', () => {
    it('should analyze template and generate recommendations', async () => {
      const template = createMockTemplate();
      const result = await engine.analyzeTemplate(template);

      expect(result.templateId).toBe(template.id);
      expect(result.recommendations).toBeDefined();
      expect(result.automatedOptimizations).toBeDefined();
      expect(result.projectedImprovements).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should detect long prompt issues', async () => {
      const longTemplate = createMockTemplate({
        template: 'A'.repeat(10000) // Very long prompt
      });

      const result = await engine.analyzeTemplate(longTemplate);
      
      const lengthRecommendation = result.recommendations.find(r => 
        r.title.includes('Length')
      );
      expect(lengthRecommendation).toBeDefined();
      expect(lengthRecommendation?.type).toBe('prompt_refinement');
    });

    it('should detect vague instruction patterns', async () => {
      const vagueTemplate = createMockTemplate({
        template: 'Please try to maybe summarize this somehow: {{text}}'
      });

      const result = await engine.analyzeTemplate(vagueTemplate);
      
      const patternRecommendation = result.recommendations.find(r => 
        r.title.includes('Pattern')
      );
      expect(patternRecommendation).toBeDefined();
    });

    it('should detect missing best practices', async () => {
      const basicTemplate = createMockTemplate({
        template: 'Summarize: {{text}}', // No examples, no step-by-step
        variables: [] // No variables
      });

      const result = await engine.analyzeTemplate(basicTemplate);
      
      const bestPracticeRecs = result.recommendations.filter(r => 
        r.title.includes('example') || r.title.includes('step') || r.title.includes('variable')
      );
      expect(bestPracticeRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Analysis', () => {
    it('should recommend model changes for high latency', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        summary: { avgResponseTime: 5000 } // High response time
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const modelChangeRec = result.recommendations.find(r => 
        r.type === 'model_change' && r.title.includes('Faster')
      );
      expect(modelChangeRec).toBeDefined();
      expect(modelChangeRec?.priority).toBe('high');
    });

    it('should recommend fallback strategies for low success rate', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        summary: { successRate: 0.85 } // Low success rate
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const fallbackRec = result.recommendations.find(r => 
        r.type === 'fallback_strategy'
      );
      expect(fallbackRec).toBeDefined();
      expect(fallbackRec?.priority).toBe('critical');
    });

    it('should recommend parameter tuning for instability', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        anomalies: Array(5).fill(0).map((_, i) => ({
          timestamp: Date.now() - i * 1000,
          templateId: 'template-1',
          metric: 'responseTime',
          expectedValue: 1000,
          actualValue: 3000,
          deviationStdDev: 4,
          severity: 'high' as const,
          possibleCauses: []
        }))
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const stabilityRec = result.recommendations.find(r => 
        r.title.includes('Stabilize')
      );
      expect(stabilityRec).toBeDefined();
    });
  });

  describe('Cost Optimization', () => {
    it('should recommend token usage reduction', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        summary: { avgTokenUsage: 2000 } // High token usage
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const tokenRec = result.recommendations.find(r => 
        r.title.includes('Token Usage')
      );
      expect(tokenRec).toBeDefined();
      expect(tokenRec?.type).toBe('prompt_refinement');
    });

    it('should recommend caching for high-volume templates', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        summary: { totalExecutions: 5000 } // High volume
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const cacheRec = result.recommendations.find(r => 
        r.type === 'caching'
      );
      expect(cacheRec).toBeDefined();
    });

    it('should suggest cheaper models for over-performing templates', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        summary: { qualityScore: 0.95 } // Very high quality
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const downgradeRec = result.recommendations.find(r => 
        r.title.includes('Cheaper Model')
      );
      expect(downgradeRec).toBeDefined();
    });
  });

  describe('A/B Test Integration', () => {
    it('should recommend applying winning variants', async () => {
      // Create a mock A/B test with results
      const template = createMockTemplate();
      
      // Mock the AB testing framework to return a test with winner
      jest.spyOn(abTesting, 'getActiveTestsForTemplate').mockReturnValue([
        {
          id: 'test-1',
          name: 'Test Optimization',
          description: 'Testing variants',
          status: 'running',
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
              id: 'winner',
              name: 'Optimized',
              templateId: 'template-1',
              templateVersion: '1.1.0',
              weight: 50,
              isControl: false
            }
          ],
          targetMetric: 'success_rate',
          minimumSampleSize: 100,
          confidenceLevel: 0.95,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'test-user'
        }
      ]);

      jest.spyOn(abTesting, 'analyzeTestResults').mockResolvedValue({
        testId: 'test-1',
        status: 'winner_found',
        winnerVariantId: 'winner',
        statisticalSignificance: 0.98,
        variants: {
          control: {
            sampleSize: 150,
            metricValue: 0.85,
            standardDeviation: 0.1,
            confidenceInterval: [0.8, 0.9]
          },
          winner: {
            sampleSize: 150,
            metricValue: 0.92,
            standardDeviation: 0.08,
            confidenceInterval: [0.88, 0.96],
            improvementOverControl: 8.2
          }
        },
        analysisTimestamp: Date.now()
      });

      const result = await engine.analyzeTemplate(template);
      
      const abTestRec = result.recommendations.find(r => 
        r.title.includes('A/B Test')
      );
      expect(abTestRec).toBeDefined();
      expect(abTestRec?.priority).toBe('high');
    });
  });

  describe('Optimization Strategies', () => {
    it('should register custom optimization strategies', () => {
      const strategy = {
        id: 'custom-strategy',
        name: 'Custom Strategy',
        description: 'A custom optimization strategy',
        applicableConditions: [
          { metric: 'avgCost', operator: 'gt' as const, value: 0.05 }
        ],
        recommendations: [],
        successMetrics: [
          { metric: 'avgCost', targetValue: 0.02 }
        ]
      };

      engine.registerOptimizationStrategy(strategy);
      
      // Strategy registration should emit event
      const events: string[] = [];
      engine.on('strategy:registered', () => events.push('registered'));
      
      engine.registerOptimizationStrategy({
        ...strategy,
        id: 'another-strategy'
      });
      
      expect(events).toContain('registered');
    });

    it('should apply matching optimization strategies', async () => {
      // Register a strategy for high-cost templates
      engine.registerOptimizationStrategy({
        id: 'high-cost-strategy',
        name: 'High Cost Strategy',
        description: 'Strategy for expensive templates',
        applicableConditions: [
          { metric: 'avgCost', operator: 'gt', value: 0.05 }
        ],
        recommendations: [{
          id: 'strategy-rec-1',
          type: 'model_change',
          priority: 'high',
          title: 'Strategy Recommendation',
          description: 'From high cost strategy',
          rationale: 'High cost detected',
          expectedImpact: [{
            metric: 'avgCost',
            currentValue: 0.10,
            expectedValue: 0.03,
            improvementPercent: 70
          }],
          suggestedChanges: [],
          estimatedEffort: 'low',
          autoApplicable: true,
          confidence: 0.9
        }],
        successMetrics: []
      });

      const template = createMockTemplate();
      const report = createMockReport({
        summary: { avgCost: 0.08 } // High cost
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const strategyRec = result.recommendations.find(r => 
        r.title === 'Strategy Recommendation'
      );
      expect(strategyRec).toBeDefined();
    });
  });

  describe('Prompt Patterns', () => {
    it('should register custom prompt patterns', () => {
      const pattern = {
        name: 'custom-pattern',
        description: 'A custom problematic pattern',
        pattern: /bad pattern/i,
        issues: ['causes confusion'],
        improvements: ['use better pattern'],
        examples: [{ bad: 'bad pattern example', good: 'good pattern example' }]
      };

      engine.registerPromptPattern(pattern);
      
      // Pattern registration should emit event
      const events: string[] = [];
      engine.on('pattern:registered', () => events.push('registered'));
      
      engine.registerPromptPattern({
        ...pattern,
        name: 'another-pattern'
      });
      
      expect(events).toContain('registered');
    });
  });

  describe('Automated Optimizations', () => {
    it('should apply auto-applicable recommendations', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        summary: { 
          avgResponseTime: 4000, // Will trigger model change recommendation
          successRate: 0.90 // Will trigger fallback recommendation
        }
      });

      const result = await engine.analyzeTemplate(template, report);
      
      // Should have applied some automatic optimizations
      expect(result.automatedOptimizations.applied.length).toBeGreaterThan(0);
    });

    it('should track failed automated optimizations', async () => {
      // This would require mocking failures in the optimization application
      // For now, we test that the structure exists
      const template = createMockTemplate();
      const result = await engine.analyzeTemplate(template);
      
      expect(result.automatedOptimizations.failed).toBeDefined();
      expect(Array.isArray(result.automatedOptimizations.failed)).toBe(true);
    });
  });

  describe('Projected Improvements', () => {
    it('should calculate projected improvements correctly', async () => {
      const template = createMockTemplate();
      const report = createMockReport({
        summary: { avgResponseTime: 3500 } // High response time (> 3000)
      });

      const result = await engine.analyzeTemplate(template, report);
      
      const responseTimeProjection = result.projectedImprovements.find(p => 
        p.metric === 'avgResponseTime'
      );
      
      expect(responseTimeProjection).toBeDefined();
      expect(responseTimeProjection?.currentValue).toBe(3500);
      expect(responseTimeProjection?.projectedValue).toBeLessThan(3500);
      expect(responseTimeProjection?.confidence).toBeGreaterThan(0);
    });

    it('should use diminishing returns for multiple improvements', async () => {
      const template = createMockTemplate({
        template: 'A'.repeat(10000) // Long prompt - multiple recommendations
      });
      
      const report = createMockReport({
        summary: { 
          avgResponseTime: 4000,
          avgCost: 0.10,
          avgTokenUsage: 2000
        }
      });

      const result = await engine.analyzeTemplate(template, report);
      
      // Should have projections for multiple metrics
      expect(result.projectedImprovements.length).toBeGreaterThan(1);
    });
  });

  describe('Optimization History', () => {
    it('should maintain optimization history', async () => {
      const template = createMockTemplate();
      
      // Run analysis multiple times
      await engine.analyzeTemplate(template);
      await engine.analyzeTemplate(template);
      
      const history = engine.getOptimizationHistory(template.id);
      
      expect(history.length).toBe(2);
      expect(history[0].templateId).toBe(template.id);
    });

    it('should limit history size', async () => {
      const template = createMockTemplate();
      
      // Run many analyses
      for (let i = 0; i < 105; i++) {
        await engine.analyzeTemplate(template);
      }
      
      const history = engine.getOptimizationHistory(template.id);
      
      // Should be limited to 100 entries
      expect(history.length).toBe(100);
    });
  });

  describe('Event Emission', () => {
    it('should emit optimization analysis events', async () => {
      const events: string[] = [];
      engine.on('optimization:analyzed', () => events.push('analyzed'));

      const template = createMockTemplate();
      await engine.analyzeTemplate(template);

      expect(events).toContain('analyzed');
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', async () => {
      const template = createMockTemplate();
      await engine.analyzeTemplate(template);
      
      await engine.destroy();
      
      // After destroy, should not throw
      expect(true).toBe(true);
    });
  });
});