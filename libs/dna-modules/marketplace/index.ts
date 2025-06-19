/**
 * @fileoverview Marketplace DNA Modules Index - Epic 5 Story 8
 * Exports all marketplace modules for the DNA system including marketplace, contributions, sandbox, documentation, and analytics
 */

// Module Marketplace (AC1)
export { ModuleMarketplaceModule } from './module-marketplace';
export type {
  ModuleMarketplaceConfig,
  SearchProvider,
  CacheProvider,
  AnalyticsProvider,
  RecommendationEngine,
  ModuleStatus,
  MarketplaceCategory,
  SearchFilters,
  PriceFilter,
  SearchQuery,
  SearchSortBy,
  SortOrder,
  ModuleListing,
  PublisherInfo,
  LicenseType,
  RatingDistribution,
  ModuleDependency,
  DependencyType,
  CompatibilityInfo,
  FrameworkCompatibility,
  CompatibilityLevel,
  ModuleReview,
  ReviewStatus,
  SearchResults,
  SearchFacets,
  FacetCount,
  ModuleRecommendations,
  RecommendedModule
} from './module-marketplace';

// Community Contributions (AC2)
export { CommunityContributionsModule } from './community-contributions';
export type {
  CommunityContributionsConfig,
  RepositoryProvider,
  ApprovalWorkflow,
  CIProvider,
  NotificationChannel,
  DocumentationStandards,
  MarkdownStandard,
  CodeDocumentationStandard,
  ContributionType,
  ContributionStatus,
  ReviewDecision,
  ContributorLevel,
  ContributionSubmission,
  ContributionFile,
  FileAction,
  Priority,
  ImpactLevel,
  ValidationResult,
  ValidationStatus,
  TestResult,
  TestStatus,
  SecurityScanResult,
  SecurityScanStatus,
  SecurityVulnerability,
  QualityMetrics,
  ContributionReview,
  ReviewComment,
  CommentType,
  ReviewChange,
  ChangeSeverity,
  ChangeCategory,
  ContributorProfile,
  NotificationPreferences,
  PrivacySettings,
  ProfileVisibility,
  WorkflowConfiguration,
  WorkflowStep,
  StepType,
  StepCondition,
  ConditionOperator,
  LogicalOperator,
  WorkflowCondition,
  AutomationRule,
  AutomationTrigger,
  WorkflowAction,
  ActionType,
  WorkflowNotification
} from './community-contributions';

// Module Testing Sandbox (AC3)
export { ModuleTestingSandboxModule } from './module-testing-sandbox';
export type {
  ModuleTestingSandboxConfig,
  SandboxProvider,
  IsolationLevel,
  TestFramework,
  LogLevel,
  StorageProvider,
  SandboxStatus,
  TestExecutionStatus,
  TestType,
  SandboxInstance,
  NetworkInterface,
  MountedVolume,
  SandboxMetrics,
  SandboxLog,
  TestSession,
  TestResult,
  TestResultStatus,
  TestCase,
  TestError,
  TestAssertion,
  CoverageReport,
  CoverageMetrics,
  FileCoverageMetrics,
  FunctionCoverageMetrics,
  BranchCoverageMetrics,
  StatementCoverageMetrics,
  LineCoverageMetrics,
  PerformanceReport,
  PerformanceMetrics,
  BenchmarkResult,
  ProfilingData,
  CPUProfile,
  CPUProfileFunction,
  MemoryProfile,
  MemoryAllocation,
  CallGraphNode,
  PerformanceRecommendation,
  SecurityReport,
  ComplianceCheck,
  SecurityRecommendation,
  TestResultSummary,
  ExecutionMetrics,
  TriggerSource,
  TestSessionConfiguration,
  TestArtifact,
  ArtifactType,
  TestReport,
  ReportType,
  ReportFormat
} from './module-testing-sandbox';

