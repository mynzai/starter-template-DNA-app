/**
 * @fileoverview Multi-Factor Authentication DNA Module - Epic 5 Story 2 AC5
 * Provides TOTP, SMS, and backup code MFA with comprehensive security features
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
 * MFA method types
 */
export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backupCodes',
  PUSH_NOTIFICATION = 'pushNotification',
  HARDWARE_KEY = 'hardwareKey',
  VOICE_CALL = 'voiceCall'
}

/**
 * MFA verification status
 */
export enum MFAStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired',
  RATE_LIMITED = 'rateLimited',
  DISABLED = 'disabled'
}

/**
 * TOTP algorithm types
 */
export enum TOTPAlgorithm {
  SHA1 = 'SHA1',
  SHA256 = 'SHA256',
  SHA512 = 'SHA512'
}

/**
 * MFA challenge result
 */
export interface MFAChallenge {
  challengeId: string;
  method: MFAMethod;
  expiresAt: Date;
  attemptsRemaining: number;
  data?: {
    qrCode?: string; // For TOTP setup
    phoneNumber?: string; // For SMS (masked)
    email?: string; // For email (masked)
    backupCodesCount?: number;
  };
}

/**
 * MFA verification result
 */
export interface MFAVerificationResult {
  success: boolean;
  challengeId: string;
  method: MFAMethod;
  status: MFAStatus;
  attemptsRemaining?: number;
  nextRetryAt?: Date;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * MFA setup result
 */
export interface MFASetupResult {
  success: boolean;
  method: MFAMethod;
  secret?: string; // TOTP secret (base32 encoded)
  qrCode?: string; // QR code data URL
  backupCodes?: string[]; // Backup recovery codes
  error?: {
    code: string;
    message: string;
  };
}

/**
 * TOTP configuration
 */
export interface TOTPConfig {
  algorithm: TOTPAlgorithm;
  digits: 6 | 8;
  period: number; // in seconds (usually 30)
  window: number; // tolerance window (usually 1-2)
  issuer: string;
  accountName: string;
}

/**
 * SMS configuration
 */
export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'firebase' | 'custom';
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
  template?: string;
  rateLimitPerHour: number;
  codeLength: number;
  codeExpiry: number; // in seconds
}

/**
 * MFA module configuration
 */
export interface MFAConfig {
  // General settings
  enabledMethods: MFAMethod[];
  requireMFA: boolean;
  gracePeriod: number; // in hours
  
  // Rate limiting
  maxAttempts: number;
  lockoutDuration: number; // in minutes
  rateLimitWindow: number; // in minutes
  
  // TOTP settings
  totp: TOTPConfig;
  
  // SMS settings
  sms?: SMSConfig;
  
  // Email settings
  email?: {
    provider: 'sendgrid' | 'ses' | 'mailgun' | 'custom';
    apiKey?: string;
    fromAddress: string;
    template?: string;
    codeExpiry: number; // in seconds
  };
  
  // Backup codes
  backupCodes: {
    count: number;
    length: number;
    algorithm: 'random' | 'uuid';
  };
  
  // Security settings
  encryptSecrets: boolean;
  secretRotationInterval?: number; // in days
  requireFreshAuth: boolean; // for sensitive operations
}

/**
 * User MFA settings
 */
export interface UserMFASettings {
  userId: string;
  enabledMethods: MFAMethod[];
  primaryMethod: MFAMethod;
  totpSecret?: string;
  phoneNumber?: string;
  email?: string;
  backupCodes?: string[];
  lastUsed?: Date;
  setupAt: Date;
  updatedAt: Date;
}

/**
 * MFA challenge storage interface
 */
