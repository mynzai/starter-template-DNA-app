'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { PLANS, getUserPlan, getRemainingUsage, type PlanType } from '@/lib/stripe'

interface SubscriptionStatusProps {
  user: {
    id: string
    stripePriceId: string | null
    stripeCurrentPeriodEnd: Date | null
    totalTokensUsed: number
    totalChats: number
  }
}

export function SubscriptionStatus({ user }: SubscriptionStatusProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  
  const currentPlan: PlanType = getUserPlan(user.stripePriceId)
  const plan = PLANS[currentPlan]
  const usage = { tokens: user.totalTokensUsed, conversations: user.totalChats }
  const remaining = getRemainingUsage(currentPlan, usage)

  const handleManageSubscription = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating portal session:', error)
      alert('Unable to open billing portal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
        {currentPlan !== 'FREE' && (
          <Button
            onClick={handleManageSubscription}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Manage Billing'}
          </Button>
        )}
      </div>

      {/* Current Plan */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Current Plan</span>
          <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
        </div>
        {user.stripeCurrentPeriodEnd && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Next Billing Date</span>
            <span className="text-sm text-gray-700">
              {formatDate(user.stripeCurrentPeriodEnd)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">Monthly Cost</span>
          <span className="text-sm font-semibold text-gray-900">
            {plan.price === 0 ? 'Free' : `$${plan.price}`}
          </span>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Usage This Month</h4>
        
        {/* Token Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">AI Tokens</span>
            <span className="text-sm text-gray-900">
              {usage.tokens.toLocaleString()} / {
                plan.limits.tokens === -1 ? '∞' : plan.limits.tokens.toLocaleString()
              }
            </span>
          </div>
          {plan.limits.tokens !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  getUsageColor(getUsagePercentage(usage.tokens, plan.limits.tokens))
                }`}
                style={{
                  width: `${getUsagePercentage(usage.tokens, plan.limits.tokens)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Conversation Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Conversations</span>
            <span className="text-sm text-gray-900">
              {usage.conversations} / {
                plan.limits.conversations === -1 ? '∞' : plan.limits.conversations
              }
            </span>
          </div>
          {plan.limits.conversations !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  getUsageColor(getUsagePercentage(usage.conversations, plan.limits.conversations))
                }`}
                style={{
                  width: `${getUsagePercentage(usage.conversations, plan.limits.conversations)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Notice */}
      {currentPlan === 'FREE' && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Upgrade for more features
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Get unlimited conversations, access to all AI models, and priority support.
              </p>
              <div className="mt-3">
                <Button size="sm" asChild>
                  <a href="/pricing">View Plans</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Warning */}
      {plan.limits.tokens !== -1 && getUsagePercentage(usage.tokens, plan.limits.tokens) >= 80 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Usage limit approaching
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                You've used {Math.round(getUsagePercentage(usage.tokens, plan.limits.tokens))}% of your monthly token allowance.
              </p>
              {currentPlan !== 'ENTERPRISE' && (
                <div className="mt-3">
                  <Button size="sm" asChild>
                    <a href="/pricing">Upgrade Plan</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}