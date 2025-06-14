/**
 * @fileoverview Typed error classes for different error categories
 * Provides structured error handling with recovery suggestions and automatic fixes
 */

import { CLIError } from '../../types/cli';

export enum ErrorCategory {
  VALIDATION = 'validation',
  TEMPLATE = 'template',
  FILESYSTEM = 'filesystem',
  NETWORK = 'network',
  DEPENDENCY = 'dependency',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  SECURITY = 'security',
  ROLLBACK = 'rollback',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  autoFixable: boolean;
  suggestion?: string;
  autoFix?: () => Promise<void>;
  helpUrl?: string;
  relatedErrors?: string[];
  timestamp: Date;
  stackTrace?: string;
}

export abstract class DNAError extends Error implements CLIError {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly recoverable: boolean;
  public readonly autoFixable: boolean;
  public readonly suggestion?: string;
  public readonly autoFix?: () => Promise<void>;
  public readonly helpUrl?: string;
  public readonly relatedErrors?: string[];
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context: Partial<ErrorContext> & { category: ErrorCategory },
    additionalContext?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = context.category;
    this.severity = context.severity || ErrorSeverity.MEDIUM;
    this.recoverable = context.recoverable ?? true;
    this.autoFixable = context.autoFixable ?? false;
    this.suggestion = context.suggestion;
    this.autoFix = context.autoFix;
    this.helpUrl = context.helpUrl;
    this.relatedErrors = context.relatedErrors;
    this.timestamp = context.timestamp || new Date();
    this.context = additionalContext;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      autoFixable: this.autoFixable,
      suggestion: this.suggestion,
      helpUrl: this.helpUrl,
      relatedErrors: this.relatedErrors,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

// Validation Errors
export class ValidationError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    autoFix?: () => Promise<void>,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        autoFixable: !!autoFix,
        suggestion,
        autoFix,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/validation',
      },
      additionalContext
    );
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(fieldPath: string, expectedType: string, actualValue: unknown) {
    super(
      `Schema validation failed: field '${fieldPath}' expected ${expectedType}, got ${typeof actualValue}`,
      'SCHEMA_VALIDATION_FAILED',
      `Update the '${fieldPath}' field to match the expected type: ${expectedType}`,
      undefined,
      { fieldPath, expectedType, actualValue }
    );
  }
}

export class ProjectNameValidationError extends ValidationError {
  constructor(name: string, reason: string) {
    super(
      `Invalid project name '${name}': ${reason}`,
      'INVALID_PROJECT_NAME',
      'Use alphanumeric characters, hyphens, and underscores only. Start with a letter and keep length between 3-50 characters',
      undefined,
      { invalidName: name, reason }
    );
  }
}

// Template Errors
export class TemplateError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    autoFix?: () => Promise<void>,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.TEMPLATE,
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        autoFixable: !!autoFix,
        suggestion,
        autoFix,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/templates',
      },
      additionalContext
    );
  }
}

export class TemplateNotFoundError extends TemplateError {
  constructor(templateId: string, availableTemplates: string[]) {
    super(
      `Template '${templateId}' not found`,
      'TEMPLATE_NOT_FOUND',
      `Available templates: ${availableTemplates.join(', ')}. Use 'dna-cli list' to see all templates`,
      undefined,
      { templateId, availableTemplates }
    );
  }
}

export class TemplateCorruptedError extends TemplateError {
  constructor(templateId: string, reason: string) {
    super(
      `Template '${templateId}' is corrupted: ${reason}`,
      'TEMPLATE_CORRUPTED',
      `Try updating the template registry with 'dna-cli update' or report this issue`,
      undefined,
      { templateId, reason }
    );
  }
}

export class DNAModuleConflictError extends TemplateError {
  constructor(conflictingModules: string[], reason: string) {
    super(
      `DNA module conflict: ${conflictingModules.join(', ')} - ${reason}`,
      'DNA_MODULE_CONFLICT',
      `Choose only one module from the conflicting group: ${conflictingModules.join(', ')}`,
      undefined,
      { conflictingModules, reason }
    );
  }
}

