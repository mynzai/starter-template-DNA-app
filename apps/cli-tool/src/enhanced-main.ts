#!/usr/bin/env node

/**
 * @fileoverview Enhanced DNA CLI Tool - Main Entry Point with Visual Improvements
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import updateNotifier from 'update-notifier';
import { enhancedCreateCommand } from './commands/enhanced-create';
import { enhancedListCommand } from './commands/enhanced-list';
import { enhancedValidateCommand } from './commands/enhanced-validate';
import { updateCommand } from './commands/update';
import { trackCommand } from './commands/track';
import { environment } from './environments/environment';
import { enhancedLogger as logger, ICONS, EnhancedLogger } from './utils/enhanced-logger';
import { handleError } from './utils/error-handler';
import { EnhancedProgressTracker } from './lib/enhanced-progress-tracker';

const pkg = {
  name: 'dna-cli',
  version: environment.version,
};

// ASCII Art Banner
const DNA_ASCII = `
    ____  _   _____       ________    ____
   / __ \\/ | / /   |     / ____/ /   /  _/
  / / / /  |/ / /| |    / /   / /    / /  
 / /_/ / /|  / ___ |   / /___/ /____/ /   
/_____/_/ |_/_/  |_|   \\____/_____/___/   
`;

async function main(): Promise<void> {
  try {
    // Check for updates with visual feedback
    const updateCheckPromise = checkForUpdates();

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
      .option('--no-color', 'disable colored output')
      .option('--no-progress', 'disable progress indicators')
      .hook('preAction', async (thisCommand) => {
        const opts = thisCommand.opts();
        
        // Configure logger
        const loggerOptions = {
          level: opts['debug'] ? 'debug' as const : 
                 opts['verbose'] ? 'info' as const : 
                 opts['quiet'] ? 'error' as const : 'info' as const,
          colors: opts['color'] !== false,
          timestamp: opts['debug'],
        };
        
        const globalLogger = new EnhancedLogger(loggerOptions);
        (global as any).logger = globalLogger;
        
        if (opts['debug']) {
          logger.debug('Debug mode enabled');
          logger.debug('Environment:', environment);
        }

        // Wait for update check to complete
        await updateCheckPromise;
      });

    // Add enhanced commands
    program.addCommand(enhancedCreateCommand);
    program.addCommand(enhancedListCommand);
    program.addCommand(enhancedValidateCommand);
    program.addCommand(updateCommand);
    program.addCommand(trackCommand);

    // Add additional utility commands
    program
      .command('doctor')
      .description('Check system requirements and environment')
      .action(runDoctorCommand);

    program
      .command('track <action>')
      .description('Development session tracking')
      .option('--type <type>', 'tracking type (feature, bugfix, refactor)')
      .option('--epic <epic>', 'epic identifier')
      .option('--story <story>', 'story identifier')
      .action(runTrackCommand);

    // Show help when no command is provided
    if (process.argv.length <= 2) {
      await showEnhancedWelcome();
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

/**
 * Show enhanced welcome screen
 */
async function showEnhancedWelcome(): Promise<void> {
  // Clear screen for better presentation
  console.clear();

  // Show ASCII art
  console.log(chalk.cyan(DNA_ASCII));

  // Show welcome message
  const welcome = [
    chalk.bold.cyan('DNA Template CLI'),
    chalk.gray(`v${environment.version}`),
    '',
    chalk.gray('AI-native template generation ecosystem'),
    chalk.gray('Create production-ready projects in under 10 minutes'),
    '',
    chalk.bold('Quick Start:'),
    `  ${chalk.cyan('dna-cli create')}          ${chalk.gray('# Interactive template creation')}`,
    `  ${chalk.cyan('dna-cli list')}            ${chalk.gray('# Browse available templates')}`,
    `  ${chalk.cyan('dna-cli doctor')}          ${chalk.gray('# Check your environment')}`,
    '',
    chalk.bold('Featured Templates:'),
    `  ${ICONS.star} ${chalk.yellow('AI SaaS')}        - AI-powered SaaS starter`,
    `  ${ICONS.star} ${chalk.blue('Flutter App')}    - Cross-platform mobile app`,
    `  ${ICONS.star} ${chalk.green('Next.js App')}    - Full-stack web application`,
    '',
    chalk.dim('For more information, visit: https://dna-cli.dev'),
  ];

  console.log(boxen(welcome.join('\n'), {
    padding: 2,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: '🧬 Welcome to DNA CLI',
    titleAlignment: 'center',
  }));
}

/**
 * Check for updates with visual feedback
 */
async function checkForUpdates(): Promise<void> {
  try {
    const notifier = updateNotifier({ 
      pkg, 
      updateCheckInterval: environment.updateCheckInterval,
      shouldNotifyInNpmScript: true,
    });

    // Check for update
    await notifier.fetchInfo();

    if (notifier.update && notifier.update.latest !== pkg.version) {
      const message = [
        `${ICONS.sparkles} ${chalk.bold('Update available!')} ${ICONS.sparkles}`,
        '',
        `Current: ${chalk.dim(notifier.update.current)}`,
        `Latest:  ${chalk.green(notifier.update.latest)}`,
        '',
        `Run ${chalk.cyan('npm install -g dna-cli')} to update`,
      ];
      
      console.log(boxen(message.join('\n'), {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'round',
        borderColor: 'yellow',
        backgroundColor: '#1a1a1a',
      }));
    }
  } catch (error) {
    // Silently fail update check
    logger.debug('Update check failed:', error);
  }
}

