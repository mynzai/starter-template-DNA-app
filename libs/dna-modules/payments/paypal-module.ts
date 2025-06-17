/**
 * @fileoverview PayPal Payment Processing DNA Module - Epic 5 Story 3 AC2
 * Provides comprehensive PayPal integration with express checkout and recurring payments
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
 * PayPal environment types
 */
export enum PayPalEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production'
}

/**
 * PayPal payment method types
 */
export enum PayPalPaymentMethod {
  PAYPAL = 'paypal',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  VENMO = 'venmo'
}

/**
 * PayPal subscription frequency
 */
export enum PayPalFrequency {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR'
}

/**
 * PayPal order status
 */
export enum PayPalOrderStatus {
  CREATED = 'CREATED',
  SAVED = 'SAVED',
  APPROVED = 'APPROVED',
  VOIDED = 'VOIDED',
  COMPLETED = 'COMPLETED',
  PAYER_ACTION_REQUIRED = 'PAYER_ACTION_REQUIRED'
}

/**
 * PayPal subscription status
 */
export enum PayPalSubscriptionStatus {
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

/**
 * PayPal configuration
 */
export interface PayPalConfig {
  // API credentials
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
  
  // Webhook configuration
  webhookId?: string;
  webhookSecret?: string;
  
  // Payment settings
  currency: string;
  locale: string;
  
  // Features
  enableExpressCheckout: boolean;
  enableSubscriptions: boolean;
  enableVault: boolean;
  enableApplePay: boolean;
  enableGooglePay: boolean;
  
  // Security
  enableFraudProtection: boolean;
  enable3DSecure: boolean;
  
  // URLs
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  
  // Business settings
  brandName?: string;
  logoUrl?: string;
  merchantId?: string;
}

/**
 * PayPal address
 */
export interface PayPalAddress {
  addressLine1: string;
  addressLine2?: string;
  adminArea2: string; // city
  adminArea1?: string; // state
  postalCode: string;
  countryCode: string;
}

/**
 * PayPal payer information
 */
export interface PayPalPayer {
  payerId?: string;
  name?: {
    givenName: string;
    surname: string;
  };
  emailAddress: string;
  phone?: {
    phoneType: 'FAX' | 'HOME' | 'MOBILE' | 'OTHER' | 'PAGER';
    phoneNumber: {
      nationalNumber: string;
    };
  };
  address?: PayPalAddress;
}

/**
 * PayPal order request
 */
export interface PayPalOrderRequest {
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchaseUnits: Array<{
    referenceId?: string;
    amount: {
      currencyCode: string;
      value: string;
      breakdown?: {
        itemTotal?: { currencyCode: string; value: string };
        shipping?: { currencyCode: string; value: string };
        handling?: { currencyCode: string; value: string };
        taxTotal?: { currencyCode: string; value: string };
        discount?: { currencyCode: string; value: string };
      };
    };
    payee?: {
      emailAddress?: string;
      merchantId?: string;
    };
    description?: string;
    customId?: string;
    invoiceId?: string;
    items?: Array<{
      name: string;
      unitAmount: { currencyCode: string; value: string };
      quantity: string;
      description?: string;
      sku?: string;
      category?: 'DIGITAL_GOODS' | 'PHYSICAL_GOODS';
    }>;
    shipping?: {
      name?: { fullName: string };
      address: PayPalAddress;
    };
  }>;
  payer?: PayPalPayer;
  applicationContext?: {
    brandName?: string;
    locale?: string;
    landingPage?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE';
    shippingPreference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS';
    userAction?: 'CONTINUE' | 'PAY_NOW';
    returnUrl?: string;
    cancelUrl?: string;
  };
}

/**
 * PayPal order result
 */
export interface PayPalOrderResult {
  success: boolean;
  order?: {
    id: string;
    status: PayPalOrderStatus;
    links: Array<{
      href: string;
      rel: string;
      method: string;
    }>;
    checkoutUrl?: string;
  };
  error?: {
    name: string;
    message: string;
    details?: any[];
  };
}

/**
 * PayPal subscription plan
 */
export interface PayPalSubscriptionPlan {
  id?: string;
  productId: string;
  name: string;
  description?: string;
  status?: 'CREATED' | 'INACTIVE' | 'ACTIVE';
  billingCycles: Array<{
    frequencyInterval: {
      intervalUnit: PayPalFrequency;
      intervalCount: number;
    };
    tenureType: 'REGULAR' | 'TRIAL';
    sequence: number;
    totalCycles: number;
    pricingScheme: {
      fixedPrice: {
        currencyCode: string;
        value: string;
      };
    };
  }>;
  paymentPreferences: {
    autoBillOutstanding: boolean;
    setupFee?: {
      currencyCode: string;
      value: string;
    };
    setupFeeFailureAction: 'CONTINUE' | 'CANCEL';
    paymentFailureThreshold: number;
  };
  taxes?: {
    percentage: string;
    inclusive: boolean;
  };
}

/**
 * PayPal subscription request
 */
export interface PayPalSubscriptionRequest {
  planId: string;
  startTime?: string; // ISO 8601 format
  quantity?: string;
  shippingAmount?: {
    currencyCode: string;
    value: string;
  };
  subscriber: {
    name?: {
      givenName: string;
      surname: string;
    };
    emailAddress: string;
    shippingAddress?: PayPalAddress;
    paymentSource?: {
      paypal?: {
        experienceContext: {
          brandName?: string;
          locale?: string;
          shippingPreference?: string;
          userAction?: string;
          returnUrl: string;
          cancelUrl: string;
        };
      };
    };
  };
  applicationContext: {
    brandName?: string;
    locale?: string;
    shippingPreference?: string;
    userAction?: string;
    returnUrl: string;
    cancelUrl: string;
  };
  customId?: string;
}

/**
 * PayPal subscription result
 */
export interface PayPalSubscriptionResult {
  success: boolean;
  subscription?: {
    id: string;
    status: PayPalSubscriptionStatus;
    planId: string;
    startTime: string;
    createTime: string;
    links: Array<{
      href: string;
      rel: string;
      method: string;
    }>;
    approvalUrl?: string;
  };
  error?: {
    name: string;
    message: string;
    details?: any[];
  };
}

/**
 * PayPal webhook event
 */
export interface PayPalWebhookEvent {
  id: string;
  eventType: string;
  eventVersion: string;
  createTime: string;
  resourceType: string;
  resourceVersion?: string;
  summary: string;
  resource: any;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

/**
 * PayPal Module implementation
 */
export class PayPalModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'paypal-payments',
    name: 'PayPal Payment Processing Module',
    version: '1.0.0',
    description: 'Comprehensive PayPal integration with express checkout and recurring payments',
    category: DNAModuleCategory.PAYMENTS,
    tags: ['payments', 'paypal', 'subscriptions', 'express-checkout', 'e-commerce'],
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
    dependencies: ['@paypal/checkout-server-sdk', 'node-fetch'],
    devDependencies: ['@types/node'],
    peerDependencies: []
  };

