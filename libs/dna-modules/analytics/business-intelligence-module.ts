/**
 * @fileoverview Business Intelligence DNA Module - Epic 5 Story 6 AC3
 * Provides custom dashboards and reporting with advanced BI capabilities
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
 * Chart types for visualizations
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  FUNNEL = 'funnel',
  GAUGE = 'gauge',
  TABLE = 'table',
  METRIC = 'metric'
}

/**
 * Data aggregation functions
 */
export enum AggregationFunction {
  SUM = 'sum',
  COUNT = 'count',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  DISTINCT_COUNT = 'distinct_count',
  STANDARD_DEVIATION = 'standard_deviation'
}

/**
 * Time granularity for reporting
 */
export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * Report formats
 */
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html'
}

/**
 * Dashboard access levels
 */
export enum AccessLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  PRIVATE = 'private',
  ADMIN = 'admin'
}

/**
 * Business Intelligence configuration
 */
export interface BusinessIntelligenceConfig {
  // Data sources
  dataSources: DataSourceConfig[];
  
  // Visualization settings
  enableInteractiveCharts: boolean;
  enableRealTimeUpdates: boolean;
  enableDrillDown: boolean;
  enableCrossFiltering: boolean;
  updateInterval: number; // milliseconds
  
  // Dashboard settings
  enableCustomDashboards: boolean;
  enableDashboardSharing: boolean;
  enableEmbeddedDashboards: boolean;
  maxDashboardsPerUser: number;
  maxWidgetsPerDashboard: number;
  
  // Reporting settings
  enableScheduledReports: boolean;
  enableReportExport: boolean;
  enableReportEmail: boolean;
  maxReportRows: number;
  reportCacheTTL: number; // seconds
  
  // Performance optimization
  enableQueryCaching: boolean;
  enableDataPreAggregation: boolean;
  enableLazyLoading: boolean;
  queryTimeout: number; // milliseconds
  
  // Security
  enableAccessControl: boolean;
  enableDataMasking: boolean;
  enableAuditLogging: boolean;
  sensitiveFields: string[];
  
  // Collaboration
  enableComments: boolean;
  enableAnnotations: boolean;
  enableSharing: boolean;
  enableVersionControl: boolean;
  
  // Debugging
  enableDebugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'stream';
  connectionString?: string;
  apiEndpoint?: string;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key';
    credentials?: Record<string, string>;
  };
  refreshInterval?: number; // milliseconds
  enabled: boolean;
}

/**
 * Dashboard definition
 */
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Layout and widgets
  layout: DashboardLayout;
  widgets: Widget[];
  
  // Settings
  settings: DashboardSettings;
  
  // Access control
  accessLevel: AccessLevel;
  sharedWith: string[];
  
  // Metadata
  tags: string[];
  category?: string;
  version: number;
  
  // Analytics
  viewCount: number;
  lastViewed: Date;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  type: 'grid' | 'freeform';
  columns: number;
  rowHeight: number;
  margin: [number, number];
  padding: [number, number];
  breakpoints: Record<string, number>;
}

/**
 * Dashboard settings
 */
export interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  enableExport: boolean;
  enablePrint: boolean;
}

/**
 * Widget definition
 */
export interface Widget {
  id: string;
  title: string;
  type: ChartType;
  
  // Layout
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Data configuration
  dataSource: string;
  query: QueryDefinition;
  
  // Visualization settings
  visualization: VisualizationConfig;
  
  // Interactions
  interactions: InteractionConfig;
  
  // Settings
  settings: WidgetSettings;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query definition
 */
export interface QueryDefinition {
  // Data selection
  table?: string;
  fields: FieldDefinition[];
  
  // Filtering
  filters: FilterDefinition[];
  
  // Grouping and aggregation
  groupBy: string[];
  aggregations: AggregationDefinition[];
  
  // Sorting and limiting
  orderBy: OrderByDefinition[];
  limit?: number;
  offset?: number;
  
  // Time range
  timeRange?: TimeRangeDefinition;
  
  // Raw query (for advanced users)
  rawQuery?: string;
  queryType: 'builder' | 'raw';
}

/**
 * Field definition
 */
export interface FieldDefinition {
  name: string;
  alias?: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  aggregation?: AggregationFunction;
}

/**
 * Filter definition
 */
export interface FilterDefinition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between' | 'is_null' | 'is_not_null';
  value: any;
  values?: any[];
  caseSensitive?: boolean;
}

