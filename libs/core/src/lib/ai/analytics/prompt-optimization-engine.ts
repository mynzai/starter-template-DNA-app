import { EventEmitter } from 'events';
import { PromptTemplate, PromptExecutionResult } from '../prompts/prompt-template';
import { PromptPerformanceAnalytics, PerformanceReport } from './prompt-performance-analytics';
import { ABTestingFramework, ABTest } from './ab-testing-framework';

export interface OptimizationRecommendation {
  id: string;
  type: 'prompt_refinement' | 'model_change' | 'parameter_tuning' | 'caching' | 'fallback_strategy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    improvementPercent: number;
  }[];
  suggestedChanges: SuggestedChange[];
  estimatedEffort: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
  relatedTemplates?: string[];
  confidence: number; // 0-1
}

export interface SuggestedChange {
  type: 'template_modification' | 'parameter_adjustment' | 'model_switch' | 'add_cache' | 'add_fallback';
  description: string;
  before?: string;
  after?: string;
  parameters?: Record<string, any>;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  applicableConditions: OptimizationCondition[];
  recommendations: OptimizationRecommendation[];
  successMetrics: { metric: string; targetValue: number }[];
}

export interface OptimizationCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  timeWindow?: number; // milliseconds
}

export interface OptimizationResult {
  templateId: string;
  recommendations: OptimizationRecommendation[];
  automatedOptimizations: {
    applied: string[];
    failed: Array<{ recommendationId: string; error: string }>;
  };
  projectedImprovements: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    confidence: number;
  }[];
  timestamp: number;
}

export interface PromptPattern {
  name: string;
  description: string;
  pattern: RegExp | string;
  issues: string[];
  improvements: string[];
  examples: { bad: string; good: string }[];
}

export class PromptOptimizationEngine extends EventEmitter {
  private analytics: PromptPerformanceAnalytics;
  private abTesting: ABTestingFramework;
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private patterns: Map<string, PromptPattern> = new Map();
  private optimizationHistory: Map<string, OptimizationResult[]> = new Map();
  
  constructor(
    analytics: PromptPerformanceAnalytics,
    abTesting: ABTestingFramework
  ) {
    super();
    this.analytics = analytics;
    this.abTesting = abTesting;
    
    this.initializeDefaultStrategies();
    this.initializePromptPatterns();
  }

  public async analyzeTemplate(
    template: PromptTemplate,
    performanceReport?: PerformanceReport
  ): Promise<OptimizationResult> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Get performance report if not provided
    const report = performanceReport || await this.analytics.generateReport(template.id);
    
    // 1. Analyze prompt structure and patterns
    const promptRecommendations = this.analyzePromptStructure(template);
    recommendations.push(...promptRecommendations);
    
    // 2. Analyze performance metrics
    const performanceRecommendations = this.analyzePerformance(template, report);
    recommendations.push(...performanceRecommendations);
    
    // 3. Analyze cost optimization opportunities
    const costRecommendations = this.analyzeCostOptimization(template, report);
    recommendations.push(...costRecommendations);
    
    // 4. Check applicable optimization strategies
    const strategyRecommendations = this.applyOptimizationStrategies(template, report);
    recommendations.push(...strategyRecommendations);
    
    // 5. Analyze A/B test results if available
    const abTestRecommendations = await this.analyzeABTestResults(template.id);
    recommendations.push(...abTestRecommendations);
    
