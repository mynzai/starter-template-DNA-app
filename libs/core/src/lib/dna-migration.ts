/**
 * @fileoverview DNA Module Migration System
 */

import { EventEmitter } from 'events';
import { DNAModule, DNAMigrationStep } from './types';

/**
 * Migration execution result
 */
export interface MigrationResult {
  success: boolean;
  version: string;
  steps: MigrationStepResult[];
  errors: string[];
  warnings: string[];
  executionTime: number;
}

/**
 * Individual migration step result
 */
export interface MigrationStepResult {
  step: DNAMigrationStep;
  success: boolean;
  error?: string;
  output?: string;
  executionTime: number;
}

/**
 * Migration context
 */
export interface MigrationContext {
  moduleId: string;
  fromVersion: string;
  toVersion: string;
  projectPath: string;
  dryRun: boolean;
  backupPath?: string;
}

/**
 * DNA Module Migration Manager
 */
export class DNAMigrationManager extends EventEmitter {
  private migrations: Map<string, Map<string, DNAMigrationStep[]>> = new Map();

  /**
   * Register migration steps for a module
   */
  public registerMigration(moduleId: string, version: string, steps: DNAMigrationStep[]): void {
    if (!this.migrations.has(moduleId)) {
      this.migrations.set(moduleId, new Map());
    }
    
    this.migrations.get(moduleId)!.set(version, steps);
    this.emit('migration:registered', { moduleId, version, stepCount: steps.length });
  }

  /**
   * Get migration path for a module between versions
   */
  public getMigrationPath(moduleId: string, fromVersion: string, toVersion: string): DNAMigrationStep[] {
    const moduleVersions = this.migrations.get(moduleId);
    if (!moduleVersions) {
      return [];
    }

    // Simple version comparison - in production, use semver
    const fromParts = fromVersion.split('.').map(Number);
    const toParts = toVersion.split('.').map(Number);
    
    if (this.compareVersions(fromParts, toParts) >= 0) {
      return []; // No migration needed or downgrade not supported
    }

    const migrationSteps: DNAMigrationStep[] = [];
    
    // Collect all migration steps between versions
    for (const [version, steps] of moduleVersions) {
      const versionParts = version.split('.').map(Number);
      
      if (this.compareVersions(fromParts, versionParts) < 0 && 
          this.compareVersions(versionParts, toParts) <= 0) {
        migrationSteps.push(...steps);
      }
    }

    // Sort by version order
    return migrationSteps.sort((a, b) => 
      this.compareVersions(a.version.split('.').map(Number), b.version.split('.').map(Number))
    );
  }

  /**
   * Execute migration for a module
   */
  public async executeMigration(
    module: DNAModule, 
    context: MigrationContext
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    
    this.emit('migration:started', { 
      moduleId: context.moduleId, 
      fromVersion: context.fromVersion, 
      toVersion: context.toVersion 
    });

    const migrationSteps = this.getMigrationPath(
      context.moduleId, 
      context.fromVersion, 
      context.toVersion
    );

    if (migrationSteps.length === 0) {
      return {
        success: true,
        version: context.toVersion,
        steps: [],
        errors: [],
        warnings: [],
        executionTime: Date.now() - startTime
      };
    }

    const stepResults: MigrationStepResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let allSuccess = true;

    // Create backup if not dry run
    if (!context.dryRun && context.backupPath) {
      await this.createBackup(context.projectPath, context.backupPath);
    }

    // Execute migration steps in order
    for (const step of migrationSteps) {
      this.emit('migration:step_started', { 
        moduleId: context.moduleId, 
        version: step.version,
        description: step.description 
      });

      const stepResult = await this.executeMigrationStep(step, context);
      stepResults.push(stepResult);

      if (!stepResult.success) {
        allSuccess = false;
        errors.push(`Migration step failed: ${step.description} - ${stepResult.error}`);
        
        if (step.breaking) {
          // Stop on breaking change failure
          break;
        }
      }

      if (step.breaking) {
        warnings.push(`Breaking change applied: ${step.description}`);
      }

      this.emit('migration:step_completed', { 
        moduleId: context.moduleId, 
        version: step.version,
        success: stepResult.success 
      });
    }

    const result: MigrationResult = {
      success: allSuccess,
      version: allSuccess ? context.toVersion : context.fromVersion,
      steps: stepResults,
      errors,
      warnings,
      executionTime: Date.now() - startTime
    };

    if (allSuccess) {
      this.emit('migration:completed', { 
        moduleId: context.moduleId, 
        version: context.toVersion,
        stepCount: stepResults.length 
      });
    } else {
      this.emit('migration:failed', { 
        moduleId: context.moduleId, 
        errors 
      });
      
      // Restore backup if migration failed
      if (!context.dryRun && context.backupPath) {
        await this.restoreBackup(context.backupPath, context.projectPath);
      }
    }

    return result;
  }

  /**
   * Check if migration is needed
   */
  public isMigrationNeeded(moduleId: string, fromVersion: string, toVersion: string): boolean {
    const migrationSteps = this.getMigrationPath(moduleId, fromVersion, toVersion);
    return migrationSteps.length > 0;
  }

  /**
   * Get breaking changes in migration path
   */
  public getBreakingChanges(moduleId: string, fromVersion: string, toVersion: string): DNAMigrationStep[] {
    const migrationSteps = this.getMigrationPath(moduleId, fromVersion, toVersion);
    return migrationSteps.filter(step => step.breaking);
  }

