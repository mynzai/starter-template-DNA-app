/**
 * @fileoverview Conflict Resolution System for DNA Module Selection
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { DNARegistry, DNAModule, DNAModuleConflict } from '@starter-template-dna/core';
import { enhancedLogger as logger, ICONS } from '../utils/enhanced-logger';

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  REPLACE = 'replace',
  KEEP_EXISTING = 'keep-existing',
  MANUAL_SELECT = 'manual-select',
  SUGGEST_ALTERNATIVE = 'suggest-alternative',
  REMOVE_CONFLICTING = 'remove-conflicting'
}

/**
 * Conflict resolution option
 */
export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  selectedModule?: string;
  alternativeModules?: string[];
  reason: string;
}

/**
 * Conflict context information
 */
export interface ConflictContext {
  moduleId: string;
  conflictingModules: string[];
  conflict: DNAModuleConflict;
  selectedModules: string[];
  availableModules: DNAModule[];
}

/**
 * Advanced conflict resolution system
 */
export class ConflictResolver {
  private registry: DNARegistry;
  private resolutionHistory: Map<string, ConflictResolution> = new Map();

  constructor(registry: DNARegistry) {
    this.registry = registry;
  }

  /**
   * Resolve conflicts for a module selection
   */
  public async resolveConflicts(
    moduleId: string,
    selectedModules: string[],
    interactive: boolean = true
  ): Promise<{
    resolution: ConflictResolution | null;
    updatedModules: string[];
  }> {
    const conflicts = await this.detectConflicts(moduleId, selectedModules);
    
    if (conflicts.length === 0) {
      return {
        resolution: null,
        updatedModules: [...selectedModules, moduleId]
      };
    }

    // Check if we have a cached resolution for this conflict pattern
    const conflictKey = this.getConflictKey(moduleId, conflicts);
    const cachedResolution = this.resolutionHistory.get(conflictKey);
    
    if (cachedResolution && !interactive) {
      return this.applyResolution(cachedResolution, moduleId, selectedModules);
    }

    // Interactive conflict resolution
    if (interactive) {
      const resolution = await this.interactiveConflictResolution(
        moduleId,
        conflicts,
        selectedModules
      );
      
      // Cache the resolution
      this.resolutionHistory.set(conflictKey, resolution);
      
      return this.applyResolution(resolution, moduleId, selectedModules);
    }

    // Default resolution for non-interactive mode
    const defaultResolution: ConflictResolution = {
      strategy: ConflictResolutionStrategy.KEEP_EXISTING,
      reason: 'Automatic conflict resolution - kept existing modules'
    };

    return this.applyResolution(defaultResolution, moduleId, selectedModules);
  }

  /**
   * Detect conflicts for a module
   */
  private async detectConflicts(
    moduleId: string,
    selectedModules: string[]
  ): Promise<ConflictContext[]> {
    const module = await this.registry.getModule(moduleId);
    if (!module) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    const conflicts: ConflictContext[] = [];

    // Check direct conflicts defined in module
    for (const conflict of module.conflicts) {
      const conflictingModules = selectedModules.filter(id => 
        id === conflict.moduleId || this.matchesPattern(id, conflict.moduleId)
      );

      if (conflictingModules.length > 0) {
        const availableModules = await this.registry.listAvailableModules();
        
        conflicts.push({
          moduleId,
          conflictingModules,
          conflict,
          selectedModules,
          availableModules
        });
      }
    }

    // Check reverse conflicts (other modules that conflict with this one)
    for (const selectedId of selectedModules) {
      const selectedModule = await this.registry.getModule(selectedId);
      if (!selectedModule) continue;

      for (const conflict of selectedModule.conflicts) {
        if (conflict.moduleId === moduleId || this.matchesPattern(moduleId, conflict.moduleId)) {
          const availableModules = await this.registry.listAvailableModules();
          
          conflicts.push({
            moduleId,
            conflictingModules: [selectedId],
            conflict: {
              ...conflict,
              reason: `${selectedModule.metadata.name} conflicts with ${module.metadata.name}: ${conflict.reason}`
            },
            selectedModules,
            availableModules
          });
        }
      }
    }

    // Check category conflicts (multiple modules of exclusive categories)
    const exclusiveCategories = ['authentication', 'payment', 'database'];
    if (exclusiveCategories.includes(module.metadata.category)) {
      const conflictingModules = selectedModules.filter(async (id) => {
        const mod = await this.registry.getModule(id);
        return mod && mod.metadata.category === module.metadata.category;
      });

      if (conflictingModules.length > 0) {
        const availableModules = await this.registry.listAvailableModules();
        
        conflicts.push({
          moduleId,
          conflictingModules,
          conflict: {
            moduleId: conflictingModules[0],
            reason: `Only one ${module.metadata.category} module allowed`,
            severity: 'warning'
          },
          selectedModules,
          availableModules
        });
      }
    }

    return conflicts;
  }

