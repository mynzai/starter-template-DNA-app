/**
 * @fileoverview Performance Regression Detector - Epic 6 Story 4 AC3
 * Advanced performance benchmarking with regression detection and trend analysis
 */

import { EventEmitter } from 'events';

/**
 * Performance metric types
 */
export enum PerformanceMetricType {
  BUILD_TIME = 'build_time',
  BUNDLE_SIZE = 'bundle_size',
  STARTUP_TIME = 'startup_time',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  FIRST_CONTENTFUL_PAINT = 'first_contentful_paint',
  LARGEST_CONTENTFUL_PAINT = 'largest_contentful_paint',
  CUMULATIVE_LAYOUT_SHIFT = 'cumulative_layout_shift',
  FIRST_INPUT_DELAY = 'first_input_delay',
  TIME_TO_INTERACTIVE = 'time_to_interactive',
  LIGHTHOUSE_SCORE = 'lighthouse_score',
  WEBPACK_COMPILATION_TIME = 'webpack_compilation_time',
  HOT_RELOAD_TIME = 'hot_reload_time',
  TEST_EXECUTION_TIME = 'test_execution_time'
}

/**
 * Performance benchmark configuration
 */
export interface PerformanceBenchmarkConfig {
  // Benchmark settings
  enabled: boolean;
  benchmarkTypes: PerformanceMetricType[];
  iterationCount: number;
  warmupIterations: number;
  
  // Thresholds
  regressionThresholds: Map<PerformanceMetricType, RegressionThreshold>;
  performanceTargets: Map<PerformanceMetricType, PerformanceTarget>;
  
  // Historical data
  enableHistoricalTracking: boolean;
  historicalDataRetentionDays: number;
  baselineUpdateStrategy: 'manual' | 'automatic' | 'rolling_average';
  
  // Regression detection
  regressionDetection: RegressionDetectionConfig;
  
  // Environment
  environmentInfo: EnvironmentInfo;
  
  // Reporting
  enableDetailedReporting: boolean;
  enableTrendAnalysis: boolean;
  enableAlerts: boolean;
}

/**
 * Regression threshold configuration
 */
export interface RegressionThreshold {
  metric: PerformanceMetricType;
  
  // Percentage-based thresholds
  warningThresholdPercent: number; // e.g., 10% increase
  errorThresholdPercent: number;   // e.g., 25% increase
  
  // Absolute thresholds
  warningThresholdAbsolute?: number;
  errorThresholdAbsolute?: number;
  
  // Statistical thresholds
  useStatisticalThresholds: boolean;
  standardDeviationMultiplier?: number; // e.g., 2 std devs
  
  // Trend-based thresholds
  trendWindowSize?: number; // number of measurements for trend analysis
  trendThresholdPercent?: number; // sustained trend threshold
}

/**
 * Performance target configuration
 */
export interface PerformanceTarget {
  metric: PerformanceMetricType;
  targetValue: number;
  unit: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/**
 * Regression detection configuration
 */
export interface RegressionDetectionConfig {
  algorithm: 'simple' | 'statistical' | 'machine_learning' | 'hybrid';
  minimumSamples: number;
  confidenceLevel: number; // 0.95 for 95% confidence
  enableAnomalyDetection: boolean;
  enableSeasonalityAdjustment: boolean;
  enableOutlierRemoval: boolean;
}

/**
 * Environment information
 */
export interface EnvironmentInfo {
  platform: string;
  framework: string;
  nodeVersion: string;
  osVersion: string;
  cpuInfo: string;
  memoryInfo: string;
  diskInfo: string;
  networkInfo?: string;
  ciEnvironment?: string;
  buildAgent?: string;
}

/**
 * Performance measurement
 */
export interface PerformanceMeasurement {
  id: string;
  timestamp: Date;
  metric: PerformanceMetricType;
  value: number;
  unit: string;
  
  // Measurement metadata
  templateId: string;
  platform: string;
  framework: string;
  environment: EnvironmentInfo;
  
  // Measurement details
  iterationNumber: number;
  totalIterations: number;
  rawValues: number[];
  
  // Statistical measures
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  percentile95: number;
  percentile99: number;
  
