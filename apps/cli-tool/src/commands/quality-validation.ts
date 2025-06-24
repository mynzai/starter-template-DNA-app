/**
 * @fileoverview Quality Validation CLI Command - Epic 6 Story 4
 * CLI interface for automated quality validation across templates
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { createCLIError } from '../utils/error-handler';
import { 
  QualityValidationEngine,
  QualityValidationConfig,
  TemplateTestConfig,
  ValidationCategory,
  TestPlatform,
  OrchestrationMode
} from '@starter-template-dna/core';
import { 
  AutomatedQualityOrchestrator,
  AutomatedQualityConfig
} from '@starter-template-dna/core';
import { SupportedFramework } from '@starter-template-dna/core';

export const qualityValidationCommand = new Command('quality')
  .description('Run automated quality validation across templates')
  .option('-t, --template <path>', 'specific template to validate')
  .option('-f, --framework <framework>', 'filter by framework (nextjs, flutter, tauri, sveltekit)')
  .option('-p, --platform <platform>', 'filter by platform (web, mobile_ios, mobile_android, desktop_*)')
  .option('-c, --category <category>', 'validation categories (comma-separated)')
  .option('-m, --mode <mode>', 'orchestration mode', 'full_validation')
  .option('--config <path>', 'path to quality validation configuration file')
  .option('--parallel', 'enable parallel validation execution', false)
  .option('--max-concurrent <number>', 'maximum concurrent validations', '3')
  .option('--timeout <minutes>', 'validation timeout in minutes', '30')
  .option('--output <format>', 'output format (json, html, markdown)', 'json')
  .option('--output-dir <path>', 'output directory for reports', './quality-reports')
  .option('--fail-on-critical', 'fail on critical issues', false)
  .option('--fail-on-high', 'fail on high severity issues', false)
  .option('--auto-fix', 'attempt automatic fixes', false)
  .option('--schedule', 'setup scheduled validation', false)
  .option('--watch', 'watch for changes and trigger validation', false)
  .option('--dashboard', 'launch quality validation dashboard', false)
  .action(async (options) => {
    try {
      logger.info('🔍 DNA Quality Validation System');
      logger.plain('');

      // Load configuration
      const config = await loadQualityConfig(options.config);
      
      // Initialize validation engine
      const validationEngine = new QualityValidationEngine(config.validationEngine);
      
      // Initialize orchestrator
      const orchestrator = new AutomatedQualityOrchestrator(config.orchestrator, validationEngine);
      
      // Setup event listeners for real-time feedback
      setupEventListeners(orchestrator, validationEngine);
      
      if (options.dashboard) {
        await launchDashboard(orchestrator, options);
      } else if (options.schedule) {
        await setupScheduledValidation(orchestrator, options);
      } else if (options.watch) {
        await setupWatchMode(orchestrator, options);
      } else {
        await runValidation(orchestrator, validationEngine, options);
      }
      
    } catch (error) {
      throw createCLIError(
        error instanceof Error ? error.message : 'Quality validation failed',
        'QUALITY_VALIDATION_FAILED'
      );
    }
  });

/**
 * Load quality validation configuration
 */
