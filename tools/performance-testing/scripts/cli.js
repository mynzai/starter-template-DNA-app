#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { BaselineManager } from '../regression-tests/baseline-manager.js';
import { PerformanceAnalyzer } from '../optimization-engine/performance-analyzer.js';
import { PerformanceMonitor } from '../monitoring/performance-monitor.js';
import { PerformanceBudgetManager } from '../budgets/performance-budgets.js';
import { runLoadTests } from './run-load-tests.js';
import { runRegressionTests } from './run-regression-tests.js';
import { generateReports } from './generate-reports.js';

const program = new Command();

program
  .name('dna-perf')
  .description('DNA Template Performance Testing Suite')
  .version('1.0.0');

// Load testing commands
program
  .command('test')
  .description('Run performance tests')
  .option('-t, --type <type>', 'Test type: api, web, mobile, all', 'all')
  .option('-e, --env <env>', 'Environment: dev, staging, prod', 'dev')
  .option('-d, --duration <duration>', 'Test duration', '5m')
  .option('-u, --users <users>', 'Number of virtual users', '10')
  .option('-o, --output <output>', 'Output directory', './reports')
  .action(async (options) => {
    const spinner = ora('Running performance tests...').start();
    
    try {
      const results = await runLoadTests(options);
      spinner.succeed('Performance tests completed successfully');
      
      console.log(chalk.green('\\n✅ Test Results Summary:'));
      console.log(`📊 Total requests: ${results.totalRequests}`);
      console.log(`⚡ Average response time: ${results.avgResponseTime}ms`);
      console.log(`🎯 Success rate: ${results.successRate}%`);
      console.log(`📈 Throughput: ${results.throughput} RPS`);
      
    } catch (error) {
      spinner.fail('Performance tests failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Baseline management commands
program
  .command('baseline')
  .description('Manage performance baselines')
  .addCommand(
    new Command('create')
      .description('Create a new performance baseline')
      .argument('<template-type>', 'Template type')
      .option('-v, --version <version>', 'Version tag')
      .option('-c, --commit <commit>', 'Git commit hash')
      .action(async (templateType, options) => {
        const spinner = ora('Creating performance baseline...').start();
        
        try {
          const baselineManager = new BaselineManager();
          
          // Run tests to establish baseline
          const testResults = await runLoadTests({ 
            type: 'all', 
            templateType,
            baseline: true 
          });
          
          await baselineManager.createBaseline(templateType, testResults, {
            version: options.version,
            gitCommit: options.commit
          });
          
          spinner.succeed(`Baseline created for ${templateType}`);
          
        } catch (error) {
          spinner.fail('Failed to create baseline');
          console.error(chalk.red('❌ Error:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all baselines')
      .action(async () => {
        const baselineManager = new BaselineManager();
        const baselines = await baselineManager.listBaselines();
        
        if (baselines.length === 0) {
          console.log(chalk.yellow('No baselines found'));
          return;
        }
        
        console.log(chalk.blue('\\n📊 Available Baselines:\\n'));
        baselines.forEach(baseline => {
          console.log(`${chalk.green('✅')} ${baseline.templateType}`);
          console.log(`   Version: ${baseline.version}`);
          console.log(`   Created: ${new Date(baseline.timestamp).toLocaleString()}`);
          console.log('');
        });
      })
  );

// Regression testing commands
program
  .command('regression')
  .description('Run regression tests against baseline')
  .argument('<template-type>', 'Template type')
  .option('-v, --version <version>', 'Current version tag')
  .option('-c, --commit <commit>', 'Git commit hash')
  .option('-f, --fail-on-regression', 'Exit with error code on regression')
  .action(async (templateType, options) => {
    const spinner = ora('Running regression tests...').start();
    
    try {
      const results = await runRegressionTests(templateType, {
        version: options.version,
        gitCommit: options.commit
      });
      
      if (results.passed) {
        spinner.succeed('No performance regressions detected');
        console.log(chalk.green(`\\n✅ ${templateType} performance is stable`));
      } else {
        spinner.fail(`Performance regressions detected in ${templateType}`);
        
        console.log(chalk.red(`\\n❌ ${results.issues.length} regression(s) found:`));
        results.issues.forEach(issue => {
          console.log(`   ${chalk.red('•')} ${issue.message}`);
        });
        
        if (options.failOnRegression) {
          process.exit(1);
        }
      }
      
    } catch (error) {
      spinner.fail('Regression tests failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Optimization commands
program
  .command('optimize')
  .description('Analyze performance and generate optimization recommendations')
  .argument('<template-type>', 'Template type')
  .option('-i, --input <input>', 'Input test results file')
  .option('-o, --output <output>', 'Output analysis file')
  .action(async (templateType, options) => {
    const spinner = ora('Analyzing performance...').start();
    
    try {
      const analyzer = new PerformanceAnalyzer();
      
      // Load test results
      let testResults;
      if (options.input) {
        testResults = await fs.readJson(options.input);
      } else {
        // Run fresh tests
        testResults = await runLoadTests({ 
          type: 'all', 
          templateType 
        });
      }
      
      const analysis = await analyzer.analyzePerformance(testResults, templateType);
      
      spinner.succeed('Performance analysis completed');
      
      // Display results
      console.log(chalk.blue(`\\n📊 Performance Analysis for ${templateType}`));
      console.log(`Overall Score: ${analysis.overallScore}/100`);
      console.log(`Bottlenecks Found: ${analysis.bottlenecks.length}`);
      console.log(`Optimizations Available: ${analysis.optimizations.length}`);
      
      if (analysis.recommendations.length > 0) {
        console.log(chalk.yellow('\\n🔧 Optimization Recommendations:'));
        analysis.recommendations.forEach(rec => {
          console.log(`\\n${chalk.bold(rec.title)} (${rec.priority})`);
          console.log(`   ${rec.description}`);
          if (rec.actions && rec.actions.length > 0) {
            rec.actions.forEach(action => {
              console.log(`   • ${action.optimization || action.issue}`);
            });
          }
        });
      }
      
      // Save analysis if output specified
      if (options.output) {
        await analyzer.exportAnalysis(analysis, options.output);
        console.log(chalk.green(`\\n📁 Analysis saved to ${options.output}`));
      }
      
    } catch (error) {
      spinner.fail('Performance analysis failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Monitoring commands
program
  .command('monitor')
  .description('Start continuous performance monitoring')
  .option('-i, --interval <interval>', 'Monitoring interval in seconds', '30')
  .option('-t, --targets <targets>', 'Comma-separated list of targets to monitor')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Starting performance monitoring...'));
    
    const monitor = new PerformanceMonitor({
      interval: parseInt(options.interval) * 1000
    });
    
    let targets = [];
    if (options.targets) {
      // Parse custom targets
      targets = options.targets.split(',').map(t => ({
        name: t.trim(),
        type: 'api',
        url: `http://localhost:3000/${t.trim()}`
      }));
    }
    
    // Set up event handlers
    monitor.on('performance_alert', (alert) => {
      console.log(chalk.red(`🚨 ALERT: ${alert.message}`));
    });
    
    monitor.on('monitoring_cycle_complete', (results) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(chalk.green(`✅ [${timestamp}] Monitoring cycle completed - ${results.length} targets checked`));
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\\n🛑 Stopping monitoring...'));
      monitor.stopMonitoring();
      process.exit(0);
    });
    
    await monitor.startMonitoring(targets);
  });

// Budget commands
program
  .command('budget')
  .description('Manage performance budgets')
  .addCommand(
    new Command('check')
      .description('Check performance against budgets')
      .argument('<template-type>', 'Template type')
      .option('-i, --input <input>', 'Input test results file')
      .action(async (templateType, options) => {
        const spinner = ora('Checking performance budget...').start();
        
        try {
          const budgetManager = new PerformanceBudgetManager();
          
          // Load test results
          let testResults;
          if (options.input) {
            testResults = await fs.readJson(options.input);
          } else {
            // Run fresh tests
            testResults = await runLoadTests({ 
              type: 'all', 
              templateType 
            });
          }
          
          const budgetResults = await budgetManager.checkBudget(templateType, testResults);
          
          if (budgetResults.passed) {
            spinner.succeed('Performance budget check passed');
            console.log(chalk.green(`\\n✅ ${templateType} meets all performance budgets`));
          } else {
            spinner.fail('Performance budget violations detected');
            
            console.log(chalk.red(`\\n❌ Budget violations for ${templateType}:`));
            budgetResults.violations.forEach(violation => {
              console.log(`   ${chalk.red('•')} ${violation.message} (${violation.severity})`);
            });
          }
          
        } catch (error) {
          spinner.fail('Budget check failed');
          console.error(chalk.red('❌ Error:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('report')
      .description('Generate budget compliance report')
      .option('-d, --days <days>', 'Number of days to include', '30')
      .action(async (options) => {
        const budgetManager = new PerformanceBudgetManager();
        const timeRange = parseInt(options.days) * 24 * 60 * 60 * 1000;
        
        const report = budgetManager.generateComplianceReport(timeRange);
        
        console.log(chalk.blue(`\\n📊 Performance Budget Compliance Report`));
        console.log(`Time Range: Last ${options.days} days`));
        console.log(`Total Templates: ${report.summary.totalTemplates}`);
        console.log(`Compliant: ${chalk.green(report.summary.compliantTemplates)}`);
        console.log(`Violating: ${chalk.red(report.summary.violatingTemplates)}`);
        console.log(`Total Violations: ${report.summary.totalViolations}`);
        
        console.log(chalk.blue('\\n📋 Template Details:'));
        Object.entries(report.templates).forEach(([template, details]) => {
          const status = details.compliant ? chalk.green('✅') : chalk.red('❌');
          console.log(`${status} ${template}: ${details.violationCount} violations`);
        });
      })
  );

// Report generation commands
program
  .command('report')
  .description('Generate comprehensive performance reports')
  .option('-t, --type <type>', 'Report type: summary, detailed, trends', 'summary')
  .option('-o, --output <output>', 'Output directory', './reports')
  .option('-f, --format <format>', 'Output format: html, json, pdf', 'html')
  .action(async (options) => {
    const spinner = ora('Generating performance report...').start();
    
    try {
      await generateReports(options);
      spinner.succeed('Performance report generated successfully');
      console.log(chalk.green(`\\n📄 Report saved to ${options.output}`));
      
    } catch (error) {
      spinner.fail('Report generation failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Interactive setup command
program
  .command('setup')
  .description('Interactive setup of performance testing suite')
  .action(async () => {
    console.log(chalk.blue('🚀 DNA Performance Testing Suite Setup\\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'templates',
        message: 'Which template types do you want to test?',
        choices: [
          'high-performance-api',
          'real-time-collaboration', 
          'data-visualization',
          'ai-saas-platform',
          'mobile-ai-assistant-rn',
          'mobile-ai-assistant-flutter'
        ]
      },
      {
        type: 'list',
        name: 'environment',
        message: 'Which environment?',
        choices: ['development', 'staging', 'production']
      },
      {
        type: 'confirm',
        name: 'createBaselines',
        message: 'Create performance baselines?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableMonitoring',
        message: 'Enable continuous monitoring?',
        default: false
      }
    ]);
    
    const spinner = ora('Setting up performance testing...').start();
    
    try {
      // Create baselines if requested
      if (answers.createBaselines) {
        const baselineManager = new BaselineManager();
        
        for (const template of answers.templates) {
          spinner.text = `Creating baseline for ${template}...`;
          
          const testResults = await runLoadTests({ 
            type: 'all', 
            templateType: template,
            env: answers.environment
          });
          
          await baselineManager.createBaseline(template, testResults, {
            environment: answers.environment,
            setupDate: new Date().toISOString()
          });
        }
      }
      
      // Start monitoring if requested
      if (answers.enableMonitoring) {
        const monitor = new PerformanceMonitor();
        await monitor.startMonitoring();
        
        console.log(chalk.green('\\n🔍 Continuous monitoring started'));
        console.log(chalk.blue('Use Ctrl+C to stop monitoring'));
      }
      
      spinner.succeed('Performance testing suite setup completed');
      
      console.log(chalk.green('\\n✅ Setup Complete!'));
      console.log(chalk.blue('\\nNext steps:'));
      console.log('• Run performance tests: dna-perf test');
      console.log('• Check budgets: dna-perf budget check <template-type>');
      console.log('• Generate reports: dna-perf report');
      
    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// CI/CD integration command
program
  .command('ci')
  .description('Run performance validation for CI/CD pipeline')
  .option('-t, --template <template>', 'Template type to validate')
  .option('-b, --budget-only', 'Only check budgets, skip regression tests')
  .option('-r, --regression-only', 'Only run regression tests, skip budget check')
  .action(async (options) => {
    const spinner = ora('Running CI performance validation...').start();
    
    try {
      const results = {
        budgetCheck: null,
        regressionTest: null,
        passed: true
      };
      
      // Run budget check
      if (!options.regressionOnly) {
        const budgetManager = new PerformanceBudgetManager();
        const testResults = await runLoadTests({ 
          type: 'all', 
          templateType: options.template 
        });
        
        results.budgetCheck = await budgetManager.checkBudget(options.template, testResults);
        if (!results.budgetCheck.passed) {
          results.passed = false;
        }
      }
      
      // Run regression test
      if (!options.budgetOnly) {
        results.regressionTest = await runRegressionTests(options.template);
        if (!results.regressionTest.passed) {
          results.passed = false;
        }
      }
      
      if (results.passed) {
        spinner.succeed('CI performance validation passed');
        console.log(chalk.green('\\n✅ All performance checks passed'));
      } else {
        spinner.fail('CI performance validation failed');
        
        if (results.budgetCheck && !results.budgetCheck.passed) {
          console.log(chalk.red('❌ Budget violations detected'));
        }
        
        if (results.regressionTest && !results.regressionTest.passed) {
          console.log(chalk.red('❌ Performance regressions detected'));
        }
        
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('CI validation failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.help();
}