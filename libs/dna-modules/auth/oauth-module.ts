/**
 * @fileoverview OAuth 2.0 DNA Module - Epic 5 Story 2 AC1
 * Provides unified OAuth authentication supporting Google, GitHub, Microsoft, Apple
 */

import { EventEmitter } from 'events';
import { BaseDNAModule } from '../../core/src/lib/dna-module';
import {
  DNAModuleMetadata,
  DNAModuleFile,
  DNAModuleContext,
  SupportedFramework,
  DNAModuleCategory,
  FrameworkSupport
} from '../../core/src/lib/types';

/**
 * Supported OAuth providers
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
  APPLE = 'apple'
}

/**
 * OAuth configuration for a specific provider
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
}

/**
 * OAuth authentication result
 */
export interface OAuthAuthResult {
  success: boolean;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope: string;
  userInfo?: {
    id: string;
    email?: string;
    name?: string;
    picture?: string;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    description?: string;
  };
}

/**
 * OAuth token refresh result
 */
export interface OAuthTokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * OAuth provider implementation interface
 */
export interface IOAuthProvider {
  readonly provider: OAuthProvider;
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly userInfoUrl: string;
  
  generateAuthUrl(config: OAuthProviderConfig, state?: string): string;
  exchangeCodeForToken(code: string, config: OAuthProviderConfig): Promise<OAuthAuthResult>;
  refreshToken(refreshToken: string, config: OAuthProviderConfig): Promise<OAuthTokenRefreshResult>;
  getUserInfo(accessToken: string): Promise<any>;
  revokeToken(token: string, config: OAuthProviderConfig): Promise<boolean>;
}

/**
 * Google OAuth provider implementation
 */
class GoogleOAuthProvider implements IOAuthProvider {
  readonly provider = OAuthProvider.GOOGLE;
  readonly authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  readonly userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

  generateAuthUrl(config: OAuthProviderConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state }),
      ...config.additionalParams
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, config: OAuthProviderConfig): Promise<OAuthAuthResult> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.provider,
          accessToken: '',
          tokenType: '',
          scope: '',
          error: {
            code: data.error || 'token_exchange_failed',
            message: data.error_description || 'Failed to exchange code for token'
          }
        };
      }

      const userInfo = await this.getUserInfo(data.access_token);

      return {
        success: true,
        provider: this.provider,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
        userInfo
      };
    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        accessToken: '',
        tokenType: '',
        scope: '',
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async refreshToken(refreshToken: string, config: OAuthProviderConfig): Promise<OAuthTokenRefreshResult> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error || 'token_refresh_failed',
            message: data.error_description || 'Failed to refresh token'
          }
        };
      }

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async revokeToken(token: string, config: OAuthProviderConfig): Promise<boolean> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * GitHub OAuth provider implementation
 */
class GitHubOAuthProvider implements IOAuthProvider {
  readonly provider = OAuthProvider.GITHUB;
  readonly authorizationUrl = 'https://github.com/login/oauth/authorize';
  readonly tokenUrl = 'https://github.com/login/oauth/access_token';
  readonly userInfoUrl = 'https://api.github.com/user';