export interface MFAChallengeStore {
  create(challenge: MFAChallenge & { userId: string; code?: string }): Promise<void>;
  get(challengeId: string): Promise<(MFAChallenge & { userId: string; code?: string }) | null>;
  update(challengeId: string, updates: Partial<MFAChallenge>): Promise<void>;
  delete(challengeId: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * SMS provider interface
 */
export interface SMSProvider {
  sendCode(phoneNumber: string, code: string, template?: string): Promise<boolean>;
  validatePhoneNumber(phoneNumber: string): boolean;
}

/**
 * Email provider interface
 */
export interface EmailProvider {
  sendCode(email: string, code: string, template?: string): Promise<boolean>;
  validateEmail(email: string): boolean;
}

/**
 * Multi-Factor Authentication DNA Module
 */
export class MFAModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'mfa-auth',
    name: 'Multi-Factor Authentication Module',
    version: '1.0.0',
    description: 'Comprehensive MFA implementation with TOTP, SMS, email, and backup codes',
    category: DNAModuleCategory.AUTHENTICATION,
    tags: ['mfa', 'totp', 'sms', 'security', 'authentication'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.FULL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.FULL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['ios', 'android', 'web', 'desktop'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: [],
    devDependencies: [],
    peerDependencies: []
  };

  private config: MFAConfig;
  private challengeStore: MFAChallengeStore;
  private smsProvider?: SMSProvider;
  private emailProvider?: EmailProvider;
  private eventEmitter: EventEmitter;

  constructor(
    config: MFAConfig,
    challengeStore: MFAChallengeStore,
    smsProvider?: SMSProvider,
    emailProvider?: EmailProvider
  ) {
    super();
    this.config = config;
    this.challengeStore = challengeStore;
    this.smsProvider = smsProvider;
    this.emailProvider = emailProvider;
    this.eventEmitter = new EventEmitter();
    
    this.validateConfig();
  }

  /**
   * Generate TOTP secret and QR code for setup
   */
  public async setupTOTP(userId: string, accountName?: string): Promise<MFASetupResult> {
    try {
      // Generate random secret (32 bytes = 160 bits)
      const secretBuffer = crypto.randomBytes(32);
      const secret = this.base32Encode(secretBuffer);
      
      // Generate QR code URL
      const issuer = encodeURIComponent(this.config.totp.issuer);
      const account = encodeURIComponent(accountName || this.config.totp.accountName);
      const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=${this.config.totp.algorithm}&digits=${this.config.totp.digits}&period=${this.config.totp.period}`;
      
      // Generate QR code (simplified - in real implementation, use QR library)
      const qrCode = await this.generateQRCode(otpauthUrl);
      
      this.eventEmitter.emit('totp:setup', { userId, secret });
      
      return {
        success: true,
        method: MFAMethod.TOTP,
        secret,
        qrCode
      };
    } catch (error) {
      return {
        success: false,
        method: MFAMethod.TOTP,
        error: {
          code: 'TOTP_SETUP_FAILED',
          message: error instanceof Error ? error.message : 'TOTP setup failed'
        }
      };
    }
  }

  /**
   * Setup SMS MFA
   */
  public async setupSMS(userId: string, phoneNumber: string): Promise<MFASetupResult> {
    try {
      if (!this.smsProvider) {
        throw new Error('SMS provider not configured');
      }

      if (!this.smsProvider.validatePhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Send verification code
      const code = this.generateCode(this.config.sms!.codeLength);
      const challenge = await this.createChallenge(userId, MFAMethod.SMS, { code });
      
      const sent = await this.smsProvider.sendCode(phoneNumber, code, this.config.sms!.template);
      if (!sent) {
        throw new Error('Failed to send SMS verification code');
      }

      this.eventEmitter.emit('sms:setup', { userId, phoneNumber: this.maskPhoneNumber(phoneNumber) });
      
      return {
        success: true,
        method: MFAMethod.SMS
      };
    } catch (error) {
      return {
        success: false,
        method: MFAMethod.SMS,
        error: {
          code: 'SMS_SETUP_FAILED',
          message: error instanceof Error ? error.message : 'SMS setup failed'
        }
      };
    }
  }

  /**
   * Generate backup codes
   */
  public async generateBackupCodes(userId: string): Promise<MFASetupResult> {
    try {
      const codes: string[] = [];
      const config = this.config.backupCodes;
      
      for (let i = 0; i < config.count; i++) {
        if (config.algorithm === 'uuid') {
          codes.push(crypto.randomUUID().replace(/-/g, '').substring(0, config.length));
        } else {
          codes.push(this.generateCode(config.length));
        }
      }
      
      // Hash codes before storing (in real implementation)
      const hashedCodes = codes.map(code => this.hashCode(code));
      
      this.eventEmitter.emit('backup-codes:generated', { userId, count: codes.length });
      
      return {
        success: true,
        method: MFAMethod.BACKUP_CODES,
        backupCodes: codes
      };
    } catch (error) {
      return {
        success: false,
        method: MFAMethod.BACKUP_CODES,
        error: {
          code: 'BACKUP_CODES_FAILED',
          message: error instanceof Error ? error.message : 'Backup code generation failed'
        }
      };
    }
  }

  /**
   * Create MFA challenge
   */
  public async createChallenge(
    userId: string, 
    method: MFAMethod, 
    options?: { code?: string; phoneNumber?: string; email?: string }
  ): Promise<MFAChallenge> {
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.getMethodExpiry(method) * 1000);
    
    const challenge: MFAChallenge & { userId: string; code?: string } = {
      challengeId,
      method,
      expiresAt,
      attemptsRemaining: this.config.maxAttempts,
      userId,
      code: options?.code
    };

    if (method === MFAMethod.SMS && options?.phoneNumber) {
      challenge.data = { phoneNumber: this.maskPhoneNumber(options.phoneNumber) };
    } else if (method === MFAMethod.EMAIL && options?.email) {
      challenge.data = { email: this.maskEmail(options.email) };
    }

    await this.challengeStore.create(challenge);
    
    this.eventEmitter.emit('challenge:created', { challengeId, method, userId });
    
    return challenge;
  }

  /**
   * Verify MFA code
   */
  public async verifyCode(challengeId: string, code: string): Promise<MFAVerificationResult> {
    try {
      const challenge = await this.challengeStore.get(challengeId);
      if (!challenge) {
        return {
          success: false,
          challengeId,
          method: MFAMethod.TOTP, // Default
          status: MFAStatus.FAILED,
          error: { code: 'CHALLENGE_NOT_FOUND', message: 'Challenge not found' }
        };
      }

      // Check expiry
      if (new Date() > challenge.expiresAt) {
        await this.challengeStore.delete(challengeId);
        return {
          success: false,
          challengeId,
          method: challenge.method,
          status: MFAStatus.EXPIRED,
          error: { code: 'CHALLENGE_EXPIRED', message: 'Challenge has expired' }
        };
      }

      // Check attempts
      if (challenge.attemptsRemaining <= 0) {
        return {
          success: false,
          challengeId,
          method: challenge.method,
          status: MFAStatus.RATE_LIMITED,
          error: { code: 'MAX_ATTEMPTS_EXCEEDED', message: 'Maximum attempts exceeded' }
        };
      }

      let isValid = false;

      // Verify based on method
      switch (challenge.method) {
        case MFAMethod.TOTP:
          isValid = await this.verifyTOTP(challenge.userId, code);
          break;
        case MFAMethod.SMS:
        case MFAMethod.EMAIL:
          isValid = challenge.code === code;
          break;
        case MFAMethod.BACKUP_CODES:
          isValid = await this.verifyBackupCode(challenge.userId, code);
          break;
        default:
          throw new Error(`Unsupported MFA method: ${challenge.method}`);
      }

      if (isValid) {
        await this.challengeStore.delete(challengeId);
        this.eventEmitter.emit('verification:success', { challengeId, method: challenge.method, userId: challenge.userId });
        
        return {
          success: true,
          challengeId,
          method: challenge.method,
          status: MFAStatus.VERIFIED
        };
      } else {
        // Decrement attempts
        const updatedChallenge = {
          ...challenge,
          attemptsRemaining: challenge.attemptsRemaining - 1
        };
        await this.challengeStore.update(challengeId, updatedChallenge);
        
        this.eventEmitter.emit('verification:failed', { challengeId, method: challenge.method, userId: challenge.userId });
        
        return {
          success: false,
          challengeId,
          method: challenge.method,
          status: MFAStatus.FAILED,
          attemptsRemaining: updatedChallenge.attemptsRemaining,
          error: { code: 'INVALID_CODE', message: 'Invalid verification code' }
        };
      }
    } catch (error) {
      return {
        success: false,
        challengeId,
        method: MFAMethod.TOTP, // Default
        status: MFAStatus.FAILED,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Verification failed'
        }
      };
    }
  }

  /**
   * Verify TOTP code
   */
  private async verifyTOTP(userId: string, code: string): Promise<boolean> {
    // In real implementation, get user's TOTP secret from database
    const userSettings = await this.getUserMFASettings(userId);
    if (!userSettings?.totpSecret) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000 / this.config.totp.period);
    const window = this.config.totp.window;

    // Check current time and time windows
    for (let i = -window; i <= window; i++) {
      const timeStep = currentTime + i;
      const expectedCode = this.generateTOTP(userSettings.totpSecret, timeStep);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate TOTP code
   */
  private generateTOTP(secret: string, timeStep: number): string {
    const secretBuffer = this.base32Decode(secret);
    const timeBuffer = Buffer.allocUnsafe(8);
    timeBuffer.writeBigUInt64BE(BigInt(timeStep), 0);

    const hmac = crypto.createHmac(this.config.totp.algorithm.toLowerCase(), secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary = 
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const code = binary % Math.pow(10, this.config.totp.digits);
    return code.toString().padStart(this.config.totp.digits, '0');
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    // In real implementation, check against stored backup codes
    const userSettings = await this.getUserMFASettings(userId);
    if (!userSettings?.backupCodes) {
      return false;
    }

    const hashedCode = this.hashCode(code);
    const index = userSettings.backupCodes.indexOf(hashedCode);
    
    if (index !== -1) {
      // Remove used backup code
      userSettings.backupCodes.splice(index, 1);
      await this.updateUserMFASettings(userId, userSettings);
      return true;
    }

    return false;
  }

  /**
   * Base32 encode
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  /**
   * Base32 decode
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const result = [];
    let bits = 0;
    let value = 0;

    for (let i = 0; i < encoded.length; i++) {
      const index = alphabet.indexOf(encoded[i].toUpperCase());
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(result);
  }

  /**
   * Generate random code
   */
  private generateCode(length: number): string {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[crypto.randomInt(0, chars.length)];
    }
    return result;
  }

  /**
   * Hash code for storage
   */
  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Mask phone number for display
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return phoneNumber;
    return phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4);
  }

  /**
   * Mask email for display
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : local;
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Get method expiry in seconds
   */
  private getMethodExpiry(method: MFAMethod): number {
    switch (method) {
      case MFAMethod.SMS:
        return this.config.sms?.codeExpiry || 300; // 5 minutes
      case MFAMethod.EMAIL:
        return this.config.email?.codeExpiry || 600; // 10 minutes
      case MFAMethod.TOTP:
        return this.config.totp.period * 3; // 3 periods
      case MFAMethod.BACKUP_CODES:
        return 3600; // 1 hour
      default:
        return 300; // 5 minutes default
    }
  }

  /**
   * Generate QR code (simplified implementation)
   */
  private async generateQRCode(data: string): Promise<string> {
    // In real implementation, use a QR code library like 'qrcode'
    // For now, return a placeholder data URL
    return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="10" y="20" font-size="12">QR Code: ${data.substring(0, 50)}...</text></svg>`).toString('base64')}`;
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.enabledMethods.length) {
      throw new Error('At least one MFA method must be enabled');
    }

    if (this.config.enabledMethods.includes(MFAMethod.SMS) && !this.smsProvider) {
      throw new Error('SMS provider is required when SMS MFA is enabled');
    }

    if (this.config.enabledMethods.includes(MFAMethod.EMAIL) && !this.emailProvider) {
      throw new Error('Email provider is required when email MFA is enabled');
    }

    if (this.config.maxAttempts < 1) {
      throw new Error('Max attempts must be at least 1');
    }

    if (this.config.totp.digits !== 6 && this.config.totp.digits !== 8) {
      throw new Error('TOTP digits must be 6 or 8');
    }
  }

  /**
   * Get user MFA settings (mock implementation)
   */
  private async getUserMFASettings(userId: string): Promise<UserMFASettings | null> {
    // In real implementation, fetch from database
    return null;
  }

  /**
   * Update user MFA settings (mock implementation)
   */
  private async updateUserMFASettings(userId: string, settings: UserMFASettings): Promise<void> {
    // In real implementation, update database
  }

  /**
   * Get generated files for the MFA module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core MFA types
    files.push({
      path: 'src/lib/auth/mfa/types.ts',
      content: this.generateMFATypes(),
      type: 'typescript'
    });

    // MFA service
    files.push({
      path: 'src/lib/auth/mfa/service.ts',
      content: this.generateMFAService(context),
      type: 'typescript'
    });

    // TOTP utilities
    files.push({
      path: 'src/lib/auth/mfa/totp.ts',
      content: this.generateTOTPUtils(),
      type: 'typescript'
    });

    // SMS provider
    if (this.config.enabledMethods.includes(MFAMethod.SMS)) {
      files.push({
        path: 'src/lib/auth/mfa/providers/sms.ts',
        content: this.generateSMSProvider(context),
        type: 'typescript'
      });
    }

    // Email provider
    if (this.config.enabledMethods.includes(MFAMethod.EMAIL)) {
      files.push({
        path: 'src/lib/auth/mfa/providers/email.ts',
        content: this.generateEmailProvider(context),
        type: 'typescript'
      });
    }

    // Framework-specific implementations
    if (context.framework === SupportedFramework.REACT_NATIVE) {
      files.push(...this.getReactNativeFiles());
    } else if (context.framework === SupportedFramework.FLUTTER) {
      files.push(...this.getFlutterFiles());
    } else if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate MFA types file
   */
  private generateMFATypes(): string {
    return `// Generated MFA types - Epic 5 Story 2 AC5
export * from './types/mfa-types';
export * from './types/totp-types';
export * from './types/challenge-types';
`;
  }

  /**
   * Generate MFA service file
   */
  private generateMFAService(context: DNAModuleContext): string {
    return `// Generated MFA Service - Epic 5 Story 2 AC5
import { MFAModule } from './mfa-module';
import { ${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}MFAConfig } from './config';

export class MFAService extends MFAModule {
  constructor() {
    super(${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}MFAConfig);
  }
}
`;
  }

  /**
   * Generate TOTP utilities file
   */
  private generateTOTPUtils(): string {
    return `// Generated TOTP utilities - Epic 5 Story 2 AC5
export class TOTPUtils {
  // TOTP generation and validation utilities
}
`;
  }

  /**
   * Generate SMS provider file
   */
  private generateSMSProvider(context: DNAModuleContext): string {
    return `// Generated SMS Provider - Epic 5 Story 2 AC5
export class SMSProvider {
  // SMS provider implementation for ${context.framework}
}
`;
  }

  /**
   * Generate email provider file
   */
  private generateEmailProvider(context: DNAModuleContext): string {
    return `// Generated Email Provider - Epic 5 Story 2 AC5
export class EmailProvider {
  // Email provider implementation for ${context.framework}
}
`;
  }

  /**
   * Get React Native specific files
   */
  private getReactNativeFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/components/MFASetup.tsx',
        content: `// React Native MFA Setup Component
import React from 'react';
import { View } from 'react-native';

export const MFASetup: React.FC = () => {
  return <View>{/* MFA setup UI */}</View>;
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Get Flutter specific files
   */
  private getFlutterFiles(): DNAModuleFile[] {
    return [
      {
        path: 'lib/widgets/mfa_setup.dart',
        content: `// Flutter MFA Setup Widget
import 'package:flutter/material.dart';

class MFASetup extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(/* MFA setup UI */);
  }
}
`,
        type: 'dart'
      }
    ];
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/components/MFASetup.tsx',
        content: `// Next.js MFA Setup Component
import React from 'react';

export const MFASetup: React.FC = () => {
  return <div>{/* MFA setup UI */}</div>;
};
`,
        type: 'typescript'
      },
      {
        path: 'src/pages/api/mfa/setup.ts',
        content: `// Next.js MFA API endpoint
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // MFA setup API
}
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for MFA events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  public emit(event: string, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args);
  }
}

/**
 * Default MFA configuration
 */
export const defaultMFAConfig: MFAConfig = {
  enabledMethods: [MFAMethod.TOTP, MFAMethod.BACKUP_CODES],
  requireMFA: false,
  gracePeriod: 24,
  maxAttempts: 3,
  lockoutDuration: 15,
  rateLimitWindow: 60,
  totp: {
    algorithm: TOTPAlgorithm.SHA1,
    digits: 6,
    period: 30,
    window: 1,
    issuer: 'DNA App',
    accountName: 'user'
  },
  backupCodes: {
    count: 10,
    length: 8,
    algorithm: 'random'
  },
  encryptSecrets: true,
  requireFreshAuth: true
};

export default MFAModule;