/**
 * @fileoverview Enhanced DNA Module Interface Foundation (Epic 1 Story 3a)
 * Provides standardized interfaces for DNA module development across all frameworks
 */

import { z } from 'zod';
import {
  DNAModule,
  DNAModuleMetadata,
  DNAModuleContext,
  DNAModuleFile,
  DNAValidationResult,
  SupportedFramework,
  TemplateType,
  DNAModuleConfig,
  FrameworkImplementation
} from './types';

/**
 * Enhanced DNA Module lifecycle interface with all required methods
 * Implements AC1: Base DNA module interface with lifecycle methods (init, validate, generate, cleanup)
 */
export interface IDNAModule extends DNAModule {
  // Core identification
  readonly id: string;
  readonly metadata: DNAModuleMetadata;
  
  // Enhanced lifecycle methods
  init(context: DNAContext): Promise<void>;
  validate(config: DNAModuleConfig): Promise<ValidationResult>;
  generate(target: GenerationTarget): Promise<GenerationResult>;
  cleanup(): Promise<void>;
  
  // Configuration management
  configure(userConfig: any): Promise<ConfigurationResult>;
  getConfigSchema(): z.ZodSchema;
  getDefaultConfig(): Record<string, any>;
  
  // Framework compatibility
  supportsFramework(framework: SupportedFramework): boolean;
  getFrameworkAdapter(framework: SupportedFramework): FrameworkAdapter | null;
  
  // Dependency management
  getDependencies(): ModuleDependency[];
  getConflicts(): ModuleConflict[];
  checkCompatibility(other: IDNAModule): CompatibilityCheck;
  
  // Versioning and migration
  getVersion(): string;
  getMigrationPath(fromVersion: string): MigrationPath;
  isBackwardCompatible(version: string): boolean;
}

/**
 * DNA execution context
 */
export interface DNAContext {
  projectName: string;
  outputPath: string;
  framework: SupportedFramework;
  templateType: TemplateType;
  variables: Record<string, any>;
  logger: DNALogger;
  fileSystem: DNAFileSystem;
  packageManager: PackageManager;
  gitEnabled: boolean;
  dryRun: boolean;
}

/**
 * Generation target specification
 */
export interface GenerationTarget {
  framework: SupportedFramework;
  templateType: TemplateType;
  outputPath: string;
  projectConfig: ProjectConfig;
  features: string[];
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  performance: {
    validationTime: number;
    complexity: number;
  };
}

/**
 * Generation result interface
 */
export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  dependencies: string[];
  postInstallSteps: string[];
  errors: GenerationError[];
  metrics: GenerationMetrics;
}

/**
 * Configuration result interface
 */
export interface ConfigurationResult {
  config: Record<string, any>;
  valid: boolean;
  errors: string[];
  warnings: string[];
  applied: string[];
}

/**
 * AC2: Framework-specific adapter interfaces
 */

/**
 * Base framework adapter interface
 */
export interface FrameworkAdapter {
  readonly framework: SupportedFramework;
  readonly version: string;
  readonly capabilities: FrameworkCapabilities;
  
  // File generation
  generateFiles(context: DNAContext, config: any): Promise<GeneratedFile[]>;
  generateConfigFiles(context: DNAContext): Promise<ConfigFile[]>;
  generateSourceFiles(context: DNAContext, config: any): Promise<SourceFile[]>;
  generateTestFiles(context: DNAContext, config: any): Promise<TestFile[]>;
  
  // Package management
  getDependencies(config: any): PackageDependency[];
  getDevDependencies(config: any): PackageDependency[];
  getPeerDependencies(config: any): PackageDependency[];
  
  // Build system integration
  updateBuildConfig(context: DNAContext, config: any): Promise<void>;
  validateSetup(context: DNAContext): Promise<ValidationResult>;
  
  // Framework-specific operations
  addImports(file: SourceFile, imports: ImportStatement[]): SourceFile;
  addConfiguration(config: ConfigFile, settings: any): ConfigFile;
  applyFrameworkPatterns(context: DNAContext): Promise<void>;
}

/**
 * Flutter-specific adapter
 */
export interface FlutterDNAAdapter extends FrameworkAdapter {
  framework: SupportedFramework.FLUTTER;
  
