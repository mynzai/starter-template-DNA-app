import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import SignUpPage from '@/app/auth/signup/page'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

const mockPush = jest.fn()
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>

describe('SignUpPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it('renders sign up form', () => {
    render(<SignUpPage />)
    
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument()
  })

  it('shows free trial benefits', () => {
    render(<SignUpPage />)
    
    expect(screen.getByText('🎉 Free Trial:')).toBeInTheDocument()
    expect(screen.getByText('14-day free trial')).toBeInTheDocument()
    expect(screen.getByText('No credit card required')).toBeInTheDocument()
    expect(screen.getByText('Full access to AI features')).toBeInTheDocument()
    expect(screen.getByText('Cancel anytime')).toBeInTheDocument()
  })

  it('shows loading state during sign up', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/onboarding' })
    
    render(<SignUpPage />)
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    fireEvent.click(googleButton)
    
    expect(screen.getByText('Creating account...')).toBeInTheDocument()
  })

  it('handles successful Google sign up', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/onboarding' })
    
    render(<SignUpPage />)
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    fireEvent.click(googleButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('google', {
        redirect: false,
        callbackUrl: '/onboarding'
      })
    })
  })

  it('handles successful GitHub sign up', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/onboarding' })
    
    render(<SignUpPage />)
    
    const githubButton = screen.getByRole('button', { name: /continue with github/i })
    fireEvent.click(githubButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('github', {
        redirect: false,
        callbackUrl: '/onboarding'
      })
    })
  })

  it('displays error message on sign up failure', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'OAuthCallback', status: 400, url: null })
    
    render(<SignUpPage />)
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    fireEvent.click(googleButton)
    
    await waitFor(() => {
      expect(screen.getByText('Sign up failed. Please try again.')).toBeInTheDocument()
    })
  })

  it('has correct navigation links', () => {
    render(<SignUpPage />)
    
    const signInLink = screen.getByRole('link', { name: /sign in to your existing account/i })
    expect(signInLink).toHaveAttribute('href', '/auth/signin')
    
    const termsLink = screen.getByRole('link', { name: /terms of service/i })
    expect(termsLink).toHaveAttribute('href', '/terms')
    
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i })
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  it('displays trial highlights', () => {
    render(<SignUpPage />)
    
    // Check for benefits section
    expect(screen.getByText('What you get')).toBeInTheDocument()
    
    // Check for checkmark icons and benefits
    const benefits = [
      '14-day free trial',
      'No credit card required',
      'Full access to AI features',
      'Cancel anytime'
    ]
    
    benefits.forEach(benefit => {
      expect(screen.getByText(benefit)).toBeInTheDocument()
    })
  })

  it('is accessible', () => {
    render(<SignUpPage />)
    
    // Check for proper heading hierarchy
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2).toBeInTheDocument()
    
    // Check that buttons have accessible names
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName()
    })
    
    // Check for agreement text
    expect(screen.getByText('By creating an account, you agree to our')).toBeInTheDocument()
  })

  it('redirects to onboarding after successful signup', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/onboarding' })
    
    render(<SignUpPage />)
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    fireEvent.click(googleButton)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding')
    })
  })
})