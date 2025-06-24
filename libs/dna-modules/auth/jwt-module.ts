/**
 * @fileoverview JWT Authentication DNA Module - Epic 5 Story 2 AC2
 * Provides JWT authentication with refresh tokens and security best practices
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
import * as crypto from 'crypto';

/**
 * JWT token type enumeration
 */
export enum JWTTokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  ID = 'id'
}

/**
 * JWT algorithm enumeration
 */
export enum JWTAlgorithm {
  HS256 = 'HS256',
  HS384 = 'HS384',
  HS512 = 'HS512',
  RS256 = 'RS256',
  RS384 = 'RS384',
  RS512 = 'RS512',
  ES256 = 'ES256',
  ES384 = 'ES384',
  ES512 = 'ES512'
}

/**
 * JWT header structure
 */
export interface JWTHeader {
  alg: JWTAlgorithm;
  typ: 'JWT';
  kid?: string; // Key ID for key rotation
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  iss?: string; // Issuer
  sub: string; // Subject (user ID)
  aud?: string | string[]; // Audience
  exp: number; // Expiration time (Unix timestamp)
  nbf?: number; // Not before (Unix timestamp)
  iat: number; // Issued at (Unix timestamp)
  jti?: string; // JWT ID (unique identifier)
  
  // Custom claims
  scope?: string; // Space-separated list of scopes
  role?: string | string[]; // User roles
  permissions?: string[]; // User permissions
  sessionId?: string; // Session identifier
  tokenType: JWTTokenType; // Token type
  
  // Additional custom claims
  [key: string]: any;
}

/**
 * JWT configuration
 */
export interface JWTConfig {
  issuer: string;
  audience?: string | string[];
  algorithm: JWTAlgorithm;
  secretKey?: string; // For HMAC algorithms
  privateKey?: string; // For RSA/ECDSA algorithms
  publicKey?: string; // For RSA/ECDSA verification
  keyId?: string; // Key identifier
  
  // Token lifetimes
  accessTokenTTL: number; // in seconds
  refreshTokenTTL: number; // in seconds
  idTokenTTL?: number; // in seconds
  
  // Security settings
  enableRefreshTokenRotation: boolean;
  enableTokenBlacklisting: boolean;
  maxRefreshTokenUses?: number;
  allowedClockSkew: number; // in seconds
  
  // Additional security
  requireSecureTransport: boolean;
  enableJTI: boolean; // Unique token IDs
  enableAudience: boolean;
}

/**
 * JWT token generation result
 */
export interface JWTTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * JWT token validation result
 */
export interface JWTValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  header?: JWTHeader;
  error?: {
    code: string;
    message: string;
    expiredAt?: Date;
  };
}

/**
 * JWT refresh result
 */
export interface JWTRefreshResult {
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
 * Token blacklist interface
 */
export interface ITokenBlacklist {
  add(jti: string, exp: number): Promise<boolean>;
  isBlacklisted(jti: string): Promise<boolean>;
  cleanup(): Promise<number>; // Returns number of cleaned up entries
}

/**
 * In-memory token blacklist implementation
 */
class MemoryTokenBlacklist implements ITokenBlacklist {
  private blacklist = new Map<string, number>();
  private cleanupInterval: NodeJS.Timer;

  constructor(cleanupIntervalMs = 60000) {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async add(jti: string, exp: number): Promise<boolean> {
    this.blacklist.set(jti, exp);
    return true;
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const exp = this.blacklist.get(jti);
    if (!exp) return false;
    
    // Remove expired entries
    if (Date.now() / 1000 > exp) {
      this.blacklist.delete(jti);
      return false;
    }
    
    return true;
  }

  async cleanup(): Promise<number> {
    const now = Date.now() / 1000;
    let cleaned = 0;
    
    for (const [jti, exp] of this.blacklist.entries()) {
      if (now > exp) {
        this.blacklist.delete(jti);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.blacklist.clear();
  }
}

/**
 * JWT Authentication DNA Module
 */
export class JWTAuthDNAModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'jwt-auth',
    name: 'JWT Authentication',
    version: '1.0.0',
    description: 'JWT authentication with refresh tokens and security best practices',
    category: DNAModuleCategory.AUTHENTICATION,
    keywords: ['jwt', 'authentication', 'tokens', 'security', 'refresh'],
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
      jwt: {
        type: 'object',
        properties: {
          issuer: { type: 'string' },
          audience: { type: ['string', 'array'] },
          algorithm: { type: 'string', enum: Object.values(JWTAlgorithm) },
          secretKey: { type: 'string' },
          accessTokenTTL: { type: 'number', minimum: 300 }, // 5 minutes minimum
          refreshTokenTTL: { type: 'number', minimum: 3600 }, // 1 hour minimum
          enableRefreshTokenRotation: { type: 'boolean' },
          enableTokenBlacklisting: { type: 'boolean' }
        },
        required: ['issuer', 'algorithm', 'secretKey', 'accessTokenTTL', 'refreshTokenTTL']
      }
    },
    defaults: {
      jwt: {
        algorithm: JWTAlgorithm.HS256,
        accessTokenTTL: 900, // 15 minutes
        refreshTokenTTL: 604800, // 7 days
        enableRefreshTokenRotation: true,
        enableTokenBlacklisting: true,
        allowedClockSkew: 30,
        requireSecureTransport: true,
        enableJTI: true,
        enableAudience: true
      }
    },
    required: ['jwt.issuer', 'jwt.secretKey'],
    validation: {
      rules: {
        'jwt.secretKey': 'Secret key must be at least 32 characters for security',
        'jwt.accessTokenTTL': 'Access token TTL should be short-lived (recommended: 15-60 minutes)',
        'jwt.refreshTokenTTL': 'Refresh token TTL should be longer than access token TTL'
      }
    }
  };

