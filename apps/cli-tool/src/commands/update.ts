/**
 * @fileoverview Update command - Template registry and CLI updates
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import semver from 'semver';
import { TemplateRegistry } from '../lib/template-registry';
import { logger } from '../utils/logger';
import { createCLIError } from '../utils/error-handler';
import { UpdateInfo } from '../types/cli';
import { environment } from '../environments/environment';

export const updateCommand = new Command('update')
  .description('Update template registry and check for CLI updates')
  .option('--registry-only', 'only update template registry')
  .option('--cli-only', 'only check for CLI updates')
  .option('--force', 'force update even if already up to date')
  .action(async (options) => {
    try {
      if (!options.cliOnly) {
        await updateTemplateRegistry(options.force);
      }
      
      if (!options.registryOnly) {
        await checkCLIUpdates();
      }
      
    } catch (error) {
      throw createCLIError(
        error instanceof Error ? error.message : 'Update failed',
        'UPDATE_FAILED',
        'Check your internet connection and try again'
      );
    }
  });

async function updateTemplateRegistry(force: boolean): Promise<void> {
  const spinner = ora('Updating template registry...').start();
  
  try {
    const registry = new TemplateRegistry();
    
    // Check if update is needed
    if (!force) {
      const lastUpdate = await registry.getLastUpdateTime();
      const timeSinceUpdate = Date.now() - (lastUpdate || 0);
      const updateInterval = 24 * 60 * 60 * 1000; // 24 hours
      
      if (timeSinceUpdate < updateInterval) {
        spinner.succeed('Template registry is up to date');
        return;
      }
    }
    
    // Download latest registry
    const updateResult = await registry.update();
    
    if (updateResult.updated) {
      spinner.succeed(`Template registry updated successfully`);
      
      if (updateResult.newTemplates > 0) {
        logger.success(`🎉 ${updateResult.newTemplates} new template${updateResult.newTemplates === 1 ? '' : 's'} available!`);
      }
      
      if (updateResult.updatedTemplates > 0) {
        logger.success(`🔄 ${updateResult.updatedTemplates} template${updateResult.updatedTemplates === 1 ? '' : 's'} updated!`);
      }
      
      // Show summary of changes
      if (updateResult.changes && updateResult.changes.length > 0) {
        logger.plain(`\n${chalk.bold('Recent Changes:')}`);
        updateResult.changes.slice(0, 5).forEach(change => {
          logger.plain(`  • ${change}`);
        });
        
        if (updateResult.changes.length > 5) {
          logger.plain(`  ... and ${updateResult.changes.length - 5} more`);
        }
      }
      
    } else {
      spinner.succeed('Template registry is already up to date');
    }
    
  } catch (error) {
    spinner.fail('Failed to update template registry');
    throw error;
  }
}

async function checkCLIUpdates(): Promise<void> {
  const spinner = ora('Checking for CLI updates...').start();
  
  try {
    const updateInfo = await getCLIUpdateInfo();
    
    if (updateInfo.hasUpdate) {
      spinner.stop();
      displayUpdateNotification(updateInfo);
    } else {
      spinner.succeed(`CLI is up to date (v${updateInfo.currentVersion})`);
    }
    
  } catch (error) {
    spinner.warn('Could not check for CLI updates');
    logger.debug('Update check error:', error);
  }
}

async function getCLIUpdateInfo(): Promise<UpdateInfo> {
  // In a real implementation, this would check the npm registry or GitHub releases
  // For now, we'll simulate the check
  
  const currentVersion = environment.version;
  
  try {
    // Simulate API call to check latest version
    const response = await fetch(`${environment.apiUrl}/cli/latest`, {
      headers: {
        'User-Agent': `dna-cli/${currentVersion}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const latestVersion = data.version;
    const hasUpdate = semver.gt(latestVersion, currentVersion);
    
    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseNotes: data.releaseNotes,
      breakingChanges: data.breakingChanges || false,
    };
    
  } catch (error) {
    // Fallback: assume no update available if check fails
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      breakingChanges: false,
    };
  }
}

function displayUpdateNotification(updateInfo: UpdateInfo): void {
  const { currentVersion, latestVersion, releaseNotes, breakingChanges } = updateInfo;
  
  let message = `🚀 ${chalk.bold('CLI Update Available!')}\n\n`;
  message += `Current version: ${chalk.dim(currentVersion)}\n`;
  message += `Latest version:  ${chalk.green(latestVersion)}\n\n`;
  
  if (breakingChanges) {
    message += `${chalk.red.bold('⚠️  This update contains breaking changes!')}\n`;
    message += `Please review the release notes before updating.\n\n`;
  }
  
  message += `${chalk.bold('To update:')}\n`;
  message += `${chalk.cyan('npm install -g dna-cli@latest')}\n\n`;
  
  if (releaseNotes) {
    message += `${chalk.bold('Release Notes:')}\n`;
    message += `${chalk.gray(releaseNotes)}\n\n`;
  }
  
  message += `${chalk.gray('Full changelog: https://github.com/dna-templates/cli/releases')}`;
  
  console.log(message);
}

// Helper function to format version comparison
function getVersionDiff(current: string, latest: string): string {
  const currentParts = semver.parse(current);
  const latestParts = semver.parse(latest);
  
  if (!currentParts || !latestParts) {
    return 'unknown';
  }
  
  if (latestParts.major > currentParts.major) {
    return 'major';
  } else if (latestParts.minor > currentParts.minor) {
    return 'minor';
  } else if (latestParts.patch > currentParts.patch) {
    return 'patch';
  }
  
  return 'none';
}