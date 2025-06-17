/**
 * @fileoverview Stripe Payment Processing DNA Module - Epic 5 Story 3 AC1
 * Provides comprehensive Stripe integration with subscriptions and one-time payments
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
 * Stripe payment method types
 */
export enum StripePaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'us_bank_account',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  KLARNA = 'klarna',
  AFTERPAY = 'afterpay_clearpay',
  AFFIRM = 'affirm',
  SEPA_DEBIT = 'sepa_debit',
  IDEAL = 'ideal',
  SOFORT = 'sofort'
}

/**
 * Stripe subscription intervals
 */
export enum StripeInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

/**
 * Payment intent statuses
 */
export enum PaymentIntentStatus {
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture',
  CANCELED = 'canceled',
  SUCCEEDED = 'succeeded'
}

/**
 * Subscription statuses
 */
export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid'
}

/**
 * Stripe configuration
 */
export interface StripeConfig {
  // API Keys
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  
  // Environment
  environment: 'test' | 'live';
  apiVersion: string;
  
  // Payment settings
  currency: string;
  captureMethod: 'automatic' | 'manual';
  confirmationMethod: 'automatic' | 'manual';
  
  // Features
  enabledPaymentMethods: StripePaymentMethod[];
  enableSubscriptions: boolean;
  enableCustomerPortal: boolean;
  enableConnect: boolean;
  
  // Security
  requireCVV: boolean;
  requirePostalCode: boolean;
  enable3DSecure: boolean;
  
  // Webhook configuration
  webhookEndpoints: {
    paymentIntents: string;
    subscriptions: string;
    customers: string;
    invoices: string;
  };
}

/**
 * Customer information
 */
export interface StripeCustomer {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  metadata?: Record<string, string>;
}

/**
 * Payment intent request
 */
export interface PaymentIntentRequest {
  amount: number; // in cents
  currency: string;
  customer?: StripeCustomer;
  paymentMethod?: StripePaymentMethod;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  applicationFeeAmount?: number;
  transferData?: {
    destination: string;
    amount?: number;
  };
}

/**
 * Payment intent result
 */
export interface PaymentIntentResult {
  success: boolean;
  paymentIntent?: {
    id: string;
    clientSecret: string;
    status: PaymentIntentStatus;
    amount: number;
    currency: string;
    customer?: string;
    paymentMethod?: string;
  };
  error?: {
    code: string;
    message: string;
    type: string;
    decline_code?: string;
  };
}

/**
 * Subscription plan
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  amount: number; // in cents
  currency: string;
  interval: StripeInterval;
  intervalCount: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  features?: string[];
}

/**
 * Subscription request
 */
export interface SubscriptionRequest {
  customer: StripeCustomer;
  priceId: string;
  paymentMethod?: StripePaymentMethod;
  trialPeriodDays?: number;
  coupon?: string;
  metadata?: Record<string, string>;
  defaultTaxRates?: string[];
  applicationFeePercent?: number;
  transferData?: {
    destination: string;
    amountPercent?: number;
  };
}

/**
 * Subscription result
 */
export interface SubscriptionResult {
  success: boolean;
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    customer: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    items: Array<{
      id: string;
      priceId: string;
      quantity: number;
    }>;
    latestInvoice?: {
      id: string;
      paymentIntent?: {
        id: string;
        clientSecret: string;
        status: PaymentIntentStatus;
      };
    };
  };
  error?: {
    code: string;
    message: string;
    type: string;
  };
}

/**
 * Webhook event
 */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id?: string;
    idempotency_key?: string;
  };
}

/**
 * Customer portal session
 */
export interface CustomerPortalSession {
  id: string;
  url: string;
  customer: string;
  created: Date;
  expiresAt: Date;
  livemode: boolean;
}

/**
 * Stripe Module implementation
 */
