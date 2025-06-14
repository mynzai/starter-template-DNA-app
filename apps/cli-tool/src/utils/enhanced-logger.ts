/**
 * @fileoverview Enhanced Logger - Advanced logging with visual feedback
 */

import chalk from 'chalk';
import boxen from 'boxen';
import util from 'util';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

// Status icons
const ICONS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  debug: '🐛',
  step: '→',
  bullet: '•',
  arrow: '➜',
  check: '✓',
  cross: '✗',
  star: '★',
  folder: '📁',
  file: '📄',
  package: '📦',
  rocket: '🚀',
  gear: '⚙',
  sparkles: '✨',
  fire: '🔥',
  clock: '⏰',
  zap: '⚡',
  replace: '🔄',
  skip: '⏭',
  select: '🎯',
  suggest: '💡',
  remove: '🗑',
  react: '⚛',
  flutter: '📱',
  rust: '🦀',
  svelte: '🔥'
};

// Color theme
const THEME = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  debug: chalk.magenta,
  muted: chalk.gray,
  highlight: chalk.cyan,
  bold: chalk.bold,
  dim: chalk.dim,
  primary: chalk.cyan,
  secondary: chalk.gray,
};

export interface LoggerOptions {
  level?: LogLevel;
  timestamp?: boolean;
  colors?: boolean;
  prefix?: string;
}

export interface BoxOptions {
  title?: string;
  borderColor?: string;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'classic';
  padding?: number;
  margin?: number;
}

