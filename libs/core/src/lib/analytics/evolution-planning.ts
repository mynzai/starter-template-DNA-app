import { EventEmitter } from 'events';
import { UsageAnalytics, UsageMetrics } from './usage-analytics';
import { TemplateDefinition } from '../types/template.types';
import { DNAModule } from '../types/dna-module.types';

export interface CommunityFeedback {
  id: string;
  templateId: string;
  userId: string;
  rating: number; // 1-5 scale
  category: 'bug' | 'feature' | 'improvement' | 'documentation' | 'performance';
  title: string;
  description: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  votes: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface EvolutionInsight {
  id: string;
  type: 'usage-pattern' | 'performance-issue' | 'feature-gap' | 'community-request';
  templateId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1 scale
  title: string;
  description: string;
  impact: {
    users: number;
    frequency: number;
    businessValue: number;
  };
  suggestedActions: string[];
  evidence: {
    metrics?: Record<string, any>;
    feedback?: CommunityFeedback[];
    usage?: Record<string, any>;
  };
  timestamp: Date;
}

export interface EvolutionPlan {
  id: string;
  templateId: string;
  version: string;
  targetVersion: string;
  plannedReleaseDate: Date;
  status: 'draft' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  insights: EvolutionInsight[];
  plannedChanges: {
    features: string[];
    improvements: string[];
    bugFixes: string[];
    breaking: string[];
  };
  effort: {
    estimated: number; // hours
    complexity: 'low' | 'medium' | 'high';
    risks: string[];
  };
  stakeholders: string[];
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvolutionConfig {
  analysisInterval: number; // milliseconds
  feedbackWeightThreshold: number;
  usageThreshold: number;
  confidenceThreshold: number;
  autoGeneratePlans: boolean;
  requireApproval: boolean;
}

export class EvolutionPlanning extends EventEmitter {
  private config: EvolutionConfig;
  private analytics: UsageAnalytics;
  private feedbackStore: Map<string, CommunityFeedback[]> = new Map();
  private insights: Map<string, EvolutionInsight[]> = new Map();
  private plans: Map<string, EvolutionPlan[]> = new Map();
  private analysisTimer: NodeJS.Timeout | null = null;

  constructor(analytics: UsageAnalytics, config: Partial<EvolutionConfig> = {}) {
    super();
    
    this.analytics = analytics;
    this.config = {
      analysisInterval: 24 * 60 * 60 * 1000, // 24 hours
      feedbackWeightThreshold: 10,
      usageThreshold: 100,
      confidenceThreshold: 0.7,
      autoGeneratePlans: true,
      requireApproval: true,
      ...config
    };

    if (this.config.autoGeneratePlans) {
      this.startAnalysisTimer();
    }
  }

  /**
   * Submit community feedback for a template
   */
  submitFeedback(feedback: Omit<CommunityFeedback, 'id' | 'timestamp'>): string {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const completeFeedback: CommunityFeedback = {
      ...feedback,
      id,
      timestamp: new Date()
    };

    const templateFeedback = this.feedbackStore.get(feedback.templateId) || [];
    templateFeedback.push(completeFeedback);
    this.feedbackStore.set(feedback.templateId, templateFeedback);

    this.emit('feedback:submitted', {
      feedbackId: id,
      templateId: feedback.templateId,
      category: feedback.category,
      priority: feedback.priority
    });

    // Trigger analysis if high-priority feedback
    if (feedback.priority === 'critical' || feedback.priority === 'high') {
      this.analyzeTemplate(feedback.templateId);
    }

    return id;
  }