  private jwtConfig: JWTConfig;
  private tokenBlacklist: ITokenBlacklist;
  private refreshTokens = new Map<string, {
    userId: string;
    expiresAt: number;
    uses: number;
    sessionId: string;
  }>();

  constructor(config?: Partial<JWTConfig>) {
    super();
    
    this.jwtConfig = {
      issuer: 'dna-app',
      algorithm: JWTAlgorithm.HS256,
      accessTokenTTL: 900,
      refreshTokenTTL: 604800,
      enableRefreshTokenRotation: true,
      enableTokenBlacklisting: true,
      allowedClockSkew: 30,
      requireSecureTransport: true,
      enableJTI: true,
      enableAudience: true,
      ...config
    };

    this.tokenBlacklist = new MemoryTokenBlacklist();
  }

  /**
   * Configure JWT settings
   */
  public configure(config: Partial<JWTConfig>): void {
    this.jwtConfig = { ...this.jwtConfig, ...config };
    this.emit('jwt:configured', { config: this.jwtConfig });
  }

  /**
   * Set custom token blacklist implementation
   */
  public setTokenBlacklist(blacklist: ITokenBlacklist): void {
    this.tokenBlacklist = blacklist;
  }

  /**
   * Generate JWT tokens for user
   */
  public async generateTokens(payload: {
    userId: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    scope?: string;
    sessionId?: string;
    [key: string]: any;
  }): Promise<JWTTokenResult> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const sessionId = payload.sessionId || this.generateSessionId();
      
      // Generate access token
      const accessTokenPayload: JWTPayload = {
        iss: this.jwtConfig.issuer,
        sub: payload.userId,
        aud: this.jwtConfig.audience,
        exp: now + this.jwtConfig.accessTokenTTL,
        iat: now,
        tokenType: JWTTokenType.ACCESS,
        sessionId,
        ...payload
      };

      if (this.jwtConfig.enableJTI) {
        accessTokenPayload.jti = this.generateJTI();
      }

      const accessToken = this.signToken(accessTokenPayload);

      // Generate refresh token
      const refreshTokenPayload: JWTPayload = {
        iss: this.jwtConfig.issuer,
        sub: payload.userId,
        aud: this.jwtConfig.audience,
        exp: now + this.jwtConfig.refreshTokenTTL,
        iat: now,
        tokenType: JWTTokenType.REFRESH,
        sessionId
      };

      if (this.jwtConfig.enableJTI) {
        refreshTokenPayload.jti = this.generateJTI();
      }

      const refreshToken = this.signToken(refreshTokenPayload);

      // Store refresh token metadata
      if (refreshTokenPayload.jti) {
        this.refreshTokens.set(refreshTokenPayload.jti, {
          userId: payload.userId,
          expiresAt: refreshTokenPayload.exp,
          uses: 0,
          sessionId
        });
      }

      // Generate ID token if user info is provided
      let idToken: string | undefined;
      if (payload.email) {
        const idTokenPayload: JWTPayload = {
          iss: this.jwtConfig.issuer,
          sub: payload.userId,
          aud: this.jwtConfig.audience,
          exp: now + (this.jwtConfig.idTokenTTL || this.jwtConfig.accessTokenTTL),
          iat: now,
          tokenType: JWTTokenType.ID,
          email: payload.email,
          email_verified: true,
          sessionId
        };

        if (this.jwtConfig.enableJTI) {
          idTokenPayload.jti = this.generateJTI();
        }

        idToken = this.signToken(idTokenPayload);
      }

      this.emit('tokens:generated', {
        userId: payload.userId,
        sessionId,
        accessTokenExp: accessTokenPayload.exp,
        refreshTokenExp: refreshTokenPayload.exp
      });

