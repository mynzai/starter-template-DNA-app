"use strict";
/**
 * @fileoverview Validation Framework Mock - Simplified implementation for CLI commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonSchemas = exports.ValidationFramework = void 0;
class ValidationFramework {
    constructor() {
        this.schemas = new Map();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new ValidationFramework();
        }
        return this.instance;
    }
    validateUserInput(input, schema, name) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            this.validateValue(input, schema, name, errors, warnings, suggestions);
            return {
                valid: errors.length === 0,
                errors,
                warnings,
                suggestions,
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [error instanceof Error ? error.message : 'Validation error'],
                warnings,
                suggestions,
            };
        }
    }
    createCustomSchema(schema) {
        return { ...schema };
    }
    getSchema(name) {
        return this.schemas.get(name) || null;
    }
    registerSchema(name, schema) {
        this.schemas.set(name, schema);
    }
    validateValue(value, schema, path, errors, warnings, suggestions) {
        // Type validation
        if (!this.validateType(value, schema.type)) {
            errors.push(`${path}: Expected ${schema.type}, got ${typeof value}`);
            return;
        }
        // Specific type validations
        switch (schema.type) {
            case 'object':
                this.validateObject(value, schema, path, errors, warnings, suggestions);
                break;
            case 'array':
                this.validateArray(value, schema, path, errors, warnings, suggestions);
                break;
            case 'string':
                this.validateString(value, schema, path, errors, warnings, suggestions);
                break;
            case 'number':
                this.validateNumber(value, schema, path, errors, warnings, suggestions);
                break;
        }
        // Enum validation
        if (schema.enum && !schema.enum.includes(value)) {
            errors.push(`${path}: Must be one of: ${schema.enum.join(', ')}`);
            suggestions.push(`Try: ${schema.enum.slice(0, 3).join(', ')}`);
        }
    }
    validateType(value, expectedType) {
        switch (expectedType) {
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'array':
                return Array.isArray(value);
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            default:
                return false;
        }
    }
    validateObject(value, schema, path, errors, warnings, suggestions) {
        // Required properties
        if (schema.required) {
            for (const prop of schema.required) {
                if (!(prop in value)) {
                    errors.push(`${path}.${prop}: Required property missing`);
                }
            }
        }
        // Property validation
        if (schema.properties) {
            for (const [prop, propSchema] of Object.entries(schema.properties)) {
                if (prop in value) {
                    this.validateValue(value[prop], propSchema, `${path}.${prop}`, errors, warnings, suggestions);
                }
            }
        }
    }
    validateArray(value, schema, path, errors, warnings, suggestions) {
        if (schema.items) {
            value.forEach((item, index) => {
                this.validateValue(item, schema.items, `${path}[${index}]`, errors, warnings, suggestions);
            });
        }
    }
    validateString(value, schema, path, errors, warnings, suggestions) {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push(`${path}: Must be at least ${schema.minLength} characters`);
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push(`${path}: Must be at most ${schema.maxLength} characters`);
        }
        if (schema.pattern) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                errors.push(`${path}: Must match pattern ${schema.pattern}`);
            }
        }
    }
    validateNumber(value, schema, path, errors, warnings, suggestions) {
        if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push(`${path}: Must be at least ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push(`${path}: Must be at most ${schema.maximum}`);
        }
    }
}
exports.ValidationFramework = ValidationFramework;
// Common validation schemas
exports.commonSchemas = {
    framework: {
        type: 'string',
        enum: ['flutter', 'react-native', 'nextjs', 'tauri', 'sveltekit'],
    },
    testType: {
        type: 'string',
        enum: ['unit', 'integration', 'e2e', 'performance', 'accessibility', 'security'],
    },
    reportFormat: {
        type: 'string',
        enum: ['json', 'html', 'markdown', 'junit'],
    },
    gitCommitType: {
        type: 'string',
        enum: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build', 'revert'],
    },
};
// Initialize common schemas
const validationFramework = ValidationFramework.getInstance();
Object.entries(exports.commonSchemas).forEach(([name, schema]) => {
    validationFramework.registerSchema(name, schema);
});
//# sourceMappingURL=validation-framework.js.map