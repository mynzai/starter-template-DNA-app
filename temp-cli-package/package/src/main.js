#!/usr/bin/env node
"use strict";
/**
 * @fileoverview DNA CLI Tool - Main Entry Point
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const chalk_compat_1 = tslib_1.__importDefault(require("./utils/chalk-compat"));
const boxen_compat_1 = tslib_1.__importDefault(require("./utils/boxen-compat"));
const update_notifier_compat_1 = tslib_1.__importDefault(require("./utils/update-notifier-compat"));
const create_1 = require("./commands/create");
const list_1 = require("./commands/list");
const add_1 = require("./commands/add");
const validate_1 = require("./commands/validate");
const update_1 = require("./commands/update");
const test_1 = require("./commands/test");
const track_1 = require("./commands/track");
const quality_1 = require("./commands/quality");
const git_1 = require("./commands/git");
const enhanced_create_1 = require("./commands/enhanced-create");
const enhanced_list_1 = require("./commands/enhanced-list");
const enhanced_validate_1 = require("./commands/enhanced-validate");
const compatibility_1 = require("./commands/compatibility");
const ecosystem_update_1 = require("./commands/ecosystem-update");
const features_1 = require("./config/features");
// import { qualityValidationCommand } from './commands/quality-validation';
const environment_1 = require("./environments/environment");
const logger_1 = require("./utils/logger");
const error_handler_1 = require("./utils/error-handler");
const pkg = {
    name: 'dna-cli',
    version: environment_1.environment.version,
};
async function main() {
    try {
        // Check for updates
        const notifier = (0, update_notifier_compat_1.default)({ pkg, updateCheckInterval: environment_1.environment.updateCheckInterval });
        if (notifier.update) {
            const message = `Update available: ${chalk_compat_1.default.dim(notifier.update.current)} → ${chalk_compat_1.default.green(notifier.update.latest)}\nRun ${chalk_compat_1.default.cyan('npm install -g dna-cli')} to update`;
            console.log((0, boxen_compat_1.default)(message, {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'yellow'
            }));
        }
        const program = new commander_1.Command();
        // Configure main program
        program
            .name('dna-cli')
            .description('DNA Template CLI - AI-native template generation ecosystem')
            .version(environment_1.environment.version, '-v, --version', 'display version number')
            .option('-d, --debug', 'enable debug mode')
            .option('--verbose', 'enable verbose output')
            .option('-q, --quiet', 'suppress non-error output')
            .option('-c, --config <path>', 'use custom config file')
            .hook('preAction', (thisCommand) => {
            const opts = thisCommand.opts();
            logger_1.logger.setLevel(opts['debug'] ? 'debug' : opts['verbose'] ? 'info' : opts['quiet'] ? 'error' : 'info');
            if (opts['debug']) {
                logger_1.logger.debug('Debug mode enabled');
                logger_1.logger.debug('Environment:', environment_1.environment);
            }
        });
        // Add commands
        program.addCommand(create_1.createCommand);
        program.addCommand(list_1.listCommand);
        program.addCommand(add_1.addCommand);
        program.addCommand(validate_1.validateCommand);
        program.addCommand(update_1.updateCommand);
        // Add feature-flagged commands
        if (features_1.FEATURES.TEST_COMMAND) {
            program.addCommand(test_1.testCommand);
        }
        if (features_1.FEATURES.TRACK_COMMAND) {
            program.addCommand(track_1.trackCommand);
        }
        if (features_1.FEATURES.QUALITY_VALIDATION) {
            program.addCommand(quality_1.qualityCommand);
        }
        if (features_1.FEATURES.GIT_AUTOMATION) {
            program.addCommand(git_1.gitCommand);
        }
        if (features_1.FEATURES.ENHANCED_COMMANDS) {
            program.addCommand(enhanced_create_1.enhancedCreateCommand);
            program.addCommand(enhanced_list_1.enhancedListCommand);
            program.addCommand(enhanced_validate_1.enhancedValidateCommand);
        }
        // Add compatibility and ecosystem commands
        program.addCommand((0, compatibility_1.createCompatibilityCommand)());
        program.addCommand((0, ecosystem_update_1.createEcosystemUpdateCommand)());
        // Show help when no command is provided
        if (process.argv.length <= 2) {
            showWelcome();
            program.outputHelp();
            return;
        }
        // Parse CLI arguments
        await program.parseAsync(process.argv);
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
        process.exit(1);
    }
}
function showWelcome() {
    const welcome = `
${chalk_compat_1.default.cyan.bold('🧬 DNA Template CLI')}

${chalk_compat_1.default.gray('AI-native template generation ecosystem')}
${chalk_compat_1.default.gray('Create production-ready projects in under 10 minutes')}

${chalk_compat_1.default.bold('Core Commands:')}
  ${chalk_compat_1.default.cyan('dna-cli create')}          ${chalk_compat_1.default.gray('# Interactive template creation')}
  ${chalk_compat_1.default.cyan('dna-cli list')}            ${chalk_compat_1.default.gray('# Browse available templates')}
  ${chalk_compat_1.default.cyan('dna-cli list --modules')}  ${chalk_compat_1.default.gray('# Show available DNA modules')}
  ${chalk_compat_1.default.cyan('dna-cli add')}             ${chalk_compat_1.default.gray('# Add DNA modules to projects')}
  ${chalk_compat_1.default.cyan('dna-cli validate')}        ${chalk_compat_1.default.gray('# Validate template structure')}

${chalk_compat_1.default.bold('Advanced Commands:')}
  ${chalk_compat_1.default.cyan('dna-cli test')}            ${chalk_compat_1.default.gray('# Run comprehensive tests')}
  ${chalk_compat_1.default.cyan('dna-cli track')}           ${chalk_compat_1.default.gray('# Progress tracking & session management')}
  ${chalk_compat_1.default.cyan('dna-cli quality')}         ${chalk_compat_1.default.gray('# Quality validation & scoring')}
  ${chalk_compat_1.default.cyan('dna-cli git')}             ${chalk_compat_1.default.gray('# Git automation and workflow')}

${chalk_compat_1.default.bold('Examples:')}
  ${chalk_compat_1.default.cyan('dna-cli create my-app --template ai-saas-nextjs --modules auth-jwt,payments-stripe')}
  ${chalk_compat_1.default.cyan('dna-cli list --modules --category authentication')}
  ${chalk_compat_1.default.cyan('dna-cli test --framework nextjs --quality-gates')}
  ${chalk_compat_1.default.cyan('dna-cli track start --epic user-auth --story login-form')}
  ${chalk_compat_1.default.cyan('dna-cli quality check --framework nextjs --threshold 85')}
`;
    console.log((0, boxen_compat_1.default)(welcome, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
    }));
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    (0, error_handler_1.handleError)(new Error(`Unhandled promise rejection: ${reason}`));
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    (0, error_handler_1.handleError)(error);
    process.exit(1);
});
// Run the CLI
if (require.main === module) {
    main();
}
//# sourceMappingURL=main.js.map