    // Sort by priority and confidence
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence;
    });
    
    // Calculate projected improvements
    const projectedImprovements = this.calculateProjectedImprovements(
      template,
      report,
      recommendations
    );
    
    // Apply automated optimizations if enabled
    const automatedResults = await this.applyAutomatedOptimizations(
      template,
      recommendations.filter(r => r.autoApplicable)
    );
    
    const result: OptimizationResult = {
      templateId: template.id,
      recommendations,
      automatedOptimizations: automatedResults,
      projectedImprovements,
      timestamp: Date.now()
    };
    
    // Store in history
    let history = this.optimizationHistory.get(template.id);
    if (!history) {
      history = [];
      this.optimizationHistory.set(template.id, history);
    }
    history.push(result);
    
    // Keep only last 100 results
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.emit('optimization:analyzed', result);
    
    return result;
  }

  public registerOptimizationStrategy(strategy: OptimizationStrategy): void {
    this.strategies.set(strategy.id, strategy);
    
    this.emit('strategy:registered', {
      strategyId: strategy.id,
      name: strategy.name,
      timestamp: Date.now()
    });
  }

  public registerPromptPattern(pattern: PromptPattern): void {
    this.patterns.set(pattern.name, pattern);
    
    this.emit('pattern:registered', {
      patternName: pattern.name,
      timestamp: Date.now()
    });
  }

  private analyzePromptStructure(template: PromptTemplate): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const content = template.template;
    
    // Check for known problematic patterns
    for (const [patternName, pattern] of this.patterns) {
      const matches = typeof pattern.pattern === 'string' 
        ? content.includes(pattern.pattern)
        : pattern.pattern.test(content);
      
      if (matches) {
        recommendations.push({
          id: `pattern-${patternName}-${Date.now()}`,
          type: 'prompt_refinement',
          priority: 'medium',
          title: `Prompt Pattern Issue: ${pattern.name}`,
          description: pattern.description,
          rationale: `Found problematic pattern that ${pattern.issues.join(', ')}`,
          expectedImpact: [{
            metric: 'qualityScore',
            currentValue: 0.7,
            expectedValue: 0.85,
            improvementPercent: 21
          }],
          suggestedChanges: pattern.improvements.map(improvement => ({
            type: 'template_modification',
            description: improvement,
            before: pattern.examples[0]?.bad,
            after: pattern.examples[0]?.good
          })),
          estimatedEffort: 'low',
          autoApplicable: false,
          confidence: 0.8
        });
      }
    }
    
    // Check prompt length
    const tokenEstimate = content.length / 4; // Rough estimate
    if (tokenEstimate > 2000) {
      recommendations.push({
        id: `length-optimization-${Date.now()}`,
        type: 'prompt_refinement',
        priority: 'high',
        title: 'Prompt Length Optimization',
        description: 'Prompt is excessively long and may impact performance and cost.',
        rationale: `Estimated ${Math.round(tokenEstimate)} tokens. Long prompts increase latency and cost.`,
        expectedImpact: [
          {
            metric: 'avgCost',
            currentValue: 0.05,
            expectedValue: 0.02,
            improvementPercent: 60
          },
          {
            metric: 'avgResponseTime',
            currentValue: 3000,
            expectedValue: 1500,
            improvementPercent: 50
          }
        ],
        suggestedChanges: [{
          type: 'template_modification',
          description: 'Condense prompt by removing redundant instructions and examples'
        }],
        estimatedEffort: 'medium',
        autoApplicable: false,
        confidence: 0.9
      });
    }
    
    // Check for missing best practices
    const bestPractices = [
      {
        check: !content.includes('step by step') && !content.includes('step-by-step'),
        issue: 'Missing step-by-step instruction',
        suggestion: 'Add "Let\'s think step by step" for better reasoning'
      },
      {
        check: !content.match(/example|Example|EXAMPLE/),
        issue: 'No examples provided',
        suggestion: 'Include 1-2 concrete examples for better output quality'
      },
      {
        check: template.variables.length === 0,
        issue: 'No variables defined',
        suggestion: 'Use variables for dynamic content instead of hardcoding'
      }
    ];
    
    bestPractices.forEach((practice, index) => {
      if (practice.check) {
        recommendations.push({
          id: `best-practice-${index}-${Date.now()}`,
          type: 'prompt_refinement',
          priority: 'low',
          title: practice.issue,
          description: practice.suggestion,
          rationale: 'Following prompt engineering best practices improves output quality',
          expectedImpact: [{
            metric: 'qualityScore',
            currentValue: 0.7,
            expectedValue: 0.75,
            improvementPercent: 7
          }],
          suggestedChanges: [{
            type: 'template_modification',
            description: practice.suggestion
          }],
          estimatedEffort: 'low',
          autoApplicable: false,
          confidence: 0.6
        });
      }
    });
    
    return recommendations;
  }

  private analyzePerformance(
    template: PromptTemplate,
    report: PerformanceReport
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = report.summary;
    
    // Response time optimization
    if (metrics.avgResponseTime > 3000) {
      recommendations.push({
        id: `perf-response-time-${Date.now()}`,
        type: 'model_change',
        priority: 'high',
        title: 'Switch to Faster Model',
        description: 'Current model has high latency. Consider using a faster alternative.',
        rationale: `Average response time of ${Math.round(metrics.avgResponseTime)}ms exceeds target.`,
        expectedImpact: [{
          metric: 'avgResponseTime',
          currentValue: metrics.avgResponseTime,
          expectedValue: 1500,
          improvementPercent: 50
        }],
        suggestedChanges: [{
          type: 'model_switch',
          description: 'Switch from GPT-4 to GPT-3.5-turbo or Claude Haiku',
          parameters: {
            currentModel: 'gpt-4',
            suggestedModel: 'gpt-3.5-turbo'
          }
        }],
        estimatedEffort: 'low',
        autoApplicable: true,
        confidence: 0.85
      });
    }
    
    // Success rate improvement
    if (metrics.successRate < 0.95) {
      recommendations.push({
        id: `perf-success-rate-${Date.now()}`,
        type: 'fallback_strategy',
        priority: 'critical',
        title: 'Implement Retry and Fallback Logic',
        description: 'Low success rate indicates reliability issues.',
        rationale: `Success rate of ${Math.round(metrics.successRate * 100)}% is below acceptable threshold.`,
        expectedImpact: [{
          metric: 'successRate',
          currentValue: metrics.successRate,
          expectedValue: 0.98,
          improvementPercent: Math.round((0.98 - metrics.successRate) / metrics.successRate * 100)
        }],
        suggestedChanges: [
          {
            type: 'add_fallback',
            description: 'Add retry logic with exponential backoff',
            parameters: {
              maxRetries: 3,
              backoffMultiplier: 2,
              initialDelay: 1000
            }
          },
          {
            type: 'add_fallback',
            description: 'Configure fallback to alternative provider',
            parameters: {
              primaryProvider: 'openai',
              fallbackProvider: 'anthropic'
            }
          }
        ],
        estimatedEffort: 'medium',
        autoApplicable: true,
        confidence: 0.9
      });
    }
    
    // Check for performance anomalies
    const anomalyCount = report.anomalies.filter(
      a => a.severity === 'high' && 
      Date.now() - a.timestamp < 24 * 60 * 60 * 1000
    ).length;
    
    if (anomalyCount > 3) {
      recommendations.push({
        id: `perf-stability-${Date.now()}`,
        type: 'parameter_tuning',
        priority: 'high',
        title: 'Stabilize Performance with Parameter Tuning',
        description: 'Frequent anomalies indicate unstable performance.',
        rationale: `${anomalyCount} high-severity anomalies in the last 24 hours.`,
        expectedImpact: [{
          metric: 'stability',
          currentValue: 0.7,
          expectedValue: 0.95,
          improvementPercent: 35
        }],
        suggestedChanges: [{
          type: 'parameter_adjustment',
          description: 'Reduce temperature for more consistent outputs',
          parameters: {
            temperature: { current: 0.8, suggested: 0.3 }
          }
        }],
        estimatedEffort: 'low',
        autoApplicable: true,
        confidence: 0.75
      });
    }
    
    return recommendations;
  }

  private analyzeCostOptimization(
    template: PromptTemplate,
    report: PerformanceReport
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = report.summary;
    
    // Token usage optimization
    if (metrics.avgTokenUsage > 1000) {
      recommendations.push({
        id: `cost-token-usage-${Date.now()}`,
        type: 'prompt_refinement',
        priority: 'medium',
        title: 'Reduce Token Usage',
        description: 'High token usage is driving up costs.',
        rationale: `Average ${Math.round(metrics.avgTokenUsage)} tokens per execution.`,
        expectedImpact: [{
          metric: 'avgCost',
          currentValue: metrics.avgCost,
          expectedValue: metrics.avgCost * 0.6,
          improvementPercent: 40
        }],
        suggestedChanges: [
          {
            type: 'template_modification',
            description: 'Use more concise instructions'
          },
          {
            type: 'parameter_adjustment',
            description: 'Limit max_tokens parameter',
            parameters: {
              max_tokens: { current: 2000, suggested: 500 }
            }
          }
        ],
        estimatedEffort: 'medium',
        autoApplicable: false,
        confidence: 0.8
      });
    }
    
    // Caching opportunities
    if (metrics.totalExecutions > 1000) {
      const cacheablePercent = this.estimateCacheableRequests(template);
      
      if (cacheablePercent > 0.2) {
        recommendations.push({
          id: `cost-caching-${Date.now()}`,
          type: 'caching',
          priority: 'high',
          title: 'Implement Response Caching',
          description: 'Many similar requests could be served from cache.',
          rationale: `Estimated ${Math.round(cacheablePercent * 100)}% of requests are cacheable.`,
          expectedImpact: [
            {
              metric: 'avgCost',
              currentValue: metrics.avgCost,
              expectedValue: metrics.avgCost * (1 - cacheablePercent * 0.9),
              improvementPercent: Math.round(cacheablePercent * 90)
            },
            {
              metric: 'avgResponseTime',
              currentValue: metrics.avgResponseTime,
              expectedValue: metrics.avgResponseTime * (1 - cacheablePercent * 0.95),
              improvementPercent: Math.round(cacheablePercent * 95)
            }
          ],
          suggestedChanges: [{
            type: 'add_cache',
            description: 'Implement semantic caching with 1-hour TTL',
            parameters: {
              cacheType: 'semantic',
              ttl: 3600,
              similarityThreshold: 0.95
            }
          }],
          estimatedEffort: 'high',
          autoApplicable: false,
          confidence: 0.7
        });
      }
    }
    
    // Model downgrade opportunities
    if (metrics.qualityScore && metrics.qualityScore > 0.9) {
      recommendations.push({
        id: `cost-model-downgrade-${Date.now()}`,
        type: 'model_change',
        priority: 'low',
        title: 'Consider Cheaper Model',
        description: 'High quality scores suggest potential for using a more cost-effective model.',
        rationale: `Quality score of ${Math.round(metrics.qualityScore * 100)}% exceeds requirements.`,
        expectedImpact: [{
          metric: 'avgCost',
          currentValue: metrics.avgCost,
          expectedValue: metrics.avgCost * 0.3,
          improvementPercent: 70
        }],
        suggestedChanges: [{
          type: 'model_switch',
          description: 'Test with GPT-3.5-turbo or Claude Haiku',
          parameters: {
            currentModel: 'gpt-4',
            suggestedModels: ['gpt-3.5-turbo', 'claude-haiku']
          }
        }],
        estimatedEffort: 'low',
        autoApplicable: false,
        confidence: 0.6
      });
    }
    
    return recommendations;
  }

  private applyOptimizationStrategies(
    template: PromptTemplate,
    report: PerformanceReport
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    for (const [_, strategy] of this.strategies) {
      // Check if all conditions are met
      const conditionsMet = strategy.applicableConditions.every(condition => {
        const value = this.getMetricValue(report, condition.metric);
        
        switch (condition.operator) {
          case 'gt': return value > condition.value;
          case 'lt': return value < condition.value;
          case 'eq': return value === condition.value;
          case 'gte': return value >= condition.value;
          case 'lte': return value <= condition.value;
          default: return false;
        }
      });
      
      if (conditionsMet) {
        recommendations.push(...strategy.recommendations);
      }
    }
    
    return recommendations;
  }

  private async analyzeABTestResults(templateId: string): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const activeTests = this.abTesting.getActiveTestsForTemplate(templateId);
    
    for (const test of activeTests) {
      const results = await this.abTesting.analyzeTestResults(test.id);
      
      if (results.status === 'winner_found' && results.winnerVariantId) {
        const winnerVariant = test.variants.find(v => v.id === results.winnerVariantId);
        const winnerStats = results.variants[results.winnerVariantId!];
        const controlVariant = test.variants.find(v => v.isControl);
        const controlStats = controlVariant ? results.variants[controlVariant.id] : null;
        
        if (winnerVariant && !winnerVariant.isControl && controlStats) {
          recommendations.push({
            id: `ab-test-winner-${test.id}`,
            type: 'prompt_refinement',
            priority: 'high',
            title: `Apply Winning A/B Test Variant: ${winnerVariant.name}`,
            description: `A/B test "${test.name}" has identified a winning variant with significant improvement.`,
            rationale: `${Math.round(winnerStats.improvementOverControl || 0)}% improvement with ${Math.round((results.statisticalSignificance || 0) * 100)}% confidence.`,
            expectedImpact: [{
              metric: test.targetMetric,
              currentValue: controlStats.metricValue,
              expectedValue: winnerStats.metricValue,
              improvementPercent: Math.round(winnerStats.improvementOverControl || 0)
            }],
            suggestedChanges: [{
              type: 'template_modification',
              description: `Switch to variant: ${winnerVariant.name}`,
              parameters: {
                variantId: winnerVariant.id,
                templateVersion: winnerVariant.templateVersion
              }
            }],
            estimatedEffort: 'low',
            autoApplicable: true,
            confidence: results.statisticalSignificance || 0.95
          });
        }
      }
    }
    
    return recommendations;
  }

  private calculateProjectedImprovements(
    template: PromptTemplate,
    report: PerformanceReport,
    recommendations: OptimizationRecommendation[]
  ): OptimizationResult['projectedImprovements'] {
    const projections: OptimizationResult['projectedImprovements'] = [];
    const metricImpacts = new Map<string, number[]>();
    
    // Aggregate impacts by metric
    for (const rec of recommendations) {
      for (const impact of rec.expectedImpact) {
        if (!metricImpacts.has(impact.metric)) {
          metricImpacts.set(impact.metric, []);
        }
        metricImpacts.get(impact.metric)!.push(impact.improvementPercent);
      }
    }
    
    // Calculate projected values
    for (const [metric, impacts] of metricImpacts) {
      const currentValue = this.getMetricValue(report, metric);
      
      // Use diminishing returns model for multiple improvements
      const combinedImprovement = impacts.reduce((total, impact) => {
        return total + (1 - total) * (impact / 100);
      }, 0);
      
      const projectedValue = metric.includes('cost') || metric.includes('time') || metric.includes('Time')
        ? currentValue * (1 - combinedImprovement) // Lower is better
        : currentValue * (1 + combinedImprovement); // Higher is better
      
      projections.push({
        metric,
        currentValue,
        projectedValue,
        confidence: Math.min(...recommendations.map(r => r.confidence)) * 0.8 // Conservative estimate
      });
    }
    
    return projections;
  }

  private async applyAutomatedOptimizations(
    template: PromptTemplate,
    recommendations: OptimizationRecommendation[]
  ): Promise<OptimizationResult['automatedOptimizations']> {
    const applied: string[] = [];
    const failed: Array<{ recommendationId: string; error: string }> = [];
    
    for (const rec of recommendations) {
      if (!rec.autoApplicable) continue;
      
      try {
        // Simulate applying optimization
        // In a real implementation, this would interact with the prompt manager
        // and other systems to apply the changes
        
        switch (rec.type) {
          case 'parameter_tuning':
            // Apply parameter adjustments
            this.emit('optimization:applied', {
              recommendationId: rec.id,
              type: rec.type,
              changes: rec.suggestedChanges,
              timestamp: Date.now()
            });
            applied.push(rec.id);
            break;
            
          case 'model_change':
            // Apply model switch
            this.emit('optimization:applied', {
              recommendationId: rec.id,
              type: rec.type,
              changes: rec.suggestedChanges,
              timestamp: Date.now()
            });
            applied.push(rec.id);
            break;
            
          case 'fallback_strategy':
            // Configure fallback
            this.emit('optimization:applied', {
              recommendationId: rec.id,
              type: rec.type,
              changes: rec.suggestedChanges,
              timestamp: Date.now()
            });
            applied.push(rec.id);
            break;
            
          default:
            // Other types might require manual intervention
            break;
        }
      } catch (error) {
        failed.push({
          recommendationId: rec.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return { applied, failed };
  }

  private getMetricValue(report: PerformanceReport, metricName: string): number {
    const summary = report.summary;
    
    switch (metricName) {
      case 'avgResponseTime':
        return summary.avgResponseTime;
      case 'successRate':
        return summary.successRate;
      case 'avgCost':
        return summary.avgCost;
      case 'avgTokenUsage':
        return summary.avgTokenUsage;
      case 'qualityScore':
        return summary.qualityScore || 0;
      case 'totalExecutions':
        return summary.totalExecutions;
      default:
        return 0;
    }
  }

  private estimateCacheableRequests(template: PromptTemplate): number {
    // Simplified estimation based on template characteristics
    // In a real implementation, this would analyze actual request patterns
    
    let cacheability = 0;
    
    // Templates with few or no variables are more cacheable
    if (template.variables.length === 0) {
      cacheability += 0.5;
    } else if (template.variables.length <= 2) {
      cacheability += 0.3;
    }
    
    // Certain categories are more cacheable
    const cacheableCategories = ['faq', 'documentation', 'translation', 'summary'];
    if (cacheableCategories.includes(template.category.toLowerCase())) {
      cacheability += 0.3;
    }
    
    // Short prompts are more likely to be repeated
    if (template.template.length < 500) {
      cacheability += 0.2;
    }
    
    return Math.min(cacheability, 0.8); // Cap at 80%
  }

  private initializeDefaultStrategies(): void {
    // High-cost optimization strategy
    this.strategies.set('high-cost-optimization', {
      id: 'high-cost-optimization',
      name: 'High Cost Optimization',
      description: 'Optimizations for templates with excessive costs',
      applicableConditions: [
        { metric: 'avgCost', operator: 'gt', value: 0.10 },
        { metric: 'totalExecutions', operator: 'gt', value: 100 }
      ],
      recommendations: [],
      successMetrics: [
        { metric: 'avgCost', targetValue: 0.05 }
      ]
    });
    
    // Poor quality optimization strategy
    this.strategies.set('quality-improvement', {
      id: 'quality-improvement',
      name: 'Quality Improvement',
      description: 'Optimizations for templates with low quality scores',
      applicableConditions: [
        { metric: 'qualityScore', operator: 'lt', value: 0.7 }
      ],
      recommendations: [],
      successMetrics: [
        { metric: 'qualityScore', targetValue: 0.85 }
      ]
    });
  }

  private initializePromptPatterns(): void {
    // Vague instructions pattern
    this.patterns.set('vague-instructions', {
      name: 'Vague Instructions',
      description: 'Instructions that are too general or ambiguous',
      pattern: /please|try to|maybe|somehow|kind of/i,
      issues: ['reduces output quality', 'increases variability'],
      improvements: ['Use specific, actionable instructions'],
      examples: [{
        bad: 'Please try to summarize this somehow',
        good: 'Summarize this text in 3 bullet points, focusing on key findings'
      }]
    });
    
    // Missing context pattern
    this.patterns.set('missing-context', {
      name: 'Missing Context',
      description: 'Prompts that lack necessary context',
      pattern: /^(Answer|Respond|Generate|Create|Write)/i,
      issues: ['may produce irrelevant outputs', 'requires more clarification'],
      improvements: ['Provide relevant context and constraints'],
      examples: [{
        bad: 'Answer the question',
        good: 'As a technical expert, answer the following question about cloud architecture'
      }]
    });
    
    // Negative instructions pattern
    this.patterns.set('negative-instructions', {
      name: 'Negative Instructions',
      description: 'Instructions focusing on what NOT to do',
      pattern: /don't|do not|avoid|never|shouldn't/i,
      issues: ['less effective than positive instructions', 'may be ignored'],
      improvements: ['Rephrase as positive instructions'],
      examples: [{
        bad: "Don't use technical jargon",
        good: 'Use simple, everyday language accessible to beginners'
      }]
    });
  }

  public getOptimizationHistory(templateId: string): OptimizationResult[] {
    return this.optimizationHistory.get(templateId) || [];
  }

  public async destroy(): void {
    this.strategies.clear();
    this.patterns.clear();
    this.optimizationHistory.clear();
    this.removeAllListeners();
  }
}