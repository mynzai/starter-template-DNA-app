/**
 * @fileoverview Enhanced Create command with comprehensive error handling and validation
 * Integrates all error handling, validation, and rollback features
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { TemplateEngine } from '@dna/core';
import { logger } from '../utils/logger';
import { EnhancedErrorHandler } from '../utils/enhanced-error-handler';
import { ValidationFramework } from '../lib/validation/validation-framework';
import { TemplateRegistry } from '../lib/template-registry';
import { TemplateSelector } from '../lib/template-selector';
import { EnhancedProjectGenerator } from '../lib/enhanced-project-generator';
import { ProgressTracker } from '../lib/progress-tracker';
import { ProjectConfig, GenerationOptions } from '../types/cli';
import { 
  ValidationError, 
  TemplateNotFoundError,
  DirectoryExistsError,
  ProjectNameValidationError
} from '../lib/errors/error-types';

export const enhancedCreateCommand = new Command('create')
  .description('Create a new project from a DNA template with enhanced error handling')
  .argument('[name]', 'project name')
  .option('-t, --template <name>', 'template to use')
  .option('-f, --framework <framework>', 'target framework')
  .option('-o, --output <path>', 'output directory', process.cwd())
  .option('-d, --dna <modules>', 'DNA modules to include (comma-separated)')
  .option('-p, --package-manager <manager>', 'package manager to use', 'npm')
  .option('--skip-install', 'skip dependency installation')
  .option('--skip-git', 'skip git repository initialization')
  .option('--dry-run', 'preview changes without creating files')
  .option('--overwrite', 'overwrite existing files')
  .option('--no-backup', 'disable backup creation when overwriting')
  .option('--no-progress', 'disable progress indicators')
  .option('--no-validation', 'skip comprehensive validation (not recommended)')
  .option('--auto-fix', 'attempt automatic fixes for errors')
  .option('-y, --yes', 'skip interactive prompts and use defaults')
  .option('--debug', 'enable debug mode for detailed error information')
  .action(async (projectName, options) => {
    const errorHandler = EnhancedErrorHandler.getInstance();
    
    try {
      // Configure error handling options
      const errorHandlingOptions = {
        interactive: !options.yes,
        autoFix: options.autoFix || false,
        showStackTrace: options.debug || false,
        gracefulDegradation: true,
        maxRetries: 3,
      };

      // Set debug mode
      if (options.debug) {
        process.env.DEBUG = 'true';
      }

      logger.info('🧬 DNA CLI - Enhanced Project Generator');
      logger.plain('');

      // Gather project configuration with enhanced validation
      const config = await gatherProjectConfigWithValidation(projectName, options, errorHandler);
      
      // Configure generation options
      const generationOptions: GenerationOptions = {
        interactive: !options.yes,
        dryRun: options.dryRun || false,
        overwrite: options.overwrite || false,
        backup: options.backup !== false,
        progress: options.progress !== false,
      };

      // Create project with enhanced error handling
      await createProjectWithEnhancedHandling(config, generationOptions, errorHandlingOptions);

    } catch (error) {
      // Final error handling if all else fails
      await errorHandler.handleError(error, {
        interactive: false,
        autoFix: false,
        showStackTrace: true,
        gracefulDegradation: false,
        maxRetries: 0,
      });
      
      process.exit(1);
    }
  });

async function gatherProjectConfigWithValidation(
  projectName?: string, 
  options: any = {},
  errorHandler: EnhancedErrorHandler
): Promise<ProjectConfig> {
  const registry = new TemplateRegistry();
  const validationFramework = ValidationFramework.getInstance();
  
  try {
    await registry.load();
  } catch (error) {
    await errorHandler.handleError(error, {
      interactive: true,
      autoFix: true,
      gracefulDegradation: false,
    });
    throw error;
  }

  let config: Partial<ProjectConfig> = {
    packageManager: options.packageManager || 'npm',
    skipInstall: options.skipInstall || false,
    skipGit: options.skipGit || false,
    variables: {},
  };

  // Get and validate project name
  if (!projectName) {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is your project name?',
        validate: (input: string) => {
          const result = validationFramework.validateUserInput(
            input,
            validationFramework.createCustomSchema(
              validationFramework.getSchema('template')?.shape.metadata.shape.name || 
              require('zod').string().min(3).max(50).regex(/^[a-zA-Z][a-zA-Z0-9-_]*$/)
            ),
            'project name'
          );
          return result.valid || result.errors.join(', ');
        },
      },
    ]);
    config.name = name;
  } else {
    // Validate provided project name
    const nameValidation = validationFramework.validateUserInput(
      projectName,
      validationFramework.createCustomSchema(
        require('zod').string().min(3).max(50).regex(/^[a-zA-Z][a-zA-Z0-9-_]*$/)
      ),
      'project name'
    );
    
    if (!nameValidation.valid) {
      throw new ProjectNameValidationError(projectName, nameValidation.errors.join(', '));
    }
    config.name = projectName;
  }

  // Get and validate output path
  const outputPath = options.output ? path.resolve(options.output) : path.resolve(process.cwd(), config.name!);
  
  const pathValidation = validationFramework.validateUserInput(
    outputPath,
    validationFramework.createCustomSchema(
      require('zod').string().min(1).refine(
        (path) => !path.includes('..') && !/[<>:"|?*]/.test(path),
        'Invalid path characters or path traversal detected'
      )
    ),
    'output path'
  );
  
  if (!pathValidation.valid) {
    throw new ValidationError(
      `Invalid output path: ${pathValidation.errors.join(', ')}`,
      'INVALID_OUTPUT_PATH',
      'Use a valid absolute path without special characters'
    );
  }
  
  config.path = outputPath;

  // Check if directory exists and handle accordingly
  if (await fs.pathExists(outputPath)) {
    if (!options.overwrite) {
      if (options.yes) {
        throw new DirectoryExistsError(outputPath);
      }

      const { shouldOverwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: `Directory "${outputPath}" already exists. Overwrite?`,
          default: false,
        },
      ]);

      if (!shouldOverwrite) {
        throw new ValidationError('Project creation cancelled', 'CANCELLED');
      }
    }
  }

  // Get template selection with validation
  if (!options.template) {
    const selector = new TemplateSelector(registry);
    try {
      const selectedTemplate = await selector.selectTemplate({
        showCategories: true,
        showFilters: true,
        showRecommended: true,
        allowSearch: true,
        maxResults: 20,
      });
      
      if (!selectedTemplate) {
        throw new ValidationError('Template selection cancelled', 'CANCELLED');
      }
      
      config.template = selectedTemplate.id;
    } catch (error) {
      await errorHandler.handleError(error, {
        interactive: true,
        autoFix: false,
        gracefulDegradation: false,
      });
      throw error;
    }
  } else {
    const template = registry.getTemplate(options.template);
    if (!template) {
      const availableTemplates = registry.getAllTemplates().map(t => t.id);
      throw new TemplateNotFoundError(options.template, availableTemplates);
    }
    config.template = options.template;
  }

  const selectedTemplate = registry.getTemplate(config.template!)!;
  config.framework = selectedTemplate.framework;

  // Get DNA modules with validation
  if (!options.dna && selectedTemplate.dnaModules.length > 0) {
    try {
      const selector = new TemplateSelector(registry);
      const selectedModules = await selector.selectDnaModules(
        selectedTemplate.dnaModules,
        selectedTemplate.dnaModules
      );
      config.dnaModules = selectedModules;
    } catch (error) {
      await errorHandler.handleError(error, {
        interactive: true,
        autoFix: false,
        gracefulDegradation: true,
      });
      config.dnaModules = selectedTemplate.dnaModules; // Fallback to all modules
    }
  } else {
    config.dnaModules = options.dna 
      ? options.dna.split(',').map((m: string) => m.trim()) 
      : selectedTemplate.dnaModules;
  }

  // Gather template-specific variables with validation
  if (!options.yes && selectedTemplate.variables) {
    try {
      const selector = new TemplateSelector(registry);
      const templateVariables = await selector.collectTemplateVariables(selectedTemplate, config.name!);
      config.variables = { ...config.variables, ...templateVariables };
    } catch (error) {
      await errorHandler.handleError(error, {
        interactive: true,
        autoFix: false,
        gracefulDegradation: true,
      });
      // Continue with empty variables if collection fails
    }
  }

  // Final validation of complete configuration
  try {
    const configValidation = validationFramework.validateUserInput(
      config,
      validationFramework.getSchema('projectConfig') || require('zod').object({}),
      'project configuration'
    );
    
    if (!configValidation.valid) {
      throw new ValidationError(
        `Configuration validation failed: ${configValidation.errors.join(', ')}`,
        'CONFIG_VALIDATION_FAILED',
        'Please review and correct the configuration errors'
      );
    }
  } catch (error) {
    await errorHandler.handleError(error, {
      interactive: true,
      autoFix: true,
      gracefulDegradation: false,
    });
    throw error;
  }

  return config as ProjectConfig;
}

async function createProjectWithEnhancedHandling(
  config: ProjectConfig, 
  options: GenerationOptions,
  errorHandlingOptions: any
): Promise<void> {
  const progressTracker = new ProgressTracker(options.progress);
  const generator = new EnhancedProjectGenerator(config, options, progressTracker);
  const errorHandler = EnhancedErrorHandler.getInstance();

  progressTracker.start('Creating project with enhanced error handling', 6);

  try {
    // Stage 1: Comprehensive validation
    progressTracker.update(1, 'Running comprehensive validation...');
    try {
      await generator.validateConfiguration();
    } catch (error) {
      const handled = await errorHandler.handleError(error, errorHandlingOptions);
      if (!handled) throw error;
    }

    // Stage 2: Prepare project directory with atomic operations
    progressTracker.update(2, 'Preparing project directory...');
    try {
      await generator.prepareDirectory();
    } catch (error) {
      const handled = await errorHandler.handleError(error, errorHandlingOptions);
      if (!handled) throw error;
    }

    // Stage 3: Generate template files with rollback support
    progressTracker.update(3, 'Generating template files...');
    try {
      await generator.generateFiles();
    } catch (error) {
      const handled = await errorHandler.handleError(error, errorHandlingOptions);
      if (!handled) throw error;
    }

    // Stage 4: Install dependencies with retry logic
    if (!config.skipInstall) {
      progressTracker.update(4, 'Installing dependencies...');
      try {
        await generator.installDependencies();
      } catch (error) {
        const handled = await errorHandler.handleError(error, {
          ...errorHandlingOptions,
          gracefulDegradation: true, // Allow graceful degradation for dependencies
        });
        if (!handled) {
          logger.warn('Dependency installation failed, but continuing...');
        }
      }
    } else {
      progressTracker.update(4, 'Skipping dependency installation...');
    }

    // Stage 5: Initialize git repository
    if (!config.skipGit) {
      progressTracker.update(5, 'Initializing git repository...');
      try {
        await generator.initializeGit();
      } catch (error) {
        // Git errors are not critical, handle gracefully
        await errorHandler.handleError(error, {
          ...errorHandlingOptions,
          interactive: false,
          gracefulDegradation: true,
        });
      }
    } else {
      progressTracker.update(5, 'Skipping git initialization...');
    }

    // Stage 6: Finalize project with health checks
    progressTracker.update(6, 'Finalizing project...');
    try {
      await generator.finalize();
    } catch (error) {
      const handled = await errorHandler.handleError(error, errorHandlingOptions);
      if (!handled) throw error;
    }

    progressTracker.succeed('✨ Project created successfully with enhanced error handling!');

    // Show success message and next steps
    showEnhancedSuccessMessage(config);

    // Show error statistics if any errors were handled
    const errorStats = errorHandler.getErrorStats();
    if (errorStats.total > 0) {
      logger.plain('');
      logger.info('📊 Error Handling Summary:');
      logger.info(`   • Total issues handled: ${errorStats.total}`);
      logger.info(`   • Recovery rate: ${Math.round(errorStats.recoveryRate)}%`);
      
      if (Object.keys(errorStats.byCategory).length > 0) {
        logger.info('   • Issues by category:');
        Object.entries(errorStats.byCategory).forEach(([category, count]) => {
          logger.info(`     - ${category}: ${count}`);
        });
      }
    }

  } catch (error) {
    progressTracker.fail('Project creation failed');
    
    // Attempt comprehensive rollback
    if (!options.dryRun) {
      logger.step('Attempting comprehensive rollback...');
      try {
        await generator.rollback();
        logger.success('Rollback completed successfully');
      } catch (rollbackError) {
        logger.error('Rollback failed - manual cleanup may be required');
        await errorHandler.handleError(rollbackError, {
          interactive: false,
          autoFix: false,
          showStackTrace: true,
          gracefulDegradation: false,
          maxRetries: 0,
        });
      }
    }
    
    throw error;
  }
}

function showEnhancedSuccessMessage(config: ProjectConfig): void {
  const { name, path: projectPath, skipInstall, skipGit } = config;
  const relativePath = path.relative(process.cwd(), projectPath);
  
  logger.plain('');
  logger.success(`✨ Project "${name}" created successfully with enhanced error handling!`);
  logger.plain('');
  
  logger.plain(chalk.bold('📁 Project location:'));
  logger.plain(`   ${chalk.cyan(projectPath)}`);
  logger.plain('');
  
  logger.plain(chalk.bold('🔧 Enhanced Features:'));
  logger.plain(`   ${chalk.green('✓')} Comprehensive validation`);
  logger.plain(`   ${chalk.green('✓')} Atomic operations with rollback`);
  logger.plain(`   ${chalk.green('✓')} Intelligent error recovery`);
  logger.plain(`   ${chalk.green('✓')} Project health monitoring`);
  logger.plain('');
  
  logger.plain(chalk.bold('🚀 Next steps:'));
  
  if (relativePath !== '.') {
    logger.plain(`   ${chalk.cyan(`cd ${relativePath}`)}`);
  }
  
  if (skipInstall) {
    logger.plain(`   ${chalk.cyan('npm install')}          ${chalk.gray('# Install dependencies')}`);
  }
  
  logger.plain(`   ${chalk.cyan('npm run dev')}           ${chalk.gray('# Start development server')}`);
  logger.plain(`   ${chalk.cyan('npm run build')}         ${chalk.gray('# Build for production')}`);
  logger.plain(`   ${chalk.cyan('npm test')}              ${chalk.gray('# Run tests')}`);
  
  if (skipGit) {
    logger.plain(`   ${chalk.cyan('git init')}              ${chalk.gray('# Initialize git repository')}`);
    logger.plain(`   ${chalk.cyan('git add .')}             ${chalk.gray('# Stage all files')}`);
    logger.plain(`   ${chalk.cyan('git commit -m "Initial commit"')}  ${chalk.gray('# Create first commit')}`);
  }
  
  logger.plain('');
  logger.plain(chalk.bold('🔍 Project validation:'));
  logger.plain(`   ${chalk.cyan('dna-cli validate')}      ${chalk.gray('# Run project health check')}`);
  logger.plain(`   ${chalk.cyan('dna-cli validate --deep')} ${chalk.gray('# Deep validation with recommendations')}`);
  logger.plain('');
  
  logger.plain(chalk.bold('📚 Documentation:'));
  logger.plain(`   ${chalk.cyan('./README.md')}           ${chalk.gray('# Project-specific guide')}`);
  logger.plain(`   ${chalk.cyan('./dna.config.json')}     ${chalk.gray('# DNA CLI configuration')}`);
  logger.plain(`   ${chalk.cyan('./docs/')}               ${chalk.gray('# Additional documentation')}`);
  logger.plain('');
  
  logger.plain(chalk.gray('💡 Tip: Use --debug flag for detailed error information during development'));
  logger.plain('');
}

// Export helper functions for testing
export { 
  gatherProjectConfigWithValidation, 
  createProjectWithEnhancedHandling, 
  showEnhancedSuccessMessage 
};