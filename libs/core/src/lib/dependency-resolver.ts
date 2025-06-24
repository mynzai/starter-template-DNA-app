/**
 * @fileoverview Advanced Dependency Resolution Engine - Epic 5 Story 1 AC2
 * Provides sophisticated dependency resolution with conflict prevention,
 * circular dependency detection, and version compatibility checking.
 */

import { EventEmitter } from 'events';
import semver from 'semver';
import {
  DNAModule,
  DNAModuleDependency,
  DNAModuleConflict,
  DNAValidationError,
  DNAValidationWarning,
  SupportedFramework,
  CompatibilityLevel
} from './types';

/**
 * Dependency resolution strategies
 */
export enum ResolutionStrategy {
  LATEST = 'latest',           // Always use latest version
  STABLE = 'stable',           // Prefer stable versions
  MINIMAL = 'minimal',         // Use minimal required versions
  COMPATIBLE = 'compatible',   // Maximize compatibility
  PERFORMANCE = 'performance'  // Optimize for performance
}

/**
 * Dependency resolution context
 */
export interface DependencyResolutionContext {
  readonly targetFramework: SupportedFramework;
  readonly strategy: ResolutionStrategy;
  readonly allowExperimental: boolean;
  readonly allowDeprecated: boolean;
  readonly allowConflicts: boolean;
  readonly maxDepth: number;
  readonly excludeModules: Set<string>;
  readonly preferredVersions: Map<string, string>;
  readonly compatibilityMatrix: Map<string, Map<string, CompatibilityLevel>>;
}

/**
 * Dependency node in resolution graph
 */
export interface DependencyNode {
  readonly moduleId: string;
  readonly requestedVersion: string;
  readonly resolvedVersion: string;
  readonly module: DNAModule;
  readonly depth: number;
  readonly requiredBy: string[];
  readonly optional: boolean;
  readonly conflicts: DependencyConflict[];
  readonly children: DependencyNode[];
}

/**
 * Dependency conflict information
 */
export interface DependencyConflict {
  readonly type: 'version' | 'incompatible' | 'circular' | 'platform';
  readonly conflictingModule: string;
  readonly reason: string;
  readonly severity: 'error' | 'warning';
  readonly resolution?: string;
}

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
  readonly success: boolean;
  readonly resolved: Map<string, DNAModule>;
  readonly dependencyTree: DependencyNode[];
  readonly installOrder: string[];
  readonly conflicts: DependencyConflict[];
  readonly warnings: string[];
  readonly metrics: {
    readonly resolutionTime: number;
    readonly nodesAnalyzed: number;
    readonly versionsConsidered: number;
    readonly conflictsResolved: number;
  };
}

/**
 * Advanced dependency resolver with comprehensive conflict resolution
 */
export class DependencyResolver extends EventEmitter {
  private resolutionCache: Map<string, DependencyResolutionResult> = new Map();
  private compatibilityCache: Map<string, CompatibilityLevel> = new Map();
  private versionCache: Map<string, DNAModule[]> = new Map();

  constructor(
    private moduleRegistry: Map<string, DNAModule[]>,
    private cacheSize: number = 1000
  ) {
    super();
  }

