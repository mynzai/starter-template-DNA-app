"use strict";
/**
 * @fileoverview Enhanced List Command - Browse templates with improved UX
 * Simplified version using workspace adapter pattern
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedListCommand = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const chalk_compat_1 = tslib_1.__importDefault(require("../utils/chalk-compat"));
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../utils/error-handler");
exports.enhancedListCommand = new commander_1.Command('enhanced-list')
    .description('Browse and search available DNA templates with enhanced filtering')
    .option('-f, --framework <framework>', 'filter by framework')
    .option('-t, --type <type>', 'filter by template type')
    .option('-s, --search <query>', 'search templates by name or description')
    .option('--json', 'output as JSON')
    .option('--detailed', 'show detailed template information')
    .action(async (options) => {
    try {
        logger_1.logger.info('🧬 Enhanced Template Browser');
        // Mock template data for demonstration
        const mockTemplates = [
            {
                name: 'AI SaaS Next.js',
                description: 'Full-stack AI SaaS platform with subscription management',
                framework: options.framework || 'nextjs',
                type: 'ai-saas',
                version: '2.1.0',
                tags: ['ai', 'saas', 'nextjs', 'stripe']
            },
            {
                name: 'React Native AI Assistant',
                description: 'Cross-platform mobile AI assistant with voice integration',
                framework: 'react-native',
                type: 'mobile-ai',
                version: '1.8.0',
                tags: ['mobile', 'ai', 'voice', 'cross-platform']
            },
            {
                name: 'Flutter Universal App',
                description: 'Universal Flutter app for web, mobile, and desktop',
                framework: 'flutter',
                type: 'cross-platform',
                version: '3.2.0',
                tags: ['flutter', 'universal', 'cross-platform']
            }
        ];
        // Filter templates based on options
        let filteredTemplates = mockTemplates;
        if (options.framework) {
            filteredTemplates = filteredTemplates.filter(t => t.framework === options.framework);
        }
        if (options.type) {
            filteredTemplates = filteredTemplates.filter(t => t.type === options.type);
        }
        if (options.search) {
            const query = options.search.toLowerCase();
            filteredTemplates = filteredTemplates.filter(t => t.name.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query));
        }
        if (options.json) {
            console.log(JSON.stringify(filteredTemplates, null, 2));
            return;
        }
        logger_1.logger.info(`📋 Found ${chalk_compat_1.default.cyan(String(filteredTemplates.length))} enhanced templates`);
        if (filteredTemplates.length === 0) {
            logger_1.logger.info('No templates match your criteria');
            logger_1.logger.info('💡 Use standard list command for all templates: dna-cli list');
            return;
        }
        filteredTemplates.forEach((template, index) => {
            logger_1.logger.info(`\n${chalk_compat_1.default.cyan(`${index + 1}.`)} ${chalk_compat_1.default.bold(template.name)}`);
            logger_1.logger.info(`   ${chalk_compat_1.default.gray(template.description)}`);
            logger_1.logger.info(`   Framework: ${chalk_compat_1.default.cyan(template.framework)}`);
            logger_1.logger.info(`   Type: ${chalk_compat_1.default.cyan(template.type)}`);
            if (options.detailed) {
                logger_1.logger.info(`   Version: ${chalk_compat_1.default.cyan(template.version)}`);
                logger_1.logger.info(`   Tags: ${chalk_compat_1.default.cyan(template.tags.join(', '))}`);
            }
        });
        logger_1.logger.info(`\n✅ Enhanced template listing completed`);
        logger_1.logger.info('💡 Use standard list command for complete catalog: dna-cli list');
    }
    catch (error) {
        (0, error_handler_1.handleError)(error);
    }
});
//# sourceMappingURL=enhanced-list.js.map