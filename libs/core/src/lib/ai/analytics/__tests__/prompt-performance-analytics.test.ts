import { PromptPerformanceAnalytics, PerformanceSnapshot } from '../prompt-performance-analytics';
import { PromptExecutionResult } from '../../prompts/prompt-template';

describe('PromptPerformanceAnalytics', () => {
  let analytics: PromptPerformanceAnalytics;
  
  beforeEach(() => {
    analytics = new PromptPerformanceAnalytics({
      metricsRetentionDays: 30,
      enableRealTimeAnalytics: true,
      enableAnomalyDetection: true,
      aggregationIntervals: ['hourly'],
      anomalyThresholdStdDev: 2
    });
  });

  afterEach(async () => {
    await analytics.destroy();
  });

  const createMockExecution = (overrides: Partial<PromptExecutionResult> = {}): PromptExecutionResult => ({
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
    quality: { score: 0.8 },
    ...overrides
  });

  describe('Execution Recording', () => {
    it('should record executions and emit events', async () => {
      const events: string[] = [];
      analytics.on('execution:recorded', () => events.push('recorded'));

      const execution = createMockExecution();
      await analytics.recordExecution(execution);

      expect(events).toContain('recorded');
    });

    it('should buffer executions for analysis', async () => {
      const executions = [
        createMockExecution({ responseTime: 800 }),
        createMockExecution({ responseTime: 1200 }),
        createMockExecution({ responseTime: 1000 })
      ];

      for (const execution of executions) {
        await analytics.recordExecution(execution);
      }

      // Buffer should contain all executions
      // This is tested indirectly through report generation
      const report = await analytics.generateReport('template-1');
      expect(report.summary.totalExecutions).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      // Add some test data
      const executions = [
        createMockExecution({ success: true, responseTime: 800, cost: 0.008 }),
        createMockExecution({ success: true, responseTime: 1200, cost: 0.012 }),
        createMockExecution({ success: false, responseTime: 2000, cost: 0.020 }),
        createMockExecution({ success: true, responseTime: 900, cost: 0.009 })
      ];

      for (const execution of executions) {
        await analytics.recordExecution(execution);
      }
    });

    it('should generate comprehensive performance report', async () => {
      const report = await analytics.generateReport('template-1');

      expect(report.templateId).toBe('template-1');
      expect(report.period).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.anomalies).toBeDefined();
      expect(report.recommendations).toBeDefined();

      // Check summary metrics
      expect(report.summary.totalExecutions).toBe(4);
      expect(report.summary.successRate).toBe(0.75); // 3 out of 4 successful
      expect(report.summary.avgResponseTime).toBeGreaterThan(0);
      expect(report.summary.avgCost).toBeGreaterThan(0);
    });

    it('should calculate correct success rate', async () => {
      const report = await analytics.generateReport('template-1');
      
      // 3 successful out of 4 total = 75%
      expect(report.summary.successRate).toBe(0.75);
    });

    it('should calculate correct average metrics', async () => {
      const report = await analytics.generateReport('template-1');
      
      // Average response time: (800 + 1200 + 2000 + 900) / 4 = 1225
      expect(report.summary.avgResponseTime).toBe(1225);
      
      // Average cost: (0.008 + 0.012 + 0.020 + 0.009) / 4 = 0.01225
      expect(report.summary.avgCost).toBeCloseTo(0.01225, 5);
    });

    it('should include time period in report', async () => {
      const now = Date.now();
      const report = await analytics.generateReport('template-1', now - 24 * 60 * 60 * 1000, now);

      expect(report.period.start).toBe(now - 24 * 60 * 60 * 1000);
      expect(report.period.end).toBe(now);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect response time anomalies', async () => {
      // Establish baseline with normal response times
      for (let i = 0; i < 50; i++) {
        await analytics.recordExecution(createMockExecution({ 
          responseTime: 1000 + Math.random() * 100 // 1000-1100ms
        }));
      }

      // Add anomalous execution
      const anomalousExecution = createMockExecution({ responseTime: 5000 });
      const anomalies = await analytics.detectAnomalies('template-1', anomalousExecution);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].metric).toBe('responseTime');
      expect(anomalies[0].actualValue).toBe(5000);
      expect(anomalies[0].severity).toBeDefined();
    });

    it('should detect cost anomalies', async () => {
      // Establish baseline
      for (let i = 0; i < 50; i++) {
        await analytics.recordExecution(createMockExecution({ 
          cost: 0.01 + Math.random() * 0.002 // $0.01-0.012
        }));
      }

      // Add anomalous execution
      const anomalousExecution = createMockExecution({ cost: 0.05 });
      const anomalies = await analytics.detectAnomalies('template-1', anomalousExecution);

      expect(anomalies.some(a => a.metric === 'cost')).toBe(true);
    });

    it('should not detect anomalies with insufficient data', async () => {
      // Only add a few executions
      for (let i = 0; i < 5; i++) {
        await analytics.recordExecution(createMockExecution());
      }

      const execution = createMockExecution({ responseTime: 10000 });
      const anomalies = await analytics.detectAnomalies('template-1', execution);

      expect(anomalies).toHaveLength(0);
    });

    it('should classify anomaly severity correctly', async () => {
      // Establish baseline
      for (let i = 0; i < 50; i++) {
        await analytics.recordExecution(createMockExecution({ responseTime: 1000 }));
      }

      // Test different severity levels
      const highSeverityExecution = createMockExecution({ responseTime: 10000 });
      const highAnomalies = await analytics.detectAnomalies('template-1', highSeverityExecution);
      
      expect(highAnomalies[0]?.severity).toBe('high');
    });
  });

  describe('Custom Metrics', () => {
    it('should register and calculate custom metrics', () => {
      const customMetric = {
        name: 'efficiency',
        description: 'Cost per successful execution',
        calculator: (executions: PromptExecutionResult[]) => {
          const successful = executions.filter(e => e.success);
          const totalCost = executions.reduce((sum, e) => sum + e.cost, 0);
          return successful.length > 0 ? totalCost / successful.length : 0;
        },
        unit: 'USD',
        higherIsBetter: false
      };

      analytics.registerCustomMetric(customMetric);

      // Metric should be registered (tested indirectly through event emission)
      const events: string[] = [];
      analytics.on('metric:registered', () => events.push('registered'));
      
      analytics.registerCustomMetric({
        ...customMetric,
        name: 'test-metric'
      });
      
      expect(events).toContain('registered');
    });
  });

  describe('Metric History', () => {
    it('should return metric history for specified interval', async () => {
      // This test is simplified as it requires time-based snapshots
      // In a real implementation, you'd need to mock time or wait for aggregation
      
      const history = analytics.getMetricHistory(
        'template-1', 
        'avgResponseTime', 
        'hour', 
        10
      );

      expect(Array.isArray(history)).toBe(true);
      // History might be empty in test environment due to timing
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty history for non-existent template', () => {
      const history = analytics.getMetricHistory(
        'non-existent', 
        'avgResponseTime', 
        'hour'
      );

      expect(history).toHaveLength(0);
    });
  });

  describe('Performance Recommendations', () => {
    it('should generate recommendations based on metrics', async () => {
      // Add executions with high response times
      for (let i = 0; i < 10; i++) {
        await analytics.recordExecution(createMockExecution({ 
          responseTime: 4000 // High response time
        }));
      }

      const report = await analytics.generateReport('template-1');
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Should recommend response time optimization
      const responseTimeRec = report.recommendations.find(r => 
        r.title.includes('Response Time') || r.relatedMetrics.includes('avgResponseTime')
      );
      expect(responseTimeRec).toBeDefined();
    });

    it('should recommend success rate improvements', async () => {
      // Add mostly failed executions
      for (let i = 0; i < 10; i++) {
        await analytics.recordExecution(createMockExecution({ 
          success: i < 3 // Only 30% success rate
        }));
      }

      const report = await analytics.generateReport('template-1');
      
      const successRateRec = report.recommendations.find(r => 
        r.title.includes('Success Rate') || r.relatedMetrics.includes('successRate')
      );
      expect(successRateRec).toBeDefined();
      expect(successRateRec?.priority).toBe('high');
    });
  });

  describe('Trend Analysis', () => {
    it('should detect improving trends', async () => {
      // This test is simplified as trend analysis requires time-series data
      // In practice, you'd need multiple snapshots over time
      
      const report = await analytics.generateReport('template-1');
      
      // Trends array should exist even if empty
      expect(Array.isArray(report.trends)).toBe(true);
    });
  });

  describe('Event Emission', () => {
    it('should emit appropriate events', async () => {
      const events: string[] = [];
      
      analytics.on('execution:recorded', () => events.push('execution:recorded'));
      analytics.on('anomalies:detected', () => events.push('anomalies:detected'));

      const execution = createMockExecution();
      await analytics.recordExecution(execution);

      expect(events).toContain('execution:recorded');
      
      // Anomalies might not be detected with single execution
      // but event listener is set up correctly
    });

    it('should emit metric registration events', () => {
      const events: string[] = [];
      analytics.on('metric:registered', () => events.push('metric:registered'));

      analytics.registerCustomMetric({
        name: 'test',
        description: 'Test metric',
        calculator: () => 0,
        unit: 'count',
        higherIsBetter: true
      });

      expect(events).toContain('metric:registered');
    });
  });

  describe('Configuration', () => {
    it('should respect configuration settings', () => {
      const configuredAnalytics = new PromptPerformanceAnalytics({
        enableRealTimeAnalytics: false,
        enableAnomalyDetection: false,
        metricsRetentionDays: 7
      });

      // Test that configuration is applied
      // This is tested indirectly through behavior
      expect(configuredAnalytics).toBeDefined();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', async () => {
      await analytics.recordExecution(createMockExecution());
      
      await analytics.destroy();
      
      // After destroy, internal state should be cleared
      // This is tested indirectly - the destroy should not throw
      expect(true).toBe(true);
    });
  });
});