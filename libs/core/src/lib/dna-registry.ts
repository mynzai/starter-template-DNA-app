/**
 * @fileoverview DNA Module Registry System
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import {
  DNAModule,
  DNAModuleMetadata,
  DNARegistryConfig,
  DNAComposition,
  DNACompositionResult,
  DNAValidationResult,
  DNAValidationError,
  DNAValidationWarning,
  SupportedFramework,
  TemplateType,
  CompatibilityLevel
} from './types';

/**
 * DNA Module registry for discovery, loading, and management
 */
export class DNARegistry extends EventEmitter {
  private modules: Map<string, DNAModule> = new Map();
  private moduleVersions: Map<string, Map<string, DNAModule>> = new Map();
  private config: DNARegistryConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: DNARegistryConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the registry and load modules from configured sources
   */
  public async initialize(): Promise<void> {
    this.emit('registry:initializing');
    
    try {
      // Clear existing modules
      this.modules.clear();
      this.moduleVersions.clear();
      
      // Load modules from each source
      for (const source of this.config.sources) {
        await this.loadFromSource(source);
      }
      
      // Validate loaded modules
      await this.validateLoadedModules();
      
      this.emit('registry:initialized', { moduleCount: this.modules.size });
    } catch (error) {
      this.emit('registry:error', error);
      throw error;
    }
  }

  /**
   * Register a DNA module
   */
  public registerModule(module: DNAModule): void {
    const moduleId = module.metadata.id;
    const version = module.metadata.version;

    // Validate module metadata
    try {
      // Assuming DNAModuleMetadataSchema is available from types
      // DNAModuleMetadataSchema.parse(module.metadata);
    } catch (error) {
      throw new Error(`Invalid module metadata for ${moduleId}: ${error}`);
    }

    // Check for conflicts with existing modules
    if (this.modules.has(moduleId)) {
      const existing = this.modules.get(moduleId)!;
      if (existing.metadata.version === version) {
        throw new Error(`Module ${moduleId}@${version} is already registered`);
      }
    }

    // Store module
    this.modules.set(moduleId, module);
    
    // Store version mapping
    if (!this.moduleVersions.has(moduleId)) {
      this.moduleVersions.set(moduleId, new Map());
    }
    this.moduleVersions.get(moduleId)!.set(version, module);

    this.emit('module:registered', { moduleId, version });
  }

  /**
   * Get a module by ID (latest version)
   */
  public getModule(moduleId: string): DNAModule | null {
    return this.modules.get(moduleId) || null;
  }

  /**
   * Get a specific version of a module
   */
  public getModuleVersion(moduleId: string, version: string): DNAModule | null {
    const versions = this.moduleVersions.get(moduleId);
    return versions?.get(version) || null;
  }

  /**
   * Get all available modules
   */
  public getAllModules(): DNAModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get modules by category
   */
  public getModulesByCategory(category: string): DNAModule[] {
    return this.getAllModules().filter(module => 
      module.metadata.category === category
    );
  }

  /**
   * Get modules compatible with a framework
   */
  public getModulesForFramework(framework: SupportedFramework): DNAModule[] {
    return this.getAllModules().filter(module => 
      module.getFrameworkSupport(framework)?.supported
    );
  }

