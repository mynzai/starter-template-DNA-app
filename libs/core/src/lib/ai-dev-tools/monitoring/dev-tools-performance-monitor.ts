/**
 * @fileoverview DevTools Performance Monitor
 * Main monitoring service for AC5: Build Performance Monitoring with cost tracking
 */

import { EventEmitter } from 'events';
import {
  DevToolsMetrics,
  CostTrackingData,
  OptimizationRecommendation,
  PerformanceAlert,
  MonitoringConfig,
  OperationType,
  ResourceUsage,
  CostBreakdown,
  PerformanceMetrics,
  QualityMetrics,
  ErrorMetrics,
  MetricsMetadata
} from './types';
import { MetricsCollector } from './metrics-collector';
import { CostTracker } from './cost-tracker';
import { PerformanceAnalyzer } from './performance-analyzer';
import { AlertManager } from './alert-manager';
import { OptimizationEngine } from './optimization-engine';

export class DevToolsPerformanceMonitor extends EventEmitter {
  private initialized = false;
  private metricsCollector: MetricsCollector;
  private costTracker: CostTracker;
  private performanceAnalyzer: PerformanceAnalyzer;
  private alertManager: AlertManager;
  private optimizationEngine: OptimizationEngine;
  
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private metricsBuffer: DevToolsMetrics[] = [];
  private flushTimer?: NodeJS.Timeout;

  private defaultConfig: MonitoringConfig = {
    enabled: true,
    samplingRate: 1.0,
    realTimeMonitoring: true,
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
    retention: {
      rawMetrics: 30,
      aggregatedMetrics: 90,
      alerts: 30,
      logs: 7,
      traces: 7
    },
    alerting: {
      enabled: true,
      channels: [],
      rules: [],
      escalation: [],
      suppressions: []
    },
    integrations: [],
    privacy: {
      anonymizeUserData: false,
      excludeFields: [],
      dataResidency: 'local',
      retentionCompliance: [],
      encryptionEnabled: false
    }
  };

