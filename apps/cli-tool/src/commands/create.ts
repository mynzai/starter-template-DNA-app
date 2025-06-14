/**
 * @fileoverview Create command - Template instantiation
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { TemplateEngine } from '@dna/core';
import { logger } from '../utils/logger';
import { createCLIError, validateProjectName, validatePath } from '../utils/error-handler';
import { TemplateRegistry } from '../lib/template-registry';
import { TemplateSelector } from '../lib/template-selector';
import { ProjectGenerator } from '../lib/project-generator';
import { ProgressTracker } from '../lib/progress-tracker';
import { ProjectConfig, GenerationOptions } from '../types/cli';

export const createCommand = new Command('create')
  .description('Create a new project from a DNA template')
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
  .option('--no-progress', 'disable progress indicators')
  .option('-y, --yes', 'skip interactive prompts and use defaults')
  .action(async (projectName, options) => {
    try {
      const config = await gatherProjectConfig(projectName, options);
      const generationOptions: GenerationOptions = {
        interactive: !options.yes,
        dryRun: options.dryRun || false,
        overwrite: options.overwrite || false,
        backup: true,
        progress: options.progress !== false,
      };

      await createProject(config, generationOptions);
    } catch (error) {
      throw createCLIError(
        error instanceof Error ? error.message : 'Failed to create project',
        'PROJECT_CREATION_FAILED',
        'Check the error details and try again with different options'
      );
    }
  });

async function gatherProjectConfig(projectName?: string, options: any = {}): Promise<ProjectConfig> {
  const registry = new TemplateRegistry();
  await registry.load();

  let config: Partial<ProjectConfig> = {
    packageManager: options.packageManager || 'npm',
    skipInstall: options.skipInstall || false,
    skipGit: options.skipGit || false,
    variables: {},
  };

  // Get project name
  if (!projectName) {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is your project name?',
        validate: (input: string) => {
          const error = validateProjectName(input);
          return error || true;
        },
      },
    ]);
    config.name = name;
  } else {
    const nameError = validateProjectName(projectName);
    if (nameError) {
      throw createCLIError(nameError, 'INVALID_PROJECT_NAME');
    }
    config.name = projectName;
  }

  // Get output path
  const outputPath = options.output ? path.resolve(options.output) : path.resolve(process.cwd(), config.name!);
  const pathError = validatePath(outputPath);
  if (pathError) {
    throw createCLIError(pathError, 'INVALID_PATH');
  }
  config.path = outputPath;

  // Check if directory exists
  if (await fs.pathExists(outputPath)) {
    if (!options.overwrite) {
      if (options.yes) {
        throw createCLIError(
          `Directory "${outputPath}" already exists`,
          'DIRECTORY_EXISTS',
          'Use --overwrite flag to replace existing files or choose a different name'
        );
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
        throw createCLIError('Project creation cancelled', 'CANCELLED');
      }
    }
  }

  // Get template selection
  if (!options.template) {
    const selector = new TemplateSelector(registry);
    const selectedTemplate = await selector.selectTemplate({
      showCategories: true,
      showFilters: true,
      showRecommended: true,
      allowSearch: true,
      maxResults: 20,
    });
    
    if (!selectedTemplate) {
      throw createCLIError('Template selection cancelled', 'CANCELLED');
    }
    
    config.template = selectedTemplate.id;
  } else {
    const template = registry.getTemplate(options.template);
    if (!template) {
      throw createCLIError(
        `Template "${options.template}" not found`,
        'TEMPLATE_NOT_FOUND',
        'Use "dna-cli list" to see available templates'
      );
    }
    config.template = options.template;
  }

  const selectedTemplate = registry.getTemplate(config.template!)!;
  config.framework = selectedTemplate.framework;

  // Get DNA modules
  if (!options.dna && selectedTemplate.dnaModules.length > 0) {
    const selector = new TemplateSelector(registry);
    const selectedModules = await selector.selectDnaModules(
      selectedTemplate.dnaModules,
      selectedTemplate.dnaModules // Pre-select all recommended modules
    );
    config.dnaModules = selectedModules;
  } else {
    config.dnaModules = options.dna ? options.dna.split(',').map((m: string) => m.trim()) : selectedTemplate.dnaModules;
  }

  // Gather template-specific variables
  if (!options.yes) {
    const selector = new TemplateSelector(registry);
    const templateVariables = await selector.collectTemplateVariables(selectedTemplate, config.name!);
    config.variables = { ...config.variables, ...templateVariables };
  }

  return config as ProjectConfig;
}


async function createProject(config: ProjectConfig, options: GenerationOptions): Promise<void> {
  const progressTracker = new ProgressTracker(options.progress);
  const generator = new ProjectGenerator(config, options, progressTracker);

  progressTracker.start('Creating project', 6);

  try {
    // Stage 1: Validate configuration
    progressTracker.update(1, 'Validating configuration...');
    await generator.validateConfiguration();

    // Stage 2: Prepare project directory
    progressTracker.update(2, 'Preparing project directory...');
    await generator.prepareDirectory();

    // Stage 3: Generate template files
    progressTracker.update(3, 'Generating template files...');
    await generator.generateFiles();

    // Stage 4: Install dependencies
    if (!config.skipInstall) {
      progressTracker.update(4, 'Installing dependencies...');
      await generator.installDependencies();
    } else {
      progressTracker.update(4, 'Skipping dependency installation...');
    }

    // Stage 5: Initialize git repository
    if (!config.skipGit) {
      progressTracker.update(5, 'Initializing git repository...');
      await generator.initializeGit();
    } else {
      progressTracker.update(5, 'Skipping git initialization...');
    }

    // Stage 6: Finalize project
    progressTracker.update(6, 'Finalizing project...');
    await generator.finalize();

    progressTracker.succeed('Project created successfully!');

    // Show next steps
    showNextSteps(config);

  } catch (error) {
    progressTracker.fail('Project creation failed');
    
    // Attempt rollback if not in dry-run mode
    if (!options.dryRun) {
      logger.step('Attempting to clean up...');
      await generator.rollback();
    }
    
    throw error;
  }
}

function showNextSteps(config: ProjectConfig): void {
  const { name, path: projectPath, skipInstall, skipGit } = config;
  const relativePath = path.relative(process.cwd(), projectPath);
  
  logger.plain('');
  logger.success(`✨ Project "${name}" created successfully!`);
  logger.plain('');
  
  logger.plain(chalk.bold('📁 Project location:'));
  logger.plain(`   ${chalk.cyan(projectPath)}`);
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
  logger.plain(chalk.bold('📚 Documentation:'));
  logger.plain(`   ${chalk.cyan('./README.md')}           ${chalk.gray('# Project-specific guide')}`);
  logger.plain(`   ${chalk.cyan('./docs/')}               ${chalk.gray('# Additional documentation')}`);
  logger.plain('');
}

// Utility functions
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, char => char.toUpperCase());
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}