export class StripeModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'stripe-payments',
    name: 'Stripe Payment Processing Module',
    version: '1.0.0',
    description: 'Comprehensive Stripe integration with subscriptions, one-time payments, and customer portal',
    category: DNAModuleCategory.PAYMENTS,
    tags: ['payments', 'stripe', 'subscriptions', 'e-commerce', 'billing'],
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
    dependencies: ['stripe'],
    devDependencies: ['@types/stripe'],
    peerDependencies: []
  };

  private config: StripeConfig;
  private eventEmitter: EventEmitter;
  private stripe: any; // Stripe instance

  constructor(config: StripeConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.validateConfig();
    this.initializeStripe();
  }

  /**
   * Initialize Stripe SDK
   */
  private initializeStripe(): void {
    // In real implementation, initialize actual Stripe SDK
    // const Stripe = require('stripe');
    // this.stripe = new Stripe(this.config.secretKey, {
    //   apiVersion: this.config.apiVersion
    // });
    
    this.stripe = {
      // Mock Stripe instance for demonstration
      paymentIntents: {
        create: this.mockCreatePaymentIntent.bind(this),
        retrieve: this.mockRetrievePaymentIntent.bind(this),
        confirm: this.mockConfirmPaymentIntent.bind(this),
        capture: this.mockCapturePaymentIntent.bind(this),
        cancel: this.mockCancelPaymentIntent.bind(this)
      },
      subscriptions: {
        create: this.mockCreateSubscription.bind(this),
        retrieve: this.mockRetrieveSubscription.bind(this),
        update: this.mockUpdateSubscription.bind(this),
        cancel: this.mockCancelSubscription.bind(this)
      },
      customers: {
        create: this.mockCreateCustomer.bind(this),
        retrieve: this.mockRetrieveCustomer.bind(this),
        update: this.mockUpdateCustomer.bind(this),
        delete: this.mockDeleteCustomer.bind(this)
      },
      billingPortal: {
        sessions: {
          create: this.mockCreatePortalSession.bind(this)
        }
      },
      webhooks: {
        constructEvent: this.mockConstructEvent.bind(this)
      }
    };
  }

  /**
   * Create payment intent for one-time payment
   */
  public async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    try {
      this.validateAmount(request.amount);
      
      let customerId: string | undefined;
      
      // Create customer if provided
      if (request.customer) {
        const customer = await this.createOrUpdateCustomer(request.customer);
        customerId = customer.id;
      }

      const paymentIntentParams = {
        amount: request.amount,
        currency: request.currency || this.config.currency,
        customer: customerId,
        description: request.description,
        metadata: request.metadata,
        capture_method: request.captureMethod || this.config.captureMethod,
        confirmation_method: request.confirmationMethod || this.config.confirmationMethod,
        application_fee_amount: request.applicationFeeAmount,
        transfer_data: request.transferData
      };

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);
      
      this.eventEmitter.emit('payment_intent:created', { paymentIntent, request });
      
      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customer: paymentIntent.customer,
          paymentMethod: paymentIntent.payment_method
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'PAYMENT_INTENT_FAILED',
          message: error.message || 'Failed to create payment intent',
          type: error.type || 'api_error'
        }
      };
    }
  }

  /**
   * Create subscription
   */
  public async createSubscription(request: SubscriptionRequest): Promise<SubscriptionResult> {
    try {
      // Create or update customer
      const customer = await this.createOrUpdateCustomer(request.customer);
      
      const subscriptionParams = {
        customer: customer.id,
        items: [{ price: request.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: request.trialPeriodDays,
        coupon: request.coupon,
        metadata: request.metadata,
        default_tax_rates: request.defaultTaxRates,
        application_fee_percent: request.applicationFeePercent,
        transfer_data: request.transferData
      };

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);
      
      this.eventEmitter.emit('subscription:created', { subscription, request });
      
      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          items: subscription.items.data.map((item: any) => ({
            id: item.id,
            priceId: item.price.id,
            quantity: item.quantity
          })),
          latestInvoice: subscription.latest_invoice ? {
            id: subscription.latest_invoice.id,
            paymentIntent: subscription.latest_invoice.payment_intent ? {
              id: subscription.latest_invoice.payment_intent.id,
              clientSecret: subscription.latest_invoice.payment_intent.client_secret,
              status: subscription.latest_invoice.payment_intent.status
            } : undefined
          } : undefined
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'SUBSCRIPTION_FAILED',
          message: error.message || 'Failed to create subscription',
          type: error.type || 'api_error'
        }
      };
    }
  }

  /**
   * Create or update customer
   */
  public async createOrUpdateCustomer(customerData: StripeCustomer): Promise<{ id: string; email: string }> {
    if (customerData.id) {
      // Update existing customer
      const customer = await this.stripe.customers.update(customerData.id, {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        metadata: customerData.metadata
      });
      return { id: customer.id, email: customer.email };
    } else {
      // Create new customer
      const customer = await this.stripe.customers.create({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        metadata: customerData.metadata
      });
      return { id: customer.id, email: customer.email };
    }
  }

  /**
   * Create customer portal session
   */
  public async createCustomerPortalSession(
    customerId: string, 
    returnUrl: string
  ): Promise<CustomerPortalSession> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return {
      id: session.id,
      url: session.url,
      customer: session.customer,
      created: new Date(session.created * 1000),
      expiresAt: new Date((session.created + 3600) * 1000), // 1 hour expiry
      livemode: session.livemode
    };
  }

  /**
   * Handle webhook events
   */
  public async handleWebhook(
    payload: string | Buffer, 
    signature: string
  ): Promise<{ success: boolean; event?: StripeWebhookEvent; error?: string }> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      // Process different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChange(event.data.object, event.type);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      this.eventEmitter.emit('webhook:processed', { event });
      
      return { success: true, event };
    } catch (error: any) {
      return { 
        success: false, 
        error: `Webhook error: ${error.message}` 
      };
    }
  }

  /**
   * Get subscription details
   */
  public async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent']
      });

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          items: subscription.items.data.map((item: any) => ({
            id: item.id,
            priceId: item.price.id,
            quantity: item.quantity
          }))
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'SUBSCRIPTION_RETRIEVE_FAILED',
          message: error.message || 'Failed to retrieve subscription',
          type: error.type || 'api_error'
        }
      };
    }
  }

  /**
   * Cancel subscription
   */
  public async cancelSubscription(
    subscriptionId: string, 
    atPeriodEnd: boolean = true
  ): Promise<SubscriptionResult> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: atPeriodEnd
      });

      this.eventEmitter.emit('subscription:canceled', { subscription });

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          items: subscription.items.data.map((item: any) => ({
            id: item.id,
            priceId: item.price.id,
            quantity: item.quantity
          }))
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'SUBSCRIPTION_CANCEL_FAILED',
          message: error.message || 'Failed to cancel subscription',
          type: error.type || 'api_error'
        }
      };
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.secretKey) {
      throw new Error('Stripe secret key is required');
    }
    if (!this.config.publishableKey) {
      throw new Error('Stripe publishable key is required');
    }
    if (!this.config.webhookSecret) {
      throw new Error('Stripe webhook secret is required');
    }
    if (!this.config.currency) {
      throw new Error('Default currency is required');
    }
  }

  /**
   * Validate payment amount
   */
  private validateAmount(amount: number): void {
    if (amount < 50) { // $0.50 minimum for most currencies
      throw new Error('Payment amount too small');
    }
    if (amount > 99999999) { // $999,999.99 maximum
      throw new Error('Payment amount too large');
    }
  }

  // Mock implementations for demonstration
  private async mockCreatePaymentIntent(params: any) {
    return {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret`,
      status: 'requires_payment_method',
      amount: params.amount,
      currency: params.currency,
      customer: params.customer,
      payment_method: null
    };
  }

  private async mockRetrievePaymentIntent(id: string) {
    return { id, status: 'succeeded' };
  }

  private async mockConfirmPaymentIntent(id: string) {
    return { id, status: 'succeeded' };
  }

  private async mockCapturePaymentIntent(id: string) {
    return { id, status: 'succeeded' };
  }

  private async mockCancelPaymentIntent(id: string) {
    return { id, status: 'canceled' };
  }

  private async mockCreateSubscription(params: any) {
    return {
      id: `sub_mock_${Date.now()}`,
      status: 'active',
      customer: params.customer,
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
      items: { data: [{ id: 'item_1', price: { id: params.items[0].price }, quantity: 1 }] },
      latest_invoice: null
    };
  }

  private async mockRetrieveSubscription(id: string) {
    return { id, status: 'active' };
  }

  private async mockUpdateSubscription(id: string, params: any) {
    return { id, ...params };
  }

  private async mockCancelSubscription(id: string) {
    return { id, status: 'canceled' };
  }

  private async mockCreateCustomer(params: any) {
    return {
      id: `cus_mock_${Date.now()}`,
      email: params.email,
      name: params.name
    };
  }

  private async mockRetrieveCustomer(id: string) {
    return { id, email: 'mock@example.com' };
  }

  private async mockUpdateCustomer(id: string, params: any) {
    return { id, ...params };
  }

  private async mockDeleteCustomer(id: string) {
    return { id, deleted: true };
  }

  private async mockCreatePortalSession(params: any) {
    return {
      id: `bps_mock_${Date.now()}`,
      url: 'https://billing.stripe.com/session/mock',
      customer: params.customer,
      created: Math.floor(Date.now() / 1000),
      livemode: false
    };
  }

  private mockConstructEvent(payload: any, signature: string, secret: string) {
    return {
      id: `evt_mock_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: { object: {} },
      created: Math.floor(Date.now() / 1000),
      livemode: false
    };
  }

  // Webhook event handlers
  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    this.eventEmitter.emit('payment:succeeded', paymentIntent);
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    this.eventEmitter.emit('payment:failed', paymentIntent);
  }

  private async handleSubscriptionChange(subscription: any, eventType: string): Promise<void> {
    this.eventEmitter.emit('subscription:changed', { subscription, eventType });
  }

  private async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
    this.eventEmitter.emit('invoice:payment_succeeded', invoice);
  }

  private async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    this.eventEmitter.emit('invoice:payment_failed', invoice);
  }

  /**
   * Get generated files for the Stripe module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core Stripe types
    files.push({
      path: 'src/lib/payments/stripe/types.ts',
      content: this.generateStripeTypes(),
      type: 'typescript'
    });

    // Stripe service
    files.push({
      path: 'src/lib/payments/stripe/service.ts',
      content: this.generateStripeService(context),
      type: 'typescript'
    });

    // Webhook handler
    files.push({
      path: 'src/lib/payments/stripe/webhooks.ts',
      content: this.generateWebhookHandler(context),
      type: 'typescript'
    });

    // Configuration
    files.push({
      path: 'src/lib/payments/stripe/config.ts',
      content: this.generateStripeConfig(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    } else if (context.framework === SupportedFramework.REACT_NATIVE) {
      files.push(...this.getReactNativeFiles());
    } else if (context.framework === SupportedFramework.FLUTTER) {
      files.push(...this.getFlutterFiles());
    }

    return files;
  }

  /**
   * Generate Stripe types file
   */
  private generateStripeTypes(): string {
    return `// Generated Stripe types - Epic 5 Story 3 AC1
export * from './types/stripe-types';
export * from './types/payment-types';
export * from './types/subscription-types';
export * from './types/webhook-types';
`;
  }

  /**
   * Generate Stripe service file
   */
  private generateStripeService(context: DNAModuleContext): string {
    return `// Generated Stripe Service - Epic 5 Story 3 AC1
import { StripeModule } from './stripe-module';
import { ${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}StripeConfig } from './config';

export class StripeService extends StripeModule {
  constructor() {
    super(${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}StripeConfig);
  }
}
`;
  }

  /**
   * Generate webhook handler file
   */
  private generateWebhookHandler(context: DNAModuleContext): string {
    return `// Generated Stripe Webhook Handler - Epic 5 Story 3 AC1
export class StripeWebhookHandler {
  // Webhook processing implementation for ${context.framework}
}
`;
  }

  /**
   * Generate Stripe configuration file
   */
  private generateStripeConfig(context: DNAModuleContext): string {
    return `// Generated Stripe Configuration - Epic 5 Story 3 AC1
export const ${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}StripeConfig = {
  // Configuration for ${context.framework}
};
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/pages/api/stripe/webhook.ts',
        content: `// Next.js Stripe Webhook API
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Stripe webhook processing
}
`,
        type: 'typescript'
      },
      {
        path: 'src/components/StripeCheckout.tsx',
        content: `// Next.js Stripe Checkout Component
