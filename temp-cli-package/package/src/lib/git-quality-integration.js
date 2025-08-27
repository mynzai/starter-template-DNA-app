"use strict";
/**
 * @fileoverview Integration between Git Automation and Quality Gates
 * Automatically commits when quality gates pass and manages quality-driven workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitQualityIntegration = exports.GitQualityIntegration = void 0;
const tslib_1 = require("tslib");
const cli_mocks_1 = require("@starter-template-dna/cli-mocks");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
class GitQualityIntegration {
    constructor() {
        this.gitAutomation = new cli_mocks_1.GitAutomationSystem();
    }
    async getCurrentSession() {
        try {
            const sessionFile = path_1.default.join(process.cwd(), '.dna-current-session.json');
            if (fs_extra_1.default.existsSync(sessionFile)) {
                return fs_extra_1.default.readJsonSync(sessionFile);
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Commit based on quality gate results
     */
    async commitQualityUpdate(options) {
        const { sessionData, qualityResults, testResults, coverageReport } = options;
        try {
            // Update session with quality metrics
            const updatedSession = await this.updateSessionWithQuality(sessionData, qualityResults);
            if (qualityResults.passed) {
                // Quality gates passed - commit with success
                console.log('✓ Quality gates passed - triggering auto-commit');
                const result = await this.gitAutomation.commitQualityUpdate({
                    sessionData: updatedSession,
                    qualityResults,
                    testResults,
                    coverageReport
                });
                if (result.success) {
                    console.log('✓ Committed quality improvements');
                    return true;
                }
            }
            else {
                // Quality gates failed - create commit with remediation plan
                console.log('⚠ Quality gates failed - creating remediation commit');
                const remediationPlan = this.generateRemediationPlan(qualityResults);
                const result = await this.gitAutomation.commit(`Quality gate failures - ${remediationPlan.summary}`, { all: true });
                if (result.success) {
                    console.log('✓ Committed work in progress with quality issues');
                    console.log('Remediation plan:');
                    remediationPlan.actions.forEach((action, index) => {
                        console.log(`  ${index + 1}. ${action}`);
                    });
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console.error(`Quality-driven commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    /**
     * Auto-commit on test success with quality validation
     */
    async autoCommitOnTestSuccess(testResults) {
        const sessionData = await this.getCurrentSession();
        if (!sessionData) {
            console.log('No active session for auto-commit');
            return false;
        }
        try {
            // Calculate test metrics
            const testsAdded = testResults.filter(r => r.status === 'passed').length;
            const coverage = this.calculateCoverage(testResults);
            // Update session progress
            if (sessionData.progress) {
                sessionData.progress.testsAdded += testsAdded;
                sessionData.metrics.coverage = coverage;
                sessionData.progress.qualityGatesPassed++;
            }
            // Save updated session
            const sessionFile = path_1.default.join(process.cwd(), '.dna-current-session.json');
            await fs_extra_1.default.writeJson(sessionFile, sessionData, { spaces: 2 });
            // Trigger auto-commit
            const result = await this.gitAutomation.autoCommitOnTestSuccess(testResults);
            if (result.success) {
                console.log('✓ Auto-committed test improvements');
                return true;
            }
            return false;
        }
        catch (error) {
            console.log(`Auto-commit on test success failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    /**
     * Create branch for quality remediation
     */
    async createQualityBranch(qualityResults) {
        const sessionData = await this.getCurrentSession();
        if (!sessionData || !sessionData.epic || !sessionData.story) {
            console.log('Cannot create quality branch - no active session with epic/story');
            return null;
        }
        try {
            const branchSuffix = 'quality-fix';
            const branchName = `${sessionData.epic}/${sessionData.story}-${branchSuffix}`;
            const result = await this.gitAutomation.createFeatureBranch(branchName, sessionData.epic, sessionData.story);
            if (result.success) {
                console.log(`✓ Created quality remediation branch: ${result.branchName}`);
                return result.branchName || null;
            }
            return null;
        }
        catch (error) {
            console.error(`Failed to create quality branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }
    /**
     * Pre-commit quality validation
     */
    async validateBeforeCommit() {
        const issues = [];
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
        }
        catch (error) {
            return {
                canCommit: false,
                issues: [`Pre-commit validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }
    async updateSessionWithQuality(sessionData, qualityResults) {
        const updatedSession = { ...sessionData };
        // Update quality metrics
        if (qualityResults.passed) {
            updatedSession.progress.qualityGatesPassed++;
        }
        else {
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
        const sessionFile = path_1.default.join(process.cwd(), '.dna-current-session.json');
        await fs_extra_1.default.writeJson(sessionFile, updatedSession, { spaces: 2 });
        return updatedSession;
    }
    generateRemediationPlan(qualityResults) {
        const actions = [];
        const failureTypes = new Set();
        qualityResults.failures.forEach(failure => {
            failureTypes.add(failure.gate);
            switch (failure.gate) {
                case 'coverage':
                    actions.push(`Increase test coverage (current: ${failure.actual}, required: ${failure.expected})`);
                    break;
                case 'security':
                    actions.push(`Fix security vulnerabilities: ${failure.metric}`);
                    break;
                case 'performance':
                    actions.push(`Optimize performance: ${failure.metric}`);
                    break;
                case 'accessibility':
                    actions.push(`Fix accessibility issues: ${failure.metric}`);
                    break;
                case 'technicalDebt':
                    actions.push(`Reduce technical debt: ${failure.metric}`);
                    break;
                default:
                    actions.push(`Address ${failure.gate} issue: ${failure.metric}`);
            }
        });
        const summary = `${failureTypes.size} quality gate(s) failed`;
        return { summary, actions };
    }
    calculateCoverage(testResults) {
        // Simple coverage calculation - in real implementation would use coverage reports
        const totalTests = testResults.length;
        const passedTests = testResults.filter(r => r.status === 'passed').length;
        if (totalTests === 0)
            return 0;
        return Math.round((passedTests / totalTests) * 100);
    }
    async hasUncommittedTestFiles() {
        try {
            const { execSync } = await Promise.resolve().then(() => tslib_1.__importStar(require('child_process')));
            const status = execSync('git diff --cached --name-only', { encoding: 'utf8' });
            const stagedFiles = status.split('\n').filter(Boolean);
            return stagedFiles.some(file => file.includes('.test.') ||
                file.includes('.spec.') ||
                file.includes('/test/') ||
                file.includes('/tests/'));
        }
        catch {
            return false;
        }
    }
}
exports.GitQualityIntegration = GitQualityIntegration;
exports.gitQualityIntegration = new GitQualityIntegration();
//# sourceMappingURL=git-quality-integration.js.map