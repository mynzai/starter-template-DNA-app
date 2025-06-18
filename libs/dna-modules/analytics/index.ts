/**
 * @fileoverview Analytics DNA Modules Index - Epic 5 Story 6
 * Exports all analytics and monitoring modules for the DNA system
 */

// Application Monitoring (AC1)
export { ApplicationMonitoringModule } from './application-monitoring-module';
export type {
  MonitoringConfig,
  ErrorSeverity,
  MetricType,
  MonitoringProvider,
  AlertThresholds,
  ErrorContext,
  PerformanceMetric,
  MonitoringAlert,
  MonitoringReport
} from './application-monitoring-module';

// User Analytics (AC2)
export { UserAnalyticsModule } from './user-analytics-module';
export type {
  UserAnalyticsConfig,
  PrivacyRegulation,
  ConsentStatus,
  ProcessingPurpose,
  EventType,
  ConsentRequest,
  AnalyticsEvent,
  UserSegment,
  ConversionFunnel,
  CohortAnalysis,
  AnalyticsReport
} from './user-analytics-module';

// Business Intelligence (AC3)
export { BusinessIntelligenceModule } from './business-intelligence-module';
export type {
  BusinessIntelligenceConfig,
  ChartType,
  AggregationFunction,
  TimeGranularity,
  ReportFormat,
  AccessLevel,
  DataSourceConfig,
  DashboardConfig,
  WidgetConfig,
  QueryConfig,
  BIReport,
  DashboardWidget,
  QueryResult
} from './business-intelligence-module';

// A/B Testing (AC4)
export { ABTestingModule } from './ab-testing-module';
export type {
  ABTestingConfig,
  ExperimentStatus,
  ExperimentType,
  StatisticalTest,
  TrafficAllocation,
  ConversionGoalType,
  ExperimentConfig,
  ExperimentVariation,
  ExperimentResults,
  VariationResults,
  ExperimentAssignment,
  ConversionGoal,
  StatisticalConfig
} from './ab-testing-module';

// Real-time Alerting (AC5)
export { RealTimeAlertingModule } from './real-time-alerting-module';
export type {
  AlertingConfig,
  AlertSeverity,
  AlertStatus,
  ComparisonOperator,
  TimeWindow,
  AggregationFunction as AlertAggregationFunction,
  NotificationChannel,
  EscalationAction,
  AlertRule,
  AlertThreshold,
  Alert,
  AlertMetrics,
  NotificationChannelConfig,
  SuppressionRule,
  NotificationTemplate
} from './real-time-alerting-module';

/**
 * Analytics DNA Factory
 * Factory class for creating and managing analytics DNA modules
 */
