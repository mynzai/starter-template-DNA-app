/**
 * @fileoverview Enhanced Template Engine with DNA System Integration
 */

import {
  DNAModule,
  TemplateConfig,
  GenerationResult,
  GenerationMetrics,
  DNAComposition,
  DNACompositionResult,
  DNAModuleContext,
  DNAFileSystem,
  DNALogger,
  SupportedFramework,
  TemplateType
} from './types';
import { DNARegistry } from './dna-registry';
import { DNAComposer } from './dna-composer';
import { DNAMigrationManager } from './dna-migration';

/**
 * Enhanced Template Engine with full DNA system integration
 */
export class TemplateEngine {
  private registry: DNARegistry;
  private composer: DNAComposer;
  private migrationManager: DNAMigrationManager;
  private fileSystem: DNAFileSystem;
  private logger: DNALogger;

  constructor(config?: {
    registry?: DNARegistry;
    composer?: DNAComposer;
    migrationManager?: DNAMigrationManager;
    fileSystem?: DNAFileSystem;
    logger?: DNALogger;
  }) {
    this.registry = config?.registry || new DNARegistry({
      sources: [{ type: 'local', path: './dna-modules', priority: 1 }],
      cache: { enabled: true, ttl: 3600, path: './.dna-cache' },
      validation: { strict: false, allowExperimental: true, allowDeprecated: false }
    });
    
    this.composer = config?.composer || new DNAComposer(this.registry);
    this.migrationManager = config?.migrationManager || new DNAMigrationManager();
    this.fileSystem = config?.fileSystem || this.createDefaultFileSystem();
    this.logger = config?.logger || this.createDefaultLogger();
  }

  /**
   * Initialize the template engine
   */
  public async initialize(): Promise<void> {
    await this.registry.initialize();
  }

  /**
   * Register a DNA module with the template engine
   */
  public registerModule(module: DNAModule): void {
    this.registry.registerModule(module);
  }

  /**
   * Generate a template based on configuration using the enhanced DNA system
   */
  public async generateTemplate(config: TemplateConfig): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Validate configuration
      this.validateConfiguration(config);

      // Create DNA composition
      const composition: DNAComposition = {
        modules: config.dnaModules.map(moduleId => ({
          moduleId,
          version: 'latest', // Could be specified in config
          config: config.variables?.[moduleId] || {}
        })),
        framework: config.framework,
        templateType: config.type,
        globalConfig: config.variables || {}
      };

      // Compose and validate DNA modules
      const compositionResult = await this.composer.compose(composition);
      
      if (!compositionResult.valid) {
        return {
          success: false,
          outputPath: config.outputPath,
          generatedFiles: [],
          errors: compositionResult.errors.map(e => e.message),
          warnings: compositionResult.warnings.map(w => w.message),
          metrics: {
            executionTime: Date.now() - startTime,
            filesGenerated: 0,
            linesOfCode: 0,
            testCoverage: 0,
          },
        };
      }

      // Create DNA module context
      const context: DNAModuleContext = {
        projectName: config.name,
        outputPath: config.outputPath,
        framework: config.framework,
        templateType: config.type,
        moduleConfig: {},
        globalConfig: compositionResult.configMerged,
        availableModules: new Map(compositionResult.modules.map(m => [m.metadata.id, m])),
        activeModules: compositionResult.modules,
        fileSystem: this.fileSystem,
        logger: this.logger
      };

      // Generate files using DNA composition
      const dnaFiles = await this.composer.generateFiles(compositionResult, context);
      
      // Convert DNA files to legacy format for compatibility
      const generatedFiles = dnaFiles.map(f => f.relativePath);

      // Install dependencies
      await this.composer.installDependencies(compositionResult, context);

      // Finalize template
      await this.composer.finalize(compositionResult, context);

      // Calculate metrics
      const executionTime = Date.now() - startTime;
      const metrics: GenerationMetrics = {
        executionTime,
        filesGenerated: generatedFiles.length,
        linesOfCode: await this.calculateLinesOfCodeFromFiles(dnaFiles),
        testCoverage: 80, // Default target coverage
      };

