"use strict";
/**
 * @fileoverview Progress Tracking Command for Development Sessions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackCommand = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
const enhanced_logger_1 = require("../utils/enhanced-logger");
const workspace_adapter_1 = require("../adapters/workspace-adapter");
const SESSIONS_FILE = path_1.default.join(process.cwd(), '.dna-sessions.json');
const CURRENT_SESSION_FILE = path_1.default.join(process.cwd(), '.dna-current-session.json');
// Initialize Git automation system
const gitAutomation = new workspace_adapter_1.GitAutomationSystem({
    autoCommit: true,
    pushRemote: false,
    requireTests: false,
    conventionalCommits: true
});
exports.trackCommand = new commander_1.Command('track')
    .description('Track development session progress')
    .addCommand(new commander_1.Command('start')
    .description('Start a new tracking session')
    .option('-t, --type <type>', 'session type (feature, bugfix, refactor, testing, verification)', 'feature')
    .option('-e, --epic <epic>', 'epic identifier')
    .option('-s, --story <story>', 'story identifier')
    .option('-n, --notes <notes>', 'initial session notes')
    .action(startSession))
    .addCommand(new commander_1.Command('progress')
    .description('Update session progress')
    .option('-f, --files-modified <count>', 'number of files modified', parseInt)
    .option('-t, --tests-added <count>', 'number of tests added', parseInt)
    .option('--tests-fixed <count>', 'number of tests fixed', parseInt)
    .option('--quality-gates-status <status>', 'quality gates status (passed/failed/partial)')
    .option('-c, --coverage <percentage>', 'current test coverage', parseFloat)
    .option('-n, --notes <notes>', 'progress notes')
    .action(updateProgress))
    .addCommand(new commander_1.Command('end')
    .description('End current tracking session')
    .option('--status <status>', 'final session status (completed/failed)', 'completed')
    .option('--quality-gates-status <status>', 'final quality gates status')
    .option('-n, --notes <notes>', 'final session notes')
    .action(endSession))
    .addCommand(new commander_1.Command('status')
    .description('Show current session status')
    .action(showStatus))
    .addCommand(new commander_1.Command('history')
    .description('Show session history')
    .option('-l, --limit <count>', 'number of sessions to show', parseInt, 10)
    .option('--epic <epic>', 'filter by epic')
    .option('--story <story>', 'filter by story')
    .action(showHistory))
    .addCommand(new commander_1.Command('report')
    .description('Generate session report')
    .option('-o, --output <file>', 'output file path')
    .option('--format <format>', 'report format (json, md, html)', 'md')
    .action(generateReport));
async function startSession(options) {
    try {
        // Check if there's already an active session
        const currentSession = await getCurrentSession();
        if (currentSession) {
            enhanced_logger_1.enhancedLogger.warn(`Active session found: ${currentSession.id}`);
            enhanced_logger_1.enhancedLogger.info('Please end the current session before starting a new one');
            return;
        }
        const session = {
            id: generateSessionId(),
            type: options.type,
            epic: options.epic,
            story: options.story,
            startTime: new Date().toISOString(),
            status: 'active',
            progress: {
                filesModified: 0,
                testsAdded: 0,
                testsFixed: 0,
                qualityGatesPassed: 0,
                qualityGatesFailed: 0
            },
            metrics: {
                codeLines: 0,
                testLines: 0,
                coverage: 0,
                performance: {}
            },
            notes: options.notes ? [options.notes] : []
        };
        await saveCurrentSession(session);
        await addToSessionHistory(session);
        // Auto-create feature branch if epic and story are provided
        if (session.epic && session.story) {
            try {
                const branchResult = await gitAutomation.createFeatureBranch(session.story, session.epic);
                if (branchResult.success && branchResult.branchName) {
                    session.notes.push(`${new Date().toISOString()}: Auto-created branch: ${branchResult.branchName}`);
                    await saveCurrentSession(session);
                    enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.branch} Created feature branch: ${chalk_compat_1.default.cyan(branchResult.branchName)}`);
                }
                else {
                    enhanced_logger_1.enhancedLogger.debug(`Failed to create feature branch: ${branchResult.error}`);
                }
            }
            catch (error) {
                enhanced_logger_1.enhancedLogger.debug(`Failed to create feature branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.rocket} Started tracking session: ${session.id}`);
        enhanced_logger_1.enhancedLogger.info(`Type: ${chalk_compat_1.default.cyan(session.type)}`);
        if (session.epic)
            enhanced_logger_1.enhancedLogger.info(`Epic: ${chalk_compat_1.default.cyan(session.epic)}`);
        if (session.story)
            enhanced_logger_1.enhancedLogger.info(`Story: ${chalk_compat_1.default.cyan(session.story)}`);
        enhanced_logger_1.enhancedLogger.info(`Started: ${chalk_compat_1.default.gray(new Date(session.startTime).toLocaleString())}`);
    }
    catch (error) {
        enhanced_logger_1.enhancedLogger.error(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function updateProgress(options) {
    try {
        const session = await getCurrentSession();
        if (!session) {
            enhanced_logger_1.enhancedLogger.error('No active session found. Start a session with: dna-cli track start');
            return;
        }
        // Update progress
        if (options.filesModified !== undefined) {
            session.progress.filesModified += options.filesModified;
        }
        if (options.testsAdded !== undefined) {
            session.progress.testsAdded += options.testsAdded;
        }
        if (options.testsFixed !== undefined) {
            session.progress.testsFixed += options.testsFixed;
        }
        if (options.qualityGatesStatus) {
            if (options.qualityGatesStatus === 'passed') {
                session.progress.qualityGatesPassed++;
            }
            else if (options.qualityGatesStatus === 'failed') {
                session.progress.qualityGatesFailed++;
            }
        }
        if (options.coverage !== undefined) {
            session.metrics.coverage = options.coverage;
        }
        if (options.notes) {
            session.notes.push(`${new Date().toISOString()}: ${options.notes}`);
        }
        await saveCurrentSession(session);
        // Trigger auto-commit if configured
        try {
            const message = `chore: update session progress - ${session.progress.filesModified} files, ${session.progress.testsAdded} tests`;
            const commitResult = await gitAutomation.commit(message, { all: true });
            if (!commitResult.success) {
                enhanced_logger_1.enhancedLogger.debug(`Git auto-commit failed: ${commitResult.error}`);
            }
        }
        catch (error) {
            enhanced_logger_1.enhancedLogger.debug(`Git auto-commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.check} Progress updated`);
        displaySessionProgress(session);
    }
    catch (error) {
        enhanced_logger_1.enhancedLogger.error(`Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function endSession(options) {
    try {
        const session = await getCurrentSession();
        if (!session) {
            enhanced_logger_1.enhancedLogger.error('No active session found');
            return;
        }
        session.endTime = new Date().toISOString();
        session.duration = Date.now() - new Date(session.startTime).getTime();
        session.status = options.status === 'failed' ? 'failed' : 'completed';
        if (options.qualityGatesStatus) {
            if (options.qualityGatesStatus === 'passed') {
                session.progress.qualityGatesPassed++;
            }
            else if (options.qualityGatesStatus === 'failed') {
                session.progress.qualityGatesFailed++;
            }
        }
        if (options.notes) {
            session.notes.push(`${new Date().toISOString()}: ${options.notes}`);
        }
        // Trigger feature completion commit if session completed successfully
        if (session.status === 'completed') {
            try {
                const message = `feat: complete ${session.type} ${session.epic ? session.epic + '/' : ''}${session.story || session.id}

- Files modified: ${session.progress.filesModified}
- Tests added: ${session.progress.testsAdded}
- Coverage: ${session.metrics.coverage}%
- Quality gates passed: ${session.progress.qualityGatesPassed}`;
                const commitResult = await gitAutomation.commit(message, { all: true });
                if (!commitResult.success) {
                    enhanced_logger_1.enhancedLogger.debug(`Git feature completion commit failed: ${commitResult.error}`);
                }
            }
            catch (error) {
                enhanced_logger_1.enhancedLogger.debug(`Git feature completion commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        // Update session in history
        await updateSessionInHistory(session);
        // Clear current session
        await fs_extra_1.default.remove(CURRENT_SESSION_FILE);
        enhanced_logger_1.enhancedLogger.success(`${enhanced_logger_1.ICONS.check} Session completed: ${session.id}`);
        displaySessionSummary(session);
    }
    catch (error) {
        enhanced_logger_1.enhancedLogger.error(`Failed to end session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function showStatus() {
    try {
        const session = await getCurrentSession();
        if (!session) {
            enhanced_logger_1.enhancedLogger.info('No active session');
            return;
        }
        enhanced_logger_1.enhancedLogger.box([
            chalk_compat_1.default.bold.cyan('Current Session Status'),
            '',
            `${chalk_compat_1.default.bold('Session:')} ${session.id}`,
            `${chalk_compat_1.default.bold('Type:')} ${session.type}`,
            session.epic ? `${chalk_compat_1.default.bold('Epic:')} ${session.epic}` : '',
            session.story ? `${chalk_compat_1.default.bold('Story:')} ${session.story}` : '',
            `${chalk_compat_1.default.bold('Started:')} ${new Date(session.startTime).toLocaleString()}`,
            `${chalk_compat_1.default.bold('Duration:')} ${formatDuration(Date.now() - new Date(session.startTime).getTime())}`,
            '',
            chalk_compat_1.default.bold('Progress:'),
            `  Files modified: ${session.progress.filesModified}`,
            `  Tests added: ${session.progress.testsAdded}`,
            `  Tests fixed: ${session.progress.testsFixed}`,
            `  Quality gates passed: ${session.progress.qualityGatesPassed}`,
            `  Quality gates failed: ${session.progress.qualityGatesFailed}`,
            '',
            chalk_compat_1.default.bold('Metrics:'),
            `  Coverage: ${session.metrics.coverage}%`,
            `  Code lines: ${session.metrics.codeLines}`,
            `  Test lines: ${session.metrics.testLines}`,
            '',
            session.notes.length > 0 ? chalk_compat_1.default.bold('Recent Notes:') : '',
            ...session.notes.slice(-3).map(note => `  ${chalk_compat_1.default.gray(note)}`)
        ].filter(line => line !== ''), {
            borderColor: 'cyan',
            borderStyle: 'round'
        });
    }
    catch (error) {
        enhanced_logger_1.enhancedLogger.error(`Failed to show status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function showHistory(options) {
    try {
        const sessions = await getSessionHistory();
        let filteredSessions = sessions;
        // Apply filters
        if (options.epic) {
            filteredSessions = filteredSessions.filter(s => s.epic === options.epic);
        }
        if (options.story) {
            filteredSessions = filteredSessions.filter(s => s.story === options.story);
        }
        // Limit results
        filteredSessions = filteredSessions.slice(0, options.limit);
        if (filteredSessions.length === 0) {
            enhanced_logger_1.enhancedLogger.info('No sessions found');
            return;
        }
        enhanced_logger_1.enhancedLogger.info(`${chalk_compat_1.default.bold('Session History')} (${filteredSessions.length} sessions)`);
        enhanced_logger_1.enhancedLogger.newline();
        for (const session of filteredSessions) {
            const statusIcon = session.status === 'completed' ? chalk_compat_1.default.green(enhanced_logger_1.ICONS.check) :
                session.status === 'failed' ? chalk_compat_1.default.red(enhanced_logger_1.ICONS.cross) :
                    chalk_compat_1.default.yellow(enhanced_logger_1.ICONS.clock);
            const durationText = session.duration ? formatDuration(session.duration) : 'In progress';
            enhanced_logger_1.enhancedLogger.info(`${statusIcon} ${chalk_compat_1.default.bold(session.id)} (${session.type})`);
            enhanced_logger_1.enhancedLogger.info(`   ${chalk_compat_1.default.gray(session.epic || 'No epic')} → ${chalk_compat_1.default.gray(session.story || 'No story')}`);
            enhanced_logger_1.enhancedLogger.info(`   ${chalk_compat_1.default.gray(new Date(session.startTime).toLocaleDateString())} - ${chalk_compat_1.default.gray(durationText)}`);
            enhanced_logger_1.enhancedLogger.info(`   Files: ${session.progress.filesModified}, Tests: ${session.progress.testsAdded}, Coverage: ${session.metrics.coverage}%`);
            enhanced_logger_1.enhancedLogger.newline();
        }
    }
    catch (error) {
        enhanced_logger_1.enhancedLogger.error(`Failed to show history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function generateReport(options) {
    try {
        const sessions = await getSessionHistory();
        if (sessions.length === 0) {
            enhanced_logger_1.enhancedLogger.info('No sessions to report');
            return;
        }
        const report = generateSessionReport(sessions, options.format);
        if (options.output) {
            await fs_extra_1.default.writeFile(options.output, report);
            enhanced_logger_1.enhancedLogger.success(`Report saved to: ${options.output}`);
        }
        else {
            console.log(report);
        }
    }
    catch (error) {
        enhanced_logger_1.enhancedLogger.error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
// Helper functions
async function getCurrentSession() {
    try {
        if (await fs_extra_1.default.pathExists(CURRENT_SESSION_FILE)) {
            return await fs_extra_1.default.readJSON(CURRENT_SESSION_FILE);
        }
    }
    catch (error) {
        // File doesn't exist or is corrupted
    }
    return null;
}
async function saveCurrentSession(session) {
    await fs_extra_1.default.writeJSON(CURRENT_SESSION_FILE, session, { spaces: 2 });
}
async function getSessionHistory() {
    try {
        if (await fs_extra_1.default.pathExists(SESSIONS_FILE)) {
            return await fs_extra_1.default.readJSON(SESSIONS_FILE);
        }
    }
    catch (error) {
        // File doesn't exist or is corrupted
    }
    return [];
}
async function addToSessionHistory(session) {
    const sessions = await getSessionHistory();
    sessions.push(session);
    await fs_extra_1.default.writeJSON(SESSIONS_FILE, sessions, { spaces: 2 });
}
async function updateSessionInHistory(updatedSession) {
    const sessions = await getSessionHistory();
    const index = sessions.findIndex(s => s.id === updatedSession.id);
    if (index >= 0) {
        sessions[index] = updatedSession;
        await fs_extra_1.default.writeJSON(SESSIONS_FILE, sessions, { spaces: 2 });
    }
}
function generateSessionId() {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
}
function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    else {
        return `${seconds}s`;
    }
}
function displaySessionProgress(session) {
    const progress = [
        `Files: ${session.progress.filesModified}`,
        `Tests: ${session.progress.testsAdded}`,
        `Coverage: ${session.metrics.coverage}%`,
        `Quality Gates: ${session.progress.qualityGatesPassed}/${session.progress.qualityGatesPassed + session.progress.qualityGatesFailed}`
    ];
    enhanced_logger_1.enhancedLogger.info(`Progress: ${progress.join(' | ')}`);
}
function displaySessionSummary(session) {
    const summary = [
        chalk_compat_1.default.bold('Session Summary'),
        '',
        `Duration: ${session.duration ? formatDuration(session.duration) : 'Unknown'}`,
        `Files Modified: ${session.progress.filesModified}`,
        `Tests Added: ${session.progress.testsAdded}`,
        `Tests Fixed: ${session.progress.testsFixed}`,
        `Quality Gates Passed: ${session.progress.qualityGatesPassed}`,
        `Quality Gates Failed: ${session.progress.qualityGatesFailed}`,
        `Final Coverage: ${session.metrics.coverage}%`,
        `Status: ${session.status === 'completed' ? chalk_compat_1.default.green('✓ Completed') : chalk_compat_1.default.red('✗ Failed')}`
    ];
    enhanced_logger_1.enhancedLogger.box(summary, {
        borderColor: session.status === 'completed' ? 'green' : 'red',
        borderStyle: 'round'
    });
}
function generateSessionReport(sessions, format) {
    if (format === 'json') {
        return JSON.stringify(sessions, null, 2);
    }
    if (format === 'md') {
        let report = '# Development Session Report\n\n';
        report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
        report += '## Summary\n\n';
        report += `- Total Sessions: ${sessions.length}\n`;
        report += `- Completed: ${sessions.filter(s => s.status === 'completed').length}\n`;
        report += `- Failed: ${sessions.filter(s => s.status === 'failed').length}\n`;
        report += `- Total Duration: ${formatDuration(sessions.reduce((acc, s) => acc + (s.duration || 0), 0))}\n\n`;
        report += '## Sessions\n\n';
        for (const session of sessions) {
            report += `### ${session.id} (${session.type})\n\n`;
            report += `- **Epic**: ${session.epic || 'N/A'}\n`;
            report += `- **Story**: ${session.story || 'N/A'}\n`;
            report += `- **Duration**: ${session.duration ? formatDuration(session.duration) : 'In progress'}\n`;
            report += `- **Status**: ${session.status}\n`;
            report += `- **Files Modified**: ${session.progress.filesModified}\n`;
            report += `- **Tests Added**: ${session.progress.testsAdded}\n`;
            report += `- **Coverage**: ${session.metrics.coverage}%\n\n`;
        }
        return report;
    }
    return 'Unsupported format';
}
//# sourceMappingURL=track.js.map