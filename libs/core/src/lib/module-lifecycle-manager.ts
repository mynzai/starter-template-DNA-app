/**
 * @fileoverview Module Lifecycle Manager - Epic 5 Story 1 AC5
 * Provides comprehensive module lifecycle management including install,
 * update, remove, rollback operations with state tracking and recovery.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname, resolve } from 'path';
import semver from 'semver';
import { execSync } from 'child_process';
import {
  DNAModule,
  DNAModuleContext,
  DNAValidationResult,
  SupportedFramework
} from './types';

/**
 * Module lifecycle operation types
 */
export enum LifecycleOperation {
  INSTALL = 'install',
  UPDATE = 'update',
  REMOVE = 'remove',
  ROLLBACK = 'rollback',
  MIGRATE = 'migrate',
  VALIDATE = 'validate'
}

/**
 * Module installation source types
 */
export enum InstallationSource {
  LOCAL = 'local',
  REMOTE = 'remote',
  NPM = 'npm',
  GIT = 'git',
  REGISTRY = 'registry'
}

/**
 * Module lifecycle configuration
 */
export interface LifecycleConfig {
  readonly backupEnabled: boolean;
  readonly backupPath: string;
  readonly maxBackups: number;
  readonly rollbackEnabled: boolean;
  readonly validationStrict: boolean;
  readonly autoMigration: boolean;
  readonly dependencyResolution: 'strict' | 'loose' | 'auto';
  readonly conflictResolution: 'abort' | 'force' | 'interactive';
  readonly hooks: {
    readonly preInstall?: string[];
    readonly postInstall?: string[];
    readonly preUpdate?: string[];
    readonly postUpdate?: string[];
    readonly preRemove?: string[];
    readonly postRemove?: string[];
  };
}

/**
 * Module operation context
 */
export interface ModuleOperationContext {
  readonly operation: LifecycleOperation;
  readonly moduleId: string;
  readonly version?: string;
  readonly source?: InstallationSource;
  readonly targetFramework: SupportedFramework;
  readonly workingDirectory: string;
  readonly config: LifecycleConfig;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly interactive: boolean;
}

/**
 * Module operation result
 */
export interface ModuleOperationResult {
  readonly success: boolean;
  readonly operation: LifecycleOperation;
  readonly moduleId: string;
  readonly version?: string;
  readonly previousVersion?: string;
  readonly duration: number;
  readonly rollbackId?: string;
  readonly errors: string[];
  readonly warnings: string[];
  readonly changes: ModuleChange[];
  readonly artifacts: OperationArtifact[];
}

/**
 * Module change information
 */
export interface ModuleChange {
  readonly type: 'added' | 'modified' | 'removed' | 'moved';
  readonly path: string;
  readonly description: string;
  readonly reversible: boolean;
}

/**
 * Operation artifact (backups, logs, etc.)
 */
export interface OperationArtifact {
  readonly type: 'backup' | 'log' | 'checkpoint' | 'migration';
  readonly path: string;
  readonly size: number;
  readonly timestamp: number;
  readonly metadata: Record<string, any>;
}

/**
 * Rollback point information
 */
export interface RollbackPoint {
  readonly id: string;
  readonly moduleId: string;
  readonly version: string;
  readonly operation: LifecycleOperation;
  readonly timestamp: number;
  readonly backupPath: string;
  readonly metadata: Record<string, any>;
  readonly dependencies: string[];
  readonly reversible: boolean;
}

/**
 * Migration operation details
 */
export interface MigrationOperation {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly breaking: boolean;
  readonly automated: boolean;
  readonly steps: MigrationStep[];
  readonly rollbackSteps: MigrationStep[];
}

/**
 * Individual migration step
 */
export interface MigrationStep {
  readonly id: string;
  readonly description: string;
  readonly type: 'file' | 'config' | 'dependency' | 'script' | 'manual';
  readonly action: 'create' | 'update' | 'delete' | 'move' | 'execute';
  readonly target: string;
  readonly content?: string;
  readonly script?: string;
  readonly validation?: string;
  readonly reversible: boolean;
}

/**
 * Advanced module lifecycle manager
 */
export class ModuleLifecycleManager extends EventEmitter {
  private rollbackPoints: Map<string, RollbackPoint> = new Map();
  private operationHistory: ModuleOperationResult[] = [];
  private migrationCache: Map<string, MigrationOperation> = new Map();
  private activeOperations: Map<string, Promise<ModuleOperationResult>> = new Map();
  private moduleRegistry: Map<string, DNAModule> = new Map();

