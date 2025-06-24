/**
 * @fileoverview DNA Composition Engine
 */

import { EventEmitter } from 'events';
import {
  DNAModule,
  DNAComposition,
  DNACompositionResult,
  DNAValidationResult,
  DNAValidationError,
  DNAValidationWarning,
  DNAModuleContext,
  DNAModuleFile,
  SupportedFramework,
  TemplateType,
  CompatibilityLevel,
  DNAFileSystem,
  DNALogger
} from './types';
import { DNARegistry } from './dna-registry';

/**
 * Performance thresholds for composition validation
 */
export interface CompositionPerformanceThresholds {
  maxCompositionTime: number; // milliseconds
  maxMemoryUsage: number; // bytes
  maxComplexity: number; // complexity score
  maxModules: number; // number of modules
  maxDependencyDepth: number; // dependency chain depth
}

/**
 * Default performance thresholds
 */
export const DEFAULT_PERFORMANCE_THRESHOLDS: CompositionPerformanceThresholds = {
  maxCompositionTime: 5000, // 5 seconds
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxComplexity: 1000,
  maxModules: 50,
  maxDependencyDepth: 10
};

/**
 * DNA Composition Engine for validating and processing module combinations
 */
export class DNAComposer extends EventEmitter {
  private registry: DNARegistry;
  private performanceThresholds: CompositionPerformanceThresholds;

  constructor(
    registry: DNARegistry,
    performanceThresholds: CompositionPerformanceThresholds = DEFAULT_PERFORMANCE_THRESHOLDS
  ) {
    super();
    this.registry = registry;
    this.performanceThresholds = performanceThresholds;
  }

  /**
   * Compose and validate a DNA module combination
   */
  public async compose(composition: DNAComposition): Promise<DNACompositionResult> {
    const startTime = Date.now();
    
    this.emit('composition:started', { 
      moduleCount: composition.modules.length,
      framework: composition.framework 
    });

    try {
      // Use registry to perform initial composition
      const initialResult = await this.registry.composeDNA(composition);
      
      if (!initialResult.valid) {
        this.emit('composition:failed', { errors: initialResult.errors });
        return initialResult;
      }

      // Perform additional validation and optimization
      const enhancedResult = await this.enhanceComposition(initialResult, composition);
      
      // Validate performance constraints
      const performanceValidation = this.validatePerformance(enhancedResult);
      enhancedResult.errors.push(...performanceValidation.errors);
      enhancedResult.warnings.push(...performanceValidation.warnings);
      
      (enhancedResult as any).valid = enhancedResult.errors.length === 0;
      
      if (enhancedResult.valid) {
        this.emit('composition:completed', {
          moduleCount: enhancedResult.modules.length,
          compositionTime: enhancedResult.performance.compositionTime
        });
      } else {
        this.emit('composition:failed', { errors: enhancedResult.errors });
      }

      return enhancedResult;

    } catch (error) {
      const errorResult: DNACompositionResult = {
        valid: false,
        modules: [],
        errors: [{
          code: 'COMPOSITION_FATAL_ERROR',
          message: error instanceof Error ? error.message : 'Fatal composition error',
          severity: 'critical'
        }],
        warnings: [],
        dependencyOrder: [],
        configMerged: {},
        performance: {
          compositionTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed,
          complexity: 0
        }
      };

      this.emit('composition:error', { error });
      return errorResult;
    }
  }

