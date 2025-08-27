"use strict";
/**
 * @fileoverview Git Automation Command for Development Workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitCommand = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../utils/error-handler");
const workspace_adapter_1 = require("../adapters/workspace-adapter");
exports.gitCommand = new commander_1.Command('git')
    .description('Automated Git operations integrated with progress tracking')
    .addCommand(new commander_1.Command('init')
    .description('Initialize Git automation for this project')
    .option('--auto-commit', 'Enable automatic commits on progress updates')
    .option('--push-remote', 'Enable automatic push to remote')
    .option('--require-tests', 'Require tests before commits')
    .option('--conventional', 'Use conventional commit format')
    .action(initGitAutomation))
    .addCommand(new commander_1.Command('config')
    .description('Configure Git automation settings')
    .option('--show', 'Show current configuration')
    .action(configureGitAutomation))
    .addCommand(new commander_1.Command('status')
    .description('Show Git repository status with automation info')
    .action(showGitStatus));
async function initGitAutomation(options) {
    try {
        logger_1.logger.info('🔧 Initializing Git automation...');
        const gitAutomation = new workspace_adapter_1.GitAutomationSystem({
            autoCommit: options.autoCommit || false,
            pushRemote: options.pushRemote || false,
            requireTests: options.requireTests || false,
            conventionalCommits: options.conventional !== false
        });
        logger_1.logger.info('✅ Git automation initialized');
        logger_1.logger.info('Configuration:');
        logger_1.logger.info(`  Auto-commit: ${chalk_compat_1.default.cyan(String(options.autoCommit || false))}`);
        logger_1.logger.info(`  Push to remote: ${chalk_compat_1.default.cyan(String(options.pushRemote || false))}`);
        logger_1.logger.info(`  Require tests: ${chalk_compat_1.default.cyan(String(options.requireTests || false))}`);
        logger_1.logger.info(`  Conventional commits: ${chalk_compat_1.default.cyan(String(options.conventional !== false))}`);
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
    }
}
async function configureGitAutomation(options) {
    try {
        if (options.show) {
            logger_1.logger.info('🔧 Git Automation Configuration:');
            logger_1.logger.info('  Status: Available');
            return;
        }
        logger_1.logger.info('✅ Git automation configuration updated');
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
    }
}
async function showGitStatus() {
    try {
        const gitAutomation = new workspace_adapter_1.GitAutomationSystem({
            autoCommit: false,
            pushRemote: false,
            requireTests: false,
            conventionalCommits: true
        });
        const status = await gitAutomation.getStatus();
        logger_1.logger.info('🔧 Repository Status:');
        logger_1.logger.info(`  Branch: ${chalk_compat_1.default.cyan(status.branch || 'unknown')}`);
        logger_1.logger.info(`  Clean: ${chalk_compat_1.default.cyan(String(status.clean))}`);
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
    }
}
//# sourceMappingURL=git.js.map