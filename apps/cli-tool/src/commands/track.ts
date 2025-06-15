/**
 * @fileoverview Progress Tracking Command for Development Sessions
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { enhancedLogger as logger, ICONS } from '../utils/enhanced-logger';
import { gitAutomation } from '../lib/git-automation';

interface TrackingSession {
  id: string;
  type: 'feature' | 'bugfix' | 'refactor' | 'testing' | 'verification';
  epic?: string;
  story?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'active' | 'completed' | 'failed' | 'paused';
  progress: {
    filesModified: number;
    testsAdded: number;
    testsFixed: number;
    qualityGatesPassed: number;
    qualityGatesFailed: number;
  };
  metrics: {
    codeLines: number;
    testLines: number;
    coverage: number;
    performance: Record<string, number>;
  };
  notes: string[];
}

const SESSIONS_FILE = path.join(process.cwd(), '.dna-sessions.json');
const CURRENT_SESSION_FILE = path.join(process.cwd(), '.dna-current-session.json');

export const trackCommand = new Command('track')
  .description('Track development session progress')
  .addCommand(
    new Command('start')
      .description('Start a new tracking session')
      .option('-t, --type <type>', 'session type (feature, bugfix, refactor, testing, verification)', 'feature')
      .option('-e, --epic <epic>', 'epic identifier')
      .option('-s, --story <story>', 'story identifier')
      .option('-n, --notes <notes>', 'initial session notes')
      .action(startSession)
  )
  .addCommand(
    new Command('progress')
      .description('Update session progress')
      .option('-f, --files-modified <count>', 'number of files modified', parseInt)
      .option('-t, --tests-added <count>', 'number of tests added', parseInt)
      .option('--tests-fixed <count>', 'number of tests fixed', parseInt)
      .option('--quality-gates-status <status>', 'quality gates status (passed/failed/partial)')
      .option('-c, --coverage <percentage>', 'current test coverage', parseFloat)
      .option('-n, --notes <notes>', 'progress notes')
      .action(updateProgress)
  )
  .addCommand(
    new Command('end')
      .description('End current tracking session')
      .option('--status <status>', 'final session status (completed/failed)', 'completed')
      .option('--quality-gates-status <status>', 'final quality gates status')
      .option('-n, --notes <notes>', 'final session notes')
      .action(endSession)
  )
  .addCommand(
    new Command('status')
      .description('Show current session status')
      .action(showStatus)
  )
  .addCommand(
    new Command('history')
      .description('Show session history')
      .option('-l, --limit <count>', 'number of sessions to show', parseInt, 10)
      .option('--epic <epic>', 'filter by epic')
      .option('--story <story>', 'filter by story')
      .action(showHistory)
  )
  .addCommand(
    new Command('report')
      .description('Generate session report')
      .option('-o, --output <file>', 'output file path')
      .option('--format <format>', 'report format (json, md, html)', 'md')
      .action(generateReport)
  );

async function startSession(options: any): Promise<void> {
  try {
    // Check if there's already an active session
    const currentSession = await getCurrentSession();
    if (currentSession) {
      logger.warning(`Active session found: ${currentSession.id}`);
      logger.info('Please end the current session before starting a new one');
      return;
    }

    const session: TrackingSession = {
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
        const branchName = await gitAutomation.createFeatureBranch(session.epic, session.story);
        session.notes.push(`${new Date().toISOString()}: Auto-created branch: ${branchName}`);
        await saveCurrentSession(session);
        logger.success(`${ICONS.branch} Created feature branch: ${chalk.cyan(branchName)}`);
      } catch (error) {
        logger.debug(`Failed to create feature branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    logger.success(`${ICONS.rocket} Started tracking session: ${session.id}`);
    logger.info(`Type: ${chalk.cyan(session.type)}`);
    if (session.epic) logger.info(`Epic: ${chalk.cyan(session.epic)}`);
    if (session.story) logger.info(`Story: ${chalk.cyan(session.story)}`);
    logger.info(`Started: ${chalk.gray(new Date(session.startTime).toLocaleString())}`);

  } catch (error) {
    logger.error(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function updateProgress(options: any): Promise<void> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      logger.error('No active session found. Start a session with: dna-cli track start');
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
      } else if (options.qualityGatesStatus === 'failed') {
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
      await gitAutomation.commitProgressUpdate(session);
    } catch (error) {
      logger.debug(`Git auto-commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    logger.success(`${ICONS.check} Progress updated`);
    displaySessionProgress(session);

  } catch (error) {
    logger.error(`Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function endSession(options: any): Promise<void> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      logger.error('No active session found');
      return;
    }

    session.endTime = new Date().toISOString();
    session.duration = Date.now() - new Date(session.startTime).getTime();
    session.status = options.status === 'failed' ? 'failed' : 'completed';

    if (options.qualityGatesStatus) {
      if (options.qualityGatesStatus === 'passed') {
        session.progress.qualityGatesPassed++;
      } else if (options.qualityGatesStatus === 'failed') {
        session.progress.qualityGatesFailed++;
      }
    }

    if (options.notes) {
      session.notes.push(`${new Date().toISOString()}: ${options.notes}`);
    }

    // Trigger feature completion commit if session completed successfully
    if (session.status === 'completed') {
      try {
        await gitAutomation.commitFeatureCompletion(session);
      } catch (error) {
        logger.debug(`Git feature completion commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update session in history
    await updateSessionInHistory(session);
    
    // Clear current session
    await fs.remove(CURRENT_SESSION_FILE);

    logger.success(`${ICONS.check} Session completed: ${session.id}`);
    displaySessionSummary(session);

  } catch (error) {
    logger.error(`Failed to end session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function showStatus(): Promise<void> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      logger.info('No active session');
      return;
    }

    logger.box([
      chalk.bold.cyan('Current Session Status'),
      '',
      `${chalk.bold('Session:')} ${session.id}`,
      `${chalk.bold('Type:')} ${session.type}`,
      session.epic ? `${chalk.bold('Epic:')} ${session.epic}` : '',
      session.story ? `${chalk.bold('Story:')} ${session.story}` : '',
      `${chalk.bold('Started:')} ${new Date(session.startTime).toLocaleString()}`,
      `${chalk.bold('Duration:')} ${formatDuration(Date.now() - new Date(session.startTime).getTime())}`,
      '',
      chalk.bold('Progress:'),
      `  Files modified: ${session.progress.filesModified}`,
      `  Tests added: ${session.progress.testsAdded}`,
      `  Tests fixed: ${session.progress.testsFixed}`,
      `  Quality gates passed: ${session.progress.qualityGatesPassed}`,
      `  Quality gates failed: ${session.progress.qualityGatesFailed}`,
      '',
      chalk.bold('Metrics:'),
      `  Coverage: ${session.metrics.coverage}%`,
      `  Code lines: ${session.metrics.codeLines}`,
      `  Test lines: ${session.metrics.testLines}`,
      '',
      session.notes.length > 0 ? chalk.bold('Recent Notes:') : '',
      ...session.notes.slice(-3).map(note => `  ${chalk.gray(note)}`)
    ].filter(line => line !== ''), {
      borderColor: 'cyan',
      borderStyle: 'round'
    });

  } catch (error) {
    logger.error(`Failed to show status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function showHistory(options: any): Promise<void> {
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
      logger.info('No sessions found');
      return;
    }

    logger.info(`${chalk.bold('Session History')} (${filteredSessions.length} sessions)`);
    logger.newline();

    for (const session of filteredSessions) {
      const statusIcon = session.status === 'completed' ? chalk.green(ICONS.check) :
                        session.status === 'failed' ? chalk.red(ICONS.cross) :
                        chalk.yellow(ICONS.clock);
      
      const durationText = session.duration ? formatDuration(session.duration) : 'In progress';
      
      logger.info(`${statusIcon} ${chalk.bold(session.id)} (${session.type})`);
      logger.info(`   ${chalk.gray(session.epic || 'No epic')} → ${chalk.gray(session.story || 'No story')}`);
      logger.info(`   ${chalk.gray(new Date(session.startTime).toLocaleDateString())} - ${chalk.gray(durationText)}`);
      logger.info(`   Files: ${session.progress.filesModified}, Tests: ${session.progress.testsAdded}, Coverage: ${session.metrics.coverage}%`);
      logger.newline();
    }

  } catch (error) {
    logger.error(`Failed to show history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateReport(options: any): Promise<void> {
  try {
    const sessions = await getSessionHistory();
    
    if (sessions.length === 0) {
      logger.info('No sessions to report');
      return;
    }

    const report = generateSessionReport(sessions, options.format);
    
    if (options.output) {
      await fs.writeFile(options.output, report);
      logger.success(`Report saved to: ${options.output}`);
    } else {
      console.log(report);
    }

  } catch (error) {
    logger.error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions

async function getCurrentSession(): Promise<TrackingSession | null> {
  try {
    if (await fs.pathExists(CURRENT_SESSION_FILE)) {
      return await fs.readJSON(CURRENT_SESSION_FILE);
    }
  } catch (error) {
    // File doesn't exist or is corrupted
  }
  return null;
}

async function saveCurrentSession(session: TrackingSession): Promise<void> {
  await fs.writeJSON(CURRENT_SESSION_FILE, session, { spaces: 2 });
}

async function getSessionHistory(): Promise<TrackingSession[]> {
  try {
    if (await fs.pathExists(SESSIONS_FILE)) {
      return await fs.readJSON(SESSIONS_FILE);
    }
  } catch (error) {
    // File doesn't exist or is corrupted
  }
  return [];
}

async function addToSessionHistory(session: TrackingSession): Promise<void> {
  const sessions = await getSessionHistory();
  sessions.push(session);
  await fs.writeJSON(SESSIONS_FILE, sessions, { spaces: 2 });
}

async function updateSessionInHistory(updatedSession: TrackingSession): Promise<void> {
  const sessions = await getSessionHistory();
  const index = sessions.findIndex(s => s.id === updatedSession.id);
  if (index >= 0) {
    sessions[index] = updatedSession;
    await fs.writeJSON(SESSIONS_FILE, sessions, { spaces: 2 });
  }
}

function generateSessionId(): string {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function displaySessionProgress(session: TrackingSession): void {
  const progress = [
    `Files: ${session.progress.filesModified}`,
    `Tests: ${session.progress.testsAdded}`,
    `Coverage: ${session.metrics.coverage}%`,
    `Quality Gates: ${session.progress.qualityGatesPassed}/${session.progress.qualityGatesPassed + session.progress.qualityGatesFailed}`
  ];
  
  logger.info(`Progress: ${progress.join(' | ')}`);
}

function displaySessionSummary(session: TrackingSession): void {
  const summary = [
    chalk.bold('Session Summary'),
    '',
    `Duration: ${session.duration ? formatDuration(session.duration) : 'Unknown'}`,
    `Files Modified: ${session.progress.filesModified}`,
    `Tests Added: ${session.progress.testsAdded}`,
    `Tests Fixed: ${session.progress.testsFixed}`,
    `Quality Gates Passed: ${session.progress.qualityGatesPassed}`,
    `Quality Gates Failed: ${session.progress.qualityGatesFailed}`,
    `Final Coverage: ${session.metrics.coverage}%`,
    `Status: ${session.status === 'completed' ? chalk.green('✓ Completed') : chalk.red('✗ Failed')}`
  ];
  
  logger.box(summary, {
    borderColor: session.status === 'completed' ? 'green' : 'red',
    borderStyle: 'round'
  });
}

function generateSessionReport(sessions: TrackingSession[], format: string): string {
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