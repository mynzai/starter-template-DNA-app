/**
 * @fileoverview Git Integration Module
 * Exports for AC2: Git Platform Integration with webhooks and code review
 */

// Types first
export type {
  // Core webhook and event types
  GitWebhookEvent,
  WebhookHandler,
  
  // Code review types
  CodeReviewRequest,
  CodeReviewOptions,
  CodeAnalysisResult,
  FileAnalysisResult,
  ReviewSuggestion,
  SecurityIssue,
  PerformanceIssue,
  TestCoverageReport,
  FileCoverageReport,
  ReviewMetrics,
  FileIssue,
  ReviewRule,
  AutoFixSuggestion,
  
  // Platform configuration
  PlatformConfig,
  
  // Git platform types
  GitRepository,
  GitUser,
  ChangedFile,
  MergeRequest,
  PullRequestComment,
  CommitStatus,
  BranchProtection,
  
  // Integration metrics
  GitIntegrationMetrics
} from './types';

// Core services
export { GitPlatformService } from './git-platform-service';
export type { GitPlatformServiceConfig } from './git-platform-service';

export { CodeReviewService } from './code-review-service';
export type { CodeReviewConfig } from './code-review-service';

export { WebhookManager } from './webhook-manager';
export type { WebhookConfig, WebhookRequest, WebhookResponse } from './webhook-manager';

export { PlatformConnector } from './platform-connector';
export type { PlatformAPIResponse, PaginationOptions } from './platform-connector';

// Utility functions for creating configurations
export const createGitHubConfig = (token: string, organization?: string): PlatformConfig => ({
  platform: 'github',
  apiUrl: 'https://api.github.com',
  token,
  organization,
  enableWebhooks: true,
  enableCodeReview: true,
  reviewSettings: {
    includeSecurityCheck: true,
    includePerformanceCheck: true,
    includeStyleCheck: true,
    includeTestCoverage: true,
    aiReviewLevel: 'standard'
  }
});

export const createGitLabConfig = (token: string, apiUrl?: string): PlatformConfig => ({
  platform: 'gitlab',
  apiUrl: apiUrl || 'https://gitlab.com/api/v4',
  token,
  enableWebhooks: true,
  enableCodeReview: true,
  reviewSettings: {
    includeSecurityCheck: true,
    includePerformanceCheck: true,
    includeStyleCheck: true,
    includeTestCoverage: true,
    aiReviewLevel: 'standard'
  }
});

export const createBitbucketConfig = (token: string): PlatformConfig => ({
  platform: 'bitbucket',
  apiUrl: 'https://api.bitbucket.org/2.0',
  token,
  enableWebhooks: true,
  enableCodeReview: true,
  reviewSettings: {
    includeSecurityCheck: true,
    includePerformanceCheck: true,
    includeStyleCheck: true,
    includeTestCoverage: true,
    aiReviewLevel: 'standard'
  }
});

export const createAzureDevOpsConfig = (token: string, organization: string, apiUrl?: string): PlatformConfig => ({
  platform: 'azure_devops',
  apiUrl: apiUrl || 'https://dev.azure.com',
  token,
  organization,
  enableWebhooks: true,
  enableCodeReview: true,
  reviewSettings: {
    includeSecurityCheck: true,
    includePerformanceCheck: true,
    includeStyleCheck: true,
    includeTestCoverage: true,
    aiReviewLevel: 'standard'
  }
});

// Factory function for creating git platform service
export const createGitPlatformService = (platforms: PlatformConfig[]) => {
  const config = {
    platforms,
    enableAutoReview: true,
    enableAutoFix: false, // Conservative default
    reviewSettings: {
      includeSecurityCheck: true,
      includePerformanceCheck: true,
      includeStyleCheck: true,
      includeTestCoverage: true,
      aiReviewLevel: 'standard' as const
    },
    webhookConfig: {
      port: 3001,
      path: '/webhooks',
      enableSignatureValidation: true
    },
    metrics: {
      enableTracking: true,
      retentionDays: 30
    }
  };

  return new GitPlatformService(config);
};

// Webhook event type guards
export const isGitHubWebhook = (event: GitWebhookEvent): boolean => {
  return event.platform === 'github';
};

export const isGitLabWebhook = (event: GitWebhookEvent): boolean => {
  return event.platform === 'gitlab';
};

export const isBitbucketWebhook = (event: GitWebhookEvent): boolean => {
  return event.platform === 'bitbucket';
};

export const isAzureDevOpsWebhook = (event: GitWebhookEvent): boolean => {
  return event.platform === 'azure_devops';
};

export const isPullRequestEvent = (event: GitWebhookEvent): boolean => {
  return event.type === 'pull_request';
};

export const isPushEvent = (event: GitWebhookEvent): boolean => {
  return event.type === 'push';
};

export const isIssueEvent = (event: GitWebhookEvent): boolean => {
  return event.type === 'issue';
};

export const isReleaseEvent = (event: GitWebhookEvent): boolean => {
  return event.type === 'release';
};

export const isWorkflowEvent = (event: GitWebhookEvent): boolean => {
  return event.type === 'workflow_run';
};

// Review suggestion severity helpers
export const isCriticalSuggestion = (suggestion: ReviewSuggestion): boolean => {
  return suggestion.severity === 'critical';
};