// Filesystem Errors
export class FilesystemError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    autoFix?: () => Promise<void>,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.FILESYSTEM,
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        autoFixable: !!autoFix,
        suggestion,
        autoFix,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/filesystem',
      },
      additionalContext
    );
  }
}

export class InsufficientPermissionsError extends FilesystemError {
  constructor(path: string, operation: string) {
    super(
      `Insufficient permissions to ${operation} at '${path}'`,
      'INSUFFICIENT_PERMISSIONS',
      `Check file/directory permissions or run with appropriate user privileges`,
      undefined,
      { path, operation }
    );
  }
}

export class DirectoryExistsError extends FilesystemError {
  constructor(path: string) {
    super(
      `Directory '${path}' already exists`,
      'DIRECTORY_EXISTS',
      `Choose a different project name, remove the existing directory, or use --overwrite flag`,
      undefined,
      { path }
    );
  }
}

export class InsufficientDiskSpaceError extends FilesystemError {
  constructor(required: number, available: number) {
    super(
      `Insufficient disk space: required ${Math.round(required / 1024 / 1024)}MB, available ${Math.round(available / 1024 / 1024)}MB`,
      'INSUFFICIENT_DISK_SPACE',
      `Free up disk space or choose a different location`,
      undefined,
      { required, available }
    );
  }
}

// Network Errors
export class NetworkError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    autoFix?: () => Promise<void>,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        autoFixable: !!autoFix,
        suggestion,
        autoFix,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/network',
      },
      additionalContext
    );
  }
}

export class TemplateDownloadError extends NetworkError {
  constructor(templateId: string, url: string, statusCode?: number) {
    super(
      `Failed to download template '${templateId}' from ${url}${statusCode ? ` (HTTP ${statusCode})` : ''}`,
      'TEMPLATE_DOWNLOAD_FAILED',
      `Check internet connection, verify proxy settings if behind corporate firewall, or try again later`,
      undefined,
      { templateId, url, statusCode }
    );
  }
}

export class RegistryConnectionError extends NetworkError {
  constructor(registryUrl: string) {
    super(
      `Failed to connect to template registry at ${registryUrl}`,
      'REGISTRY_CONNECTION_FAILED',
      `Check internet connection and registry URL, or try again later`,
      undefined,
      { registryUrl }
    );
  }
}

// Dependency Errors
export class DependencyError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    autoFix?: () => Promise<void>,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.DEPENDENCY,
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        autoFixable: !!autoFix,
        suggestion,
        autoFix,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/dependencies',
      },
      additionalContext
    );
  }
}

export class DependencyInstallError extends DependencyError {
  constructor(packageManager: string, exitCode: number, stderr?: string) {
    const autoFix = async () => {
      // Try alternative approaches
      if (packageManager === 'npm') {
        throw new Error('Auto-fix: Try clearing npm cache with "npm cache clean --force"');
      }
    };

    super(
      `Dependency installation failed with ${packageManager} (exit code: ${exitCode})`,
      'DEPENDENCY_INSTALL_FAILED',
      `Check Node.js and ${packageManager} versions, clear package manager cache, or try a different package manager`,
      autoFix,
      { packageManager, exitCode, stderr }
    );
  }
}

export class PackageManagerNotFoundError extends DependencyError {
  constructor(packageManager: string, availableManagers: string[]) {
    super(
      `Package manager '${packageManager}' not found`,
      'PACKAGE_MANAGER_NOT_FOUND',
      `Install ${packageManager} or choose from available: ${availableManagers.join(', ')}`,
      undefined,
      { packageManager, availableManagers }
    );
  }
}

// System Errors
export class SystemError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    autoFix?: () => Promise<void>,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        recoverable: false,
        autoFixable: !!autoFix,
        suggestion,
        autoFix,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/system',
      },
      additionalContext
    );
  }
}

export class UnsupportedNodeVersionError extends SystemError {
  constructor(currentVersion: string, requiredVersion: string) {
    super(
      `Node.js version ${currentVersion} is not supported. Required: ${requiredVersion}`,
      'UNSUPPORTED_NODE_VERSION',
      `Upgrade Node.js to version ${requiredVersion} or higher`,
      undefined,
      { currentVersion, requiredVersion }
    );
  }
}

