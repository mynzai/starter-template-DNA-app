/**
 * @fileoverview Integrated Create Command with Pipeline Integration
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import boxen from 'boxen';
import { 
  TemplateGenerationPipeline,
  DNARegistry,
  TemplateInstantiationEngine,
  GenerationRequest,
  SupportedFramework,
  TemplateType,
  DNACompositionResult
} from '@starter-template-dna/core';
import { enhancedLogger as logger, ICONS } from '../utils/enhanced-logger';
import { EnhancedProgressTracker } from '../lib/enhanced-progress-tracker';
import { ValidationEngine } from '../lib/validation/validation-engine';
import { TemplateRegistry } from '../lib/template-registry';
import path from 'path';
import fs from 'fs-extra';

export const createIntegratedCommand = new Command('create')
  .description('Create a new project with integrated pipeline validation')
  .option('-n, --name <name>', 'project name')
  .option('-t, --template <template>', 'template type')
  .option('-f, --framework <framework>', 'framework choice')
  .option('-p, --path <path>', 'output path')
  .option('-m, --modules <modules>', 'comma-separated DNA modules')
  .option('--preview', 'preview composition before generation')
  .option('--no-install', 'skip dependency installation')
  .option('--no-git', 'skip git initialization')
  .option('--package-manager <manager>', 'package manager to use', 'npm')
  .option('--parallel', 'enable parallel processing', true)
  .option('--cache', 'enable caching', true)
  .action(async (options) => {
    const progressTracker = new EnhancedProgressTracker({
      showStages: true,
      showTime: true,
      showMemory: true
    });

    try {
      // Gather project information
      const projectInfo = await gatherProjectInfo(options);
      
      // Initialize pipeline components
      const dnaRegistry = new DNARegistry();
      const templateEngine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(dnaRegistry, templateEngine, {
        enableParallelProcessing: options.parallel,
        enableCaching: options.cache,
        enableProgressiveValidation: true,
        logger: logger
      });

      // Set up pipeline event listeners for real-time updates
      setupPipelineListeners(pipeline, progressTracker);

      // Preview composition if requested
      if (options.preview) {
        await previewComposition(pipeline, projectInfo);
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed with generation?',
          default: true
        }]);
        
        if (!proceed) {
          logger.info('Generation cancelled');
          return;
        }
      }

      // Execute pipeline
      progressTracker.startWithStages('Generating project', [
        'CLI Validation',
        'DNA Composition',
        'Pre-generation Validation',
        'Template Preparation',
        'Template Generation',
        'Quality Validation',
        'Security Scanning',
        'Finalization'
      ]);

      const result = await pipeline.generate(projectInfo);

      if (result.success) {
        progressTracker.completeAllStages();
        displaySuccessMessage(result, pipeline.getMetrics());
      } else {
        progressTracker.fail('Generation failed');
        displayErrorMessage(result, pipeline.getErrors());
      }

    } catch (error) {
      progressTracker.fail('Unexpected error');
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * Gather project information through interactive prompts
 */
async function gatherProjectInfo(options: any): Promise<GenerationRequest> {
  const answers: any = {};

  // Project name
  if (!options.name) {
    const { name } = await inquirer.prompt([{
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: (input: string) => {
        if (!input) return 'Project name is required';
        if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(input)) {
          return 'Name must start with letter and contain only alphanumeric, hyphens, and underscores';
        }
        return true;
      }
    }]);
    answers.name = name;
  } else {
    answers.name = options.name;
  }

  // Template type
  if (!options.template) {
    const templateRegistry = TemplateRegistry.getInstance();
    const templates = await templateRegistry.getTemplates();
    
    const { template } = await inquirer.prompt([{
      type: 'list',
      name: 'template',
      message: 'Select template type:',
      choices: templates.map(t => ({
        name: `${t.name} - ${t.description}`,
        value: t.type,
        short: t.name
      }))
    }]);
    answers.template = template;
  } else {
    answers.template = options.template;
  }

  // Framework
  if (!options.framework) {
    const { framework } = await inquirer.prompt([{
      type: 'list',
      name: 'framework',
      message: 'Select framework:',
      choices: [
        { name: `${ICONS.react} Next.js - React framework for production`, value: 'nextjs' },
        { name: `${ICONS.flutter} Flutter - Cross-platform mobile & web`, value: 'flutter' },
        { name: `${ICONS.react} React Native - Native mobile apps`, value: 'react-native' },
        { name: `${ICONS.rust} Tauri - Lightweight desktop apps`, value: 'tauri' },
        { name: `${ICONS.svelte} SvelteKit - Fast web applications`, value: 'sveltekit' }
      ]
    }]);
    answers.framework = framework;
  } else {
    answers.framework = options.framework;
  }

  // Output path
  if (!options.path) {
    const defaultPath = path.join(process.cwd(), answers.name);
    const { outputPath } = await inquirer.prompt([{
      type: 'input',
      name: 'outputPath',
      message: 'Project location:',
      default: defaultPath,
      validate: async (input: string) => {
        const parentDir = path.dirname(input);
        try {
          await fs.access(parentDir, fs.constants.W_OK);
          return true;
        } catch {
          return `Cannot write to directory: ${parentDir}`;
        }
      }
    }]);
    answers.path = outputPath;
  } else {
    answers.path = options.path;
  }

  // DNA Modules with real-time compatibility checking
  const selectedModules = await selectDNAModules(
    answers.framework,
    answers.template,
    options.modules
  );

  return {
    name: answers.name,
    outputPath: answers.path,
    templateType: answers.template as TemplateType,
    framework: answers.framework as SupportedFramework,
    dnaModules: selectedModules,
    options: {
      skipInstall: !options.install,
      skipGit: !options.git,
      packageManager: options.packageManager
    }
  };
}

