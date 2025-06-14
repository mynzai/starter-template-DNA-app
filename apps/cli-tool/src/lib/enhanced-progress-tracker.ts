/**
 * @fileoverview Enhanced Progress Tracker - Advanced visual progress indicators
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';
import boxen from 'boxen';
import { ProgressInfo } from '../types/cli';
import { logger } from '../utils/logger';

// Progress bar characters
const PROGRESS_CHARS = {
  complete: '█',
  incomplete: '░',
  head: '▓',
};

// Status icons
const STATUS_ICONS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  step: '→',
  pending: '○',
  inProgress: '◉',
  completed: '●',
};

// Color theme
const COLORS = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  primary: chalk.cyan,
  secondary: chalk.gray,
  highlight: chalk.bold.cyan,
};

export interface StageInfo {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  message?: string;
}

export interface ProgressOptions {
  enabled?: boolean;
  showTime?: boolean;
  showPercentage?: boolean;
  showStages?: boolean;
  verboseMode?: boolean;
}

export class EnhancedProgressTracker {
  private spinner: Ora | null = null;
  private options: Required<ProgressOptions>;
  private stages: StageInfo[] = [];
  private currentStageIndex: number = -1;
  private overallStartTime: number = 0;
  private metrics: Map<string, number> = new Map();
  private fileOperations: { action: string; path: string; size?: number }[] = [];

  constructor(options: ProgressOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      showTime: options.showTime ?? true,
      showPercentage: options.showPercentage ?? true,
      showStages: options.showStages ?? true,
      verboseMode: options.verboseMode ?? false,
    };
  }

  /**
   * Start tracking with multiple stages
   */
  startWithStages(title: string, stages: string[]): void {
    if (!this.options.enabled) return;

    this.overallStartTime = Date.now();
    this.stages = stages.map(name => ({
      name,
      status: 'pending',
    }));
    this.currentStageIndex = -1;

    if (this.options.showStages) {
      this.displayStageOverview(title);
    }

    this.nextStage();
  }

  /**
   * Start simple progress tracking
   */
  start(message: string): void {
    if (!this.options.enabled) return;

    this.overallStartTime = Date.now();
    this.spinner = ora({
      text: this.formatMessage(message),
      spinner: 'dots',
      color: 'cyan',
    }).start();
  }

  /**
   * Move to the next stage
   */
  nextStage(customMessage?: string): void {
    if (!this.options.enabled || this.stages.length === 0) return;

    // Complete current stage if exists
    if (this.currentStageIndex >= 0) {
      const currentStage = this.stages[this.currentStageIndex];
      if (currentStage && currentStage.status === 'in-progress') {
        currentStage.status = 'completed';
        currentStage.endTime = Date.now();
      }
    }

    // Move to next stage
    this.currentStageIndex++;
    if (this.currentStageIndex < this.stages.length) {
      const nextStage = this.stages[this.currentStageIndex];
      if (nextStage) {
        nextStage.status = 'in-progress';
        nextStage.startTime = Date.now();
        nextStage.message = customMessage;

        this.updateStageDisplay();
      }
    }
  }

  /**
   * Update current stage progress
   */
  updateStage(message: string, progress?: number): void {
    if (!this.options.enabled) return;

    const currentStage = this.stages[this.currentStageIndex];
    if (currentStage) {
      currentStage.message = message;
    }

    const progressBar = progress !== undefined 
      ? this.createProgressBar(progress) 
      : '';
    
    const stageInfo = this.options.showStages && currentStage
      ? `[${this.currentStageIndex + 1}/${this.stages.length}] ${currentStage.name}`
      : '';

    const elapsed = this.getElapsedTime();
    const timeInfo = this.options.showTime ? chalk.gray(`(${elapsed})`) : '';

    if (this.spinner) {
      this.spinner.text = `${stageInfo} ${message} ${progressBar} ${timeInfo}`;
    } else {
      this.spinner = ora({
        text: `${stageInfo} ${message} ${progressBar} ${timeInfo}`,
        spinner: 'dots',
        color: 'cyan',
      }).start();
    }
  }

  /**
   * Update simple progress
   */
  update(message: string, progress?: number): void {
    if (!this.options.enabled || !this.spinner) return;

    const progressBar = progress !== undefined 
      ? this.createProgressBar(progress) 
      : '';
    
    const elapsed = this.getElapsedTime();
    const timeInfo = this.options.showTime ? chalk.gray(`(${elapsed})`) : '';

    this.spinner.text = `${message} ${progressBar} ${timeInfo}`;
  }

  /**
   * Track file operation
   */
  trackFileOperation(action: string, path: string, size?: number): void {
    this.fileOperations.push({ action, path, size });
    
    if (this.options.verboseMode && this.spinner) {
      const relativePath = this.getRelativePath(path);
      const sizeInfo = size ? ` (${this.formatBytes(size)})` : '';
      this.spinner.text = `${action} ${chalk.dim(relativePath)}${sizeInfo}`;
    }
  }

  /**
   * Add metric
   */
  addMetric(key: string, value: number): void {
    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  /**
   * Complete all stages successfully
   */
  completeAllStages(message?: string): void {
    if (!this.options.enabled) return;

    // Mark remaining stages as completed
    for (let i = this.currentStageIndex; i < this.stages.length; i++) {
      const stage = this.stages[i];
      if (stage && stage.status !== 'completed') {
        stage.status = 'completed';
        stage.endTime = Date.now();
      }
    }

    this.succeed(message || 'All stages completed successfully!');
    this.displayCompletionSummary();
  }

  /**
   * Mark current operation as successful
   */
  succeed(message: string): void {
    if (!this.options.enabled) {
      logger.success(message);
      return;
    }

    const elapsed = this.getElapsedTime();
    const finalMessage = `${STATUS_ICONS.success} ${message} ${chalk.gray(`(${elapsed})`)}`;

    if (this.spinner) {
      this.spinner.succeed(COLORS.success(finalMessage));
      this.spinner = null;
    } else {
      console.log(COLORS.success(finalMessage));
    }
  }

  /**
   * Mark current operation as failed
   */
  fail(message: string, error?: Error): void {
    if (!this.options.enabled) {
      logger.fail(message);
      if (error && this.options.verboseMode) {
        logger.error(error.message);
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    const finalMessage = `${STATUS_ICONS.error} ${message} ${chalk.gray(`(${elapsed})`)}`;

    if (this.spinner) {
      this.spinner.fail(COLORS.error(finalMessage));
      this.spinner = null;
    } else {
      console.log(COLORS.error(finalMessage));
    }

    if (error && this.options.verboseMode) {
      console.error(chalk.red('Error details:'), error.message);
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
    }

    // Mark current stage as failed
    const currentStage = this.stages[this.currentStageIndex];
    if (currentStage) {
      currentStage.status = 'failed';
      currentStage.endTime = Date.now();
    }
  }

  /**
   * Show warning
   */
  warn(message: string): void {
    if (!this.options.enabled) {
      logger.warn(message);
      return;
    }

    const warnMessage = `${STATUS_ICONS.warning} ${message}`;
    
    if (this.spinner) {
      this.spinner.warn(COLORS.warning(warnMessage));
      this.spinner = null;
    } else {
      console.log(COLORS.warning(warnMessage));
    }
  }

  /**
   * Show info
   */
  info(message: string): void {
    if (!this.options.enabled) {
      logger.info(message);
      return;
    }

    const infoMessage = `${STATUS_ICONS.info} ${message}`;
    
    if (this.spinner) {
      this.spinner.info(COLORS.info(infoMessage));
      this.spinner = null;
    } else {
      console.log(COLORS.info(infoMessage));
    }
  }

  /**
   * Stop spinner without status
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Clear spinner line
   */
  clear(): void {
    if (this.spinner) {
      this.spinner.clear();
    }
  }

  /**
   * Get current progress information
   */
  getProgress(): ProgressInfo {
    const current = this.currentStageIndex + 1;
    const total = this.stages.length;
    
    return {
      stage: this.stages[this.currentStageIndex]?.name || '',
      current,
      total,
      message: this.spinner?.text || '',
    };
  }

  // Private helper methods

  private displayStageOverview(title: string): void {
    const stageList = this.stages.map((stage, index) => {
      const icon = stage.status === 'pending' ? STATUS_ICONS.pending :
                   stage.status === 'in-progress' ? STATUS_ICONS.inProgress :
                   stage.status === 'completed' ? STATUS_ICONS.completed :
                   STATUS_ICONS.error;
      
      const color = stage.status === 'pending' ? chalk.gray :
                    stage.status === 'in-progress' ? chalk.cyan :
                    stage.status === 'completed' ? chalk.green :
                    chalk.red;
      
      return color(`  ${icon} ${stage.name}`);
    }).join('\n');

    const overview = `${chalk.bold(title)}\n\n${stageList}`;
    
    console.log(boxen(overview, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }));
  }

  private updateStageDisplay(): void {
    if (!this.options.showStages) return;

    const currentStage = this.stages[this.currentStageIndex];
    if (!currentStage) return;

    const message = currentStage.message || currentStage.name;
    const stageInfo = `[${this.currentStageIndex + 1}/${this.stages.length}]`;
    
    if (this.spinner) {
      this.spinner.text = `${stageInfo} ${message}`;
    } else {
      this.spinner = ora({
        text: `${stageInfo} ${message}`,
        spinner: 'dots',
        color: 'cyan',
      }).start();
    }
  }

  private displayCompletionSummary(): void {
    const totalTime = Date.now() - this.overallStartTime;
    const fileCount = this.fileOperations.length;
    const totalSize = this.fileOperations.reduce((sum, op) => sum + (op.size || 0), 0);

    const summary = [
      chalk.bold('✨ Generation Complete!'),
      '',
      `${STATUS_ICONS.info} Total time: ${chalk.cyan(this.formatDuration(totalTime))}`,
      `${STATUS_ICONS.info} Files generated: ${chalk.cyan(fileCount)}`,
      `${STATUS_ICONS.info} Total size: ${chalk.cyan(this.formatBytes(totalSize))}`,
    ];

    // Add metrics if available
    if (this.metrics.size > 0) {
      summary.push('', chalk.bold('Metrics:'));
      this.metrics.forEach((value, key) => {
        summary.push(`  ${STATUS_ICONS.step} ${key}: ${chalk.cyan(value)}`);
      });
    }

    // Add stage summary
    if (this.stages.length > 0) {
      summary.push('', chalk.bold('Stage Summary:'));
      this.stages.forEach((stage, index) => {
        const duration = stage.endTime && stage.startTime 
          ? this.formatDuration(stage.endTime - stage.startTime)
          : 'N/A';
        
        const icon = stage.status === 'completed' ? STATUS_ICONS.completed :
                     stage.status === 'failed' ? STATUS_ICONS.error :
                     stage.status === 'skipped' ? STATUS_ICONS.pending :
                     STATUS_ICONS.info;
        
        const color = stage.status === 'completed' ? chalk.green :
                      stage.status === 'failed' ? chalk.red :
                      stage.status === 'skipped' ? chalk.gray :
                      chalk.blue;
        
        summary.push(color(`  ${icon} ${stage.name} (${duration})`));
      });
    }

    console.log(boxen(summary.join('\n'), {
      padding: 1,
      margin: { top: 1 },
      borderStyle: 'round',
      borderColor: 'green',
    }));
  }

  private createProgressBar(percentage: number): string {
    if (!this.options.showPercentage) return '';

    const width = 20;
    const complete = Math.floor(width * (percentage / 100));
    const incomplete = width - complete;
    
    const bar = PROGRESS_CHARS.complete.repeat(Math.max(0, complete - 1)) +
                (complete > 0 ? PROGRESS_CHARS.head : '') +
                PROGRESS_CHARS.incomplete.repeat(incomplete);
    
    return `[${bar}] ${percentage.toFixed(0)}%`;
  }

  private getElapsedTime(): string {
    const elapsed = Date.now() - this.overallStartTime;
    return this.formatDuration(elapsed);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private getRelativePath(fullPath: string): string {
    const cwd = process.cwd();
    return fullPath.startsWith(cwd) 
      ? fullPath.slice(cwd.length + 1) 
      : fullPath;
  }

  private formatMessage(message: string): string {
    return this.options.showTime 
      ? `${message} ${chalk.gray(`(${this.getElapsedTime()})`)}`
      : message;
  }

  // Static helper methods for one-off operations

  static async withProgress<T>(
    message: string,
    operation: () => Promise<T>,
    options?: ProgressOptions
  ): Promise<T> {
    const tracker = new EnhancedProgressTracker(options);
    tracker.start(message);

    try {
      const result = await operation();
      tracker.succeed(`${message} - Done`);
      return result;
    } catch (error) {
      tracker.fail(`${message} - Failed`, error as Error);
      throw error;
    }
  }

  static async withStages<T>(
    title: string,
    stages: Array<{ name: string; operation: () => Promise<void> }>,
    options?: ProgressOptions
  ): Promise<void> {
    const tracker = new EnhancedProgressTracker(options);
    const stageNames = stages.map(s => s.name);
    tracker.startWithStages(title, stageNames);

    for (const stage of stages) {
      try {
        await stage.operation();
        tracker.nextStage();
      } catch (error) {
        tracker.fail(`Failed at stage: ${stage.name}`, error as Error);
        throw error;
      }
    }

    tracker.completeAllStages();
  }

  /**
   * Create a progress callback for template instantiation
   */
  createProgressCallback(): (stage: string, progress: number) => void {
    return (stage: string, progress: number) => {
      this.updateStage(stage, progress);
    };
  }
}

// Export convenience functions
export const withProgress = EnhancedProgressTracker.withProgress;
export const withStages = EnhancedProgressTracker.withStages;