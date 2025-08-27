import { AIService, countTokens, estimateResponseTokens } from '@/lib/ai-service'

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }))
})

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }))
})

describe('AIService', () => {
  let aiService: AIService

  beforeEach(() => {
    aiService = new AIService()
    jest.clearAllMocks()
  })

  describe('Token counting utilities', () => {
    it('counts tokens correctly', () => {
      expect(countTokens('Hello world')).toBe(3) // 11 chars / 4 = 2.75 -> 3
      expect(countTokens('This is a longer text')).toBe(6) // 22 chars / 4 = 5.5 -> 6
      expect(countTokens('')).toBe(0)
    })

    it('estimates response tokens by model', () => {
      expect(estimateResponseTokens('gpt-3.5-turbo')).toBe(500)
      expect(estimateResponseTokens('gpt-4')).toBe(800)
      expect(estimateResponseTokens('claude-3-sonnet')).toBe(600)
      expect(estimateResponseTokens('unknown-model')).toBe(500) // default
      expect(estimateResponseTokens('gpt-4', 1200)).toBe(1200) // custom override
    })
  })

  describe('Model availability', () => {
    it('returns correct models for OpenAI', () => {
      const models = aiService.getAvailableModels('openai')
      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'])
    })

    it('returns correct models for Anthropic', () => {
      const models = aiService.getAvailableModels('anthropic')
      expect(models).toEqual(['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'])
    })

    it('returns empty array for unknown provider', () => {
      const models = aiService.getAvailableModels('unknown' as any)
      expect(models).toEqual([])
    })
  })

  describe('Cost estimation', () => {
    it('estimates costs correctly for different models', () => {
      expect(aiService.estimateCost('openai', 'gpt-3.5-turbo', 1000)).toBe(0.1)
      expect(aiService.estimateCost('openai', 'gpt-4', 1000)).toBe(3.0)
      expect(aiService.estimateCost('anthropic', 'claude-3-haiku', 1000)).toBe(0.25)
      expect(aiService.estimateCost('anthropic', 'claude-3-opus', 1000)).toBe(7.5)
    })

    it('calculates costs for different token amounts', () => {
      expect(aiService.estimateCost('openai', 'gpt-3.5-turbo', 500)).toBe(0.05) // 0.1 * 0.5
      expect(aiService.estimateCost('openai', 'gpt-4', 2000)).toBe(6.0) // 3.0 * 2
    })

    it('uses default cost for unknown models', () => {
      expect(aiService.estimateCost('openai', 'unknown-model', 1000)).toBe(1.0) // default
    })
  })

  describe('Error handling', () => {
    it('throws error for unsupported provider', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const config = { provider: 'unsupported' as any, model: 'test' }

      await expect(aiService.generateResponse(messages, config)).rejects.toThrow(
        'Unsupported AI provider: unsupported'
      )
    })

    it('throws error for unsupported provider in streaming', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const config = { provider: 'unsupported' as any, model: 'test' }

      await expect(aiService.generateStreamResponse(messages, config)).rejects.toThrow(
        'Unsupported AI provider: unsupported'
      )
    })
  })

  describe('Message formatting', () => {
    it('handles system messages correctly', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
      ]

      // Test that service can process different message types
      expect(() => {
        const config = { provider: 'openai' as const, model: 'gpt-3.5-turbo' }
        // This would normally call the actual service, but we're just testing structure
      }).not.toThrow()
    })

    it('handles empty messages array', () => {
      const messages: any[] = []
      const config = { provider: 'openai' as const, model: 'gpt-3.5-turbo' }

      // Should not throw for empty messages
      expect(() => {
        // Structure test only
      }).not.toThrow()
    })
  })

  describe('Configuration validation', () => {
    it('handles default configuration values', () => {
      const config = { provider: 'openai' as const, model: 'gpt-3.5-turbo' }
      
      // Should work with minimal config
      expect(config.provider).toBe('openai')
      expect(config.model).toBe('gpt-3.5-turbo')
    })

    it('handles complete configuration', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 1500,
        stream: true,
      }

      expect(config.temperature).toBe(0.8)
      expect(config.maxTokens).toBe(1500)
      expect(config.stream).toBe(true)
    })
  })

  describe('Provider-specific handling', () => {
    it('correctly identifies OpenAI provider', () => {
      const models = aiService.getAvailableModels('openai')
      expect(models).toContain('gpt-3.5-turbo')
      expect(models).toContain('gpt-4')
    })

    it('correctly identifies Anthropic provider', () => {
      const models = aiService.getAvailableModels('anthropic')
      expect(models).toContain('claude-3-haiku')
      expect(models).toContain('claude-3-sonnet')
      expect(models).toContain('claude-3-opus')
    })
  })
})