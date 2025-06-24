/**
 * @fileoverview Webhook Manager
 * Handles incoming webhook events from Git platforms
 */

import { EventEmitter } from 'events';
import { createHmac, timingSafeEqual } from 'crypto';
import { GitWebhookEvent, GitRepository, GitUser } from './types';

export interface WebhookConfig {
  port: number;
  path: string;
  enableSignatureValidation: boolean;
}

export interface WebhookRequest {
  body: any;
  headers: Record<string, string>;
  method: string;
  url: string;
}

export interface WebhookResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}

export class WebhookManager extends EventEmitter {
  private server: any; // HTTP server instance
  private isRunning = false;
  private readonly supportedPlatforms = ['github', 'gitlab', 'bitbucket', 'azure_devops'];

  constructor(private config: WebhookConfig) {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Webhook server is already running');
    }

    try {
      // In a real implementation, this would start an HTTP server
      // For now, we'll simulate the server setup
      this.isRunning = true;
      this.emit('server:started', { port: this.config.port });
    } catch (error) {
      this.emit('server:error', { error: error.message });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Stop the HTTP server
      this.isRunning = false;
      this.emit('server:stopped');
    } catch (error) {
      this.emit('server:error', { error: error.message });
      throw error;
    }
  }

  async handleWebhook(request: WebhookRequest, secret?: string): Promise<WebhookResponse> {
    try {
      // Validate the request
      const validationResult = this.validateRequest(request, secret);
      if (!validationResult.isValid) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: validationResult.error })
        };
      }

      // Determine the platform
      const platform = this.detectPlatform(request.headers);
      if (!platform) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Unable to determine platform' })
        };
      }

      // Parse the webhook event
      const event = this.parseWebhookEvent(request, platform);
      if (!event) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid webhook payload' })
        };
      }

      // Validate signature if enabled
      if (this.config.enableSignatureValidation && secret) {
        const isValidSignature = this.validateSignature(request, secret, platform);
        if (!isValidSignature) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid signature' })
          };
        }
      }

      // Emit the webhook event
      this.emit('webhook:received', event);

      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'success', processed: true })
      };
    } catch (error) {
      this.emit('webhook:error', { error: error.message, request });
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }

  private validateRequest(request: WebhookRequest, secret?: string): { isValid: boolean; error?: string } {
    // Validate HTTP method
    if (request.method !== 'POST') {
      return { isValid: false, error: 'Only POST method is allowed' };
    }

    // Validate content type
    const contentType = request.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return { isValid: false, error: 'Content-Type must be application/json' };
    }

    // Validate body exists
    if (!request.body) {
      return { isValid: false, error: 'Request body is required' };
    }

    return { isValid: true };
  }

  private detectPlatform(headers: Record<string, string>): string | null {
    // GitHub
    if (headers['x-github-event']) {
      return 'github';
    }

    // GitLab
    if (headers['x-gitlab-event']) {
      return 'gitlab';
    }

    // Bitbucket
    if (headers['x-event-key']) {
      return 'bitbucket';
    }

    // Azure DevOps
    if (headers['request-id'] && headers['user-agent']?.includes('VSServices')) {
      return 'azure_devops';
    }

    return null;
  }

  private parseWebhookEvent(request: WebhookRequest, platform: string): GitWebhookEvent | null {
    try {
      switch (platform) {
        case 'github':
          return this.parseGitHubWebhook(request);
        case 'gitlab':
          return this.parseGitLabWebhook(request);
        case 'bitbucket':
          return this.parseBitbucketWebhook(request);
        case 'azure_devops':
          return this.parseAzureDevOpsWebhook(request);
        default:
          return null;
      }
    } catch (error) {
      this.emit('parse:error', { error: error.message, platform });
      return null;
    }
  }

  private parseGitHubWebhook(request: WebhookRequest): GitWebhookEvent {
    const eventType = request.headers['x-github-event'];
    const deliveryId = request.headers['x-github-delivery'];
    const payload = request.body;

    return {
      id: deliveryId || `github-${Date.now()}`,
      type: this.mapGitHubEventType(eventType),
      repository: this.parseGitHubRepository(payload.repository),
      sender: this.parseGitHubUser(payload.sender),
      payload,
      timestamp: Date.now(),
      platform: 'github',
      signature: request.headers['x-hub-signature-256']
    };
  }

  private parseGitLabWebhook(request: WebhookRequest): GitWebhookEvent {
    const eventType = request.headers['x-gitlab-event'];
    const payload = request.body;

    return {
      id: `gitlab-${Date.now()}`,
      type: this.mapGitLabEventType(eventType),
      repository: this.parseGitLabRepository(payload.repository || payload.project),
      sender: this.parseGitLabUser(payload.user),
      payload,
      timestamp: Date.now(),
      platform: 'gitlab',
      signature: request.headers['x-gitlab-token']
    };
  }

  private parseBitbucketWebhook(request: WebhookRequest): GitWebhookEvent {
    const eventType = request.headers['x-event-key'];
    const payload = request.body;

    return {
      id: `bitbucket-${Date.now()}`,
      type: this.mapBitbucketEventType(eventType),
      repository: this.parseBitbucketRepository(payload.repository),
      sender: this.parseBitbucketUser(payload.actor),
      payload,
      timestamp: Date.now(),
      platform: 'bitbucket'
    };
  }

  private parseAzureDevOpsWebhook(request: WebhookRequest): GitWebhookEvent {
    const payload = request.body;
    const eventType = payload.eventType;

    return {
      id: payload.id || `azure-${Date.now()}`,
      type: this.mapAzureDevOpsEventType(eventType),
      repository: this.parseAzureDevOpsRepository(payload.resource?.repository),
      sender: this.parseAzureDevOpsUser(payload.createdBy),
      payload,
      timestamp: Date.now(),
      platform: 'azure_devops'
    };
  }

  private validateSignature(request: WebhookRequest, secret: string, platform: string): boolean {
    try {
      switch (platform) {
        case 'github':
          return this.validateGitHubSignature(request, secret);
        case 'gitlab':
          return this.validateGitLabSignature(request, secret);
        case 'bitbucket':
          return this.validateBitbucketSignature(request, secret);
        default:
          return true; // Azure DevOps uses different auth methods
      }
    } catch (error) {
      this.emit('signature:error', { error: error.message, platform });
      return false;
    }
  }

  private validateGitHubSignature(request: WebhookRequest, secret: string): boolean {
    const signature = request.headers['x-hub-signature-256'];
    if (!signature) return false;

    const payloadBody = JSON.stringify(request.body);
    const expectedSignature = `sha256=${createHmac('sha256', secret).update(payloadBody).digest('hex')}`;

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private validateGitLabSignature(request: WebhookRequest, secret: string): boolean {
    const signature = request.headers['x-gitlab-token'];
    return signature === secret;
  }

  private validateBitbucketSignature(request: WebhookRequest, secret: string): boolean {
    // Bitbucket doesn't use signature validation in the same way
    // This would need to be implemented based on Bitbucket's webhook security
    return true;
  }

  // Event type mapping methods
  private mapGitHubEventType(eventType: string): GitWebhookEvent['type'] {
    const mapping: Record<string, GitWebhookEvent['type']> = {
      'pull_request': 'pull_request',
      'push': 'push',
      'issues': 'issue',
      'release': 'release',
      'workflow_run': 'workflow_run'
    };
    return mapping[eventType] || 'push';
  }

  private mapGitLabEventType(eventType: string): GitWebhookEvent['type'] {
    const mapping: Record<string, GitWebhookEvent['type']> = {
      'Merge Request Hook': 'pull_request',
      'Push Hook': 'push',
      'Issue Hook': 'issue',
      'Release Hook': 'release',
      'Pipeline Hook': 'workflow_run'
    };
    return mapping[eventType] || 'push';
  }

  private mapBitbucketEventType(eventType: string): GitWebhookEvent['type'] {
    const mapping: Record<string, GitWebhookEvent['type']> = {
      'pullrequest:created': 'pull_request',
      'pullrequest:updated': 'pull_request',
      'repo:push': 'push',
      'issue:created': 'issue',
      'issue:updated': 'issue'
    };
    return mapping[eventType] || 'push';
  }

  private mapAzureDevOpsEventType(eventType: string): GitWebhookEvent['type'] {
    const mapping: Record<string, GitWebhookEvent['type']> = {
      'git.pullrequest.created': 'pull_request',
      'git.pullrequest.updated': 'pull_request',
      'git.push': 'push',
      'workitem.created': 'issue',
      'workitem.updated': 'issue'
    };
    return mapping[eventType] || 'push';
  }

  // Repository parsing methods
  private parseGitHubRepository(repo: any): GitRepository {
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language || 'Unknown',
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      owner: this.parseGitHubUser(repo.owner)
    };
  }

  private parseGitLabRepository(repo: any): GitRepository {
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.path_with_namespace,
      private: repo.visibility === 'private',
      defaultBranch: repo.default_branch,
      language: 'Unknown',
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

  private parseBitbucketRepository(repo: any): GitRepository {
    return {
      id: repo.uuid,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.is_private,
      defaultBranch: repo.mainbranch?.name || 'main',
      language: repo.language || 'Unknown',
      url: repo.links?.html?.href,
      cloneUrl: repo.links?.clone?.[0]?.href,
      owner: this.parseBitbucketUser(repo.owner)
    };
  }

  private parseAzureDevOpsRepository(repo: any): GitRepository {
    return {
      id: repo?.id || '0',
      name: repo?.name || 'unknown',
      fullName: repo?.name || 'unknown',
      private: true, // Azure DevOps repos are typically private
      defaultBranch: repo?.defaultBranch || 'main',
      language: 'Unknown',
      url: repo?.webUrl || '',
      cloneUrl: repo?.remoteUrl || '',
      owner: {
        id: '0',
        username: 'azure-devops',
        name: 'Azure DevOps',
        type: 'organization'
      }
    };
  }

  // User parsing methods
  private parseGitHubUser(user: any): GitUser {
    return {
      id: user.id.toString(),
      username: user.login,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      type: user.type === 'Bot' ? 'bot' : 'user'
    };
  }

  private parseGitLabUser(user: any): GitUser {
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      type: 'user'
    };
  }

  private parseBitbucketUser(user: any): GitUser {
    return {
      id: user.uuid,
      username: user.username,
      name: user.display_name,
      avatarUrl: user.links?.avatar?.href,
      type: 'user'
    };
  }

  private parseAzureDevOpsUser(user: any): GitUser {
    return {
      id: user?.id || '0',
      username: user?.uniqueName || 'unknown',
      email: user?.uniqueName,
      name: user?.displayName || 'unknown',
      avatarUrl: user?.imageUrl,
      type: 'user'
    };
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  getConfig(): WebhookConfig {
    return { ...this.config };
  }
}