"use strict";
/**
 * @fileoverview Automated Git Commit System
 * Integrates with progress tracking to automatically commit changes during development
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitAutomation = exports.GitAutomation = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const child_process_1 = require("child_process");
const enhanced_logger_1 = require("../utils/enhanced-logger");
const git_validation_1 = require("./git-validation");
const DEFAULT_CONFIG = {
    enabled: true,
    autoCommitOnProgress: true,
    autoCommitOnQualityGates: true,
    requireTests: false,
    requireQualityGates: false,
    branchPrefix: 'feature/',
    conventionalCommits: true,
    signCommits: false,
    pushToRemote: false
};
const CONFIG_FILE = path_1.default.join(process.cwd(), '.dna-git-config.json');
class GitAutomation {
    constructor() {
        this.config = this.loadConfig();
    }
    loadConfig() {
        try {
            if (fs_extra_1.default.existsSync(CONFIG_FILE)) {
                const fileConfig = fs_extra_1.default.readJsonSync(CONFIG_FILE);
                return { ...DEFAULT_CONFIG, ...fileConfig };
            }
            return DEFAULT_CONFIG;
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.warn('Failed to load Git automation config, using defaults');
            return DEFAULT_CONFIG;
        }
    }
    async saveConfig(config) {
        try {
            this.config = { ...this.config, ...config };
            await fs_extra_1.default.writeJson(CONFIG_FILE, this.config, { spaces: 2 });
            enhanced_logger_1.enhancedLogger.success('Git automation config saved');
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async autoCommit(options) {
        if (!this.config.enabled) {
            enhanced_logger_1.enhancedLogger.debug('Git automation disabled');
            return false;
        }
        try {
            // Check if there are changes to commit
            const hasChanges = this.hasUncommittedChanges();
            if (!hasChanges) {
                enhanced_logger_1.enhancedLogger.debug('No changes to commit');
                return false;
            }
            // Create rollback point
            const rollbackId = await git_validation_1.gitValidation.createRollbackPoint();
            // Validate requirements
            if (this.config.requireTests && !options.testsAdded) {
                enhanced_logger_1.enhancedLogger.warn('Skipping auto-commit: Tests required but none added');
                return false;
            }
            if (this.config.requireQualityGates && (!options.coverage || options.coverage < 80)) {
                enhanced_logger_1.enhancedLogger.warn('Skipping auto-commit: Quality gates not met');
                return false;
            }
            // Generate commit message
            const commitMessage = this.generateCommitMessage(options);
            // Validate commit message
            const messageValidation = git_validation_1.gitValidation.validateCommitMessage(commitMessage);
            if (!messageValidation.passed) {
                enhanced_logger_1.enhancedLogger.warn('Commit message validation failed:');
                messageValidation.errors.forEach(error => enhanced_logger_1.enhancedLogger.warn(`  • ${error}`));
                return false;
            }
            // Stage all changes
            (0, child_process_1.execSync)('git add .', { stdio: 'inherit' });
            // Pre-commit validation
            const preCommitValidation = await git_validation_1.gitValidation.validatePreCommit();
            if (!preCommitValidation.canProceed) {
                enhanced_logger_1.enhancedLogger.warn('Pre-commit validation failed:');
                preCommitValidation.errors.forEach(error => enhanced_logger_1.enhancedLogger.warn(`  • ${error}`));
                // Rollback if validation fails
                await git_validation_1.gitValidation.rollback(rollbackId);
                return false;
            }
            // Show warnings but continue
            if (preCommitValidation.warnings.length > 0) {
                enhanced_logger_1.enhancedLogger.warn('Pre-commit warnings:');
                preCommitValidation.warnings.forEach(warning => enhanced_logger_1.enhancedLogger.warn(`  • ${warning}`));
            }
            // Create commit
            const commitCommand = this.config.signCommits ?
                `git commit -S -m "${commitMessage}"` :
                `git commit -m "${commitMessage}"`;
            (0, child_process_1.execSync)(commitCommand, { stdio: 'inherit' });
            enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.git} Auto-committed: ${commitMessage.split('\n')[0]}`);
            // Push to remote if configured
            if (this.config.pushToRemote) {
                try {
                    const currentBranch = this.getCurrentBranch();
                    (0, child_process_1.execSync)(`git push origin ${currentBranch}`, { stdio: 'inherit' });
                    enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.upload} Pushed to remote: ${currentBranch}`);
                }
                catch (error) {
                    enhanced_logger_1.enhancedLogger.warn('Failed to push to remote (continuing anyway)');
                }
            }
            return true;
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.error(`Auto-commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    async createFeatureBranch(epic, story) {
        try {
            const branchName = `${this.config.branchPrefix}${epic}-${story}`;
            const sanitizedBranchName = branchName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            // Check if branch exists
            try {
                (0, child_process_1.execSync)(`git rev-parse --verify ${sanitizedBranchName}`, { stdio: 'pipe' });
                enhanced_logger_1.enhancedLogger.info(`Branch ${sanitizedBranchName} already exists, checking out`);
                (0, child_process_1.execSync)(`git checkout ${sanitizedBranchName}`, { stdio: 'inherit' });
            }
            catch {
                // Branch doesn't exist, create it
                (0, child_process_1.execSync)(`git checkout -b ${sanitizedBranchName}`, { stdio: 'inherit' });
                enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.branch} Created feature branch: ${sanitizedBranchName}`);
            }
            return sanitizedBranchName;
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.error(`Failed to create feature branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    async commitProgressUpdate(sessionData) {
        if (!this.config.autoCommitOnProgress) {
            return false;
        }
        const options = {
            type: 'chore',
            scope: sessionData.epic || 'progress',
            description: 'Update development progress tracking',
            epic: sessionData.epic,
            story: sessionData.story,
            filesModified: sessionData.progress?.filesModified || 0,
            testsAdded: sessionData.progress?.testsAdded || 0,
            coverage: sessionData.metrics?.coverage || 0,
            autoGenerated: true
        };
        return await this.autoCommit(options);
    }
    async commitFeatureCompletion(sessionData) {
        const options = {
            type: 'feature',
            scope: sessionData.epic || 'core',
            description: `Complete ${sessionData.story || 'feature implementation'}`,
            epic: sessionData.epic,
            story: sessionData.story,
            filesModified: sessionData.progress?.filesModified || 0,
            testsAdded: sessionData.progress?.testsAdded || 0,
            coverage: sessionData.metrics?.coverage || 0,
            autoGenerated: true
        };
        return await this.autoCommit(options);
    }
    async commitTestUpdate(sessionData) {
        if (!this.config.autoCommitOnQualityGates) {
            return false;
        }
        const options = {
            type: 'test',
            scope: sessionData.epic || 'core',
            description: `Add tests and improve coverage to ${sessionData.metrics?.coverage || 0}%`,
            epic: sessionData.epic,
            story: sessionData.story,
            filesModified: sessionData.progress?.filesModified || 0,
            testsAdded: sessionData.progress?.testsAdded || 0,
            coverage: sessionData.metrics?.coverage || 0,
            autoGenerated: true
        };
        return await this.autoCommit(options);
    }
    async commitRefactoring(sessionData, description) {
        const options = {
            type: 'refactor',
            scope: sessionData.epic || 'core',
            description: description,
            epic: sessionData.epic,
            story: sessionData.story,
            filesModified: sessionData.progress?.filesModified || 0,
            autoGenerated: true
        };
        return await this.autoCommit(options);
    }
    generateCommitMessage(options) {
        let message = '';
        if (this.config.conventionalCommits) {
            // Conventional Commits format
            const scope = options.scope ? `(${options.scope})` : '';
            const breaking = options.breakingChange ? '!' : '';
            message = `${options.type}${scope}${breaking}: ${options.description}`;
            // Add body with details
            const bodyParts = [];
            if (options.epic || options.story) {
                bodyParts.push(`Epic: ${options.epic || 'N/A'}`);
                bodyParts.push(`Story: ${options.story || 'N/A'}`);
            }
            if (options.filesModified > 0) {
                bodyParts.push(`Files modified: ${options.filesModified}`);
            }
            if (options.testsAdded && options.testsAdded > 0) {
                bodyParts.push(`Tests added: ${options.testsAdded}`);
            }
            if (options.coverage !== undefined) {
                bodyParts.push(`Coverage: ${options.coverage}%`);
            }
            if (options.autoGenerated) {
                bodyParts.push('🤖 Generated with Claude Code');
                bodyParts.push('Co-Authored-By: Claude <noreply@anthropic.com>');
            }
            if (bodyParts.length > 0) {
                message += '\n\n' + bodyParts.join('\n');
            }
            if (options.breakingChange) {
                message += '\n\nBREAKING CHANGE: ' + options.description;
            }
        }
        else {
            // Simple format
            message = `${options.type}: ${options.description}`;
            if (options.autoGenerated) {
                message += '\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>';
            }
        }
        return message;
    }
    hasUncommittedChanges() {
        try {
            const status = (0, child_process_1.execSync)('git status --porcelain', { encoding: 'utf8' });
            return status.trim().length > 0;
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.warn('Failed to check Git status');
            return false;
        }
    }
    getCurrentBranch() {
        try {
            return (0, child_process_1.execSync)('git branch --show-current', { encoding: 'utf8' }).trim();
        }
        catch (error) {
            return 'main';
        }
    }
    async getRepoStatus() {
        try {
            const branch = this.getCurrentBranch();
            const hasChanges = this.hasUncommittedChanges();
            let ahead = 0;
            let behind = 0;
            try {
                const status = (0, child_process_1.execSync)(`git rev-list --count --left-right origin/${branch}...HEAD`, { encoding: 'utf8' });
                const [behindStr, aheadStr] = status.trim().split('\t');
                behind = parseInt(behindStr) || 0;
                ahead = parseInt(aheadStr) || 0;
            }
            catch {
                // Remote tracking not set up
            }
            const lastCommit = (0, child_process_1.execSync)('git log -1 --pretty=format:"%h %s"', { encoding: 'utf8' });
            return {
                branch,
                hasChanges,
                ahead,
                behind,
                lastCommit
            };
        }
        catch (error) {
            throw new Error(`Failed to get repo status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async validateRepository() {
        try {
            // Check if we're in a Git repository
            (0, child_process_1.execSync)('git rev-parse --git-dir', { stdio: 'pipe' });
            // Check if we have a remote
            try {
                (0, child_process_1.execSync)('git remote -v', { stdio: 'pipe' });
            }
            catch {
                enhanced_logger_1.enhancedLogger.warn('No Git remote configured - push to remote disabled');
                this.config.pushToRemote = false;
            }
            // Check Git configuration
            try {
                (0, child_process_1.execSync)('git config user.name', { stdio: 'pipe' });
                (0, child_process_1.execSync)('git config user.email', { stdio: 'pipe' });
            }
            catch {
                enhanced_logger_1.enhancedLogger.error('Git user name/email not configured');
                return false;
            }
            return true;
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.error('Not in a Git repository or Git not configured properly');
            return false;
        }
    }
}
exports.GitAutomation = GitAutomation;
exports.gitAutomation = new GitAutomation();
//# sourceMappingURL=git-automation.js.map