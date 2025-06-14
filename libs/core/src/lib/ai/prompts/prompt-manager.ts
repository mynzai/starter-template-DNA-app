import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  PromptTemplate, 
  PromptVariable, 
  PromptVersion,
  PromptExecutionContext,
  PromptExecutionResult,
  PromptSearchCriteria,
  PromptValidationResult,
  PromptPerformanceMetrics,
  PromptTemplateError,
  PromptVersionError 
} from './prompt-template';
import { PromptCompiler } from './prompt-compiler';

export interface PromptManagerConfig {
  storageDirectory: string;
  enableVersioning: boolean;
  maxVersionsPerTemplate: number;
  enableMetrics: boolean;
  backupEnabled: boolean;
  backupRetentionDays: number;
}

export class PromptManager extends EventEmitter {
  private templates = new Map<string, PromptTemplate>();
  private versions = new Map<string, PromptVersion[]>();
  private executions = new Map<string, PromptExecutionResult[]>();
  private compiler: PromptCompiler;
  private config: PromptManagerConfig;

  constructor(config: Partial<PromptManagerConfig> = {}) {
    super();
    
    this.config = {
      storageDirectory: path.join(process.cwd(), '.ai-prompts'),
      enableVersioning: true,
      maxVersionsPerTemplate: 10,
      enableMetrics: true,
      backupEnabled: true,
      backupRetentionDays: 30,
      ...config
    };

    this.compiler = new PromptCompiler();
    // Initialize storage asynchronously
    this.initializeStorage().catch(error => {
      console.warn('Failed to initialize storage:', error);
    });
  }