// Module Documentation (AC4)
export { ModuleDocumentationModule } from './module-documentation';
export type {
  ModuleDocumentationConfig,
  DocumentationProvider,
  DocumentationFormat,
  ExampleComplexity,
  APIDocumentationStyle,
  SearchProvider as DocSearchProvider,
  PublishingTarget,
  DocumentationStatus,
  ContentType,
  DocumentationSection,
  Visibility,
  DocumentationComment,
  CommentType as DocCommentType,
  CommentStatus,
  ExternalLink,
  LinkType,
  CodeExample,
  ExampleFile,
  LineHighlight,
  HighlightType,
  ValidationType,
  Tutorial,
  TutorialDifficulty,
  TutorialStep,
  Quiz,
  QuizQuestion,
  QuestionType,
  TutorialReview,
  DocumentationTemplate,
  TemplateType,
  TemplateSectionConfig,
  TemplateVariable,
  VariableType,
  DocumentationSiteConfig,
  ThemeConfig,
  NavigationConfig,
  NavigationItem,
  SidebarConfig,
  SidebarItem,
  FooterConfig,
  FooterLink,
  SocialLink,
  FeatureConfig,
  SEOConfig,
  MetaTag,
  AnalyticsConfig as DocAnalyticsConfig,
  IntegrationConfig,
  GitHubIntegration,
  SlackIntegration,
  DiscordIntegration,
  IntercomIntegration
} from './module-documentation';

// Module Analytics (AC5)
export { ModuleAnalyticsModule } from './module-analytics';
export type {
  ModuleAnalyticsConfig,
  AnalyticsProvider as ModuleAnalyticsProvider,
  StorageProvider as AnalyticsStorageProvider,
  StreamingProvider,
  ReportingFrequency,
  AlertThreshold,
  ThresholdOperator,
  AlertSeverity,
  EventType,
  AnalyticsEvent,
  DeviceType,
  EventMetadata,
  Environment,
  PerformanceMetrics as AnalyticsPerformanceMetrics,
  ErrorContext,
  ErrorSeverity,
  Breadcrumb,
  BreadcrumbLevel,
  UsageMetrics,
  Timeframe,
  CompatibilityMetrics,
  CompatibilityStats,
  CompatibilityIssue,
  IssueType,
  IssueSeverity,
  IssueStatus,
  IssuePriority,
  SupportMatrix,
  SupportLevel,
  MarketplaceMetrics,
  ModuleRanking,
  SearchQuery as AnalyticsSearchQuery,
  PublisherRanking,
  AnalyticsReport,
  ReportType as AnalyticsReportType,
  ReportSection,
  SectionType,
  Chart,
  ChartType,
  Table,
  TablePagination,
  ReportFormat as AnalyticsReportFormat,
  DeliveryStatus,
  Insight,
  InsightType,
  InsightImpact,
  Recommendation,
  RecommendationType,
  RecommendationPriority,
  EffortLevel,
  ImpactLevel,
  ActionItem,
  ActionItemStatus,
  ActionItemPriority,
  ReportAttachment,
  AttachmentType
} from './module-analytics';

/**
 * Marketplace DNA Factory
 * Factory class for creating and managing all marketplace DNA modules
 */
