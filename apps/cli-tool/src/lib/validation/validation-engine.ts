/**
 * @fileoverview Enhanced validation system for DNA CLI
 * Provides comprehensive validation for pre-generation, templates, environment, and dependencies
 */

import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';
import { spawn } from 'child_process';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { ValidationResult, ProjectConfig, TemplateMetadata } from '../../types/cli';

// Validation schemas
export const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['ai-saas', 'mobile-app', 'web-app', 'desktop-app', 'api', 'full-stack']),
  framework: z.enum(['nextjs', 'react-native', 'flutter', 'tauri', 'sveltekit', 'express', 'fastapi']),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().min(1),
  tags: z.array(z.string()),
  dnaModules: z.array(z.string()),
  requirements: z.object({
    node: z.string().optional(),
    npm: z.string().optional(),
    frameworks: z.array(z.string()).optional(),
  }).optional(),
  features: z.array(z.string()),
  complexity: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedSetupTime: z.number().positive(),
  lastUpdated: z.date(),
  downloadCount: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
  variables: z.array(z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    required: z.boolean(),
    default: z.string().optional(),
    sensitive: z.boolean().optional(),
    type: z.enum(['string', 'number', 'boolean', 'select']).optional(),
    options: z.array(z.string()).optional(),
  })).optional(),
});

export const projectConfigSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-zA-Z][a-zA-Z0-9-_]*$/),
  path: z.string().min(1),
  template: z.string().min(1),
  framework: z.enum(['nextjs', 'react-native', 'flutter', 'tauri', 'sveltekit', 'express', 'fastapi']),
  dnaModules: z.array(z.string()),
  variables: z.record(z.string()),
  packageManager: z.enum(['npm', 'yarn', 'pnpm', 'bun']),
  skipInstall: z.boolean(),
  skipGit: z.boolean(),
});

export class ValidationEngine {
  private static instance: ValidationEngine;
  private validationCache = new Map<string, ValidationResult>();

  private constructor() {}

  static getInstance(): ValidationEngine {
    if (!ValidationEngine.instance) {
      ValidationEngine.instance = new ValidationEngine();
    }
    return ValidationEngine.instance;
  }

