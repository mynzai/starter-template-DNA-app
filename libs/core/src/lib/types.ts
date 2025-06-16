/**
 * @fileoverview Core type definitions for DNA Template Engine
 */

import { z } from 'zod';

/**
 * DNA Module lifecycle stages
 */
export enum DNAModuleLifecycle {
  INITIALIZE = 'initialize',
  CONFIGURE = 'configure',
  VALIDATE = 'validate',
  GENERATE = 'generate',
  INSTALL = 'install',
  FINALIZE = 'finalize',
  CLEANUP = 'cleanup'
}

/**
 * DNA Module category types
 */
export enum DNAModuleCategory {
  AUTHENTICATION = 'authentication',
  PAYMENT = 'payment',
  AI_INTEGRATION = 'ai-integration',
  REAL_TIME = 'real-time',
  SECURITY = 'security',
  TESTING = 'testing',
  DATABASE = 'database',
  UI_FRAMEWORK = 'ui-framework',
  ANALYTICS = 'analytics',
  MONITORING = 'monitoring'
}

/**
 * DNA Module compatibility level
 */
export enum CompatibilityLevel {
  FULL = 'full',
  PARTIAL = 'partial',
  NONE = 'none'
}

/**
 * DNA Module metadata schema
 */
export const DNAModuleMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[\w.-]+)?$/),
  category: z.nativeEnum(DNAModuleCategory),
  author: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
  experimental: z.boolean().default(false)
});

export type DNAModuleMetadata = z.infer<typeof DNAModuleMetadataSchema>;

/**
 * DNA Module dependency configuration
 */
export interface DNAModuleDependency {
  readonly moduleId: string;
  readonly version: string;
  readonly optional: boolean;
  readonly reason: string;
}

/**
 * DNA Module conflict definition
 */
export interface DNAModuleConflict {
  readonly moduleId: string;
  readonly version?: string;
  readonly reason: string;
  readonly severity: 'error' | 'warning';
  readonly resolution?: string;
}

/**
 * DNA Module configuration schema
 */
export interface DNAModuleConfig {
  readonly schema: object;
  readonly defaults: Record<string, any>;
  readonly required: string[];
  readonly validation: {
    readonly rules: Record<string, any>;
    readonly custom?: (config: any) => Promise<string[]>;
  };
}

/**
 * Framework-specific implementation details
 */
export interface FrameworkImplementation {
  readonly framework: SupportedFramework;
  readonly supported: boolean;
  readonly compatibility: CompatibilityLevel;
  readonly dependencies: string[];
  readonly devDependencies: string[];
  readonly peerDependencies: string[];
  readonly configFiles: string[];
  readonly templates: string[];
  readonly postInstallSteps: string[];
  readonly limitations: string[];
}

/**
 * Enhanced DNA Module interface
 */
export interface DNAModule {
  readonly id: string;
  readonly metadata: DNAModuleMetadata;
  readonly dependencies: DNAModuleDependency[];
  readonly conflicts: DNAModuleConflict[];
  readonly frameworks: FrameworkImplementation[];
  readonly config: DNAModuleConfig;
  
  // Lifecycle methods
  initialize(context: DNAModuleContext): Promise<void>;
  configure(config: any, context: DNAModuleContext): Promise<any>;
  validate(config: any, context: DNAModuleContext): Promise<DNAValidationResult>;
  generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]>;
  install(context: DNAModuleContext): Promise<void>;
  finalize(context: DNAModuleContext): Promise<void>;
  cleanup(context: DNAModuleContext): Promise<void>;
  
  // Utility methods
  getFrameworkSupport(framework: SupportedFramework): FrameworkImplementation | null;
  getCompatibilityWith(moduleId: string): CompatibilityLevel;
  getMigrationPath(fromVersion: string, toVersion: string): DNAMigrationStep[];
}

/**
 * DNA Module execution context
 */