  // Quality indicators
  confidence: number; // 0-1
  stability: number;  // coefficient of variation
  outlierCount: number;
}

/**
 * Performance benchmark result
 */
export interface PerformanceBenchmarkResult {
  id: string;
  templateId: string;
  timestamp: Date;
  duration: number; // milliseconds
  
  // Measurements
  measurements: Map<PerformanceMetricType, PerformanceMeasurement>;
  
  // Regression analysis
  regressions: RegressionAnalysis[];
  
  // Comparison with baseline
  baselineComparison?: BaselineComparison;
  
  // Overall assessment
  overallScore: number; // 0-100
  status: 'pass' | 'warning' | 'fail';
  recommendations: string[];
  
  // Environment
  environment: EnvironmentInfo;
}

/**
 * Regression analysis result
 */
export interface RegressionAnalysis {
  metric: PerformanceMetricType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Regression details
  currentValue: number;
  baselineValue: number;
  percentageChange: number;
  absoluteChange: number;
  
  // Statistical analysis
  statisticalSignificance: number; // p-value
  confidenceInterval: [number, number];
  trendDirection: 'improving' | 'stable' | 'degrading';
  
  // Threshold analysis
  thresholdBreached: boolean;
  thresholdType: 'percentage' | 'absolute' | 'statistical' | 'trend';
  
  // Context
  description: string;
  recommendation: string;
  impactAssessment: string;
}

/**
 * Baseline comparison
 */
export interface BaselineComparison {
  baselineId: string;
  baselineTimestamp: Date;
  comparisonMethod: 'single_point' | 'rolling_average' | 'weighted_average';
  
  // Comparison results
  improvementCount: number;
  regressionCount: number;
  stableCount: number;
  
  // Overall comparison
  overallTrend: 'improving' | 'stable' | 'degrading';
  overallChangePercent: number;
  
  // Individual metric comparisons
  metricComparisons: Map<PerformanceMetricType, MetricComparison>;
}

/**
 * Individual metric comparison
 */
export interface MetricComparison {
  metric: PerformanceMetricType;
  currentValue: number;
  baselineValue: number;
  changePercent: number;
  changeAbsolute: number;
  status: 'improved' | 'stable' | 'regressed';
  significance: 'low' | 'medium' | 'high';
}

/**
 * Historical performance data
 */
export interface PerformanceHistoryEntry {
  timestamp: Date;
  templateId: string;
  measurements: Map<PerformanceMetricType, number>;
  environment: EnvironmentInfo;
  buildInfo?: BuildInfo;
}

/**
 * Build information
 */
export interface BuildInfo {
  buildId: string;
  commitHash: string;
  branch: string;
  buildAgent: string;
  buildDuration: number;
  buildSuccess: boolean;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Alert details
  metric: PerformanceMetricType;
  templateId: string;
  currentValue: number;
  thresholdValue: number;
  changePercent: number;
  
  // Alert context
  description: string;
  recommendation: string;
  affectedUsers?: string[];
  estimatedImpact?: string;
  
  // Alert status
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

/**
 * Performance Regression Detector
 */
export class PerformanceRegressionDetector extends EventEmitter {
  private config: PerformanceBenchmarkConfig;
  private performanceHistory: Map<string, PerformanceHistoryEntry[]> = new Map();
  private benchmarkResults: Map<string, PerformanceBenchmarkResult> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private baselines: Map<string, PerformanceMeasurement[]> = new Map();

  constructor(config: PerformanceBenchmarkConfig) {
    super();
    this.config = config;
  }

