/**
 * @fileoverview Git Integration Types
 * Type definitions for AC2: Git Platform Integration
 */

export interface GitWebhookEvent {
  id: string;
  type: 'push' | 'pull_request' | 'issue' | 'release' | 'workflow_run';
  repository: GitRepository;
  sender: GitUser;
  payload: any;
  timestamp: number;
  platform: 'github' | 'gitlab' | 'bitbucket' | 'azure_devops';
  signature?: string;
}

export interface CodeReviewRequest {
  pullRequestId: string;
  repositoryId: string;
  baseBranch: string;
  headBranch: string;
  files: ChangedFile[];
  author: GitUser;
  reviewers: GitUser[];
  options?: CodeReviewOptions;
}

export interface CodeReviewOptions {
  includeSecurityCheck?: boolean;
  includePerformanceCheck?: boolean;
  includeStyleCheck?: boolean;
  includeTestCoverage?: boolean;
  aiReviewLevel?: 'basic' | 'standard' | 'comprehensive';
  customRules?: ReviewRule[];
}

export interface CodeAnalysisResult {
  pullRequestId: string;
  overall: {
    score: number;
    status: 'approved' | 'needs_changes' | 'rejected';
    summary: string;
  };
  files: FileAnalysisResult[];
  suggestions: ReviewSuggestion[];
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
  testCoverage: TestCoverageReport;
  metrics: ReviewMetrics;
}

export interface PlatformConfig {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'azure_devops';
  apiUrl: string;
  token: string;
  webhookSecret?: string;
  organization?: string;
  enableWebhooks: boolean;
  enableCodeReview: boolean;
  reviewSettings: CodeReviewOptions;
}

export interface GitRepository {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  language: string;
  url: string;
  cloneUrl: string;
  owner: GitUser;
}

export interface GitUser {
  id: string;
  username: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  type: 'user' | 'bot' | 'organization';
}

export interface ChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
  language?: string;
}

export interface FileAnalysisResult {
  filename: string;
  score: number;
  issues: FileIssue[];
  suggestions: string[];
  complexity: number;
  quality: number;
  testability: number;
  maintainability: number;
}

export interface ReviewSuggestion {
  id: string;
  type: 'improvement' | 'bug_risk' | 'security' | 'performance' | 'style';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
  autoFixable: boolean;
  confidence: number;
}

export interface SecurityIssue {
  id: string;
  type: 'vulnerability' | 'secret' | 'injection' | 'authentication' | 'authorization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  file: string;
  line: number;
  cwe?: string;
  recommendation: string;
  references: string[];
}

export interface PerformanceIssue {
  id: string;
  type: 'memory' | 'cpu' | 'io' | 'database' | 'network';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  file: string;
  line?: number;
  impact: string;
  suggestion: string;
  estimatedImprovement?: string;
}

export interface TestCoverageReport {
  overall: number;
  files: FileCoverageReport[];
  branches: number;
  functions: number;
  lines: number;
  statements: number;
  threshold: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
  meetThreshold: boolean;
}

export interface FileCoverageReport {
  filename: string;
  coverage: number;
  lines: {
    total: number;
    covered: number;
    uncovered: number[];
  };
  branches: {
    total: number;
    covered: number;
  };
  functions: {
    total: number;
    covered: number;
  };
}

export interface ReviewMetrics {
  totalFiles: number;
  linesAdded: number;
  linesDeleted: number;
  complexity: number;
  reviewTime: number;
  aiConfidence: number;
  humanReviewRecommended: boolean;
}

export interface FileIssue {
  type: 'error' | 'warning' | 'info';
  line: number;
  column?: number;
  message: string;
  rule: string;
  category: 'syntax' | 'style' | 'complexity' | 'security' | 'performance';
  autoFixable: boolean;
}

export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  category: 'style' | 'security' | 'performance' | 'complexity' | 'testing';
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  pattern?: string;
  customCheck?: (code: string, filename: string) => FileIssue[];
}

export interface WebhookHandler {
  event: string;
  handler: (event: GitWebhookEvent) => Promise<void>;
}

export interface PullRequestComment {
  id: string;
  body: string;
  user: GitUser;
  path?: string;
  line?: number;
  position?: number;
  commitSha?: string;
  createdAt: string;
  updatedAt: string;
  reactions?: {
    total: number;
    laugh: number;
    confused: number;
    heart: number;
    hooray: number;
    rocket: number;
    eyes: number;
  };
}

export interface CommitStatus {
  state: 'pending' | 'success' | 'failure' | 'error';
  targetUrl?: string;
  description?: string;
  context: string;
}

export interface BranchProtection {
  requiredStatusChecks?: {
    strict: boolean;
    contexts: string[];
  };
  enforceAdmins?: boolean;
  requiredPullRequestReviews?: {
    requiredApprovingReviewCount: number;
    dismissStaleReviews: boolean;
    requireCodeOwnerReviews: boolean;
  };
  restrictions?: {
    users: string[];
    teams: string[];
  };
}

export interface GitIntegrationMetrics {
  webhooksProcessed: number;
  reviewsCompleted: number;
  averageReviewTime: number;
  securityIssuesFound: number;
  performanceIssuesFound: number;
  autoFixesApplied: number;
  humanReviewsRecommended: number;
  falsePositives: number;
  accuracy: number;
}

export interface AutoFixSuggestion {
  id: string;
  type: 'format' | 'lint' | 'security' | 'performance';
  description: string;
  originalCode: string;
  fixedCode: string;
  confidence: number;
  safe: boolean;
  impact: 'low' | 'medium' | 'high';
}

export interface MergeRequest {
  id: string;
  title: string;
  description: string;
  state: 'open' | 'closed' | 'merged';
  sourceBranch: string;
  targetBranch: string;
  author: GitUser;
  assignees: GitUser[];
  reviewers: GitUser[];
  labels: string[];
  draft: boolean;
  mergeable: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
}