      return {
        success: true,
        accessToken,
        refreshToken,
        idToken,
        expiresIn: this.jwtConfig.accessTokenTTL,
        tokenType: 'Bearer',
        scope: payload.scope
      };
    } catch (error) {
      this.emit('tokens:generation_failed', { error });
      return {
        success: false,
        tokenType: 'Bearer',
        error: {
          code: 'token_generation_failed',
          message: error instanceof Error ? error.message : 'Failed to generate tokens'
        }
      };
    }
  }

  /**
   * Validate JWT token
   */
  public async validateToken(token: string, expectedType?: JWTTokenType): Promise<JWTValidationResult> {
    try {
      const decoded = this.verifyToken(token);
      
      if (!decoded) {
        return {
          valid: false,
          error: {
            code: 'invalid_token',
            message: 'Token is invalid or malformed'
          }
        };
      }

      const { header, payload } = decoded;

      // Check token type if specified
      if (expectedType && payload.tokenType !== expectedType) {
        return {
          valid: false,
          error: {
            code: 'invalid_token_type',
            message: `Expected ${expectedType} token, got ${payload.tokenType}`
          }
        };
      }

      // Check if token is blacklisted
      if (this.jwtConfig.enableTokenBlacklisting && payload.jti) {
        const isBlacklisted = await this.tokenBlacklist.isBlacklisted(payload.jti);
        if (isBlacklisted) {
          return {
            valid: false,
            error: {
              code: 'token_blacklisted',
              message: 'Token has been revoked'
            }
          };
        }
      }

      // Check expiration with clock skew
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && now > payload.exp + this.jwtConfig.allowedClockSkew) {
        return {
          valid: false,
          error: {
            code: 'token_expired',
            message: 'Token has expired',
            expiredAt: new Date(payload.exp * 1000)
          }
        };
      }

      // Check not before
      if (payload.nbf && now < payload.nbf - this.jwtConfig.allowedClockSkew) {
        return {
          valid: false,
          error: {
            code: 'token_not_yet_valid',
            message: 'Token is not yet valid'
          }
        };
      }

      this.emit('token:validated', {
        userId: payload.sub,
        tokenType: payload.tokenType,
        sessionId: payload.sessionId
      });

      return {
        valid: true,
        payload,
        header
      };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'validation_error',
          message: error instanceof Error ? error.message : 'Token validation failed'
        }
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<JWTRefreshResult> {
    try {
      // Validate refresh token
      const validation = await this.validateToken(refreshToken, JWTTokenType.REFRESH);
      
      if (!validation.valid || !validation.payload) {
        return {
          success: false,
          error: {
            code: 'invalid_refresh_token',
            message: validation.error?.message || 'Invalid refresh token'
          }
        };
      }

      const payload = validation.payload;
      const refreshJTI = payload.jti;

      // Check refresh token usage if rotation is enabled
      if (this.jwtConfig.enableRefreshTokenRotation && refreshJTI) {
        const tokenMetadata = this.refreshTokens.get(refreshJTI);
        if (!tokenMetadata) {
          return {
            success: false,
            error: {
              code: 'refresh_token_not_found',
              message: 'Refresh token not found or already used'
            }
          };
        }

        // Check max uses
        if (this.jwtConfig.maxRefreshTokenUses && tokenMetadata.uses >= this.jwtConfig.maxRefreshTokenUses) {
          return {
            success: false,
            error: {
              code: 'refresh_token_exhausted',
              message: 'Refresh token has reached maximum usage limit'
            }
          };
        }

        // Increment usage
        tokenMetadata.uses++;
      }

      // Generate new access token
      const now = Math.floor(Date.now() / 1000);
      const newAccessTokenPayload: JWTPayload = {
        iss: this.jwtConfig.issuer,
        sub: payload.sub,
        aud: payload.aud,
        exp: now + this.jwtConfig.accessTokenTTL,
        iat: now,
        tokenType: JWTTokenType.ACCESS,
        sessionId: payload.sessionId,
        // Preserve custom claims if they exist
        role: payload.role,
        permissions: payload.permissions,
        scope: payload.scope
      };

      if (this.jwtConfig.enableJTI) {
        newAccessTokenPayload.jti = this.generateJTI();
      }

      const newAccessToken = this.signToken(newAccessTokenPayload);

      let newRefreshToken: string | undefined;
      
      // Generate new refresh token if rotation is enabled
      if (this.jwtConfig.enableRefreshTokenRotation) {
        const newRefreshTokenPayload: JWTPayload = {
          iss: this.jwtConfig.issuer,
          sub: payload.sub,
          aud: payload.aud,
          exp: now + this.jwtConfig.refreshTokenTTL,
          iat: now,
          tokenType: JWTTokenType.REFRESH,
          sessionId: payload.sessionId
        };

        if (this.jwtConfig.enableJTI) {
          newRefreshTokenPayload.jti = this.generateJTI();
        }

        newRefreshToken = this.signToken(newRefreshTokenPayload);

        // Store new refresh token metadata
        if (newRefreshTokenPayload.jti) {
          this.refreshTokens.set(newRefreshTokenPayload.jti, {
            userId: payload.sub,
            expiresAt: newRefreshTokenPayload.exp,
            uses: 0,
            sessionId: payload.sessionId!
          });
        }

        // Remove old refresh token
        if (refreshJTI) {
          this.refreshTokens.delete(refreshJTI);
          if (this.jwtConfig.enableTokenBlacklisting) {
            await this.tokenBlacklist.add(refreshJTI, payload.exp);
          }
        }
      }

      this.emit('token:refreshed', {
        userId: payload.sub,
        sessionId: payload.sessionId,
        rotated: this.jwtConfig.enableRefreshTokenRotation
      });

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.jwtConfig.accessTokenTTL
      };
    } catch (error) {
      this.emit('token:refresh_failed', { error });
      return {
        success: false,
        error: {
          code: 'refresh_failed',
          message: error instanceof Error ? error.message : 'Token refresh failed'
        }
      };
    }
  }

  /**
   * Revoke token (add to blacklist)
   */
  public async revokeToken(token: string): Promise<boolean> {
    try {
      const validation = await this.validateToken(token);
      
      if (!validation.valid || !validation.payload || !validation.payload.jti) {
        return false;
      }

      const { payload } = validation;
      
      // Add to blacklist
      if (this.jwtConfig.enableTokenBlacklisting) {
        await this.tokenBlacklist.add(payload.jti, payload.exp);
      }

      // Remove from refresh tokens if it's a refresh token
      if (payload.tokenType === JWTTokenType.REFRESH) {
        this.refreshTokens.delete(payload.jti);
      }

      this.emit('token:revoked', {
        userId: payload.sub,
        tokenType: payload.tokenType,
        sessionId: payload.sessionId,
        jti: payload.jti
      });

      return true;
    } catch (error) {
      this.emit('token:revocation_failed', { error });
      return false;
    }
  }

  /**
   * Revoke all tokens for a user session
   */
  public async revokeSession(sessionId: string): Promise<number> {
    let revokedCount = 0;

    // Revoke refresh tokens for this session
    for (const [jti, metadata] of this.refreshTokens.entries()) {
      if (metadata.sessionId === sessionId) {
        if (this.jwtConfig.enableTokenBlacklisting) {
          await this.tokenBlacklist.add(jti, metadata.expiresAt);
        }
        this.refreshTokens.delete(jti);
        revokedCount++;
      }
    }

    this.emit('session:revoked', {
      sessionId,
      revokedTokens: revokedCount
    });

    return revokedCount;
  }

  /**
   * Sign JWT token
   */
  private signToken(payload: JWTPayload): string {
    const header: JWTHeader = {
      alg: this.jwtConfig.algorithm,
      typ: 'JWT',
      kid: this.jwtConfig.keyId
    };

    const encodedHeader = this.base64URLEncode(JSON.stringify(header));
    const encodedPayload = this.base64URLEncode(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;

    let signature: string;
    
    if (this.jwtConfig.algorithm.startsWith('HS')) {
      // HMAC signatures
      const hmac = crypto.createHmac(this.getHMACAlgorithm(this.jwtConfig.algorithm), this.jwtConfig.secretKey!);
      hmac.update(data);
      signature = this.base64URLEncode(hmac.digest());
    } else {
      // RSA/ECDSA signatures (not implemented in this example)
      throw new Error(`Algorithm ${this.jwtConfig.algorithm} not implemented`);
    }

    return `${data}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): { header: JWTHeader; payload: JWTPayload } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      
      const header: JWTHeader = JSON.parse(this.base64URLDecode(encodedHeader));
      const payload: JWTPayload = JSON.parse(this.base64URLDecode(encodedPayload));
      
      // Verify signature
      const data = `${encodedHeader}.${encodedPayload}`;
      
      if (header.alg.startsWith('HS')) {
        const hmac = crypto.createHmac(this.getHMACAlgorithm(header.alg), this.jwtConfig.secretKey!);
        hmac.update(data);
        const expectedSignature = this.base64URLEncode(hmac.digest());
        
        if (encodedSignature !== expectedSignature) {
          return null;
        }
      } else {
        throw new Error(`Algorithm ${header.alg} not implemented`);
      }

      return { header, payload };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get HMAC algorithm name for crypto module
   */
  private getHMACAlgorithm(jwtAlg: string): string {
    switch (jwtAlg) {
      case 'HS256': return 'sha256';
      case 'HS384': return 'sha384';
      case 'HS512': return 'sha512';
      default: throw new Error(`Unsupported HMAC algorithm: ${jwtAlg}`);
    }
  }

  /**
   * Base64 URL encode
   */
  private base64URLEncode(data: string | Buffer): string {
    const base64 = Buffer.from(data).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private base64URLDecode(encoded: string): string {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    return Buffer.from(base64 + padding, 'base64').toString('utf-8');
  }

  /**
   * Generate unique JWT ID
   */
  private generateJTI(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Cleanup expired refresh tokens
   */
  public async cleanup(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    for (const [jti, metadata] of this.refreshTokens.entries()) {
      if (now > metadata.expiresAt) {
        this.refreshTokens.delete(jti);
        cleaned++;
      }
    }

    // Cleanup blacklist
    const blacklistCleaned = await this.tokenBlacklist.cleanup();
    
    this.emit('cleanup:completed', {
      refreshTokensCleaned: cleaned,
      blacklistCleaned
    });

    return cleaned + blacklistCleaned;
  }

  /**
   * Get module statistics
   */
  public getStats(): {
    activeRefreshTokens: number;
    totalSessions: number;
    config: JWTConfig;
  } {
    const sessions = new Set(Array.from(this.refreshTokens.values()).map(t => t.sessionId));
    
    return {
      activeRefreshTokens: this.refreshTokens.size,
      totalSessions: sessions.size,
      config: { ...this.jwtConfig }
    };
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
        path: 'lib/auth/jwt.ts',
        content: this.generateNextJSJWTService(),
        type: 'typescript'
      },
      {
        path: 'middleware.ts',
        content: this.generateNextJSMiddleware(),
        type: 'typescript'
      },
      {
        path: 'pages/api/auth/token.ts',
        content: this.generateNextJSTokenAPI(),
        type: 'typescript'
      }
    ];
  }

  private async generateReactNativeFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/services/auth/JWTService.ts',
        content: this.generateReactNativeJWTService(),
        type: 'typescript'
      },
      {
        path: 'src/utils/tokenStorage.ts',
        content: this.generateReactNativeTokenStorage(),
        type: 'typescript'
      }
    ];
  }

  private async generateFlutterFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'lib/services/auth/jwt_service.dart',
        content: this.generateFlutterJWTService(),
        type: 'dart'
      },
      {
        path: 'lib/utils/token_storage.dart',
        content: this.generateFlutterTokenStorage(),
        type: 'dart'
      }
    ];
  }

  private async generateTauriFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/lib/auth/jwt.ts',
        content: this.generateTauriJWTService(),
        type: 'typescript'
      },
      {
        path: 'src/lib/stores/auth.ts',
        content: this.generateTauriAuthStore(),
        type: 'typescript'
      }
    ];
  }

  private async generateSvelteKitFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/lib/auth/jwt.ts',
        content: this.generateSvelteKitJWTService(),
        type: 'typescript'
      },
      {
        path: 'src/hooks.server.ts',
        content: this.generateSvelteKitAuthHooks(),
        type: 'typescript'
      },
      {
        path: 'src/app.d.ts',
        content: this.generateSvelteKitTypes(),
        type: 'typescript'
      }
    ];
  }

  // Framework-specific code generation methods
  private generateNextJSJWTService(): string {
    return `// Next.js JWT Service - Generated by DNA JWT Module
import { JWTAuthDNAModule, JWTTokenType } from '@dna/auth';
import { cookies } from 'next/headers';

const jwtModule = new JWTAuthDNAModule({
  issuer: process.env.JWT_ISSUER || 'dna-app',
  secretKey: process.env.JWT_SECRET!,
  algorithm: 'HS256',
  accessTokenTTL: 900, // 15 minutes
  refreshTokenTTL: 604800, // 7 days
  enableRefreshTokenRotation: true,
  enableTokenBlacklisting: true
});

export class AuthService {
  static async signIn(userId: string, userInfo: any) {
    const tokens = await jwtModule.generateTokens({
      userId,
      email: userInfo.email,
      roles: userInfo.roles || [],
      permissions: userInfo.permissions || []
    });

    if (tokens.success) {
      // Set HTTP-only cookies
      cookies().set('access_token', tokens.accessToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900
      });

      cookies().set('refresh_token', tokens.refreshToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 604800
      });
    }

    return tokens;
  }

  static async validateRequest() {
    const accessToken = cookies().get('access_token')?.value;
    
    if (!accessToken) {
      return { valid: false, user: null };
    }

    const validation = await jwtModule.validateToken(accessToken, JWTTokenType.ACCESS);
    
    if (validation.valid && validation.payload) {
      return {
        valid: true,
        user: {
          id: validation.payload.sub,
          email: validation.payload.email,
          roles: validation.payload.roles,
          permissions: validation.payload.permissions
        }
      };
    }

    return { valid: false, user: null };
  }

  static async refreshTokens() {
    const refreshToken = cookies().get('refresh_token')?.value;
    
    if (!refreshToken) {
      return { success: false };
    }

    const result = await jwtModule.refreshAccessToken(refreshToken);
    
    if (result.success) {
      cookies().set('access_token', result.accessToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900
      });

      if (result.refreshToken) {
        cookies().set('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 604800
        });
      }
    }

    return result;
  }

  static async signOut() {
    const accessToken = cookies().get('access_token')?.value;
    const refreshToken = cookies().get('refresh_token')?.value;

    // Revoke tokens
    if (accessToken) {
      await jwtModule.revokeToken(accessToken);
    }
    if (refreshToken) {
      await jwtModule.revokeToken(refreshToken);
    }

    // Clear cookies
    cookies().delete('access_token');
    cookies().delete('refresh_token');
  }
}