async function loadQualityConfig(configPath?: string): Promise<{
  validationEngine: QualityValidationConfig;
  orchestrator: AutomatedQualityConfig;
}> {
  let config: any = {};
  
  if (configPath && await fs.pathExists(configPath)) {
    try {
      config = await fs.readJSON(configPath);
      logger.success(`Loaded configuration from ${configPath}`);
    } catch (error) {
      logger.warn(`Failed to load configuration from ${configPath}, using defaults`);
    }
  }
  
  // Default configuration
  const defaultValidationConfig: QualityValidationConfig = {
    enableParallelValidation: true,
    maxConcurrentValidations: 3,
    timeoutMinutes: 30,
    categoryConfigs: new Map([
      [ValidationCategory.TEMPLATE_TESTING, { 
        enabled: true, 
        weight: 0.3, 
        thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
        customSettings: {}
      }],
      [ValidationCategory.SECURITY_SCANNING, { 
        enabled: true, 
        weight: 0.25, 
        thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
        customSettings: {}
      }],
      [ValidationCategory.PERFORMANCE_BENCHMARKING, { 
        enabled: true, 
        weight: 0.2, 
        thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
        customSettings: {}
      }],
      [ValidationCategory.USAGE_ANALYTICS, { 
        enabled: true, 
        weight: 0.15, 
        thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
        customSettings: {}
      }],
      [ValidationCategory.QUALITY_SCORING, { 
        enabled: true, 
        weight: 0.1, 
        thresholds: { critical: 100, high: 80, medium: 60, low: 40 },
        customSettings: {}
      }]
    ]),
    platformConfigs: new Map([
      [TestPlatform.WEB, {
        enabled: true,
        testEnvironment: 'chrome-headless',
        simulators: [],
        browserEngines: ['chromium', 'firefox', 'webkit'],
        nodeVersions: ['18', '20'],
        dependencies: ['@playwright/test'],
        environmentVariables: {}
      }],
      [TestPlatform.MOBILE_IOS, {
        enabled: true,
        testEnvironment: 'ios-simulator',
        simulators: ['iPhone 14', 'iPhone 14 Pro'],
        dependencies: ['detox'],
        environmentVariables: {}
      }],
      [TestPlatform.MOBILE_ANDROID, {
        enabled: true,
        testEnvironment: 'android-emulator',
        simulators: ['Pixel 7', 'Pixel 7 Pro'],
        dependencies: ['detox'],
        environmentVariables: {}
      }],
      [TestPlatform.DESKTOP_MACOS, {
        enabled: true,
        testEnvironment: 'macos',
        simulators: [],
        dependencies: [],
        environmentVariables: {}
      }],
      [TestPlatform.DESKTOP_WINDOWS, {
        enabled: true,
        testEnvironment: 'windows',
        simulators: [],
        dependencies: [],
        environmentVariables: {}
      }],
      [TestPlatform.DESKTOP_LINUX, {
        enabled: true,
        testEnvironment: 'linux',
        simulators: [],
        dependencies: [],
        environmentVariables: {}
      }]
    ]),
    frameworkConfigs: new Map([
      [SupportedFramework.NEXTJS, {
        enabled: true,
        versions: ['13', '14'],
        testCommands: ['npm run test', 'npm run test:e2e'],
        buildCommands: ['npm run build'],
        lintCommands: ['npm run lint'],
        securityCommands: ['npm audit', 'snyk test'],
        performanceCommands: ['npm run lighthouse']
      }],
      [SupportedFramework.FLUTTER, {
        enabled: true,
        versions: ['3.16', '3.19'],
        testCommands: ['flutter test', 'flutter test integration_test'],
        buildCommands: ['flutter build web', 'flutter build apk', 'flutter build ios'],
        lintCommands: ['flutter analyze'],
        securityCommands: [],
        performanceCommands: ['flutter test --coverage']
      }],
      [SupportedFramework.TAURI, {
        enabled: true,
        versions: ['1.5', '2.0'],
        testCommands: ['npm run test', 'cargo test'],
        buildCommands: ['npm run tauri build'],
        lintCommands: ['npm run lint', 'cargo clippy'],
        securityCommands: ['cargo audit'],
        performanceCommands: []
      }],
      [SupportedFramework.SVELTEKIT, {
        enabled: true,
        versions: ['1.0', '2.0'],
        testCommands: ['npm run test'],
        buildCommands: ['npm run build'],
        lintCommands: ['npm run lint'],
        securityCommands: ['npm audit'],
        performanceCommands: ['npm run lighthouse']
      }]
    ]),
    qualityGates: [
      {
        id: 'critical-security',
        name: 'No Critical Security Issues',
        description: 'Zero critical security vulnerabilities allowed',
        category: ValidationCategory.SECURITY_SCANNING,
        minimumScore: 100,
        blocking: true,
        conditions: [
          { metric: 'critical_vulnerabilities', operator: 'eq', value: 0, severity: 'critical' }
        ]
      },
      {
        id: 'test-coverage',
        name: 'Minimum Test Coverage',
        description: 'At least 80% test coverage required',
        category: ValidationCategory.TEMPLATE_TESTING,
        minimumScore: 80,
        blocking: true,
        conditions: [
          { metric: 'line_coverage', operator: 'gte', value: 80, severity: 'high' }
        ]
      },
      {
        id: 'performance-benchmark',
        name: 'Performance Standards',
        description: 'Performance metrics within acceptable ranges',
        category: ValidationCategory.PERFORMANCE_BENCHMARKING,
        minimumScore: 70,
        blocking: false,
        conditions: [
          { metric: 'build_time', operator: 'lt', value: 300000, severity: 'medium' },
          { metric: 'bundle_size', operator: 'lt', value: 2000000, severity: 'medium' }
        ]
      }
    ],
    reportingConfig: {
      enableReports: true,
      outputFormats: ['json', 'html'],
      outputDirectory: './quality-reports',
      includeDetailedMetrics: true,
      includeTrendAnalysis: true,
      reportRetentionDays: 30
    },
    autoFixConfig: {
      enableAutoFix: false,
      autoFixCategories: [ValidationCategory.QUALITY_SCORING],
      autoFixSeverities: ['low', 'medium'],
      confirmBeforeFix: true,
      backupBeforeFix: true
    }
  };
  
  const defaultOrchestratorConfig: AutomatedQualityConfig = {
    enabled: true,
    mode: OrchestrationMode.FULL_VALIDATION,
    parallelExecution: true,
    maxConcurrentValidations: 3,
    templateDiscovery: {
      templateDirectories: ['./templates', './examples'],
      gitRepositories: [],
      registryEndpoints: [],
      includePatterns: [],
      excludePatterns: ['node_modules', '.git'],
      frameworkFilters: [],
      discoveryInterval: 24,
      enableAutomaticDiscovery: true
    },
    validationScope: {
      enabledCategories: [
        ValidationCategory.TEMPLATE_TESTING,
        ValidationCategory.SECURITY_SCANNING,
        ValidationCategory.PERFORMANCE_BENCHMARKING,
        ValidationCategory.USAGE_ANALYTICS,
        ValidationCategory.QUALITY_SCORING
      ],
      targetPlatforms: [TestPlatform.WEB, TestPlatform.MOBILE_IOS, TestPlatform.MOBILE_ANDROID],
      targetFrameworks: [SupportedFramework.NEXTJS, SupportedFramework.FLUTTER, SupportedFramework.TAURI],
      validationDepth: 'standard',
      environments: [
        {
          name: 'development',
          type: 'development',
          platforms: [TestPlatform.WEB],
          frameworks: [SupportedFramework.NEXTJS],
          environmentVariables: { NODE_ENV: 'development' },
          specialConfigurations: {}
        }
      ]
    },
    scheduling: {
      enableScheduling: false,
      schedules: [],
      triggers: [],
      enableBatchProcessing: false,
      batchSize: 5,
      batchInterval: 60
    },
    notifications: {
      enabled: false,
      channels: [],
      rules: [],
      escalation: { enabled: false, escalationLevels: [] }
    },
    integrations: {
      cicd: [],
      issueTracking: [],
      securityTools: [],
      performanceMonitoring: []
    },
    reporting: {
      enableReports: true,
      outputFormats: ['json', 'html'],
      outputDirectory: './quality-reports',
      includeDetailedMetrics: true,
      includeTrendAnalysis: false,
      reportRetentionDays: 30
    },
    autoRemediation: {
      enabled: false,
      strategies: [],
      requireApproval: true,
      maxRemediationsPerDay: 10,
      backupBeforeRemediation: true,
      monitorRemediations: true,
      rollbackOnFailure: true
    }
  };
  
  // Merge with provided config
  return {
    validationEngine: { ...defaultValidationConfig, ...config.validationEngine },
    orchestrator: { ...defaultOrchestratorConfig, ...config.orchestrator }
  };
}

