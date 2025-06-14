import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

const PaymentGatewayConfigSchema = z.object({
  primaryProvider: z.enum(['stripe', 'paypal', 'crypto']).default('stripe'),
  fallbackProviders: z.array(z.enum(['stripe', 'paypal', 'crypto'])).default([]),
  fraudDetection: z.boolean().default(true),
  analytics: z.boolean().default(true),
  webhookRetries: z.number().default(3)
});

type PaymentGatewayConfig = z.infer<typeof PaymentGatewayConfigSchema>;

export class PaymentGatewayModule extends BaseDNAModule<PaymentGatewayConfig> {
  metadata: DNAModuleMetadata = {
    id: 'payments-gateway',
    name: 'Payment Gateway Abstraction',
    description: 'Unified payment interface supporting multiple providers with fallback and fraud detection',
    version: '1.0.0',
    category: 'payments',
    tags: ['payments', 'gateway', 'abstraction', 'fraud-detection'],
    author: 'DNA System',
    dependencies: ['payments-stripe', 'payments-paypal'],
    conflicts: [],
    frameworks: ['nextjs', 'flutter', 'react-native'],
    maturityLevel: 'stable'
  };

  configurationSchema: ConfigurationSchema<PaymentGatewayConfig> = {
    schema: PaymentGatewayConfigSchema,
    defaultConfig: {
      primaryProvider: 'stripe',
      fallbackProviders: ['paypal'],
      fraudDetection: true,
      analytics: true,
      webhookRetries: 3
    }
  };

  frameworkImplementations: Record<string, FrameworkImplementation> = {
    nextjs: {
      dependencies: {},
      devDependencies: {},
      files: [
        {
          path: 'lib/payment-gateway.ts',
          content: () => this.generatePaymentGateway()
        },
        {
          path: 'components/UnifiedPayment.tsx',
          content: () => this.generateUnifiedPayment()
        },
        {
          path: 'lib/fraud-detection.ts',
          content: () => this.generateFraudDetection()
        }
      ]
    }
  };

  private generatePaymentGateway(): string {
    return `
export interface PaymentProvider {
  id: string;
  name: string;
  createPayment(amount: number, currency: string, metadata?: any): Promise<PaymentResult>;
  confirmPayment(paymentId: string): Promise<PaymentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  status: 'pending' | 'succeeded' | 'failed';
  error?: string;
  metadata?: any;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  error?: string;
}

export class PaymentGateway {
  private providers: Map<string, PaymentProvider> = new Map();
  private primaryProvider: string = '${this.config.primaryProvider}';
  private fallbackProviders: string[] = ${JSON.stringify(this.config.fallbackProviders)};

  constructor() {
    // Register providers based on configuration
  }

  registerProvider(provider: PaymentProvider) {
    this.providers.set(provider.id, provider);
  }

  async processPayment(
    amount: number, 
    currency: string, 
    metadata?: any
  ): Promise<PaymentResult> {
    // Try primary provider first
    try {
      const provider = this.providers.get(this.primaryProvider);
      if (provider) {
        const result = await provider.createPayment(amount, currency, metadata);
        if (result.success) {
          this.logPaymentAttempt(this.primaryProvider, true, amount);
          return result;
        }
      }
    } catch (error) {
      console.error(\`Primary provider \${this.primaryProvider} failed:\`, error);
    }

    // Try fallback providers
    for (const providerId of this.fallbackProviders) {
      try {
        const provider = this.providers.get(providerId);
        if (provider) {
          const result = await provider.createPayment(amount, currency, metadata);
          if (result.success) {
            this.logPaymentAttempt(providerId, true, amount);
            return result;
          }
        }
      } catch (error) {
        console.error(\`Fallback provider \${providerId} failed:\`, error);
      }
    }

    throw new Error('All payment providers failed');
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    // Implementation would determine which provider processed the original payment
    // and use that provider for the refund
    throw new Error('Refund implementation pending');
  }

  private logPaymentAttempt(providerId: string, success: boolean, amount: number) {
    if (${this.config.analytics}) {
      console.log(\`Payment attempt: \${providerId}, success: \${success}, amount: \${amount}\`);
      // Send to analytics service
    }
  }
}

// Stripe Provider Implementation
export class StripeProvider implements PaymentProvider {
  id = 'stripe';
  name = 'Stripe';

  async createPayment(amount: number, currency: string, metadata?: any): Promise<PaymentResult> {
    // Stripe implementation
    return {
      success: true,
      paymentId: 'stripe_' + Date.now(),
      status: 'pending'
    };
  }

  async confirmPayment(paymentId: string): Promise<PaymentResult> {
    // Stripe confirmation logic
    return {
      success: true,
      paymentId,
      status: 'succeeded'
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    // Stripe refund logic
    return {
      success: true,
      refundId: 'stripe_refund_' + Date.now(),
      amount: amount || 0
    };
  }
}

// PayPal Provider Implementation
export class PayPalProvider implements PaymentProvider {
  id = 'paypal';
  name = 'PayPal';

  async createPayment(amount: number, currency: string, metadata?: any): Promise<PaymentResult> {
    // PayPal implementation
    return {
      success: true,
      paymentId: 'paypal_' + Date.now(),
      status: 'pending'
    };
  }

  async confirmPayment(paymentId: string): Promise<PaymentResult> {
    return {
      success: true,
      paymentId,
      status: 'succeeded'
    };
  }

  async refundPayment(paymentId: string, amount?: number): Promise<RefundResult> {
    return {
      success: true,
      refundId: 'paypal_refund_' + Date.now(),
      amount: amount || 0
    };
  }
}
`;
  }

