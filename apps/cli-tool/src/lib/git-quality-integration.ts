/**
 * @fileoverview Integration between Git Automation and Quality Gates
 * Automatically commits when quality gates pass and manages quality-driven workflow
 */

import { gitAutomation } from './git-automation';
import { QualityGateResult } from '@starter-template-dna/testing';
import { enhancedLogger as logger, ICONS } from '../utils/enhanced-logger';
import fs from 'fs-extra';
import path from 'path';

export interface QualityCommitOptions {
  sessionData: any;
  qualityResults: QualityGateResult;
  testResults?: any[];
  coverageReport?: any;
}

export class GitQualityIntegration {
  private async getCurrentSession(): Promise<any> {
    try {
      const sessionFile = path.join(process.cwd(), '.dna-current-session.json');
      if (fs.existsSync(sessionFile)) {
        return fs.readJsonSync(sessionFile);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Commit based on quality gate results
   */
  async commitQualityUpdate(options: QualityCommitOptions): Promise<boolean> {
    const { sessionData, qualityResults, testResults, coverageReport } = options;

    try {
      // Update session with quality metrics
      const updatedSession = await this.updateSessionWithQuality(sessionData, qualityResults);

      if (qualityResults.passed) {
        // Quality gates passed - commit with success
        logger.success(`${ICONS.check} Quality gates passed - triggering auto-commit`);
        
        const success = await gitAutomation.commitTestUpdate(updatedSession);
        
        if (success) {
          logger.success(`${ICONS.git} Committed quality improvements`);
          return true;
        }
      } else {
        // Quality gates failed - create commit with remediation plan
        logger.warning(`${ICONS.warning} Quality gates failed - creating remediation commit`);
        
        const remediationPlan = this.generateRemediationPlan(qualityResults);
        
        const success = await gitAutomation.commitRefactoring(
          updatedSession,
          `Quality gate failures - ${remediationPlan.summary}`
        );

        if (success) {
          logger.info(`${ICONS.git} Committed work in progress with quality issues`);
          logger.info('Remediation plan:');
          remediationPlan.actions.forEach((action, index) => {
            logger.info(`  ${index + 1}. ${action}`);
          });
          return true;
        }
      }

      return false;

    } catch (error) {
      logger.error(`Quality-driven commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Auto-commit on test success with quality validation
   */
  async autoCommitOnTestSuccess(testResults: any[]): Promise<boolean> {
    const sessionData = await this.getCurrentSession();
    if (!sessionData) {
      logger.debug('No active session for auto-commit');
      return false;
    }

    try {
      // Calculate test metrics
      const testsAdded = testResults.filter(r => r.status === 'passed').length;
      const coverage = this.calculateCoverage(testResults);

      // Update session progress
      sessionData.progress.testsAdded += testsAdded;
      sessionData.metrics.coverage = coverage;
      sessionData.progress.qualityGatesPassed++;

      // Save updated session
      const sessionFile = path.join(process.cwd(), '.dna-current-session.json');
      await fs.writeJson(sessionFile, sessionData, { spaces: 2 });

      // Trigger auto-commit
      const success = await gitAutomation.commitTestUpdate(sessionData);
      
      if (success) {
        logger.success(`${ICONS.check} Auto-committed test improvements`);
        return true;
      }

      return false;

    } catch (error) {
      logger.debug(`Auto-commit on test success failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Create branch for quality remediation
   */
  async createQualityBranch(qualityResults: QualityGateResult): Promise<string | null> {
    const sessionData = await this.getCurrentSession();
    if (!sessionData || !sessionData.epic || !sessionData.story) {
      logger.warning('Cannot create quality branch - no active session with epic/story');
      return null;
    }

    try {
      const branchSuffix = 'quality-fix';
      const branchName = await gitAutomation.createFeatureBranch(
        sessionData.epic,
        `${sessionData.story}-${branchSuffix}`
      );

      logger.success(`${ICONS.branch} Created quality remediation branch: ${branchName}`);
      return branchName;

    } catch (error) {
      logger.error(`Failed to create quality branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Pre-commit quality validation
   */
  async validateBeforeCommit(): Promise<{ canCommit: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if there are uncommitted test files
      const hasTestFiles = await this.hasUncommittedTestFiles();
      if (!hasTestFiles) {
        issues.push('No test files found in staged changes');
      }

      // Check basic quality indicators
      const sessionData = await this.getCurrentSession();
      if (sessionData) {
        if (sessionData.metrics.coverage < 80) {
          issues.push(`Coverage below threshold: ${sessionData.metrics.coverage}% < 80%`);
        }

        if (sessionData.progress.qualityGatesFailed > sessionData.progress.qualityGatesPassed) {
          issues.push('More quality gates failed than passed');
        }
      }

      return {
        canCommit: issues.length === 0,
        issues
      };

    } catch (error) {
      return {
        canCommit: false,
        issues: [`Pre-commit validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async updateSessionWithQuality(sessionData: any, qualityResults: QualityGateResult): Promise<any> {
    const updatedSession = { ...sessionData };

    // Update quality metrics
    if (qualityResults.passed) {
      updatedSession.progress.qualityGatesPassed++;
    } else {
      updatedSession.progress.qualityGatesFailed++;
    }

    // Update coverage if available
    if (qualityResults.score !== undefined) {
      updatedSession.metrics.coverage = qualityResults.score;
    }

    // Add quality notes
    const qualityNote = qualityResults.passed 
      ? `Quality gates passed (${qualityResults.score}% score)`
      : `Quality gates failed: ${qualityResults.failures.length} issues`;
    
    updatedSession.notes.push(`${new Date().toISOString()}: ${qualityNote}`);

    // Save updated session
    const sessionFile = path.join(process.cwd(), '.dna-current-session.json');
    await fs.writeJson(sessionFile, updatedSession, { spaces: 2 });

    return updatedSession;
  }

  private generateRemediationPlan(qualityResults: QualityGateResult): { summary: string; actions: string[] } {
    const actions: string[] = [];
    const failureTypes = new Set<string>();

    qualityResults.failures.forEach(failure => {
      failureTypes.add(failure.gate);
      
      switch (failure.gate) {
        case 'coverage':
          actions.push(`Increase test coverage (current: ${failure.actual}, required: ${failure.expected})`);
          break;
        case 'security':
          actions.push(`Fix security vulnerabilities: ${failure.message}`);
          break;
        case 'performance':
          actions.push(`Optimize performance: ${failure.message}`);
          break;
        case 'accessibility':
          actions.push(`Fix accessibility issues: ${failure.message}`);
          break;
        case 'technicalDebt':
          actions.push(`Reduce technical debt: ${failure.message}`);
          break;
        default:
          actions.push(`Address ${failure.gate} issue: ${failure.message}`);
      }
    });

    const summary = `${failureTypes.size} quality gate(s) failed`;
    
    return { summary, actions };
  }

  private calculateCoverage(testResults: any[]): number {
    // Simple coverage calculation - in real implementation would use coverage reports
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    
    if (totalTests === 0) return 0;
    return Math.round((passedTests / totalTests) * 100);
  }

  private async hasUncommittedTestFiles(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      const status = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      const stagedFiles = status.split('\n').filter(Boolean);
      
      return stagedFiles.some(file => 
        file.includes('.test.') || 
        file.includes('.spec.') || 
        file.includes('/test/') ||
        file.includes('/tests/')
      );
    } catch {
      return false;
    }
  }
}

export const gitQualityIntegration = new GitQualityIntegration();