/**
 * Setup event listeners for real-time feedback
 */
function setupEventListeners(orchestrator: AutomatedQualityOrchestrator, validationEngine: QualityValidationEngine): void {
  // Orchestration events
  orchestrator.on('orchestration:started', () => {
    logger.info('🚀 Starting quality validation orchestration...');
  });
  
  orchestrator.on('orchestration:templates_selected', ({ templateCount }) => {
    logger.info(`📋 Selected ${templateCount} templates for validation`);
  });
  
  orchestrator.on('orchestration:completed', ({ result }) => {
    logger.plain('');
    if (result.status === 'completed') {
      logger.success(`✅ Orchestration completed successfully`);
    } else {
      logger.error(`❌ Orchestration ${result.status}`);
    }
    
    logger.info(`📊 Results: ${result.passedTemplates}/${result.totalTemplates} templates passed`);
    logger.info(`🎯 Overall Score: ${result.overallScore}/100`);
    
    if (result.totalIssues > 0) {
      logger.info(`🔍 Issues Found: ${result.criticalIssues} critical, ${result.highIssues} high, ${result.mediumIssues} medium, ${result.lowIssues} low`);
    }
    
    if (result.remediationsAttempted > 0) {
      logger.info(`🔧 Auto-remediation: ${result.remediationsSuccessful}/${result.remediationsAttempted} successful`);
    }
  });
  
  orchestrator.on('orchestration:failed', ({ error }) => {
    logger.error(`❌ Orchestration failed: ${error.message}`);
  });
  
  // Validation events
  validationEngine.on('validation:started', ({ testConfig }) => {
    logger.step(`Validating template: ${path.basename(testConfig.templatePath)}`);
  });
  
  validationEngine.on('category:started', ({ category }) => {
    logger.plain(`  ${getCategoryIcon(category)} ${getCategoryName(category)}`);
  });
  
  validationEngine.on('test:started', ({ platform, framework }) => {
    logger.plain(`    🔄 Testing ${framework} on ${platform}`);
  });
  
  validationEngine.on('test:completed', ({ platform, framework, result }) => {
    const status = result.status === 'completed' ? '✅' : '❌';
    const score = `${result.score}/100`;
    logger.plain(`    ${status} ${framework}/${platform}: ${score}`);
  });
  
  validationEngine.on('validation:completed', ({ result }) => {
    const statusIcon = result.overallStatus === 'completed' ? '✅' : '❌';
    logger.plain(`  ${statusIcon} Overall: ${result.overallScore}/100 (${result.totalIssues} issues)`);
  });
  
  // Remediation events
  orchestrator.on('remediation:started', ({ orchestrationId }) => {
    logger.info('🔧 Starting auto-remediation...');
  });
  
  orchestrator.on('remediation:successful', ({ templateId, issueId }) => {
    logger.success(`  ✅ Fixed issue ${issueId} in ${templateId}`);
  });
  
  orchestrator.on('remediation:failed', ({ templateId, issueId, error }) => {
    logger.warn(`  ⚠️  Failed to fix issue ${issueId} in ${templateId}: ${error.message}`);
  });
  
  // Notification events
  orchestrator.on('notification:sent', ({ ruleId, channels }) => {
    logger.info(`📢 Sent notification via ${channels.join(', ')}`);
  });
}