  private generateUnifiedPayment(): string {
    return `
import { useState } from 'react';
import { PaymentGateway, StripeProvider, PayPalProvider } from '../lib/payment-gateway';

interface UnifiedPaymentProps {
  amount: number;
  currency?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export default function UnifiedPayment({ 
  amount, 
  currency = 'USD', 
  onSuccess, 
  onError 
}: UnifiedPaymentProps) {
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | 'crypto'>('stripe');

  const gateway = new PaymentGateway();
  gateway.registerProvider(new StripeProvider());
  gateway.registerProvider(new PayPalProvider());

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      const result = await gateway.processPayment(amount, currency);
      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || 'Payment failed');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="unified-payment">
      <h3>Payment Options</h3>
      
      <div className="payment-methods">
        <label>
          <input
            type="radio"
            value="stripe"
            checked={selectedMethod === 'stripe'}
            onChange={(e) => setSelectedMethod(e.target.value as any)}
          />
          Credit Card (Stripe)
        </label>
        
        <label>
          <input
            type="radio"
            value="paypal"
            checked={selectedMethod === 'paypal'}
            onChange={(e) => setSelectedMethod(e.target.value as any)}
          />
          PayPal
        </label>
        
        <label>
          <input
            type="radio"
            value="crypto"
            checked={selectedMethod === 'crypto'}
            onChange={(e) => setSelectedMethod(e.target.value as any)}
          />
          Cryptocurrency
        </label>
      </div>

      <div className="payment-summary">
        <p>Amount: {currency} {amount.toFixed(2)}</p>
        <p>Method: {selectedMethod}</p>
      </div>

      <button 
        onClick={handlePayment}
        disabled={processing}
        className="pay-button"
      >
        {processing ? 'Processing...' : \`Pay \${currency} \${amount.toFixed(2)}\`}
      </button>
    </div>
  );
}
`;
  }

  private generateFraudDetection(): string {
    return `
export interface FraudCheckResult {
  riskScore: number; // 0-100, higher is riskier
  blocked: boolean;
  reasons: string[];
  recommendedAction: 'approve' | 'review' | 'decline';
}

export class FraudDetection {
  private static readonly HIGH_RISK_THRESHOLD = 75;
  private static readonly MEDIUM_RISK_THRESHOLD = 50;

  static async checkPayment(
    amount: number,
    userAgent: string,
    ipAddress: string,
    userHistory?: any
  ): Promise<FraudCheckResult> {
    let riskScore = 0;
    const reasons: string[] = [];

    // Amount-based risk
    if (amount > 10000) {
      riskScore += 20;
      reasons.push('High transaction amount');
    }

    // IP-based risk (simplified)
    if (this.isHighRiskIP(ipAddress)) {
      riskScore += 30;
      reasons.push('High-risk IP address');
    }

    // User agent analysis
    if (this.isSuspiciousUserAgent(userAgent)) {
      riskScore += 15;
      reasons.push('Suspicious user agent');
    }

    // User history analysis
    if (userHistory?.failedPayments > 3) {
      riskScore += 25;
      reasons.push('Multiple recent failed payments');
    }

    const blocked = riskScore >= this.HIGH_RISK_THRESHOLD;
    const recommendedAction = this.getRecommendedAction(riskScore);

    return {
      riskScore,
      blocked,
      reasons,
      recommendedAction
    };
  }

  private static isHighRiskIP(ip: string): boolean {
    // Simplified IP risk check
    // In reality, would check against known bad IP databases
    const highRiskCountries = ['XX', 'YY']; // placeholder
    return false; // Simplified for demo
  }

  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = ['bot', 'crawler', 'automated'];
    return suspiciousPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern)
    );
  }

  private static getRecommendedAction(riskScore: number): 'approve' | 'review' | 'decline' {
    if (riskScore >= this.HIGH_RISK_THRESHOLD) return 'decline';
    if (riskScore >= this.MEDIUM_RISK_THRESHOLD) return 'review';
    return 'approve';
  }
}
`;
  }
}