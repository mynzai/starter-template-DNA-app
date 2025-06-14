import { GenerationOptions } from '../llm-provider';

export interface TokenCount {
  promptTokens: number;
  maxCompletionTokens: number;
  totalEstimatedTokens: number;
}

export interface TokenCountingOptions {
  model?: string;
  includeSystemPrompt?: boolean;
  estimationMethod?: 'conservative' | 'accurate' | 'fast';
}

export abstract class TokenCounter {
  public abstract countTokens(
    text: string,
    options?: TokenCountingOptions
  ): Promise<TokenCount>;

  public abstract estimateCompletionTokens(
    prompt: string,
    maxTokens?: number,
    options?: TokenCountingOptions
  ): Promise<number>;

  protected estimateTokensFromText(text: string): number {
    return Math.ceil(text.length / 4);
  }

  protected estimateTokensFromWords(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  protected estimateTokensFromCharacters(text: string): number {
    return Math.ceil(text.length / 3.5);
  }
}

export class OpenAITokenCounter extends TokenCounter {
  private tokenizationCache = new Map<string, number>();
  private readonly modelMultipliers: Record<string, number> = {
    'gpt-4': 1.0,
    'gpt-4-turbo': 1.0,
    'gpt-4o': 1.0,
    'gpt-4o-mini': 1.0,
    'gpt-3.5-turbo': 1.0,
    'gpt-3.5-turbo-16k': 1.0
  };

  public async countTokens(
    text: string,
    options: TokenCountingOptions = {}
  ): Promise<TokenCount> {
    const cacheKey = `${text}-${options.model || 'default'}`;
    
    if (this.tokenizationCache.has(cacheKey)) {
      const cachedCount = this.tokenizationCache.get(cacheKey)!;
      return {
        promptTokens: cachedCount,
        maxCompletionTokens: 0,
        totalEstimatedTokens: cachedCount
      };
    }

    let tokenCount: number;
    
    switch (options.estimationMethod) {
      case 'fast':
        tokenCount = this.estimateTokensFromText(text);
        break;
      case 'conservative':
        tokenCount = Math.ceil(this.estimateTokensFromCharacters(text) * 1.2);
        break;
      case 'accurate':
      default:
        tokenCount = await this.accurateTokenCount(text, options.model);
        break;
    }

    const multiplier = this.modelMultipliers[options.model || 'gpt-4o'] || 1.0;
    const adjustedCount = Math.ceil(tokenCount * multiplier);

    this.tokenizationCache.set(cacheKey, adjustedCount);
    this.cleanupCache();

    return {
      promptTokens: adjustedCount,
      maxCompletionTokens: 0,
      totalEstimatedTokens: adjustedCount
    };
  }

  public async estimateCompletionTokens(
    prompt: string,
    maxTokens: number = 1000,
    options: TokenCountingOptions = {}
  ): Promise<number> {
    const promptCount = await this.countTokens(prompt, options);
    return Math.min(maxTokens, Math.ceil(promptCount.promptTokens * 0.5));
  }

  private async accurateTokenCount(text: string, model?: string): Promise<number> {
    try {
      if (typeof window !== 'undefined') {
        return this.estimateTokensFromCharacters(text);
      }

      const { encode } = await import('gpt-tokenizer');
      const tokens = encode(text);
      return tokens.length;
    } catch (error) {
      return this.estimateTokensFromCharacters(text);
    }
  }

  private cleanupCache(): void {
    if (this.tokenizationCache.size > 1000) {
      const entries = Array.from(this.tokenizationCache.entries());
      const toKeep = entries.slice(-500);
      this.tokenizationCache.clear();
      
      for (const [key, value] of toKeep) {
        this.tokenizationCache.set(key, value);
      }
    }
  }
}

export class AnthropicTokenCounter extends TokenCounter {
  private tokenizationCache = new Map<string, number>();
  private readonly modelMultipliers: Record<string, number> = {
    'claude-3-5-sonnet-20241022': 1.0,
    'claude-3-5-sonnet-20240620': 1.0,
    'claude-3-5-haiku-20241022': 1.0,
    'claude-3-opus-20240229': 1.0,
    'claude-3-sonnet-20240229': 1.0,
    'claude-3-haiku-20240307': 1.0
  };

