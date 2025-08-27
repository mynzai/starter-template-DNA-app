"use strict";
/**
 * @fileoverview Create command - Template instantiation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommand = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const inquirer_compat_1 = tslib_1.__importDefault(require("../utils/inquirer-compat"));
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// Mock TemplateEngine for CLI functionality
class TemplateEngine {
    static getInstance() {
        return new TemplateEngine();
    }
}
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../utils/error-handler");
const template_registry_1 = require("../lib/template-registry");
const template_selector_1 = require("../lib/template-selector");
const project_generator_1 = require("../lib/project-generator");
const progress_tracker_1 = require("../lib/progress-tracker");
exports.createCommand = new commander_1.Command('create')
    .description('Create a new project from a DNA template')
    .argument('[name]', 'project name')
    .option('-t, --template <name>', 'template to use')
    .option('-f, --framework <framework>', 'target framework')
    .option('-o, --output <path>', 'output directory', process.cwd())
    .option('-m, --modules <modules>', 'DNA modules to include (comma-separated)')
    .option('-d, --dna <modules>', 'DNA modules to include (comma-separated) [deprecated, use --modules]')
    .option('-p, --package-manager <manager>', 'package manager to use', 'npm')
    .option('--skip-install', 'skip dependency installation')
    .option('--no-install', 'skip dependency installation (alias for --skip-install)')
    .option('--skip-git', 'skip git repository initialization')
    .option('--no-git', 'skip git repository initialization (alias for --skip-git)')
    .option('--dry-run', 'preview changes without creating files')
    .option('--overwrite', 'overwrite existing files')
    .option('--no-progress', 'disable progress indicators')
    .option('-y, --yes', 'skip interactive prompts and use defaults')
    .action(async (projectName, options) => {
    try {
        const config = await gatherProjectConfig(projectName, options);
        const generationOptions = {
            interactive: !options.yes,
            dryRun: options.dryRun || false,
            overwrite: options.overwrite || false,
            backup: true,
            progress: options.progress !== false,
        };
        await createProject(config, generationOptions);
    }
    catch (error) {
        throw (0, error_handler_1.createCLIError)(error instanceof Error ? error.message : 'Failed to create project', 'PROJECT_CREATION_FAILED', 'Check the error details and try again with different options');
    }
});
async function gatherProjectConfig(projectName, options = {}) {
    const registry = new template_registry_1.TemplateRegistry();
    await registry.load();
    let config = {
        packageManager: options.packageManager || 'npm',
        skipInstall: options.skipInstall || !options.install || false,
        skipGit: options.skipGit || !options.git || false,
        variables: {},
        dnaModules: [], // Initialize as empty array to prevent undefined access
    };
    // Get project name
    if (!projectName) {
        const { name } = await inquirer_compat_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'What is your project name?',
                validate: (input) => {
                    const error = (0, error_handler_1.validateProjectName)(input);
                    return error || true;
                },
            },
        ]);
        config.name = name;
    }
    else {
        const nameError = (0, error_handler_1.validateProjectName)(projectName);
        if (nameError) {
            throw (0, error_handler_1.createCLIError)(nameError, 'INVALID_PROJECT_NAME');
        }
        config.name = projectName;
    }
    // Get output path
    const outputPath = options.output
        ? path_1.default.resolve(options.output, config.name) // Always append project name to output path
        : path_1.default.resolve(process.cwd(), config.name);
    const pathError = (0, error_handler_1.validatePath)(outputPath);
    if (pathError) {
        throw (0, error_handler_1.createCLIError)(pathError, 'INVALID_PATH');
    }
    config.path = outputPath;
    // Check if directory exists
    if (await fs_extra_1.default.pathExists(outputPath)) {
        if (!options.overwrite) {
            if (options.yes) {
                throw (0, error_handler_1.createCLIError)(`Directory "${outputPath}" already exists`, 'DIRECTORY_EXISTS', 'Use --overwrite flag to replace existing files or choose a different name');
            }
            const { shouldOverwrite } = await inquirer_compat_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'shouldOverwrite',
                    message: `Directory "${outputPath}" already exists. Overwrite?`,
                    default: false,
                },
            ]);
            if (!shouldOverwrite) {
                throw (0, error_handler_1.createCLIError)('Project creation cancelled', 'CANCELLED');
            }
        }
    }
    // Get template selection
    if (!options.template) {
        const selector = new template_selector_1.TemplateSelector(registry);
        const selectedTemplate = await selector.selectTemplate({
            showCategories: true,
            showFilters: true,
            showRecommended: true,
            allowSearch: true,
            maxResults: 20,
        });
        if (!selectedTemplate) {
            throw (0, error_handler_1.createCLIError)('Template selection cancelled', 'CANCELLED');
        }
        config.template = selectedTemplate.id;
    }
    else {
        const template = registry.getTemplate(options.template);
        if (!template) {
            throw (0, error_handler_1.createCLIError)(`Template "${options.template}" not found`, 'TEMPLATE_NOT_FOUND', 'Use "dna-cli list" to see available templates');
        }
        config.template = options.template;
    }
    console.log(chalk_compat_1.default.yellow(`[DEBUG] Getting template with ID: ${config.template}`));
    const selectedTemplate = registry.getTemplate(config.template);
    if (!selectedTemplate) {
        console.log(chalk_compat_1.default.red(`[DEBUG] Template not found! ID: ${config.template}`));
        throw new Error(`Template not found: ${config.template}`);
    }
    console.log(chalk_compat_1.default.yellow(`[DEBUG] Selected template: ${JSON.stringify(selectedTemplate)}`));
    config.framework = selectedTemplate.framework;
    // Get DNA modules (support both --modules and --dna for backward compatibility)
    const modulesOption = options.modules || options.dna;
    if (!modulesOption && selectedTemplate.dnaModules.length > 0 && !options.yes) {
        console.log(chalk_compat_1.default.yellow('[DEBUG] Getting DNA modules...'));
        const selector = new template_selector_1.TemplateSelector(registry);
        try {
            const selectedModules = await selector.selectDnaModules(selectedTemplate.dnaModules, selectedTemplate.dnaModules // Pre-select all recommended modules
            );
            console.log(chalk_compat_1.default.yellow(`[DEBUG] Selected modules: ${JSON.stringify(selectedModules)}`));
            config.dnaModules = selectedModules;
        }
        catch (error) {
            console.log(chalk_compat_1.default.red(`[DEBUG] Error selecting DNA modules: ${error}`));
            console.log(chalk_compat_1.default.red(`[DEBUG] Stack: ${error.stack}`));
            throw error;
        }
    }
    else {
        config.dnaModules = modulesOption ? modulesOption.split(',').map((m) => m.trim()) : selectedTemplate.dnaModules;
    }
    // Gather template-specific variables
    console.log(chalk_compat_1.default.yellow('[DEBUG] About to gather template-specific variables...'));
    if (!options.yes) {
        console.log(chalk_compat_1.default.yellow('[DEBUG] Creating new TemplateSelector for variables...'));
        const selector = new template_selector_1.TemplateSelector(registry);
        try {
            console.log(chalk_compat_1.default.yellow(`[DEBUG] Calling collectTemplateVariables with template: ${selectedTemplate.id}, name: ${config.name}`));
            const templateVariables = await selector.collectTemplateVariables(selectedTemplate, config.name);
            console.log(chalk_compat_1.default.yellow(`[DEBUG] Template variables collected: ${JSON.stringify(templateVariables)}`));
            config.variables = { ...(config.variables || {}), ...(templateVariables || {}) };
            console.log(chalk_compat_1.default.yellow(`[DEBUG] Final config.variables: ${JSON.stringify(config.variables)}`));
        }
        catch (error) {
            console.log(chalk_compat_1.default.red(`[DEBUG] Error collecting template variables: ${error}`));
            console.log(chalk_compat_1.default.red(`[DEBUG] Stack: ${error.stack}`));
            throw error;
        }
    }
    console.log(chalk_compat_1.default.yellow('[DEBUG] Returning final config...'));
    return config;
}
async function createProject(config, options) {
    console.log(chalk_compat_1.default.yellow('[DEBUG] createProject called'));
    console.log(chalk_compat_1.default.yellow(`[DEBUG] config: ${JSON.stringify(config)}`));
    console.log(chalk_compat_1.default.yellow(`[DEBUG] options: ${JSON.stringify(options)}`));
    console.log(chalk_compat_1.default.yellow('[DEBUG] Creating ProgressTracker...'));
    const progressTracker = new progress_tracker_1.ProgressTracker(options.progress);
    console.log(chalk_compat_1.default.yellow('[DEBUG] Creating ProjectGenerator...'));
    const generator = new project_generator_1.ProjectGenerator(config, options, progressTracker);
    progressTracker.start('Creating project', 6);
    try {
        // Stage 1: Validate configuration
        progressTracker.update(1, 'Validating configuration...');
        await generator.validateConfiguration();
        // Stage 2: Prepare project directory
        progressTracker.update(2, 'Preparing project directory...');
        await generator.prepareDirectory();
        // Stage 3: Generate template files
        progressTracker.update(3, 'Generating template files...');
        await generator.generateFiles();
        // Stage 4: Install dependencies
        if (!config.skipInstall) {
            progressTracker.update(4, 'Installing dependencies...');
            await generator.installDependencies();
        }
        else {
            progressTracker.update(4, 'Skipping dependency installation...');
        }
        // Stage 5: Initialize git repository
        if (!config.skipGit) {
            progressTracker.update(5, 'Initializing git repository...');
            await generator.initializeGit();
        }
        else {
            progressTracker.update(5, 'Skipping git initialization...');
        }
        // Stage 6: Finalize project
        progressTracker.update(6, 'Finalizing project...');
        await generator.finalize();
        progressTracker.succeed('Project created successfully!');
        // Show next steps
        showNextSteps(config);
    }
    catch (error) {
        progressTracker.fail('Project creation failed');
        // Attempt rollback if not in dry-run mode
        if (!options.dryRun) {
            logger_1.logger.step('Attempting to clean up...');
            await generator.rollback();
        }
        throw error;
    }
}
function showNextSteps(config) {
    const { name, path: projectPath, skipInstall, skipGit } = config;
    const relativePath = path_1.default.relative(process.cwd(), projectPath);
    logger_1.logger.plain('');
    logger_1.logger.success(`✨ Project "${name}" created successfully!`);
    logger_1.logger.plain('');
    logger_1.logger.plain(chalk_compat_1.default.bold('📁 Project location:'));
    logger_1.logger.plain(`   ${chalk_compat_1.default.cyan(projectPath)}`);
    logger_1.logger.plain('');
    logger_1.logger.plain(chalk_compat_1.default.bold('🚀 Next steps:'));
    if (relativePath !== '.') {
        logger_1.logger.plain(`   ${chalk_compat_1.default.cyan(`cd ${relativePath}`)}`);
    }
    if (skipInstall) {
        logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('npm install')}          ${chalk_compat_1.default.gray('# Install dependencies')}`);
    }
    logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('npm run dev')}           ${chalk_compat_1.default.gray('# Start development server')}`);
    logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('npm run build')}         ${chalk_compat_1.default.gray('# Build for production')}`);
    logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('npm test')}              ${chalk_compat_1.default.gray('# Run tests')}`);
    if (skipGit) {
        logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('git init')}              ${chalk_compat_1.default.gray('# Initialize git repository')}`);
        logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('git add .')}             ${chalk_compat_1.default.gray('# Stage all files')}`);
        logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('git commit -m "Initial commit"')}  ${chalk_compat_1.default.gray('# Create first commit')}`);
    }
    logger_1.logger.plain('');
    logger_1.logger.plain(chalk_compat_1.default.bold('📚 Documentation:'));
    logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('./README.md')}           ${chalk_compat_1.default.gray('# Project-specific guide')}`);
    logger_1.logger.plain(`   ${chalk_compat_1.default.cyan('./docs/')}               ${chalk_compat_1.default.gray('# Additional documentation')}`);
    logger_1.logger.plain('');
}
// Utility functions
function toPascalCase(str) {
    return str
        .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
        .replace(/^(.)/, char => char.toUpperCase());
}
function toKebabCase(str) {
    return str
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
}
//# sourceMappingURL=create.js.map