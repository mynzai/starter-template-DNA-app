/**
 * @fileoverview Performance Analyzer
 * Analyzes performance metrics and detects anomalies
 */

import { EventEmitter } from 'events';
import {
  PerformanceMetrics,
  PerformanceScore,
  OperationPerformance,
  PerformanceBottleneck,
  PerformanceTrend,
  BenchmarkResult,
  DevToolsMetrics,
  OperationType
} from './types';

export class PerformanceAnalyzer extends EventEmitter {
  private initialized = false;
  private performanceHistory: Map<string, PerformanceDataPoint[]> = new Map();
  private benchmarks: Map<string, BenchmarkDefinition> = new Map();
  private anomalyDetector: AnomalyDetector;
  
  // Performance thresholds
  private thresholds = {
    latency: {
      excellent: 1000,   // < 1s
      good: 5000,        // < 5s
      acceptable: 15000, // < 15s
      poor: 30000        // < 30s
    },
    throughput: {
      excellent: 100,    // > 100 ops/sec
      good: 50,          // > 50 ops/sec
      acceptable: 10,    // > 10 ops/sec
      poor: 1            // > 1 ops/sec
    },
    errorRate: {
      excellent: 0.001,  // < 0.1%
      good: 0.01,        // < 1%
      acceptable: 0.05,  // < 5%
      poor: 0.1          // < 10%
    },
    resourceUtilization: {
      excellent: 0.5,    // < 50%
      good: 0.7,         // < 70%
      acceptable: 0.85,  // < 85%
      poor: 0.95         // < 95%
    }
  };

  constructor() {
    super();
    this.anomalyDetector = new AnomalyDetector();
    this.loadDefaultBenchmarks();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.anomalyDetector.initialize();
    this.initialized = true;
    this.emit('analyzer:initialized');
  }

  async analyzeSession(sessionId: string): Promise<PerformanceMetrics> {
    const sessionData = this.performanceHistory.get(sessionId) || [];
    
    if (sessionData.length === 0) {
      return this.getDefaultPerformanceMetrics();
    }

    const overall = this.calculateOverallScore(sessionData);
    const operations = this.analyzeOperations(sessionData);
    const bottlenecks = await this.identifyBottlenecks(sessionData);
    const trends = this.analyzeTrends(sessionData);
    const benchmarks = await this.runBenchmarks(sessionData);

    const metrics: PerformanceMetrics = {
      overall,
      operations,
      bottlenecks,
      trends,
      benchmarks
    };

    this.emit('performance:analyzed', { sessionId, metrics });
    return metrics;
  }

  async getPerformanceMetrics(timeRange: { start: number; end: number }): Promise<PerformanceMetrics> {
    // Collect all data points in the time range
    const allDataPoints: PerformanceDataPoint[] = [];
    
    for (const dataPoints of this.performanceHistory.values()) {
      const filteredPoints = dataPoints.filter(point =>
        point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
      );
      allDataPoints.push(...filteredPoints);
    }

    if (allDataPoints.length === 0) {
      return this.getDefaultPerformanceMetrics();
    }

    const overall = this.calculateOverallScore(allDataPoints);
    const operations = this.analyzeOperations(allDataPoints);
    const bottlenecks = await this.identifyBottlenecks(allDataPoints);
    const trends = this.analyzeTrends(allDataPoints);
    const benchmarks = await this.runBenchmarks(allDataPoints);

    return {
      overall,
      operations,
      bottlenecks,
      trends,
      benchmarks
    };
  }

  async recordPerformanceData(sessionId: string, data: PerformanceDataPoint): Promise<void> {
    const sessionData = this.performanceHistory.get(sessionId) || [];
    sessionData.push(data);
    this.performanceHistory.set(sessionId, sessionData);

    // Check for real-time anomalies
    await this.checkForAnomalies(sessionId, data);

    this.emit('performance:recorded', { sessionId, data });
  }

