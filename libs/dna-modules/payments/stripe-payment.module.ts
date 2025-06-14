import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

// Stripe Payment Module Configuration Schema
const StripeConfigSchema = z.object({
  publishableKey: z.string().min(1, 'Publishable key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
  webhookSecret: z.string().optional(),
  currency: z.string().default('usd'),
  subscriptions: z.boolean().default(false),
  marketplace: z.boolean().default(false),
  taxCalculation: z.boolean().default(false),
  scaCompliance: z.boolean().default(true)
});

type StripeConfig = z.infer<typeof StripeConfigSchema>;

export class StripePaymentModule extends BaseDNAModule<StripeConfig> {
  metadata: DNAModuleMetadata = {
    id: 'payments-stripe',
    name: 'Stripe Payments',
    description: 'Complete Stripe payment integration with subscriptions and SCA compliance',
    version: '1.0.0',
    category: 'payments',
    tags: ['stripe', 'payments', 'subscriptions', 'sca'],
    author: 'DNA System',
    dependencies: [],
    conflicts: [],
    frameworks: ['nextjs', 'flutter', 'react-native', 'tauri', 'sveltekit'],
    maturityLevel: 'stable'
  };

  configurationSchema: ConfigurationSchema<StripeConfig> = {
    schema: StripeConfigSchema,
    defaultConfig: {
      publishableKey: '',
      secretKey: '',
      currency: 'usd',
      subscriptions: false,
      marketplace: false,
      taxCalculation: false,
      scaCompliance: true
    }
  };

  frameworkImplementations: Record<string, FrameworkImplementation> = {
    nextjs: {
      dependencies: {
        '@stripe/stripe-js': '^2.0.0',
        'stripe': '^13.0.0',
        '@stripe/react-stripe-js': '^2.0.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/stripe.ts',
          content: () => this.generateNextJSStripeConfig()
        },
        {
          path: 'components/PaymentForm.tsx',
          content: () => this.generatePaymentForm()
        },
        {
          path: 'api/webhooks/stripe.ts',
          content: () => this.generateWebhookHandler()
        }
      ]
    },
    flutter: {
      dependencies: {
        'flutter_stripe': '^9.0.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/services/stripe_service.dart',
          content: () => this.generateFlutterStripeService()
        }
      ]
    }
  };

  private generateNextJSStripeConfig(): string {
    return `
import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export const createPaymentIntent = async (amount: number, currency = '${this.config.currency}') => {
  return await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true }
  });
};
${this.config.subscriptions ? `
export const createSubscription = async (customerId: string, priceId: string) => {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent']
  });
};` : ''}
`;
  }

  private generatePaymentForm(): string {
    return `
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../lib/stripe';
import { useState } from 'react';

interface PaymentFormProps {
  amount: number;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
}

function PaymentForm({ amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const cardElement = elements.getElement(CardElement);
    
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        'pi_client_secret', // Would come from your API
        {
          payment_method: {
            card: cardElement!,
            billing_details: {
              name: 'Customer name'
            }
          }
        }
      );

      if (error) {
        onError?.(error.message || 'Payment failed');
      } else {
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || processing}>
        {processing ? 'Processing...' : \`Pay $\${amount / 100}\`}
      </button>
    </form>
  );
}

export default function StripePayment(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
}
`;
  }

  private generateWebhookHandler(): string {
    return `
import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../lib/stripe';
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.log('Webhook signature verification failed.');
    return res.status(400).send('Webhook signature verification failed');
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      break;
    case 'customer.subscription.created':
      const subscription = event.data.object;
      console.log('Subscription created:', subscription.id);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.json({ received: true });
}
`;
  }

  private generateFlutterStripeService(): string {
    return `
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class StripeService {
  static const String _baseUrl = 'YOUR_API_BASE_URL';
  
  static Future<void> init() async {
    Stripe.publishableKey = '${this.config.publishableKey}';
    await Stripe.instance.applySettings();
  }

  static Future<void> makePayment(int amount, String currency) async {
    try {
      final paymentIntent = await _createPaymentIntent(amount, currency);
      
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: paymentIntent['client_secret'],
          merchantDisplayName: 'Your App'
        )
      );
      
      await Stripe.instance.presentPaymentSheet();
    } catch (e) {
      throw Exception('Payment failed: $e');
    }
  }

  static Future<Map<String, dynamic>> _createPaymentIntent(int amount, String currency) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/create-payment-intent'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'amount': amount,
        'currency': currency
      })
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to create payment intent');
    }
  }
}
`;
  }
}