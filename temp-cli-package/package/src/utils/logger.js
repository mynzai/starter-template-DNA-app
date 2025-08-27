"use strict";
/**
 * @fileoverview Enhanced logging utility for DNA CLI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const tslib_1 = require("tslib");
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
class Logger {
    constructor() {
        this.level = 'info';
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };
    }
    setLevel(level) {
        this.level = level;
    }
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }
    formatMessage(level, message, ...args) {
        // Clean production logging - no timestamps in normal operation
        if (level === 'info' || level === 'warn') {
            const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ') : '';
            return `${message}${formattedArgs}`;
        }
        
        // Debug and error logs include level prefix for troubleshooting
        const prefix = level === 'debug' ? '[DEBUG]' : level === 'error' ? '[ERROR]' : '';
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        return `${prefix} ${message}${formattedArgs}`;
    }
    debug(message, ...args) {
        if (!this.shouldLog('debug'))
            return;
        console.log(chalk_compat_1.default.gray(this.formatMessage('debug', message, ...args)));
    }
    info(message, ...args) {
        if (!this.shouldLog('info'))
            return;
        console.log(chalk_compat_1.default.blue(this.formatMessage('info', message, ...args)));
    }
    warn(message, ...args) {
        if (!this.shouldLog('warn'))
            return;
        console.warn(chalk_compat_1.default.yellow(this.formatMessage('warn', message, ...args)));
    }
    error(message, ...args) {
        if (!this.shouldLog('error'))
            return;
        console.error(chalk_compat_1.default.red(this.formatMessage('error', message, ...args)));
    }
    success(message) {
        if (!this.shouldLog('info'))
            return;
        console.log(chalk_compat_1.default.green(`✓ ${message}`));
    }
    fail(message) {
        if (!this.shouldLog('error'))
            return;
        console.error(chalk_compat_1.default.red(`✗ ${message}`));
    }
    step(message) {
        if (!this.shouldLog('info'))
            return;
        console.log(chalk_compat_1.default.cyan(`→ ${message}`));
    }
    plain(message) {
        if (!this.shouldLog('info'))
            return;
        console.log(message);
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map