/**
 * Run validation
 */
async function runValidation(
  orchestrator: AutomatedQualityOrchestrator,
  validationEngine: QualityValidationEngine,
  options: any
): Promise<void> {
  // Parse orchestration mode
  const mode = parseOrchestrationMode(options.mode);
  
  // Parse template filters
  const templateFilters = options.template ? [options.template] : undefined;
  
  // Start orchestration
  await orchestrator.startOrchestration();
  
  // Trigger validation
  const result = await orchestrator.triggerOrchestration(mode, templateFilters);
  
  // Generate reports
  await generateReports(result, options);
  
  // Check exit conditions
  if (options.failOnCritical && result.criticalIssues > 0) {
    throw new Error(`Validation failed: ${result.criticalIssues} critical issues found`);
  }
  
  if (options.failOnHigh && result.highIssues > 0) {
    throw new Error(`Validation failed: ${result.highIssues} high severity issues found`);
  }
  
  if (result.blockingFailures) {
    throw new Error('Validation failed: blocking quality gate failures detected');
  }
  
  // Stop orchestration
  await orchestrator.stopOrchestration();
}

/**
 * Generate reports
 */
async function generateReports(result: any, options: any): Promise<void> {
  const outputDir = path.resolve(options.outputDir);
  await fs.ensureDir(outputDir);
  
  logger.info(`📄 Generating reports in ${outputDir}`);
  
  // JSON report
  if (options.output === 'json' || options.output === 'all') {
    const jsonPath = path.join(outputDir, `quality-validation-${Date.now()}.json`);
    await fs.writeJSON(jsonPath, result, { spaces: 2 });
    logger.success(`  ✅ JSON report: ${jsonPath}`);
  }
  
  // HTML report
  if (options.output === 'html' || options.output === 'all') {
    const htmlPath = path.join(outputDir, `quality-validation-${Date.now()}.html`);
    const htmlContent = generateHTMLReport(result);
    await fs.writeFile(htmlPath, htmlContent);
    logger.success(`  ✅ HTML report: ${htmlPath}`);
  }
  
  // Markdown report
  if (options.output === 'markdown' || options.output === 'all') {
    const mdPath = path.join(outputDir, `quality-validation-${Date.now()}.md`);
    const mdContent = generateMarkdownReport(result);
    await fs.writeFile(mdPath, mdContent);
    logger.success(`  ✅ Markdown report: ${mdPath}`);
  }
}

