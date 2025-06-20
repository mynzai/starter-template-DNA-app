/**
 * @fileoverview Developer Experience (DX) Library Index - Epic 6 Story 1
 * Exports all developer experience modules for enhanced development workflows
 */

// Interactive CLI (AC1)
export {
  InteractiveCLI,
  CLICommand,
  CLIWizard,
  TroubleshootingEngine,
  AutoCompletionProvider,
  ValidationEngine
} from './lib/interactive-cli';

export type {
  InteractiveCLIConfig,
  CLITheme,
  WizardStep,
  WizardCondition,
  WizardContext,
  TroubleshootingCategory,
  TroubleshootingStep,
  ValidationRule,
  ValidationResult,
  CompletionItem,
  CompletionType,
  ProgressIndicator,
  CLIIntegration,
  CLIAnalytics
} from './lib/interactive-cli';

// Hot Reload System (AC2)
export {
  HotReloadServer,
  HotReloadClient,
  FileWatcher,
  ModuleDependencyTracker,
  ReloadStrategy
} from './lib/hot-reload';

export type {
  HotReloadConfig,
  ReloadStrategy as ReloadStrategyType,
  FileChangeEvent,
  ModuleGraph,
  ModuleDependency,
  ReloadResult,
  ClientConnection,
  ServerEvent,
  WatchPattern,
  ReloadMetrics,
  HMRUpdate,
  WebSocketConfig,
  SSEConfig,
  PollingConfig
} from './lib/hot-reload';

// IDE Extensions (AC3)
export {
  DNALanguageServer,
  CompletionProvider,
  HoverProvider,
  DiagnosticProvider,
  CodeActionProvider,
  DocumentSymbolProvider,
  VSCodeExtension,
  IntelliJExtension
} from './lib/ide-extensions';

export type {
  IDEExtensionConfig,
  LanguageServerConfig,
  CompletionItem as IDECompletionItem,
  Hover,
  Diagnostic,
  CodeAction,
  DocumentSymbol,
  SymbolKind,
  DiagnosticSeverity,
  CodeActionKind,
  Range,
  Position,
  Location,
  WorkspaceEdit,
  TextEdit,
  SnippetString,
  ExtensionContext,
  StatusBarItem,
  OutputChannel
} from './lib/ide-extensions';

// Development Environment Containerization (AC4)
export {
  DevEnvironmentManager,
  frameworkPresets,
  createDefaultConfig
} from './lib/dev-environment';

export type {
  DevEnvironmentConfig,
  ServiceConfiguration,
  ServiceType,
  VolumeConfiguration,
  VolumeType,
  NetworkConfiguration,
  NetworkDriver,
  EnvironmentConfiguration,
  MonitoringConfiguration,
  SecurityConfiguration,
  DevelopmentConfiguration,
  ResourceConfiguration,
  HealthCheckConfiguration,
  PersistenceConfiguration,
  BackupConfiguration,
  EnvironmentStatus,
  EnvironmentState,
  ServiceStatus,
  ServiceState,
  ServiceHealth,
  ResourceUsage,
  EnvironmentOperation,
  OperationType,
  OperationStatus,
  FrameworkPreset,
  ConsistencyLevel,
  RestartPolicy,
  PortMapping,
  SyncStrategy,
  BuildStrategy,
  CachingConfiguration,
  OptimizationConfiguration
} from './lib/dev-environment';

// Error Handling and Debugging (AC5)
export {
  ErrorHandler,
  createErrorHandler,
  defaultErrorHandlerConfig
} from './lib/error-handling';

export type {
  DNAError,
  ErrorType,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  ErrorSolution,
  SolutionType,
  SolutionDifficulty,
  SolutionCategory,
  SolutionStep,
  StepType,
  Command,
  CodeExample,
  FileOperation,
  FileOperationType,
  EnvironmentRequirement,
  ValidationStep,
  ErrorHandlerConfig,
  ErrorPattern,
  SolutionProvider,
  ErrorStatistics,
  DebugInfo,
  PerformanceMetrics,
  DebuggingGuide,
  Platform,
  DocumentationLink,
  AlternativeSolution,
  NotificationSettings,
  DebuggingTool,
  Integration
} from './lib/error-handling';

/**
 * DX Factory for creating integrated developer experience tools
 */
