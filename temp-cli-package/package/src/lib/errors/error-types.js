"use strict";
/**
 * @fileoverview Typed error classes for different error categories
 * Provides structured error handling with recovery suggestions and automatic fixes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortErrorsBySeverity = exports.getErrorsByCategory = exports.getCriticalErrors = exports.isAutoFixable = exports.isRecoverable = exports.createConfigurationError = exports.createSystemError = exports.createDependencyError = exports.createNetworkError = exports.createFilesystemError = exports.createTemplateError = exports.createValidationError = exports.UnsafePathError = exports.SecurityError = exports.RollbackFailedError = exports.RollbackError = exports.InvalidConfigurationError = exports.ConfigurationError = exports.MissingSystemToolError = exports.UnsupportedNodeVersionError = exports.SystemError = exports.PackageManagerNotFoundError = exports.DependencyInstallError = exports.DependencyError = exports.RegistryConnectionError = exports.TemplateDownloadError = exports.NetworkError = exports.InsufficientDiskSpaceError = exports.DirectoryExistsError = exports.InsufficientPermissionsError = exports.FilesystemError = exports.DNAModuleConflictError = exports.TemplateCorruptedError = exports.TemplateNotFoundError = exports.TemplateError = exports.ProjectNameValidationError = exports.SchemaValidationError = exports.ValidationError = exports.DNAError = exports.ErrorSeverity = exports.ErrorCategory = void 0;
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["TEMPLATE"] = "template";
    ErrorCategory["FILESYSTEM"] = "filesystem";
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["DEPENDENCY"] = "dependency";
    ErrorCategory["CONFIGURATION"] = "configuration";
    ErrorCategory["SYSTEM"] = "system";
    ErrorCategory["USER_INPUT"] = "user_input";
    ErrorCategory["SECURITY"] = "security";
    ErrorCategory["ROLLBACK"] = "rollback";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
class DNAError extends Error {
    constructor(message, code, context, additionalContext) {
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
    toJSON() {
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
exports.DNAError = DNAError;
// Validation Errors
class ValidationError extends DNAError {
    constructor(message, code, suggestion, autoFix, additionalContext) {
        super(message, code, {
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.MEDIUM,
            recoverable: true,
            autoFixable: !!autoFix,
            suggestion,
            autoFix,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/validation',
        }, additionalContext);
    }
}
exports.ValidationError = ValidationError;
class SchemaValidationError extends ValidationError {
    constructor(fieldPath, expectedType, actualValue) {
        super(`Schema validation failed: field '${fieldPath}' expected ${expectedType}, got ${typeof actualValue}`, 'SCHEMA_VALIDATION_FAILED', `Update the '${fieldPath}' field to match the expected type: ${expectedType}`, undefined, { fieldPath, expectedType, actualValue });
    }
}
exports.SchemaValidationError = SchemaValidationError;
class ProjectNameValidationError extends ValidationError {
    constructor(name, reason) {
        super(`Invalid project name '${name}': ${reason}`, 'INVALID_PROJECT_NAME', 'Use alphanumeric characters, hyphens, and underscores only. Start with a letter and keep length between 3-50 characters', undefined, { invalidName: name, reason });
    }
}
exports.ProjectNameValidationError = ProjectNameValidationError;
// Template Errors
class TemplateError extends DNAError {
    constructor(message, code, suggestion, autoFix, additionalContext) {
        super(message, code, {
            category: ErrorCategory.TEMPLATE,
            severity: ErrorSeverity.HIGH,
            recoverable: true,
            autoFixable: !!autoFix,
            suggestion,
            autoFix,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/templates',
        }, additionalContext);
    }
}
exports.TemplateError = TemplateError;
class TemplateNotFoundError extends TemplateError {
    constructor(templateId, availableTemplates) {
        super(`Template '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', `Available templates: ${availableTemplates.join(', ')}. Use 'dna-cli list' to see all templates`, undefined, { templateId, availableTemplates });
    }
}
exports.TemplateNotFoundError = TemplateNotFoundError;
class TemplateCorruptedError extends TemplateError {
    constructor(templateId, reason) {
        super(`Template '${templateId}' is corrupted: ${reason}`, 'TEMPLATE_CORRUPTED', `Try updating the template registry with 'dna-cli update' or report this issue`, undefined, { templateId, reason });
    }
}
exports.TemplateCorruptedError = TemplateCorruptedError;
class DNAModuleConflictError extends TemplateError {
    constructor(conflictingModules, reason) {
        super(`DNA module conflict: ${conflictingModules.join(', ')} - ${reason}`, 'DNA_MODULE_CONFLICT', `Choose only one module from the conflicting group: ${conflictingModules.join(', ')}`, undefined, { conflictingModules, reason });
    }
}
exports.DNAModuleConflictError = DNAModuleConflictError;
// Filesystem Errors
class FilesystemError extends DNAError {
    constructor(message, code, suggestion, autoFix, additionalContext) {
        super(message, code, {
            category: ErrorCategory.FILESYSTEM,
            severity: ErrorSeverity.HIGH,
            recoverable: true,
            autoFixable: !!autoFix,
            suggestion,
            autoFix,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/filesystem',
        }, additionalContext);
    }
}
exports.FilesystemError = FilesystemError;
class InsufficientPermissionsError extends FilesystemError {
    constructor(path, operation) {
        super(`Insufficient permissions to ${operation} at '${path}'`, 'INSUFFICIENT_PERMISSIONS', `Check file/directory permissions or run with appropriate user privileges`, undefined, { path, operation });
    }
}
exports.InsufficientPermissionsError = InsufficientPermissionsError;
class DirectoryExistsError extends FilesystemError {
    constructor(path) {
        super(`Directory '${path}' already exists`, 'DIRECTORY_EXISTS', `Choose a different project name, remove the existing directory, or use --overwrite flag`, undefined, { path });
    }
}
exports.DirectoryExistsError = DirectoryExistsError;
class InsufficientDiskSpaceError extends FilesystemError {
    constructor(required, available) {
        super(`Insufficient disk space: required ${Math.round(required / 1024 / 1024)}MB, available ${Math.round(available / 1024 / 1024)}MB`, 'INSUFFICIENT_DISK_SPACE', `Free up disk space or choose a different location`, undefined, { required, available });
    }
}
exports.InsufficientDiskSpaceError = InsufficientDiskSpaceError;
// Network Errors
class NetworkError extends DNAError {
    constructor(message, code, suggestion, autoFix, additionalContext) {
        super(message, code, {
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.MEDIUM,
            recoverable: true,
            autoFixable: !!autoFix,
            suggestion,
            autoFix,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/network',
        }, additionalContext);
    }
}
exports.NetworkError = NetworkError;
class TemplateDownloadError extends NetworkError {
    constructor(templateId, url, statusCode) {
        super(`Failed to download template '${templateId}' from ${url}${statusCode ? ` (HTTP ${statusCode})` : ''}`, 'TEMPLATE_DOWNLOAD_FAILED', `Check internet connection, verify proxy settings if behind corporate firewall, or try again later`, undefined, { templateId, url, statusCode });
    }
}
exports.TemplateDownloadError = TemplateDownloadError;
class RegistryConnectionError extends NetworkError {
    constructor(registryUrl) {
        super(`Failed to connect to template registry at ${registryUrl}`, 'REGISTRY_CONNECTION_FAILED', `Check internet connection and registry URL, or try again later`, undefined, { registryUrl });
    }
}
exports.RegistryConnectionError = RegistryConnectionError;
// Dependency Errors
class DependencyError extends DNAError {
    constructor(message, code, suggestion, autoFix, additionalContext) {
        super(message, code, {
            category: ErrorCategory.DEPENDENCY,
            severity: ErrorSeverity.HIGH,
            recoverable: true,
            autoFixable: !!autoFix,
            suggestion,
            autoFix,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/dependencies',
        }, additionalContext);
    }
}
exports.DependencyError = DependencyError;
class DependencyInstallError extends DependencyError {
    constructor(packageManager, exitCode, stderr) {
        const autoFix = async () => {
            // Try alternative approaches
            if (packageManager === 'npm') {
                throw new Error('Auto-fix: Try clearing npm cache with "npm cache clean --force"');
            }
        };
        super(`Dependency installation failed with ${packageManager} (exit code: ${exitCode})`, 'DEPENDENCY_INSTALL_FAILED', `Check Node.js and ${packageManager} versions, clear package manager cache, or try a different package manager`, autoFix, { packageManager, exitCode, stderr });
    }
}
exports.DependencyInstallError = DependencyInstallError;
class PackageManagerNotFoundError extends DependencyError {
    constructor(packageManager, availableManagers) {
        super(`Package manager '${packageManager}' not found`, 'PACKAGE_MANAGER_NOT_FOUND', `Install ${packageManager} or choose from available: ${availableManagers.join(', ')}`, undefined, { packageManager, availableManagers });
    }
}
exports.PackageManagerNotFoundError = PackageManagerNotFoundError;
// System Errors
class SystemError extends DNAError {
    constructor(message, code, suggestion, autoFix, additionalContext) {
        super(message, code, {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.HIGH,
            recoverable: false,
            autoFixable: !!autoFix,
            suggestion,
            autoFix,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/system',
        }, additionalContext);
    }
}
exports.SystemError = SystemError;
class UnsupportedNodeVersionError extends SystemError {
    constructor(currentVersion, requiredVersion) {
        super(`Node.js version ${currentVersion} is not supported. Required: ${requiredVersion}`, 'UNSUPPORTED_NODE_VERSION', `Upgrade Node.js to version ${requiredVersion} or higher`, undefined, { currentVersion, requiredVersion });
    }
}
exports.UnsupportedNodeVersionError = UnsupportedNodeVersionError;
class MissingSystemToolError extends SystemError {
    constructor(tool, purpose, installInstructions) {
        super(`Required system tool '${tool}' not found (needed for ${purpose})`, 'MISSING_SYSTEM_TOOL', installInstructions || `Install ${tool} for ${purpose}`, undefined, { tool, purpose, installInstructions });
    }
}
exports.MissingSystemToolError = MissingSystemToolError;
// Configuration Errors
class ConfigurationError extends DNAError {
    constructor(message, code, suggestion, autoFix, additionalContext) {
        super(message, code, {
            category: ErrorCategory.CONFIGURATION,
            severity: ErrorSeverity.MEDIUM,
            recoverable: true,
            autoFixable: !!autoFix,
            suggestion,
            autoFix,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/configuration',
        }, additionalContext);
    }
}
exports.ConfigurationError = ConfigurationError;
class InvalidConfigurationError extends ConfigurationError {
    constructor(configPath, errors) {
        super(`Invalid configuration in ${configPath}: ${errors.join(', ')}`, 'INVALID_CONFIGURATION', `Fix the configuration errors or regenerate the configuration file`, undefined, { configPath, errors });
    }
}
exports.InvalidConfigurationError = InvalidConfigurationError;
// Rollback Errors
class RollbackError extends DNAError {
    constructor(message, code, suggestion, additionalContext) {
        super(message, code, {
            category: ErrorCategory.ROLLBACK,
            severity: ErrorSeverity.CRITICAL,
            recoverable: false,
            autoFixable: false,
            suggestion,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/rollback',
        }, additionalContext);
    }
}
exports.RollbackError = RollbackError;
class RollbackFailedError extends RollbackError {
    constructor(reason, partiallyCompleted) {
        super(`Rollback failed: ${reason}. Partially completed operations: ${partiallyCompleted.join(', ')}`, 'ROLLBACK_FAILED', `Manual cleanup may be required. Check the project directory and remove any partial files`, { reason, partiallyCompleted });
    }
}
exports.RollbackFailedError = RollbackFailedError;
// Security Errors
class SecurityError extends DNAError {
    constructor(message, code, suggestion, additionalContext) {
        super(message, code, {
            category: ErrorCategory.SECURITY,
            severity: ErrorSeverity.CRITICAL,
            recoverable: false,
            autoFixable: false,
            suggestion,
            helpUrl: 'https://docs.dna-cli.com/troubleshooting/security',
        }, additionalContext);
    }
}
exports.SecurityError = SecurityError;
class UnsafePathError extends SecurityError {
    constructor(path, reason) {
        super(`Unsafe path detected: ${path} - ${reason}`, 'UNSAFE_PATH', `Use a safe path without path traversal or special characters`, { path, reason });
    }
}
exports.UnsafePathError = UnsafePathError;
// Error Factory Functions
function createValidationError(message, code, suggestion) {
    return new ValidationError(message, code, suggestion);
}
exports.createValidationError = createValidationError;
function createTemplateError(message, code, suggestion) {
    return new TemplateError(message, code, suggestion);
}
exports.createTemplateError = createTemplateError;
function createFilesystemError(message, code, suggestion) {
    return new FilesystemError(message, code, suggestion);
}
exports.createFilesystemError = createFilesystemError;
function createNetworkError(message, code, suggestion) {
    return new NetworkError(message, code, suggestion);
}
exports.createNetworkError = createNetworkError;
function createDependencyError(message, code, suggestion) {
    return new DependencyError(message, code, suggestion);
}
exports.createDependencyError = createDependencyError;
function createSystemError(message, code, suggestion) {
    return new SystemError(message, code, suggestion);
}
exports.createSystemError = createSystemError;
function createConfigurationError(message, code, suggestion) {
    return new ConfigurationError(message, code, suggestion);
}
exports.createConfigurationError = createConfigurationError;
// Error utilities
function isRecoverable(error) {
    return error.recoverable;
}
exports.isRecoverable = isRecoverable;
function isAutoFixable(error) {
    return error.autoFixable && !!error.autoFix;
}
exports.isAutoFixable = isAutoFixable;
function getCriticalErrors(errors) {
    return errors.filter(error => error.severity === ErrorSeverity.CRITICAL);
}
exports.getCriticalErrors = getCriticalErrors;
function getErrorsByCategory(errors, category) {
    return errors.filter(error => error.category === category);
}
exports.getErrorsByCategory = getErrorsByCategory;
function sortErrorsBySeverity(errors) {
    const severityOrder = {
        [ErrorSeverity.CRITICAL]: 0,
        [ErrorSeverity.HIGH]: 1,
        [ErrorSeverity.MEDIUM]: 2,
        [ErrorSeverity.LOW]: 3,
    };
    return [...errors].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
exports.sortErrorsBySeverity = sortErrorsBySeverity;
//# sourceMappingURL=error-types.js.map