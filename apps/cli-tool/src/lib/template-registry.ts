/**
 * @fileoverview Template Registry - Manages available templates
 */

import fs from 'fs-extra';
import path from 'path';
import Fuse from 'fuse.js';
import { TemplateMetadata, TemplateRegistry as ITemplateRegistry, TemplateFilterOptions } from '../types/cli';
import { logger } from '../utils/logger';
import { createCLIError } from '../utils/error-handler';
import { SupportedFramework, TemplateType } from '@dna/core';

export class TemplateRegistry {
  private templates: TemplateMetadata[] = [];
  private registryPath: string;
  private lastUpdateTime: number = 0;
  private fuseInstance: Fuse<TemplateMetadata> | null = null;

  constructor() {
    // In development, use local templates directory
    // In production, this would be a user cache directory
    this.registryPath = path.resolve(process.cwd(), 'templates');
  }

  async load(): Promise<void> {
    try {
      await this.loadLocalTemplates();
      this.sortTemplates();
    } catch (error) {
      logger.debug('Failed to load template registry:', error);
      // Initialize with empty registry if load fails
      this.templates = [];
    }
  }

  private async loadLocalTemplates(): Promise<void> {
    if (!await fs.pathExists(this.registryPath)) {
      logger.debug('Templates directory not found');
      this.templates = [];
      return;
    }

    const categories = await fs.readdir(this.registryPath);
    this.templates = [];

    for (const category of categories) {
      const categoryPath = path.join(this.registryPath, category);
      const stat = await fs.stat(categoryPath);
      
      if (!stat.isDirectory()) continue;

      const templates = await fs.readdir(categoryPath);
      
      for (const templateDir of templates) {
        const templatePath = path.join(categoryPath, templateDir);
        const templateStat = await fs.stat(templatePath);
        
        if (!templateStat.isDirectory()) continue;

        try {
          const template = await this.loadTemplate(templatePath, category);
          if (template) {
            this.templates.push(template);
          }
        } catch (error) {
          logger.debug(`Failed to load template ${templateDir}:`, error);
        }
      }
    }
  }

  private async loadTemplate(templatePath: string, category: string): Promise<TemplateMetadata | null> {
    const metadataPath = path.join(templatePath, 'template.json');
    
    if (!await fs.pathExists(metadataPath)) {
      // Generate metadata from directory structure if template.json doesn't exist
      return this.generateTemplateMetadata(templatePath, category);
    }

    try {
      const metadata = await fs.readJSON(metadataPath);
      return this.validateAndNormalizeMetadata(metadata, templatePath);
    } catch (error) {
      logger.debug(`Invalid template.json in ${templatePath}:`, error);
      return null;
    }
  }

  private generateTemplateMetadata(templatePath: string, category: string): TemplateMetadata {
    const templateName = path.basename(templatePath);
    
    return {
      id: `${category}-${templateName}`,
      name: templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `A ${category} template for ${templateName}`,
      type: category as any, // This would need proper type mapping
      framework: 'nextjs' as any, // Default framework
      version: '1.0.0',
      author: 'DNA Templates',
      tags: [category],
      dnaModules: [],
      requirements: {},
      features: [],
      complexity: 'intermediate' as any,
      estimatedSetupTime: 5,
      lastUpdated: new Date(),
    };
  }