export class AnalyticsDNAFactory {
  private static instance: AnalyticsDNAFactory;
  private modules: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): AnalyticsDNAFactory {
    if (!AnalyticsDNAFactory.instance) {
      AnalyticsDNAFactory.instance = new AnalyticsDNAFactory();
    }
    return AnalyticsDNAFactory.instance;
  }

  /**
   * Create application monitoring module
   */
  public createApplicationMonitoring(config: MonitoringConfig): ApplicationMonitoringModule {
    const moduleId = 'application_monitoring';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new ApplicationMonitoringModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create user analytics module
   */
  public createUserAnalytics(config: UserAnalyticsConfig): UserAnalyticsModule {
    const moduleId = 'user_analytics';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new UserAnalyticsModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create business intelligence module
   */
  public createBusinessIntelligence(config: BusinessIntelligenceConfig): BusinessIntelligenceModule {
    const moduleId = 'business_intelligence';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new BusinessIntelligenceModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create A/B testing module
   */
  public createABTesting(config: ABTestingConfig): ABTestingModule {
    const moduleId = 'ab_testing';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new ABTestingModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create real-time alerting module
   */
  public createRealTimeAlerting(config: AlertingConfig): RealTimeAlertingModule {
    const moduleId = 'real_time_alerting';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new RealTimeAlertingModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Get all available modules
   */
  public getAvailableModules(): string[] {
    return [
      'application_monitoring',
      'user_analytics', 
      'business_intelligence',
      'ab_testing',
      'real_time_alerting'
    ];
  }

  /**
   * Get module by ID
   */
  public getModule(moduleId: string): any {
    return this.modules.get(moduleId);
  }

  /**
   * Check if module exists
   */
  public hasModule(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Clear all modules
   */
  public clearModules(): void {
    this.modules.clear();
  }
}

/**
 * Default analytics configuration
 */
export const defaultAnalyticsConfig = {
  applicationMonitoring: {
    provider: 'sentry' as const,
    environment: 'production',
    version: '1.0.0',
    enableErrorTracking: true,
    errorSampleRate: 1.0,
    enablePerformanceMonitoring: true,
    performanceSampleRate: 0.1,
    enableMetrics: true,
    enableRealTimeAlerts: true,
    retentionPeriod: 30,
    enableDataScrubbing: true,
    enablePIIDetection: true
  },
  userAnalytics: {
    provider: 'mixpanel' as const,
    enableGDPRCompliance: true,
    supportedRegulations: ['gdpr', 'ccpa'] as const,
    requireExplicitConsent: true,
    consentExpiryDays: 365,
    enableRightToErasure: true,
    enableDataPortability: true,
    enableUserTracking: true,
    enableEventTracking: true,
    enableAnonymization: true,
    dataRetentionDays: 730
  },
  businessIntelligence: {
    dataSources: [],
    enableInteractiveCharts: true,
    enableRealTimeUpdates: true,
    enableDrillDown: true,
    updateInterval: 60000,
    enableCustomDashboards: true,
    enableDashboardSharing: true,
    maxDashboardsPerUser: 10,
    enableDataExport: true,
    supportedFormats: ['pdf', 'excel', 'csv'] as const,
    enableScheduledReports: true,
    dataRetentionDays: 365
  },
  abTesting: {
    provider: 'optimizely' as const,
    statisticalMethod: 'frequentist' as const,
    confidenceLevel: 0.95,
    minimumDetectableEffect: 5,
    statisticalPower: 0.8,
    enableSequentialTesting: false,
    trafficAllocation: 'random' as const,
    defaultTrafficSplit: 50,
    enableMultivariateTests: true,
    maxVariationsPerExperiment: 5,
    enableRealTimeResults: true,
    enableGDPRCompliance: true,
    dataRetentionDays: 90
  },
  realTimeAlerting: {
    provider: 'datadog' as const,
    enableRealTimeProcessing: true,
    processingInterval: 30000,
    batchSize: 100,
    enableAlertGrouping: true,
    groupingWindow: 5,
    maxAlertsPerGroup: 10,
    enableEscalation: true,
    maxEscalationLevels: 3,
    escalationTimeout: 30,
    enableNotifications: true,
    supportedChannels: ['email', 'slack', 'webhook'] as const,
    alertRetentionDays: 30,
    enableGDPRCompliance: true
  }
};

/**
 * Module compatibility matrix
 */
export const moduleCompatibility = {
  application_monitoring: {
    dependsOn: [],
    compatibleWith: ['user_analytics', 'real_time_alerting'],
    conflicts: []
  },
  user_analytics: {
    dependsOn: [],
    compatibleWith: ['application_monitoring', 'business_intelligence', 'ab_testing'],
    conflicts: []
  },
  business_intelligence: {
    dependsOn: ['user_analytics'],
    compatibleWith: ['application_monitoring', 'real_time_alerting'],
    conflicts: []
  },
  ab_testing: {
    dependsOn: ['user_analytics'],
    compatibleWith: ['application_monitoring', 'business_intelligence', 'real_time_alerting'],
    conflicts: []
  },
  real_time_alerting: {
    dependsOn: [],
    compatibleWith: ['application_monitoring', 'business_intelligence', 'ab_testing'],
    conflicts: []
  }
};