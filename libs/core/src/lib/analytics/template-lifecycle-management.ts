import { EventEmitter } from 'events';
import { TemplateDefinition } from '../types/template.types';
import { UsageAnalytics, UsageMetrics } from './usage-analytics';
import { BreakingChangeManagement, BreakingChange } from './breaking-change-management';

export interface LifecycleStage {
  name: 'development' | 'alpha' | 'beta' | 'stable' | 'mature' | 'maintenance' | 'deprecated' | 'sunset';
  description: string;
  duration: {
    min: number; // days
    max: number; // days
    typical: number; // days
  };
  criteria: {
    entry: string[];
    exit: string[];
  };
  supportLevel: {
    features: boolean;
    bugFixes: boolean;
    security: boolean;
    documentation: boolean;
  };
  restrictions: string[];
}

export interface TemplateLifecycle {
  templateId: string;
  currentStage: LifecycleStage['name'];
  version: string;
  stageHistory: {
    stage: LifecycleStage['name'];
    enteredDate: Date;
    exitedDate?: Date;
    duration?: number; // days
    reason: string;
    metrics?: Record<string, any>;
  }[];
  nextStageRecommendation?: {
    stage: LifecycleStage['name'];
    estimatedDate: Date;
    confidence: number;
    reasoning: string[];
  };
  sunsetPlan?: SunsetPlan;
  healthScore: {
    overall: number; // 0-100
    usage: number;
    community: number;
    technical: number;
    business: number;
    lastUpdated: Date;
  };
  risks: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  };
  stakeholders: {
    owner: string;
    maintainers: string[];
    communityLeads: string[];
    businessContacts: string[];
  };
  lastAssessment: Date;
}

export interface SunsetPlan {
  id: string;
  templateId: string;
  version: string;
  status: 'proposed' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  reason: 'low-usage' | 'superseded' | 'security' | 'business-decision' | 'technical-debt';
  timeline: {
    announcementDate: Date;
    deprecationDate: Date;
    supportEndDate: Date;
    removalDate: Date;
  };
  impact: {
    affectedUsers: number;
    businessCritical: boolean;
    migrationComplexity: 'simple' | 'medium' | 'complex';
    estimatedMigrationTime: number; // hours
  };
  migrationPath: {
    recommendedAlternatives: string[];
    automatedMigrationAvailable: boolean;
    migrationGuideUrl?: string;
    supportContactId?: string;
  };
  communicationPlan: {
    channels: string[];
    frequency: 'weekly' | 'bi-weekly' | 'monthly';
    keyMessages: string[];
    faqUrl?: string;
  };
  rollbackPlan?: {
    conditions: string[];
    steps: string[];
    deadline: Date;
  };
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleMetrics {
  templateId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    totalGenerations: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    errorRate: number;
    abandonmentRate: number;
  };
  community: {
    feedbackCount: number;
    averageRating: number;
    contributorCount: number;
    issueCount: number;
    forksCount: number;
  };
  technical: {
    codeQuality: number; // 0-100
    testCoverage: number; // 0-100
    dependencyHealth: number; // 0-100
    securityScore: number; // 0-100
    performanceScore: number; // 0-100
  };
  business: {
    strategicImportance: number; // 0-100
    revenueImpact: number; // 0-100
    competitiveAdvantage: number; // 0-100
    maintenanceCost: number; // 0-100 (inverted, lower is better)
  };
}

