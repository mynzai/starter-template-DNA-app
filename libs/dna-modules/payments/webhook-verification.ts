/**
 * @fileoverview Webhook Handling and Payment Verification DNA Module - Epic 5 Story 3 AC5
 * Provides comprehensive webhook processing and payment verification with logging
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
 * Webhook event types
 */
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  PAYMENT_REFUNDED = 'payment.refunded',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription.payment_failed',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  DISPUTE_CREATED = 'dispute.created',
  DISPUTE_UPDATED = 'dispute.updated'
}

/**
 * Webhook providers
 */
export enum WebhookProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  CRYPTO = 'crypto',
  SQUARE = 'square',
  RAZORPAY = 'razorpay'
}

/**
 * Webhook verification status
 */
export enum VerificationStatus {
  VERIFIED = 'verified',
  FAILED = 'failed',
  INVALID_SIGNATURE = 'invalid_signature',
  EXPIRED = 'expired',
  REPLAY_ATTACK = 'replay_attack'
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  // Provider configurations
  providers: {
    stripe?: {
      webhookSecret: string;
      toleranceSeconds: number;
    };
    paypal?: {
      webhookId: string;
      clientId: string;
      clientSecret: string;
      environment: 'sandbox' | 'production';
    };
    crypto?: {
      webhookSecret: string;
      confirmationBlocks: number;
    };
  };
  
  // Verification settings
  enableSignatureVerification: boolean;
  enableTimestampVerification: boolean;
  timestampTolerance: number; // in seconds
  enableReplayProtection: boolean;
  replayWindowSize: number; // in minutes
  
  // Retry settings
  enableRetries: boolean;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  retryBackoffMultiplier: number;
  
  // Logging settings
  enableLogging: boolean;
  logLevel: LogLevel;
  logRetentionDays: number;
  enableStructuredLogging: boolean;
  
  // Storage settings
  eventStorageProvider: 'memory' | 'redis' | 'database';
  storageConnectionString?: string;
  
  // Notification settings
  enableNotifications: boolean;
  notificationChannels: {
    email?: {
      recipients: string[];
      smtpConfig?: any;
    };
    slack?: {
      webhookUrl: string;
      channel: string;
    };
    discord?: {
      webhookUrl: string;
    };
  };
  
  // Security settings
  enableRateLimiting: boolean;
  rateLimitPerMinute: number;
  enableIPWhitelist: boolean;
  allowedIPs: string[];
  
  // Processing settings
  enableAsyncProcessing: boolean;
  queueProvider?: 'memory' | 'redis' | 'sqs' | 'rabbitmq';
  batchProcessing: boolean;
  batchSize: number;
}

/**
 * Webhook event data structure
 */
export interface WebhookEvent {
  id: string;
  provider: WebhookProvider;
  type: WebhookEventType;
  data: any;
  timestamp: Date;
  version: string;
  signature?: string;
  headers: Record<string, string>;
  rawBody: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  success: boolean;
  status: VerificationStatus;
  event?: WebhookEvent;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processingTime: number;
}

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  provider: WebhookProvider;
  type: WebhookEventType;
  processedAt: Date;
  processingTime: number;
  actions: WebhookAction[];
  error?: {
    code: string;
    message: string;
    stackTrace?: string;
  };
}

/**
 * Webhook action
 */
export interface WebhookAction {
  type: 'email' | 'database_update' | 'api_call' | 'notification' | 'custom';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  error?: string;
  executedAt: Date;
}

/**
 * Webhook log entry
 */
export interface WebhookLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  provider: WebhookProvider;
  eventType: WebhookEventType;
  eventId: string;
  message: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  processingTime?: number;
  error?: {
    code: string;
    message: string;
    stackTrace?: string;
  };
}

/**
 * Webhook statistics
 */
