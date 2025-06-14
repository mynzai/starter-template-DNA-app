/**
 * @fileoverview Enhanced error handler with comprehensive error recovery and user guidance
 * Provides intelligent error handling, automatic fixes, and detailed troubleshooting guidance
 */

import chalk from 'chalk';
import boxen from 'boxen';
import inquirer from 'inquirer';
import { 
  DNAError, 
  ErrorCategory, 
  ErrorSeverity,
  ValidationError,
  TemplateError,
  FilesystemError,
  NetworkError,
  DependencyError,
  SystemError,
  ConfigurationError,
  RollbackError,
  isRecoverable,
  isAutoFixable,
  getCriticalErrors,
  getErrorsByCategory,
  sortErrorsBySeverity
} from '../lib/errors/error-types';
import { logger } from './logger';
import { environment } from '../environments/environment';

export interface ErrorHandlingOptions {
  interactive: boolean;
  autoFix: boolean;
  showStackTrace: boolean;
  gracefulDegradation: boolean;
  maxRetries: number;
}

export interface ErrorRecoveryPlan {
  canRecover: boolean;
  autoFixAvailable: boolean;
  manualSteps: string[];
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  alternativeApproaches: string[];
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private errorHistory: DNAError[] = [];
  private recoveryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;

  private constructor() {}

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * Main error handling entry point
   */
  async handleError(
    error: unknown, 
    options: Partial<ErrorHandlingOptions> = {}
  ): Promise<boolean> {
    const defaultOptions: ErrorHandlingOptions = {
      interactive: true,
      autoFix: false,
      showStackTrace: environment.debug,
      gracefulDegradation: true,
      maxRetries: 3,
    };

    const handlingOptions = { ...defaultOptions, ...options };
    
    let dnaError: DNAError;
    
    // Convert error to DNAError if it's not already
    if (error instanceof DNAError) {
      dnaError = error;
    } else if (error instanceof Error) {
      dnaError = this.convertToDNAError(error);
    } else {
      dnaError = new ValidationError(
        `Unknown error: ${String(error)}`,
        'UNKNOWN_ERROR',
        'Please try again or contact support'
      );
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
        logger.success('Error automatically resolved!');
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
        logger.warn('Continuing with reduced functionality...');
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
  async handleMultipleErrors(
    errors: unknown[], 
    options: Partial<ErrorHandlingOptions> = {}
  ): Promise<boolean> {
    const dnaErrors = errors.map(error => {
      if (error instanceof DNAError) return error;
      if (error instanceof Error) return this.convertToDNAError(error);
      return new ValidationError(
        `Unknown error: ${String(error)}`,
        'UNKNOWN_ERROR',
        'Please try again or contact support'
      );
    });

    // Sort errors by severity
    const sortedErrors = sortErrorsBySeverity(dnaErrors);
    
    // Check for critical errors
    const criticalErrors = getCriticalErrors(sortedErrors);
    if (criticalErrors.length > 0) {
      logger.error(`Found ${criticalErrors.length} critical error(s) that must be resolved first.`);
      
      for (const criticalError of criticalErrors) {
        const recovered = await this.handleError(criticalError, options);
        if (!recovered) {
          return false; // Stop if critical error can't be recovered
        }
      }
    }

    // Handle remaining errors by category
    const categorizedErrors = this.categorizeErrors(sortedErrors.filter(e => e.severity !== ErrorSeverity.CRITICAL));
    
    for (const [category, categoryErrors] of categorizedErrors) {
      logger.info(`Handling ${categoryErrors.length} ${category} error(s)...`);
      
      for (const error of categoryErrors) {
        const recovered = await this.handleError(error, { ...options, interactive: false });
        if (!recovered && !isRecoverable(error)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport(): string {
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
  clearHistory(): void {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recoveryRate: number;
  } {
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

  private convertToDNAError(error: Error): DNAError {
    // Convert different error types to appropriate DNAError subclasses
    if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
      return new FilesystemError(
        error.message,
        'FILE_NOT_FOUND',
        'Check if the file exists and path is correct'
      );
    }
    
    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return new FilesystemError(
        error.message,
        'PERMISSION_DENIED',
        'Check file permissions or run with appropriate privileges'
      );
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
      return new NetworkError(
        error.message,
        'NETWORK_ERROR',
        'Check internet connection and try again'
      );
    }
    
    if (error.message.includes('npm') || error.message.includes('dependency')) {
      return new DependencyError(
        error.message,
        'DEPENDENCY_ERROR',
        'Check package manager and dependency configuration'
      );
    }

    // Default to validation error
    return new ValidationError(
      error.message,
      'GENERIC_ERROR',
      'Please check the operation and try again'
    );
  }

  private createRecoveryPlan(error: DNAError): ErrorRecoveryPlan {
    const plan: ErrorRecoveryPlan = {
      canRecover: isRecoverable(error),
      autoFixAvailable: isAutoFixable(error),
      manualSteps: [],
      estimatedTime: '1-2 minutes',
      riskLevel: 'low',
      alternativeApproaches: [],
    };

    // Customize plan based on error category
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        plan.manualSteps = [
          'Review the validation error details',
          'Correct the invalid input or configuration',
          'Retry the operation',
        ];
        plan.estimatedTime = '1-2 minutes';
        plan.riskLevel = 'low';
        break;

      case ErrorCategory.TEMPLATE:
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

      case ErrorCategory.FILESYSTEM:
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

      case ErrorCategory.NETWORK:
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

      case ErrorCategory.DEPENDENCY:
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

      case ErrorCategory.SYSTEM:
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

      case ErrorCategory.ROLLBACK:
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

  private async displayErrorMessage(
    error: DNAError, 
    recoveryPlan: ErrorRecoveryPlan, 
    options: ErrorHandlingOptions
  ): Promise<void> {
    const severity = this.getSeverityIcon(error.severity);
    const category = this.getCategoryIcon(error.category);
    
    let errorContent = `${severity} ${chalk.red.bold('Error:')} ${error.message}\n`;
    errorContent += `${chalk.gray(`Code: ${error.code} | Category: ${category} ${error.category}`)}\n`;
    
    if (error.timestamp) {
      errorContent += `${chalk.gray(`Time: ${error.timestamp.toLocaleString()}`)}\n`;
    }

    if (recoveryPlan.canRecover) {
      errorContent += `\n${chalk.green.bold('Recovery Available:')} This error can be resolved\n`;
      
      if (recoveryPlan.autoFixAvailable) {
        errorContent += `${chalk.blue('• Auto-fix available')}\n`;
      }
      
      errorContent += `${chalk.blue(`• Estimated time: ${recoveryPlan.estimatedTime}`)}\n`;
      errorContent += `${chalk.blue(`• Risk level: ${this.getRiskIcon(recoveryPlan.riskLevel)} ${recoveryPlan.riskLevel}`)}\n`;
    } else {
      errorContent += `\n${chalk.red.bold('Recovery:')} Manual intervention required\n`;
    }

    if (error.suggestion) {
      errorContent += `\n${chalk.yellow.bold('Suggestion:')} ${error.suggestion}\n`;
    }

    if (recoveryPlan.manualSteps.length > 0) {
      errorContent += `\n${chalk.blue.bold('Recovery Steps:')}\n`;
      recoveryPlan.manualSteps.forEach((step, index) => {
        errorContent += `${chalk.blue(`${index + 1}.`)} ${step}\n`;
      });
    }

    if (recoveryPlan.alternativeApproaches.length > 0) {
      errorContent += `\n${chalk.cyan.bold('Alternative Approaches:')}\n`;
      recoveryPlan.alternativeApproaches.forEach((approach, index) => {
        errorContent += `${chalk.cyan(`•`)} ${approach}\n`;
      });
    }

    if (error.helpUrl) {
      errorContent += `\n${chalk.magenta.bold('Help:')} ${error.helpUrl}\n`;
    }

    if (options.showStackTrace && error.stack) {
      errorContent += `\n${chalk.gray.bold('Stack Trace:')}\n${chalk.gray(error.stack)}\n`;
    }

    if (!environment.debug) {
      errorContent += `\n${chalk.gray('For more details, run with --debug flag')}\n`;
    }

    console.error(boxen(errorContent, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: this.getBorderColor(error.severity),
    }));
  }

  private async displayFinalErrorMessage(error: DNAError): Promise<void> {
    const errorContent = `${chalk.red.bold('UNRECOVERABLE ERROR')}\n\n` +
      `${error.message}\n\n` +
      `${chalk.yellow('This error could not be automatically resolved after multiple attempts.')}\n` +
      `${chalk.yellow('Please review the error details and try manual resolution.')}\n\n` +
      `${chalk.gray(`Error Code: ${error.code}`)}\n` +
      `${chalk.gray(`Category: ${error.category}`)}\n` +
      `${chalk.gray(`Severity: ${error.severity}`)}\n`;

    console.error(boxen(errorContent, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'red',
    }));
  }

  private async attemptAutoRecovery(error: DNAError): Promise<boolean> {
    if (!error.autoFix) {
      return false;
    }

    logger.info('Attempting automatic recovery...');
    
    try {
      await error.autoFix();
      logger.success('Automatic recovery successful!');
      return true;
    } catch (recoveryError) {
      logger.error(`Automatic recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
      return false;
    }
  }

  private async attemptInteractiveRecovery(error: DNAError, plan: ErrorRecoveryPlan): Promise<boolean> {
    const choices = [];
    
    if (plan.autoFixAvailable) {
      choices.push({ name: 'Try automatic fix', value: 'auto' });
    }
    
    choices.push(
      { name: 'Follow manual steps', value: 'manual' },
      { name: 'Skip this error', value: 'skip' },
      { name: 'Abort operation', value: 'abort' }
    );

    if (plan.alternativeApproaches.length > 0) {
      choices.push({ name: 'Show alternative approaches', value: 'alternatives' });
    }

    const { action } = await inquirer.prompt([
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
        console.log(chalk.blue.bold('\nManual Recovery Steps:'));
        plan.manualSteps.forEach((step, index) => {
          console.log(`${chalk.blue(`${index + 1}.`)} ${step}`);
        });
        
        const { completed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'completed',
            message: 'Have you completed the manual steps?',
            default: false,
          },
        ]);
        
        return completed;
      
      case 'alternatives':
        console.log(chalk.cyan.bold('\nAlternative Approaches:'));
        plan.alternativeApproaches.forEach((approach, index) => {
          console.log(`${chalk.cyan(`${index + 1}.`)} ${approach}`);
        });
        
        return await this.attemptInteractiveRecovery(error, plan);
      
      case 'skip':
        logger.warn('Skipping error - this may cause issues later');
        return true;
      
      case 'abort':
        return false;
      
      default:
        return false;
    }
  }

  private async attemptGracefulDegradation(error: DNAError): Promise<boolean> {
    // Implement graceful degradation based on error type
    switch (error.category) {
      case ErrorCategory.NETWORK:
        logger.warn('Network error - switching to offline mode');
        return true;
      
      case ErrorCategory.DEPENDENCY:
        logger.warn('Dependency error - skipping optional dependencies');
        return true;
      
      default:
        return false;
    }
  }

  private canDegrade(error: DNAError): boolean {
    return error.category === ErrorCategory.NETWORK || 
           error.category === ErrorCategory.DEPENDENCY ||
           error.severity === ErrorSeverity.LOW;
  }

  private logErrorDetails(error: DNAError, options: ErrorHandlingOptions): void {
    if (environment.debug) {
      logger.debug('Error details:', {
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
    if (environment.production && environment.telemetryEnabled) {
      // TODO: Implement error tracking service integration
      logger.debug('Error would be reported to tracking service');
    }
  }

  private categorizeErrors(errors: DNAError[]): Map<ErrorCategory, DNAError[]> {
    const categorized = new Map<ErrorCategory, DNAError[]>();
    
    for (const error of errors) {
      if (!categorized.has(error.category)) {
        categorized.set(error.category, []);
      }
      categorized.get(error.category)!.push(error);
    }
    
    return categorized;
  }

  private getErrorCountByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const error of this.errorHistory) {
      counts[error.category] = (counts[error.category] || 0) + 1;
    }
    
    return counts;
  }

  private getErrorCountBySeverity(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const error of this.errorHistory) {
      counts[error.severity] = (counts[error.severity] || 0) + 1;
    }
    
    return counts;
  }

  private getMostCommonErrors(): Array<{ code: string; count: number }> {
    const counts: Record<string, number> = {};
    
    for (const error of this.errorHistory) {
      counts[error.code] = (counts[error.code] || 0) + 1;
    }
    
    return Object.entries(counts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return '🚨';
      case ErrorSeverity.HIGH: return '❌';
      case ErrorSeverity.MEDIUM: return '⚠️';
      case ErrorSeverity.LOW: return 'ℹ️';
      default: return '❓';
    }
  }

  private getCategoryIcon(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.VALIDATION: return '✅';
      case ErrorCategory.TEMPLATE: return '📋';
      case ErrorCategory.FILESYSTEM: return '📁';
      case ErrorCategory.NETWORK: return '🌐';
      case ErrorCategory.DEPENDENCY: return '📦';
      case ErrorCategory.SYSTEM: return '⚙️';
      case ErrorCategory.CONFIGURATION: return '🔧';
      case ErrorCategory.ROLLBACK: return '↩️';
      case ErrorCategory.SECURITY: return '🔒';
      default: return '❓';
    }
  }

  private getRiskIcon(risk: string): string {
    switch (risk) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  }

  private getBorderColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'red';
      case ErrorSeverity.HIGH: return 'red';
      case ErrorSeverity.MEDIUM: return 'yellow';
      case ErrorSeverity.LOW: return 'blue';
      default: return 'gray';
    }
  }
}