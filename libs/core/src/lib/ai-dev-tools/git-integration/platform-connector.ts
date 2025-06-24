/**
 * @fileoverview Platform Connector
 * Unified interface for connecting to different Git platforms (GitHub, GitLab, Bitbucket, Azure DevOps)
 */

import { EventEmitter } from 'events';
import { 
  PlatformConfig, 
  GitRepository, 
  MergeRequest, 
  CommitStatus, 
  PullRequestComment,
  ChangedFile,
  BranchProtection
} from './types';

export interface PlatformAPIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
  after?: string;
  before?: string;
}

export class PlatformConnector extends EventEmitter {
  private authenticated = false;
  private baseUrl: string;
  private headers: Record<string, string> = {};

  constructor(private config: PlatformConfig) {
    super();
    this.baseUrl = this.getBaseUrl();
    this.setupHeaders();
  }

  async initialize(): Promise<void> {
    try {
      await this.authenticate();
      await this.validateConnection();
      this.authenticated = true;
      this.emit('connector:initialized', { platform: this.config.platform });
    } catch (error) {
      this.emit('connector:error', { error: error.message, platform: this.config.platform });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.authenticated = false;
    this.emit('connector:disconnected', { platform: this.config.platform });
  }

  async getRepositories(pagination?: PaginationOptions): Promise<GitRepository[]> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getRepositoriesEndpoint();
      const response = await this.makeRequest<any[]>('GET', endpoint, undefined, pagination);
      
      return response.data.map(repo => this.mapRepository(repo));
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'getRepositories' });
      throw error;
    }
  }

  async getRepository(repositoryId: string): Promise<GitRepository> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getRepositoryEndpoint(repositoryId);
      const response = await this.makeRequest<any>('GET', endpoint);
      
      return this.mapRepository(response.data);
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'getRepository' });
      throw error;
    }
  }

  async getMergeRequests(repositoryId: string, state?: 'open' | 'closed' | 'merged', pagination?: PaginationOptions): Promise<MergeRequest[]> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getMergeRequestsEndpoint(repositoryId);
      const params = state ? { state, ...pagination } : pagination;
      const response = await this.makeRequest<any[]>('GET', endpoint, undefined, params);
      
      return response.data.map(mr => this.mapMergeRequest(mr));
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'getMergeRequests' });
      throw error;
    }
  }

  async getMergeRequest(repositoryId: string, mergeRequestId: string): Promise<MergeRequest> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getMergeRequestEndpoint(repositoryId, mergeRequestId);
      const response = await this.makeRequest<any>('GET', endpoint);
      
      return this.mapMergeRequest(response.data);
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'getMergeRequest' });
      throw error;
    }
  }

  async getChangedFiles(repositoryId: string, mergeRequestId: string): Promise<ChangedFile[]> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getChangedFilesEndpoint(repositoryId, mergeRequestId);
      const response = await this.makeRequest<any[]>('GET', endpoint);
      
      return response.data.map(file => this.mapChangedFile(file));
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'getChangedFiles' });
      throw error;
    }
  }

  async getFileContent(repositoryId: string, filePath: string, ref?: string): Promise<string> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getFileContentEndpoint(repositoryId, filePath, ref);
      const response = await this.makeRequest<any>('GET', endpoint);
      
      return this.extractFileContent(response.data);
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'getFileContent' });
      throw error;
    }
  }

  async postComment(repositoryId: string, mergeRequestId: string, body: string, path?: string, line?: number): Promise<PullRequestComment> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getCommentsEndpoint(repositoryId, mergeRequestId);
      const payload = this.buildCommentPayload(body, path, line);
      const response = await this.makeRequest<any>('POST', endpoint, payload);
      
      return this.mapComment(response.data);
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'postComment' });
      throw error;
    }
  }

  async updateCommitStatus(repositoryId: string, commitSha: string, status: CommitStatus): Promise<void> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getCommitStatusEndpoint(repositoryId, commitSha);
      const payload = this.buildCommitStatusPayload(status);
      await this.makeRequest('POST', endpoint, payload);
      
      this.emit('commit:status_updated', { repositoryId, commitSha, status });
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'updateCommitStatus' });
      throw error;
    }
  }

  async setBranchProtection(repositoryId: string, branch: string, protection: BranchProtection): Promise<void> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getBranchProtectionEndpoint(repositoryId, branch);
      const payload = this.buildBranchProtectionPayload(protection);
      await this.makeRequest('PUT', endpoint, payload);
      
      this.emit('branch:protection_updated', { repositoryId, branch, protection });
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'setBranchProtection' });
      throw error;
    }
  }

  async createWebhook(repositoryId: string, webhookUrl: string, events: string[], secret?: string): Promise<any> {
    this.ensureAuthenticated();
    
    try {
      const endpoint = this.getWebhooksEndpoint(repositoryId);
      const payload = this.buildWebhookPayload(webhookUrl, events, secret);
      const response = await this.makeRequest<any>('POST', endpoint, payload);
      
      this.emit('webhook:created', { repositoryId, webhookUrl, events });
      return response.data;
    } catch (error) {
      this.emit('api:error', { error: error.message, method: 'createWebhook' });
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    // Validate token by making a test request
    const endpoint = this.getAuthTestEndpoint();
    await this.makeRequest('GET', endpoint);
  }

  private async validateConnection(): Promise<void> {
    // Additional validation specific to each platform
    switch (this.config.platform) {
      case 'github':
        await this.validateGitHubConnection();
        break;
      case 'gitlab':
        await this.validateGitLabConnection();
        break;
      case 'bitbucket':
        await this.validateBitbucketConnection();
        break;
      case 'azure_devops':
        await this.validateAzureDevOpsConnection();
        break;
    }
  }

  private async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: any
  ): Promise<PlatformAPIResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    const requestInit: RequestInit = {
      method,
      headers: this.headers,
    };

    if (data) {
      requestInit.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url.toString(), requestInit);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Extract rate limit information if available
      const rateLimit = this.extractRateLimit(response.headers);
      
      return {
        data: responseData,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        rateLimit
      };
    } catch (error) {
      this.emit('api:request_failed', { method, endpoint, error: error.message });
      throw error;
    }
  }

  private getBaseUrl(): string {
    const urls: Record<string, string> = {
      'github': 'https://api.github.com',
      'gitlab': this.config.apiUrl || 'https://gitlab.com/api/v4',
      'bitbucket': 'https://api.bitbucket.org/2.0',
      'azure_devops': this.config.apiUrl || 'https://dev.azure.com'
    };
    
    return urls[this.config.platform] || this.config.apiUrl;
  }

  private setupHeaders(): void {
    const commonHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'starter-template-dna-git-integration/1.0'
    };

    switch (this.config.platform) {
      case 'github':
        this.headers = {
          ...commonHeaders,
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        };
        break;
      case 'gitlab':
        this.headers = {
          ...commonHeaders,
          'Private-Token': this.config.token
        };
        break;
      case 'bitbucket':
        this.headers = {
          ...commonHeaders,
          'Authorization': `Bearer ${this.config.token}`
        };
        break;
      case 'azure_devops':
        this.headers = {
          ...commonHeaders,
          'Authorization': `Basic ${Buffer.from(`:${this.config.token}`).toString('base64')}`
        };
        break;
    }
  }

  private ensureAuthenticated(): void {
    if (!this.authenticated) {
      throw new Error('Platform connector not authenticated');
    }
  }

  // Platform-specific endpoint methods
  private getRepositoriesEndpoint(): string {
    const endpoints: Record<string, string> = {
      'github': '/user/repos',
      'gitlab': '/projects?membership=true',
      'bitbucket': '/repositories?role=member',
      'azure_devops': `/${this.config.organization}/_apis/git/repositories?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getRepositoryEndpoint(repositoryId: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}`,
      'gitlab': `/projects/${repositoryId}`,
      'bitbucket': `/repositories/${repositoryId}`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getMergeRequestsEndpoint(repositoryId: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/pulls`,
      'gitlab': `/projects/${repositoryId}/merge_requests`,
      'bitbucket': `/repositories/${repositoryId}/pullrequests`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}/pullrequests?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getMergeRequestEndpoint(repositoryId: string, mergeRequestId: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/pulls/${mergeRequestId}`,
      'gitlab': `/projects/${repositoryId}/merge_requests/${mergeRequestId}`,
      'bitbucket': `/repositories/${repositoryId}/pullrequests/${mergeRequestId}`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}/pullrequests/${mergeRequestId}?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getChangedFilesEndpoint(repositoryId: string, mergeRequestId: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/pulls/${mergeRequestId}/files`,
      'gitlab': `/projects/${repositoryId}/merge_requests/${mergeRequestId}/changes`,
      'bitbucket': `/repositories/${repositoryId}/pullrequests/${mergeRequestId}/diff`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}/pullrequests/${mergeRequestId}/iterations/1?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getFileContentEndpoint(repositoryId: string, filePath: string, ref?: string): string {
    const refParam = ref ? `?ref=${ref}` : '';
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/contents/${filePath}${refParam}`,
      'gitlab': `/projects/${repositoryId}/repository/files/${encodeURIComponent(filePath)}/raw${refParam}`,
      'bitbucket': `/repositories/${repositoryId}/src/${ref || 'main'}/${filePath}`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}/items?path=${filePath}&api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getCommentsEndpoint(repositoryId: string, mergeRequestId: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/pulls/${mergeRequestId}/comments`,
      'gitlab': `/projects/${repositoryId}/merge_requests/${mergeRequestId}/notes`,
      'bitbucket': `/repositories/${repositoryId}/pullrequests/${mergeRequestId}/comments`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}/pullrequests/${mergeRequestId}/threads?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getCommitStatusEndpoint(repositoryId: string, commitSha: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/statuses/${commitSha}`,
      'gitlab': `/projects/${repositoryId}/statuses/${commitSha}`,
      'bitbucket': `/repositories/${repositoryId}/commit/${commitSha}/statuses/build`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}/statuses?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getBranchProtectionEndpoint(repositoryId: string, branch: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/branches/${branch}/protection`,
      'gitlab': `/projects/${repositoryId}/protected_branches`,
      'bitbucket': `/repositories/${repositoryId}/branch-restrictions`,
      'azure_devops': `/${this.config.organization}/_apis/git/repositories/${repositoryId}/refs?filter=heads/${branch}&api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getWebhooksEndpoint(repositoryId: string): string {
    const endpoints: Record<string, string> = {
      'github': `/repos/${repositoryId}/hooks`,
      'gitlab': `/projects/${repositoryId}/hooks`,
      'bitbucket': `/repositories/${repositoryId}/hooks`,
      'azure_devops': `/${this.config.organization}/_apis/hooks/subscriptions?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  private getAuthTestEndpoint(): string {
    const endpoints: Record<string, string> = {
      'github': '/user',
      'gitlab': '/user',
      'bitbucket': '/user',
      'azure_devops': `/${this.config.organization}/_apis/projects?api-version=6.0`
    };
    return endpoints[this.config.platform];
  }

  // Platform-specific validation methods
  private async validateGitHubConnection(): Promise<void> {
    const response = await this.makeRequest('GET', '/rate_limit');
    if (!response.data.rate) {
      throw new Error('Invalid GitHub API response');
    }
  }

  private async validateGitLabConnection(): Promise<void> {
    const response = await this.makeRequest('GET', '/version');
    if (!response.data.version) {
      throw new Error('Invalid GitLab API response');
    }
  }

  private async validateBitbucketConnection(): Promise<void> {
    const response = await this.makeRequest('GET', '/user');
    if (!response.data.username) {
      throw new Error('Invalid Bitbucket API response');
    }
  }

  private async validateAzureDevOpsConnection(): Promise<void> {
    const response = await this.makeRequest('GET', `/${this.config.organization}/_apis/projects?api-version=6.0`);
    if (!response.data.value) {
      throw new Error('Invalid Azure DevOps API response');
    }
  }

  // Mapping methods to convert platform-specific responses to unified format
  private mapRepository(repo: any): GitRepository {
    switch (this.config.platform) {
      case 'github':
        return this.mapGitHubRepository(repo);
      case 'gitlab':
        return this.mapGitLabRepository(repo);
      case 'bitbucket':
        return this.mapBitbucketRepository(repo);
      case 'azure_devops':
        return this.mapAzureDevOpsRepository(repo);
      default:
        throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  private mapMergeRequest(mr: any): MergeRequest {
    switch (this.config.platform) {
      case 'github':
        return this.mapGitHubPullRequest(mr);
      case 'gitlab':
        return this.mapGitLabMergeRequest(mr);
      case 'bitbucket':
        return this.mapBitbucketPullRequest(mr);
      case 'azure_devops':
        return this.mapAzureDevOpsPullRequest(mr);
      default:
        throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  private mapChangedFile(file: any): ChangedFile {
    switch (this.config.platform) {
      case 'github':
        return this.mapGitHubChangedFile(file);
      case 'gitlab':
        return this.mapGitLabChangedFile(file);
      case 'bitbucket':
        return this.mapBitbucketChangedFile(file);
      case 'azure_devops':
        return this.mapAzureDevOpsChangedFile(file);
      default:
        throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  private mapComment(comment: any): PullRequestComment {
    switch (this.config.platform) {
      case 'github':
        return this.mapGitHubComment(comment);
      case 'gitlab':
        return this.mapGitLabComment(comment);
      case 'bitbucket':
        return this.mapBitbucketComment(comment);
      case 'azure_devops':
        return this.mapAzureDevOpsComment(comment);
      default:
        throw new Error(`Unsupported platform: ${this.config.platform}`);
    }
  }

  // GitHub-specific mapping methods
  private mapGitHubRepository(repo: any): GitRepository {
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language || 'Unknown',
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      owner: {
        id: repo.owner.id.toString(),
        username: repo.owner.login,
        name: repo.owner.name,
        avatarUrl: repo.owner.avatar_url,
        type: repo.owner.type === 'Organization' ? 'organization' : 'user'
      }
    };
  }

  private mapGitHubPullRequest(pr: any): MergeRequest {
    return {
      id: pr.id.toString(),
      title: pr.title,
      description: pr.body || '',
      state: pr.state === 'open' ? 'open' : pr.merged ? 'merged' : 'closed',
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      author: {
        id: pr.user.id.toString(),
        username: pr.user.login,
        name: pr.user.name,
        avatarUrl: pr.user.avatar_url,
        type: 'user'
      },
      assignees: pr.assignees?.map((a: any) => ({
        id: a.id.toString(),
        username: a.login,
        name: a.name,
        avatarUrl: a.avatar_url,
        type: 'user'
      })) || [],
      reviewers: pr.requested_reviewers?.map((r: any) => ({
        id: r.id.toString(),
        username: r.login,
        name: r.name,
        avatarUrl: r.avatar_url,
        type: 'user'
      })) || [],
      labels: pr.labels?.map((l: any) => l.name) || [],
      draft: pr.draft,
      mergeable: pr.mergeable !== false,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at
    };
  }

  private mapGitHubChangedFile(file: any): ChangedFile {
    return {
      filename: file.filename,
      status: file.status as ChangedFile['status'],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
      previousFilename: file.previous_filename
    };
  }

  private mapGitHubComment(comment: any): PullRequestComment {
    return {
      id: comment.id.toString(),
      body: comment.body,
      user: {
        id: comment.user.id.toString(),
        username: comment.user.login,
        name: comment.user.name,
        avatarUrl: comment.user.avatar_url,
        type: 'user'
      },
      path: comment.path,
      line: comment.line,
      position: comment.position,
      commitSha: comment.commit_id,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      reactions: comment.reactions
    };
  }

  // GitLab-specific mapping methods (similar structure)
  private mapGitLabRepository(repo: any): GitRepository {
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.path_with_namespace,
      private: repo.visibility === 'private',
      defaultBranch: repo.default_branch,
      language: 'Unknown', // GitLab doesn't provide this directly
      url: repo.web_url,
      cloneUrl: repo.ssh_url_to_repo,
      owner: {
        id: repo.namespace?.id?.toString() || '0',
        username: repo.namespace?.path || 'unknown',
        name: repo.namespace?.name || 'unknown',
        type: 'organization'
      }
    };
  }

  private mapGitLabMergeRequest(mr: any): MergeRequest {
    return {
      id: mr.id.toString(),
      title: mr.title,
      description: mr.description || '',
      state: mr.state === 'opened' ? 'open' : mr.state === 'merged' ? 'merged' : 'closed',
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      author: {
        id: mr.author.id.toString(),
        username: mr.author.username,
        name: mr.author.name,
        avatarUrl: mr.author.avatar_url,
        type: 'user'
      },
      assignees: mr.assignees?.map((a: any) => ({
        id: a.id.toString(),
        username: a.username,
        name: a.name,
        avatarUrl: a.avatar_url,
        type: 'user'
      })) || [],
      reviewers: mr.reviewers?.map((r: any) => ({
        id: r.id.toString(),
        username: r.username,
        name: r.name,
        avatarUrl: r.avatar_url,
        type: 'user'
      })) || [],
      labels: mr.labels || [],
      draft: mr.work_in_progress,
      mergeable: mr.merge_status === 'can_be_merged',
      createdAt: mr.created_at,
      updatedAt: mr.updated_at,
      mergedAt: mr.merged_at
    };
  }

  private mapGitLabChangedFile(file: any): ChangedFile {
    return {
      filename: file.new_path || file.old_path,
      status: file.new_file ? 'added' : file.deleted_file ? 'removed' : file.renamed_file ? 'renamed' : 'modified',
      additions: 0, // GitLab doesn't provide this directly
      deletions: 0, // GitLab doesn't provide this directly
      changes: 0, // Would need to calculate from diff
      patch: file.diff,
      previousFilename: file.old_path !== file.new_path ? file.old_path : undefined
    };
  }

  private mapGitLabComment(comment: any): PullRequestComment {
    return {
      id: comment.id.toString(),
      body: comment.body,
      user: {
        id: comment.author.id.toString(),
        username: comment.author.username,
        name: comment.author.name,
        avatarUrl: comment.author.avatar_url,
        type: 'user'
      },
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    };
  }

  // Bitbucket and Azure DevOps mapping methods would follow similar patterns
  private mapBitbucketRepository(repo: any): GitRepository {
    return {
      id: repo.uuid,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.is_private,
      defaultBranch: repo.mainbranch?.name || 'main',
      language: repo.language || 'Unknown',
      url: repo.links?.html?.href,
      cloneUrl: repo.links?.clone?.[0]?.href,
      owner: {
        id: repo.owner.uuid,
        username: repo.owner.username,
        name: repo.owner.display_name,
        avatarUrl: repo.owner.links?.avatar?.href,
        type: 'user'
      }
    };
  }

  private mapBitbucketPullRequest(pr: any): MergeRequest {
    return {
      id: pr.id.toString(),
      title: pr.title,
      description: pr.description || '',
      state: pr.state === 'OPEN' ? 'open' : pr.state === 'MERGED' ? 'merged' : 'closed',
      sourceBranch: pr.source.branch.name,
      targetBranch: pr.destination.branch.name,
      author: {
        id: pr.author.uuid,
        username: pr.author.username,
        name: pr.author.display_name,
        avatarUrl: pr.author.links?.avatar?.href,
        type: 'user'
      },
      assignees: [],
      reviewers: pr.reviewers?.map((r: any) => ({
        id: r.uuid,
        username: r.username,
        name: r.display_name,
        avatarUrl: r.links?.avatar?.href,
        type: 'user'
      })) || [],
      labels: [],
      draft: false,
      mergeable: true,
      createdAt: pr.created_on,
      updatedAt: pr.updated_on,
      mergedAt: pr.state === 'MERGED' ? pr.updated_on : undefined
    };
  }

  private mapBitbucketChangedFile(file: any): ChangedFile {
    return {
      filename: file.new?.path || file.old?.path,
      status: !file.old ? 'added' : !file.new ? 'removed' : 'modified',
      additions: 0,
      deletions: 0,
      changes: 0,
      previousFilename: file.old?.path !== file.new?.path ? file.old?.path : undefined
    };
  }

  private mapBitbucketComment(comment: any): PullRequestComment {
    return {
      id: comment.id.toString(),
      body: comment.content?.raw || '',
      user: {
        id: comment.user.uuid,
        username: comment.user.username,
        name: comment.user.display_name,
        avatarUrl: comment.user.links?.avatar?.href,
        type: 'user'
      },
      createdAt: comment.created_on,
      updatedAt: comment.updated_on
    };
  }

  private mapAzureDevOpsRepository(repo: any): GitRepository {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.name,
      private: true,
      defaultBranch: repo.defaultBranch || 'main',
      language: 'Unknown',
      url: repo.webUrl,
      cloneUrl: repo.remoteUrl,
      owner: {
        id: '0',
        username: 'azure-devops',
        name: 'Azure DevOps',
        type: 'organization'
      }
    };
  }

  private mapAzureDevOpsPullRequest(pr: any): MergeRequest {
    return {
      id: pr.pullRequestId.toString(),
      title: pr.title,
      description: pr.description || '',
      state: pr.status === 'active' ? 'open' : pr.status === 'completed' ? 'merged' : 'closed',
      sourceBranch: pr.sourceRefName.replace('refs/heads/', ''),
      targetBranch: pr.targetRefName.replace('refs/heads/', ''),
      author: {
        id: pr.createdBy.id,
        username: pr.createdBy.uniqueName,
        name: pr.createdBy.displayName,
        avatarUrl: pr.createdBy.imageUrl,
        type: 'user'
      },
      assignees: [],
      reviewers: pr.reviewers?.map((r: any) => ({
        id: r.id,
        username: r.uniqueName,
        name: r.displayName,
        avatarUrl: r.imageUrl,
        type: 'user'
      })) || [],
      labels: [],
      draft: pr.isDraft,
      mergeable: true,
      createdAt: pr.creationDate,
      updatedAt: pr.creationDate,
      mergedAt: pr.status === 'completed' ? pr.closedDate : undefined
    };
  }

  private mapAzureDevOpsChangedFile(file: any): ChangedFile {
    return {
      filename: file.item?.path || '',
      status: file.changeType === 'add' ? 'added' : file.changeType === 'delete' ? 'removed' : 'modified',
      additions: 0,
      deletions: 0,
      changes: 0
    };
  }

  private mapAzureDevOpsComment(comment: any): PullRequestComment {
    return {
      id: comment.id.toString(),
      body: comment.content || '',
      user: {
        id: comment.author?.id || '0',
        username: comment.author?.uniqueName || 'unknown',
        name: comment.author?.displayName || 'unknown',
        avatarUrl: comment.author?.imageUrl,
        type: 'user'
      },
      createdAt: comment.publishedDate,
      updatedAt: comment.lastUpdatedDate
    };
  }

  // Helper methods
  private extractFileContent(data: any): string {
    switch (this.config.platform) {
      case 'github':
        return Buffer.from(data.content, 'base64').toString('utf-8');
      case 'gitlab':
        return data; // GitLab returns raw content
      case 'bitbucket':
        return data; // Bitbucket returns raw content
      case 'azure_devops':
        return data.content || '';
      default:
        return data.toString();
    }
  }

  private extractRateLimit(headers: Headers): { limit: number; remaining: number; reset: number } | undefined {
    const limit = headers.get('x-ratelimit-limit') || headers.get('ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining') || headers.get('ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset') || headers.get('ratelimit-reset');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset)
      };
    }
    return undefined;
  }

  // Payload builders
  private buildCommentPayload(body: string, path?: string, line?: number): any {
    switch (this.config.platform) {
      case 'github':
        return path && line ? {
          body,
          path,
          line,
          side: 'RIGHT'
        } : { body };
      case 'gitlab':
        return { body };
      case 'bitbucket':
        return { content: { raw: body } };
      case 'azure_devops':
        return {
          comments: [{
            parentCommentId: 0,
            content: body,
            commentType: 'text'
          }],
          status: 'active'
        };
      default:
        return { body };
    }
  }

  private buildCommitStatusPayload(status: CommitStatus): any {
    switch (this.config.platform) {
      case 'github':
        return {
          state: status.state,
          target_url: status.targetUrl,
          description: status.description,
          context: status.context
        };
      case 'gitlab':
        return {
          state: status.state,
          target_url: status.targetUrl,
          description: status.description,
          name: status.context
        };
      case 'bitbucket':
        return {
          state: status.state.toUpperCase(),
          url: status.targetUrl,
          description: status.description,
          key: status.context
        };
      case 'azure_devops':
        return {
          state: status.state,
          targetUrl: status.targetUrl,
          description: status.description,
          context: {
            name: status.context,
            genre: 'continuous-integration'
          }
        };
      default:
        return status;
    }
  }

  private buildBranchProtectionPayload(protection: BranchProtection): any {
    switch (this.config.platform) {
      case 'github':
        return protection;
      case 'gitlab':
        return {
          name: '*',
          push_access_level: 30,
          merge_access_level: 30
        };
      case 'bitbucket':
        return {
          kind: 'require_approvals_to_merge',
          value: protection.requiredPullRequestReviews?.requiredApprovingReviewCount || 1
        };
      default:
        return protection;
    }
  }

  private buildWebhookPayload(webhookUrl: string, events: string[], secret?: string): any {
    switch (this.config.platform) {
      case 'github':
        return {
          config: {
            url: webhookUrl,
            content_type: 'json',
            secret: secret
          },
          events: events,
          active: true
        };
      case 'gitlab':
        return {
          url: webhookUrl,
          token: secret,
          push_events: events.includes('push'),
          merge_requests_events: events.includes('pull_request'),
          issues_events: events.includes('issue')
        };
      case 'bitbucket':
        return {
          description: 'AI Code Review Webhook',
          url: webhookUrl,
          active: true,
          events: events
        };
      case 'azure_devops':
        return {
          publisherId: 'tfs',
          eventType: 'git.pullrequest.created',
          consumerActionId: 'httpRequest',
          consumerInputs: {
            url: webhookUrl
          }
        };
      default:
        return { url: webhookUrl, events, secret };
    }
  }
}