  /**
   * Generate files for a composed DNA configuration
   */
  public async generateFiles(
    composition: DNACompositionResult,
    context: Omit<DNAModuleContext, 'activeModules'>
  ): Promise<DNAModuleFile[]> {
    if (!composition.valid) {
      throw new Error('Cannot generate files for invalid composition');
    }

    const allFiles: DNAModuleFile[] = [];
    const fullContext: DNAModuleContext = {
      ...context,
      activeModules: composition.modules,
      availableModules: new Map(composition.modules.map(m => [m.metadata.id, m]))
    };

    this.emit('generation:started', { moduleCount: composition.modules.length });

    try {
      // Process modules in dependency order
      for (const moduleId of composition.dependencyOrder) {
        const module = composition.modules.find(m => m.metadata.id === moduleId);
        if (!module) continue;

        this.emit('generation:module_started', { moduleId });

        // Create module-specific context
        const moduleContext: DNAModuleContext = {
          ...fullContext,
          moduleConfig: composition.configMerged[moduleId] || {}
        };

        // Initialize module
        await module.initialize(moduleContext);

        // Configure module
        const configuredConfig = await module.configure(moduleContext.moduleConfig, moduleContext);
        (moduleContext as any).moduleConfig = configuredConfig;

        // Validate module
        const validation = await module.validate(configuredConfig, moduleContext);
        if (!validation.valid) {
          throw new Error(`Module ${moduleId} validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        // Generate files
        const moduleFiles = await module.generateFiles(moduleContext);
        allFiles.push(...moduleFiles);

        this.emit('generation:module_completed', { 
          moduleId, 
          filesGenerated: moduleFiles.length 
        });
      }

      // Post-process files (resolve conflicts, merge files, etc.)
      const processedFiles = await this.postProcessFiles(allFiles, fullContext);

      this.emit('generation:completed', { totalFiles: processedFiles.length });
      return processedFiles;

    } catch (error) {
      this.emit('generation:error', { error });
      throw error;
    }
  }

  /**
   * Install dependencies for a composed DNA configuration
   */
  public async installDependencies(
    composition: DNACompositionResult,
    context: Omit<DNAModuleContext, 'activeModules'>
  ): Promise<void> {
    if (!composition.valid) {
      throw new Error('Cannot install dependencies for invalid composition');
    }

    const fullContext: DNAModuleContext = {
      ...context,
      activeModules: composition.modules,
      availableModules: new Map(composition.modules.map(m => [m.metadata.id, m]))
    };

    this.emit('installation:started', { moduleCount: composition.modules.length });

    try {
      // Install dependencies in dependency order
      for (const moduleId of composition.dependencyOrder) {
        const module = composition.modules.find(m => m.metadata.id === moduleId);
        if (!module) continue;

        this.emit('installation:module_started', { moduleId });

        const moduleContext: DNAModuleContext = {
          ...fullContext,
          moduleConfig: composition.configMerged[moduleId] || {}
        };

        await module.install(moduleContext);

        this.emit('installation:module_completed', { moduleId });
      }

      this.emit('installation:completed');

    } catch (error) {
      this.emit('installation:error', { error });
      throw error;
    }
  }

  /**
   * Finalize a composed DNA configuration
   */
  public async finalize(
    composition: DNACompositionResult,
    context: Omit<DNAModuleContext, 'activeModules'>
  ): Promise<void> {
    if (!composition.valid) {
      throw new Error('Cannot finalize invalid composition');
    }

    const fullContext: DNAModuleContext = {
      ...context,
      activeModules: composition.modules,
      availableModules: new Map(composition.modules.map(m => [m.metadata.id, m]))
    };

    this.emit('finalization:started', { moduleCount: composition.modules.length });

    try {
      // Finalize modules in dependency order
      for (const moduleId of composition.dependencyOrder) {
        const module = composition.modules.find(m => m.metadata.id === moduleId);
        if (!module) continue;

        this.emit('finalization:module_started', { moduleId });

        const moduleContext: DNAModuleContext = {
          ...fullContext,
          moduleConfig: composition.configMerged[moduleId] || {}
        };

        await module.finalize(moduleContext);

        this.emit('finalization:module_completed', { moduleId });
      }

      this.emit('finalization:completed');

    } catch (error) {
      this.emit('finalization:error', { error });
      throw error;
    }
  }

  /**
   * Get composition preview without actually generating files
   */
  public async getCompositionPreview(composition: DNAComposition): Promise<{
    valid: boolean;
    modules: { id: string; name: string; version: string }[];
    dependencies: string[];
    conflicts: string[];
    estimatedFiles: number;
    estimatedComplexity: number;
    warnings: string[];
  }> {
    const result = await this.compose(composition);
    
    return {
      valid: result.valid,
      modules: result.modules.map(m => ({
        id: m.metadata.id,
        name: m.metadata.name,
        version: m.metadata.version
      })),
      dependencies: result.dependencyOrder,
      conflicts: result.errors.filter(e => e.code.includes('CONFLICT')).map(e => e.message),
      estimatedFiles: this.estimateFileCount(result.modules),
      estimatedComplexity: result.performance.complexity,
      warnings: result.warnings.map(w => w.message)
    };
  }

  /**
   * Optimize composition by suggesting better module combinations
   */
  public async optimizeComposition(composition: DNAComposition): Promise<{
    originalComplexity: number;
    optimizedComposition: DNAComposition;
    optimizedComplexity: number;
    suggestions: string[];
  }> {
    const originalResult = await this.compose(composition);
    const suggestions: string[] = [];
    let optimizedComposition = { ...composition };

    // Suggest removing conflicting modules
    const conflicts = originalResult.errors.filter(e => e.code.includes('CONFLICT'));
    if (conflicts.length > 0) {
      suggestions.push(`Remove conflicting modules: ${conflicts.map(c => c.message).join(', ')}`);
    }

    // Suggest removing redundant modules
    const redundantModules = this.findRedundantModules(originalResult.modules);
    if (redundantModules.length > 0) {
      suggestions.push(`Consider removing redundant modules: ${redundantModules.join(', ')}`);
      optimizedComposition.modules = optimizedComposition.modules.filter(
        m => !redundantModules.includes(m.moduleId)
      );
    }

    // Suggest alternative modules with better compatibility
    const incompatibleModules = originalResult.warnings.filter(w => 
      w.code.includes('FRAMEWORK') || w.code.includes('PARTIAL')
    );
    if (incompatibleModules.length > 0) {
      suggestions.push('Consider using modules with better framework compatibility');
    }

    const optimizedResult = await this.compose(optimizedComposition);

    return {
      originalComplexity: originalResult.performance.complexity,
      optimizedComposition,
      optimizedComplexity: optimizedResult.performance.complexity,
      suggestions
    };
  }

  /**
   * Validate composition performance against thresholds
   */
  private validatePerformance(composition: DNACompositionResult): DNAValidationResult {
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];

    // Check composition time
    if (composition.performance.compositionTime > this.performanceThresholds.maxCompositionTime) {
      warnings.push({
        code: 'PERFORMANCE_COMPOSITION_TIME',
        message: `Composition time (${composition.performance.compositionTime}ms) exceeds threshold (${this.performanceThresholds.maxCompositionTime}ms)`,
        impact: 'medium',
        recommendation: 'Consider reducing the number of modules or optimizing module dependencies'
      });
    }

    // Check memory usage
    if (composition.performance.memoryUsage > this.performanceThresholds.maxMemoryUsage) {
      warnings.push({
        code: 'PERFORMANCE_MEMORY_USAGE',
        message: `Memory usage (${Math.round(composition.performance.memoryUsage / 1024 / 1024)}MB) exceeds threshold (${Math.round(this.performanceThresholds.maxMemoryUsage / 1024 / 1024)}MB)`,
        impact: 'high',
        recommendation: 'Reduce the number of modules or check for memory leaks'
      });
    }

    // Check complexity
    if (composition.performance.complexity > this.performanceThresholds.maxComplexity) {
      errors.push({
        code: 'PERFORMANCE_COMPLEXITY',
        message: `Composition complexity (${composition.performance.complexity}) exceeds threshold (${this.performanceThresholds.maxComplexity})`,
        severity: 'error',
        resolution: 'Reduce module count, dependencies, or framework diversity'
      });
    }

    // Check module count
    if (composition.modules.length > this.performanceThresholds.maxModules) {
      errors.push({
        code: 'PERFORMANCE_MODULE_COUNT',
        message: `Module count (${composition.modules.length}) exceeds threshold (${this.performanceThresholds.maxModules})`,
        severity: 'error',
        resolution: 'Reduce the number of modules in the composition'
      });
    }

    // Check dependency depth
    const maxDepth = this.calculateMaxDependencyDepth(composition.modules);
    if (maxDepth > this.performanceThresholds.maxDependencyDepth) {
      warnings.push({
        code: 'PERFORMANCE_DEPENDENCY_DEPTH',
        message: `Maximum dependency depth (${maxDepth}) exceeds threshold (${this.performanceThresholds.maxDependencyDepth})`,
        impact: 'medium',
        recommendation: 'Consider flattening dependency structures'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  /**
   * Enhance composition with additional processing
   */
  private async enhanceComposition(
    result: DNACompositionResult,
    composition: DNAComposition
  ): Promise<DNACompositionResult> {
    // Add framework-specific validations
    const frameworkValidation = await this.validateFrameworkSpecific(result.modules, composition.framework);
    result.errors.push(...frameworkValidation.errors);
    result.warnings.push(...frameworkValidation.warnings);

    // Check for best practices
    const bestPracticeValidation = this.validateBestPractices(result.modules);
    result.warnings.push(...bestPracticeValidation.warnings);

    // Update performance metrics
    (result.performance as any).compositionTime = Date.now() - (Date.now() - result.performance.compositionTime);

    return result;
  }

  /**
   * Validate framework-specific requirements
   */
  private async validateFrameworkSpecific(
    modules: DNAModule[],
    framework: SupportedFramework
  ): Promise<DNAValidationResult> {
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];

    for (const module of modules) {
      const frameworkSupport = module.getFrameworkSupport(framework);
      
      if (frameworkSupport && frameworkSupport.limitations.length > 0) {
        warnings.push({
          code: 'FRAMEWORK_LIMITATIONS',
          message: `Module ${module.metadata.name} has limitations on ${framework}: ${frameworkSupport.limitations.join(', ')}`,
          impact: 'low',
          recommendation: 'Review module limitations and test thoroughly'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings, suggestions: [] };
  }

  /**
   * Validate best practices
   */
  private validateBestPractices(modules: DNAModule[]): DNAValidationResult {
    const warnings: DNAValidationWarning[] = [];

    // Check for too many modules of the same category
    const categoryCount = new Map<string, number>();
    for (const module of modules) {
      const category = module.metadata.category;
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    }

    for (const [category, count] of categoryCount) {
      if (count > 3) {
        warnings.push({
          code: 'BEST_PRACTICE_CATEGORY_OVERUSE',
          message: `Too many ${category} modules (${count}). Consider consolidating functionality.`,
          impact: 'low',
          recommendation: 'Review if all modules in this category are necessary'
        });
      }
    }

    // Check for experimental modules in production
    const experimentalModules = modules.filter(m => m.metadata.experimental);
    if (experimentalModules.length > 0) {
      warnings.push({
        code: 'BEST_PRACTICE_EXPERIMENTAL_MODULES',
        message: `Using experimental modules: ${experimentalModules.map(m => m.metadata.name).join(', ')}`,
        impact: 'medium',
        recommendation: 'Use stable alternatives for production applications'
      });
    }

    return { valid: true, errors: [], warnings, suggestions: [] };
  }

  /**
   * Post-process generated files
   */
  private async postProcessFiles(
    files: DNAModuleFile[],
    context: DNAModuleContext
  ): Promise<DNAModuleFile[]> {
    const processedFiles = new Map<string, DNAModuleFile>();

    // Group files by path
    const fileGroups = new Map<string, DNAModuleFile[]>();
    for (const file of files) {
      const existing = fileGroups.get(file.relativePath) || [];
      existing.push(file);
      fileGroups.set(file.relativePath, existing);
    }

    // Process each group
    for (const [path, groupFiles] of fileGroups) {
      if (groupFiles.length === 1) {
        processedFiles.set(path, groupFiles[0]);
      } else {
        // Handle file conflicts
        const mergedFile = await this.mergeFiles(groupFiles, context);
        processedFiles.set(path, mergedFile);
      }
    }

    return Array.from(processedFiles.values());
  }

  /**
   * Merge conflicting files
   */
  private async mergeFiles(files: DNAModuleFile[], context: DNAModuleContext): Promise<DNAModuleFile> {
    // Use the first file as base
    const baseFile = files[0];
    
    // For simplicity, just concatenate content for merge strategy
    if (baseFile.mergeStrategy === 'merge') {
      const mergedContent = files.map(f => f.content).join('\n\n');
      return {
        ...baseFile,
        content: mergedContent
      };
    }

    // For other strategies, use the last file (last wins)
    return files[files.length - 1];
  }

  /**
   * Find redundant modules in composition
   */
  private findRedundantModules(modules: DNAModule[]): string[] {
    const redundant: string[] = [];
    
    // Simple redundancy check - modules with same category and similar functionality
    const categoryModules = new Map<string, DNAModule[]>();
    for (const module of modules) {
      const category = module.metadata.category;
      const existing = categoryModules.get(category) || [];
      existing.push(module);
      categoryModules.set(category, existing);
    }

    for (const [category, categoryMods] of categoryModules) {
      if (categoryMods.length > 1 && category !== 'testing') {
        // Mark all but the first as potentially redundant
        redundant.push(...categoryMods.slice(1).map(m => m.metadata.id));
      }
    }

    return redundant;
  }

  /**
   * Calculate maximum dependency depth
   */
  private calculateMaxDependencyDepth(modules: DNAModule[]): number {
    const moduleMap = new Map(modules.map(m => [m.metadata.id, m]));
    let maxDepth = 0;

    const calculateDepth = (moduleId: string, visited = new Set<string>()): number => {
      if (visited.has(moduleId)) return 0; // Circular dependency
      
      const module = moduleMap.get(moduleId);
      if (!module) return 0;

      visited.add(moduleId);
      let depth = 0;

      for (const dep of module.dependencies) {
        if (!dep.optional) {
          depth = Math.max(depth, calculateDepth(dep.moduleId, new Set(visited)) + 1);
        }
      }

      return depth;
    };

    for (const module of modules) {
      maxDepth = Math.max(maxDepth, calculateDepth(module.metadata.id));
    }

    return maxDepth;
  }

  /**
   * Estimate file count for modules
   */
  private estimateFileCount(modules: DNAModule[]): number {
    // Simple estimation based on module count and complexity
    let estimate = 0;
    
    for (const module of modules) {
      // Base files per module
      estimate += 5;
      
      // Framework-specific files
      estimate += module.frameworks.filter(f => f.supported).length * 2;
      
      // Dependencies add complexity
      estimate += module.dependencies.length;
    }

    return estimate;
  }
}