/**
 * Select DNA modules with real-time compatibility checking
 */
async function selectDNAModules(
  framework: string,
  template: string,
  preselected?: string
): Promise<string[]> {
  if (preselected) {
    return preselected.split(',').map(m => m.trim());
  }

  const dnaRegistry = new DNARegistry();
  const availableModules = await dnaRegistry.listAvailableModules();
  
  // Filter modules compatible with selected framework
  const compatibleModules = availableModules.filter(module => {
    const frameworkSupport = module.getFrameworkSupport(framework as SupportedFramework);
    return frameworkSupport && frameworkSupport.supported;
  });

  const selectedModules: string[] = [];
  let selectingModules = true;

  while (selectingModules) {
    // Get remaining compatible modules
    const remainingModules = compatibleModules.filter(
      m => !selectedModules.includes(m.metadata.id)
    );

    if (remainingModules.length === 0) {
      logger.info('No more compatible modules available');
      break;
    }

    // Check compatibility with already selected modules
    const choices = await Promise.all(remainingModules.map(async module => {
      const compatibility = await checkModuleCompatibility(
        module.metadata.id,
        selectedModules,
        dnaRegistry
      );

      let name = `${module.metadata.name} (${module.metadata.category})`;
      
      if (!compatibility.compatible) {
        name = chalk.red(`${name} - ${compatibility.reason}`);
      } else if (compatibility.warnings.length > 0) {
        name = chalk.yellow(`${name} - ${compatibility.warnings[0]}`);
      }

      return {
        name,
        value: module.metadata.id,
        disabled: !compatibility.compatible ? compatibility.reason : false
      };
    }));

    // Add option to finish selection
    choices.push({
      name: chalk.green('✓ Done selecting modules'),
      value: 'done',
      disabled: false
    });

    const { module } = await inquirer.prompt([{
      type: 'list',
      name: 'module',
      message: `Select DNA modules (${selectedModules.length} selected):`,
      choices,
      pageSize: 15
    }]);

    if (module === 'done') {
      selectingModules = false;
    } else {
      selectedModules.push(module);
      logger.success(`Added ${module} module`);
    }
  }

  return selectedModules;
}

/**
 * Check module compatibility with selected modules
 */
async function checkModuleCompatibility(
  moduleId: string,
  selectedModules: string[],
  registry: DNARegistry
): Promise<{
  compatible: boolean;
  reason?: string;
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  // Check for conflicts
  const conflicts = await registry.checkModuleConflicts(moduleId, selectedModules);
  if (conflicts.length > 0) {
    return {
      compatible: false,
      reason: `Conflicts with: ${conflicts.join(', ')}`,
      warnings
    };
  }

  // Check dependencies
  const module = await registry.getModule(moduleId);
  if (module) {
    for (const dep of module.dependencies) {
      if (!dep.optional && !selectedModules.includes(dep.moduleId)) {
        warnings.push(`Requires ${dep.moduleId}`);
      }
    }
  }

  return {
    compatible: true,
    warnings
  };
}

/**
 * Preview composition before generation
 */