import React from 'react';

export const StripeCheckout: React.FC = () => {
  return <div>{/* Stripe checkout UI */}</div>;
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Get React Native specific files
   */
  private getReactNativeFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/components/StripeProvider.tsx',
        content: `// React Native Stripe Provider
import React from 'react';
import { StripeProvider as Provider } from '@stripe/stripe-react-native';

export const StripeProvider: React.FC = ({ children }) => {
  return <Provider publishableKey="pk_test_...">{children}</Provider>;
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
        path: 'lib/services/stripe_service.dart',
        content: `// Flutter Stripe Service
import 'package:flutter_stripe/flutter_stripe.dart';

class StripeService {
  // Stripe service implementation for Flutter
}
`,
        type: 'dart'
      }
    ];
  }

  /**
   * Event emitter for Stripe events
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
 * Default Stripe configuration
 */
export const defaultStripeConfig: StripeConfig = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  environment: 'test',
  apiVersion: '2023-10-16',
  currency: 'usd',
  captureMethod: 'automatic',
  confirmationMethod: 'automatic',
  enabledPaymentMethods: [
    StripePaymentMethod.CARD,
    StripePaymentMethod.APPLE_PAY,
    StripePaymentMethod.GOOGLE_PAY
  ],
  enableSubscriptions: true,
  enableCustomerPortal: true,
  enableConnect: false,
  requireCVV: true,
  requirePostalCode: true,
  enable3DSecure: true,
  webhookEndpoints: {
    paymentIntents: '/api/stripe/webhook',
    subscriptions: '/api/stripe/webhook',
    customers: '/api/stripe/webhook',
    invoices: '/api/stripe/webhook'
  }
};

export default StripeModule;