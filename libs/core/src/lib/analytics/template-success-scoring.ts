import { EventEmitter } from 'events';
import { TemplateDefinition } from '../types/template.types';
import { TemplatePerformanceData } from './performance-metrics';

export interface SuccessMetrics {
  adoptionRate: number;
  completionRate: number;
  errorFrequency: number;
  userSatisfaction: number;
  performanceScore: number;
  maintainabilityScore: number;
  securityScore: number;
  documentationScore: number;
}

export interface TemplateSuccessScore {
  templateId: string;
  framework: string;
  version: string;
  overallScore: number;
  metrics: SuccessMetrics;
  rank: 'excellent' | 'good' | 'fair' | 'poor';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface BenchmarkData {
  framework: string;
  category: string;
  averageScores: SuccessMetrics;
  topPerformers: string[];
  commonIssues: string[];
  industryStandards: Record<string, number>;
}

export interface SuccessIndicator {
  name: string;
  weight: number;
  currentValue: number;
  targetValue: number;
  trend: 'improving' | 'stable' | 'declining';
  impact: 'high' | 'medium' | 'low';
}

export class TemplateSuccessScoring extends EventEmitter {
  private successScores: Map<string, TemplateSuccessScore[]> = new Map();
  private benchmarks: Map<string, BenchmarkData> = new Map();
  private weightConfig: Record<keyof SuccessMetrics, number>;

  constructor(customWeights?: Partial<Record<keyof SuccessMetrics, number>>) {
    super();

    // Default weights for success metrics
    this.weightConfig = {
      adoptionRate: 0.15,
      completionRate: 0.20,
      errorFrequency: 0.15,
      userSatisfaction: 0.15,
      performanceScore: 0.15,
      maintainabilityScore: 0.10,
      securityScore: 0.05,
      documentationScore: 0.05,
      ...customWeights
    };

    this.initializeBenchmarks();
  }

  /**
   * Calculate success score for a template
   */
  calculateSuccessScore(
    template: TemplateDefinition,
    performanceData: TemplatePerformanceData[],
    usageData: {
      totalDownloads: number;
      successfulSetups: number;
      errorReports: number;
      userRatings: number[];
      documentationViews: number;
      maintenanceEvents: number;
    }
  ): TemplateSuccessScore {
    const metrics = this.calculateMetrics(performanceData, usageData);
    const overallScore = this.calculateWeightedScore(metrics);
    const rank = this.determineRank(overallScore);
    const analysis = this.analyzeTemplate(metrics, template.framework);

    const successScore: TemplateSuccessScore = {
      templateId: template.id,
      framework: template.framework,
      version: template.version,
      overallScore,
      metrics,
      rank,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      timestamp: new Date()
    };

    // Store the score
    const existing = this.successScores.get(template.id) || [];
    existing.push(successScore);
    this.successScores.set(template.id, existing);

    this.emit('score:calculated', successScore);
    return successScore;
  }

  /**
   * Get success indicators for a template
   */
  getSuccessIndicators(templateId: string): SuccessIndicator[] {
    const scores = this.successScores.get(templateId) || [];
    if (scores.length === 0) return [];

    const latest = scores[scores.length - 1];
    const benchmark = this.benchmarks.get(latest.framework);

    const indicators: SuccessIndicator[] = [
      {
        name: 'Adoption Rate',
        weight: this.weightConfig.adoptionRate,
        currentValue: latest.metrics.adoptionRate,
        targetValue: benchmark?.averageScores.adoptionRate || 0.8,
        trend: this.calculateTrend(scores, 'adoptionRate'),
        impact: 'high'
      },
      {
        name: 'Completion Rate',
        weight: this.weightConfig.completionRate,
        currentValue: latest.metrics.completionRate,
        targetValue: benchmark?.averageScores.completionRate || 0.9,
        trend: this.calculateTrend(scores, 'completionRate'),
        impact: 'high'
      },
      {
        name: 'Error Frequency',
        weight: this.weightConfig.errorFrequency,
        currentValue: latest.metrics.errorFrequency,
        targetValue: benchmark?.averageScores.errorFrequency || 0.05,
        trend: this.calculateTrend(scores, 'errorFrequency', true),
        impact: 'high'
      },
      {
        name: 'User Satisfaction',
        weight: this.weightConfig.userSatisfaction,
        currentValue: latest.metrics.userSatisfaction,
        targetValue: benchmark?.averageScores.userSatisfaction || 4.5,
        trend: this.calculateTrend(scores, 'userSatisfaction'),
        impact: 'medium'
      },
      {
        name: 'Performance Score',
        weight: this.weightConfig.performanceScore,
        currentValue: latest.metrics.performanceScore,
        targetValue: benchmark?.averageScores.performanceScore || 85,
        trend: this.calculateTrend(scores, 'performanceScore'),
        impact: 'medium'
      }
    ];

    return indicators;
  }

