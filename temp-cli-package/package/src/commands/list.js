"use strict";
/**
 * @fileoverview List command - Display available templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommand = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
const template_registry_1 = require("../lib/template-registry");
const error_handler_1 = require("../utils/error-handler");
exports.listCommand = new commander_1.Command('list')
    .description('List available templates and DNA modules')
    .option('-f, --framework <framework>', 'filter by framework')
    .option('-t, --type <type>', 'filter by template type')
    .option('-c, --complexity <level>', 'filter by complexity (beginner|intermediate|advanced)')
    .option('-d, --dna <modules>', 'filter by DNA modules (comma-separated)')
    .option('-q, --query <search>', 'search templates')
    .option('--categories', 'group by categories')
    .option('--detailed', 'show detailed information')
    .option('--json', 'output as JSON')
    .option('--no-color', 'disable colored output')
    .option('--templates', 'list all templates (default)', true)
    .option('--modules', 'list all DNA modules')
    .option('--compatible <template>', 'show modules compatible with template')
    .action(async (options) => {
    try {
        const registry = new template_registry_1.TemplateRegistry();
        await registry.load();
        // Handle --modules option
        if (options.modules) {
            await displayDNAModules();
            return;
        }
        // Handle --compatible option
        if (options.compatible) {
            await displayCompatibleModules(registry, options.compatible);
            return;
        }
        // Default: list templates
        const templates = await getFilteredTemplates(registry, options);
        if (templates.length === 0) {
            console.log(chalk_compat_1.default.yellow('No templates found matching your criteria.'));
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
        console.log(chalk_compat_1.default.dim(`\n📊 Total: ${templates.length} template(s)`));
        if (templates.length > 0) {
            console.log(chalk_compat_1.default.dim('💡 Use "dna-cli create" to start with a template'));
            console.log(chalk_compat_1.default.dim('💡 Use "dna-cli list --detailed" for more information'));
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
    console.log(chalk_compat_1.default.bold('\n📦 Available Templates:\n'));
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
    console.log(chalk_compat_1.default.bold('\n📂 Templates by Category:\n'));
    for (const [category, categoryTemplates] of Object.entries(filteredCategories)) {
        console.log(chalk_compat_1.default.bold.cyan(`${getCategoryIcon(category)} ${category}`));
        console.log(chalk_compat_1.default.dim(`   ${categoryTemplates.length} template(s)\n`));
        for (const template of categoryTemplates) {
            displayCompactTemplate(template, '   ');
        }
        console.log('');
    }
}
function displayDetailedTemplate(template) {
    const complexityIcon = getComplexityIcon(template.complexity);
    const statusIcon = getImplementationStatusIcon(template.implementationStatus);
    const rating = template.rating ? `⭐ ${template.rating}/5.0` : '';
    console.log(`${statusIcon} ${chalk_compat_1.default.bold.cyan(template.name)} ${chalk_compat_1.default.dim(`(${template.id})`)}`);
    console.log(`   ${chalk_compat_1.default.dim(template.description)}`);
    console.log('');
    console.log(`   Framework: ${chalk_compat_1.default.green(template.framework)}`);
    console.log(`   Complexity: ${complexityIcon} ${template.complexity}`);
    console.log(`   Status: ${getImplementationStatusText(template.implementationStatus)} ${getReadinessBar(template.readinessLevel)}`);
    console.log(`   Setup time: ⏱️  ${template.estimatedSetupTime} minutes`);
    if (template.setupRequired && template.implementationStatus !== 'production-ready') {
        console.log(`   Config time: ⚙️  ${template.setupRequired.estimatedConfigTime} minutes`);
    }
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
        console.log(`   DNA Modules: ${template.dnaModules.map(m => chalk_compat_1.default.blue(m)).join(', ')}`);
    }
    if (template.tags.length > 0) {
        console.log(`   Tags: ${template.tags.map(tag => chalk_compat_1.default.yellow(`#${tag}`)).join(' ')}`);
    }
    if (template.features.length > 0) {
        console.log(`   Features:`);
        template.features.slice(0, 3).forEach(feature => {
            console.log(`     ✅ ${feature}`);
        });
        if (template.features.length > 3) {
            console.log(`     ${chalk_compat_1.default.dim(`... and ${template.features.length - 3} more`)}`);
        }
    }
    if (template.setupRequired && template.implementationStatus !== 'production-ready') {
        console.log(`   Setup Required:`);
        template.setupRequired.requirements.slice(0, 3).forEach(req => {
            console.log(`     ⚙️  ${req}`);
        });
        if (template.setupRequired.requirements.length > 3) {
            console.log(`     ${chalk_compat_1.default.dim(`... and ${template.setupRequired.requirements.length - 3} more`)}`);
        }
    }
    console.log('');
    console.log(chalk_compat_1.default.dim('─'.repeat(80)));
    console.log('');
}
function displayCompactTemplate(template, indent = '') {
    const complexityIcon = getComplexityIcon(template.complexity);
    const statusIcon = getImplementationStatusIcon(template.implementationStatus);
    const rating = template.rating ? `⭐ ${template.rating}` : '';
    const setupTime = `⏱️  ${template.estimatedSetupTime}min`;
    console.log(`${indent}${statusIcon} ${chalk_compat_1.default.cyan(template.name)} ${chalk_compat_1.default.dim(`(${template.framework})`)} ${complexityIcon} ${setupTime} ${rating}`);
    console.log(`${indent}   ${chalk_compat_1.default.dim(template.description)}`);
    console.log(`${indent}   ${getImplementationStatusText(template.implementationStatus)} ${getReadinessBar(template.readinessLevel)}`);
    if (template.dnaModules.length > 0) {
        const modules = template.dnaModules.slice(0, 3).map(m => chalk_compat_1.default.blue(m)).join(', ');
        const extra = template.dnaModules.length > 3 ? chalk_compat_1.default.dim(` +${template.dnaModules.length - 3} more`) : '';
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
function getImplementationStatusIcon(status) {
    switch (status) {
        case 'production-ready':
            return '🟢';
        case 'needs-setup':
            return '🟡';
        case 'stub':
            return '🔴';
        default:
            return '🟡'; // Default to needs-setup
    }
}
function getImplementationStatusText(status) {
    switch (status) {
        case 'production-ready':
            return chalk_compat_1.default.green('Production Ready');
        case 'needs-setup':
            return chalk_compat_1.default.yellow('Needs Setup');
        case 'stub':
            return chalk_compat_1.default.red('Stub Template');
        default:
            return chalk_compat_1.default.yellow('Needs Setup');
    }
}
function getReadinessBar(readinessLevel) {
    if (!readinessLevel)
        return '';
    const barLength = 10;
    const filledLength = Math.round((readinessLevel / 100) * barLength);
    const emptyLength = barLength - filledLength;
    let color = chalk_compat_1.default.red;
    if (readinessLevel >= 80)
        color = chalk_compat_1.default.green;
    else if (readinessLevel >= 50)
        color = chalk_compat_1.default.yellow;
    const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
    return `${color(bar)} ${readinessLevel}%`;
}
async function displayDNAModules() {
    console.log(chalk_compat_1.default.bold('\n🧬 Available DNA Modules:\n'));
    const modules = {
        'Authentication': [
            { name: 'auth-jwt', description: 'JWT authentication with refresh tokens' },
            { name: 'auth-oauth', description: 'OAuth 2.0 with social logins' },
            { name: 'auth-biometric', description: 'Biometric authentication for mobile' },
            { name: 'auth-mfa', description: 'Multi-factor authentication' }
        ],
        'Payments': [
            { name: 'payments-stripe', description: 'Stripe payment integration' },
            { name: 'payments-paypal', description: 'PayPal payment gateway' },
            { name: 'payments-crypto', description: 'Cryptocurrency payments' },
            { name: 'payments-subscription', description: 'Subscription billing' }
        ],
        'AI Integration': [
            { name: 'ai-openai', description: 'OpenAI GPT models integration' },
            { name: 'ai-anthropic', description: 'Anthropic Claude integration' },
            { name: 'ai-ollama', description: 'Local AI with Ollama' },
            { name: 'ai-rag', description: 'Retrieval-augmented generation' }
        ],
        'Real-time': [
            { name: 'real-time-websocket', description: 'WebSocket real-time updates' },
            { name: 'real-time-webrtc', description: 'WebRTC for video/audio' },
            { name: 'real-time-sse', description: 'Server-sent events' },
            { name: 'real-time-pusher', description: 'Pusher real-time channels' }
        ],
        'Analytics': [
            { name: 'analytics-privacy-first', description: 'Privacy-focused analytics' },
            { name: 'analytics-ga4', description: 'Google Analytics 4' },
            { name: 'analytics-mixpanel', description: 'Mixpanel product analytics' },
            { name: 'analytics-custom', description: 'Custom event tracking' }
        ],
        'Security': [
            { name: 'security-rate-limit', description: 'Rate limiting and throttling' },
            { name: 'security-csrf', description: 'CSRF protection' },
            { name: 'security-validation', description: 'Input validation and sanitization' },
            { name: 'security-encryption', description: 'Data encryption at rest' }
        ]
    };
    for (const [category, categoryModules] of Object.entries(modules)) {
        console.log(chalk_compat_1.default.cyan(`${category}:`));
        for (const module of categoryModules) {
            console.log(`  ${chalk_compat_1.default.green('•')} ${chalk_compat_1.default.bold(module.name)}: ${chalk_compat_1.default.gray(module.description)}`);
        }
        console.log();
    }
    console.log(chalk_compat_1.default.dim('💡 Use "dna-cli create --modules <module1,module2>" to include modules'));
    console.log(chalk_compat_1.default.dim('💡 Use "dna-cli list --compatible <template>" to see compatible modules'));
}
async function displayCompatibleModules(registry, templateId) {
    const template = registry.getTemplate(templateId);
    if (!template) {
        console.log(chalk_compat_1.default.red(`Template "${templateId}" not found.`));
        console.log(chalk_compat_1.default.dim('Use "dna-cli list" to see available templates'));
        return;
    }
    console.log(chalk_compat_1.default.bold(`\n🧬 Modules compatible with ${chalk_compat_1.default.cyan(template.name)}:\n`));
    // Display included modules
    if (template.dnaModules && template.dnaModules.length > 0) {
        console.log(chalk_compat_1.default.green('✅ Included by default:'));
        for (const module of template.dnaModules) {
            console.log(`  ${chalk_compat_1.default.green('•')} ${module}`);
        }
        console.log();
    }
    // Display compatible additional modules based on framework
    const compatibleModules = {
        'nextjs': ['auth-jwt', 'auth-oauth', 'payments-stripe', 'ai-openai', 'ai-anthropic', 'analytics-ga4', 'real-time-websocket'],
        'flutter': ['auth-biometric', 'auth-jwt', 'payments-stripe', 'ai-openai', 'mobile-native', 'push-notifications'],
        'react-native': ['auth-biometric', 'auth-oauth', 'payments-stripe', 'ai-openai', 'mobile-native', 'push-notifications'],
        'tauri': ['desktop-native', 'system-integration', 'file-management', 'auto-updater'],
        'sveltekit': ['auth-jwt', 'real-time-websocket', 'analytics-privacy-first'],
        'electron': ['desktop-native', 'auto-updater', 'file-management', 'system-integration']
    };
    const additional = compatibleModules[template.framework] || [];
    const notIncluded = additional.filter(m => !template.dnaModules?.includes(m));
    if (notIncluded.length > 0) {
        console.log(chalk_compat_1.default.blue('➕ Additional compatible modules:'));
        for (const module of notIncluded) {
            console.log(`  ${chalk_compat_1.default.blue('•')} ${module}`);
        }
    }
    console.log();
    console.log(chalk_compat_1.default.dim('💡 Use "dna-cli create --template ' + templateId + ' --modules <module1,module2>" to add modules'));
}
//# sourceMappingURL=list.js.map