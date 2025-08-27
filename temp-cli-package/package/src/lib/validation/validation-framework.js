"use strict";
/**
 * @fileoverview Validation framework with schema validation for template.json files and runtime validation
 * Provides comprehensive validation utilities and health checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationFramework = exports.projectHealthSchema = exports.templateConfigSchema = exports.dnaModuleSchema = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const zod_1 = require("zod");
const semver_1 = tslib_1.__importDefault(require("semver"));
const validation_engine_1 = require("./validation-engine");
// DNA Module Schema
exports.dnaModuleSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    author: zod_1.z.string(),
    license: zod_1.z.string().optional(),
    category: zod_1.z.enum(['auth', 'payment', 'database', 'ui', 'analytics', 'deployment', 'testing', 'monitoring']),
    compatibleFrameworks: zod_1.z.array(zod_1.z.enum(['nextjs', 'react-native', 'flutter', 'tauri', 'sveltekit', 'express', 'fastapi'])),
    dependencies: zod_1.z.record(zod_1.z.string()).optional(),
    devDependencies: zod_1.z.record(zod_1.z.string()).optional(),
    peerDependencies: zod_1.z.record(zod_1.z.string()).optional(),
    configuration: zod_1.z.object({
        required: zod_1.z.array(zod_1.z.string()).optional(),
        optional: zod_1.z.array(zod_1.z.string()).optional(),
        environment: zod_1.z.record(zod_1.z.string()).optional(),
    }).optional(),
    conflicts: zod_1.z.array(zod_1.z.string()).optional(),
    requires: zod_1.z.array(zod_1.z.string()).optional(),
    files: zod_1.z.array(zod_1.z.object({
        source: zod_1.z.string(),
        target: zod_1.z.string(),
        type: zod_1.z.enum(['template', 'copy', 'merge']).optional(),
    })).optional(),
    scripts: zod_1.z.record(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// Template Configuration Schema
exports.templateConfigSchema = zod_1.z.object({
    templateVersion: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    metadata: zod_1.z.object({
        name: zod_1.z.string().min(1),
        description: zod_1.z.string(),
        author: zod_1.z.string(),
        license: zod_1.z.string().optional(),
        repository: zod_1.z.string().url().optional(),
        homepage: zod_1.z.string().url().optional(),
        keywords: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    structure: zod_1.z.object({
        baseDirectory: zod_1.z.string().optional(),
        files: zod_1.z.array(zod_1.z.object({
            source: zod_1.z.string(),
            target: zod_1.z.string(),
            type: zod_1.z.enum(['template', 'copy', 'merge']).default('copy'),
            condition: zod_1.z.string().optional(),
        })),
        directories: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    variables: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        description: zod_1.z.string(),
        type: zod_1.z.enum(['string', 'number', 'boolean', 'select', 'multiselect']),
        required: zod_1.z.boolean().default(false),
        default: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())]).optional(),
        options: zod_1.z.array(zod_1.z.string()).optional(),
        validation: zod_1.z.object({
            pattern: zod_1.z.string().optional(),
            min: zod_1.z.number().optional(),
            max: zod_1.z.number().optional(),
            minLength: zod_1.z.number().optional(),
            maxLength: zod_1.z.number().optional(),
        }).optional(),
        condition: zod_1.z.string().optional(),
    })).optional(),
    scripts: zod_1.z.object({
        preGenerate: zod_1.z.array(zod_1.z.string()).optional(),
        postGenerate: zod_1.z.array(zod_1.z.string()).optional(),
        preInstall: zod_1.z.array(zod_1.z.string()).optional(),
        postInstall: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    requirements: zod_1.z.object({
        node: zod_1.z.string().optional(),
        npm: zod_1.z.string().optional(),
        yarn: zod_1.z.string().optional(),
        pnpm: zod_1.z.string().optional(),
        bun: zod_1.z.string().optional(),
        tools: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            version: zod_1.z.string().optional(),
            optional: zod_1.z.boolean().default(false),
            installInstructions: zod_1.z.string().optional(),
        })).optional(),
        platforms: zod_1.z.array(zod_1.z.enum(['darwin', 'linux', 'win32'])).optional(),
    }).optional(),
    dnaModules: zod_1.z.array(zod_1.z.string()).optional(),
    extends: zod_1.z.string().optional(),
});
// Project Health Schema
exports.projectHealthSchema = zod_1.z.object({
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    main: zod_1.z.string().optional(),
    scripts: zod_1.z.object({
        dev: zod_1.z.string().optional(),
        build: zod_1.z.string().optional(),
        start: zod_1.z.string().optional(),
        test: zod_1.z.string().optional(),
        lint: zod_1.z.string().optional(),
    }).optional(),
    dependencies: zod_1.z.record(zod_1.z.string()).optional(),
    devDependencies: zod_1.z.record(zod_1.z.string()).optional(),
    engines: zod_1.z.object({
        node: zod_1.z.string().optional(),
        npm: zod_1.z.string().optional(),
    }).optional(),
});
class ValidationFramework {
    constructor() {
        this.schemaCache = new Map();
        this.validationEngine = validation_engine_1.ValidationEngine.getInstance();
        this.initializeSchemas();
    }
    static getInstance() {
        if (!ValidationFramework.instance) {
            ValidationFramework.instance = new ValidationFramework();
        }
        return ValidationFramework.instance;
    }
    /**
     * Validate a template.json file
     */
    async validateTemplateConfig(templatePath) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
        };
        try {
            const configPath = path_1.default.join(templatePath, 'template.json');
            if (!(await fs_extra_1.default.pathExists(configPath))) {
                result.errors.push('template.json file not found');
                result.suggestions.push('Create a template.json file with proper template configuration');
                result.valid = false;
                return result;
            }
            const configContent = await fs_extra_1.default.readJSON(configPath);
            // Validate against schema
            const validationResult = exports.templateConfigSchema.safeParse(configContent);
            if (!validationResult.success) {
                for (const error of validationResult.error.errors) {
                    result.errors.push(`Schema validation error: ${error.path.join('.')} - ${error.message}`);
                }
                result.valid = false;
                return result;
            }
            const config = validationResult.data;
            // Validate template structure
            await this.validateTemplateStructure(templatePath, config, result);
            // Validate DNA modules
            await this.validateTemplateDnaModules(config, result);
            // Validate requirements
            await this.validateTemplateRequirements(config, result);
            // Validate variables
            this.validateTemplateVariables(config, result);
            result.valid = result.errors.length === 0;
        }
        catch (error) {
            result.errors.push(`Failed to validate template config: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.valid = false;
        }
        return result;
    }
    /**
     * Validate DNA module configuration
     */
    async validateDnaModule(modulePath) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
        };
        try {
            const configPath = path_1.default.join(modulePath, 'dna-module.json');
            if (!(await fs_extra_1.default.pathExists(configPath))) {
                result.errors.push('dna-module.json file not found');
                result.suggestions.push('Create a dna-module.json file with proper module configuration');
                result.valid = false;
                return result;
            }
            const configContent = await fs_extra_1.default.readJSON(configPath);
            // Validate against schema
            const validationResult = exports.dnaModuleSchema.safeParse(configContent);
            if (!validationResult.success) {
                for (const error of validationResult.error.errors) {
                    result.errors.push(`Schema validation error: ${error.path.join('.')} - ${error.message}`);
                }
                result.valid = false;
                return result;
            }
            const config = validationResult.data;
            // Validate module files
            await this.validateModuleFiles(modulePath, config, result);
            // Validate dependencies
            this.validateModuleDependencies(config, result);
            result.valid = result.errors.length === 0;
        }
        catch (error) {
            result.errors.push(`Failed to validate DNA module: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.valid = false;
        }
        return result;
    }
    /**
     * Validate generated project health
     */
    async validateProjectHealth(projectPath) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
        };
        try {
            // Check package.json
            const packageJsonPath = path_1.default.join(projectPath, 'package.json');
            if (await fs_extra_1.default.pathExists(packageJsonPath)) {
                const packageJson = await fs_extra_1.default.readJSON(packageJsonPath);
                const validationResult = exports.projectHealthSchema.safeParse(packageJson);
                if (!validationResult.success) {
                    for (const error of validationResult.error.errors) {
                        result.warnings.push(`package.json issue: ${error.path.join('.')} - ${error.message}`);
                    }
                }
                // Check for security vulnerabilities in dependencies
                await this.checkDependencySecurityIssues(packageJson, result);
            }
            else {
                result.errors.push('package.json not found');
            }
            // Check essential project files
            await this.validateEssentialFiles(projectPath, result);
            // Check DNA configuration
            await this.validateDnaConfiguration(projectPath, result);
            // Check git repository
            await this.validateGitRepository(projectPath, result);
            // Check file permissions
            await this.validateFilePermissions(projectPath, result);
            result.valid = result.errors.length === 0;
        }
        catch (error) {
            result.errors.push(`Failed to validate project health: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.valid = false;
        }
        return result;
    }
    /**
     * Runtime validation for user inputs
     */
    validateUserInput(input, schema, fieldName) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
        };
        try {
            const validationResult = schema.safeParse(input);
            if (!validationResult.success) {
                for (const error of validationResult.error.errors) {
                    result.errors.push(`${fieldName} validation error: ${error.path.join('.')} - ${error.message}`);
                }
                result.valid = false;
            }
        }
        catch (error) {
            result.errors.push(`Runtime validation failed for ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.valid = false;
        }
        return result;
    }
    /**
     * Comprehensive pre-generation validation
     */
    async runComprehensiveValidation(config, templateMetadata) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
        };
        try {
            // Pre-generation validation
            const preGenResult = await this.validationEngine.validatePreGeneration(config);
            this.mergeValidationResults(result, preGenResult);
            // Template validation
            const templateResult = await this.validationEngine.validateTemplate(templateMetadata);
            this.mergeValidationResults(result, templateResult);
            // Environment validation
            const envResult = await this.validationEngine.validateEnvironment();
            this.mergeValidationResults(result, envResult);
            // Dependency validation
            const depResult = await this.validationEngine.validateDependencies(config, templateMetadata);
            this.mergeValidationResults(result, depResult);
            result.valid = result.errors.length === 0;
        }
        catch (error) {
            result.errors.push(`Comprehensive validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.valid = false;
        }
        return result;
    }
    /**
     * Create custom validation schema
     */
    createCustomSchema(schemaDefinition) {
        return schemaDefinition;
    }
    /**
     * Register custom schema
     */
    registerSchema(name, schema) {
        this.schemaCache.set(name, schema);
    }
    /**
     * Get registered schema
     */
    getSchema(name) {
        return this.schemaCache.get(name);
    }
    // Private helper methods
    initializeSchemas() {
        this.schemaCache.set('template', exports.templateConfigSchema);
        this.schemaCache.set('dnaModule', exports.dnaModuleSchema);
        this.schemaCache.set('projectHealth', exports.projectHealthSchema);
    }
    async validateTemplateStructure(templatePath, config, result) {
        if (config.structure?.files) {
            for (const file of config.structure.files) {
                const sourcePath = path_1.default.join(templatePath, file.source);
                if (!(await fs_extra_1.default.pathExists(sourcePath))) {
                    result.errors.push(`Template file not found: ${file.source}`);
                }
            }
        }
        if (config.structure?.directories) {
            for (const dir of config.structure.directories) {
                const dirPath = path_1.default.join(templatePath, dir);
                if (!(await fs_extra_1.default.pathExists(dirPath))) {
                    result.warnings.push(`Template directory not found: ${dir}`);
                }
            }
        }
    }
    async validateTemplateDnaModules(config, result) {
        if (config.dnaModules) {
            for (const moduleId of config.dnaModules) {
                // In a real implementation, this would check against the DNA module registry
                if (!this.isDnaModuleValid(moduleId)) {
                    result.warnings.push(`DNA module may not be available: ${moduleId}`);
                }
            }
        }
    }
    async validateTemplateRequirements(config, result) {
        if (config.requirements) {
            const req = config.requirements;
            // Validate version requirements
            if (req.node && !semver_1.default.validRange(req.node)) {
                result.errors.push(`Invalid Node.js version requirement: ${req.node}`);
            }
            if (req.npm && !semver_1.default.validRange(req.npm)) {
                result.errors.push(`Invalid npm version requirement: ${req.npm}`);
            }
            // Validate platform requirements
            if (req.platforms) {
                const validPlatforms = ['darwin', 'linux', 'win32'];
                for (const platform of req.platforms) {
                    if (!validPlatforms.includes(platform)) {
                        result.errors.push(`Invalid platform requirement: ${platform}`);
                    }
                }
            }
        }
    }
    validateTemplateVariables(config, result) {
        if (config.variables) {
            for (const variable of config.variables) {
                // Validate select/multiselect options
                if ((variable.type === 'select' || variable.type === 'multiselect') && !variable.options) {
                    result.errors.push(`Variable '${variable.name}' of type '${variable.type}' must have options`);
                }
                // Validate default values
                if (variable.default !== undefined) {
                    if (variable.type === 'number' && typeof variable.default !== 'number') {
                        result.errors.push(`Variable '${variable.name}' default value must be a number`);
                    }
                    if (variable.type === 'boolean' && typeof variable.default !== 'boolean') {
                        result.errors.push(`Variable '${variable.name}' default value must be a boolean`);
                    }
                }
                // Validate pattern if provided
                if (variable.validation?.pattern) {
                    try {
                        new RegExp(variable.validation.pattern);
                    }
                    catch {
                        result.errors.push(`Variable '${variable.name}' has invalid validation pattern`);
                    }
                }
            }
        }
    }
    async validateModuleFiles(modulePath, config, result) {
        if (config.files) {
            for (const file of config.files) {
                const sourcePath = path_1.default.join(modulePath, file.source);
                if (!(await fs_extra_1.default.pathExists(sourcePath))) {
                    result.errors.push(`Module file not found: ${file.source}`);
                }
            }
        }
    }
    validateModuleDependencies(config, result) {
        // Check for dependency conflicts
        if (config.conflicts) {
            for (const conflict of config.conflicts) {
                if (config.requires?.includes(conflict)) {
                    result.errors.push(`Module cannot both require and conflict with: ${conflict}`);
                }
            }
        }
        // Validate version ranges
        const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
        for (const depType of depTypes) {
            if (config[depType]) {
                for (const [pkg, version] of Object.entries(config[depType])) {
                    if (typeof version === 'string' && !semver_1.default.validRange(version)) {
                        result.warnings.push(`Invalid version range for ${pkg}: ${version}`);
                    }
                }
            }
        }
    }
    async validateEssentialFiles(projectPath, result) {
        const essentialFiles = [
            'README.md',
            '.gitignore',
            'package.json',
        ];
        for (const file of essentialFiles) {
            const filePath = path_1.default.join(projectPath, file);
            if (!(await fs_extra_1.default.pathExists(filePath))) {
                result.warnings.push(`Essential file missing: ${file}`);
            }
        }
    }
    async validateDnaConfiguration(projectPath, result) {
        const dnaConfigPath = path_1.default.join(projectPath, 'dna.config.json');
        if (await fs_extra_1.default.pathExists(dnaConfigPath)) {
            try {
                const dnaConfig = await fs_extra_1.default.readJSON(dnaConfigPath);
                // Basic validation
                if (!dnaConfig.template) {
                    result.warnings.push('DNA config missing template information');
                }
                if (!dnaConfig.generated) {
                    result.warnings.push('DNA config missing generation timestamp');
                }
            }
            catch (error) {
                result.errors.push('Invalid DNA configuration file');
            }
        }
        else {
            result.warnings.push('DNA configuration file not found');
        }
    }
    async validateGitRepository(projectPath, result) {
        const gitPath = path_1.default.join(projectPath, '.git');
        if (!(await fs_extra_1.default.pathExists(gitPath))) {
            result.suggestions.push('Initialize git repository for version control');
        }
    }
    async validateFilePermissions(projectPath, result) {
        try {
            await fs_extra_1.default.access(projectPath, fs_extra_1.default.constants.R_OK | fs_extra_1.default.constants.W_OK);
        }
        catch (error) {
            result.warnings.push('Project directory may have permission issues');
        }
    }
    async checkDependencySecurityIssues(packageJson, result) {
        // In a real implementation, this would check against security databases
        // For now, just check for known problematic packages
        const problematicPackages = ['node-sass', 'bower', 'gulp'];
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };
        for (const pkg of problematicPackages) {
            if (allDeps[pkg]) {
                result.warnings.push(`Consider replacing deprecated package: ${pkg}`);
            }
        }
    }
    mergeValidationResults(target, source) {
        target.errors.push(...source.errors);
        target.warnings.push(...source.warnings);
        target.suggestions.push(...source.suggestions);
        target.valid = target.valid && source.valid;
    }
    isDnaModuleValid(moduleId) {
        // In a real implementation, this would check against the DNA module registry
        const commonModules = [
            'auth-firebase', 'auth-supabase', 'auth-cognito',
            'payment-stripe', 'payment-paypal',
            'database-postgres', 'database-mongodb', 'database-mysql',
            'ui-tailwind', 'ui-material', 'ui-chakra',
            'mobile-navigation', 'web-analytics',
        ];
        return commonModules.includes(moduleId);
    }
}
exports.ValidationFramework = ValidationFramework;
//# sourceMappingURL=validation-framework.js.map