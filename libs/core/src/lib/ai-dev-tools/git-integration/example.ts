/**
 * @fileoverview Git Integration Usage Examples
 * Example implementations for AC2: Git Platform Integration
 */

import { 
  GitPlatformService,
  createGitPlatformService,
  createGitHubConfig,
  createGitLabConfig,
  isPullRequestEvent,
  isApproved,
  hasSecurityIssues,
  GIT_PLATFORM_EVENTS
} from './index';

/**
 * Example 1: Setting up GitHub integration with webhook support
 */
export async function setupGitHubIntegration() {
  // Create GitHub configuration
  const githubConfig = createGitHubConfig('your-github-token', 'your-org');
  
  // Create git platform service
  const gitService = createGitPlatformService([githubConfig]);
  
  // Set up event listeners
  gitService.on(GIT_PLATFORM_EVENTS.SERVICE_INITIALIZED, () => {
    console.log('✅ Git platform service initialized');
  });
  
  gitService.on(GIT_PLATFORM_EVENTS.WEBHOOK_RECEIVED, (event) => {
    console.log(`📥 Webhook received: ${event.type} from ${event.platform}`);
  });
  
  gitService.on(GIT_PLATFORM_EVENTS.REVIEW_COMPLETED, ({ pullRequestId, result }) => {
    console.log(`🔍 Review completed for PR ${pullRequestId}: ${result.overall.status}`);
    
    if (isApproved(result)) {
      console.log('✅ Pull request approved');
    } else if (hasSecurityIssues(result)) {
      console.log('🔒 Security issues found, blocking merge');
    }
  });
  
  // Initialize the service
  await gitService.initialize();
  
  return gitService;
}

/**
 * Example 2: Multi-platform setup (GitHub + GitLab)
 */
export async function setupMultiPlatformIntegration() {
  // Create configurations for multiple platforms
  const githubConfig = createGitHubConfig('github-token', 'github-org');
  const gitlabConfig = createGitLabConfig('gitlab-token', 'https://gitlab.company.com/api/v4');
  
  // Create service with multiple platforms
  const gitService = createGitPlatformService([githubConfig, gitlabConfig]);
  
  // Set up webhook handling
  gitService.on(GIT_PLATFORM_EVENTS.WEBHOOK_RECEIVED, async (event) => {
    if (isPullRequestEvent(event)) {
      console.log(`🔄 Processing pull request from ${event.platform}`);
      
      // The service will automatically trigger code review
      // based on the webhook event
    }
  });
  
  // Handle review results
  gitService.on(GIT_PLATFORM_EVENTS.REVIEW_COMPLETED, async ({ pullRequestId, result }) => {
    // Post results as comments
    if (result.suggestions.length > 0) {
      console.log(`💡 Found ${result.suggestions.length} suggestions for PR ${pullRequestId}`);
    }
    
    // Update commit status
    const status = isApproved(result) ? 'success' : 'failure';
    console.log(`📊 Setting commit status to: ${status}`);
  });
  
  await gitService.initialize();
  return gitService;
}

/**
 * Example 3: Manual code review without webhooks
 */
export async function performManualCodeReview() {
  const githubConfig = createGitHubConfig('your-token');
  githubConfig.enableWebhooks = false; // Disable automatic webhooks
  
  const gitService = createGitPlatformService([githubConfig]);
  await gitService.initialize();
  
  // Manually trigger code review for a specific PR
  const reviewRequest = {
    pullRequestId: '123',
    repositoryId: 'owner/repo',
    baseBranch: 'main',
    headBranch: 'feature/new-feature',
    files: [], // Will be fetched automatically
    author: {
      id: '1',
      username: 'developer',
      type: 'user' as const
    },
    reviewers: [],
    options: {
      includeSecurityCheck: true,
      includePerformanceCheck: true,
      includeStyleCheck: true,
      includeTestCoverage: true,
      aiReviewLevel: 'comprehensive' as const
    }
  };
  
  // Perform the review
  const result = await gitService.reviewPullRequest(reviewRequest);
  
  console.log('📋 Review Results:');
  console.log(`   Score: ${result.overall.score}/100`);
  console.log(`   Status: ${result.overall.status}`);
  console.log(`   Security Issues: ${result.securityIssues.length}`);
  console.log(`   Performance Issues: ${result.performanceIssues.length}`);
  console.log(`   Test Coverage: ${result.testCoverage.overall}%`);
  
  return result;
}

/**
 * Example 4: Repository management
 */
export async function manageRepositories() {
  const githubConfig = createGitHubConfig('your-token');
  const gitService = createGitPlatformService([githubConfig]);
  await gitService.initialize();
  
  // Get all repositories
  const repositories = await gitService.getRepositories('github');
  console.log(`📂 Found ${repositories.length} repositories`);
  
  // Get merge requests for a specific repository
  const repoId = repositories[0]?.id;
  if (repoId) {
    const openPRs = await gitService.getMergeRequests('github', repoId, 'open');
    console.log(`📋 Found ${openPRs.length} open pull requests`);
    
    // Set up branch protection
    await gitService.updateCommitStatus('github', repoId, 'commit-sha', {
      state: 'success',
      context: 'ai-code-review',
      description: 'AI code review passed',
      targetUrl: 'https://your-dashboard.com/reviews/123'
    });
  }
}

/**
 * Example 5: Webhook server integration
 */
