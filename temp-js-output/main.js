#!/usr/bin/env node
"use strict";
/**
 * @fileoverview DNA CLI Tool - Main Entry Point
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const update_notifier_1 = __importDefault(require("update-notifier"));
const create_1 = require("./commands/create");
const list_1 = require("./commands/list");
const validate_1 = require("./commands/validate");
const update_1 = require("./commands/update");
// Removed unused commands for opensource version
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
        const notifier = (0, update_notifier_1.default)({ pkg, updateCheckInterval: environment_1.environment.updateCheckInterval });
        if (notifier.update) {
            const message = `Update available: ${chalk_1.default.dim(notifier.update.current)} → ${chalk_1.default.green(notifier.update.latest)}\nRun ${chalk_1.default.cyan('npm install -g dna-cli')} to update`;
            console.log((0, boxen_1.default)(message, {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'yellow',
                backgroundColor: '#40414f'
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
            }
        });
        // Add commands
        program.addCommand(create_1.createCommand);
        program.addCommand(list_1.listCommand);
        program.addCommand(validate_1.validateCommand);
        program.addCommand(update_1.updateCommand);
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
${chalk_1.default.cyan.bold('🧬 DNA Template CLI')}

${chalk_1.default.gray('AI-native template generation ecosystem')}
${chalk_1.default.gray('Create production-ready projects in under 10 minutes')}

${chalk_1.default.bold('Quick Start:')}
  ${chalk_1.default.cyan('dna-cli create')}          ${chalk_1.default.gray('# Interactive template creation')}
  ${chalk_1.default.cyan('dna-cli list')}            ${chalk_1.default.gray('# Browse available templates')}
  ${chalk_1.default.cyan('dna-cli validate')}        ${chalk_1.default.gray('# Validate template structure')}
  ${chalk_1.default.cyan('dna-cli create --help')}   ${chalk_1.default.gray('# Get detailed help')}

${chalk_1.default.bold('Examples:')}
  ${chalk_1.default.cyan('dna-cli create my-app --template ai-saas-nextjs')}
  ${chalk_1.default.cyan('dna-cli create mobile-app --template flutter-universal')}
  ${chalk_1.default.cyan('dna-cli list --category ai')}
  ${chalk_1.default.cyan('dna-cli validate my-project')}
`;
    console.log((0, boxen_1.default)(welcome, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
    }));
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    (0, error_handler_1.handleError)(new Error(`Unexpected error occurred: ${reason}`));
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    (0, error_handler_1.handleError)(error);
    process.exit(1);
});
// Run the CLI
if (require.main === module) {
    main();
}