export class EnhancedLogger {
  private level: LogLevel;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
  };
  private options: Required<LoggerOptions>;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: options.level || 'info',
      timestamp: options.timestamp ?? false,
      colors: options.colors ?? true,
      prefix: options.prefix || '',
    };
    this.level = this.options.level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, icon: string, message: string, ...args: unknown[]): string {
    const parts: string[] = [];

    // Add timestamp if enabled
    if (this.options.timestamp) {
      const timestamp = new Date().toISOString();
      parts.push(THEME.muted(`[${timestamp}]`));
    }

    // Add prefix if provided
    if (this.options.prefix) {
      parts.push(THEME.muted(`[${this.options.prefix}]`));
    }

    // Add icon and message
    parts.push(`${icon} ${message}`);

    // Format additional arguments
    if (args.length > 0) {
      const formattedArgs = args.map(arg => 
        typeof arg === 'object' ? '\n' + util.inspect(arg, { colors: this.options.colors, depth: 3 }) : String(arg)
      ).join(' ');
      parts.push(formattedArgs);
    }

    return parts.join(' ');
  }

  // Core logging methods

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    const formatted = this.formatMessage('debug', ICONS.debug, message, ...args);
    console.log(this.options.colors ? THEME.debug(formatted) : formatted);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', ICONS.info, message, ...args);
    console.log(this.options.colors ? THEME.info(formatted) : formatted);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    const formatted = this.formatMessage('warn', ICONS.warning, message, ...args);
    console.warn(this.options.colors ? THEME.warning(formatted) : formatted);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    const formatted = this.formatMessage('error', ICONS.error, message, ...args);
    console.error(this.options.colors ? THEME.error(formatted) : formatted);
  }

  // Enhanced logging methods

  success(message: string): void {
    if (!this.shouldLog('info')) return;
    const formatted = `${ICONS.success} ${message}`;
    console.log(this.options.colors ? THEME.success(formatted) : formatted);
  }

  fail(message: string): void {
    if (!this.shouldLog('error')) return;
    const formatted = `${ICONS.cross} ${message}`;
    console.error(this.options.colors ? THEME.error(formatted) : formatted);
  }

  step(message: string): void {
    if (!this.shouldLog('info')) return;
    const formatted = `${ICONS.step} ${message}`;
    console.log(this.options.colors ? THEME.primary(formatted) : formatted);
  }

  bullet(message: string): void {
    if (!this.shouldLog('info')) return;
    const formatted = `  ${ICONS.bullet} ${message}`;
    console.log(this.options.colors ? THEME.muted(formatted) : formatted);
  }

  plain(message: string): void {
    console.log(message);
  }

  // Structured output methods

  box(content: string | string[], options: BoxOptions = {}): void {
    const text = Array.isArray(content) ? content.join('\n') : content;
    const boxOptions: boxen.Options = {
      padding: options.padding ?? 1,
      margin: options.margin ?? 0,
      borderStyle: options.borderStyle || 'round',
      borderColor: options.borderColor || 'cyan',
      title: options.title,
      titleAlignment: 'center',
    };

    console.log(boxen(text, boxOptions));
  }

  table(data: Record<string, unknown>[], columns?: string[]): void {
    if (data.length === 0) return;

    const keys = columns || Object.keys(data[0] || {});
    const maxLengths: Record<string, number> = {};

    // Calculate max lengths
    keys.forEach(key => {
      maxLengths[key] = key.length;
      data.forEach(row => {
        const value = String(row[key] ?? '');
        maxLengths[key] = Math.max(maxLengths[key] || 0, value.length);
      });
    });

    // Print header
    const header = keys.map(key => key.padEnd(maxLengths[key] || 0)).join(' │ ');
    console.log(THEME.bold(header));
    console.log(THEME.dim('─'.repeat(header.length)));

    // Print rows
    data.forEach(row => {
      const rowStr = keys.map(key => {
        const value = String(row[key] ?? '');
        return value.padEnd(maxLengths[key] || 0);
      }).join(' │ ');
      console.log(rowStr);
    });
  }

  list(title: string, items: string[], ordered: boolean = false): void {
    console.log(THEME.bold(title));
    items.forEach((item, index) => {
      const prefix = ordered ? `${index + 1}.` : ICONS.bullet;
      console.log(`  ${prefix} ${item}`);
    });
  }

  tree(title: string, structure: Record<string, unknown>, indent: string = ''): void {
    if (indent === '') {
      console.log(THEME.bold(title));
    }

    const entries = Object.entries(structure);
    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const childIndent = indent + (isLast ? '    ' : '│   ');

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        console.log(`${indent}${prefix}${ICONS.folder} ${key}/`);
        this.tree('', value as Record<string, unknown>, childIndent);
      } else {
        console.log(`${indent}${prefix}${ICONS.file} ${key}`);
      }
    });
  }

  // Status messages

  command(cmd: string): void {
    if (!this.shouldLog('info')) return;
    console.log(`${THEME.muted('$')} ${THEME.bold(cmd)}`);
  }

  divider(char: string = '─', length: number = 60): void {
    console.log(THEME.dim(char.repeat(length)));
  }

  newline(count: number = 1): void {
    console.log('\n'.repeat(Math.max(0, count - 1)));
  }

  // Next steps formatting

  nextSteps(steps: Array<{ command: string; description: string }>): void {
    this.newline();
    console.log(THEME.bold(`${ICONS.rocket} Next steps:`));
    this.newline();

    steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${THEME.primary(step.command)}`);
      if (step.description) {
        console.log(`     ${THEME.muted(step.description)}`);
      }
      if (index < steps.length - 1) {
        this.newline();
      }
    });
  }

  // Error formatting

  errorDetails(error: Error, showStack: boolean = false): void {
    this.error('Error Details:');
    this.bullet(`Message: ${error.message}`);
    
    if (error.name && error.name !== 'Error') {
      this.bullet(`Type: ${error.name}`);
    }

    if ('code' in error) {
      this.bullet(`Code: ${(error as any).code}`);
    }

    if ('suggestion' in error) {
      this.newline();
      this.info('Suggestion:');
      this.bullet((error as any).suggestion);
    }

    if (showStack && error.stack) {
      this.newline();
      console.log(THEME.dim('Stack trace:'));
      console.log(THEME.dim(error.stack));
    }
  }

  // Progress summary

  summary(title: string, metrics: Record<string, string | number>): void {
    const content: string[] = [THEME.bold(title), ''];

    Object.entries(metrics).forEach(([key, value]) => {
      content.push(`${ICONS.check} ${key}: ${THEME.highlight(String(value))}`);
    });

    this.box(content, { borderColor: 'green' });
  }

  // Static convenience methods

  static rainbow(text: string): string {
    const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];
    return text.split('').map((char, i) => colors[i % colors.length](char)).join('');
  }

  static gradient(text: string, startColor: string, endColor: string): string {
    // Simple two-color gradient effect
    const half = Math.floor(text.length / 2);
    return chalk.hex(startColor)(text.slice(0, half)) + chalk.hex(endColor)(text.slice(half));
  }
}

// Create default logger instance
export const enhancedLogger = new EnhancedLogger();

// Export icons for external use
export { ICONS, THEME };