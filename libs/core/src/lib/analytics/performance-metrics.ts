import { EventEmitter } from 'events';
import { TemplateDefinition } from '../types/template.types';
import { DNAModule } from '../types/dna-module.types';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
  context?: Record<string, any>;
}

export interface TemplatePerformanceData {
  templateId: string;
  framework: string;
  version: string;
  metrics: {
    generationTime: number;
    setupTime: number;
    buildTime: number;
    bundleSize: number;
    memoryUsage: number;
    fileCount: number;
    dependencyCount: number;
    testCoverage: number;
    hotReloadTime: number;
    errorRate: number;
  };
  successIndicators: {
    setupSuccess: boolean;
    buildSuccess: boolean;
    testSuccess: boolean;
    deploymentReady: boolean;
    qualityGatesPassed: number;
    performanceScore: number;
  };
  timestamp: Date;
  sessionId: string;
}

export interface PerformanceThresholds {
  generationTime: { warning: number; critical: number };
  setupTime: { warning: number; critical: number };
  buildTime: { warning: number; critical: number };
  bundleSize: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
  testCoverage: { warning: number; critical: number };
  hotReloadTime: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  performanceScore: { warning: number; critical: number };
}

export interface PerformanceTrend {
  metric: string;
  timespan: 'hour' | 'day' | 'week' | 'month';
  trend: 'improving' | 'stable' | 'degrading';
  change: number;
  data: Array<{ timestamp: Date; value: number }>;
}

export interface SuccessIndicatorConfig {
  setupTimeLimit: number;
  buildTimeLimit: number;
  minTestCoverage: number;
  maxErrorRate: number;
  minPerformanceScore: number;
  requiredQualityGates: string[];
}

