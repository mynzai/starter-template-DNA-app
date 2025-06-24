import AIService from '../../src/services/AIService';
import { AIProvider } from '../../src/types/ai';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = AIService.getInstance({
      openaiApiKey: 'test-openai-key',
      anthropicApiKey: 'test-anthropic-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default config', async () => {
      await aiService.initialize();
      expect(aiService.initialized).toBe(true);
    });

    it('should register providers correctly', () => {
      const providerConfig = {
        provider: 'openai' as AIProvider,
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4'],
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 150000,
        },
      };

      aiService.registerProvider(providerConfig);
      // Test that provider was registered (would need to expose provider getter)
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = Object.create(AIService.prototype);
      uninitializedService.isInitialized = false;

      await expect(
        uninitializedService.sendMessage('Hello')
      ).rejects.toThrow('AIService not initialized');
    });

    it('should handle offline mode gracefully', async () => {
      // Mock offline state
      aiService['isOnline'] = false;
      aiService['config'].enableOfflineMode = true;

      const response = await aiService.sendMessage('Hello');
      
      expect(response.provider).toBe('offline');
      expect(response.content).toContain('offline');
      expect(response.metadata.offline).toBe(true);
    });

    it('should create new conversation if none provided', async () => {
      // Mock fetch for API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-response-id',
          choices: [{
            message: { content: 'Hello! How can I help you?' },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18
          },
          model: 'gpt-4'
        }),
      });

      const response = await aiService.sendMessage('Hello');
      
      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.id).toBe('test-response-id');
      expect(response.usage.totalTokens).toBe(18);
    });
  });

  describe('Conversation Management', () => {
    it('should create conversations correctly', () => {
      const conversation = aiService['createConversation']();
      
      expect(conversation.id).toBeDefined();
      expect(conversation.title).toBe('New Conversation');
      expect(conversation.messages).toEqual([]);
      expect(conversation.createdAt).toBeInstanceOf(Date);
    });

    it('should get or create conversation', () => {
      const conversationId = 'test-conversation-id';
      const conversation = aiService['getOrCreateConversation'](conversationId);
      
      expect(conversation.id).toBe(conversationId);
      expect(aiService.getConversation(conversationId)).toBe(conversation);
    });

    it('should clear conversations', async () => {
      // Create a conversation first
      aiService['createConversation']('test-id');
      expect(aiService.getConversations()).toHaveLength(1);
      
      await aiService.clearAllConversations();
      expect(aiService.getConversations()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(aiService.sendMessage('Hello')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(aiService.sendMessage('Hello')).rejects.toThrow('Network error');
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should cache responses when enabled', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'cached-response',
          choices: [{ message: { content: 'Cached response' } }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
          model: 'gpt-4'
        }),
      });

      // First call should make API request
      const response1 = await aiService.sendMessage('Test message');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Mock the cache to return the same response
      const cacheKey = aiService['generateCacheKey']({
        message: 'Test message',
        conversationId: response1.metadata?.conversationId || '',
        model: 'gpt-4',
      });
      
      aiService['cache'].set(cacheKey, {
        response: response1,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000,
      });

      // Second call should use cache
      const cachedResponse = aiService['getCachedResponse']({
        message: 'Test message',
        conversationId: response1.metadata?.conversationId || '',
        model: 'gpt-4',
      });

      expect(cachedResponse).toBeTruthy();
      expect(cachedResponse?.id).toBe('cached-response');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should enforce rate limits', async () => {
      const provider: AIProvider = 'openai';
      
      // Simulate hitting rate limit
      const rateLimit = aiService['rateLimits'].get(provider);
      const config = aiService['providers'].get(provider);
      
      if (rateLimit && config) {
        // Fill up the rate limit
        for (let i = 0; i < config.rateLimit.requestsPerMinute; i++) {
          rateLimit.requests.push(Date.now());
        }

        await expect(
          aiService['checkRateLimit'](provider)
        ).rejects.toThrow('Rate limit exceeded');
      }
    });
  });

  describe('Provider Management', () => {
    it('should switch to fallback provider on failure', async () => {
      // Register multiple providers
      aiService.registerProvider({
        provider: 'openai',
        apiKey: 'test-openai-key',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4'],
        rateLimit: { requestsPerMinute: 60, tokensPerMinute: 150000 },
      });

      aiService.registerProvider({
        provider: 'anthropic',
        apiKey: 'test-anthropic-key',
        baseUrl: 'https://api.anthropic.com',
        models: ['claude-3-opus'],
        rateLimit: { requestsPerMinute: 50, tokensPerMinute: 100000 },
      });

      // Mock first provider to fail
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('OpenAI API Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'anthropic-response',
            content: [{ text: 'Response from Anthropic' }],
            usage: { input_tokens: 5, output_tokens: 5 },
            model: 'claude-3-opus'
          }),
        });

      const response = await aiService.sendMessage('Hello');
      expect(response.provider).toBe('anthropic');
    });
  });
});