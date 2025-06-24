/**
 * @fileoverview Performance Monitoring and Alerting - Epic 6 Story 5 AC5
 * Comprehensive performance monitoring with real-time alerts and analytics
 */

import { EventEmitter } from 'events';
import { SupportedFramework } from '../types';

/**
 * Performance monitoring levels
 */
export enum MonitoringLevel {
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
  DEBUG = 'debug'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Performance metric types
 */
export enum PerformanceMetricType {
  // Core Web Vitals
  FIRST_CONTENTFUL_PAINT = 'first_contentful_paint',
  LARGEST_CONTENTFUL_PAINT = 'largest_contentful_paint',
  FIRST_INPUT_DELAY = 'first_input_delay',
  CUMULATIVE_LAYOUT_SHIFT = 'cumulative_layout_shift',
  
  // Loading metrics
  TIME_TO_FIRST_BYTE = 'time_to_first_byte',
  TIME_TO_INTERACTIVE = 'time_to_interactive',
  SPEED_INDEX = 'speed_index',
  TOTAL_BLOCKING_TIME = 'total_blocking_time',
  
  // Runtime metrics
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  FRAME_RATE = 'frame_rate',
  LONG_TASKS = 'long_tasks',
  
  // Bundle metrics
  BUNDLE_SIZE = 'bundle_size',
  BUILD_TIME = 'build_time',
  CACHE_HIT_RATE = 'cache_hit_rate',
  
  // Network metrics
  REQUEST_COUNT = 'request_count',
  REQUEST_SIZE = 'request_size',
  RESPONSE_TIME = 'response_time',
  ERROR_RATE = 'error_rate',
  
  // User experience metrics
  BOUNCE_RATE = 'bounce_rate',
  SESSION_DURATION = 'session_duration',
  PAGE_VIEWS = 'page_views',
  CONVERSION_RATE = 'conversion_rate'
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  // Monitoring settings
  enabled: boolean;
  level: MonitoringLevel;
  sampleRate: number; // 0-1
  
  // Metrics configuration
  enabledMetrics: PerformanceMetricType[];
  metricThresholds: Map<PerformanceMetricType, MetricThreshold>;
  
  // Real-time monitoring
  realTimeMonitoring: RealTimeMonitoringConfig;
  
  // Alerting configuration
  alerting: AlertingConfig;
  
  // Data collection
  dataCollection: DataCollectionConfig;
  
  // Reporting
  reporting: ReportingConfig;
  
  // Integration settings
  integrations: IntegrationConfig[];
  
  // Framework-specific settings
  frameworkSettings: Map<SupportedFramework, FrameworkMonitoringConfig>;
}

/**
 * Metric threshold configuration
 */
export interface MetricThreshold {
  metric: PerformanceMetricType;
  
  // Threshold values
  warning: number;
  error: number;
  critical: number;
  
  // Evaluation settings
  evaluationWindow: number; // seconds
  evaluationMethod: 'average' | 'median' | 'p95' | 'p99' | 'max';
  minSamples: number;
  
  // Alerting
  enableAlerts: boolean;
  alertCooldown: number; // seconds
}

/**
 * Real-time monitoring configuration
 */
export interface RealTimeMonitoringConfig {
  enabled: boolean;
  updateInterval: number; // milliseconds
  bufferSize: number; // number of samples
  
  // Performance observer
  performanceObserver: boolean;
  observerTypes: string[]; // measure, navigation, resource, paint, etc.
  
  // User timing
  userTiming: boolean;
  markPrefix: string;
  
  // Resource timing
  resourceTiming: boolean;
  resourceTypes: string[]; // script, stylesheet, image, etc.
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  
  // Alert channels
  channels: AlertChannel[];
  
  // Alert rules
  rules: AlertRule[];
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    maxAlertsPerHour: number;
    maxAlertsPerDay: number;
  };
  
  // Escalation
  escalation: {
    enabled: boolean;
    escalationLevels: EscalationLevel[];
  };
}

/**
 * Alert channel
 */
export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'console' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  severityFilter?: AlertSeverity[];
}