export const isHighSeveritySuggestion = (suggestion: ReviewSuggestion): boolean => {
  return suggestion.severity === 'high';
};

export const isAutoFixableSuggestion = (suggestion: ReviewSuggestion): boolean => {
  return suggestion.autoFixable && suggestion.confidence > 0.8;
};

// Security issue helpers
export const isCriticalSecurityIssue = (issue: SecurityIssue): boolean => {
  return issue.severity === 'critical';
};

export const isHighSecurityIssue = (issue: SecurityIssue): boolean => {
  return issue.severity === 'high';
};

// Test coverage helpers
export const meetsTestCoverageThreshold = (coverage: TestCoverageReport): boolean => {
  return coverage.meetThreshold;
};

export const getCoverageGap = (coverage: TestCoverageReport): number => {
  const minThreshold = Math.min(
    coverage.threshold.lines,
    coverage.threshold.branches,
    coverage.threshold.functions,
    coverage.threshold.statements
  );
  return Math.max(0, minThreshold - coverage.overall);
};

// Code analysis result helpers
export const isApproved = (result: CodeAnalysisResult): boolean => {
  return result.overall.status === 'approved';
};

export const needsChanges = (result: CodeAnalysisResult): boolean => {
  return result.overall.status === 'needs_changes';
};

export const isRejected = (result: CodeAnalysisResult): boolean => {
  return result.overall.status === 'rejected';
};

export const hasSecurityIssues = (result: CodeAnalysisResult): boolean => {
  return result.securityIssues.length > 0;
};

export const hasPerformanceIssues = (result: CodeAnalysisResult): boolean => {
  return result.performanceIssues.length > 0;
};

export const requiresHumanReview = (result: CodeAnalysisResult): boolean => {
  return result.metrics.humanReviewRecommended;
};

// Git platform service event names
export const GIT_PLATFORM_EVENTS = {
  // Service lifecycle
  SERVICE_INITIALIZED: 'service:initialized',
  SERVICE_ERROR: 'service:error',
  SERVICE_SHUTDOWN: 'service:shutdown',
  
  // Platform connection
  PLATFORM_CONNECTED: 'platform:connected',
  PLATFORM_DISCONNECTED: 'platform:disconnected',
  
  // Webhook events
  WEBHOOKS_STARTED: 'webhooks:started',
  WEBHOOK_RECEIVED: 'webhook:received',
  WEBHOOK_ERROR: 'webhook:error',
  WEBHOOK_UNHANDLED: 'webhook:unhandled',
  
  // Code review events
  REVIEW_STARTED: 'review:started',
  REVIEW_PROGRESS: 'review:progress',
  REVIEW_COMPLETED: 'review:completed',
  REVIEW_ERROR: 'review:error',
  
  // Git operations
  COMMIT_STATUS_UPDATED: 'commit:status_updated',
  COMMENT_POSTED: 'comment:posted',
  BRANCH_PROTECTION_UPDATED: 'branch:protection_updated',
  WEBHOOK_CREATED: 'webhook:created',
  
  // Activity events
  PUSH_DETECTED: 'push:detected',
  ISSUE_ACTIVITY: 'issue:activity',
  RELEASE_ACTIVITY: 'release:activity',
  WORKFLOW_ACTIVITY: 'workflow:activity',
  
  // Metrics
  METRICS_RESET: 'metrics:reset'
} as const;

// Default configurations
export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  port: 3001,
  path: '/webhooks',
  enableSignatureValidation: true
};

export const DEFAULT_CODE_REVIEW_CONFIG: CodeReviewConfig = {
  aiProvider: 'openai',
  reviewDepth: 'standard',
  securityEnabled: true,
  performanceEnabled: true,
  styleEnabled: true,
  testCoverageEnabled: true,
  maxFilesPerReview: 50,
  maxLinesPerFile: 1000,
  parallelAnalysis: true
};

export const DEFAULT_GIT_PLATFORM_SERVICE_CONFIG = {
  platforms: [],
  enableAutoReview: true,
  enableAutoFix: false,
  reviewSettings: {
    includeSecurityCheck: true,
    includePerformanceCheck: true,
    includeStyleCheck: true,
    includeTestCoverage: true,
    aiReviewLevel: 'standard' as const
  },
  webhookConfig: DEFAULT_WEBHOOK_CONFIG,
  metrics: {
    enableTracking: true,
    retentionDays: 30
  }
};

/**
 * Version information for the git integration module
 */
export const GIT_INTEGRATION_VERSION = '1.0.0';

/**
 * Supported platforms
 */
export const SUPPORTED_PLATFORMS = ['github', 'gitlab', 'bitbucket', 'azure_devops'] as const;

/**
 * Supported webhook events
 */
export const SUPPORTED_WEBHOOK_EVENTS = ['pull_request', 'push', 'issue', 'release', 'workflow_run'] as const;

/**
 * Code review levels
 */
export const CODE_REVIEW_LEVELS = ['basic', 'standard', 'comprehensive'] as const;

/**
 * AI providers supported for code review
 */
export const SUPPORTED_AI_PROVIDERS = ['openai', 'anthropic', 'ollama'] as const;