export interface DNAModuleContext {
  readonly projectName: string;
  readonly outputPath: string;
  readonly framework: SupportedFramework;
  readonly templateType: TemplateType;
  readonly moduleConfig: any;
  readonly globalConfig: Record<string, any>;
  readonly availableModules: Map<string, DNAModule>;
  readonly activeModules: DNAModule[];
  readonly fileSystem: DNAFileSystem;
  readonly logger: DNALogger;
}

/**
 * DNA Module file representation
 */
export interface DNAModuleFile {
  readonly relativePath: string;
  readonly content: string;
  readonly encoding: 'utf8' | 'binary';
  readonly executable: boolean;
  readonly overwrite: boolean;
  readonly mergeStrategy: 'replace' | 'merge' | 'append' | 'prepend';
  readonly conditions: Record<string, any>;
}

/**
 * DNA validation result
 */
export interface DNAValidationResult {
  readonly valid: boolean;
  readonly errors: DNAValidationError[];
  readonly warnings: DNAValidationWarning[];
  readonly suggestions: DNAValidationSuggestion[];
}

export interface DNAValidationError {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly severity: 'error' | 'critical';
  readonly resolution?: string;
}

export interface DNAValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly impact: 'low' | 'medium' | 'high';
  readonly recommendation?: string;
}

export interface DNAValidationSuggestion {
  readonly type: 'optimization' | 'feature' | 'compatibility';
  readonly message: string;
  readonly action?: string;
}

/**
 * DNA migration step
 */
export interface DNAMigrationStep {
  readonly version: string;
  readonly description: string;
  readonly breaking: boolean;
  readonly automated: boolean;
  readonly script?: string;
  readonly instructions: string[];
}

/**
 * DNA file system abstraction
 */
export interface DNAFileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  copy(source: string, destination: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
  access(path: string, mode?: number): Promise<void>;
  pathExists(path: string): Promise<boolean>;
  writeJSON(path: string, data: any, options?: { spaces?: number }): Promise<void>;
  constants: {
    R_OK: number;
    W_OK: number;
    X_OK: number;
    F_OK: number;
  };
}

/**
 * DNA logger interface
 */
export interface DNALogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  success(message: string, meta?: any): void;
}

export interface TemplateConfig {
  readonly name: string;
  readonly type: TemplateType;
  readonly framework: SupportedFramework;
  readonly dnaModules: string[];
  readonly outputPath: string;
  readonly variables?: Record<string, any>;
  readonly metadata?: Record<string, any>;
}

export enum SupportedFramework {
  FLUTTER = 'flutter',
  REACT_NATIVE = 'react-native',
  NEXTJS = 'nextjs',
  TAURI = 'tauri',
  SVELTEKIT = 'sveltekit',
  TYPESCRIPT = 'typescript',
}

export enum TemplateType {
  AI_SAAS = 'ai-saas',
  DEVELOPMENT_TOOLS = 'development-tools',
  BUSINESS_APPS = 'business-apps',
  MOBILE_ASSISTANTS = 'mobile-assistants',
  REAL_TIME_COLLABORATION = 'real-time-collaboration',
  HIGH_PERFORMANCE_APIS = 'high-performance-apis',
  DATA_VISUALIZATION = 'data-visualization',
  FLUTTER_UNIVERSAL = 'flutter-universal',
  REACT_NATIVE_HYBRID = 'react-native-hybrid',
  MODERN_ELECTRON = 'modern-electron',
  FOUNDATION = 'foundation',
}

export interface GenerationResult {
  readonly success: boolean;
  readonly outputPath: string;
  readonly generatedFiles: string[];
  readonly errors: string[];
  readonly warnings: string[];
  readonly metrics: GenerationMetrics;
}

export interface GenerationMetrics {
  readonly executionTime: number;
  readonly filesGenerated: number;
  readonly linesOfCode: number;
  readonly testCoverage: number;
  readonly pipelineMetrics?: PipelineMetrics;
}

/**
 * Represents a template file during processing
 */
export interface TemplateFile {
  readonly sourcePath?: string;
  readonly relativePath: string;
  readonly outputPath?: string;
  readonly content: string;
  readonly isTemplate: boolean;
  readonly encoding?: string;
}

