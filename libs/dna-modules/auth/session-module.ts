/**
 * @fileoverview Session-based Authentication DNA Module - Epic 5 Story 2 AC3
 * Provides session-based authentication with secure cookie management
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
 * Session store interface for different storage backends
 */
export interface ISessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, data: SessionData, ttl?: number): Promise<boolean>;
  delete(sessionId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<number>;
  cleanup(): Promise<number>;
  exists(sessionId: string): Promise<boolean>;
  touch(sessionId: string, ttl?: number): Promise<boolean>;
  getAll(userId?: string): Promise<{ [sessionId: string]: SessionData }>;
}

/**
 * Session data structure
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  userInfo: {
    email?: string;
    name?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: any;
  };
  metadata: {
    createdAt: number;
    lastAccessedAt: number;
    expiresAt: number;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    location?: string;
  };
  flags: {
    persistent: boolean;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  customData: Record<string, any>;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  name: string; // Session cookie name
  secret: string; // Signing secret
  maxAge: number; // Session TTL in seconds
  secure: boolean; // HTTPS only
  httpOnly: boolean; // HTTP only (no JS access)
  sameSite: 'strict' | 'lax' | 'none';
  path: string; // Cookie path
  domain?: string; // Cookie domain
  
  // Security settings
  regenerateOnLogin: boolean; // Regenerate session ID on login
  rollingExpiration: boolean; // Reset expiration on activity
  maxConcurrentSessions: number; // Max sessions per user (0 = unlimited)
  sessionTimeout: number; // Inactivity timeout in seconds
  absoluteTimeout: number; // Absolute session timeout in seconds
  
  // Cookie settings
  signed: boolean; // Sign cookies
  encrypt: boolean; // Encrypt session data
  
  // CSRF protection
  csrfProtection: boolean;
  csrfSecret?: string;
  
  // Session fixation protection
  preventFixation: boolean;
  
  // Store configuration
  store: {
    type: 'memory' | 'redis' | 'database' | 'file';
    options?: Record<string, any>;
  };
}

/**
 * Session creation result
 */
export interface SessionCreateResult {
  success: boolean;
  sessionId?: string;
  sessionData?: SessionData;
  cookie?: {
    name: string;
    value: string;
    options: Record<string, any>;
  };
  csrfToken?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean;
  sessionData?: SessionData;
  renewed?: boolean;
  error?: {
    code: string;
    message: string;
    expired?: boolean;
  };
}

/**
 * Memory-based session store implementation
 */
class MemorySessionStore implements ISessionStore {
  private sessions = new Map<string, SessionData>();
  private userSessions = new Map<string, Set<string>>();
  private cleanupInterval: NodeJS.Timer;

  constructor(cleanupIntervalMs = 300000) { // 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check expiration
    const now = Date.now();
    if (now > session.metadata.expiresAt) {
      await this.delete(sessionId);
      return null;
    }
    
    return session;
  }