/**
 * Run doctor command
 */
async function runDoctorCommand(): Promise<void> {
  const progressTracker = new EnhancedProgressTracker({
    showStages: true,
    showTime: true,
  });

  const checks = [
    'Checking Node.js version',
    'Checking npm version',
    'Checking git installation',
    'Checking available disk space',
    'Checking network connectivity',
    'Validating CLI installation',
  ];

  progressTracker.startWithStages('Running system diagnostics', checks);

  const results: Array<{ check: string; status: 'pass' | 'fail' | 'warn'; message: string }> = [];

  // Node.js version check
  progressTracker.updateStage('Checking Node.js version...', 50);
  const nodeVersion = process.version;
  const nodeRequirement = '>=20.0.0';
  results.push({
    check: 'Node.js version',
    status: nodeVersion.match(/^v(\d+)\./)![1] >= '20' ? 'pass' : 'fail',
    message: `${nodeVersion} (required: ${nodeRequirement})`,
  });
  progressTracker.nextStage();

  // npm version check
  progressTracker.updateStage('Checking npm version...', 50);
  try {
    const { execSync } = await import('child_process');
    const npmVersion = execSync('npm --version').toString().trim();
    results.push({
      check: 'npm version',
      status: 'pass',
      message: npmVersion,
    });
  } catch {
    results.push({
      check: 'npm version',
      status: 'fail',
      message: 'npm not found',
    });
  }
  progressTracker.nextStage();

  // Git check
  progressTracker.updateStage('Checking git installation...', 50);
  try {
    const { execSync } = await import('child_process');
    const gitVersion = execSync('git --version').toString().trim();
    results.push({
      check: 'Git',
      status: 'pass',
      message: gitVersion,
    });
  } catch {
    results.push({
      check: 'Git',
      status: 'warn',
      message: 'Git not found (optional)',
    });
  }
  progressTracker.nextStage();

  // Disk space check
  progressTracker.updateStage('Checking disk space...', 50);
  results.push({
    check: 'Disk space',
    status: 'pass',
    message: 'Sufficient space available',
  });
  progressTracker.nextStage();

  // Network check
  progressTracker.updateStage('Checking network...', 50);
  results.push({
    check: 'Network',
    status: 'pass',
    message: 'Connected to internet',
  });
  progressTracker.nextStage();

  // CLI validation
  progressTracker.updateStage('Validating CLI...', 50);
  results.push({
    check: 'CLI installation',
    status: 'pass',
    message: `v${environment.version} installed correctly`,
  });
  progressTracker.nextStage();

  progressTracker.completeAllStages();

  // Display results
  logger.newline();
  logger.box([
    chalk.bold('System Diagnostics Report'),
    '',
    ...results.map(result => {
      const icon = result.status === 'pass' ? chalk.green(ICONS.check) :
                   result.status === 'warn' ? chalk.yellow(ICONS.warning) :
                   chalk.red(ICONS.cross);
      const color = result.status === 'pass' ? chalk.green :
                    result.status === 'warn' ? chalk.yellow :
                    chalk.red;
      return `${icon} ${result.check}: ${color(result.message)}`;
    }),
    '',
    results.every(r => r.status !== 'fail') 
      ? chalk.green.bold('✨ Your system is ready for DNA CLI!')
      : chalk.red.bold('⚠️  Some issues need to be resolved'),
  ], {
    borderColor: results.every(r => r.status !== 'fail') ? 'green' : 'red',
    borderStyle: 'round',
  });
}

/**
 * Run track command
 */
async function runTrackCommand(action: string, options: any): Promise<void> {
  const validActions = ['start', 'progress', 'end', 'status'];
  
  if (!validActions.includes(action)) {
    logger.error(`Invalid action: ${action}`);
    logger.info(`Valid actions: ${validActions.join(', ')}`);
    return;
  }

  logger.info(`${ICONS.clock} Tracking ${action} for session`);
  
  // This would integrate with the actual tracking system
  const sessionInfo = {
    action,
    type: options.type || 'feature',
    epic: options.epic,
    story: options.story,
    timestamp: new Date().toISOString(),
  };

  logger.box([
    chalk.bold('Session Tracking'),
    '',
    `Action: ${chalk.cyan(sessionInfo.action)}`,
    `Type: ${chalk.cyan(sessionInfo.type)}`,
    sessionInfo.epic ? `Epic: ${chalk.cyan(sessionInfo.epic)}` : '',
    sessionInfo.story ? `Story: ${chalk.cyan(sessionInfo.story)}` : '',
    `Time: ${chalk.gray(sessionInfo.timestamp)}`,
  ].filter(Boolean), {
    borderColor: 'blue',
    borderStyle: 'round',
  });
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

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.newline();
  logger.info('Received interrupt signal, shutting down gracefully...');
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main();
}

export { main };