export { jwtModule };
`;
  }

  private generateNextJSMiddleware(): string {
    return `// Next.js Auth Middleware - Generated by DNA JWT Module
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './lib/auth/jwt';

export async function middleware(request: NextRequest) {
  // Check if this is a protected route
  const protectedPaths = ['/dashboard', '/profile', '/admin'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  try {
    const auth = await AuthService.validateRequest();
    
    if (!auth.valid) {
      // Try to refresh tokens
      const refreshResult = await AuthService.refreshTokens();
      
      if (!refreshResult.success) {
        // Redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // User is authenticated, continue
    return NextResponse.next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/admin/:path*']
};
`;
  }

  private generateNextJSTokenAPI(): string {
    return `// Next.js Token API - Generated by DNA JWT Module
import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from '../../../lib/auth/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Refresh token
    try {
      const result = await AuthService.refreshTokens();
      
      if (result.success) {
        return res.status(200).json({ 
          success: true,
          expiresIn: result.expiresIn 
        });
      } else {
        return res.status(401).json({ 
          error: 'refresh_failed',
          message: result.error?.message 
        });
      }
    } catch (error) {
      return res.status(500).json({ 
        error: 'server_error',
        message: 'Token refresh failed' 
      });
    }
  } else if (req.method === 'DELETE') {
    // Sign out
    try {
      await AuthService.signOut();
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ 
        error: 'signout_failed',
        message: 'Sign out failed' 
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
`;
  }

  private generateReactNativeJWTService(): string {
    return `// React Native JWT Service - Generated by DNA JWT Module
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JWTAuthDNAModule, JWTTokenType } from '@dna/auth';

const jwtModule = new JWTAuthDNAModule({
  issuer: 'dna-mobile-app',
  secretKey: 'your-jwt-secret-key', // Should be from secure config
  algorithm: 'HS256',
  accessTokenTTL: 900,
  refreshTokenTTL: 604800
});

class JWTService {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';

  static async signIn(userId: string, userInfo: any) {
    const tokens = await jwtModule.generateTokens({
      userId,
      email: userInfo.email,
      roles: userInfo.roles || []
    });

    if (tokens.success) {
      await AsyncStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken!);
      if (tokens.refreshToken) {
        await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
    }

    return tokens;
  }

  static async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static async validateCurrentToken(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    const validation = await jwtModule.validateToken(token, JWTTokenType.ACCESS);
    return validation.valid;
  }

  static async refreshTokens(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return false;

    const result = await jwtModule.refreshAccessToken(refreshToken);
    
    if (result.success) {
      await AsyncStorage.setItem(this.ACCESS_TOKEN_KEY, result.accessToken!);
      if (result.refreshToken) {
        await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, result.refreshToken);
      }
      return true;
    }

    return false;
  }

  static async signOut(): Promise<void> {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();

    // Revoke tokens
    if (accessToken) {
      await jwtModule.revokeToken(accessToken);
    }
    if (refreshToken) {
      await jwtModule.revokeToken(refreshToken);
    }

    // Clear storage
    await AsyncStorage.multiRemove([this.ACCESS_TOKEN_KEY, this.REFRESH_TOKEN_KEY]);
  }

  static async getCurrentUser(): Promise<any | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const validation = await jwtModule.validateToken(token, JWTTokenType.ACCESS);
    
    if (validation.valid && validation.payload) {
      return {
        id: validation.payload.sub,
        email: validation.payload.email,
        roles: validation.payload.roles
      };
    }

    return null;
  }
}

export default JWTService;
`;
  }

  private generateReactNativeTokenStorage(): string {
    return `// React Native Token Storage - Generated by DNA JWT Module
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export class SecureTokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_DATA_KEY = 'user_data';

  static async storeTokens(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      const items = [[this.ACCESS_TOKEN_KEY, accessToken]];
      
      if (refreshToken) {
        items.push([this.REFRESH_TOKEN_KEY, refreshToken]);
      }

      await AsyncStorage.multiSet(items);
      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  static async storeUserData(userData: any): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Failed to store user data:', error);
      return false;
    }
  }

  static async getUserData(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  static async clearAll(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        this.ACCESS_TOKEN_KEY,
        this.REFRESH_TOKEN_KEY,
        this.USER_DATA_KEY
      ]);
      return true;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      return false;
    }
  }

  static async hasValidTokens(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();
    return !!(accessToken && refreshToken);
  }
}
`;
  }

  private generateFlutterJWTService(): string {
    return `// Flutter JWT Service - Generated by DNA JWT Module
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';

