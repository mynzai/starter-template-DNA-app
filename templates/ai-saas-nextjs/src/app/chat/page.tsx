'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getUserPlan, PLANS } from '@/lib/stripe'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number
}

interface Chat {
  id: string
  title: string
  model: string
  messages: Message[]
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatId = searchParams.get('id')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo')
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic'>('openai')
  const [userPlan, setUserPlan] = useState<string>('FREE')
  const [availableModels, setAvailableModels] = useState<string[]>(['gpt-3.5-turbo'])
  const [useRAG, setUseRAG] = useState(false)
  const [ragSources, setRagSources] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Load chat if chatId is provided
  useEffect(() => {
    if (chatId && session?.user?.id) {
      loadChat(chatId)
    }
  }, [chatId, session?.user?.id])

  // Set available models based on user plan
  useEffect(() => {
    if (session?.user) {
      // In a real app, you'd fetch this from the user's subscription data
      const plan = 'FREE' // This would come from user's subscription
      setUserPlan(plan)
      
      const planConfig = PLANS[plan as keyof typeof PLANS]
      if (planConfig) {
        setAvailableModels(planConfig.limits.models)
        if (!planConfig.limits.models.includes(selectedModel)) {
          setSelectedModel(planConfig.limits.models[0])
        }
      }
    }
  }, [session?.user, selectedModel])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChat = async (id: string) => {
    try {
      const response = await fetch(`/api/chat/${id}`)
      if (response.ok) {
        const chat = await response.json()
        setCurrentChat(chat)
        setMessages(chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.createdAt),
        })))
        setSelectedModel(chat.model)
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const endpoint = useRAG ? '/api/rag/query' : '/api/chat/stream'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(useRAG ? {
          query: userMessage.content,
          chatId: currentChat?.id,
          options: {
            model: selectedModel,
            provider: selectedProvider,
            maxContext: 5,
            minRelevanceScore: 0.7,
          },
        } : {
          message: userMessage.content,
          chatId: currentChat?.id,
          model: selectedModel,
          provider: selectedProvider,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      if (useRAG) {
        // Handle RAG response (non-streaming)
        const ragResponse = await response.json()
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: ragResponse.response }
              : msg
          )
        )
        
        setRagSources(ragResponse.sources || [])
        setIsStreaming(false)
      } else {
        // Handle streaming chat response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response stream')
        }

        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.error) {
                  throw new Error(data.error)
                }

                if (data.delta) {
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: msg.content + data.delta }
                        : msg
                    )
                  )
                }

                if (data.done) {
                  if (data.chatId && !currentChat) {
                    setCurrentChat({ 
                      id: data.chatId, 
                      title: userMessage.content.slice(0, 50), 
                      model: selectedModel,
                      messages: []
                    })
                    // Update URL with chat ID
                    router.replace(`/chat?id=${data.chatId}`)
                  }
                  setIsStreaming(false)
                  break
                }
              } catch (parseError) {
                console.error('Error parsing stream data:', parseError)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.slice(0, -1)) // Remove assistant placeholder
      alert(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const newChat = () => {
    setMessages([])
    setCurrentChat(null)
    router.replace('/chat')
  }

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ))
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={newChat} variant="outline" size="sm">
              New Chat
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              {currentChat?.title || 'AI Assistant'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Model Selector */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isStreaming}
            >
              {availableModels.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            {/* Provider Selector */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as 'openai' | 'anthropic')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isStreaming}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>

            {/* RAG Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rag-toggle"
                checked={useRAG}
                onChange={(e) => setUseRAG(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isStreaming}
              />
              <label
                htmlFor="rag-toggle"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Use Knowledge Base
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/knowledge')}
            >
              Knowledge Base
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-semibold mb-2">Start a conversation</h2>
              <p className="text-gray-600 mb-6">
                Ask me anything! I'm here to help with your questions and tasks.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => setInput('Explain quantum computing in simple terms')}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">🔬 Explain a concept</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Help me understand quantum computing
                  </div>
                </button>
                <button
                  onClick={() => setInput('Write a professional email template')}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">✉️ Write content</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Create a professional email template
                  </div>
                </button>
                <button
                  onClick={() => setInput('Help me debug this JavaScript code')}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">🐛 Debug code</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Help me fix programming issues
                  </div>
                </button>
                <button
                  onClick={() => setInput('Plan a weekend trip to San Francisco')}
                  className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">🗺️ Plan & organize</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Help me plan activities and trips
                  </div>
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {formatMessage(message.content)}
                    {message.role === 'assistant' && isStreaming && message.content === '' && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    )}
                  </div>
                  
                  {/* RAG Sources */}
                  {message.role === 'assistant' && ragSources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-600 mb-2">Sources:</div>
                      <div className="space-y-2">
                        {ragSources.slice(0, 3).map((source, index) => (
                          <div key={index} className="text-xs bg-gray-50 rounded p-2">
                            <div className="font-medium text-gray-800">{source.title}</div>
                            <div className="text-gray-600 mt-1">{source.excerpt}</div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-gray-500">
                                Relevance: {Math.round(source.relevanceScore * 100)}%
                              </span>
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  View
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {ragSources.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{ragSources.length - 3} more sources
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={1}
                disabled={isStreaming}
                style={{
                  minHeight: '44px',
                  maxHeight: '120px',
                  height: 'auto',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="px-6"
            >
              {isStreaming ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Send'
              )}
            </Button>
          </div>
          
          {userPlan === 'FREE' && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              Free plan: Limited to {PLANS.FREE.limits.tokens} tokens per month. 
              <a href="/pricing" className="text-blue-600 hover:underline ml-1">
                Upgrade for unlimited usage
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}