export class PerformanceMetrics extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private templatePerformance: Map<string, TemplatePerformanceData[]> = new Map();
  private thresholds: PerformanceThresholds;
  private successConfig: SuccessIndicatorConfig;
  private startTimes: Map<string, Date> = new Map();

  constructor(
    thresholds?: Partial<PerformanceThresholds>,
    successConfig?: Partial<SuccessIndicatorConfig>
  ) {
    super();

    this.thresholds = {
      generationTime: { warning: 300000, critical: 600000 }, // 5/10 minutes
      setupTime: { warning: 60000, critical: 120000 }, // 1/2 minutes
      buildTime: { warning: 180000, critical: 300000 }, // 3/5 minutes
      bundleSize: { warning: 5242880, critical: 10485760 }, // 5/10 MB
      memoryUsage: { warning: 209715200, critical: 419430400 }, // 200/400 MB
      testCoverage: { warning: 70, critical: 50 }, // 70%/50%
      hotReloadTime: { warning: 3000, critical: 5000 }, // 3/5 seconds
      errorRate: { warning: 0.05, critical: 0.1 }, // 5%/10%
      performanceScore: { warning: 70, critical: 50 }, // 70/50 points
      ...thresholds
    };

    this.successConfig = {
      setupTimeLimit: 600000, // 10 minutes
      buildTimeLimit: 300000, // 5 minutes
      minTestCoverage: 80, // 80%
      maxErrorRate: 0.02, // 2%
      minPerformanceScore: 80, // 80 points
      requiredQualityGates: ['security', 'performance', 'testing', 'compatibility'],
      ...successConfig
    };
  }

  /**
   * Start tracking a performance session
   */
  startTracking(sessionId: string): void {
    this.startTimes.set(sessionId, new Date());
    
    this.emit('tracking:started', {
      sessionId,
      timestamp: new Date()
    });
  }

  /**
   * Record template generation performance
   */
  recordTemplatePerformance(data: Partial<TemplatePerformanceData>): void {
    const performanceData: TemplatePerformanceData = {
      templateId: data.templateId || 'unknown',
      framework: data.framework || 'unknown',
      version: data.version || '1.0.0',
      metrics: {
        generationTime: 0,
        setupTime: 0,
        buildTime: 0,
        bundleSize: 0,
        memoryUsage: 0,
        fileCount: 0,
        dependencyCount: 0,
        testCoverage: 0,
        hotReloadTime: 0,
        errorRate: 0,
        ...data.metrics
      },
      successIndicators: {
        setupSuccess: false,
        buildSuccess: false,
        testSuccess: false,
        deploymentReady: false,
        qualityGatesPassed: 0,
        performanceScore: 0,
        ...data.successIndicators
      },
      timestamp: data.timestamp || new Date(),
      sessionId: data.sessionId || 'default'
    };

    // Calculate success indicators
    performanceData.successIndicators = this.calculateSuccessIndicators(performanceData);

    // Store performance data
    const existing = this.templatePerformance.get(performanceData.templateId) || [];
    existing.push(performanceData);
    this.templatePerformance.set(performanceData.templateId, existing);

    // Create individual metrics
    this.createMetricsFromPerformanceData(performanceData);

    this.emit('performance:recorded', performanceData);
  }

  /**
   * Record individual metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    context?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      value,
      unit,
      timestamp: new Date(),
      status: this.determineMetricStatus(name, value),
      context
    };

    this.metrics.push(metric);
    this.emit('metric:recorded', metric);
  }

  /**
   * Start timing a specific operation
   */
  startTimer(operationId: string): void {
    this.startTimes.set(operationId, new Date());
  }

  /**
   * End timing and record metric
   */
  endTimer(operationId: string, metricName: string, context?: Record<string, any>): number {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) {
      throw new Error(`No start time found for operation: ${operationId}`);
    }

    const duration = Date.now() - startTime.getTime();
    this.startTimes.delete(operationId);

    this.recordMetric(metricName, duration, 'ms', context);
    return duration;
  }

  /**
   * Get performance summary for a template
   */
  getTemplatePerformanceSummary(templateId: string): {
    latest: TemplatePerformanceData | null;
    average: Partial<TemplatePerformanceData['metrics']>;
    trend: 'improving' | 'stable' | 'degrading';
    successRate: number;
    totalSessions: number;
  } {
    const data = this.templatePerformance.get(templateId) || [];
    
    if (data.length === 0) {
      return {
        latest: null,
        average: {},
        trend: 'stable',
        successRate: 0,
        totalSessions: 0
      };
    }

    const latest = data[data.length - 1];
    const average = this.calculateAverageMetrics(data);
    const trend = this.calculateTrend(data, 'performanceScore');
    const successRate = this.calculateSuccessRate(data);

    return {
      latest,
      average,
      trend,
      successRate,
      totalSessions: data.length
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(
    timespan: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const metricNames = [
      'generationTime',
      'setupTime',
      'buildTime',
      'performanceScore',
      'testCoverage'
    ];

    for (const metricName of metricNames) {
      const trend = this.calculateMetricTrend(metricName, timespan);
      if (trend) {
        trends.push(trend);
      }
    }

    return trends;
  }

  /**
   * Get framework performance comparison
   */
  getFrameworkPerformanceComparison(): Record<string, {
    averageGenerationTime: number;
    averageSetupTime: number;
    averagePerformanceScore: number;
    successRate: number;
    sampleSize: number;
  }> {
    const frameworkData: Record<string, TemplatePerformanceData[]> = {};

    // Group by framework
    for (const [templateId, data] of this.templatePerformance) {
      for (const performance of data) {
        if (!frameworkData[performance.framework]) {
          frameworkData[performance.framework] = [];
        }
        frameworkData[performance.framework].push(performance);
      }
    }

    // Calculate averages
    const comparison: Record<string, any> = {};
    for (const [framework, data] of Object.entries(frameworkData)) {
      comparison[framework] = {
        averageGenerationTime: this.average(data.map(d => d.metrics.generationTime)),
        averageSetupTime: this.average(data.map(d => d.metrics.setupTime)),
        averagePerformanceScore: this.average(data.map(d => d.successIndicators.performanceScore)),
        successRate: this.calculateSuccessRate(data),
        sampleSize: data.length
      };
    }

    return comparison;
  }

  /**
   * Get current performance status
   */
  getCurrentPerformanceStatus(): {
    overall: 'good' | 'warning' | 'critical';
    criticalMetrics: PerformanceMetric[];
    warningMetrics: PerformanceMetric[];
    recommendations: string[];
  } {
    const recent = this.getRecentMetrics(24); // Last 24 hours
    const critical = recent.filter(m => m.status === 'critical');
    const warning = recent.filter(m => m.status === 'warning');

    let overall: 'good' | 'warning' | 'critical' = 'good';
    if (critical.length > 0) {
      overall = 'critical';
    } else if (warning.length > 0) {
      overall = 'warning';
    }

    const recommendations = this.generateRecommendations(critical, warning);

    return {
      overall,
      criticalMetrics: critical,
      warningMetrics: warning,
      recommendations
    };
  }

  /**
   * Export performance data
   */
  exportPerformanceData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      metrics: this.metrics,
      templatePerformance: Object.fromEntries(this.templatePerformance),
      thresholds: this.thresholds,
      summary: this.getPerformanceSummary(),
      exportTimestamp: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  /**
   * Calculate success indicators
   */
  private calculateSuccessIndicators(data: TemplatePerformanceData): TemplatePerformanceData['successIndicators'] {
    const indicators = { ...data.successIndicators };

    // Setup success
    indicators.setupSuccess = data.metrics.setupTime <= this.successConfig.setupTimeLimit;

    // Build success
    indicators.buildSuccess = data.metrics.buildTime <= this.successConfig.buildTimeLimit;

    // Test success
    indicators.testSuccess = data.metrics.testCoverage >= this.successConfig.minTestCoverage;

    // Deployment ready
    indicators.deploymentReady = 
      indicators.setupSuccess && 
      indicators.buildSuccess && 
      indicators.testSuccess &&
      data.metrics.errorRate <= this.successConfig.maxErrorRate;

    // Performance score calculation
    indicators.performanceScore = this.calculatePerformanceScore(data.metrics);

    return indicators;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: TemplatePerformanceData['metrics']): number {
    const scores = {
      generationTime: this.scoreMetric(metrics.generationTime, this.thresholds.generationTime, true),
      setupTime: this.scoreMetric(metrics.setupTime, this.thresholds.setupTime, true),
      buildTime: this.scoreMetric(metrics.buildTime, this.thresholds.buildTime, true),
      testCoverage: this.scoreMetric(metrics.testCoverage, this.thresholds.testCoverage, false),
      errorRate: this.scoreMetric(metrics.errorRate, this.thresholds.errorRate, true)
    };

    // Weighted average
    const weights = {
      generationTime: 0.2,
      setupTime: 0.2,
      buildTime: 0.2,
      testCoverage: 0.3,
      errorRate: 0.1
    };

    let totalScore = 0;
    for (const [metric, score] of Object.entries(scores)) {
      totalScore += score * weights[metric as keyof typeof weights];
    }

    return Math.round(totalScore);
  }

  /**
   * Score a metric based on thresholds
   */
  private scoreMetric(
    value: number, 
    threshold: { warning: number; critical: number }, 
    lowerIsBetter: boolean
  ): number {
    if (lowerIsBetter) {
      if (value <= threshold.warning) return 100;
      if (value <= threshold.critical) return 70;
      return 30;
    } else {
      if (value >= threshold.warning) return 100;
      if (value >= threshold.critical) return 70;
      return 30;
    }
  }

  /**
   * Create metrics from performance data
   */
  private createMetricsFromPerformanceData(data: TemplatePerformanceData): void {
    const context = {
      templateId: data.templateId,
      framework: data.framework,
      sessionId: data.sessionId
    };

    this.recordMetric('generation_time', data.metrics.generationTime, 'ms', context);
    this.recordMetric('setup_time', data.metrics.setupTime, 'ms', context);
    this.recordMetric('build_time', data.metrics.buildTime, 'ms', context);
    this.recordMetric('bundle_size', data.metrics.bundleSize, 'bytes', context);
    this.recordMetric('memory_usage', data.metrics.memoryUsage, 'bytes', context);
    this.recordMetric('test_coverage', data.metrics.testCoverage, '%', context);
    this.recordMetric('error_rate', data.metrics.errorRate, '%', context);
    this.recordMetric('performance_score', data.successIndicators.performanceScore, 'points', context);
  }

  /**
   * Determine metric status based on thresholds
   */
  private determineMetricStatus(name: string, value: number): 'good' | 'warning' | 'critical' {
    const metricMap: Record<string, keyof PerformanceThresholds> = {
      'generation_time': 'generationTime',
      'setup_time': 'setupTime',
      'build_time': 'buildTime',
      'bundle_size': 'bundleSize',
      'memory_usage': 'memoryUsage',
      'test_coverage': 'testCoverage',
      'hot_reload_time': 'hotReloadTime',
      'error_rate': 'errorRate',
      'performance_score': 'performanceScore'
    };

    const thresholdKey = metricMap[name];
    if (!thresholdKey) return 'good';

    const threshold = this.thresholds[thresholdKey];
    const lowerIsBetter = !['test_coverage', 'performance_score'].includes(name);

    if (lowerIsBetter) {
      if (value >= threshold.critical) return 'critical';
      if (value >= threshold.warning) return 'warning';
      return 'good';
    } else {
      if (value <= threshold.critical) return 'critical';
      if (value <= threshold.warning) return 'warning';
      return 'good';
    }
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(data: TemplatePerformanceData[]): Partial<TemplatePerformanceData['metrics']> {
    if (data.length === 0) return {};

    const sums = data.reduce((acc, d) => {
      Object.entries(d.metrics).forEach(([key, value]) => {
        acc[key] = (acc[key] || 0) + value;
      });
      return acc;
    }, {} as Record<string, number>);

    const averages: Record<string, number> = {};
    Object.entries(sums).forEach(([key, sum]) => {
      averages[key] = sum / data.length;
    });

    return averages;
  }

  /**
   * Calculate trend for a metric
   */
  private calculateTrend(data: TemplatePerformanceData[], metric: keyof TemplatePerformanceData['successIndicators']): 'improving' | 'stable' | 'degrading' {
    if (data.length < 2) return 'stable';

    const recent = data.slice(-5); // Last 5 sessions
    const values = recent.map(d => d.successIndicators[metric] as number);
    
    const trend = this.linearTrend(values);
    
    if (trend > 0.1) return 'improving';
    if (trend < -0.1) return 'degrading';
    return 'stable';
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(data: TemplatePerformanceData[]): number {
    if (data.length === 0) return 0;

    const successful = data.filter(d => 
      d.successIndicators.setupSuccess && 
      d.successIndicators.buildSuccess && 
      d.successIndicators.testSuccess
    );

    return successful.length / data.length;
  }

  /**
   * Calculate metric trend over time
   */
  private calculateMetricTrend(metricName: string, timespan: 'hour' | 'day' | 'week' | 'month'): PerformanceTrend | null {
    const relevantMetrics = this.metrics.filter(m => m.name === metricName);
    if (relevantMetrics.length < 2) return null;

    const now = new Date();
    let cutoff: Date;

    switch (timespan) {
      case 'hour':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const timeFrameMetrics = relevantMetrics.filter(m => m.timestamp >= cutoff);
    if (timeFrameMetrics.length < 2) return null;

    const values = timeFrameMetrics.map(m => m.value);
    const trend = this.linearTrend(values);
    const change = values[values.length - 1] - values[0];

    let trendDirection: 'improving' | 'stable' | 'degrading' = 'stable';
    if (Math.abs(trend) > 0.1) {
      trendDirection = trend > 0 ? 'improving' : 'degrading';
    }

    return {
      metric: metricName,
      timespan,
      trend: trendDirection,
      change,
      data: timeFrameMetrics.map(m => ({ timestamp: m.timestamp, value: m.value }))
    };
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(hours: number): PerformanceMetric[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(critical: PerformanceMetric[], warning: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];

    const criticalTypes = [...new Set(critical.map(m => m.name))];
    const warningTypes = [...new Set(warning.map(m => m.name))];

    // Critical recommendations
    if (criticalTypes.includes('generation_time')) {
      recommendations.push('Optimize template generation pipeline - consider parallel processing');
    }
    if (criticalTypes.includes('build_time')) {
      recommendations.push('Review build configuration - enable incremental builds and caching');
    }
    if (criticalTypes.includes('memory_usage')) {
      recommendations.push('Reduce memory usage - optimize data structures and cleanup resources');
    }
    if (criticalTypes.includes('error_rate')) {
      recommendations.push('Investigate and fix recurring errors - improve error handling');
    }

    // Warning recommendations
    if (warningTypes.includes('test_coverage')) {
      recommendations.push('Increase test coverage - add unit and integration tests');
    }
    if (warningTypes.includes('bundle_size')) {
      recommendations.push('Optimize bundle size - remove unused dependencies and enable tree shaking');
    }

    return recommendations;
  }

  /**
   * Calculate linear trend
   */
  private linearTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get performance summary
   */
  private getPerformanceSummary() {
    return {
      totalMetrics: this.metrics.length,
      totalTemplates: this.templatePerformance.size,
      frameworkComparison: this.getFrameworkPerformanceComparison(),
      recentTrends: this.getPerformanceTrends(),
      currentStatus: this.getCurrentPerformanceStatus()
    };
  }

  /**
   * Convert to CSV
   */
  private convertToCSV(data: any): string {
    const lines = ['Metric,Value,Unit,Status,Timestamp'];
    
    for (const metric of this.metrics) {
      lines.push(`${metric.name},${metric.value},${metric.unit},${metric.status},${metric.timestamp.toISOString()}`);
    }
    
    return lines.join('\n');
  }
}