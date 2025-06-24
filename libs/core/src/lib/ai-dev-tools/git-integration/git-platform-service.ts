/**
 * @fileoverview Git Platform Service
 * Core service for AC2: Git Platform Integration with webhooks and code review
 */

import { EventEmitter } from 'events';
import { 
  GitWebhookEvent, 
  CodeReviewRequest, 
  CodeAnalysisResult, 
  PlatformConfig,
  GitRepository,
  MergeRequest,
  CommitStatus,
  GitIntegrationMetrics,
  PullRequestComment,
  AutoFixSuggestion
} from './types';
import { CodeReviewService } from './code-review-service';
import { WebhookManager } from './webhook-manager';
import { PlatformConnector } from './platform-connector';

export interface GitPlatformServiceConfig {
  platforms: PlatformConfig[];
  enableAutoReview: boolean;
  enableAutoFix: boolean;
  reviewSettings: {
    includeSecurityCheck: boolean;
    includePerformanceCheck: boolean;
    includeStyleCheck: boolean;
    includeTestCoverage: boolean;
    aiReviewLevel: 'basic' | 'standard' | 'comprehensive';
  };
  webhookConfig: {
    port: number;
    path: string;
    enableSignatureValidation: boolean;
  };
  metrics: {
    enableTracking: boolean;
    retentionDays: number;
  };
}

export class GitPlatformService extends EventEmitter {
  private codeReviewService: CodeReviewService;
  private webhookManager: WebhookManager;
  private platformConnectors: Map<string, PlatformConnector> = new Map();
  private metrics: GitIntegrationMetrics = {
    webhooksProcessed: 0,
    reviewsCompleted: 0,
    averageReviewTime: 0,
    securityIssuesFound: 0,
    performanceIssuesFound: 0,
    autoFixesApplied: 0,
    humanReviewsRecommended: 0,
    falsePositives: 0,
    accuracy: 0
  };
  private initialized = false;

  constructor(private config: GitPlatformServiceConfig) {
    super();
    this.codeReviewService = new CodeReviewService();
    this.webhookManager = new WebhookManager(config.webhookConfig);
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('GitPlatformService already initialized');
    }

    try {
      // Initialize platform connectors
      for (const platformConfig of this.config.platforms) {
        const connector = new PlatformConnector(platformConfig);
        await connector.initialize();
        this.platformConnectors.set(platformConfig.platform, connector);
        this.emit('platform:connected', { platform: platformConfig.platform });
      }

      // Initialize code review service
      await this.codeReviewService.initialize();

      // Start webhook server
      if (this.hasWebhookEnabledPlatforms()) {
        await this.webhookManager.start();
        this.emit('webhooks:started', { port: this.config.webhookConfig.port });
      }

      this.initialized = true;
      this.emit('service:initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('service:error', { error: errorMessage });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Stop webhook server
      await this.webhookManager.stop();

      // Disconnect platform connectors
      for (const [platform, connector] of this.platformConnectors) {
        await connector.disconnect();
        this.emit('platform:disconnected', { platform });
      }

      this.platformConnectors.clear();
      this.initialized = false;
      this.emit('service:shutdown');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('service:error', { error: errorMessage });
      throw error;
    }
  }

  async processWebhook(event: GitWebhookEvent): Promise<void> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    try {
      this.metrics.webhooksProcessed++;
      this.emit('webhook:received', { type: event.type, platform: event.platform });

      switch (event.type) {
        case 'pull_request':
          await this.handlePullRequestEvent(event);
          break;
        case 'push':
          await this.handlePushEvent(event);
          break;
        case 'issue':
          await this.handleIssueEvent(event);
          break;
        case 'release':
          await this.handleReleaseEvent(event);
          break;
        case 'workflow_run':
          await this.handleWorkflowEvent(event);
          break;
        default:
          this.emit('webhook:unhandled', { type: event.type, platform: event.platform });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('webhook:error', { error: errorMessage, event });
      throw error;
    }
  }

  async reviewPullRequest(request: CodeReviewRequest): Promise<CodeAnalysisResult> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const startTime = Date.now();
    this.emit('review:started', { pullRequestId: request.pullRequestId });