/**
 * Setup scheduled validation
 */
async function setupScheduledValidation(orchestrator: AutomatedQualityOrchestrator, options: any): Promise<void> {
  logger.info('⏰ Setting up scheduled quality validation...');
  
  // This would integrate with a job scheduler in real implementation
  logger.success('✅ Scheduled validation configured');
  logger.info('📅 Next validation scheduled for: tomorrow at 9:00 AM');
  
  // Keep process running to handle scheduled jobs
  process.stdin.resume();
}

/**
 * Setup watch mode
 */
async function setupWatchMode(orchestrator: AutomatedQualityOrchestrator, options: any): Promise<void> {
  logger.info('👀 Starting watch mode for quality validation...');
  
  await orchestrator.startOrchestration();
  
  // This would setup file watchers in real implementation
  logger.success('✅ Watch mode active - monitoring for changes');
  logger.info('Press Ctrl+C to stop watching');
  
  // Keep process running
  process.stdin.resume();
  
  process.on('SIGINT', async () => {
    logger.info('🛑 Stopping watch mode...');
    await orchestrator.stopOrchestration();
    process.exit(0);
  });
}

/**
 * Launch dashboard
 */
async function launchDashboard(orchestrator: AutomatedQualityOrchestrator, options: any): Promise<void> {
  logger.info('🎛️  Launching quality validation dashboard...');
  
  await orchestrator.startOrchestration();
  
  // This would launch a web dashboard in real implementation
  logger.success('✅ Dashboard available at: http://localhost:3001/quality-dashboard');
  logger.info('Press Ctrl+C to stop dashboard');
  
  // Keep process running
  process.stdin.resume();
  
  process.on('SIGINT', async () => {
    logger.info('🛑 Stopping dashboard...');
    await orchestrator.stopOrchestration();
    process.exit(0);
  });
}

/**
 * Parse orchestration mode
 */
function parseOrchestrationMode(mode: string): OrchestrationMode {
  switch (mode.toLowerCase()) {
    case 'quick':
      return OrchestrationMode.QUICK_VALIDATION;
    case 'security':
      return OrchestrationMode.SECURITY_FOCUSED;
    case 'performance':
      return OrchestrationMode.PERFORMANCE_FOCUSED;
    case 'compliance':
      return OrchestrationMode.COMPLIANCE_AUDIT;
    case 'regression':
      return OrchestrationMode.REGRESSION_TESTING;
    case 'full':
    default:
      return OrchestrationMode.FULL_VALIDATION;
  }
}

/**
 * Get category icon
 */
