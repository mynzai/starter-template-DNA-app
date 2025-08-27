"use strict";
/**
 * @fileoverview Git Validation and Rollback System
 * Provides validation hooks and rollback capabilities for Git automation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitValidation = exports.GitValidation = void 0;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const enhanced_logger_1 = require("../utils/enhanced-logger");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const DEFAULT_VALIDATION_CONFIG = {
    preCommitValidation: true,
    requireTests: false,
    requireCoverage: false,
    minCoverageThreshold: 80,
    requireLinting: true,
    requireTypeCheck: true,
    maxCommitSize: 50, // 50MB
    blockedFiles: [
        '.env',
        '.env.local',
        '.env.production',
        '*.key',
        '*.pem',
        'node_modules/**',
        '.git/**'
    ],
    allowedCommitTypes: [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'test', 'chore', 'perf', 'ci', 'build', 'revert'
    ]
};
class GitValidation {
    constructor(config) {
        this.rollbackPoints = [];
        this.rollbackFile = path_1.default.join(process.cwd(), '.dna-git-rollback.json');
        this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
        this.loadRollbackPoints();
    }
    /**
     * Validate before commit
     */
    async validatePreCommit() {
        const errors = [];
        const warnings = [];
        try {
            // Check if there are staged changes
            const stagedFiles = this.getStagedFiles();
            if (stagedFiles.length === 0) {
                errors.push('No staged files found');
                return { passed: false, errors, warnings, canProceed: false };
            }
            // Validate commit size
            const commitSize = await this.getCommitSize(stagedFiles);
            if (commitSize > this.config.maxCommitSize * 1024 * 1024) {
                warnings.push(`Large commit size: ${(commitSize / 1024 / 1024).toFixed(1)}MB`);
            }
            // Check for blocked files
            const blockedFiles = this.checkBlockedFiles(stagedFiles);
            if (blockedFiles.length > 0) {
                errors.push(`Blocked files detected: ${blockedFiles.join(', ')}`);
            }
            // Validate tests if required
            if (this.config.requireTests) {
                const hasTests = this.hasTestFiles(stagedFiles);
                if (!hasTests) {
                    errors.push('Tests required but no test files found in staged changes');
                }
            }
            // Run linting if required
            if (this.config.requireLinting) {
                const lintResult = await this.runLinting();
                if (!lintResult.passed) {
                    errors.push('Linting failed');
                    errors.push(...lintResult.errors);
                }
            }
            // Run type checking if required
            if (this.config.requireTypeCheck) {
                const typeCheckResult = await this.runTypeCheck();
                if (!typeCheckResult.passed) {
                    errors.push('Type checking failed');
                    errors.push(...typeCheckResult.errors);
                }
            }
            // Check coverage if required
            if (this.config.requireCoverage) {
                const coverage = await this.getCoverage();
                if (coverage < this.config.minCoverageThreshold) {
                    errors.push(`Coverage below threshold: ${coverage}% < ${this.config.minCoverageThreshold}%`);
                }
            }
            const passed = errors.length === 0;
            const canProceed = passed || warnings.length > 0;
            return { passed, errors, warnings, canProceed };
        }
        catch (error) {
            errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { passed: false, errors, warnings, canProceed: false };
        }
    }
    /**
     * Create rollback point before making changes
     */
    async createRollbackPoint(sessionId) {
        try {
            const rollbackId = `rollback-${Date.now()}`;
            const currentBranch = this.getCurrentBranch();
            const currentCommit = this.getCurrentCommit();
            const stagedFiles = this.getStagedFiles();
            const rollbackPoint = {
                id: rollbackId,
                timestamp: new Date().toISOString(),
                branch: currentBranch,
                commit: currentCommit,
                message: `Rollback point before automation at ${new Date().toLocaleString()}`,
                sessionId,
                files: stagedFiles
            };
            this.rollbackPoints.push(rollbackPoint);
            await this.saveRollbackPoints();
            enhanced_logger_1.enhancedLogger.debug(`Created rollback point: ${rollbackId}`);
            return rollbackId;
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.error(`Failed to create rollback point: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    /**
     * Rollback to a specific point
     */
    async rollback(rollbackId) {
        try {
            const rollbackPoint = this.rollbackPoints.find(rp => rp.id === rollbackId);
            if (!rollbackPoint) {
                enhanced_logger_1.enhancedLogger.error(`Rollback point not found: ${rollbackId}`);
                return false;
            }
            enhanced_logger_1.enhancedLogger.info(`${enhanced_logger_1.ICONS.warning} Rolling back to: ${rollbackPoint.message}`);
            // Reset to the commit
            (0, child_process_1.execSync)(`git reset --hard ${rollbackPoint.commit}`, { stdio: 'inherit' });
            // Checkout the original branch if different
            const currentBranch = this.getCurrentBranch();
            if (currentBranch !== rollbackPoint.branch) {
                (0, child_process_1.execSync)(`git checkout ${rollbackPoint.branch}`, { stdio: 'inherit' });
            }
            enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.check} Rollback completed successfully`);
            return true;
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    /**
     * Validate commit message format
     */
    validateCommitMessage(message) {
        const errors = [];
        const warnings = [];
        // Check conventional commit format if enabled
        const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+/;
        if (!conventionalPattern.test(message)) {
            const firstLine = message.split('\n')[0];
            const type = firstLine.split(':')[0].split('(')[0];
            if (!this.config.allowedCommitTypes.includes(type)) {
                errors.push(`Invalid commit type: ${type}. Allowed: ${this.config.allowedCommitTypes.join(', ')}`);
            }
        }
        // Check message length
        const firstLine = message.split('\n')[0];
        if (firstLine.length > 72) {
            warnings.push('Commit message first line is longer than 72 characters');
        }
        if (firstLine.length < 10) {
            warnings.push('Commit message is very short');
        }
        const passed = errors.length === 0;
        return { passed, errors, warnings, canProceed: passed };
    }
    /**
     * Get list of rollback points
     */
    getRollbackPoints() {
        return [...this.rollbackPoints];
    }
    /**
     * Clean up old rollback points
     */
    async cleanupRollbackPoints(olderThanDays = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        this.rollbackPoints = this.rollbackPoints.filter(rp => {
            return new Date(rp.timestamp) > cutoffDate;
        });
        await this.saveRollbackPoints();
        enhanced_logger_1.enhancedLogger.debug(`Cleaned up rollback points older than ${olderThanDays} days`);
    }
    getStagedFiles() {
        try {
            const output = (0, child_process_1.execSync)('git diff --cached --name-only', { encoding: 'utf8' });
            return output.split('\n').filter(Boolean);
        }
        catch {
            return [];
        }
    }
    async getCommitSize(files) {
        let totalSize = 0;
        for (const file of files) {
            try {
                if (await fs_extra_1.default.pathExists(file)) {
                    const stats = await fs_extra_1.default.stat(file);
                    totalSize += stats.size;
                }
            }
            catch {
                // File might be deleted, skip
            }
        }
        return totalSize;
    }
    checkBlockedFiles(files) {
        return files.filter(file => {
            return this.config.blockedFiles.some(pattern => {
                if (pattern.includes('*')) {
                    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                    return regex.test(file);
                }
                return file === pattern;
            });
        });
    }
    hasTestFiles(files) {
        return files.some(file => file.includes('.test.') ||
            file.includes('.spec.') ||
            file.includes('/test/') ||
            file.includes('/tests/'));
    }
    async runLinting() {
        try {
            (0, child_process_1.execSync)('npm run lint', { stdio: 'pipe' });
            return { passed: true, errors: [] };
        }
        catch (error) {
            const output = error instanceof Error ? error.message : 'Linting failed';
            return { passed: false, errors: [output] };
        }
    }
    async runTypeCheck() {
        try {
            (0, child_process_1.execSync)('npm run typecheck', { stdio: 'pipe' });
            return { passed: true, errors: [] };
        }
        catch (error) {
            const output = error instanceof Error ? error.message : 'Type checking failed';
            return { passed: false, errors: [output] };
        }
    }
    async getCoverage() {
        try {
            // This would typically parse coverage reports
            // For now, return a mock value
            return 85;
        }
        catch {
            return 0;
        }
    }
    getCurrentBranch() {
        try {
            return (0, child_process_1.execSync)('git branch --show-current', { encoding: 'utf8' }).trim();
        }
        catch {
            return 'main';
        }
    }
    getCurrentCommit() {
        try {
            return (0, child_process_1.execSync)('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        }
        catch {
            return '';
        }
    }
    async loadRollbackPoints() {
        try {
            if (await fs_extra_1.default.pathExists(this.rollbackFile)) {
                this.rollbackPoints = await fs_extra_1.default.readJson(this.rollbackFile);
            }
        }
        catch {
            this.rollbackPoints = [];
        }
    }
    async saveRollbackPoints() {
        try {
            await fs_extra_1.default.writeJson(this.rollbackFile, this.rollbackPoints, { spaces: 2 });
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.error(`Failed to save rollback points: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.GitValidation = GitValidation;
exports.gitValidation = new GitValidation();
//# sourceMappingURL=git-validation.js.map