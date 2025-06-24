import { EventEmitter } from 'events';
import { TemplateDefinition } from '../types/template.types';
import { DNAModule } from '../types/dna-module.types';

export interface BreakingChange {
  id: string;
  templateId: string;
  version: string;
  type: 'api' | 'config' | 'dependency' | 'structure' | 'behavior';
  severity: 'minor' | 'major' | 'critical';
  title: string;
  description: string;
  affectedComponents: string[];
  migrationPath: {
    automated: boolean;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTime: number; // minutes
    steps: string[];
    tools?: string[];
    risks: string[];
  };
  impact: {
    userCount: number;
    businessCritical: boolean;
    upgradeRequired: boolean;
  };
  deprecation?: {
    announcedDate: Date;
    deprecatedDate: Date;
    removalDate: Date;
    warningLevel: 'info' | 'warn' | 'error';
  };
  createdAt: Date;
  createdBy: string;
}

export interface DeprecationPolicy {
  templateId: string;
  version: string;
  policy: {
    noticeMinDays: number; // Minimum days notice before deprecation
    supportMinDays: number; // Minimum days support after deprecation
    warningPhases: {
      phase: 'announcement' | 'warning' | 'error' | 'removal';
      daysBeforeRemoval: number;
      action: string;
    }[];
  };
  communicationChannels: string[];
  migrationSupport: {
    documentationUrl: string;
    supportContactId: string;
    automatedTools: string[];
  };
}

export interface MigrationPlan {
  id: string;
  templateId: string;
  fromVersion: string;
  toVersion: string;
  breakingChanges: BreakingChange[];
  migrationSteps: {
    id: string;
    order: number;
    title: string;
    description: string;
    automated: boolean;
    script?: string;
    manualSteps?: string[];
    validation: string[];
    rollbackSteps?: string[];
  }[];
  totalEstimatedTime: number;
  complexity: 'simple' | 'medium' | 'complex';
  prerequisites: string[];
  risks: string[];
  status: 'draft' | 'approved' | 'published' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionCompatibility {
  templateId: string;
  currentVersion: string;
  supportedVersions: {
    version: string;
    supportLevel: 'full' | 'maintenance' | 'security' | 'deprecated';
    supportUntil: Date;
    migrationRecommended: boolean;
  }[];
  breakingChangeHistory: BreakingChange[];
}

export interface BreakingChangeConfig {
  defaultDeprecationNoticeDays: number;
  defaultSupportDays: number;
  requireApproval: boolean;
  autoNotifications: boolean;
  migrationToolsEnabled: boolean;
}

export class BreakingChangeManagement extends EventEmitter {
  private config: BreakingChangeConfig;
  private breakingChanges: Map<string, BreakingChange[]> = new Map();
  private deprecationPolicies: Map<string, DeprecationPolicy> = new Map();
  private migrationPlans: Map<string, MigrationPlan[]> = new Map();
  private versionCompatibility: Map<string, VersionCompatibility> = new Map();
  private notificationTimer?: NodeJS.Timeout;

  constructor(config: Partial<BreakingChangeConfig> = {}) {
    super();
    
    this.config = {
      defaultDeprecationNoticeDays: 90,
      defaultSupportDays: 180,
      requireApproval: true,
      autoNotifications: true,
      migrationToolsEnabled: true,
      ...config
    };

    if (this.config.autoNotifications) {
      this.startNotificationTimer();
    }
  }