  // Flutter-specific methods
  generateWidgets(context: DNAContext, config: FlutterConfig): Promise<WidgetFile[]>;
  updatePubspec(context: DNAContext, dependencies: FlutterDependency[]): Promise<void>;
  generateAnalysisOptions(context: DNAContext): Promise<ConfigFile>;
  setupFlavors(context: DNAContext, flavors: FlutterFlavor[]): Promise<void>;
  addAssets(context: DNAContext, assets: AssetDefinition[]): Promise<void>;
  
  // Platform-specific generation
  generateAndroidConfig(context: DNAContext): Promise<ConfigFile[]>;
  generateIOSConfig(context: DNAContext): Promise<ConfigFile[]>;
  generateWebConfig(context: DNAContext): Promise<ConfigFile[]>;
}

/**
 * React Native-specific adapter
 */
export interface ReactNativeDNAAdapter extends FrameworkAdapter {
  framework: SupportedFramework.REACT_NATIVE;
  
  // React Native-specific methods
  generateComponents(context: DNAContext, config: ReactNativeConfig): Promise<ComponentFile[]>;
  updateMetroConfig(context: DNAContext): Promise<ConfigFile>;
  setupNavigation(context: DNAContext, config: NavigationConfig): Promise<void>;
  addNativeModules(context: DNAContext, modules: NativeModule[]): Promise<void>;
  
  // Platform-specific generation
  generateAndroidFiles(context: DNAContext): Promise<SourceFile[]>;
  generateIOSFiles(context: DNAContext): Promise<SourceFile[]>;
  updateGradleConfig(context: DNAContext): Promise<ConfigFile>;
  updatePodfile(context: DNAContext): Promise<ConfigFile>;
}

/**
 * Next.js-specific adapter
 */
export interface NextJSDNAAdapter extends FrameworkAdapter {
  framework: SupportedFramework.NEXTJS;
  
  // Next.js-specific methods
  generatePages(context: DNAContext, config: NextJSConfig): Promise<PageFile[]>;
  generateComponents(context: DNAContext, config: ComponentConfig): Promise<ComponentFile[]>;
  updateNextConfig(context: DNAContext): Promise<ConfigFile>;
  setupMiddleware(context: DNAContext, middleware: MiddlewareConfig[]): Promise<void>;
  addAPIRoutes(context: DNAContext, routes: APIRoute[]): Promise<void>;
  
  // App Router support
  generateAppDirectory(context: DNAContext): Promise<SourceFile[]>;
  setupLayouts(context: DNAContext, layouts: LayoutConfig[]): Promise<void>;
  addServerComponents(context: DNAContext, components: ServerComponent[]): Promise<void>;
}

/**
 * Tauri-specific adapter
 */
export interface TauriDNAAdapter extends FrameworkAdapter {
  framework: SupportedFramework.TAURI;
  
  // Tauri-specific methods
  generateRustBackend(context: DNAContext, config: TauriConfig): Promise<RustFile[]>;
  generateFrontend(context: DNAContext, frontendFramework: string): Promise<SourceFile[]>;
  updateTauriConfig(context: DNAContext): Promise<ConfigFile>;
  addCommands(context: DNAContext, commands: TauriCommand[]): Promise<void>;
  setupPermissions(context: DNAContext, permissions: TauriPermission[]): Promise<void>;
  
  // Build configuration
  updateCargoToml(context: DNAContext): Promise<ConfigFile>;
  generateBuildScript(context: DNAContext): Promise<SourceFile>;
  setupBundling(context: DNAContext, config: BundleConfig): Promise<void>;
}

/**
 * AC3: DNA module metadata schema with versioning, dependencies, and compatibility matrix
 */

/**
 * Enhanced metadata schema
 */