  public async countTokens(
    text: string,
    options: TokenCountingOptions = {}
  ): Promise<TokenCount> {
    const cacheKey = `${text}-${options.model || 'default'}`;
    
    if (this.tokenizationCache.has(cacheKey)) {
      const cachedCount = this.tokenizationCache.get(cacheKey)!;
      return {
        promptTokens: cachedCount,
        maxCompletionTokens: 0,
        totalEstimatedTokens: cachedCount
      };
    }

    let tokenCount: number;
    
    switch (options.estimationMethod) {
      case 'fast':
        tokenCount = this.estimateTokensFromText(text);
        break;
      case 'conservative':
        tokenCount = Math.ceil(this.estimateTokensFromWords(text) * 1.3);
        break;
      case 'accurate':
      default:
        tokenCount = this.estimateTokensFromCharacters(text);
        break;
    }

    const multiplier = this.modelMultipliers[options.model || 'claude-3-5-sonnet-20241022'] || 1.0;
    const adjustedCount = Math.ceil(tokenCount * multiplier);

    this.tokenizationCache.set(cacheKey, adjustedCount);
    this.cleanupCache();

    return {
      promptTokens: adjustedCount,
      maxCompletionTokens: 0,
      totalEstimatedTokens: adjustedCount
    };
  }

  public async estimateCompletionTokens(
    prompt: string,
    maxTokens: number = 1000,
    options: TokenCountingOptions = {}
  ): Promise<number> {
    const promptCount = await this.countTokens(prompt, options);
    return Math.min(maxTokens, Math.ceil(promptCount.promptTokens * 0.6));
  }

  private cleanupCache(): void {
    if (this.tokenizationCache.size > 1000) {
      const entries = Array.from(this.tokenizationCache.entries());
      const toKeep = entries.slice(-500);
      this.tokenizationCache.clear();
      
      for (const [key, value] of toKeep) {
        this.tokenizationCache.set(key, value);
      }
    }
  }
}

export class OllamaTokenCounter extends TokenCounter {
  private tokenizationCache = new Map<string, number>();

  public async countTokens(
    text: string,
    options: TokenCountingOptions = {}
  ): Promise<TokenCount> {
    const cacheKey = `${text}-${options.model || 'default'}`;
    
    if (this.tokenizationCache.has(cacheKey)) {
      const cachedCount = this.tokenizationCache.get(cacheKey)!;
      return {
        promptTokens: cachedCount,
        maxCompletionTokens: 0,
        totalEstimatedTokens: cachedCount
      };
    }

    const tokenCount = this.estimateTokensFromText(text);
    
    this.tokenizationCache.set(cacheKey, tokenCount);
    this.cleanupCache();

    return {
      promptTokens: tokenCount,
      maxCompletionTokens: 0,
      totalEstimatedTokens: tokenCount
    };
  }

  public async estimateCompletionTokens(
    prompt: string,
    maxTokens: number = 1000,
    options: TokenCountingOptions = {}
  ): Promise<number> {
    const promptCount = await this.countTokens(prompt, options);
    return Math.min(maxTokens, Math.ceil(promptCount.promptTokens * 0.4));
  }

  private cleanupCache(): void {
    if (this.tokenizationCache.size > 500) {
      const entries = Array.from(this.tokenizationCache.entries());
      const toKeep = entries.slice(-250);
      this.tokenizationCache.clear();
      
      for (const [key, value] of toKeep) {
        this.tokenizationCache.set(key, value);
      }
    }
  }
}

export class TokenCounterRegistry {
  private counters = new Map<string, TokenCounter>();

  constructor() {
    this.registerDefaultCounters();
  }

  private registerDefaultCounters(): void {
    this.counters.set('openai', new OpenAITokenCounter());
    this.counters.set('anthropic', new AnthropicTokenCounter());
    this.counters.set('ollama', new OllamaTokenCounter());
  }

  public register(provider: string, counter: TokenCounter): void {
    this.counters.set(provider, counter);
  }

  public get(provider: string): TokenCounter {
    const counter = this.counters.get(provider);
    if (!counter) {
      throw new Error(`No token counter registered for provider: ${provider}`);
    }
    return counter;
  }

  public async countTokens(
    provider: string,
    text: string,
    options?: TokenCountingOptions
  ): Promise<TokenCount> {
    const counter = this.get(provider);
    return counter.countTokens(text, options);
  }

  public async estimateCompletionTokens(
    provider: string,
    prompt: string,
    maxTokens?: number,
    options?: TokenCountingOptions
  ): Promise<number> {
    const counter = this.get(provider);
    return counter.estimateCompletionTokens(prompt, maxTokens, options);
  }

  public async estimateRequestCost(
    provider: string,
    prompt: string,
    options: GenerationOptions & TokenCountingOptions,
    pricing: { input: number; output: number }
  ): Promise<{
    promptCost: number;
    maxCompletionCost: number;
    totalEstimatedCost: number;
  }> {
    const counter = this.get(provider);
    const promptTokens = await counter.countTokens(prompt, options);
    const completionTokens = await counter.estimateCompletionTokens(
      prompt,
      options.maxTokens,
      options
    );

    const promptCost = (promptTokens.promptTokens * pricing.input) / 1000;
    const maxCompletionCost = (completionTokens * pricing.output) / 1000;

    return {
      promptCost,
      maxCompletionCost,
      totalEstimatedCost: promptCost + maxCompletionCost
    };
  }
}