/**
 * Alert rule
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  
  // Conditions
  conditions: AlertCondition[];
  logicOperator: 'AND' | 'OR';
  
  // Actions
  severity: AlertSeverity;
  channels: string[];
  
  // Rate limiting
  cooldownPeriod: number; // seconds
  
  // Metadata
  enabled: boolean;
  tags: string[];
}

/**
 * Alert condition
 */
export interface AlertCondition {
  metric: PerformanceMetricType;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: number;
  evaluationWindow: number; // seconds
  evaluationMethod: 'average' | 'median' | 'p95' | 'p99' | 'max' | 'min';
}

/**
 * Escalation level
 */
export interface EscalationLevel {
  level: number;
  delay: number; // seconds
  channels: string[];
  severity: AlertSeverity;
}

/**
 * Data collection configuration
 */
export interface DataCollectionConfig {
  // Storage
  storage: 'memory' | 'local-storage' | 'indexeddb' | 'remote';
  storageConfig: Record<string, any>;
  
  // Data retention
  retentionPeriod: number; // hours
  maxDataPoints: number;
  
  // Compression
  enableCompression: boolean;
  compressionAlgorithm: 'gzip' | 'lz4' | 'none';
  
  // Privacy
  anonymizeData: boolean;
  excludeUserData: boolean;
  respectDoNotTrack: boolean;
}

/**
 * Reporting configuration
 */
export interface ReportingConfig {
  enabled: boolean;
  
  // Report generation
  automaticReports: boolean;
  reportSchedule: ReportSchedule[];
  
  // Report formats
  formats: ReportFormat[];
  
  // Distribution
  distribution: ReportDistribution[];
  
  // Content
  includeMetrics: PerformanceMetricType[];
  includeTrends: boolean;
  includeAlerts: boolean;
  includeRecommendations: boolean;
}

/**
 * Report schedule
 */
export interface ReportSchedule {
  id: string;
  name: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  enabled: boolean;
}

/**
 * Report format
 */
export interface ReportFormat {
  type: 'html' | 'pdf' | 'json' | 'csv' | 'excel';
  template?: string;
  options: Record<string, any>;
}

/**
 * Report distribution
 */
export interface ReportDistribution {
  type: 'email' | 'slack' | 'webhook' | 'file' | 'dashboard';
  config: Record<string, any>;
  schedules: string[]; // Report schedule IDs
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  type: 'google-analytics' | 'new-relic' | 'datadog' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  metricsMapping: Map<PerformanceMetricType, string>;
}

/**
 * Framework monitoring configuration
 */
export interface FrameworkMonitoringConfig {
  framework: SupportedFramework;
  specificMetrics: PerformanceMetricType[];
  customCollectors: CustomCollector[];
  optimizations: MonitoringOptimization[];
}

/**
 * Custom collector
 */
export interface CustomCollector {
  name: string;
  code: string;
  interval: number; // milliseconds
  enabled: boolean;
}

/**
 * Monitoring optimization
 */
export interface MonitoringOptimization {
  name: string;
  description: string;
  config: Record<string, any>;
}

/**
 * Performance data point
 */
export interface PerformanceDataPoint {
  timestamp: number;
  metric: PerformanceMetricType;
  value: number;
  url?: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  rule: string;
  
  // Trigger information
  triggeredBy: PerformanceMetricType;
  currentValue: number;
  thresholdValue: number;
  
  // Context
  url?: string;
  userAgent?: string;
  sessionId?: string;
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedAt?: number;
  
  // Actions taken
  actions: AlertAction[];
}

/**
 * Alert action
 */
export interface AlertAction {
  type: 'notification' | 'escalation' | 'auto-remediation';
  channel: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  id: string;
  timestamp: number;
  period: {
    start: number;
    end: number;
  };
  
  // Metrics summary
  metrics: PerformanceMetricSummary[];
  
  // Trends
  trends: PerformanceTrend[];
  
  // Alerts
  alerts: PerformanceAlert[];
  
  // Recommendations
  recommendations: PerformanceRecommendation[];
  
  // Metadata
  framework: SupportedFramework;
  environment: string;
  version: string;
}

/**
 * Performance metric summary
 */
export interface PerformanceMetricSummary {
  metric: PerformanceMetricType;
  value: number;
  change: number; // percentage change from previous period
  trend: 'improving' | 'stable' | 'degrading';
  samples: number;
  
