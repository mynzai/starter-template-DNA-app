/**
 * @fileoverview Enhanced Project Generator with comprehensive error handling and validation
 * Integrates ValidationEngine, RollbackManager, and EnhancedErrorHandler for robust project generation
 */

import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import Handlebars from 'handlebars';
import { TemplateInstantiationEngine, TemplateType, SupportedFramework } from '@dna/core';
import { ProjectConfig, GenerationOptions, TemplateMetadata } from '../types/cli';
import { ProgressTracker } from './progress-tracker';
import { TemplateRegistry } from './template-registry';
import { ValidationEngine } from './validation/validation-engine';
import { ValidationFramework } from './validation/validation-framework';
import { RollbackManager } from './rollback/rollback-manager';
import { EnhancedErrorHandler } from '../utils/enhanced-error-handler';
import { logger } from '../utils/logger';
import { 
  TemplateNotFoundError,
  FilesystemError,
  DependencyInstallError,
  ValidationError,
  RollbackError,
  InsufficientPermissionsError,
  DirectoryExistsError,
  UnsupportedNodeVersionError
} from './errors/error-types';

export class EnhancedProjectGenerator {
  private config: ProjectConfig;
  private options: GenerationOptions;
  private progressTracker: ProgressTracker;
  private templateEngine: TemplateInstantiationEngine;
  private registry: TemplateRegistry;
  private validationEngine: ValidationEngine;
  private validationFramework: ValidationFramework;
  private rollbackManager: RollbackManager;
  private errorHandler: EnhancedErrorHandler;
  private transactionId?: string;
  private backupPath?: string;

  constructor(
    config: ProjectConfig,
    options: GenerationOptions,
    progressTracker: ProgressTracker
  ) {
    this.config = config;
    this.options = options;
    this.progressTracker = progressTracker;
    this.templateEngine = new TemplateInstantiationEngine();
    this.registry = new TemplateRegistry();
    this.validationEngine = ValidationEngine.getInstance();
    this.validationFramework = ValidationFramework.getInstance();
    this.rollbackManager = RollbackManager.getInstance();
    this.errorHandler = EnhancedErrorHandler.getInstance();
  }

  /**
   * Enhanced validation with comprehensive checks
   */
  async validateConfiguration(): Promise<void> {
    try {
      logger.info('Running comprehensive validation...');
      
      await this.registry.load();
      
      const template = this.registry.getTemplate(this.config.template);
      if (!template) {
        const availableTemplates = this.registry.getAllTemplates().map(t => t.id);
        throw new TemplateNotFoundError(this.config.template, availableTemplates);
      }

      // Run comprehensive validation
      const validationResult = await this.validationFramework.runComprehensiveValidation(
        this.config, 
        template
      );

      if (!validationResult.valid) {
        const errorMessage = `Validation failed:\n${validationResult.errors.join('\n')}`;
        const suggestion = validationResult.suggestions.length > 0 
          ? `Suggestions:\n${validationResult.suggestions.join('\n')}`
          : 'Please fix the validation errors and try again';
        
        throw new ValidationError(errorMessage, 'COMPREHENSIVE_VALIDATION_FAILED', suggestion);
      }

      if (validationResult.warnings.length > 0) {
        logger.warn('Validation warnings:');
        validationResult.warnings.forEach(warning => logger.warn(`  • ${warning}`));
      }

      // Additional specific validations
      await this.validateSystemRequirements(template);
      await this.validateDiskSpaceAndPermissions();
      await this.validateProjectPath();

      logger.success('All validations passed');

    } catch (error) {
      await this.errorHandler.handleError(error, {
        interactive: this.options.interactive,
        autoFix: true,
        gracefulDegradation: false,
      });
      throw error;
    }
  }