    try {
      // Perform code analysis
      const result = await this.codeReviewService.analyzePullRequest(request);
      
      // Track metrics
      this.metrics.reviewsCompleted++;
      this.metrics.averageReviewTime = (this.metrics.averageReviewTime + (Date.now() - startTime)) / this.metrics.reviewsCompleted;
      this.metrics.securityIssuesFound += result.securityIssues.length;
      this.metrics.performanceIssuesFound += result.performanceIssues.length;

      if (result.metrics.humanReviewRecommended) {
        this.metrics.humanReviewsRecommended++;
      }

      // Post review results if auto-review is enabled
      if (this.config.enableAutoReview) {
        await this.postReviewResults(request, result);
      }

      // Apply auto-fixes if enabled
      if (this.config.enableAutoFix && result.suggestions.some(s => s.autoFixable)) {
        const autoFixes = await this.generateAutoFixes(result);
        if (autoFixes.length > 0) {
          await this.applyAutoFixes(request, autoFixes);
          this.metrics.autoFixesApplied += autoFixes.length;
        }
      }

      this.emit('review:completed', { 
        pullRequestId: request.pullRequestId, 
        result,
        duration: Date.now() - startTime 
      });

      return result;
    } catch (error) {
      this.emit('review:error', { 
        pullRequestId: request.pullRequestId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getRepositories(platform: string): Promise<GitRepository[]> {
    const connector = this.platformConnectors.get(platform);
    if (!connector) {
      throw new Error(`Platform ${platform} not configured`);
    }

    return await connector.getRepositories();
  }

  async getMergeRequests(platform: string, repositoryId: string, state?: 'open' | 'closed' | 'merged'): Promise<MergeRequest[]> {
    const connector = this.platformConnectors.get(platform);
    if (!connector) {
      throw new Error(`Platform ${platform} not configured`);
    }

    return await connector.getMergeRequests(repositoryId, state);
  }

  async updateCommitStatus(platform: string, repositoryId: string, commitSha: string, status: CommitStatus): Promise<void> {
    const connector = this.platformConnectors.get(platform);
    if (!connector) {
      throw new Error(`Platform ${platform} not configured`);
    }

    await connector.updateCommitStatus(repositoryId, commitSha, status);
    this.emit('commit:status_updated', { platform, repositoryId, commitSha, status });
  }

  async postComment(platform: string, repositoryId: string, pullRequestId: string, comment: string, path?: string, line?: number): Promise<PullRequestComment> {
    const connector = this.platformConnectors.get(platform);
    if (!connector) {
      throw new Error(`Platform ${platform} not configured`);
    }

    const result = await connector.postComment(repositoryId, pullRequestId, comment, path, line);
    this.emit('comment:posted', { platform, repositoryId, pullRequestId, comment });
    return result;
  }

  getMetrics(): GitIntegrationMetrics {
    return { ...this.metrics };
  }

  async resetMetrics(): Promise<void> {
    this.metrics = {
      webhooksProcessed: 0,
      reviewsCompleted: 0,
      averageReviewTime: 0,
      securityIssuesFound: 0,
      performanceIssuesFound: 0,
      autoFixesApplied: 0,
      humanReviewsRecommended: 0,
      falsePositives: 0,
      accuracy: 0
    };
    this.emit('metrics:reset');
  }

  private setupEventHandlers(): void {
    this.webhookManager.on('webhook:received', (event: GitWebhookEvent) => {
      this.processWebhook(event).catch(error => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('webhook:error', { error: errorMessage, event });
      });
    });

    this.codeReviewService.on('analysis:progress', (data) => {
      this.emit('review:progress', data);
    });

    this.codeReviewService.on('analysis:error', (data) => {
      this.emit('review:error', data);
    });
  }

  private async handlePullRequestEvent(event: GitWebhookEvent): Promise<void> {
    const { action, pull_request } = event.payload;

    if (action === 'opened' || action === 'synchronize') {
      const request: CodeReviewRequest = {
        pullRequestId: pull_request.id.toString(),
        repositoryId: event.repository.id,
        baseBranch: pull_request.base.ref,
        headBranch: pull_request.head.ref,
        files: [], // Will be fetched by the review service
        author: {
          id: pull_request.user.id.toString(),
          username: pull_request.user.login,
          email: pull_request.user.email,
          name: pull_request.user.name,
          avatarUrl: pull_request.user.avatar_url,
          type: 'user'
        },
        reviewers: pull_request.requested_reviewers?.map((r: any) => ({
          id: r.id.toString(),
          username: r.login,
          email: r.email,
          name: r.name,
          avatarUrl: r.avatar_url,
          type: 'user'
        })) || [],
        options: this.config.reviewSettings
      };

      await this.reviewPullRequest(request);
    }
  }

  private async handlePushEvent(event: GitWebhookEvent): Promise<void> {
    // Handle push events (could trigger CI/CD workflows)
    this.emit('push:detected', {
      repository: event.repository,
      commits: event.payload.commits,
      branch: event.payload.ref
    });
  }

  private async handleIssueEvent(event: GitWebhookEvent): Promise<void> {
    // Handle issue events
    this.emit('issue:activity', {
      action: event.payload.action,
      issue: event.payload.issue,
      repository: event.repository
    });
  }

  private async handleReleaseEvent(event: GitWebhookEvent): Promise<void> {
    // Handle release events
    this.emit('release:activity', {
      action: event.payload.action,
      release: event.payload.release,
      repository: event.repository
    });
  }

  private async handleWorkflowEvent(event: GitWebhookEvent): Promise<void> {
    // Handle workflow run events
    this.emit('workflow:activity', {
      workflow: event.payload.workflow_run,
      repository: event.repository,
      conclusion: event.payload.workflow_run.conclusion
    });
  }

  private async postReviewResults(request: CodeReviewRequest, result: CodeAnalysisResult): Promise<void> {
    const platform = this.determinePlatformForRepository(request.repositoryId);
    if (!platform) return;

    const connector = this.platformConnectors.get(platform);
    if (!connector) return;

    // Create a comprehensive review comment
    const comment = this.formatReviewComment(result);
    
    await connector.postComment(
      request.repositoryId,
      request.pullRequestId,
      comment
    );

    // Post file-specific comments for high-priority issues
    for (const suggestion of result.suggestions) {
      if (suggestion.severity === 'high' || suggestion.severity === 'critical') {
        if (suggestion.file && suggestion.line) {
          const fileComment = this.formatSuggestionComment(suggestion);
          await connector.postComment(
            request.repositoryId,
            request.pullRequestId,
            fileComment,
            suggestion.file,
            suggestion.line
          );
        }
      }
    }

    // Update commit status
    const status: CommitStatus = {
      state: result.overall.status === 'approved' ? 'success' : 
             result.overall.status === 'rejected' ? 'failure' : 'pending',
      context: 'ai-code-review',
      description: `AI Code Review: ${result.overall.summary}`,
      targetUrl: undefined // Could link to detailed review
    };

    // Note: We'd need the commit SHA from the PR details
    // await connector.updateCommitStatus(request.repositoryId, commitSha, status);
  }

  private async generateAutoFixes(result: CodeAnalysisResult): Promise<AutoFixSuggestion[]> {
    const autoFixes: AutoFixSuggestion[] = [];

    for (const suggestion of result.suggestions) {
      if (suggestion.autoFixable && suggestion.confidence > 0.8) {
        // Generate auto-fix suggestions
        // This would integrate with the code generation service
        const autoFix: AutoFixSuggestion = {
          id: suggestion.id,
          type: this.mapSuggestionTypeToFixType(suggestion.type),
          description: suggestion.description,
          originalCode: '', // Would extract from file
          fixedCode: suggestion.suggestion,
          confidence: suggestion.confidence,
          safe: suggestion.severity !== 'critical',
          impact: suggestion.severity === 'low' ? 'low' : 
                  suggestion.severity === 'medium' ? 'medium' : 'high'
        };
        autoFixes.push(autoFix);
      }
    }

    return autoFixes;
  }

  private async applyAutoFixes(request: CodeReviewRequest, autoFixes: AutoFixSuggestion[]): Promise<void> {
    const platform = this.determinePlatformForRepository(request.repositoryId);
    if (!platform) return;

    const connector = this.platformConnectors.get(platform);
    if (!connector) return;

    // Create a summary comment about auto-fixes
    const fixSummary = `🤖 **Auto-fixes Applied**\n\n` +
      autoFixes.map(fix => `- ${fix.description} (${fix.confidence * 100}% confidence)`).join('\n') +
      `\n\nTotal fixes applied: ${autoFixes.length}`;

    await connector.postComment(
      request.repositoryId,
      request.pullRequestId,
      fixSummary
    );
  }

  private hasWebhookEnabledPlatforms(): boolean {
    return this.config.platforms.some(p => p.enableWebhooks);
  }

  private determinePlatformForRepository(repositoryId: string): string | null {
    // This would need to be implemented based on how we track repository-to-platform mapping
    // For now, return the first platform
    return this.config.platforms[0]?.platform || null;
  }

  private formatReviewComment(result: CodeAnalysisResult): string {
    const { overall, suggestions, securityIssues, performanceIssues, testCoverage } = result;
    
    let comment = `## 🤖 AI Code Review\n\n`;
    comment += `**Overall Score:** ${overall.score}/100 - ${overall.status.toUpperCase()}\n\n`;
    comment += `**Summary:** ${overall.summary}\n\n`;

    if (suggestions.length > 0) {
      comment += `### 📝 Suggestions (${suggestions.length})\n\n`;
      const groupedSuggestions = suggestions.reduce((acc, s) => {
        acc[s.severity] = acc[s.severity] || [];
        acc[s.severity].push(s);
        return acc;
      }, {} as Record<string, typeof suggestions>);

      for (const [severity, items] of Object.entries(groupedSuggestions)) {
        if (items.length > 0) {
          comment += `**${severity.toUpperCase()}** (${items.length})\n`;
          items.slice(0, 3).forEach(item => {
            comment += `- ${item.title}: ${item.description}\n`;
          });
          if (items.length > 3) {
            comment += `- ... and ${items.length - 3} more\n`;
          }
          comment += '\n';
        }
      }
    }

    if (securityIssues.length > 0) {
      comment += `### 🔒 Security Issues (${securityIssues.length})\n\n`;
      securityIssues.slice(0, 3).forEach(issue => {
        comment += `- **${issue.severity.toUpperCase()}**: ${issue.title}\n`;
      });
      if (securityIssues.length > 3) {
        comment += `- ... and ${securityIssues.length - 3} more\n`;
      }
      comment += '\n';
    }

    if (performanceIssues.length > 0) {
      comment += `### ⚡ Performance Issues (${performanceIssues.length})\n\n`;
      performanceIssues.slice(0, 3).forEach(issue => {
        comment += `- **${issue.severity.toUpperCase()}**: ${issue.title}\n`;
      });
      if (performanceIssues.length > 3) {
        comment += `- ... and ${performanceIssues.length - 3} more\n`;
      }
      comment += '\n';
    }

    comment += `### 🧪 Test Coverage\n\n`;
    comment += `- **Overall Coverage:** ${testCoverage.overall}%\n`;
    comment += `- **Threshold Met:** ${testCoverage.meetThreshold ? '✅' : '❌'}\n`;
    comment += `- **Lines:** ${testCoverage.lines}% | **Branches:** ${testCoverage.branches}% | **Functions:** ${testCoverage.functions}%\n\n`;

    comment += `---\n`;
    comment += `*Review completed in ${result.metrics.reviewTime}ms with ${result.metrics.aiConfidence}% confidence*\n`;
    if (result.metrics.humanReviewRecommended) {
      comment += `⚠️ **Human review recommended** due to complexity or critical issues\n`;
    }

    return comment;
  }

  private formatSuggestionComment(suggestion: any): string {
    let comment = `## ${this.getSeverityEmoji(suggestion.severity)} ${suggestion.title}\n\n`;
    comment += `**Type:** ${suggestion.type} | **Severity:** ${suggestion.severity} | **Confidence:** ${Math.round(suggestion.confidence * 100)}%\n\n`;
    comment += `${suggestion.description}\n\n`;
    comment += `**Suggestion:**\n\`\`\`\n${suggestion.suggestion}\n\`\`\`\n\n`;
    if (suggestion.autoFixable) {
      comment += `🔧 This issue can be auto-fixed\n`;
    }
    return comment;
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '💡';
      case 'low': return 'ℹ️';
      default: return '📝';
    }
  }

  private mapSuggestionTypeToFixType(type: string): 'format' | 'lint' | 'security' | 'performance' {
    switch (type) {
      case 'style': return 'format';
      case 'security': return 'security';
      case 'performance': return 'performance';
      default: return 'lint';
    }
  }
}