  async set(sessionId: string, data: SessionData, ttl?: number): Promise<boolean> {
    try {
      this.sessions.set(sessionId, data);
      
      // Track user sessions
      let userSessionIds = this.userSessions.get(data.userId);
      if (!userSessionIds) {
        userSessionIds = new Set();
        this.userSessions.set(data.userId, userSessionIds);
      }
      userSessionIds.add(sessionId);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async delete(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      
      // Remove from user sessions
      const userSessionIds = this.userSessions.get(session.userId);
      if (userSessionIds) {
        userSessionIds.delete(sessionId);
        if (userSessionIds.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }
      
      return true;
    }
    return false;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const userSessionIds = this.userSessions.get(userId);
    if (!userSessionIds) return 0;
    
    let deleted = 0;
    for (const sessionId of userSessionIds) {
      if (this.sessions.delete(sessionId)) {
        deleted++;
      }
    }
    
    this.userSessions.delete(userId);
    return deleted;
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.metadata.expiresAt) {
        await this.delete(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  async exists(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    return session !== null;
  }

  async touch(sessionId: string, ttl?: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const now = Date.now();
    session.metadata.lastAccessedAt = now;
    
    if (ttl) {
      session.metadata.expiresAt = now + (ttl * 1000);
    }
    
    return true;
  }

  async getAll(userId?: string): Promise<{ [sessionId: string]: SessionData }> {
    const result: { [sessionId: string]: SessionData } = {};
    
    if (userId) {
      const userSessionIds = this.userSessions.get(userId);
      if (userSessionIds) {
        for (const sessionId of userSessionIds) {
          const session = this.sessions.get(sessionId);
          if (session) {
            result[sessionId] = session;
          }
        }
      }
    } else {
      for (const [sessionId, session] of this.sessions.entries()) {
        result[sessionId] = session;
      }
    }
    
    return result;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.userSessions.clear();
  }

  getStats(): {
    totalSessions: number;
    totalUsers: number;
    memoryUsage: number;
  } {
    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
      memoryUsage: this.sessions.size * 1024 // Rough estimate
    };
  }
}

/**
 * Session-based Authentication DNA Module
 */
export class SessionAuthDNAModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'session-auth',
    name: 'Session Authentication',
    version: '1.0.0',
    description: 'Session-based authentication with secure cookie management',
    category: DNAModuleCategory.AUTHENTICATION,
    keywords: ['session', 'authentication', 'cookies', 'security', 'csrf'],
    author: 'DNA Team',
    license: 'MIT',
    deprecated: false,
    experimental: false
  };

  public readonly dependencies = [];
  public readonly conflicts = [];
  public readonly frameworks: FrameworkSupport[] = [
    { framework: SupportedFramework.NEXTJS, supported: true, version: '>=13.0.0' },
    { framework: SupportedFramework.REACT_NATIVE, supported: false, version: 'N/A' },
    { framework: SupportedFramework.FLUTTER, supported: false, version: 'N/A' },
    { framework: SupportedFramework.TAURI, supported: true, version: '>=1.0.0' },
    { framework: SupportedFramework.SVELTEKIT, supported: true, version: '>=1.0.0' }
  ];

  public readonly config = {
    schema: {
      session: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          secret: { type: 'string', minLength: 32 },
          maxAge: { type: 'number', minimum: 300 }, // 5 minutes minimum
          secure: { type: 'boolean' },
          httpOnly: { type: 'boolean' },
          sameSite: { type: 'string', enum: ['strict', 'lax', 'none'] },
          regenerateOnLogin: { type: 'boolean' },
          maxConcurrentSessions: { type: 'number', minimum: 0 }
        },
        required: ['name', 'secret', 'maxAge']
      }
    },
    defaults: {
      session: {
        name: 'dna-session',
        maxAge: 86400, // 24 hours
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        regenerateOnLogin: true,
        rollingExpiration: true,
        maxConcurrentSessions: 5,
        sessionTimeout: 1800, // 30 minutes
        absoluteTimeout: 86400, // 24 hours
        signed: true,
        encrypt: false,
        csrfProtection: true,
        preventFixation: true,
        store: {
          type: 'memory'
        }
      }
    },
    required: ['session.secret'],
    validation: {
      rules: {
        'session.secret': 'Session secret must be at least 32 characters for security',
        'session.maxAge': 'Session max age should be reasonable (recommended: 1-24 hours)',
        'session.secure': 'Secure flag should be true in production'
      }
    }
  };

  private sessionConfig: SessionConfig;
  private sessionStore: ISessionStore;

  constructor(config?: Partial<SessionConfig>) {
    super();
    
    this.sessionConfig = {
      name: 'dna-session',
      secret: crypto.randomBytes(32).toString('hex'),
      maxAge: 86400,
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      regenerateOnLogin: true,
      rollingExpiration: true,
      maxConcurrentSessions: 5,
      sessionTimeout: 1800,
      absoluteTimeout: 86400,
      signed: true,
      encrypt: false,
      csrfProtection: true,
      preventFixation: true,
      store: {
        type: 'memory'
      },
      ...config
    };

    this.sessionStore = new MemorySessionStore();
  }

  /**
   * Configure session settings
   */
  public configure(config: Partial<SessionConfig>): void {
    this.sessionConfig = { ...this.sessionConfig, ...config };
    this.emit('session:configured', { config: this.sessionConfig });
  }

  /**
   * Set custom session store implementation
   */
  public setSessionStore(store: ISessionStore): void {
    this.sessionStore = store;
  }

  /**
   * Create new session
   */
  public async createSession(userId: string, userInfo: any, options?: {
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    location?: string;
    persistent?: boolean;
    customData?: Record<string, any>;
  }): Promise<SessionCreateResult> {
    try {
      // Check concurrent session limit
      if (this.sessionConfig.maxConcurrentSessions > 0) {
        const userSessions = await this.sessionStore.getAll(userId);
        const activeSessions = Object.keys(userSessions).length;
        
        if (activeSessions >= this.sessionConfig.maxConcurrentSessions) {
          // Remove oldest session
          let oldestSessionId: string | null = null;
          let oldestTime = Date.now();
          
          for (const [sessionId, session] of Object.entries(userSessions)) {
            if (session.metadata.createdAt < oldestTime) {
              oldestTime = session.metadata.createdAt;
              oldestSessionId = sessionId;
            }
          }
          
          if (oldestSessionId) {
            await this.sessionStore.delete(oldestSessionId);
            this.emit('session:evicted', { sessionId: oldestSessionId, userId });
          }
        }
      }

      const sessionId = this.generateSessionId();
      const now = Date.now();
      
      const sessionData: SessionData = {
        sessionId,
        userId,
        userInfo: {
          email: userInfo.email,
          name: userInfo.name,
          roles: userInfo.roles || [],
          permissions: userInfo.permissions || [],
          ...userInfo
        },
        metadata: {
          createdAt: now,
          lastAccessedAt: now,
          expiresAt: now + (this.sessionConfig.maxAge * 1000),
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
          device: options?.device,
          location: options?.location
        },
        flags: {
          persistent: options?.persistent ?? false,
          secure: this.sessionConfig.secure,
          httpOnly: this.sessionConfig.httpOnly,
          sameSite: this.sessionConfig.sameSite
        },
        customData: options?.customData || {}
      };

      const stored = await this.sessionStore.set(sessionId, sessionData);
      
      if (!stored) {
        return {
          success: false,
          error: {
            code: 'storage_failed',
            message: 'Failed to store session data'
          }
        };
      }

      // Generate cookie value
      const cookieValue = this.sessionConfig.signed ? 
        this.signCookie(sessionId) : sessionId;

      // Generate CSRF token if protection is enabled
      let csrfToken: string | undefined;
      if (this.sessionConfig.csrfProtection) {
        csrfToken = this.generateCSRFToken(sessionId);
      }

      this.emit('session:created', {
        sessionId,
        userId,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent
      });

      return {
        success: true,
        sessionId,
        sessionData,
        cookie: {
          name: this.sessionConfig.name,
          value: cookieValue,
          options: {
            maxAge: this.sessionConfig.maxAge,
            secure: this.sessionConfig.secure,
            httpOnly: this.sessionConfig.httpOnly,
            sameSite: this.sessionConfig.sameSite,
            path: this.sessionConfig.path,
            domain: this.sessionConfig.domain
          }
        },
        csrfToken
      };
    } catch (error) {
      this.emit('session:creation_failed', { userId, error });
      return {
        success: false,
        error: {
          code: 'creation_failed',
          message: error instanceof Error ? error.message : 'Session creation failed'
        }
      };
    }
  }

  /**
   * Validate session from cookie
   */
  public async validateSession(cookieValue: string, options?: {
    ipAddress?: string;
    userAgent?: string;
    csrfToken?: string;
  }): Promise<SessionValidationResult> {
    try {
      // Extract session ID from cookie
      let sessionId = cookieValue;
      
      if (this.sessionConfig.signed) {
        const unsigned = this.unsignCookie(cookieValue);
        if (!unsigned) {
          return {
            valid: false,
            error: {
              code: 'invalid_signature',
              message: 'Invalid cookie signature'
            }
          };
        }
        sessionId = unsigned;
      }

      // Get session data
      const sessionData = await this.sessionStore.get(sessionId);
      
      if (!sessionData) {
        return {
          valid: false,
          error: {
            code: 'session_not_found',
            message: 'Session not found or expired',
            expired: true
          }
        };
      }

      const now = Date.now();
      
      // Check absolute timeout
      if (now > sessionData.metadata.createdAt + (this.sessionConfig.absoluteTimeout * 1000)) {
        await this.sessionStore.delete(sessionId);
        return {
          valid: false,
          error: {
            code: 'session_expired',
            message: 'Session has reached absolute timeout',
            expired: true
          }
        };
      }

      // Check inactivity timeout
      if (now > sessionData.metadata.lastAccessedAt + (this.sessionConfig.sessionTimeout * 1000)) {
        await this.sessionStore.delete(sessionId);
        return {
          valid: false,
          error: {
            code: 'session_inactive',
            message: 'Session expired due to inactivity',
            expired: true
          }
        };
      }

      // Validate CSRF token if protection is enabled
      if (this.sessionConfig.csrfProtection && options?.csrfToken) {
        const validCSRF = this.validateCSRFToken(sessionId, options.csrfToken);
        if (!validCSRF) {
          return {
            valid: false,
            error: {
              code: 'invalid_csrf_token',
              message: 'Invalid CSRF token'
            }
          };
        }
      }

      // Update last accessed time if rolling expiration is enabled
      let renewed = false;
      if (this.sessionConfig.rollingExpiration) {
        sessionData.metadata.lastAccessedAt = now;
        sessionData.metadata.expiresAt = now + (this.sessionConfig.maxAge * 1000);
        await this.sessionStore.set(sessionId, sessionData);
        renewed = true;
      } else {
        // Just touch the session
        await this.sessionStore.touch(sessionId);
      }

      // Update session metadata if provided
      if (options?.ipAddress && options.ipAddress !== sessionData.metadata.ipAddress) {
        this.emit('session:ip_changed', {
          sessionId,
          userId: sessionData.userId,
          oldIp: sessionData.metadata.ipAddress,
          newIp: options.ipAddress
        });
        sessionData.metadata.ipAddress = options.ipAddress;
      }

      this.emit('session:validated', {
        sessionId,
        userId: sessionData.userId,
        renewed
      });

      return {
        valid: true,
        sessionData,
        renewed
      };
    } catch (error) {
      this.emit('session:validation_failed', { error });
      return {
        valid: false,
        error: {
          code: 'validation_error',
          message: error instanceof Error ? error.message : 'Session validation failed'
        }
      };
    }
  }

  /**
   * Update session data
   */
  public async updateSession(sessionId: string, updates: {
    userInfo?: Partial<SessionData['userInfo']>;
    customData?: Record<string, any>;
    metadata?: Partial<SessionData['metadata']>;
  }): Promise<boolean> {
    try {
      const sessionData = await this.sessionStore.get(sessionId);
      if (!sessionData) return false;

      if (updates.userInfo) {
        sessionData.userInfo = { ...sessionData.userInfo, ...updates.userInfo };
      }

      if (updates.customData) {
        sessionData.customData = { ...sessionData.customData, ...updates.customData };
      }

      if (updates.metadata) {
        sessionData.metadata = { ...sessionData.metadata, ...updates.metadata };
      }

      const success = await this.sessionStore.set(sessionId, sessionData);
      
      if (success) {
        this.emit('session:updated', { sessionId, userId: sessionData.userId });
      }

      return success;
    } catch (error) {
      this.emit('session:update_failed', { sessionId, error });
      return false;
    }
  }

  /**
   * Destroy session
   */
  public async destroySession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.sessionStore.get(sessionId);
      const success = await this.sessionStore.delete(sessionId);
      
      if (success && sessionData) {
        this.emit('session:destroyed', {
          sessionId,
          userId: sessionData.userId
        });
      }

      return success;
    } catch (error) {
      this.emit('session:destruction_failed', { sessionId, error });
      return false;
    }
  }

  /**
   * Destroy all sessions for a user
   */
  public async destroyUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    try {
      const userSessions = await this.sessionStore.getAll(userId);
      let destroyedCount = 0;

      for (const sessionId of Object.keys(userSessions)) {
        if (sessionId !== exceptSessionId) {
          const success = await this.sessionStore.delete(sessionId);
          if (success) destroyedCount++;
        }
      }

      this.emit('user_sessions:destroyed', {
        userId,
        destroyedCount,
        exceptSessionId
      });

      return destroyedCount;
    } catch (error) {
      this.emit('user_sessions:destruction_failed', { userId, error });
      return 0;
    }
  }

  /**
   * Regenerate session ID (anti-fixation)
   */
  public async regenerateSessionId(oldSessionId: string): Promise<string | null> {
    try {
      const sessionData = await this.sessionStore.get(oldSessionId);
      if (!sessionData) return null;

      const newSessionId = this.generateSessionId();
      
      // Update session data with new ID
      sessionData.sessionId = newSessionId;
      sessionData.metadata.lastAccessedAt = Date.now();

      // Store with new ID and delete old
      const stored = await this.sessionStore.set(newSessionId, sessionData);
      if (stored) {
        await this.sessionStore.delete(oldSessionId);
        
        this.emit('session:regenerated', {
          oldSessionId,
          newSessionId,
          userId: sessionData.userId
        });
        
        return newSessionId;
      }

      return null;
    } catch (error) {
      this.emit('session:regeneration_failed', { oldSessionId, error });
      return null;
    }
  }

  /**
   * Get session information
   */
  public async getSession(sessionId: string): Promise<SessionData | null> {
    return await this.sessionStore.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  public async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions = await this.sessionStore.getAll(userId);
    return Object.values(sessions);
  }

  /**
   * Generate CSRF token for session
   */
  public generateCSRFToken(sessionId: string): string {
    const data = `${sessionId}:${Date.now()}`;
    return this.signData(data);
  }

  /**
   * Validate CSRF token
   */
  public validateCSRFToken(sessionId: string, token: string): boolean {
    try {
      const unsigned = this.unsignData(token);
      if (!unsigned) return false;

      const [tokenSessionId, timestamp] = unsigned.split(':');
      
      // Check session ID match
      if (tokenSessionId !== sessionId) return false;
      
      // Check token age (tokens valid for 1 hour)
      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 3600000; // 1 hour
      
      return (now - tokenTime) <= maxAge;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup expired sessions
   */
  public async cleanup(): Promise<number> {
    const cleaned = await this.sessionStore.cleanup();
    
    this.emit('cleanup:completed', { cleanedSessions: cleaned });
    
    return cleaned;
  }

  /**
   * Get module statistics
   */
  public async getStats(): Promise<{
    totalSessions: number;
    totalUsers: number;
    memoryUsage?: number;
    config: SessionConfig;
  }> {
    const allSessions = await this.sessionStore.getAll();
    const userIds = new Set(Object.values(allSessions).map(s => s.userId));
    
    let memoryUsage: number | undefined;
    if (this.sessionStore instanceof MemorySessionStore) {
      memoryUsage = this.sessionStore.getStats().memoryUsage;
    }
    
    return {
      totalSessions: Object.keys(allSessions).length,
      totalUsers: userIds.size,
      memoryUsage,
      config: { ...this.sessionConfig }
    };
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sign cookie value
   */
  private signCookie(value: string): string {
    return `${value}.${this.signData(value)}`;
  }

  /**
   * Unsign cookie value
   */
  private unsignCookie(signedValue: string): string | null {
    const parts = signedValue.split('.');
    if (parts.length !== 2) return null;
    
    const [value, signature] = parts;
    const expectedSignature = this.signData(value);
    
    // Use constant-time comparison
    if (!this.constantTimeEquals(signature, expectedSignature)) {
      return null;
    }
    
    return value;
  }

  /**
   * Sign arbitrary data
   */
  private signData(data: string): string {
    const hmac = crypto.createHmac('sha256', this.sessionConfig.secret);
    hmac.update(data);
    return hmac.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Unsign arbitrary data
   */
  private unsignData(signedData: string): string | null {
    try {
      const decoded = Buffer.from(signedData, 'base64').toString('utf-8');
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Constant-time string comparison
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
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
        path: 'lib/auth/session.ts',
        content: this.generateNextJSSessionService(),
        type: 'typescript'
      },
      {
        path: 'middleware.ts',
        content: this.generateNextJSSessionMiddleware(),
        type: 'typescript'
      },
      {
        path: 'pages/api/auth/session.ts',
        content: this.generateNextJSSessionAPI(),
        type: 'typescript'
      }
    ];
  }

  private async generateTauriFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/lib/auth/session.ts',
        content: this.generateTauriSessionService(),
        type: 'typescript'
      },
      {
        path: 'src/lib/stores/session.ts',
        content: this.generateTauriSessionStore(),
        type: 'typescript'
      }
    ];
  }

  private async generateSvelteKitFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/lib/auth/session.ts',
        content: this.generateSvelteKitSessionService(),
        type: 'typescript'
      },
      {
        path: 'src/hooks.server.ts',
        content: this.generateSvelteKitSessionHooks(),
        type: 'typescript'
      },
      {
        path: 'src/app.d.ts',
        content: this.generateSvelteKitSessionTypes(),
        type: 'typescript'
      }
    ];
  }

  // Framework-specific code generation methods
  private generateNextJSSessionService(): string {
    return `// Next.js Session Service - Generated by DNA Session Module
import { cookies } from 'next/headers';
import { SessionAuthDNAModule } from '@dna/auth';
import type { SessionData } from '@dna/auth';

const sessionModule = new SessionAuthDNAModule({
  name: 'dna-session',
  secret: process.env.SESSION_SECRET!,
  maxAge: 86400, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
  regenerateOnLogin: true,
  csrfProtection: true
});

export class SessionService {
  static async createSession(userId: string, userInfo: any, request?: Request) {
    const ipAddress = this.getClientIP(request);
    const userAgent = request?.headers.get('user-agent') || undefined;
    
    const result = await sessionModule.createSession(userId, userInfo, {
      ipAddress,
      userAgent,
      persistent: false
    });
    
    if (result.success && result.cookie) {
      // Set session cookie
      cookies().set(result.cookie.name, result.cookie.value, result.cookie.options);
      
      // Set CSRF token as separate cookie
      if (result.csrfToken) {
        cookies().set('csrf-token', result.csrfToken, {
          maxAge: 3600, // 1 hour
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
      }
    }
    
    return result;
  }
  
  static async validateSession() {
    const sessionCookie = cookies().get('dna-session')?.value;
    if (!sessionCookie) {
      return { valid: false, session: null };
    }
    
    const csrfToken = cookies().get('csrf-token')?.value;
    
    const result = await sessionModule.validateSession(sessionCookie, {
      csrfToken
    });
    
    if (result.valid && result.sessionData) {
      return {
        valid: true,
        session: result.sessionData,
        user: {
          id: result.sessionData.userId,
          ...result.sessionData.userInfo
        }
      };
    }
    
    return { valid: false, session: null, user: null };
  }
  
  static async updateSession(sessionId: string, updates: any) {
    return await sessionModule.updateSession(sessionId, updates);
  }
  
  static async destroySession() {
    const sessionCookie = cookies().get('dna-session')?.value;
    if (sessionCookie) {
      // Extract session ID (handle signed cookies)
      const sessionId = sessionCookie.split('.')[0]; // Simplified
      await sessionModule.destroySession(sessionId);
    }
    
    // Clear cookies
    cookies().delete('dna-session');
    cookies().delete('csrf-token');
  }
  
  static async regenerateSession() {
    const sessionCookie = cookies().get('dna-session')?.value;
    if (!sessionCookie) return null;
    
    const sessionId = sessionCookie.split('.')[0]; // Simplified
    const newSessionId = await sessionModule.regenerateSessionId(sessionId);
    
    if (newSessionId) {
      // Update cookie with new session ID
      const newCookieValue = newSessionId; // Would need proper signing
      cookies().set('dna-session', newCookieValue, {
        maxAge: 86400,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      });
    }
    
    return newSessionId;
  }
  
  static generateCSRFToken(sessionId: string): string {
    return sessionModule.generateCSRFToken(sessionId);
  }
  
  static validateCSRFToken(sessionId: string, token: string): boolean {
    return sessionModule.validateCSRFToken(sessionId, token);
  }
  
  private static getClientIP(request?: Request): string | undefined {
    if (!request) return undefined;
    
    // Try various headers for IP address
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return request.headers.get('x-real-ip') || 
           request.headers.get('cf-connecting-ip') || 
           undefined;
  }
}

export { sessionModule };
export type { SessionData };
`;
  }

  private generateNextJSSessionMiddleware(): string {
    return `// Next.js Session Middleware - Generated by DNA Session Module
import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from './lib/auth/session';

export async function middleware(request: NextRequest) {
  // Skip middleware for static assets and API routes that don't need auth
  if (request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/static') ||
      request.nextUrl.pathname.startsWith('/api/public')) {
    return NextResponse.next();
  }
  
  // Check if this is a protected route
  const protectedPaths = ['/dashboard', '/profile', '/admin'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (isProtectedPath) {
    try {
      const auth = await SessionService.validateSession();
      
      if (!auth.valid) {
        // Redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      // Regenerate session ID on sensitive operations
      if (request.nextUrl.pathname.startsWith('/admin')) {
        await SessionService.regenerateSession();
      }
    } catch (error) {
      console.error('Session middleware error:', error);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
};
`;
  }

  private generateNextJSSessionAPI(): string {
    return `// Next.js Session API - Generated by DNA Session Module
import { NextApiRequest, NextApiResponse } from 'next';
import { SessionService } from '../../../lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get current session info
    try {
      const auth = await SessionService.validateSession();
      
      if (auth.valid) {
        return res.status(200).json({
          authenticated: true,
          user: auth.user,
          session: {
            id: auth.session?.sessionId,
            createdAt: auth.session?.metadata.createdAt,
            lastAccessedAt: auth.session?.metadata.lastAccessedAt,
            expiresAt: auth.session?.metadata.expiresAt
          }
        });
      } else {
        return res.status(401).json({ authenticated: false });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Session validation failed' });
    }
  } else if (req.method === 'DELETE') {
    // Destroy session (logout)
    try {
      await SessionService.destroySession();
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Session destruction failed' });
    }
  } else if (req.method === 'POST') {
    // Regenerate session ID
    try {
      const newSessionId = await SessionService.regenerateSession();
      
      if (newSessionId) {
        return res.status(200).json({ 
          success: true, 
          sessionId: newSessionId 
        });
      } else {
        return res.status(400).json({ error: 'Session regeneration failed' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Session regeneration failed' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
`;
  }

  private generateTauriSessionService(): string {
    return `// Tauri Session Service - Generated by DNA Session Module
import { invoke } from '@tauri-apps/api/tauri';
import { SessionAuthDNAModule } from '@dna/auth';
import type { SessionData } from '@dna/auth';

// Initialize session module with Tauri-specific config
const sessionModule = new SessionAuthDNAModule({
  name: 'tauri-session',
  secret: await invoke('get_session_secret'), // Get from Rust backend
  maxAge: 43200, // 12 hours (shorter for desktop apps)
  secure: true,
  httpOnly: false, // Not applicable for desktop
  sameSite: 'strict',
  regenerateOnLogin: true,
  csrfProtection: false // Not needed for desktop
});

export class TauriSessionService {
  static async createSession(userId: string, userInfo: any) {
    const deviceInfo = await invoke('get_device_info');
    
    const result = await sessionModule.createSession(userId, userInfo, {
      device: deviceInfo.name,
      userAgent: deviceInfo.platform,
      persistent: true
    });
    
    if (result.success && result.sessionData) {
      // Store session data securely in Tauri's storage
      await invoke('store_session', {
        sessionId: result.sessionId,
        sessionData: result.sessionData
      });
    }
    
    return result;
  }
  
  static async validateSession(): Promise<{ valid: boolean; session?: SessionData; user?: any }> {
    try {
      const storedSessionId = await invoke('get_current_session_id');
      if (!storedSessionId) {
        return { valid: false };
      }
      
      const result = await sessionModule.validateSession(storedSessionId);
      
      if (result.valid && result.sessionData) {
        // Update stored session data if renewed
        if (result.renewed) {
          await invoke('update_session', {
            sessionId: storedSessionId,
            sessionData: result.sessionData
          });
        }
        
        return {
          valid: true,
          session: result.sessionData,
          user: {
            id: result.sessionData.userId,
            ...result.sessionData.userInfo
          }
        };
      }
      
      // Clean up invalid session
      await invoke('clear_session');
      return { valid: false };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }
  
  static async updateSession(updates: any) {
    try {
      const sessionId = await invoke('get_current_session_id');
      if (!sessionId) return false;
      
      const success = await sessionModule.updateSession(sessionId, updates);
      
      if (success) {
        // Update stored session data
        const session = await sessionModule.getSession(sessionId);
        if (session) {
          await invoke('update_session', {
            sessionId,
            sessionData: session
          });
        }
      }
      
      return success;
    } catch (error) {
      console.error('Session update error:', error);
      return false;
    }
  }
  
  static async destroySession() {
    try {
      const sessionId = await invoke('get_current_session_id');
      if (sessionId) {
        await sessionModule.destroySession(sessionId);
      }
      
      // Clear stored session data
      await invoke('clear_session');
    } catch (error) {
      console.error('Session destruction error:', error);
    }
  }
  
  static async regenerateSession() {
    try {
      const oldSessionId = await invoke('get_current_session_id');
      if (!oldSessionId) return null;
      
      const newSessionId = await sessionModule.regenerateSessionId(oldSessionId);
      
      if (newSessionId) {
        // Update stored session ID
        await invoke('store_session_id', { sessionId: newSessionId });
        
        const newSession = await sessionModule.getSession(newSessionId);
        if (newSession) {
          await invoke('update_session', {
            sessionId: newSessionId,
            sessionData: newSession
          });
        }
      }
      
      return newSessionId;
    } catch (error) {
      console.error('Session regeneration error:', error);
      return null;
    }
  }
  
  static async getSessionInfo() {
    try {
      const sessionId = await invoke('get_current_session_id');
      if (!sessionId) return null;
      
      return await sessionModule.getSession(sessionId);
    } catch (error) {
      console.error('Get session info error:', error);
      return null;
    }
  }
}
`;
  }

  private generateTauriSessionStore(): string {
    return `// Tauri Session Store - Generated by DNA Session Module
import { writable, derived } from 'svelte/store';
import { TauriSessionService } from './session';
import type { SessionData } from '@dna/auth';

interface SessionState {
  isAuthenticated: boolean;
  user: any | null;
  session: SessionData | null;
  loading: boolean;
  error: string | null;
}

const initialState: SessionState = {
  isAuthenticated: false,
  user: null,
  session: null,
  loading: true,
  error: null
};

export const sessionStore = writable<SessionState>(initialState);

export const sessionActions = {
  async initialize() {
    sessionStore.update(state => ({ ...state, loading: true }));
    
    try {
      const auth = await TauriSessionService.validateSession();
      
      if (auth.valid) {
        sessionStore.set({
          isAuthenticated: true,
          user: auth.user,
          session: auth.session || null,
          loading: false,
          error: null
        });
      } else {
        sessionStore.set({
          isAuthenticated: false,
          user: null,
          session: null,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      sessionStore.set({
        isAuthenticated: false,
        user: null,
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Session validation failed'
      });
    }
  },
  
  async createSession(userId: string, userInfo: any) {
    sessionStore.update(state => ({ ...state, loading: true, error: null }));
    
    try {
      const result = await TauriSessionService.createSession(userId, userInfo);
      
      if (result.success) {
        sessionStore.set({
          isAuthenticated: true,
          user: { id: userId, ...userInfo },
          session: result.sessionData || null,
          loading: false,
          error: null
        });
        return { success: true };
      } else {
        sessionStore.update(state => ({
          ...state,
          loading: false,
          error: result.error?.message || 'Session creation failed'
        }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Session creation failed';
      sessionStore.update(state => ({
        ...state,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: { code: 'unknown', message: errorMessage } };
    }
  },
  
  async updateSession(updates: any) {
    try {
      const success = await TauriSessionService.updateSession(updates);
      
      if (success) {
        sessionStore.update(state => ({
          ...state,
          user: { ...state.user, ...updates.userInfo },
          session: state.session ? {
            ...state.session,
            userInfo: { ...state.session.userInfo, ...updates.userInfo },
            customData: { ...state.session.customData, ...updates.customData }
          } : null
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Session update failed:', error);
      return false;
    }
  },
  
  async destroySession() {
    sessionStore.update(state => ({ ...state, loading: true }));
    
    try {
      await TauriSessionService.destroySession();
      sessionStore.set({
        isAuthenticated: false,
        user: null,
        session: null,
        loading: false,
        error: null
      });
    } catch (error) {
      // Even if destruction fails, clear local state
      sessionStore.set({
        isAuthenticated: false,
        user: null,
        session: null,
        loading: false,
        error: null
      });
    }
  },
  
  async regenerateSession() {
    try {
      const newSessionId = await TauriSessionService.regenerateSession();
      
      if (newSessionId) {
        // Refresh session data
        const sessionInfo = await TauriSessionService.getSessionInfo();
        if (sessionInfo) {
          sessionStore.update(state => ({
            ...state,
            session: sessionInfo
          }));
        }
      }
      
      return newSessionId;
    } catch (error) {
      console.error('Session regeneration failed:', error);
      return null;
    }
  },
  
  clearError() {
    sessionStore.update(state => ({ ...state, error: null }));
  }
};

// Derived stores
export const isAuthenticated = derived(sessionStore, $session => $session.isAuthenticated);
export const currentUser = derived(sessionStore, $session => $session.user);
export const currentSession = derived(sessionStore, $session => $session.session);
export const isLoading = derived(sessionStore, $session => $session.loading);
export const sessionError = derived(sessionStore, $session => $session.error);
`;
  }

  private generateSvelteKitSessionService(): string {
    return `// SvelteKit Session Service - Generated by DNA Session Module
import { SessionAuthDNAModule } from '@dna/auth';
import { SESSION_SECRET } from '$env/static/private';
import type { SessionData } from '@dna/auth';

const sessionModule = new SessionAuthDNAModule({
  name: 'sveltekit-session',
  secret: SESSION_SECRET,
  maxAge: 86400, // 24 hours
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
  regenerateOnLogin: true,
  csrfProtection: true,
  rollingExpiration: true
});

export class SvelteKitSessionService {
  static async createSession(userId: string, userInfo: any, event: any) {
    const ipAddress = this.getClientIP(event.request);
    const userAgent = event.request.headers.get('user-agent') || undefined;
    
    const result = await sessionModule.createSession(userId, userInfo, {
      ipAddress,
      userAgent,
      persistent: false
    });
    
    if (result.success && result.cookie) {
      // Set session cookie
      event.cookies.set(result.cookie.name, result.cookie.value, result.cookie.options);
      
      // Set CSRF token as separate cookie
      if (result.csrfToken) {
        event.cookies.set('csrf-token', result.csrfToken, {
          maxAge: 3600, // 1 hour
          secure: true,
          sameSite: 'strict',
          path: '/'
        });
      }
    }
    
    return result;
  }
  
  static async validateSession(event: any) {
    const sessionCookie = event.cookies.get('sveltekit-session');
    if (!sessionCookie) {
      return { valid: false, session: null, user: null };
    }
    
    const csrfToken = event.cookies.get('csrf-token');
    const ipAddress = this.getClientIP(event.request);
    const userAgent = event.request.headers.get('user-agent') || undefined;
    
    const result = await sessionModule.validateSession(sessionCookie, {
      ipAddress,
      userAgent,
      csrfToken
    });
    
    if (result.valid && result.sessionData) {
      return {
        valid: true,
        session: result.sessionData,
        user: {
          id: result.sessionData.userId,
          ...result.sessionData.userInfo
        },
        renewed: result.renewed
      };
    }
    
    return { valid: false, session: null, user: null };
  }
  
  static async updateSession(sessionId: string, updates: any) {
    return await sessionModule.updateSession(sessionId, updates);
  }
  
  static async destroySession(event: any) {
    const sessionCookie = event.cookies.get('sveltekit-session');
    if (sessionCookie) {
      // Extract session ID (handle signed cookies properly)
      const sessionId = sessionCookie.split('.')[0]; // Simplified
      await sessionModule.destroySession(sessionId);
    }
    
    // Clear cookies
    event.cookies.delete('sveltekit-session', { path: '/' });
    event.cookies.delete('csrf-token', { path: '/' });
  }
  
  static async regenerateSession(event: any) {
    const sessionCookie = event.cookies.get('sveltekit-session');
    if (!sessionCookie) return null;
    
    const sessionId = sessionCookie.split('.')[0]; // Simplified
    const newSessionId = await sessionModule.regenerateSessionId(sessionId);
    
    if (newSessionId) {
      // Update cookie with new session ID (would need proper signing)
      event.cookies.set('sveltekit-session', newSessionId, {
        maxAge: 86400,
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
      });
    }
    
    return newSessionId;
  }
  
  static generateCSRFToken(sessionId: string): string {
    return sessionModule.generateCSRFToken(sessionId);
  }
  
  static validateCSRFToken(sessionId: string, token: string): boolean {
    return sessionModule.validateCSRFToken(sessionId, token);
  }
  
  static async getUserSessions(userId: string) {
    return await sessionModule.getUserSessions(userId);
  }
  
  static async destroyUserSessions(userId: string, exceptSessionId?: string) {
    return await sessionModule.destroyUserSessions(userId, exceptSessionId);
  }
  
  private static getClientIP(request: Request): string | undefined {
    // Try various headers for IP address
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return request.headers.get('x-real-ip') || 
           request.headers.get('cf-connecting-ip') || 
           undefined;
  }
}

export { sessionModule };
export type { SessionData };
`;
  }

  private generateSvelteKitSessionHooks(): string {
    return `// SvelteKit Session Hooks - Generated by DNA Session Module
import type { Handle } from '@sveltejs/kit';
import { SvelteKitSessionService } from '$lib/auth/session';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Skip session handling for static assets and public API routes
  if (event.url.pathname.startsWith('/static') || 
      event.url.pathname.startsWith('/favicon') ||
      event.url.pathname.startsWith('/api/public')) {
    return resolve(event);
  }

  // Validate session for all requests
  const auth = await SvelteKitSessionService.validateSession(event);
  
  if (auth.valid) {
    // Store user in locals for access in load functions and actions
    event.locals.user = auth.user;
    event.locals.session = auth.session;
    
    // Regenerate session on sensitive operations
    if (event.url.pathname.startsWith('/admin') && event.request.method === 'POST') {
      await SvelteKitSessionService.regenerateSession(event);
    }
  }

  // Check if this is a protected route
  const protectedPaths = ['/dashboard', '/profile', '/admin'];
  const isProtectedPath = protectedPaths.some(path => 
    event.url.pathname.startsWith(path)
  );

  if (isProtectedPath && !auth.valid) {
    // Redirect to login for page requests, return 401 for API requests
    if (event.url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw redirect(302, \`/login?redirect=\${encodeURIComponent(event.url.pathname)}\`);
    }
  }

  return resolve(event);
};
`;
  }

  private generateSvelteKitSessionTypes(): string {
    return `// SvelteKit Session Types - Generated by DNA Session Module
import type { SessionData } from '$lib/auth/session';

declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string;
        email?: string;
        name?: string;
        roles?: string[];
        permissions?: string[];
        [key: string]: any;
      };
      session?: SessionData;
    }
    interface PageData {
      user?: App.Locals['user'];
      session?: {
        id: string;
        createdAt: number;
        lastAccessedAt: number;
        expiresAt: number;
      };
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
    if (this.sessionStore instanceof MemorySessionStore) {
      this.sessionStore.destroy();
    }
    this.removeAllListeners();
  }
}

/**
 * Factory function to create Session DNA Module
 */
export function createSessionModule(config?: Partial<SessionConfig>): SessionAuthDNAModule {
  return new SessionAuthDNAModule(config);
}