  /**
   * Compare template against framework benchmarks
   */
  compareWithBenchmarks(templateId: string): {
    framework: string;
    templateScore: number;
    benchmarkScore: number;
    percentile: number;
    comparison: Record<keyof SuccessMetrics, {
      template: number;
      benchmark: number;
      difference: number;
      status: 'above' | 'at' | 'below';
    }>;
  } | null {
    const scores = this.successScores.get(templateId) || [];
    if (scores.length === 0) return null;

    const latest = scores[scores.length - 1];
    const benchmark = this.benchmarks.get(latest.framework);
    if (!benchmark) return null;

    const comparison: Record<string, any> = {};
    let templateAvg = 0;
    let benchmarkAvg = 0;

    for (const [metric, value] of Object.entries(latest.metrics)) {
      const benchmarkValue = benchmark.averageScores[metric as keyof SuccessMetrics];
      const difference = value - benchmarkValue;
      
      comparison[metric] = {
        template: value,
        benchmark: benchmarkValue,
        difference,
        status: difference > 0.05 ? 'above' : difference < -0.05 ? 'below' : 'at'
      };

      templateAvg += value * this.weightConfig[metric as keyof SuccessMetrics];
      benchmarkAvg += benchmarkValue * this.weightConfig[metric as keyof SuccessMetrics];
    }

    // Calculate percentile (simplified)
    const percentile = Math.min(95, Math.max(5, (templateAvg / benchmarkAvg) * 50));

    return {
      framework: latest.framework,
      templateScore: latest.overallScore,
      benchmarkScore: Math.round(benchmarkAvg * 100),
      percentile: Math.round(percentile),
      comparison
    };
  }

  /**
   * Get top performing templates
   */
  getTopPerformingTemplates(
    framework?: string,
    limit: number = 10
  ): Array<{
    templateId: string;
    framework: string;
    score: number;
    rank: string;
    keyStrengths: string[];
  }> {
    const allScores: TemplateSuccessScore[] = [];

    for (const [templateId, scores] of this.successScores) {
      const latest = scores[scores.length - 1];
      if (!framework || latest.framework === framework) {
        allScores.push(latest);
      }
    }

    return allScores
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit)
      .map(score => ({
        templateId: score.templateId,
        framework: score.framework,
        score: score.overallScore,
        rank: score.rank,
        keyStrengths: score.strengths.slice(0, 3)
      }));
  }

  /**
   * Identify templates needing improvement
   */
  getTemplatesNeedingImprovement(threshold: number = 70): Array<{
    templateId: string;
    framework: string;
    score: number;
    criticalIssues: string[];
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
  }> {
    const needingImprovement: Array<any> = [];

    for (const [templateId, scores] of this.successScores) {
      const latest = scores[scores.length - 1];
      
      if (latest.overallScore < threshold) {
        const priority = latest.overallScore < 50 ? 'high' : 
                        latest.overallScore < 65 ? 'medium' : 'low';

        needingImprovement.push({
          templateId,
          framework: latest.framework,
          score: latest.overallScore,
          criticalIssues: latest.weaknesses,
          recommendations: latest.recommendations,
          priority
        });
      }
    }

    return needingImprovement.sort((a, b) => a.score - b.score);
  }

