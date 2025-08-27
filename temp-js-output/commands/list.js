"use strict";
/**
 * @fileoverview List command - Display available templates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const template_registry_1 = require("../lib/template-registry");
const error_handler_1 = require("../utils/error-handler");
exports.listCommand = new commander_1.Command('list')
    .description('List available templates')
    .option('-f, --framework <framework>', 'filter by framework')
    .option('-t, --type <type>', 'filter by template type')
    .option('-c, --complexity <level>', 'filter by complexity (beginner|intermediate|advanced)')
    .option('-d, --dna <modules>', 'filter by DNA modules (comma-separated)')
    .option('-q, --query <search>', 'search templates')
    .option('--categories', 'group by categories')
    .option('--detailed', 'show detailed information')
    .option('--json', 'output as JSON')
    .option('--no-color', 'disable colored output')
    .action(async (options) => {
    try {
        const registry = new template_registry_1.TemplateRegistry();
        await registry.load();
        const templates = await getFilteredTemplates(registry, options);
        if (templates.length === 0) {
            console.log(chalk_1.default.yellow('No templates found matching your criteria.'));
            return;
        }
        if (options.json) {
            console.log(JSON.stringify(templates, null, 2));
            return;
        }
        if (options.categories) {
            await displayTemplatesByCategory(registry, templates);
        }
        else {
            await displayTemplatesList(templates, options);
        }
        // Show summary
        console.log(chalk_1.default.dim(`\n📊 Total: ${templates.length} template(s)`));
        if (templates.length > 0) {
            console.log(chalk_1.default.dim('💡 Use "dna-cli create" to start with a template'));
            console.log(chalk_1.default.dim('💡 Use "dna-cli list --detailed" for more information'));
        }
    }
    catch (error) {
        throw (0, error_handler_1.createCLIError)(error instanceof Error ? error.message : 'Failed to list templates', 'LIST_FAILED');
    }
});
async function getFilteredTemplates(registry, options) {
    let templates = registry.getTemplates();
    // Apply filters
    if (options.framework) {
        templates = registry.filterByFramework(options.framework);
    }
    if (options.type) {
        templates = registry.filterByType(options.type);
    }
    if (options.complexity) {
        templates = registry.filterByComplexity(options.complexity);
    }
    if (options.dna) {
        const dnaModules = options.dna.split(',').map((m) => m.trim());
        templates = templates.filter(t => dnaModules.some((module) => t.dnaModules.includes(module)));
    }
    if (options.query) {
        templates = registry.searchTemplates(options.query);
    }
    return templates;
}
async function displayTemplatesList(templates, options) {
    console.log(chalk_1.default.bold('\n📦 Available Templates:\n'));
    for (const template of templates) {
        if (options.detailed) {
            displayDetailedTemplate(template);
        }
        else {
            displayCompactTemplate(template);
        }
    }
}
async function displayTemplatesByCategory(registry, templates) {
    const categories = registry.getTemplatesByCategory();
    const filteredCategories = {};
    // Filter categories to only include templates from our filtered list
    const templateIds = new Set(templates.map(t => t.id));
    for (const [category, categoryTemplates] of Object.entries(categories)) {
        const filtered = categoryTemplates.filter(t => templateIds.has(t.id));
        if (filtered.length > 0) {
            filteredCategories[category] = filtered;
        }
    }
    console.log(chalk_1.default.bold('\n📂 Templates by Category:\n'));
    for (const [category, categoryTemplates] of Object.entries(filteredCategories)) {
        console.log(chalk_1.default.bold.cyan(`${getCategoryIcon(category)} ${category}`));
        console.log(chalk_1.default.dim(`   ${categoryTemplates.length} template(s)\n`));
        for (const template of categoryTemplates) {
            displayCompactTemplate(template, '   ');
        }
        console.log('');
    }
}
function displayDetailedTemplate(template) {
    const complexityIcon = getComplexityIcon(template.complexity);
    const rating = template.rating ? `⭐ ${template.rating}/5.0` : '';
    console.log(`${chalk_1.default.bold.cyan(template.name)} ${chalk_1.default.dim(`(${template.id})`)}`);
    console.log(`   ${chalk_1.default.dim(template.description)}`);
    console.log('');
    console.log(`   Framework: ${chalk_1.default.green(template.framework)}`);
    console.log(`   Complexity: ${complexityIcon} ${template.complexity}`);
    console.log(`   Setup time: ⏱️  ${template.estimatedSetupTime} minutes`);
    if (rating) {
        console.log(`   Rating: ${rating}`);
    }
    if (template.downloadCount) {
        console.log(`   Downloads: 📥 ${template.downloadCount.toLocaleString()}`);
    }
    console.log(`   Version: ${template.version}`);
    console.log(`   Author: ${template.author}`);
    console.log('');
    if (template.dnaModules.length > 0) {
        console.log(`   DNA Modules: ${template.dnaModules.map(m => chalk_1.default.blue(m)).join(', ')}`);
    }
    if (template.tags.length > 0) {
        console.log(`   Tags: ${template.tags.map(tag => chalk_1.default.yellow(`#${tag}`)).join(' ')}`);
    }
    if (template.features.length > 0) {
        console.log(`   Features:`);
        template.features.slice(0, 3).forEach(feature => {
            console.log(`     ✅ ${feature}`);
        });
        if (template.features.length > 3) {
            console.log(`     ${chalk_1.default.dim(`... and ${template.features.length - 3} more`)}`);
        }
    }
    console.log('');
    console.log(chalk_1.default.dim('─'.repeat(80)));
    console.log('');
}
function displayCompactTemplate(template, indent = '') {
    const complexityIcon = getComplexityIcon(template.complexity);
    const rating = template.rating ? `⭐ ${template.rating}` : '';
    const setupTime = `⏱️  ${template.estimatedSetupTime}min`;
    console.log(`${indent}${chalk_1.default.cyan(template.name)} ${chalk_1.default.dim(`(${template.framework})`)} ${complexityIcon} ${setupTime} ${rating}`);
    console.log(`${indent}   ${chalk_1.default.dim(template.description)}`);
    if (template.dnaModules.length > 0) {
        const modules = template.dnaModules.slice(0, 3).map(m => chalk_1.default.blue(m)).join(', ');
        const extra = template.dnaModules.length > 3 ? chalk_1.default.dim(` +${template.dnaModules.length - 3} more`) : '';
        console.log(`${indent}   🧬 ${modules}${extra}`);
    }
    console.log('');
}
function getComplexityIcon(complexity) {
    switch (complexity) {
        case 'beginner':
            return '🟢';
        case 'intermediate':
            return '🟡';
        case 'advanced':
            return '🔴';
        default:
            return '⚪';
    }
}
function getCategoryIcon(category) {
    switch (category.toLowerCase()) {
        case 'ai native':
            return '🤖';
        case 'performance':
            return '⚡';
        case 'cross platform':
            return '🌐';
        case 'foundation':
            return '🏗️';
        default:
            return '📁';
    }
}
