/**
 * @fileoverview Validate command - Project and template validation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { createCLIError } from '../utils/error-handler';
import { ValidationResult } from '../types/cli';

export const validateCommand = new Command('validate')
  .description('Validate project configuration and templates')
  .argument('[path]', 'project path to validate', '.')
  .option('--template', 'validate as template (not project)')
  .option('--fix', 'attempt to fix validation issues automatically')
  .option('--strict', 'use strict validation rules')
  .action(async (projectPath, options) => {
    try {
      const fullPath = path.resolve(projectPath);
      
      if (options.template) {
        await validateTemplate(fullPath, options);
      } else {
        await validateProject(fullPath, options);
      }
      
    } catch (error) {
      throw createCLIError(
        error instanceof Error ? error.message : 'Validation failed',
        'VALIDATION_FAILED'
      );
    }
  });

async function validateProject(projectPath: string, options: any): Promise<void> {
  logger.step(`Validating project at ${chalk.cyan(projectPath)}`);
  
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };
  
  // Check if directory exists
  if (!await fs.pathExists(projectPath)) {
    result.errors.push(`Project directory does not exist: ${projectPath}`);
    result.valid = false;
    displayValidationResult(result);
    return;
  }
  
  // Check for package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    result.errors.push('package.json not found');
    result.valid = false;
  } else {
    try {
      const packageJson = await fs.readJSON(packageJsonPath);
      validatePackageJson(packageJson, result, options.strict);
    } catch (error) {
      result.errors.push('Invalid package.json format');
      result.valid = false;
    }
  }
  
  // Check for DNA configuration
  await validateDNAConfiguration(projectPath, result);
  
  // Check for required files
  await validateRequiredFiles(projectPath, result);
  
  // Check dependencies
  await validateDependencies(projectPath, result);
  
  // Check code quality
  await validateCodeQuality(projectPath, result, options.strict);
  
  // Attempt fixes if requested
  if (options.fix && !result.valid) {
    logger.step('Attempting to fix validation issues...');
    await attemptFixes(projectPath, result);
  }
  
  displayValidationResult(result);
  
  if (!result.valid) {
    process.exit(1);
  }
}

async function validateTemplate(templatePath: string, options: any): Promise<void> {
  logger.step(`Validating template at ${chalk.cyan(templatePath)}`);
  
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };
  
  // Check template.json
  const templateJsonPath = path.join(templatePath, 'template.json');
  if (!await fs.pathExists(templateJsonPath)) {
    result.errors.push('template.json not found');
    result.valid = false;
  } else {
    try {
      const templateJson = await fs.readJSON(templateJsonPath);
      validateTemplateMetadata(templateJson, result);
    } catch (error) {
      result.errors.push('Invalid template.json format');
      result.valid = false;
    }
  }
  
  // Check template structure
  await validateTemplateStructure(templatePath, result);
  
  // Check template files
  await validateTemplateFiles(templatePath, result);
  
  displayValidationResult(result);
  
  if (!result.valid) {
    process.exit(1);
  }
}

function validatePackageJson(packageJson: any, result: ValidationResult, strict: boolean): void {
  // Required fields
  const requiredFields = ['name', 'version', 'description'];
  requiredFields.forEach(field => {
    if (!packageJson[field]) {
      result.errors.push(`Missing required field in package.json: ${field}`);
      result.valid = false;
    }
  });
  
  // Recommended fields
  const recommendedFields = ['author', 'license', 'repository'];
  recommendedFields.forEach(field => {
    if (!packageJson[field]) {
      result.warnings.push(`Missing recommended field in package.json: ${field}`);
    }
  });
  
  // Scripts validation
  if (!packageJson.scripts) {
    result.warnings.push('No scripts defined in package.json');
  } else {
    const recommendedScripts = ['dev', 'build', 'test', 'lint'];
    recommendedScripts.forEach(script => {
      if (!packageJson.scripts[script]) {
        result.suggestions.push(`Consider adding "${script}" script to package.json`);
      }
    });
  }
  
  // Dependencies validation
  if (strict && packageJson.dependencies) {
    Object.keys(packageJson.dependencies).forEach(dep => {
      const version = packageJson.dependencies[dep];
      if (version.startsWith('^') || version.startsWith('~')) {
        result.warnings.push(`Loose version constraint for ${dep}: ${version}`);
      }
    });
  }
}

async function validateDNAConfiguration(projectPath: string, result: ValidationResult): Promise<void> {
  const dnaConfigPath = path.join(projectPath, 'dna.config.json');
  
  if (await fs.pathExists(dnaConfigPath)) {
    try {
      const dnaConfig = await fs.readJSON(dnaConfigPath);
      
      // Validate DNA modules
      if (dnaConfig.modules && Array.isArray(dnaConfig.modules)) {
        if (dnaConfig.modules.length === 0) {
          result.warnings.push('No DNA modules configured');
        }
      } else {
        result.warnings.push('DNA modules not properly configured');
      }
      
      // Validate framework configuration
      if (!dnaConfig.framework) {
        result.warnings.push('Framework not specified in DNA configuration');
      }
      
    } catch (error) {
      result.errors.push('Invalid dna.config.json format');
      result.valid = false;
    }
  } else {
    result.suggestions.push('Consider adding dna.config.json for DNA module configuration');
  }
}

async function validateRequiredFiles(projectPath: string, result: ValidationResult): Promise<void> {
  const requiredFiles = [
    'README.md',
    '.gitignore',
    'tsconfig.json',
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(projectPath, file);
    if (!await fs.pathExists(filePath)) {
      result.warnings.push(`Missing recommended file: ${file}`);
    }
  }
  
  // Check for source directory
  const srcDir = path.join(projectPath, 'src');
  if (!await fs.pathExists(srcDir)) {
    result.suggestions.push('Consider organizing code in a "src" directory');
  }
}

async function validateDependencies(projectPath: string, result: ValidationResult): Promise<void> {
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  const packageLockPath = path.join(projectPath, 'package-lock.json');
  
  if (!await fs.pathExists(nodeModulesPath)) {
    result.warnings.push('Dependencies not installed (node_modules missing)');
    result.suggestions.push('Run "npm install" to install dependencies');
  }
  
  if (!await fs.pathExists(packageLockPath)) {
    result.suggestions.push('Consider committing package-lock.json for reproducible builds');
  }
}

async function validateCodeQuality(projectPath: string, result: ValidationResult, strict: boolean): Promise<void> {
  // Check for linting configuration
  const lintConfigs = ['.eslintrc.json', '.eslintrc.js', 'eslint.config.js'];
  const hasLintConfig = await Promise.all(
    lintConfigs.map(config => fs.pathExists(path.join(projectPath, config)))
  );
  
  if (!hasLintConfig.some(exists => exists)) {
    result.suggestions.push('Consider adding ESLint configuration for code quality');
  }
  
  // Check for formatting configuration
  const formatConfigs = ['.prettierrc', '.prettierrc.json', 'prettier.config.js'];
  const hasFormatConfig = await Promise.all(
    formatConfigs.map(config => fs.pathExists(path.join(projectPath, config)))
  );
  
  if (!hasFormatConfig.some(exists => exists)) {
    result.suggestions.push('Consider adding Prettier configuration for code formatting');
  }
  
  // Check for test directory or files
  const testDir = path.join(projectPath, 'test');
  const testsDir = path.join(projectPath, '__tests__');
  const hasTestDir = await fs.pathExists(testDir) || await fs.pathExists(testsDir);
  
  if (!hasTestDir) {
    result.warnings.push('No test directory found');
    result.suggestions.push('Consider adding tests for better code quality');
  }
}

function validateTemplateMetadata(templateJson: any, result: ValidationResult): void {
  const requiredFields = ['name', 'description', 'type', 'framework', 'version'];
  requiredFields.forEach(field => {
    if (!templateJson[field]) {
      result.errors.push(`Missing required field in template.json: ${field}`);
      result.valid = false;
    }
  });
  
  // Validate DNA modules
  if (templateJson.dnaModules && !Array.isArray(templateJson.dnaModules)) {
    result.errors.push('DNA modules must be an array');
    result.valid = false;
  }
  
  // Validate features
  if (templateJson.features && !Array.isArray(templateJson.features)) {
    result.warnings.push('Features should be an array');
  }
}

async function validateTemplateStructure(templatePath: string, result: ValidationResult): Promise<void> {
  // Check for required template directories
  const requiredDirs = ['src', 'template'];
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(templatePath, dir);
    if (!await fs.pathExists(dirPath)) {
      result.warnings.push(`Missing recommended directory: ${dir}`);
    }
  }
}

async function validateTemplateFiles(templatePath: string, result: ValidationResult): Promise<void> {
  // Check for template entry point
  const entryPoints = ['template/package.json.hbs', 'template/package.json'];
  const hasEntryPoint = await Promise.all(
    entryPoints.map(entry => fs.pathExists(path.join(templatePath, entry)))
  );
  
  if (!hasEntryPoint.some(exists => exists)) {
    result.warnings.push('No package.json template found');
  }
}

async function attemptFixes(projectPath: string, result: ValidationResult): Promise<void> {
  let fixedCount = 0;
  
  // Attempt to create missing files
  const filesToCreate = [
    { path: '.gitignore', content: 'node_modules/\n.env\ndist/\n' },
    { path: 'README.md', content: `# ${path.basename(projectPath)}\n\nGenerated with DNA CLI\n` },
  ];
  
  for (const file of filesToCreate) {
    const filePath = path.join(projectPath, file.path);
    if (!await fs.pathExists(filePath)) {
      try {
        await fs.writeFile(filePath, file.content);
        logger.success(`Created ${file.path}`);
        fixedCount++;
      } catch (error) {
        logger.warn(`Failed to create ${file.path}`);
      }
    }
  }
  
  if (fixedCount > 0) {
    logger.success(`Fixed ${fixedCount} issue${fixedCount === 1 ? '' : 's'}`);
    // Re-run validation to update results
    result.errors = result.errors.filter(error => 
      !error.includes('.gitignore') && !error.includes('README.md')
    );
    result.warnings = result.warnings.filter(warning => 
      !warning.includes('.gitignore') && !warning.includes('README.md')
    );
  }
}

function displayValidationResult(result: ValidationResult): void {
  logger.plain('');
  
  if (result.valid) {
    logger.success('✅ Validation passed!');
  } else {
    logger.fail('❌ Validation failed!');
  }
  
  if (result.errors.length > 0) {
    logger.plain(`\n${chalk.red.bold('Errors:')}`);
    result.errors.forEach(error => {
      logger.plain(`  ${chalk.red('✗')} ${error}`);
    });
  }
  
  if (result.warnings.length > 0) {
    logger.plain(`\n${chalk.yellow.bold('Warnings:')}`);
    result.warnings.forEach(warning => {
      logger.plain(`  ${chalk.yellow('⚠')} ${warning}`);
    });
  }
  
  if (result.suggestions.length > 0) {
    logger.plain(`\n${chalk.blue.bold('Suggestions:')}`);
    result.suggestions.forEach(suggestion => {
      logger.plain(`  ${chalk.blue('💡')} ${suggestion}`);
    });
  }
  
  logger.plain('');
}