/**
 * @fileoverview Payment Gateway Abstraction DNA Module
 * Provides unified interface for multiple payment providers
 */

import { z } from 'zod';
import {
  BaseDNAModule,
  DNAModuleMetadata,
  DNAModuleDependency,
  DNAModuleConflict,
  DNAModuleConfig,
  FrameworkImplementation,
  DNAModuleContext,
  DNAModuleFile,
  SupportedFramework,
  CompatibilityLevel,
  DNAModuleCategory
} from '@dna/core';

/**
 * Payment Gateway configuration schema
 */
const PaymentGatewayConfigSchema = z.object({
  // Primary payment provider
  primaryProvider: z.enum(['stripe', 'paypal', 'crypto']).default('stripe'),
  
  // Multi-provider support
  enableMultiProvider: z.boolean().default(false),
  supportedProviders: z.array(z.enum(['stripe', 'paypal', 'crypto'])).default(['stripe']),
  
  // Currency configuration
  defaultCurrency: z.string().default('USD'),
  supportedCurrencies: z.array(z.string()).default(['USD', 'EUR', 'GBP']),
  
  // Security features
  enableEncryption: z.boolean().default(true),
  enablePCICompliance: z.boolean().default(true),
  enableFraudDetection: z.boolean().default(true),
  
  // Webhook configuration
  enableWebhooks: z.boolean().default(true),
  webhookSecret: z.string().optional(),
  webhookEndpoints: z.array(z.string()).default(['/api/webhooks/payment']),
  
  // Tax and compliance
  enableTaxCalculation: z.boolean().default(false),
  taxProvider: z.enum(['avalara', 'taxjar', 'manual']).default('manual'),
  complianceRegions: z.array(z.enum(['US', 'EU', 'CA', 'AU'])).default(['US']),
  
  // Features
  enableRecurring: z.boolean().default(true),
  enableSubscriptions: z.boolean().default(true),
  enableRefunds: z.boolean().default(true),
  enableChargebacks: z.boolean().default(true),
  enableSplitPayments: z.boolean().default(false),
  
  // UI configuration
  enablePaymentUI: z.boolean().default(true),
  uiTheme: z.enum(['light', 'dark', 'auto']).default('auto'),
  customBranding: z.boolean().default(false),
  
  // Testing
  enableTestMode: z.boolean().default(true),
  testModeProviders: z.array(z.string()).default(['stripe']),
  
  // Analytics and reporting
  enableAnalytics: z.boolean().default(true),
  analyticsProvider: z.enum(['internal', 'mixpanel', 'amplitude']).default('internal'),
  enableReporting: z.boolean().default(true),
  
  // Error handling
  retryAttempts: z.number().min(0).max(5).default(3),
  retryDelay: z.number().min(1000).max(30000).default(5000),
  enableCircuitBreaker: z.boolean().default(true),
  
  // Rate limiting
  enableRateLimit: z.boolean().default(true),
  rateLimitRequests: z.number().min(1).max(1000).default(100),
  rateLimitWindow: z.number().min(60).max(3600).default(900), // 15 minutes
});

export type PaymentGatewayConfig = z.infer<typeof PaymentGatewayConfigSchema>;

/**
 * Payment Gateway Abstraction DNA Module
 */
export class PaymentGatewayAbstractionModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'payment-gateway-abstraction',
    name: 'Payment Gateway Abstraction',
    description: 'Unified interface for multiple payment providers with security, compliance, and advanced features',
    version: '1.0.0',
    category: DNAModuleCategory.PAYMENT,
    author: 'DNA Team',
    license: 'MIT',
    keywords: ['payment', 'gateway', 'abstraction', 'multi-provider', 'security'],
    deprecated: false,
    experimental: false
  };

  public readonly dependencies: DNAModuleDependency[] = [
    {
      moduleId: 'security-encryption',
      version: '^1.0.0',
      optional: false,
      reason: 'Required for payment data encryption and PCI compliance'
    }
  ];

  public readonly conflicts: DNAModuleConflict[] = [];

  public readonly frameworks: FrameworkImplementation[] = [
    {
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['stripe', 'axios', 'crypto'],
      devDependencies: ['@types/crypto', 'jest'],
      peerDependencies: ['next', 'react'],
      configFiles: ['next.config.js'],
      templates: ['src/lib/payments/', 'pages/api/payments/'],
      postInstallSteps: [],
      limitations: []
    },
    {
      framework: SupportedFramework.FLUTTER,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['http', 'crypto', 'flutter_secure_storage'],
      devDependencies: ['flutter_test', 'mockito'],
      peerDependencies: [],
      configFiles: ['pubspec.yaml'],
      templates: ['lib/payments/', 'test/payments/'],
      postInstallSteps: ['flutter pub get'],
      limitations: []
    },
    {
      framework: SupportedFramework.REACT_NATIVE,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['axios', '@react-native-async-storage/async-storage', 'react-native-keychain'],
      devDependencies: ['@types/axios', 'jest'],
      peerDependencies: ['react', 'react-native'],
      configFiles: ['metro.config.js'],
      templates: ['src/payments/', '__tests__/payments/'],
      postInstallSteps: ['npx pod-install'],
      limitations: []
    },
    {
      framework: SupportedFramework.TAURI,
      supported: true,
      compatibility: CompatibilityLevel.PARTIAL,
      dependencies: ['@tauri-apps/api', 'axios'],
      devDependencies: ['@tauri-apps/cli'],
      peerDependencies: [],
      configFiles: ['src-tauri/tauri.conf.json'],
      templates: ['src/payments/', 'src-tauri/src/payments/'],
      postInstallSteps: ['cargo check'],
      limitations: ['Some payment providers may have restrictions in desktop environment']
    },
    {
      framework: SupportedFramework.SVELTEKIT,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['stripe', 'axios', 'crypto'],
      devDependencies: ['@types/crypto', 'vitest'],
      peerDependencies: ['svelte', '@sveltejs/kit'],
      configFiles: ['vite.config.ts'],
      templates: ['src/lib/payments/', 'src/routes/api/payments/'],
      postInstallSteps: [],
      limitations: []
    }
  ];

  public readonly config: DNAModuleConfig = {
    schema: PaymentGatewayConfigSchema,
    defaults: {
      primaryProvider: 'stripe',
      enableMultiProvider: false,
      supportedProviders: ['stripe'],
      defaultCurrency: 'USD',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      enableEncryption: true,
      enablePCICompliance: true,
      enableFraudDetection: true,
      enableWebhooks: true,
      webhookEndpoints: ['/api/webhooks/payment'],
      enableTaxCalculation: false,
      taxProvider: 'manual',
      complianceRegions: ['US'],
      enableRecurring: true,
      enableSubscriptions: true,
      enableRefunds: true,
      enableChargebacks: true,
      enableSplitPayments: false,
      enablePaymentUI: true,
      uiTheme: 'auto',
      customBranding: false,
      enableTestMode: true,
      testModeProviders: ['stripe'],
      enableAnalytics: true,
      analyticsProvider: 'internal',
      enableReporting: true,
      retryAttempts: 3,
      retryDelay: 5000,
      enableCircuitBreaker: true,
      enableRateLimit: true,
      rateLimitRequests: 100,
      rateLimitWindow: 900
    },
    required: ['primaryProvider', 'defaultCurrency'],
    validation: {
      rules: {},
      custom: async (config: PaymentGatewayConfig) => {
        const errors: string[] = [];
        
        if (config.enableMultiProvider && config.supportedProviders.length < 2) {
          errors.push('Multi-provider mode requires at least 2 supported providers');
        }
        
        if (!config.supportedProviders.includes(config.primaryProvider)) {
          errors.push('Primary provider must be included in supported providers list');
        }
        
        if (config.enableWebhooks && !config.webhookSecret && config.primaryProvider === 'stripe') {
          errors.push('Webhook secret is required when webhooks are enabled for Stripe');
        }
        
        if (config.enableTaxCalculation && config.taxProvider === 'manual') {
          errors.push('Tax provider must be specified when tax calculation is enabled');
        }
        
        if (config.rateLimitRequests <= 0) {
          errors.push('Rate limit requests must be greater than 0');
        }
        
        return errors;
      }
    }
  };

  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];
    const config = context.moduleConfig as PaymentGatewayConfig;

    switch (context.framework) {
      case SupportedFramework.NEXTJS:
        files.push(...await this.generateNextJSFiles(config, context));
        break;
      case SupportedFramework.FLUTTER:
        files.push(...await this.generateFlutterFiles(config, context));
        break;
      case SupportedFramework.REACT_NATIVE:
        files.push(...await this.generateReactNativeFiles(config, context));
        break;
      case SupportedFramework.TAURI:
        files.push(...await this.generateTauriFiles(config, context));
        break;
      case SupportedFramework.SVELTEKIT:
        files.push(...await this.generateSvelteKitFiles(config, context));
        break;
    }

    return files;
  }

  private async generateNextJSFiles(config: PaymentGatewayConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core payment gateway interface
    files.push({
      relativePath: 'src/lib/payments/gateway.ts',
      content: this.generatePaymentGatewayInterface(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // Payment types
    files.push({
      relativePath: 'src/lib/payments/types.ts',
      content: this.generatePaymentTypes(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // Payment manager
    files.push({
      relativePath: 'src/lib/payments/manager.ts',
      content: this.generatePaymentManager(config, 'nextjs'),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // Webhook handler
    if (config.enableWebhooks) {
      files.push({
        relativePath: 'pages/api/webhooks/payment.ts',
        content: this.generateWebhookHandler(config, 'nextjs'),
        encoding: 'utf8',
        executable: false,
        overwrite: true,
        mergeStrategy: 'replace',
        conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
      });
    }

    // Payment utilities
    files.push({
      relativePath: 'src/lib/payments/utils.ts',
      content: this.generatePaymentUtils(config, 'nextjs'),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    return files;
  }

  private async generateFlutterFiles(config: PaymentGatewayConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Payment gateway interface
    files.push({
      relativePath: 'lib/payments/payment_gateway.dart',
      content: this.generateFlutterPaymentGateway(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Payment models
    files.push({
      relativePath: 'lib/payments/models/payment_models.dart',
      content: this.generateFlutterPaymentModels(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Payment service
    files.push({
      relativePath: 'lib/payments/services/payment_service.dart',
      content: this.generateFlutterPaymentService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    return files;
  }

  private async generateReactNativeFiles(config: PaymentGatewayConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Payment gateway interface
    files.push({
      relativePath: 'src/payments/PaymentGateway.ts',
      content: this.generatePaymentGatewayInterface(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // Payment manager
    files.push({
      relativePath: 'src/payments/PaymentManager.ts',
      content: this.generatePaymentManager(config, 'react-native'),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    return files;
  }

  private async generateTauriFiles(config: PaymentGatewayConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Frontend payment service
    files.push({
      relativePath: 'src/payments/paymentService.ts',
      content: this.generateTauriPaymentService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.TAURI, isFrontend: true }
    });

    return files;
  }

  private async generateSvelteKitFiles(config: PaymentGatewayConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Payment gateway
    files.push({
      relativePath: 'src/lib/payments/gateway.ts',
      content: this.generatePaymentGatewayInterface(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.SVELTEKIT }
    });

    return files;
  }

  private generatePaymentGatewayInterface(config: PaymentGatewayConfig): string {
    return `/**
 * Payment Gateway Abstraction Interface
 * Unified interface for multiple payment providers
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet' | 'crypto';
  provider: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  clientSecret?: string;
  paymentMethodId?: string;
  customerId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: Address;
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing' | 'unpaid';
  priceId: string;
  quantity: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  error?: {
    code: string;
    message: string;
    type: 'validation' | 'payment' | 'network' | 'system';
  };
  requiresAction?: boolean;
  actionData?: any;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  error?: {
    code: string;
    message: string;
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: string;
  data: any;
  created: Date;
  verified: boolean;
}

/**
 * Abstract Payment Gateway Interface
 */
export abstract class PaymentGateway {
  protected readonly provider: string;
  protected readonly config: any;

  constructor(provider: string, config: any) {
    this.provider = provider;
    this.config = config;
  }

  // Customer management
  abstract createCustomer(data: Omit<Customer, 'id' | 'paymentMethods'>): Promise<Customer>;
  abstract getCustomer(customerId: string): Promise<Customer | null>;
  abstract updateCustomer(customerId: string, data: Partial<Customer>): Promise<Customer>;
  abstract deleteCustomer(customerId: string): Promise<boolean>;

  // Payment methods
  abstract addPaymentMethod(customerId: string, paymentMethodData: any): Promise<PaymentMethod>;
  abstract getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
  abstract setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean>;
  abstract deletePaymentMethod(paymentMethodId: string): Promise<boolean>;

  // Payment processing
  abstract createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId?: string;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent>;
  
  abstract confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentResult>;
  abstract capturePayment(paymentIntentId: string, amount?: number): Promise<PaymentResult>;
  abstract cancelPayment(paymentIntentId: string): Promise<PaymentResult>;

  // Refunds
  abstract createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<RefundResult>;
  abstract getRefund(refundId: string): Promise<RefundResult>;

  // Subscriptions
  ${config.enableSubscriptions ? `
  abstract createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity?: number;
    metadata?: Record<string, any>;
  }): Promise<Subscription>;
  
  abstract getSubscription(subscriptionId: string): Promise<Subscription | null>;
  abstract updateSubscription(subscriptionId: string, params: Partial<Subscription>): Promise<Subscription>;
  abstract cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<Subscription>;` : ''}

  // Webhooks
  ${config.enableWebhooks ? `
  abstract verifyWebhook(payload: string, signature: string): Promise<WebhookEvent | null>;
  abstract handleWebhook(event: WebhookEvent): Promise<boolean>;` : ''}

  // Utility methods
  abstract validatePaymentMethod(paymentMethodData: any): Promise<boolean>;
  abstract formatAmount(amount: number, currency: string): number;
  abstract getSupportedCurrencies(): string[];
  abstract getProviderName(): string;
}

/**
 * Payment Gateway Factory
 */
export class PaymentGatewayFactory {
  private static gateways: Map<string, typeof PaymentGateway> = new Map();

  static register(provider: string, gatewayClass: typeof PaymentGateway): void {
    this.gateways.set(provider, gatewayClass);
  }

  static create(provider: string, config: any): PaymentGateway {
    const GatewayClass = this.gateways.get(provider);
    if (!GatewayClass) {
      throw new Error(\`Payment gateway '\${provider}' not found\`);
    }
    return new GatewayClass(provider, config);
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.gateways.keys());
  }
}`;
  }

  private generatePaymentTypes(config: PaymentGatewayConfig): string {
    return `/**
 * Payment Types and Enums
 */

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  CRYPTO = 'crypto'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid'
}

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  REFUND_CREATED = 'refund.created'
}

export interface PaymentConfig {
  provider: PaymentProvider;
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  testMode: boolean;
  currency: string;
  ${config.enableEncryption ? 'encryptionKey: string;' : ''}
}

export interface PaymentError {
  code: string;
  message: string;
  type: 'validation' | 'payment' | 'network' | 'system';
  details?: Record<string, any>;
}

export interface PaymentMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  averageTransactionAmount: number;
  refundRate: number;
  ${config.enableFraudDetection ? 'fraudDetectedCount: number;' : ''}
}

${config.enableTaxCalculation ? `
export interface TaxCalculation {
  amount: number;
  rate: number;
  jurisdiction: string;
  type: 'sales' | 'vat' | 'gst';
}` : ''}

${config.enableSplitPayments ? `
export interface SplitPayment {
  recipientId: string;
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
}` : ''}`;
  }

  private generatePaymentManager(config: PaymentGatewayConfig, framework: string): string {
    return `/**
 * Payment Manager - Unified payment processing
 */

import { PaymentGateway, PaymentGatewayFactory } from './gateway';
import { PaymentProvider, PaymentConfig, PaymentResult, PaymentError } from './types';
${config.enableAnalytics ? "import { PaymentAnalytics } from './analytics';" : ''}
${config.enableEncryption ? "import { PaymentEncryption } from './encryption';" : ''}

export class PaymentManager {
  private primaryGateway: PaymentGateway;
  private fallbackGateways: PaymentGateway[] = [];
  private config: PaymentConfig;
  ${config.enableAnalytics ? 'private analytics: PaymentAnalytics;' : ''}
  ${config.enableEncryption ? 'private encryption: PaymentEncryption;' : ''}

  constructor(config: PaymentConfig) {
    this.config = config;
    this.primaryGateway = PaymentGatewayFactory.create(config.provider, config);
    
    ${config.enableAnalytics ? 'this.analytics = new PaymentAnalytics(config);' : ''}
    ${config.enableEncryption ? 'this.encryption = new PaymentEncryption(config.encryptionKey);' : ''}
    
    ${config.enableMultiProvider ? `
    // Initialize fallback gateways if multi-provider is enabled
    this.initializeFallbackGateways();` : ''}
  }

  ${config.enableMultiProvider ? `
  private initializeFallbackGateways(): void {
    const supportedProviders = ${JSON.stringify(config.supportedProviders)};
    supportedProviders
      .filter(provider => provider !== this.config.provider)
      .forEach(provider => {
        try {
          const gateway = PaymentGatewayFactory.create(provider, {
            ...this.config,
            provider
          });
          this.fallbackGateways.push(gateway);
        } catch (error) {
          console.warn(\`Failed to initialize fallback gateway: \${provider}\`, error);
        }
      });
  }` : ''}

  async processPayment(params: {
    amount: number;
    currency?: string;
    customerId?: string;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentResult> {
    const startTime = Date.now();
    
    try {
      ${config.enableEncryption ? `
      // Encrypt sensitive payment data
      if (params.paymentMethodId) {
        params.paymentMethodId = await this.encryption.encrypt(params.paymentMethodId);
      }` : ''}

      const paymentIntent = await this.primaryGateway.createPaymentIntent({
        ...params,
        currency: params.currency || this.config.currency
      });

      const result = await this.primaryGateway.confirmPayment(paymentIntent.id, params.paymentMethodId);

      ${config.enableAnalytics ? `
      // Track successful payment
      this.analytics.trackPayment({
        amount: params.amount,
        currency: params.currency || this.config.currency,
        provider: this.config.provider,
        success: result.success,
        processingTime: Date.now() - startTime
      });` : ''}

      return result;
    } catch (error) {
      ${config.enableMultiProvider ? `
      // Try fallback gateways if primary fails
      if (this.fallbackGateways.length > 0) {
        console.warn('Primary gateway failed, trying fallback gateways', error);
        return this.processPaymentWithFallback(params, startTime);
      }` : ''}

      const paymentError: PaymentError = {
        code: 'PAYMENT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown payment error',
        type: 'payment'
      };

      ${config.enableAnalytics ? `
      this.analytics.trackPayment({
        amount: params.amount,
        currency: params.currency || this.config.currency,
        provider: this.config.provider,
        success: false,
        error: paymentError,
        processingTime: Date.now() - startTime
      });` : ''}

      return {
        success: false,
        error: paymentError
      };
    }
  }

  ${config.enableMultiProvider ? `
  private async processPaymentWithFallback(
    params: any,
    startTime: number
  ): Promise<PaymentResult> {
    for (const gateway of this.fallbackGateways) {
      try {
        const paymentIntent = await gateway.createPaymentIntent({
          ...params,
          currency: params.currency || this.config.currency
        });

        const result = await gateway.confirmPayment(paymentIntent.id, params.paymentMethodId);

        if (result.success) {
          ${config.enableAnalytics ? `
          this.analytics.trackPayment({
            amount: params.amount,
            currency: params.currency || this.config.currency,
            provider: gateway.getProviderName(),
            success: true,
            fallback: true,
            processingTime: Date.now() - startTime
          });` : ''}

          return result;
        }
      } catch (error) {
        console.warn(\`Fallback gateway \${gateway.getProviderName()} failed\`, error);
        continue;
      }
    }

    return {
      success: false,
      error: {
        code: 'ALL_GATEWAYS_FAILED',
        message: 'All payment gateways failed to process the payment',
        type: 'system'
      }
    };
  }` : ''}

  ${config.enableSubscriptions ? `
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity?: number;
    metadata?: Record<string, any>;
  }) {
    try {
      const subscription = await this.primaryGateway.createSubscription(params);
      
      ${config.enableAnalytics ? `
      this.analytics.trackSubscription({
        customerId: params.customerId,
        priceId: params.priceId,
        provider: this.config.provider,
        action: 'created'
      });` : ''}

      return subscription;
    } catch (error) {
      throw new Error(\`Failed to create subscription: \${error instanceof Error ? error.message : 'Unknown error'}\`);
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = false) {
    try {
      const subscription = await this.primaryGateway.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
      
      ${config.enableAnalytics ? `
      this.analytics.trackSubscription({
        subscriptionId,
        provider: this.config.provider,
        action: 'canceled'
      });` : ''}

      return subscription;
    } catch (error) {
      throw new Error(\`Failed to cancel subscription: \${error instanceof Error ? error.message : 'Unknown error'}\`);
    }
  }` : ''}

  ${config.enableRefunds ? `
  async createRefund(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      const refund = await this.primaryGateway.createRefund(paymentIntentId, amount, reason);
      
      ${config.enableAnalytics ? `
      this.analytics.trackRefund({
        paymentIntentId,
        amount: amount || 0,
        provider: this.config.provider,
        success: refund.success
      });` : ''}

      return refund;
    } catch (error) {
      throw new Error(\`Failed to create refund: \${error instanceof Error ? error.message : 'Unknown error'}\`);
    }
  }` : ''}

  // Customer management
  async createCustomer(customerData: any) {
    return this.primaryGateway.createCustomer(customerData);
  }

  async getCustomer(customerId: string) {
    return this.primaryGateway.getCustomer(customerId);
  }

  // Payment methods
  async addPaymentMethod(customerId: string, paymentMethodData: any) {
    ${config.enableEncryption ? `
    // Encrypt sensitive payment method data
    paymentMethodData = await this.encryption.encryptPaymentMethod(paymentMethodData);` : ''}

    return this.primaryGateway.addPaymentMethod(customerId, paymentMethodData);
  }

  async getPaymentMethods(customerId: string) {
    const methods = await this.primaryGateway.getPaymentMethods(customerId);
    
    ${config.enableEncryption ? `
    // Decrypt sensitive data for display
    return Promise.all(methods.map(method => this.encryption.decryptPaymentMethod(method)));` : 'return methods;'}
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; providers: any[] }> {
    const providers = [];
    
    try {
      // Test primary gateway
      providers.push({
        provider: this.config.provider,
        status: 'healthy',
        primary: true
      });
    } catch (error) {
      providers.push({
        provider: this.config.provider,
        status: 'unhealthy',
        primary: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    ${config.enableMultiProvider ? `
    // Test fallback gateways
    for (const gateway of this.fallbackGateways) {
      try {
        providers.push({
          provider: gateway.getProviderName(),
          status: 'healthy',
          primary: false
        });
      } catch (error) {
        providers.push({
          provider: gateway.getProviderName(),
          status: 'unhealthy',
          primary: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }` : ''}

    const hasHealthyProvider = providers.some(p => p.status === 'healthy');
    
    return {
      status: hasHealthyProvider ? 'healthy' : 'unhealthy',
      providers
    };
  }
}`;
  }

  private generateWebhookHandler(config: PaymentGatewayConfig, framework: string): string {
    return `/**
 * Payment Webhook Handler
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PaymentManager } from '../../../src/lib/payments/manager';
import { WebhookEvent } from '../../../src/lib/payments/types';

const paymentManager = new PaymentManager({
  provider: process.env.PAYMENT_PROVIDER as any || '${config.primaryProvider}',
  apiKey: process.env.PAYMENT_API_KEY || '',
  secretKey: process.env.PAYMENT_SECRET_KEY || '',
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  testMode: process.env.NODE_ENV !== 'production',
  currency: '${config.defaultCurrency}',
  ${config.enableEncryption ? "encryptionKey: process.env.PAYMENT_ENCRYPTION_KEY || ''," : ''}
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const signature = req.headers['stripe-signature'] || 
                     req.headers['paypal-transmission-sig'] || 
                     req.headers['x-webhook-signature'];

    if (!signature) {
      return res.status(400).json({ message: 'Missing webhook signature' });
    }

    const rawBody = JSON.stringify(req.body);
    
    // Verify and parse webhook
    const event = await verifyWebhook(rawBody, signature as string);
    
    if (!event) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    // Process webhook event
    const processed = await processWebhookEvent(event);
    
    if (processed) {
      res.status(200).json({ received: true });
    } else {
      res.status(400).json({ message: 'Failed to process webhook' });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      message: 'Webhook processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function verifyWebhook(payload: string, signature: string): Promise<WebhookEvent | null> {
  try {
    // Implementation depends on the payment provider
    // This is a simplified example
    
    const event: WebhookEvent = {
      id: \`webhook_\${Date.now()}\`,
      type: 'payment.succeeded', // This would be parsed from the actual webhook
      provider: '${config.primaryProvider}',
      data: JSON.parse(payload),
      created: new Date(),
      verified: true
    };

    return event;
  } catch (error) {
    console.error('Webhook verification failed:', error);
    return null;
  }
}

async function processWebhookEvent(event: WebhookEvent): Promise<boolean> {
  try {
    switch (event.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(event);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event);
        break;
      ${config.enableSubscriptions ? `
      case 'subscription.created':
        await handleSubscriptionCreated(event);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;` : ''}
      case 'customer.created':
        await handleCustomerCreated(event);
        break;
      default:
        console.log(\`Unhandled webhook event type: \${event.type}\`);
    }

    return true;
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return false;
  }
}

async function handlePaymentSucceeded(event: WebhookEvent): Promise<void> {
  console.log('Payment succeeded:', event.data);
  // Implement your business logic here
  // e.g., update order status, send confirmation email, etc.
}

async function handlePaymentFailed(event: WebhookEvent): Promise<void> {
  console.log('Payment failed:', event.data);
  // Implement your business logic here
  // e.g., notify customer, retry payment, etc.
}

${config.enableSubscriptions ? `
async function handleSubscriptionCreated(event: WebhookEvent): Promise<void> {
  console.log('Subscription created:', event.data);
  // Implement your business logic here
  // e.g., activate user account, send welcome email, etc.
}

async function handleSubscriptionCanceled(event: WebhookEvent): Promise<void> {
  console.log('Subscription canceled:', event.data);
  // Implement your business logic here
  // e.g., schedule account deactivation, send cancellation email, etc.
}` : ''}

async function handleCustomerCreated(event: WebhookEvent): Promise<void> {
  console.log('Customer created:', event.data);
  // Implement your business logic here
  // e.g., sync customer data with your database, etc.
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};`;
  }

  private generatePaymentUtils(config: PaymentGatewayConfig, framework: string): string {
    return `/**
 * Payment Utilities
 */

import { PaymentError } from './types';

export class PaymentUtils {
  /**
   * Format amount for payment processing
   */
  static formatAmount(amount: number, currency: string): number {
    // Convert to smallest currency unit (e.g., cents for USD)
    const currencyDecimals = PaymentUtils.getCurrencyDecimals(currency);
    return Math.round(amount * Math.pow(10, currencyDecimals));
  }

  /**
   * Format amount for display
   */
  static formatAmountForDisplay(amount: number, currency: string): string {
    const displayAmount = amount / Math.pow(10, PaymentUtils.getCurrencyDecimals(currency));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(displayAmount);
  }

  /**
   * Get currency decimal places
   */
  static getCurrencyDecimals(currency: string): number {
    const currencyDecimals: Record<string, number> = {
      'USD': 2, 'EUR': 2, 'GBP': 2, 'CAD': 2, 'AUD': 2,
      'JPY': 0, 'KRW': 0, 'VND': 0,
      'BTC': 8, 'ETH': 18
    };
    return currencyDecimals[currency.toUpperCase()] || 2;
  }

  /**
   * Validate currency code
   */
  static isValidCurrency(currency: string): boolean {
    const supportedCurrencies = ${JSON.stringify(config.supportedCurrencies)};
    return supportedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Validate payment amount
   */
  static validateAmount(amount: number, currency: string): PaymentError | null {
    if (amount <= 0) {
      return {
        code: 'INVALID_AMOUNT',
        message: 'Payment amount must be greater than zero',
        type: 'validation'
      };
    }

    // Minimum amounts by currency
    const minimumAmounts: Record<string, number> = {
      'USD': 0.50, 'EUR': 0.50, 'GBP': 0.30,
      'BTC': 0.0001, 'ETH': 0.001
    };

    const minAmount = minimumAmounts[currency.toUpperCase()];
    if (minAmount && amount < minAmount) {
      return {
        code: 'AMOUNT_TOO_SMALL',
        message: \`Amount must be at least \${minAmount} \${currency.toUpperCase()}\`,
        type: 'validation'
      };
    }

    // Maximum amounts by currency (for fraud prevention)
    const maximumAmounts: Record<string, number> = {
      'USD': 999999.99, 'EUR': 999999.99, 'GBP': 999999.99,
      'BTC': 100, 'ETH': 1000
    };

    const maxAmount = maximumAmounts[currency.toUpperCase()];
    if (maxAmount && amount > maxAmount) {
      return {
        code: 'AMOUNT_TOO_LARGE',
        message: \`Amount cannot exceed \${maxAmount} \${currency.toUpperCase()}\`,
        type: 'validation'
      };
    }

    return null;
  }

  /**
   * Generate secure payment reference
   */
  static generatePaymentReference(prefix = 'pay'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return \`\${prefix}_\${timestamp}_\${random}\`;
  }

  /**
   * Sanitize payment metadata
   */
  static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Remove sensitive keys
      if (PaymentUtils.isSensitiveKey(key)) {
        continue;
      }
      
      // Limit string length
      if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Check if metadata key contains sensitive information
   */
  private static isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'secret', 'token', 'key', 'ssn', 'social',
      'credit_card', 'card_number', 'cvv', 'security_code'
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  ${config.enableFraudDetection ? `
  /**
   * Basic fraud detection scoring
   */
  static calculateFraudScore(params: {
    amount: number;
    currency: string;
    customerEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    velocityChecks?: {
      transactionsLast24h: number;
      amountLast24h: number;
    };
  }): number {
    let score = 0;

    // Amount-based scoring
    if (params.amount > 1000) score += 2;
    if (params.amount > 5000) score += 3;
    if (params.amount > 10000) score += 5;

    // Velocity checks
    if (params.velocityChecks) {
      if (params.velocityChecks.transactionsLast24h > 10) score += 3;
      if (params.velocityChecks.amountLast24h > 5000) score += 4;
    }

    // Email domain checks
    if (params.customerEmail) {
      const emailDomain = params.customerEmail.split('@')[1];
      const suspiciousDomains = ['tempmail.com', '10minutemail.com'];
      if (suspiciousDomains.includes(emailDomain)) score += 5;
    }

    return Math.min(score, 10); // Cap at 10
  }` : ''}

  ${config.enableTaxCalculation ? `
  /**
   * Calculate tax for payment
   */
  static calculateTax(amount: number, region: string, taxRate?: number): {
    taxAmount: number;
    totalAmount: number;
    taxRate: number;
  } {
    // Default tax rates by region
    const defaultTaxRates: Record<string, number> = {
      'US': 0.08, // Average US sales tax
      'EU': 0.20, // Average EU VAT
      'CA': 0.13, // Average Canadian tax
      'AU': 0.10  // Australian GST
    };

    const rate = taxRate || defaultTaxRates[region] || 0;
    const taxAmount = amount * rate;
    const totalAmount = amount + taxAmount;

    return {
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      taxRate: rate
    };
  }` : ''}

  /**
   * Retry logic for failed payments
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = ${config.retryAttempts},
    baseDelay: number = ${config.retryDelay}
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await PaymentUtils.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Sleep utility
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}`;
  }

  private generateFlutterPaymentGateway(config: PaymentGatewayConfig): string {
    return `import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class PaymentGateway {
  final String provider;
  final Map<String, dynamic> config;

  PaymentGateway(this.provider, this.config);

  Future<Customer> createCustomer(Map<String, dynamic> data);
  Future<Customer?> getCustomer(String customerId);
  Future<PaymentIntent> createPaymentIntent(Map<String, dynamic> params);
  Future<PaymentResult> confirmPayment(String paymentIntentId, [String? paymentMethodId]);
  ${config.enableRefunds ? 'Future<RefundResult> createRefund(String paymentIntentId, [double? amount, String? reason]);' : ''}
  ${config.enableSubscriptions ? 'Future<Subscription> createSubscription(Map<String, dynamic> params);' : ''}
}

class Customer {
  final String id;
  final String email;
  final String? name;
  final String? phone;
  final List<PaymentMethod> paymentMethods;
  final Map<String, dynamic>? metadata;

  Customer({
    required this.id,
    required this.email,
    this.name,
    this.phone,
    this.paymentMethods = const [],
    this.metadata,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      phone: json['phone'],
      paymentMethods: (json['paymentMethods'] as List<dynamic>?)
          ?.map((pm) => PaymentMethod.fromJson(pm))
          .toList() ?? [],
      metadata: json['metadata'],
    );
  }
}

class PaymentMethod {
  final String id;
  final String type;
  final String provider;
  final String? last4;
  final String? brand;
  final bool isDefault;
  final Map<String, dynamic>? metadata;

  PaymentMethod({
    required this.id,
    required this.type,
    required this.provider,
    this.last4,
    this.brand,
    this.isDefault = false,
    this.metadata,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['id'],
      type: json['type'],
      provider: json['provider'],
      last4: json['last4'],
      brand: json['brand'],
      isDefault: json['isDefault'] ?? false,
      metadata: json['metadata'],
    );
  }
}

class PaymentIntent {
  final String id;
  final double amount;
  final String currency;
  final String status;
  final String? clientSecret;
  final String? paymentMethodId;
  final String? customerId;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  PaymentIntent({
    required this.id,
    required this.amount,
    required this.currency,
    required this.status,
    this.clientSecret,
    this.paymentMethodId,
    this.customerId,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PaymentIntent.fromJson(Map<String, dynamic> json) {
    return PaymentIntent(
      id: json['id'],
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'],
      status: json['status'],
      clientSecret: json['clientSecret'],
      paymentMethodId: json['paymentMethodId'],
      customerId: json['customerId'],
      metadata: json['metadata'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}

class PaymentResult {
  final bool success;
  final PaymentIntent? paymentIntent;
  final PaymentError? error;
  final bool requiresAction;
  final Map<String, dynamic>? actionData;

  PaymentResult({
    required this.success,
    this.paymentIntent,
    this.error,
    this.requiresAction = false,
    this.actionData,
  });

  factory PaymentResult.fromJson(Map<String, dynamic> json) {
    return PaymentResult(
      success: json['success'],
      paymentIntent: json['paymentIntent'] != null 
          ? PaymentIntent.fromJson(json['paymentIntent'])
          : null,
      error: json['error'] != null 
          ? PaymentError.fromJson(json['error'])
          : null,
      requiresAction: json['requiresAction'] ?? false,
      actionData: json['actionData'],
    );
  }
}

class PaymentError {
  final String code;
  final String message;
  final String type;
  final Map<String, dynamic>? details;

  PaymentError({
    required this.code,
    required this.message,
    required this.type,
    this.details,
  });

  factory PaymentError.fromJson(Map<String, dynamic> json) {
    return PaymentError(
      code: json['code'],
      message: json['message'],
      type: json['type'],
      details: json['details'],
    );
  }
}

${config.enableRefunds ? `
class RefundResult {
  final bool success;
  final String? refundId;
  final double amount;
  final String status;
  final PaymentError? error;

  RefundResult({
    required this.success,
    this.refundId,
    required this.amount,
    required this.status,
    this.error,
  });

  factory RefundResult.fromJson(Map<String, dynamic> json) {
    return RefundResult(
      success: json['success'],
      refundId: json['refundId'],
      amount: (json['amount'] as num).toDouble(),
      status: json['status'],
      error: json['error'] != null 
          ? PaymentError.fromJson(json['error'])
          : null,
    );
  }
}` : ''}

${config.enableSubscriptions ? `
class Subscription {
  final String id;
  final String customerId;
  final String status;
  final String priceId;
  final int quantity;
  final DateTime currentPeriodStart;
  final DateTime currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final Map<String, dynamic>? metadata;

  Subscription({
    required this.id,
    required this.customerId,
    required this.status,
    required this.priceId,
    required this.quantity,
    required this.currentPeriodStart,
    required this.currentPeriodEnd,
    required this.cancelAtPeriodEnd,
    this.metadata,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id'],
      customerId: json['customerId'],
      status: json['status'],
      priceId: json['priceId'],
      quantity: json['quantity'],
      currentPeriodStart: DateTime.parse(json['currentPeriodStart']),
      currentPeriodEnd: DateTime.parse(json['currentPeriodEnd']),
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'] ?? false,
      metadata: json['metadata'],
    );
  }
}` : ''}`;
  }

  private generateFlutterPaymentModels(config: PaymentGatewayConfig): string {
    return `enum PaymentProvider {
  stripe,
  paypal,
  crypto,
}

enum PaymentStatus {
  pending,
  processing,
  succeeded,
  failed,
  canceled,
  requiresPaymentMethod,
  requiresConfirmation,
  requiresAction,
}

${config.enableSubscriptions ? `
enum SubscriptionStatus {
  active,
  canceled,
  incomplete,
  pastDue,
  trialing,
  unpaid,
}` : ''}

class PaymentConfig {
  final PaymentProvider provider;
  final String apiKey;
  final String secretKey;
  final String? webhookSecret;
  final bool testMode;
  final String currency;
  ${config.enableEncryption ? 'final String encryptionKey;' : ''}

  PaymentConfig({
    required this.provider,
    required this.apiKey,
    required this.secretKey,
    this.webhookSecret,
    required this.testMode,
    required this.currency,
    ${config.enableEncryption ? 'required this.encryptionKey,' : ''}
  });
}

class PaymentMetrics {
  final int totalTransactions;
  final int successfulTransactions;
  final int failedTransactions;
  final double totalAmount;
  final double averageTransactionAmount;
  final double refundRate;
  ${config.enableFraudDetection ? 'final int fraudDetectedCount;' : ''}

  PaymentMetrics({
    required this.totalTransactions,
    required this.successfulTransactions,
    required this.failedTransactions,
    required this.totalAmount,
    required this.averageTransactionAmount,
    required this.refundRate,
    ${config.enableFraudDetection ? 'required this.fraudDetectedCount,' : ''}
  });
}`;
  }

  private generateFlutterPaymentService(config: PaymentGatewayConfig): string {
    return `import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../payment_gateway.dart';
import '../models/payment_models.dart';

class PaymentService extends ChangeNotifier {
  final PaymentGateway _gateway;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  PaymentService(this._gateway);

  Future<Customer> createCustomer({
    required String email,
    String? name,
    String? phone,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final customer = await _gateway.createCustomer({
        'email': email,
        'name': name,
        'phone': phone,
        'metadata': metadata,
      });
      
      // Cache customer data securely
      await _storage.write(
        key: 'customer_\${customer.id}', 
        value: jsonEncode(customer.toJson())
      );
      
      return customer;
    } catch (error) {
      throw PaymentException('Failed to create customer: \$error');
    }
  }

  Future<PaymentResult> processPayment({
    required double amount,
    required String currency,
    String? customerId,
    String? paymentMethodId,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      ${config.enableFraudDetection ? `
      // Basic fraud detection
      final fraudScore = _calculateFraudScore(amount, customerId);
      if (fraudScore > 7) {
        return PaymentResult(
          success: false,
          error: PaymentError(
            code: 'FRAUD_DETECTED',
            message: 'Transaction flagged for review',
            type: 'fraud',
          ),
        );
      }` : ''}

      final paymentIntent = await _gateway.createPaymentIntent({
        'amount': _formatAmount(amount, currency),
        'currency': currency,
        'customerId': customerId,
        'paymentMethodId': paymentMethodId,
        'metadata': metadata,
      });

      final result = await _gateway.confirmPayment(
        paymentIntent.id,
        paymentMethodId,
      );

      ${config.enableAnalytics ? `
      // Track payment metrics
      await _trackPayment(amount, currency, result.success);` : ''}

      notifyListeners();
      return result;
    } catch (error) {
      debugPrint('Payment processing error: \$error');
      return PaymentResult(
        success: false,
        error: PaymentError(
          code: 'PAYMENT_FAILED',
          message: 'Payment processing failed: \$error',
          type: 'payment',
        ),
      );
    }
  }

  ${config.enableSubscriptions ? `
  Future<Subscription> createSubscription({
    required String customerId,
    required String priceId,
    int quantity = 1,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final subscription = await _gateway.createSubscription({
        'customerId': customerId,
        'priceId': priceId,
        'quantity': quantity,
        'metadata': metadata,
      });

      ${config.enableAnalytics ? `
      await _trackSubscription(customerId, priceId, 'created');` : ''}

      notifyListeners();
      return subscription;
    } catch (error) {
      throw PaymentException('Failed to create subscription: \$error');
    }
  }` : ''}

  ${config.enableRefunds ? `
  Future<RefundResult> createRefund({
    required String paymentIntentId,
    double? amount,
    String? reason,
  }) async {
    try {
      final refund = await _gateway.createRefund(
        paymentIntentId,
        amount,
        reason,
      );

      ${config.enableAnalytics ? `
      await _trackRefund(paymentIntentId, amount ?? 0, refund.success);` : ''}

      notifyListeners();
      return refund;
    } catch (error) {
      throw PaymentException('Failed to create refund: \$error');
    }
  }` : ''}

  // Utility methods
  int _formatAmount(double amount, String currency) {
    final decimals = _getCurrencyDecimals(currency);
    return (amount * math.pow(10, decimals)).round();
  }

  int _getCurrencyDecimals(String currency) {
    const currencyDecimals = {
      'USD': 2, 'EUR': 2, 'GBP': 2,
      'JPY': 0, 'KRW': 0,
      'BTC': 8, 'ETH': 18,
    };
    return currencyDecimals[currency.toUpperCase()] ?? 2;
  }

  ${config.enableFraudDetection ? `
  double _calculateFraudScore(double amount, String? customerId) {
    double score = 0;
    
    // Amount-based scoring
    if (amount > 1000) score += 2;
    if (amount > 5000) score += 3;
    if (amount > 10000) score += 5;
    
    // Add more fraud detection logic here
    
    return math.min(score, 10);
  }` : ''}

  ${config.enableAnalytics ? `
  Future<void> _trackPayment(double amount, String currency, bool success) async {
    final metrics = {
      'amount': amount,
      'currency': currency,
      'success': success,
      'timestamp': DateTime.now().toIso8601String(),
    };
    
    // Store analytics data
    await _storage.write(
      key: 'payment_analytics_\${DateTime.now().millisecondsSinceEpoch}',
      value: jsonEncode(metrics),
    );
  }

  Future<void> _trackSubscription(String customerId, String priceId, String action) async {
    final metrics = {
      'customerId': customerId,
      'priceId': priceId,
      'action': action,
      'timestamp': DateTime.now().toIso8601String(),
    };
    
    await _storage.write(
      key: 'subscription_analytics_\${DateTime.now().millisecondsSinceEpoch}',
      value: jsonEncode(metrics),
    );
  }

  Future<void> _trackRefund(String paymentIntentId, double amount, bool success) async {
    final metrics = {
      'paymentIntentId': paymentIntentId,
      'amount': amount,
      'success': success,
      'timestamp': DateTime.now().toIso8601String(),
    };
    
    await _storage.write(
      key: 'refund_analytics_\${DateTime.now().millisecondsSinceEpoch}',
      value: jsonEncode(metrics),
    );
  }` : ''}
}

class PaymentException implements Exception {
  final String message;
  PaymentException(this.message);
  
  @override
  String toString() => 'PaymentException: \$message';
}`;
  }

  private generateTauriPaymentService(config: PaymentGatewayConfig): string {
    return `import { invoke } from '@tauri-apps/api/tauri';

export interface PaymentConfig {
  provider: string;
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  testMode: boolean;
  currency: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: any;
  error?: {
    code: string;
    message: string;
    type: string;
  };
}

export class TauriPaymentService {
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const result = await invoke<PaymentResult>('process_payment', {
        config: this.config,
        request
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TAURI_PAYMENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'system'
        }
      };
    }
  }

  ${config.enableSubscriptions ? `
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity?: number;
    metadata?: Record<string, any>;
  }) {
    try {
      return await invoke('create_subscription', {
        config: this.config,
        params
      });
    } catch (error) {
      throw new Error(\`Failed to create subscription: \${error}\`);
    }
  }` : ''}

  async createCustomer(customerData: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      return await invoke('create_customer', {
        config: this.config,
        customerData
      });
    } catch (error) {
      throw new Error(\`Failed to create customer: \${error}\`);
    }
  }

  ${config.enableRefunds ? `
  async createRefund(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      return await invoke('create_refund', {
        config: this.config,
        paymentIntentId,
        amount,
        reason
      });
    } catch (error) {
      throw new Error(\`Failed to create refund: \${error}\`);
    }
  }` : ''}
}`;
  }
}