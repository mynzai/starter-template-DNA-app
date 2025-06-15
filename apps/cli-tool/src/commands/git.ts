/**
 * @fileoverview Git Automation Command for Development Workflow
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { enhancedLogger as logger, ICONS } from '../utils/enhanced-logger';
import { gitAutomation, GitAutomationConfig } from '../lib/git-automation';

export const gitCommand = new Command('git')
  .description('Automated Git operations integrated with progress tracking')
  .addCommand(
    new Command('init')
      .description('Initialize Git automation for this project')
      .option('--auto-commit', 'Enable automatic commits on progress updates')
      .option('--push-remote', 'Enable automatic push to remote')
      .option('--require-tests', 'Require tests before commits')
      .option('--conventional', 'Use conventional commit format')
      .action(initGitAutomation)
  )
  .addCommand(
    new Command('config')
      .description('Configure Git automation settings')
      .option('--show', 'Show current configuration')
      .option('--enable', 'Enable Git automation')
      .option('--disable', 'Disable Git automation')
      .option('--auto-commit <value>', 'Enable/disable auto-commit (true/false)')
      .option('--push-remote <value>', 'Enable/disable auto-push (true/false)')
      .option('--require-tests <value>', 'Require tests before commits (true/false)')
      .option('--branch-prefix <prefix>', 'Set branch prefix for features')
      .action(configureGitAutomation)
  )
  .addCommand(
    new Command('status')
      .description('Show Git repository status with automation info')
      .action(showGitStatus)
  )
  .addCommand(
    new Command('branch')
      .description('Create feature branch from epic/story')
      .option('-e, --epic <epic>', 'Epic identifier')
      .option('-s, --story <story>', 'Story identifier')
      .action(createFeatureBranch)
  )
  .addCommand(
    new Command('commit')
      .description('Create manual commit with tracking integration')
      .option('-t, --type <type>', 'Commit type (feat, fix, docs, style, refactor, test, chore)', 'feat')
      .option('-s, --scope <scope>', 'Commit scope')
      .option('-m, --message <message>', 'Commit message', true)
      .option('--breaking', 'Mark as breaking change')
      .action(manualCommit)
  )
  .addCommand(
    new Command('auto-commit')
      .description('Trigger automatic commit based on current session')
      .option('--force', 'Force commit even if requirements not met')
      .action(triggerAutoCommit)
  );

async function initGitAutomation(options: any): Promise<void> {
  try {
    logger.info(`${ICONS.git} Initializing Git automation...`);

    // Validate Git repository
    const isValid = await gitAutomation.validateRepository();
    if (!isValid) {
      logger.error('Git repository validation failed');
      return;
    }

    // Configure based on options
    const config: Partial<GitAutomationConfig> = {
      enabled: true,
      autoCommitOnProgress: options.autoCommit || false,
      pushToRemote: options.pushRemote || false,
      requireTests: options.requireTests || false,
      conventionalCommits: options.conventional !== false
    };

    await gitAutomation.saveConfig(config);

    logger.success(`${ICONS.check} Git automation initialized`);
    logger.info('Configuration:');
    logger.info(`  Auto-commit: ${chalk.cyan(config.autoCommitOnProgress)}`);
    logger.info(`  Push to remote: ${chalk.cyan(config.pushToRemote)}`);
    logger.info(`  Require tests: ${chalk.cyan(config.requireTests)}`);
    logger.info(`  Conventional commits: ${chalk.cyan(config.conventionalCommits)}`);

  } catch (error) {
    logger.error(`Failed to initialize Git automation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function configureGitAutomation(options: any): Promise<void> {
  try {
    if (options.show) {
      const status = await gitAutomation.getRepoStatus();
      logger.info(`${ICONS.git} Git Automation Configuration:`);
      logger.info(`  Repository: ${chalk.cyan(status.branch)}`);
      logger.info(`  Has changes: ${chalk.cyan(status.hasChanges)}`);
      logger.info(`  Commits ahead: ${chalk.cyan(status.ahead)}`);
      logger.info(`  Commits behind: ${chalk.cyan(status.behind)}`);
      logger.info(`  Last commit: ${chalk.gray(status.lastCommit)}`);
      return;
    }

    const config: Partial<GitAutomationConfig> = {};

    if (options.enable) config.enabled = true;
    if (options.disable) config.enabled = false;
    if (options.autoCommit !== undefined) config.autoCommitOnProgress = options.autoCommit === 'true';
    if (options.pushRemote !== undefined) config.pushToRemote = options.pushRemote === 'true';
    if (options.requireTests !== undefined) config.requireTests = options.requireTests === 'true';
    if (options.branchPrefix) config.branchPrefix = options.branchPrefix;

    await gitAutomation.saveConfig(config);
    logger.success(`${ICONS.check} Git automation configuration updated`);

  } catch (error) {
    logger.error(`Failed to configure Git automation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function showGitStatus(): Promise<void> {
  try {
    const status = await gitAutomation.getRepoStatus();

    logger.info(`${ICONS.git} Repository Status:`);
    logger.info(`  Branch: ${chalk.cyan(status.branch)}`);
    logger.info(`  Has uncommitted changes: ${status.hasChanges ? chalk.red('Yes') : chalk.green('No')}`);
    
    if (status.ahead > 0) {
      logger.info(`  Ahead of remote: ${chalk.cyan(status.ahead)} commits`);
    }
    
    if (status.behind > 0) {
      logger.info(`  Behind remote: ${chalk.yellow(status.behind)} commits`);
    }
    
    logger.info(`  Last commit: ${chalk.gray(status.lastCommit)}`);

  } catch (error) {
    logger.error(`Failed to get Git status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createFeatureBranch(options: any): Promise<void> {
  try {
    if (!options.epic || !options.story) {
      logger.error('Both --epic and --story are required');
      return;
    }

    const branchName = await gitAutomation.createFeatureBranch(options.epic, options.story);
    logger.success(`${ICONS.branch} Feature branch created: ${chalk.cyan(branchName)}`);

  } catch (error) {
    logger.error(`Failed to create feature branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function manualCommit(options: any): Promise<void> {
  try {
    if (!options.message) {
      logger.error('Commit message is required');
      return;
    }

    // Get current session data for context
    const sessionData = await getCurrentSessionData();

    const success = await gitAutomation.autoCommit({
      type: options.type,
      scope: options.scope,
      description: options.message,
      epic: sessionData?.epic,
      story: sessionData?.story,
      filesModified: sessionData?.progress?.filesModified || 0,
      testsAdded: sessionData?.progress?.testsAdded || 0,
      coverage: sessionData?.metrics?.coverage || 0,
      breakingChange: options.breaking || false,
      autoGenerated: false
    });

    if (success) {
      logger.success(`${ICONS.check} Commit created successfully`);
    } else {
      logger.error('Failed to create commit');
    }

  } catch (error) {
    logger.error(`Failed to create commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function triggerAutoCommit(options: any): Promise<void> {
  try {
    const sessionData = await getCurrentSessionData();
    if (!sessionData) {
      logger.error('No active session found');
      return;
    }

    const success = await gitAutomation.commitProgressUpdate(sessionData);
    
    if (success) {
      logger.success(`${ICONS.check} Auto-commit completed`);
    } else {
      logger.info('No commit created (no changes or requirements not met)');
    }

  } catch (error) {
    logger.error(`Failed to trigger auto-commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getCurrentSessionData(): Promise<any> {
  try {
    const fs = await import('fs-extra');
    const path = await import('path');
    const sessionFile = path.join(process.cwd(), '.dna-current-session.json');
    
    if (fs.existsSync(sessionFile)) {
      return fs.readJsonSync(sessionFile);
    }
    return null;
  } catch {
    return null;
  }
}