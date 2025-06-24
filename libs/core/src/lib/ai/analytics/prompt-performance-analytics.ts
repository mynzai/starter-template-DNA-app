import { EventEmitter } from 'events';
import { PromptExecutionResult, PromptPerformanceMetrics } from '../prompts/prompt-template';

export interface PerformanceAnalyticsConfig {
  metricsRetentionDays: number;
  aggregationIntervals: ('hourly' | 'daily' | 'weekly' | 'monthly')[];
  enableRealTimeAnalytics: boolean;
  enableAnomalyDetection: boolean;
  anomalyThresholdStdDev: number;
  enableTrendAnalysis: boolean;
  customMetrics?: CustomMetricDefinition[];
}

export interface CustomMetricDefinition {
  name: string;
  description: string;
  calculator: (executions: PromptExecutionResult[]) => number;
  unit: string;
  higherIsBetter: boolean;
}

export interface PerformanceSnapshot {
  timestamp: number;
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month';
  templateId: string;
  metrics: {
    executionCount: number;
    successRate: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    avgTokenUsage: number;
    totalCost: number;
    avgCost: number;
    errorRate: number;
    avgQualityScore?: number;
    customMetrics?: Record<string, number>;
  };
  providers: {
    [provider: string]: {
      executionCount: number;
      avgResponseTime: number;
      errorRate: number;
      avgCost: number;
    };
  };
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'declining' | 'stable';
  changePercent: number;
  confidence: number;
  forecast?: {
    nextPeriodValue: number;
    confidenceInterval: [number, number];
  };
}

export interface PerformanceAnomaly {
  timestamp: number;
  templateId: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviationStdDev: number;
  severity: 'low' | 'medium' | 'high';
  possibleCauses?: string[];
}

export interface PerformanceReport {
  templateId: string;
  period: {
    start: number;
    end: number;
  };
  summary: PromptPerformanceMetrics;
  trends: PerformanceTrend[];
  anomalies: PerformanceAnomaly[];
  recommendations: PerformanceRecommendation[];
  comparisons?: {
    previousPeriod?: PerformanceComparison;
    baseline?: PerformanceComparison;
    similarTemplates?: PerformanceComparison[];
  };
}

export interface PerformanceComparison {
  label: string;
  metrics: {
    [metricName: string]: {
      current: number;
      comparison: number;
      changePercent: number;
      isImprovement: boolean;
    };
  };
}

export interface PerformanceRecommendation {
  type: 'optimization' | 'warning' | 'insight';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  suggestedAction?: string;
  relatedMetrics: string[];
}