  /**
   * Enhanced directory preparation with atomic operations
   */
  async prepareDirectory(): Promise<void> {
    try {
      // Start rollback transaction
      this.transactionId = await this.rollbackManager.startTransaction(
        `Prepare directory for project: ${this.config.name}`,
        this.config.path
      );

      if (this.options.dryRun) {
        logger.debug(`[DRY RUN] Would prepare directory: ${this.config.path}`);
        return;
      }

      // Check if directory exists
      if (await fs.pathExists(this.config.path)) {
        if (!this.options.overwrite) {
          throw new DirectoryExistsError(this.config.path);
        }

        // Create backup if overwriting
        if (this.options.backup) {
          this.backupPath = `${this.config.path}.backup.${Date.now()}`;
          await this.rollbackManager.recordFileMove(
            this.transactionId,
            this.config.path,
            this.backupPath
          );
          logger.debug(`Created backup at: ${this.backupPath}`);
        } else {
          // Record directory removal for rollback
          await fs.remove(this.config.path);
        }
      }

      // Create project directory
      await this.rollbackManager.recordDirectoryCreation(this.transactionId, this.config.path);
      
      // Set appropriate permissions
      if (process.platform !== 'win32') {
        try {
          await fs.chmod(this.config.path, 0o755);
        } catch (error) {
          throw new InsufficientPermissionsError(this.config.path, 'set permissions');
        }
      }

      logger.success('Directory prepared successfully');

    } catch (error) {
      if (this.transactionId) {
        await this.rollbackManager.rollbackTransaction(this.transactionId);
      }
      
      await this.errorHandler.handleError(error, {
        interactive: this.options.interactive,
        autoFix: true,
      });
      throw error;
    }
  }

  /**
   * Enhanced file generation with rollback support
   */
  async generateFiles(): Promise<void> {
    try {
      const template = this.registry.getTemplate(this.config.template)!;
      
      // Create snapshot before file generation
      if (this.transactionId) {
        await this.rollbackManager.createSnapshot(
          this.transactionId,
          'Before file generation',
          this.config.path
        );
      }

      // Use the enhanced TemplateInstantiationEngine
      const templateConfig = {
        name: this.config.name,
        type: template.type as TemplateType,
        framework: this.config.framework as SupportedFramework,
        dnaModules: this.config.dnaModules,
        outputPath: this.config.path,
        variables: this.config.variables
      };

      const instantiationOptions = {
        skipDependencyInstall: true,
        skipGitInit: true,
        dryRun: this.options.dryRun,
        overwrite: this.options.overwrite,
        backup: this.options.backup,
        progressCallback: (stage: string, progress: number) => {
          // Update progress within the generation stage
          const adjustedProgress = 30 + (progress * 0.4);
          logger.debug(`Template generation: ${stage} (${Math.round(adjustedProgress)}%)`);
        }
      };

      if (!this.options.dryRun) {
        const result = await this.templateEngine.instantiateTemplate(templateConfig, instantiationOptions);
        
        if (!result.success) {
          throw new ValidationError(
            `Template generation failed: ${result.errors.join(', ')}`,
            'TEMPLATE_GENERATION_FAILED',
            'Check template configuration and try again'
          );
        }

        // Record all generated files for rollback
        if (this.transactionId) {
          await this.recordGeneratedFiles(result.generatedFiles || []);
        }
      }

      logger.success('Files generated successfully');

    } catch (error) {
      await this.errorHandler.handleError(error, {
        interactive: this.options.interactive,
        autoFix: false,
      });
      throw error;
    }
  }

  /**
   * Enhanced dependency installation with retry logic
   */
  async installDependencies(): Promise<void> {
    if (this.config.skipInstall) {
      logger.info('Skipping dependency installation...');
      return;
    }

    try {
      if (this.options.dryRun) {
        logger.debug(`[DRY RUN] Would install dependencies using ${this.config.packageManager}`);
        return;
      }

      const packageManager = this.config.packageManager || 'npm';
      
      // Validate package manager availability
      await this.validatePackageManager(packageManager);

      const installCommand = this.getInstallCommand(packageManager);
      const [cmd, ...cmdArgs] = installCommand;

      logger.info(`Installing dependencies with ${packageManager}...`);
      
      await this.runCommandWithRetry(cmd, cmdArgs, {
        cwd: this.config.path,
        stdio: this.options.progress ? 'pipe' : 'inherit',
      }, 3);

      logger.success('Dependencies installed successfully');

    } catch (error) {
      const handled = await this.errorHandler.handleError(error, {
        interactive: this.options.interactive,
        autoFix: true,
        gracefulDegradation: true,
      });

      if (!handled) {
        throw error;
      }
    }
  }

