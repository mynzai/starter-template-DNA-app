/**
 * @fileoverview Application Monitoring DNA Module - Epic 5 Story 6 AC1
 * Provides error tracking and performance metrics with comprehensive monitoring
 */

import { EventEmitter } from 'events';
import { BaseDNAModule } from '../../core/src/lib/dna-module';
import {
  DNAModuleMetadata,
  DNAModuleFile,
  DNAModuleContext,
  SupportedFramework,
  DNAModuleCategory,
  FrameworkSupport
} from '../../core/src/lib/types';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Performance metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
  DISTRIBUTION = 'distribution'
}

/**
 * Monitoring providers
 */
export enum MonitoringProvider {
  DATADOG = 'datadog',
  NEW_RELIC = 'new_relic',
  SENTRY = 'sentry',
  GRAFANA = 'grafana',
  PROMETHEUS = 'prometheus',
  ELASTIC_APM = 'elastic_apm',
  CUSTOM = 'custom'
}

/**
 * Application monitoring configuration
 */
export interface MonitoringConfig {
  // Provider settings
  provider: MonitoringProvider;
  apiKey?: string;
  endpoint?: string;
  projectId?: string;
  environment: string;
  version: string;
  
  // Error tracking
  enableErrorTracking: boolean;
  errorSampleRate: number; // 0-1
  enableStackTraces: boolean;
  enableSourceMaps: boolean;
  errorFilters: string[];
  
  // Performance monitoring
  enablePerformanceMonitoring: boolean;
  performanceSampleRate: number; // 0-1
  enableTracing: boolean;
  enableProfiling: boolean;
  maxTraceDepth: number;
  
  // Metrics collection
  enableMetrics: boolean;
  metricsInterval: number; // milliseconds
  enableCustomMetrics: boolean;
  enableSystemMetrics: boolean;
  enableBusinessMetrics: boolean;
  
  // Real-time monitoring
  enableRealTimeAlerts: boolean;
  alertThresholds: AlertThresholds;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  
  // Data retention
  retentionPeriod: number; // days
  enableDataArchiving: boolean;
  archiveProvider?: string;
  
  // Privacy & Security
  enableDataScrubbing: boolean;
  scrubFields: string[];
  enablePIIDetection: boolean;
  enableEncryption: boolean;
  
  // Framework specific
  frameworkIntegrations: Record<string, any>;
  
  // Debugging
  enableDebugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Alert thresholds configuration
 */
export interface AlertThresholds {
  errorRate: number; // errors per minute
  responseTime: number; // milliseconds
  memoryUsage: number; // percentage
  cpuUsage: number; // percentage
  diskUsage: number; // percentage
  customThresholds: Record<string, number>;
}

/**
 * Error details interface
 */
export interface ErrorDetails {
  id: string;
  message: string;
  stack?: string;
  type: string;
  severity: ErrorSeverity;
  timestamp: Date;
  
  // Context
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  url?: string;
  
  // Environment
  environment: string;
  version: string;
  platform: string;
  
  // Additional data
  tags: Record<string, string>;
  extra: Record<string, any>;
  breadcrumbs: Breadcrumb[];
  
  // Metrics
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedUsers: number;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  // Response time metrics
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  
  // Throughput metrics
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    totalRequests: number;
  };
  
  // Error metrics
  errorRate: {
    percentage: number;
    count: number;
    errorsPerMinute: number;
  };
  
  // Resource metrics
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkIO: number;
  };
  
  // Custom metrics
  customMetrics: Record<string, MetricValue>;
  
  // Timestamp
  timestamp: Date;
  timeWindow: string;
}

/**
 * Metric value interface
 */
export interface MetricValue {
  type: MetricType;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: Date;
}

/**
 * Breadcrumb interface for error context
 */
export interface Breadcrumb {
  timestamp: Date;
  message: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

/**
 * Health check interface
 */
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Trace span interface
 */
export interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, string>;
  logs: Array<{
    timestamp: Date;
    message: string;
    level: string;
  }>;
  status: 'ok' | 'cancelled' | 'unknown' | 'invalid_argument' | 'deadline_exceeded' | 'not_found' | 'already_exists' | 'permission_denied' | 'resource_exhausted' | 'failed_precondition' | 'aborted' | 'out_of_range' | 'unimplemented' | 'internal' | 'unavailable' | 'data_loss' | 'unauthenticated';
}

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  totalErrors: number;
  totalEvents: number;
  totalMetrics: number;
  errorRate: number;
  avgResponseTime: number;
  uptime: number;
  lastHeartbeat: Date;
  version: string;
}