export class DXFactory {
  private static instance: DXFactory;
  private tools: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): DXFactory {
    if (!DXFactory.instance) {
      DXFactory.instance = new DXFactory();
    }
    return DXFactory.instance;
  }

  /**
   * Create complete DX environment for framework
   */
  public createDXEnvironment(framework: string, config?: any) {
    const dxConfig = this.getFrameworkDXConfig(framework, config);
    
    return {
      cli: new InteractiveCLI(dxConfig.cli),
      hotReload: new HotReloadServer(dxConfig.hotReload),
      languageServer: new DNALanguageServer(dxConfig.ide),
      devEnvironment: new DevEnvironmentManager(dxConfig.environment),
      errorHandler: createErrorHandler(framework, dxConfig.errorHandling)
    };
  }

  /**
   * Get framework-specific DX configuration
   */
  private getFrameworkDXConfig(framework: string, customConfig?: any) {
    const baseConfig = {
      cli: {
        projectName: customConfig?.projectName || 'dna-project',
        framework,
        theme: 'default' as const,
        enableWizards: true,
        enableTroubleshooting: true,
        enableAutoCompletion: true,
        enableProgressIndicators: true,
        enableAnalytics: false,
        wizards: [],
        troubleshootingCategories: [],
        validationRules: [],
        completionProviders: [],
        integrations: [],
        customCommands: []
      },
      hotReload: {
        enabled: true,
        framework,
        reloadStrategy: 'hmr' as const,
        port: 3001,
        host: 'localhost',
        enableSSL: false,
        watchPaths: ['src/**/*'],
        ignorePaths: ['node_modules/**/*', '.git/**/*'],
        debounceDelay: 300,
        enableSourceMaps: true,
        enableErrorOverlay: true,
        enableLogging: true,
        enableMetrics: true,
        websocket: {
          heartbeatInterval: 30000,
          reconnectAttempts: 5,
          reconnectDelay: 1000
        },
        hmr: {
          enableCSSHotReload: true,
          enableJSHotReload: true,
          enableAssetHotReload: true,
          preserveState: true,
          enableErrorBoundary: true
        }
      },
      ide: {
        enableIntelliSense: true,
        enableDiagnostics: true,
        enableCodeActions: true,
        enableHover: true,
        enableDocumentSymbols: true,
        enableSnippets: true,
        framework,
        languageId: framework === 'tauri' ? 'rust' : 'typescript',
        enableTemplateSupport: true,
        enableDNAModuleSupport: true,
        enableFrameworkSpecificFeatures: true,
        completionTriggerCharacters: ['.', '/', '@', '<'],
        hoverTriggerCharacters: ['.', '(', ')'],
        enableSemanticHighlighting: true,
        enableErrorLens: true,
        enableAutoImports: true,
        enableQuickFixes: true
      },
      environment: createDefaultConfig(
        customConfig?.projectName || 'dna-project',
        framework as any
      ),
      errorHandling: {
        ...defaultErrorHandlerConfig,
        enableAutomaticResolution: true,
        enableSuggestions: true,
        enableContextCapture: true
      }
    };

    return { ...baseConfig, ...customConfig };
  }

  /**
   * Get all available DX tools
   */
  public getAvailableTools(): string[] {
    return [
      'interactive-cli',
      'hot-reload',
      'ide-extensions', 
      'dev-environment',
      'error-handling'
    ];
  }

  /**
   * Check DX tool compatibility
   */
  public checkCompatibility(framework: string): CompatibilityReport {
    const compatibility: CompatibilityReport = {
      framework,
      compatible: true,
      tools: {
        'interactive-cli': { supported: true, features: ['wizards', 'troubleshooting', 'completion'] },
        'hot-reload': { supported: true, features: ['hmr', 'websocket', 'file-watching'] },
        'ide-extensions': { supported: true, features: ['intellisense', 'diagnostics', 'snippets'] },
        'dev-environment': { supported: true, features: ['docker', 'orchestration', 'monitoring'] },
        'error-handling': { supported: true, features: ['classification', 'solutions', 'debugging'] }
      },
      recommendations: [],
      limitations: []
    };

    // Add framework-specific recommendations
    switch (framework) {
      case 'tauri':
        compatibility.recommendations.push('Enable Rust analyzer for better IDE support');
        compatibility.recommendations.push('Use cargo watch for faster rebuilds');
        break;
      case 'nextjs':
        compatibility.recommendations.push('Enable Next.js specific hot reload optimizations');
        compatibility.recommendations.push('Use SWC for faster builds');
        break;
      case 'sveltekit':
        compatibility.recommendations.push('Enable Vite specific HMR features');
        compatibility.recommendations.push('Use Svelte language server for better IDE support');
        break;
    }

    return compatibility;
  }
}

