"use strict";
/**
 * @fileoverview Progress Tracker - Visual progress indicators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressTracker = void 0;
const tslib_1 = require("tslib");
const ora_compat_1 = tslib_1.__importDefault(require("../utils/ora-compat"));
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
const logger_1 = require("../utils/logger");
class ProgressTracker {
    constructor(enabled = true) {
        this.spinner = null;
        this.currentStage = 0;
        this.totalStages = 0;
        this.startTime = 0;
        this.enabled = enabled;
    }
    start(message, totalStages) {
        if (!this.enabled)
            return;
        this.totalStages = totalStages;
        this.currentStage = 0;
        this.startTime = Date.now();
        console.log('[DEBUG] ProgressTracker.start - creating ora spinner...');
        try {
            this.spinner = (0, ora_compat_1.default)({
                text: message,
                spinner: 'dots',
            }).start();
            console.log('[DEBUG] ProgressTracker.start - spinner created successfully');
        }
        catch (error) {
            console.log('[DEBUG] ProgressTracker.start - error creating spinner:', error);
            console.log('[DEBUG] ProgressTracker.start - error stack:', error.stack);
            throw error;
        }
    }
    update(stage, message) {
        if (!this.enabled || !this.spinner)
            return;
        this.currentStage = stage;
        const progress = this.totalStages > 0 ? `[${stage}/${this.totalStages}]` : '';
        const elapsed = this.getElapsedTime();
        this.spinner.text = `${progress} ${message} ${chalk_compat_1.default.gray(`(${elapsed})`)}`;
    }
    succeed(message) {
        if (!this.enabled || !this.spinner) {
            if (this.enabled) {
                logger_1.logger.success(message);
            }
            return;
        }
        const elapsed = this.getElapsedTime();
        this.spinner.succeed(`${message} ${chalk_compat_1.default.gray(`(${elapsed})`)}`);
        this.spinner = null;
    }
    fail(message) {
        if (!this.enabled || !this.spinner) {
            if (this.enabled) {
                logger_1.logger.fail(message);
            }
            return;
        }
        const elapsed = this.getElapsedTime();
        this.spinner.fail(`${message} ${chalk_compat_1.default.gray(`(${elapsed})`)}`);
        this.spinner = null;
    }
    warn(message) {
        if (!this.enabled || !this.spinner) {
            if (this.enabled) {
                logger_1.logger.warn(message);
            }
            return;
        }
        const elapsed = this.getElapsedTime();
        this.spinner.warn(`${message} ${chalk_compat_1.default.gray(`(${elapsed})`)}`);
        this.spinner = null;
    }
    info(message) {
        if (!this.enabled || !this.spinner) {
            if (this.enabled) {
                logger_1.logger.info(message);
            }
            return;
        }
        const elapsed = this.getElapsedTime();
        this.spinner.info(`${message} ${chalk_compat_1.default.gray(`(${elapsed})`)}`);
        this.spinner = null;
    }
    stop() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }
    clear() {
        if (this.spinner) {
            this.spinner.clear();
        }
    }
    getProgress() {
        return {
            stage: this.currentStage.toString(),
            current: this.currentStage,
            total: this.totalStages,
            message: this.spinner?.text || '',
        };
    }
    getElapsedTime() {
        const elapsed = Date.now() - this.startTime;
        if (elapsed < 1000) {
            return `${elapsed}ms`;
        }
        else if (elapsed < 60000) {
            return `${(elapsed / 1000).toFixed(1)}s`;
        }
        else {
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    }
    // Static helper methods for one-off progress indicators
    static async withProgress(message, operation, enabled = true) {
        const tracker = new ProgressTracker(enabled);
        tracker.start(message, 1);
        try {
            const result = await operation();
            tracker.succeed(message);
            return result;
        }
        catch (error) {
            tracker.fail(`Failed: ${message}`);
            throw error;
        }
    }
    static async withStages(stages, enabled = true) {
        const tracker = new ProgressTracker(enabled);
        tracker.start('Processing', stages.length);
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            if (stage) {
                tracker.update(i + 1, stage.message);
                try {
                    await stage.operation();
                }
                catch (error) {
                    tracker.fail(`Failed: ${stage.message}`);
                    throw error;
                }
            }
        }
        tracker.succeed('All stages completed');
    }
}
exports.ProgressTracker = ProgressTracker;
//# sourceMappingURL=progress-tracker.js.map