  /**
   * Analyze template evolution needs
   */
  async analyzeTemplate(templateId: string): Promise<EvolutionInsight[]> {
    const metrics = this.analytics.getMetrics();
    const feedback = this.feedbackStore.get(templateId) || [];
    
    const insights: EvolutionInsight[] = [];

    // Analyze usage patterns
    const usageInsights = this.analyzeUsagePatterns(templateId, metrics);
    insights.push(...usageInsights);

    // Analyze performance issues
    const performanceInsights = this.analyzePerformanceIssues(templateId, metrics);
    insights.push(...performanceInsights);

    // Analyze community feedback
    const feedbackInsights = this.analyzeCommunityFeedback(templateId, feedback);
    insights.push(...feedbackInsights);

    // Analyze feature gaps
    const gapInsights = this.analyzeFeatureGaps(templateId, metrics, feedback);
    insights.push(...gapInsights);

    // Filter by confidence threshold
    const filteredInsights = insights.filter(
      insight => insight.confidence >= this.config.confidenceThreshold
    );

    // Store insights
    this.insights.set(templateId, filteredInsights);

    this.emit('analysis:completed', {
      templateId,
      insightsCount: filteredInsights.length,
      timestamp: new Date()
    });

    // Auto-generate evolution plan if enabled
    if (this.config.autoGeneratePlans && filteredInsights.length > 0) {
      await this.generateEvolutionPlan(templateId, filteredInsights);
    }

    return filteredInsights;
  }

  /**
   * Generate evolution plan based on insights
   */
  async generateEvolutionPlan(
    templateId: string, 
    insights: EvolutionInsight[]
  ): Promise<EvolutionPlan> {
    const existingPlans = this.plans.get(templateId) || [];
    const currentVersion = '1.0.0'; // This would come from template metadata
    
    const plan: EvolutionPlan = {
      id: `plan-${templateId}-${Date.now()}`,
      templateId,
      version: currentVersion,
      targetVersion: this.calculateNextVersion(currentVersion, insights),
      plannedReleaseDate: this.calculateReleaseDate(insights),
      status: this.config.requireApproval ? 'draft' : 'approved',
      priority: this.calculatePlanPriority(insights),
      insights,
      plannedChanges: this.generatePlannedChanges(insights),
      effort: this.estimateEffort(insights),
      stakeholders: this.identifyStakeholders(insights),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    existingPlans.push(plan);
    this.plans.set(templateId, existingPlans);

    this.emit('plan:generated', {
      planId: plan.id,
      templateId,
      priority: plan.priority,
      estimatedEffort: plan.effort.estimated
    });

    return plan;
  }

  /**
   * Get evolution insights for a template
   */
  getInsights(templateId: string): EvolutionInsight[] {
    return this.insights.get(templateId) || [];
  }

  /**
   * Get evolution plans for a template
   */
  getPlans(templateId: string): EvolutionPlan[] {
    return this.plans.get(templateId) || [];
  }

  /**
   * Get all feedback for a template
   */
  getFeedback(templateId: string): CommunityFeedback[] {
    return this.feedbackStore.get(templateId) || [];
  }

  /**
   * Approve evolution plan
   */
  approvePlan(planId: string, approvedBy: string): boolean {
    for (const [templateId, plans] of this.plans.entries()) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        plan.status = 'approved';
        plan.approvedBy = approvedBy;
        plan.updatedAt = new Date();

        this.emit('plan:approved', {
          planId,
          templateId,
          approvedBy
        });

        return true;
      }
    }
    return false;
  }

  /**
   * Get evolution summary across all templates
   */
  getEvolutionSummary(): {
    totalInsights: number;
    totalPlans: number;
    plansByStatus: Record<string, number>;
    insightsByType: Record<string, number>;
    topPriorityTemplates: { templateId: string; priority: string; insightCount: number }[];
  } {
    let totalInsights = 0;
    let totalPlans = 0;
    const plansByStatus: Record<string, number> = {};
    const insightsByType: Record<string, number> = {};
    const templatePriorities: { templateId: string; priority: string; insightCount: number }[] = [];

    // Count insights
    for (const [templateId, insights] of this.insights.entries()) {
      totalInsights += insights.length;
      templatePriorities.push({
        templateId,
        priority: this.calculateTemplatePriority(insights),
        insightCount: insights.length
      });

      insights.forEach(insight => {
        insightsByType[insight.type] = (insightsByType[insight.type] || 0) + 1;
      });
    }

    // Count plans
    for (const plans of this.plans.values()) {
      totalPlans += plans.length;
      plans.forEach(plan => {
        plansByStatus[plan.status] = (plansByStatus[plan.status] || 0) + 1;
      });
    }

    // Sort templates by priority and insight count
    const topPriorityTemplates = templatePriorities
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return b.insightCount - a.insightCount;
      })
      .slice(0, 10);