  /**
   * Run performance benchmark for a template
   */
  public async runBenchmark(
    templateId: string,
    platform: string,
    framework: string
  ): Promise<PerformanceBenchmarkResult> {
    const benchmarkId = this.generateBenchmarkId();
    const startTime = Date.now();
    
    this.emit('benchmark:started', { benchmarkId, templateId, platform, framework });
    
    try {
      // Collect environment information
      const environment = await this.collectEnvironmentInfo();
      
      // Initialize benchmark result
      const result: PerformanceBenchmarkResult = {
        id: benchmarkId,
        templateId,
        timestamp: new Date(),
        duration: 0,
        measurements: new Map(),
        regressions: [],
        overallScore: 0,
        status: 'pass',
        recommendations: [],
        environment
      };

      // Run measurements for each metric type
      for (const metricType of this.config.benchmarkTypes) {
        this.emit('measurement:started', { benchmarkId, metric: metricType });
        
        try {
          const measurement = await this.measurePerformanceMetric(
            metricType,
            templateId,
            platform,
            framework,
            environment
          );
          
          result.measurements.set(metricType, measurement);
          
          this.emit('measurement:completed', { 
            benchmarkId, 
            metric: metricType, 
            value: measurement.value 
          });
          
        } catch (error) {
          this.emit('measurement:failed', { 
            benchmarkId, 
            metric: metricType, 
            error 
          });
        }
      }
      
      // Perform regression analysis
      result.regressions = await this.analyzeRegressions(result.measurements, templateId);
      
      // Compare with baseline
      if (this.baselines.has(templateId)) {
        result.baselineComparison = await this.compareWithBaseline(
          result.measurements,
          templateId
        );
      }
      
      // Calculate overall score and status
      this.calculateOverallAssessment(result);
      
      // Generate recommendations
      result.recommendations = this.generateRecommendations(result);
      
      // Store historical data
      if (this.config.enableHistoricalTracking) {
        await this.storeHistoricalData(result);
      }
      
      // Check for alerts
      await this.checkPerformanceAlerts(result);
      
      // Update benchmark result
      result.duration = Date.now() - startTime;
      this.benchmarkResults.set(benchmarkId, result);
      
      this.emit('benchmark:completed', { benchmarkId, result });
      
      return result;
      
    } catch (error) {
      this.emit('benchmark:failed', { benchmarkId, error });
      throw error;
    }
  }

  /**
   * Measure a specific performance metric
   */
  private async measurePerformanceMetric(
    metricType: PerformanceMetricType,
    templateId: string,
    platform: string,
    framework: string,
    environment: EnvironmentInfo
  ): Promise<PerformanceMeasurement> {
    const measurementId = this.generateMeasurementId();
    const rawValues: number[] = [];
    
    // Perform warmup iterations
    for (let i = 0; i < this.config.warmupIterations; i++) {
      await this.performSingleMeasurement(metricType, templateId, platform, framework);
    }
    
    // Perform actual measurements
    for (let i = 0; i < this.config.iterationCount; i++) {
      const value = await this.performSingleMeasurement(metricType, templateId, platform, framework);
      rawValues.push(value);
    }
    
    // Calculate statistical measures
    const stats = this.calculateStatistics(rawValues);
    
    // Detect outliers
    const outlierCount = this.detectOutliers(rawValues).length;
    
    const measurement: PerformanceMeasurement = {
      id: measurementId,
      timestamp: new Date(),
      metric: metricType,
      value: stats.mean,
      unit: this.getMetricUnit(metricType),
      templateId,
      platform,
      framework,
      environment,
      iterationNumber: this.config.iterationCount,
      totalIterations: this.config.iterationCount,
      rawValues,
      mean: stats.mean,
      median: stats.median,
      standardDeviation: stats.standardDeviation,
      min: stats.min,
      max: stats.max,
      percentile95: stats.percentile95,
      percentile99: stats.percentile99,
      confidence: this.calculateConfidence(rawValues),
      stability: stats.coefficientOfVariation,
      outlierCount
    };
    
    return measurement;
  }

  /**
   * Perform a single measurement
   */
  private async performSingleMeasurement(
    metricType: PerformanceMetricType,
    templateId: string,
    platform: string,
    framework: string
  ): Promise<number> {
    // Mock implementation - real implementation would run actual benchmarks
    switch (metricType) {
      case PerformanceMetricType.BUILD_TIME:
        return this.measureBuildTime(templateId);
        
      case PerformanceMetricType.BUNDLE_SIZE:
        return this.measureBundleSize(templateId);
        
      case PerformanceMetricType.STARTUP_TIME:
        return this.measureStartupTime(templateId, platform);
        
      case PerformanceMetricType.MEMORY_USAGE:
        return this.measureMemoryUsage(templateId, platform);
        
      case PerformanceMetricType.FIRST_CONTENTFUL_PAINT:
        return this.measureFirstContentfulPaint(templateId, platform);
        
      case PerformanceMetricType.LIGHTHOUSE_SCORE:
        return this.measureLighthouseScore(templateId, platform);
        
      default:
        return Math.random() * 1000 + 500; // Mock value
    }
  }