  async detectAnomalies(metrics: DevToolsMetrics[]): Promise<PerformanceAnomaly[]> {
    const anomalies: PerformanceAnomaly[] = [];

    for (const metric of metrics) {
      // Check duration anomalies
      if (metric.duration > this.thresholds.latency.poor) {
        anomalies.push({
          type: 'high_latency',
          severity: 'critical',
          metric: 'duration',
          value: metric.duration,
          threshold: this.thresholds.latency.poor,
          description: `Operation duration ${metric.duration}ms exceeds critical threshold`,
          source: {
            service: 'dev-tools',
            component: metric.operationType,
            environment: metric.metadata.environment
          },
          metrics: {
            current: { duration: metric.duration },
            threshold: { duration: this.thresholds.latency.poor }
          }
        });
      }

      // Check error rate anomalies
      if (metric.errors.errorRate > this.thresholds.errorRate.poor) {
        anomalies.push({
          type: 'high_error_rate',
          severity: 'error',
          metric: 'error_rate',
          value: metric.errors.errorRate,
          threshold: this.thresholds.errorRate.poor,
          description: `Error rate ${(metric.errors.errorRate * 100).toFixed(1)}% exceeds threshold`,
          source: {
            service: 'dev-tools',
            component: metric.operationType,
            environment: metric.metadata.environment
          },
          metrics: {
            current: { errorRate: metric.errors.errorRate },
            threshold: { errorRate: this.thresholds.errorRate.poor }
          }
        });
      }

      // Check resource utilization anomalies
      const cpuUtilization = metric.resourceUsage.cpu.utilization / 100;
      if (cpuUtilization > this.thresholds.resourceUtilization.poor) {
        anomalies.push({
          type: 'resource_exhaustion',
          severity: 'warning',
          metric: 'cpu_utilization',
          value: cpuUtilization,
          threshold: this.thresholds.resourceUtilization.poor,
          description: `CPU utilization ${(cpuUtilization * 100).toFixed(1)}% exceeds threshold`,
          source: {
            service: 'dev-tools',
            component: 'cpu',
            environment: metric.metadata.environment
          },
          metrics: {
            current: { cpuUtilization },
            threshold: { cpuUtilization: this.thresholds.resourceUtilization.poor }
          }
        });
      }

      // Use ML-based anomaly detection
      const mlAnomalies = await this.anomalyDetector.detectAnomalies([metric]);
      anomalies.push(...mlAnomalies);
    }

    return anomalies;
  }

  async addBenchmark(benchmark: BenchmarkDefinition): Promise<void> {
    this.benchmarks.set(benchmark.name, benchmark);
    this.emit('benchmark:added', { name: benchmark.name });
  }

  async runBenchmark(benchmarkName: string, data: PerformanceDataPoint[]): Promise<BenchmarkResult> {
    const benchmark = this.benchmarks.get(benchmarkName);
    if (!benchmark) {
      throw new Error(`Benchmark not found: ${benchmarkName}`);
    }

    const value = benchmark.calculator(data);
    const status = this.evaluateBenchmark(value, benchmark);
    const percentile = this.calculatePercentile(value, benchmark.historicalData || []);

    return {
      name: benchmark.name,
      category: benchmark.category,
      value,
      unit: benchmark.unit,
      baseline: benchmark.baseline,
      target: benchmark.target,
      status,
      percentile
    };
  }