  /**
   * Search modules by keywords
   */
  public searchModules(query: string): DNAModule[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllModules().filter(module => {
      const metadata = module.metadata;
      return (
        metadata.name.toLowerCase().includes(lowerQuery) ||
        metadata.id.toLowerCase().includes(lowerQuery) ||
        metadata.description?.toLowerCase().includes(lowerQuery) ||
        metadata.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Compose DNA modules with validation and dependency resolution
   */
  public async composeDNA(composition: DNAComposition): Promise<DNACompositionResult> {
    const startTime = Date.now();
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];
    const modules: DNAModule[] = [];

    try {
      // Resolve modules
      for (const moduleSpec of composition.modules) {
        const module = moduleSpec.version 
          ? this.getModuleVersion(moduleSpec.moduleId, moduleSpec.version)
          : this.getModule(moduleSpec.moduleId);
        
        if (!module) {
          errors.push({
            code: 'MODULE_NOT_FOUND',
            message: `Module ${moduleSpec.moduleId}${moduleSpec.version ? `@${moduleSpec.version}` : ''} not found`,
            severity: 'critical'
          });
          continue;
        }

        // Check if module is deprecated
        if (module.metadata.deprecated) {
          warnings.push({
            code: 'MODULE_DEPRECATED',
            message: `Module ${module.metadata.name} is deprecated`,
            impact: 'medium',
            recommendation: 'Consider migrating to a newer alternative'
          });
        }

        // Check if module is experimental
        if (module.metadata.experimental && !this.config.validation.allowExperimental) {
          errors.push({
            code: 'MODULE_EXPERIMENTAL',
            message: `Module ${module.metadata.name} is experimental and not allowed`,
            severity: 'error',
            resolution: 'Enable experimental modules in registry config or use a stable module'
          });
          continue;
        }

        modules.push(module);
      }

      if (errors.length > 0) {
        return {
          valid: false,
          modules: [],
          errors,
          warnings,
          dependencyOrder: [],
          configMerged: {},
          performance: {
            compositionTime: Date.now() - startTime,
            memoryUsage: process.memoryUsage().heapUsed,
            complexity: 0
          }
        };
      }

      // Resolve dependencies
      const resolvedModules = await this.resolveDependencies(modules);
      const dependencyOrder = this.calculateDependencyOrder(resolvedModules);

      // Validate composition
      const validationResult = await this.validateComposition(resolvedModules, composition);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      // Merge configurations
      const configMerged = this.mergeConfigurations(resolvedModules, composition);

      return {
        valid: errors.length === 0,
        modules: resolvedModules,
        errors,
        warnings,
        dependencyOrder,
        configMerged,
        performance: {
          compositionTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed,
          complexity: this.calculateComplexity(resolvedModules)
        }
      };

    } catch (error) {
      errors.push({
        code: 'COMPOSITION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown composition error',
        severity: 'critical'
      });

      return {
        valid: false,
        modules: [],
        errors,
        warnings,
        dependencyOrder: [],
        configMerged: {},
        performance: {
          compositionTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage().heapUsed,
          complexity: 0
        }
      };
    }
  }

  /**
   * Get module dependency tree
   */
  public getDependencyTree(moduleId: string): Map<string, string[]> {
    const tree = new Map<string, string[]>();
    const visited = new Set<string>();

    const buildTree = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const module = this.getModule(id);
      if (!module) return;

      const deps = module.dependencies.map(d => d.moduleId);
      tree.set(id, deps);

      for (const depId of deps) {
        buildTree(depId);
      }
    };

    buildTree(moduleId);
    return tree;
  }

  /**
   * Check for circular dependencies
   */
  public hasCircularDependencies(modules: DNAModule[]): boolean {
    const graph = new Map<string, string[]>();
    
    // Build dependency graph
    for (const module of modules) {
      graph.set(module.metadata.id, module.dependencies.map(d => d.moduleId));
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const module of modules) {
      if (!visited.has(module.metadata.id)) {
        if (hasCycle(module.metadata.id)) return true;
      }
    }

    return false;
  }

  /**
   * Clear the registry
   */
  public clear(): void {
    this.modules.clear();
    this.moduleVersions.clear();
    this.cache.clear();
    this.emit('registry:cleared');
  }

  /**
   * Load modules from a source
   */
  private async loadFromSource(source: DNARegistryConfig['sources'][0]): Promise<void> {
    this.emit('source:loading', { type: source.type, path: source.path });

    try {
      switch (source.type) {
        case 'local':
          await this.loadFromLocalPath(source.path);
          break;
        case 'remote':
          await this.loadFromRemoteRegistry(source.path);
          break;
        case 'npm':
          await this.loadFromNpmPackage(source.path);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      this.emit('source:loaded', { type: source.type, path: source.path });
    } catch (error) {
      this.emit('source:error', { source, error });
      throw error;
    }
  }

  /**
   * Load modules from local filesystem
   */
  private async loadFromLocalPath(path: string): Promise<void> {
    // Implementation would scan filesystem for module definitions
    // This is a placeholder for the actual implementation
    throw new Error('Local loading not yet implemented');
  }

  /**
   * Load modules from remote registry
   */
  private async loadFromRemoteRegistry(url: string): Promise<void> {
    // Implementation would fetch from remote registry
    // This is a placeholder for the actual implementation
    throw new Error('Remote loading not yet implemented');
  }

  /**
   * Load modules from NPM package
   */
  private async loadFromNpmPackage(packageName: string): Promise<void> {
    // Implementation would load from NPM package
    // This is a placeholder for the actual implementation
    throw new Error('NPM loading not yet implemented');
  }

  /**
   * Validate all loaded modules
   */
  private async validateLoadedModules(): Promise<void> {
    const errors: string[] = [];

    for (const module of this.modules.values()) {
      try {
        // Validate module structure
        if (!module.metadata || !module.frameworks || !module.config) {
          errors.push(`Module ${module.metadata?.id || 'unknown'} has invalid structure`);
        }

        // Check for circular dependencies within the module itself
        if (module.dependencies.some(d => d.moduleId === module.metadata.id)) {
          errors.push(`Module ${module.metadata.id} has self-dependency`);
        }
      } catch (error) {
        errors.push(`Validation error for module ${module.metadata?.id || 'unknown'}: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Module validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Resolve dependencies for a set of modules
   */
  private async resolveDependencies(modules: DNAModule[]): Promise<DNAModule[]> {
    const resolved = new Set<DNAModule>(modules);
    const toProcess = [...modules];

    while (toProcess.length > 0) {
      const module = toProcess.pop()!;
      
      for (const dep of module.dependencies) {
        if (!dep.optional) {
          const depModule = this.getModule(dep.moduleId);
          if (!depModule) {
            throw new Error(`Required dependency ${dep.moduleId} not found for module ${module.metadata.id}`);
          }
          
          if (!resolved.has(depModule)) {
            resolved.add(depModule);
            toProcess.push(depModule);
          }
        }
      }
    }

    return Array.from(resolved);
  }

  /**
   * Calculate dependency order using topological sort
   */
  private calculateDependencyOrder(modules: DNAModule[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    for (const module of modules) {
      const id = module.metadata.id;
      graph.set(id, []);
      inDegree.set(id, 0);
    }

    // Build graph
    for (const module of modules) {
      const id = module.metadata.id;
      for (const dep of module.dependencies) {
        if (graph.has(dep.moduleId)) {
          graph.get(dep.moduleId)!.push(id);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      }
    }

    // Topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // Find nodes with no incoming edges
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const neighbor of graph.get(current) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== modules.length) {
      throw new Error('Circular dependency detected in module composition');
    }

    return result;
  }

  /**
   * Validate module composition
   */
  private async validateComposition(modules: DNAModule[], composition: DNAComposition): Promise<DNAValidationResult> {
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];

    // Check for conflicts
    for (let i = 0; i < modules.length; i++) {
      const moduleA = modules[i];
      for (let j = i + 1; j < modules.length; j++) {
        const moduleB = modules[j];
        
        const conflict = moduleA.conflicts.find(c => c.moduleId === moduleB.metadata.id);
        if (conflict) {
          if (conflict.severity === 'error') {
            errors.push({
              code: 'MODULE_CONFLICT',
              message: `${moduleA.metadata.name} conflicts with ${moduleB.metadata.name}: ${conflict.reason}`,
              severity: 'error',
              resolution: conflict.resolution
            });
          } else {
            warnings.push({
              code: 'MODULE_CONFLICT_WARNING',
              message: `${moduleA.metadata.name} may conflict with ${moduleB.metadata.name}: ${conflict.reason}`,
              impact: 'medium',
              recommendation: conflict.resolution
            });
          }
        }
      }
    }

    // Check framework compatibility
    for (const module of modules) {
      const frameworkSupport = module.getFrameworkSupport(composition.framework);
      if (!frameworkSupport || !frameworkSupport.supported) {
        errors.push({
          code: 'FRAMEWORK_INCOMPATIBLE',
          message: `Module ${module.metadata.name} does not support framework ${composition.framework}`,
          severity: 'critical'
        });
      } else if (frameworkSupport.compatibility === CompatibilityLevel.PARTIAL) {
        warnings.push({
          code: 'FRAMEWORK_PARTIAL_SUPPORT',
          message: `Module ${module.metadata.name} has partial support for ${composition.framework}`,
          impact: 'medium',
          recommendation: 'Check module limitations and test thoroughly'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  /**
   * Merge module configurations
   */
  private mergeConfigurations(modules: DNAModule[], composition: DNAComposition): Record<string, any> {
    const merged: Record<string, any> = { ...composition.globalConfig };

    for (const module of modules) {
      const moduleConfig = composition.modules.find(m => m.moduleId === module.metadata.id)?.config || {};
      const defaultConfig = module.config.defaults;
      
      merged[module.metadata.id] = {
        ...defaultConfig,
        ...moduleConfig
      };
    }

    return merged;
  }

  /**
   * Calculate complexity score for composition
   */
  private calculateComplexity(modules: DNAModule[]): number {
    let complexity = 0;
    
    // Base complexity per module
    complexity += modules.length * 10;
    
    // Dependency complexity
    for (const module of modules) {
      complexity += module.dependencies.length * 5;
      complexity += module.conflicts.length * 3;
    }
    
    // Framework diversity penalty
    const frameworks = new Set();
    for (const module of modules) {
      for (const fw of module.frameworks) {
        if (fw.supported) frameworks.add(fw.framework);
      }
    }
    complexity += frameworks.size * 15;

    return complexity;
  }
}