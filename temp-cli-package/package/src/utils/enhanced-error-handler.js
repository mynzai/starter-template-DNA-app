"use strict";
/**
 * @fileoverview Enhanced error handler with comprehensive error recovery and user guidance
 * Provides intelligent error handling, automatic fixes, and detailed troubleshooting guidance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedErrorHandler = void 0;
const tslib_1 = require("tslib");
const chalk_compat_1 = tslib_1.__importDefault(require("./chalk-compat"));
const boxen_compat_1 = tslib_1.__importDefault(require("./boxen-compat"));
const inquirer_compat_1 = tslib_1.__importDefault(require("./inquirer-compat"));
const error_types_1 = require("../lib/errors/error-types");
const logger_1 = require("./logger");
const environment_1 = require("../environments/environment");
class EnhancedErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.recoveryAttempts = new Map();
        this.maxRetryAttempts = 3;
    }
    static getInstance() {
        if (!EnhancedErrorHandler.instance) {
            EnhancedErrorHandler.instance = new EnhancedErrorHandler();
        }
        return EnhancedErrorHandler.instance;
    }
    /**
     * Main error handling entry point
     */
    async handleError(error, options = {}) {
        const defaultOptions = {
            interactive: true,
            autoFix: false,
            showStackTrace: environment_1.environment.debug,
            gracefulDegradation: true,
            maxRetries: 3,
        };
        const handlingOptions = { ...defaultOptions, ...options };
        let dnaError;
        // Convert error to DNAError if it's not already
        if (error instanceof error_types_1.DNAError) {
            dnaError = error;
        }
        else if (error instanceof Error) {
            dnaError = this.convertToDNAError(error);
        }
        else {
            dnaError = new error_types_1.ValidationError(`Unknown error: ${String(error)}`, 'UNKNOWN_ERROR', 'Please try again or contact support');
        }
        // Add to error history
        this.errorHistory.push(dnaError);
        // Log error details
        this.logErrorDetails(dnaError, handlingOptions);
        // Check if we've exceeded retry attempts
        const retryCount = this.recoveryAttempts.get(dnaError.code) || 0;
        if (retryCount >= handlingOptions.maxRetries) {
            await this.displayFinalErrorMessage(dnaError);
            return false;
        }
        // Create recovery plan
        const recoveryPlan = this.createRecoveryPlan(dnaError);
        // Display error to user
        await this.displayErrorMessage(dnaError, recoveryPlan, handlingOptions);
        // Attempt automatic recovery if possible
        if (handlingOptions.autoFix && recoveryPlan.autoFixAvailable) {
            const recovered = await this.attemptAutoRecovery(dnaError);
            if (recovered) {
                logger_1.logger.success('Error automatically resolved!');
                return true;
            }
        }
        // Interactive recovery if enabled
        if (handlingOptions.interactive && recoveryPlan.canRecover) {
            const recovered = await this.attemptInteractiveRecovery(dnaError, recoveryPlan);
            if (recovered) {
                return true;
            }
        }
        // Graceful degradation if enabled
        if (handlingOptions.gracefulDegradation && this.canDegrade(dnaError)) {
            const degraded = await this.attemptGracefulDegradation(dnaError);
            if (degraded) {
                logger_1.logger.warn('Continuing with reduced functionality...');
                return true;
            }
        }
        // Increment retry count
        this.recoveryAttempts.set(dnaError.code, retryCount + 1);
        return false;
    }
    /**
     * Handle multiple errors with prioritization
     */
    async handleMultipleErrors(errors, options = {}) {
        const dnaErrors = errors.map(error => {
            if (error instanceof error_types_1.DNAError)
                return error;
            if (error instanceof Error)
                return this.convertToDNAError(error);
            return new error_types_1.ValidationError(`Unknown error: ${String(error)}`, 'UNKNOWN_ERROR', 'Please try again or contact support');
        });
        // Sort errors by severity
        const sortedErrors = (0, error_types_1.sortErrorsBySeverity)(dnaErrors);
        // Check for critical errors
        const criticalErrors = (0, error_types_1.getCriticalErrors)(sortedErrors);
        if (criticalErrors.length > 0) {
            logger_1.logger.error(`Found ${criticalErrors.length} critical error(s) that must be resolved first.`);
            for (const criticalError of criticalErrors) {
                const recovered = await this.handleError(criticalError, options);
                if (!recovered) {
                    return false; // Stop if critical error can't be recovered
                }
            }
        }
        // Handle remaining errors by category
        const categorizedErrors = this.categorizeErrors(sortedErrors.filter(e => e.severity !== error_types_1.ErrorSeverity.CRITICAL));
        for (const [category, categoryErrors] of categorizedErrors) {
            logger_1.logger.info(`Handling ${categoryErrors.length} ${category} error(s)...`);
            for (const error of categoryErrors) {
                const recovered = await this.handleError(error, { ...options, interactive: false });
                if (!recovered && !(0, error_types_1.isRecoverable)(error)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Generate comprehensive error report
     */
    generateErrorReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalErrors: this.errorHistory.length,
            errorsByCategory: this.getErrorCountByCategory(),
            errorsBySeverity: this.getErrorCountBySeverity(),
            mostCommonErrors: this.getMostCommonErrors(),
            recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
            recentErrors: this.errorHistory.slice(-10).map(error => ({
                code: error.code,
                message: error.message,
                category: error.category,
                severity: error.severity,
                timestamp: error.timestamp,
            })),
        };
        return JSON.stringify(report, null, 2);
    }
    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
        this.recoveryAttempts.clear();
    }
    /**
     * Get error statistics
     */
    getErrorStats() {
        const total = this.errorHistory.length;
        const recovered = Array.from(this.recoveryAttempts.values()).filter(count => count > 0).length;
        return {
            total,
            byCategory: this.getErrorCountByCategory(),
            bySeverity: this.getErrorCountBySeverity(),
            recoveryRate: total > 0 ? (recovered / total) * 100 : 0,
        };
    }
    // Private methods
    convertToDNAError(error) {
        // Convert different error types to appropriate DNAError subclasses
        if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
            return new error_types_1.FilesystemError(error.message, 'FILE_NOT_FOUND', 'Check if the file exists and path is correct');
        }
        if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
            return new error_types_1.FilesystemError(error.message, 'PERMISSION_DENIED', 'Check file permissions or run with appropriate privileges');
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
            return new error_types_1.NetworkError(error.message, 'NETWORK_ERROR', 'Check internet connection and try again');
        }
        if (error.message.includes('npm') || error.message.includes('dependency')) {
            return new error_types_1.DependencyError(error.message, 'DEPENDENCY_ERROR', 'Check package manager and dependency configuration');
        }
        // Default to validation error
        return new error_types_1.ValidationError(error.message, 'GENERIC_ERROR', 'Please check the operation and try again');
    }
    createRecoveryPlan(error) {
        const plan = {
            canRecover: (0, error_types_1.isRecoverable)(error),
            autoFixAvailable: (0, error_types_1.isAutoFixable)(error),
            manualSteps: [],
            estimatedTime: '1-2 minutes',
            riskLevel: 'low',
            alternativeApproaches: [],
        };
        // Customize plan based on error category
        switch (error.category) {
            case error_types_1.ErrorCategory.VALIDATION:
                plan.manualSteps = [
                    'Review the validation error details',
                    'Correct the invalid input or configuration',
                    'Retry the operation',
                ];
                plan.estimatedTime = '1-2 minutes';
                plan.riskLevel = 'low';
                break;
            case error_types_1.ErrorCategory.TEMPLATE:
                plan.manualSteps = [
                    'Check template availability and version',
                    'Update template registry if needed',
                    'Verify template compatibility',
                    'Try alternative template if available',
                ];
                plan.estimatedTime = '2-5 minutes';
                plan.riskLevel = 'medium';
                plan.alternativeApproaches = [
                    'Use a different template',
                    'Create custom template configuration',
                    'Contact template author for support',
                ];
                break;
            case error_types_1.ErrorCategory.FILESYSTEM:
                plan.manualSteps = [
                    'Check file and directory permissions',
                    'Verify available disk space',
                    'Ensure target directory is writable',
                    'Clear temporary files if needed',
                ];
                plan.estimatedTime = '2-3 minutes';
                plan.riskLevel = 'medium';
                plan.alternativeApproaches = [
                    'Use different output directory',
                    'Run with elevated privileges',
                    'Free up disk space',
                ];
                break;
            case error_types_1.ErrorCategory.NETWORK:
                plan.manualSteps = [
                    'Check internet connection',
                    'Verify proxy settings if behind firewall',
                    'Wait and retry if service is temporarily unavailable',
                    'Use offline mode if available',
                ];
                plan.estimatedTime = '1-5 minutes';
                plan.riskLevel = 'low';
                plan.alternativeApproaches = [
                    'Use cached templates',
                    'Download templates manually',
                    'Use offline installation',
                ];
                break;
            case error_types_1.ErrorCategory.DEPENDENCY:
                plan.manualSteps = [
                    'Clear package manager cache',
                    'Update package manager to latest version',
                    'Check and fix package.json syntax',
                    'Try alternative package manager',
                ];
                plan.estimatedTime = '3-10 minutes';
                plan.riskLevel = 'medium';
                plan.alternativeApproaches = [
                    'Skip dependency installation temporarily',
                    'Install dependencies manually',
                    'Use different package manager (npm/yarn/pnpm)',
                ];
                break;
            case error_types_1.ErrorCategory.SYSTEM:
                plan.manualSteps = [
                    'Check system requirements',
                    'Update required tools to compatible versions',
                    'Install missing system dependencies',
                    'Restart terminal/shell if needed',
                ];
                plan.estimatedTime = '5-15 minutes';
                plan.riskLevel = 'high';
                plan.alternativeApproaches = [
                    'Use Docker for isolated environment',
                    'Use cloud-based development environment',
                    'Downgrade to compatible versions',
                ];
                break;
            case error_types_1.ErrorCategory.ROLLBACK:
                plan.canRecover = false;
                plan.manualSteps = [
                    'Review rollback failure details',
                    'Manually clean up partially created files',
                    'Check file system integrity',
                    'Contact support if data loss occurred',
                ];
                plan.estimatedTime = '5-30 minutes';
                plan.riskLevel = 'high';
                break;
        }
        if (error.suggestion) {
            plan.manualSteps.unshift(error.suggestion);
        }
        return plan;
    }
    async displayErrorMessage(error, recoveryPlan, options) {
        const severity = this.getSeverityIcon(error.severity);
        const category = this.getCategoryIcon(error.category);
        let errorContent = `${severity} ${chalk_compat_1.default.red.bold('Error:')} ${error.message}\n`;
        errorContent += `${chalk_compat_1.default.gray(`Code: ${error.code} | Category: ${category} ${error.category}`)}\n`;
        if (error.timestamp) {
            errorContent += `${chalk_compat_1.default.gray(`Time: ${error.timestamp.toLocaleString()}`)}\n`;
        }
        if (recoveryPlan.canRecover) {
            errorContent += `\n${chalk_compat_1.default.green.bold('Recovery Available:')} This error can be resolved\n`;
            if (recoveryPlan.autoFixAvailable) {
                errorContent += `${chalk_compat_1.default.blue('• Auto-fix available')}\n`;
            }
            errorContent += `${chalk_compat_1.default.blue(`• Estimated time: ${recoveryPlan.estimatedTime}`)}\n`;
            errorContent += `${chalk_compat_1.default.blue(`• Risk level: ${this.getRiskIcon(recoveryPlan.riskLevel)} ${recoveryPlan.riskLevel}`)}\n`;
        }
        else {
            errorContent += `\n${chalk_compat_1.default.red.bold('Recovery:')} Manual intervention required\n`;
        }
        if (error.suggestion) {
            errorContent += `\n${chalk_compat_1.default.yellow.bold('Suggestion:')} ${error.suggestion}\n`;
        }
        if (recoveryPlan.manualSteps.length > 0) {
            errorContent += `\n${chalk_compat_1.default.blue.bold('Recovery Steps:')}\n`;
            recoveryPlan.manualSteps.forEach((step, index) => {
                errorContent += `${chalk_compat_1.default.blue(`${index + 1}.`)} ${step}\n`;
            });
        }
        if (recoveryPlan.alternativeApproaches.length > 0) {
            errorContent += `\n${chalk_compat_1.default.cyan.bold('Alternative Approaches:')}\n`;
            recoveryPlan.alternativeApproaches.forEach((approach, index) => {
                errorContent += `${chalk_compat_1.default.cyan(`•`)} ${approach}\n`;
            });
        }
        if (error.helpUrl) {
            errorContent += `\n${chalk_compat_1.default.magenta.bold('Help:')} ${error.helpUrl}\n`;
        }
        if (options.showStackTrace && error.stack) {
            errorContent += `\n${chalk_compat_1.default.gray.bold('Stack Trace:')}\n${chalk_compat_1.default.gray(error.stack)}\n`;
        }
        if (!environment_1.environment.debug) {
            errorContent += `\n${chalk_compat_1.default.gray('For more details, run with --debug flag')}\n`;
        }
        console.error((0, boxen_compat_1.default)(errorContent, {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: this.getBorderColor(error.severity),
        }));
    }
    async displayFinalErrorMessage(error) {
        const errorContent = `${chalk_compat_1.default.red.bold('UNRECOVERABLE ERROR')}\n\n` +
            `${error.message}\n\n` +
            `${chalk_compat_1.default.yellow('This error could not be automatically resolved after multiple attempts.')}\n` +
            `${chalk_compat_1.default.yellow('Please review the error details and try manual resolution.')}\n\n` +
            `${chalk_compat_1.default.gray(`Error Code: ${error.code}`)}\n` +
            `${chalk_compat_1.default.gray(`Category: ${error.category}`)}\n` +
            `${chalk_compat_1.default.gray(`Severity: ${error.severity}`)}\n`;
        console.error((0, boxen_compat_1.default)(errorContent, {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'red',
        }));
    }
    async attemptAutoRecovery(error) {
        if (!error.autoFix) {
            return false;
        }
        logger_1.logger.info('Attempting automatic recovery...');
        try {
            await error.autoFix();
            logger_1.logger.success('Automatic recovery successful!');
            return true;
        }
        catch (recoveryError) {
            logger_1.logger.error(`Automatic recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
            return false;
        }
    }
    async attemptInteractiveRecovery(error, plan) {
        const choices = [];
        if (plan.autoFixAvailable) {
            choices.push({ name: 'Try automatic fix', value: 'auto' });
        }
        choices.push({ name: 'Follow manual steps', value: 'manual' }, { name: 'Skip this error', value: 'skip' }, { name: 'Abort operation', value: 'abort' });
        if (plan.alternativeApproaches.length > 0) {
            choices.push({ name: 'Show alternative approaches', value: 'alternatives' });
        }
        const { action } = await inquirer_compat_1.default.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'How would you like to proceed?',
                choices,
            },
        ]);
        switch (action) {
            case 'auto':
                return await this.attemptAutoRecovery(error);
            case 'manual':
                console.log(chalk_compat_1.default.blue.bold('\nManual Recovery Steps:'));
                plan.manualSteps.forEach((step, index) => {
                    console.log(`${chalk_compat_1.default.blue(`${index + 1}.`)} ${step}`);
                });
                const { completed } = await inquirer_compat_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'completed',
                        message: 'Have you completed the manual steps?',
                        default: false,
                    },
                ]);
                return completed;
            case 'alternatives':
                console.log(chalk_compat_1.default.cyan.bold('\nAlternative Approaches:'));
                plan.alternativeApproaches.forEach((approach, index) => {
                    console.log(`${chalk_compat_1.default.cyan(`${index + 1}.`)} ${approach}`);
                });
                return await this.attemptInteractiveRecovery(error, plan);
            case 'skip':
                logger_1.logger.warn('Skipping error - this may cause issues later');
                return true;
            case 'abort':
                return false;
            default:
                return false;
        }
    }
    async attemptGracefulDegradation(error) {
        // Implement graceful degradation based on error type
        switch (error.category) {
            case error_types_1.ErrorCategory.NETWORK:
                logger_1.logger.warn('Network error - switching to offline mode');
                return true;
            case error_types_1.ErrorCategory.DEPENDENCY:
                logger_1.logger.warn('Dependency error - skipping optional dependencies');
                return true;
            default:
                return false;
        }
    }
    canDegrade(error) {
        return error.category === error_types_1.ErrorCategory.NETWORK ||
            error.category === error_types_1.ErrorCategory.DEPENDENCY ||
            error.severity === error_types_1.ErrorSeverity.LOW;
    }
    logErrorDetails(error, options) {
        if (environment_1.environment.debug) {
            logger_1.logger.debug('Error details:', {
                code: error.code,
                category: error.category,
                severity: error.severity,
                recoverable: error.recoverable,
                autoFixable: error.autoFixable,
                timestamp: error.timestamp,
                context: error.context,
            });
        }
        // Log to error tracking service in production
        if (environment_1.environment.production && environment_1.environment.telemetryEnabled) {
            // TODO: Implement error tracking service integration
            logger_1.logger.debug('Error would be reported to tracking service');
        }
    }
    categorizeErrors(errors) {
        const categorized = new Map();
        for (const error of errors) {
            if (!categorized.has(error.category)) {
                categorized.set(error.category, []);
            }
            categorized.get(error.category).push(error);
        }
        return categorized;
    }
    getErrorCountByCategory() {
        const counts = {};
        for (const error of this.errorHistory) {
            counts[error.category] = (counts[error.category] || 0) + 1;
        }
        return counts;
    }
    getErrorCountBySeverity() {
        const counts = {};
        for (const error of this.errorHistory) {
            counts[error.severity] = (counts[error.severity] || 0) + 1;
        }
        return counts;
    }
    getMostCommonErrors() {
        const counts = {};
        for (const error of this.errorHistory) {
            counts[error.code] = (counts[error.code] || 0) + 1;
        }
        return Object.entries(counts)
            .map(([code, count]) => ({ code, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }
    getSeverityIcon(severity) {
        switch (severity) {
            case error_types_1.ErrorSeverity.CRITICAL: return '🚨';
            case error_types_1.ErrorSeverity.HIGH: return '❌';
            case error_types_1.ErrorSeverity.MEDIUM: return '⚠️';
            case error_types_1.ErrorSeverity.LOW: return 'ℹ️';
            default: return '❓';
        }
    }
    getCategoryIcon(category) {
        switch (category) {
            case error_types_1.ErrorCategory.VALIDATION: return '✅';
            case error_types_1.ErrorCategory.TEMPLATE: return '📋';
            case error_types_1.ErrorCategory.FILESYSTEM: return '📁';
            case error_types_1.ErrorCategory.NETWORK: return '🌐';
            case error_types_1.ErrorCategory.DEPENDENCY: return '📦';
            case error_types_1.ErrorCategory.SYSTEM: return '⚙️';
            case error_types_1.ErrorCategory.CONFIGURATION: return '🔧';
            case error_types_1.ErrorCategory.ROLLBACK: return '↩️';
            case error_types_1.ErrorCategory.SECURITY: return '🔒';
            default: return '❓';
        }
    }
    getRiskIcon(risk) {
        switch (risk) {
            case 'low': return '🟢';
            case 'medium': return '🟡';
            case 'high': return '🔴';
            default: return '⚪';
        }
    }
    getBorderColor(severity) {
        switch (severity) {
            case error_types_1.ErrorSeverity.CRITICAL: return 'red';
            case error_types_1.ErrorSeverity.HIGH: return 'red';
            case error_types_1.ErrorSeverity.MEDIUM: return 'yellow';
            case error_types_1.ErrorSeverity.LOW: return 'blue';
            default: return 'gray';
        }
    }
}
exports.EnhancedErrorHandler = EnhancedErrorHandler;
//# sourceMappingURL=enhanced-error-handler.js.map