class JWTService {
  static const _storage = FlutterSecureStorage();
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userDataKey = 'user_data';

  // JWT configuration
  static const String issuer = 'dna-flutter-app';
  static const String secretKey = 'your-jwt-secret-key'; // Should be from secure config
  static const int accessTokenTTL = 900; // 15 minutes
  static const int refreshTokenTTL = 604800; // 7 days

  static Future<Map<String, dynamic>?> signIn({
    required String userId,
    required Map<String, dynamic> userInfo,
  }) async {
    try {
      final tokens = await _generateTokens(userId, userInfo);
      
      if (tokens['success'] == true) {
        await _storage.write(key: _accessTokenKey, value: tokens['accessToken']);
        if (tokens['refreshToken'] != null) {
          await _storage.write(key: _refreshTokenKey, value: tokens['refreshToken']);
        }
        await _storage.write(key: _userDataKey, value: json.encode(userInfo));
      }
      
      return tokens;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  static Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final userDataString = await _storage.read(key: _userDataKey);
      if (userDataString != null) {
        return json.decode(userDataString);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<bool> isTokenValid() async {
    final token = await getAccessToken();
    if (token == null) return false;
    
    try {
      final payload = _decodeToken(token);
      final exp = payload['exp'] as int;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      
      return now < exp;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> refreshTokens() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) return false;
    
    try {
      // Validate refresh token
      final isValid = _validateToken(refreshToken);
      if (!isValid) return false;
      
      final payload = _decodeToken(refreshToken);
      final userId = payload['sub'] as String;
      
      // Generate new access token
      final newTokens = await _generateTokens(userId, {});
      
      if (newTokens['success'] == true) {
        await _storage.write(key: _accessTokenKey, value: newTokens['accessToken']);
        if (newTokens['refreshToken'] != null) {
          await _storage.write(key: _refreshTokenKey, value: newTokens['refreshToken']);
        }
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  static Future<void> signOut() async {
    await _storage.deleteAll();
  }

  static Future<Map<String, dynamic>> _generateTokens(
    String userId, 
    Map<String, dynamic> userInfo
  ) async {
    try {
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      
      // Access token payload
      final accessPayload = {
        'iss': issuer,
        'sub': userId,
        'exp': now + accessTokenTTL,
        'iat': now,
        'tokenType': 'access',
        ...userInfo,
      };
      
      // Refresh token payload
      final refreshPayload = {
        'iss': issuer,
        'sub': userId,
        'exp': now + refreshTokenTTL,
        'iat': now,
        'tokenType': 'refresh',
      };
      
      final accessToken = _signToken(accessPayload);
      final refreshToken = _signToken(refreshPayload);
      
      return {
        'success': true,
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'expiresIn': accessTokenTTL,
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }

  static String _signToken(Map<String, dynamic> payload) {
    final header = {
      'alg': 'HS256',
      'typ': 'JWT',
    };
    
    final encodedHeader = _base64UrlEncode(json.encode(header));
    final encodedPayload = _base64UrlEncode(json.encode(payload));
    final data = '\$encodedHeader.\$encodedPayload';
    
    final signature = _hmacSha256(data, secretKey);
    
    return '\$data.\$signature';
  }

  static bool _validateToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return false;
      
      final header = json.decode(_base64UrlDecode(parts[0]));
      final payload = json.decode(_base64UrlDecode(parts[1]));
      final signature = parts[2];
      
      // Verify signature
      final data = '\${parts[0]}.\${parts[1]}';
      final expectedSignature = _hmacSha256(data, secretKey);
      
      if (signature != expectedSignature) return false;
      
      // Check expiration
      final exp = payload['exp'] as int;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      
      return now < exp;
    } catch (e) {
      return false;
    }
  }

  static Map<String, dynamic> _decodeToken(String token) {
    final parts = token.split('.');
    final payload = json.decode(_base64UrlDecode(parts[1]));
    return payload;
  }

  static String _base64UrlEncode(String data) {
    final encoded = base64.encode(utf8.encode(data));
    return encoded.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  static String _base64UrlDecode(String encoded) {
    final normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
    final padding = '=' * ((4 - normalized.length % 4) % 4);
    return utf8.decode(base64.decode(normalized + padding));
  }

  static String _hmacSha256(String data, String key) {
    final hmac = Hmac(sha256, utf8.encode(key));
    final digest = hmac.convert(utf8.encode(data));
    return _base64UrlEncode(digest.toString());
  }
}
`;
  }

  private generateFlutterTokenStorage(): string {
    return `// Flutter Token Storage - Generated by DNA JWT Module
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: IOSAccessibility.first_unlock_this_device,
    ),
  );

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userDataKey = 'user_data';
  static const String _sessionIdKey = 'session_id';

  static Future<bool> storeTokens({
    required String accessToken,
    String? refreshToken,
    Map<String, dynamic>? userData,
    String? sessionId,
  }) async {
    try {
      await _storage.write(key: _accessTokenKey, value: accessToken);
      
      if (refreshToken != null) {
        await _storage.write(key: _refreshTokenKey, value: refreshToken);
      }
      
      if (userData != null) {
        await _storage.write(key: _userDataKey, value: json.encode(userData));
      }
      
      if (sessionId != null) {
        await _storage.write(key: _sessionIdKey, value: sessionId);
      }
      
      return true;
    } catch (e) {
      print('Failed to store tokens: \$e');
      return false;
    }
  }

  static Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: _accessTokenKey);
    } catch (e) {
      print('Failed to get access token: \$e');
      return null;
    }
  }

  static Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _refreshTokenKey);
    } catch (e) {
      print('Failed to get refresh token: \$e');
      return null;
    }
  }

  static Future<Map<String, dynamic>?> getUserData() async {
    try {
      final userDataString = await _storage.read(key: _userDataKey);
      if (userDataString != null) {
        return json.decode(userDataString);
      }
      return null;
    } catch (e) {
      print('Failed to get user data: \$e');
      return null;
    }
  }

  static Future<String?> getSessionId() async {
    try {
      return await _storage.read(key: _sessionIdKey);
    } catch (e) {
      print('Failed to get session ID: \$e');
      return null;
    }
  }

  static Future<bool> hasValidTokens() async {
    final accessToken = await getAccessToken();
    return accessToken != null;
  }

  static Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
    } catch (e) {
      print('Failed to clear tokens: \$e');
    }
  }

  static Future<void> clearTokens() async {
    try {
      await _storage.delete(key: _accessTokenKey);
      await _storage.delete(key: _refreshTokenKey);
    } catch (e) {
      print('Failed to clear tokens: \$e');
    }
  }

  static Future<Map<String, String>> getAllTokens() async {
    try {
      final all = await _storage.readAll();
      return all;
    } catch (e) {
      print('Failed to get all tokens: \$e');
      return {};
    }
  }
}
`;
  }

  private generateTauriJWTService(): string {
    return `// Tauri JWT Service - Generated by DNA JWT Module
