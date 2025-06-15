/**
 * @fileoverview Git Validation and Rollback System
 * Provides validation hooks and rollback capabilities for Git automation
 */

import { execSync } from 'child_process';
import { enhancedLogger as logger, ICONS } from '../utils/enhanced-logger';
import fs from 'fs-extra';
import path from 'path';

export interface GitValidationConfig {
  preCommitValidation: boolean;
  requireTests: boolean;
  requireCoverage: boolean;
  minCoverageThreshold: number;
  requireLinting: boolean;
  requireTypeCheck: boolean;
  maxCommitSize: number; // in MB
  blockedFiles: string[];
  allowedCommitTypes: string[];
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

export interface RollbackPoint {
  id: string;
  timestamp: string;
  branch: string;
  commit: string;
  message: string;
  sessionId?: string;
  files: string[];
}

const DEFAULT_VALIDATION_CONFIG: GitValidationConfig = {
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

export class GitValidation {
  private config: GitValidationConfig;
  private rollbackPoints: RollbackPoint[] = [];
  private rollbackFile = path.join(process.cwd(), '.dna-git-rollback.json');

  constructor(config?: Partial<GitValidationConfig>) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.loadRollbackPoints();
  }

  /**
   * Validate before commit
   */
  async validatePreCommit(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { passed: false, errors, warnings, canProceed: false };
    }
  }

  /**
   * Create rollback point before making changes
   */
  async createRollbackPoint(sessionId?: string): Promise<string> {
    try {
      const rollbackId = `rollback-${Date.now()}`;
      const currentBranch = this.getCurrentBranch();
      const currentCommit = this.getCurrentCommit();
      const stagedFiles = this.getStagedFiles();

      const rollbackPoint: RollbackPoint = {
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

      logger.debug(`Created rollback point: ${rollbackId}`);
      return rollbackId;

    } catch (error) {
      logger.error(`Failed to create rollback point: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Rollback to a specific point
   */
  async rollback(rollbackId: string): Promise<boolean> {
    try {
      const rollbackPoint = this.rollbackPoints.find(rp => rp.id === rollbackId);
      if (!rollbackPoint) {
        logger.error(`Rollback point not found: ${rollbackId}`);
        return false;
      }

      logger.info(`${ICONS.warning} Rolling back to: ${rollbackPoint.message}`);

      // Reset to the commit
      execSync(`git reset --hard ${rollbackPoint.commit}`, { stdio: 'inherit' });

      // Checkout the original branch if different
      const currentBranch = this.getCurrentBranch();
      if (currentBranch !== rollbackPoint.branch) {
        execSync(`git checkout ${rollbackPoint.branch}`, { stdio: 'inherit' });
      }

      logger.success(`${ICONS.check} Rollback completed successfully`);
      return true;

    } catch (error) {
      logger.error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Validate commit message format
   */
  validateCommitMessage(message: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
  getRollbackPoints(): RollbackPoint[] {
    return [...this.rollbackPoints];
  }

  /**
   * Clean up old rollback points
   */
  async cleanupRollbackPoints(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    this.rollbackPoints = this.rollbackPoints.filter(rp => {
      return new Date(rp.timestamp) > cutoffDate;
    });

    await this.saveRollbackPoints();
    logger.debug(`Cleaned up rollback points older than ${olderThanDays} days`);
  }

  private getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      return output.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  private async getCommitSize(files: string[]): Promise<number> {
    let totalSize = 0;
    for (const file of files) {
      try {
        if (await fs.pathExists(file)) {
          const stats = await fs.stat(file);
          totalSize += stats.size;
        }
      } catch {
        // File might be deleted, skip
      }
    }
    return totalSize;
  }

  private checkBlockedFiles(files: string[]): string[] {
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

  private hasTestFiles(files: string[]): boolean {
    return files.some(file => 
      file.includes('.test.') || 
      file.includes('.spec.') || 
      file.includes('/test/') ||
      file.includes('/tests/')
    );
  }

  private async runLinting(): Promise<{ passed: boolean; errors: string[] }> {
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      return { passed: true, errors: [] };
    } catch (error) {
      const output = error instanceof Error ? error.message : 'Linting failed';
      return { passed: false, errors: [output] };
    }
  }

  private async runTypeCheck(): Promise<{ passed: boolean; errors: string[] }> {
    try {
      execSync('npm run typecheck', { stdio: 'pipe' });
      return { passed: true, errors: [] };
    } catch (error) {
      const output = error instanceof Error ? error.message : 'Type checking failed';
      return { passed: false, errors: [output] };
    }
  }

  private async getCoverage(): Promise<number> {
    try {
      // This would typically parse coverage reports
      // For now, return a mock value
      return 85;
    } catch {
      return 0;
    }
  }

  private getCurrentBranch(): string {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      return 'main';
    }
  }

  private getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  }

  private async loadRollbackPoints(): Promise<void> {
    try {
      if (await fs.pathExists(this.rollbackFile)) {
        this.rollbackPoints = await fs.readJson(this.rollbackFile);
      }
    } catch {
      this.rollbackPoints = [];
    }
  }

  private async saveRollbackPoints(): Promise<void> {
    try {
      await fs.writeJson(this.rollbackFile, this.rollbackPoints, { spaces: 2 });
    } catch (error) {
      logger.error(`Failed to save rollback points: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const gitValidation = new GitValidation();