  constructor(
    private config: LifecycleConfig,
    private workingDirectory: string = process.cwd()
  ) {
    super();
  }

  /**
   * Install a module with comprehensive validation and backup
   */
  public async installModule(
    moduleId: string,
    options: {
      version?: string;
      source?: InstallationSource;
      sourcePath?: string;
      targetFramework?: SupportedFramework;
      dryRun?: boolean;
      force?: boolean;
      skipDependencies?: boolean;
    } = {}
  ): Promise<ModuleOperationResult> {
    const context: ModuleOperationContext = {
      operation: LifecycleOperation.INSTALL,
      moduleId,
      version: options.version,
      source: options.source || InstallationSource.REGISTRY,
      targetFramework: options.targetFramework || SupportedFramework.TYPESCRIPT,
      workingDirectory: this.workingDirectory,
      config: this.config,
      dryRun: options.dryRun || false,
      force: options.force || false,
      interactive: false
    };

    return this.executeOperation(context, async () => {
      this.emit('lifecycle:install_started', { moduleId, options });

      // Step 1: Pre-validation
      const validation = await this.validateInstallation(moduleId, options);
      if (!validation.valid && !context.force) {
        throw new Error(`Installation validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Step 2: Create rollback point
      const rollbackId = await this.createRollbackPoint(context);

      // Step 3: Resolve and download module
      const moduleData = await this.resolveModule(moduleId, options);

      // Step 4: Validate dependencies
      if (!options.skipDependencies) {
        await this.resolveDependencies(moduleData, context);
      }

      // Step 5: Execute pre-install hooks
      await this.executeHooks(context.config.hooks.preInstall, context);

      // Step 6: Install module files
      const changes = await this.installModuleFiles(moduleData, context);

      // Step 7: Update module registry
      this.moduleRegistry.set(moduleId, moduleData);

      // Step 8: Execute post-install hooks
      await this.executeHooks(context.config.hooks.postInstall, context);

      // Step 9: Finalize installation
      await this.finalizeInstallation(moduleData, context);

      return {
        changes,
        rollbackId,
        version: moduleData.metadata.version
      };
    });
  }

  /**
   * Update a module with migration support
   */
  public async updateModule(
    moduleId: string,
    options: {
      targetVersion?: string;
      autoMigrate?: boolean;
      dryRun?: boolean;
      force?: boolean;
      preserveConfig?: boolean;
    } = {}
  ): Promise<ModuleOperationResult> {
    const context: ModuleOperationContext = {
      operation: LifecycleOperation.UPDATE,
      moduleId,
      version: options.targetVersion,
      targetFramework: SupportedFramework.TYPESCRIPT, // Would be determined from context
      workingDirectory: this.workingDirectory,
      config: this.config,
      dryRun: options.dryRun || false,
      force: options.force || false,
      interactive: false
    };

    return this.executeOperation(context, async () => {
      this.emit('lifecycle:update_started', { moduleId, options });

      const currentModule = this.moduleRegistry.get(moduleId);
      if (!currentModule) {
        throw new Error(`Module ${moduleId} is not installed`);
      }

      const currentVersion = currentModule.metadata.version;
      const targetVersion = options.targetVersion || 'latest';

      // Step 1: Validate update
      const validation = await this.validateUpdate(moduleId, currentVersion, targetVersion);
      if (!validation.valid && !context.force) {
        throw new Error(`Update validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Step 2: Create rollback point
      const rollbackId = await this.createRollbackPoint(context);

      // Step 3: Resolve new module version
      const newModuleData = await this.resolveModule(moduleId, { version: targetVersion });

      // Step 4: Plan migration
      const migration = await this.planMigration(
        currentModule,
        newModuleData,
        options.autoMigrate || this.config.autoMigration
      );

      // Step 5: Execute pre-update hooks
      await this.executeHooks(context.config.hooks.preUpdate, context);

      // Step 6: Perform migration if needed
      let migrationChanges: ModuleChange[] = [];
      if (migration.breaking && !options.force) {
        if (migration.automated || options.autoMigrate) {
          migrationChanges = await this.executeMigration(migration, context);
        } else {
          throw new Error(
            `Breaking changes detected. Manual migration required. ` +
            `Use --auto-migrate or --force to proceed.`
          );
        }
      }

      // Step 7: Update module files
      const updateChanges = await this.updateModuleFiles(
        currentModule,
        newModuleData,
        context,
        options.preserveConfig
      );

      // Step 8: Update module registry
      this.moduleRegistry.set(moduleId, newModuleData);

      // Step 9: Execute post-update hooks
      await this.executeHooks(context.config.hooks.postUpdate, context);

      return {
        changes: [...migrationChanges, ...updateChanges],
        rollbackId,
        version: newModuleData.metadata.version,
        previousVersion: currentVersion
      };
    });
  }

  /**
   * Remove a module with dependency checking
   */
  public async removeModule(
    moduleId: string,
    options: {
      force?: boolean;
      removeDependents?: boolean;
      dryRun?: boolean;
      preserveConfig?: boolean;
    } = {}
  ): Promise<ModuleOperationResult> {
    const context: ModuleOperationContext = {
      operation: LifecycleOperation.REMOVE,
      moduleId,
      targetFramework: SupportedFramework.TYPESCRIPT,
      workingDirectory: this.workingDirectory,
      config: this.config,
      dryRun: options.dryRun || false,
      force: options.force || false,
      interactive: false
    };

    return this.executeOperation(context, async () => {
      this.emit('lifecycle:remove_started', { moduleId, options });

      const currentModule = this.moduleRegistry.get(moduleId);
      if (!currentModule) {
        throw new Error(`Module ${moduleId} is not installed`);
      }

      // Step 1: Check for dependents
      const dependents = await this.findDependentModules(moduleId);
      if (dependents.length > 0 && !options.force && !options.removeDependents) {
        throw new Error(
          `Cannot remove ${moduleId}: used by ${dependents.join(', ')}. ` +
          `Use --remove-dependents or --force to proceed.`
        );
      }

      // Step 2: Create rollback point
      const rollbackId = await this.createRollbackPoint(context);

      // Step 3: Execute pre-remove hooks
      await this.executeHooks(context.config.hooks.preRemove, context);

      // Step 4: Remove dependents if requested
      let dependentChanges: ModuleChange[] = [];
      if (options.removeDependents) {
        for (const dependentId of dependents) {
          const dependentResult = await this.removeModule(dependentId, {
            ...options,
            removeDependents: true // Cascade removal
          });
          dependentChanges.push(...dependentResult.changes);
        }
      }

      // Step 5: Remove module files
      const removeChanges = await this.removeModuleFiles(
        currentModule,
        context,
        options.preserveConfig
      );

      // Step 6: Update module registry
      this.moduleRegistry.delete(moduleId);

      // Step 7: Execute post-remove hooks
      await this.executeHooks(context.config.hooks.postRemove, context);

      return {
        changes: [...dependentChanges, ...removeChanges],
        rollbackId,
        version: currentModule.metadata.version
      };
    });
  }

  /**
   * Rollback to a previous state
   */
  public async rollbackModule(
    moduleId: string,
    rollbackId: string,
    options: {
      force?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<ModuleOperationResult> {
    const context: ModuleOperationContext = {
      operation: LifecycleOperation.ROLLBACK,
      moduleId,
      targetFramework: SupportedFramework.TYPESCRIPT,
      workingDirectory: this.workingDirectory,
      config: this.config,
      dryRun: options.dryRun || false,
      force: options.force || false,
      interactive: false
    };

    return this.executeOperation(context, async () => {
      this.emit('lifecycle:rollback_started', { moduleId, rollbackId, options });

      // Step 1: Validate rollback point
      const rollbackPoint = this.rollbackPoints.get(rollbackId);
      if (!rollbackPoint) {
        throw new Error(`Rollback point ${rollbackId} not found`);
      }

      if (rollbackPoint.moduleId !== moduleId) {
        throw new Error(`Rollback point ${rollbackId} is not for module ${moduleId}`);
      }

      if (!rollbackPoint.reversible && !options.force) {
        throw new Error(
          `Rollback point ${rollbackId} is not reversible. Use --force to proceed.`
        );
      }

      // Step 2: Restore from backup
      const restoreChanges = await this.restoreFromBackup(rollbackPoint, context);

      // Step 3: Update module registry
      if (rollbackPoint.operation === LifecycleOperation.REMOVE) {
        // Restore removed module
        const restoredModule = await this.loadModuleFromBackup(rollbackPoint);
        this.moduleRegistry.set(moduleId, restoredModule);
      } else if (rollbackPoint.operation === LifecycleOperation.INSTALL) {
        // Remove installed module
        this.moduleRegistry.delete(moduleId);
      }

      // Step 4: Clean up rollback point
      this.rollbackPoints.delete(rollbackId);

      return {
        changes: restoreChanges,
        version: rollbackPoint.version
      };
    });
  }

  /**
   * Get all available rollback points for a module
   */
  public getRollbackPoints(moduleId?: string): RollbackPoint[] {
    const points = Array.from(this.rollbackPoints.values());
    return moduleId ? points.filter(p => p.moduleId === moduleId) : points;
  }

  /**
   * Get operation history
   */
  public getOperationHistory(moduleId?: string): ModuleOperationResult[] {
    return moduleId 
      ? this.operationHistory.filter(op => op.moduleId === moduleId)
      : [...this.operationHistory];
  }

  /**
   * Validate module state and dependencies
   */
  public async validateModule(moduleId: string): Promise<DNAValidationResult> {
    const module = this.moduleRegistry.get(moduleId);
    if (!module) {
      return {
        valid: false,
        errors: [{
          code: 'MODULE_NOT_FOUND',
          message: `Module ${moduleId} is not installed`,
          severity: 'critical'
        }],
        warnings: [],
        suggestions: []
      };
    }

    // Comprehensive validation would go here
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Clean up old rollback points and artifacts
   */
  public async cleanup(
    options: {
      olderThan?: number; // milliseconds
      maxCount?: number;
      moduleId?: string;
    } = {}
  ): Promise<{
    removedRollbackPoints: number;
    freedSpace: number;
    errors: string[];
  }> {
    const cutoffTime = Date.now() - (options.olderThan || 7 * 24 * 60 * 60 * 1000); // 7 days
    const errors: string[] = [];
    let removedCount = 0;
    let freedSpace = 0;

    const pointsToRemove: string[] = [];
    
    for (const [id, point] of this.rollbackPoints) {
      const shouldRemove = (
        (options.moduleId ? point.moduleId === options.moduleId : true) &&
        point.timestamp < cutoffTime
      );
      
      if (shouldRemove) {
        pointsToRemove.push(id);
      }
    }

    // Apply maxCount limit
    if (options.maxCount && pointsToRemove.length > options.maxCount) {
      pointsToRemove.sort((a, b) => {
        const pointA = this.rollbackPoints.get(a)!;
        const pointB = this.rollbackPoints.get(b)!;
        return pointA.timestamp - pointB.timestamp; // Oldest first
      });
      pointsToRemove.splice(options.maxCount);
    }

    // Remove rollback points
    for (const id of pointsToRemove) {
      try {
        const point = this.rollbackPoints.get(id)!;
        const backupSize = await this.getBackupSize(point.backupPath);
        await this.removeBackup(point.backupPath);
        this.rollbackPoints.delete(id);
        
        removedCount++;
        freedSpace += backupSize;
      } catch (error) {
        errors.push(`Failed to remove rollback point ${id}: ${error}`);
      }
    }

    this.emit('lifecycle:cleanup_completed', {
      removedCount,
      freedSpace,
      errors
    });

    return {
      removedRollbackPoints: removedCount,
      freedSpace,
      errors
    };
  }

  // Private implementation methods

  private async executeOperation<T>(
    context: ModuleOperationContext,
    operation: () => Promise<{
      changes: ModuleChange[];
      rollbackId?: string;
      version?: string;
      previousVersion?: string;
    }>
  ): Promise<ModuleOperationResult> {
    const startTime = Date.now();
    const operationKey = `${context.operation}-${context.moduleId}-${Date.now()}`;
    
    // Prevent concurrent operations on the same module
    if (this.activeOperations.has(context.moduleId)) {
      throw new Error(`Operation already in progress for module ${context.moduleId}`);
    }

    const operationPromise = this.performOperation(context, operation, startTime);
    this.activeOperations.set(context.moduleId, operationPromise);

    try {
      const result = await operationPromise;
      this.operationHistory.push(result);
      return result;
    } finally {
      this.activeOperations.delete(context.moduleId);
    }
  }

  private async performOperation<T>(
    context: ModuleOperationContext,
    operation: () => Promise<{
      changes: ModuleChange[];
      rollbackId?: string;
      version?: string;
      previousVersion?: string;
    }>,
    startTime: number
  ): Promise<ModuleOperationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const artifacts: OperationArtifact[] = [];

    try {
      if (context.dryRun) {
        this.emit('lifecycle:dry_run', { context });
        // In dry run mode, we would simulate the operation
        return {
          success: true,
          operation: context.operation,
          moduleId: context.moduleId,
          version: context.version,
          duration: Date.now() - startTime,
          errors: [],
          warnings: ['Dry run mode - no changes made'],
          changes: [],
          artifacts: []
        };
      }

      const result = await operation();

      return {
        success: true,
        operation: context.operation,
        moduleId: context.moduleId,
        version: result.version,
        previousVersion: result.previousVersion,
        duration: Date.now() - startTime,
        rollbackId: result.rollbackId,
        errors,
        warnings,
        changes: result.changes,
        artifacts
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      this.emit('lifecycle:operation_failed', {
        context,
        error: errorMessage
      });

      return {
        success: false,
        operation: context.operation,
        moduleId: context.moduleId,
        version: context.version,
        duration: Date.now() - startTime,
        errors,
        warnings,
        changes: [],
        artifacts
      };
    }
  }

  private async validateInstallation(
    moduleId: string,
    options: any
  ): Promise<DNAValidationResult> {
    const errors = [];
    const warnings = [];

    // Check if module already exists
    if (this.moduleRegistry.has(moduleId) && !options.force) {
      errors.push({
        code: 'MODULE_ALREADY_INSTALLED',
        message: `Module ${moduleId} is already installed`,
        severity: 'error' as const
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  private async validateUpdate(
    moduleId: string,
    currentVersion: string,
    targetVersion: string
  ): Promise<DNAValidationResult> {
    const errors = [];
    const warnings = [];

    // Check version compatibility
    if (targetVersion !== 'latest' && semver.lte(targetVersion, currentVersion)) {
      warnings.push({
        code: 'VERSION_DOWNGRADE',
        message: `Target version ${targetVersion} is not newer than current ${currentVersion}`,
        impact: 'medium' as const
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }

  private async createRollbackPoint(
    context: ModuleOperationContext
  ): Promise<string> {
    if (!this.config.rollbackEnabled) {
      return '';
    }

    const rollbackId = `${context.moduleId}_${context.operation}_${Date.now()}`;
    const backupPath = join(this.config.backupPath, rollbackId);

    // Create backup of current state
    await this.createBackup(context.moduleId, backupPath);

    const rollbackPoint: RollbackPoint = {
      id: rollbackId,
      moduleId: context.moduleId,
      version: this.moduleRegistry.get(context.moduleId)?.metadata.version || 'unknown',
      operation: context.operation,
      timestamp: Date.now(),
      backupPath,
      metadata: {
        workingDirectory: context.workingDirectory,
        config: context.config
      },
      dependencies: [],
      reversible: true
    };

    this.rollbackPoints.set(rollbackId, rollbackPoint);
    this.emit('lifecycle:rollback_point_created', { rollbackId, rollbackPoint });

    return rollbackId;
  }

  private async resolveModule(
    moduleId: string,
    options: { version?: string; source?: InstallationSource; sourcePath?: string }
  ): Promise<DNAModule> {
    // This would resolve the module from various sources
    // For now, return a placeholder
    throw new Error('Module resolution not implemented');
  }

  private async resolveDependencies(
    module: DNAModule,
    context: ModuleOperationContext
  ): Promise<void> {
    // This would resolve and validate dependencies
    // Implementation depends on dependency resolution strategy
  }

  private async executeHooks(
    hooks: string[] | undefined,
    context: ModuleOperationContext
  ): Promise<void> {
    if (!hooks || hooks.length === 0) {
      return;
    }

    for (const hook of hooks) {
      try {
        execSync(hook, {
          cwd: context.workingDirectory,
          stdio: 'inherit'
        });
      } catch (error) {
        this.emit('lifecycle:hook_failed', { hook, error });
        throw new Error(`Hook failed: ${hook}`);
      }
    }
  }

  private async installModuleFiles(
    module: DNAModule,
    context: ModuleOperationContext
  ): Promise<ModuleChange[]> {
    // Implementation would install module files
    return [];
  }

  private async finalizeInstallation(
    module: DNAModule,
    context: ModuleOperationContext
  ): Promise<void> {
    // Implementation would finalize the installation
  }

  private async planMigration(
    currentModule: DNAModule,
    newModule: DNAModule,
    autoMigrate: boolean
  ): Promise<MigrationOperation> {
    const fromVersion = currentModule.metadata.version;
    const toVersion = newModule.metadata.version;
    
    // Get migration path from module
    const migrationSteps = newModule.getMigrationPath(fromVersion, toVersion);
    const breaking = migrationSteps.some(step => step.breaking);
    
    return {
      fromVersion,
      toVersion,
      breaking,
      automated: migrationSteps.every(step => step.automated),
      steps: migrationSteps.map((step, index) => ({
        id: `step_${index}`,
        description: step.description,
        type: 'manual',
        action: 'execute',
        target: step.instructions.join('\n'),
        reversible: !step.breaking
      })),
      rollbackSteps: []
    };
  }

  private async executeMigration(
    migration: MigrationOperation,
    context: ModuleOperationContext
  ): Promise<ModuleChange[]> {
    const changes: ModuleChange[] = [];
    
    for (const step of migration.steps) {
      const change = await this.executeMigrationStep(step, context);
      if (change) {
        changes.push(change);
      }
    }
    
    return changes;
  }

  private async executeMigrationStep(
    step: MigrationStep,
    context: ModuleOperationContext
  ): Promise<ModuleChange | null> {
    // Implementation would execute individual migration steps
    return null;
  }

  private async updateModuleFiles(
    currentModule: DNAModule,
    newModule: DNAModule,
    context: ModuleOperationContext,
    preserveConfig?: boolean
  ): Promise<ModuleChange[]> {
    // Implementation would update module files
    return [];
  }

  private async removeModuleFiles(
    module: DNAModule,
    context: ModuleOperationContext,
    preserveConfig?: boolean
  ): Promise<ModuleChange[]> {
    // Implementation would remove module files
    return [];
  }

  private async findDependentModules(moduleId: string): Promise<string[]> {
    const dependents: string[] = [];
    
    for (const [id, module] of this.moduleRegistry) {
      if (module.dependencies.some(dep => dep.moduleId === moduleId)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  private async createBackup(moduleId: string, backupPath: string): Promise<void> {
    // Implementation would create a backup of the module
    await fs.mkdir(dirname(backupPath), { recursive: true });
    // Backup logic here
  }

  private async restoreFromBackup(
    rollbackPoint: RollbackPoint,
    context: ModuleOperationContext
  ): Promise<ModuleChange[]> {
    // Implementation would restore from backup
    return [];
  }

  private async loadModuleFromBackup(rollbackPoint: RollbackPoint): Promise<DNAModule> {
    // Implementation would load module from backup
    throw new Error('Load from backup not implemented');
  }

  private async getBackupSize(backupPath: string): Promise<number> {
    try {
      const stats = await fs.stat(backupPath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async removeBackup(backupPath: string): Promise<void> {
    try {
      await fs.rm(backupPath, { recursive: true, force: true });
    } catch {
      // Ignore errors - backup might already be removed
    }
  }
}

/**
 * Factory function to create module lifecycle manager
 */
export function createModuleLifecycleManager(
  config: Partial<LifecycleConfig> = {},
  workingDirectory: string = process.cwd()
): ModuleLifecycleManager {
  const defaultConfig: LifecycleConfig = {
    backupEnabled: true,
    backupPath: '.dna-backups',
    maxBackups: 10,
    rollbackEnabled: true,
    validationStrict: true,
    autoMigration: false,
    dependencyResolution: 'strict',
    conflictResolution: 'abort',
    hooks: {}
  };

  return new ModuleLifecycleManager(
    { ...defaultConfig, ...config },
    workingDirectory
  );
}

/**
 * Default configuration for development environment
 */
export const DEV_LIFECYCLE_CONFIG: LifecycleConfig = {
  backupEnabled: true,
  backupPath: '.dna-backups',
  maxBackups: 20,
  rollbackEnabled: true,
  validationStrict: false,
  autoMigration: true,
  dependencyResolution: 'loose',
  conflictResolution: 'interactive',
  hooks: {
    postInstall: ['npm install'],
    postUpdate: ['npm update'],
    postRemove: ['npm prune']
  }
};

/**
 * Production configuration with strict validation
 */
export const PROD_LIFECYCLE_CONFIG: LifecycleConfig = {
  backupEnabled: true,
  backupPath: '/var/backups/dna-modules',
  maxBackups: 5,
  rollbackEnabled: true,
  validationStrict: true,
  autoMigration: false,
  dependencyResolution: 'strict',
  conflictResolution: 'abort',
  hooks: {
    preInstall: ['npm ci'],
    preUpdate: ['npm audit'],
    preRemove: ['npm ls']
  }
};
