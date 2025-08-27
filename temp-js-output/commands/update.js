"use strict";
/**
 * @fileoverview Update command - Template registry and CLI updates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const semver_1 = __importDefault(require("semver"));
const template_registry_1 = require("../lib/template-registry");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../utils/error-handler");
const environment_1 = require("../environments/environment");
exports.updateCommand = new commander_1.Command('update')
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
    }
    catch (error) {
        throw (0, error_handler_1.createCLIError)(error instanceof Error ? error.message : 'Update failed', 'UPDATE_FAILED', 'Check your internet connection and try again');
    }
});
async function updateTemplateRegistry(force) {
    const spinner = (0, ora_1.default)('Updating template registry...').start();
    try {
        const registry = new template_registry_1.TemplateRegistry();
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
                logger_1.logger.success(`🎉 ${updateResult.newTemplates} new template${updateResult.newTemplates === 1 ? '' : 's'} available!`);
            }
            if (updateResult.updatedTemplates > 0) {
                logger_1.logger.success(`🔄 ${updateResult.updatedTemplates} template${updateResult.updatedTemplates === 1 ? '' : 's'} updated!`);
            }
            // Show summary of changes
            if (updateResult.changes && updateResult.changes.length > 0) {
                logger_1.logger.plain(`\n${chalk_1.default.bold('Recent Changes:')}`);
                updateResult.changes.slice(0, 5).forEach(change => {
                    logger_1.logger.plain(`  • ${change}`);
                });
                if (updateResult.changes.length > 5) {
                    logger_1.logger.plain(`  ... and ${updateResult.changes.length - 5} more`);
                }
            }
        }
        else {
            spinner.succeed('Template registry is already up to date');
        }
    }
    catch (error) {
        spinner.fail('Failed to update template registry');
        throw error;
    }
}
async function checkCLIUpdates() {
    const spinner = (0, ora_1.default)('Checking for CLI updates...').start();
    try {
        const updateInfo = await getCLIUpdateInfo();
        if (updateInfo.hasUpdate) {
            spinner.stop();
            displayUpdateNotification(updateInfo);
        }
        else {
            spinner.succeed(`CLI is up to date (v${updateInfo.currentVersion})`);
        }
    }
    catch (error) {
        spinner.warn('Could not check for CLI updates');
        logger_1.logger.debug('Update check error:', error);
    }
}
async function getCLIUpdateInfo() {
    // In a real implementation, this would check the npm registry or GitHub releases
    // For now, we'll simulate the check
    const currentVersion = environment_1.environment.version;
    try {
        // Simulate API call to check latest version
        const response = await fetch(`${environment_1.environment.apiUrl}/cli/latest`, {
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
        const hasUpdate = semver_1.default.gt(latestVersion, currentVersion);
        return {
            hasUpdate,
            currentVersion,
            latestVersion,
            releaseNotes: data.releaseNotes,
            breakingChanges: data.breakingChanges || false,
        };
    }
    catch (error) {
        // Fallback: assume no update available if check fails
        return {
            hasUpdate: false,
            currentVersion,
            latestVersion: currentVersion,
            breakingChanges: false,
        };
    }
}
function displayUpdateNotification(updateInfo) {
    const { currentVersion, latestVersion, releaseNotes, breakingChanges } = updateInfo;
    let message = `🚀 ${chalk_1.default.bold('CLI Update Available!')}\n\n`;
    message += `Current version: ${chalk_1.default.dim(currentVersion)}\n`;
    message += `Latest version:  ${chalk_1.default.green(latestVersion)}\n\n`;
    if (breakingChanges) {
        message += `${chalk_1.default.red.bold('⚠️  This update contains breaking changes!')}\n`;
        message += `Please review the release notes before updating.\n\n`;
    }
    message += `${chalk_1.default.bold('To update:')}\n`;
    message += `${chalk_1.default.cyan('npm install -g dna-cli@latest')}\n\n`;
    if (releaseNotes) {
        message += `${chalk_1.default.bold('Release Notes:')}\n`;
        message += `${chalk_1.default.gray(releaseNotes)}\n\n`;
    }
    message += `${chalk_1.default.gray('Full changelog: https://github.com/dna-templates/cli/releases')}`;
    console.log(message);
}
// Helper function to format version comparison
function getVersionDiff(current, latest) {
    const currentParts = semver_1.default.parse(current);
    const latestParts = semver_1.default.parse(latest);
    if (!currentParts || !latestParts) {
        return 'unknown';
    }
    if (latestParts.major > currentParts.major) {
        return 'major';
    }
    else if (latestParts.minor > currentParts.minor) {
        return 'minor';
    }
    else if (latestParts.patch > currentParts.patch) {
        return 'patch';
    }
    return 'none';
}