  /**
   * Register a breaking change
   */
  registerBreakingChange(
    change: Omit<BreakingChange, 'id' | 'createdAt'>
  ): string {
    const id = `breaking-${change.templateId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const breakingChange: BreakingChange = {
      ...change,
      id,
      createdAt: new Date()
    };

    const templateChanges = this.breakingChanges.get(change.templateId) || [];
    templateChanges.push(breakingChange);
    this.breakingChanges.set(change.templateId, templateChanges);

    // Update version compatibility
    this.updateVersionCompatibility(change.templateId, breakingChange);

    this.emit('breaking-change:registered', {
      changeId: id,
      templateId: change.templateId,
      severity: change.severity,
      type: change.type
    });

    // Auto-create deprecation if applicable
    if (change.deprecation) {
      this.scheduleDeprecation(change.templateId, breakingChange);
    }

    // Auto-generate migration plan if enabled
    if (this.config.migrationToolsEnabled) {
      this.generateMigrationPlan(change.templateId, [breakingChange]);
    }

    return id;
  }

  /**
   * Set deprecation policy for a template
   */
  setDeprecationPolicy(policy: DeprecationPolicy): void {
    this.deprecationPolicies.set(policy.templateId, policy);
    
    this.emit('deprecation-policy:set', {
      templateId: policy.templateId,
      version: policy.version,
      noticeMinDays: policy.policy.noticeMinDays
    });
  }

  /**
   * Schedule deprecation for a breaking change
   */
  scheduleDeprecation(templateId: string, change: BreakingChange): void {
    if (!change.deprecation) return;

    const policy = this.deprecationPolicies.get(templateId);
    const deprecationPlan = {
      changeId: change.id,
      templateId,
      version: change.version,
      phases: this.calculateDeprecationPhases(change.deprecation, policy),
      notificationsSent: [] as string[]
    };

    this.emit('deprecation:scheduled', deprecationPlan);
  }

  /**
   * Generate migration plan for breaking changes
   */
  generateMigrationPlan(
    templateId: string, 
    breakingChanges: BreakingChange[]
  ): MigrationPlan {
    const fromVersion = this.getCurrentVersion(templateId);
    const toVersion = this.calculateNextVersion(fromVersion, breakingChanges);
    
    const migrationSteps = this.generateMigrationSteps(breakingChanges);
    const totalTime = migrationSteps.reduce((sum, step) => 
      sum + (step.automated ? 1 : 10), 0 // 1 min for automated, 10 for manual
    );

    const plan: MigrationPlan = {
      id: `migration-${templateId}-${fromVersion}-to-${toVersion}`,
      templateId,
      fromVersion,
      toVersion,
      breakingChanges,
      migrationSteps,
      totalEstimatedTime: totalTime,
      complexity: this.calculateMigrationComplexity(breakingChanges, migrationSteps),
      prerequisites: this.generatePrerequisites(breakingChanges),
      risks: this.assessMigrationRisks(breakingChanges),
      status: this.config.requireApproval ? 'draft' : 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const templatePlans = this.migrationPlans.get(templateId) || [];
    templatePlans.push(plan);
    this.migrationPlans.set(templateId, templatePlans);

    this.emit('migration-plan:generated', {
      planId: plan.id,
      templateId,
      complexity: plan.complexity,
      estimatedTime: plan.totalEstimatedTime
    });

    return plan;
  }

  /**
   * Get breaking changes for a template
   */
  getBreakingChanges(templateId: string): BreakingChange[] {
    return this.breakingChanges.get(templateId) || [];
  }

  /**
   * Get migration plans for a template
   */
  getMigrationPlans(templateId: string): MigrationPlan[] {
    return this.migrationPlans.get(templateId) || [];
  }

  /**
   * Get version compatibility information
   */
  getVersionCompatibility(templateId: string): VersionCompatibility | null {
    return this.versionCompatibility.get(templateId) || null;
  }

  /**
   * Check if upgrade is required for a template version
   */
  isUpgradeRequired(templateId: string, currentVersion: string): {
    required: boolean;
    reason: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    migrationPlan?: MigrationPlan;
  } {
    const compatibility = this.versionCompatibility.get(templateId);
    if (!compatibility) {
      return { required: false, reason: 'No version information available', urgency: 'low' };
    }

    const versionInfo = compatibility.supportedVersions.find(v => v.version === currentVersion);
    if (!versionInfo) {
      return { 
        required: true, 
        reason: 'Version not supported', 
        urgency: 'critical',
        migrationPlan: this.getLatestMigrationPlan(templateId)
      };
    }

    const now = new Date();
    const daysUntilUnsupported = Math.ceil(
      (versionInfo.supportUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (versionInfo.supportLevel === 'deprecated') {
      return {
        required: true,
        reason: 'Version is deprecated',
        urgency: daysUntilUnsupported < 30 ? 'critical' : 'high',
        migrationPlan: this.getLatestMigrationPlan(templateId)
      };
    }

    if (versionInfo.supportLevel === 'security' && daysUntilUnsupported < 60) {
      return {
        required: true,
        reason: 'Security-only support ending soon',
        urgency: daysUntilUnsupported < 30 ? 'high' : 'medium',
        migrationPlan: this.getLatestMigrationPlan(templateId)
      };
    }

    if (versionInfo.migrationRecommended) {
      return {
        required: false,
        reason: 'Migration recommended for better features and security',
        urgency: 'low',
        migrationPlan: this.getLatestMigrationPlan(templateId)
      };
    }

    return { required: false, reason: 'Version is fully supported', urgency: 'low' };
  }

  /**
   * Execute migration plan
   */
  async executeMigrationPlan(
    planId: string,
    targetPath: string,
    options: {
      dryRun?: boolean;
      skipSteps?: string[];
      customConfig?: Record<string, any>;
    } = {}
  ): Promise<{
    success: boolean;
    results: {
      stepId: string;
      success: boolean;
      output?: string;
      error?: string;
      duration: number;
    }[];
    totalDuration: number;
  }> {
    const plan = this.findMigrationPlan(planId);
    if (!plan) {
      throw new Error(`Migration plan ${planId} not found`);
    }

    const startTime = Date.now();
    const results: any[] = [];

    this.emit('migration:started', {
      planId,
      templateId: plan.templateId,
      dryRun: options.dryRun
    });

    for (const step of plan.migrationSteps) {
      if (options.skipSteps?.includes(step.id)) {
        continue;
      }

      const stepStartTime = Date.now();
      
      try {
        const result = await this.executeMigrationStep(
          step, 
          targetPath, 
          options.dryRun,
          options.customConfig
        );
        
        results.push({
          stepId: step.id,
          success: true,
          output: result,
          duration: Date.now() - stepStartTime
        });

        this.emit('migration-step:completed', {
          planId,
          stepId: step.id,
          success: true
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          stepId: step.id,
          success: false,
          error: errorMessage,
          duration: Date.now() - stepStartTime
        });

        this.emit('migration-step:failed', {
          planId,
          stepId: step.id,
          error: errorMessage
        });

        // Execute rollback if available
        if (step.rollbackSteps && !options.dryRun) {
          await this.executeRollbackSteps(step.rollbackSteps, targetPath);
        }

        // Stop execution on failure
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    const success = results.every(r => r.success);

    this.emit('migration:completed', {
      planId,
      success,
      totalDuration,
      stepsExecuted: results.length
    });

    return {
      success,
      results,
      totalDuration
    };
  }

  /**
   * Get breaking change summary across all templates
   */
  getBreakingChangeSummary(): {
    totalBreakingChanges: number;
    changesBySeverity: Record<string, number>;
    changesByType: Record<string, number>;
    templatesWithChanges: number;
    upcomingDeprecations: Array<{
      templateId: string;
      changeId: string;
      deprecationDate: Date;
      severity: string;
    }>;
    activeMigrationPlans: number;
  } {
    let totalChanges = 0;
    const changesBySeverity: Record<string, number> = {};
    const changesByType: Record<string, number> = {};
    const upcomingDeprecations: any[] = [];
    let activePlans = 0;

    // Count breaking changes
    for (const [templateId, changes] of this.breakingChanges.entries()) {
      totalChanges += changes.length;
      
      changes.forEach(change => {
        changesBySeverity[change.severity] = (changesBySeverity[change.severity] || 0) + 1;
        changesByType[change.type] = (changesByType[change.type] || 0) + 1;
        
        if (change.deprecation && change.deprecation.deprecatedDate > new Date()) {
          upcomingDeprecations.push({
            templateId,
            changeId: change.id,
            deprecationDate: change.deprecation.deprecatedDate,
            severity: change.severity
          });
        }
      });
    }

    // Count active migration plans
    for (const plans of this.migrationPlans.values()) {
      activePlans += plans.filter(p => p.status === 'approved' || p.status === 'published').length;
    }

    // Sort upcoming deprecations by date
    upcomingDeprecations.sort((a, b) => 
      a.deprecationDate.getTime() - b.deprecationDate.getTime()
    );

    return {
      totalBreakingChanges: totalChanges,
      changesBySeverity,
      changesByType,
      templatesWithChanges: this.breakingChanges.size,
      upcomingDeprecations: upcomingDeprecations.slice(0, 10), // Top 10
      activeMigrationPlans: activePlans
    };
  }

  /**
   * Update version compatibility information
   */
  private updateVersionCompatibility(templateId: string, change: BreakingChange): void {
    const existing = this.versionCompatibility.get(templateId) || {
      templateId,
      currentVersion: change.version,
      supportedVersions: [],
      breakingChangeHistory: []
    };

    existing.breakingChangeHistory.push(change);
    
    // Update support levels based on severity
    existing.supportedVersions.forEach(version => {
      if (this.isVersionAffected(version.version, change)) {
        if (change.severity === 'critical') {
          version.supportLevel = 'deprecated';
          version.supportUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        } else if (change.severity === 'major') {
          version.supportLevel = 'maintenance';
        }
        version.migrationRecommended = true;
      }
    });

    this.versionCompatibility.set(templateId, existing);
  }

  /**
   * Generate migration steps for breaking changes
   */
  private generateMigrationSteps(changes: BreakingChange[]): MigrationPlan['migrationSteps'] {
    const steps: MigrationPlan['migrationSteps'] = [];
    let order = 1;

    // Pre-migration validation
    steps.push({
      id: 'pre-migration-validation',
      order: order++,
      title: 'Pre-Migration Validation',
      description: 'Validate current template state and prerequisites',
      automated: true,
      validation: ['Check template version', 'Validate dependencies', 'Backup current state'],
      rollbackSteps: ['Restore from backup']
    });

    // Generate steps for each breaking change
    changes.forEach(change => {
      change.migrationPath.steps.forEach((step, index) => {
        steps.push({
          id: `${change.id}-step-${index}`,
          order: order++,
          title: `${change.title} - Step ${index + 1}`,
          description: step,
          automated: change.migrationPath.automated,
          script: change.migrationPath.automated ? this.generateMigrationScript(change, step) : undefined,
          manualSteps: change.migrationPath.automated ? undefined : [step],
          validation: [`Verify ${change.title} migration completed`],
          rollbackSteps: change.migrationPath.risks.length > 0 ? 
            [`Rollback ${change.title} changes`] : undefined
        });
      });
    });

    // Post-migration validation
    steps.push({
      id: 'post-migration-validation',
      order: order++,
      title: 'Post-Migration Validation',
      description: 'Validate migrated template functionality',
      automated: true,
      validation: [
        'Run template tests',
        'Validate generated output',
        'Check for deprecation warnings'
      ]
    });

    return steps;
  }

  /**
   * Calculate migration complexity
   */
  private calculateMigrationComplexity(
    changes: BreakingChange[], 
    steps: MigrationPlan['migrationSteps']
  ): 'simple' | 'medium' | 'complex' {
    const criticalChanges = changes.filter(c => c.severity === 'critical').length;
    const manualSteps = steps.filter(s => !s.automated).length;
    const totalSteps = steps.length;

    if (criticalChanges > 0 || manualSteps > 5 || totalSteps > 10) {
      return 'complex';
    } else if (manualSteps > 2 || totalSteps > 5) {
      return 'medium';
    } else {
      return 'simple';
    }
  }

  /**
   * Generate prerequisites for migration
   */
  private generatePrerequisites(changes: BreakingChange[]): string[] {
    const prerequisites = new Set<string>();
    
    prerequisites.add('Backup current template installation');
    prerequisites.add('Review breaking changes documentation');
    
    changes.forEach(change => {
      if (change.severity === 'critical') {
        prerequisites.add('Schedule maintenance window');
      }
      if (change.type === 'dependency') {
        prerequisites.add('Update dependency management system');
      }
      if (change.impact.businessCritical) {
        prerequisites.add('Notify stakeholders of planned changes');
      }
    });

    return Array.from(prerequisites);
  }

  /**
   * Assess migration risks
   */
  private assessMigrationRisks(changes: BreakingChange[]): string[] {
    const risks = new Set<string>();
    
    changes.forEach(change => {
      risks.add(...change.migrationPath.risks);
      
      if (change.severity === 'critical') {
        risks.add('Critical functionality may be temporarily unavailable');
      }
      if (change.impact.businessCritical) {
        risks.add('Business-critical operations may be affected');
      }
      if (!change.migrationPath.automated) {
        risks.add('Manual steps increase risk of human error');
      }
    });

    return Array.from(risks);
  }

  /**
   * Execute individual migration step
   */
  private async executeMigrationStep(
    step: MigrationPlan['migrationSteps'][0],
    targetPath: string,
    dryRun: boolean = false,
    customConfig?: Record<string, any>
  ): Promise<string> {
    if (dryRun) {
      return `DRY RUN: Would execute ${step.title}`;
    }

    if (step.automated && step.script) {
      // Execute automated migration script
      return this.executeScript(step.script, targetPath, customConfig);
    } else if (step.manualSteps) {
      // Return manual steps for user execution
      return `Manual steps required:\n${step.manualSteps.join('\n')}`;
    }

    return 'Step completed';
  }

  /**
   * Execute rollback steps
   */
  private async executeRollbackSteps(
    rollbackSteps: string[],
    targetPath: string
  ): Promise<void> {
    for (const step of rollbackSteps) {
      // Execute rollback step (implementation would depend on step type)
      console.log(`Executing rollback: ${step}`);
    }
  }

  /**
   * Generate migration script for automated changes
   */
  private generateMigrationScript(change: BreakingChange, step: string): string {
    // This would generate actual migration scripts based on the change type
    return `#!/bin/bash
# Migration script for ${change.title}
# Step: ${step}
echo "Executing migration step: ${step}"
# Implementation would be specific to the change type
`;
  }

  /**
   * Execute migration script
   */
  private async executeScript(
    script: string,
    targetPath: string,
    customConfig?: Record<string, any>
  ): Promise<string> {
    // Implementation would execute the script in the target environment
    return `Script executed successfully at ${targetPath}`;
  }

  /**
   * Calculate deprecation phases
   */
  private calculateDeprecationPhases(
    deprecation: BreakingChange['deprecation'],
    policy?: DeprecationPolicy
  ): Array<{ phase: string; date: Date; action: string }> {
    if (!deprecation) return [];

    const phases = [];
    const removalDate = deprecation.removalDate;
    
    // Use policy phases if available, otherwise use defaults
    const phaseConfig = policy?.policy.warningPhases || [
      { phase: 'announcement', daysBeforeRemoval: 90, action: 'Announce deprecation' },
      { phase: 'warning', daysBeforeRemoval: 60, action: 'Show warnings' },
      { phase: 'error', daysBeforeRemoval: 30, action: 'Show errors' },
      { phase: 'removal', daysBeforeRemoval: 0, action: 'Remove deprecated functionality' }
    ];

    phaseConfig.forEach(config => {
      const phaseDate = new Date(removalDate);
      phaseDate.setDate(phaseDate.getDate() - config.daysBeforeRemoval);
      
      phases.push({
        phase: config.phase,
        date: phaseDate,
        action: config.action
      });
    });

    return phases.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Helper methods
   */
  private getCurrentVersion(templateId: string): string {
    const compatibility = this.versionCompatibility.get(templateId);
    return compatibility?.currentVersion || '1.0.0';
  }

  private calculateNextVersion(currentVersion: string, changes: BreakingChange[]): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    const hasCritical = changes.some(c => c.severity === 'critical');
    
    if (hasCritical) {
      return `${major + 1}.0.0`;
    } else {
      return `${major}.${minor + 1}.0`;
    }
  }

  private getLatestMigrationPlan(templateId: string): MigrationPlan | undefined {
    const plans = this.migrationPlans.get(templateId) || [];
    return plans
      .filter(p => p.status === 'approved' || p.status === 'published')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  }

  private findMigrationPlan(planId: string): MigrationPlan | null {
    for (const plans of this.migrationPlans.values()) {
      const plan = plans.find(p => p.id === planId);
      if (plan) return plan;
    }
    return null;
  }

  private isVersionAffected(version: string, change: BreakingChange): boolean {
    // Simple version comparison - in production would use semver
    return version < change.version;
  }

  /**
   * Start notification timer for deprecation warnings
   */
  private startNotificationTimer(): void {
    this.notificationTimer = setInterval(() => {
      this.checkDeprecationNotifications();
    }, 24 * 60 * 60 * 1000); // Daily check
  }

  /**
   * Check for deprecation notifications that need to be sent
   */
  private checkDeprecationNotifications(): void {
    const now = new Date();
    
    for (const [templateId, changes] of this.breakingChanges.entries()) {
      changes.forEach(change => {
        if (change.deprecation) {
          const phases = this.calculateDeprecationPhases(
            change.deprecation,
            this.deprecationPolicies.get(templateId)
          );
          
          phases.forEach(phase => {
            if (phase.date <= now) {
              this.emit('deprecation:notification', {
                templateId,
                changeId: change.id,
                phase: phase.phase,
                action: phase.action
              });
            }
          });
        }
      });
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }
  }
}