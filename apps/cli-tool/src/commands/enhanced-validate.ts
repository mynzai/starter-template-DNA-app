/**
 * @fileoverview Enhanced Validate command with comprehensive validation framework
 * Demonstrates the full validation capabilities of the enhanced error handling system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { ValidationFramework } from '../lib/validation/validation-framework';
import { ValidationEngine } from '../lib/validation/validation-engine';
import { EnhancedErrorHandler } from '../utils/enhanced-error-handler';
import { TemplateRegistry } from '../lib/template-registry';
import { ValidationResult } from '../types/cli';

export const enhancedValidateCommand = new Command('validate')
  .description('Validate projects, templates, and configurations with comprehensive error handling')
  .argument('[path]', 'path to validate (defaults to current directory)', '.')
  .option('-t, --type <type>', 'validation type: project, template, dna-module, environment, all', 'project')
  .option('--deep', 'run deep validation with recommendations')
  .option('--fix', 'attempt to automatically fix validation issues')
  .option('--report', 'generate detailed validation report')
  .option('--json', 'output results in JSON format')
  .option('--fail-on-warnings', 'treat warnings as errors')
  .option('--template-config <path>', 'path to template configuration file')
  .option('--module-config <path>', 'path to DNA module configuration file')
  .action(async (targetPath, options) => {
    const errorHandler = EnhancedErrorHandler.getInstance();
    
    try {
      const validationPath = path.resolve(targetPath);
      
      logger.info('🔍 DNA CLI - Enhanced Validation System');
      logger.plain('');
      
      const results = await runComprehensiveValidation(validationPath, options);
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        displayValidationResults(results, options);
      }
      
      // Exit with appropriate code
      const hasErrors = results.some(r => !r.result.valid);
      const hasWarnings = results.some(r => r.result.warnings.length > 0);
      
      if (hasErrors || (options.failOnWarnings && hasWarnings)) {
        process.exit(1);
      }
      
    } catch (error) {
      await errorHandler.handleError(error, {
        interactive: true,
        autoFix: options.fix || false,
        showStackTrace: true,
        gracefulDegradation: false,
      });
      process.exit(1);
    }
  });

interface ValidationTask {
  name: string;
  type: string;
  path: string;
  result: ValidationResult;
  duration: number;
  autoFixApplied: boolean;
}

async function runComprehensiveValidation(
  targetPath: string, 
  options: any
): Promise<ValidationTask[]> {
  const validationFramework = ValidationFramework.getInstance();
  const validationEngine = ValidationEngine.getInstance();
  const errorHandler = EnhancedErrorHandler.getInstance();
  const results: ValidationTask[] = [];
  
  logger.info(`Validating: ${targetPath}`);
  logger.info(`Validation type: ${options.type}`);
  if (options.deep) {
    logger.info('Deep validation enabled');
  }
  if (options.fix) {
    logger.info('Auto-fix enabled');
  }
  logger.plain('');

  // Determine what to validate based on type and path content
  const validationTasks = await determineValidationTasks(targetPath, options);
  
  for (const task of validationTasks) {
    logger.step(`Validating ${task.type}: ${task.name}`);
    
    const startTime = Date.now();
    let result: ValidationResult;
    let autoFixApplied = false;
    
    try {
      // Run appropriate validation
      switch (task.type) {
        case 'project':
          result = await validateProject(task.path, options, validationFramework);
          break;
        case 'template':
          result = await validateTemplate(task.path, options, validationFramework);
          break;
        case 'dna-module':
          result = await validateDnaModule(task.path, options, validationFramework);
          break;
        case 'environment':
          result = await validateEnvironment(options, validationEngine);
          break;
        case 'configuration':
          result = await validateConfiguration(task.path, options, validationFramework);
          break;
        default:
          throw new Error(`Unknown validation type: ${task.type}`);
      }
      
      // Apply auto-fixes if enabled and available
      if (options.fix && result.errors.length > 0) {
        const fixResult = await attemptAutoFixes(task, result, options);
        if (fixResult.applied) {
          autoFixApplied = true;
          // Re-run validation after fixes
          logger.info('Re-running validation after auto-fixes...');
          switch (task.type) {
            case 'project':
              result = await validateProject(task.path, options, validationFramework);
              break;
            case 'template':
              result = await validateTemplate(task.path, options, validationFramework);
              break;
            case 'dna-module':
              result = await validateDnaModule(task.path, options, validationFramework);
              break;
            case 'environment':
              result = await validateEnvironment(options, validationEngine);
              break;
            case 'configuration':
              result = await validateConfiguration(task.path, options, validationFramework);
              break;
          }
        }
      }
      
    } catch (error) {
      // Handle validation errors gracefully
      result = {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
        suggestions: ['Check the validation target and try again'],
      };
      
      if (options.fix) {
        await errorHandler.handleError(error, {
          interactive: false,
          autoFix: true,
          gracefulDegradation: true,
        });
      }
    }
    
    const duration = Date.now() - startTime;
    
    results.push({
      name: task.name,
      type: task.type,
      path: task.path,
      result,
      duration,
      autoFixApplied,
    });
    
    // Show immediate feedback
    if (result.valid) {
      logger.success(`✓ ${task.name} validation passed`);
    } else {
      logger.error(`✗ ${task.name} validation failed (${result.errors.length} errors)`);
    }
    
    if (autoFixApplied) {
      logger.info('  Auto-fixes applied');
    }
  }
  
  return results;
}

async function determineValidationTasks(targetPath: string, options: any): Promise<Array<{
  name: string;
  type: string;
  path: string;
}>> {
  const tasks: Array<{ name: string; type: string; path: string }> = [];
  
  if (options.type === 'all') {
    // Always validate environment
    tasks.push({
      name: 'System Environment',
      type: 'environment',
      path: targetPath,
    });
    
    // Check what's available in the target path
    if (await fs.pathExists(targetPath)) {
      const stats = await fs.stat(targetPath);
      
      if (stats.isDirectory()) {
        // Check for project indicators
        if (await fs.pathExists(path.join(targetPath, 'package.json'))) {
          tasks.push({
            name: 'Project Health',
            type: 'project',
            path: targetPath,
          });
        }
        
        if (await fs.pathExists(path.join(targetPath, 'dna.config.json'))) {
          tasks.push({
            name: 'DNA Configuration',
            type: 'configuration',
            path: targetPath,
          });
        }
        
        // Check for template indicators
        if (await fs.pathExists(path.join(targetPath, 'template.json'))) {
          tasks.push({
            name: 'Template Configuration',
            type: 'template',
            path: targetPath,
          });
        }
        
        // Check for DNA module indicators
        if (await fs.pathExists(path.join(targetPath, 'dna-module.json'))) {
          tasks.push({
            name: 'DNA Module',
            type: 'dna-module',
            path: targetPath,
          });
        }
      }
    }
  } else {
    // Single validation type
    const taskName = getTaskName(options.type, targetPath);
    tasks.push({
      name: taskName,
      type: options.type,
      path: targetPath,
    });
  }
  
  // Add custom configuration files if specified
  if (options.templateConfig) {
    tasks.push({
      name: 'Custom Template Config',
      type: 'template',
      path: path.resolve(options.templateConfig),
    });
  }
  
  if (options.moduleConfig) {
    tasks.push({
      name: 'Custom DNA Module Config',
      type: 'dna-module',
      path: path.resolve(options.moduleConfig),
    });
  }
  
  return tasks;
}

function getTaskName(type: string, targetPath: string): string {
  const baseName = path.basename(targetPath);
  switch (type) {
    case 'project': return `Project: ${baseName}`;
    case 'template': return `Template: ${baseName}`;
    case 'dna-module': return `DNA Module: ${baseName}`;
    case 'environment': return 'System Environment';
    case 'configuration': return `Configuration: ${baseName}`;
    default: return `Unknown: ${baseName}`;
  }
}

async function validateProject(
  projectPath: string, 
  options: any, 
  framework: ValidationFramework
): Promise<ValidationResult> {
  const result = await framework.validateProjectHealth(projectPath);
  
  if (options.deep) {
    // Add deep validation checks
    result.suggestions.push('Consider running dependency security audit');
    result.suggestions.push('Check for outdated dependencies');
    result.suggestions.push('Validate test coverage is above 80%');
    result.suggestions.push('Ensure CI/CD configuration is present');
  }
  
  return result;
}

async function validateTemplate(
  templatePath: string, 
  options: any, 
  framework: ValidationFramework
): Promise<ValidationResult> {
  const result = await framework.validateTemplateConfig(templatePath);
  
  if (options.deep) {
    // Add deep template validation
    result.suggestions.push('Verify all template variables have descriptions');
    result.suggestions.push('Check template file structure completeness');
    result.suggestions.push('Validate DNA module compatibility matrix');
    result.suggestions.push('Ensure template examples are provided');
  }
  
  return result;
}

async function validateDnaModule(
  modulePath: string, 
  options: any, 
  framework: ValidationFramework
): Promise<ValidationResult> {
  const result = await framework.validateDnaModule(modulePath);
  
  if (options.deep) {
    // Add deep module validation
    result.suggestions.push('Verify module dependencies are minimal');
    result.suggestions.push('Check for proper conflict resolution');
    result.suggestions.push('Validate module documentation completeness');
    result.suggestions.push('Ensure proper version constraints');
  }
  
  return result;
}

async function validateEnvironment(
  options: any, 
  engine: ValidationEngine
): Promise<ValidationResult> {
  const result = await engine.validateEnvironment();
  
  if (options.deep) {
    // Add deep environment validation
    result.suggestions.push('Consider upgrading to latest LTS versions');
    result.suggestions.push('Check for security vulnerabilities in global packages');
    result.suggestions.push('Validate development tool configurations');
    result.suggestions.push('Ensure proper PATH environment setup');
  }
  
  return result;
}

async function validateConfiguration(
  configPath: string, 
  options: any, 
  framework: ValidationFramework
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };
  
  try {
    // Check if DNA config exists and is valid
    const dnaConfigPath = path.join(configPath, 'dna.config.json');
    if (await fs.pathExists(dnaConfigPath)) {
      const config = await fs.readJSON(dnaConfigPath);
      
      // Basic validation
      if (!config.template) {
        result.errors.push('DNA config missing template information');
      }
      
      if (!config.generated) {
        result.warnings.push('DNA config missing generation timestamp');
      }
      
      if (!config.version) {
        result.warnings.push('DNA config missing version information');
      }
      
      if (options.deep) {
        // Deep configuration validation
        if (!config.validation?.lastCheck) {
          result.suggestions.push('Add validation tracking to DNA config');
        }
        
        if (!config.generator?.name) {
          result.suggestions.push('Include generator information in DNA config');
        }
      }
    } else {
      result.errors.push('DNA configuration file not found');
    }
    
    result.valid = result.errors.length === 0;
    
  } catch (error) {
    result.errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.valid = false;
  }
  
  return result;
}

async function attemptAutoFixes(
  task: any, 
  result: ValidationResult, 
  options: any
): Promise<{ applied: boolean; fixes: string[] }> {
  const fixes: string[] = [];
  let applied = false;
  
  // Example auto-fixes based on common validation errors
  for (const error of result.errors) {
    if (error.includes('package.json missing')) {
      // Auto-generate basic package.json
      try {
        const packageJson = {
          name: path.basename(task.path),
          version: '1.0.0',
          description: 'Generated by DNA CLI validation auto-fix',
          main: 'index.js',
          scripts: {
            test: 'echo "Error: no test specified" && exit 1'
          },
          license: 'MIT'
        };
        
        await fs.writeJSON(path.join(task.path, 'package.json'), packageJson, { spaces: 2 });
        fixes.push('Generated basic package.json');
        applied = true;
      } catch (fixError) {
        logger.warn('Failed to auto-generate package.json');
      }
    }
    
    if (error.includes('README.md missing')) {
      // Auto-generate basic README
      try {
        const readme = `# ${path.basename(task.path)}

Generated by DNA CLI validation auto-fix.

## Getting Started

Add your project description here.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`
`;
        
        await fs.writeFile(path.join(task.path, 'README.md'), readme);
        fixes.push('Generated basic README.md');
        applied = true;
      } catch (fixError) {
        logger.warn('Failed to auto-generate README.md');
      }
    }
    
    if (error.includes('.gitignore missing')) {
      // Auto-generate basic .gitignore
      try {
        const gitignore = `node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
`;
        
        await fs.writeFile(path.join(task.path, '.gitignore'), gitignore);
        fixes.push('Generated basic .gitignore');
        applied = true;
      } catch (fixError) {
        logger.warn('Failed to auto-generate .gitignore');
      }
    }
  }
  
  if (applied) {
    logger.info(`Applied ${fixes.length} auto-fixes:`);
    fixes.forEach(fix => logger.info(`  • ${fix}`));
  }
  
  return { applied, fixes };
}

function displayValidationResults(results: ValidationTask[], options: any): void {
  logger.plain('');
  logger.info('🔍 Validation Results Summary');
  logger.plain('='.repeat(50));
  
  const totalTasks = results.length;
  const passedTasks = results.filter(r => r.result.valid).length;
  const failedTasks = totalTasks - passedTasks;
  const totalErrors = results.reduce((sum, r) => sum + r.result.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.result.warnings.length, 0);
  const totalSuggestions = results.reduce((sum, r) => sum + r.result.suggestions.length, 0);
  const autoFixesApplied = results.filter(r => r.autoFixApplied).length;
  
  // Overall summary
  logger.plain('');
  logger.info('📊 Overall Summary:');
  logger.plain(`   Tasks: ${chalk.green(`${passedTasks} passed`)} | ${chalk.red(`${failedTasks} failed`)} | ${totalTasks} total`);
  logger.plain(`   Issues: ${chalk.red(`${totalErrors} errors`)} | ${chalk.yellow(`${totalWarnings} warnings`)} | ${chalk.blue(`${totalSuggestions} suggestions`)}`);
  
  if (autoFixesApplied > 0) {
    logger.plain(`   Auto-fixes: ${chalk.green(`${autoFixesApplied} applied`)}`);
  }
  
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  logger.plain(`   Duration: ${totalDuration}ms`);
  
  // Detailed results for each task
  logger.plain('');
  logger.info('📋 Detailed Results:');
  
  for (const task of results) {
    logger.plain('');
    
    const status = task.result.valid ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    const duration = chalk.gray(`(${task.duration}ms)`);
    const autoFix = task.autoFixApplied ? chalk.blue(' [AUTO-FIXED]') : '';
    
    logger.plain(`${status} ${chalk.bold(task.name)} ${duration}${autoFix}`);
    logger.plain(`     Type: ${task.type} | Path: ${task.path}`);
    
    if (task.result.errors.length > 0) {
      logger.plain(`     ${chalk.red.bold('Errors:')}`);
      task.result.errors.forEach(error => {
        logger.plain(`       ${chalk.red('•')} ${error}`);
      });
    }
    
    if (task.result.warnings.length > 0) {
      logger.plain(`     ${chalk.yellow.bold('Warnings:')}`);
      task.result.warnings.forEach(warning => {
        logger.plain(`       ${chalk.yellow('•')} ${warning}`);
      });
    }
    
    if (task.result.suggestions.length > 0 && (options.deep || options.report)) {
      logger.plain(`     ${chalk.blue.bold('Suggestions:')}`);
      task.result.suggestions.forEach(suggestion => {
        logger.plain(`       ${chalk.blue('•')} ${suggestion}`);
      });
    }
  }
  
  // Recommendations
  if (failedTasks > 0 || totalWarnings > 0) {
    logger.plain('');
    logger.info('💡 Recommendations:');
    
    if (failedTasks > 0) {
      logger.plain(`   • Fix ${totalErrors} error(s) to ensure project quality`);
    }
    
    if (totalWarnings > 0) {
      logger.plain(`   • Address ${totalWarnings} warning(s) to improve project health`);
    }
    
    if (!options.fix && (totalErrors > 0 || totalWarnings > 0)) {
      logger.plain(`   • Use ${chalk.cyan('--fix')} flag to attempt automatic fixes`);
    }
    
    if (!options.deep) {
      logger.plain(`   • Use ${chalk.cyan('--deep')} flag for comprehensive analysis`);
    }
    
    if (!options.report) {
      logger.plain(`   • Use ${chalk.cyan('--report')} flag for detailed reporting`);
    }
  } else {
    logger.plain('');
    logger.success('🎉 All validations passed! Your project is in excellent shape.');
  }
  
  logger.plain('');
}

export { runComprehensiveValidation, displayValidationResults };