  /**
   * Resolve dependencies for a set of modules with advanced conflict resolution
   */
  public async resolveDependencies(
    rootModules: string[],
    context: DependencyResolutionContext
  ): Promise<DependencyResolutionResult> {
    const startTime = Date.now();
    const cacheKey = this.createCacheKey(rootModules, context);
    
    // Check cache first
    if (this.resolutionCache.has(cacheKey)) {
      this.emit('resolution:cache_hit', { cacheKey });
      return this.resolutionCache.get(cacheKey)!;
    }

    this.emit('resolution:started', { rootModules, context });

    try {
      const resolved = new Map<string, DNAModule>();
      const dependencyTree: DependencyNode[] = [];
      const conflicts: DependencyConflict[] = [];
      const warnings: string[] = [];
      const visited = new Set<string>();
      const resolving = new Set<string>();
      let nodesAnalyzed = 0;
      let versionsConsidered = 0;
      let conflictsResolved = 0;

      // Phase 1: Build initial dependency tree
      for (const rootModule of rootModules) {
        const node = await this.buildDependencyNode(
          rootModule,
          '*', // Any version for root modules
          context,
          resolved,
          conflicts,
          warnings,
          visited,
          resolving,
          0,
          []
        );
        
        if (node) {
          dependencyTree.push(node);
          nodesAnalyzed++;
        }
      }

      // Phase 2: Detect and resolve conflicts
      const conflictResolution = await this.resolveConflicts(
        resolved,
        conflicts,
        context
      );
      conflicts.push(...conflictResolution.newConflicts);
      warnings.push(...conflictResolution.warnings);
      conflictsResolved = conflictResolution.resolved;

      // Phase 3: Detect circular dependencies
      const circularDeps = this.detectCircularDependencies(dependencyTree);
      if (circularDeps.length > 0) {
        for (const cycle of circularDeps) {
          conflicts.push({
            type: 'circular',
            conflictingModule: cycle.join(' -> '),
            reason: `Circular dependency detected: ${cycle.join(' -> ')}`,
            severity: 'error',
            resolution: 'Remove one of the dependencies or make it optional'
          });
        }
      }

      // Phase 4: Calculate installation order
      const installOrder = this.calculateInstallationOrder(
        Array.from(resolved.values()),
        conflicts
      );

      // Phase 5: Validate framework compatibility
      const frameworkValidation = this.validateFrameworkCompatibility(
        Array.from(resolved.values()),
        context.targetFramework
      );
      warnings.push(...frameworkValidation.warnings);
      conflicts.push(...frameworkValidation.conflicts);

      const result: DependencyResolutionResult = {
        success: conflicts.filter(c => c.severity === 'error').length === 0,
        resolved,
        dependencyTree,
        installOrder,
        conflicts,
        warnings,
        metrics: {
          resolutionTime: Date.now() - startTime,
          nodesAnalyzed,
          versionsConsidered,
          conflictsResolved
        }
      };

      // Cache result
      this.cacheResult(cacheKey, result);

      this.emit('resolution:completed', result);
      return result;

    } catch (error) {
      this.emit('resolution:error', { error });
      throw error;
    }
  }

  /**
   * Build dependency node recursively with conflict detection
   */
  private async buildDependencyNode(
    moduleId: string,
    requestedVersion: string,
    context: DependencyResolutionContext,
    resolved: Map<string, DNAModule>,
    conflicts: DependencyConflict[],
    warnings: string[],
    visited: Set<string>,
    resolving: Set<string>,
    depth: number,
    requiredBy: string[]
  ): Promise<DependencyNode | null> {
    // Check depth limit
    if (depth > context.maxDepth) {
      warnings.push(`Maximum dependency depth (${context.maxDepth}) exceeded for ${moduleId}`);
      return null;
    }

    // Check exclusions
    if (context.excludeModules.has(moduleId)) {
      return null;
    }

    // Check for circular dependency
    if (resolving.has(moduleId)) {
      conflicts.push({
        type: 'circular',
        conflictingModule: moduleId,
        reason: `Circular dependency detected: ${Array.from(resolving).join(' -> ')} -> ${moduleId}`,
        severity: 'error',
        resolution: 'Make one of the dependencies optional or remove the circular reference'
      });
      return null;
    }

    // Get available versions
    const availableVersions = this.getAvailableVersions(moduleId);
    if (availableVersions.length === 0) {
      conflicts.push({
        type: 'incompatible',
        conflictingModule: moduleId,
        reason: `Module ${moduleId} not found in registry`,
        severity: 'error',
        resolution: 'Add the module to the registry or check the module ID'
      });
      return null;
    }

    // Resolve version
    const resolvedModule = this.resolveVersion(
      moduleId,
      requestedVersion,
      availableVersions,
      context
    );

    if (!resolvedModule) {
      conflicts.push({
        type: 'version',
        conflictingModule: moduleId,
        reason: `No compatible version found for ${moduleId}@${requestedVersion}`,
        severity: 'error',
        resolution: 'Check version constraints or update dependency requirements'
      });
      return null;
    }

    // Check if already resolved with different version
    const existingModule = resolved.get(moduleId);
    if (existingModule && existingModule.metadata.version !== resolvedModule.metadata.version) {
      const versionConflict = this.handleVersionConflict(
        moduleId,
        existingModule.metadata.version,
        resolvedModule.metadata.version,
        context
      );
      
      if (versionConflict.severity === 'error') {
        conflicts.push(versionConflict);
        return null;
      } else {
        warnings.push(versionConflict.reason);
      }
    }

    // Set resolved module
    resolved.set(moduleId, resolvedModule);
    resolving.add(moduleId);

    // Build child nodes
    const children: DependencyNode[] = [];
    for (const dependency of resolvedModule.dependencies) {
      if (!dependency.optional || this.shouldIncludeOptional(dependency, context)) {
        const childNode = await this.buildDependencyNode(
          dependency.moduleId,
          dependency.version,
          context,
          resolved,
          conflicts,
          warnings,
          visited,
          resolving,
          depth + 1,
          [...requiredBy, moduleId]
        );
        
        if (childNode) {
          children.push(childNode);
        }
      }
    }

    resolving.delete(moduleId);
    visited.add(moduleId);

    return {
      moduleId,
      requestedVersion,
      resolvedVersion: resolvedModule.metadata.version,
      module: resolvedModule,
      depth,
      requiredBy: [...requiredBy],
      optional: false, // Root dependencies are never optional
      conflicts: conflicts.filter(c => c.conflictingModule === moduleId),
      children
    };
  }

