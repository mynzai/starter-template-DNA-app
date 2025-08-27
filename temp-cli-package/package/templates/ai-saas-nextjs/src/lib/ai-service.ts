import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// AI Provider Types
export type AIProvider = 'openai' | 'anthropic'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface AIStreamChunk {
  delta: string
  done: boolean
  tokens?: number
  model?: string
}

export interface AIServiceConfig {
  provider: AIProvider
  model: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

// Token counting utilities
export const countTokens = (text: string): number => {
  // Rough estimate: ~4 characters per token for most models
  return Math.ceil(text.length / 4)
}

export const estimateResponseTokens = (model: string, maxTokens?: number): number => {
  const defaults = {
    'gpt-3.5-turbo': 500,
    'gpt-4': 800,
    'gpt-4-turbo': 1000,
    'claude-3-haiku': 400,
    'claude-3-sonnet': 600,
    'claude-3-opus': 800,
  }
  return maxTokens || defaults[model as keyof typeof defaults] || 500
}

// OpenAI Service
class OpenAIService {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }

  async generateResponse(
    messages: AIMessage[],
    config: AIServiceConfig
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 1000,
      stream: false,
    })

    return response.choices[0]?.message?.content || ''
  }

  async generateStreamResponse(
    messages: AIMessage[],
    config: AIServiceConfig
  ): Promise<AsyncIterable<AIStreamChunk>> {
    const stream = await this.client.chat.completions.create({
      model: config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 1000,
      stream: true,
    })

    return this.processOpenAIStream(stream)
  }

  private async *processOpenAIStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  ): AsyncIterable<AIStreamChunk> {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      const done = chunk.choices[0]?.finish_reason !== null

      yield {
        delta,
        done,
        tokens: delta ? countTokens(delta) : 0,
        model: chunk.model,
      }

      if (done) break
    }
  }
}

// Anthropic Service
class AnthropicService {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }

  async generateResponse(
    messages: AIMessage[],
    config: AIServiceConfig
  ): Promise<string> {
    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

    const response = await this.client.messages.create({
      model: config.model,
      system: systemMessage,
      messages: conversationMessages,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 1000,
    })

    return response.content[0]?.type === 'text' ? response.content[0].text : ''
  }

  async generateStreamResponse(
    messages: AIMessage[],
    config: AIServiceConfig
  ): Promise<AsyncIterable<AIStreamChunk>> {
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

    const stream = await this.client.messages.create({
      model: config.model,
      system: systemMessage,
      messages: conversationMessages,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 1000,
      stream: true,
    })

    return this.processAnthropicStream(stream)
  }

  private async *processAnthropicStream(
    stream: AsyncIterable<Anthropic.Messages.MessageStreamEvent>
  ): AsyncIterable<AIStreamChunk> {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield {
          delta: chunk.delta.text,
          done: false,
          tokens: countTokens(chunk.delta.text),
        }
      } else if (chunk.type === 'message_stop') {
        yield {
          delta: '',
          done: true,
          tokens: 0,
        }
        break
      }
    }
  }
}

// Main AI Service
export class AIService {
  private openai: OpenAIService
  private anthropic: AnthropicService

  constructor() {
    this.openai = new OpenAIService()
    this.anthropic = new AnthropicService()
  }

  private getService(provider: AIProvider) {
    switch (provider) {
      case 'openai':
        return this.openai
      case 'anthropic':
        return this.anthropic
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }
  }

  async generateResponse(
    messages: AIMessage[],
    config: AIServiceConfig
  ): Promise<string> {
    const service = this.getService(config.provider)
    return service.generateResponse(messages, config)
  }

  async generateStreamResponse(
    messages: AIMessage[],
    config: AIServiceConfig
  ): Promise<AsyncIterable<AIStreamChunk>> {
    const service = this.getService(config.provider)
    return service.generateStreamResponse(messages, config)
  }

  // Model availability based on provider
  getAvailableModels(provider: AIProvider): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
      case 'anthropic':
        return ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus']
      default:
        return []
    }
  }

  // Cost estimation (in cents per 1K tokens)
  estimateCost(provider: AIProvider, model: string, tokens: number): number {
    const costs = {
      'gpt-3.5-turbo': 0.1, // $0.001 per 1K tokens
      'gpt-4': 3.0,         // $0.03 per 1K tokens
      'gpt-4-turbo': 1.0,   // $0.01 per 1K tokens
      'claude-3-haiku': 0.25,   // $0.0025 per 1K tokens
      'claude-3-sonnet': 1.5,   // $0.015 per 1K tokens
      'claude-3-opus': 7.5,     // $0.075 per 1K tokens
    }

    const costPer1K = costs[model as keyof typeof costs] || 1.0
    return (tokens / 1000) * costPer1K
  }
}