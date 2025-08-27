import { render, screen, fireEvent } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardPage from '@/app/dashboard/page'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it('shows loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('renders dashboard for authenticated user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    expect(screen.getByText('AI SaaS Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome back, John!')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays stats cards', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    expect(screen.getByText('Total Conversations')).toBeInTheDocument()
    expect(screen.getByText('Tokens Used')).toBeInTheDocument()
    expect(screen.getByText('Current Plan')).toBeInTheDocument()
    expect(screen.getByText('Trial Days Left')).toBeInTheDocument()
  })

  it('displays trial banner', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    expect(screen.getByText('🎉 You\'re on a free trial!')).toBeInTheDocument()
    expect(screen.getByText(/14 days remaining/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view plans/i })).toBeInTheDocument()
  })

  it('displays quick action cards', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    expect(screen.getByText('Start New Chat')).toBeInTheDocument()
    expect(screen.getByText('View Analytics')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('handles navigation to chat', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    const newChatButton = screen.getByRole('button', { name: /new conversation/i })
    fireEvent.click(newChatButton)
    
    expect(mockPush).toHaveBeenCalledWith('/chat')
  })

  it('handles navigation to pricing', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    const viewPlansButton = screen.getByRole('button', { name: /view plans/i })
    fireEvent.click(viewPlansButton)
    
    expect(mockPush).toHaveBeenCalledWith('/pricing')
  })

  it('handles sign out', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(signOutButton)
    
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('displays empty state for recent activity', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
    expect(screen.getByText('Start your first AI conversation to see activity here.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start first chat/i })).toBeInTheDocument()
  })

  it('redirects unauthenticated users', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<DashboardPage />)
    
    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })
})