export class PromptPerformanceAnalytics extends EventEmitter {
  private config: PerformanceAnalyticsConfig;
  private snapshots = new Map<string, PerformanceSnapshot[]>(); // templateId -> snapshots
  private executionBuffer = new Map<string, PromptExecutionResult[]>(); // templateId -> recent executions
  private anomalyHistory = new Map<string, PerformanceAnomaly[]>(); // templateId -> anomalies
  private customMetrics: Map<string, CustomMetricDefinition>;
  private aggregationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<PerformanceAnalyticsConfig> = {}) {
    super();

    this.config = {
      metricsRetentionDays: 90,
      aggregationIntervals: ['hourly', 'daily'],
      enableRealTimeAnalytics: true,
      enableAnomalyDetection: true,
      anomalyThresholdStdDev: 3,
      enableTrendAnalysis: true,
      ...config
    };

    this.customMetrics = new Map(
      (config.customMetrics || []).map(m => [m.name, m])
    );

    this.startAggregationSchedule();
  }

  public async recordExecution(execution: PromptExecutionResult): Promise<void> {
    const templateId = execution.context.templateId;

    // Add to execution buffer
    let buffer = this.executionBuffer.get(templateId);
    if (!buffer) {
      buffer = [];
      this.executionBuffer.set(templateId, buffer);
    }
    buffer.push(execution);

    // Keep buffer size reasonable (last 1000 executions)
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }

    // Real-time analytics
    if (this.config.enableRealTimeAnalytics) {
      await this.performRealTimeAnalysis(templateId, execution);
    }

    this.emit('execution:recorded', {
      templateId,
      execution,
      timestamp: Date.now()
    });
  }

  public async generateReport(
    templateId: string,
    startTime?: number,
    endTime?: number
  ): Promise<PerformanceReport> {
    const now = Date.now();
    const start = startTime || now - 7 * 24 * 60 * 60 * 1000; // Default: last 7 days
    const end = endTime || now;

    // Get relevant snapshots
    const snapshots = this.getSnapshotsInRange(templateId, start, end);
    
    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(snapshots);
    
    // Analyze trends
    const trends = this.config.enableTrendAnalysis 
      ? this.analyzeTrends(snapshots)
      : [];
    
    // Get anomalies
    const anomalies = this.anomalyHistory.get(templateId)?.filter(
      a => a.timestamp >= start && a.timestamp <= end
    ) || [];
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      summary,
      trends,
      anomalies
    );

    // Generate comparisons
    const comparisons = await this.generateComparisons(
      templateId,
      snapshots,
      start,
      end
    );

    return {
      templateId,
      period: { start, end },
      summary,
      trends,
      anomalies,
      recommendations,
      comparisons
    };
  }

  public getMetricHistory(
    templateId: string,
    metricName: string,
    interval: 'hour' | 'day' | 'week' | 'month',
    periods: number = 30
  ): Array<{ timestamp: number; value: number }> {
    const snapshots = this.snapshots.get(templateId) || [];
    
    // Filter by interval and sort by timestamp
    const relevantSnapshots = snapshots
      .filter(s => s.interval === interval)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, periods);

    return relevantSnapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      value: this.getMetricValue(snapshot, metricName)
    })).reverse();
  }

  public async detectAnomalies(
    templateId: string,
    execution: PromptExecutionResult
  ): Promise<PerformanceAnomaly[]> {
    if (!this.config.enableAnomalyDetection) {
      return [];
    }

    const anomalies: PerformanceAnomaly[] = [];
    const recentExecutions = this.executionBuffer.get(templateId) || [];
    
    if (recentExecutions.length < 30) {
      return anomalies; // Need enough data for statistics
    }

    // Check each metric for anomalies
    const metrics = [
      { name: 'responseTime', value: execution.responseTime },
      { name: 'tokenUsage', value: execution.tokenUsage.total },
      { name: 'cost', value: execution.cost }
    ];

    if (execution.quality?.score !== undefined) {
      metrics.push({ name: 'qualityScore', value: execution.quality.score });
    }

    for (const metric of metrics) {
      const historicalValues = recentExecutions
        .slice(-100) // Use last 100 executions
        .map(e => this.getExecutionMetricValue(e, metric.name));

      const stats = this.calculateStatistics(historicalValues);
      const deviation = Math.abs(metric.value - stats.mean) / stats.stdDev;

      if (deviation > this.config.anomalyThresholdStdDev) {
        const anomaly: PerformanceAnomaly = {
          timestamp: execution.context.executedAt,
          templateId,
          metric: metric.name,
          expectedValue: stats.mean,
          actualValue: metric.value,
          deviationStdDev: deviation,
          severity: deviation > 5 ? 'high' : deviation > 4 ? 'medium' : 'low',
          possibleCauses: this.identifyPossibleCauses(metric.name, deviation, execution)
        };

        anomalies.push(anomaly);
        this.storeAnomaly(templateId, anomaly);
      }
    }

    return anomalies;
  }

  public registerCustomMetric(metric: CustomMetricDefinition): void {
    this.customMetrics.set(metric.name, metric);
    
    this.emit('metric:registered', {
      metricName: metric.name,
      timestamp: Date.now()
    });
  }

  private async performRealTimeAnalysis(
    templateId: string,
    execution: PromptExecutionResult
  ): Promise<void> {
    // Detect anomalies
    const anomalies = await this.detectAnomalies(templateId, execution);
    
    if (anomalies.length > 0) {
      this.emit('anomalies:detected', {
        templateId,
        anomalies,
        execution,
        timestamp: Date.now()
      });
    }

    // Update minute-level snapshot
    await this.updateMinuteSnapshot(templateId, execution);
  }

  private async updateMinuteSnapshot(
    templateId: string,
    execution: PromptExecutionResult
  ): Promise<void> {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60000) * 60000;

    let snapshots = this.snapshots.get(templateId);
    if (!snapshots) {
      snapshots = [];
      this.snapshots.set(templateId, snapshots);
    }

    let currentSnapshot = snapshots.find(
      s => s.timestamp === minuteStart && s.interval === 'minute'
    );

    if (!currentSnapshot) {
      currentSnapshot = this.createEmptySnapshot(templateId, minuteStart, 'minute');
      snapshots.push(currentSnapshot);
    }

    // Update snapshot with execution data
    this.updateSnapshotWithExecution(currentSnapshot, execution);

    // Prune old snapshots
    this.pruneOldSnapshots(templateId);
  }

  private createEmptySnapshot(
    templateId: string,
    timestamp: number,
    interval: PerformanceSnapshot['interval']
  ): PerformanceSnapshot {
    return {
      timestamp,
      interval,
      templateId,
      metrics: {
        executionCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        avgTokenUsage: 0,
        totalCost: 0,
        avgCost: 0,
        errorRate: 0,
        avgQualityScore: undefined,
        customMetrics: {}
      },
      providers: {}
    };
  }

  private updateSnapshotWithExecution(
    snapshot: PerformanceSnapshot,
    execution: PromptExecutionResult
  ): void {
    // This is a simplified update - in production, you'd want to maintain
    // running statistics for accurate percentiles
    const m = snapshot.metrics;
    const count = m.executionCount;
    
    m.executionCount++;
    m.successRate = (m.successRate * count + (execution.success ? 1 : 0)) / m.executionCount;
    m.avgResponseTime = (m.avgResponseTime * count + execution.responseTime) / m.executionCount;
    m.avgTokenUsage = (m.avgTokenUsage * count + execution.tokenUsage.total) / m.executionCount;
    m.totalCost += execution.cost;
    m.avgCost = m.totalCost / m.executionCount;
    m.errorRate = 1 - m.successRate;

    if (execution.quality?.score !== undefined) {
      m.avgQualityScore = m.avgQualityScore
        ? (m.avgQualityScore * count + execution.quality.score) / m.executionCount
        : execution.quality.score;
    }

    // Update provider-specific metrics
    const provider = execution.provider;
    if (!snapshot.providers[provider]) {
      snapshot.providers[provider] = {
        executionCount: 0,
        avgResponseTime: 0,
        errorRate: 0,
        avgCost: 0
      };
    }

    const p = snapshot.providers[provider];
    const pCount = p.executionCount;
    p.executionCount++;
    p.avgResponseTime = (p.avgResponseTime * pCount + execution.responseTime) / p.executionCount;
    p.errorRate = (p.errorRate * pCount + (execution.success ? 0 : 1)) / p.executionCount;
    p.avgCost = (p.avgCost * pCount + execution.cost) / p.executionCount;

    // Update custom metrics
    for (const [name, definition] of this.customMetrics) {
      const buffer = this.executionBuffer.get(snapshot.templateId) || [];
      const recentExecutions = buffer.slice(-100); // Use recent executions
      
      if (recentExecutions.length > 0) {
        m.customMetrics![name] = definition.calculator(recentExecutions);
      }
    }
  }

  private calculateSummaryMetrics(snapshots: PerformanceSnapshot[]): PromptPerformanceMetrics {
    if (snapshots.length === 0) {
      return {
        avgResponseTime: 0,
        totalExecutions: 0,
        successRate: 0,
        avgTokenUsage: 0,
        avgCost: 0,
        lastExecuted: 0
      };
    }

    const totalExecs = snapshots.reduce((sum, s) => sum + s.metrics.executionCount, 0);
    const weightedSum = (metric: keyof PerformanceSnapshot['metrics']) =>
      snapshots.reduce((sum, s) => 
        sum + (s.metrics[metric] as number) * s.metrics.executionCount, 0
      ) / totalExecs;

    return {
      avgResponseTime: weightedSum('avgResponseTime'),
      totalExecutions: totalExecs,
      successRate: weightedSum('successRate'),
      avgTokenUsage: weightedSum('avgTokenUsage'),
      avgCost: weightedSum('avgCost'),
      lastExecuted: Math.max(...snapshots.map(s => s.timestamp)),
      qualityScore: snapshots.some(s => s.metrics.avgQualityScore !== undefined)
        ? weightedSum('avgQualityScore')
        : undefined
    };
  }

  private analyzeTrends(snapshots: PerformanceSnapshot[]): PerformanceTrend[] {
    if (snapshots.length < 3) {
      return []; // Need at least 3 data points for trend analysis
    }

    const trends: PerformanceTrend[] = [];
    const metrics = ['successRate', 'avgResponseTime', 'avgCost', 'avgQualityScore'];

    for (const metric of metrics) {
      const values = snapshots
        .filter(s => s.metrics[metric as keyof typeof s.metrics] !== undefined)
        .map(s => ({
          x: s.timestamp,
          y: s.metrics[metric as keyof typeof s.metrics] as number
        }));

      if (values.length < 3) continue;

      const trend = this.calculateTrend(values);
      trends.push({
        metric,
        direction: trend.slope > 0.01 ? 'improving' : trend.slope < -0.01 ? 'declining' : 'stable',
        changePercent: trend.changePercent,
        confidence: trend.r2,
        forecast: trend.forecast
      });
    }

    return trends;
  }

  private calculateTrend(
    values: Array<{ x: number; y: number }>
  ): {
    slope: number;
    changePercent: number;
    r2: number;
    forecast?: { nextPeriodValue: number; confidenceInterval: [number, number] };
  } {
    const n = values.length;
    
    // Calculate linear regression
    const sumX = values.reduce((sum, v) => sum + v.x, 0);
    const sumY = values.reduce((sum, v) => sum + v.y, 0);
    const sumXY = values.reduce((sum, v) => sum + v.x * v.y, 0);
    const sumX2 = values.reduce((sum, v) => sum + v.x * v.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = values.reduce((sum, v) => sum + Math.pow(v.y - meanY, 2), 0);
    const ssResidual = values.reduce((sum, v) => {
      const predicted = slope * v.x + intercept;
      return sum + Math.pow(v.y - predicted, 2);
    }, 0);
    
    const r2 = 1 - (ssResidual / ssTotal);
    
    // Calculate change percentage
    const firstValue = values[0].y;
    const lastValue = values[values.length - 1].y;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;
    
    // Forecast next period if confidence is high
    let forecast;
    if (r2 > 0.7) {
      const lastX = values[values.length - 1].x;
      const periodLength = values.length > 1 ? values[1].x - values[0].x : 0;
      const nextX = lastX + periodLength;
      const nextY = slope * nextX + intercept;
      
      // Simple confidence interval based on standard error
      const se = Math.sqrt(ssResidual / (n - 2));
      const margin = 1.96 * se; // 95% confidence
      
      forecast = {
        nextPeriodValue: nextY,
        confidenceInterval: [nextY - margin, nextY + margin] as [number, number]
      };
    }
    
    return { slope, changePercent, r2, forecast };
  }

  private generateRecommendations(
    summary: PromptPerformanceMetrics,
    trends: PerformanceTrend[],
    anomalies: PerformanceAnomaly[]
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Response time recommendations
    if (summary.avgResponseTime > 3000) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        title: 'High Response Time Detected',
        description: `Average response time is ${Math.round(summary.avgResponseTime)}ms, which may impact user experience.`,
        impact: 'Reducing response time by 50% could improve user satisfaction and reduce abandonment.',
        suggestedAction: 'Consider using a faster model, optimizing prompts, or implementing caching.',
        relatedMetrics: ['avgResponseTime', 'successRate']
      });
    }

    // Cost optimization
    const costTrend = trends.find(t => t.metric === 'avgCost');
    if (costTrend && costTrend.direction === 'declining' && costTrend.changePercent > 20) {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        title: 'Rising Costs Detected',
        description: `Average cost per execution has increased by ${Math.round(costTrend.changePercent)}%.`,
        impact: 'Continued cost increases could impact budget and ROI.',
        suggestedAction: 'Review token usage patterns and consider prompt optimization.',
        relatedMetrics: ['avgCost', 'avgTokenUsage']
      });
    }

    // Success rate issues
    if (summary.successRate < 0.95) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Low Success Rate',
        description: `Success rate is ${Math.round(summary.successRate * 100)}%, indicating reliability issues.`,
        impact: 'Low success rates lead to poor user experience and increased support costs.',
        suggestedAction: 'Analyze error patterns and implement better error handling.',
        relatedMetrics: ['successRate', 'errorRate']
      });
    }

    // Anomaly patterns
    const recentAnomalies = anomalies.filter(
      a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    if (recentAnomalies.length > 5) {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        title: 'Frequent Anomalies Detected',
        description: `${recentAnomalies.length} anomalies detected in the last 24 hours.`,
        impact: 'Frequent anomalies indicate instability that could affect reliability.',
        suggestedAction: 'Review anomaly patterns and implement stability improvements.',
        relatedMetrics: Array.from(new Set(recentAnomalies.map(a => a.metric)))
      });
    }

    // Quality score insights
    if (summary.qualityScore !== undefined && summary.qualityScore < 0.7) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Quality Improvement Opportunity',
        description: `Average quality score is ${Math.round(summary.qualityScore * 100)}%.`,
        impact: 'Higher quality scores correlate with better user satisfaction.',
        suggestedAction: 'Review low-scoring executions and refine prompts.',
        relatedMetrics: ['qualityScore']
      });
    }

    return recommendations;
  }

  private async generateComparisons(
    templateId: string,
    currentSnapshots: PerformanceSnapshot[],
    startTime: number,
    endTime: number
  ): Promise<PerformanceReport['comparisons']> {
    const comparisons: PerformanceReport['comparisons'] = {};

    // Previous period comparison
    const periodLength = endTime - startTime;
    const prevStart = startTime - periodLength;
    const prevEnd = startTime;
    
    const prevSnapshots = this.getSnapshotsInRange(templateId, prevStart, prevEnd);
    if (prevSnapshots.length > 0) {
      comparisons.previousPeriod = this.compareMetrics(
        'Previous Period',
        this.calculateSummaryMetrics(currentSnapshots),
        this.calculateSummaryMetrics(prevSnapshots)
      );
    }

    return comparisons;
  }

  private compareMetrics(
    label: string,
    current: PromptPerformanceMetrics,
    comparison: PromptPerformanceMetrics
  ): PerformanceComparison {
    const metrics: PerformanceComparison['metrics'] = {};

    const addMetric = (
      name: string, 
      currentVal: number, 
      compVal: number, 
      lowerIsBetter: boolean = false
    ) => {
      const changePercent = compVal !== 0 
        ? ((currentVal - compVal) / compVal) * 100 
        : 0;
      
      metrics[name] = {
        current: currentVal,
        comparison: compVal,
        changePercent,
        isImprovement: lowerIsBetter ? changePercent < 0 : changePercent > 0
      };
    };

    addMetric('successRate', current.successRate, comparison.successRate);
    addMetric('avgResponseTime', current.avgResponseTime, comparison.avgResponseTime, true);
    addMetric('avgCost', current.avgCost, comparison.avgCost, true);
    addMetric('avgTokenUsage', current.avgTokenUsage, comparison.avgTokenUsage, true);
    
    if (current.qualityScore !== undefined && comparison.qualityScore !== undefined) {
      addMetric('qualityScore', current.qualityScore, comparison.qualityScore);
    }

    return { label, metrics };
  }

  private getSnapshotsInRange(
    templateId: string,
    startTime: number,
    endTime: number
  ): PerformanceSnapshot[] {
    const snapshots = this.snapshots.get(templateId) || [];
    return snapshots.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  private getMetricValue(snapshot: PerformanceSnapshot, metricName: string): number {
    if (metricName in snapshot.metrics) {
      return snapshot.metrics[metricName as keyof typeof snapshot.metrics] as number || 0;
    }
    
    if (snapshot.metrics.customMetrics && metricName in snapshot.metrics.customMetrics) {
      return snapshot.metrics.customMetrics[metricName];
    }
    
    return 0;
  }

  private getExecutionMetricValue(execution: PromptExecutionResult, metricName: string): number {
    switch (metricName) {
      case 'responseTime':
        return execution.responseTime;
      case 'tokenUsage':
        return execution.tokenUsage.total;
      case 'cost':
        return execution.cost;
      case 'qualityScore':
        return execution.quality?.score || 0;
      default:
        return 0;
    }
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0 };
    
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  }

  private identifyPossibleCauses(
    metric: string,
    deviation: number,
    execution: PromptExecutionResult
  ): string[] {
    const causes: string[] = [];

    switch (metric) {
      case 'responseTime':
        if (deviation > 0) {
          causes.push('Provider API slowdown');
          causes.push('Increased prompt complexity');
          causes.push('Network latency');
        }
        break;
      
      case 'tokenUsage':
        if (deviation > 0) {
          causes.push('Longer input prompts');
          causes.push('More verbose responses');
          causes.push('Changed model behavior');
        }
        break;
      
      case 'cost':
        if (deviation > 0) {
          causes.push('Increased token usage');
          causes.push('Using more expensive model');
          causes.push('Provider pricing changes');
        }
        break;
      
      case 'qualityScore':
        if (deviation < 0) {
          causes.push('Prompt degradation');
          causes.push('Model performance issues');
          causes.push('Changed evaluation criteria');
        }
        break;
    }

    return causes;
  }

  private storeAnomaly(templateId: string, anomaly: PerformanceAnomaly): void {
    let anomalies = this.anomalyHistory.get(templateId);
    if (!anomalies) {
      anomalies = [];
      this.anomalyHistory.set(templateId, anomalies);
    }
    
    anomalies.push(anomaly);
    
    // Keep only recent anomalies (last 30 days)
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.anomalyHistory.set(
      templateId,
      anomalies.filter(a => a.timestamp > cutoff)
    );
  }

  private pruneOldSnapshots(templateId: string): void {
    const snapshots = this.snapshots.get(templateId);
    if (!snapshots) return;

    const cutoff = Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const prunedSnapshots = snapshots.filter(s => s.timestamp > cutoff);
    
    if (prunedSnapshots.length < snapshots.length) {
      this.snapshots.set(templateId, prunedSnapshots);
      
      this.emit('snapshots:pruned', {
        templateId,
        prunedCount: snapshots.length - prunedSnapshots.length,
        timestamp: Date.now()
      });
    }
  }

  private startAggregationSchedule(): void {
    // Set up aggregation for different intervals
    if (this.config.aggregationIntervals.includes('hourly')) {
      this.scheduleAggregation('hour', 60 * 60 * 1000);
    }
    
    if (this.config.aggregationIntervals.includes('daily')) {
      this.scheduleAggregation('day', 24 * 60 * 60 * 1000);
    }
    
    if (this.config.aggregationIntervals.includes('weekly')) {
      this.scheduleAggregation('week', 7 * 24 * 60 * 60 * 1000);
    }
    
    if (this.config.aggregationIntervals.includes('monthly')) {
      this.scheduleAggregation('month', 30 * 24 * 60 * 60 * 1000);
    }
  }

  private scheduleAggregation(
    interval: 'hour' | 'day' | 'week' | 'month',
    milliseconds: number
  ): void {
    const timer = setInterval(() => {
      this.performAggregation(interval);
    }, milliseconds);
    
    this.aggregationTimers.set(interval, timer);
    
    // Perform initial aggregation
    this.performAggregation(interval);
  }

  private async performAggregation(interval: 'hour' | 'day' | 'week' | 'month'): Promise<void> {
    const now = Date.now();
    const windowStart = this.getIntervalStart(now, interval);
    
    for (const [templateId, snapshots] of this.snapshots) {
      const sourceInterval = this.getSourceInterval(interval);
      const sourceSnapshots = snapshots.filter(
        s => s.interval === sourceInterval &&
             s.timestamp >= windowStart &&
             s.timestamp < windowStart + this.getIntervalDuration(interval)
      );
      
      if (sourceSnapshots.length > 0) {
        const aggregatedSnapshot = this.aggregateSnapshots(
          templateId,
          sourceSnapshots,
          windowStart,
          interval
        );
        
        // Check if we already have this aggregation
        const existing = snapshots.find(
          s => s.timestamp === windowStart && s.interval === interval
        );
        
        if (!existing) {
          snapshots.push(aggregatedSnapshot);
          
          this.emit('snapshot:aggregated', {
            templateId,
            interval,
            timestamp: windowStart
          });
        }
      }
    }
  }

  private getIntervalStart(timestamp: number, interval: string): number {
    const date = new Date(timestamp);
    
    switch (interval) {
      case 'hour':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
      case 'day':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      case 'week':
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek;
        return new Date(date.getFullYear(), date.getMonth(), diff).getTime();
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      default:
        return timestamp;
    }
  }

  private getIntervalDuration(interval: string): number {
    switch (interval) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private getSourceInterval(targetInterval: string): PerformanceSnapshot['interval'] {
    switch (targetInterval) {
      case 'hour':
        return 'minute';
      case 'day':
        return 'hour';
      case 'week':
        return 'day';
      case 'month':
        return 'day';
      default:
        return 'minute';
    }
  }

  private aggregateSnapshots(
    templateId: string,
    snapshots: PerformanceSnapshot[],
    timestamp: number,
    interval: PerformanceSnapshot['interval']
  ): PerformanceSnapshot {
    const aggregated = this.createEmptySnapshot(templateId, timestamp, interval);
    
    // Sum up metrics
    for (const snapshot of snapshots) {
      aggregated.metrics.executionCount += snapshot.metrics.executionCount;
      aggregated.metrics.totalCost += snapshot.metrics.totalCost;
      
      // Weighted averages
      const weight = snapshot.metrics.executionCount;
      aggregated.metrics.successRate += snapshot.metrics.successRate * weight;
      aggregated.metrics.avgResponseTime += snapshot.metrics.avgResponseTime * weight;
      aggregated.metrics.avgTokenUsage += snapshot.metrics.avgTokenUsage * weight;
      aggregated.metrics.errorRate += snapshot.metrics.errorRate * weight;
      
      if (snapshot.metrics.avgQualityScore !== undefined) {
        aggregated.metrics.avgQualityScore = (aggregated.metrics.avgQualityScore || 0) +
          snapshot.metrics.avgQualityScore * weight;
      }
      
      // Aggregate provider metrics
      for (const [provider, providerMetrics] of Object.entries(snapshot.providers)) {
        if (!aggregated.providers[provider]) {
          aggregated.providers[provider] = {
            executionCount: 0,
            avgResponseTime: 0,
            errorRate: 0,
            avgCost: 0
          };
        }
        
        const ap = aggregated.providers[provider];
        const pw = providerMetrics.executionCount;
        
        ap.executionCount += pw;
        ap.avgResponseTime += providerMetrics.avgResponseTime * pw;
        ap.errorRate += providerMetrics.errorRate * pw;
        ap.avgCost += providerMetrics.avgCost * pw;
      }
    }
    
    // Calculate final averages
    const totalWeight = aggregated.metrics.executionCount;
    if (totalWeight > 0) {
      aggregated.metrics.successRate /= totalWeight;
      aggregated.metrics.avgResponseTime /= totalWeight;
      aggregated.metrics.avgTokenUsage /= totalWeight;
      aggregated.metrics.avgCost = aggregated.metrics.totalCost / totalWeight;
      aggregated.metrics.errorRate /= totalWeight;
      
      if (aggregated.metrics.avgQualityScore !== undefined) {
        aggregated.metrics.avgQualityScore /= totalWeight;
      }
      
      // Provider averages
      for (const provider of Object.values(aggregated.providers)) {
        if (provider.executionCount > 0) {
          provider.avgResponseTime /= provider.executionCount;
          provider.errorRate /= provider.executionCount;
          provider.avgCost /= provider.executionCount;
        }
      }
    }
    
    return aggregated;
  }

  public async destroy(): void {
    // Clear aggregation timers
    for (const timer of this.aggregationTimers.values()) {
      clearInterval(timer);
    }
    this.aggregationTimers.clear();
    
    // Clear data
    this.snapshots.clear();
    this.executionBuffer.clear();
    this.anomalyHistory.clear();
    this.customMetrics.clear();
    
    this.removeAllListeners();
  }
}