import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import SignInPage from '@/app/auth/signin/page'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  getSession: jest.fn(),
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

describe('SignInPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it('renders sign in form', () => {
    render(<SignInPage />)
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument()
  })

  it('shows loading state during sign in', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/dashboard' })
    
    render(<SignInPage />)
    
    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(googleButton)
    
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('handles successful Google sign in', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/dashboard' })
    
    render(<SignInPage />)
    
    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(googleButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('google', {
        redirect: false,
        callbackUrl: '/dashboard'
      })
    })
  })

  it('handles successful GitHub sign in', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: '/dashboard' })
    
    render(<SignInPage />)
    
    const githubButton = screen.getByRole('button', { name: /sign in with github/i })
    fireEvent.click(githubButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('github', {
        redirect: false,
        callbackUrl: '/dashboard'
      })
    })
  })

  it('displays error message on sign in failure', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'OAuthCallback', status: 400, url: null })
    
    render(<SignInPage />)
    
    const googleButton = screen.getByRole('button', { name: /sign in with google/i })
    fireEvent.click(googleButton)
    
    await waitFor(() => {
      expect(screen.getByText('Sign in failed. Please try again.')).toBeInTheDocument()
    })
  })

  it('has correct navigation links', () => {
    render(<SignInPage />)
    
    const signUpLink = screen.getByRole('link', { name: /create a new account/i })
    expect(signUpLink).toHaveAttribute('href', '/auth/signup')
    
    const termsLink = screen.getByRole('link', { name: /terms of service/i })
    expect(termsLink).toHaveAttribute('href', '/terms')
    
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i })
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  it('is accessible', () => {
    render(<SignInPage />)
    
    // Check for proper heading hierarchy
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2).toBeInTheDocument()
    
    // Check that buttons have accessible names
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName()
    })
    
    // Check for form structure
    expect(screen.getByText('By signing in, you agree to our')).toBeInTheDocument()
  })
})