/**
 * Aggregation definition
 */
export interface AggregationDefinition {
  field: string;
  function: AggregationFunction;
  alias?: string;
  parameters?: Record<string, any>;
}

/**
 * Order by definition
 */
export interface OrderByDefinition {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Time range definition
 */
export interface TimeRangeDefinition {
  type: 'relative' | 'absolute';
  start?: Date;
  end?: Date;
  relative?: {
    amount: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  };
  granularity: TimeGranularity;
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  // Chart-specific settings
  chartSettings: Record<string, any>;
  
  // Colors and styling
  colorScheme: string[];
  theme: 'light' | 'dark';
  
  // Axes (for charts that support them)
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  
  // Legend
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  
  // Data labels
  showDataLabels: boolean;
  dataLabelFormat?: string;
  
  // Formatting
  numberFormat?: string;
  dateFormat?: string;
  
  // Conditional formatting
  conditionalFormatting: ConditionalFormat[];
}

/**
 * Axis configuration
 */
export interface AxisConfig {
  title?: string;
  type: 'linear' | 'logarithmic' | 'category' | 'time';
  min?: number;
  max?: number;
  format?: string;
  showGrid: boolean;
  showTicks: boolean;
}

/**
 * Conditional formatting
 */
export interface ConditionalFormat {
  field: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'between';
  value: any;
  format: {
    backgroundColor?: string;
    textColor?: string;
    fontWeight?: 'normal' | 'bold';
    icon?: string;
  };
}

/**
 * Interaction configuration
 */
export interface InteractionConfig {
  enableTooltips: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableSelection: boolean;
  enableDrillDown: boolean;
  drillDownTargets?: DrillDownTarget[];
  enableCrossFilter: boolean;
  clickActions: ClickAction[];
}

/**
 * Drill down target
 */
export interface DrillDownTarget {
  field: string;
  targetDashboard?: string;
  targetWidget?: string;
  parameters: Record<string, string>;
}

/**
 * Click action
 */
export interface ClickAction {
  type: 'filter' | 'navigate' | 'modal' | 'custom';
  target?: string;
  parameters: Record<string, any>;
}

/**
 * Widget settings
 */
export interface WidgetSettings {
  refreshOnLoad: boolean;
  autoRefresh: boolean;
  refreshInterval?: number;
  enableExport: boolean;
  enableFullscreen: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showLastUpdated: boolean;
}

/**
 * Report definition
 */
export interface Report {
  id: string;
  name: string;
  description?: string;
  
  // Content
  dashboard?: string;
  widgets: string[];
  
  // Scheduling
  schedule?: ScheduleConfig;
  
  // Export settings
  format: ReportFormat;
  exportSettings: ExportSettings;
  
  // Recipients
  recipients: ReportRecipient[];
  
