/**
 * @fileoverview Test command for DNA CLI tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { 
  TestRunner, 
  TestRunnerOptions, 
  Framework,
  createDefaultTestConfig,
  mergeTestConfig 
} from '@starter-template-dna/testing';
import { Logger } from '../utils/logger';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface TestCommandOptions {
  framework?: Framework[];
  types?: string[];
  coverage?: boolean;
  'coverage-threshold'?: number;
  parallel?: boolean;
  'generate-reports'?: boolean;
  'report-formats'?: string[];
  'output-dir'?: string;
  watch?: boolean;
  'fail-fast'?: boolean;
  'dry-run'?: boolean;
  config?: string;
  verbose?: boolean;
}

export const testCommand = new Command('test')
  .description('Run comprehensive tests with quality gates')
  .option('-f, --framework <frameworks...>', 'Target frameworks (flutter, react-native, nextjs, tauri)', ['nextjs'])
  .option('-t, --types <types...>', 'Test types to run (unit, integration, e2e, performance, accessibility, security)', ['unit', 'integration'])
  .option('-c, --coverage', 'Enable coverage reporting', true)
  .option('--coverage-threshold <number>', 'Coverage threshold percentage', '80')
  .option('-p, --parallel', 'Run tests in parallel', true)
  .option('--generate-reports', 'Generate test reports', true)
  .option('--report-formats <formats...>', 'Report formats (json, html, markdown, junit)', ['json', 'html'])
  .option('-o, --output-dir <dir>', 'Output directory for reports', './test-reports')
  .option('-w, --watch', 'Watch mode for continuous testing', false)
  .option('--fail-fast', 'Stop on first failure', false)
  .option('--dry-run', 'Show what would be tested without running', false)
  .option('--config <path>', 'Custom test configuration file')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options: TestCommandOptions) => {
    const logger = new Logger(options.verbose);
    const spinner = ora();

    try {
      // Validate options
      const frameworks = validateFrameworks(options.framework || ['nextjs']);
      const testTypes = validateTestTypes(options.types || ['unit', 'integration']);
      const reportFormats = validateReportFormats(options['report-formats'] || ['json', 'html']);

      logger.info('🧪 Starting comprehensive test suite...');
      
      if (options['dry-run']) {
        logger.info('📋 Dry run mode - showing what would be tested:');
        displayDryRunInfo(frameworks, testTypes, options);
        return;
      }

      // Load custom configuration if provided
      let customConfig = {};
      if (options.config) {
        customConfig = await loadCustomConfig(options.config, logger);
      }

      const testRunner = new TestRunner();
      const projectPath = process.cwd();

      // Create test runner options
      const runnerOptions: TestRunnerOptions = {
        frameworks,
        projectPath,
        parallel: options.parallel ?? true,
        generateReports: options['generate-reports'] ?? true,
        reportFormats: reportFormats as ('json' | 'html' | 'markdown')[],
        outputDir: options['output-dir'] || './test-reports',
        configOverrides: createConfigOverrides(
          frameworks, 
          testTypes, 
          options, 
          customConfig
        ),
        progressCallback: (progress) => {
          updateSpinner(spinner, progress);
        },
      };

      // Start testing
      spinner.start('Initializing test environment...');
      
      const result = await testRunner.runTests(runnerOptions);

      spinner.stop();

      // Display results
      displayResults(result, logger, options);

      // Handle failure cases
      if (!result.success) {
        if (options['fail-fast']) {
          logger.error('❌ Tests failed (fail-fast mode)');
          process.exit(1);
        }
        
        logger.warn('⚠️  Some tests failed or quality gates not met');
        displayFailureDetails(result, logger);
        
        if (result.errors.length > 0) {
          process.exit(1);
        }
      }

      logger.success('✅ All tests completed successfully!');

    } catch (error) {
      spinner.stop();
      logger.error('💥 Test execution failed:', error);
      process.exit(1);
    }
  });

// Add subcommands
testCommand
  .command('generate')
  .description('Generate tests automatically')
  .option('-f, --framework <frameworks...>', 'Target frameworks')
  .option('-s, --source <path>', 'Source directory to scan', './src')
  .option('-o, --output <path>', 'Test output directory', './tests')
  .option('--overwrite', 'Overwrite existing tests', false)
  .action(async (options) => {
    const logger = new Logger();
    const spinner = ora('Generating tests...').start();

    try {
      const testRunner = new TestRunner();
      const frameworks = validateFrameworks(options.framework || ['nextjs']);
      
      const results = await testRunner.generateTests(
        frameworks,
        options.source,
        options.output,
        { overwrite: options.overwrite }
      );

      spinner.stop();

      logger.info('📝 Test generation results:');
      for (const { framework, files } of results) {
        logger.info(`  ${framework}: ${files.length} files generated`);
        if (files.length > 0) {
          files.forEach(file => logger.info(`    • ${file}`));
        }
      }

      logger.success('✅ Test generation completed!');

    } catch (error) {
      spinner.stop();
      logger.error('💥 Test generation failed:', error);
      process.exit(1);
    }
  });

testCommand
  .command('validate')
  .description('Validate quality gates without running tests')
  .option('-f, --framework <framework>', 'Target framework', 'nextjs')
  .option('--results <path>', 'Path to test results JSON file')
  .action(async (options) => {
    const logger = new Logger();
    
    try {
      if (!options.results || !await fs.pathExists(options.results)) {
        logger.error('❌ Test results file not found');
        process.exit(1);
      }

      const testResults = await fs.readJson(options.results);
      const testRunner = new TestRunner();
      const framework = validateFrameworks([options.framework])[0];
      
      const qualityGateResult = await testRunner.validateQualityGates(
        framework,
        testResults,
        createDefaultTestConfig(framework)
      );

      if (qualityGateResult.passed) {
        logger.success('✅ Quality gates passed!');
        logger.info(`Score: ${qualityGateResult.score.toFixed(1)}/100`);
      } else {
        logger.error('❌ Quality gates failed!');
        logger.info(`Score: ${qualityGateResult.score.toFixed(1)}/100`);
        
        qualityGateResult.failures.forEach(failure => {
          logger.error(`  • ${failure.gate}: ${failure.metric} (${failure.actual} vs ${failure.expected})`);
        });
      }

    } catch (error) {
      logger.error('💥 Quality gate validation failed:', error);
      process.exit(1);
    }
  });

testCommand
  .command('watch')
  .description('Run tests in watch mode')
  .option('-f, --framework <framework>', 'Target framework', 'nextjs')
  .option('-t, --types <types...>', 'Test types to run', ['unit'])
  .action(async (options) => {
    const logger = new Logger();
    logger.info('👀 Starting test watch mode...');
    logger.info('Press Ctrl+C to exit');

    // This would implement file watching and re-running tests
    // For now, just show that the command exists
    logger.warn('⚠️  Watch mode not yet implemented');
  });

function validateFrameworks(frameworks: string[]): Framework[] {
  const validFrameworks: Framework[] = ['flutter', 'react-native', 'nextjs', 'tauri', 'sveltekit'];
  const invalid = frameworks.filter(f => !validFrameworks.includes(f as Framework));
  
  if (invalid.length > 0) {
    throw new Error(`Invalid frameworks: ${invalid.join(', ')}. Valid options: ${validFrameworks.join(', ')}`);
  }
  
  return frameworks as Framework[];
}

function validateTestTypes(types: string[]): string[] {
  const validTypes = ['unit', 'integration', 'e2e', 'performance', 'accessibility', 'security'];
  const invalid = types.filter(t => !validTypes.includes(t));
  
  if (invalid.length > 0) {
    throw new Error(`Invalid test types: ${invalid.join(', ')}. Valid options: ${validTypes.join(', ')}`);
  }
  
  return types;
}

function validateReportFormats(formats: string[]): string[] {
  const validFormats = ['json', 'html', 'markdown', 'junit'];
  const invalid = formats.filter(f => !validFormats.includes(f));
  
  if (invalid.length > 0) {
    throw new Error(`Invalid report formats: ${invalid.join(', ')}. Valid options: ${validFormats.join(', ')}`);
  }
  
  return formats;
}

async function loadCustomConfig(configPath: string, logger: Logger): Promise<any> {
  try {
    if (!await fs.pathExists(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    const config = await fs.readJson(configPath);
    logger.info(`📄 Loaded custom configuration from ${configPath}`);
    return config;
    
  } catch (error) {
    logger.error(`Failed to load configuration: ${error}`);
    throw error;
  }
}

function createConfigOverrides(
  frameworks: Framework[], 
  testTypes: string[], 
  options: TestCommandOptions,
  customConfig: any
): TestRunnerOptions['configOverrides'] {
  const overrides: TestRunnerOptions['configOverrides'] = {};
  
  for (const framework of frameworks) {
    const defaultConfig = createDefaultTestConfig(framework);
    
    const configOverride = {
      testTypes: testTypes as any[],
      coverage: {
        enabled: options.coverage ?? true,
        threshold: {
          lines: parseInt(options['coverage-threshold'] || '80'),
          functions: parseInt(options['coverage-threshold'] || '80'),
          branches: parseInt(options['coverage-threshold'] || '80'),
          statements: parseInt(options['coverage-threshold'] || '80'),
        },
      },
      ...customConfig[framework],
    };
    
    overrides[framework] = mergeTestConfig(defaultConfig, configOverride);
  }
  
  return overrides;
}

function updateSpinner(spinner: ora.Ora, progress: any): void {
  const { framework, stage, completed, total, currentTest } = progress;
  
  let message = `${framework}: ${stage}`;
  if (currentTest) {
    message += ` - ${currentTest}`;
  }
  if (total > 1) {
    message += ` (${completed}/${total})`;
  }
  
  spinner.text = message;
  
  if (progress.error) {
    spinner.fail(`${framework}: ${progress.error}`);
  }
}

function displayDryRunInfo(
  frameworks: Framework[], 
  testTypes: string[], 
  options: TestCommandOptions
): void {
  console.log(chalk.blue('\n📋 Test Execution Plan:'));
  console.log(`  Frameworks: ${frameworks.join(', ')}`);
  console.log(`  Test Types: ${testTypes.join(', ')}`);
  console.log(`  Coverage: ${options.coverage ? 'Enabled' : 'Disabled'}`);
  console.log(`  Parallel: ${options.parallel ? 'Yes' : 'No'}`);
  console.log(`  Reports: ${options['generate-reports'] ? 'Yes' : 'No'}`);
  if (options['generate-reports']) {
    console.log(`  Report Formats: ${(options['report-formats'] || []).join(', ')}`);
    console.log(`  Output Directory: ${options['output-dir'] || './test-reports'}`);
  }
  console.log();
}

function displayResults(result: any, logger: Logger, options: TestCommandOptions): void {
  console.log(chalk.blue('\n📊 Test Results Summary:'));
  console.log(`  Total Tests: ${result.summary.totalTests}`);
  console.log(`  Passed: ${chalk.green(result.summary.passedTests)}`);
  console.log(`  Failed: ${chalk.red(result.summary.failedTests)}`);
  console.log(`  Skipped: ${chalk.yellow(result.summary.skippedTests)}`);
  console.log(`  Frameworks: ${result.summary.totalFrameworks}`);
  console.log(`  Quality Gates Passed: ${result.summary.qualityGatesPassed}/${result.summary.totalFrameworks}`);
  console.log(`  Overall Coverage: ${result.summary.overallCoverage.toFixed(1)}%`);
  
  if (options['generate-reports']) {
    console.log(chalk.blue('\n📄 Reports Generated:'));
    result.reports.forEach((report: any) => {
      console.log(`  ${report.framework}: ${options['output-dir']}/test-report-${report.framework}-*.{html,json}`);
    });
  }
  console.log();
}

function displayFailureDetails(result: any, logger: Logger): void {
  if (result.errors.length > 0) {
    console.log(chalk.red('\n❌ Errors:'));
    result.errors.forEach((error: string) => {
      console.log(`  • ${error}`);
    });
  }
  
  const failedReports = result.reports.filter((r: any) => !r.qualityGate.passed);
  if (failedReports.length > 0) {
    console.log(chalk.yellow('\n⚠️  Quality Gate Failures:'));
    failedReports.forEach((report: any) => {
      console.log(`  ${report.framework}:`);
      report.qualityGate.failures.forEach((failure: any) => {
        console.log(`    • ${failure.gate}: ${failure.metric} (${failure.actual} vs ${failure.expected})`);
      });
    });
  }
}