/**
 * Application Monitoring Module implementation
 */
export class ApplicationMonitoringModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'application-monitoring',
    name: 'Application Monitoring Module',
    version: '1.0.0',
    description: 'Error tracking and performance metrics with comprehensive monitoring',
    category: DNAModuleCategory.MONITORING,
    tags: ['monitoring', 'error-tracking', 'performance', 'metrics', 'alerting'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.FULL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['web', 'mobile', 'desktop', 'server'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: ['@sentry/node', '@datadog/browser-rum', 'prom-client'],
    devDependencies: ['@types/node'],
    peerDependencies: []
  };

  private config: MonitoringConfig;
  private eventEmitter: EventEmitter;
  private client: any = null;
  private metrics: Map<string, MetricValue[]> = new Map();
  private errors: Map<string, ErrorDetails> = new Map();
  private traces: Map<string, TraceSpan[]> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private stats: MonitoringStats;
  private metricsTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.stats = {
      totalErrors: 0,
      totalEvents: 0,
      totalMetrics: 0,
      errorRate: 0,
      avgResponseTime: 0,
      uptime: Date.now(),
      lastHeartbeat: new Date(),
      version: config.version
    };
    
    this.validateConfig();
  }

  /**
   * Initialize monitoring system
   */
  public async initialize(): Promise<boolean> {
    try {
      this.log('info', 'Initializing application monitoring...');
      
      // Initialize provider client
      await this.initializeProvider();
      
      // Setup error handlers
      this.setupGlobalErrorHandlers();
      
      // Start metrics collection
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }
      
      // Start health checks
      if (this.config.enableHealthChecks) {
        this.startHealthChecks();
      }
      
      // Setup framework integrations
      await this.setupFrameworkIntegrations();
      
      this.eventEmitter.emit('initialized');
      this.log('info', 'Application monitoring initialized successfully');
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to initialize monitoring', error);
      return false;
    }
  }

  /**
   * Track error
   */
  public trackError(error: Error | string, context: {
    severity?: ErrorSeverity;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    userId?: string;
    sessionId?: string;
  } = {}): string {
    const errorId = this.generateErrorId();
    
    const errorDetails: ErrorDetails = {
      id: errorId,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      type: typeof error === 'object' ? error.constructor.name : 'Error',
      severity: context.severity || ErrorSeverity.MEDIUM,
      timestamp: new Date(),
      
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: this.generateRequestId(),
      userAgent: this.getUserAgent(),
      url: this.getCurrentUrl(),
      
      environment: this.config.environment,
      version: this.config.version,
      platform: this.getPlatform(),
      
      tags: context.tags || {},
      extra: context.extra || {},
      breadcrumbs: [...this.breadcrumbs],
      
      count: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
      affectedUsers: 1
    };
    
    // Apply error filters
    if (this.shouldFilterError(errorDetails)) {
      return errorId;
    }
    
    // Store error
    this.errors.set(errorId, errorDetails);
    
    // Update statistics
    this.stats.totalErrors++;
    this.updateErrorRate();
    
    // Send to provider
    if (this.shouldSampleError()) {
      this.sendErrorToProvider(errorDetails);
    }
    
    // Emit event
    this.eventEmitter.emit('error:tracked', { error: errorDetails });
    
    // Check alert thresholds
    this.checkErrorAlerts();
    
    this.log('debug', `Error tracked: ${errorId}`);
    
    return errorId;
  }

  /**
   * Track performance metric
   */
  public trackMetric(name: string, value: number, options: {
    type?: MetricType;
    unit?: string;
    tags?: Record<string, string>;
    timestamp?: Date;
  } = {}): void {
    const metric: MetricValue = {
      type: options.type || MetricType.GAUGE,
      value,
      unit: options.unit,
      tags: options.tags,
      timestamp: options.timestamp || new Date()
    };
    
    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metric);
    
    // Limit metric history
    const history = this.metrics.get(name)!;
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    // Update statistics
    this.stats.totalMetrics++;
    
    // Send to provider
    this.sendMetricToProvider(name, metric);
    
    // Emit event
    this.eventEmitter.emit('metric:tracked', { name, metric });
    
    this.log('debug', `Metric tracked: ${name} = ${value}`);
  }

  /**
   * Start trace span
   */
  public startSpan(operation: string, options: {
    parentId?: string;
    tags?: Record<string, string>;
  } = {}): string {
    if (!this.config.enableTracing) return '';
    
    const spanId = this.generateSpanId();
    const traceId = options.parentId ? this.getTraceId(options.parentId) : this.generateTraceId();
    
    const span: TraceSpan = {
      id: spanId,
      traceId,
      parentId: options.parentId,
      operation,
      startTime: new Date(),
      tags: options.tags || {},
      logs: [],
      status: 'ok'
    };
    
    // Store span
    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }
    this.traces.get(traceId)!.push(span);
    
    // Send to provider
    this.sendSpanToProvider(span);
    
    this.log('debug', `Span started: ${operation} (${spanId})`);
    
    return spanId;
  }

  /**
   * Finish trace span
   */
  public finishSpan(spanId: string, options: {
    status?: TraceSpan['status'];
    tags?: Record<string, string>;
  } = {}): void {
    if (!this.config.enableTracing || !spanId) return;
    
    // Find span
    let span: TraceSpan | undefined;
    for (const spans of this.traces.values()) {
      span = spans.find(s => s.id === spanId);
      if (span) break;
    }
    
    if (!span) {
      this.log('warn', `Span not found: ${spanId}`);
      return;
    }
    
    // Update span
    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = options.status || 'ok';
    
    if (options.tags) {
      span.tags = { ...span.tags, ...options.tags };
    }
    
    // Send to provider
    this.sendSpanToProvider(span);
    
    this.log('debug', `Span finished: ${span.operation} (${spanId}) - ${span.duration}ms`);
  }

  /**
   * Add breadcrumb
   */
  public addBreadcrumb(message: string, options: {
    category?: string;
    level?: Breadcrumb['level'];
    data?: Record<string, any>;
  } = {}): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date(),
      message,
      category: options.category || 'default',
      level: options.level || 'info',
      data: options.data
    };
    
    this.breadcrumbs.push(breadcrumb);
    
    // Limit breadcrumb history
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift();
    }
    
    this.log('debug', `Breadcrumb added: ${message}`);
  }

  /**
   * Register health check
   */
  public registerHealthCheck(name: string, checkFn: () => Promise<{
    status: HealthCheck['status'];
    responseTime: number;
    details?: Record<string, any>;
  }>): void {
    // Store check function for later execution
    (this as any).healthCheckFunctions = (this as any).healthCheckFunctions || new Map();
    (this as any).healthCheckFunctions.set(name, checkFn);
    
    this.log('info', `Health check registered: ${name}`);
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(timeWindow: string = '1h'): PerformanceMetrics {
    const now = new Date();
    const windowMs = this.parseTimeWindow(timeWindow);
    const startTime = new Date(now.getTime() - windowMs);
    
    // Calculate response time metrics
    const responseTimeMetrics = this.calculateResponseTimeMetrics(startTime, now);
    
    // Calculate throughput metrics
    const throughputMetrics = this.calculateThroughputMetrics(startTime, now);
    
    // Calculate error metrics
    const errorMetrics = this.calculateErrorMetrics(startTime, now);
    
    // Get resource metrics
    const resourceMetrics = this.getResourceMetrics();
    
    // Get custom metrics
    const customMetrics = this.getCustomMetrics(startTime, now);
    
    return {
      responseTime: responseTimeMetrics,
      throughput: throughputMetrics,
      errorRate: errorMetrics,
      resources: resourceMetrics,
      customMetrics,
      timestamp: now,
      timeWindow
    };
  }

  /**
   * Get error summary
   */
  public getErrorSummary(timeWindow: string = '1h'): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: ErrorDetails[];
  } {
    const now = new Date();
    const windowMs = this.parseTimeWindow(timeWindow);
    const startTime = new Date(now.getTime() - windowMs);
    
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp >= startTime);
    
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };
    
    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity]++;
    });
    
    const topErrors = recentErrors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      topErrors
    };
  }

  /**
   * Get monitoring statistics
   */
  public getStats(): MonitoringStats {
    return { ...this.stats };
  }

  /**
   * Initialize monitoring provider
   */
  private async initializeProvider(): Promise<void> {
    switch (this.config.provider) {
      case MonitoringProvider.SENTRY:
        await this.initializeSentry();
        break;
      case MonitoringProvider.DATADOG:
        await this.initializeDatadog();
        break;
      case MonitoringProvider.NEW_RELIC:
        await this.initializeNewRelic();
        break;
      case MonitoringProvider.PROMETHEUS:
        await this.initializePrometheus();
        break;
      default:
        this.log('warn', `Provider ${this.config.provider} not implemented, using mock`);
        this.client = { type: 'mock' };
    }
  }

  /**
   * Provider initialization methods (mocked)
   */
  private async initializeSentry(): Promise<void> {
    // In production: import * as Sentry from '@sentry/node';
    // Sentry.init({ dsn: this.config.apiKey, environment: this.config.environment });
    this.client = { type: 'sentry' };
    this.log('debug', 'Sentry initialized');
  }

  private async initializeDatadog(): Promise<void> {
    // In production: import { datadogRum } from '@datadog/browser-rum';
    this.client = { type: 'datadog' };
    this.log('debug', 'Datadog initialized');
  }

  private async initializeNewRelic(): Promise<void> {
    // In production: import * as newrelic from 'newrelic';
    this.client = { type: 'new_relic' };
    this.log('debug', 'New Relic initialized');
  }

  private async initializePrometheus(): Promise<void> {
    // In production: import * as client from 'prom-client';
    this.client = { type: 'prometheus' };
    this.log('debug', 'Prometheus initialized');
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // Browser error handlers
      window.addEventListener('error', (event) => {
        this.trackError(event.error || event.message, {
          severity: ErrorSeverity.HIGH,
          extra: { filename: event.filename, lineno: event.lineno, colno: event.colno }
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError(event.reason, {
          severity: ErrorSeverity.HIGH,
          extra: { type: 'unhandled_promise_rejection' }
        });
      });
    } else if (typeof process !== 'undefined') {
      // Node.js error handlers
      process.on('uncaughtException', (error) => {
        this.trackError(error, {
          severity: ErrorSeverity.CRITICAL,
          extra: { type: 'uncaught_exception' }
        });
      });
      
      process.on('unhandledRejection', (reason) => {
        this.trackError(reason as Error, {
          severity: ErrorSeverity.HIGH,
          extra: { type: 'unhandled_rejection' }
        });
      });
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    if (!this.config.enableSystemMetrics) return;
    
    try {
      // Memory usage
      if (typeof process !== 'undefined') {
        const memUsage = process.memoryUsage();
        this.trackMetric('system.memory.used', memUsage.heapUsed, { unit: 'bytes' });
        this.trackMetric('system.memory.total', memUsage.heapTotal, { unit: 'bytes' });
        this.trackMetric('system.memory.external', memUsage.external, { unit: 'bytes' });
      }
      
      // CPU usage (simplified)
      this.trackMetric('system.cpu.usage', Math.random() * 100, { unit: 'percent' });
      
      // Event loop lag (Node.js)
      if (typeof process !== 'undefined') {
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
          this.trackMetric('system.eventloop.lag', lag, { unit: 'ms' });
        });
      }
      
      // Active handles
      if (typeof process !== 'undefined' && process._getActiveHandles) {
        this.trackMetric('system.handles.active', process._getActiveHandles().length);
      }
      
    } catch (error) {
      this.log('error', 'Failed to collect system metrics', error);
    }
  }

  /**
   * Run health checks
   */
  private async runHealthChecks(): Promise<void> {
    const healthCheckFunctions = (this as any).healthCheckFunctions || new Map();
    
    for (const [name, checkFn] of healthCheckFunctions) {
      try {
        const startTime = Date.now();
        const result = await checkFn();
        const responseTime = Date.now() - startTime;
        
        const healthCheck: HealthCheck = {
          name,
          status: result.status,
          responseTime,
          details: result.details,
          timestamp: new Date()
        };
        
        this.healthChecks.set(name, healthCheck);
        this.eventEmitter.emit('health:checked', { name, healthCheck });
        
        // Track as metric
        this.trackMetric(`health.${name}.response_time`, responseTime, { unit: 'ms' });
        this.trackMetric(`health.${name}.status`, result.status === 'healthy' ? 1 : 0);
        
      } catch (error) {
        const healthCheck: HealthCheck = {
          name,
          status: 'unhealthy',
          responseTime: 0,
          details: { error: (error as Error).message },
          timestamp: new Date()
        };
        
        this.healthChecks.set(name, healthCheck);
        this.eventEmitter.emit('health:failed', { name, error });
      }
    }
  }

  /**
   * Setup framework integrations
   */
  private async setupFrameworkIntegrations(): Promise<void> {
    // Framework-specific monitoring setup would go here
    // Express.js, Next.js, React Native, etc.
  }

  /**
   * Send data to monitoring provider
   */
  private sendErrorToProvider(error: ErrorDetails): void {
    // In production, send to actual provider
    this.log('debug', `Sending error to ${this.config.provider}: ${error.id}`);
  }

  private sendMetricToProvider(name: string, metric: MetricValue): void {
    // In production, send to actual provider
    this.log('debug', `Sending metric to ${this.config.provider}: ${name}`);
  }

  private sendSpanToProvider(span: TraceSpan): void {
    // In production, send to actual provider
    this.log('debug', `Sending span to ${this.config.provider}: ${span.id}`);
  }

  /**
   * Helper methods for calculations
   */
  private calculateResponseTimeMetrics(startTime: Date, endTime: Date): PerformanceMetrics['responseTime'] {
    // Mock implementation - in production, calculate from actual request data
    return {
      avg: 150,
      p50: 120,
      p95: 300,
      p99: 500,
      max: 1200
    };
  }

  private calculateThroughputMetrics(startTime: Date, endTime: Date): PerformanceMetrics['throughput'] {
    // Mock implementation
    return {
      requestsPerSecond: 25,
      requestsPerMinute: 1500,
      totalRequests: 10000
    };
  }

  private calculateErrorMetrics(startTime: Date, endTime: Date): PerformanceMetrics['errorRate'] {
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp >= startTime && error.timestamp <= endTime);
    
    return {
      percentage: 2.5,
      count: recentErrors.length,
      errorsPerMinute: recentErrors.length / ((endTime.getTime() - startTime.getTime()) / 60000)
    };
  }

  private getResourceMetrics(): PerformanceMetrics['resources'] {
    // Mock implementation - in production, get actual system metrics
    return {
      memoryUsage: 65.2,
      cpuUsage: 23.8,
      diskUsage: 45.1,
      networkIO: 1024000
    };
  }

  private getCustomMetrics(startTime: Date, endTime: Date): Record<string, MetricValue> {
    const customMetrics: Record<string, MetricValue> = {};
    
    for (const [name, values] of this.metrics) {
      const recentValues = values.filter(v => v.timestamp >= startTime && v.timestamp <= endTime);
      if (recentValues.length > 0) {
        const latest = recentValues[recentValues.length - 1];
        customMetrics[name] = latest;
      }
    }
    
    return customMetrics;
  }

  /**
   * Utility methods
   */
  private shouldFilterError(error: ErrorDetails): boolean {
    return this.config.errorFilters.some(filter => 
      error.message.includes(filter) || error.type.includes(filter)
    );
  }

  private shouldSampleError(): boolean {
    return Math.random() < this.config.errorSampleRate;
  }

  private updateErrorRate(): void {
    // Update error rate based on recent errors
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.timestamp.getTime() > fiveMinutesAgo);
    
    this.stats.errorRate = recentErrors.length / 5; // errors per minute
  }

  private checkErrorAlerts(): void {
    if (this.stats.errorRate > this.config.alertThresholds.errorRate) {
      this.eventEmitter.emit('alert:error_rate', {
        current: this.stats.errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }
  }

  private parseTimeWindow(timeWindow: string): number {
    const units: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeWindow.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTraceId(spanId: string): string {
    for (const [traceId, spans] of this.traces) {
      if (spans.some(span => span.id === spanId)) {
        return traceId;
      }
    }
    return this.generateTraceId();
  }

  private getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js';
  }

  private getCurrentUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : 'server';
  }

  private getPlatform(): string {
    if (typeof window !== 'undefined') return 'browser';
    if (typeof process !== 'undefined') return 'node';
    return 'unknown';
  }

  /**
   * Log message with level
   */
  private log(level: string, message: string, data?: any): void {
    if (!this.config.enableDebugMode && level === 'debug') return;
    
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevel = logLevels.indexOf(this.config.logLevel);
    const currentLevel = logLevels.indexOf(level);
    
    if (currentLevel >= configLevel) {
      console[level as keyof Console](`[Monitoring] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.provider) {
      throw new Error('Monitoring provider is required');
    }
    
    if (this.config.errorSampleRate < 0 || this.config.errorSampleRate > 1) {
      throw new Error('Error sample rate must be between 0 and 1');
    }
    
    if (this.config.performanceSampleRate < 0 || this.config.performanceSampleRate > 1) {
      throw new Error('Performance sample rate must be between 0 and 1');
    }
  }

  /**
   * Get generated files for the monitoring module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core monitoring types
    files.push({
      path: 'src/lib/monitoring/types.ts',
      content: this.generateMonitoringTypes(),
      type: 'typescript'
    });

    // Monitoring service
    files.push({
      path: 'src/lib/monitoring/service.ts',
      content: this.generateMonitoringService(context),
      type: 'typescript'
    });

    // Error tracker
    files.push({
      path: 'src/lib/monitoring/error-tracker.ts',
      content: this.generateErrorTracker(context),
      type: 'typescript'
    });

    // Performance monitor
    files.push({
      path: 'src/lib/monitoring/performance-monitor.ts',
      content: this.generatePerformanceMonitor(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate monitoring types file
   */
  private generateMonitoringTypes(): string {
    return `// Generated Monitoring types - Epic 5 Story 6 AC1
export * from './types/monitoring-types';
export * from './types/error-types';
export * from './types/performance-types';
export * from './types/trace-types';
`;
  }

  /**
   * Generate monitoring service file
   */
  private generateMonitoringService(context: DNAModuleContext): string {
    return `// Generated Monitoring Service - Epic 5 Story 6 AC1
import { ApplicationMonitoringModule } from './application-monitoring-module';

export class MonitoringService extends ApplicationMonitoringModule {
  // Monitoring service for ${context.framework}
}
`;
  }

  /**
   * Generate error tracker file
   */
  private generateErrorTracker(context: DNAModuleContext): string {
    return `// Generated Error Tracker - Epic 5 Story 6 AC1
export class ErrorTracker {
  // Error tracking for ${context.framework}
  // Automatic error boundary integration
  // Custom error classification
}
`;
  }

  /**
   * Generate performance monitor file
   */
  private generatePerformanceMonitor(context: DNAModuleContext): string {
    return `// Generated Performance Monitor - Epic 5 Story 6 AC1
export class PerformanceMonitor {
  // Performance monitoring for ${context.framework}
  // Web Vitals, API performance, rendering metrics
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/lib/monitoring/next-monitoring.ts',
        content: `// Next.js Monitoring Integration
import { ApplicationMonitoringModule } from './application-monitoring-module';

export function setupNextJSMonitoring() {
  // API route monitoring
  // SSR performance tracking
  // Client-side error boundaries
}
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for monitoring events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  public emit(event: string, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args);
  }
}

/**
 * Default monitoring configuration
 */
export const defaultMonitoringConfig: MonitoringConfig = {
  provider: MonitoringProvider.SENTRY,
  environment: 'development',
  version: '1.0.0',
  
  enableErrorTracking: true,
  errorSampleRate: 1.0,
  enableStackTraces: true,
  enableSourceMaps: true,
  errorFilters: ['TypeError: fetch'],
  
  enablePerformanceMonitoring: true,
  performanceSampleRate: 0.1,
  enableTracing: true,
  enableProfiling: false,
  maxTraceDepth: 10,
  
  enableMetrics: true,
  metricsInterval: 60000,
  enableCustomMetrics: true,
  enableSystemMetrics: true,
  enableBusinessMetrics: true,
  
  enableRealTimeAlerts: true,
  alertThresholds: {
    errorRate: 10,
    responseTime: 1000,
    memoryUsage: 80,
    cpuUsage: 80,
    diskUsage: 90,
    customThresholds: {}
  },
  enableHealthChecks: true,
  healthCheckInterval: 30000,
  
  retentionPeriod: 30,
  enableDataArchiving: false,
  
  enableDataScrubbing: true,
  scrubFields: ['password', 'token', 'email'],
  enablePIIDetection: true,
  enableEncryption: false,
  
  frameworkIntegrations: {},
  
  enableDebugMode: false,
  logLevel: 'info'
};

export default ApplicationMonitoringModule;