/**
 * @fileoverview Validation framework with schema validation for template.json files and runtime validation
 * Provides comprehensive validation utilities and health checks
 */

import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import semver from 'semver';
import { ValidationEngine } from './validation-engine';
import { ValidationResult, ProjectConfig, TemplateMetadata } from '../../types/cli';
import { logger } from '../../utils/logger';
import { 
  ValidationError, 
  SchemaValidationError, 
  TemplateCorruptedError,
  InvalidConfigurationError 
} from '../errors/error-types';

// DNA Module Schema
export const dnaModuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string(),
  license: z.string().optional(),
  category: z.enum(['auth', 'payment', 'database', 'ui', 'analytics', 'deployment', 'testing', 'monitoring']),
  compatibleFrameworks: z.array(z.enum(['nextjs', 'react-native', 'flutter', 'tauri', 'sveltekit', 'express', 'fastapi'])),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  configuration: z.object({
    required: z.array(z.string()).optional(),
    optional: z.array(z.string()).optional(),
    environment: z.record(z.string()).optional(),
  }).optional(),
  conflicts: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),
  files: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.enum(['template', 'copy', 'merge']).optional(),
  })).optional(),
  scripts: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Template Configuration Schema
export const templateConfigSchema = z.object({
  templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  metadata: z.object({
    name: z.string().min(1),
    description: z.string(),
    author: z.string(),
    license: z.string().optional(),
    repository: z.string().url().optional(),
    homepage: z.string().url().optional(),
    keywords: z.array(z.string()).optional(),
  }),
  structure: z.object({
    baseDirectory: z.string().optional(),
    files: z.array(z.object({
      source: z.string(),
      target: z.string(),
      type: z.enum(['template', 'copy', 'merge']).default('copy'),
      condition: z.string().optional(),
    })),
    directories: z.array(z.string()).optional(),
  }),
  variables: z.array(z.object({
    name: z.string().min(1),
    description: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect']),
    required: z.boolean().default(false),
    default: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
    options: z.array(z.string()).optional(),
    validation: z.object({
      pattern: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
    }).optional(),
    condition: z.string().optional(),
  })).optional(),
  scripts: z.object({
    preGenerate: z.array(z.string()).optional(),
    postGenerate: z.array(z.string()).optional(),
    preInstall: z.array(z.string()).optional(),
    postInstall: z.array(z.string()).optional(),
  }).optional(),
  requirements: z.object({
    node: z.string().optional(),
    npm: z.string().optional(),
    yarn: z.string().optional(),
    pnpm: z.string().optional(),
    bun: z.string().optional(),
    tools: z.array(z.object({
      name: z.string(),
      version: z.string().optional(),
      optional: z.boolean().default(false),
      installInstructions: z.string().optional(),
    })).optional(),
    platforms: z.array(z.enum(['darwin', 'linux', 'win32'])).optional(),
  }).optional(),
  dnaModules: z.array(z.string()).optional(),
  extends: z.string().optional(),
});

// Project Health Schema
export const projectHealthSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  main: z.string().optional(),
  scripts: z.object({
    dev: z.string().optional(),
    build: z.string().optional(),
    start: z.string().optional(),
    test: z.string().optional(),
    lint: z.string().optional(),
  }).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  engines: z.object({
    node: z.string().optional(),
    npm: z.string().optional(),
  }).optional(),
});

export class ValidationFramework {
  private static instance: ValidationFramework;
  private validationEngine: ValidationEngine;
  private schemaCache = new Map<string, z.ZodSchema>();

  private constructor() {
    this.validationEngine = ValidationEngine.getInstance();
    this.initializeSchemas();
  }

  static getInstance(): ValidationFramework {
    if (!ValidationFramework.instance) {
      ValidationFramework.instance = new ValidationFramework();
    }
    return ValidationFramework.instance;
  }