  generateAuthUrl(config: OAuthProviderConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      ...(state && { state }),
      ...config.additionalParams
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, config: OAuthProviderConfig): Promise<OAuthAuthResult> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          provider: this.provider,
          accessToken: '',
          tokenType: '',
          scope: '',
          error: {
            code: data.error || 'token_exchange_failed',
            message: data.error_description || 'Failed to exchange code for token'
          }
        };
      }

      const userInfo = await this.getUserInfo(data.access_token);

      return {
        success: true,
        provider: this.provider,
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
        userInfo
      };
    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        accessToken: '',
        tokenType: '',
        scope: '',
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async refreshToken(refreshToken: string, config: OAuthProviderConfig): Promise<OAuthTokenRefreshResult> {
    // GitHub doesn't support refresh tokens, tokens don't expire
    return {
      success: false,
      error: {
        code: 'not_supported',
        message: 'GitHub OAuth tokens do not expire and cannot be refreshed'
      }
    };
  }

  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async revokeToken(token: string, config: OAuthProviderConfig): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/applications/${config.clientId}/token`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          access_token: token
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Microsoft OAuth provider implementation
 */
class MicrosoftOAuthProvider implements IOAuthProvider {
  readonly provider = OAuthProvider.MICROSOFT;
  readonly authorizationUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  readonly tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  readonly userInfoUrl = 'https://graph.microsoft.com/v1.0/me';

  generateAuthUrl(config: OAuthProviderConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_mode: 'query',
      ...(state && { state }),
      ...config.additionalParams
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, config: OAuthProviderConfig): Promise<OAuthAuthResult> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.provider,
          accessToken: '',
          tokenType: '',
          scope: '',
          error: {
            code: data.error || 'token_exchange_failed',
            message: data.error_description || 'Failed to exchange code for token'
          }
        };
      }

      const userInfo = await this.getUserInfo(data.access_token);

      return {
        success: true,
        provider: this.provider,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
        userInfo
      };
    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        accessToken: '',
        tokenType: '',
        scope: '',
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async refreshToken(refreshToken: string, config: OAuthProviderConfig): Promise<OAuthTokenRefreshResult> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error || 'token_refresh_failed',
            message: data.error_description || 'Failed to refresh token'
          }
        };
      }

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async revokeToken(token: string, config: OAuthProviderConfig): Promise<boolean> {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token: token,
          client_id: config.clientId
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Apple OAuth provider implementation
 */
class AppleOAuthProvider implements IOAuthProvider {
  readonly provider = OAuthProvider.APPLE;
  readonly authorizationUrl = 'https://appleid.apple.com/auth/authorize';
  readonly tokenUrl = 'https://appleid.apple.com/auth/token';
  readonly userInfoUrl = 'https://appleid.apple.com/auth/keys';

  generateAuthUrl(config: OAuthProviderConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      response_mode: 'form_post',
      ...(state && { state }),
      ...config.additionalParams
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, config: OAuthProviderConfig): Promise<OAuthAuthResult> {
    try {
      // Apple requires client_secret to be a JWT signed with private key
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret, // Should be a JWT
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.provider,
          accessToken: '',
          tokenType: '',
          scope: '',
          error: {
            code: data.error || 'token_exchange_failed',
            message: data.error_description || 'Failed to exchange code for token'
          }
        };
      }

      // Apple ID token contains user info in JWT format
      const userInfo = this.decodeIdToken(data.id_token);

      return {
        success: true,
        provider: this.provider,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope || '',
        userInfo
      };
    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        accessToken: '',
        tokenType: '',
        scope: '',
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async refreshToken(refreshToken: string, config: OAuthProviderConfig): Promise<OAuthTokenRefreshResult> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error || 'token_refresh_failed',
            message: data.error_description || 'Failed to refresh token'
          }
        };
      }

      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: error instanceof Error ? error.message : 'Network error'
        }
      };
    }
  }

  async getUserInfo(accessToken: string): Promise<any> {
    // Apple doesn't provide a user info endpoint, info is in the ID token
    throw new Error('Apple OAuth: User info is provided in the ID token during authentication');
  }

  async revokeToken(token: string, config: OAuthProviderConfig): Promise<boolean> {
    try {
      const response = await fetch('https://appleid.apple.com/auth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          token: token,
          token_type_hint: 'access_token'
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private decodeIdToken(idToken: string): any {
    try {
      const payload = idToken.split('.')[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }
}

/**
 * OAuth DNA Module - Unified authentication interface
 */
export class OAuthDNAModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'oauth-auth',
    name: 'OAuth 2.0 Authentication',
    version: '1.0.0',
    description: 'Unified OAuth 2.0 authentication supporting Google, GitHub, Microsoft, Apple',
    category: DNAModuleCategory.AUTHENTICATION,
    keywords: ['oauth', 'authentication', 'google', 'github', 'microsoft', 'apple'],
    author: 'DNA Team',
    license: 'MIT',
    deprecated: false,
    experimental: false
  };

  public readonly dependencies = [];
  public readonly conflicts = [];
  public readonly frameworks: FrameworkSupport[] = [
    { framework: SupportedFramework.NEXTJS, supported: true, version: '>=13.0.0' },
    { framework: SupportedFramework.REACT_NATIVE, supported: true, version: '>=0.70.0' },
    { framework: SupportedFramework.FLUTTER, supported: true, version: '>=3.0.0' },
    { framework: SupportedFramework.TAURI, supported: true, version: '>=1.0.0' },
    { framework: SupportedFramework.SVELTEKIT, supported: true, version: '>=1.0.0' }
  ];

  public readonly config = {
    schema: {
      providers: {
        type: 'object',
        properties: {
          google: { type: 'object' },
          github: { type: 'object' },
          microsoft: { type: 'object' },
          apple: { type: 'object' }
        }
      },
      defaultProvider: {
        type: 'string',
        enum: ['google', 'github', 'microsoft', 'apple']
      },
      security: {
        type: 'object',
        properties: {
          stateParameter: { type: 'boolean' },
          pkce: { type: 'boolean' },
          nonce: { type: 'boolean' }
        }
      }
    },
    defaults: {
      defaultProvider: 'google',
      security: {
        stateParameter: true,
        pkce: true,
        nonce: true
      }
    },
    required: ['providers'],
    validation: {
      rules: {
        providers: 'At least one provider must be configured',
        'providers.*.clientId': 'Client ID is required for each provider',
        'providers.*.clientSecret': 'Client secret is required for each provider',
        'providers.*.redirectUri': 'Redirect URI is required for each provider'
      }
    }
  };

  private providers: Map<OAuthProvider, IOAuthProvider> = new Map();
  private configurations: Map<OAuthProvider, OAuthProviderConfig> = new Map();

  constructor() {
    super();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set(OAuthProvider.GOOGLE, new GoogleOAuthProvider());
    this.providers.set(OAuthProvider.GITHUB, new GitHubOAuthProvider());
    this.providers.set(OAuthProvider.MICROSOFT, new MicrosoftOAuthProvider());
    this.providers.set(OAuthProvider.APPLE, new AppleOAuthProvider());
  }

  /**
   * Configure OAuth provider
   */
  public configureProvider(provider: OAuthProvider, config: OAuthProviderConfig): void {
    this.configurations.set(provider, config);
    this.emit('provider:configured', { provider, config });
  }

  /**
   * Generate authorization URL for provider
   */
  public generateAuthUrl(provider: OAuthProvider, state?: string): string {
    const providerImpl = this.providers.get(provider);
    const config = this.configurations.get(provider);

    if (!providerImpl) {
      throw new Error(`Provider ${provider} not supported`);
    }

    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    return providerImpl.generateAuthUrl(config, state);
  }

  /**
   * Exchange authorization code for access token
   */
  public async authenticate(provider: OAuthProvider, code: string): Promise<OAuthAuthResult> {
    const providerImpl = this.providers.get(provider);
    const config = this.configurations.get(provider);

    if (!providerImpl) {
      return {
        success: false,
        provider,
        accessToken: '',
        tokenType: '',
        scope: '',
        error: {
          code: 'unsupported_provider',
          message: `Provider ${provider} not supported`
        }
      };
    }

    if (!config) {
      return {
        success: false,
        provider,
        accessToken: '',
        tokenType: '',
        scope: '',
        error: {
          code: 'provider_not_configured',
          message: `Provider ${provider} not configured`
        }
      };
    }

    this.emit('auth:started', { provider });
    const result = await providerImpl.exchangeCodeForToken(code, config);
    this.emit('auth:completed', { provider, success: result.success });

    return result;
  }

  /**
   * Refresh access token
   */
  public async refreshToken(provider: OAuthProvider, refreshToken: string): Promise<OAuthTokenRefreshResult> {
    const providerImpl = this.providers.get(provider);
    const config = this.configurations.get(provider);

    if (!providerImpl || !config) {
      return {
        success: false,
        error: {
          code: 'provider_not_available',
          message: `Provider ${provider} not available or configured`
        }
      };
    }

    this.emit('token:refresh_started', { provider });
    const result = await providerImpl.refreshToken(refreshToken, config);
    this.emit('token:refresh_completed', { provider, success: result.success });

    return result;
  }

  /**
   * Revoke access token
   */
  public async revokeToken(provider: OAuthProvider, token: string): Promise<boolean> {
    const providerImpl = this.providers.get(provider);
    const config = this.configurations.get(provider);

    if (!providerImpl || !config) {
      return false;
    }

    this.emit('token:revoke_started', { provider });
    const result = await providerImpl.revokeToken(token, config);
    this.emit('token:revoke_completed', { provider, success: result });

    return result;
  }

  /**
   * Get supported providers
   */
  public getSupportedProviders(): OAuthProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is configured
   */
  public isProviderConfigured(provider: OAuthProvider): boolean {
    return this.configurations.has(provider);
  }

  /**
   * Generate framework-specific authentication files
   */
  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    switch (context.framework) {
      case SupportedFramework.NEXTJS:
        files.push(...await this.generateNextJSFiles(context));
        break;
      case SupportedFramework.REACT_NATIVE:
        files.push(...await this.generateReactNativeFiles(context));
        break;
      case SupportedFramework.FLUTTER:
        files.push(...await this.generateFlutterFiles(context));
        break;
      case SupportedFramework.TAURI:
        files.push(...await this.generateTauriFiles(context));
        break;
      case SupportedFramework.SVELTEKIT:
        files.push(...await this.generateSvelteKitFiles(context));
        break;
    }

    return files;
  }

  private async generateNextJSFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'lib/auth/oauth.ts',
        content: this.generateNextJSOAuthService(),
        type: 'typescript'
      },
      {
        path: 'pages/api/auth/[...provider].ts',
        content: this.generateNextJSAuthAPI(),
        type: 'typescript'
      },
      {
        path: 'components/auth/LoginButton.tsx',
        content: this.generateNextJSLoginComponent(),
        type: 'typescript'
      }
    ];
  }

  private async generateReactNativeFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/services/auth/OAuthService.ts',
        content: this.generateReactNativeOAuthService(),
        type: 'typescript'
      },
      {
        path: 'src/components/auth/LoginScreen.tsx',
        content: this.generateReactNativeLoginScreen(),
        type: 'typescript'
      }
    ];
  }

  private async generateFlutterFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'lib/services/auth/oauth_service.dart',
        content: this.generateFlutterOAuthService(),
        type: 'dart'
      },
      {
        path: 'lib/screens/auth/login_screen.dart',
        content: this.generateFlutterLoginScreen(),
        type: 'dart'
      }
    ];
  }

  private async generateTauriFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/lib/auth/oauth.ts',
        content: this.generateTauriOAuthService(),
        type: 'typescript'
      },
      {
        path: 'src/components/auth/LoginForm.svelte',
        content: this.generateTauriLoginComponent(),
        type: 'svelte'
      }
    ];
  }

  private async generateSvelteKitFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/lib/auth/oauth.ts',
        content: this.generateSvelteKitOAuthService(),
        type: 'typescript'
      },
      {
        path: 'src/routes/auth/+page.server.ts',
        content: this.generateSvelteKitAuthHandler(),
        type: 'typescript'
      },
      {
        path: 'src/routes/auth/+page.svelte',
        content: this.generateSvelteKitLoginPage(),
        type: 'svelte'
      }
    ];
  }

  // Framework-specific code generation methods
  private generateNextJSOAuthService(): string {
    return `// Next.js OAuth Service - Generated by DNA OAuth Module