  private async measureBuildTime(templateId: string): Promise<number> {
    // Mock build time measurement (20-60 seconds)
    const baseTime = 30000;
    const variance = 15000;
    return baseTime + (Math.random() - 0.5) * variance;
  }

  private async measureBundleSize(templateId: string): Promise<number> {
    // Mock bundle size measurement (500KB - 2MB)
    const baseSize = 1024 * 1024; // 1MB
    const variance = 512 * 1024;  // ±512KB
    return baseSize + (Math.random() - 0.5) * variance;
  }

  private async measureStartupTime(templateId: string, platform: string): Promise<number> {
    // Mock startup time (1-5 seconds)
    const baseTime = 2000;
    const variance = 1500;
    return baseTime + (Math.random() - 0.5) * variance;
  }

  private async measureMemoryUsage(templateId: string, platform: string): Promise<number> {
    // Mock memory usage (50-200MB)
    const baseMemory = 100 * 1024 * 1024; // 100MB
    const variance = 75 * 1024 * 1024;    // ±75MB
    return baseMemory + (Math.random() - 0.5) * variance;
  }

  private async measureFirstContentfulPaint(templateId: string, platform: string): Promise<number> {
    // Mock FCP (500-2000ms)
    const baseFCP = 1000;
    const variance = 750;
    return baseFCP + (Math.random() - 0.5) * variance;
  }

  private async measureLighthouseScore(templateId: string, platform: string): Promise<number> {
    // Mock Lighthouse score (60-100)
    const baseScore = 80;
    const variance = 20;
    return Math.min(100, Math.max(0, baseScore + (Math.random() - 0.5) * variance));
  }

  /**
   * Analyze regressions
   */
  private async analyzeRegressions(
    measurements: Map<PerformanceMetricType, PerformanceMeasurement>,
    templateId: string
  ): Promise<RegressionAnalysis[]> {
    const regressions: RegressionAnalysis[] = [];
    
    if (!this.baselines.has(templateId)) {
      // No baseline to compare against
      return regressions;
    }
    
    const baselineMeasurements = this.baselines.get(templateId)!;
    
    for (const [metricType, measurement] of measurements) {
      const baselineMeasurement = baselineMeasurements.find(b => b.metric === metricType);
      
      if (!baselineMeasurement) continue;
      
      const regression = await this.analyzeMetricRegression(
        measurement,
        baselineMeasurement,
        metricType
      );
      
      if (regression) {
        regressions.push(regression);
      }
    }
    
    return regressions;
  }

  private async analyzeMetricRegression(
    current: PerformanceMeasurement,
    baseline: PerformanceMeasurement,
    metricType: PerformanceMetricType
  ): Promise<RegressionAnalysis | null> {
    const threshold = this.config.regressionThresholds.get(metricType);
    if (!threshold) return null;
    
    const percentageChange = ((current.value - baseline.value) / baseline.value) * 100;
    const absoluteChange = current.value - baseline.value;
    
    // Determine severity
    let severity: 'info' | 'warning' | 'error' | 'critical' = 'info';
    let thresholdBreached = false;
    let thresholdType: 'percentage' | 'absolute' | 'statistical' | 'trend' = 'percentage';
    
    if (threshold.errorThresholdPercent && Math.abs(percentageChange) >= threshold.errorThresholdPercent) {
      severity = 'error';
      thresholdBreached = true;
    } else if (threshold.warningThresholdPercent && Math.abs(percentageChange) >= threshold.warningThresholdPercent) {
      severity = 'warning';
      thresholdBreached = true;
    }
    
    // Statistical significance test (mock implementation)
    const statisticalSignificance = this.calculateStatisticalSignificance(current, baseline);
    const confidenceInterval = this.calculateConfidenceInterval(current);
    
    const trendDirection = percentageChange > 5 ? 'degrading' : 
                          percentageChange < -5 ? 'improving' : 'stable';
    
    const regression: RegressionAnalysis = {
      metric: metricType,
      severity,
      currentValue: current.value,
      baselineValue: baseline.value,
      percentageChange,
      absoluteChange,
      statisticalSignificance,
      confidenceInterval,
      trendDirection,
      thresholdBreached,
      thresholdType,
      description: this.generateRegressionDescription(metricType, percentageChange, severity),
      recommendation: this.generateRegressionRecommendation(metricType, percentageChange, severity),
      impactAssessment: this.generateImpactAssessment(metricType, percentageChange, severity)
    };
    
    return regression;
  }