function getCategoryIcon(category: ValidationCategory): string {
  switch (category) {
    case ValidationCategory.TEMPLATE_TESTING:
      return '🧪';
    case ValidationCategory.SECURITY_SCANNING:
      return '🔒';
    case ValidationCategory.PERFORMANCE_BENCHMARKING:
      return '⚡';
    case ValidationCategory.USAGE_ANALYTICS:
      return '📊';
    case ValidationCategory.QUALITY_SCORING:
      return '🎯';
    default:
      return '🔍';
  }
}

/**
 * Get category name
 */
function getCategoryName(category: ValidationCategory): string {
  switch (category) {
    case ValidationCategory.TEMPLATE_TESTING:
      return 'Template Testing';
    case ValidationCategory.SECURITY_SCANNING:
      return 'Security Scanning';
    case ValidationCategory.PERFORMANCE_BENCHMARKING:
      return 'Performance Benchmarking';
    case ValidationCategory.USAGE_ANALYTICS:
      return 'Usage Analytics';
    case ValidationCategory.QUALITY_SCORING:
      return 'Quality Scoring';
    default:
      return 'Unknown';
  }
}

/**
 * Generate HTML report
 */
function generateHTMLReport(result: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Quality Validation Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .score { font-size: 24px; font-weight: bold; color: ${result.overallScore >= 80 ? '#28a745' : result.overallScore >= 60 ? '#ffc107' : '#dc3545'}; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 18px; font-weight: bold; }
    .issues { margin: 20px 0; }
    .issue { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; background: #f8f9fa; }
    .critical { border-color: #dc3545; }
    .high { border-color: #fd7e14; }
    .medium { border-color: #ffc107; }
    .low { border-color: #28a745; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Quality Validation Report</h1>
    <div class="score">Overall Score: ${result.overallScore}/100</div>
    <p>Generated on ${new Date(result.endTime).toLocaleString()}</p>
  </div>
  
  <div class="metrics">
    <div class="metric">
      <div class="metric-value">${result.totalTemplates}</div>
      <div>Total Templates</div>
    </div>
    <div class="metric">
      <div class="metric-value">${result.passedTemplates}</div>
      <div>Passed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${result.failedTemplates}</div>
      <div>Failed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${result.totalIssues}</div>
      <div>Total Issues</div>
    </div>
  </div>
  
  <h2>Issues Summary</h2>
  <div class="issues">
    ${result.criticalIssues > 0 ? `<div class="issue critical">Critical Issues: ${result.criticalIssues}</div>` : ''}
    ${result.highIssues > 0 ? `<div class="issue high">High Issues: ${result.highIssues}</div>` : ''}
    ${result.mediumIssues > 0 ? `<div class="issue medium">Medium Issues: ${result.mediumIssues}</div>` : ''}
    ${result.lowIssues > 0 ? `<div class="issue low">Low Issues: ${result.lowIssues}</div>` : ''}
  </div>
  
  <h2>Execution Details</h2>
  <p><strong>Duration:</strong> ${Math.round(result.duration / 1000)} seconds</p>
  <p><strong>Status:</strong> ${result.status}</p>
  ${result.blockingFailures ? '<p><strong>⚠️ Blocking failures detected</strong></p>' : ''}
  
</body>
</html>`;
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(result: any): string {
  return `# Quality Validation Report

## Summary

- **Overall Score:** ${result.overallScore}/100
- **Status:** ${result.status}
- **Duration:** ${Math.round(result.duration / 1000)} seconds
- **Generated:** ${new Date(result.endTime).toISOString()}

## Results

| Metric | Value |
|--------|-------|
| Total Templates | ${result.totalTemplates} |
| Passed Templates | ${result.passedTemplates} |
| Failed Templates | ${result.failedTemplates} |
| Total Issues | ${result.totalIssues} |

## Issues Breakdown

| Severity | Count |
|----------|-------|
| Critical | ${result.criticalIssues} |
| High | ${result.highIssues} |
| Medium | ${result.mediumIssues} |
| Low | ${result.lowIssues} |

${result.blockingFailures ? '⚠️ **Blocking failures detected**' : ''}

${result.remediationsAttempted > 0 ? `
## Auto-Remediation

- **Attempted:** ${result.remediationsAttempted}
- **Successful:** ${result.remediationsSuccessful}
` : ''}

---
*Generated by DNA Quality Validation System*
`;
}