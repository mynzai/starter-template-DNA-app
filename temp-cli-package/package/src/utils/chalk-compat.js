"use strict";
/**
 * @fileoverview Chalk compatibility layer for CommonJS builds
 * Provides a chalk-like interface using ANSI codes when chalk isn't available
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Basic ANSI color codes
const ANSI_CODES = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    white: '\x1b[37m',
};
class ChalkCompat {
    constructor(styles = []) {
        this.styles = [];
        this.styles = styles;
    }
    applyStyle(text) {
        if (process.env.NO_COLOR || process.env.NODE_ENV === 'test') {
            return text;
        }
        const prefix = this.styles.join('');
        return `${prefix}${text}${ANSI_CODES.reset}`;
    }
    createProxy() {
        const self = this;
        const func = function (text) {
            return self.applyStyle(text);
        };
        // Create getters for all color properties
        const colorNames = ['bold', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'gray', 'grey', 'white', 'dim'];
        colorNames.forEach(colorName => {
            Object.defineProperty(func, colorName, {
                get() {
                    const colorCode = ANSI_CODES[colorName === 'grey' ? 'gray' : colorName];
                    return new ChalkCompat([...self.styles, colorCode]).createProxy();
                }
            });
        });
        return func;
    }
    static create() {
        const instance = new ChalkCompat();
        const proxy = instance.createProxy();
        // Add hex method
        proxy.hex = (color) => (text) => text;
        return proxy;
    }
}
const chalk = ChalkCompat.create();
exports.default = chalk;
//# sourceMappingURL=chalk-compat.js.map