interface CompatibilityReport {
  framework: string;
  compatible: boolean;
  tools: Record<string, ToolCompatibility>;
  recommendations: string[];
  limitations: string[];
}

interface ToolCompatibility {
  supported: boolean;
  features: string[];
  limitations?: string[];
}

/**
 * Default DX configurations for different frameworks
 */
export const frameworkDXConfigs = {
  nextjs: {
    hotReload: {
      reloadStrategy: 'hmr' as const,
      port: 3001,
      enableCSSHotReload: true,
      enableJSHotReload: true
    },
    ide: {
      languageId: 'typescript',
      enableReactSupport: true,
      enableNextJSSpecificFeatures: true
    }
  },
  tauri: {
    hotReload: {
      reloadStrategy: 'full' as const,
      port: 1420,
      enableRustReload: true,
      enableWebviewReload: true
    },
    ide: {
      languageId: 'rust',
      enableTauriSupport: true,
      enableWebviewDebugging: true
    }
  },
  sveltekit: {
    hotReload: {
      reloadStrategy: 'hmr' as const,
      port: 5173,
      enableSvelteHMR: true,
      enableViteOptimizations: true
    },
    ide: {
      languageId: 'typescript',
      enableSvelteSupport: true,
      enableSvelteKitFeatures: true
    }
  }
};

/**
 * Utility functions for DX operations
 */
export const DXUtils = {
  /**
   * Detect framework from project structure
   */
  detectFramework(): string {
    // Implementation would analyze package.json, config files, etc.
    return process.env.DNA_FRAMEWORK || 'unknown';
  },

  /**
   * Validate DX environment setup
   */
  async validateEnvironment(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    results.push({
      name: 'Node.js Version',
      status: 'success',
      message: `Node.js ${nodeVersion} detected`,
      details: {}
    });

    // Check package manager
    // Add more validation checks...

    return results;
  },

  /**
   * Get DX performance metrics
   */
  async getPerformanceMetrics(): Promise<DXPerformanceMetrics> {
    return {
      hotReloadTime: 0, // Would measure actual hot reload performance
      buildTime: 0,
      bundleSize: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0
    };
  }
};

interface DXPerformanceMetrics {
  hotReloadTime: number;
  buildTime: number;
  bundleSize: number;
  memoryUsage: number;
  cpuUsage: number;
}

// Interactive Documentation System (Epic 6 Story 2 AC1)
export {
  InteractiveDocumentationSystem,
  createInteractiveDocumentationSystem,
  defaultInteractiveDocsConfig
} from './lib/interactive-docs';

export type {
  InteractiveDocsConfig,
  DocsTheme,
  DocsFeatures,
  PlaygroundConfig,
  TutorialConfig,
  ExampleConfig,
  Video,
  Tutorial,
  Example,
  PlaygroundSession,
  TutorialProgress
} from './lib/interactive-docs';

// Video Walkthrough System (Epic 6 Story 2 AC2)
export {
  VideoWalkthroughSystem
} from './lib/video-walkthroughs';

export type {
  VideoWalkthroughConfig,
  Video as VideoWalkthrough,
  Chapter,
  Annotation,
  ViewingSession,
  VideoCategory,
  VideoMetadata
} from './lib/video-walkthroughs';

// Architecture Decision Records (Epic 6 Story 2 AC3)
export {
  ADRSystem
} from './lib/architecture-decisions';

export type {
  ADRConfig,
  ADR,
  ADRStatus,
  ADRContext,
  ADRDecision,
  ADRConsequences,
  BreakingChange,
  Migration as ADRMigration,
  Amendment,
  ADRTemplate
} from './lib/architecture-decisions';

// Migration Guide System (Epic 6 Story 2 AC4)
export {
  MigrationGuideSystem
} from './lib/migration-guides';

export type {
  MigrationGuideConfig,
  Migration,
  MigrationPlan,
  MigrationSession,
  MigrationStep,
  BreakingChange as MigrationBreakingChange,
  MigrationStatus,
  ImpactAnalysis,
  CompatibilityReport
} from './lib/migration-guides';

// Knowledge Base System (Epic 6 Story 2 AC5)
export {
  KnowledgeBaseSystem
} from './lib/knowledge-base';

export type {
  KnowledgeBaseConfig,
  KBArticle,
  Question,
  Answer,
  SearchResults,
  SearchOptions,
  TrendingContent,
  ContentSuggestion,
  QAConfig,
  CommunityConfig
} from './lib/knowledge-base';

export default DXFactory;