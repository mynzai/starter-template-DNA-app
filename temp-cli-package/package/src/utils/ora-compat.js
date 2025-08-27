"use strict";
/**
 * @fileoverview Ora compatibility layer for CommonJS builds
 * Provides a spinner interface using simple console output
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_compat_1 = tslib_1.__importDefault(require("./chalk-compat"));
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
// Predefined spinners
const spinners = {
    dots: { frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], interval: 80 },
    dots2: { frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'], interval: 80 },
    dots3: { frames: ['⠋', '⠙', '⠚', '⠞', '⠖', '⠦', '⠴', '⠲', '⠳', '⠓'], interval: 80 },
    line: { frames: ['-', '\\', '|', '/'], interval: 130 },
    line2: { frames: ['⠂', '-', '–', '—', '–', '-'], interval: 100 },
    pipe: { frames: ['┤', '┘', '┴', '└', '├', '┌', '┬', '┐'], interval: 100 },
    simpleDots: { frames: ['.  ', '.. ', '...', '   '], interval: 400 },
    simpleDotsScrolling: { frames: ['.  ', '.. ', '...', ' ..', '  .', '   '], interval: 200 },
};
class OraCompat {
    constructor(options) {
        this.text = '';
        this.color = 'cyan';
        this.indent = 0;
        this.spinner = spinners.dots;
        this.isSpinning = false;
        this.frameIndex = 0;
        this.interval = null;
        this.lastLine = '';
        if (typeof options === 'string') {
            this.text = options;
        }
        else if (options) {
            this.text = options.text || '';
            // Handle spinner option - can be a string key or an object
            if (options.spinner) {
                if (typeof options.spinner === 'string') {
                    this.spinner = spinners[options.spinner] || spinners.dots;
                }
                else if (options.spinner && options.spinner.frames) {
                    this.spinner = options.spinner;
                }
            }
            this.color = options.color || this.color;
        }
        this.stream = process.stderr;
    }
    clearLine() {
        if (this.lastLine) {
            this.stream.write('\r' + ' '.repeat(this.lastLine.length) + '\r');
        }
    }
    writeLine(symbol, text, color) {
        this.clearLine();
        const line = `${' '.repeat(this.indent)}${symbol} ${text}`;
        this.lastLine = line;
        const coloredLine = color ? color(line) : line;
        this.stream.write(coloredLine);
    }
    start(text) {
        if (text)
            this.text = text;
        this.isSpinning = true;
        if (process.env.CI || process.env.NO_SPINNER) {
            // In CI environments, just show static text
            this.writeLine('●', this.text, chalk_compat_1.default.cyan);
            return this;
        }
        this.interval = setInterval(() => {
            const frame = this.spinner.frames[this.frameIndex];
            this.writeLine(frame, this.text, chalk_compat_1.default.cyan);
            this.frameIndex = (this.frameIndex + 1) % this.spinner.frames.length;
        }, this.spinner.interval);
        return this;
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isSpinning = false;
        this.clearLine();
        return this;
    }
    succeed(text) {
        this.stop();
        if (text)
            this.text = text;
        this.writeLine('✓', this.text, chalk_compat_1.default.green);
        this.stream.write('\n');
        return this;
    }
    fail(text) {
        this.stop();
        if (text)
            this.text = text;
        this.writeLine('✗', this.text, chalk_compat_1.default.red);
        this.stream.write('\n');
        return this;
    }
    warn(text) {
        this.stop();
        if (text)
            this.text = text;
        this.writeLine('⚠', this.text, chalk_compat_1.default.yellow);
        this.stream.write('\n');
        return this;
    }
    info(text) {
        this.stop();
        if (text)
            this.text = text;
        this.writeLine('ℹ', this.text, chalk_compat_1.default.blue);
        this.stream.write('\n');
        return this;
    }
    stopAndPersist(options) {
        this.stop();
        const symbol = options?.symbol || '●';
        const text = options?.text || this.text;
        this.writeLine(symbol, text);
        this.stream.write('\n');
        return this;
    }
    clear() {
        this.clearLine();
        return this;
    }
    render() {
        return this;
    }
    frame() {
        return this.spinner.frames[this.frameIndex];
    }
}
function ora(options) {
    return new OraCompat(options);
}
exports.default = ora;
//# sourceMappingURL=ora-compat.js.map