/**
 * Template processing context with all variables and helpers
 */
export interface TemplateContext {
  readonly project: {
    name: string;
    pascalName: string;
    kebabName: string;
    snakeName: string;
    camelName: string;
  };
  readonly framework: SupportedFramework;
  readonly type: TemplateType;
  readonly modules: Record<string, {
    enabled: boolean;
    config: any;
    module: DNAModule;
  }>;
  readonly variables: Record<string, any>;
  readonly timestamp: string;
  readonly year: number;
}

/**
 * DNA composition configuration
 */
export interface DNAComposition {
  readonly modules: {
    readonly moduleId: string;
    readonly version: string;
    readonly config: any;
  }[];
  readonly framework: SupportedFramework;
  readonly templateType: TemplateType;
  readonly globalConfig: Record<string, any>;
  readonly projectName?: string;
}

/**
 * DNA composition result
 */
export interface DNACompositionResult {
  readonly valid: boolean;
  readonly modules: DNAModule[];
  readonly errors: DNAValidationError[];
  readonly warnings: DNAValidationWarning[];
  readonly dependencyOrder: string[];
  readonly configMerged: Record<string, any>;
  readonly performance: {
    readonly compositionTime: number;
    readonly memoryUsage: number;
    readonly complexity: number;
  };
}

/**
 * Dependency manager types
 */
export interface DependencyManager {
  readonly name: string;
  readonly installCommand: string[];
  readonly lockFile: string;
  readonly configFile: string;
}

/**
 * Template instantiation options
 */
export interface InstantiationOptions {
  readonly skipDependencyInstall?: boolean;
  readonly skipGitInit?: boolean;
  readonly dryRun?: boolean;
  readonly overwrite?: boolean;
  readonly backup?: boolean;
  readonly progressCallback?: (stage: string, progress: number) => void;
}

/**
 * DNA registry configuration
 */
export interface DNARegistryConfig {
  readonly sources: {
    readonly type: 'local' | 'remote' | 'npm';
    readonly path: string;
    readonly priority?: number;
  }[];
  readonly cache?: {
    readonly enabled: boolean;
    readonly ttl: number;
    readonly maxSize?: number;
    readonly path?: string;
  };
  readonly validation: {
    readonly strict?: boolean;
    readonly allowExperimental: boolean;
    readonly allowDeprecated: boolean;
  };
}

// Additional types for pipeline integration
export interface GenerationRequest {
  name: string;
  outputPath: string;
  templateType: TemplateType;
  framework: SupportedFramework;
  dnaModules: string[];
  variables?: Record<string, any>;
  options?: {
    skipInstall?: boolean;
    skipGit?: boolean;
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  };
}

export interface PipelineMetrics {
  startTime: number;
  endTime: number;
  totalDuration: number;
  stageMetrics: Record<string, PerformanceMetric>;
  memoryUsage: {
    peak: number;
    average: number;
  };
  cacheHits: number;
  cacheMisses: number;
  retries: number;
}

export interface PerformanceMetric {
  duration: number;
  retries: number;
  success: boolean;
}

export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  progress: number;
  error?: string;
}

export interface ErrorDetail {
  code: string;
  message: string;
  stage: string;
  timestamp: string;
  stackTrace?: string | undefined;
  resolution?: string | undefined;
  critical?: boolean | undefined;
}

export interface ValidationResult {
  passed: boolean;
  testResults: TestResult[];
  coverage: number;
  securityIssues: SecurityIssue[];
  performanceMetrics: Record<string, number>;
  codeQualityMetrics: Record<string, number>;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  errors?: string[] | undefined;
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  file?: string | undefined;
  line?: number | undefined;
}

// Type aliases for common patterns
export type DNADependency = DNAModuleDependency;
export type DNAConfiguration = DNAModuleConfig;
export type DNAFrameworkSupport = FrameworkImplementation;
export type ConfigurationKey = string;
export type ValidationSchema = z.ZodSchema<any>;