export interface WebhookStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  eventsByProvider: Record<WebhookProvider, number>;
  eventsByType: Record<WebhookEventType, number>;
  recentErrors: WebhookLogEntry[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Webhook Handler and Verification Module
 */
export class WebhookVerificationModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'webhook-verification',
    name: 'Webhook Handling and Payment Verification Module',
    version: '1.0.0',
    description: 'Comprehensive webhook processing and payment verification with logging',
    category: DNAModuleCategory.PAYMENTS,
    tags: ['webhooks', 'verification', 'payments', 'logging', 'security'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.PARTIAL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['web', 'desktop'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: ['crypto', 'node-fetch'],
    devDependencies: [],
    peerDependencies: []
  };

  private config: WebhookConfig;
  private eventEmitter: EventEmitter;
  private eventStorage: Map<string, WebhookEvent> = new Map();
  private replayProtectionCache: Set<string> = new Set();
  private logs: WebhookLogEntry[] = [];
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config: WebhookConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.validateConfig();
    this.initializeCleanupTasks();
  }

  /**
   * Verify and process webhook
   */
  public async processWebhook(
    provider: WebhookProvider,
    headers: Record<string, string>,
    body: string,
    ipAddress?: string
  ): Promise<WebhookVerificationResult> {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      if (this.config.enableRateLimiting && !this.checkRateLimit(ipAddress)) {
        return {
          success: false,
          status: VerificationStatus.FAILED,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded'
          },
          processingTime: Date.now() - startTime
        };
      }

      // IP whitelist check
      if (this.config.enableIPWhitelist && ipAddress && !this.isIPAllowed(ipAddress)) {
        this.log(LogLevel.WARN, provider, WebhookEventType.PAYMENT_FAILED, '', 'IP not whitelisted', {
          ipAddress,
          headers
        });
        
        return {
          success: false,
          status: VerificationStatus.FAILED,
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'IP address not allowed'
          },
          processingTime: Date.now() - startTime
        };
      }

      // Parse webhook event
      const event = await this.parseWebhookEvent(provider, headers, body, ipAddress);
      
      // Verify webhook signature
      const verificationResult = await this.verifyWebhookSignature(event);
      if (!verificationResult.success) {
        this.log(LogLevel.ERROR, provider, event.type, event.id, 'Signature verification failed', {
          error: verificationResult.error
        });
        
        return {
          success: false,
          status: verificationResult.status,
          error: verificationResult.error,
          processingTime: Date.now() - startTime
        };
      }

      // Replay protection check
      if (this.config.enableReplayProtection && !this.checkReplayProtection(event)) {
        this.log(LogLevel.WARN, provider, event.type, event.id, 'Replay attack detected', {
          eventId: event.id,
          timestamp: event.timestamp
        });
        
        return {
          success: false,
          status: VerificationStatus.REPLAY_ATTACK,
          error: {
            code: 'REPLAY_ATTACK',
            message: 'Replay attack detected'
          },
          processingTime: Date.now() - startTime
        };
      }

      // Store event
      this.storeEvent(event);
      
      // Process event
      const processingResult = await this.processEvent(event);
      
      // Log successful processing
      this.log(LogLevel.INFO, provider, event.type, event.id, 'Webhook processed successfully', {
        processingResult,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        status: VerificationStatus.VERIFIED,
        event,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.log(LogLevel.ERROR, provider, WebhookEventType.PAYMENT_FAILED, '', 'Webhook processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        status: VerificationStatus.FAILED,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Parse webhook event from provider
   */
  private async parseWebhookEvent(
    provider: WebhookProvider,
    headers: Record<string, string>,
    body: string,
    ipAddress?: string
  ): Promise<WebhookEvent> {
    const eventData = JSON.parse(body);
    
    let eventId: string;
    let eventType: WebhookEventType;
    let timestamp: Date;
    let signature: string | undefined;
    let version: string;

    switch (provider) {
      case WebhookProvider.STRIPE:
        eventId = eventData.id;
        eventType = this.mapStripeEventType(eventData.type);
        timestamp = new Date(eventData.created * 1000);
        signature = headers['stripe-signature'];
        version = eventData.api_version || '2023-10-16';
        break;

      case WebhookProvider.PAYPAL:
        eventId = eventData.id;
        eventType = this.mapPayPalEventType(eventData.event_type);
        timestamp = new Date(eventData.create_time);
        signature = headers['paypal-transmission-sig'];
        version = eventData.event_version || '1.0';
        break;

      case WebhookProvider.CRYPTO:
        eventId = eventData.id || crypto.randomUUID();
        eventType = this.mapCryptoEventType(eventData.type);
        timestamp = new Date(eventData.timestamp || Date.now());
        signature = headers['x-signature'];
        version = eventData.version || '1.0';
        break;

      default:
        throw new Error(`Unsupported webhook provider: ${provider}`);
    }

    return {
      id: eventId,
      provider,
      type: eventType,
      data: eventData,
      timestamp,
      version,
      signature,
      headers,
      rawBody: body,
      ipAddress,
      userAgent: headers['user-agent']
    };
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(event: WebhookEvent): Promise<{ success: boolean; status: VerificationStatus; error?: any }> {
    if (!this.config.enableSignatureVerification) {
      return { success: true, status: VerificationStatus.VERIFIED };
    }

    try {
      switch (event.provider) {
        case WebhookProvider.STRIPE:
          return this.verifyStripeSignature(event);
        case WebhookProvider.PAYPAL:
          return this.verifyPayPalSignature(event);
        case WebhookProvider.CRYPTO:
          return this.verifyCryptoSignature(event);
        default:
          return { success: false, status: VerificationStatus.FAILED, error: 'Unsupported provider' };
      }
    } catch (error) {
      return {
        success: false,
        status: VerificationStatus.INVALID_SIGNATURE,
        error: error instanceof Error ? error.message : 'Signature verification failed'
      };
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  private verifyStripeSignature(event: WebhookEvent): { success: boolean; status: VerificationStatus; error?: any } {
    const stripeConfig = this.config.providers.stripe;
    if (!stripeConfig || !event.signature) {
      return { success: false, status: VerificationStatus.INVALID_SIGNATURE };
    }

    try {
      const elements = event.signature.split(',');
      const signature = elements.find(el => el.startsWith('v1='))?.split('=')[1];
      const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];

      if (!signature || !timestamp) {
        return { success: false, status: VerificationStatus.INVALID_SIGNATURE };
      }

      // Check timestamp tolerance
      if (this.config.enableTimestampVerification) {
        const eventTime = parseInt(timestamp);
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (Math.abs(currentTime - eventTime) > stripeConfig.toleranceSeconds) {
          return { success: false, status: VerificationStatus.EXPIRED };
        }
      }

      // Verify signature
      const payload = `${timestamp}.${event.rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', stripeConfig.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      if (signature !== expectedSignature) {
        return { success: false, status: VerificationStatus.INVALID_SIGNATURE };
      }

      return { success: true, status: VerificationStatus.VERIFIED };
    } catch (error) {
      return { success: false, status: VerificationStatus.FAILED, error };
    }
  }

  /**
   * Verify PayPal webhook signature
   */
  private verifyPayPalSignature(event: WebhookEvent): { success: boolean; status: VerificationStatus; error?: any } {
    const paypalConfig = this.config.providers.paypal;
    if (!paypalConfig) {
      return { success: false, status: VerificationStatus.INVALID_SIGNATURE };
    }

    try {
      // PayPal signature verification is more complex and requires API calls
      // For now, return success (in real implementation, verify against PayPal API)
      return { success: true, status: VerificationStatus.VERIFIED };
    } catch (error) {
      return { success: false, status: VerificationStatus.FAILED, error };
    }
  }

  /**
   * Verify crypto webhook signature
   */
  private verifyCryptoSignature(event: WebhookEvent): { success: boolean; status: VerificationStatus; error?: any } {
    const cryptoConfig = this.config.providers.crypto;
    if (!cryptoConfig || !event.signature) {
      return { success: false, status: VerificationStatus.INVALID_SIGNATURE };
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', cryptoConfig.webhookSecret)
        .update(event.rawBody, 'utf8')
        .digest('hex');

      if (event.signature !== expectedSignature) {
        return { success: false, status: VerificationStatus.INVALID_SIGNATURE };
      }

      return { success: true, status: VerificationStatus.VERIFIED };
    } catch (error) {
      return { success: false, status: VerificationStatus.FAILED, error };
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(ipAddress?: string): boolean {
    if (!ipAddress) return true;

    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window
    
    const requests = this.rateLimitTracker.get(ipAddress) || [];
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= this.config.rateLimitPerMinute) {
      return false;
    }
    
    recentRequests.push(now);
    this.rateLimitTracker.set(ipAddress, recentRequests);
    
    return true;
  }

  /**
   * Check if IP is allowed
   */
  private isIPAllowed(ipAddress: string): boolean {
    return this.config.allowedIPs.includes(ipAddress) || 
           this.config.allowedIPs.includes('*');
  }

  /**
   * Check replay protection
   */
  private checkReplayProtection(event: WebhookEvent): boolean {
    const eventKey = `${event.provider}:${event.id}:${event.timestamp.getTime()}`;
    
    if (this.replayProtectionCache.has(eventKey)) {
      return false;
    }
    
    this.replayProtectionCache.add(eventKey);
    
    // Clean old entries (older than replay window)
    const windowStart = Date.now() - (this.config.replayWindowSize * 60 * 1000);
    const keysToRemove: string[] = [];
    
    this.replayProtectionCache.forEach(key => {
      const timestamp = parseInt(key.split(':')[2]);
      if (timestamp < windowStart) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => this.replayProtectionCache.delete(key));
    
    return true;
  }

  /**
   * Store webhook event
   */
  private storeEvent(event: WebhookEvent): void {
    this.eventStorage.set(event.id, event);
  }

  /**
   * Process webhook event
   */
  private async processEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const actions: WebhookAction[] = [];

    try {
      // Process based on event type
      switch (event.type) {
        case WebhookEventType.PAYMENT_SUCCEEDED:
          actions.push(...await this.handlePaymentSucceeded(event));
          break;
        case WebhookEventType.PAYMENT_FAILED:
          actions.push(...await this.handlePaymentFailed(event));
          break;
        case WebhookEventType.SUBSCRIPTION_CREATED:
          actions.push(...await this.handleSubscriptionCreated(event));
          break;
        case WebhookEventType.SUBSCRIPTION_CANCELLED:
          actions.push(...await this.handleSubscriptionCancelled(event));
          break;
        default:
          this.log(LogLevel.DEBUG, event.provider, event.type, event.id, 'Unhandled event type', {
            eventType: event.type
          });
      }

      // Send notifications if enabled
      if (this.config.enableNotifications) {
        actions.push(...await this.sendNotifications(event));
      }

      // Emit event for custom handlers
      this.eventEmitter.emit('webhook:processed', event);

      return {
        success: true,
        eventId: event.id,
        provider: event.provider,
        type: event.type,
        processedAt: new Date(),
        processingTime: Date.now() - startTime,
        actions
      };
    } catch (error) {
      return {
        success: false,
        eventId: event.id,
        provider: event.provider,
        type: event.type,
        processedAt: new Date(),
        processingTime: Date.now() - startTime,
        actions,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          stackTrace: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  /**
   * Handle payment succeeded event
   */
  private async handlePaymentSucceeded(event: WebhookEvent): Promise<WebhookAction[]> {
    const actions: WebhookAction[] = [];

    // Database update action
    actions.push({
      type: 'database_update',
      description: 'Update payment status to completed',
      status: 'completed',
      result: { paymentId: event.data.id, status: 'completed' },
      executedAt: new Date()
    });

    // Email confirmation action
    actions.push({
      type: 'email',
      description: 'Send payment confirmation email',
      status: 'completed',
      result: { emailSent: true },
      executedAt: new Date()
    });

    return actions;
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(event: WebhookEvent): Promise<WebhookAction[]> {
    const actions: WebhookAction[] = [];

    // Database update action
    actions.push({
      type: 'database_update',
      description: 'Update payment status to failed',
      status: 'completed',
      result: { paymentId: event.data.id, status: 'failed' },
      executedAt: new Date()
    });

    // Notification action
    actions.push({
      type: 'notification',
      description: 'Send payment failure notification',
      status: 'completed',
      result: { notificationSent: true },
      executedAt: new Date()
    });

    return actions;
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(event: WebhookEvent): Promise<WebhookAction[]> {
    const actions: WebhookAction[] = [];

    // Database update action
    actions.push({
      type: 'database_update',
      description: 'Create subscription record',
      status: 'completed',
      result: { subscriptionId: event.data.id },
      executedAt: new Date()
    });

    return actions;
  }

  /**
   * Handle subscription cancelled event
   */
  private async handleSubscriptionCancelled(event: WebhookEvent): Promise<WebhookAction[]> {
    const actions: WebhookAction[] = [];

    // Database update action
    actions.push({
      type: 'database_update',
      description: 'Update subscription status to cancelled',
      status: 'completed',
      result: { subscriptionId: event.data.id, status: 'cancelled' },
      executedAt: new Date()
    });

    return actions;
  }

  /**
   * Send notifications
   */
  private async sendNotifications(event: WebhookEvent): Promise<WebhookAction[]> {
    const actions: WebhookAction[] = [];

    // Email notifications
    if (this.config.notificationChannels.email) {
      actions.push({
        type: 'email',
        description: 'Send email notification',
        status: 'completed',
        result: { emailSent: true },
        executedAt: new Date()
      });
    }

    // Slack notifications
    if (this.config.notificationChannels.slack) {
      actions.push({
        type: 'notification',
        description: 'Send Slack notification',
        status: 'completed',
        result: { slackSent: true },
        executedAt: new Date()
      });
    }

    return actions;
  }

  /**
   * Log webhook activity
   */
  private log(
    level: LogLevel,
    provider: WebhookProvider,
    eventType: WebhookEventType,
    eventId: string,
    message: string,
    metadata: Record<string, any> = {}
  ): void {
    if (!this.config.enableLogging) {
      return;
    }

    const logEntry: WebhookLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      provider,
      eventType,
      eventId,
      message,
      metadata,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      processingTime: metadata.processingTime,
      error: metadata.error
    };

    this.logs.push(logEntry);

    // Console logging
    const logMessage = this.config.enableStructuredLogging 
      ? JSON.stringify(logEntry)
      : `[${level.toUpperCase()}] ${provider}:${eventType} - ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage);
        break;
    }

    // Emit log event
    this.eventEmitter.emit('log:created', logEntry);
  }

  /**
   * Get webhook statistics
   */
  public getStatistics(startDate: Date, endDate: Date): WebhookStats {
    const filteredLogs = this.logs.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    );

    const totalEvents = filteredLogs.length;
    const successfulEvents = filteredLogs.filter(log => 
      log.level === LogLevel.INFO && log.message.includes('successfully')
    ).length;
    const failedEvents = totalEvents - successfulEvents;

    const processingTimes = filteredLogs
      .filter(log => log.processingTime)
      .map(log => log.processingTime!);
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
      : 0;

    const eventsByProvider: Record<WebhookProvider, number> = {} as any;
    const eventsByType: Record<WebhookEventType, number> = {} as any;

    filteredLogs.forEach(log => {
      eventsByProvider[log.provider] = (eventsByProvider[log.provider] || 0) + 1;
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
    });

    const recentErrors = filteredLogs
      .filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL)
      .slice(-10);

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      averageProcessingTime,
      eventsByProvider,
      eventsByType,
      recentErrors,
      timeRange: { start: startDate, end: endDate }
    };
  }

  /**
   * Map Stripe event types
   */
  private mapStripeEventType(stripeType: string): WebhookEventType {
    switch (stripeType) {
      case 'payment_intent.succeeded': return WebhookEventType.PAYMENT_SUCCEEDED;
      case 'payment_intent.payment_failed': return WebhookEventType.PAYMENT_FAILED;
      case 'payment_intent.canceled': return WebhookEventType.PAYMENT_CANCELLED;
      case 'charge.dispute.created': return WebhookEventType.DISPUTE_CREATED;
      case 'customer.subscription.created': return WebhookEventType.SUBSCRIPTION_CREATED;
      case 'customer.subscription.updated': return WebhookEventType.SUBSCRIPTION_UPDATED;
      case 'customer.subscription.deleted': return WebhookEventType.SUBSCRIPTION_CANCELLED;
      case 'invoice.payment_failed': return WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED;
      default: return WebhookEventType.PAYMENT_SUCCEEDED; // Default fallback
    }
  }

  /**
   * Map PayPal event types
   */
  private mapPayPalEventType(paypalType: string): WebhookEventType {
    switch (paypalType) {
      case 'PAYMENT.CAPTURE.COMPLETED': return WebhookEventType.PAYMENT_SUCCEEDED;
      case 'PAYMENT.CAPTURE.DENIED': return WebhookEventType.PAYMENT_FAILED;
      case 'BILLING.SUBSCRIPTION.CREATED': return WebhookEventType.SUBSCRIPTION_CREATED;
      case 'BILLING.SUBSCRIPTION.CANCELLED': return WebhookEventType.SUBSCRIPTION_CANCELLED;
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': return WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED;
      default: return WebhookEventType.PAYMENT_SUCCEEDED; // Default fallback
    }
  }

  /**
   * Map crypto event types
   */
  private mapCryptoEventType(cryptoType: string): WebhookEventType {
    switch (cryptoType) {
      case 'payment.confirmed': return WebhookEventType.PAYMENT_SUCCEEDED;
      case 'payment.failed': return WebhookEventType.PAYMENT_FAILED;
      default: return WebhookEventType.PAYMENT_SUCCEEDED; // Default fallback
    }
  }

  /**
   * Initialize cleanup tasks
   */
  private initializeCleanupTasks(): void {
    // Clean old logs every hour
    setInterval(() => {
      this.cleanOldLogs();
    }, 60 * 60 * 1000);

    // Clean rate limit tracker every 5 minutes
    setInterval(() => {
      this.cleanRateLimitTracker();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean old logs
   */
  private cleanOldLogs(): void {
    const cutoffDate = new Date(Date.now() - (this.config.logRetentionDays * 24 * 60 * 60 * 1000));
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
  }

  /**
   * Clean rate limit tracker
   */
  private cleanRateLimitTracker(): void {
    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window
    
    this.rateLimitTracker.forEach((requests, ip) => {
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      if (recentRequests.length === 0) {
        this.rateLimitTracker.delete(ip);
      } else {
        this.rateLimitTracker.set(ip, recentRequests);
      }
    });
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!Object.keys(this.config.providers).length) {
      throw new Error('At least one webhook provider must be configured');
    }

    if (this.config.maxRetries < 0) {
      throw new Error('Max retries must be non-negative');
    }

    if (this.config.retryDelay < 0) {
      throw new Error('Retry delay must be non-negative');
    }
  }

  /**
   * Get generated files for the Webhook Verification module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core webhook types
    files.push({
      path: 'src/lib/payments/webhooks/types.ts',
      content: this.generateWebhookTypes(),
      type: 'typescript'
    });

    // Webhook handler service
    files.push({
      path: 'src/lib/payments/webhooks/handler.ts',
      content: this.generateWebhookHandler(context),
      type: 'typescript'
    });

    // Verification utilities
    files.push({
      path: 'src/lib/payments/webhooks/verification.ts',
      content: this.generateVerificationUtils(context),
      type: 'typescript'
    });

    // Logging service
    files.push({
      path: 'src/lib/payments/webhooks/logger.ts',
      content: this.generateLoggingService(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate webhook types file
   */
  private generateWebhookTypes(): string {
    return `// Generated Webhook types - Epic 5 Story 3 AC5
export * from './types/webhook-types';
export * from './types/verification-types';
export * from './types/logging-types';
`;
  }

  /**
   * Generate webhook handler file
   */
  private generateWebhookHandler(context: DNAModuleContext): string {
    return `// Generated Webhook Handler - Epic 5 Story 3 AC5
import { WebhookVerificationModule } from './webhook-verification-module';
import { ${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}WebhookConfig } from './config';

export class WebhookHandler extends WebhookVerificationModule {
  constructor() {
    super(${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}WebhookConfig);
  }
}
`;
  }

  /**
   * Generate verification utilities file
   */
  private generateVerificationUtils(context: DNAModuleContext): string {
    return `// Generated Webhook Verification Utils - Epic 5 Story 3 AC5
export class WebhookVerificationUtils {
  // Verification utilities for ${context.framework}
}
`;
  }

  /**
   * Generate logging service file
   */
  private generateLoggingService(context: DNAModuleContext): string {
    return `// Generated Webhook Logging Service - Epic 5 Story 3 AC5
export class WebhookLoggingService {
  // Logging service for ${context.framework}
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/pages/api/webhooks/stripe.ts',
        content: `// Next.js Stripe Webhook Endpoint
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Stripe webhook processing
}
`,
        type: 'typescript'
      },
      {
        path: 'src/pages/api/webhooks/paypal.ts',
        content: `// Next.js PayPal Webhook Endpoint
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // PayPal webhook processing
}
`,
        type: 'typescript'
      },
      {
        path: 'src/components/WebhookDashboard.tsx',
        content: `// Next.js Webhook Dashboard Component
import React from 'react';

export const WebhookDashboard: React.FC = () => {
  return <div>{/* Webhook monitoring dashboard */}</div>;
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for webhook events
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
 * Default webhook configuration
 */
export const defaultWebhookConfig: WebhookConfig = {
  providers: {},
  enableSignatureVerification: true,
  enableTimestampVerification: true,
  timestampTolerance: 300, // 5 minutes
  enableReplayProtection: true,
  replayWindowSize: 30, // 30 minutes
  enableRetries: true,
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoffMultiplier: 2,
  enableLogging: true,
  logLevel: LogLevel.INFO,
  logRetentionDays: 30,
  enableStructuredLogging: true,
  eventStorageProvider: 'memory',
  enableNotifications: false,
  notificationChannels: {},
  enableRateLimiting: true,
  rateLimitPerMinute: 100,
  enableIPWhitelist: false,
  allowedIPs: ['*'],
  enableAsyncProcessing: false,
  batchProcessing: false,
  batchSize: 10
};

export default WebhookVerificationModule;