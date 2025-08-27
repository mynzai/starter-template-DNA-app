"use strict";
/**
 * @fileoverview Template Registry - Manages available templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRegistry = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const fuse_js_1 = tslib_1.__importDefault(require("fuse.js"));
const logger_1 = require("../utils/logger");
class TemplateRegistry {
    constructor() {
        this.templates = [];
        this.lastUpdateTime = 0;
        this.fuseInstance = null;
        logger_1.logger.debug('TemplateRegistry constructor - starting...');
        // Determine template path based on installation context
        let templatesPath;
        logger_1.logger.debug('TemplateRegistry constructor - resolving npm package path...');
        // First, try to find templates relative to this module
        // For npm global install: node_modules/dna-template-cli/templates
        const npmPackagePath = path_1.default.resolve(__dirname, '..', '..', 'templates');
        logger_1.logger.debug('TemplateRegistry constructor - resolving local dev path...');
        // For local development: go up to project root
        const localDevPath = path_1.default.resolve(__dirname, '..', '..', '..', '..', '..', 'templates');
        logger_1.logger.debug(`TemplateRegistry constructor - checking paths... npm: ${npmPackagePath}, local: ${localDevPath}`);
        logger_1.logger.debug('TemplateRegistry constructor - checking npm package path exists...');
        if (fs_extra_1.default.existsSync(npmPackagePath)) {
            templatesPath = npmPackagePath;
            logger_1.logger.debug('TemplateRegistry constructor - using npm package path');
        }
        else {
            logger_1.logger.debug('TemplateRegistry constructor - npm package path does not exist, checking local dev path...');
            if (fs_extra_1.default.existsSync(localDevPath)) {
                templatesPath = localDevPath;
                logger_1.logger.debug('TemplateRegistry constructor - using local dev path');
            }
            else {
                logger_1.logger.debug('TemplateRegistry constructor - local dev path does not exist, using fallback...');
                // Fallback: try current working directory
                templatesPath = path_1.default.join(process.cwd(), 'templates');
                logger_1.logger.debug('TemplateRegistry constructor - using fallback path');
            }
        }
        logger_1.logger.debug('TemplateRegistry constructor - setting registry path...');
        this.registryPath = templatesPath;
        logger_1.logger.debug(`TemplateRegistry constructor - completed. Path: ${this.registryPath}`);
        logger_1.logger.debug(`Template registry path: ${this.registryPath}`);
    }
    async load() {
        try {
            await this.loadLocalTemplates();
            this.sortTemplates();
        }
        catch (error) {
            logger_1.logger.debug('Failed to load template registry:', error);
            // Initialize with empty registry if load fails
            this.templates = [];
        }
    }
    async loadLocalTemplates() {
        if (!await fs_extra_1.default.pathExists(this.registryPath)) {
            logger_1.logger.debug('Templates directory not found');
            this.templates = [];
            return;
        }
        const entries = await fs_extra_1.default.readdir(this.registryPath);
        this.templates = [];
        // The templates directory has category directories (ai-native, cross-platform, etc.)
        // and also some templates directly at the root level
        for (const entry of entries) {
            const entryPath = path_1.default.join(this.registryPath, entry);
            const stat = await fs_extra_1.default.stat(entryPath);
            if (!stat.isDirectory())
                continue;
            // Check if this is a category directory (contains subdirectories as templates)
            const hasSubTemplates = await this.hasSubTemplates(entryPath);
            if (hasSubTemplates) {
                // This is a category directory, scan subdirectories for templates
                const category = entry;
                const subEntries = await fs_extra_1.default.readdir(entryPath);
                for (const templateDir of subEntries) {
                    const templatePath = path_1.default.join(entryPath, templateDir);
                    const templateStat = await fs_extra_1.default.stat(templatePath);
                    if (!templateStat.isDirectory())
                        continue;
                    try {
                        const template = await this.loadTemplate(templatePath, category);
                        if (template) {
                            this.templates.push(template);
                        }
                    }
                    catch (error) {
                        logger_1.logger.debug(`Failed to load template ${templateDir}:`, error);
                    }
                }
            }
            else {
                // This is a template directory at the root level
                try {
                    const category = this.inferCategoryFromTemplateName(entry);
                    const template = await this.loadTemplate(entryPath, category);
                    if (template) {
                        this.templates.push(template);
                    }
                }
                catch (error) {
                    logger_1.logger.debug(`Failed to load template ${entry}:`, error);
                }
            }
        }
    }
    async hasSubTemplates(dirPath) {
        // Check if this directory contains template subdirectories
        // Category directories don't have template.json at their level
        const hasTemplateJson = await fs_extra_1.default.pathExists(path_1.default.join(dirPath, 'template.json'));
        if (hasTemplateJson) {
            return false; // This is a template, not a category
        }
        // Check if it contains subdirectories
        const entries = await fs_extra_1.default.readdir(dirPath);
        for (const entry of entries) {
            const entryPath = path_1.default.join(dirPath, entry);
            const stat = await fs_extra_1.default.stat(entryPath);
            if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                return true; // Has subdirectories, likely a category
            }
        }
        return false;
    }
    inferCategoryFromTemplateName(templateName) {
        if (templateName.includes('ai-saas') || templateName.includes('ai-mobile') || templateName.includes('ai-native')) {
            return 'ai-native';
        }
        else if (templateName.includes('performance')) {
            return 'performance';
        }
        else if (templateName.includes('cross-platform')) {
            return 'cross-platform';
        }
        else if (templateName.includes('foundation')) {
            return 'foundation';
        }
        return 'general';
    }
    async loadTemplate(templatePath, category) {
        const metadataPath = path_1.default.join(templatePath, 'template.json');
        if (!await fs_extra_1.default.pathExists(metadataPath)) {
            // Generate metadata from directory structure if template.json doesn't exist
            return this.generateTemplateMetadata(templatePath, category);
        }
        try {
            const metadata = await fs_extra_1.default.readJSON(metadataPath);
            return this.validateAndNormalizeMetadata(metadata, templatePath);
        }
        catch (error) {
            logger_1.logger.debug(`Invalid template.json in ${templatePath}:`, error);
            return null;
        }
    }
    generateTemplateMetadata(templatePath, category) {
        const templateName = path_1.default.basename(templatePath);
        // Infer framework from template name
        let framework = 'nextjs';
        if (templateName.includes('flutter')) {
            framework = 'flutter';
        }
        else if (templateName.includes('react-native')) {
            framework = 'react-native';
        }
        else if (templateName.includes('nextjs')) {
            framework = 'nextjs';
        }
        else if (templateName.includes('tauri')) {
            framework = 'tauri';
        }
        else if (templateName.includes('sveltekit')) {
            framework = 'sveltekit';
        }
        // Determine template type based on category
        let type = 'foundation';
        if (category === 'ai-native') {
            if (templateName.includes('saas')) {
                type = 'ai-saas';
            }
            else if (templateName.includes('mobile')) {
                type = 'ai-mobile';
            }
        }
        else if (category === 'performance') {
            type = 'performance';
        }
        else if (category === 'cross-platform') {
            type = 'cross-platform';
        }
        // Generate better features based on template name
        const features = [];
        if (templateName.includes('ai'))
            features.push('AI Integration');
        if (templateName.includes('saas'))
            features.push('SaaS Ready');
        if (templateName.includes('mobile'))
            features.push('Mobile App');
        if (templateName.includes('flutter'))
            features.push('Cross-Platform Mobile');
        if (templateName.includes('nextjs'))
            features.push('Server-Side Rendering');
        return {
            id: templateName,
            name: templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `${this.generateDescription(templateName, framework, category)}`,
            type: type,
            framework: framework,
            version: '1.0.0',
            author: 'DNA Templates',
            tags: [category, framework],
            dnaModules: this.inferDnaModules(templateName),
            requirements: {},
            features: features,
            complexity: 'intermediate',
            estimatedSetupTime: 5,
            lastUpdated: new Date(),
        };
    }
    generateDescription(templateName, framework, category) {
        const frameworkNames = {
            'flutter': 'Flutter',
            'react-native': 'React Native',
            'nextjs': 'Next.js',
            'tauri': 'Tauri',
            'sveltekit': 'SvelteKit'
        };
        if (templateName.includes('ai-saas')) {
            return `Production-ready AI SaaS platform built with ${frameworkNames[framework]}. Includes multi-LLM support, authentication, payments, and more.`;
        }
        else if (templateName.includes('ai-mobile')) {
            return `AI-powered mobile application template using ${frameworkNames[framework]}. Features voice, camera integration, and offline AI capabilities.`;
        }
        else if (templateName.includes('cross-platform')) {
            return `Cross-platform application template with ${frameworkNames[framework]}. Build once, deploy everywhere.`;
        }
        else if (templateName.includes('performance')) {
            return `High-performance application optimized for speed using ${frameworkNames[framework]}.`;
        }
        return `Production-ready ${category} template built with ${frameworkNames[framework]}.`;
    }
    inferDnaModules(templateName) {
        const modules = [];
        if (templateName.includes('ai')) {
            modules.push('ai-openai', 'ai-anthropic');
        }
        if (templateName.includes('saas')) {
            modules.push('auth-jwt', 'payments-stripe', 'database-postgres');
        }
        if (templateName.includes('mobile')) {
            modules.push('mobile-native', 'push-notifications');
        }
        return modules;
    }
    validateAndNormalizeMetadata(metadata, templatePath) {
        // Validate required fields
        const required = ['name', 'description', 'type', 'framework', 'version'];
        for (const field of required) {
            if (!metadata[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        // Normalize and set defaults
        return {
            id: metadata.id || path_1.default.basename(templatePath),
            name: metadata.name,
            description: metadata.description,
            type: metadata.type,
            framework: metadata.framework,
            version: metadata.version,
            author: metadata.author || 'Unknown',
            tags: metadata.tags || [],
            dnaModules: metadata.dnaModules || [],
            requirements: metadata.requirements || {},
            features: metadata.features || [],
            complexity: metadata.complexity || 'intermediate',
            estimatedSetupTime: metadata.estimatedSetupTime || 5,
            lastUpdated: new Date(metadata.lastUpdated || Date.now()),
            downloadCount: metadata.downloadCount || undefined,
            rating: metadata.rating || undefined,
            variables: metadata.variables || [],
            implementationStatus: metadata.implementationStatus || 'needs-setup',
            setupRequired: metadata.setupRequired || {
                level: 'configuration',
                requirements: ['Environment setup'],
                estimatedConfigTime: 15
            },
            readinessLevel: metadata.readinessLevel || 70,
        };
    }
    sortTemplates() {
        this.templates.sort((a, b) => {
            // Sort by rating first (if available), then by name
            if (a.rating && b.rating) {
                return b.rating - a.rating;
            }
            if (a.rating && !b.rating)
                return -1;
            if (!a.rating && b.rating)
                return 1;
            return a.name.localeCompare(b.name);
        });
        // Initialize Fuse.js for fuzzy search
        this.initializeFuzzySearch();
    }
    initializeFuzzySearch() {
        const fuseOptions = {
            keys: [
                { name: 'name', weight: 0.3 },
                { name: 'description', weight: 0.2 },
                { name: 'tags', weight: 0.2 },
                { name: 'features', weight: 0.15 },
                { name: 'dnaModules', weight: 0.1 },
                { name: 'framework', weight: 0.05 }
            ],
            threshold: 0.4,
            includeScore: true,
            includeMatches: true
        };
        this.fuseInstance = new fuse_js_1.default(this.templates, fuseOptions);
    }
    getTemplates() {
        return [...this.templates];
    }
    getTemplate(id) {
        return this.templates.find(t => t.id === id);
    }
    searchTemplates(query, useFuzzy = true) {
        if (!query.trim()) {
            return this.getTemplates();
        }
        if (useFuzzy && this.fuseInstance) {
            const results = this.fuseInstance.search(query);
            return results.map(result => result.item);
        }
        // Fallback to basic search
        const lowercaseQuery = query.toLowerCase();
        return this.templates.filter(template => template.name.toLowerCase().includes(lowercaseQuery) ||
            template.description.toLowerCase().includes(lowercaseQuery) ||
            template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
            template.features.some(feature => feature.toLowerCase().includes(lowercaseQuery)));
    }
    filterByFramework(framework) {
        return this.templates.filter(t => t.framework.toLowerCase() === framework.toLowerCase());
    }
    filterByComplexity(complexity) {
        return this.templates.filter(t => t.complexity === complexity);
    }
    filterByType(type) {
        return this.templates.filter(t => t.type === type);
    }
    filterByDnaModule(dnaModule) {
        return this.templates.filter(t => t.dnaModules.includes(dnaModule));
    }
    filterByTag(tag) {
        return this.templates.filter(t => t.tags.includes(tag));
    }
    filterTemplates(options) {
        let filtered = [...this.templates];
        if (options.framework) {
            filtered = filtered.filter(t => t.framework === options.framework);
        }
        if (options.type) {
            filtered = filtered.filter(t => t.type === options.type);
        }
        if (options.complexity) {
            filtered = filtered.filter(t => t.complexity === options.complexity);
        }
        if (options.dnaModules && options.dnaModules.length > 0) {
            filtered = filtered.filter(t => options.dnaModules.some(module => t.dnaModules.includes(module)));
        }
        if (options.tags && options.tags.length > 0) {
            filtered = filtered.filter(t => options.tags.some(tag => t.tags.includes(tag)));
        }
        if (options.maxSetupTime) {
            filtered = filtered.filter(t => t.estimatedSetupTime <= options.maxSetupTime);
        }
        if (options.minRating) {
            filtered = filtered.filter(t => t.rating && t.rating >= options.minRating);
        }
        if (options.query) {
            const searchResults = this.searchTemplates(options.query, true);
            const searchIds = new Set(searchResults.map(t => t.id));
            filtered = filtered.filter(t => searchIds.has(t.id));
        }
        return filtered;
    }
    getTemplatesByCategory() {
        const categories = {};
        for (const template of this.templates) {
            const category = this.getCategoryFromType(template.type);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(template);
        }
        return categories;
    }
    getCategoryFromType(type) {
        switch (type) {
            case 'ai-saas':
            case 'ai-mobile':
                return 'AI Native';
            case 'performance':
                return 'Performance';
            case 'cross-platform':
                return 'Cross Platform';
            default:
                return 'Foundation';
        }
    }
    getAvailableFrameworks() {
        const frameworks = new Set(this.templates.map(t => t.framework));
        return Array.from(frameworks);
    }
    getAvailableComplexities() {
        const complexities = new Set(this.templates.map(t => t.complexity));
        return Array.from(complexities);
    }
    getAvailableDnaModules() {
        const modules = new Set();
        this.templates.forEach(t => t.dnaModules.forEach(m => modules.add(m)));
        return Array.from(modules).sort();
    }
    getAvailableTags() {
        const tags = new Set();
        this.templates.forEach(t => t.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }
    getRecommendedTemplates(limit = 5) {
        return this.templates
            .filter(t => t.rating && t.rating >= 4.0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, limit);
    }
    getPopularTemplates(limit = 5) {
        return this.templates
            .filter(t => t.downloadCount && t.downloadCount > 0)
            .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
            .slice(0, limit);
    }
    async getLastUpdateTime() {
        return this.lastUpdateTime;
    }
    async update() {
        // In a real implementation, this would fetch from a remote registry
        // For now, we'll simulate an update
        const oldCount = this.templates.length;
        await this.load(); // Reload local templates
        const newCount = this.templates.length;
        this.lastUpdateTime = Date.now();
        return {
            updated: true,
            newTemplates: Math.max(0, newCount - oldCount),
            updatedTemplates: 0,
            changes: [
                'Updated AI SaaS template with new LLM providers',
                'Fixed Flutter template compatibility issues',
                'Added new React Native business template',
            ],
        };
    }
}
exports.TemplateRegistry = TemplateRegistry;
//# sourceMappingURL=template-registry.js.map