export interface LifecycleConfig {
  assessmentInterval: number; // milliseconds
  autoPromoteStages: boolean;
  requireApprovalForSunset: boolean;
  minUsageForStable: number;
  maxMaintenanceDuration: number; // days
  healthScoreThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export class TemplateLifecycleManagement extends EventEmitter {
  private config: LifecycleConfig;
  private analytics: UsageAnalytics;
  private breakingChangeManager: BreakingChangeManagement;
  private lifecycles: Map<string, TemplateLifecycle> = new Map();
  private sunsetPlans: Map<string, SunsetPlan> = new Map();
  private lifecycleStages: Map<LifecycleStage['name'], LifecycleStage>;
  private assessmentTimer?: NodeJS.Timeout;

  constructor(
    analytics: UsageAnalytics,
    breakingChangeManager: BreakingChangeManagement,
    config: Partial<LifecycleConfig> = {}
  ) {
    super();
    
    this.analytics = analytics;
    this.breakingChangeManager = breakingChangeManager;
    this.config = {
      assessmentInterval: 7 * 24 * 60 * 60 * 1000, // Weekly
      autoPromoteStages: true,
      requireApprovalForSunset: true,
      minUsageForStable: 100,
      maxMaintenanceDuration: 365, // 1 year
      healthScoreThresholds: {
        excellent: 85,
        good: 70,
        fair: 50,
        poor: 30
      },
      ...config
    };

    this.lifecycleStages = this.initializeLifecycleStages();
    
    if (this.config.assessmentInterval > 0) {
      this.startAssessmentTimer();
    }
  }

  /**
   * Initialize a template lifecycle
   */
  initializeTemplateLifecycle(
    template: TemplateDefinition,
    initialStage: LifecycleStage['name'] = 'development',
    stakeholders: TemplateLifecycle['stakeholders']
  ): TemplateLifecycle {
    const lifecycle: TemplateLifecycle = {
      templateId: template.id,
      currentStage: initialStage,
      version: template.version || '1.0.0',
      stageHistory: [{
        stage: initialStage,
        enteredDate: new Date(),
        reason: 'Initial template creation'
      }],
      healthScore: {
        overall: 0,
        usage: 0,
        community: 0,
        technical: 0,
        business: 0,
        lastUpdated: new Date()
      },
      risks: {
        level: 'low',
        factors: [],
        mitigations: []
      },
      stakeholders,
      lastAssessment: new Date()
    };

    this.lifecycles.set(template.id, lifecycle);

    this.emit('lifecycle:initialized', {
      templateId: template.id,
      stage: initialStage,
      version: template.version
    });

    return lifecycle;
  }

  /**
   * Assess template lifecycle and recommend next stage
   */
  async assessTemplateLifecycle(templateId: string): Promise<TemplateLifecycle> {
    const lifecycle = this.lifecycles.get(templateId);
    if (!lifecycle) {
      throw new Error(`Template lifecycle not found: ${templateId}`);
    }

    // Gather metrics for assessment
    const metrics = await this.gatherLifecycleMetrics(templateId);
    const healthScore = this.calculateHealthScore(metrics);
    const risks = this.assessRisks(templateId, metrics);
    const nextStageRecommendation = this.recommendNextStage(lifecycle, metrics);

    // Update lifecycle
    lifecycle.healthScore = healthScore;
    lifecycle.risks = risks;
    lifecycle.nextStageRecommendation = nextStageRecommendation;
    lifecycle.lastAssessment = new Date();

    this.emit('lifecycle:assessed', {
      templateId,
      currentStage: lifecycle.currentStage,
      healthScore: healthScore.overall,
      recommendation: nextStageRecommendation?.stage
    });

    // Auto-promote if enabled and criteria met
    if (this.config.autoPromoteStages && nextStageRecommendation) {
      const canAutoPromote = this.canAutoPromote(
        lifecycle.currentStage,
        nextStageRecommendation.stage,
        nextStageRecommendation.confidence
      );

      if (canAutoPromote) {
        await this.promoteToStage(templateId, nextStageRecommendation.stage, 'Automatic promotion based on assessment');
      }
    }

    // Check if sunset should be considered
    if (this.shouldConsiderSunset(lifecycle, metrics)) {
      await this.proposeSunsetPlan(templateId, this.determineSunsetReason(metrics));
    }

    return lifecycle;
  }

  /**
   * Promote template to next lifecycle stage
   */
  async promoteToStage(
    templateId: string,
    targetStage: LifecycleStage['name'],
    reason: string
  ): Promise<boolean> {
    const lifecycle = this.lifecycles.get(templateId);
    if (!lifecycle) {
      throw new Error(`Template lifecycle not found: ${templateId}`);
    }

    const currentStageInfo = this.lifecycleStages.get(lifecycle.currentStage);
    const targetStageInfo = this.lifecycleStages.get(targetStage);
    
    if (!currentStageInfo || !targetStageInfo) {
      throw new Error('Invalid lifecycle stage');
    }

    // Validate promotion criteria
    const canPromote = await this.validatePromotionCriteria(templateId, targetStage);
    if (!canPromote.allowed) {
      this.emit('lifecycle:promotion-failed', {
        templateId,
        targetStage,
        reason: canPromote.reason
      });
      return false;
    }

    // Update current stage history
    const currentStageEntry = lifecycle.stageHistory[lifecycle.stageHistory.length - 1];
    currentStageEntry.exitedDate = new Date();
    currentStageEntry.duration = Math.ceil(
      (currentStageEntry.exitedDate.getTime() - currentStageEntry.enteredDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Add new stage entry
    lifecycle.stageHistory.push({
      stage: targetStage,
      enteredDate: new Date(),
      reason
    });

    lifecycle.currentStage = targetStage;

    this.emit('lifecycle:promoted', {
      templateId,
      fromStage: currentStageEntry.stage,
      toStage: targetStage,
      reason
    });

    return true;
  }

  /**
   * Propose sunset plan for a template
   */
  async proposeSunsetPlan(
    templateId: string,
    reason: SunsetPlan['reason']
  ): Promise<SunsetPlan> {
    const lifecycle = this.lifecycles.get(templateId);
    if (!lifecycle) {
      throw new Error(`Template lifecycle not found: ${templateId}`);
    }

    const metrics = await this.gatherLifecycleMetrics(templateId);
    const timeline = this.calculateSunsetTimeline(reason, metrics);
    const impact = this.assessSunsetImpact(templateId, metrics);
    const migrationPath = this.generateMigrationPath(templateId, reason);
    const communicationPlan = this.generateCommunicationPlan(impact, timeline);

    const sunsetPlan: SunsetPlan = {
      id: `sunset-${templateId}-${Date.now()}`,
      templateId,
      version: lifecycle.version,
      status: this.config.requireApprovalForSunset ? 'proposed' : 'approved',
      reason,
      timeline,
      impact,
      migrationPath,
      communicationPlan,
      rollbackPlan: this.generateRollbackPlan(templateId, timeline),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sunsetPlans.set(sunsetPlan.id, sunsetPlan);
    lifecycle.sunsetPlan = sunsetPlan;

    this.emit('sunset:proposed', {
      planId: sunsetPlan.id,
      templateId,
      reason,
      announcementDate: timeline.announcementDate
    });

    return sunsetPlan;
  }

  /**
   * Execute sunset plan
   */
  async executeSunsetPlan(planId: string): Promise<{
    success: boolean;
    completedPhases: string[];
    errors: string[];
  }> {
    const plan = this.sunsetPlans.get(planId);
    if (!plan) {
      throw new Error(`Sunset plan not found: ${planId}`);
    }

    const now = new Date();
    const completedPhases: string[] = [];
    const errors: string[] = [];

    plan.status = 'in-progress';

    this.emit('sunset:started', {
      planId,
      templateId: plan.templateId
    });

    try {
      // Announcement phase
      if (now >= plan.timeline.announcementDate) {
        await this.executeSunsetPhase('announcement', plan);
        completedPhases.push('announcement');
      }

      // Deprecation phase
      if (now >= plan.timeline.deprecationDate) {
        await this.executeSunsetPhase('deprecation', plan);
        completedPhases.push('deprecation');
      }

      // Support end phase
      if (now >= plan.timeline.supportEndDate) {
        await this.executeSunsetPhase('support-end', plan);
        completedPhases.push('support-end');
      }

      // Removal phase
      if (now >= plan.timeline.removalDate) {
        await this.executeSunsetPhase('removal', plan);
        completedPhases.push('removal');
        plan.status = 'completed';
      }

      this.emit('sunset:completed', {
        planId,
        templateId: plan.templateId,
        completedPhases
      });

      return {
        success: true,
        completedPhases,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      this.emit('sunset:error', {
        planId,
        templateId: plan.templateId,
        error: errorMessage
      });

      return {
        success: false,
        completedPhases,
        errors
      };
    }
  }

  /**
   * Get template lifecycle information
   */
  getTemplateLifecycle(templateId: string): TemplateLifecycle | null {
    return this.lifecycles.get(templateId) || null;
  }

  /**
   * Get all sunset plans
   */
  getSunsetPlans(): SunsetPlan[] {
    return Array.from(this.sunsetPlans.values());
  }

  /**
   * Get lifecycle summary across all templates
   */
  getLifecycleSummary(): {
    totalTemplates: number;
    stageDistribution: Record<string, number>;
    healthDistribution: Record<string, number>;
    riskDistribution: Record<string, number>;
    sunsetPlans: {
      total: number;
      byStatus: Record<string, number>;
      byReason: Record<string, number>;
    };
    upcomingMilestones: Array<{
      templateId: string;
      milestone: string;
      date: Date;
      type: 'promotion' | 'sunset';
    }>;
  } {
    const stageDistribution: Record<string, number> = {};
    const healthDistribution: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {};
    const upcomingMilestones: any[] = [];

    // Analyze lifecycles
    for (const lifecycle of this.lifecycles.values()) {
      // Stage distribution
      stageDistribution[lifecycle.currentStage] = (stageDistribution[lifecycle.currentStage] || 0) + 1;

      // Health distribution
      const healthCategory = this.categorizeHealthScore(lifecycle.healthScore.overall);
      healthDistribution[healthCategory] = (healthDistribution[healthCategory] || 0) + 1;

      // Risk distribution
      riskDistribution[lifecycle.risks.level] = (riskDistribution[lifecycle.risks.level] || 0) + 1;

      // Upcoming milestones
      if (lifecycle.nextStageRecommendation) {
        upcomingMilestones.push({
          templateId: lifecycle.templateId,
          milestone: `Promotion to ${lifecycle.nextStageRecommendation.stage}`,
          date: lifecycle.nextStageRecommendation.estimatedDate,
          type: 'promotion'
        });
      }

      if (lifecycle.sunsetPlan) {
        upcomingMilestones.push({
          templateId: lifecycle.templateId,
          milestone: 'Sunset announcement',
          date: lifecycle.sunsetPlan.timeline.announcementDate,
          type: 'sunset'
        });
      }
    }

    // Analyze sunset plans
    const sunsetPlansByStatus: Record<string, number> = {};
    const sunsetPlansByReason: Record<string, number> = {};

    for (const plan of this.sunsetPlans.values()) {
      sunsetPlansByStatus[plan.status] = (sunsetPlansByStatus[plan.status] || 0) + 1;
      sunsetPlansByReason[plan.reason] = (sunsetPlansByReason[plan.reason] || 0) + 1;
    }

    // Sort milestones by date
    upcomingMilestones.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      totalTemplates: this.lifecycles.size,
      stageDistribution,
      healthDistribution,
      riskDistribution,
      sunsetPlans: {
        total: this.sunsetPlans.size,
        byStatus: sunsetPlansByStatus,
        byReason: sunsetPlansByReason
      },
      upcomingMilestones: upcomingMilestones.slice(0, 10) // Top 10
    };
  }

  /**
   * Initialize lifecycle stages configuration
   */
  private initializeLifecycleStages(): Map<LifecycleStage['name'], LifecycleStage> {
    const stages = new Map<LifecycleStage['name'], LifecycleStage>();

    stages.set('development', {
      name: 'development',
      description: 'Template is in active development, not ready for production use',
      duration: { min: 7, max: 90, typical: 30 },
      criteria: {
        entry: ['Template created', 'Initial implementation started'],
        exit: ['Core functionality complete', 'Basic tests passing', 'Alpha release criteria met']
      },
      supportLevel: { features: true, bugFixes: true, security: true, documentation: false },
      restrictions: ['Not recommended for production', 'API may change without notice']
    });

    stages.set('alpha', {
      name: 'alpha',
      description: 'Early testing phase with limited feature set',
      duration: { min: 14, max: 60, typical: 30 },
      criteria: {
        entry: ['Core functionality complete', 'Basic tests passing'],
        exit: ['Feature complete', 'Alpha testing feedback incorporated', 'Beta release criteria met']
      },
      supportLevel: { features: true, bugFixes: true, security: true, documentation: true },
      restrictions: ['Limited production use', 'Breaking changes possible']
    });

    stages.set('beta', {
      name: 'beta',
      description: 'Feature complete, undergoing final testing',
      duration: { min: 14, max: 45, typical: 21 },
      criteria: {
        entry: ['Feature complete', 'Alpha feedback incorporated'],
        exit: ['Beta testing complete', 'Performance validated', 'Documentation complete']
      },
      supportLevel: { features: false, bugFixes: true, security: true, documentation: true },
      restrictions: ['Use with caution in production', 'Minor breaking changes possible']
    });

    stages.set('stable', {
      name: 'stable',
      description: 'Production ready with full feature set',
      duration: { min: 180, max: 730, typical: 365 },
      criteria: {
        entry: ['Beta testing complete', 'Production validation', 'High usage adoption'],
        exit: ['Feature development slowing', 'Mature functionality', 'Maintenance mode recommended']
      },
      supportLevel: { features: true, bugFixes: true, security: true, documentation: true },
      restrictions: ['No breaking changes without major version']
    });

    stages.set('mature', {
      name: 'mature',
      description: 'Established template with proven track record',
      duration: { min: 365, max: 1095, typical: 730 },
      criteria: {
        entry: ['Widespread adoption', 'Stable usage patterns', 'Well-established ecosystem'],
        exit: ['Usage declining', 'Superseded by newer alternatives', 'Technology obsolescence']
      },
      supportLevel: { features: false, bugFixes: true, security: true, documentation: true },
      restrictions: ['Focus on stability over new features']
    });

    stages.set('maintenance', {
      name: 'maintenance',
      description: 'Limited support, security fixes only',
      duration: { min: 90, max: 365, typical: 180 },
      criteria: {
        entry: ['Reduced usage', 'No active development', 'Superseded by alternatives'],
        exit: ['Security concerns', 'Zero usage', 'Business decision to sunset']
      },
      supportLevel: { features: false, bugFixes: false, security: true, documentation: false },
      restrictions: ['Security fixes only', 'No new features', 'Migration recommended']
    });

    stages.set('deprecated', {
      name: 'deprecated',
      description: 'Marked for removal, migration required',
      duration: { min: 30, max: 180, typical: 90 },
      criteria: {
        entry: ['Sunset plan approved', 'Migration path available'],
        exit: ['Migration period complete', 'Sunset date reached']
      },
      supportLevel: { features: false, bugFixes: false, security: true, documentation: false },
      restrictions: ['Do not use for new projects', 'Migrate existing usage']
    });

    stages.set('sunset', {
      name: 'sunset',
      description: 'Template removed from active distribution',
      duration: { min: 0, max: 0, typical: 0 },
      criteria: {
        entry: ['Deprecation period complete', 'All users migrated'],
        exit: ['Template archived permanently']
      },
      supportLevel: { features: false, bugFixes: false, security: false, documentation: false },
      restrictions: ['Template no longer available', 'Historical reference only']
    });

    return stages;
  }

  /**
   * Gather comprehensive lifecycle metrics
   */
  private async gatherLifecycleMetrics(templateId: string): Promise<LifecycleMetrics> {
    const usageMetrics = this.analytics.getMetrics();
    const breakingChanges = this.breakingChangeManager.getBreakingChanges(templateId);
    
    // This would integrate with various systems to gather metrics
    return {
      templateId,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      },
      usage: {
        totalGenerations: usageMetrics.templateUsage.get(templateId) || 0,
        uniqueUsers: usageMetrics.userSessions,
        averageSessionDuration: usageMetrics.averageSessionDuration,
        errorRate: this.calculateErrorRate(templateId, usageMetrics),
        abandonmentRate: 0.1 // Would be calculated from analytics
      },
      community: {
        feedbackCount: 0, // Would come from feedback system
        averageRating: 4.0, // Would come from rating system
        contributorCount: 1, // Would come from version control
        issueCount: 0, // Would come from issue tracker
        forksCount: 0 // Would come from repository system
      },
      technical: {
        codeQuality: 85, // Would come from static analysis
        testCoverage: 80, // Would come from test runner
        dependencyHealth: 90, // Would come from dependency checker
        securityScore: 95, // Would come from security scanner
        performanceScore: 88 // Would come from performance monitoring
      },
      business: {
        strategicImportance: 70, // Would come from business stakeholders
        revenueImpact: 60, // Would come from business analysis
        competitiveAdvantage: 65, // Would come from market analysis
        maintenanceCost: 30 // Would come from cost tracking (inverted)
      }
    };
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: LifecycleMetrics): TemplateLifecycle['healthScore'] {
    const weights = {
      usage: 0.3,
      community: 0.2,
      technical: 0.3,
      business: 0.2
    };

    // Normalize usage metrics to 0-100 scale
    const usageScore = Math.min(100, (metrics.usage.totalGenerations / 100) * 100);
    const communityScore = (metrics.community.averageRating / 5) * 100;
    const technicalScore = (
      metrics.technical.codeQuality +
      metrics.technical.testCoverage +
      metrics.technical.dependencyHealth +
      metrics.technical.securityScore +
      metrics.technical.performanceScore
    ) / 5;
    const businessScore = (
      metrics.business.strategicImportance +
      metrics.business.revenueImpact +
      metrics.business.competitiveAdvantage +
      (100 - metrics.business.maintenanceCost) // Invert maintenance cost
    ) / 4;

    const overall = Math.round(
      usageScore * weights.usage +
      communityScore * weights.community +
      technicalScore * weights.technical +
      businessScore * weights.business
    );

    return {
      overall,
      usage: Math.round(usageScore),
      community: Math.round(communityScore),
      technical: Math.round(technicalScore),
      business: Math.round(businessScore),
      lastUpdated: new Date()
    };
  }

  /**
   * Assess risks for template
   */
  private assessRisks(templateId: string, metrics: LifecycleMetrics): TemplateLifecycle['risks'] {
    const factors: string[] = [];
    const mitigations: string[] = [];

    // Usage risks
    if (metrics.usage.totalGenerations < 10) {
      factors.push('Low usage adoption');
      mitigations.push('Improve documentation and marketing');
    }

    if (metrics.usage.errorRate > 0.1) {
      factors.push('High error rate');
      mitigations.push('Investigate and fix common errors');
    }

    // Technical risks
    if (metrics.technical.securityScore < 80) {
      factors.push('Security vulnerabilities');
      mitigations.push('Address security issues immediately');
    }

    if (metrics.technical.testCoverage < 70) {
      factors.push('Insufficient test coverage');
      mitigations.push('Increase test coverage to 80%+');
    }

    // Business risks
    if (metrics.business.maintenanceCost > 70) {
      factors.push('High maintenance cost');
      mitigations.push('Consider refactoring or sunset');
    }

    // Determine overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (factors.some(f => f.includes('Security'))) {
      riskLevel = 'critical';
    } else if (factors.length > 3) {
      riskLevel = 'high';
    } else if (factors.length > 1) {
      riskLevel = 'medium';
    }

    return {
      level: riskLevel,
      factors,
      mitigations
    };
  }

  /**
   * Recommend next lifecycle stage
   */
  private recommendNextStage(
    lifecycle: TemplateLifecycle,
    metrics: LifecycleMetrics
  ): TemplateLifecycle['nextStageRecommendation'] {
    const currentStage = this.lifecycleStages.get(lifecycle.currentStage);
    if (!currentStage) return undefined;

    const stageAge = this.calculateStageAge(lifecycle);
    const reasoning: string[] = [];

    // Determine next stage based on current stage and metrics
    let nextStage: LifecycleStage['name'] | null = null;
    let confidence = 0;

    switch (lifecycle.currentStage) {
      case 'development':
        if (metrics.technical.testCoverage > 60 && metrics.technical.codeQuality > 70) {
          nextStage = 'alpha';
          confidence = 0.8;
          reasoning.push('Core functionality complete with adequate testing');
        }
        break;

      case 'alpha':
        if (metrics.usage.totalGenerations > 10 && metrics.usage.errorRate < 0.2) {
          nextStage = 'beta';
          confidence = 0.7;
          reasoning.push('Alpha testing successful with user adoption');
        }
        break;

      case 'beta':
        if (metrics.usage.totalGenerations > 50 && metrics.technical.testCoverage > 80) {
          nextStage = 'stable';
          confidence = 0.9;
          reasoning.push('Beta validation complete with high quality');
        }
        break;

      case 'stable':
        if (stageAge > 365 && metrics.usage.totalGenerations > this.config.minUsageForStable) {
          nextStage = 'mature';
          confidence = 0.8;
          reasoning.push('Template has proven stability and adoption');
        }
        break;

      case 'mature':
        if (metrics.usage.totalGenerations < 50 || stageAge > 730) {
          nextStage = 'maintenance';
          confidence = 0.6;
          reasoning.push('Usage declining or technology aging');
        }
        break;

      case 'maintenance':
        if (metrics.usage.totalGenerations < 10 || stageAge > this.config.maxMaintenanceDuration) {
          nextStage = 'deprecated';
          confidence = 0.7;
          reasoning.push('Minimal usage warrants deprecation');
        }
        break;
    }

    if (!nextStage) return undefined;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 30); // Default 30 days

    return {
      stage: nextStage,
      estimatedDate,
      confidence,
      reasoning
    };
  }

  /**
   * Helper methods
   */
  private calculateStageAge(lifecycle: TemplateLifecycle): number {
    const currentStageEntry = lifecycle.stageHistory[lifecycle.stageHistory.length - 1];
    return Math.ceil(
      (Date.now() - currentStageEntry.enteredDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  private calculateErrorRate(templateId: string, metrics: UsageMetrics): number {
    const errorCount = metrics.errorRates.get(templateId) || 0;
    const totalUsage = metrics.templateUsage.get(templateId) || 0;
    return totalUsage > 0 ? errorCount / totalUsage : 0;
  }

  private categorizeHealthScore(score: number): string {
    if (score >= this.config.healthScoreThresholds.excellent) return 'excellent';
    if (score >= this.config.healthScoreThresholds.good) return 'good';
    if (score >= this.config.healthScoreThresholds.fair) return 'fair';
    return 'poor';
  }

  private canAutoPromote(
    currentStage: LifecycleStage['name'],
    targetStage: LifecycleStage['name'],
    confidence: number
  ): boolean {
    // Don't auto-promote to maintenance or beyond
    if (['maintenance', 'deprecated', 'sunset'].includes(targetStage)) {
      return false;
    }
    
    // Require high confidence for auto-promotion
    return confidence > 0.8;
  }

  private async validatePromotionCriteria(
    templateId: string,
    targetStage: LifecycleStage['name']
  ): Promise<{ allowed: boolean; reason: string }> {
    const targetStageInfo = this.lifecycleStages.get(targetStage);
    if (!targetStageInfo) {
      return { allowed: false, reason: 'Invalid target stage' };
    }

    // Check if all entry criteria are met
    // This would involve more complex validation in a real implementation
    return { allowed: true, reason: 'All criteria met' };
  }

  private shouldConsiderSunset(lifecycle: TemplateLifecycle, metrics: LifecycleMetrics): boolean {
    return (
      lifecycle.currentStage === 'maintenance' &&
      metrics.usage.totalGenerations < 5 &&
      !lifecycle.sunsetPlan
    );
  }

  private determineSunsetReason(metrics: LifecycleMetrics): SunsetPlan['reason'] {
    if (metrics.usage.totalGenerations < 5) return 'low-usage';
    if (metrics.technical.securityScore < 50) return 'security';
    if (metrics.business.maintenanceCost > 80) return 'technical-debt';
    return 'business-decision';
  }

  private calculateSunsetTimeline(
    reason: SunsetPlan['reason'],
    metrics: LifecycleMetrics
  ): SunsetPlan['timeline'] {
    const now = new Date();
    const urgency = this.calculateSunsetUrgency(reason, metrics);
    
    let announcementDays = 90;
    let deprecationDays = 30;
    let supportDays = 60;
    let removalDays = 30;

    if (urgency === 'high') {
      announcementDays = 30;
      deprecationDays = 14;
      supportDays = 30;
      removalDays = 14;
    }

    const announcementDate = new Date(now.getTime() + announcementDays * 24 * 60 * 60 * 1000);
    const deprecationDate = new Date(announcementDate.getTime() + deprecationDays * 24 * 60 * 60 * 1000);
    const supportEndDate = new Date(deprecationDate.getTime() + supportDays * 24 * 60 * 60 * 1000);
    const removalDate = new Date(supportEndDate.getTime() + removalDays * 24 * 60 * 60 * 1000);

    return {
      announcementDate,
      deprecationDate,
      supportEndDate,
      removalDate
    };
  }

  private calculateSunsetUrgency(reason: SunsetPlan['reason'], metrics: LifecycleMetrics): 'low' | 'high' {
    if (reason === 'security' && metrics.technical.securityScore < 30) return 'high';
    if (reason === 'low-usage' && metrics.usage.totalGenerations === 0) return 'high';
    return 'low';
  }

  private assessSunsetImpact(templateId: string, metrics: LifecycleMetrics): SunsetPlan['impact'] {
    return {
      affectedUsers: metrics.usage.uniqueUsers,
      businessCritical: metrics.business.strategicImportance > 80,
      migrationComplexity: metrics.technical.codeQuality > 70 ? 'simple' : 'complex',
      estimatedMigrationTime: metrics.usage.uniqueUsers * 2 // 2 hours per user estimate
    };
  }

  private generateMigrationPath(templateId: string, reason: SunsetPlan['reason']): SunsetPlan['migrationPath'] {
    return {
      recommendedAlternatives: ['modern-template-v2'], // Would be determined by analysis
      automatedMigrationAvailable: reason !== 'security',
      migrationGuideUrl: `https://docs.example.com/migration/${templateId}`,
      supportContactId: 'migration-support@example.com'
    };
  }

  private generateCommunicationPlan(
    impact: SunsetPlan['impact'],
    timeline: SunsetPlan['timeline']
  ): SunsetPlan['communicationPlan'] {
    return {
      channels: ['email', 'documentation', 'blog'],
      frequency: impact.businessCritical ? 'weekly' : 'monthly',
      keyMessages: [
        'Template sunset announcement',
        'Migration path and alternatives',
        'Support timeline and resources'
      ],
      faqUrl: 'https://docs.example.com/sunset-faq'
    };
  }

  private generateRollbackPlan(templateId: string, timeline: SunsetPlan['timeline']): SunsetPlan['rollbackPlan'] {
    return {
      conditions: [
        'Critical user impact discovered',
        'No viable migration path',
        'Business requirements change'
      ],
      steps: [
        'Halt sunset process',
        'Restore full support',
        'Communicate reversal to users'
      ],
      deadline: new Date(timeline.deprecationDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 week before deprecation
    };
  }

  private async executeSunsetPhase(phase: string, plan: SunsetPlan): Promise<void> {
    // Implementation would handle each phase of sunset process
    switch (phase) {
      case 'announcement':
        this.emit('sunset:announcement', { planId: plan.id, templateId: plan.templateId });
        break;
      case 'deprecation':
        this.emit('sunset:deprecated', { planId: plan.id, templateId: plan.templateId });
        break;
      case 'support-end':
        this.emit('sunset:support-ended', { planId: plan.id, templateId: plan.templateId });
        break;
      case 'removal':
        this.emit('sunset:removed', { planId: plan.id, templateId: plan.templateId });
        break;
    }
  }

  /**
   * Start assessment timer
   */
  private startAssessmentTimer(): void {
    this.assessmentTimer = setInterval(() => {
      this.runPeriodicAssessments();
    }, this.config.assessmentInterval);
  }

  /**
   * Run periodic assessments across all templates
   */
  private async runPeriodicAssessments(): Promise<void> {
    for (const templateId of this.lifecycles.keys()) {
      try {
        await this.assessTemplateLifecycle(templateId);
      } catch (error) {
        this.emit('assessment:error', {
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.emit('periodic-assessment:completed', {
      templatesAssessed: this.lifecycles.size,
      timestamp: new Date()
    });
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.assessmentTimer) {
      clearInterval(this.assessmentTimer);
    }
  }
}