async function previewComposition(
  pipeline: TemplateGenerationPipeline,
  request: GenerationRequest
): Promise<void> {
  const spinner = ora('Analyzing composition...').start();

  try {
    const dnaRegistry = new DNARegistry();
    const dnaComposer = pipeline['dnaComposer']; // Access private member for preview
    
    const composition = await dnaComposer.getCompositionPreview({
      modules: request.dnaModules.map(id => ({
        moduleId: id,
        version: 'latest',
        config: {}
      })),
      framework: request.framework,
      templateType: request.templateType,
      projectName: request.name
    });

    spinner.succeed('Composition analysis complete');

    // Display preview
    const preview = [
      chalk.bold('Composition Preview'),
      '',
      chalk.gray('Project:') + ` ${request.name}`,
      chalk.gray('Framework:') + ` ${request.framework}`,
      chalk.gray('Template:') + ` ${request.templateType}`,
      '',
      chalk.bold('DNA Modules:'),
      ...composition.modules.map(m => `  ${ICONS.check} ${m.name} v${m.version}`),
      '',
      chalk.bold('Validation:'),
      `  ${composition.valid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid')}`,
      composition.conflicts.length > 0 ? chalk.red(`  Conflicts: ${composition.conflicts.join(', ')}`) : '',
      composition.warnings.length > 0 ? chalk.yellow(`  Warnings: ${composition.warnings.join(', ')}`) : '',
      '',
      chalk.bold('Estimates:'),
      `  Files: ~${composition.estimatedFiles}`,
      `  Complexity: ${composition.estimatedComplexity}/1000`,
      ''
    ].filter(line => line !== '');

    logger.box(preview, {
      borderColor: composition.valid ? 'green' : 'red',
      borderStyle: 'round'
    });

  } catch (error) {
    spinner.fail('Failed to analyze composition');
    throw error;
  }
}

/**
 * Set up pipeline event listeners
 */
function setupPipelineListeners(
  pipeline: TemplateGenerationPipeline,
  progressTracker: EnhancedProgressTracker
): void {
  // Stage events
  pipeline.on('stage:started', ({ stage }) => {
    progressTracker.updateStage(`${stage.name}...`, 0);
  });

  pipeline.on('stage:completed', ({ stage, overallProgress }) => {
    progressTracker.nextStage();
  });

  pipeline.on('stage:failed', ({ stage }) => {
    logger.error(`Stage failed: ${stage.name} - ${stage.error}`);
  });

  // Composition events
  pipeline.on('composition:module-validated', ({ moduleId }) => {
    logger.debug(`Validated module: ${moduleId}`);
  });

  pipeline.on('composition:conflict-detected', ({ modules, reason }) => {
    logger.warn(`Module conflict detected: ${reason}`);
  });

  // Generation progress
  pipeline.on('generation:progress', ({ message, progress }) => {
    progressTracker.updateStage(message, progress);
  });

  // Validation events
  pipeline.on('validation:progressive', ({ progress }) => {
    logger.debug(`Progressive validation at ${progress}%`);
  });

  // Performance monitoring
  let lastMemoryLog = Date.now();
  pipeline.on('pipeline:memory', ({ usage }) => {
    if (Date.now() - lastMemoryLog > 5000) { // Log every 5 seconds
      logger.debug(`Memory usage: ${Math.round(usage / 1024 / 1024)}MB`);
      lastMemoryLog = Date.now();
    }
  });
}

/**
 * Display success message with metrics
 */
function displaySuccessMessage(result: any, metrics: any): void {
  const message = [
    chalk.bold.green('✨ Project created successfully!'),
    '',
    chalk.gray('Location:') + ` ${result.outputPath}`,
    chalk.gray('Files:') + ` ${result.generatedFiles.length}`,
    chalk.gray('Lines of code:') + ` ${result.metrics.linesOfCode}`,
    chalk.gray('Test coverage:') + ` ${result.metrics.testCoverage}%`,
    '',
    chalk.bold('Performance:'),
    chalk.gray('Total time:') + ` ${(metrics.totalDuration / 1000).toFixed(2)}s`,
    chalk.gray('Memory peak:') + ` ${Math.round(metrics.memoryUsage.peak / 1024 / 1024)}MB`,
    chalk.gray('Cache efficiency:') + ` ${Math.round((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100)}%`,
    '',
    chalk.bold('Next steps:'),
    `  ${chalk.cyan('cd')} ${path.basename(result.outputPath)}`,
    `  ${chalk.cyan('npm run dev')}`,
    '',
    result.warnings.length > 0 ? chalk.yellow(`⚠ ${result.warnings.length} warnings - check generation report`) : ''
  ].filter(line => line !== '');

  logger.box(message, {
    borderColor: 'green',
    borderStyle: 'round',
    title: '🎉 Success',
    titleAlignment: 'center'
  });
}

/**
 * Display error message with troubleshooting
 */
function displayErrorMessage(result: any, errors: any[]): void {
  const message = [
    chalk.bold.red('❌ Generation failed'),
    '',
    chalk.bold('Errors:'),
    ...errors.map(e => `  ${chalk.red('•')} ${e.message}`),
    '',
    chalk.bold('Troubleshooting:'),
    '  1. Check error messages above',
    '  2. Verify system requirements with: dna-cli doctor',
    '  3. Try with --debug flag for detailed logs',
    '  4. Report issues at: https://github.com/dna-cli/issues',
    ''
  ];

  logger.box(message, {
    borderColor: 'red',
    borderStyle: 'round'
  });
}