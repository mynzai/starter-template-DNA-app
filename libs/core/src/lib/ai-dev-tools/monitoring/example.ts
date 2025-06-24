/**
 * @fileoverview Performance Monitoring System Example
 * Demonstrates comprehensive usage of the AI Dev Tools performance monitoring system
 */

import {
  DevToolsPerformanceMonitor,
  MetricsCollector,
  CostTracker,
  PerformanceAnalyzer,
  AlertManager,
  OptimizationEngine,
  AlertingConfig,
  OperationType
} from './index';

/**
 * Example demonstrating comprehensive performance monitoring setup and usage
 */
export class PerformanceMonitoringExample {
  private monitor: DevToolsPerformanceMonitor;
  private metricsCollector: MetricsCollector;
  private costTracker: CostTracker;
  private analyzer: PerformanceAnalyzer;
  private alertManager: AlertManager;
  private optimizer: OptimizationEngine;

  constructor() {
    // Initialize all monitoring components
    this.metricsCollector = new MetricsCollector();
    this.costTracker = new CostTracker();
    this.analyzer = new PerformanceAnalyzer();
    
    // Configure alerting
    const alertConfig: AlertingConfig = {
      enabled: true,
      channels: [
        {
          type: 'email',
          enabled: true,
          config: { recipients: ['dev-team@company.com'] },
          severityFilter: ['critical', 'error']
        },
        {
          type: 'slack',
          enabled: true,
          config: { webhook: 'https://hooks.slack.com/...', channel: '#alerts' },
          severityFilter: ['critical', 'error', 'warning']
        }
      ],
      rules: [
        {
          name: 'High Latency Alert',
          enabled: true,
          condition: 'latency > 30000',
          threshold: 30000,
          severity: 'critical',
          description: 'Alert when operation latency exceeds 30 seconds'
        },
        {
          name: 'Cost Threshold Alert',
          enabled: true,
          condition: 'cost > 50',
          threshold: 50,
          severity: 'warning',
          description: 'Alert when session cost exceeds $50'
        }
      ],
      escalation: [
        {
          name: 'Critical Issues',
          timeout: 15, // 15 minutes
          levels: [
            {
              name: 'Level 1',
              timeout: 5,
              channels: ['slack'],
              recipients: ['on-call-engineer']
            },
            {
              name: 'Level 2',
              timeout: 10,
              channels: ['email', 'slack'],
              recipients: ['engineering-manager', 'on-call-engineer']
            }
          ]
        }
      ],
      suppressions: [
        {
          enabled: true,
          condition: 'maintenance_window',
          duration: 3600000, // 1 hour
          reason: 'Scheduled maintenance'
        }
      ]
    };

    this.alertManager = new AlertManager(alertConfig);
    this.optimizer = new OptimizationEngine();

    // Initialize main monitor with all components
    this.monitor = new DevToolsPerformanceMonitor(
      this.metricsCollector,
      this.costTracker,
      this.analyzer,
      this.alertManager,
      this.optimizer
    );

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for monitoring events
   */
  private setupEventListeners(): void {
    // Monitor session events
    this.monitor.on('session:started', (data) => {
      console.log(`🚀 Monitoring session started: ${data.sessionId} (${data.operationType})`);
    });

    this.monitor.on('session:ended', (data) => {
      console.log(`✅ Session completed: ${data.sessionId}`);
      console.log(`💰 Total cost: $${data.metrics.costs.totalCost.toFixed(2)}`);
      console.log(`⏱️  Duration: ${data.metrics.duration}ms`);
    });

    // Performance alerts
    this.monitor.on('performance:degradation', (alert) => {
      console.warn(`⚠️  Performance Alert: ${alert.message}`);
    });

    // Cost alerts
    this.monitor.on('cost:threshold:exceeded', (data) => {
      console.warn(`💸 Cost Alert: Threshold ${data.threshold}% exceeded (Current: ${data.current}%)`);
    });

    // Optimization recommendations
    this.monitor.on('optimization:recommendation', (recommendation) => {
      console.log(`💡 Optimization Recommendation: ${recommendation.title}`);
      console.log(`   Impact: ${recommendation.impact.description}`);
      console.log(`   Effort: ${recommendation.effort.level} (${recommendation.effort.estimatedHours}h)`);
    });

    // Alert notifications
    this.alertManager.on('alert:created', (alert) => {
      console.log(`🚨 Alert Created: ${alert.title} (${alert.severity})`);
    });

    this.alertManager.on('notification:sent', (data) => {
      console.log(`📧 Notification sent via ${data.channel} for alert ${data.alertId}`);
    });
  }

  /**
   * Example: Complete AI code generation workflow monitoring
   */
  async demonstrateAICodeGeneration(): Promise<void> {
    console.log('\n=== AI Code Generation Monitoring Demo ===\n');

    // Start monitoring session
    const session = await this.monitor.startSession(
      'demo-code-gen',
      'code_generation',
      {
        environment: 'development',
        userId: 'demo-user',
        projectId: 'demo-project'
      }
    );

    try {
      // Simulate AI code generation workflow
      await this.simulateCodeGenerationWorkflow(session.sessionId);

      // Get real-time metrics
      const currentMetrics = await this.monitor.getCurrentMetrics(session.sessionId);
      console.log('📊 Current Session Metrics:');
      console.log(`   CPU Usage: ${currentMetrics.resourceUsage.cpu.utilization.toFixed(1)}%`);
      console.log(`   Memory: ${currentMetrics.resourceUsage.memory.usedMB}MB`);
      console.log(`   AI Requests: ${currentMetrics.resourceUsage.ai.requestCount}`);
      console.log(`   Cost: $${currentMetrics.costs.totalCost.toFixed(2)}`);

    } finally {
      // End session and get final metrics
      const finalMetrics = await this.monitor.endSession(session.sessionId);
      
      // Display comprehensive results
      await this.displaySessionResults(finalMetrics);
    }
  }

  /**
   * Example: Test generation monitoring
   */
  async demonstrateTestGeneration(): Promise<void> {
    console.log('\n=== Test Generation Monitoring Demo ===\n');

    const session = await this.monitor.startSession(
      'demo-test-gen',
      'test_generation',
      {
        environment: 'development',
        framework: 'jest',
        language: 'typescript'
      }
    );

    try {
      // Simulate test generation
      await this.simulateTestGenerationWorkflow(session.sessionId);

    } finally {
      const finalMetrics = await this.monitor.endSession(session.sessionId);
      await this.displaySessionResults(finalMetrics);
    }
  }

  /**
   * Example: Documentation generation monitoring
   */
  async demonstrateDocumentationGeneration(): Promise<void> {
    console.log('\n=== Documentation Generation Monitoring Demo ===\n');

    const session = await this.monitor.startSession(
      'demo-doc-gen',
      'documentation_generation',
      {
        environment: 'development',
        format: 'markdown',
        scope: 'full-project'
      }
    );

    try {
      await this.simulateDocumentationWorkflow(session.sessionId);

    } finally {
      const finalMetrics = await this.monitor.endSession(session.sessionId);
      await this.displaySessionResults(finalMetrics);
    }
  }

  /**
   * Simulate AI code generation workflow
   */
  private async simulateCodeGenerationWorkflow(sessionId: string): Promise<void> {
    console.log('🤖 Starting AI code generation...');

    // Simulate multiple AI requests
    for (let i = 0; i < 5; i++) {
      await this.simulateAIRequest(sessionId, 'openai', 'gpt-4', 2000, 1500);
      await this.sleep(500); // Small delay between requests
    }

    // Simulate file operations
    await this.simulateFileOperations(sessionId);

    console.log('✅ Code generation completed');
  }

  /**
   * Simulate test generation workflow
   */
  private async simulateTestGenerationWorkflow(sessionId: string): Promise<void> {
    console.log('🧪 Starting test generation...');

    // Simulate analyzing existing code
    await this.simulateFileOperations(sessionId, 'read');

    // Generate tests with AI
    for (let i = 0; i < 3; i++) {
      await this.simulateAIRequest(sessionId, 'anthropic', 'claude-3-sonnet', 1500, 2000);
      await this.sleep(300);
    }

    // Write test files
    await this.simulateFileOperations(sessionId, 'write');

    console.log('✅ Test generation completed');
  }

  /**
   * Simulate documentation generation workflow
   */
  private async simulateDocumentationWorkflow(sessionId: string): Promise<void> {
    console.log('📚 Starting documentation generation...');

    // Read source files
    await this.simulateFileOperations(sessionId, 'read', 10);

    // Generate documentation with AI
    await this.simulateAIRequest(sessionId, 'openai', 'gpt-3.5-turbo', 3000, 4000);

    // Write documentation files
    await this.simulateFileOperations(sessionId, 'write', 5);

    console.log('✅ Documentation generation completed');
  }

  /**
   * Simulate AI request
   */
  private async simulateAIRequest(
    sessionId: string,
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<void> {
    const startTime = Date.now();
    
    // Simulate AI processing time
    await this.sleep(Math.random() * 3000 + 1000); // 1-4 seconds
    
    const duration = Date.now() - startTime;

    // Record AI usage
    await this.costTracker.recordAIUsage(
      sessionId,
      provider,
      model,
      promptTokens,
      completionTokens,
      duration
    );

    // Record network request
    await this.metricsCollector.recordNetworkRequest(sessionId, {
      url: `https://api.${provider}.com/v1/chat/completions`,
      method: 'POST',
      duration,
      success: true,
      statusCode: 200,
      requestSize: promptTokens * 4, // Rough estimate
      responseSize: completionTokens * 4
    });
  }

  /**
   * Simulate file operations
   */
  private async simulateFileOperations(
    sessionId: string,
    operation: 'read' | 'write' = 'write',
    count: number = 3
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      const fileSize = Math.random() * 50000 + 1000; // 1-50KB
      
      await this.metricsCollector.recordStorageOperation(sessionId, {
        type: operation === 'write' ? 'create' : 'read',
        path: `/tmp/generated-file-${i}.${operation === 'write' ? 'ts' : 'txt'}`,
        size: fileSize,
        duration: Math.random() * 100 + 10, // 10-110ms
        success: true
      });

      await this.sleep(50); // Small delay
    }
  }

  /**
   * Display comprehensive session results
   */
  private async displaySessionResults(metrics: any): Promise<void> {
    console.log('\n📊 === SESSION RESULTS ===');
    console.log(`⏱️  Duration: ${(metrics.duration / 1000).toFixed(1)}s`);
    console.log(`💰 Total Cost: $${metrics.costs.totalCost.toFixed(3)}`);
    
    if (metrics.costs.aiProviderCosts?.length > 0) {
      console.log('\n🤖 AI Usage:');
      metrics.costs.aiProviderCosts.forEach((provider: any) => {
        console.log(`   ${provider.provider}/${provider.model}: ${provider.promptTokens + provider.completionTokens} tokens ($${provider.cost.toFixed(3)})`);
      });
    }

    console.log('\n🖥️  Resource Usage:');
    console.log(`   CPU: ${metrics.resourceUsage.cpu.utilization.toFixed(1)}%`);
    console.log(`   Memory Peak: ${metrics.resourceUsage.memory.peakUsageMB}MB`);
    console.log(`   Network: ${metrics.resourceUsage.network.requestCount} requests`);
    console.log(`   Storage: ${metrics.resourceUsage.storage.filesCreated} files created`);

    // Get performance analysis
    try {
      const analysis = await this.analyzer.analyzeSession(metrics.sessionId);
      console.log('\n📈 Performance Analysis:');
      console.log(`   Overall Score: ${analysis.overall.score}/100 (${analysis.overall.grade})`);
      
      if (analysis.overall.recommendations.length > 0) {
        console.log('   Recommendations:');
        analysis.overall.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
    } catch (error) {
      console.log('   Performance analysis not available');
    }

    // Get optimization recommendations
    try {
      const recommendations = await this.optimizer.getRecommendations();
      if (recommendations.length > 0) {
        console.log('\n💡 Optimization Recommendations:');
        recommendations.slice(0, 3).forEach(rec => {
          console.log(`   • ${rec.title} (${rec.priority})`);
          console.log(`     ${rec.description}`);
        });
      }
    } catch (error) {
      console.log('   Optimization recommendations not available');
    }

    console.log('\n=========================\n');
  }

  /**
   * Utility function to simulate delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize and run all monitoring components
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Performance Monitoring System...\n');

    try {
      await this.monitor.initialize();
      console.log('✅ Performance monitoring system initialized successfully\n');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring system:', error);
      throw error;
    }
  }

  /**
   * Shutdown monitoring system
   */
  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down monitoring system...');
    await this.monitor.shutdown();
    console.log('✅ Monitoring system shut down successfully');
  }

  /**
   * Run all demonstration workflows
   */
  async runAllDemos(): Promise<void> {
    await this.initialize();

    try {
      await this.demonstrateAICodeGeneration();
      await this.demonstrateTestGeneration();
      await this.demonstrateDocumentationGeneration();
    } finally {
      await this.shutdown();
    }
  }
}

/**
 * Example usage scenarios
 */
export class PerformanceMonitoringUsageExamples {
  