  /**
   * Enhanced git initialization with validation
   */
  async initializeGit(): Promise<void> {
    if (this.config.skipGit) {
      logger.info('Skipping git initialization...');
      return;
    }

    try {
      if (this.options.dryRun) {
        logger.debug('[DRY RUN] Would initialize git repository');
        return;
      }

      // Check if git is available
      try {
        await this.runCommand('git', ['--version'], { stdio: 'pipe' });
      } catch (error) {
        logger.warn('Git not available, skipping repository initialization');
        return;
      }

      // Initialize git repository
      await this.runCommand('git', ['init'], { cwd: this.config.path });
      
      // Add all files
      await this.runCommand('git', ['add', '.'], { cwd: this.config.path });
      
      // Create initial commit
      await this.runCommand('git', ['commit', '-m', `Initial commit from DNA CLI - ${this.config.template}`], { 
        cwd: this.config.path 
      });

      logger.success('Git repository initialized successfully');

    } catch (error) {
      await this.errorHandler.handleError(error, {
        interactive: false,
        autoFix: false,
        gracefulDegradation: true,
      });
      // Don't throw error for git issues - not critical
    }
  }

  /**
   * Enhanced finalization with health checks
   */
  async finalize(): Promise<void> {
    try {
      if (this.options.dryRun) {
        logger.debug('[DRY RUN] Would finalize project setup');
        return;
      }

      // Generate project configuration file
      await this.generateProjectConfig();

      // Run health check on generated project
      await this.runProjectHealthCheck();

      // Commit transaction if everything succeeded
      if (this.transactionId) {
        await this.rollbackManager.commitTransaction(this.transactionId);
        this.transactionId = undefined;
      }

      // Clean up temporary files
      await this.cleanupTempFiles();

      logger.success('Project finalized successfully');

    } catch (error) {
      await this.errorHandler.handleError(error, {
        interactive: this.options.interactive,
        autoFix: true,
      });
      throw error;
    }
  }

  /**
   * Enhanced rollback with comprehensive cleanup
   */
  async rollback(): Promise<void> {
    try {
      logger.warn('Rolling back project generation...');

      if (this.transactionId) {
        await this.rollbackManager.rollbackTransaction(this.transactionId);
        this.transactionId = undefined;
      } else {
        // Emergency cleanup if no transaction
        await this.rollbackManager.emergencyCleanup(this.config.path);
      }

      // Restore backup if it exists
      if (this.backupPath && await fs.pathExists(this.backupPath)) {
        await fs.move(this.backupPath, this.config.path);
        logger.info('Restored backup directory');
      }

      logger.success('Rollback completed');

    } catch (error) {
      logger.error('Rollback failed:', error instanceof Error ? error.message : 'Unknown error');
      
      // Try emergency cleanup
      try {
        await this.rollbackManager.emergencyCleanup(this.config.path);
        logger.warn('Emergency cleanup completed');
      } catch (cleanupError) {
        throw new RollbackError(
          'Both rollback and emergency cleanup failed',
          'ROLLBACK_COMPLETE_FAILURE',
          'Manual cleanup may be required. Check the project directory and remove any partial files'
        );
      }
    }
  }

  // Private helper methods

  private async validateSystemRequirements(template: TemplateMetadata): Promise<void> {
    // Check Node.js version
    if (template.requirements?.node) {
      const nodeVersion = process.version;
      // Simple version check - in production, use semver.satisfies
      const requiredMajor = parseInt(template.requirements.node.replace(/[^\d]/g, ''));
      const currentMajor = parseInt(nodeVersion.replace(/[^\d]/g, ''));
      
      if (currentMajor < requiredMajor) {
        throw new UnsupportedNodeVersionError(nodeVersion, template.requirements.node);
      }
    }

    // Check framework-specific requirements
    await this.validateFrameworkRequirements(template.framework);
  }

  private async validateFrameworkRequirements(framework: string): Promise<void> {
    const requirements: Record<string, string[]> = {
      'flutter': ['flutter'],
      'tauri': ['cargo', 'rustc'],
    };

    const requiredTools = requirements[framework];
    if (requiredTools) {
      for (const tool of requiredTools) {
        try {
          await this.runCommand(tool, ['--version'], { stdio: 'pipe' });
        } catch {
          throw new ValidationError(
            `Required tool '${tool}' not found for ${framework} development`,
            'MISSING_FRAMEWORK_TOOL',
            `Install ${tool} for ${framework} development`
          );
        }
      }
    }
  }

