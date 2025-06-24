import { Button } from '@/components/ui/button'
import { CheckIcon } from 'lucide-react'

export function Pricing() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Choose the plan that's right for your business
          </p>
        </div>
        
        <div className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-lg p-8 ${
                plan.featured
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600'
                  : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-1 text-sm font-medium text-white rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-lg">/month</span>
                </div>
                <p className="mt-2 text-sm opacity-80">{plan.description}</p>
              </div>
              
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <CheckIcon className="h-5 w-5 mr-3 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                className={`mt-8 w-full ${
                  plan.featured
                    ? 'bg-white text-blue-600 hover:bg-gray-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for individuals and small teams',
    features: [
      '10,000 AI requests/month',
      'Basic chat interface',
      'Email support',
      'Usage analytics',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Professional',
    price: 99,
    description: 'Ideal for growing businesses',
    features: [
      '100,000 AI requests/month',
      'Advanced chat interface',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 299,
    description: 'For large organizations',
    features: [
      'Unlimited AI requests',
      'White-label solution',
      '24/7 dedicated support',
      'Advanced security',
      'Custom AI models',
      'On-premise deployment',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
]