export const EnhancedDNAModuleMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[\w.-]+)?$/),
  category: z.enum(['auth', 'payment', 'ai', 'real-time', 'security', 'testing', 'database', 'ui', 'analytics']),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional()
  }).optional(),
  homepage: z.string().url().optional(),
  repository: z.object({
    type: z.enum(['git', 'svn']),
    url: z.string().url()
  }).optional(),
  license: z.string().default('MIT'),
  keywords: z.array(z.string()).default([]),
  
  // Versioning information
  compatibility: z.object({
    minVersion: z.string(),
    maxVersion: z.string().optional(),
    breakingChanges: z.array(z.string()).default([])
  }),
  
  // Framework support matrix
  frameworks: z.array(z.object({
    name: z.nativeEnum(SupportedFramework),
    supported: z.boolean(),
    minVersion: z.string().optional(),
    maxVersion: z.string().optional(),
    limitations: z.array(z.string()).default([]),
    experimental: z.boolean().default(false)
  })),
  
  // Dependencies and conflicts
  dependencies: z.array(z.object({
    moduleId: z.string(),
    version: z.string(),
    optional: z.boolean().default(false),
    reason: z.string()
  })).default([]),
  
  conflicts: z.array(z.object({
    moduleId: z.string(),
    version: z.string().optional(),
    reason: z.string(),
    severity: z.enum(['error', 'warning']),
    resolution: z.string().optional()
  })).default([]),
  
  // Status flags
  deprecated: z.boolean().default(false),
  experimental: z.boolean().default(false),
  stable: z.boolean().default(true),
  
  // Lifecycle information
  lifecycle: z.object({
    stage: z.enum(['alpha', 'beta', 'stable', 'maintenance', 'deprecated']),
    supportUntil: z.string().optional(),
    migrationGuide: z.string().url().optional()
  })
});

export type EnhancedDNAModuleMetadata = z.infer<typeof EnhancedDNAModuleMetadataSchema>;

/**
 * AC4: Configuration validation system using TypeScript and runtime schema validation
 */

/**
 * Configuration validator interface
 */
export interface ConfigurationValidator {
  schema: z.ZodSchema;
  validate(config: any): ValidationResult;
  sanitize(config: any): any;
  getDefaults(): Record<string, any>;
  getExamples(): Record<string, any>;
  generateDocumentation(): string;
}

/**
 * Runtime configuration validation
 */
export class DNAConfigurationValidator implements ConfigurationValidator {
  constructor(
    public readonly schema: z.ZodSchema,
    private readonly defaults: Record<string, any> = {},
    private readonly examples: Record<string, any> = {}
  ) {}

  validate(config: any): ValidationResult {
    try {
      this.schema.parse(config);
      return {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        performance: {
          validationTime: Date.now(),
          complexity: this.calculateComplexity(config)
        }
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
            severity: 'error' as const
          })),
          warnings: [],
          suggestions: this.generateSuggestions(error),
          performance: {
            validationTime: Date.now(),
            complexity: 0
          }
        };
      }
      
      return {
        valid: false,
        errors: [{
          path: '',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'UNKNOWN_ERROR',
          severity: 'error' as const
        }],
        warnings: [],
        suggestions: [],
        performance: {
          validationTime: Date.now(),
          complexity: 0
        }
      };
    }
  }

  sanitize(config: any): any {
    try {
      return this.schema.parse(config);
    } catch {
      return { ...this.defaults, ...config };
    }
  }

  getDefaults(): Record<string, any> {
    return this.defaults;
  }

  getExamples(): Record<string, any> {
    return this.examples;
  }

  generateDocumentation(): string {
    // Generate documentation from schema
    return `Configuration schema for DNA module`;
  }

  private calculateComplexity(config: any): number {
    // Simple complexity calculation based on object depth and properties
    const countProps = (obj: any, depth = 0): number => {
      if (typeof obj !== 'object' || obj === null) return 1;
      if (depth > 10) return 1; // Prevent infinite recursion
      
      return Object.values(obj).reduce((sum, value) => {
        return sum + countProps(value, depth + 1);
      }, Object.keys(obj).length);
    };
    
    return countProps(config);
  }

  private generateSuggestions(error: z.ZodError): string[] {
    return error.errors.map(e => {
      switch (e.code) {
        case 'invalid_type':
          return `Expected ${e.expected} for ${e.path.join('.')}, got ${e.received}`;
        case 'too_small':
          return `${e.path.join('.')} should be at least ${e.minimum}`;
        case 'too_big':
          return `${e.path.join('.')} should be at most ${e.maximum}`;
        default:
          return `Check configuration for ${e.path.join('.')}: ${e.message}`;
      }
    });
  }
}

/**
 * Supporting type definitions
 */

export interface FrameworkCapabilities {
  hasHotReload: boolean;
  hasTypeScript: boolean;
  hasTestingFramework: boolean;
  hasStateManagement: boolean;
  hasRouting: boolean;
  hasAPISupport: boolean;
  hasWebSupport: boolean;
  hasMobileSupport: boolean;
  hasDesktopSupport: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'source' | 'config' | 'test' | 'asset';
  overwrite: boolean;
  encoding: 'utf8' | 'binary';
}

export interface ConfigFile extends GeneratedFile {
  type: 'config';
  format: 'json' | 'yaml' | 'toml' | 'xml' | 'js' | 'ts';
}

