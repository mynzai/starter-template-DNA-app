/**
 * @fileoverview Enhanced logging utility for DNA CLI
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel = 'info';
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `${prefix} ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    console.log(chalk.gray(this.formatMessage('debug', message, ...args)));
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.blue(this.formatMessage('info', message, ...args)));
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    console.warn(chalk.yellow(this.formatMessage('warn', message, ...args)));
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    console.error(chalk.red(this.formatMessage('error', message, ...args)));
  }

  success(message: string): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.green(`✓ ${message}`));
  }

  fail(message: string): void {
    if (!this.shouldLog('error')) return;
    console.error(chalk.red(`✗ ${message}`));
  }

  step(message: string): void {
    if (!this.shouldLog('info')) return;
    console.log(chalk.cyan(`→ ${message}`));
  }

  plain(message: string): void {
    if (!this.shouldLog('info')) return;
    console.log(message);
  }
}

export const logger = new Logger();