"use strict";
/**
 * @fileoverview Template Registry - Manages available templates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRegistry = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const fuse_js_1 = __importDefault(require("fuse.js"));
const logger_1 = require("../utils/logger");
const core_1 = require("@dna/core");
class TemplateRegistry {
    constructor() {
        this.templates = [];
        this.lastUpdateTime = 0;
        this.fuseInstance = null;
        // In development, use local templates directory
        // In production, this would be a user cache directory
        this.registryPath = path_1.default.resolve(process.cwd(), 'templates');
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
        const categories = await fs_extra_1.default.readdir(this.registryPath);
        this.templates = [];
        for (const category of categories) {
            const categoryPath = path_1.default.join(this.registryPath, category);
            const stat = await fs_extra_1.default.stat(categoryPath);
            if (!stat.isDirectory())
                continue;
            const templates = await fs_extra_1.default.readdir(categoryPath);
            for (const templateDir of templates) {
                const templatePath = path_1.default.join(categoryPath, templateDir);
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
        return {
            id: `${category}-${templateName}`,
            name: templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `A ${category} template for ${templateName}`,
            type: category, // This would need proper type mapping
            framework: 'nextjs', // Default framework
            version: '1.0.0',
            author: 'DNA Templates',
            tags: [category],
            dnaModules: [],
            requirements: {},
            features: [],
            complexity: 'intermediate',
            estimatedSetupTime: 5,
            lastUpdated: new Date(),
        };
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
            case core_1.TemplateType.AI_SAAS:
            case core_1.TemplateType.DEVELOPMENT_TOOLS:
            case core_1.TemplateType.BUSINESS_APPS:
            case core_1.TemplateType.MOBILE_ASSISTANTS:
                return 'AI Native';
            case core_1.TemplateType.REAL_TIME_COLLABORATION:
            case core_1.TemplateType.HIGH_PERFORMANCE_APIS:
            case core_1.TemplateType.DATA_VISUALIZATION:
                return 'Performance';
            case core_1.TemplateType.FLUTTER_UNIVERSAL:
            case core_1.TemplateType.REACT_NATIVE_HYBRID:
            case core_1.TemplateType.MODERN_ELECTRON:
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
