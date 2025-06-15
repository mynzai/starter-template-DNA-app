'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PLANS, type PlanType } from '@/lib/stripe'
import { getStripeJs } from '@/lib/stripe'

export default function PricingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    setIsLoading(priceId)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?success=true&plan=${planName}`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      const { checkoutUrl } = await response.json()

      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    return billingPeriod === 'yearly' 
      ? `$${Math.round(price * 12 * 0.8)}/year` 
      : `$${price}/month`
  }

  const getYearlyDiscount = (price: number) => {
    if (price === 0) return null
    const yearlyPrice = price * 12 * 0.8
    const monthlyTotal = price * 12
    const savings = monthlyTotal - yearlyPrice
    return Math.round(savings)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the perfect plan for your AI-powered workflow
          </p>

          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center mb-8">
            <span className={`mr-3 ${billingPeriod === 'monthly' ? 'font-semibold' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className={`ml-3 ${billingPeriod === 'yearly' ? 'font-semibold' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingPeriod === 'yearly' && (
              <span className="ml-2 text-sm text-green-600 font-medium">Save 20%</span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(PLANS).map(([planKey, plan]) => {
            const isPopular = planKey === 'PROFESSIONAL'
            const yearlyDiscount = getYearlyDiscount(plan.price)
            
            return (
              <div
                key={planKey}
                className={`relative bg-white rounded-2xl shadow-sm border-2 ${
                  isPopular ? 'border-blue-500' : 'border-gray-200'
                } p-8`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-500 ml-2">
                        {billingPeriod === 'monthly' ? '/month' : '/year'}
                      </span>
                    )}
                    {billingPeriod === 'yearly' && yearlyDiscount && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${yearlyDiscount}/year
                      </div>
                    )}
                  </div>

                  {planKey === 'FREE' ? (
                    <Button
                      onClick={() => router.push('/auth/signup')}
                      variant={isPopular ? 'default' : 'outline'}
                      className="w-full mb-6"
                      disabled={status === 'loading'}
                    >
                      Start Free Trial
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan.priceId, plan.name)}
                      variant={isPopular ? 'default' : 'outline'}
                      className="w-full mb-6"
                      disabled={isLoading === plan.priceId || status === 'loading'}
                    >
                      {isLoading === plan.priceId ? 'Loading...' : `Choose ${plan.name}`}
                    </Button>
                  )}

                  <ul className="text-left space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg
                          className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed my token limit?
              </h3>
              <p className="text-gray-600">
                Your account will be temporarily limited until the next billing cycle. You can upgrade your plan to get more tokens immediately.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! All new users get a 14-day free trial with full access to professional features. No credit card required.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Absolutely. You can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users already using our AI-powered platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/signup">Start Free Trial</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/demo">Watch Demo</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}