  // Settings
  settings: ReportSettings;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  
  // Status
  enabled: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  type: 'once' | 'recurring';
  startDate: Date;
  endDate?: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  time: string; // HH:mm format
  timezone: string;
}

/**
 * Export settings
 */
export interface ExportSettings {
  includeCharts: boolean;
  chartResolution: 'low' | 'medium' | 'high';
  includeData: boolean;
  dataLimit?: number;
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'a4' | 'letter' | 'legal';
  margins?: [number, number, number, number];
}

/**
 * Report recipient
 */
export interface ReportRecipient {
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

/**
 * Report settings
 */
export interface ReportSettings {
  includeTimestamp: boolean;
  includeFilters: boolean;
  includeMetadata: boolean;
  compressAttachment: boolean;
  passwordProtect: boolean;
  password?: string;
}

/**
 * Query result
 */
export interface QueryResult {
  data: Record<string, any>[];
  columns: ColumnMetadata[];
  totalRows: number;
  executionTime: number;
  fromCache: boolean;
  timestamp: Date;
}

/**
 * Column metadata
 */
export interface ColumnMetadata {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique: boolean;
  format?: string;
}

/**
 * Business Intelligence Module implementation
 */
export class BusinessIntelligenceModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'business-intelligence',
    name: 'Business Intelligence Module',
    version: '1.0.0',
    description: 'Custom dashboards and reporting with advanced BI capabilities',
    category: DNAModuleCategory.ANALYTICS,
    tags: ['business-intelligence', 'dashboards', 'reporting', 'visualization'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.PARTIAL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['web', 'desktop'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: ['chart.js', 'd3', 'pdf-lib', 'xlsx', 'node-cron'],
    devDependencies: ['@types/d3'],
    peerDependencies: []
  };

  private config: BusinessIntelligenceConfig;
  private eventEmitter: EventEmitter;
  private dataSources: Map<string, any> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private reports: Map<string, Report> = new Map();
  private queryCache: Map<string, QueryResult> = new Map();
  private scheduledJobs: Map<string, any> = new Map();

  constructor(config: BusinessIntelligenceConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.validateConfig();
  }

  /**
   * Initialize BI system
   */
  public async initialize(): Promise<boolean> {
    try {
      this.log('info', 'Initializing business intelligence system...');
      
      // Initialize data sources
      await this.initializeDataSources();
      
      // Setup query caching
      if (this.config.enableQueryCaching) {
        this.setupQueryCaching();
      }
      
      // Setup scheduled reports
      if (this.config.enableScheduledReports) {
        this.setupScheduledReports();
      }
      
      // Setup real-time updates
      if (this.config.enableRealTimeUpdates) {
        this.setupRealTimeUpdates();
      }
      
      this.eventEmitter.emit('initialized');
      this.log('info', 'Business intelligence system initialized successfully');
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to initialize BI system', error);
      return false;
    }
  }

  /**
   * Create dashboard
   */
  public async createDashboard(
    name: string,
    options: {
      description?: string;
      createdBy: string;
      accessLevel?: AccessLevel;
      layout?: Partial<DashboardLayout>;
      settings?: Partial<DashboardSettings>;
      tags?: string[];
      category?: string;
    }
  ): Promise<string> {
    const dashboardId = this.generateDashboardId();
    
    const dashboard: Dashboard = {
      id: dashboardId,
      name,
      description: options.description,
      createdBy: options.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 100,
        margin: [10, 10],
        padding: [10, 10],
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
        ...options.layout
      },
      widgets: [],
      
      settings: {
        autoRefresh: false,
        refreshInterval: 30000,
        theme: 'light',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        numberFormat: '#,##0.##',
        enableExport: true,
        enablePrint: true,
        ...options.settings
      },
      
      accessLevel: options.accessLevel || AccessLevel.PRIVATE,
      sharedWith: [],
      
      tags: options.tags || [],
      category: options.category,
      version: 1,
      
      viewCount: 0,
      lastViewed: new Date()
    };
    
    this.dashboards.set(dashboardId, dashboard);
    
    this.eventEmitter.emit('dashboard:created', { dashboard });
    this.log('info', `Dashboard created: ${name} (${dashboardId})`);
    
    return dashboardId;
  }

  /**
   * Add widget to dashboard
   */
  public async addWidget(
    dashboardId: string,
    widgetConfig: {
      title: string;
      type: ChartType;
      position: Widget['position'];
      dataSource: string;
      query: QueryDefinition;
      visualization?: Partial<VisualizationConfig>;
      interactions?: Partial<InteractionConfig>;
      settings?: Partial<WidgetSettings>;
    }
  ): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }
    
    const widgetId = this.generateWidgetId();
    
