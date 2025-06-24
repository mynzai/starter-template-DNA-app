import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AIProvider, AIRequest, AIResponse, AIConversation, AIMessage } from '../types/ai';

interface AIServiceConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  enableCaching?: boolean;
  enableOfflineMode?: boolean;
}

interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  models: string[];
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

interface CachedResponse {
  response: AIResponse;
  timestamp: number;
  ttl: number;
}

interface RateLimitInfo {
  requests: number[];
  tokens: number;
  resetTime: number;
}

export class AIService {
  private static instance: AIService;
  private config: AIServiceConfig;
  private providers: Map<AIProvider, ProviderConfig> = new Map();
  private currentProvider: AIProvider = 'openai';
  private conversations: Map<string, AIConversation> = new Map();
  private rateLimits: Map<AIProvider, RateLimitInfo> = new Map();
  private cache: Map<string, CachedResponse> = new Map();
  private isOnline: boolean = true;
  private isInitialized: boolean = false;

  private constructor(config: AIServiceConfig = {}) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      enableCaching: true,
      enableOfflineMode: true,
      ...config,
    };
    this.setupNetworkListener();
    this.loadCachedData();
  }

  public static getInstance(config?: AIServiceConfig): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService(config);
    }
    return AIService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize providers
      if (this.config.openaiApiKey) {
        this.registerProvider({
          provider: 'openai',
          apiKey: this.config.openaiApiKey,
          baseUrl: 'https://api.openai.com/v1',
          models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'],
          rateLimit: {
            requestsPerMinute: 60,
            tokensPerMinute: 150000,
          },
        });
      }

      if (this.config.anthropicApiKey) {
        this.registerProvider({
          provider: 'anthropic',
          apiKey: this.config.anthropicApiKey,
          baseUrl: 'https://api.anthropic.com',
          models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
          rateLimit: {
            requestsPerMinute: 50,
            tokensPerMinute: 100000,
          },
        });
      }

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;

      this.isInitialized = true;
      console.log(`[AIService] Initialized with ${this.providers.size} providers`);
    } catch (error) {
      console.error('[AIService] Initialization failed:', error);
      throw error;
    }
  }

  public registerProvider(config: ProviderConfig): void {
    this.providers.set(config.provider, config);
    this.rateLimits.set(config.provider, {
      requests: [],
      tokens: 0,
      resetTime: Date.now() + 60000,
    });
    console.log(`[AIService] Registered provider: ${config.provider}`);
  }

  public async sendMessage(
    message: string,
    conversationId?: string,
    options: Partial<AIRequest> = {}
  ): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('AIService not initialized. Call initialize() first.');
    }

    const conversation = conversationId 
      ? this.getOrCreateConversation(conversationId)
      : this.createConversation();

    const request: AIRequest = {
      message,
      conversationId: conversation.id,
      model: options.model || 'gpt-4',
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      stream: options.stream || false,
      ...options,
    };

    // Check cache first
    if (this.config.enableCaching) {
      const cachedResponse = this.getCachedResponse(request);
      if (cachedResponse) {
        console.log('[AIService] Returning cached response');
        return cachedResponse;
      }
    }

    // Check if online for API calls
    if (!this.isOnline && !this.config.enableOfflineMode) {
      throw new Error('No internet connection and offline mode is disabled');
    }

    // Handle offline mode
    if (!this.isOnline && this.config.enableOfflineMode) {
      return this.handleOfflineRequest(request);
    }

    try {
      // Check rate limits
      await this.checkRateLimit(this.currentProvider);

      // Make API request
      const response = await this.makeAPIRequest(request);

      // Update conversation
      const userMessage: AIMessage = {
        id: this.generateId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      const assistantMessage: AIMessage = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: response.metadata,
      };

      conversation.messages.push(userMessage, assistantMessage);
      this.conversations.set(conversation.id, conversation);

      // Cache response
      if (this.config.enableCaching) {
        this.cacheResponse(request, response);
      }

      // Save to AsyncStorage
      await this.saveConversation(conversation);

      return response;
    } catch (error) {
      console.error('[AIService] Send message failed:', error);
      
      // Try fallback provider
      if (this.providers.size > 1) {
        const fallbackProvider = this.getNextProvider();
        console.log(`[AIService] Trying fallback provider: ${fallbackProvider}`);
        this.currentProvider = fallbackProvider;
        return this.sendMessage(message, conversationId, options);
      }

      throw error;
    }
  }

  public async streamMessage(
    message: string,
    conversationId?: string,
    onChunk?: (chunk: string) => void,
    options: Partial<AIRequest> = {}
  ): Promise<AIResponse> {
    const streamRequest = { ...options, stream: true };
    
    if (!onChunk) {
      return this.sendMessage(message, conversationId, streamRequest);
    }

    const conversation = conversationId 
      ? this.getOrCreateConversation(conversationId)
      : this.createConversation();

    const request: AIRequest = {
      message,
      conversationId: conversation.id,
      model: options.model || 'gpt-4',
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      stream: true,
      ...streamRequest,
    };

    try {
      await this.checkRateLimit(this.currentProvider);

      const response = await this.makeStreamingAPIRequest(request, onChunk);

      // Update conversation
      const userMessage: AIMessage = {
        id: this.generateId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      const assistantMessage: AIMessage = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: response.metadata,
      };

      conversation.messages.push(userMessage, assistantMessage);
      await this.saveConversation(conversation);

      return response;
    } catch (error) {
      console.error('[AIService] Stream message failed:', error);
      throw error;
    }
  }

  private async makeAPIRequest(request: AIRequest): Promise<AIResponse> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Provider ${this.currentProvider} not configured`);
    }

    const headers = this.getProviderHeaders(provider);
    const body = this.buildRequestBody(request, provider);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.getProviderEndpoint(provider), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseProviderResponse(data, provider.provider);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async makeStreamingAPIRequest(
    request: AIRequest,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Provider ${this.currentProvider} not configured`);
    }

    const headers = this.getProviderHeaders(provider);
    const body = this.buildRequestBody(request, provider);

    const response = await fetch(this.getProviderEndpoint(provider), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Streaming request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let fullContent = '';
    let id = this.generateId();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = this.extractStreamContent(parsed, provider.provider);
              
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (error) {
              console.warn('[AIService] Failed to parse stream chunk:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      id,
      content: fullContent,
      provider: provider.provider,
      model: request.model || 'gpt-4',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      metadata: {
        conversationId: request.conversationId,
        timestamp: new Date(),
        streaming: true,
      },
    };
  }

  private getProviderHeaders(provider: ProviderConfig): Record<string, string> {
    const baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': `AIAssistant-RN/${Platform.OS}`,
    };

    switch (provider.provider) {
      case 'openai':
        return {
          ...baseHeaders,
          'Authorization': `Bearer ${provider.apiKey}`,
        };
      case 'anthropic':
        return {
          ...baseHeaders,
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
        };
      default:
        return baseHeaders;
    }
  }

  private buildRequestBody(request: AIRequest, provider: ProviderConfig): any {
    const conversation = this.conversations.get(request.conversationId);
    const messages = conversation?.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })) || [];

    messages.push({
      role: 'user',
      content: request.message,
    });

    switch (provider.provider) {
      case 'openai':
        return {
          model: request.model,
          messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: request.stream,
        };
      case 'anthropic':
        return {
          model: request.model,
          messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: request.stream,
        };
      default:
        return {
          messages,
          ...request,
        };
    }
  }

  private getProviderEndpoint(provider: ProviderConfig): string {
    switch (provider.provider) {
      case 'openai':
        return `${provider.baseUrl}/chat/completions`;
      case 'anthropic':
        return `${provider.baseUrl}/v1/messages`;
      default:
        return `${provider.baseUrl}/chat/completions`;
    }
  }

  private parseProviderResponse(data: any, provider: AIProvider): AIResponse {
    switch (provider) {
      case 'openai':
        return {
          id: data.id,
          content: data.choices[0]?.message?.content || '',
          provider,
          model: data.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
          metadata: {
            timestamp: new Date(),
            finishReason: data.choices[0]?.finish_reason,
          },
        };
      case 'anthropic':
        return {
          id: data.id,
          content: data.content[0]?.text || '',
          provider,
          model: data.model,
          usage: {
            promptTokens: data.usage?.input_tokens || 0,
            completionTokens: data.usage?.output_tokens || 0,
            totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          },
          metadata: {
            timestamp: new Date(),
            stopReason: data.stop_reason,
          },
        };
      default:
        return {
          id: data.id || this.generateId(),
          content: data.content || '',
          provider,
          model: data.model || 'unknown',
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          metadata: {
            timestamp: new Date(),
          },
        };
    }
  }

  private extractStreamContent(data: any, provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return data.choices?.[0]?.delta?.content || '';
      case 'anthropic':
        return data.delta?.text || '';
      default:
        return data.content || '';
    }
  }

  private handleOfflineRequest(request: AIRequest): Promise<AIResponse> {
    // Simple offline response - in a real implementation, this would use local models
    const offlineResponse: AIResponse = {
      id: this.generateId(),
      content: 'I\'m currently offline. This is a basic response. Full AI capabilities will be available when you\'re back online.',
      provider: 'offline',
      model: 'offline-fallback',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      metadata: {
        timestamp: new Date(),
        offline: true,
        conversationId: request.conversationId,
      },
    };

    return Promise.resolve(offlineResponse);
  }

  private async checkRateLimit(provider: AIProvider): Promise<void> {
    const config = this.providers.get(provider);
    const rateLimit = this.rateLimits.get(provider);
    
    if (!config || !rateLimit) return;

    const now = Date.now();
    
    // Reset if time window passed
    if (now > rateLimit.resetTime) {
      rateLimit.requests = [];
      rateLimit.tokens = 0;
      rateLimit.resetTime = now + 60000; // 1 minute window
    }

    // Clean old requests
    rateLimit.requests = rateLimit.requests.filter(time => time > now - 60000);

    // Check request limit
    if (rateLimit.requests.length >= config.rateLimit.requestsPerMinute) {
      const waitTime = rateLimit.requests[0] + 60000 - now;
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }

    rateLimit.requests.push(now);
  }

  private getCachedResponse(request: AIRequest): AIResponse | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  private cacheResponse(request: AIRequest, response: AIResponse): void {
    const cacheKey = this.generateCacheKey(request);
    const ttl = 5 * 60 * 1000; // 5 minutes
    
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl,
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private generateCacheKey(request: AIRequest): string {
    const conversation = this.conversations.get(request.conversationId);
    const context = conversation?.messages.slice(-3).map(m => m.content).join('|') || '';
    return `${request.message}|${context}|${request.model}`;
  }

  private getOrCreateConversation(id: string): AIConversation {
    let conversation = this.conversations.get(id);
    if (!conversation) {
      conversation = this.createConversation(id);
    }
    return conversation;
  }

  private createConversation(id?: string): AIConversation {
    const conversation: AIConversation = {
      id: id || this.generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        platform: Platform.OS,
        version: '1.0.0',
      },
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  private async saveConversation(conversation: AIConversation): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `conversation_${conversation.id}`,
        JSON.stringify(conversation)
      );
    } catch (error) {
      console.error('[AIService] Failed to save conversation:', error);
    }
  }

  private async loadCachedData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const conversationKeys = keys.filter(key => key.startsWith('conversation_'));
      
      for (const key of conversationKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const conversation: AIConversation = JSON.parse(data);
          this.conversations.set(conversation.id, conversation);
        }
      }
    } catch (error) {
      console.error('[AIService] Failed to load cached data:', error);
    }
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      console.log(`[AIService] Network status: ${this.isOnline ? 'online' : 'offline'}`);
    });
  }

  private getNextProvider(): AIProvider {
    const providerKeys = Array.from(this.providers.keys());
    const currentIndex = providerKeys.indexOf(this.currentProvider);
    const nextIndex = (currentIndex + 1) % providerKeys.length;
    return providerKeys[nextIndex];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  public get initialized(): boolean {
    return this.isInitialized;
  }

  public get online(): boolean {
    return this.isOnline;
  }

  public getConversations(): AIConversation[] {
    return Array.from(this.conversations.values());
  }

  public getConversation(id: string): AIConversation | undefined {
    return this.conversations.get(id);
  }

  public async clearConversation(id: string): Promise<void> {
    this.conversations.delete(id);
    await AsyncStorage.removeItem(`conversation_${id}`);
  }

  public async clearAllConversations(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const conversationKeys = keys.filter(key => key.startsWith('conversation_'));
    await AsyncStorage.multiRemove(conversationKeys);
    this.conversations.clear();
  }
}

export default AIService;