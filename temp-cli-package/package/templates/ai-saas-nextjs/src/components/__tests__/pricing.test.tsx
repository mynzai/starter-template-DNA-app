import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PricingPage from '@/app/pricing/page'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockPush = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('PricingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ checkoutUrl: 'https://checkout.stripe.com/test' }),
    } as Response)
  })

  it('renders pricing plans', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument()
    expect(screen.getByText('Free Trial')).toBeInTheDocument()
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })

  it('shows monthly pricing by default', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    expect(screen.getByText('$29/month')).toBeInTheDocument()
    expect(screen.getByText('$99/month')).toBeInTheDocument()
    expect(screen.getByText('$299/month')).toBeInTheDocument()
  })

  it('switches to yearly pricing', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    // Click yearly toggle
    const yearlyToggle = screen.getByRole('button')
    fireEvent.click(yearlyToggle)
    
    expect(screen.getByText('Save 20%')).toBeInTheDocument()
    // Yearly prices should show (20% discount)
    expect(screen.getByText('$278/year')).toBeInTheDocument() // 29 * 12 * 0.8 = 278.4
    expect(screen.getByText('$950/year')).toBeInTheDocument() // 99 * 12 * 0.8 = 950.4
  })

  it('redirects to signin for unauthenticated users', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    const subscribeButton = screen.getByRole('button', { name: /choose starter/i })
    fireEvent.click(subscribeButton)
    
    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('creates checkout session for authenticated users', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    // Mock window.location.href
    delete (window as any).location
    window.location = { href: '' } as any

    render(<PricingPage />)
    
    const subscribeButton = screen.getByRole('button', { name: /choose starter/i })
    fireEvent.click(subscribeButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: expect.any(String),
          successUrl: expect.stringContaining('/dashboard?success=true'),
          cancelUrl: expect.stringContaining('/pricing?canceled=true'),
        }),
      })
    })
  })

  it('shows loading state during subscription', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<PricingPage />)
    
    const subscribeButton = screen.getByRole('button', { name: /choose starter/i })
    fireEvent.click(subscribeButton)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays features for each plan', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    // Check for some key features
    expect(screen.getByText('1,000 AI tokens per month')).toBeInTheDocument()
    expect(screen.getByText('10,000 AI tokens per month')).toBeInTheDocument()
    expect(screen.getByText('50,000 AI tokens per month')).toBeInTheDocument()
    expect(screen.getByText('200,000 AI tokens per month')).toBeInTheDocument()
    
    expect(screen.getByText('5 chat conversations')).toBeInTheDocument()
    expect(screen.getAllByText('Unlimited conversations')).toHaveLength(3)
  })

  it('shows popular badge for professional plan', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('displays FAQ section', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    expect(screen.getByText('Can I change my plan anytime?')).toBeInTheDocument()
    expect(screen.getByText('What happens if I exceed my token limit?')).toBeInTheDocument()
    expect(screen.getByText('Is there a free trial?')).toBeInTheDocument()
    expect(screen.getByText('Can I cancel anytime?')).toBeInTheDocument()
  })

  it('shows free trial button for free plan', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<PricingPage />)
    
    const freeTrialButton = screen.getByRole('button', { name: /start free trial/i })
    expect(freeTrialButton).toBeInTheDocument()
    
    fireEvent.click(freeTrialButton)
    expect(mockPush).toHaveBeenCalledWith('/auth/signup')
  })
})