  /**
   * Compare with baseline
   */
  private async compareWithBaseline(
    measurements: Map<PerformanceMetricType, PerformanceMeasurement>,
    templateId: string
  ): Promise<BaselineComparison> {
    const baselineId = `baseline_${templateId}`;
    const baselineMeasurements = this.baselines.get(templateId) || [];
    
    const metricComparisons: Map<PerformanceMetricType, MetricComparison> = new Map();
    let improvementCount = 0;
    let regressionCount = 0;
    let stableCount = 0;
    
    for (const [metricType, measurement] of measurements) {
      const baselineMeasurement = baselineMeasurements.find(b => b.metric === metricType);
      
      if (baselineMeasurement) {
        const comparison = this.compareMetricWithBaseline(measurement, baselineMeasurement);
        metricComparisons.set(metricType, comparison);
        
        switch (comparison.status) {
          case 'improved':
            improvementCount++;
            break;
          case 'regressed':
            regressionCount++;
            break;
          case 'stable':
            stableCount++;
            break;
        }
      }
    }
    
    const overallTrend = regressionCount > improvementCount ? 'degrading' :
                        improvementCount > regressionCount ? 'improving' : 'stable';
    
    const overallChangePercent = this.calculateOverallChangePercent(metricComparisons);
    
    return {
      baselineId,
      baselineTimestamp: baselineMeasurements[0]?.timestamp || new Date(),
      comparisonMethod: 'single_point',
      improvementCount,
      regressionCount,
      stableCount,
      overallTrend,
      overallChangePercent,
      metricComparisons
    };
  }

  private compareMetricWithBaseline(
    current: PerformanceMeasurement,
    baseline: PerformanceMeasurement
  ): MetricComparison {
    const changePercent = ((current.value - baseline.value) / baseline.value) * 100;
    const changeAbsolute = current.value - baseline.value;
    
    let status: 'improved' | 'stable' | 'regressed';
    let significance: 'low' | 'medium' | 'high';
    
    if (Math.abs(changePercent) < 5) {
      status = 'stable';
      significance = 'low';
    } else if (changePercent < 0) {
      status = 'improved'; // Lower values are better for most metrics
      significance = Math.abs(changePercent) > 20 ? 'high' : Math.abs(changePercent) > 10 ? 'medium' : 'low';
    } else {
      status = 'regressed';
      significance = changePercent > 20 ? 'high' : changePercent > 10 ? 'medium' : 'low';
    }
    
    return {
      metric: current.metric,
      currentValue: current.value,
      baselineValue: baseline.value,
      changePercent,
      changeAbsolute,
      status,
      significance
    };
  }

