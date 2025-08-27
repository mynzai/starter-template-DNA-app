"use strict";
/**
 * @fileoverview Enhanced Logger - Advanced logging with visual feedback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEME = exports.ICONS = exports.enhancedLogger = exports.EnhancedLogger = void 0;
const tslib_1 = require("tslib");
const chalk_compat_1 = tslib_1.__importDefault(require("./chalk-compat"));
const boxen_compat_1 = tslib_1.__importDefault(require("./boxen-compat"));
const util_1 = tslib_1.__importDefault(require("util"));
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
    svelte: '🔥',
    branch: '🌿',
    git: '🔀',
    upload: '⬆️'
};
exports.ICONS = ICONS;
// Color theme
const THEME = {
    success: chalk_compat_1.default.green,
    error: chalk_compat_1.default.red,
    warning: chalk_compat_1.default.yellow,
    info: chalk_compat_1.default.blue,
    debug: chalk_compat_1.default.magenta,
    muted: chalk_compat_1.default.gray,
    highlight: chalk_compat_1.default.cyan,
    bold: chalk_compat_1.default.bold,
    dim: chalk_compat_1.default.dim,
    primary: chalk_compat_1.default.cyan,
    secondary: chalk_compat_1.default.gray,
};
exports.THEME = THEME;
class EnhancedLogger {
    constructor(options = {}) {
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            silent: 4,
        };
        this.options = {
            level: options.level || 'info',
            timestamp: options.timestamp ?? false,
            colors: options.colors ?? true,
            prefix: options.prefix || '',
        };
        this.level = this.options.level;
    }
    setLevel(level) {
        this.level = level;
    }
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }
    formatMessage(level, icon, message, ...args) {
        const parts = [];
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
            const formattedArgs = args.map(arg => typeof arg === 'object' ? '\n' + util_1.default.inspect(arg, { colors: this.options.colors, depth: 3 }) : String(arg)).join(' ');
            parts.push(formattedArgs);
        }
        return parts.join(' ');
    }
    // Core logging methods
    debug(message, ...args) {
        if (!this.shouldLog('debug'))
            return;
        const formatted = this.formatMessage('debug', ICONS.debug, message, ...args);
        console.log(this.options.colors ? THEME.debug(formatted) : formatted);
    }
    info(message, ...args) {
        if (!this.shouldLog('info'))
            return;
        const formatted = this.formatMessage('info', ICONS.info, message, ...args);
        console.log(this.options.colors ? THEME.info(formatted) : formatted);
    }
    warn(message, ...args) {
        if (!this.shouldLog('warn'))
            return;
        const formatted = this.formatMessage('warn', ICONS.warning, message, ...args);
        console.warn(this.options.colors ? THEME.warning(formatted) : formatted);
    }
    error(message, ...args) {
        if (!this.shouldLog('error'))
            return;
        const formatted = this.formatMessage('error', ICONS.error, message, ...args);
        console.error(this.options.colors ? THEME.error(formatted) : formatted);
    }
    // Enhanced logging methods
    success(message) {
        if (!this.shouldLog('info'))
            return;
        const formatted = `${ICONS.success} ${message}`;
        console.log(this.options.colors ? THEME.success(formatted) : formatted);
    }
    fail(message) {
        if (!this.shouldLog('error'))
            return;
        const formatted = `${ICONS.cross} ${message}`;
        console.error(this.options.colors ? THEME.error(formatted) : formatted);
    }
    step(message) {
        if (!this.shouldLog('info'))
            return;
        const formatted = `${ICONS.step} ${message}`;
        console.log(this.options.colors ? THEME.primary(formatted) : formatted);
    }
    bullet(message) {
        if (!this.shouldLog('info'))
            return;
        const formatted = `  ${ICONS.bullet} ${message}`;
        console.log(this.options.colors ? THEME.muted(formatted) : formatted);
    }
    plain(message) {
        console.log(message);
    }
    // Structured output methods
    box(content, options = {}) {
        const text = Array.isArray(content) ? content.join('\n') : content;
        const boxOptions = {
            padding: options.padding ?? 1,
            margin: options.margin ?? 0,
            borderStyle: options.borderStyle || 'round',
            borderColor: options.borderColor || 'cyan',
            title: options.title,
            titleAlignment: 'center',
        };
        console.log((0, boxen_compat_1.default)(text, boxOptions));
    }
    table(data, columns) {
        if (data.length === 0)
            return;
        const keys = columns || Object.keys(data[0] || {});
        const maxLengths = {};
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
    list(title, items, ordered = false) {
        console.log(THEME.bold(title));
        items.forEach((item, index) => {
            const prefix = ordered ? `${index + 1}.` : ICONS.bullet;
            console.log(`  ${prefix} ${item}`);
        });
    }
    tree(title, structure, indent = '') {
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
                this.tree('', value, childIndent);
            }
            else {
                console.log(`${indent}${prefix}${ICONS.file} ${key}`);
            }
        });
    }
    // Status messages
    command(cmd) {
        if (!this.shouldLog('info'))
            return;
        console.log(`${THEME.muted('$')} ${THEME.bold(cmd)}`);
    }
    divider(char = '─', length = 60) {
        console.log(THEME.dim(char.repeat(length)));
    }
    newline(count = 1) {
        console.log('\n'.repeat(Math.max(0, count - 1)));
    }
    // Next steps formatting
    nextSteps(steps) {
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
    errorDetails(error, showStack = false) {
        this.error('Error Details:');
        this.bullet(`Message: ${error.message}`);
        if (error.name && error.name !== 'Error') {
            this.bullet(`Type: ${error.name}`);
        }
        if ('code' in error) {
            this.bullet(`Code: ${error.code}`);
        }
        if ('suggestion' in error) {
            this.newline();
            this.info('Suggestion:');
            this.bullet(error.suggestion);
        }
        if (showStack && error.stack) {
            this.newline();
            console.log(THEME.dim('Stack trace:'));
            console.log(THEME.dim(error.stack));
        }
    }
    // Progress summary
    summary(title, metrics) {
        const content = [THEME.bold(title), ''];
        Object.entries(metrics).forEach(([key, value]) => {
            content.push(`${ICONS.check} ${key}: ${THEME.highlight(String(value))}`);
        });
        this.box(content, { borderColor: 'green' });
    }
    // Static convenience methods
    static rainbow(text) {
        const colors = [chalk_compat_1.default.red, chalk_compat_1.default.yellow, chalk_compat_1.default.green, chalk_compat_1.default.cyan, chalk_compat_1.default.blue, chalk_compat_1.default.magenta];
        return text.split('').map((char, i) => colors[i % colors.length](char)).join('');
    }
    static gradient(text, startColor, endColor) {
        // Simple two-color gradient effect
        const half = Math.floor(text.length / 2);
        return chalk_compat_1.default.hex(startColor)(text.slice(0, half)) + chalk_compat_1.default.hex(endColor)(text.slice(half));
    }
}
exports.EnhancedLogger = EnhancedLogger;
// Create default logger instance
exports.enhancedLogger = new EnhancedLogger();
//# sourceMappingURL=enhanced-logger.js.map