  public async createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<PromptTemplate> {
    try {
      const id = uuidv4();
      const now = Date.now();
      
      const newTemplate: PromptTemplate = {
        ...template,
        id,
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        isActive: true
      };

      // Validate template
      const validation = await this.validateTemplate(newTemplate);
      if (!validation.isValid) {
        throw new PromptTemplateError(
          `Template validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_ERROR',
          id
        );
      }

      // Store template
      this.templates.set(id, newTemplate);
      await this.saveTemplate(newTemplate);

      // Create initial version if versioning is enabled
      if (this.config.enableVersioning) {
        await this.createVersionFromTemplate(newTemplate, 'Initial version');
      }

      this.emit('template:created', {
        templateId: id,
        template: newTemplate,
        timestamp: now
      });

      return newTemplate;

    } catch (error) {
      this.emit('template:error', {
        operation: 'create',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public async updateTemplate(
    id: string, 
    updates: Partial<PromptTemplate>,
    changelog?: string
  ): Promise<PromptTemplate> {
    try {
      const existing = this.templates.get(id);
      if (!existing) {
        throw new PromptTemplateError(
          `Template not found: ${id}`,
          'NOT_FOUND',
          id
        );
      }

      const now = Date.now();
      const newVersion = this.incrementVersion(existing.version);
      
      const updatedTemplate: PromptTemplate = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        version: newVersion,
        updatedAt: now,
        parentId: existing.id
      };

      // Validate updated template
      const validation = await this.validateTemplate(updatedTemplate);
      if (!validation.isValid) {
        throw new PromptTemplateError(
          `Template validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_ERROR',
          id
        );
      }

      // Create version for the CURRENT template before updating if versioning is enabled
      if (this.config.enableVersioning) {
        await this.createVersionFromTemplate(existing, changelog || 'Template updated');
        // Also create a version for the updated template
        await this.createVersionFromTemplate(updatedTemplate, changelog || 'Template updated');
      }

      // Update template
      this.templates.set(id, updatedTemplate);
      await this.saveTemplate(updatedTemplate);

      this.emit('template:updated', {
        templateId: id,
        template: updatedTemplate,
        previousVersion: existing.version,
        newVersion,
        timestamp: now
      });

      return updatedTemplate;

    } catch (error) {
      this.emit('template:error', {
        operation: 'update',
        templateId: id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public async getTemplate(id: string, version?: string): Promise<PromptTemplate | null> {
    try {
      if (version) {
        const versions = this.versions.get(id) || [];
        const versionData = versions.find(v => v.version === version);
        
        if (!versionData) {
          return null;
        }

        const template = this.templates.get(id);
        if (!template) {
          return null;
        }

        return {
          ...template,
          template: versionData.template,
          variables: versionData.variables,
          version: versionData.version
        };
      }

      return this.templates.get(id) || null;

    } catch (error) {
      this.emit('template:error', {
        operation: 'get',
        templateId: id,
        version,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    try {
      const template = this.templates.get(id);
      if (!template) {
        return false;
      }

      // Mark as inactive instead of deleting
      template.isActive = false;
      template.updatedAt = Date.now();
      
      this.templates.set(id, template);
      await this.saveTemplate(template);

      this.emit('template:deleted', {
        templateId: id,
        template,
        timestamp: Date.now()
      });

      return true;

    } catch (error) {
      this.emit('template:error', {
        operation: 'delete',
        templateId: id,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  public async searchTemplates(criteria: PromptSearchCriteria): Promise<PromptTemplate[]> {
    try {
      let results = Array.from(this.templates.values());

      // Apply filters
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        results = results.filter(t => 
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.template.toLowerCase().includes(query)
        );
      }

      if (criteria.category) {
        results = results.filter(t => t.category === criteria.category);
      }

      if (criteria.tags && criteria.tags.length > 0) {
        results = results.filter(t => 
          criteria.tags!.some(tag => t.tags.includes(tag))
        );
      }

      if (criteria.createdBy) {
        results = results.filter(t => t.createdBy === criteria.createdBy);
      }

      if (criteria.createdAfter) {
        results = results.filter(t => t.createdAt >= criteria.createdAfter!);
      }

      if (criteria.createdBefore) {
        results = results.filter(t => t.createdAt <= criteria.createdBefore!);
      }

      if (criteria.isActive !== undefined) {
        results = results.filter(t => t.isActive === criteria.isActive);
      }

      if (criteria.hasVariables !== undefined) {
        results = results.filter(t => 
          criteria.hasVariables ? t.variables.length > 0 : t.variables.length === 0
        );
      }

      // Sort results
      if (criteria.sortBy) {
        results.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (criteria.sortBy) {
            case 'createdAt':
              aValue = a.createdAt;
              bValue = b.createdAt;
              break;
            case 'updatedAt':
              aValue = a.updatedAt;
              bValue = b.updatedAt;
              break;
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'usage':
              aValue = this.getTemplateUsageCount(a.id);
              bValue = this.getTemplateUsageCount(b.id);
              break;
            case 'performance':
              aValue = this.getTemplatePerformanceScore(a.id);
              bValue = this.getTemplatePerformanceScore(b.id);
              break;
            default:
              aValue = a.createdAt;
              bValue = b.createdAt;
          }

          if (criteria.sortOrder === 'desc') {
            return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
          } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          }
        });
      }

      // Apply pagination
      const offset = criteria.offset || 0;
      const limit = criteria.limit || results.length;
      
      return results.slice(offset, offset + limit);

    } catch (error) {
      this.emit('template:error', {
        operation: 'search',
        criteria,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  public async compileTemplate(
    id: string, 
    variables: Record<string, any>,
    version?: string
  ): Promise<string> {
    try {
      const template = await this.getTemplate(id, version);
      if (!template) {
        throw new PromptTemplateError(
          `Template not found: ${id}`,
          'NOT_FOUND',
          id,
          version
        );
      }

      const compiled = this.compiler.compile(template, variables);

      this.emit('template:compiled', {
        templateId: id,
        version: template.version,
        variables,
        compiledLength: compiled.length,
        timestamp: Date.now()
      });

      return compiled;

    } catch (error) {
      this.emit('template:error', {
        operation: 'compile',
        templateId: id,
        version,
        variables,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public async validateTemplate(template: PromptTemplate): Promise<PromptValidationResult> {
    try {
      // Basic validation
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!template.name || template.name.trim() === '') {
        errors.push('Template name is required');
      }

      if (!template.template || template.template.trim() === '') {
        errors.push('Template content is required');
      }

      if (!template.category || template.category.trim() === '') {
        errors.push('Template category is required');
      }

      // Validate variables
      const variableNames = new Set<string>();
      for (const variable of template.variables || []) {
        if (!variable.name || variable.name.trim() === '') {
          errors.push('Variable name is required');
          continue;
        }

        if (variableNames.has(variable.name)) {
          errors.push(`Duplicate variable name: ${variable.name}`);
        }
        variableNames.add(variable.name);

        if (!['string', 'number', 'boolean', 'array', 'object'].includes(variable.type)) {
          errors.push(`Invalid variable type for ${variable.name}: ${variable.type}`);
        }
      }

      // Use compiler validation for template syntax (use default values for validation)
      let compilerValidation: PromptValidationResult;
      try {
        // Create validation variables with default values for each defined variable
        const validationVariables: Record<string, any> = {};
        for (const variable of template.variables || []) {
          if (variable.defaultValue !== undefined) {
            validationVariables[variable.name] = variable.defaultValue;
          } else {
            // Provide type-appropriate default values for validation
            switch (variable.type) {
              case 'string':
                validationVariables[variable.name] = 'test_value';
                break;
              case 'number':
                validationVariables[variable.name] = 0;
                break;
              case 'boolean':
                validationVariables[variable.name] = true;
                break;
              case 'array':
                validationVariables[variable.name] = [];
                break;
              case 'object':
                validationVariables[variable.name] = {};
                break;
              default:
                validationVariables[variable.name] = 'test_value';
            }
          }
        }
        
        compilerValidation = this.compiler.validate(template, validationVariables);
      } catch (compilerError) {
        compilerValidation = {
          isValid: false,
          errors: [`Compiler validation failed: ${compilerError instanceof Error ? compilerError.message : String(compilerError)}`],
          warnings: [],
          missingVariables: [],
          unusedVariables: []
        };
      }
      
      return {
        isValid: errors.length === 0 && compilerValidation.isValid,
        errors: [...errors, ...(compilerValidation.errors || [])],
        warnings: [...warnings, ...(compilerValidation.warnings || [])],
        missingVariables: compilerValidation.missingVariables || [],
        unusedVariables: compilerValidation.unusedVariables || []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
        missingVariables: [],
        unusedVariables: []
      };
    }
  }

  public async createVersionFromTemplate(
    template: PromptTemplate,
    changelog: string
  ): Promise<PromptVersion> {
    const newVersion: PromptVersion = {
      version: template.version,
      templateId: template.id,
      template: template.template,
      variables: template.variables,
      changelog,
      createdAt: Date.now(),
      createdBy: template.createdBy,
      isActive: true
    };

    // Get existing versions
    const versions = this.versions.get(template.id) || [];
    
    // Check if version already exists
    if (versions.some(v => v.version === template.version)) {
      // Don't create duplicate versions
      return newVersion;
    }

    // Add new version
    versions.push(newVersion);

    // Limit number of versions
    if (versions.length > this.config.maxVersionsPerTemplate) {
      versions.sort((a, b) => b.createdAt - a.createdAt);
      const removed = versions.splice(this.config.maxVersionsPerTemplate);
      
      this.emit('versions:pruned', {
        templateId: template.id,
        removedVersions: removed.map(v => v.version),
        timestamp: Date.now()
      });
    }

    this.versions.set(template.id, versions);
    await this.saveVersions(template.id, versions);

    this.emit('version:created', {
      templateId: template.id,
      version: newVersion,
      timestamp: Date.now()
    });

    return newVersion;
  }

  public async createVersion(
    templateId: string, 
    version: string, 
    changelog: string
  ): Promise<PromptVersion> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new PromptVersionError(
          `Template not found: ${templateId}`,
          templateId
        );
      }

      const newVersion: PromptVersion = {
        version,
        templateId,
        template: template.template,
        variables: template.variables,
        changelog,
        createdAt: Date.now(),
        createdBy: template.createdBy,
        isActive: true
      };

      // Get existing versions
      const versions = this.versions.get(templateId) || [];
      
      // Check if version already exists
      if (versions.some(v => v.version === version)) {
        throw new PromptVersionError(
          `Version ${version} already exists for template ${templateId}`,
          templateId,
          version
        );
      }

      // Add new version
      versions.push(newVersion);

      // Limit number of versions
      if (versions.length > this.config.maxVersionsPerTemplate) {
        versions.sort((a, b) => b.createdAt - a.createdAt);
        const removed = versions.splice(this.config.maxVersionsPerTemplate);
        
        this.emit('versions:pruned', {
          templateId,
          removedVersions: removed.map(v => v.version),
          timestamp: Date.now()
        });
      }

      this.versions.set(templateId, versions);
      await this.saveVersions(templateId, versions);

      this.emit('version:created', {
        templateId,
        version: newVersion,
        timestamp: Date.now()
      });

      return newVersion;

    } catch (error) {
      this.emit('template:error', {
        operation: 'create_version',
        templateId,
        version,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public async getVersions(templateId: string): Promise<PromptVersion[]> {
    return this.versions.get(templateId) || [];
  }

  public async recordExecution(execution: PromptExecutionResult): Promise<void> {
    if (!this.config.enableMetrics) {
      return;
    }

    try {
      const templateId = execution.context.templateId;
      const executions = this.executions.get(templateId) || [];
      
      executions.push(execution);
      
      // Keep only recent executions (last 1000)
      if (executions.length > 1000) {
        executions.splice(0, executions.length - 1000);
      }
      
      this.executions.set(templateId, executions);
      await this.saveExecutions(templateId, executions);

      this.emit('execution:recorded', {
        templateId,
        execution,
        timestamp: Date.now()
      });

    } catch (error) {
      this.emit('template:error', {
        operation: 'record_execution',
        templateId: execution.context.templateId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  public getTemplateMetrics(templateId: string): PromptPerformanceMetrics | null {
    const executions = this.executions.get(templateId) || [];
    
    if (executions.length === 0) {
      return null;
    }

    const successfulExecutions = executions.filter(e => e.success);
    const totalExecutions = executions.length;
    const successRate = successfulExecutions.length / totalExecutions;

    const avgResponseTime = successfulExecutions.reduce((sum, e) => sum + e.responseTime, 0) / successfulExecutions.length;
    const avgTokenUsage = successfulExecutions.reduce((sum, e) => sum + e.tokenUsage.total, 0) / successfulExecutions.length;
    const avgCost = successfulExecutions.reduce((sum, e) => sum + e.cost, 0) / successfulExecutions.length;
    
    const lastExecuted = Math.max(...executions.map(e => e.context.executedAt));
    
    const qualityScore = successfulExecutions
      .filter(e => e.quality?.score)
      .reduce((sum, e, _, arr) => sum + (e.quality!.score / arr.length), 0);

    return {
      avgResponseTime,
      totalExecutions,
      successRate,
      avgTokenUsage,
      avgCost,
      lastExecuted,
      qualityScore: qualityScore || undefined
    };
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.ensureDir(this.config.storageDirectory);
      await fs.ensureDir(path.join(this.config.storageDirectory, 'templates'));
      await fs.ensureDir(path.join(this.config.storageDirectory, 'versions'));
      await fs.ensureDir(path.join(this.config.storageDirectory, 'executions'));
      
      if (this.config.backupEnabled) {
        await fs.ensureDir(path.join(this.config.storageDirectory, 'backups'));
      }

      // Load existing data
      await this.loadTemplates();
      await this.loadVersions();
      await this.loadExecutions();

    } catch (error) {
      this.emit('storage:error', {
        operation: 'initialize',
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw on initialization errors - just log them
      console.warn('Storage initialization warning:', error);
    }
  }

  private async saveTemplate(template: PromptTemplate): Promise<void> {
    const filePath = path.join(this.config.storageDirectory, 'templates', `${template.id}.json`);
    await fs.writeJson(filePath, template, { spaces: 2 });
  }

  private async saveVersions(templateId: string, versions: PromptVersion[]): Promise<void> {
    const filePath = path.join(this.config.storageDirectory, 'versions', `${templateId}.json`);
    await fs.writeJson(filePath, versions, { spaces: 2 });
  }

  private async saveExecutions(templateId: string, executions: PromptExecutionResult[]): Promise<void> {
    const filePath = path.join(this.config.storageDirectory, 'executions', `${templateId}.json`);
    await fs.writeJson(filePath, executions, { spaces: 2 });
  }

  private async loadTemplates(): Promise<void> {
    try {
      const templatesDir = path.join(this.config.storageDirectory, 'templates');
      
      if (!(await fs.pathExists(templatesDir))) {
        return;
      }

      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(templatesDir, file);
            const template: PromptTemplate = await fs.readJson(filePath);
            this.templates.set(template.id, template);
          } catch (error) {
            this.emit('storage:error', {
              operation: 'load_template',
              file,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    } catch (error) {
      // Ignore directory not found errors during loading
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        throw error;
      }
    }
  }

  private async loadVersions(): Promise<void> {
    try {
      const versionsDir = path.join(this.config.storageDirectory, 'versions');
      
      if (!(await fs.pathExists(versionsDir))) {
        return;
      }

      const files = await fs.readdir(versionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(versionsDir, file);
            const versions: PromptVersion[] = await fs.readJson(filePath);
            const templateId = path.basename(file, '.json');
            this.versions.set(templateId, versions);
          } catch (error) {
            this.emit('storage:error', {
              operation: 'load_versions',
              file,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    } catch (error) {
      // Ignore directory not found errors during loading
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        throw error;
      }
    }
  }

  private async loadExecutions(): Promise<void> {
    try {
      const executionsDir = path.join(this.config.storageDirectory, 'executions');
      
      if (!(await fs.pathExists(executionsDir))) {
        return;
      }

      const files = await fs.readdir(executionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(executionsDir, file);
            const executions: PromptExecutionResult[] = await fs.readJson(filePath);
            const templateId = path.basename(file, '.json');
            this.executions.set(templateId, executions);
          } catch (error) {
            this.emit('storage:error', {
              operation: 'load_executions',
              file,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    } catch (error) {
      // Ignore directory not found errors during loading
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        throw error;
      }
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) {
      return '1.0.1';
    }
    
    parts[2]++; // Increment patch version
    return parts.join('.');
  }

  private getTemplateUsageCount(templateId: string): number {
    const executions = this.executions.get(templateId) || [];
    return executions.length;
  }

  private getTemplatePerformanceScore(templateId: string): number {
    const metrics = this.getTemplateMetrics(templateId);
    if (!metrics) {
      return 0;
    }
    
    // Simple performance score calculation
    // Higher success rate, lower response time = better score
    const responseTimeScore = Math.max(0, 1000 - metrics.avgResponseTime) / 1000;
    return (metrics.successRate + responseTimeScore) / 2;
  }

  public async destroy(): Promise<void> {
    this.templates.clear();
    this.versions.clear();
    this.executions.clear();
    this.removeAllListeners();
  }
}