#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { SecurityScanner } from '../security/security-scanner.js';
import { ComplianceValidator } from '../compliance/compliance-validator.js';
import { VulnerabilityManager } from '../vulnerability/vulnerability-manager.js';
import { PolicyEnforcer } from '../policy/policy-enforcer.js';
import { AuditReporter } from '../audit/audit-reporter.js';
import { SecurityDashboard } from '../dashboard/security-dashboard.js';

const program = new Command();

program
  .name('dna-security')
  .description('DNA Template Security & Compliance Validation Suite')
  .version('1.0.0');

// Security scanning commands
program
  .command('scan')
  .description('Run comprehensive security scans')
  .option('-t, --type <type>', 'Scan type: sast, dast, container, all', 'all')
  .option('-p, --path <path>', 'Path to scan', './templates')
  .option('-o, --output <output>', 'Output directory', './reports/security')
  .option('-f, --format <format>', 'Output format: json, html, sarif', 'json')
  .option('--severity <severity>', 'Minimum severity: low, medium, high, critical', 'medium')
  .action(async (options) => {
    const spinner = ora('Running security scans...').start();
    
    try {
      const scanner = new SecurityScanner({
        outputDir: options.output,
        format: options.format,
        minSeverity: options.severity
      });
      
      const results = await scanner.runScan(options.type, options.path);
      
      spinner.succeed('Security scans completed');
      
      // Display summary
      console.log(chalk.blue('\n🔒 Security Scan Results'));
      console.log(`📊 Total Issues: ${results.summary.totalIssues}`);
      console.log(`🔴 Critical: ${results.summary.critical}`);
      console.log(`🟠 High: ${results.summary.high}`);
      console.log(`🟡 Medium: ${results.summary.medium}`);
      console.log(`🟢 Low: ${results.summary.low}`);
      
      if (results.summary.critical > 0 || results.summary.high > 0) {
        console.log(chalk.red('\n⚠️  Critical or high severity issues found!'));
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('Security scan failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Compliance validation commands
program
  .command('compliance')
  .description('Validate regulatory compliance')
  .option('-s, --standard <standard>', 'Compliance standard: gdpr, soc2, hipaa, all', 'all')
  .option('-t, --template <template>', 'Template type to validate')
  .option('-o, --output <output>', 'Output directory', './reports/compliance')
  .action(async (options) => {
    const spinner = ora('Validating compliance...').start();
    
    try {
      const validator = new ComplianceValidator({
        outputDir: options.output
      });
      
      const results = await validator.validateCompliance(
        options.standard,
        options.template
      );
      
      spinner.succeed('Compliance validation completed');
      
      // Display compliance status
      console.log(chalk.blue('\n📋 Compliance Validation Results'));
      
      Object.entries(results.standards).forEach(([standard, result]) => {
        const status = result.compliant ? chalk.green('✅ COMPLIANT') : chalk.red('❌ NON-COMPLIANT');
        console.log(`${standard.toUpperCase()}: ${status}`);
        console.log(`   Controls Passed: ${result.passedControls}/${result.totalControls}`);
        
        if (!result.compliant) {
          console.log(`   Issues: ${result.issues.length}`);
        }
      });
      
      if (!results.overallCompliant) {
        console.log(chalk.red('\n⚠️  Compliance violations found!'));
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('Compliance validation failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Vulnerability management commands
program
  .command('vulnerabilities')
  .description('Manage security vulnerabilities')
  .addCommand(
    new Command('scan')
      .description('Scan for vulnerabilities')
      .option('-t, --type <type>', 'Scan type: dependencies, containers, code', 'dependencies')
      .action(async (options) => {
        const spinner = ora('Scanning for vulnerabilities...').start();
        
        try {
          const vulnManager = new VulnerabilityManager();
          const results = await vulnManager.scanVulnerabilities(options.type);
          
          spinner.succeed('Vulnerability scan completed');
          
          console.log(chalk.blue('\n🔍 Vulnerability Scan Results'));
          console.log(`📦 Dependencies Scanned: ${results.summary.totalDependencies}`);
          console.log(`🔴 Critical: ${results.summary.critical}`);
          console.log(`🟠 High: ${results.summary.high}`);
          console.log(`🟡 Medium: ${results.summary.medium}`);
          console.log(`🟢 Low: ${results.summary.low}`);
          
        } catch (error) {
          spinner.fail('Vulnerability scan failed');
          console.error(chalk.red('❌ Error:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('fix')
      .description('Auto-fix vulnerabilities')
      .option('--dry-run', 'Show what would be fixed without making changes')
      .action(async (options) => {
        const spinner = ora('Fixing vulnerabilities...').start();
        
        try {
          const vulnManager = new VulnerabilityManager();
          const results = await vulnManager.autoFixVulnerabilities({
            dryRun: options.dryRun
          });
          
          spinner.succeed('Vulnerability fixing completed');
          
          console.log(chalk.blue('\n🔧 Vulnerability Fix Results'));
          console.log(`✅ Fixed: ${results.fixed}`);
          console.log(`⏭️  Skipped: ${results.skipped}`);
          console.log(`❌ Failed: ${results.failed}`);
          
        } catch (error) {
          spinner.fail('Vulnerability fixing failed');
          console.error(chalk.red('❌ Error:'), error.message);
          process.exit(1);
        }
      })
  );

// Policy enforcement commands
program
  .command('policy')
  .description('Enforce security policies')
  .addCommand(
    new Command('check')
      .description('Check policy compliance')
      .option('-p, --policy <policy>', 'Policy to check', 'security')
      .action(async (options) => {
        const spinner = ora('Checking policy compliance...').start();
        
        try {
          const enforcer = new PolicyEnforcer();
          const results = await enforcer.checkPolicy(options.policy);
          
          spinner.succeed('Policy check completed');
          
          console.log(chalk.blue('\n📜 Policy Compliance Results'));
          console.log(`Policy: ${results.policyName}`);
          console.log(`Status: ${results.compliant ? chalk.green('✅ COMPLIANT') : chalk.red('❌ NON-COMPLIANT')}`);
          console.log(`Rules Passed: ${results.passedRules}/${results.totalRules}`);
          
          if (!results.compliant) {
            console.log(chalk.red('\n⚠️  Policy violations:'));
            results.violations.forEach(violation => {
              console.log(`   • ${violation.rule}: ${violation.message}`);
            });
          }
          
        } catch (error) {
          spinner.fail('Policy check failed');
          console.error(chalk.red('❌ Error:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('enforce')
      .description('Enforce security policies in CI/CD')
      .option('--fail-on-violation', 'Exit with error code on violations')
      .action(async (options) => {
        const spinner = ora('Enforcing security policies...').start();
        
        try {
          const enforcer = new PolicyEnforcer();
          const results = await enforcer.enforceAllPolicies();
          
          if (results.allCompliant) {
            spinner.succeed('All policies enforced successfully');
            console.log(chalk.green('\n✅ All security policies are compliant'));
          } else {
            spinner.fail('Policy violations detected');
            console.log(chalk.red('\n❌ Security policy violations found'));
            
            if (options.failOnViolation) {
              process.exit(1);
            }
          }
          
        } catch (error) {
          spinner.fail('Policy enforcement failed');
          console.error(chalk.red('❌ Error:'), error.message);
          process.exit(1);
        }
      })
  );

// Audit and reporting commands
program
  .command('audit')
  .description('Generate security audit reports')
  .option('-t, --type <type>', 'Report type: security, compliance, vulnerability, all', 'all')
  .option('-f, --format <format>', 'Output format: html, pdf, json, csv', 'html')
  .option('-o, --output <output>', 'Output file path')
  .option('-d, --days <days>', 'Number of days to include', '30')
  .action(async (options) => {
    const spinner = ora('Generating audit report...').start();
    
    try {
      const reporter = new AuditReporter({
        format: options.format,
        timeRange: parseInt(options.days) * 24 * 60 * 60 * 1000
      });
      
      const report = await reporter.generateReport(options.type, options.output);
      
      spinner.succeed('Audit report generated');
      
      console.log(chalk.blue('\n📊 Audit Report Generated'));
      console.log(`Report Type: ${options.type}`);
      console.log(`Format: ${options.format}`);
      console.log(`Output: ${report.outputPath}`);
      console.log(`Time Range: Last ${options.days} days`);
      
    } catch (error) {
      spinner.fail('Audit report generation failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Dashboard commands
program
  .command('dashboard')
  .description('Start security dashboard server')
  .option('-p, --port <port>', 'Port to run dashboard on', '8080')
  .option('--host <host>', 'Host to bind to', 'localhost')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Starting Security Dashboard...'));
    
    try {
      const dashboard = new SecurityDashboard({
        port: parseInt(options.port),
        host: options.host
      });
      
      await dashboard.start();
      
      console.log(chalk.green(`\n✅ Dashboard running at http://${options.host}:${options.port}`));
      console.log(chalk.blue('Press Ctrl+C to stop'));
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Stopping dashboard...'));
        await dashboard.stop();
        process.exit(0);
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start dashboard:'), error.message);
      process.exit(1);
    }
  });

// Interactive setup command
program
  .command('setup')
  .description('Interactive setup of security and compliance suite')
  .action(async () => {
    console.log(chalk.blue('🔒 DNA Security & Compliance Setup\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'standards',
        message: 'Which compliance standards do you need?',
        choices: [
          'GDPR - General Data Protection Regulation',
          'SOC2 - Service Organization Control 2',
          'HIPAA - Health Insurance Portability and Accountability Act',
          'PCI-DSS - Payment Card Industry Data Security Standard',
          'ISO 27001 - Information Security Management'
        ]
      },
      {
        type: 'checkbox',
        name: 'scanTypes',
        message: 'Which security scans do you want to enable?',
        choices: [
          'SAST - Static Application Security Testing',
          'DAST - Dynamic Application Security Testing',
          'Container Security Scanning',
          'Dependency Vulnerability Scanning',
          'Infrastructure Security Scanning'
        ]
      },
      {
        type: 'list',
        name: 'enforcement',
        message: 'Policy enforcement level?',
        choices: ['strict', 'moderate', 'warning']
      },
      {
        type: 'confirm',
        name: 'enableMonitoring',
        message: 'Enable continuous security monitoring?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableReporting',
        message: 'Setup automated compliance reporting?',
        default: true
      }
    ]);
    
    const spinner = ora('Setting up security and compliance...').start();
    
    try {
      // Initialize security components based on selections
      const scanner = new SecurityScanner();
      const validator = new ComplianceValidator();
      const enforcer = new PolicyEnforcer({ enforcement: answers.enforcement });
      
      // Configure enabled standards
      await validator.configureStandards(answers.standards);
      
      // Setup scan configurations
      await scanner.configureScanTypes(answers.scanTypes);
      
      // Initialize monitoring if enabled
      if (answers.enableMonitoring) {
        const dashboard = new SecurityDashboard();
        await dashboard.initialize();
      }
      
      // Setup reporting if enabled
      if (answers.enableReporting) {
        const reporter = new AuditReporter();
        await reporter.setupAutomatedReporting();
      }
      
      spinner.succeed('Security and compliance setup completed');
      
      console.log(chalk.green('\n✅ Setup Complete!'));
      console.log(chalk.blue('\nNext steps:'));
      console.log('• Run security scan: dna-security scan');
      console.log('• Check compliance: dna-security compliance');
      console.log('• Scan vulnerabilities: dna-security vulnerabilities scan');
      console.log('• Generate audit report: dna-security audit');
      
    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// CI/CD integration command
program
  .command('ci')
  .description('Run security validation for CI/CD pipeline')
  .option('--scan-only', 'Only run security scans')
  .option('--compliance-only', 'Only check compliance')
  .option('--quick', 'Run quick security checks only')
  .action(async (options) => {
    const spinner = ora('Running CI security validation...').start();
    
    try {
      const results = {
        securityScan: null,
        complianceCheck: null,
        vulnerabilityScan: null,
        policyCheck: null,
        passed: true
      };
      
      // Run security scan
      if (!options.complianceOnly) {
        const scanner = new SecurityScanner();
        results.securityScan = await scanner.runScan(
          options.quick ? 'sast' : 'all',
          './'
        );
        
        if (results.securityScan.summary.critical > 0) {
          results.passed = false;
        }
      }
      
      // Run compliance check
      if (!options.scanOnly) {
        const validator = new ComplianceValidator();
        results.complianceCheck = await validator.validateCompliance('all');
        
        if (!results.complianceCheck.overallCompliant) {
          results.passed = false;
        }
      }
      
      // Run vulnerability scan
      if (!options.quick && !options.complianceOnly) {
        const vulnManager = new VulnerabilityManager();
        results.vulnerabilityScan = await vulnManager.scanVulnerabilities('dependencies');
        
        if (results.vulnerabilityScan.summary.critical > 0) {
          results.passed = false;
        }
      }
      
      // Check policies
      if (!options.scanOnly) {
        const enforcer = new PolicyEnforcer();
        results.policyCheck = await enforcer.checkPolicy('security');
        
        if (!results.policyCheck.compliant) {
          results.passed = false;
        }
      }
      
      if (results.passed) {
        spinner.succeed('CI security validation passed');
        console.log(chalk.green('\n✅ All security checks passed'));
      } else {
        spinner.fail('CI security validation failed');
        console.log(chalk.red('\n❌ Security issues found'));
        
        if (results.securityScan?.summary.critical > 0) {
          console.log(chalk.red(`   Critical security issues: ${results.securityScan.summary.critical}`));
        }
        
        if (results.complianceCheck && !results.complianceCheck.overallCompliant) {
          console.log(chalk.red('   Compliance violations detected'));
        }
        
        if (results.vulnerabilityScan?.summary.critical > 0) {
          console.log(chalk.red(`   Critical vulnerabilities: ${results.vulnerabilityScan.summary.critical}`));
        }
        
        if (results.policyCheck && !results.policyCheck.compliant) {
          console.log(chalk.red('   Policy violations detected'));
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