  // Statistical data
  min: number;
  max: number;
  average: number;
  median: number;
  p95: number;
  p99: number;
}

/**
 * Performance trend
 */
export interface PerformanceTrend {
  metric: PerformanceMetricType;
  direction: 'up' | 'down' | 'stable';
  significance: number; // 0-1
  description: string;
  dataPoints: Array<{ timestamp: number; value: number }>;
}

/**
 * Performance recommendation
 */
export interface PerformanceRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: number;
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceMonitoringConfig;
  private dataPoints: Map<PerformanceMetricType, PerformanceDataPoint[]> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];
  private monitoringIntervals: Map<string, NodeJS.Timer> = new Map();

  constructor(config: PerformanceMonitoringConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize performance monitoring
   */
  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.emit('monitor:initializing');

    // Initialize performance observers
    if (this.config.realTimeMonitoring.performanceObserver) {
      this.initializePerformanceObservers();
    }

    // Start real-time monitoring
    if (this.config.realTimeMonitoring.enabled) {
      this.startRealTimeMonitoring();
    }

    // Start data collection
    this.startDataCollection();

    // Initialize alert system
    this.initializeAlerting();

    this.emit('monitor:initialized');
  }

  /**
   * Start monitoring for a specific project
   */
  public async startMonitoring(
    projectPath: string,
    framework: SupportedFramework
  ): Promise<void> {
    const monitoringId = `${projectPath}_${framework}`;
    
    if (this.monitoringIntervals.has(monitoringId)) {
      return; // Already monitoring
    }

    this.emit('monitoring:started', { projectPath, framework });

    // Collect initial metrics
    await this.collectMetrics(projectPath, framework);

    // Start periodic collection
    const interval = setInterval(async () => {
      await this.collectMetrics(projectPath, framework);
    }, this.config.realTimeMonitoring.updateInterval);

    this.monitoringIntervals.set(monitoringId, interval);
  }

  /**
   * Stop monitoring for a specific project
   */
  public stopMonitoring(projectPath: string, framework: SupportedFramework): void {
    const monitoringId = `${projectPath}_${framework}`;
    const interval = this.monitoringIntervals.get(monitoringId);
    
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(monitoringId);
      this.emit('monitoring:stopped', { projectPath, framework });
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(
    projectPath: string,
    framework: SupportedFramework
  ): Promise<void> {
    const frameworkConfig = this.config.frameworkSettings.get(framework);
    const metricsToCollect = frameworkConfig?.specificMetrics || this.config.enabledMetrics;

    for (const metricType of metricsToCollect) {
      try {
        const value = await this.measureMetric(metricType, projectPath, framework);
        const dataPoint: PerformanceDataPoint = {
          timestamp: Date.now(),
          metric: metricType,
          value,
          metadata: {
            projectPath,
            framework
          }
        };

        this.addDataPoint(dataPoint);
        this.evaluateThresholds(dataPoint);

      } catch (error) {
        this.emit('metric:error', { metricType, error });
      }
    }
  }

  /**
   * Measure specific performance metric
   */
  private async measureMetric(
    metricType: PerformanceMetricType,
    projectPath: string,
    framework: SupportedFramework
  ): Promise<number> {
    // Mock implementation - real implementation would use actual performance APIs
    switch (metricType) {
      case PerformanceMetricType.FIRST_CONTENTFUL_PAINT:
        return Math.random() * 2000 + 500; // 500-2500ms
        
      case PerformanceMetricType.LARGEST_CONTENTFUL_PAINT:
        return Math.random() * 3000 + 1000; // 1000-4000ms
        
      case PerformanceMetricType.FIRST_INPUT_DELAY:
        return Math.random() * 100 + 10; // 10-110ms
        
      case PerformanceMetricType.CUMULATIVE_LAYOUT_SHIFT:
        return Math.random() * 0.3; // 0-0.3
        
      case PerformanceMetricType.MEMORY_USAGE:
        return Math.random() * 100 * 1024 * 1024; // 0-100MB
        
      case PerformanceMetricType.BUNDLE_SIZE:
        return Math.random() * 2 * 1024 * 1024; // 0-2MB
        
      case PerformanceMetricType.BUILD_TIME:
        return Math.random() * 120 + 30; // 30-150 seconds
        
      case PerformanceMetricType.ERROR_RATE:
        return Math.random() * 5; // 0-5%
        
      default:
        return Math.random() * 1000;
    }
  }

  /**
   * Add data point to storage
   */
  private addDataPoint(dataPoint: PerformanceDataPoint): void {
    const metric = dataPoint.metric;
    
    if (!this.dataPoints.has(metric)) {
      this.dataPoints.set(metric, []);
    }
    
    const points = this.dataPoints.get(metric)!;
    points.push(dataPoint);
    
    // Limit buffer size
    const maxPoints = this.config.dataCollection.maxDataPoints;
    if (points.length > maxPoints) {
      points.splice(0, points.length - maxPoints);
    }
    
    this.emit('datapoint:added', dataPoint);
  }

  /**
   * Evaluate metric thresholds for alerting
   */
  private evaluateThresholds(dataPoint: PerformanceDataPoint): void {
    const threshold = this.config.metricThresholds.get(dataPoint.metric);
    if (!threshold || !threshold.enableAlerts) {
      return;
    }

    // Check cooldown
    const cooldownKey = `${dataPoint.metric}_${threshold.warning}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    if (lastAlert && Date.now() - lastAlert < threshold.alertCooldown * 1000) {
      return;
    }

    // Evaluate threshold
    const recentPoints = this.getRecentDataPoints(
      dataPoint.metric,
      threshold.evaluationWindow * 1000
    );

    if (recentPoints.length < threshold.minSamples) {
      return;
    }

    const evaluatedValue = this.evaluateMetricValue(
      recentPoints,
      threshold.evaluationMethod
    );

    let severity: AlertSeverity | null = null;
    let thresholdValue: number;

    if (evaluatedValue >= threshold.critical) {
      severity = AlertSeverity.CRITICAL;
      thresholdValue = threshold.critical;
    } else if (evaluatedValue >= threshold.error) {
      severity = AlertSeverity.ERROR;
      thresholdValue = threshold.error;
    } else if (evaluatedValue >= threshold.warning) {
      severity = AlertSeverity.WARNING;
      thresholdValue = threshold.warning;
    }

    if (severity) {
      this.triggerAlert(dataPoint, severity, thresholdValue, evaluatedValue);
      this.alertCooldowns.set(cooldownKey, Date.now());
    }
  }

  /**
   * Get recent data points for a metric
   */
  private getRecentDataPoints(
    metric: PerformanceMetricType,
    timeWindow: number
  ): PerformanceDataPoint[] {
    const points = this.dataPoints.get(metric) || [];
    const cutoff = Date.now() - timeWindow;
    
    return points.filter(point => point.timestamp >= cutoff);
  }

  /**
   * Evaluate metric value using specified method
   */
  private evaluateMetricValue(
    points: PerformanceDataPoint[],
    method: 'average' | 'median' | 'p95' | 'p99' | 'max'
  ): number {
    const values = points.map(p => p.value).sort((a, b) => a - b);
    
    switch (method) {
      case 'average':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
        
      case 'median':
        const mid = Math.floor(values.length / 2);
        return values.length % 2 === 0
          ? (values[mid - 1] + values[mid]) / 2
          : values[mid];
          
      case 'p95':
        const p95Index = Math.floor(values.length * 0.95);
        return values[p95Index];
        
      case 'p99':
        const p99Index = Math.floor(values.length * 0.99);
        return values[p99Index];
        
      case 'max':
        return Math.max(...values);
        
      default:
        return values[values.length - 1]; // Most recent
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(
    dataPoint: PerformanceDataPoint,
    severity: AlertSeverity,
    thresholdValue: number,
    currentValue: number
  ): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      severity,
      rule: `threshold_${dataPoint.metric}`,
      triggeredBy: dataPoint.metric,
      currentValue,
      thresholdValue,
      url: dataPoint.url,
      userAgent: dataPoint.userAgent,
      sessionId: dataPoint.sessionId,
      status: 'active',
      actions: []
    };

    this.activeAlerts.set(alert.id, alert);

    // Find matching alert rules
    const matchingRules = this.config.alerting.rules.filter(rule =>
      rule.enabled && this.evaluateAlertRule(rule, dataPoint, currentValue)
    );

    // Send alerts through configured channels
    for (const rule of matchingRules) {
      this.sendAlert(alert, rule);
    }

    this.emit('alert:triggered', alert);
  }

  /**
   * Evaluate alert rule
   */
  private evaluateAlertRule(
    rule: AlertRule,
    dataPoint: PerformanceDataPoint,
    currentValue: number
  ): boolean {
    const conditions = rule.conditions.filter(condition =>
      condition.metric === dataPoint.metric
    );

    if (conditions.length === 0) {
      return false;
    }

    const results = conditions.map(condition => {
      switch (condition.operator) {
        case 'gt': return currentValue > condition.value;
        case 'gte': return currentValue >= condition.value;
        case 'lt': return currentValue < condition.value;
        case 'lte': return currentValue <= condition.value;
        case 'eq': return currentValue === condition.value;
        case 'neq': return currentValue !== condition.value;
        default: return false;
      }
    });

    return rule.logicOperator === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: PerformanceAlert, rule: AlertRule): Promise<void> {
    for (const channelId of rule.channels) {
      const channel = this.config.alerting.channels.find(c => c.id === channelId);
      if (!channel || !channel.enabled) {
        continue;
      }

      // Check severity filter
      if (channel.severityFilter && !channel.severityFilter.includes(alert.severity)) {
        continue;
      }

      try {
        await this.sendAlertToChannel(alert, channel);
        
        alert.actions.push({
          type: 'notification',
          channel: channelId,
          timestamp: Date.now(),
          success: true
        });
        
      } catch (error) {
        alert.actions.push({
          type: 'notification',
          channel: channelId,
          timestamp: Date.now(),
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlertToChannel(
    alert: PerformanceAlert,
    channel: AlertChannel
  ): Promise<void> {
    switch (channel.type) {
      case 'console':
        console.warn(`[PERFORMANCE ALERT] ${alert.severity.toUpperCase()}: ${alert.triggeredBy} = ${alert.currentValue} (threshold: ${alert.thresholdValue})`);
        break;
        
      case 'webhook':
        if (channel.config.url) {
          const response = await fetch(channel.config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
          });
          
          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
          }
        }
        break;
        
      case 'email':
        // Mock email sending
        console.log(`Email alert sent to ${channel.config.recipients}: ${alert.severity} - ${alert.triggeredBy}`);
        break;
        
      case 'slack':
        // Mock Slack notification
        console.log(`Slack alert sent to ${channel.config.channel}: ${alert.severity} - ${alert.triggeredBy}`);
        break;
        
      default:
        console.log(`Alert sent via ${channel.type}:`, alert);
    }
  }

  /**
   * Initialize performance observers
   */
  private initializePerformanceObservers(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return; // Not available in this environment
    }

    const observerTypes = this.config.realTimeMonitoring.observerTypes;

    for (const type of observerTypes) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handlePerformanceEntry(entry, type);
          }
        });

        observer.observe({ entryTypes: [type] });
        this.observers.push(observer);
        
      } catch (error) {
        console.warn(`Failed to create PerformanceObserver for ${type}:`, error);
      }
    }
  }

  /**
   * Handle performance observer entry
   */
  private handlePerformanceEntry(entry: PerformanceEntry, type: string): void {
    let metricType: PerformanceMetricType | null = null;
    let value: number = 0;

    switch (type) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          metricType = PerformanceMetricType.FIRST_CONTENTFUL_PAINT;
          value = entry.startTime;
        }
        break;
        
      case 'largest-contentful-paint':
        metricType = PerformanceMetricType.LARGEST_CONTENTFUL_PAINT;
        value = entry.startTime;
        break;
        
      case 'layout-shift':
        metricType = PerformanceMetricType.CUMULATIVE_LAYOUT_SHIFT;
        value = (entry as any).value;
        break;
        
      case 'longtask':
        metricType = PerformanceMetricType.LONG_TASKS;
        value = entry.duration;
        break;
    }

    if (metricType) {
      const dataPoint: PerformanceDataPoint = {
        timestamp: Date.now(),
        metric: metricType,
        value,
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      this.addDataPoint(dataPoint);
      this.evaluateThresholds(dataPoint);
    }
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    // Monitor memory usage
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      const memoryInterval = setInterval(() => {
        const memory = (window.performance as any).memory;
        const dataPoint: PerformanceDataPoint = {
          timestamp: Date.now(),
          metric: PerformanceMetricType.MEMORY_USAGE,
          value: memory.usedJSHeapSize
        };
        
        this.addDataPoint(dataPoint);
        this.evaluateThresholds(dataPoint);
      }, this.config.realTimeMonitoring.updateInterval);

      this.monitoringIntervals.set('memory', memoryInterval);
    }

    // Monitor frame rate
    if (typeof requestAnimationFrame !== 'undefined') {
      let lastTime = Date.now();
      let frameCount = 0;
      
      const frameMonitor = () => {
        frameCount++;
        const currentTime = Date.now();
        
        if (currentTime - lastTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
          
          const dataPoint: PerformanceDataPoint = {
            timestamp: currentTime,
            metric: PerformanceMetricType.FRAME_RATE,
            value: fps
          };
          
          this.addDataPoint(dataPoint);
          this.evaluateThresholds(dataPoint);
          
          frameCount = 0;
          lastTime = currentTime;
        }
        
        requestAnimationFrame(frameMonitor);
      };
      
      requestAnimationFrame(frameMonitor);
    }
  }

  /**
   * Start data collection
   */
  private startDataCollection(): void {
    // Cleanup old data periodically
    const cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60000); // Every minute

    this.monitoringIntervals.set('cleanup', cleanupInterval);
  }

  /**
   * Initialize alerting system
   */
  private initializeAlerting(): void {
    // Start alert cleanup
    const alertCleanupInterval = setInterval(() => {
      this.cleanupResolvedAlerts();
    }, 300000); // Every 5 minutes

    this.monitoringIntervals.set('alert-cleanup', alertCleanupInterval);
  }

  /**
   * Cleanup old data based on retention policy
   */
  private cleanupOldData(): void {
    const retentionPeriod = this.config.dataCollection.retentionPeriod * 60 * 60 * 1000; // Convert to ms
    const cutoff = Date.now() - retentionPeriod;

    for (const [metric, points] of this.dataPoints.entries()) {
      const filteredPoints = points.filter(point => point.timestamp >= cutoff);
      this.dataPoints.set(metric, filteredPoints);
    }
  }

  /**
   * Cleanup resolved alerts
   */
  private cleanupResolvedAlerts(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt && alert.resolvedAt < oneDayAgo) {
        this.activeAlerts.delete(alertId);
      }
    }
  }

  /**
   * Generate performance report
   */
  public generateReport(
    framework: SupportedFramework,
    period: { start: number; end: number }
  ): PerformanceReport {
    const reportId = this.generateReportId();
    
    // Generate metric summaries
    const metrics: PerformanceMetricSummary[] = [];
    for (const metricType of this.config.enabledMetrics) {
      const summary = this.generateMetricSummary(metricType, period);
      if (summary) {
        metrics.push(summary);
      }
    }

    // Generate trends
    const trends = this.generateTrends(period);

    // Get alerts from period
    const alerts = Array.from(this.activeAlerts.values()).filter(
      alert => alert.timestamp >= period.start && alert.timestamp <= period.end
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, alerts);

    return {
      id: reportId,
      timestamp: Date.now(),
      period,
      metrics,
      trends,
      alerts,
      recommendations,
      framework,
      environment: 'production',
      version: '1.0.0'
    };
  }

  /**
   * Generate metric summary
   */
  private generateMetricSummary(
    metricType: PerformanceMetricType,
    period: { start: number; end: number }
  ): PerformanceMetricSummary | null {
    const points = this.dataPoints.get(metricType) || [];
    const periodPoints = points.filter(
      point => point.timestamp >= period.start && point.timestamp <= period.end
    );

    if (periodPoints.length === 0) {
      return null;
    }

    const values = periodPoints.map(p => p.value).sort((a, b) => a - b);
    const sum = values.reduce((total, val) => total + val, 0);

    return {
      metric: metricType,
      value: values[values.length - 1], // Most recent value
      change: 0, // TODO: Calculate change from previous period
      trend: 'stable', // TODO: Calculate trend
      samples: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      average: sum / values.length,
      median: values[Math.floor(values.length / 2)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    };
  }

  /**
   * Generate performance trends
   */
  private generateTrends(period: { start: number; end: number }): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];

    for (const metricType of this.config.enabledMetrics) {
      const points = this.dataPoints.get(metricType) || [];
      const periodPoints = points.filter(
        point => point.timestamp >= period.start && point.timestamp <= period.end
      );

      if (periodPoints.length >= 10) { // Need enough data for trend analysis
        const trend = this.analyzeTrend(metricType, periodPoints);
        trends.push(trend);
      }
    }

    return trends;
  }

  /**
   * Analyze trend for a metric
   */
  private analyzeTrend(
    metricType: PerformanceMetricType,
    points: PerformanceDataPoint[]
  ): PerformanceTrend {
    const dataPoints = points.map(p => ({ timestamp: p.timestamp, value: p.value }));
    
    // Simple linear regression to determine trend
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.timestamp, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.value, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.timestamp * p.value, 0);
    const sumXX = dataPoints.reduce((sum, p) => sum + p.timestamp * p.timestamp, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(slope) < 0.001) {
      direction = 'stable';
    } else {
      direction = slope > 0 ? 'up' : 'down';
    }

    return {
      metric: metricType,
      direction,
      significance: Math.min(Math.abs(slope) * 1000, 1), // Normalize significance
      description: `${metricType} is trending ${direction}`,
      dataPoints
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetricSummary[],
    alerts: PerformanceAlert[]
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Analyze metrics for recommendations
    for (const metric of metrics) {
      if (metric.metric === PerformanceMetricType.FIRST_CONTENTFUL_PAINT && metric.average > 2000) {
        recommendations.push({
          id: 'improve-fcp',
          priority: 'high',
          category: 'loading',
          title: 'Improve First Contentful Paint',
          description: `FCP is averaging ${metric.average.toFixed(0)}ms, which exceeds the recommended 1.8s`,
          impact: 'Better user experience and SEO rankings',
          implementation: 'Optimize critical rendering path and reduce render-blocking resources',
          estimatedImprovement: 30
        });
      }

      if (metric.metric === PerformanceMetricType.BUNDLE_SIZE && metric.average > 1024 * 1024) {
        recommendations.push({
          id: 'reduce-bundle-size',
          priority: 'medium',
          category: 'optimization',
          title: 'Reduce Bundle Size',
          description: `Bundle size is averaging ${(metric.average / 1024 / 1024).toFixed(1)}MB`,
          impact: 'Faster loading times and reduced bandwidth usage',
          implementation: 'Implement code splitting and tree shaking',
          estimatedImprovement: 25
        });
      }
    }

    // Analyze alerts for recommendations
    const criticalAlerts = alerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    if (criticalAlerts.length > 0) {
      recommendations.push({
        id: 'address-critical-alerts',
        priority: 'high',
        category: 'reliability',
        title: 'Address Critical Performance Alerts',
        description: `${criticalAlerts.length} critical performance alerts detected`,
        impact: 'Improved system reliability and user experience',
        implementation: 'Investigate and resolve the root causes of critical alerts',
        estimatedImprovement: 40
      });
    }

    return recommendations;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */

  public getMetricData(metric: PerformanceMetricType): PerformanceDataPoint[] {
    return this.dataPoints.get(metric) || [];
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'active');
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && (alert.status === 'active' || alert.status === 'acknowledged')) {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      this.emit('alert:resolved', alert);
      return true;
    }
    return false;
  }

  public async destroy(): Promise<void> {
    // Stop all monitoring intervals
    for (const [id, interval] of this.monitoringIntervals.entries()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    // Disconnect performance observers
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers.length = 0;

    // Clear data
    this.dataPoints.clear();
    this.activeAlerts.clear();
    this.alertCooldowns.clear();

    this.emit('monitor:destroyed');
  }
}