import { invoke } from '@tauri-apps/api/tauri';
import { JWTAuthDNAModule, JWTTokenType } from '@dna/auth';

const jwtModule = new JWTAuthDNAModule({
  issuer: 'dna-tauri-app',
  secretKey: await invoke('get_jwt_secret'), // Get from Rust backend
  algorithm: 'HS256',
  accessTokenTTL: 900,
  refreshTokenTTL: 604800
});

export class TauriJWTService {
  static async signIn(userId: string, userInfo: any) {
    const tokens = await jwtModule.generateTokens({
      userId,
      email: userInfo.email,
      roles: userInfo.roles || []
    });

    if (tokens.success) {
      // Store tokens securely in Tauri's secure storage
      await invoke('store_tokens', {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    }

    return tokens;
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      return await invoke('get_access_token');
    } catch {
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await invoke('get_refresh_token');
    } catch {
      return null;
    }
  }

  static async validateCurrentToken(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    const validation = await jwtModule.validateToken(token, JWTTokenType.ACCESS);
    return validation.valid;
  }

  static async refreshTokens(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return false;

    const result = await jwtModule.refreshAccessToken(refreshToken);
    
    if (result.success) {
      await invoke('store_tokens', {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
      return true;
    }

    return false;
  }

  static async signOut(): Promise<void> {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.getRefreshToken();

    // Revoke tokens
    if (accessToken) {
      await jwtModule.revokeToken(accessToken);
    }
    if (refreshToken) {
      await jwtModule.revokeToken(refreshToken);
    }

    // Clear storage
    await invoke('clear_tokens');
  }

  static async getCurrentUser(): Promise<any | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const validation = await jwtModule.validateToken(token, JWTTokenType.ACCESS);
    
    if (validation.valid && validation.payload) {
      return {
        id: validation.payload.sub,
        email: validation.payload.email,
        roles: validation.payload.roles
      };
    }

    return null;
  }
}
`;
  }

  private generateTauriAuthStore(): string {
    return `// Tauri Auth Store - Generated by DNA JWT Module
import { writable, derived } from 'svelte/store';
import { TauriJWTService } from './jwt';

interface User {
  id: string;
  email?: string;
  roles?: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null
};

export const authStore = writable<AuthState>(initialState);

export const authActions = {
  async initialize() {
    authStore.update(state => ({ ...state, loading: true }));
    
    try {
      const isValid = await TauriJWTService.validateCurrentToken();
      
      if (isValid) {
        const user = await TauriJWTService.getCurrentUser();
        authStore.set({
          isAuthenticated: true,
          user,
          loading: false,
          error: null
        });
      } else {
        // Try to refresh tokens
        const refreshed = await TauriJWTService.refreshTokens();
        
        if (refreshed) {
          const user = await TauriJWTService.getCurrentUser();
          authStore.set({
            isAuthenticated: true,
            user,
            loading: false,
            error: null
          });
        } else {
          authStore.set({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          });
        }
      }
    } catch (error) {
      authStore.set({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  },

  async signIn(userId: string, userInfo: any) {
    authStore.update(state => ({ ...state, loading: true, error: null }));
    
    try {
      const result = await TauriJWTService.signIn(userId, userInfo);
      
      if (result.success) {
        const user = await TauriJWTService.getCurrentUser();
        authStore.set({
          isAuthenticated: true,
          user,
          loading: false,
          error: null
        });
        return { success: true };
      } else {
        authStore.update(state => ({
          ...state,
          loading: false,
          error: result.error?.message || 'Sign in failed'
        }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      authStore.update(state => ({
        ...state,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: { code: 'unknown', message: errorMessage } };
    }
  },

  async signOut() {
    authStore.update(state => ({ ...state, loading: true }));
    
    try {
      await TauriJWTService.signOut();
      authStore.set({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      });
    } catch (error) {
      // Even if sign out fails, clear local state
      authStore.set({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      });
    }
  },

  clearError() {
    authStore.update(state => ({ ...state, error: null }));
  }
};

// Derived stores
export const isAuthenticated = derived(authStore, $auth => $auth.isAuthenticated);
export const currentUser = derived(authStore, $auth => $auth.user);
export const isLoading = derived(authStore, $auth => $auth.loading);
export const authError = derived(authStore, $auth => $auth.error);
`;
  }

  private generateSvelteKitJWTService(): string {
    return `// SvelteKit JWT Service - Generated by DNA JWT Module
import { JWTAuthDNAModule, JWTTokenType } from '@dna/auth';
import { JWT_SECRET, JWT_ISSUER } from '$env/static/private';

const jwtModule = new JWTAuthDNAModule({
  issuer: JWT_ISSUER || 'dna-sveltekit-app',
  secretKey: JWT_SECRET,
  algorithm: 'HS256',
  accessTokenTTL: 900, // 15 minutes
  refreshTokenTTL: 604800, // 7 days
  enableRefreshTokenRotation: true,
  enableTokenBlacklisting: true
});

export class SvelteKitJWTService {
  static async signIn(userId: string, userInfo: any, cookies: any) {
    const tokens = await jwtModule.generateTokens({
      userId,
      email: userInfo.email,
      roles: userInfo.roles || [],
      permissions: userInfo.permissions || []
    });

    if (tokens.success) {
      // Set HTTP-only cookies
      cookies.set('access_token', tokens.accessToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 900
      });

      cookies.set('refresh_token', tokens.refreshToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 604800
      });
    }

    return tokens;
  }

  static async validateRequest(cookies: any) {
    const accessToken = cookies.get('access_token');
    
    if (!accessToken) {
      return { valid: false, user: null };
    }

    const validation = await jwtModule.validateToken(accessToken, JWTTokenType.ACCESS);
    
    if (validation.valid && validation.payload) {
      return {
        valid: true,
        user: {
          id: validation.payload.sub,
          email: validation.payload.email,
          roles: validation.payload.roles,
          permissions: validation.payload.permissions,
          sessionId: validation.payload.sessionId
        }
      };
    }

    return { valid: false, user: null };
  }

  static async refreshTokens(cookies: any) {
    const refreshToken = cookies.get('refresh_token');
    
    if (!refreshToken) {
      return { success: false };
    }

    const result = await jwtModule.refreshAccessToken(refreshToken);
    
    if (result.success) {
      cookies.set('access_token', result.accessToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 900
      });

      if (result.refreshToken) {
        cookies.set('refresh_token', result.refreshToken, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 604800
        });
      }
    }

    return result;
  }

  static async signOut(cookies: any) {
    const accessToken = cookies.get('access_token');
    const refreshToken = cookies.get('refresh_token');

    // Revoke tokens
    if (accessToken) {
      await jwtModule.revokeToken(accessToken);
    }
    if (refreshToken) {
      await jwtModule.revokeToken(refreshToken);
    }

    // Clear cookies
    cookies.delete('access_token', { path: '/' });
    cookies.delete('refresh_token', { path: '/' });
  }

  static async revokeSession(sessionId: string) {
    return await jwtModule.revokeSession(sessionId);
  }
}

export { jwtModule };
`;
  }

  private generateSvelteKitAuthHooks(): string {
    return `// SvelteKit Auth Hooks - Generated by DNA JWT Module
import type { Handle } from '@sveltejs/kit';
import { SvelteKitJWTService } from '$lib/auth/jwt';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Skip auth for static assets and API routes that don't need auth
  if (event.url.pathname.startsWith('/static') || 
      event.url.pathname.startsWith('/favicon') ||
      event.url.pathname.startsWith('/api/public')) {
    return resolve(event);
  }

  // Check authentication for protected routes
  const protectedPaths = ['/dashboard', '/profile', '/admin', '/api/protected'];
  const isProtectedPath = protectedPaths.some(path => 
    event.url.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    const auth = await SvelteKitJWTService.validateRequest(event.cookies);
    
    if (!auth.valid) {
      // Try to refresh tokens
      const refreshResult = await SvelteKitJWTService.refreshTokens(event.cookies);
      
      if (!refreshResult.success) {
        // Redirect to login for page requests, return 401 for API requests
        if (event.url.pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          throw redirect(302, \`/login?redirect=\${encodeURIComponent(event.url.pathname)}\`);
        }
      } else {
        // Re-validate after refresh
        const reauth = await SvelteKitJWTService.validateRequest(event.cookies);
        if (reauth.valid) {
          event.locals.user = reauth.user;
        }
      }
    } else {
      event.locals.user = auth.user;
    }
  }

  return resolve(event);
};
`;
  }

  private generateSvelteKitTypes(): string {
    return `// SvelteKit App Types - Generated by DNA JWT Module
import type { User } from '$lib/auth/jwt';

declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string;
        email?: string;
        roles?: string[];
        permissions?: string[];
        sessionId?: string;
      };
    }
    interface PageData {
      user?: App.Locals['user'];
    }
    // interface Error {}
    // interface Platform {}
  }
}

export {};
`;
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    if (this.tokenBlacklist instanceof MemoryTokenBlacklist) {
      this.tokenBlacklist.destroy();
    }
    this.refreshTokens.clear();
    this.removeAllListeners();
  }
}

/**
 * Factory function to create JWT DNA Module
 */
export function createJWTModule(config?: Partial<JWTConfig>): JWTAuthDNAModule {
  return new JWTAuthDNAModule(config);
}