  /**
   * Interactive conflict resolution
   */
  private async interactiveConflictResolution(
    moduleId: string,
    conflicts: ConflictContext[],
    selectedModules: string[]
  ): Promise<ConflictResolution> {
    const module = await this.registry.getModule(moduleId);
    const moduleName = module?.metadata.name || moduleId;

    // Display conflict information
    this.displayConflictInformation(moduleName, conflicts);

    // Generate resolution options
    const options = await this.generateResolutionOptions(moduleId, conflicts);

    // Present options to user
    const { selectedOption } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedOption',
      message: `How would you like to resolve conflicts for ${chalk.cyan(moduleName)}?`,
      choices: options.map(option => ({
        name: option.description,
        value: option,
        short: option.strategy
      })),
      pageSize: 10
    }]);

    // If manual selection is chosen, let user pick specific modules
    if (selectedOption.strategy === ConflictResolutionStrategy.MANUAL_SELECT) {
      return this.handleManualSelection(moduleId, conflicts, selectedModules);
    }

    // If alternative suggestion is chosen, let user pick alternative
    if (selectedOption.strategy === ConflictResolutionStrategy.SUGGEST_ALTERNATIVE) {
      return this.handleAlternativeSelection(moduleId, conflicts);
    }

    return selectedOption;
  }

  /**
   * Display conflict information to user
   */
  private displayConflictInformation(moduleName: string, conflicts: ConflictContext[]): void {
    const conflictMessages = [
      chalk.bold.yellow(`⚠️  Module Conflict Detected: ${moduleName}`),
      '',
      chalk.bold('Conflicts:')
    ];

    for (const context of conflicts) {
      const severity = context.conflict.severity === 'error' ? chalk.red('ERROR') : chalk.yellow('WARNING');
      conflictMessages.push(
        `  ${severity}: ${context.conflict.reason}`,
        `    Conflicting with: ${context.conflictingModules.join(', ')}`
      );
    }

    conflictMessages.push('');

    logger.box(conflictMessages, {
      borderColor: 'yellow',
      borderStyle: 'round'
    });
  }

  /**
   * Generate resolution options based on conflicts
   */
  private async generateResolutionOptions(
    moduleId: string,
    conflicts: ConflictContext[]
  ): Promise<Array<ConflictResolution & { description: string }>> {
    const options: Array<ConflictResolution & { description: string }> = [];
    const module = await this.registry.getModule(moduleId);
    const moduleName = module?.metadata.name || moduleId;

    // Option 1: Replace conflicting modules
    const conflictingModuleNames = await Promise.all(
      conflicts.flatMap(c => c.conflictingModules).map(async id => {
        const mod = await this.registry.getModule(id);
        return mod?.metadata.name || id;
      })
    );

    options.push({
      strategy: ConflictResolutionStrategy.REPLACE,
      reason: `Replace conflicting modules with ${moduleName}`,
      description: `${ICONS.replace} Replace conflicting modules (${conflictingModuleNames.join(', ')}) with ${chalk.cyan(moduleName)}`
    });

    // Option 2: Keep existing modules
    options.push({
      strategy: ConflictResolutionStrategy.KEEP_EXISTING,
      reason: 'Keep existing modules, skip new module',
      description: `${ICONS.skip} Keep existing modules, don't add ${chalk.cyan(moduleName)}`
    });

    // Option 3: Manual selection
    if (conflicts.length > 1) {
      options.push({
        strategy: ConflictResolutionStrategy.MANUAL_SELECT,
        reason: 'Manually choose which modules to keep',
        description: `${ICONS.select} Manually select which modules to keep`
      });
    }

    // Option 4: Suggest alternatives
    const alternatives = await this.findAlternativeModules(moduleId, conflicts[0]);
    if (alternatives.length > 0) {
      options.push({
        strategy: ConflictResolutionStrategy.SUGGEST_ALTERNATIVE,
        alternativeModules: alternatives,
        reason: 'Use alternative module without conflicts',
        description: `${ICONS.suggest} Use alternative module (${alternatives.length} available)`
      });
    }

    // Option 5: Remove all conflicting modules
    if (conflicts.some(c => c.conflict.severity === 'warning')) {
      options.push({
        strategy: ConflictResolutionStrategy.REMOVE_CONFLICTING,
        reason: 'Remove all conflicting modules',
        description: `${ICONS.remove} Remove all conflicting modules and add ${chalk.cyan(moduleName)}`
      });
    }

    return options;
  }

  /**
   * Handle manual module selection
   */
  private async handleManualSelection(
    moduleId: string,
    conflicts: ConflictContext[],
    selectedModules: string[]
  ): Promise<ConflictResolution> {
    const allConflictingModules = [...new Set(conflicts.flatMap(c => c.conflictingModules))];
    const module = await this.registry.getModule(moduleId);
    
    // Create choices for each module
    const choices = await Promise.all([
      // New module option
      {
        name: `${chalk.cyan('●')} ${module?.metadata.name || moduleId} (new)`,
        value: moduleId,
        checked: true
      },
      // Existing conflicting modules
      ...allConflictingModules.map(async id => {
        const mod = await this.registry.getModule(id);
        return {
          name: `${chalk.yellow('●')} ${mod?.metadata.name || id} (existing)`,
          value: id,
          checked: false
        };
      })
    ]);

    const { selectedModuleIds } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedModuleIds',
      message: 'Select which modules to keep:',
      choices: await Promise.all(choices),
      validate: (input: string[]) => {
        if (input.length === 0) {
          return 'You must select at least one module';
        }
        return true;
      }
    }]);

    return {
      strategy: ConflictResolutionStrategy.MANUAL_SELECT,
      selectedModule: selectedModuleIds.includes(moduleId) ? moduleId : undefined,
      reason: `Manually selected modules: ${selectedModuleIds.join(', ')}`
    };
  }

  /**
   * Handle alternative module selection
   */
  private async handleAlternativeSelection(
    moduleId: string,
    conflicts: ConflictContext[]
  ): Promise<ConflictResolution> {
    const alternatives = await this.findAlternativeModules(moduleId, conflicts[0]);
    
    if (alternatives.length === 0) {
      throw new Error('No alternative modules found');
    }

    const choices = await Promise.all(alternatives.map(async id => {
      const mod = await this.registry.getModule(id);
      return {
        name: `${mod?.metadata.name || id} - ${mod?.metadata.description || 'No description'}`,
        value: id,
        short: mod?.metadata.name || id
      };
    }));

    const { alternativeId } = await inquirer.prompt([{
      type: 'list',
      name: 'alternativeId',
      message: 'Select an alternative module:',
      choices
    }]);

    return {
      strategy: ConflictResolutionStrategy.SUGGEST_ALTERNATIVE,
      selectedModule: alternativeId,
      alternativeModules: alternatives,
      reason: `Selected alternative module: ${alternativeId}`
    };
  }

  /**
   * Find alternative modules
   */
  private async findAlternativeModules(
    moduleId: string,
    conflict: ConflictContext
  ): Promise<string[]> {
    const module = await this.registry.getModule(moduleId);
    if (!module) return [];

    const availableModules = await this.registry.listAvailableModules();
    
    // Find modules in the same category that don't conflict
    const alternatives = availableModules.filter(mod => 
      mod.metadata.id !== moduleId &&
      mod.metadata.category === module.metadata.category &&
      !conflict.conflictingModules.includes(mod.metadata.id) &&
      !this.wouldConflictWith(mod, conflict.selectedModules)
    );

    return alternatives.map(mod => mod.metadata.id);
  }

  /**
   * Check if module would conflict with selected modules
   */
  private async wouldConflictWith(module: DNAModule, selectedModules: string[]): Promise<boolean> {
    for (const conflict of module.conflicts) {
      if (selectedModules.some(id => 
        id === conflict.moduleId || this.matchesPattern(id, conflict.moduleId)
      )) {
        return true;
      }
    }
    return false;
  }

  /**
   * Apply resolution to module list
   */
  private async applyResolution(
    resolution: ConflictResolution,
    moduleId: string,
    selectedModules: string[]
  ): Promise<{
    resolution: ConflictResolution;
    updatedModules: string[];
  }> {
    let updatedModules = [...selectedModules];

    switch (resolution.strategy) {
      case ConflictResolutionStrategy.REPLACE:
        // Remove conflicting modules and add new one
        const conflicts = await this.detectConflicts(moduleId, selectedModules);
        const conflictingIds = conflicts.flatMap(c => c.conflictingModules);
        updatedModules = updatedModules.filter(id => !conflictingIds.includes(id));
        updatedModules.push(moduleId);
        break;

      case ConflictResolutionStrategy.KEEP_EXISTING:
        // Don't add the new module
        break;

      case ConflictResolutionStrategy.MANUAL_SELECT:
        // Use manually selected modules
        if (resolution.selectedModule) {
          if (!updatedModules.includes(resolution.selectedModule)) {
            updatedModules.push(resolution.selectedModule);
          }
        }
        break;

      case ConflictResolutionStrategy.SUGGEST_ALTERNATIVE:
        // Replace with alternative
        if (resolution.selectedModule) {
          updatedModules.push(resolution.selectedModule);
        }
        break;

      case ConflictResolutionStrategy.REMOVE_CONFLICTING:
        // Remove all conflicting and add new
        const allConflicts = await this.detectConflicts(moduleId, selectedModules);
        const allConflictingIds = allConflicts.flatMap(c => c.conflictingModules);
        updatedModules = updatedModules.filter(id => !allConflictingIds.includes(id));
        updatedModules.push(moduleId);
        break;
    }

    return {
      resolution,
      updatedModules
    };
  }

  /**
   * Utilities
   */
  
  private matchesPattern(id: string, pattern: string): boolean {
    // Simple pattern matching - could be enhanced with regex
    return pattern.includes('*') 
      ? new RegExp(pattern.replace(/\*/g, '.*')).test(id)
      : id === pattern;
  }

  private getConflictKey(moduleId: string, conflicts: ConflictContext[]): string {
    const conflictIds = conflicts.flatMap(c => c.conflictingModules).sort();
    return `${moduleId}:${conflictIds.join(',')}`;
  }

  /**
   * Get resolution history for analysis
   */
  public getResolutionHistory(): Map<string, ConflictResolution> {
    return new Map(this.resolutionHistory);
  }

  /**
   * Clear resolution history
   */
  public clearHistory(): void {
    this.resolutionHistory.clear();
  }

  /**
   * Export resolution patterns for reuse
   */
  public exportResolutionPatterns(): Record<string, ConflictResolution> {
    return Object.fromEntries(this.resolutionHistory);
  }

  /**
   * Import resolution patterns
   */
  public importResolutionPatterns(patterns: Record<string, ConflictResolution>): void {
    for (const [key, resolution] of Object.entries(patterns)) {
      this.resolutionHistory.set(key, resolution);
    }
  }
}