export class MissingSystemToolError extends SystemError {
  constructor(tool: string, purpose: string, installInstructions?: string) {
    super(
      `Required system tool '${tool}' not found (needed for ${purpose})`,
      'MISSING_SYSTEM_TOOL',
      installInstructions || `Install ${tool} for ${purpose}`,
      undefined,
      { tool, purpose, installInstructions }
    );
  }
}

// Configuration Errors
export class ConfigurationError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    autoFix?: () => Promise<void>,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        autoFixable: !!autoFix,
        suggestion,
        autoFix,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/configuration',
      },
      additionalContext
    );
  }
}

export class InvalidConfigurationError extends ConfigurationError {
  constructor(configPath: string, errors: string[]) {
    super(
      `Invalid configuration in ${configPath}: ${errors.join(', ')}`,
      'INVALID_CONFIGURATION',
      `Fix the configuration errors or regenerate the configuration file`,
      undefined,
      { configPath, errors }
    );
  }
}

// Rollback Errors
export class RollbackError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.ROLLBACK,
        severity: ErrorSeverity.CRITICAL,
        recoverable: false,
        autoFixable: false,
        suggestion,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/rollback',
      },
      additionalContext
    );
  }
}

export class RollbackFailedError extends RollbackError {
  constructor(reason: string, partiallyCompleted: string[]) {
    super(
      `Rollback failed: ${reason}. Partially completed operations: ${partiallyCompleted.join(', ')}`,
      'ROLLBACK_FAILED',
      `Manual cleanup may be required. Check the project directory and remove any partial files`,
      { reason, partiallyCompleted }
    );
  }
}

// Security Errors
export class SecurityError extends DNAError {
  constructor(
    message: string,
    code: string,
    suggestion?: string,
    additionalContext?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      {
        category: ErrorCategory.SECURITY,
        severity: ErrorSeverity.CRITICAL,
        recoverable: false,
        autoFixable: false,
        suggestion,
        helpUrl: 'https://docs.dna-cli.com/troubleshooting/security',
      },
      additionalContext
    );
  }
}

export class UnsafePathError extends SecurityError {
  constructor(path: string, reason: string) {
    super(
      `Unsafe path detected: ${path} - ${reason}`,
      'UNSAFE_PATH',
      `Use a safe path without path traversal or special characters`,
      { path, reason }
    );
  }
}

// Error Factory Functions
export function createValidationError(message: string, code: string, suggestion?: string): ValidationError {
  return new ValidationError(message, code, suggestion);
}

export function createTemplateError(message: string, code: string, suggestion?: string): TemplateError {
  return new TemplateError(message, code, suggestion);
}

export function createFilesystemError(message: string, code: string, suggestion?: string): FilesystemError {
  return new FilesystemError(message, code, suggestion);
}

export function createNetworkError(message: string, code: string, suggestion?: string): NetworkError {
  return new NetworkError(message, code, suggestion);
}

export function createDependencyError(message: string, code: string, suggestion?: string): DependencyError {
  return new DependencyError(message, code, suggestion);
}

export function createSystemError(message: string, code: string, suggestion?: string): SystemError {
  return new SystemError(message, code, suggestion);
}

export function createConfigurationError(message: string, code: string, suggestion?: string): ConfigurationError {
  return new ConfigurationError(message, code, suggestion);
}

// Error utilities
export function isRecoverable(error: DNAError): boolean {
  return error.recoverable;
}

export function isAutoFixable(error: DNAError): boolean {
  return error.autoFixable && !!error.autoFix;
}

export function getCriticalErrors(errors: DNAError[]): DNAError[] {
  return errors.filter(error => error.severity === ErrorSeverity.CRITICAL);
}

export function getErrorsByCategory(errors: DNAError[], category: ErrorCategory): DNAError[] {
  return errors.filter(error => error.category === category);
}

export function sortErrorsBySeverity(errors: DNAError[]): DNAError[] {
  const severityOrder = {
    [ErrorSeverity.CRITICAL]: 0,
    [ErrorSeverity.HIGH]: 1,
    [ErrorSeverity.MEDIUM]: 2,
    [ErrorSeverity.LOW]: 3,
  };

  return [...errors].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}