  private config: PayPalConfig;
  private eventEmitter: EventEmitter;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: PayPalConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.validateConfig();
  }

  /**
   * Get access token for PayPal API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const baseUrl = this.config.environment === PayPalEnvironment.SANDBOX 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
    
    return this.accessToken;
  }

  /**
   * Make authenticated request to PayPal API
   */
  private async makeRequest(
    method: string, 
    endpoint: string, 
    body?: any
  ): Promise<any> {
    const accessToken = await this.getAccessToken();
    const baseUrl = this.config.environment === PayPalEnvironment.SANDBOX 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'PayPal-Request-Id': this.generateRequestId()
    };

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'PayPal API request failed');
    }

    return responseData;
  }

  /**
   * Create PayPal order for express checkout
   */
  public async createOrder(request: PayPalOrderRequest): Promise<PayPalOrderResult> {
    try {
      const orderData = await this.makeRequest('POST', '/v2/checkout/orders', request);
      
      // Find approval URL
      const approvalLink = orderData.links?.find((link: any) => link.rel === 'approve');
      
      this.eventEmitter.emit('order:created', { order: orderData, request });
      
      return {
        success: true,
        order: {
          id: orderData.id,
          status: orderData.status,
          links: orderData.links,
          checkoutUrl: approvalLink?.href
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'ORDER_CREATION_FAILED',
          message: error.message || 'Failed to create PayPal order',
          details: error.details
        }
      };
    }
  }

  /**
   * Capture approved PayPal order
   */
  public async captureOrder(orderId: string): Promise<PayPalOrderResult> {
    try {
      const captureData = await this.makeRequest('POST', `/v2/checkout/orders/${orderId}/capture`);
      
      this.eventEmitter.emit('order:captured', { capture: captureData, orderId });
      
      return {
        success: true,
        order: {
          id: captureData.id,
          status: captureData.status,
          links: captureData.links
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'ORDER_CAPTURE_FAILED',
          message: error.message || 'Failed to capture PayPal order',
          details: error.details
        }
      };
    }
  }

  /**
   * Create subscription plan
   */
  public async createSubscriptionPlan(plan: PayPalSubscriptionPlan): Promise<{ success: boolean; planId?: string; error?: any }> {
    try {
      const planData = await this.makeRequest('POST', '/v1/billing/plans', plan);
      
      this.eventEmitter.emit('plan:created', { plan: planData });
      
      return {
        success: true,
        planId: planData.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'PLAN_CREATION_FAILED',
          message: error.message || 'Failed to create subscription plan',
          details: error.details
        }
      };
    }
  }

  /**
   * Create subscription
   */
  public async createSubscription(request: PayPalSubscriptionRequest): Promise<PayPalSubscriptionResult> {
    try {
      const subscriptionData = await this.makeRequest('POST', '/v1/billing/subscriptions', request);
      
      // Find approval URL
      const approvalLink = subscriptionData.links?.find((link: any) => link.rel === 'approve');
      
      this.eventEmitter.emit('subscription:created', { subscription: subscriptionData, request });
      
      return {
        success: true,
        subscription: {
          id: subscriptionData.id,
          status: subscriptionData.status,
          planId: subscriptionData.plan_id,
          startTime: subscriptionData.start_time,
          createTime: subscriptionData.create_time,
          links: subscriptionData.links,
          approvalUrl: approvalLink?.href
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'SUBSCRIPTION_CREATION_FAILED',
          message: error.message || 'Failed to create PayPal subscription',
          details: error.details
        }
      };
    }
  }

  /**
   * Get subscription details
   */
  public async getSubscription(subscriptionId: string): Promise<PayPalSubscriptionResult> {
    try {
      const subscriptionData = await this.makeRequest('GET', `/v1/billing/subscriptions/${subscriptionId}`);
      
      return {
        success: true,
        subscription: {
          id: subscriptionData.id,
          status: subscriptionData.status,
          planId: subscriptionData.plan_id,
          startTime: subscriptionData.start_time,
          createTime: subscriptionData.create_time,
          links: subscriptionData.links
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'SUBSCRIPTION_RETRIEVE_FAILED',
          message: error.message || 'Failed to retrieve PayPal subscription',
          details: error.details
        }
      };
    }
  }

  /**
   * Cancel subscription
   */
  public async cancelSubscription(
    subscriptionId: string, 
    reason: string = 'User requested cancellation'
  ): Promise<PayPalSubscriptionResult> {
    try {
      await this.makeRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        reason
      });
      
      this.eventEmitter.emit('subscription:canceled', { subscriptionId, reason });
      
      // Get updated subscription details
      return await this.getSubscription(subscriptionId);
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'SUBSCRIPTION_CANCEL_FAILED',
          message: error.message || 'Failed to cancel PayPal subscription',
          details: error.details
        }
      };
    }
  }

  /**
   * Suspend subscription
   */
  public async suspendSubscription(
    subscriptionId: string, 
    reason: string = 'User requested suspension'
  ): Promise<PayPalSubscriptionResult> {
    try {
      await this.makeRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/suspend`, {
        reason
      });
      
      this.eventEmitter.emit('subscription:suspended', { subscriptionId, reason });
      
      return await this.getSubscription(subscriptionId);
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'SUBSCRIPTION_SUSPEND_FAILED',
          message: error.message || 'Failed to suspend PayPal subscription',
          details: error.details
        }
      };
    }
  }

  /**
   * Activate subscription
   */
  public async activateSubscription(
    subscriptionId: string, 
    reason: string = 'User requested activation'
  ): Promise<PayPalSubscriptionResult> {
    try {
      await this.makeRequest('POST', `/v1/billing/subscriptions/${subscriptionId}/activate`, {
        reason
      });
      
      this.eventEmitter.emit('subscription:activated', { subscriptionId, reason });
      
      return await this.getSubscription(subscriptionId);
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: error.name || 'SUBSCRIPTION_ACTIVATE_FAILED',
          message: error.message || 'Failed to activate PayPal subscription',
          details: error.details
        }
      };
    }
  }

  /**
   * Handle PayPal webhook events
   */
  public async handleWebhook(
    payload: string, 
    headers: Record<string, string>
  ): Promise<{ success: boolean; event?: PayPalWebhookEvent; error?: string }> {
    try {
      // In real implementation, verify webhook signature
      const event: PayPalWebhookEvent = JSON.parse(payload);
      
      // Process different event types
      switch (event.eventType) {
        case 'CHECKOUT.ORDER.APPROVED':
          await this.handleOrderApproved(event.resource);
          break;
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted(event.resource);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentDenied(event.resource);
          break;
        case 'BILLING.SUBSCRIPTION.CREATED':
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await this.handleSubscriptionChange(event.resource, event.eventType);
          break;
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          await this.handleSubscriptionPaymentFailed(event.resource);
          break;
        default:
          console.log(`Unhandled PayPal event type: ${event.eventType}`);
      }

      this.eventEmitter.emit('webhook:processed', { event });
      
      return { success: true, event };
    } catch (error: any) {
      return { 
        success: false, 
        error: `PayPal webhook error: ${error.message}` 
      };
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.clientId) {
      throw new Error('PayPal client ID is required');
    }
    if (!this.config.clientSecret) {
      throw new Error('PayPal client secret is required');
    }
    if (!this.config.returnUrl) {
      throw new Error('PayPal return URL is required');
    }
    if (!this.config.cancelUrl) {
      throw new Error('PayPal cancel URL is required');
    }
  }

  // Webhook event handlers
  private async handleOrderApproved(order: any): Promise<void> {
    this.eventEmitter.emit('order:approved', order);
  }

  private async handlePaymentCompleted(payment: any): Promise<void> {
    this.eventEmitter.emit('payment:completed', payment);
  }

  private async handlePaymentDenied(payment: any): Promise<void> {
    this.eventEmitter.emit('payment:denied', payment);
  }

  private async handleSubscriptionChange(subscription: any, eventType: string): Promise<void> {
    this.eventEmitter.emit('subscription:changed', { subscription, eventType });
  }

  private async handleSubscriptionPaymentFailed(subscription: any): Promise<void> {
    this.eventEmitter.emit('subscription:payment_failed', subscription);
  }

  /**
   * Get generated files for the PayPal module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core PayPal types
    files.push({
      path: 'src/lib/payments/paypal/types.ts',
      content: this.generatePayPalTypes(),
      type: 'typescript'
    });

    // PayPal service
    files.push({
      path: 'src/lib/payments/paypal/service.ts',
      content: this.generatePayPalService(context),
      type: 'typescript'
    });

    // Webhook handler
    files.push({
      path: 'src/lib/payments/paypal/webhooks.ts',
      content: this.generateWebhookHandler(context),
      type: 'typescript'
    });

    // Configuration
    files.push({
      path: 'src/lib/payments/paypal/config.ts',
      content: this.generatePayPalConfig(context),
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
   * Generate PayPal types file
   */
  private generatePayPalTypes(): string {
    return `// Generated PayPal types - Epic 5 Story 3 AC2
export * from './types/paypal-types';
export * from './types/order-types';
export * from './types/subscription-types';
export * from './types/webhook-types';
`;
  }

  /**
   * Generate PayPal service file
   */
  private generatePayPalService(context: DNAModuleContext): string {
    return `// Generated PayPal Service - Epic 5 Story 3 AC2
import { PayPalModule } from './paypal-module';
import { ${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}PayPalConfig } from './config';

export class PayPalService extends PayPalModule {
  constructor() {
    super(${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}PayPalConfig);
  }
}
`;
  }

  /**
   * Generate webhook handler file
   */
  private generateWebhookHandler(context: DNAModuleContext): string {
    return `// Generated PayPal Webhook Handler - Epic 5 Story 3 AC2
export class PayPalWebhookHandler {
  // Webhook processing implementation for ${context.framework}
}
`;
  }

  /**
   * Generate PayPal configuration file
   */
  private generatePayPalConfig(context: DNAModuleContext): string {
    return `// Generated PayPal Configuration - Epic 5 Story 3 AC2
export const ${context.framework === SupportedFramework.NEXTJS ? 'NextJS' : 'Default'}PayPalConfig = {
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
        path: 'src/pages/api/paypal/webhook.ts',
        content: `// Next.js PayPal Webhook API
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // PayPal webhook processing
}
`,
        type: 'typescript'
      },
      {
        path: 'src/components/PayPalCheckout.tsx',
        content: `// Next.js PayPal Checkout Component
import React from 'react';

export const PayPalCheckout: React.FC = () => {
  return <div>{/* PayPal checkout UI */}</div>;
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
        path: 'src/components/PayPalButton.tsx',
        content: `// React Native PayPal Button
import React from 'react';
import { View } from 'react-native';

export const PayPalButton: React.FC = () => {
  return <View>{/* PayPal button UI */}</View>;
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
        path: 'lib/services/paypal_service.dart',
        content: `// Flutter PayPal Service
class PayPalService {
  // PayPal service implementation for Flutter
}
`,
        type: 'dart'
      }
    ];
  }

  /**
   * Event emitter for PayPal events
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
 * Default PayPal configuration
 */
export const defaultPayPalConfig: PayPalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  environment: PayPalEnvironment.SANDBOX,
  currency: 'USD',
  locale: 'en_US',
  enableExpressCheckout: true,
  enableSubscriptions: true,
  enableVault: true,
  enableApplePay: true,
  enableGooglePay: true,
  enableFraudProtection: true,
  enable3DSecure: true,
  returnUrl: process.env.PAYPAL_RETURN_URL || 'http://localhost:3000/payment/success',
  cancelUrl: process.env.PAYPAL_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  webhookUrl: process.env.PAYPAL_WEBHOOK_URL || 'http://localhost:3000/api/paypal/webhook',
  brandName: 'Your App Name',
  webhookId: process.env.PAYPAL_WEBHOOK_ID,
  webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET
};

export default PayPalModule;