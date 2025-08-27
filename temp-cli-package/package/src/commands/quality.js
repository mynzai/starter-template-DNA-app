#!/usr/bin/env node
"use strict";
/**
 * @fileoverview Quality Command - Quality validation and scoring for v0.3.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.qualityCommand = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const workspace_adapter_1 = require("../adapters/workspace-adapter");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../utils/error-handler");
const fs = tslib_1.__importStar(require("fs-extra"));
const path = tslib_1.__importStar(require("path"));
const qualityCommand = new commander_1.Command('quality')
    .description('Quality validation and scoring system')
    .option('--debug', 'Enable debug logging');
exports.qualityCommand = qualityCommand;
// Check subcommand
qualityCommand
    .command('check')
    .description('Run quality validation checks')
    .option('-p, --path <path>', 'Project path to validate', process.cwd())
    .option('-f, --framework <framework>', 'Specify framework (nextjs|flutter|react-native|tauri|sveltekit)')
    .option('-t, --threshold <score>', 'Minimum quality threshold', (value) => parseFloat(value), 75)
    .option('--fail-on-quality-gate-failure', 'Exit with error if quality gates fail', false)
    .action(async (options) => {
    try {
        logger_1.logger.info('🔍 Running quality validation checks...');
        const projectPath = path.resolve(options.path);
        if (!await fs.pathExists(projectPath)) {
            throw new Error(`Project path does not exist: ${projectPath}`);
        }
        let result;
        if (options.framework) {
            logger_1.logger.info(`📋 Using framework-specific validation: ${options.framework}`);
            result = await workspace_adapter_1.qualityValidationEngine.validateWithFramework(projectPath, options.framework);
        }
        else {
            result = await workspace_adapter_1.qualityValidationEngine.validateProject(projectPath);
        }
        // Display results
        logger_1.logger.info('📊 Quality Validation Results:');
        logger_1.logger.info(`   Overall Score: ${result.score.toFixed(1)}/100`);
        logger_1.logger.info(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        logger_1.logger.info(`   Checks: ${result.summary.passedChecks}/${result.summary.totalChecks} passed`);
        if (result.summary.criticalIssues > 0) {
            logger_1.logger.warn(`   ⚠️  Critical Issues: ${result.summary.criticalIssues}`);
        }
        if (result.summary.warningCount > 0) {
            logger_1.logger.info(`   ⚠️  Warnings: ${result.summary.warningCount}`);
        }
        logger_1.logger.info(`   Quality Trend: ${result.trend.direction} (${result.trend.scoreChange > 0 ? '+' : ''}${result.trend.scoreChange}%)`);
        // Show detailed results
        logger_1.logger.info('\n🔍 Detailed Check Results:');
        result.results.forEach(check => {
            const icon = check.passed ? '✅' : '❌';
            logger_1.logger.info(`   ${icon} ${check.name}: ${check.score}/100`);
            if (!check.passed) {
                logger_1.logger.info(`      Details: ${check.details}`);
                if (check.suggestions.length > 0) {
                    logger_1.logger.info(`      Suggestions: ${check.suggestions.slice(0, 2).join(', ')}`);
                }
            }
        });
        // Show top recommendations
        if (result.recommendations.length > 0) {
            logger_1.logger.info('\n💡 Top Recommendations:');
            result.recommendations.slice(0, 3).forEach((rec, index) => {
                logger_1.logger.info(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
                logger_1.logger.info(`      ${rec.description}`);
                logger_1.logger.info(`      Effort: ${rec.estimatedEffort} | Impact: ${rec.impact}`);
            });
        }
        // Check quality threshold
        if (result.score < options.threshold) {
            logger_1.logger.warn(`\n⚠️  Quality score ${result.score.toFixed(1)} is below threshold ${options.threshold}`);
            if (options.failOnQualityGateFailure) {
                process.exit(1);
            }
        }
        // Check quality gates
        if (!result.passed && options.failOnQualityGateFailure) {
            logger_1.logger.error('\n❌ Quality gates failed');
            process.exit(1);
        }
        logger_1.logger.success('\n✅ Quality validation completed');
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
        process.exit(1);
    }
});
// Score subcommand
qualityCommand
    .command('score')
    .description('Get quality score for project')
    .option('-p, --path <path>', 'Project path to score', process.cwd())
    .option('-f, --framework <framework>', 'Specify framework for scoring')
    .option('--detailed', 'Show detailed scoring breakdown')
    .action(async (options) => {
    try {
        logger_1.logger.info('📊 Calculating quality score...');
        const projectPath = path.resolve(options.path);
        const result = options.framework ?
            await workspace_adapter_1.qualityValidationEngine.validateWithFramework(projectPath, options.framework) :
            await workspace_adapter_1.qualityValidationEngine.validateProject(projectPath);
        logger_1.logger.success(`🎯 Quality Score: ${result.score.toFixed(1)}/100`);
        if (options.detailed) {
            logger_1.logger.info('\n📋 Score Breakdown:');
            result.results.forEach(check => {
                logger_1.logger.info(`   ${check.name}: ${check.score}/100`);
            });
            logger_1.logger.info('\n📈 Detailed Metrics:');
            logger_1.logger.info(`   Code Metrics:`);
            logger_1.logger.info(`     Lines of Code: ${result.detailedReport.codeMetrics.linesOfCode}`);
            logger_1.logger.info(`     Technical Debt: ${result.detailedReport.codeMetrics.technicalDebt} hours`);
            logger_1.logger.info(`     Complexity: ${result.detailedReport.codeMetrics.complexity}`);
            logger_1.logger.info(`     Maintainability: ${result.detailedReport.codeMetrics.maintainabilityIndex}`);
            logger_1.logger.info(`   Security:`);
            logger_1.logger.info(`     Security Score: ${result.detailedReport.securityAnalysis.securityScore}/100`);
            logger_1.logger.info(`     Vulnerabilities: ${result.detailedReport.securityAnalysis.vulnerabilities.length}`);
            logger_1.logger.info(`   Performance:`);
            logger_1.logger.info(`     Bundle Size: ${result.detailedReport.performanceMetrics.bundleSize} KB`);
            logger_1.logger.info(`     Build Time: ${result.detailedReport.performanceMetrics.buildTime}s`);
            logger_1.logger.info(`     Performance Score: ${result.detailedReport.performanceMetrics.performanceScore}/100`);
            logger_1.logger.info(`   Testing:`);
            logger_1.logger.info(`     Unit Coverage: ${result.detailedReport.testingAnalysis.coverageByType.unit}%`);
            logger_1.logger.info(`     Integration Coverage: ${result.detailedReport.testingAnalysis.coverageByType.integration}%`);
            logger_1.logger.info(`     E2E Coverage: ${result.detailedReport.testingAnalysis.coverageByType.e2e}%`);
        }
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
        process.exit(1);
    }
});
// Report subcommand
qualityCommand
    .command('report')
    .description('Generate quality report')
    .option('-p, --path <path>', 'Project path to analyze', process.cwd())
    .option('-f, --format <format>', 'Report format (json|markdown|html)', 'markdown')
    .option('-o, --output <file>', 'Output file path')
    .action(async (options) => {
    try {
        logger_1.logger.info('📄 Generating quality report...');
        const projectPath = path.resolve(options.path);
        const report = await workspace_adapter_1.qualityValidationEngine.generateQualityReport(projectPath, options.format);
        if (options.output) {
            await fs.writeFile(options.output, report);
            logger_1.logger.success(`✅ Report saved to: ${options.output}`);
        }
        else {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const extension = options.format === 'json' ? 'json' : options.format === 'html' ? 'html' : 'md';
            const filename = `quality-report-${timestamp}.${extension}`;
            await fs.writeFile(filename, report);
            logger_1.logger.success(`✅ Report saved to: ${filename}`);
        }
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
        process.exit(1);
    }
});
// Gates subcommand
qualityCommand
    .command('gates')
    .description('Manage quality gates')
    .option('--show', 'Show current quality gate configuration')
    .option('--set-threshold <category>=<value>', 'Set quality gate threshold (e.g., overallScore=80)')
    .option('--enable', 'Enable quality gates')
    .option('--disable', 'Disable quality gates')
    .action(async (options) => {
    try {
        if (options.show) {
            const gates = workspace_adapter_1.qualityValidationEngine.getQualityGates();
            logger_1.logger.info('🎯 Quality Gate Configuration:');
            logger_1.logger.info(`   Enabled: ${gates.enabled ? '✅' : '❌'}`);
            logger_1.logger.info(`   Block on Failure: ${gates.blockOnFailure ? '✅' : '❌'}`);
            logger_1.logger.info('   Thresholds:');
            Object.entries(gates.thresholds).forEach(([key, value]) => {
                logger_1.logger.info(`     ${key}: ${value}`);
            });
            return;
        }
        if (options.setThreshold) {
            const [category, value] = options.setThreshold.split('=');
            if (!category || !value) {
                throw new Error('Invalid threshold format. Use: category=value');
            }
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                throw new Error('Threshold value must be a number');
            }
            const currentGates = workspace_adapter_1.qualityValidationEngine.getQualityGates();
            const newThresholds = { ...currentGates.thresholds, [category]: numValue };
            workspace_adapter_1.qualityValidationEngine.setQualityGates({
                ...currentGates,
                thresholds: newThresholds
            });
            logger_1.logger.success(`✅ Updated ${category} threshold to ${numValue}`);
            return;
        }
        if (options.enable) {
            const currentGates = workspace_adapter_1.qualityValidationEngine.getQualityGates();
            workspace_adapter_1.qualityValidationEngine.setQualityGates({ ...currentGates, enabled: true });
            logger_1.logger.success('✅ Quality gates enabled');
            return;
        }
        if (options.disable) {
            const currentGates = workspace_adapter_1.qualityValidationEngine.getQualityGates();
            workspace_adapter_1.qualityValidationEngine.setQualityGates({ ...currentGates, enabled: false });
            logger_1.logger.success('❌ Quality gates disabled');
            return;
        }
        // Default: show configuration
        const gates = workspace_adapter_1.qualityValidationEngine.getQualityGates();
        logger_1.logger.info('🎯 Quality Gate Configuration:');
        logger_1.logger.info(`   Enabled: ${gates.enabled ? '✅' : '❌'}`);
        logger_1.logger.info(`   Block on Failure: ${gates.blockOnFailure ? '✅' : '❌'}`);
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
        process.exit(1);
    }
});
// Trend subcommand
qualityCommand
    .command('trend')
    .description('Show quality trend analysis')
    .option('-p, --path <path>', 'Project path to analyze', process.cwd())
    .action(async (options) => {
    try {
        logger_1.logger.info('📈 Analyzing quality trends...');
        const projectPath = path.resolve(options.path);
        const result = await workspace_adapter_1.qualityValidationEngine.validateProject(projectPath);
        logger_1.logger.info('📊 Quality Trend Analysis:');
        logger_1.logger.info(`   Direction: ${result.trend.direction}`);
        logger_1.logger.info(`   Score Change: ${result.trend.scoreChange > 0 ? '+' : ''}${result.trend.scoreChange}% (${result.trend.period})`);
        if (result.trend.historicalScores.length > 0) {
            logger_1.logger.info('   Historical Scores:');
            result.trend.historicalScores.forEach((score, index) => {
                logger_1.logger.info(`     ${index + 1}. ${score.toFixed(1)}/100`);
            });
        }
        // Show trend indicators
        if (result.trend.direction === 'improving') {
            logger_1.logger.success('✅ Quality is improving over time');
        }
        else if (result.trend.direction === 'declining') {
            logger_1.logger.warn('⚠️  Quality is declining - consider addressing recommendations');
        }
        else {
            logger_1.logger.info('➖ Quality is stable');
        }
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
        process.exit(1);
    }
});
// Recommendations subcommand
qualityCommand
    .command('recommendations')
    .description('Get quality improvement recommendations')
    .option('-p, --path <path>', 'Project path to analyze', process.cwd())
    .option('-c, --category <category>', 'Filter by category (code|security|performance|testing|accessibility)')
    .option('-l, --limit <count>', 'Limit number of recommendations', (value) => parseInt(value), 10)
    .action(async (options) => {
    try {
        logger_1.logger.info('💡 Generating quality recommendations...');
        const projectPath = path.resolve(options.path);
        const result = await workspace_adapter_1.qualityValidationEngine.validateProject(projectPath);
        let recommendations = result.recommendations;
        if (options.category) {
            recommendations = recommendations.filter(rec => rec.category === options.category);
        }
        recommendations = recommendations.slice(0, options.limit);
        if (recommendations.length === 0) {
            logger_1.logger.info('🎉 No recommendations - quality is excellent!');
            return;
        }
        logger_1.logger.info(`📋 Quality Recommendations (${recommendations.length}):`);
        recommendations.forEach((rec, index) => {
            const priorityIcon = rec.priority === 'critical' ? '🚨' :
                rec.priority === 'high' ? '⚠️' :
                    rec.priority === 'medium' ? '📋' : '💡';
            logger_1.logger.info(`\n${index + 1}. ${priorityIcon} ${rec.title} [${rec.category.toUpperCase()}]`);
            logger_1.logger.info(`   Priority: ${rec.priority}`);
            logger_1.logger.info(`   Description: ${rec.description}`);
            logger_1.logger.info(`   Estimated Effort: ${rec.estimatedEffort}`);
            logger_1.logger.info(`   Expected Impact: ${rec.impact}`);
            if (rec.actionItems.length > 0) {
                logger_1.logger.info('   Action Items:');
                rec.actionItems.forEach(item => {
                    logger_1.logger.info(`     • ${item}`);
                });
            }
        });
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
        process.exit(1);
    }
});
//# sourceMappingURL=quality.js.map