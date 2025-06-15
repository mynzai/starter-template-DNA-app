import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

export const getStripeJs = async () => {
  const stripeJs = await import('@stripe/stripe-js')
  return stripeJs.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Subscription plans configuration
export const PLANS = {
  FREE: {
    name: 'Free Trial',
    price: 0,
    priceId: '',
    features: [
      '1,000 AI tokens per month',
      '5 chat conversations',
      'Basic AI models',
      'Email support',
    ],
    limits: {
      tokens: 1000,
      conversations: 5,
      ragQueries: 10,
      documentUploads: 5,
      maxContext: 3,
      models: ['gpt-3.5-turbo'],
    },
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: [
      '10,000 AI tokens per month',
      'Unlimited conversations',
      'All AI models',
      'Priority support',
      'Custom integrations',
    ],
    limits: {
      tokens: 10000,
      conversations: -1, // unlimited
      ragQueries: 100,
      documentUploads: 50,
      maxContext: 5,
      models: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-haiku'],
    },
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 99,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    features: [
      '50,000 AI tokens per month',
      'Unlimited conversations',
      'All AI models including GPT-4',
      'Priority support',
      'Custom integrations',
      'Team collaboration',
      'Advanced analytics',
    ],
    limits: {
      tokens: 50000,
      conversations: -1,
      ragQueries: 500,
      documentUploads: 200,
      maxContext: 8,
      models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-sonnet', 'claude-3-opus'],
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: [
      '200,000 AI tokens per month',
      'Unlimited conversations',
      'All AI models',
      '24/7 dedicated support',
      'Custom integrations',
      'Team collaboration',
      'Advanced analytics',
      'Custom AI training',
      'API access',
    ],
    limits: {
      tokens: 200000,
      conversations: -1,
      ragQueries: -1, // unlimited
      documentUploads: -1, // unlimited
      maxContext: 15,
      models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-sonnet', 'claude-3-opus'],
    },
  },
} as const

export type PlanType = keyof typeof PLANS

// Helper functions for subscription management
export const getUserPlan = (stripePriceId: string | null): PlanType => {
  if (!stripePriceId) return 'FREE'
  
  for (const [planKey, plan] of Object.entries(PLANS)) {
    if (plan.priceId === stripePriceId) {
      return planKey as PlanType
    }
  }
  
  return 'FREE'
}

export const canUseFeature = (
  userPlan: PlanType,
  usage: { tokens: number; conversations: number },
  feature: 'tokens' | 'conversations' | 'models'
): boolean => {
  const plan = PLANS[userPlan]
  const limits = plan.limits
  
  switch (feature) {
    case 'tokens':
      return limits.tokens === -1 || usage.tokens < limits.tokens
    case 'conversations':
      return limits.conversations === -1 || usage.conversations < limits.conversations
    default:
      return true
  }
}

export const getRemainingUsage = (
  userPlan: PlanType,
  usage: { tokens: number; conversations: number }
) => {
  const plan = PLANS[userPlan]
  const limits = plan.limits
  
  return {
    tokens: limits.tokens === -1 ? -1 : Math.max(0, limits.tokens - usage.tokens),
    conversations: limits.conversations === -1 ? -1 : Math.max(0, limits.conversations - usage.conversations),
  }
}

// Stripe webhook event types
export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_COMPLETED: 'checkout.session.completed',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
} as const