  /**
   * Calculate overall assessment
   */
  private calculateOverallAssessment(result: PerformanceBenchmarkResult): void {
    let score = 100;
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    
    // Deduct points for regressions
    for (const regression of result.regressions) {
      switch (regression.severity) {
        case 'critical':
          score -= 50;
          status = 'fail';
          break;
        case 'error':
          score -= 25;
          if (status === 'pass') status = 'fail';
          break;
        case 'warning':
          score -= 10;
          if (status === 'pass') status = 'warning';
          break;
        case 'info':
          score -= 2;
          break;
      }
    }
    
    // Check against performance targets
    for (const [metricType, measurement] of result.measurements) {
      const target = this.config.performanceTargets.get(metricType);
      if (target && measurement.value > target.targetValue) {
        switch (target.priority) {
          case 'critical':
            score -= 30;
            status = 'fail';
            break;
          case 'high':
            score -= 15;
            if (status === 'pass') status = 'warning';
            break;
          case 'medium':
            score -= 8;
            break;
          case 'low':
            score -= 3;
            break;
        }
      }
    }
    
    result.overallScore = Math.max(0, Math.min(100, score));
    result.status = status;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(result: PerformanceBenchmarkResult): string[] {
    const recommendations: string[] = [];
    
    // Add recommendations based on regressions
    for (const regression of result.regressions) {
      recommendations.push(regression.recommendation);
    }
    
    // Add recommendations based on measurements
    for (const [metricType, measurement] of result.measurements) {
      const target = this.config.performanceTargets.get(metricType);
      if (target && measurement.value > target.targetValue) {
        recommendations.push(
          `${this.getMetricDisplayName(metricType)} exceeds target: ` +
          `${measurement.value.toFixed(2)}${measurement.unit} > ${target.targetValue}${target.unit}. ` +
          target.description
        );
      }
    }
    
    // Add general recommendations
    if (result.overallScore < 70) {
      recommendations.push('Consider optimizing build configuration and bundle size');
      recommendations.push('Review performance-critical code paths for optimization opportunities');
    }
    
    return recommendations;
  }

  /**
   * Store historical data
   */
  private async storeHistoricalData(result: PerformanceBenchmarkResult): Promise<void> {
    const historyEntry: PerformanceHistoryEntry = {
      timestamp: result.timestamp,
      templateId: result.templateId,
      measurements: new Map(),
      environment: result.environment
    };
    
    for (const [metricType, measurement] of result.measurements) {
      historyEntry.measurements.set(metricType, measurement.value);
    }
    
    if (!this.performanceHistory.has(result.templateId)) {
      this.performanceHistory.set(result.templateId, []);
    }
    
    const history = this.performanceHistory.get(result.templateId)!;
    history.push(historyEntry);
    
    // Cleanup old entries
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.historicalDataRetentionDays);
    
    this.performanceHistory.set(
      result.templateId,
      history.filter(entry => entry.timestamp >= cutoffDate)
    );
  }

  /**
   * Check for performance alerts
   */
  private async checkPerformanceAlerts(result: PerformanceBenchmarkResult): Promise<void> {
    if (!this.config.enableAlerts) return;
    
    for (const regression of result.regressions) {
      if (regression.severity === 'error' || regression.severity === 'critical') {
        const alert = this.createPerformanceAlert(regression, result);
        this.activeAlerts.set(alert.id, alert);
        
        this.emit('alert:triggered', { alert });
      }
    }
  }

  private createPerformanceAlert(
    regression: RegressionAnalysis,
    result: PerformanceBenchmarkResult
  ): PerformanceAlert {
    const alertId = this.generateAlertId();
    
    return {
      id: alertId,
      timestamp: new Date(),
      severity: regression.severity,
      metric: regression.metric,
      templateId: result.templateId,
      currentValue: regression.currentValue,
      thresholdValue: regression.baselineValue,
      changePercent: regression.percentageChange,
      description: regression.description,
      recommendation: regression.recommendation,
      estimatedImpact: regression.impactAssessment,
      status: 'active'
    };
  }

  // Utility methods

  private async collectEnvironmentInfo(): Promise<EnvironmentInfo> {
    // Mock environment collection
    return {
      platform: process.platform,
      framework: 'mock-framework',
      nodeVersion: process.version,
      osVersion: process.platform,
      cpuInfo: 'Mock CPU Info',
      memoryInfo: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      diskInfo: 'Mock Disk Info',
      ciEnvironment: process.env.CI ? 'true' : 'false'
    };
  }

  private calculateStatistics(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / mean;
    
    const percentile95 = sorted[Math.floor(sorted.length * 0.95)];
    const percentile99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return {
      mean,
      median,
      standardDeviation,
      coefficientOfVariation,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentile95,
      percentile99
    };
  }

  private detectOutliers(values: number[]): number[] {
    const stats = this.calculateStatistics(values);
    const threshold = 2 * stats.standardDeviation;
    
    return values.filter(value => Math.abs(value - stats.mean) > threshold);
  }

  private calculateConfidence(values: number[]): number {
    const stats = this.calculateStatistics(values);
    // Simple confidence calculation based on coefficient of variation
    return Math.max(0, Math.min(1, 1 - stats.coefficientOfVariation));
  }

  private calculateStatisticalSignificance(current: PerformanceMeasurement, baseline: PerformanceMeasurement): number {
    // Mock p-value calculation
    return Math.random() * 0.1; // Always statistically significant in mock
  }