export interface SourceFile extends GeneratedFile {
  type: 'source';
  language: string;
  imports: ImportStatement[];
  exports: ExportStatement[];
}

export interface TestFile extends GeneratedFile {
  type: 'test';
  framework: string;
  testType: 'unit' | 'integration' | 'e2e';
}

export interface ImportStatement {
  source: string;
  imports: string[];
  default?: string;
  namespace?: string;
}

export interface ExportStatement {
  name: string;
  type: 'default' | 'named' | 'namespace';
  value?: any;
}

export interface PackageDependency {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  path: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

export interface GenerationError {
  stage: string;
  message: string;
  file?: string;
  line?: number;
  recoverable: boolean;
}

export interface GenerationMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  filesGenerated: number;
  linesOfCode: number;
  memoryUsage: number;
}

export interface ModuleDependency {
  moduleId: string;
  version: string;
  optional: boolean;
  reason: string;
}

export interface ModuleConflict {
  moduleId: string;
  reason: string;
  severity: 'error' | 'warning';
  resolution?: string;
}

export interface CompatibilityCheck {
  compatible: boolean;
  issues: string[];
  suggestions: string[];
}

export interface MigrationPath {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  automated: boolean;
  breaking: boolean;
}

export interface MigrationStep {
  description: string;
  action: 'add' | 'remove' | 'modify' | 'rename';
  target: string;
  automated: boolean;
  script?: string;
}

export interface ProjectConfig {
  name: string;
  description?: string;
  version: string;
  author?: string;
  license?: string;
  repository?: string;
  features: string[];
  environment: 'development' | 'staging' | 'production';
}

export interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun';
  installCommand: string[];
  addCommand: string[];
  removeCommand: string[];
  lockFile: string;
}

export interface DNALogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  success(message: string, meta?: any): void;
}

export interface DNAFileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  copy(source: string, destination: string): Promise<void>;
  remove(path: string): Promise<void>;
}

// Framework-specific configuration types
export interface FlutterConfig {
  sdk: string;
  platforms: ('android' | 'ios' | 'web' | 'windows' | 'macos' | 'linux')[];
  dependencies: FlutterDependency[];
  assets: AssetDefinition[];
  flavors: FlutterFlavor[];
}

export interface ReactNativeConfig {
  version: string;
  platforms: ('android' | 'ios')[];
  navigation: NavigationConfig;
  stateManagement: string;
  nativeModules: NativeModule[];
}

export interface NextJSConfig {
  version: string;
  appRouter: boolean;
  typescript: boolean;
  styling: string;
  database?: string;
  authentication?: string;
}

export interface TauriConfig {
  version: string;
  frontend: string;
  rustFeatures: string[];
  permissions: TauriPermission[];
  bundling: BundleConfig;
}

export interface FlutterDependency {
  name: string;
  version?: string;
  path?: string;
  git?: string;
}

export interface AssetDefinition {
  path: string;
  type: 'image' | 'font' | 'data';
}

export interface FlutterFlavor {
  name: string;
  appId: string;
  displayName: string;
}

export interface WidgetFile extends SourceFile {
  widgetName: string;
  stateful: boolean;
}

export interface ComponentFile extends SourceFile {
  componentName: string;
  props: string[];
  hooks: string[];
}

export interface PageFile extends SourceFile {
  route: string;
  layout?: string;
}

export interface NavigationConfig {
  type: 'stack' | 'tab' | 'drawer';
  screens: string[];
}

export interface NativeModule {
  name: string;
  platform: 'android' | 'ios' | 'both';
  package: string;
}

export interface MiddlewareConfig {
  path: string;
  matcher: string[];
}

export interface APIRoute {
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[];
  handler: string;
}

export interface LayoutConfig {
  name: string;
  nested: boolean;
  shared: boolean;
}

export interface ServerComponent {
  name: string;
  async: boolean;
  streaming: boolean;
}

export interface RustFile extends SourceFile {
  module: string;
  public: boolean;
  features: string[];
}

export interface TauriCommand {
  name: string;
  async: boolean;
  params: string[];
  returns: string;
}

export interface TauriPermission {
  name: string;
  scope: string[];
}

export interface BundleConfig {
  identifier: string;
  icon: string;
  targets: string[];
}

export interface ComponentConfig {
  directory: string;
  typescript: boolean;
  styling: string;
}