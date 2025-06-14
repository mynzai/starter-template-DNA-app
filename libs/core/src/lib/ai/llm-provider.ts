import { EventEmitter } from 'events';

export interface GenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  stream?: boolean;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  maxTokens: number;
  maxContextLength: number;
  supportedModels: string[];
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GenerationMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  tokenUsage?: TokenUsage;
  cost?: number;
  latencyToFirstToken?: number;
  tokensPerSecond?: number;
  cacheHit?: boolean;
}

export interface AIRequest {
  prompt: string;
  options: GenerationOptions;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  usage: TokenUsage;
  metrics: GenerationMetrics;
  requestId: string;
  provider: string;
  model: string;
  cached?: boolean;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface StreamChunk {
  content: string;
  delta: string;
  usage?: Partial<TokenUsage>;
  metrics?: Partial<GenerationMetrics>;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface ProviderError extends Error {
  code: string;
  provider: string;
  requestId?: string;
  retryable: boolean;
  rateLimitReset?: number;
  quotaExceeded?: boolean;
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseURL?: string;
  defaultModel: string;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  costLimits: {
    dailyBudget: number;
    monthlyBudget: number;
  };
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
  timeout?: number;
  headers?: Record<string, string>;
}

export abstract class LLMProvider extends EventEmitter {
  public abstract readonly name: string;
  protected config: ProviderConfig;
  protected isInitialized: boolean = false;

  constructor(config: ProviderConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.validateConfig();
    await this.setupProvider();
    this.isInitialized = true;
    
    this.emit('provider:initialized', { provider: this.name });
  }

  public async generateStream(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<AsyncIterable<StreamChunk>> {
    this.ensureInitialized();
    
    const requestId = this.generateRequestId();
    const mergedOptions = this.mergeOptions(options);
    
    try {
      this.emit('generation:started', {
        provider: this.name,
        requestId,
        prompt: prompt.substring(0, 100) + '...',
        options: mergedOptions
      });

      const stream = this.createStream(prompt, mergedOptions, requestId);
      return this.wrapStream(stream, requestId);
      
    } catch (error) {
      this.emit('generation:failed', {
        provider: this.name,
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw this.wrapError(error as Error, requestId);
    }
  }

  public async generateCompletion(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    try {
      this.emit('generation:started', {
        provider: this.name,
        requestId,
        prompt: prompt.substring(0, 100) + '...',
        options
      });

      const response = await this.callAPI(prompt, options, requestId);
      const endTime = Date.now();
      
      const aiResponse: AIResponse = {
        ...response,
        requestId,
        provider: this.name,
        metrics: {
          ...response.metrics,
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };

      this.emit('generation:completed', {
        provider: this.name,
        requestId,
        usage: aiResponse.usage,
        metrics: aiResponse.metrics
      });

      return aiResponse;
      
    } catch (error) {
      this.emit('generation:failed', {
        provider: this.name,
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw this.wrapError(error as Error, requestId);
    }
  }

  public async estimateCost(
    prompt: string,
    options: GenerationOptions
  ): Promise<number> {
    const tokenCount = await this.countTokens(prompt, options);
    const model = options.model || this.config.defaultModel;
    return this.calculateCost(tokenCount, model);
  }

  public abstract getCapabilities(): ProviderCapabilities;
  public abstract countTokens(prompt: string, options: GenerationOptions): Promise<number>;

  protected abstract validateConfig(): Promise<void>;
  protected abstract setupProvider(): Promise<void>;
  protected abstract createStream(
    prompt: string,
    options: GenerationOptions,
    requestId: string
  ): AsyncIterable<StreamChunk>;
  protected abstract callAPI(
    prompt: string,
    options: GenerationOptions,
    requestId: string
  ): Promise<Omit<AIResponse, 'requestId' | 'provider' | 'metrics'>>;
  protected abstract calculateCost(tokenCount: number, model: string): number;

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`Provider ${this.name} is not initialized. Call initialize() first.`);
    }
  }

  private generateRequestId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mergeOptions(options: GenerationOptions): GenerationOptions {
    return {
      model: this.config.defaultModel,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 1.0,
      timeout: this.config.timeout || 30000,
      ...options
    };
  }

  private async *wrapStream(
    stream: AsyncIterable<StreamChunk>,
    requestId: string
  ): AsyncIterable<StreamChunk> {
    let totalTokens = 0;
    let firstTokenTime: number | undefined;
    const startTime = Date.now();

    try {
      for await (const chunk of stream) {
        if (!firstTokenTime && chunk.delta) {
          firstTokenTime = Date.now();
          this.emit('generation:first_token', {
            provider: this.name,
            requestId,
            latency: firstTokenTime - startTime
          });
        }

        if (chunk.usage?.totalTokens) {
          totalTokens = chunk.usage.totalTokens;
        }

        yield {
          ...chunk,
          metrics: {
            ...chunk.metrics,
            latencyToFirstToken: firstTokenTime ? firstTokenTime - startTime : undefined
          }
        };
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.emit('generation:completed', {
        provider: this.name,
        requestId,
        usage: { totalTokens, promptTokens: 0, completionTokens: totalTokens },
        metrics: {
          startTime,
          endTime,
          duration,
          latencyToFirstToken: firstTokenTime ? firstTokenTime - startTime : undefined,
          tokensPerSecond: totalTokens > 0 ? (totalTokens / duration) * 1000 : 0
        }
      });
    } catch (error) {
      this.emit('generation:failed', {
        provider: this.name,
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw this.wrapError(error as Error, requestId);
    }
  }

  private wrapError(error: Error, requestId: string): ProviderError {
    const providerError = error as ProviderError;
    
    if (!providerError.code) {
      providerError.code = 'UNKNOWN_ERROR';
    }
    
    providerError.provider = this.name;
    providerError.requestId = requestId;
    
    if (!('retryable' in providerError)) {
      providerError.retryable = this.isRetryableError(error);
    }
    
    return providerError;
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('temporary') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504')
    );
  }
}

export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private defaultProvider?: string;

  public register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
    
    if (!this.defaultProvider) {
      this.defaultProvider = provider.name;
    }
  }

  public get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  public getDefault(): LLMProvider | undefined {
    return this.defaultProvider ? this.providers.get(this.defaultProvider) : undefined;
  }

  public setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.defaultProvider = name;
  }

  public list(): string[] {
    return Array.from(this.providers.keys());
  }

  public async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.providers.values()).map(
      provider => provider.initialize()
    );
    
    await Promise.all(initPromises);
  }

  public getCapabilities(): Record<string, ProviderCapabilities> {
    const capabilities: Record<string, ProviderCapabilities> = {};
    
    for (const [name, provider] of this.providers) {
      capabilities[name] = provider.getCapabilities();
    }
    
    return capabilities;
  }
}