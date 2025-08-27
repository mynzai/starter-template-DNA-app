import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatPage from '@/app/chat/page'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock ReadableStream for streaming responses
global.ReadableStream = class MockReadableStream {
  constructor(public callbacks: any) {}
  
  getReader() {
    return {
      read: async () => {
        return { done: true, value: undefined }
      }
    }
  }
} as any

describe('ChatPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    })
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    })
  })

  it('redirects unauthenticated users to signin', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('shows loading state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('renders chat interface for authenticated users', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText('Start a conversation')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Type your message/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('displays starter prompts', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    expect(screen.getByText('🔬 Explain a concept')).toBeInTheDocument()
    expect(screen.getByText('✉️ Write content')).toBeInTheDocument()
    expect(screen.getByText('🐛 Debug code')).toBeInTheDocument()
    expect(screen.getByText('🗺️ Plan & organize')).toBeInTheDocument()
  })

  it('handles starter prompt clicks', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    const conceptPrompt = screen.getByText('🔬 Explain a concept').closest('button')
    fireEvent.click(conceptPrompt!)
    
    const textarea = screen.getByPlaceholderText(/Type your message/) as HTMLTextAreaElement
    expect(textarea.value).toBe('Explain quantum computing in simple terms')
  })

  it('enables send button when input has content', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    const input = screen.getByPlaceholderText(/Type your message/)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    expect(sendButton).toBeDisabled()
    
    fireEvent.change(input, { target: { value: 'Hello AI' } })
    expect(sendButton).not.toBeDisabled()
  })

  it('handles message sending', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    // Mock successful streaming response
    const mockResponse = {
      ok: true,
      body: new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode('data: {"delta": "Hello", "done": false}\n\n'))
          controller.enqueue(encoder.encode('data: {"delta": " there!", "done": false}\n\n'))
          controller.enqueue(encoder.encode('data: {"done": true, "chatId": "chat-123"}\n\n'))
          controller.close()
        }
      })
    }
    
    mockFetch.mockResolvedValue(mockResponse as any)

    render(<ChatPage />)
    
    const input = screen.getByPlaceholderText(/Type your message/)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    fireEvent.change(input, { target: { value: 'Hello AI' } })
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello AI',
          chatId: null,
          model: 'gpt-3.5-turbo',
          provider: 'openai',
        }),
      })
    })
  })

  it('handles Enter key to send message', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    mockFetch.mockResolvedValue({
      ok: true,
      body: new ReadableStream(),
    } as any)

    render(<ChatPage />)
    
    const input = screen.getByPlaceholderText(/Type your message/)
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.keyPress(input, { key: 'Enter', shiftKey: false })
    
    expect(mockFetch).toHaveBeenCalled()
  })

  it('handles Shift+Enter for new line', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    const input = screen.getByPlaceholderText(/Type your message/)
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.keyPress(input, { key: 'Enter', shiftKey: true })
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows model and provider selectors', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    const modelSelect = screen.getByDisplayValue('gpt-3.5-turbo')
    const providerSelect = screen.getByDisplayValue('OpenAI')
    
    expect(modelSelect).toBeInTheDocument()
    expect(providerSelect).toBeInTheDocument()
  })

  it('handles new chat button', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    fireEvent.click(newChatButton)
    
    expect(mockReplace).toHaveBeenCalledWith('/chat')
  })

  it('shows free plan upgrade notice', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<ChatPage />)
    
    expect(screen.getByText(/Free plan: Limited to/)).toBeInTheDocument()
    expect(screen.getByText(/Upgrade for unlimited usage/)).toBeInTheDocument()
  })

  it('handles error responses', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '1', email: 'test@example.com' },
        expires: '2024-01-01',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Token limit exceeded' }),
    } as any)

    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    render(<ChatPage />)
    
    const input = screen.getByPlaceholderText(/Type your message/)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Token limit exceeded')
    })

    alertSpy.mockRestore()
  })
})