/**
 * @fileoverview Progress Tracker for testing sessions
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Framework } from '../types';

export interface TestingSession {
  id: string;
  type: 'testing' | 'generation' | 'validation';
  frameworks: Framework[];
  projectPath: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  metrics: TestingSessionMetrics;
  error?: string;
}

export interface TestingSessionMetrics {
  testsRun?: number;
  testsPassed?: number;
  testsFailed?: number;
  testsSkipped?: number;
  coverage?: number;
  qualityGatesPassed?: number;
  qualityGatesFailed?: number;
  generatedFiles?: number;
  executionTime?: number;
  memoryUsage?: number;
}

export interface SessionStartOptions {
  type: 'testing' | 'generation' | 'validation';
  frameworks: Framework[];
  projectPath: string;
}

export interface SessionEndOptions {
  success: boolean;
  metrics?: any;
  error?: string;
}

export class ProgressTracker {
  private sessionsDir: string;
  private currentSessions: Map<string, TestingSession> = new Map();

  constructor(sessionsDir: string = './test-sessions') {
    this.sessionsDir = sessionsDir;
  }

  /**
   * Start a new testing session
   */
  async startSession(options: SessionStartOptions): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: TestingSession = {
      id: sessionId,
      type: options.type,
      frameworks: options.frameworks,
      projectPath: options.projectPath,
      startTime: new Date(),
      status: 'running',
      metrics: {},
    };

    this.currentSessions.set(sessionId, session);
    await this.persistSession(session);

    return sessionId;
  }

  /**
   * Update an existing session
   */
  async updateSession(sessionId: string, metrics: Partial<TestingSessionMetrics>): Promise<void> {
    const session = this.currentSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.metrics = { ...session.metrics, ...metrics };
    await this.persistSession(session);
  }

  /**
   * End a testing session
   */
  async endSession(sessionId: string, options: SessionEndOptions): Promise<void> {
    const session = this.currentSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.endTime = new Date();
    session.status = options.success ? 'completed' : 'failed';
    session.metrics.executionTime = session.endTime.getTime() - session.startTime.getTime();
    
    if (options.metrics) {
      session.metrics = { ...session.metrics, ...options.metrics };
    }
    
    if (options.error) {
      session.error = options.error;
    }

    await this.persistSession(session);
    this.currentSessions.delete(sessionId);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<TestingSession | null> {
    // Check current sessions first
    const currentSession = this.currentSessions.get(sessionId);
    if (currentSession) {
      return currentSession;
    }

    // Try to load from disk
    try {
      const sessionPath = path.join(this.sessionsDir, `${sessionId}.json`);
      if (await fs.pathExists(sessionPath)) {
        const sessionData = await fs.readJson(sessionPath);
        return {
          ...sessionData,
          startTime: new Date(sessionData.startTime),
          endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined,
        };
      }
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
    }

    return null;
  }

  /**
   * Get all sessions
   */
  async getAllSessions(limit?: number): Promise<TestingSession[]> {
    const sessions: TestingSession[] = [];

    // Add current sessions
    sessions.push(...Array.from(this.currentSessions.values()));

    // Load sessions from disk
    try {
      await fs.ensureDir(this.sessionsDir);
      const files = await fs.readdir(this.sessionsDir);
      const sessionFiles = files.filter(file => file.endsWith('.json'));

      for (const file of sessionFiles) {
        const sessionId = path.basename(file, '.json');
        
        // Skip if already in current sessions
        if (this.currentSessions.has(sessionId)) {
          continue;
        }

        try {
          const sessionData = await fs.readJson(path.join(this.sessionsDir, file));
          sessions.push({
            ...sessionData,
            startTime: new Date(sessionData.startTime),
            endTime: sessionData.endTime ? new Date(sessionData.endTime) : undefined,
          });
        } catch (error) {
          console.error(`Failed to load session file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions from disk:', error);
    }

    // Sort by start time (newest first)
    sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    return limit ? sessions.slice(0, limit) : sessions;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(timeframe?: 'day' | 'week' | 'month'): Promise<{
    totalSessions: number;
    completedSessions: number;
    failedSessions: number;
    averageExecutionTime: number;
    averageCoverage: number;
    frameworkUsage: Record<Framework, number>;
    qualityGateSuccessRate: number;
  }> {
    const sessions = await this.getAllSessions();
    
    // Filter by timeframe if specified
    let filteredSessions = sessions;
    if (timeframe) {
      const cutoff = new Date();
      switch (timeframe) {
        case 'day':
          cutoff.setDate(cutoff.getDate() - 1);
          break;
        case 'week':
          cutoff.setDate(cutoff.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(cutoff.getMonth() - 1);
          break;
      }
      filteredSessions = sessions.filter(s => s.startTime >= cutoff);
    }

    const completedSessions = filteredSessions.filter(s => s.status === 'completed');
    const failedSessions = filteredSessions.filter(s => s.status === 'failed');
    
    const executionTimes = completedSessions
      .map(s => s.metrics.executionTime)
      .filter(t => t !== undefined) as number[];
    
    const coverages = completedSessions
      .map(s => s.metrics.coverage)
      .filter(c => c !== undefined) as number[];
    
    // Calculate framework usage
    const frameworkUsage: Record<string, number> = {};
    filteredSessions.forEach(session => {
      session.frameworks.forEach(framework => {
        frameworkUsage[framework] = (frameworkUsage[framework] || 0) + 1;
      });
    });

    // Calculate quality gate success rate
    const qualityGateMetrics = completedSessions
      .map(s => ({
        passed: s.metrics.qualityGatesPassed || 0,
        total: (s.metrics.qualityGatesPassed || 0) + (s.metrics.qualityGatesFailed || 0),
      }))
      .filter(m => m.total > 0);
    
    const totalQualityGates = qualityGateMetrics.reduce((sum, m) => sum + m.total, 0);
    const passedQualityGates = qualityGateMetrics.reduce((sum, m) => sum + m.passed, 0);

    return {
      totalSessions: filteredSessions.length,
      completedSessions: completedSessions.length,
      failedSessions: failedSessions.length,
      averageExecutionTime: executionTimes.length > 0 
        ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length 
        : 0,
      averageCoverage: coverages.length > 0 
        ? coverages.reduce((sum, c) => sum + c, 0) / coverages.length 
        : 0,
      frameworkUsage: frameworkUsage as Record<Framework, number>,
      qualityGateSuccessRate: totalQualityGates > 0 
        ? (passedQualityGates / totalQualityGates) * 100 
        : 0,
    };
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    
    let deletedCount = 0;

    try {
      await fs.ensureDir(this.sessionsDir);
      const files = await fs.readdir(this.sessionsDir);
      const sessionFiles = files.filter(file => file.endsWith('.json'));

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(this.sessionsDir, file);
          const sessionData = await fs.readJson(filePath);
          const sessionDate = new Date(sessionData.startTime);

          if (sessionDate < cutoff) {
            await fs.remove(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.error(`Failed to process session file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
    }

    return deletedCount;
  }

  /**
   * Export sessions to JSON
   */
  async exportSessions(outputPath: string, timeframe?: 'day' | 'week' | 'month'): Promise<void> {
    const sessions = await this.getAllSessions();
    
    let filteredSessions = sessions;
    if (timeframe) {
      const cutoff = new Date();
      switch (timeframe) {
        case 'day':
          cutoff.setDate(cutoff.getDate() - 1);
          break;
        case 'week':
          cutoff.setDate(cutoff.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(cutoff.getMonth() - 1);
          break;
      }
      filteredSessions = sessions.filter(s => s.startTime >= cutoff);
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      timeframe: timeframe || 'all',
      sessions: filteredSessions,
      stats: await this.getSessionStats(timeframe),
    };

    await fs.writeJson(outputPath, exportData, { spaces: 2 });
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `test-${timestamp}-${random}`;
  }

  private async persistSession(session: TestingSession): Promise<void> {
    try {
      await fs.ensureDir(this.sessionsDir);
      const sessionPath = path.join(this.sessionsDir, `${session.id}.json`);
      await fs.writeJson(sessionPath, session, { spaces: 2 });
    } catch (error) {
      console.error(`Failed to persist session ${session.id}:`, error);
    }
  }
}