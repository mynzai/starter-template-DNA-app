import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { SubscriptionStatus } from '@/components/subscription-status'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const mockUser = {
  id: 'user-1',
  stripePriceId: null,
  stripeCurrentPeriodEnd: null,
  totalTokensUsed: 500,
  totalChats: 3,
}

describe('SubscriptionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ url: 'https://billing.stripe.com/session' }),
    } as Response)
  })

  it('renders subscription status for free plan', () => {
    render(<SubscriptionStatus user={mockUser} />)
    
    expect(screen.getByText('Subscription Status')).toBeInTheDocument()
    expect(screen.getByText('Free Trial')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Usage This Month')).toBeInTheDocument()
  })

  it('displays usage statistics', () => {
    render(<SubscriptionStatus user={mockUser} />)
    
    expect(screen.getByText('AI Tokens')).toBeInTheDocument()
    expect(screen.getByText('500 / 1,000')).toBeInTheDocument()
    expect(screen.getByText('Conversations')).toBeInTheDocument()
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
  })

  it('shows usage progress bars', () => {
    const { container } = render(<SubscriptionStatus user={mockUser} />)
    
    const progressBars = container.querySelectorAll('.h-2.rounded-full')
    expect(progressBars).toHaveLength(2) // One for tokens, one for conversations
  })

  it('renders paid plan with billing info', () => {
    const paidUser = {
      ...mockUser,
      stripePriceId: 'price_starter',
      stripeCurrentPeriodEnd: new Date('2024-02-01'),
    }

    render(<SubscriptionStatus user={paidUser} />)
    
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('$29')).toBeInTheDocument()
    expect(screen.getByText('February 1, 2024')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeInTheDocument()
  })

  it('handles manage billing button click', async () => {
    const paidUser = {
      ...mockUser,
      stripePriceId: 'price_starter',
      stripeCurrentPeriodEnd: new Date('2024-02-01'),
    }

    // Mock window.location.href
    delete (window as any).location
    window.location = { href: '' } as any

    render(<SubscriptionStatus user={paidUser} />)
    
    const manageBillingButton = screen.getByRole('button', { name: /manage billing/i })
    fireEvent.click(manageBillingButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })
    })
  })

  it('shows upgrade notice for free plan', () => {
    render(<SubscriptionStatus user={mockUser} />)
    
    expect(screen.getByText('Upgrade for more features')).toBeInTheDocument()
    expect(screen.getByText('Get unlimited conversations, access to all AI models, and priority support.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view plans/i })).toBeInTheDocument()
  })

  it('shows usage warning at 80%+ usage', () => {
    const highUsageUser = {
      ...mockUser,
      totalTokensUsed: 850, // 85% of 1000
    }

    render(<SubscriptionStatus user={highUsageUser} />)
    
    expect(screen.getByText('Usage limit approaching')).toBeInTheDocument()
    expect(screen.getByText("You've used 85% of your monthly token allowance.")).toBeInTheDocument()
  })

  it('displays unlimited usage correctly', () => {
    const proUser = {
      ...mockUser,
      stripePriceId: 'price_professional',
      totalTokensUsed: 10000,
      totalChats: 50,
    }

    render(<SubscriptionStatus user={proUser} />)
    
    expect(screen.getByText('10,000 / 50,000')).toBeInTheDocument() // Professional has 50k limit
    expect(screen.getByText('50 / ∞')).toBeInTheDocument() // Unlimited conversations
  })

  it('handles billing portal error gracefully', async () => {
    const paidUser = {
      ...mockUser,
      stripePriceId: 'price_starter',
      stripeCurrentPeriodEnd: new Date('2024-02-01'),
    }

    mockFetch.mockRejectedValue(new Error('Network error'))
    
    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<SubscriptionStatus user={paidUser} />)
    
    const manageBillingButton = screen.getByRole('button', { name: /manage billing/i })
    fireEvent.click(manageBillingButton)
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Unable to open billing portal. Please try again.')
    })

    alertSpy.mockRestore()
  })

  it('shows loading state for manage billing button', async () => {
    const paidUser = {
      ...mockUser,
      stripePriceId: 'price_starter',
      stripeCurrentPeriodEnd: new Date('2024-02-01'),
    }

    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<SubscriptionStatus user={paidUser} />)
    
    const manageBillingButton = screen.getByRole('button', { name: /manage billing/i })
    fireEvent.click(manageBillingButton)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('correctly calculates usage colors', () => {
    const { container, rerender } = render(<SubscriptionStatus user={mockUser} />)
    
    // 50% usage should be blue
    let progressBar = container.querySelector('.bg-blue-500')
    expect(progressBar).toBeInTheDocument()

    // 80% usage should be yellow  
    const yellowUser = { ...mockUser, totalTokensUsed: 800 }
    rerender(<SubscriptionStatus user={yellowUser} />)
    
    const yellowBar = container.querySelector('.bg-yellow-500')
    expect(yellowBar).toBeInTheDocument()

    // 95% usage should be red
    const redUser = { ...mockUser, totalTokensUsed: 950 }
    rerender(<SubscriptionStatus user={redUser} />)
    
    const redBar = container.querySelector('.bg-red-500')
    expect(redBar).toBeInTheDocument()
  })
})