import { OAuthProvider, OAuthDNAModule } from '@dna/auth';

const oauthModule = new OAuthDNAModule();

// Configure providers from environment variables
if (process.env.GOOGLE_CLIENT_ID) {
  oauthModule.configureProvider(OAuthProvider.GOOGLE, {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: \`\${process.env.NEXTAUTH_URL}/api/auth/google\`,
    scopes: ['openid', 'email', 'profile']
  });
}

if (process.env.GITHUB_CLIENT_ID) {
  oauthModule.configureProvider(OAuthProvider.GITHUB, {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: \`\${process.env.NEXTAUTH_URL}/api/auth/github\`,
    scopes: ['user:email']
  });
}

export { oauthModule };
export { OAuthProvider };
`;
  }

  private generateNextJSAuthAPI(): string {
    return `// Next.js Auth API - Generated by DNA OAuth Module
import { NextApiRequest, NextApiResponse } from 'next';
import { oauthModule, OAuthProvider } from '../../../lib/auth/oauth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { provider, code, state } = req.query;
  
  if (!provider || Array.isArray(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  const oauthProvider = provider.toLowerCase() as OAuthProvider;
  
  if (req.method === 'GET' && !code) {
    // Generate auth URL
    try {
      const authUrl = oauthModule.generateAuthUrl(oauthProvider, state as string);
      return res.redirect(authUrl);
    } catch (error) {
      return res.status(400).json({ error: 'Failed to generate auth URL' });
    }
  }
  
  if (req.method === 'GET' && code) {
    // Handle callback
    try {
      const result = await oauthModule.authenticate(oauthProvider, code as string);
      
      if (result.success) {
        // Store tokens securely (implement your token storage logic)
        return res.status(200).json({ 
          success: true, 
          user: result.userInfo 
        });
      } else {
        return res.status(401).json({ error: result.error });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
`;
  }

  private generateNextJSLoginComponent(): string {
    return `// Next.js Login Component - Generated by DNA OAuth Module
import React from 'react';
import { OAuthProvider } from '../../lib/auth/oauth';

interface LoginButtonProps {
  provider: OAuthProvider;
  className?: string;
}

const providerLabels = {
  [OAuthProvider.GOOGLE]: 'Google',
  [OAuthProvider.GITHUB]: 'GitHub',
  [OAuthProvider.MICROSOFT]: 'Microsoft',
  [OAuthProvider.APPLE]: 'Apple'
};

export function LoginButton({ provider, className = '' }: LoginButtonProps) {
  const handleLogin = () => {
    window.location.href = \`/api/auth/\${provider}\`;
  };

  return (
    <button
      onClick={handleLogin}
      className={\`oauth-login-btn oauth-\${provider} \${className}\`}
    >
      Sign in with {providerLabels[provider]}
    </button>
  );
}

export function LoginPage() {
  return (
    <div className="login-container">
      <h1>Sign In</h1>
      <div className="login-buttons">
        <LoginButton provider={OAuthProvider.GOOGLE} />
        <LoginButton provider={OAuthProvider.GITHUB} />
        <LoginButton provider={OAuthProvider.MICROSOFT} />
        <LoginButton provider={OAuthProvider.APPLE} />
      </div>
    </div>
  );
}
`;
  }

  private generateReactNativeOAuthService(): string {
    return `// React Native OAuth Service - Generated by DNA OAuth Module
import { OAuthProvider, OAuthDNAModule } from '@dna/auth';
import { Linking } from 'react-native';

class ReactNativeOAuthService {
  private oauthModule = new OAuthDNAModule();

  constructor() {
    this.setupProviders();
  }

  private setupProviders() {
    // Configure providers (use react-native-config or similar for env vars)
    this.oauthModule.configureProvider(OAuthProvider.GOOGLE, {
      clientId: 'your-google-client-id',
      clientSecret: 'your-google-client-secret',
      redirectUri: 'your-app://oauth/google',
      scopes: ['openid', 'email', 'profile']
    });
  }

  async authenticate(provider: OAuthProvider): Promise<any> {
    try {
      const authUrl = this.oauthModule.generateAuthUrl(provider);
      
      // Open auth URL in browser
      const result = await Linking.openURL(authUrl);
      
      // Handle the callback URL (implement deep linking)
      return new Promise((resolve, reject) => {
        const handleUrl = (url: string) => {
          if (url.includes('oauth')) {
            const code = this.extractCodeFromUrl(url);
            if (code) {
              this.oauthModule.authenticate(provider, code)
                .then(resolve)
                .catch(reject);
            }
          }
        };
        
        Linking.addEventListener('url', handleUrl);
      });
    } catch (error) {
      throw error;
    }
  }

  private extractCodeFromUrl(url: string): string | null {
    const match = url.match(/code=([^&]+)/);
    return match ? match[1] : null;
  }
}

export default new ReactNativeOAuthService();
`;
  }

  private generateReactNativeLoginScreen(): string {
    return `// React Native Login Screen - Generated by DNA OAuth Module
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { OAuthProvider } from '../services/auth/OAuthService';
import OAuthService from '../services/auth/OAuthService';

export function LoginScreen() {
  const handleLogin = async (provider: OAuthProvider) => {
    try {
      const result = await OAuthService.authenticate(provider);
      if (result.success) {
        // Navigate to main app
        console.log('Login successful:', result.userInfo);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.googleButton]}
        onPress={() => handleLogin(OAuthProvider.GOOGLE)}
      >
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.githubButton]}
        onPress={() => handleLogin(OAuthProvider.GITHUB)}
      >
        <Text style={styles.buttonText}>Sign in with GitHub</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    width: '100%',
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#4285f4',
  },
  githubButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
`;
  }

  private generateFlutterOAuthService(): string {
    return `// Flutter OAuth Service - Generated by DNA OAuth Module
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

enum OAuthProvider { google, github, microsoft, apple }

class OAuthService {
  static const Map<OAuthProvider, String> _providerUrls = {
    OAuthProvider.google: 'https://accounts.google.com/o/oauth2/v2/auth',
    OAuthProvider.github: 'https://github.com/login/oauth/authorize',
    OAuthProvider.microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    OAuthProvider.apple: 'https://appleid.apple.com/auth/authorize',
  };

  Future<String> generateAuthUrl(OAuthProvider provider, {
    required String clientId,
    required String redirectUri,
    required List<String> scopes,
    String? state,
  }) async {
    final baseUrl = _providerUrls[provider]!;
    final params = {
      'client_id': clientId,
      'redirect_uri': redirectUri,
      'response_type': 'code',
      'scope': scopes.join(' '),
      if (state != null) 'state': state,
    };

    final uri = Uri.parse(baseUrl).replace(queryParameters: params);
    return uri.toString();
  }

  Future<bool> launchAuth(String authUrl) async {
    final uri = Uri.parse(authUrl);
    if (await canLaunchUrl(uri)) {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return false;
  }

  Future<Map<String, dynamic>?> exchangeCodeForToken({
    required OAuthProvider provider,
    required String code,
    required String clientId,
    required String clientSecret,
    required String redirectUri,
  }) async {
    final tokenUrls = {
      OAuthProvider.google: 'https://oauth2.googleapis.com/token',
      OAuthProvider.github: 'https://github.com/login/oauth/access_token',
      OAuthProvider.microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      OAuthProvider.apple: 'https://appleid.apple.com/auth/token',
    };

    final response = await http.post(
      Uri.parse(tokenUrls[provider]!),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: {
        'client_id': clientId,
        'client_secret': clientSecret,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': redirectUri,
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    return null;
  }
}
`;
  }

  private generateFlutterLoginScreen(): string {
    return `// Flutter Login Screen - Generated by DNA OAuth Module
import 'package:flutter/material.dart';
import '../services/auth/oauth_service.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final OAuthService _oauthService = OAuthService();

  Future<void> _handleLogin(OAuthProvider provider) async {
    try {
      final authUrl = await _oauthService.generateAuthUrl(
        provider,
        clientId: 'your-client-id',
        redirectUri: 'your-app://oauth',
        scopes: ['email', 'profile'],
      );
      
      final launched = await _oauthService.launchAuth(authUrl);
      if (!launched) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to launch authentication')),
        );
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Login failed: \$error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Sign In')),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Choose your sign-in method',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => _handleLogin(OAuthProvider.google),
              icon: Icon(Icons.login),
              label: Text('Sign in with Google'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _handleLogin(OAuthProvider.github),
              icon: Icon(Icons.code),
              label: Text('Sign in with GitHub'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`;
  }

  private generateTauriOAuthService(): string {
    return `// Tauri OAuth Service - Generated by DNA OAuth Module
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import { listen } from '@tauri-apps/api/event';
import type { OAuthProvider } from '@dna/auth';

class TauriOAuthService {
  async authenticate(provider: OAuthProvider): Promise<any> {
    try {
      // Generate auth URL
      const authUrl = await invoke('generate_oauth_url', { provider });
      
      // Open in external browser
      await open(authUrl);
      
      // Listen for callback
      return new Promise((resolve, reject) => {
        const unlisten = listen('oauth-callback', (event) => {
          const { code, error } = event.payload as any;
          
          if (error) {
            reject(new Error(error));
          } else {
            // Exchange code for token
            invoke('exchange_oauth_code', { provider, code })
              .then(resolve)
              .catch(reject);
          }
          
          unlisten.then(fn => fn());
        });
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new TauriOAuthService();
`;
  }

  private generateTauriLoginComponent(): string {
    return `<!-- Tauri Login Component - Generated by DNA OAuth Module -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import TauriOAuthService from '../lib/auth/oauth';
  import type { OAuthProvider } from '@dna/auth';

  const dispatch = createEventDispatcher();

  async function handleLogin(provider: OAuthProvider) {
    try {
      const result = await TauriOAuthService.authenticate(provider);
      dispatch('login-success', result);
    } catch (error) {
      dispatch('login-error', error);
    }
  }
</script>

<div class="login-form">
  <h2>Sign In</h2>
  
  <div class="login-buttons">
    <button 
      class="btn btn-google" 
      on:click={() => handleLogin('google')}
    >
      Sign in with Google
    </button>
    
    <button 
      class="btn btn-github" 
      on:click={() => handleLogin('github')}
    >
      Sign in with GitHub
    </button>
    
    <button 
      class="btn btn-microsoft" 
      on:click={() => handleLogin('microsoft')}
    >
      Sign in with Microsoft
    </button>
    
    <button 
      class="btn btn-apple" 
      on:click={() => handleLogin('apple')}
    >
      Sign in with Apple
    </button>
  </div>
</div>

<style>
  .login-form {
    max-width: 400px;
    margin: 0 auto;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .login-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-google {
    background: #4285f4;
    color: white;
  }

  .btn-github {
    background: #333;
    color: white;
  }

  .btn-microsoft {
    background: #0078d4;
    color: white;
  }

  .btn-apple {
    background: #000;
    color: white;
  }

  .btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
</style>
`;
  }

  private generateSvelteKitOAuthService(): string {
    return `// SvelteKit OAuth Service - Generated by DNA OAuth Module
import { OAuthProvider, OAuthDNAModule } from '@dna/auth';
import { PUBLIC_OAUTH_REDIRECT_URL } from '$env/static/public';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET
} from '$env/static/private';

const oauthModule = new OAuthDNAModule();

// Configure providers
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  oauthModule.configureProvider(OAuthProvider.GOOGLE, {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: \`\${PUBLIC_OAUTH_REDIRECT_URL}/auth/google/callback\`,
    scopes: ['openid', 'email', 'profile']
  });
}

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  oauthModule.configureProvider(OAuthProvider.GITHUB, {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    redirectUri: \`\${PUBLIC_OAUTH_REDIRECT_URL}/auth/github/callback\`,
    scopes: ['user:email']
  });
}

export { oauthModule, OAuthProvider };
`;
  }

  private generateSvelteKitAuthHandler(): string {
    return `// SvelteKit Auth Handler - Generated by DNA OAuth Module
import { redirect } from '@sveltejs/kit';
import { oauthModule, OAuthProvider } from '$lib/auth/oauth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, params, cookies }) => {
  const provider = params.provider as OAuthProvider;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return {
      error: 'Authentication failed',
      details: error
    };
  }

  if (!code) {
    // Generate auth URL and redirect
    const authUrl = oauthModule.generateAuthUrl(provider, state || undefined);
    throw redirect(302, authUrl);
  }

  // Handle callback
  try {
    const result = await oauthModule.authenticate(provider, code);
    
    if (result.success) {
      // Set authentication cookies
      cookies.set('auth_token', result.accessToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: result.expiresIn || 3600
      });
      
      if (result.refreshToken) {
        cookies.set('refresh_token', result.refreshToken, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });
      }
      
      throw redirect(302, '/dashboard');
    } else {
      return {
        error: 'Authentication failed',
        details: result.error?.message
      };
    }
  } catch (error) {
    return {
      error: 'Authentication error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
`;
  }

  private generateSvelteKitLoginPage(): string {
    return `<!-- SvelteKit Login Page - Generated by DNA OAuth Module -->
<script lang="ts">
  import { page } from '$app/stores';
  import { OAuthProvider } from '$lib/auth/oauth';
  
  export let data;
  
  const providers = [
    { id: OAuthProvider.GOOGLE, name: 'Google', color: '#4285f4' },
    { id: OAuthProvider.GITHUB, name: 'GitHub', color: '#333' },
    { id: OAuthProvider.MICROSOFT, name: 'Microsoft', color: '#0078d4' },
    { id: OAuthProvider.APPLE, name: 'Apple', color: '#000' }
  ];
  
  function handleLogin(provider: OAuthProvider) {
    window.location.href = \`/auth/\${provider}\`;
  }
</script>

<svelte:head>
  <title>Sign In</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <h1>Welcome</h1>
    <p>Choose your preferred sign-in method</p>
    
    {#if data?.error}
      <div class="error">
        <p>{data.error}</p>
        {#if data.details}
          <p class="error-details">{data.details}</p>
        {/if}
      </div>
    {/if}
    
    <div class="login-buttons">
      {#each providers as provider}
        <button 
          class="login-btn"
          style="background-color: {provider.color}"
          on:click={() => handleLogin(provider.id)}
        >
          Sign in with {provider.name}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .login-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
    text-align: center;
  }
  
  h1 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 2rem;
  }
  
  p {
    margin: 0 0 2rem 0;
    color: #666;
  }
  
  .error {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  .error-details {
    font-size: 0.9em;
    opacity: 0.8;
    margin-top: 0.5rem;
  }
  
  .login-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .login-btn {
    background: #333;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .login-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .login-btn:active {
    transform: translateY(0);
  }
</style>
`;
  }
}

/**
 * Factory function to create OAuth DNA Module
 */
export function createOAuthModule(): OAuthDNAModule {
  return new OAuthDNAModule();
}