    return {
      totalInsights,
      totalPlans,
      plansByStatus,
      insightsByType,
      topPriorityTemplates
    };
  }

  /**
   * Analyze usage patterns
   */
  private analyzeUsagePatterns(templateId: string, metrics: UsageMetrics): EvolutionInsight[] {
    const insights: EvolutionInsight[] = [];
    const templateUsage = metrics.templateUsage.get(templateId) || 0;

    // High usage templates need more attention
    if (templateUsage > this.config.usageThreshold) {
      insights.push({
        id: `usage-high-${templateId}-${Date.now()}`,
        type: 'usage-pattern',
        templateId,
        severity: 'medium',
        confidence: 0.9,
        title: 'High Usage Pattern Detected',
        description: `Template has high usage (${templateUsage} generations), requiring enhanced stability and performance focus.`,
        impact: {
          users: templateUsage,
          frequency: templateUsage / 30, // approximate daily usage
          businessValue: 8
        },
        suggestedActions: [
          'Implement additional performance optimizations',
          'Add comprehensive error handling',
          'Enhance documentation for common use cases',
          'Consider creating specialized variants'
        ],
        evidence: {
          usage: { generationCount: templateUsage, rank: 'high' }
        },
        timestamp: new Date()
      });
    }

    // Low usage templates might need improvement
    if (templateUsage > 0 && templateUsage < 10) {
      insights.push({
        id: `usage-low-${templateId}-${Date.now()}`,
        type: 'usage-pattern',
        templateId,
        severity: 'low',
        confidence: 0.6,
        title: 'Low Usage Pattern Detected',
        description: `Template has low usage (${templateUsage} generations), may need improvements to increase adoption.`,
        impact: {
          users: templateUsage,
          frequency: templateUsage / 30,
          businessValue: 3
        },
        suggestedActions: [
          'Analyze barriers to adoption',
          'Improve documentation and examples',
          'Gather user feedback on pain points',
          'Consider marketing or positioning changes'
        ],
        evidence: {
          usage: { generationCount: templateUsage, rank: 'low' }
        },
        timestamp: new Date()
      });
    }

    return insights;
  }

  /**
   * Analyze performance issues
   */
  private analyzePerformanceIssues(templateId: string, metrics: UsageMetrics): EvolutionInsight[] {
    const insights: EvolutionInsight[] = [];
    const avgGenerationTime = metrics.generationTimes.length > 0 
      ? metrics.generationTimes.reduce((sum, time) => sum + time, 0) / metrics.generationTimes.length
      : 0;

    // Slow generation times
    if (avgGenerationTime > 300000) { // 5 minutes
      insights.push({
        id: `perf-slow-${templateId}-${Date.now()}`,
        type: 'performance-issue',
        templateId,
        severity: 'high',
        confidence: 0.85,
        title: 'Slow Generation Performance',
        description: `Template generation is slow (avg: ${Math.round(avgGenerationTime / 1000)}s), impacting user experience.`,
        impact: {
          users: metrics.templateUsage.get(templateId) || 0,
          frequency: 10,
          businessValue: 7
        },
        suggestedActions: [
          'Profile template generation pipeline',
          'Optimize file operations and I/O',
          'Implement parallel processing where possible',
          'Cache frequently used template components'
        ],
        evidence: {
          metrics: { 
            averageGenerationTime: avgGenerationTime,
            samples: metrics.generationTimes.length
          }
        },
        timestamp: new Date()
      });
    }

    return insights;
  }

  /**
   * Analyze community feedback
   */
  private analyzeCommunityFeedback(templateId: string, feedback: CommunityFeedback[]): EvolutionInsight[] {
    const insights: EvolutionInsight[] = [];

    // Group feedback by category
    const feedbackByCategory = feedback.reduce((acc, fb) => {
      acc[fb.category] = acc[fb.category] || [];
      acc[fb.category].push(fb);
      return acc;
    }, {} as Record<string, CommunityFeedback[]>);

    // Analyze each category
    Object.entries(feedbackByCategory).forEach(([category, items]) => {
      if (items.length >= 3) { // Threshold for significant feedback
        const avgRating = items.reduce((sum, item) => sum + item.rating, 0) / items.length;
        const totalVotes = items.reduce((sum, item) => sum + item.votes, 0);

        if (totalVotes >= this.config.feedbackWeightThreshold) {
          insights.push({
            id: `feedback-${category}-${templateId}-${Date.now()}`,
            type: 'community-request',
            templateId,
            severity: avgRating < 3 ? 'high' : 'medium',
            confidence: Math.min(0.9, totalVotes / 50),
            title: `Community Feedback: ${category}`,
            description: `Multiple community requests for ${category} improvements (avg rating: ${avgRating.toFixed(1)}).`,
            impact: {
              users: items.length,
              frequency: 5,
              businessValue: avgRating < 3 ? 8 : 5
            },
            suggestedActions: [
              `Address top-voted ${category} requests`,
              `Improve ${category} documentation`,
              `Consider dedicated ${category} improvements`
            ],
            evidence: {
              feedback: items.slice(0, 5) // Top 5 feedback items
            },
            timestamp: new Date()
          });
        }
      }
    });

    return insights;
  }

  /**
   * Analyze feature gaps
   */
  private analyzeFeatureGaps(
    templateId: string, 
    metrics: UsageMetrics, 
    feedback: CommunityFeedback[]
  ): EvolutionInsight[] {
    const insights: EvolutionInsight[] = [];

    // Look for common patterns in feedback that suggest missing features
    const featureRequests = feedback.filter(fb => 
      fb.category === 'feature' && fb.votes > 5
    );

    if (featureRequests.length > 0) {
      // Group similar feature requests
      const groupedRequests = this.groupSimilarRequests(featureRequests);
      
      Object.entries(groupedRequests).forEach(([theme, requests]) => {
        if (requests.length >= 2) {
          const totalVotes = requests.reduce((sum, req) => sum + req.votes, 0);
          
          insights.push({
            id: `gap-${theme.replace(/\s+/g, '-')}-${templateId}-${Date.now()}`,
            type: 'feature-gap',
            templateId,
            severity: totalVotes > 20 ? 'high' : 'medium',
            confidence: Math.min(0.8, requests.length / 5),
            title: `Feature Gap: ${theme}`,
            description: `Multiple requests for ${theme} functionality (${totalVotes} total votes).`,
            impact: {
              users: requests.length,
              frequency: 3,
              businessValue: totalVotes > 20 ? 9 : 6
            },
            suggestedActions: [
              `Research ${theme} implementation options`,
              `Create RFC for ${theme} feature`,
              `Prototype ${theme} integration`
            ],
            evidence: {
              feedback: requests
            },
            timestamp: new Date()
          });
        }
      });
    }

    return insights;
  }

  /**
   * Group similar feature requests by theme
   */
  private groupSimilarRequests(requests: CommunityFeedback[]): Record<string, CommunityFeedback[]> {
    const groups: Record<string, CommunityFeedback[]> = {};
    
    // Simple keyword-based grouping (in production, could use ML)
    const themes = ['auth', 'database', 'api', 'ui', 'testing', 'deployment', 'security'];
    
    requests.forEach(request => {
      const text = `${request.title} ${request.description}`.toLowerCase();
      let assigned = false;
      
      for (const theme of themes) {
        if (text.includes(theme)) {
          groups[theme] = groups[theme] || [];
          groups[theme].push(request);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        groups['other'] = groups['other'] || [];
        groups['other'].push(request);
      }
    });
    
    return groups;
  }

  /**
   * Calculate next version based on insights
   */
  private calculateNextVersion(currentVersion: string, insights: EvolutionInsight[]): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    const hasBreaking = insights.some(i => i.severity === 'critical');
    const hasFeatures = insights.some(i => i.type === 'feature-gap');
    
    if (hasBreaking) {
      return `${major + 1}.0.0`;
    } else if (hasFeatures) {
      return `${major}.${minor + 1}.0`;
    } else {
      return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Calculate release date based on effort and priority
   */
  private calculateReleaseDate(insights: EvolutionInsight[]): Date {
    const totalEffort = insights.reduce((sum, insight) => {
      const effortMap = { low: 1, medium: 3, high: 8, critical: 16 };
      return sum + (effortMap[insight.severity] || 1);
    }, 0);
    
    // Estimate 1 week per effort point
    const weeksEstimate = Math.max(1, Math.ceil(totalEffort / 4));
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + (weeksEstimate * 7));
    
    return releaseDate;
  }

  /**
   * Calculate plan priority
   */
  private calculatePlanPriority(insights: EvolutionInsight[]): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = insights.some(i => i.severity === 'critical');
    const hasHigh = insights.some(i => i.severity === 'high');
    const highImpactCount = insights.filter(i => i.impact.businessValue > 7).length;
    
    if (hasCritical || highImpactCount > 3) return 'critical';
    if (hasHigh || highImpactCount > 1) return 'high';
    if (insights.length > 2) return 'medium';
    return 'low';
  }

  /**
   * Generate planned changes from insights
   */
  private generatePlannedChanges(insights: EvolutionInsight[]): EvolutionPlan['plannedChanges'] {
    const changes = {
      features: [] as string[],
      improvements: [] as string[],
      bugFixes: [] as string[],
      breaking: [] as string[]
    };

    insights.forEach(insight => {
      switch (insight.type) {
        case 'feature-gap':
          changes.features.push(...insight.suggestedActions);
          break;
        case 'performance-issue':
          changes.improvements.push(...insight.suggestedActions);
          break;
        case 'community-request':
          if (insight.severity === 'high') {
            changes.bugFixes.push(...insight.suggestedActions);
          } else {
            changes.improvements.push(...insight.suggestedActions);
          }
          break;
        case 'usage-pattern':
          if (insight.severity === 'critical') {
            changes.breaking.push(...insight.suggestedActions);
          } else {
            changes.improvements.push(...insight.suggestedActions);
          }
          break;
      }
    });

    return changes;
  }

  /**
   * Estimate effort for insights
   */
  private estimateEffort(insights: EvolutionInsight[]): EvolutionPlan['effort'] {
    const effortHours = insights.reduce((sum, insight) => {
      const hourMap = { low: 8, medium: 24, high: 64, critical: 160 };
      return sum + (hourMap[insight.severity] || 8);
    }, 0);

    const complexity = effortHours > 100 ? 'high' : effortHours > 40 ? 'medium' : 'low';
    
    const risks = [];
    if (insights.some(i => i.severity === 'critical')) {
      risks.push('Breaking changes may affect existing users');
    }
    if (effortHours > 80) {
      risks.push('Large scope increases delivery risk');
    }
    if (insights.some(i => i.confidence < 0.6)) {
      risks.push('Some insights have low confidence');
    }

    return {
      estimated: effortHours,
      complexity,
      risks
    };
  }

  /**
   * Identify stakeholders based on insights
   */
  private identifyStakeholders(insights: EvolutionInsight[]): string[] {
    const stakeholders = new Set(['product-manager', 'engineering-lead']);

    if (insights.some(i => i.type === 'performance-issue')) {
      stakeholders.add('performance-engineer');
    }
    if (insights.some(i => i.type === 'community-request')) {
      stakeholders.add('community-manager');
    }
    if (insights.some(i => i.severity === 'critical')) {
      stakeholders.add('architecture-lead');
    }

    return Array.from(stakeholders);
  }

  /**
   * Calculate template priority
   */
  private calculateTemplatePriority(insights: EvolutionInsight[]): string {
    const hasCritical = insights.some(i => i.severity === 'critical');
    const hasHigh = insights.some(i => i.severity === 'high');
    
    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (insights.length > 3) return 'medium';
    return 'low';
  }

  /**
   * Start analysis timer
   */
  private startAnalysisTimer(): void {
    this.analysisTimer = setInterval(() => {
      this.runPeriodicAnalysis();
    }, this.config.analysisInterval);
  }

  /**
   * Run periodic analysis across all templates
   */
  private async runPeriodicAnalysis(): Promise<void> {
    const metrics = this.analytics.getMetrics();
    const templateIds = Array.from(metrics.templateUsage.keys());

    for (const templateId of templateIds) {
      try {
        await this.analyzeTemplate(templateId);
      } catch (error) {
        this.emit('analysis:error', {
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.emit('periodic-analysis:completed', {
      analyzedTemplates: templateIds.length,
      timestamp: new Date()
    });
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
  }
}