      return {
        success: true,
        outputPath: config.outputPath,
        generatedFiles,
        errors: [],
        warnings: compositionResult.warnings.map(w => w.message),
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        outputPath: config.outputPath,
        generatedFiles: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metrics: {
          executionTime: Date.now() - startTime,
          filesGenerated: 0,
          linesOfCode: 0,
          testCoverage: 0,
        },
      };
    }
  }

  private validateConfiguration(config: TemplateConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (!config.outputPath || config.outputPath.trim().length === 0) {
      throw new Error('Output path is required');
    }

    if (!config.framework) {
      throw new Error('Framework is required');
    }

    if (!config.type) {
      throw new Error('Template type is required');
    }

    // Validate DNA modules exist in registry
    for (const moduleId of config.dnaModules) {
      const module = this.registry.getModule(moduleId);
      if (!module) {
        throw new Error(`DNA module '${moduleId}' not found in registry`);
      }
    }
  }

  /**
   * Get composition preview without generating files
   */
  public async getCompositionPreview(config: TemplateConfig): Promise<{
    valid: boolean;
    modules: { id: string; name: string; version: string }[];
    dependencies: string[];
    conflicts: string[];
    estimatedFiles: number;
    estimatedComplexity: number;
    warnings: string[];
  }> {
    const composition: DNAComposition = {
      modules: config.dnaModules.map(moduleId => ({
        moduleId,
        version: 'latest',
        config: config.variables?.[moduleId] || {}
      })),
      framework: config.framework,
      templateType: config.type,
      globalConfig: config.variables || {}
    };

    return this.composer.getCompositionPreview(composition);
  }

  /**
   * Optimize DNA composition for better performance
   */
  public async optimizeComposition(config: TemplateConfig): Promise<{
    originalComplexity: number;
    optimizedComposition: DNAComposition;
    optimizedComplexity: number;
    suggestions: string[];
  }> {
    const composition: DNAComposition = {
      modules: config.dnaModules.map(moduleId => ({
        moduleId,
        version: 'latest',
        config: config.variables?.[moduleId] || {}
      })),
      framework: config.framework,
      templateType: config.type,
      globalConfig: config.variables || {}
    };

    return this.composer.optimizeComposition(composition);
  }

  /**
   * Check if migration is needed for DNA modules
   */
  public isMigrationNeeded(config: TemplateConfig, currentVersions: Record<string, string>): boolean {
    for (const moduleId of config.dnaModules) {
      const currentVersion = currentVersions[moduleId];
      const latestModule = this.registry.getModule(moduleId);
      
      if (currentVersion && latestModule && 
          this.migrationManager.isMigrationNeeded(moduleId, currentVersion, latestModule.metadata.version)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Migrate DNA modules to latest versions
   */
  public async migrateDNAModules(
    config: TemplateConfig,
    currentVersions: Record<string, string>,
    options: { dryRun?: boolean; backup?: boolean } = {}
  ): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];
    let overallSuccess = true;

    for (const moduleId of config.dnaModules) {
      const currentVersion = currentVersions[moduleId];
      const latestModule = this.registry.getModule(moduleId);
      
      if (currentVersion && latestModule && 
          this.migrationManager.isMigrationNeeded(moduleId, currentVersion, latestModule.metadata.version)) {
        
        try {
          const migrationResult = await this.migrationManager.executeMigration(latestModule, {
            moduleId,
            fromVersion: currentVersion,
            toVersion: latestModule.metadata.version,
            projectPath: config.outputPath,
            dryRun: options.dryRun || false,
            backupPath: options.backup ? `${config.outputPath}.backup` : undefined
          });
          
          results[moduleId] = migrationResult;
          
          if (!migrationResult.success) {
            overallSuccess = false;
            errors.push(`Migration failed for ${moduleId}: ${migrationResult.errors.join(', ')}`);
          }
        } catch (error) {
          overallSuccess = false;
          errors.push(`Migration error for ${moduleId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      success: overallSuccess,
      results,
      errors
    };
  }

  private async calculateLinesOfCodeFromFiles(files: any[]): Promise<number> {
    // Calculate lines of code from generated files
    let totalLines = 0;
    
    for (const file of files) {
      if (file.content) {
        totalLines += file.content.split('\n').length;
      }
    }
    
    return totalLines;
  }

  /**
   * Get all available DNA modules from registry
   */
  public getModules(): DNAModule[] {
    return this.registry.getAllModules();
  }

  /**
   * Get a specific DNA module by ID
   */
  public getModule(id: string): DNAModule | null {
    return this.registry.getModule(id);
  }

  /**
   * Get modules by category
   */
  public getModulesByCategory(category: string): DNAModule[] {
    return this.registry.getModulesByCategory(category);
  }

  /**
   * Get modules compatible with a framework
   */
  public getModulesForFramework(framework: SupportedFramework): DNAModule[] {
    return this.registry.getModulesForFramework(framework);
  }

  /**
   * Search modules
   */
  public searchModules(query: string): DNAModule[] {
    return this.registry.searchModules(query);
  }

  /**
   * Get DNA registry
   */
  public getRegistry(): DNARegistry {
    return this.registry;
  }

  /**
   * Get DNA composer
   */
  public getComposer(): DNAComposer {
    return this.composer;
  }

  /**
   * Get migration manager
   */
  public getMigrationManager(): DNAMigrationManager {
    return this.migrationManager;
  }

  /**
   * Create default file system implementation
   */
  private createDefaultFileSystem(): DNAFileSystem {
    return {
      async exists(path: string): Promise<boolean> {
        // Implementation would check if file exists
        return false;
      },
      async read(path: string): Promise<string> {
        // Implementation would read file
        return '';
      },
      async write(path: string, content: string): Promise<void> {
        // Implementation would write file
      },
      async copy(source: string, destination: string): Promise<void> {
        // Implementation would copy file
      },
      async mkdir(path: string): Promise<void> {
        // Implementation would create directory
      },
      async remove(path: string): Promise<void> {
        // Implementation would remove file/directory
      },
      async list(path: string): Promise<string[]> {
        // Implementation would list directory contents
        return [];
      },
      async access(path: string, mode?: number): Promise<void> {
        // Implementation would check file access
      },
      async pathExists(path: string): Promise<boolean> {
        // Implementation would check if path exists
        return false;
      },
      async writeJSON(path: string, data: any, options?: { spaces?: number }): Promise<void> {
        // Implementation would write JSON file
      },
      constants: {
        R_OK: 4,
        W_OK: 2,
        X_OK: 1,
        F_OK: 0
      }
    };
  }

  /**
   * Create default logger implementation
   */
  private createDefaultLogger(): DNALogger {
    return {
      debug(message: string, meta?: any): void {
        console.debug(`[DEBUG] ${message}`, meta);
      },
      info(message: string, meta?: any): void {
        console.info(`[INFO] ${message}`, meta);
      },
      warn(message: string, meta?: any): void {
        console.warn(`[WARN] ${message}`, meta);
      },
      error(message: string, meta?: any): void {
        console.error(`[ERROR] ${message}`, meta);
      },
      success(message: string, meta?: any): void {
        console.log(`[SUCCESS] ${message}`, meta);
      }
    };
  }
}