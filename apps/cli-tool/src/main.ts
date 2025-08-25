#!/usr/bin/env node

/**
 * @fileoverview DNA CLI Tool - Main Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import updateNotifier from 'update-notifier';
import { createCommand } from './commands/create';
import { listCommand } from './commands/list';
import { validateCommand } from './commands/validate';
import { updateCommand } from './commands/update';
// Removed unused commands for opensource version
import { environment } from './environments/environment';
import { logger } from './utils/logger';
import { handleError } from './utils/error-handler';

const pkg = {
  name: 'dna-cli',
  version: environment.version,
};

async function main(): Promise<void> {
  try {
    // Check for updates
    const notifier = updateNotifier({ pkg, updateCheckInterval: environment.updateCheckInterval });
    if (notifier.update) {
      const message = `Update available: ${chalk.dim(notifier.update.current)} → ${chalk.green(notifier.update.latest)}\nRun ${chalk.cyan('npm install -g dna-cli')} to update`;
      
      console.log(boxen(message, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
        backgroundColor: '#40414f'
      }));
    }

    const program = new Command();

    // Configure main program
    program
      .name('dna-cli')
      .description('DNA Template CLI - AI-native template generation ecosystem')
      .version(environment.version, '-v, --version', 'display version number')
      .option('-d, --debug', 'enable debug mode')
      .option('--verbose', 'enable verbose output')
      .option('-q, --quiet', 'suppress non-error output')
      .option('-c, --config <path>', 'use custom config file')
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        logger.setLevel(opts['debug'] ? 'debug' : opts['verbose'] ? 'info' : opts['quiet'] ? 'error' : 'info');
        
        if (opts['debug']) {
          logger.debug('Debug mode enabled');
          logger.debug('Environment:', environment);
        }
      });

    // Add commands
    program.addCommand(createCommand);
    program.addCommand(listCommand);
    program.addCommand(validateCommand);
    program.addCommand(updateCommand);

    // Show help when no command is provided
    if (process.argv.length <= 2) {
      showWelcome();
      program.outputHelp();
      return;
    }

    // Parse CLI arguments
    await program.parseAsync(process.argv);

  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

function showWelcome(): void {
  const welcome = `
${chalk.cyan.bold('🧬 DNA Template CLI')}

${chalk.gray('AI-native template generation ecosystem')}
${chalk.gray('Create production-ready projects in under 10 minutes')}

${chalk.bold('Quick Start:')}
  ${chalk.cyan('dna-cli create')}          ${chalk.gray('# Interactive template creation')}
  ${chalk.cyan('dna-cli list')}            ${chalk.gray('# Browse available templates')}
  ${chalk.cyan('dna-cli validate')}        ${chalk.gray('# Validate template structure')}
  ${chalk.cyan('dna-cli create --help')}   ${chalk.gray('# Get detailed help')}

${chalk.bold('Examples:')}
  ${chalk.cyan('dna-cli create my-app --template ai-saas-nextjs')}
  ${chalk.cyan('dna-cli create mobile-app --template flutter-universal')}
  ${chalk.cyan('dna-cli list --category ai')}
  ${chalk.cyan('dna-cli validate my-project')}
`;

  console.log(boxen(welcome, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  }));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  handleError(new Error(`Unhandled promise rejection: ${reason}`));
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  handleError(error);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main();
}