  /**
   * Validate a template.json file
   */
  async validateTemplateConfig(templatePath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      const configPath = path.join(templatePath, 'template.json');
      
      if (!(await fs.pathExists(configPath))) {
        result.errors.push('template.json file not found');
        result.suggestions.push('Create a template.json file with proper template configuration');
        result.valid = false;
        return result;
      }

      const configContent = await fs.readJSON(configPath);
      
      // Validate against schema
      const validationResult = templateConfigSchema.safeParse(configContent);
      
      if (!validationResult.success) {
        for (const error of validationResult.error.errors) {
          result.errors.push(`Schema validation error: ${error.path.join('.')} - ${error.message}`);
        }
        result.valid = false;
        return result;
      }

      const config = validationResult.data;

      // Validate template structure
      await this.validateTemplateStructure(templatePath, config, result);

      // Validate DNA modules
      await this.validateTemplateDnaModules(config, result);

      // Validate requirements
      await this.validateTemplateRequirements(config, result);

      // Validate variables
      this.validateTemplateVariables(config, result);

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Failed to validate template config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate DNA module configuration
   */
  async validateDnaModule(modulePath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      const configPath = path.join(modulePath, 'dna-module.json');
      
      if (!(await fs.pathExists(configPath))) {
        result.errors.push('dna-module.json file not found');
        result.suggestions.push('Create a dna-module.json file with proper module configuration');
        result.valid = false;
        return result;
      }

      const configContent = await fs.readJSON(configPath);
      
      // Validate against schema
      const validationResult = dnaModuleSchema.safeParse(configContent);
      
      if (!validationResult.success) {
        for (const error of validationResult.error.errors) {
          result.errors.push(`Schema validation error: ${error.path.join('.')} - ${error.message}`);
        }
        result.valid = false;
        return result;
      }

      const config = validationResult.data;

      // Validate module files
      await this.validateModuleFiles(modulePath, config, result);

      // Validate dependencies
      this.validateModuleDependencies(config, result);

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Failed to validate DNA module: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate generated project health
   */
  async validateProjectHealth(projectPath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // Check package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        
        const validationResult = projectHealthSchema.safeParse(packageJson);
        if (!validationResult.success) {
          for (const error of validationResult.error.errors) {
            result.warnings.push(`package.json issue: ${error.path.join('.')} - ${error.message}`);
          }
        }

        // Check for security vulnerabilities in dependencies
        await this.checkDependencySecurityIssues(packageJson, result);
      } else {
        result.errors.push('package.json not found');
      }

      // Check essential project files
      await this.validateEssentialFiles(projectPath, result);

      // Check DNA configuration
      await this.validateDnaConfiguration(projectPath, result);

      // Check git repository
      await this.validateGitRepository(projectPath, result);

      // Check file permissions
      await this.validateFilePermissions(projectPath, result);

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Failed to validate project health: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Runtime validation for user inputs
   */
  validateUserInput(input: unknown, schema: z.ZodSchema, fieldName: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      const validationResult = schema.safeParse(input);
      
      if (!validationResult.success) {
        for (const error of validationResult.error.errors) {
          result.errors.push(`${fieldName} validation error: ${error.path.join('.')} - ${error.message}`);
        }
        result.valid = false;
      }

    } catch (error) {
      result.errors.push(`Runtime validation failed for ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Comprehensive pre-generation validation
   */
  async runComprehensiveValidation(config: ProjectConfig, templateMetadata: TemplateMetadata): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // Pre-generation validation
      const preGenResult = await this.validationEngine.validatePreGeneration(config);
      this.mergeValidationResults(result, preGenResult);

      // Template validation
      const templateResult = await this.validationEngine.validateTemplate(templateMetadata);
      this.mergeValidationResults(result, templateResult);

      // Environment validation
      const envResult = await this.validationEngine.validateEnvironment();
      this.mergeValidationResults(result, envResult);

      // Dependency validation
      const depResult = await this.validationEngine.validateDependencies(config, templateMetadata);
      this.mergeValidationResults(result, depResult);

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Comprehensive validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Create custom validation schema
   */
  createCustomSchema<T>(schemaDefinition: z.ZodType<T>): z.ZodType<T> {
    return schemaDefinition;
  }

  /**
   * Register custom schema
   */
  registerSchema(name: string, schema: z.ZodSchema): void {
    this.schemaCache.set(name, schema);
  }

  /**
   * Get registered schema
   */
  getSchema(name: string): z.ZodSchema | undefined {
    return this.schemaCache.get(name);
  }

  // Private helper methods

  private initializeSchemas(): void {
    this.schemaCache.set('template', templateConfigSchema);
    this.schemaCache.set('dnaModule', dnaModuleSchema);
    this.schemaCache.set('projectHealth', projectHealthSchema);
  }

  private async validateTemplateStructure(templatePath: string, config: any, result: ValidationResult): Promise<void> {
    if (config.structure?.files) {
      for (const file of config.structure.files) {
        const sourcePath = path.join(templatePath, file.source);
        if (!(await fs.pathExists(sourcePath))) {
          result.errors.push(`Template file not found: ${file.source}`);
        }
      }
    }

    if (config.structure?.directories) {
      for (const dir of config.structure.directories) {
        const dirPath = path.join(templatePath, dir);
        if (!(await fs.pathExists(dirPath))) {
          result.warnings.push(`Template directory not found: ${dir}`);
        }
      }
    }
  }

  private async validateTemplateDnaModules(config: any, result: ValidationResult): Promise<void> {
    if (config.dnaModules) {
      for (const moduleId of config.dnaModules) {
        // In a real implementation, this would check against the DNA module registry
        if (!this.isDnaModuleValid(moduleId)) {
          result.warnings.push(`DNA module may not be available: ${moduleId}`);
        }
      }
    }
  }

  private async validateTemplateRequirements(config: any, result: ValidationResult): Promise<void> {
    if (config.requirements) {
      const req = config.requirements;
      
      // Validate version requirements
      if (req.node && !semver.validRange(req.node)) {
        result.errors.push(`Invalid Node.js version requirement: ${req.node}`);
      }
      
      if (req.npm && !semver.validRange(req.npm)) {
        result.errors.push(`Invalid npm version requirement: ${req.npm}`);
      }

      // Validate platform requirements
      if (req.platforms) {
        const validPlatforms = ['darwin', 'linux', 'win32'];
        for (const platform of req.platforms) {
          if (!validPlatforms.includes(platform)) {
            result.errors.push(`Invalid platform requirement: ${platform}`);
          }
        }
      }
    }
  }

  private validateTemplateVariables(config: any, result: ValidationResult): void {
    if (config.variables) {
      for (const variable of config.variables) {
        // Validate select/multiselect options
        if ((variable.type === 'select' || variable.type === 'multiselect') && !variable.options) {
          result.errors.push(`Variable '${variable.name}' of type '${variable.type}' must have options`);
        }

        // Validate default values
        if (variable.default !== undefined) {
          if (variable.type === 'number' && typeof variable.default !== 'number') {
            result.errors.push(`Variable '${variable.name}' default value must be a number`);
          }
          if (variable.type === 'boolean' && typeof variable.default !== 'boolean') {
            result.errors.push(`Variable '${variable.name}' default value must be a boolean`);
          }
        }

        // Validate pattern if provided
        if (variable.validation?.pattern) {
          try {
            new RegExp(variable.validation.pattern);
          } catch {
            result.errors.push(`Variable '${variable.name}' has invalid validation pattern`);
          }
        }
      }
    }
  }

  private async validateModuleFiles(modulePath: string, config: any, result: ValidationResult): Promise<void> {
    if (config.files) {
      for (const file of config.files) {
        const sourcePath = path.join(modulePath, file.source);
        if (!(await fs.pathExists(sourcePath))) {
          result.errors.push(`Module file not found: ${file.source}`);
        }
      }
    }
  }

  private validateModuleDependencies(config: any, result: ValidationResult): void {
    // Check for dependency conflicts
    if (config.conflicts) {
      for (const conflict of config.conflicts) {
        if (config.requires?.includes(conflict)) {
          result.errors.push(`Module cannot both require and conflict with: ${conflict}`);
        }
      }
    }

    // Validate version ranges
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
    for (const depType of depTypes) {
      if (config[depType]) {
        for (const [pkg, version] of Object.entries(config[depType])) {
          if (typeof version === 'string' && !semver.validRange(version)) {
            result.warnings.push(`Invalid version range for ${pkg}: ${version}`);
          }
        }
      }
    }
  }

  private async validateEssentialFiles(projectPath: string, result: ValidationResult): Promise<void> {
    const essentialFiles = [
      'README.md',
      '.gitignore',
      'package.json',
    ];

    for (const file of essentialFiles) {
      const filePath = path.join(projectPath, file);
      if (!(await fs.pathExists(filePath))) {
        result.warnings.push(`Essential file missing: ${file}`);
      }
    }
  }

  private async validateDnaConfiguration(projectPath: string, result: ValidationResult): Promise<void> {
    const dnaConfigPath = path.join(projectPath, 'dna.config.json');
    if (await fs.pathExists(dnaConfigPath)) {
      try {
        const dnaConfig = await fs.readJSON(dnaConfigPath);
        
        // Basic validation
        if (!dnaConfig.template) {
          result.warnings.push('DNA config missing template information');
        }
        
        if (!dnaConfig.generated) {
          result.warnings.push('DNA config missing generation timestamp');
        }
        
      } catch (error) {
        result.errors.push('Invalid DNA configuration file');
      }
    } else {
      result.warnings.push('DNA configuration file not found');
    }
  }

  private async validateGitRepository(projectPath: string, result: ValidationResult): Promise<void> {
    const gitPath = path.join(projectPath, '.git');
    if (!(await fs.pathExists(gitPath))) {
      result.suggestions.push('Initialize git repository for version control');
    }
  }

  private async validateFilePermissions(projectPath: string, result: ValidationResult): Promise<void> {
    try {
      await fs.access(projectPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      result.warnings.push('Project directory may have permission issues');
    }
  }

  private async checkDependencySecurityIssues(packageJson: any, result: ValidationResult): Promise<void> {
    // In a real implementation, this would check against security databases
    // For now, just check for known problematic packages
    const problematicPackages = ['node-sass', 'bower', 'gulp'];
    
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const pkg of problematicPackages) {
      if (allDeps[pkg]) {
        result.warnings.push(`Consider replacing deprecated package: ${pkg}`);
      }
    }
  }

  private mergeValidationResults(target: ValidationResult, source: ValidationResult): void {
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    target.suggestions.push(...source.suggestions);
    target.valid = target.valid && source.valid;
  }

  private isDnaModuleValid(moduleId: string): boolean {
    // In a real implementation, this would check against the DNA module registry
    const commonModules = [
      'auth-firebase', 'auth-supabase', 'auth-cognito',
      'payment-stripe', 'payment-paypal',
      'database-postgres', 'database-mongodb', 'database-mysql',
      'ui-tailwind', 'ui-material', 'ui-chakra',
      'mobile-navigation', 'web-analytics',
    ];
    
    return commonModules.includes(moduleId);
  }
}