  private calculateConfidenceInterval(measurement: PerformanceMeasurement): [number, number] {
    const margin = measurement.standardDeviation * 1.96; // 95% confidence interval
    return [measurement.mean - margin, measurement.mean + margin];
  }

  private calculateOverallChangePercent(comparisons: Map<PerformanceMetricType, MetricComparison>): number {
    const changes = Array.from(comparisons.values()).map(c => Math.abs(c.changePercent));
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  private getMetricUnit(metricType: PerformanceMetricType): string {
    switch (metricType) {
      case PerformanceMetricType.BUILD_TIME:
      case PerformanceMetricType.STARTUP_TIME:
      case PerformanceMetricType.FIRST_CONTENTFUL_PAINT:
      case PerformanceMetricType.LARGEST_CONTENTFUL_PAINT:
      case PerformanceMetricType.FIRST_INPUT_DELAY:
      case PerformanceMetricType.TIME_TO_INTERACTIVE:
        return 'ms';
      case PerformanceMetricType.BUNDLE_SIZE:
      case PerformanceMetricType.MEMORY_USAGE:
        return 'bytes';
      case PerformanceMetricType.CPU_USAGE:
        return '%';
      case PerformanceMetricType.CUMULATIVE_LAYOUT_SHIFT:
        return 'score';
      case PerformanceMetricType.LIGHTHOUSE_SCORE:
        return 'points';
      default:
        return 'units';
    }
  }

  private getMetricDisplayName(metricType: PerformanceMetricType): string {
    return metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private generateRegressionDescription(metricType: PerformanceMetricType, changePercent: number, severity: string): string {
    const direction = changePercent > 0 ? 'increased' : 'decreased';
    const metricName = this.getMetricDisplayName(metricType);
    return `${metricName} has ${direction} by ${Math.abs(changePercent).toFixed(1)}% (${severity} threshold breached)`;
  }

  private generateRegressionRecommendation(metricType: PerformanceMetricType, changePercent: number, severity: string): string {
    const metricName = this.getMetricDisplayName(metricType);
    
    switch (metricType) {
      case PerformanceMetricType.BUILD_TIME:
        return 'Optimize build configuration, enable caching, or reduce dependency complexity';
      case PerformanceMetricType.BUNDLE_SIZE:
        return 'Implement code splitting, tree shaking, or bundle analysis to reduce size';
      case PerformanceMetricType.MEMORY_USAGE:
        return 'Review memory leaks, optimize data structures, or implement lazy loading';
      case PerformanceMetricType.STARTUP_TIME:
        return 'Optimize application initialization, reduce blocking operations, or implement progressive loading';
      default:
        return `Investigate and optimize ${metricName.toLowerCase()} performance`;
    }
  }

  private generateImpactAssessment(metricType: PerformanceMetricType, changePercent: number, severity: string): string {
    const impact = Math.abs(changePercent);
    
    if (impact > 25) {
      return 'High impact - may significantly affect user experience and application performance';
    } else if (impact > 10) {
      return 'Medium impact - noticeable performance degradation expected';
    } else {
      return 'Low impact - minor performance changes with minimal user-visible effects';
    }
  }

  private generateBenchmarkId(): string {
    return `bench_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMeasurementId(): string {
    return `meas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */

  public getBenchmarkResult(benchmarkId: string): PerformanceBenchmarkResult | undefined {
    return this.benchmarkResults.get(benchmarkId);
  }

  public getAllBenchmarkResults(): PerformanceBenchmarkResult[] {
    return Array.from(this.benchmarkResults.values());
  }

  public getPerformanceHistory(templateId: string): PerformanceHistoryEntry[] {
    return this.performanceHistory.get(templateId) || [];
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'active');
  }

  public setBaseline(templateId: string, measurements: PerformanceMeasurement[]): void {
    this.baselines.set(templateId, measurements);
    this.emit('baseline:updated', { templateId, measurementCount: measurements.length });
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      this.emit('alert:acknowledged', { alertId, acknowledgedBy });
      return true;
    }
    return false;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && (alert.status === 'active' || alert.status === 'acknowledged')) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      this.emit('alert:resolved', { alertId });
      return true;
    }
    return false;
  }
}