  /**
   * Resolve version conflicts using sophisticated strategies
   */
  private handleVersionConflict(
    moduleId: string,
    existingVersion: string,
    requestedVersion: string,
    context: DependencyResolutionContext
  ): DependencyConflict {
    // Check if versions are compatible
    if (semver.satisfies(existingVersion, requestedVersion) || 
        semver.satisfies(requestedVersion, existingVersion)) {
      return {
        type: 'version',
        conflictingModule: moduleId,
        reason: `Version conflict resolved: using ${existingVersion} (compatible with ${requestedVersion})`,
        severity: 'warning',
        resolution: 'Versions are compatible'
      };
    }

    // Apply resolution strategy
    switch (context.strategy) {
      case ResolutionStrategy.LATEST:
        const newer = semver.gt(requestedVersion, existingVersion) ? requestedVersion : existingVersion;
        return {
          type: 'version',
          conflictingModule: moduleId,
          reason: `Version conflict: choosing latest version ${newer}`,
          severity: 'warning',
          resolution: `Using latest version ${newer}`
        };
        
      case ResolutionStrategy.STABLE:
        const moreStable = this.getMoreStableVersion(existingVersion, requestedVersion);
        return {
          type: 'version',
          conflictingModule: moduleId,
          reason: `Version conflict: choosing stable version ${moreStable}`,
          severity: 'warning',
          resolution: `Using stable version ${moreStable}`
        };
        
      default:
        return {
          type: 'version',
          conflictingModule: moduleId,
          reason: `Incompatible versions: ${existingVersion} vs ${requestedVersion}`,
          severity: 'error',
          resolution: 'Update version constraints to make them compatible'
        };
    }
  }

  /**
   * Get more stable version between two versions
   */
  private getMoreStableVersion(versionA: string, versionB: string): string {
    const prereleaseA = semver.prerelease(versionA);
    const prereleaseB = semver.prerelease(versionB);
    
    // Prefer non-prerelease versions
    if (prereleaseA && !prereleaseB) return versionB;
    if (!prereleaseA && prereleaseB) return versionA;
    
    // Both are stable or both are prerelease - choose higher
    return semver.gt(versionA, versionB) ? versionA : versionB;
  }