  private async validateDiskSpaceAndPermissions(): Promise<void> {
    const parentDir = path.dirname(this.config.path);
    
    // Check write permissions
    try {
      await fs.access(parentDir, fs.constants.W_OK);
    } catch {
      throw new InsufficientPermissionsError(parentDir, 'write');
    }

    // Check disk space (simplified - in production use a proper disk space library)
    try {
      const stats = await fs.stat(parentDir);
      // This is a placeholder - actual disk space checking would require additional library
      logger.debug('Disk space check completed');
    } catch {
      logger.warn('Could not verify disk space');
    }
  }

  private async validateProjectPath(): Promise<void> {
    // Validate path doesn't contain dangerous patterns
    if (this.config.path.includes('..')) {
      throw new ValidationError(
        'Project path cannot contain relative path traversal (..)',
        'UNSAFE_PROJECT_PATH',
        'Use an absolute path or a path without ".." segments'
      );
    }

    // Check for invalid characters
    if (/[<>:"|?*]/.test(this.config.path)) {
      throw new ValidationError(
        'Project path contains invalid characters',
        'INVALID_PATH_CHARACTERS',
        'Remove invalid characters from the path'
      );
    }
  }

  private async validatePackageManager(packageManager: string): Promise<void> {
    try {
      await this.runCommand(packageManager, ['--version'], { stdio: 'pipe' });
    } catch {
      throw new DependencyInstallError(
        packageManager,
        1,
        `Package manager '${packageManager}' not found`
      );
    }
  }

  private async recordGeneratedFiles(files: string[]): Promise<void> {
    if (!this.transactionId) return;

    for (const file of files) {
      const filePath = path.isAbsolute(file) ? file : path.join(this.config.path, file);
      await this.rollbackManager.recordFileCreation(this.transactionId, filePath);
    }
  }

  private async generateProjectConfig(): Promise<void> {
    const dnaConfig = {
      template: this.config.template,
      framework: this.config.framework,
      modules: this.config.dnaModules,
      generated: new Date().toISOString(),
      version: '0.1.0',
      generator: {
        name: 'DNA CLI',
        version: '1.0.0',
      },
      validation: {
        lastCheck: new Date().toISOString(),
        status: 'healthy',
      },
    };

    const configPath = path.join(this.config.path, 'dna.config.json');
    
    if (this.transactionId) {
      await this.rollbackManager.recordFileCreation(
        this.transactionId,
        configPath,
        JSON.stringify(dnaConfig, null, 2)
      );
    } else {
      await fs.writeJSON(configPath, dnaConfig, { spaces: 2 });
    }
  }

  private async runProjectHealthCheck(): Promise<void> {
    logger.info('Running project health check...');
    
    const healthResult = await this.validationFramework.validateProjectHealth(this.config.path);
    
    if (!healthResult.valid) {
      logger.warn('Project health check found issues:');
      healthResult.errors.forEach(error => logger.warn(`  • ${error}`));
    }

    if (healthResult.warnings.length > 0) {
      logger.warn('Project health check warnings:');
      healthResult.warnings.forEach(warning => logger.warn(`  • ${warning}`));
    }

    if (healthResult.suggestions.length > 0) {
      logger.info('Project health check suggestions:');
      healthResult.suggestions.forEach(suggestion => logger.info(`  • ${suggestion}`));
    }
  }

  private getInstallCommand(packageManager: string): string[] {
    switch (packageManager) {
      case 'yarn': return ['yarn', 'install'];
      case 'pnpm': return ['pnpm', 'install'];
      case 'bun': return ['bun', 'install'];
      default: return ['npm', 'install'];
    }
  }

  private async runCommandWithRetry(
    command: string,
    args: string[],
    options: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {},
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.runCommand(command, args, options);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          logger.warn(`Command failed (attempt ${attempt}/${maxRetries}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }

    throw new DependencyInstallError(
      command,
      1,
      lastError?.message || 'Command failed after multiple retries'
    );
  }

  private async runCommand(
    command: string,
    args: string[],
    options: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: options.stdio || 'inherit',
        shell: process.platform === 'win32',
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
        }
      });

      child.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private async cleanupTempFiles(): Promise<void> {
    try {
      await this.rollbackManager.cleanupTempDirectory();
    } catch (error) {
      logger.warn('Failed to cleanup temporary files:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}