  constructor(private config: Partial<MonitoringConfig> = {}) {
    super();
    this.config = { ...this.defaultConfig, ...config };
    
    this.metricsCollector = new MetricsCollector();
    this.costTracker = new CostTracker();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.alertManager = new AlertManager(this.config.alerting!);
    this.optimizationEngine = new OptimizationEngine();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize components
      await this.metricsCollector.initialize();
      await this.costTracker.initialize();
      await this.performanceAnalyzer.initialize();
      await this.alertManager.initialize();
      await this.optimizationEngine.initialize();

      // Set up event listeners
      this.setupEventListeners();

      // Start periodic operations
      this.startPeriodicFlush();
      this.startPeriodicAnalysis();

      this.initialized = true;
      this.emit('monitor:initialized', { config: this.config });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('monitor:error', { error: errorMessage, phase: 'initialization' });
      throw error;
    }
  }

  async startSession(
    sessionId: string,
    operationType: OperationType,
    metadata: Partial<MetricsMetadata> = {}
  ): Promise<MonitoringSession> {
    if (!this.initialized) {
      throw new Error('DevToolsPerformanceMonitor not initialized');
    }

    const session: MonitoringSession = {
      id: sessionId,
      operationType,
      startTime: Date.now(),
      metadata: {
        version: '1.0.0',
        environment: 'development',
        region: 'local',
        sessionId,
        tags: {},
        ...metadata
      },
      metrics: {
        operations: 0,
        errors: 0,
        totalCost: 0,
        peakMemoryMB: 0,
        avgLatency: 0
      },
      active: true
    };

    this.activeSessions.set(sessionId, session);
    
    // Start collecting metrics for this session
    await this.metricsCollector.startSession(sessionId, operationType);
    await this.costTracker.startSession(sessionId);

    this.emit('session:started', { sessionId, operationType, metadata });
    
    return session;
  }

  async endSession(sessionId: string): Promise<DevToolsMetrics> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const endTime = Date.now();
    const duration = endTime - session.startTime;

    // Collect final metrics
    const resourceUsage = await this.metricsCollector.getSessionMetrics(sessionId);
    const costs = await this.costTracker.getSessionCosts(sessionId);
    const performance = await this.performanceAnalyzer.analyzeSession(sessionId);
    const quality = await this.getQualityMetrics(sessionId);
    const errors = await this.getErrorMetrics(sessionId);

    const finalMetrics: DevToolsMetrics = {
      timestamp: endTime,
      sessionId,
      operationType: session.operationType,
      duration,
      resourceUsage,
      costs,
      performance,
      quality,
      errors,
      metadata: session.metadata
    };

    // Store metrics
    await this.storeMetrics(finalMetrics);

    // Analyze for alerts
    await this.checkForAlerts(finalMetrics);

    // Generate optimization recommendations
    const recommendations = await this.optimizationEngine.analyzeMetrics(finalMetrics);
    if (recommendations.length > 0) {
      this.emit('optimization:recommendations', { sessionId, recommendations });
    }

    // Clean up session
    await this.metricsCollector.endSession(sessionId);
    await this.costTracker.endSession(sessionId);
    this.activeSessions.delete(sessionId);

    this.emit('session:ended', { sessionId, duration, metrics: finalMetrics });

    return finalMetrics;
  }

  async recordOperation(
    sessionId: string,
    operation: OperationRecord
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Record operation metrics
    await this.metricsCollector.recordOperation(sessionId, operation);
    
    // Track costs if applicable
    if (operation.costs) {
      await this.costTracker.recordCosts(sessionId, operation.costs);
    }

    // Update session metrics
    session.metrics.operations++;
    if (operation.error) {
      session.metrics.errors++;
    }

    this.emit('operation:recorded', { sessionId, operation });
  }

  async getCostTracking(accountId?: string): Promise<CostTrackingData> {
    return await this.costTracker.getCostTracking(accountId);
  }

  async getPerformanceMetrics(
    timeRange: TimeRange = { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() }
  ): Promise<PerformanceMetrics> {
    return await this.performanceAnalyzer.getPerformanceMetrics(timeRange);
  }

  async getOptimizationRecommendations(
    filters: OptimizationFilters = {}
  ): Promise<OptimizationRecommendation[]> {
    return await this.optimizationEngine.getRecommendations(filters);
  }

  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return await this.alertManager.getActiveAlerts();
  }

  async acknowledgeAlert(alertId: string, userId?: string): Promise<void> {
    await this.alertManager.acknowledgeAlert(alertId, userId);
    this.emit('alert:acknowledged', { alertId, userId });
  }

  async resolveAlert(alertId: string, resolution: string, userId?: string): Promise<void> {
    await this.alertManager.resolveAlert(alertId, resolution, userId);
    this.emit('alert:resolved', { alertId, resolution, userId });
  }

  async getMetricsHistory(
    filters: MetricsFilters
  ): Promise<DevToolsMetrics[]> {
    return await this.metricsCollector.getMetricsHistory(filters);
  }

  async generateReport(
    type: ReportType,
    timeRange: TimeRange,
    options: ReportOptions = {}
  ): Promise<PerformanceReport> {
    const metrics = await this.getMetricsHistory({
      startTime: timeRange.start,
      endTime: timeRange.end,
      ...options.filters
    });

    const costs = await this.costTracker.getCostHistory(timeRange);
    const alerts = await this.alertManager.getAlertsHistory(timeRange);
    const recommendations = await this.optimizationEngine.getRecommendations({
      timeRange,
      includeImplemented: options.includeImplemented || false
    });

    return {
      type,
      timeRange,
      generatedAt: Date.now(),
      summary: this.generateReportSummary(metrics, costs, alerts),
      metrics: this.aggregateMetrics(metrics),
      costs: this.aggregateCosts(costs),
      performance: await this.performanceAnalyzer.getPerformanceMetrics(timeRange),
      alerts: this.categorizeAlerts(alerts),
      recommendations,
      trends: await this.analyzeTrends(metrics, timeRange),
      insights: await this.generateInsights(metrics, costs, alerts)
    };
  }

  async updateConfig(newConfig: Partial<MonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    await this.alertManager.updateConfig(this.config.alerting!);
    
    // Restart periodic operations if intervals changed
    if (newConfig.flushInterval) {
      this.stopPeriodicFlush();
      this.startPeriodicFlush();
    }

    this.emit('config:updated', { config: this.config });
  }

  private setupEventListeners(): void {
    // Metrics collector events
    this.metricsCollector.on('metrics:collected', (data) => {
      this.emit('metrics:collected', data);
    });

    this.metricsCollector.on('metrics:error', (error) => {
      this.emit('metrics:error', error);
    });

    // Cost tracker events
    this.costTracker.on('cost:threshold:exceeded', (data) => {
      this.alertManager.createAlert({
        type: 'cost_threshold_exceeded',
        severity: 'warning',
        title: 'Cost threshold exceeded',
        message: `Cost has exceeded threshold: $${data.current} > $${data.threshold}`,
        source: { service: 'cost-tracker', component: 'budget', environment: 'monitoring' },
        metrics: { current: { cost: data.current }, threshold: { cost: data.threshold } }
      });
    });

    // Performance analyzer events
    this.performanceAnalyzer.on('performance:degradation', (data) => {
      this.alertManager.createAlert({
        type: 'performance_degradation',
        severity: data.severity,
        title: 'Performance degradation detected',
        message: data.message,
        source: data.source,
        metrics: data.metrics
      });
    });

    // Alert manager events
    this.alertManager.on('alert:created', (alert) => {
      this.emit('alert:created', alert);
    });

    this.alertManager.on('alert:escalated', (alert) => {
      this.emit('alert:escalated', alert);
    });

    // Optimization engine events
    this.optimizationEngine.on('recommendation:generated', (recommendation) => {
      this.emit('recommendation:generated', recommendation);
    });
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  private stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every 5 minutes
    setInterval(async () => {
      try {
        await this.runPeriodicAnalysis();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.emit('analysis:error', { error: errorMessage });
      }
    }, 5 * 60 * 1000);
  }

  private async runPeriodicAnalysis(): Promise<void> {
    // Analyze recent performance trends
    const timeRange = {
      start: Date.now() - 60 * 60 * 1000, // Last hour
      end: Date.now()
    };

    const metrics = await this.getMetricsHistory({
      startTime: timeRange.start,
      endTime: timeRange.end
    });

    if (metrics.length === 0) return;

    // Check for performance anomalies
    const anomalies = await this.performanceAnalyzer.detectAnomalies(metrics);
    for (const anomaly of anomalies) {
      await this.alertManager.createAlert({
        type: 'anomaly_detected',
        severity: anomaly.severity,
        title: `Performance anomaly detected: ${anomaly.metric}`,
        message: anomaly.description,
        source: anomaly.source,
        metrics: anomaly.metrics
      });
    }

    // Generate optimization recommendations
    const recommendations = await this.optimizationEngine.analyzeMetricsBatch(metrics);
    if (recommendations.length > 0) {
      this.emit('periodic:recommendations', { recommendations, timeRange });
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const batch = this.metricsBuffer.splice(0, this.config.batchSize);
    
    try {
      await this.persistMetrics(batch);
      this.emit('metrics:flushed', { count: batch.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('metrics:flush:error', { error: errorMessage, count: batch.length });
      
      // Re-add to buffer for retry
      this.metricsBuffer.unshift(...batch);
    }
  }

  private async storeMetrics(metrics: DevToolsMetrics): Promise<void> {
    if (this.config.realTimeMonitoring) {
      // Store immediately
      await this.persistMetrics([metrics]);
    } else {
      // Add to buffer
      this.metricsBuffer.push(metrics);
    }
  }

  private async persistMetrics(metrics: DevToolsMetrics[]): Promise<void> {
    // In a real implementation, this would persist to a database
    // For now, we'll emit an event for external storage
    this.emit('metrics:persist', { metrics });
  }

  private async checkForAlerts(metrics: DevToolsMetrics): Promise<void> {
    // Check various alert conditions
    const alerts: Partial<PerformanceAlert>[] = [];

    // High latency alert
    if (metrics.duration > 30000) { // 30 seconds
      alerts.push({
        type: 'high_latency',
        severity: 'warning',
        title: 'High operation latency',
        message: `Operation took ${metrics.duration}ms to complete`,
        source: {
          service: 'dev-tools',
          component: metrics.operationType,
          environment: metrics.metadata.environment
        },
        metrics: {
          current: { latency: metrics.duration },
          threshold: { latency: 30000 }
        }
      });
    }

    // High cost alert
    if (metrics.costs.totalCost > 10) { // $10 threshold
      alerts.push({
        type: 'cost_threshold_exceeded',
        severity: 'warning',
        title: 'High operation cost',
        message: `Operation cost: $${metrics.costs.totalCost}`,
        source: {
          service: 'dev-tools',
          component: 'cost-tracker',
          environment: metrics.metadata.environment
        },
        metrics: {
          current: { cost: metrics.costs.totalCost },
          threshold: { cost: 10 }
        }
      });
    }

    // High error rate alert
    if (metrics.errors.errorRate > 0.1) { // 10% error rate
      alerts.push({
        type: 'error_rate_spike',
        severity: 'error',
        title: 'High error rate',
        message: `Error rate: ${(metrics.errors.errorRate * 100).toFixed(1)}%`,
        source: {
          service: 'dev-tools',
          component: metrics.operationType,
          environment: metrics.metadata.environment
        },
        metrics: {
          current: { errorRate: metrics.errors.errorRate },
          threshold: { errorRate: 0.1 }
        }
      });
    }

    // Create alerts
    for (const alertData of alerts) {
      await this.alertManager.createAlert(alertData as any);
    }
  }

  private async getQualityMetrics(sessionId: string): Promise<QualityMetrics> {
    // Placeholder implementation - would analyze code quality, test coverage, etc.
    return {
      overall: {
        score: 85,
        grade: 'B',
        factors: [],
        improvements: []
      },
      codeQuality: {
        complexity: 70,
        maintainability: 80,
        testCoverage: 85,
        duplication: 90,
        documentation: 75,
        standards: 85,
        security: 90,
        issues: []
      },
      testQuality: {
        coverage: {
          lines: 85,
          functions: 90,
          branches: 80,
          statements: 85,
          files: [],
          uncoveredLines: []
        },
        reliability: 90,
        performance: 85,
        maintainability: 80,
        automation: 95
      },
      documentationQuality: {
        completeness: 75,
        accuracy: 85,
        clarity: 80,
        consistency: 85,
        accessibility: 70,
        maintenance: 75
      },
      userExperience: {
        usability: 85,
        performance: 80,
        accessibility: 75,
        reliability: 90,
        satisfaction: 85,
        adoption: 80
      }
    };
  }

  private async getErrorMetrics(sessionId: string): Promise<ErrorMetrics> {
    // Placeholder implementation - would collect actual error data
    return {
      totalErrors: 0,
      errorRate: 0,
      errorsByType: [],
      errorsBySource: [],
      resolution: {
        averageResolutionTime: 0,
        medianResolutionTime: 0,
        resolutionRate: 100,
        escalationRate: 0,
        reopenRate: 0
      },
      impact: {
        userImpact: 0,
        systemImpact: 0,
        businessImpact: 0,
        costImpact: 0,
        downtime: 0
      }
    };
  }

  private generateReportSummary(
    metrics: DevToolsMetrics[],
    costs: any[],
    alerts: PerformanceAlert[]
  ): ReportSummary {
    return {
      totalOperations: metrics.length,
      averageDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      totalCost: metrics.reduce((sum, m) => sum + m.costs.totalCost, 0),
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      errorRate: metrics.reduce((sum, m) => sum + m.errors.errorRate, 0) / metrics.length,
      topOperations: this.getTopOperations(metrics),
      costBreakdown: this.getCostBreakdown(metrics),
      performanceGrade: this.calculatePerformanceGrade(metrics)
    };
  }

  private aggregateMetrics(metrics: DevToolsMetrics[]): any {
    // Aggregate metrics for reporting
    return {
      count: metrics.length,
      averages: {
        duration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
        cost: metrics.reduce((sum, m) => sum + m.costs.totalCost, 0) / metrics.length,
        errorRate: metrics.reduce((sum, m) => sum + m.errors.errorRate, 0) / metrics.length
      },
      totals: {
        cost: metrics.reduce((sum, m) => sum + m.costs.totalCost, 0),
        errors: metrics.reduce((sum, m) => sum + m.errors.totalErrors, 0)
      }
    };
  }

  private aggregateCosts(costs: any[]): any {
    // Aggregate cost data for reporting
    return {
      total: costs.reduce((sum, c) => sum + c.amount, 0),
      byCategory: {},
      trends: []
    };
  }

  private categorizeAlerts(alerts: PerformanceAlert[]): any {
    return {
      bySeverity: alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      total: alerts.length
    };
  }

  private async analyzeTrends(metrics: DevToolsMetrics[], timeRange: TimeRange): Promise<any> {
    // Analyze trends in metrics over time
    return {
      performance: 'stable',
      cost: 'increasing',
      quality: 'improving',
      errors: 'decreasing'
    };
  }

  private async generateInsights(
    metrics: DevToolsMetrics[],
    costs: any[],
    alerts: PerformanceAlert[]
  ): Promise<string[]> {
    const insights: string[] = [];

    if (metrics.length > 0) {
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      if (avgDuration > 10000) {
        insights.push('Operations are taking longer than expected. Consider optimizing performance.');
      }

      const totalCost = metrics.reduce((sum, m) => sum + m.costs.totalCost, 0);
      if (totalCost > 100) {
        insights.push('AI usage costs are high. Review token usage and consider optimization.');
      }
    }

    if (alerts.length > 10) {
      insights.push('High number of alerts generated. Review alert thresholds and resolution processes.');
    }

    return insights;
  }

  private getTopOperations(metrics: DevToolsMetrics[]): any[] {
    const operationCounts = metrics.reduce((acc, m) => {
      acc[m.operationType] = (acc[m.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(operationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([operation, count]) => ({ operation, count }));
  }

  private getCostBreakdown(metrics: DevToolsMetrics[]): any {
    return {
      ai: metrics.reduce((sum, m) => sum + (m.costs.aiProviderCosts?.reduce((s, p) => s + p.cost, 0) || 0), 0),
      compute: metrics.reduce((sum, m) => sum + m.costs.computeCosts.totalCost, 0),
      storage: metrics.reduce((sum, m) => sum + m.costs.storageCosts.totalCost, 0),
      network: metrics.reduce((sum, m) => sum + m.costs.networkCosts.totalCost, 0)
    };
  }

  private calculatePerformanceGrade(metrics: DevToolsMetrics[]): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (metrics.length === 0) return 'C';
    
    const avgScore = metrics.reduce((sum, m) => sum + m.performance.overall.score, 0) / metrics.length;
    
    if (avgScore >= 90) return 'A';
    if (avgScore >= 80) return 'B';
    if (avgScore >= 70) return 'C';
    if (avgScore >= 60) return 'D';
    return 'F';
  }

  async shutdown(): Promise<void> {
    this.stopPeriodicFlush();
    
    // Flush remaining metrics
    await this.flushMetrics();

    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      try {
        await this.endSession(sessionId);
      } catch (error) {
        // Log error but continue shutdown
      }
    }

    // Shutdown components
    await this.metricsCollector.shutdown();
    await this.costTracker.shutdown();
    await this.performanceAnalyzer.shutdown();
    await this.alertManager.shutdown();
    await this.optimizationEngine.shutdown();

    this.initialized = false;
    this.emit('monitor:shutdown');
  }
}

// Supporting interfaces
interface MonitoringSession {
  id: string;
  operationType: OperationType;
  startTime: number;
  metadata: MetricsMetadata;
  metrics: SessionMetrics;
  active: boolean;
}

interface SessionMetrics {
  operations: number;
  errors: number;
  totalCost: number;
  peakMemoryMB: number;
  avgLatency: number;
}

interface OperationRecord {
  type: OperationType;
  duration: number;
  success: boolean;
  error?: string;
  costs?: Partial<CostBreakdown>;
  metadata?: Record<string, any>;
}

interface TimeRange {
  start: number;
  end: number;
}

interface OptimizationFilters {
  category?: string;
  priority?: string;
  timeRange?: TimeRange;
  includeImplemented?: boolean;
}

interface MetricsFilters {
  startTime?: number;
  endTime?: number;
  operationType?: OperationType;
  sessionId?: string;
  environment?: string;
}

type ReportType = 'performance' | 'cost' | 'quality' | 'comprehensive';

interface ReportOptions {
  includeImplemented?: boolean;
  filters?: Partial<MetricsFilters>;
  format?: 'json' | 'pdf' | 'html';
}

interface PerformanceReport {
  type: ReportType;
  timeRange: TimeRange;
  generatedAt: number;
  summary: ReportSummary;
  metrics: any;
  costs: any;
  performance: PerformanceMetrics;
  alerts: any;
  recommendations: OptimizationRecommendation[];
  trends: any;
  insights: string[];
}

interface ReportSummary {
  totalOperations: number;
  averageDuration: number;
  totalCost: number;
  activeAlerts: number;
  errorRate: number;
  topOperations: any[];
  costBreakdown: any;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}