  /**
   * Resolve specific version using strategy
   */
  private resolveVersion(
    moduleId: string,
    requestedVersion: string,
    availableVersions: DNAModule[],
    context: DependencyResolutionContext
  ): DNAModule | null {
    // Check preferred versions first
    if (context.preferredVersions.has(moduleId)) {
      const preferredVersion = context.preferredVersions.get(moduleId)!;
      const preferredModule = availableVersions.find(m => m.metadata.version === preferredVersion);
      if (preferredModule && this.isVersionCompatible(preferredVersion, requestedVersion)) {
        return preferredModule;
      }
    }

    // Filter compatible versions
    let compatibleVersions = availableVersions.filter(module => {
      const version = module.metadata.version;
      
      // Check version satisfaction
      if (!this.isVersionCompatible(version, requestedVersion)) {
        return false;
      }
      
      // Check experimental/deprecated flags
      if (module.metadata.experimental && !context.allowExperimental) {
        return false;
      }
      
      if (module.metadata.deprecated && !context.allowDeprecated) {
        return false;
      }
      
      // Check framework compatibility
      const frameworkSupport = module.getFrameworkSupport(context.targetFramework);
      if (!frameworkSupport?.supported) {
        return false;
      }
      
      return true;
    });

    if (compatibleVersions.length === 0) {
      return null;
    }

    // Apply resolution strategy
    switch (context.strategy) {
      case ResolutionStrategy.LATEST:
        return this.getLatestVersion(compatibleVersions);
        
      case ResolutionStrategy.STABLE:
        return this.getLatestStableVersion(compatibleVersions);
        
      case ResolutionStrategy.MINIMAL:
        return this.getMinimalVersion(compatibleVersions, requestedVersion);
        
      case ResolutionStrategy.COMPATIBLE:
        return this.getMostCompatibleVersion(compatibleVersions, context);
        
      case ResolutionStrategy.PERFORMANCE:
        return this.getBestPerformanceVersion(compatibleVersions);
        
      default:
        return this.getLatestStableVersion(compatibleVersions);
    }
  }

  /**
   * Check if version satisfies requested version constraint
   */
  private isVersionCompatible(version: string, requestedVersion: string): boolean {
    if (requestedVersion === '*' || requestedVersion === 'latest') {
      return true;
    }
    
    try {
      return semver.satisfies(version, requestedVersion);
    } catch {
      return version === requestedVersion;
    }
  }

  /**
   * Get latest version from available versions
   */
  private getLatestVersion(versions: DNAModule[]): DNAModule {
    return versions.reduce((latest, current) => 
      semver.gt(current.metadata.version, latest.metadata.version) ? current : latest
    );
  }

  /**
   * Get latest stable (non-prerelease) version
   */
  private getLatestStableVersion(versions: DNAModule[]): DNAModule {
    const stableVersions = versions.filter(v => !semver.prerelease(v.metadata.version));
    return stableVersions.length > 0 ? this.getLatestVersion(stableVersions) : this.getLatestVersion(versions);
  }

  /**
   * Get minimal version that satisfies constraint
   */
  private getMinimalVersion(versions: DNAModule[], constraint: string): DNAModule {
    const sortedVersions = versions.sort((a, b) => 
      semver.compare(a.metadata.version, b.metadata.version)
    );
    
    return sortedVersions.find(v => 
      this.isVersionCompatible(v.metadata.version, constraint)
    ) || sortedVersions[0];
  }