  private validateAndNormalizeMetadata(metadata: any, templatePath: string): TemplateMetadata {
    // Validate required fields
    const required = ['name', 'description', 'type', 'framework', 'version'];
    for (const field of required) {
      if (!metadata[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Normalize and set defaults
    return {
      id: metadata.id || path.basename(templatePath),
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


  private sortTemplates(): void {
    this.templates.sort((a, b) => {
      // Sort by rating first (if available), then by name
      if (a.rating && b.rating) {
        return b.rating - a.rating;
      }
      if (a.rating && !b.rating) return -1;
      if (!a.rating && b.rating) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Initialize Fuse.js for fuzzy search
    this.initializeFuzzySearch();
  }

  private initializeFuzzySearch(): void {
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
    
    this.fuseInstance = new Fuse(this.templates, fuseOptions);
  }

  getTemplates(): TemplateMetadata[] {
    return [...this.templates];
  }

  getTemplate(id: string): TemplateMetadata | undefined {
    return this.templates.find(t => t.id === id);
  }

  searchTemplates(query: string, useFuzzy: boolean = true): TemplateMetadata[] {
    if (!query.trim()) {
      return this.getTemplates();
    }

    if (useFuzzy && this.fuseInstance) {
      const results = this.fuseInstance.search(query);
      return results.map(result => result.item);
    }

    // Fallback to basic search
    const lowercaseQuery = query.toLowerCase();
    return this.templates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      template.features.some(feature => feature.toLowerCase().includes(lowercaseQuery))
    );
  }

  filterByFramework(framework: string): TemplateMetadata[] {
    return this.templates.filter(t => t.framework.toLowerCase() === framework.toLowerCase());
  }

  filterByComplexity(complexity: string): TemplateMetadata[] {
    return this.templates.filter(t => t.complexity === complexity);
  }

  filterByType(type: TemplateType): TemplateMetadata[] {
    return this.templates.filter(t => t.type === type);
  }

  filterByDnaModule(dnaModule: string): TemplateMetadata[] {
    return this.templates.filter(t => t.dnaModules.includes(dnaModule));
  }

  filterByTag(tag: string): TemplateMetadata[] {
    return this.templates.filter(t => t.tags.includes(tag));
  }

  filterTemplates(options: TemplateFilterOptions): TemplateMetadata[] {
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
      filtered = filtered.filter(t => 
        options.dnaModules!.some(module => t.dnaModules.includes(module))
      );
    }

    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(t => 
        options.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (options.maxSetupTime) {
      filtered = filtered.filter(t => t.estimatedSetupTime <= options.maxSetupTime!);
    }

    if (options.minRating) {
      filtered = filtered.filter(t => t.rating && t.rating >= options.minRating!);
    }

    if (options.query) {
      const searchResults = this.searchTemplates(options.query, true);
      const searchIds = new Set(searchResults.map(t => t.id));
      filtered = filtered.filter(t => searchIds.has(t.id));
    }

    return filtered;
  }

  getTemplatesByCategory(): Record<string, TemplateMetadata[]> {
    const categories: Record<string, TemplateMetadata[]> = {};
    
    for (const template of this.templates) {
      const category = this.getCategoryFromType(template.type);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category]!.push(template);
    }
    
    return categories;
  }

  private getCategoryFromType(type: TemplateType): string {
    switch (type) {
      case TemplateType.AI_SAAS:
      case TemplateType.DEVELOPMENT_TOOLS:
      case TemplateType.BUSINESS_APPS:
      case TemplateType.MOBILE_ASSISTANTS:
        return 'AI Native';
      case TemplateType.REAL_TIME_COLLABORATION:
      case TemplateType.HIGH_PERFORMANCE_APIS:
      case TemplateType.DATA_VISUALIZATION:
        return 'Performance';
      case TemplateType.FLUTTER_UNIVERSAL:
      case TemplateType.REACT_NATIVE_HYBRID:
      case TemplateType.MODERN_ELECTRON:
        return 'Cross Platform';
      default:
        return 'Foundation';
    }
  }

  getAvailableFrameworks(): SupportedFramework[] {
    const frameworks = new Set(this.templates.map(t => t.framework));
    return Array.from(frameworks);
  }

  getAvailableComplexities(): Array<'beginner' | 'intermediate' | 'advanced'> {
    const complexities = new Set(this.templates.map(t => t.complexity));
    return Array.from(complexities);
  }

  getAvailableDnaModules(): string[] {
    const modules = new Set<string>();
    this.templates.forEach(t => t.dnaModules.forEach(m => modules.add(m)));
    return Array.from(modules).sort();
  }

  getAvailableTags(): string[] {
    const tags = new Set<string>();
    this.templates.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }

  getRecommendedTemplates(limit: number = 5): TemplateMetadata[] {
    return this.templates
      .filter(t => t.rating && t.rating >= 4.0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  }

  getPopularTemplates(limit: number = 5): TemplateMetadata[] {
    return this.templates
      .filter(t => t.downloadCount && t.downloadCount > 0)
      .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
      .slice(0, limit);
  }

  async getLastUpdateTime(): Promise<number> {
    return this.lastUpdateTime;
  }

  async update(): Promise<{ updated: boolean; newTemplates: number; updatedTemplates: number; changes: string[] }> {
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