  /**
   * Basic monitoring setup for a simple operation
   */
  static async basicUsageExample(): Promise<void> {
    const monitor = new DevToolsPerformanceMonitor(
      new MetricsCollector(),
      new CostTracker(),
      new PerformanceAnalyzer(),
      new AlertManager({
        enabled: true,
        channels: [],
        rules: [],
        escalation: [],
        suppressions: []
      }),
      new OptimizationEngine()
    );

    await monitor.initialize();

    // Start session
    const session = await monitor.startSession('basic-example', 'code_generation');

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));

    // End session and get metrics
    const metrics = await monitor.endSession(session.sessionId);
    
    console.log('Basic monitoring completed:', {
      duration: metrics.duration,
      cost: metrics.costs.totalCost
    });

    await monitor.shutdown();
  }

  /**
   * Cost tracking focused example
   */
  static async costTrackingExample(): Promise<void> {
    const costTracker = new CostTracker();
    await costTracker.initialize();

    // Create budget
    const budgetId = await costTracker.createBudget({
      name: 'Monthly Development Budget',
      amount: 100,
      spent: 0,
      percentage: 0,
      status: 'under',
      alertThresholds: [50, 75, 90],
      scope: {
        services: ['ai'],
        projects: ['demo-project'],
        environments: ['development'],
        timeframe: 'monthly'
      }
    });

    // Start cost tracking session
    await costTracker.startSession('cost-demo');

    // Record AI usage
    await costTracker.recordAIUsage(
      'cost-demo',
      'openai',
      'gpt-4',
      1000, // prompt tokens
      500,  // completion tokens
      2000  // duration ms
    );

    // Get current cost tracking data
    const costData = await costTracker.getCostTracking();
    console.log('Cost tracking data:', {
      totalCost: costData.totalCost,
      budgets: costData.budgets.length,
      alerts: costData.alerts.length
    });

    await costTracker.endSession('cost-demo');
    await costTracker.shutdown();
  }

  /**
   * Performance analysis example
   */
  static async performanceAnalysisExample(): Promise<void> {
    const analyzer = new PerformanceAnalyzer();
    await analyzer.initialize();

    // Record some performance data
    const sessionId = 'perf-analysis-demo';
    
    // Simulate recording performance data points
    for (let i = 0; i < 10; i++) {
      await analyzer.recordPerformanceData(sessionId, {
        timestamp: Date.now() - (10 - i) * 1000,
        operationType: 'code_generation',
        duration: Math.random() * 5000 + 1000,
        success: Math.random() > 0.1, // 90% success rate
        resourceUsage: {
          cpu: Math.random() * 80 + 10,
          memory: Math.random() * 1000 + 500,
          network: Math.random() * 100
        }
      });
    }

    // Analyze session performance
    const metrics = await analyzer.analyzeSession(sessionId);
    console.log('Performance analysis:', {
      score: metrics.overall.score,
      grade: metrics.overall.grade,
      bottlenecks: metrics.bottlenecks.length,
      trends: metrics.trends.length
    });

    await analyzer.shutdown();
  }
}

// Export example runner
export async function runPerformanceMonitoringExamples(): Promise<void> {
  console.log('🚀 Running Performance Monitoring Examples\n');

  const example = new PerformanceMonitoringExample();
  
  try {
    await example.runAllDemos();
    
    console.log('\n--- Additional Examples ---\n');
    
    await PerformanceMonitoringUsageExamples.basicUsageExample();
    await PerformanceMonitoringUsageExamples.costTrackingExample();
    await PerformanceMonitoringUsageExamples.performanceAnalysisExample();
    
    console.log('\n✅ All performance monitoring examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    throw error;
  }
}

// Auto-run if this file is executed directly
if (require.main === module) {
  runPerformanceMonitoringExamples().catch(console.error);
}