  /**
   * Get version with best compatibility score
   */
  private getMostCompatibleVersion(
    versions: DNAModule[],
    context: DependencyResolutionContext
  ): DNAModule {
    return versions.reduce((best, current) => {
      const bestScore = this.calculateCompatibilityScore(best, context);
      const currentScore = this.calculateCompatibilityScore(current, context);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Get version with best performance characteristics
   */
  private getBestPerformanceVersion(versions: DNAModule[]): DNAModule {
    // For now, return latest stable version
    // In a real implementation, this would consider performance metrics
    return this.getLatestStableVersion(versions);
  }

  /**
   * Calculate compatibility score for a module
   */
  private calculateCompatibilityScore(
    module: DNAModule,
    context: DependencyResolutionContext
  ): number {
    let score = 100;
    
    // Reduce score for experimental modules
    if (module.metadata.experimental) score -= 20;
    
    // Reduce score for deprecated modules
    if (module.metadata.deprecated) score -= 30;
    
    // Reduce score for prerelease versions
    if (semver.prerelease(module.metadata.version)) score -= 10;
    
    // Increase score for better framework support
    const frameworkSupport = module.getFrameworkSupport(context.targetFramework);
    if (frameworkSupport?.compatibility === CompatibilityLevel.FULL) {
      score += 20;
    } else if (frameworkSupport?.compatibility === CompatibilityLevel.PARTIAL) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Get available versions for a module
   */
  private getAvailableVersions(moduleId: string): DNAModule[] {
    if (this.versionCache.has(moduleId)) {
      return this.versionCache.get(moduleId)!;
    }
    
    const versions = this.moduleRegistry.get(moduleId) || [];
    this.versionCache.set(moduleId, versions);
    return versions;
  }

  /**
   * Determine if optional dependency should be included
   */
  private shouldIncludeOptional(
    dependency: DNAModuleDependency,
    context: DependencyResolutionContext
  ): boolean {
    // Include optional dependencies if they're available and compatible
    const availableVersions = this.getAvailableVersions(dependency.moduleId);
    if (availableVersions.length === 0) return false;
    
    const compatibleModule = this.resolveVersion(
      dependency.moduleId,
      dependency.version,
      availableVersions,
      context
    );
    
    return compatibleModule !== null;
  }

  /**
   * Resolve conflicts between modules
   */
  private async resolveConflicts(
    resolved: Map<string, DNAModule>,
    existingConflicts: DependencyConflict[],
    context: DependencyResolutionContext
  ): Promise<{
    newConflicts: DependencyConflict[];
    warnings: string[];
    resolved: number;
  }> {
    const newConflicts: DependencyConflict[] = [];
    const warnings: string[] = [];
    let conflictsResolved = 0;

    // Check for module conflicts
    const modules = Array.from(resolved.values());
    for (let i = 0; i < modules.length; i++) {
      const moduleA = modules[i];
      for (let j = i + 1; j < modules.length; j++) {
        const moduleB = modules[j];
        
        const conflict = this.checkModuleConflict(moduleA, moduleB);
        if (conflict) {
          if (context.allowConflicts && conflict.severity === 'warning') {
            warnings.push(conflict.reason);
            conflictsResolved++;
          } else {
            newConflicts.push(conflict);
          }
        }
      }
    }

    return { newConflicts, warnings, resolved: conflictsResolved };
  }

  /**
   * Check for conflicts between two modules
   */
  private checkModuleConflict(
    moduleA: DNAModule,
    moduleB: DNAModule
  ): DependencyConflict | null {
    // Check explicit conflicts
    const explicitConflict = moduleA.conflicts.find(c => c.moduleId === moduleB.metadata.id);
    if (explicitConflict) {
      return {
        type: 'incompatible',
        conflictingModule: moduleB.metadata.id,
        reason: `${moduleA.metadata.name} conflicts with ${moduleB.metadata.name}: ${explicitConflict.reason}`,
        severity: explicitConflict.severity,
        resolution: explicitConflict.resolution
      };
    }

    // Check reverse conflicts
    const reverseConflict = moduleB.conflicts.find(c => c.moduleId === moduleA.metadata.id);
    if (reverseConflict) {
      return {
        type: 'incompatible',
        conflictingModule: moduleA.metadata.id,
        reason: `${moduleB.metadata.name} conflicts with ${moduleA.metadata.name}: ${reverseConflict.reason}`,
        severity: reverseConflict.severity,
        resolution: reverseConflict.resolution
      };
    }

    return null;
  }

  /**
   * Detect circular dependencies in the dependency tree
   */
  private detectCircularDependencies(dependencyTree: DependencyNode[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (node: DependencyNode, path: string[]): void => {
      if (recursionStack.has(node.moduleId)) {
        const cycleStart = path.indexOf(node.moduleId);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), node.moduleId]);
        }
        return;
      }

      if (visited.has(node.moduleId)) {
        return;
      }

      visited.add(node.moduleId);
      recursionStack.add(node.moduleId);
      const newPath = [...path, node.moduleId];

      for (const child of node.children) {
        detectCycle(child, newPath);
      }

      recursionStack.delete(node.moduleId);
    };

    for (const rootNode of dependencyTree) {
      detectCycle(rootNode, []);
    }

    return cycles;
  }

  /**
   * Calculate installation order using topological sort
   */
  private calculateInstallationOrder(
    modules: DNAModule[],
    conflicts: DependencyConflict[]
  ): string[] {
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    for (const module of modules) {
      const id = module.metadata.id;
      graph.set(id, new Set());
      inDegree.set(id, 0);
    }

    // Build dependency graph
    for (const module of modules) {
      const id = module.metadata.id;
      for (const dep of module.dependencies) {
        if (graph.has(dep.moduleId) && !dep.optional) {
          graph.get(dep.moduleId)!.add(id);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      }
    }

    // Topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no dependencies
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const dependent of graph.get(current) || []) {
        inDegree.set(dependent, inDegree.get(dependent)! - 1);
        if (inDegree.get(dependent) === 0) {
          queue.push(dependent);
        }
      }
    }

    // Check for remaining nodes (indicates circular dependency)
    if (result.length !== modules.length) {
      // Add remaining nodes at the end (with conflicts)
      const remaining = modules
        .map(m => m.metadata.id)
        .filter(id => !result.includes(id));
      result.push(...remaining);
    }

    return result;
  }