  /**
   * Generate success report
   */
  generateSuccessReport(templateId: string): string {
    const scores = this.successScores.get(templateId) || [];
    if (scores.length === 0) {
      return `No success data available for template: ${templateId}`;
    }

    const latest = scores[scores.length - 1];
    const comparison = this.compareWithBenchmarks(templateId);
    const indicators = this.getSuccessIndicators(templateId);

    let report = `# Template Success Report: ${templateId}\n\n`;
    
    report += `## Overall Performance\n`;
    report += `- **Score**: ${latest.overallScore}/100 (${latest.rank})\n`;
    report += `- **Framework**: ${latest.framework}\n`;
    report += `- **Version**: ${latest.version}\n`;
    report += `- **Last Updated**: ${latest.timestamp.toISOString()}\n\n`;

    if (comparison) {
      report += `## Benchmark Comparison\n`;
      report += `- **Template Score**: ${comparison.templateScore}\n`;
      report += `- **Framework Average**: ${comparison.benchmarkScore}\n`;
      report += `- **Percentile**: ${comparison.percentile}th\n\n`;
    }

    report += `## Key Metrics\n`;
    for (const [metric, value] of Object.entries(latest.metrics)) {
      const indicator = indicators.find(i => i.name.toLowerCase().includes(metric.toLowerCase()));
      const trend = indicator?.trend || 'stable';
      report += `- **${this.formatMetricName(metric)}**: ${this.formatMetricValue(metric, value)} (${trend})\n`;
    }

    report += `\n## Strengths\n`;
    latest.strengths.forEach(strength => {
      report += `- ${strength}\n`;
    });

    report += `\n## Areas for Improvement\n`;
    latest.weaknesses.forEach(weakness => {
      report += `- ${weakness}\n`;
    });

    report += `\n## Recommendations\n`;
    latest.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });

    return report;
  }

  /**
   * Calculate individual metrics
   */
  private calculateMetrics(
    performanceData: TemplatePerformanceData[],
    usageData: {
      totalDownloads: number;
      successfulSetups: number;
      errorReports: number;
      userRatings: number[];
      documentationViews: number;
      maintenanceEvents: number;
    }
  ): SuccessMetrics {
    const totalAttempts = Math.max(1, usageData.totalDownloads);
    
    return {
      adoptionRate: usageData.totalDownloads > 0 ? Math.min(1, usageData.totalDownloads / 1000) : 0,
      completionRate: usageData.successfulSetups / totalAttempts,
      errorFrequency: usageData.errorReports / totalAttempts,
      userSatisfaction: usageData.userRatings.length > 0 
        ? usageData.userRatings.reduce((a, b) => a + b, 0) / usageData.userRatings.length 
        : 0,
      performanceScore: performanceData.length > 0 
        ? performanceData.reduce((sum, p) => sum + p.successIndicators.performanceScore, 0) / performanceData.length 
        : 0,
      maintainabilityScore: this.calculateMaintainabilityScore(usageData.maintenanceEvents, usageData.totalDownloads),
      securityScore: this.calculateSecurityScore(performanceData),
      documentationScore: this.calculateDocumentationScore(usageData.documentationViews, usageData.totalDownloads)
    };
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(metrics: SuccessMetrics): number {
    let totalScore = 0;

    for (const [metric, value] of Object.entries(metrics)) {
      const weight = this.weightConfig[metric as keyof SuccessMetrics];
      const normalizedValue = this.normalizeMetricValue(metric as keyof SuccessMetrics, value);
      totalScore += normalizedValue * weight;
    }

    return Math.round(totalScore * 100);
  }

  /**
   * Normalize metric values to 0-1 scale
   */
  private normalizeMetricValue(metric: keyof SuccessMetrics, value: number): number {
    switch (metric) {
      case 'adoptionRate':
      case 'completionRate':
        return Math.min(1, value);
      case 'errorFrequency':
        return Math.max(0, 1 - value); // Lower is better
      case 'userSatisfaction':
        return Math.min(1, value / 5); // Assuming 5-star rating
      case 'performanceScore':
      case 'maintainabilityScore':
      case 'securityScore':
      case 'documentationScore':
        return Math.min(1, value / 100); // Assuming 0-100 scale
      default:
        return Math.min(1, value);
    }
  }

  /**
   * Determine rank based on score
   */
  private determineRank(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'fair';
    return 'poor';
  }

  /**
   * Analyze template and provide insights
   */
  private analyzeTemplate(metrics: SuccessMetrics, framework: string): {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze each metric
    if (metrics.adoptionRate > 0.8) {
      strengths.push('High adoption rate indicates strong market appeal');
    } else if (metrics.adoptionRate < 0.3) {
      weaknesses.push('Low adoption rate suggests limited market appeal');
      recommendations.push('Improve marketing and discoverability');
    }

    if (metrics.completionRate > 0.9) {
      strengths.push('Excellent completion rate shows reliable setup process');
    } else if (metrics.completionRate < 0.7) {
      weaknesses.push('Low completion rate indicates setup difficulties');
      recommendations.push('Simplify setup process and improve documentation');
    }

    if (metrics.errorFrequency < 0.05) {
      strengths.push('Low error frequency demonstrates high reliability');
    } else if (metrics.errorFrequency > 0.15) {
      weaknesses.push('High error frequency impacts user experience');
      recommendations.push('Investigate and fix common error patterns');
    }

    if (metrics.userSatisfaction > 4.0) {
      strengths.push('High user satisfaction indicates quality template');
    } else if (metrics.userSatisfaction < 3.0) {
      weaknesses.push('Low user satisfaction requires immediate attention');
      recommendations.push('Gather user feedback and address pain points');
    }

    if (metrics.performanceScore > 85) {
      strengths.push('Excellent performance meets industry standards');
    } else if (metrics.performanceScore < 60) {
      weaknesses.push('Poor performance affects user experience');
      recommendations.push('Optimize build times and bundle sizes');
    }

    return { strengths, weaknesses, recommendations };
  }

  /**
   * Calculate trend for a metric
   */
  private calculateTrend(
    scores: TemplateSuccessScore[], 
    metric: keyof SuccessMetrics,
    lowerIsBetter: boolean = false
  ): 'improving' | 'stable' | 'declining' {
    if (scores.length < 2) return 'stable';

    const recent = scores.slice(-3);
    const values = recent.map(s => s.metrics[metric]);
    
    const trend = this.linearTrend(values);
    const threshold = 0.1;

    if (lowerIsBetter) {
      if (trend < -threshold) return 'improving';
      if (trend > threshold) return 'declining';
    } else {
      if (trend > threshold) return 'improving';
      if (trend < -threshold) return 'declining';
    }

    return 'stable';
  }

  /**
   * Calculate linear trend
   */
  private linearTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  /**
   * Calculate maintainability score
   */
  private calculateMaintainabilityScore(maintenanceEvents: number, totalDownloads: number): number {
    if (totalDownloads === 0) return 50;
    
    const maintenanceRatio = maintenanceEvents / totalDownloads;
    return Math.max(0, Math.min(100, 100 - (maintenanceRatio * 1000)));
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(performanceData: TemplatePerformanceData[]): number {
    // Simplified security score based on error rates and setup success
    if (performanceData.length === 0) return 70;

    const avgErrorRate = performanceData.reduce((sum, p) => sum + p.metrics.errorRate, 0) / performanceData.length;
    const avgSetupSuccess = performanceData.reduce((sum, p) => sum + (p.successIndicators.setupSuccess ? 1 : 0), 0) / performanceData.length;

    return Math.round(70 + (avgSetupSuccess * 20) - (avgErrorRate * 200));
  }

  /**
   * Calculate documentation score
   */
  private calculateDocumentationScore(documentationViews: number, totalDownloads: number): number {
    if (totalDownloads === 0) return 50;
    
    const viewRatio = documentationViews / totalDownloads;
    return Math.min(100, Math.max(0, viewRatio * 100));
  }

  /**
   * Initialize framework benchmarks
   */
  private initializeBenchmarks(): void {
    const frameworks = ['nextjs', 'flutter', 'react-native', 'tauri', 'sveltekit'];
    
    frameworks.forEach(framework => {
      this.benchmarks.set(framework, {
        framework,
        category: 'web-mobile',
        averageScores: {
          adoptionRate: 0.7,
          completionRate: 0.85,
          errorFrequency: 0.08,
          userSatisfaction: 4.2,
          performanceScore: 78,
          maintainabilityScore: 82,
          securityScore: 85,
          documentationScore: 75
        },
        topPerformers: [],
        commonIssues: ['Setup complexity', 'Documentation gaps', 'Performance optimization'],
        industryStandards: {
          setupTime: 300000, // 5 minutes
          buildTime: 180000, // 3 minutes
          testCoverage: 80
        }
      });
    });
  }

  /**
   * Format metric name for display
   */
  private formatMetricName(metric: string): string {
    return metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  /**
   * Format metric value for display
   */
  private formatMetricValue(metric: string, value: number): string {
    switch (metric) {
      case 'adoptionRate':
      case 'completionRate':
      case 'errorFrequency':
        return `${(value * 100).toFixed(1)}%`;
      case 'userSatisfaction':
        return `${value.toFixed(1)}/5.0`;
      default:
        return `${Math.round(value)}`;
    }
  }
}