  private calculateOverallScore(dataPoints: PerformanceDataPoint[]): PerformanceScore {
    if (dataPoints.length === 0) {
      return {
        score: 50,
        grade: 'C',
        factors: [],
        recommendations: ['Insufficient data for analysis']
      };
    }

    const factors: any[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Latency factor
    const avgLatency = dataPoints.reduce((sum, dp) => sum + dp.duration, 0) / dataPoints.length;
    const latencyScore = this.scoreLatency(avgLatency);
    const latencyWeight = 0.3;
    factors.push({
      name: 'latency',
      score: latencyScore,
      weight: latencyWeight,
      impact: latencyScore < 60 ? 'high' : latencyScore < 80 ? 'medium' : 'low',
      description: `Average latency: ${avgLatency.toFixed(0)}ms`
    });
    totalScore += latencyScore * latencyWeight;
    totalWeight += latencyWeight;

    // Throughput factor
    const totalOps = dataPoints.length;
    const timespan = Math.max(...dataPoints.map(dp => dp.timestamp)) - Math.min(...dataPoints.map(dp => dp.timestamp));
    const throughput = totalOps / (timespan / 1000); // ops per second
    const throughputScore = this.scoreThroughput(throughput);
    const throughputWeight = 0.25;
    factors.push({
      name: 'throughput',
      score: throughputScore,
      weight: throughputWeight,
      impact: throughputScore < 60 ? 'high' : throughputScore < 80 ? 'medium' : 'low',
      description: `Throughput: ${throughput.toFixed(2)} ops/sec`
    });
    totalScore += throughputScore * throughputWeight;
    totalWeight += throughputWeight;

    // Error rate factor
    const errorRate = dataPoints.filter(dp => !dp.success).length / dataPoints.length;
    const errorScore = this.scoreErrorRate(errorRate);
    const errorWeight = 0.25;
    factors.push({
      name: 'reliability',
      score: errorScore,
      weight: errorWeight,
      impact: errorScore < 60 ? 'high' : errorScore < 80 ? 'medium' : 'low',
      description: `Error rate: ${(errorRate * 100).toFixed(1)}%`
    });
    totalScore += errorScore * errorWeight;
    totalWeight += errorWeight;

    // Resource utilization factor
    const avgCPU = dataPoints.reduce((sum, dp) => sum + (dp.resourceUsage?.cpu || 0), 0) / dataPoints.length;
    const resourceScore = this.scoreResourceUtilization(avgCPU / 100);
    const resourceWeight = 0.2;
    factors.push({
      name: 'resource_efficiency',
      score: resourceScore,
      weight: resourceWeight,
      impact: resourceScore < 60 ? 'high' : resourceScore < 80 ? 'medium' : 'low',
      description: `Average CPU: ${avgCPU.toFixed(1)}%`
    });
    totalScore += resourceScore * resourceWeight;
    totalWeight += resourceWeight;

    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
    const grade = this.scoreToGrade(finalScore);
    const recommendations = this.generateRecommendations(factors);

    return {
      score: finalScore,
      grade,
      factors,
      recommendations
    };
  }

  private analyzeOperations(dataPoints: PerformanceDataPoint[]): OperationPerformance[] {
    const operationGroups = new Map<OperationType, PerformanceDataPoint[]>();
    
    // Group by operation type
    dataPoints.forEach(dp => {
      const group = operationGroups.get(dp.operationType) || [];
      group.push(dp);
      operationGroups.set(dp.operationType, group);
    });

    return Array.from(operationGroups.entries()).map(([operationType, points]) => {
      const durations = points.map(p => p.duration).sort((a, b) => a - b);
      const successCount = points.filter(p => p.success).length;
      const timespan = Math.max(...points.map(p => p.timestamp)) - Math.min(...points.map(p => p.timestamp));
      
      return {
        operationType,
        count: points.length,
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        medianDuration: durations[Math.floor(durations.length / 2)] || 0,
        percentile95: durations[Math.floor(durations.length * 0.95)] || 0,
        percentile99: durations[Math.floor(durations.length * 0.99)] || 0,
        throughput: points.length / (timespan / 1000),
        successRate: successCount / points.length,
        errorRate: (points.length - successCount) / points.length
      };
    });
  }

  private async identifyBottlenecks(dataPoints: PerformanceDataPoint[]): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Analyze latency bottlenecks
    const slowOperations = dataPoints.filter(dp => dp.duration > this.thresholds.latency.acceptable);
    if (slowOperations.length > dataPoints.length * 0.1) { // More than 10% slow
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        description: 'High latency detected in multiple operations',
        impact: 'Operations taking longer than expected, affecting user experience',
        location: 'Operation processing pipeline',
        recommendation: 'Review algorithm complexity and consider optimization',
        estimatedImprovement: 30
      });
    }

    // Analyze memory bottlenecks
    const highMemoryOps = dataPoints.filter(dp => (dp.resourceUsage?.memory || 0) > 1000); // > 1GB
    if (highMemoryOps.length > 0) {
      bottlenecks.push({
        type: 'memory',
        severity: 'medium',
        description: 'High memory usage detected',
        impact: 'Potential memory pressure affecting performance',
        location: 'Memory allocation patterns',
        recommendation: 'Review memory usage patterns and implement memory optimization',
        estimatedImprovement: 20
      });
    }

    // Analyze network bottlenecks
    const networkErrors = dataPoints.filter(dp => dp.networkError);
    if (networkErrors.length > dataPoints.length * 0.05) { // More than 5% network errors
      bottlenecks.push({
        type: 'network',
        severity: 'medium',
        description: 'Network connectivity issues detected',
        impact: 'Network failures affecting operation reliability',
        location: 'External API connections',
        recommendation: 'Implement retry logic and connection pooling',
        estimatedImprovement: 25
      });
    }

    // AI API bottlenecks
    const aiOps = dataPoints.filter(dp => dp.operationType === 'ai_request');
    if (aiOps.length > 0) {
      const avgAILatency = aiOps.reduce((sum, op) => sum + op.duration, 0) / aiOps.length;
      if (avgAILatency > 10000) { // > 10 seconds
        bottlenecks.push({
          type: 'ai_api',
          severity: 'high',
          description: 'Slow AI API responses detected',
          impact: 'AI operations taking too long, blocking other processes',
          location: 'AI provider API calls',
          recommendation: 'Consider using faster models or implementing caching',
          estimatedImprovement: 40
        });
      }
    }

    return bottlenecks;
  }

  private analyzeTrends(dataPoints: PerformanceDataPoint[]): PerformanceTrend[] {
    if (dataPoints.length < 10) {
      return []; // Need sufficient data for trend analysis
    }

    const trends: PerformanceTrend[] = [];
    
    // Sort by timestamp
    const sortedPoints = [...dataPoints].sort((a, b) => a.timestamp - b.timestamp);
    
    // Analyze latency trend
    const latencyTrend = this.calculateTrend(sortedPoints.map(p => ({ timestamp: p.timestamp, value: p.duration })));
    trends.push({
      metric: 'latency',
      direction: latencyTrend.direction,
      changePercent: latencyTrend.changePercent,
      timeframe: this.formatTimeframe(sortedPoints[0].timestamp, sortedPoints[sortedPoints.length - 1].timestamp),
      dataPoints: latencyTrend.dataPoints
    });

    // Analyze error rate trend
    const errorPoints = this.calculateErrorRateOverTime(sortedPoints);
    const errorTrend = this.calculateTrend(errorPoints);
    trends.push({
      metric: 'error_rate',
      direction: errorTrend.direction,
      changePercent: errorTrend.changePercent,
      timeframe: this.formatTimeframe(sortedPoints[0].timestamp, sortedPoints[sortedPoints.length - 1].timestamp),
      dataPoints: errorTrend.dataPoints
    });

    return trends;
  }

  private async runBenchmarks(dataPoints: PerformanceDataPoint[]): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    
    for (const [name, benchmark] of this.benchmarks) {
      try {
        const result = await this.runBenchmark(name, dataPoints);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to run benchmark ${name}:`, error);
      }
    }

    return results;
  }

  private async checkForAnomalies(sessionId: string, dataPoint: PerformanceDataPoint): Promise<void> {
    const sessionData = this.performanceHistory.get(sessionId) || [];
    
    // Check for immediate anomalies
    if (dataPoint.duration > this.thresholds.latency.poor) {
      this.emit('performance:degradation', {
        severity: 'critical',
        message: `High latency detected: ${dataPoint.duration}ms`,
        source: {
          service: 'performance-analyzer',
          component: dataPoint.operationType,
          environment: 'monitoring'
        },
        metrics: {
          current: { latency: dataPoint.duration },
          threshold: { latency: this.thresholds.latency.poor }
        }
      });
    }

    // Check for pattern anomalies with recent history
    if (sessionData.length >= 10) {
      const recentPoints = sessionData.slice(-10);
      const avgRecent = recentPoints.reduce((sum, p) => sum + p.duration, 0) / recentPoints.length;
      
      if (dataPoint.duration > avgRecent * 2) { // 2x recent average
        this.emit('performance:degradation', {
          severity: 'warning',
          message: `Performance spike detected: ${dataPoint.duration}ms vs ${avgRecent.toFixed(0)}ms average`,
          source: {
            service: 'performance-analyzer',
            component: dataPoint.operationType,
            environment: 'monitoring'
          },
          metrics: {
            current: { latency: dataPoint.duration },
            baseline: { latency: avgRecent }
          }
        });
      }
    }
  }

  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      overall: {
        score: 50,
        grade: 'C',
        factors: [],
        recommendations: ['Insufficient performance data available']
      },
      operations: [],
      bottlenecks: [],
      trends: [],
      benchmarks: []
    };
  }

  private scoreLatency(latency: number): number {
    if (latency <= this.thresholds.latency.excellent) return 95;
    if (latency <= this.thresholds.latency.good) return 85;
    if (latency <= this.thresholds.latency.acceptable) return 70;
    if (latency <= this.thresholds.latency.poor) return 50;
    return 25;
  }

  private scoreThroughput(throughput: number): number {
    if (throughput >= this.thresholds.throughput.excellent) return 95;
    if (throughput >= this.thresholds.throughput.good) return 85;
    if (throughput >= this.thresholds.throughput.acceptable) return 70;
    if (throughput >= this.thresholds.throughput.poor) return 50;
    return 25;
  }

  private scoreErrorRate(errorRate: number): number {
    if (errorRate <= this.thresholds.errorRate.excellent) return 95;
    if (errorRate <= this.thresholds.errorRate.good) return 85;
    if (errorRate <= this.thresholds.errorRate.acceptable) return 70;
    if (errorRate <= this.thresholds.errorRate.poor) return 50;
    return 25;
  }

  private scoreResourceUtilization(utilization: number): number {
    if (utilization <= this.thresholds.resourceUtilization.excellent) return 95;
    if (utilization <= this.thresholds.resourceUtilization.good) return 85;
    if (utilization <= this.thresholds.resourceUtilization.acceptable) return 70;
    if (utilization <= this.thresholds.resourceUtilization.poor) return 50;
    return 25;
  }

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateRecommendations(factors: any[]): string[] {
    const recommendations: string[] = [];
    
    factors.forEach(factor => {
      if (factor.score < 70) {
        switch (factor.name) {
          case 'latency':
            recommendations.push('Optimize operation latency through algorithm improvements and caching');
            break;
          case 'throughput':
            recommendations.push('Increase throughput by implementing parallel processing and connection pooling');
            break;
          case 'reliability':
            recommendations.push('Improve error handling and implement retry mechanisms');
            break;
          case 'resource_efficiency':
            recommendations.push('Optimize resource usage through memory management and CPU optimization');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Performance is good - continue monitoring for any degradation');
    }

    return recommendations;
  }

  private calculateTrend(dataPoints: { timestamp: number; value: number }[]): {
    direction: 'improving' | 'degrading' | 'stable';
    changePercent: number;
    dataPoints: { timestamp: number; value: number }[];
  } {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        changePercent: 0,
        dataPoints
      };
    }

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    let direction: 'improving' | 'degrading' | 'stable';
    if (Math.abs(changePercent) < 5) {
      direction = 'stable';
    } else if (changePercent > 0) {
      direction = 'degrading'; // Higher latency/errors are worse
    } else {
      direction = 'improving';
    }

    return {
      direction,
      changePercent: Math.abs(changePercent),
      dataPoints
    };
  }

  private calculateErrorRateOverTime(dataPoints: PerformanceDataPoint[]): { timestamp: number; value: number }[] {
    // Group by time windows (5-minute intervals)
    const windowSize = 5 * 60 * 1000; // 5 minutes
    const windows = new Map<number, { total: number; errors: number }>();

    dataPoints.forEach(point => {
      const window = Math.floor(point.timestamp / windowSize) * windowSize;
      const windowData = windows.get(window) || { total: 0, errors: 0 };
      windowData.total++;
      if (!point.success) windowData.errors++;
      windows.set(window, windowData);
    });

    return Array.from(windows.entries()).map(([timestamp, data]) => ({
      timestamp,
      value: data.total > 0 ? data.errors / data.total : 0
    }));
  }

  private formatTimeframe(start: number, end: number): string {
    const duration = end - start;
    const hours = duration / (1000 * 60 * 60);
    
    if (hours < 1) {
      return `${Math.round(duration / (1000 * 60))} minutes`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    } else {
      return `${(hours / 24).toFixed(1)} days`;
    }
  }

  private evaluateBenchmark(value: number, benchmark: BenchmarkDefinition): 'passed' | 'failed' | 'warning' {
    if (benchmark.target !== undefined) {
      if (benchmark.higherIsBetter) {
        if (value >= benchmark.target) return 'passed';
        if (value >= benchmark.target * 0.8) return 'warning';
        return 'failed';
      } else {
        if (value <= benchmark.target) return 'passed';
        if (value <= benchmark.target * 1.2) return 'warning';
        return 'failed';
      }
    }
    return 'passed';
  }

  private calculatePercentile(value: number, historicalData: number[]): number {
    if (historicalData.length === 0) return 50;
    
    const sorted = [...historicalData].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 100;
    return Math.round((index / sorted.length) * 100);
  }

  private loadDefaultBenchmarks(): void {
    // Latency benchmark
    this.benchmarks.set('average_latency', {
      name: 'average_latency',
      category: 'performance',
      unit: 'ms',
      baseline: 5000,
      target: 2000,
      higherIsBetter: false,
      calculator: (data) => data.reduce((sum, d) => sum + d.duration, 0) / data.length,
      description: 'Average operation latency across all operations'
    });

    // Throughput benchmark
    this.benchmarks.set('throughput', {
      name: 'throughput',
      category: 'performance',
      unit: 'ops/sec',
      baseline: 10,
      target: 50,
      higherIsBetter: true,
      calculator: (data) => {
        if (data.length === 0) return 0;
        const timespan = Math.max(...data.map(d => d.timestamp)) - Math.min(...data.map(d => d.timestamp));
        return data.length / (timespan / 1000);
      },
      description: 'Operations processed per second'
    });

    // Error rate benchmark
    this.benchmarks.set('error_rate', {
      name: 'error_rate',
      category: 'reliability',
      unit: '%',
      baseline: 5,
      target: 1,
      higherIsBetter: false,
      calculator: (data) => {
        if (data.length === 0) return 0;
        const errors = data.filter(d => !d.success).length;
        return (errors / data.length) * 100;
      },
      description: 'Percentage of operations that failed'
    });
  }

  async shutdown(): Promise<void> {
    await this.anomalyDetector.shutdown();
    
    // Clear performance history
    this.performanceHistory.clear();
    
    this.initialized = false;
    this.emit('analyzer:shutdown');
  }
}

// Supporting classes and interfaces
class AnomalyDetector {
  async initialize(): Promise<void> {
    // Initialize ML models or statistical methods
  }

  async detectAnomalies(metrics: DevToolsMetrics[]): Promise<PerformanceAnomaly[]> {
    // Implement ML-based anomaly detection
    // For now, return empty array
    return [];
  }

  async shutdown(): Promise<void> {
    // Cleanup ML models
  }
}

interface PerformanceDataPoint {
  timestamp: number;
  operationType: OperationType;
  duration: number;
  success: boolean;
  resourceUsage?: {
    cpu: number;
    memory: number;
    network: number;
  };
  networkError?: boolean;
  error?: string;
}

interface BenchmarkDefinition {
  name: string;
  category: string;
  unit: string;
  baseline: number;
  target?: number;
  higherIsBetter: boolean;
  calculator: (data: PerformanceDataPoint[]) => number;
  description: string;
  historicalData?: number[];
}

interface PerformanceAnomaly {
  type: 'high_latency' | 'high_error_rate' | 'resource_exhaustion' | 'throughput_drop';
  severity: 'critical' | 'error' | 'warning' | 'info';
  metric: string;
  value: number;
  threshold: number;
  description: string;
  source: {
    service: string;
    component: string;
    environment: string;
  };
  metrics: {
    current: Record<string, number>;
    threshold?: Record<string, number>;
    baseline?: Record<string, number>;
  };
}