  /**
   * Validate framework compatibility for all modules
   */
  private validateFrameworkCompatibility(
    modules: DNAModule[],
    targetFramework: SupportedFramework
  ): {
    warnings: string[];
    conflicts: DependencyConflict[];
  } {
    const warnings: string[] = [];
    const conflicts: DependencyConflict[] = [];

    for (const module of modules) {
      const frameworkSupport = module.getFrameworkSupport(targetFramework);
      
      if (!frameworkSupport) {
        conflicts.push({
          type: 'platform',
          conflictingModule: module.metadata.id,
          reason: `Module ${module.metadata.name} does not support framework ${targetFramework}`,
          severity: 'error',
          resolution: `Use a different module or add ${targetFramework} support`
        });
      } else if (!frameworkSupport.supported) {
        conflicts.push({
          type: 'platform',
          conflictingModule: module.metadata.id,
          reason: `Module ${module.metadata.name} explicitly does not support ${targetFramework}`,
          severity: 'error',
          resolution: 'Use a compatible module or framework'
        });
      } else if (frameworkSupport.compatibility === CompatibilityLevel.PARTIAL) {
        warnings.push(
          `Module ${module.metadata.name} has partial support for ${targetFramework}. ` +
          `Limitations: ${frameworkSupport.limitations.join(', ')}`
        );
      }
    }

    return { warnings, conflicts };
  }

  /**
   * Create cache key for resolution result
   */
  private createCacheKey(
    rootModules: string[],
    context: DependencyResolutionContext
  ): string {
    const key = {
      modules: rootModules.sort(),
      framework: context.targetFramework,
      strategy: context.strategy,
      allowExperimental: context.allowExperimental,
      allowDeprecated: context.allowDeprecated,
      allowConflicts: context.allowConflicts,
      maxDepth: context.maxDepth,
      excludeModules: Array.from(context.excludeModules).sort(),
      preferredVersions: Array.from(context.preferredVersions.entries()).sort()
    };
    
    return JSON.stringify(key);
  }

  /**
   * Cache resolution result with LRU eviction
   */
  private cacheResult(key: string, result: DependencyResolutionResult): void {
    if (this.resolutionCache.size >= this.cacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.resolutionCache.keys().next().value;
      this.resolutionCache.delete(firstKey);
    }
    
    this.resolutionCache.set(key, result);
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.resolutionCache.clear();
    this.compatibilityCache.clear();
    this.versionCache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    resolutionCacheSize: number;
    compatibilityCacheSize: number;
    versionCacheSize: number;
    totalCacheSize: number;
  } {
    return {
      resolutionCacheSize: this.resolutionCache.size,
      compatibilityCacheSize: this.compatibilityCache.size,
      versionCacheSize: this.versionCache.size,
      totalCacheSize: this.resolutionCache.size + this.compatibilityCache.size + this.versionCache.size
    };
  }
}

/**
 * Factory function to create dependency resolver
 */
export function createDependencyResolver(
  moduleRegistry: Map<string, DNAModule[]>,
  cacheSize: number = 1000
): DependencyResolver {
  return new DependencyResolver(moduleRegistry, cacheSize);
}