export async function webhookServerExample() {
  const githubConfig = createGitHubConfig('your-token');
  githubConfig.webhookSecret = 'your-webhook-secret';
  
  const gitService = createGitPlatformService([githubConfig]);
  
  // The service will start a webhook server automatically
  gitService.on(GIT_PLATFORM_EVENTS.WEBHOOKS_STARTED, ({ port }) => {
    console.log(`🌐 Webhook server started on port ${port}`);
    console.log(`📡 Configure your GitHub webhook to: http://your-server.com:${port}/webhooks`);
  });
  
  // Handle different types of webhook events
  gitService.on(GIT_PLATFORM_EVENTS.PUSH_DETECTED, ({ repository, commits, branch }) => {
    console.log(`📤 Push detected: ${commits.length} commits to ${branch} in ${repository.name}`);
  });
  
  gitService.on(GIT_PLATFORM_EVENTS.ISSUE_ACTIVITY, ({ action, issue, repository }) => {
    console.log(`🐛 Issue ${action}: "${issue.title}" in ${repository.name}`);
  });
  
  gitService.on(GIT_PLATFORM_EVENTS.RELEASE_ACTIVITY, ({ action, release, repository }) => {
    console.log(`🚀 Release ${action}: ${release.tag_name} in ${repository.name}`);
  });
  
  await gitService.initialize();
  return gitService;
}

/**
 * Example 6: Custom review rules and auto-fixes
 */
export async function customReviewConfiguration() {
  const githubConfig = createGitHubConfig('your-token');
  
  const gitService = new GitPlatformService({
    platforms: [githubConfig],
    enableAutoReview: true,
    enableAutoFix: true, // Enable automatic fixes
    reviewSettings: {
      includeSecurityCheck: true,
      includePerformanceCheck: true,
      includeStyleCheck: true,
      includeTestCoverage: true,
      aiReviewLevel: 'comprehensive'
    },
    webhookConfig: {
      port: 3001,
      path: '/webhooks',
      enableSignatureValidation: true
    },
    metrics: {
      enableTracking: true,
      retentionDays: 90 // Keep metrics for 90 days
    }
  });
  
  // Track review metrics
  gitService.on(GIT_PLATFORM_EVENTS.REVIEW_COMPLETED, () => {
    const metrics = gitService.getMetrics();
    console.log(`📊 Review Metrics:`, {
      totalReviews: metrics.reviewsCompleted,
      avgReviewTime: `${Math.round(metrics.averageReviewTime / 1000)}s`,
      securityIssuesFound: metrics.securityIssuesFound,
      autoFixesApplied: metrics.autoFixesApplied,
      humanReviewsRecommended: metrics.humanReviewsRecommended
    });
  });
  
  await gitService.initialize();
  return gitService;
}

/**
 * Example 7: Error handling and monitoring
 */
export async function errorHandlingExample() {
  const githubConfig = createGitHubConfig('your-token');
  const gitService = createGitPlatformService([githubConfig]);
  
  // Set up comprehensive error handling
  gitService.on(GIT_PLATFORM_EVENTS.SERVICE_ERROR, ({ error }) => {
    console.error('❌ Service error:', error);
  });
  
  gitService.on(GIT_PLATFORM_EVENTS.WEBHOOK_ERROR, ({ error, event }) => {
    console.error('❌ Webhook processing error:', error);
    console.error('   Event:', event?.type, 'from', event?.platform);
  });
  
  gitService.on(GIT_PLATFORM_EVENTS.REVIEW_ERROR, ({ pullRequestId, error }) => {
    console.error(`❌ Review failed for PR ${pullRequestId}:`, error);
  });
  
  // Monitor platform connections
  gitService.on(GIT_PLATFORM_EVENTS.PLATFORM_CONNECTED, ({ platform }) => {
    console.log(`✅ Connected to ${platform}`);
  });
  
  gitService.on(GIT_PLATFORM_EVENTS.PLATFORM_DISCONNECTED, ({ platform }) => {
    console.log(`❌ Disconnected from ${platform}`);
  });
  
  try {
    await gitService.initialize();
    return gitService;
  } catch (error) {
    console.error('❌ Failed to initialize git service:', error);
    throw error;
  }
}

/**
 * Example 8: Integration with existing CI/CD pipeline
 */
export async function cicdIntegrationExample() {
  const githubConfig = createGitHubConfig(process.env.GITHUB_TOKEN!);
  const gitService = createGitPlatformService([githubConfig]);
  
  // Set up CI/CD integration
  gitService.on(GIT_PLATFORM_EVENTS.WORKFLOW_ACTIVITY, ({ workflow, repository, conclusion }) => {
    console.log(`🔧 Workflow "${workflow.name}" in ${repository.name}: ${conclusion}`);
    
    if (conclusion === 'success') {
      // Trigger additional analysis on successful builds
      console.log('✅ Build successful, running additional code analysis');
    } else if (conclusion === 'failure') {
      console.log('❌ Build failed, skipping code review');
    }
  });
  
  // Custom status updates for CI/CD
  gitService.on(GIT_PLATFORM_EVENTS.REVIEW_COMPLETED, async ({ pullRequestId, result }) => {
    const repoId = 'owner/repo'; // Would get from PR context
    const commitSha = 'commit-sha'; // Would get from PR context
    
    // Update multiple status checks
    await gitService.updateCommitStatus('github', repoId, commitSha, {
      state: isApproved(result) ? 'success' : 'failure',
      context: 'ai-code-review/security',
      description: `Security: ${result.securityIssues.length} issues found`
    });
    
    await gitService.updateCommitStatus('github', repoId, commitSha, {
      state: result.testCoverage.meetThreshold ? 'success' : 'failure',
      context: 'ai-code-review/coverage',
      description: `Coverage: ${result.testCoverage.overall}%`
    });
  });
  
  await gitService.initialize();
  return gitService;
}

// Export all examples for easy testing
export const examples = {
  setupGitHubIntegration,
  setupMultiPlatformIntegration,
  performManualCodeReview,
  manageRepositories,
  webhookServerExample,
  customReviewConfiguration,
  errorHandlingExample,
  cicdIntegrationExample
};