import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

const PayPalConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  currency: z.string().default('USD'),
  subscriptions: z.boolean().default(false),
  expressCheckout: z.boolean().default(true)
});

type PayPalConfig = z.infer<typeof PayPalConfigSchema>;

export class PayPalPaymentModule extends BaseDNAModule<PayPalConfig> {
  metadata: DNAModuleMetadata = {
    id: 'payments-paypal',
    name: 'PayPal Payments',
    description: 'PayPal payment integration with express checkout and subscriptions',
    version: '1.0.0',
    category: 'payments',
    tags: ['paypal', 'payments', 'express-checkout'],
    author: 'DNA System',
    dependencies: [],
    conflicts: [],
    frameworks: ['nextjs', 'flutter', 'react-native'],
    maturityLevel: 'stable'
  };

  configurationSchema: ConfigurationSchema<PayPalConfig> = {
    schema: PayPalConfigSchema,
    defaultConfig: {
      clientId: '',
      clientSecret: '',
      environment: 'sandbox',
      currency: 'USD',
      subscriptions: false,
      expressCheckout: true
    }
  };

  frameworkImplementations: Record<string, FrameworkImplementation> = {
    nextjs: {
      dependencies: {
        '@paypal/react-paypal-js': '^8.0.0',
        '@paypal/checkout-server-sdk': '^1.0.3'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/paypal.ts',
          content: () => this.generateNextJSPayPalConfig()
        },
        {
          path: 'components/PayPalButton.tsx',
          content: () => this.generatePayPalButton()
        }
      ]
    }
  };

  private generateNextJSPayPalConfig(): string {
    return `
import paypal from '@paypal/checkout-server-sdk';

const environment = process.env.NODE_ENV === 'production' 
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_CLIENT_SECRET!)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID!, process.env.PAYPAL_CLIENT_SECRET!);

export const paypalClient = new paypal.core.PayPalHttpClient(environment);

export const createOrder = async (amount: number, currency = '${this.config.currency}') => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: currency,
        value: amount.toFixed(2)
      }
    }]
  });

  const response = await paypalClient.execute(request);
  return response.result;
};

export const captureOrder = async (orderId: string) => {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  
  const response = await paypalClient.execute(request);
  return response.result;
};
`;
  }

  private generatePayPalButton(): string {
    return `
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface PayPalPaymentProps {
  amount: number;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
}

export default function PayPalPayment({ amount, onSuccess, onError }: PayPalPaymentProps) {
  const initialOptions = {
    'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
    currency: '${this.config.currency}',
    intent: 'capture'
  };

  return (
    <PayPalScriptProvider options={initialOptions}>
      <PayPalButtons
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toFixed(2)
              }
            }]
          });
        }}
        onApprove={(data, actions) => {
          return actions.order!.capture().then((details) => {
            onSuccess?.(details);
          });
        }}
        onError={(err) => {
          onError?.(err);
        }}
      />
    </PayPalScriptProvider>
  );
}
`;
  }
}