  /**
   * Comprehensive pre-generation validation
   */
  async validatePreGeneration(config: ProjectConfig): Promise<ValidationResult> {
    const cacheKey = `pre-gen-${JSON.stringify(config)}`;
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Validate project configuration
    await this.validateProjectConfig(config, result);

    // Validate system environment
    await this.validateEnvironment(result);

    // Validate disk space and permissions
    await this.validateSystemResources(config, result);

    // Validate project name and path
    await this.validateProjectNameAndPath(config, result);

    result.valid = result.errors.length === 0;
    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Template validation
   */
  async validateTemplate(template: TemplateMetadata): Promise<ValidationResult> {
    const cacheKey = `template-${template.id}-${template.version}`;
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // Validate template metadata structure
      templateSchema.parse(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.errors.push(`Template metadata validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      } else {
        result.errors.push(`Template validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate template files exist
    await this.validateTemplateFiles(template, result);

    // Validate DNA module compatibility
    await this.validateDnaModuleCompatibility(template, result);

    // Validate template dependencies
    await this.validateTemplateDependencies(template, result);

    result.valid = result.errors.length === 0;
    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Environment validation
   */
  async validateEnvironment(result?: ValidationResult): Promise<ValidationResult> {
    if (!result) {
      result = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const minNodeVersion = '18.0.0';
    
    if (!semver.gte(nodeVersion, minNodeVersion)) {
      result.errors.push(`Node.js version ${nodeVersion} is below minimum required version ${minNodeVersion}`);
      result.suggestions.push(`Upgrade Node.js to version ${minNodeVersion} or higher`);
    }

    // Check npm version
    try {
      const npmVersion = await this.getCommandVersion('npm', '--version');
      const minNpmVersion = '8.0.0';
      
      if (npmVersion && !semver.gte(npmVersion, minNpmVersion)) {
        result.warnings.push(`npm version ${npmVersion} is below recommended version ${minNpmVersion}`);
        result.suggestions.push(`Consider upgrading npm: npm install -g npm@latest`);
      }
    } catch (error) {
      result.errors.push('npm is not available in PATH');
      result.suggestions.push('Install Node.js which includes npm, or install npm separately');
    }

    // Check git availability
    try {
      await this.getCommandVersion('git', '--version');
    } catch (error) {
      result.warnings.push('Git is not available in PATH');
      result.suggestions.push('Install Git for version control features');
    }

    // Check available package managers
    const packageManagers = ['yarn', 'pnpm', 'bun'];
    const availableManagers: string[] = [];
    
    for (const manager of packageManagers) {
      try {
        await this.getCommandVersion(manager, '--version');
        availableManagers.push(manager);
      } catch {
        // Manager not available, which is fine
      }
    }

    if (availableManagers.length > 0) {
      result.suggestions.push(`Alternative package managers available: ${availableManagers.join(', ')}`);
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Dependency validation
   */
  async validateDependencies(config: ProjectConfig, template: TemplateMetadata): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Check package manager availability
    try {
      await this.getCommandVersion(config.packageManager, '--version');
    } catch (error) {
      result.errors.push(`Package manager "${config.packageManager}" is not available`);
      result.suggestions.push('Install the selected package manager or choose a different one');
    }

    // Validate framework-specific requirements
    await this.validateFrameworkRequirements(config.framework, result);

    // Check template requirements
    if (template.requirements) {
      if (template.requirements.node) {
        const nodeVersion = process.version;
        if (!semver.satisfies(nodeVersion, template.requirements.node)) {
          result.errors.push(`Node.js version ${nodeVersion} does not satisfy template requirement: ${template.requirements.node}`);
        }
      }

      if (template.requirements.npm) {
        try {
          const npmVersion = await this.getCommandVersion('npm', '--version');
          if (npmVersion && !semver.satisfies(npmVersion, template.requirements.npm)) {
            result.warnings.push(`npm version ${npmVersion} may not be compatible with template requirement: ${template.requirements.npm}`);
          }
        } catch {
          // npm not available, already handled in environment validation
        }
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Health check for generated projects
   */
  async validateGeneratedProject(projectPath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Check if project directory exists
    if (!(await fs.pathExists(projectPath))) {
      result.errors.push('Project directory does not exist');
      return result;
    }

    // Check for essential files
    const essentialFiles = ['package.json', 'README.md', '.gitignore'];
    for (const file of essentialFiles) {
      const filePath = path.join(projectPath, file);
      if (!(await fs.pathExists(filePath))) {
        result.warnings.push(`Essential file missing: ${file}`);
      }
    }

    // Validate package.json
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        
        if (!packageJson.name) {
          result.warnings.push('package.json is missing name field');
        }
        
        if (!packageJson.scripts) {
          result.warnings.push('package.json is missing scripts field');
        }
        
        if (!packageJson.dependencies && !packageJson.devDependencies) {
          result.warnings.push('package.json has no dependencies defined');
        }
      }
    } catch (error) {
      result.errors.push('Invalid package.json file');
    }

    // Check for DNA configuration
    const dnaConfigPath = path.join(projectPath, 'dna.config.json');
    if (!(await fs.pathExists(dnaConfigPath))) {
      result.warnings.push('DNA configuration file (dna.config.json) is missing');
    }

    // Validate file permissions
    await this.validateProjectPermissions(projectPath, result);

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * DNA module compatibility validation
   */
  async validateDnaModuleCompatibility(template: TemplateMetadata, result: ValidationResult): Promise<void> {
    // Check for conflicting modules
    const conflictMap: Record<string, string[]> = {
      'auth-firebase': ['auth-supabase', 'auth-cognito'],
      'auth-supabase': ['auth-firebase', 'auth-cognito'],
      'auth-cognito': ['auth-firebase', 'auth-supabase'],
      'payment-stripe': ['payment-paypal'],
      'payment-paypal': ['payment-stripe'],
      'database-postgres': ['database-mongodb', 'database-mysql'],
      'database-mongodb': ['database-postgres', 'database-mysql'],
      'database-mysql': ['database-postgres', 'database-mongodb'],
    };

    for (const module of template.dnaModules) {
      const conflicts = conflictMap[module];
      if (conflicts) {
        const conflicting = template.dnaModules.filter(m => conflicts.includes(m));
        if (conflicting.length > 0) {
          result.warnings.push(`DNA module "${module}" conflicts with: ${conflicting.join(', ')}`);
          result.suggestions.push(`Choose only one module from conflicting group: ${[module, ...conflicting].join(', ')}`);
        }
      }
    }

    // Check framework compatibility
    const frameworkCompatibility: Record<string, string[]> = {
      'ui-tailwind': ['nextjs', 'react-native'],
      'ui-material': ['nextjs', 'react-native', 'flutter'],
      'ui-chakra': ['nextjs'],
      'mobile-navigation': ['react-native', 'flutter'],
      'web-analytics': ['nextjs', 'sveltekit'],
    };

    for (const module of template.dnaModules) {
      const compatibleFrameworks = frameworkCompatibility[module];
      if (compatibleFrameworks && !compatibleFrameworks.includes(template.framework)) {
        result.warnings.push(`DNA module "${module}" may not be compatible with framework "${template.framework}"`);
        result.suggestions.push(`Consider using alternative modules compatible with ${template.framework}`);
      }
    }
  }

  // Private helper methods

  private async validateProjectConfig(config: ProjectConfig, result: ValidationResult): Promise<void> {
    try {
      projectConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.errors) {
          result.errors.push(`Configuration error: ${issue.path.join('.')} - ${issue.message}`);
        }
      }
    }
  }

  private async validateSystemResources(config: ProjectConfig, result: ValidationResult): Promise<void> {
    // Check disk space
    try {
      const parentDir = path.dirname(config.path);
      if (await fs.pathExists(parentDir)) {
        const stats = await fs.stat(parentDir);
        // Note: This is a simplified check; in reality, you'd use a library like 'check-disk-space'
        const requiredSpace = 500 * 1024 * 1024; // 500MB
        // Since we can't easily get available space in Node.js without additional dependencies,
        // we'll add this as a warning to install check-disk-space if needed
        result.suggestions.push('Consider checking available disk space before generation');
      }
    } catch (error) {
      result.warnings.push('Could not verify disk space availability');
    }

    // Check write permissions
    try {
      const parentDir = path.dirname(config.path);
      await fs.access(parentDir, fs.constants.W_OK);
    } catch (error) {
      result.errors.push(`No write permission for directory: ${path.dirname(config.path)}`);
      result.suggestions.push('Check directory permissions or choose a different location');
    }
  }

  private async validateProjectNameAndPath(config: ProjectConfig, result: ValidationResult): Promise<void> {
    // Validate project name format
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9-_]*$/;
    if (!nameRegex.test(config.name)) {
      result.errors.push('Project name must start with a letter and contain only letters, numbers, hyphens, and underscores');
    }

    // Check for reserved names
    const reservedNames = [
      'node_modules', 'npm', 'yarn', 'pnpm', 'bun',
      'src', 'lib', 'test', 'tests', 'dist', 'build',
      'public', 'static', 'assets', '.git', '.env',
      'package', 'packages', 'config', 'scripts'
    ];

    if (reservedNames.includes(config.name.toLowerCase())) {
      result.errors.push(`"${config.name}" is a reserved name and cannot be used`);
    }

    // Validate path
    if (config.path.includes('..')) {
      result.errors.push('Path cannot contain relative path traversal (..)');
    }

    if (/[<>:"|?*]/.test(config.path)) {
      result.errors.push('Path contains invalid characters');
    }

    // Check if directory already exists
    if (await fs.pathExists(config.path)) {
      const stats = await fs.stat(config.path);
      if (!stats.isDirectory()) {
        result.errors.push('Target path exists but is not a directory');
      } else {
        const files = await fs.readdir(config.path);
        if (files.length > 0) {
          result.warnings.push('Target directory is not empty');
          result.suggestions.push('Use --overwrite flag to replace existing files or choose a different location');
        }
      }
    }
  }

  private async validateTemplateFiles(template: TemplateMetadata, result: ValidationResult): Promise<void> {
    // In a real implementation, this would check if template files exist in the registry
    // For now, we'll add basic validation
    if (!template.id || !template.name) {
      result.errors.push('Template is missing required metadata');
    }

    if (template.dnaModules.length === 0) {
      result.warnings.push('Template has no DNA modules configured');
    }

    if (!template.features || template.features.length === 0) {
      result.warnings.push('Template has no features listed');
    }
  }

  private async validateTemplateDependencies(template: TemplateMetadata, result: ValidationResult): Promise<void> {
    // Validate that required DNA modules are available
    // This would check against the actual DNA module registry
    for (const moduleId of template.dnaModules) {
      if (!this.isDnaModuleAvailable(moduleId)) {
        result.warnings.push(`DNA module "${moduleId}" may not be available`);
      }
    }
  }

  private async validateFrameworkRequirements(framework: string, result: ValidationResult): Promise<void> {
    const requirements: Record<string, { commands: string[], optional?: boolean }[]> = {
      'nextjs': [
        { commands: ['node', 'npm'] },
      ],
      'react-native': [
        { commands: ['node', 'npm'] },
        { commands: ['watchman'], optional: true },
        { commands: ['adb'], optional: true },
      ],
      'flutter': [
        { commands: ['flutter'] },
        { commands: ['dart'] },
      ],
      'tauri': [
        { commands: ['node', 'npm'] },
        { commands: ['cargo', 'rustc'] },
      ],
      'sveltekit': [
        { commands: ['node', 'npm'] },
      ],
    };

    const frameworkReqs = requirements[framework];
    if (frameworkReqs) {
      for (const req of frameworkReqs) {
        for (const command of req.commands) {
          try {
            await this.getCommandVersion(command, '--version');
          } catch (error) {
            if (req.optional) {
              result.warnings.push(`Optional tool "${command}" is not available for ${framework} development`);
            } else {
              result.errors.push(`Required tool "${command}" is not available for ${framework} development`);
              result.suggestions.push(`Install ${command} for ${framework} development`);
            }
          }
        }
      }
    }
  }

  private async validateProjectPermissions(projectPath: string, result: ValidationResult): Promise<void> {
    try {
      // Check read/write permissions on the project directory
      await fs.access(projectPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      result.warnings.push('Project directory may have permission issues');
      result.suggestions.push('Check and adjust directory permissions if needed');
    }
  }

  private async getCommandVersion(command: string, versionFlag: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, [versionFlag], {
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });

      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Extract version number from output
          const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
          resolve(versionMatch ? versionMatch[1] : output.trim());
        } else {
          reject(new Error(`Command failed: ${command} ${versionFlag}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private isDnaModuleAvailable(moduleId: string): boolean {
    // In a real implementation, this would check against the DNA module registry
    // For now, return true for common modules
    const commonModules = [
      'auth-firebase', 'auth-supabase', 'auth-cognito',
      'payment-stripe', 'payment-paypal',
      'database-postgres', 'database-mongodb', 'database-mysql',
      'ui-tailwind', 'ui-material', 'ui-chakra',
      'mobile-navigation', 'web-analytics',
    ];
    
    return commonModules.includes(moduleId);
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get validation cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.validationCache.size,
      keys: Array.from(this.validationCache.keys()),
    };
  }
}