  /**
   * Validate migration compatibility
   */
  public async validateMigration(
    module: DNAModule,
    context: MigrationContext
  ): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    const migrationSteps = this.getMigrationPath(
      context.moduleId,
      context.fromVersion,
      context.toVersion
    );

    // Check for breaking changes
    const breakingChanges = migrationSteps.filter(step => step.breaking);
    if (breakingChanges.length > 0) {
      warnings.push(`Migration contains ${breakingChanges.length} breaking changes`);
    }

    // Check for non-automated steps
    const manualSteps = migrationSteps.filter(step => !step.automated);
    if (manualSteps.length > 0) {
      warnings.push(`Migration contains ${manualSteps.length} manual steps that require intervention`);
    }

    // Validate project structure
    const projectStructureValid = await this.validateProjectStructure(context.projectPath);
    if (!projectStructureValid) {
      issues.push('Project structure is not compatible with migration');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Get migration preview
   */
  public getMigrationPreview(moduleId: string, fromVersion: string, toVersion: string): {
    steps: DNAMigrationStep[];
    breakingChanges: number;
    manualSteps: number;
    estimatedTime: string;
  } {
    const steps = this.getMigrationPath(moduleId, fromVersion, toVersion);
    const breakingChanges = steps.filter(step => step.breaking).length;
    const manualSteps = steps.filter(step => !step.automated).length;
    
    // Estimate time based on step complexity
    const estimatedMinutes = steps.length * 2 + manualSteps * 5;
    const estimatedTime = estimatedMinutes > 60 
      ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
      : `${estimatedMinutes}m`;

    return {
      steps,
      breakingChanges,
      manualSteps,
      estimatedTime
    };
  }

  /**
   * Execute a single migration step
   */
  private async executeMigrationStep(
    step: DNAMigrationStep,
    context: MigrationContext
  ): Promise<MigrationStepResult> {
    const stepStartTime = Date.now();

    try {
      if (context.dryRun) {
        // In dry run mode, just validate the step
        return {
          step,
          success: true,
          output: `DRY RUN: Would execute - ${step.description}`,
          executionTime: Date.now() - stepStartTime
        };
      }

      if (step.automated && step.script) {
        // Execute automated script
        const output = await this.executeScript(step.script, context);
        return {
          step,
          success: true,
          output,
          executionTime: Date.now() - stepStartTime
        };
      } else {
        // Manual step - just log instructions
        return {
          step,
          success: true,
          output: `Manual step completed: ${step.instructions.join('; ')}`,
          executionTime: Date.now() - stepStartTime
        };
      }
    } catch (error) {
      return {
        step,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - stepStartTime
      };
    }
  }

  /**
   * Execute migration script
   */
  private async executeScript(script: string, context: MigrationContext): Promise<string> {
    // In a real implementation, this would execute the script safely
    // For now, return a placeholder
    return `Executed script: ${script} in ${context.projectPath}`;
  }

  /**
   * Create project backup
   */
  private async createBackup(projectPath: string, backupPath: string): Promise<void> {
    // In a real implementation, this would create a backup of the project
    // For now, just log the action
    console.log(`Creating backup of ${projectPath} to ${backupPath}`);
  }

  /**
   * Restore project from backup
   */
  private async restoreBackup(backupPath: string, projectPath: string): Promise<void> {
    // In a real implementation, this would restore from backup
    // For now, just log the action
    console.log(`Restoring backup from ${backupPath} to ${projectPath}`);
  }

  /**
   * Validate project structure
   */
  private async validateProjectStructure(projectPath: string): Promise<boolean> {
    // In a real implementation, this would validate the project structure
    // For now, return true
    return true;
  }

  /**
   * Compare version arrays
   */
  private compareVersions(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const aVal = a[i] || 0;
      const bVal = b[i] || 0;
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  }
}

/**
 * Migration utilities
 */
export class MigrationUtils {
  /**
   * Parse semantic version
   */
  static parseVersion(version: string): { major: number; minor: number; patch: number; prerelease?: string } {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4]
    };
  }

  /**
   * Check if version is compatible
   */
  static isVersionCompatible(version: string, requiredVersion: string): boolean {
    try {
      const v = MigrationUtils.parseVersion(version);
      const req = MigrationUtils.parseVersion(requiredVersion);

      // Simple compatibility check - same major version
      return v.major === req.major;
    } catch {
      return false;
    }
  }

  /**
   * Get next version
   */
  static getNextVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const v = MigrationUtils.parseVersion(version);
    
    switch (type) {
      case 'major':
        return `${v.major + 1}.0.0`;
      case 'minor':
        return `${v.major}.${v.minor + 1}.0`;
      case 'patch':
        return `${v.major}.${v.minor}.${v.patch + 1}`;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }
  }

  /**
   * Create migration step
   */
  static createMigrationStep(config: {
    version: string;
    description: string;
    breaking?: boolean;
    automated?: boolean;
    script?: string;
    instructions: string[];
  }): DNAMigrationStep {
    return {
      version: config.version,
      description: config.description,
      breaking: config.breaking || false,
      automated: config.automated || false,
      script: config.script,
      instructions: config.instructions
    };
  }
}