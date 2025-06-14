/**
 * @fileoverview Enhanced DNA Module Base Implementation
 */

import { z } from 'zod';
import {
  DNAModule,
  DNAModuleMetadata,
  DNAModuleDependency,
  DNAModuleConflict,
  DNAModuleConfig,
  FrameworkImplementation,
  DNAModuleContext,
  DNAModuleFile,
  DNAValidationResult,
  DNAMigrationStep,
  SupportedFramework,
  CompatibilityLevel,
  DNAModuleLifecycle,
  DNAModuleCategory,
  DNAValidationError,
  DNAValidationWarning
} from './types';

/**
 * Abstract base class for all DNA modules
 */
export abstract class BaseDNAModule implements DNAModule {
  public abstract readonly metadata: DNAModuleMetadata;
  public abstract readonly dependencies: DNAModuleDependency[];
  public abstract readonly conflicts: DNAModuleConflict[];
  public abstract readonly frameworks: FrameworkImplementation[];
  public abstract readonly config: DNAModuleConfig;

  /**
   * Initialize the module with context
   */
  public async initialize(context: DNAModuleContext): Promise<void> {
    context.logger.debug(`Initializing DNA module: ${this.metadata.name}`);
    // Default implementation - override in specific modules
  }

  /**
   * Configure the module with user-provided configuration
   */
  public async configure(config: any, context: DNAModuleContext): Promise<any> {
    context.logger.debug(`Configuring DNA module: ${this.metadata.name}`);
    
    // Validate configuration against schema
    const validationResult = await this.validateConfig(config, context);
    if (!validationResult.valid) {
      throw new Error(`Configuration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }
    
    // Merge with defaults
    return { ...this.config.defaults, ...config };
  }

  /**
   * Validate module configuration and compatibility
   */
  public async validate(config: any, context: DNAModuleContext): Promise<DNAValidationResult> {
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];
    const suggestions = [];

    // Validate configuration
    const configValidation = await this.validateConfig(config, context);
    errors.push(...configValidation.errors);
    warnings.push(...configValidation.warnings);

    // Validate framework compatibility
    const frameworkSupport = this.getFrameworkSupport(context.framework);
    if (!frameworkSupport || !frameworkSupport.supported) {
      errors.push({
        code: 'FRAMEWORK_NOT_SUPPORTED',
        message: `Module ${this.metadata.name} does not support framework ${context.framework}`,
        severity: 'critical' as const,
        resolution: `Use a supported framework: ${this.frameworks.filter(f => f.supported).map(f => f.framework).join(', ')}`
      });
    }

    // Validate dependencies
    for (const dep of this.dependencies) {
      if (!dep.optional && !context.availableModules.has(dep.moduleId)) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Required dependency ${dep.moduleId} is not available`,
          severity: 'error' as const,
          resolution: `Add dependency: ${dep.moduleId}@${dep.version}`
        });
      }
    }

    // Check for conflicts
    for (const conflict of this.conflicts) {
      const conflictingModule = context.activeModules.find(m => m.metadata.id === conflict.moduleId);
      if (conflictingModule) {
        const error: DNAValidationError = {
          code: 'MODULE_CONFLICT',
          message: `Module ${this.metadata.name} conflicts with ${conflict.moduleId}: ${conflict.reason}`,
          severity: conflict.severity as 'error' | 'critical'
        };
        if (conflict.resolution) {
          error.resolution = conflict.resolution;
        }
        if (conflict.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push({
            code: error.code,
            message: error.message,
            impact: 'high' as const,
            recommendation: error.resolution
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Generate module-specific files
   */
  public abstract generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]>;

  /**
   * Install module dependencies and perform setup
   */
  public async install(context: DNAModuleContext): Promise<void> {
    context.logger.debug(`Installing DNA module: ${this.metadata.name}`);
    
    const frameworkImpl = this.getFrameworkSupport(context.framework);
    if (!frameworkImpl) {
      throw new Error(`Framework ${context.framework} not supported by ${this.metadata.name}`);
    }

    // Run post-install steps
    for (const step of frameworkImpl.postInstallSteps) {
      context.logger.debug(`Running post-install step: ${step}`);
      // Implementation would execute the step
    }
  }

  /**
   * Finalize module setup
   */
  public async finalize(context: DNAModuleContext): Promise<void> {
    context.logger.debug(`Finalizing DNA module: ${this.metadata.name}`);
    // Default implementation - override in specific modules
  }

  /**
   * Cleanup module resources
   */
  public async cleanup(context: DNAModuleContext): Promise<void> {
    context.logger.debug(`Cleaning up DNA module: ${this.metadata.name}`);
    // Default implementation - override in specific modules
  }

  /**
   * Get framework-specific implementation details
   */
  public getFrameworkSupport(framework: SupportedFramework): FrameworkImplementation | null {
    return this.frameworks.find(f => f.framework === framework) || null;
  }

  /**
   * Get compatibility level with another module
   */
  public getCompatibilityWith(moduleId: string): CompatibilityLevel {
    const conflict = this.conflicts.find(c => c.moduleId === moduleId);
    if (conflict) {
      return CompatibilityLevel.NONE;
    }
    
    const dependency = this.dependencies.find(d => d.moduleId === moduleId);
    if (dependency) {
      return CompatibilityLevel.FULL;
    }
    
    return CompatibilityLevel.PARTIAL;
  }

  /**
   * Get migration path between versions
   */
  public getMigrationPath(fromVersion: string, toVersion: string): DNAMigrationStep[] {
    // Default implementation - override in specific modules for complex migrations
    if (fromVersion === toVersion) {
      return [];
    }
    
    return [{
      version: toVersion,
      description: `Upgrade from ${fromVersion} to ${toVersion}`,
      breaking: this.isBreakingChange(fromVersion, toVersion),
      automated: false,
      instructions: ['Manual upgrade required - check module documentation']
    }];
  }

  /**
   * Validate configuration against schema
   */
  protected async validateConfig(config: any, context: DNAModuleContext): Promise<DNAValidationResult> {
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];

    try {
      // Validate against Zod schema if provided
      if (this.config.schema && typeof this.config.schema === 'object' && 'parse' in this.config.schema) {
        (this.config.schema as z.ZodSchema).parse(config);
      }
      
      // Run custom validation if provided
      if (this.config.validation.custom) {
        const customErrors = await this.config.validation.custom(config);
        errors.push(...customErrors.map(msg => ({
          code: 'CUSTOM_VALIDATION_ERROR',
          message: msg,
          severity: 'error' as const
        })));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => ({
          code: 'SCHEMA_VALIDATION_ERROR',
          message: `${e.path.join('.')}: ${e.message}`,
          path: e.path.join('.'),
          severity: 'error' as const
        })));
      } else {
        errors.push({
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          severity: 'error' as const
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  /**
   * Check if version change is breaking
   */
  protected isBreakingChange(fromVersion: string, toVersion: string): boolean {
    const fromMajor = parseInt(fromVersion.split('.')[0]);
    const toMajor = parseInt(toVersion.split('.')[0]);
    return toMajor > fromMajor;
  }

  /**
   * Create a framework implementation configuration
   */
  protected createFrameworkImplementation(config: {
    framework: SupportedFramework;
    supported?: boolean;
    compatibility?: CompatibilityLevel;
    dependencies?: string[];
    devDependencies?: string[];
    peerDependencies?: string[];
    configFiles?: string[];
    templates?: string[];
    postInstallSteps?: string[];
    limitations?: string[];
  }): FrameworkImplementation {
    return {
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [],
      devDependencies: [],
      peerDependencies: [],
      configFiles: [],
      templates: [],
      postInstallSteps: [],
      limitations: [],
      ...config
    };
  }
}

// Legacy implementation removed - see specific DNA module implementations in dna-modules/ directory

// Legacy implementation removed - see specific DNA module implementations in dna-modules/ directory
