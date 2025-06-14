/**
 * @fileoverview Progress Tracker - Visual progress indicators
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { ProgressInfo } from '../types/cli';
import { logger } from '../utils/logger';

export class ProgressTracker {
  private spinner: Ora | null = null;
  private enabled: boolean;
  private currentStage: number = 0;
  private totalStages: number = 0;
  private startTime: number = 0;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  start(message: string, totalStages: number): void {
    if (!this.enabled) return;

    this.totalStages = totalStages;
    this.currentStage = 0;
    this.startTime = Date.now();

    this.spinner = ora({
      text: message,
      spinner: 'dots',
    }).start();
  }

  update(stage: number, message: string): void {
    if (!this.enabled || !this.spinner) return;

    this.currentStage = stage;
    const progress = this.totalStages > 0 ? `[${stage}/${this.totalStages}]` : '';
    const elapsed = this.getElapsedTime();
    
    this.spinner.text = `${progress} ${message} ${chalk.gray(`(${elapsed})`)}`;
  }

  succeed(message: string): void {
    if (!this.enabled || !this.spinner) {
      if (this.enabled) {
        logger.success(message);
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    this.spinner.succeed(`${message} ${chalk.gray(`(${elapsed})`)}`);
    this.spinner = null;
  }

  fail(message: string): void {
    if (!this.enabled || !this.spinner) {
      if (this.enabled) {
        logger.fail(message);
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    this.spinner.fail(`${message} ${chalk.gray(`(${elapsed})`)}`);
    this.spinner = null;
  }

  warn(message: string): void {
    if (!this.enabled || !this.spinner) {
      if (this.enabled) {
        logger.warn(message);
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    this.spinner.warn(`${message} ${chalk.gray(`(${elapsed})`)}`);
    this.spinner = null;
  }

  info(message: string): void {
    if (!this.enabled || !this.spinner) {
      if (this.enabled) {
        logger.info(message);
      }
      return;
    }

    const elapsed = this.getElapsedTime();
    this.spinner.info(`${message} ${chalk.gray(`(${elapsed})`)}`);
    this.spinner = null;
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  clear(): void {
    if (this.spinner) {
      this.spinner.clear();
    }
  }

  getProgress(): ProgressInfo {
    return {
      stage: this.currentStage.toString(),
      current: this.currentStage,
      total: this.totalStages,
      message: this.spinner?.text || '',
    };
  }

  private getElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    
    if (elapsed < 1000) {
      return `${elapsed}ms`;
    } else if (elapsed < 60000) {
      return `${(elapsed / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  // Static helper methods for one-off progress indicators
  static async withProgress<T>(
    message: string,
    operation: () => Promise<T>,
    enabled: boolean = true
  ): Promise<T> {
    const tracker = new ProgressTracker(enabled);
    tracker.start(message, 1);

    try {
      const result = await operation();
      tracker.succeed(message);
      return result;
    } catch (error) {
      tracker.fail(`Failed: ${message}`);
      throw error;
    }
  }

  static async withStages<T>(
    stages: Array<{ message: string; operation: () => Promise<void> }>,
    enabled: boolean = true
  ): Promise<void> {
    const tracker = new ProgressTracker(enabled);
    tracker.start('Processing', stages.length);

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (stage) {
        tracker.update(i + 1, stage.message);

        try {
          await stage.operation();
        } catch (error) {
          tracker.fail(`Failed: ${stage.message}`);
          throw error;
        }
      }
    }

    tracker.succeed('All stages completed');
  }
}