export class MarketplaceDNAFactory {
  private static instance: MarketplaceDNAFactory;
  private modules: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): MarketplaceDNAFactory {
    if (!MarketplaceDNAFactory.instance) {
      MarketplaceDNAFactory.instance = new MarketplaceDNAFactory();
    }
    return MarketplaceDNAFactory.instance;
  }

  /**
   * Create module marketplace
   */
  public createMarketplace(config: ModuleMarketplaceConfig): ModuleMarketplaceModule {
    const moduleId = 'marketplace';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new ModuleMarketplaceModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create community contributions module
   */
  public createCommunityContributions(config: CommunityContributionsConfig): CommunityContributionsModule {
    const moduleId = 'community_contributions';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new CommunityContributionsModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create testing sandbox module
   */
  public createTestingSandbox(config: ModuleTestingSandboxConfig): ModuleTestingSandboxModule {
    const moduleId = 'testing_sandbox';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new ModuleTestingSandboxModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create documentation module
   */
  public createDocumentation(config: ModuleDocumentationConfig): ModuleDocumentationModule {
    const moduleId = 'documentation';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new ModuleDocumentationModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create analytics module
   */
  public createAnalytics(config: ModuleAnalyticsConfig): ModuleAnalyticsModule {
    const moduleId = 'analytics';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new ModuleAnalyticsModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Get all available modules
   */
  public getAvailableModules(): string[] {
    return [
      'marketplace',
      'community_contributions',
      'testing_sandbox',
      'documentation',
      'analytics'
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

  /**
   * Initialize all marketplace modules
   */
  public async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.modules.values()).map(module => {
      if (typeof module.initialize === 'function') {
        return module.initialize();
      }
      return Promise.resolve();
    });

    await Promise.all(initPromises);
  }
}

/**
 * Default marketplace configuration
 */
export const defaultMarketplaceConfig = {
  marketplace: {
    apiEndpoint: 'https://api.dna-marketplace.com',
    apiTimeout: 30000,
    searchProvider: 'elasticsearch' as const,
    searchIndexName: 'dna-modules',
    enableFuzzySearch: true,
    enableSemanticSearch: true,
    maxSearchResults: 100,
    enableRatings: true,
    enableReviews: true,
    enableAnonymousReviews: false,
    moderationRequired: true,
    ratingScale: 5,
    enableCaching: true,
    cacheProvider: 'redis' as const,
    cacheTTL: 3600,
    enableSecurityScanning: true,
    enableMalwareDetection: true,
    enableLicenseValidation: true,
    trustedPublishers: [],
    enableContentModeration: true,
    profanityFilterEnabled: true,
    spamDetectionEnabled: true,
    enableAnalytics: true,
    analyticsProvider: 'google_analytics' as const,
    trackingEnabled: true,
    enableRecommendations: true,
    enablePersonalization: true,
    recommendationEngine: 'hybrid' as const,
    supportedFrameworks: ['nextjs', 'tauri', 'sveltekit'] as const
  },
  communityContributions: {
    repositoryProvider: 'github' as const,
    repositoryUrl: 'https://github.com/dna/modules',
    defaultBranch: 'main',
    approvalWorkflow: 'peer_review' as const,
    requireCodeReview: true,
    minimumApprovers: 2,
    allowSelfApproval: false,
    enableAutomaticValidation: true,
    enableSecurityScanning: true,
    enableQualityGates: true,
    minimumTestCoverage: 80,
    enableCommunityModerators: true,
    moderatorRoles: ['maintainer', 'core_team'],
    enableContributorRanking: true,
    requireContributorLicense: true,
    defaultLicense: 'MIT',
    licenseCompatibilityCheck: true,
    requireDocumentation: true,
    requireExamples: true,
    documentationStandards: {
      requireReadme: true,
      requireChangelog: true,
      requireAPIReference: true,
      requireUsageExamples: true,
      markdownStandard: 'github_flavored' as const,
      codeDocumentationStandard: 'jsdoc' as const
    },
    enableCICD: true,
    ciProvider: 'github_actions' as const,
    enableAutomaticDeployment: false,
    enableNotifications: true,
    notificationChannels: ['email', 'slack'],
    enableAutomatedTesting: true,
    testingFrameworks: ['jest', 'playwright'],
    enablePerformanceTesting: true,
    enableSecurityTesting: true
  },
  testingSandbox: {
    sandboxProvider: 'docker' as const,
    isolationLevel: 'container' as const,
    enableNetworkAccess: false,
    enableFileSystemAccess: true,
    enableDatabaseAccess: false,
    memoryLimit: 512,
    cpuLimit: 50,
    executionTimeout: 300,
    diskSpaceLimit: 1024,
    networkBandwidthLimit: 1000,
    enableCodeSandboxing: true,
    allowSystemCalls: false,
    allowExternalDependencies: true,
    trustedDependencies: ['@dna/core', '@dna/types'],
    blockedDependencies: [],
    testFrameworks: ['jest', 'vitest', 'playwright'],
    enableUnitTesting: true,
    enableIntegrationTesting: true,
    enablePerformanceTesting: true,
    enableSecurityTesting: true,
    enableCompatibilityTesting: true,
    enableRealTimeMonitoring: true,
    enableDetailedLogging: true,
    logLevel: 'info' as const,
    enableMetricsCollection: true,
    autoCleanup: true,
    cleanupDelay: 300,
    maxSandboxLifetime: 3600,
    storeTestResults: true,
    resultStorageProvider: 'database' as const,
    resultRetentionDays: 90
  },
  documentation: {
    enableAutoGeneration: true,
    generationProvider: 'docusaurus' as const,
    supportedFormats: ['markdown', 'html', 'pdf'],
    defaultFormat: 'markdown' as const,
    enableVersioning: true,
    enableMultiLanguage: false,
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    enableExampleGeneration: true,
    exampleFrameworks: ['nextjs', 'tauri', 'sveltekit'],
    exampleComplexity: ['basic', 'intermediate', 'advanced'],
    enableAPIDocumentation: true,
    apiDocumentationStyle: 'typedoc' as const,
    includeInteractiveExamples: true,
    enableSearchIndex: true,
    searchProvider: 'algolia' as const,
    enableTableOfContents: true,
    enableCrosslinking: true,
    enableAutoPublishing: false,
    publishingTargets: ['static_site'],
    enableCDN: false,
    enableComments: false,
    enableSuggestions: true,
    enableCommunityEditing: false,
    enableSpellCheck: true,
    enableGrammarCheck: false,
    enableLinkValidation: true,
    enableCodeValidation: true,
    enableUsageAnalytics: true,
    trackUserInteractions: true,
    enableHeatmaps: false
  },
  analytics: {
    enableUsageTracking: true,
    enablePerformanceTracking: true,
    enableErrorTracking: true,
    enableCompatibilityTracking: true,
    enableMarketplaceTracking: true,
    analyticsProviders: ['google_analytics'],
    primaryProvider: 'google_analytics' as const,
    dataRetentionDays: 365,
    enableDataArchiving: true,
    archiveProvider: 'aws_s3' as const,
    enablePrivacyMode: false,
    anonymizeUserData: true,
    respectDNT: true,
    enableGDPRCompliance: true,
    enableRealTimeAnalytics: true,
    streamingProvider: 'kafka' as const,
    batchSize: 100,
    batchInterval: 30,
    enableAutomaticReports: true,
    reportingFrequency: 'weekly' as const,
    reportRecipients: ['admin@dna.com'],
    enableDashboard: true,
    dashboardRefreshInterval: 60,
    enableAlerts: true,
    alertThresholds: [
      {
        metric: 'error_rate',
        operator: 'gt' as const,
        value: 5,
        severity: 'warning' as const,
        recipients: ['alerts@dna.com']
      }
    ],
    enableMLAnalytics: false,
    enablePredictiveAnalytics: false,
    enableAnomalyDetection: false
  }
};

/**
 * Module compatibility matrix
 */
export const marketplaceModuleCompatibility = {
  marketplace: {
    dependsOn: [],
    compatibleWith: ['community_contributions', 'documentation', 'analytics'],
    conflicts: []
  },
  community_contributions: {
    dependsOn: [],
    compatibleWith: ['marketplace', 'testing_sandbox', 'documentation', 'analytics'],
    conflicts: []
  },
  testing_sandbox: {
    dependsOn: [],
    compatibleWith: ['community_contributions', 'documentation', 'analytics'],
    conflicts: []
  },
  documentation: {
    dependsOn: [],
    compatibleWith: ['marketplace', 'community_contributions', 'testing_sandbox', 'analytics'],
    conflicts: []
  },
  analytics: {
    dependsOn: [],
    compatibleWith: ['marketplace', 'community_contributions', 'testing_sandbox', 'documentation'],
    conflicts: []
  }
};

/**
 * Framework mapping for marketplace modules
 */
export const marketplaceFrameworkMapping = {
  'Next.js': {
    supportedModules: ['marketplace', 'community_contributions', 'testing_sandbox', 'documentation', 'analytics'],
    integrationPatterns: ['component-based', 'api-routes', 'static-generation']
  },
  'Tauri': {
    supportedModules: ['marketplace', 'community_contributions', 'testing_sandbox', 'documentation', 'analytics'],
    integrationPatterns: ['rust-backend', 'web-frontend', 'native-apis']
  },
  'SvelteKit': {
    supportedModules: ['marketplace', 'community_contributions', 'testing_sandbox', 'documentation', 'analytics'],
    integrationPatterns: ['component-based', 'server-side-rendering', 'progressive-enhancement']
  }
};

/**
 * Marketplace feature flags
 */
export const marketplaceFeatureFlags = {
  enableAdvancedSearch: true,
  enableMLRecommendations: false,
  enableBlockchainIntegration: false,
  enableAICodeGeneration: false,
  enableVirtualReality: false,
  enableSocialFeatures: true,
  enablePremiumTiers: false,
  enableMarketplaceAPI: true,
  enableMobileApp: false,
  enableDesktopApp: true,
  enableCLIInterface: true,
  enableVSCodeExtension: false,
  enableSlackIntegration: true,
  enableDiscordIntegration: true,
  enableGitHubIntegration: true,
  enableJIRAIntegration: false,
  enableZapierIntegration: false
};