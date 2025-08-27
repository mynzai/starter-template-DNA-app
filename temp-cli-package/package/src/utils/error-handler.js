"use strict";
/**
 * @fileoverview Comprehensive error handling for DNA CLI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePath = exports.validateProjectName = exports.handleError = exports.createCLIError = void 0;
const tslib_1 = require("tslib");
const chalk_compat_1 = tslib_1.__importDefault(require("./chalk-compat"));
const boxen_compat_1 = tslib_1.__importDefault(require("./boxen-compat"));
const logger_1 = require("./logger");
const environment_1 = require("../environments/environment");
function createCLIError(message, code, suggestion) {
    const error = new Error(message);
    error.code = code;
    if (suggestion !== undefined) {
        error.suggestion = suggestion;
    }
    error.recoverable = true;
    return error;
}
exports.createCLIError = createCLIError;
function handleError(error) {
    if (error instanceof Error) {
        const cliError = error;
        // Log the full error in debug mode
        if (environment_1.environment.debug) {
            logger_1.logger.debug('Full error details:', error);
            if (error.stack) {
                logger_1.logger.debug('Stack trace:', error.stack);
            }
        }
        // Display user-friendly error
        displayError(cliError);
        // Log to error tracking service in production
        if (environment_1.environment.production && environment_1.environment.telemetryEnabled) {
            // TODO: Implement error tracking service integration
            logger_1.logger.debug('Error would be reported to tracking service');
        }
    }
    else {
        // Handle non-Error objects
        const message = String(error);
        logger_1.logger.error('Unknown error occurred:', message);
        displayError(createCLIError(message, 'UNKNOWN_ERROR', 'Please try again or contact support'));
    }
}
exports.handleError = handleError;
function displayError(error) {
    const { message, code, suggestion } = error;
    let errorContent = `${chalk_compat_1.default.red.bold('Error:')} ${message}`;
    if (code) {
        errorContent += `\n${chalk_compat_1.default.gray(`Code: ${code}`)}`;
    }
    if (suggestion) {
        errorContent += `\n\n${chalk_compat_1.default.yellow.bold('Suggestion:')} ${suggestion}`;
    }
    // Add common troubleshooting for specific error types
    const troubleshooting = getTroubleshootingHelp(code);
    if (troubleshooting) {
        errorContent += `\n\n${chalk_compat_1.default.blue.bold('Troubleshooting:')}\n${troubleshooting}`;
    }
    // Add debug mode suggestion if not already in debug mode
    if (!environment_1.environment.debug) {
        errorContent += `\n\n${chalk_compat_1.default.gray('For more details, run with --debug flag')}`;
    }
    console.error((0, boxen_compat_1.default)(errorContent, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red',
    }));
}
function getTroubleshootingHelp(code) {
    const troubleshooting = {
        'TEMPLATE_NOT_FOUND': `• Check available templates with: ${chalk_compat_1.default.cyan('dna-cli list')}\n• Verify template name spelling\n• Update template registry: ${chalk_compat_1.default.cyan('dna-cli update')}`,
        'INVALID_PROJECT_NAME': `• Use alphanumeric characters, hyphens, and underscores only\n• Start with a letter\n• Keep length between 3-50 characters`,
        'DIRECTORY_EXISTS': `• Choose a different project name\n• Remove existing directory\n• Use ${chalk_compat_1.default.cyan('--overwrite')} flag to replace existing files`,
        'INSUFFICIENT_PERMISSIONS': `• Check file/directory permissions\n• Run with appropriate user privileges\n• Ensure write access to target directory`,
        'NETWORK_ERROR': `• Check internet connection\n• Verify proxy settings if behind corporate firewall\n• Try again in a few minutes`,
        'DEPENDENCY_INSTALL_FAILED': `• Check Node.js and npm versions\n• Clear npm cache: ${chalk_compat_1.default.cyan('npm cache clean --force')}\n• Try different package manager: ${chalk_compat_1.default.cyan('--package-manager yarn')}`,
        'TEMPLATE_VALIDATION_FAILED': `• Template may be corrupted or incomplete\n• Update template registry: ${chalk_compat_1.default.cyan('dna-cli update')}\n• Report issue if problem persists`,
        'DNA_MODULE_CONFLICT': `• Check DNA module compatibility\n• Review module requirements\n• Use ${chalk_compat_1.default.cyan('dna-cli validate')} to check configuration`,
    };
    return code ? troubleshooting[code] || null : null;
}
function validateProjectName(name) {
    // Check length
    if (name.length < 3 || name.length > 50) {
        return 'Project name must be between 3 and 50 characters';
    }
    // Check format
    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
        return 'Project name must start with a letter and contain only letters, numbers, hyphens, and underscores';
    }
    // Check for reserved names
    const reservedNames = [
        'node_modules', 'npm', 'yarn', 'pnpm', 'bun',
        'src', 'lib', 'test', 'tests', 'dist', 'build',
        'public', 'static', 'assets', '.git', '.env',
        'package', 'packages', 'config', 'scripts'
    ];
    if (reservedNames.includes(name.toLowerCase())) {
        return `"${name}" is a reserved name and cannot be used`;
    }
    return null;
}
exports.validateProjectName = validateProjectName;
function validatePath(path) {
    // Check for invalid characters
    if (/[<>:"|?*]/.test(path)) {
        return 'Path contains invalid characters';
    }
    // Check for relative path traversal
    if (path.includes('..')) {
        return 'Path cannot contain relative path traversal (..)';
    }
    return null;
}
exports.validatePath = validatePath;
//# sourceMappingURL=error-handler.js.map