    const widget: Widget = {
      id: widgetId,
      title: widgetConfig.title,
      type: widgetConfig.type,
      position: widgetConfig.position,
      dataSource: widgetConfig.dataSource,
      query: widgetConfig.query,
      
      visualization: {
        chartSettings: {},
        colorScheme: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
        theme: 'light',
        showLegend: true,
        legendPosition: 'bottom',
        showDataLabels: false,
        conditionalFormatting: [],
        ...widgetConfig.visualization
      },
      
      interactions: {
        enableTooltips: true,
        enableZoom: false,
        enablePan: false,
        enableSelection: false,
        enableDrillDown: false,
        enableCrossFilter: false,
        clickActions: [],
        ...widgetConfig.interactions
      },
      
      settings: {
        refreshOnLoad: true,
        autoRefresh: false,
        enableExport: true,
        enableFullscreen: true,
        showTitle: true,
        showDescription: false,
        showLastUpdated: true,
        ...widgetConfig.settings
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    dashboard.widgets.push(widget);
    dashboard.updatedAt = new Date();
    dashboard.version++;
    
    this.eventEmitter.emit('widget:added', { dashboardId, widget });
    this.log('info', `Widget added to dashboard: ${widgetConfig.title} (${widgetId})`);
    
    return widgetId;
  }

  /**
   * Execute query
   */
  public async executeQuery(
    dataSourceId: string,
    query: QueryDefinition
  ): Promise<QueryResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(dataSourceId, query);
    if (this.config.enableQueryCaching) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        this.log('debug', 'Query result returned from cache');
        return { ...cached, fromCache: true };
      }
    }
    
    // Get data source
    const dataSource = this.dataSources.get(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }
    
    try {
      // Execute query based on data source type
      let result: QueryResult;
      
      switch (dataSource.type) {
        case 'database':
          result = await this.executeDatabaseQuery(dataSource, query);
          break;
        case 'api':
          result = await this.executeAPIQuery(dataSource, query);
          break;
        case 'file':
          result = await this.executeFileQuery(dataSource, query);
          break;
        default:
          throw new Error(`Unsupported data source type: ${dataSource.type}`);
      }
      
      // Add execution metadata
      result.executionTime = Date.now() - startTime;
      result.fromCache = false;
      result.timestamp = new Date();
      
      // Cache result
      if (this.config.enableQueryCaching) {
        this.queryCache.set(cacheKey, result);
      }
      
      this.eventEmitter.emit('query:executed', { dataSourceId, query, result });
      this.log('debug', `Query executed in ${result.executionTime}ms, returned ${result.totalRows} rows`);
      
      return result;
    } catch (error) {
      this.log('error', 'Query execution failed', { dataSourceId, query, error });
      throw error;
    }
  }

  /**
   * Generate report
   */
  public async generateReport(reportId: string): Promise<Buffer> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    this.log('info', `Generating report: ${report.name}`);
    
    try {
      // Update report status
      report.status = 'running';
      
      // Get dashboard data
      let dashboardData: any = null;
      if (report.dashboard) {
        dashboardData = await this.getDashboardData(report.dashboard);
      }
      
      // Get widget data
      const widgetData: Record<string, QueryResult> = {};
      for (const widgetId of report.widgets) {
        const widget = await this.getWidgetData(widgetId);
        if (widget) {
          widgetData[widgetId] = widget;
        }
      }
      
      // Generate report based on format
      let reportBuffer: Buffer;
      
      switch (report.format) {
        case ReportFormat.PDF:
          reportBuffer = await this.generatePDFReport(report, dashboardData, widgetData);
          break;
        case ReportFormat.EXCEL:
          reportBuffer = await this.generateExcelReport(report, dashboardData, widgetData);
          break;
        case ReportFormat.CSV:
          reportBuffer = await this.generateCSVReport(report, dashboardData, widgetData);
          break;
        case ReportFormat.JSON:
          reportBuffer = await this.generateJSONReport(report, dashboardData, widgetData);
          break;
        case ReportFormat.HTML:
          reportBuffer = await this.generateHTMLReport(report, dashboardData, widgetData);
          break;
        default:
          throw new Error(`Unsupported report format: ${report.format}`);
      }
      
      // Update report status
      report.status = 'completed';
      report.lastRun = new Date();
      
      // Send to recipients if configured
      if (report.recipients.length > 0) {
        await this.sendReportToRecipients(report, reportBuffer);
      }
      
      this.eventEmitter.emit('report:generated', { report, size: reportBuffer.length });
      this.log('info', `Report generated successfully: ${report.name} (${reportBuffer.length} bytes)`);
      
      return reportBuffer;
    } catch (error) {
      report.status = 'failed';
      report.error = (error as Error).message;
      
      this.log('error', 'Report generation failed', { reportId, error });
      throw error;
    }
  }

  /**
   * Get dashboard analytics
   */
  public async getDashboardAnalytics(dashboardId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    averageTimeSpent: number;
    popularWidgets: Array<{ widgetId: string; views: number }>;
    timeSeriesViews: Array<{ date: string; views: number }>;
  }> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }
    
    // Mock analytics data - in production, this would come from actual usage tracking
    return {
      totalViews: dashboard.viewCount,
      uniqueViewers: Math.floor(dashboard.viewCount * 0.7),
      averageTimeSpent: 180000, // 3 minutes in milliseconds
      popularWidgets: dashboard.widgets.map((widget, index) => ({
        widgetId: widget.id,
        views: Math.floor(Math.random() * 100) + 10
      })),
      timeSeriesViews: this.generateTimeSeriesData('views', 30)
    };
  }

  /**
   * Search dashboards and reports
   */
  public searchContent(
    query: string,
    options: {
      type?: 'dashboard' | 'report' | 'both';
      tags?: string[];
      category?: string;
      createdBy?: string;
      accessLevel?: AccessLevel;
    } = {}
  ): {
    dashboards: Dashboard[];
    reports: Report[];
  } {
    const queryLower = query.toLowerCase();
    
    // Search dashboards
    let dashboards: Dashboard[] = [];
    if (!options.type || options.type === 'dashboard' || options.type === 'both') {
      dashboards = Array.from(this.dashboards.values()).filter(dashboard => {
        // Text search
        const textMatch = dashboard.name.toLowerCase().includes(queryLower) ||
          (dashboard.description && dashboard.description.toLowerCase().includes(queryLower));
        
        // Tag filter
        const tagMatch = !options.tags || options.tags.some(tag => dashboard.tags.includes(tag));
        
        // Category filter
        const categoryMatch = !options.category || dashboard.category === options.category;
        
        // Creator filter
        const creatorMatch = !options.createdBy || dashboard.createdBy === options.createdBy;
        
        // Access level filter
        const accessMatch = !options.accessLevel || dashboard.accessLevel === options.accessLevel;
        
        return textMatch && tagMatch && categoryMatch && creatorMatch && accessMatch;
      });
    }
    
    // Search reports
    let reports: Report[] = [];
    if (!options.type || options.type === 'report' || options.type === 'both') {
      reports = Array.from(this.reports.values()).filter(report => {
        // Text search
        const textMatch = report.name.toLowerCase().includes(queryLower) ||
          (report.description && report.description.toLowerCase().includes(queryLower));
        
        // Creator filter
        const creatorMatch = !options.createdBy || report.createdBy === options.createdBy;
        
        return textMatch && creatorMatch;
      });
    }
    
    return { dashboards, reports };
  }

  /**
   * Initialize data sources
   */
  private async initializeDataSources(): Promise<void> {
    for (const sourceConfig of this.config.dataSources) {
      if (!sourceConfig.enabled) continue;
      
      try {
        const dataSource = await this.createDataSource(sourceConfig);
        this.dataSources.set(sourceConfig.id, dataSource);
        this.log('info', `Data source initialized: ${sourceConfig.name}`);
      } catch (error) {
        this.log('error', `Failed to initialize data source: ${sourceConfig.name}`, error);
      }
    }
  }

  /**
   * Create data source connection
   */
  private async createDataSource(config: DataSourceConfig): Promise<any> {
    // In production, create actual connections based on type
    return {
      id: config.id,
      type: config.type,
      name: config.name,
      config,
      connected: true
    };
  }

  /**
   * Query execution methods (mocked)
   */
  private async executeDatabaseQuery(dataSource: any, query: QueryDefinition): Promise<QueryResult> {
    // In production, execute actual SQL queries
    const mockData = this.generateMockData(query);
    
    return {
      data: mockData,
      columns: this.generateMockColumns(query),
      totalRows: mockData.length,
      executionTime: 0,
      fromCache: false,
      timestamp: new Date()
    };
  }

  private async executeAPIQuery(dataSource: any, query: QueryDefinition): Promise<QueryResult> {
    // In production, make HTTP requests to APIs
    const mockData = this.generateMockData(query);
    
    return {
      data: mockData,
      columns: this.generateMockColumns(query),
      totalRows: mockData.length,
      executionTime: 0,
      fromCache: false,
      timestamp: new Date()
    };
  }

  private async executeFileQuery(dataSource: any, query: QueryDefinition): Promise<QueryResult> {
    // In production, parse CSV, Excel, JSON files
    const mockData = this.generateMockData(query);
    
    return {
      data: mockData,
      columns: this.generateMockColumns(query),
      totalRows: mockData.length,
      executionTime: 0,
      fromCache: false,
      timestamp: new Date()
    };
  }

  /**
   * Report generation methods (mocked)
   */
  private async generatePDFReport(report: Report, dashboardData: any, widgetData: Record<string, QueryResult>): Promise<Buffer> {
    // In production, use PDF generation library
    return Buffer.from(`PDF Report: ${report.name}`);
  }

  private async generateExcelReport(report: Report, dashboardData: any, widgetData: Record<string, QueryResult>): Promise<Buffer> {
    // In production, use Excel generation library
    return Buffer.from(`Excel Report: ${report.name}`);
  }

  private async generateCSVReport(report: Report, dashboardData: any, widgetData: Record<string, QueryResult>): Promise<Buffer> {
    // In production, generate CSV from data
    return Buffer.from(`CSV Report: ${report.name}`);
  }

  private async generateJSONReport(report: Report, dashboardData: any, widgetData: Record<string, QueryResult>): Promise<Buffer> {
    const reportData = {
      report,
      dashboardData,
      widgetData,
      generatedAt: new Date()
    };
    
    return Buffer.from(JSON.stringify(reportData, null, 2));
  }

  private async generateHTMLReport(report: Report, dashboardData: any, widgetData: Record<string, QueryResult>): Promise<Buffer> {
    // In production, generate HTML report with charts
    const html = `
      <html>
        <head><title>${report.name}</title></head>
        <body>
          <h1>${report.name}</h1>
          <p>Generated: ${new Date().toISOString()}</p>
        </body>
      </html>
    `;
    
    return Buffer.from(html);
  }

  /**
   * Helper methods
   */
  private setupQueryCaching(): void {
    // Setup cache cleanup interval
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute
  }

  private setupScheduledReports(): void {
    // Setup cron jobs for scheduled reports
    for (const report of this.reports.values()) {
      if (report.schedule && report.enabled) {
        this.scheduleReport(report);
      }
    }
  }

  private setupRealTimeUpdates(): void {
    // Setup WebSocket or polling for real-time updates
    setInterval(() => {
      this.updateRealTimeData();
    }, this.config.updateInterval);
  }

  private scheduleReport(report: Report): void {
    // In production, use actual cron scheduler
    this.log('info', `Report scheduled: ${report.name}`);
  }

  private async updateRealTimeData(): Promise<void> {
    // Update dashboard data in real-time
    this.eventEmitter.emit('realtime:update');
  }

  private generateMockData(query: QueryDefinition): Record<string, any>[] {
    const data: Record<string, any>[] = [];
    const rowCount = Math.min(query.limit || 100, 1000);
    
    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, any> = {};
      
      for (const field of query.fields) {
        switch (field.type) {
          case 'number':
            row[field.name] = Math.floor(Math.random() * 1000);
            break;
          case 'date':
            row[field.name] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            break;
          case 'boolean':
            row[field.name] = Math.random() > 0.5;
            break;
          default:
            row[field.name] = `Sample ${field.name} ${i + 1}`;
        }
      }
      
      data.push(row);
    }
    
    return data;
  }

  private generateMockColumns(query: QueryDefinition): ColumnMetadata[] {
    return query.fields.map(field => ({
      name: field.name,
      type: field.type,
      nullable: true,
      unique: false,
      format: field.format
    }));
  }

  private generateTimeSeriesData(metric: string, days: number): Array<{ date: string; views: number }> {
    const data: Array<{ date: string; views: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 100) + 10
      });
    }
    
    return data;
  }

  private async getDashboardData(dashboardId: string): Promise<any> {
    // Get dashboard and its data
    const dashboard = this.dashboards.get(dashboardId);
    return dashboard;
  }

  private async getWidgetData(widgetId: string): Promise<QueryResult | null> {
    // Find widget and execute its query
    for (const dashboard of this.dashboards.values()) {
      const widget = dashboard.widgets.find(w => w.id === widgetId);
      if (widget) {
        return await this.executeQuery(widget.dataSource, widget.query);
      }
    }
    return null;
  }

  private async sendReportToRecipients(report: Report, reportBuffer: Buffer): Promise<void> {
    // In production, send email with report attachment
    this.log('info', `Report sent to ${report.recipients.length} recipients`);
  }

  private generateCacheKey(dataSourceId: string, query: QueryDefinition): string {
    const queryString = JSON.stringify(query);
    return `${dataSourceId}:${Buffer.from(queryString).toString('base64')}`;
  }

  private isCacheValid(cached: QueryResult): boolean {
    const age = Date.now() - cached.timestamp.getTime();
    return age < this.config.reportCacheTTL * 1000;
  }

  private cleanupCache(): void {
    for (const [key, cached] of this.queryCache) {
      if (!this.isCacheValid(cached)) {
        this.queryCache.delete(key);
      }
    }
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      console[level as keyof Console](`[BI] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.dataSources || this.config.dataSources.length === 0) {
      throw new Error('At least one data source must be configured');
    }
    
    if (this.config.updateInterval <= 0) {
      throw new Error('Update interval must be positive');
    }
    
    if (this.config.queryTimeout <= 0) {
      throw new Error('Query timeout must be positive');
    }
  }

  /**
   * Get generated files for the BI module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core BI types
    files.push({
      path: 'src/lib/bi/types.ts',
      content: this.generateBITypes(),
      type: 'typescript'
    });

    // Dashboard service
    files.push({
      path: 'src/lib/bi/dashboard-service.ts',
      content: this.generateDashboardService(context),
      type: 'typescript'
    });

    // Report service
    files.push({
      path: 'src/lib/bi/report-service.ts',
      content: this.generateReportService(context),
      type: 'typescript'
    });

    // Query builder
    files.push({
      path: 'src/lib/bi/query-builder.ts',
      content: this.generateQueryBuilder(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate BI types file
   */
  private generateBITypes(): string {
    return `// Generated BI types - Epic 5 Story 6 AC3
export * from './types/dashboard-types';
export * from './types/widget-types';
export * from './types/report-types';
export * from './types/query-types';
`;
  }

  /**
   * Generate dashboard service file
   */
  private generateDashboardService(context: DNAModuleContext): string {
    return `// Generated Dashboard Service - Epic 5 Story 6 AC3
import { BusinessIntelligenceModule } from './business-intelligence-module';

export class DashboardService extends BusinessIntelligenceModule {
  // Dashboard management for ${context.framework}
}
`;
  }

  /**
   * Generate report service file
   */
  private generateReportService(context: DNAModuleContext): string {
    return `// Generated Report Service - Epic 5 Story 6 AC3
export class ReportService {
  // Report generation for ${context.framework}
  // PDF, Excel, CSV export capabilities
}
`;
  }

  /**
   * Generate query builder file
   */
  private generateQueryBuilder(context: DNAModuleContext): string {
    return `// Generated Query Builder - Epic 5 Story 6 AC3
export class QueryBuilder {
  // Visual query builder for ${context.framework}
  // Drag-and-drop interface for creating queries
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/pages/api/bi/query.ts',
        content: `// Next.js BI Query API
import { NextApiRequest, NextApiResponse } from 'next';
import { BusinessIntelligenceModule } from '../../../lib/bi/business-intelligence-module';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle BI queries
}
`,
        type: 'typescript'
      },
      {
        path: 'src/components/Dashboard.tsx',
        content: `// Dashboard Component
import React from 'react';

export function Dashboard() {
  return (
    <div className="dashboard">
      {/* Interactive dashboard implementation */}
    </div>
  );
}
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for BI events
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
 * Default business intelligence configuration
 */
export const defaultBusinessIntelligenceConfig: BusinessIntelligenceConfig = {
  dataSources: [],
  
  enableInteractiveCharts: true,
  enableRealTimeUpdates: true,
  enableDrillDown: true,
  enableCrossFiltering: true,
  updateInterval: 30000,
  
  enableCustomDashboards: true,
  enableDashboardSharing: true,
  enableEmbeddedDashboards: true,
  maxDashboardsPerUser: 50,
  maxWidgetsPerDashboard: 20,
  
  enableScheduledReports: true,
  enableReportExport: true,
  enableReportEmail: true,
  maxReportRows: 10000,
  reportCacheTTL: 300,
  
  enableQueryCaching: true,
  enableDataPreAggregation: false,
  enableLazyLoading: true,
  queryTimeout: 30000,
  
  enableAccessControl: true,
  enableDataMasking: false,
  enableAuditLogging: true,
  sensitiveFields: ['email', 'phone', 'ssn'],
  
  enableComments: true,
  enableAnnotations: true,
  enableSharing: true,
  enableVersionControl: true,
  
  enableDebugMode: false,
  logLevel: 'info'
};

export default BusinessIntelligenceModule;