import {
  LLMProvider,
  GenerationOptions,
  ProviderCapabilities,
  StreamChunk,
  AIResponse,
  ProviderConfig,
  TokenUsage,
  GenerationMetrics,
  ProviderError
} from '../llm-provider';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 }
};

export class OpenAIProvider extends LLMProvider {
  public readonly name = 'openai';
  private baseURL: string;
  private models: string[] = [];

  constructor(config: ProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (!this.config.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
  }

  protected async setupProvider(): Promise<void> {
    try {
      const response = await this.makeRequest('/models', 'GET');
      const data = await response.json();
      
      this.models = data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort();
        
      this.emit('provider:setup_complete', {
        provider: this.name,
        modelsLoaded: this.models.length
      });
    } catch (error) {
      throw new Error(`Failed to setup OpenAI provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsVision: true,
      supportsTools: true,
      maxTokens: 128000,
      maxContextLength: 128000,
      supportedModels: this.models.length > 0 ? this.models : ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      rateLimits: this.config.rateLimits
    };
  }

  public async countTokens(prompt: string, options: GenerationOptions): Promise<number> {
    const approximateTokens = Math.ceil(prompt.length / 4);
    
    if (options.maxTokens) {
      return approximateTokens + options.maxTokens;
    }
    
    return approximateTokens + 1000;
  }

  protected calculateCost(tokenCount: number, model: string): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];
    const promptTokens = Math.ceil(tokenCount * 0.75);
    const completionTokens = Math.ceil(tokenCount * 0.25);
    
    return (promptTokens * pricing.input + completionTokens * pricing.output) / 1000;
  }

  protected async *createStream(
    prompt: string,
    options: GenerationOptions,
    requestId: string
  ): AsyncIterable<StreamChunk> {
    const messages: OpenAIMessage[] = [
      { role: 'user', content: prompt }
    ];

    const requestBody = {
      model: options.model || this.config.defaultModel,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: true
    };

    const response = await this.makeRequest('/chat/completions', 'POST', requestBody);
    
    if (!response.ok) {
      const errorData = await response.json() as OpenAIError;
      throw this.createProviderError(errorData, requestId);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed: OpenAIStreamResponse = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content || '';
              
              if (delta) {
                content += delta;
                
                yield {
                  content,
                  delta,
                  usage: parsed.usage ? {
                    promptTokens: parsed.usage.prompt_tokens,
                    completionTokens: parsed.usage.completion_tokens,
                    totalTokens: parsed.usage.total_tokens
                  } : undefined,
                  finishReason: parsed.choices[0]?.finish_reason as any
                };
              }
            } catch (parseError) {
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  protected async callAPI(
    prompt: string,
    options: GenerationOptions,
    requestId: string
  ): Promise<Omit<AIResponse, 'requestId' | 'provider' | 'metrics'>> {
    const messages: OpenAIMessage[] = [
      { role: 'user', content: prompt }
    ];

    const requestBody = {
      model: options.model || this.config.defaultModel,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: false
    };

    const startTime = Date.now();
    const response = await this.makeRequest('/chat/completions', 'POST', requestBody);
    
    if (!response.ok) {
      const errorData = await response.json() as OpenAIError;
      throw this.createProviderError(errorData, requestId);
    }

    const data: OpenAICompletionResponse = await response.json();
    const endTime = Date.now();
    
    const usage: TokenUsage = {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    };

    const metrics: GenerationMetrics = {
      startTime,
      endTime,
      duration: endTime - startTime,
      tokenUsage: usage,
      cost: this.calculateCost(usage.totalTokens, data.model)
    };

    return {
      content: data.choices[0].message.content,
      usage,
      metrics,
      model: data.model,
      finishReason: data.choices[0].finish_reason as any
    };
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000)
    };

    if (body && method === 'POST') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      return await fetch(url, requestOptions);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private createProviderError(errorData: OpenAIError, requestId: string): ProviderError {
    const error = new Error(errorData.error.message) as ProviderError;
    
    error.code = errorData.error.code || errorData.error.type || 'OPENAI_ERROR';
    error.provider = this.name;
    error.requestId = requestId;
    
    const message = errorData.error.message.toLowerCase();
    error.retryable = (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('server error') ||
      message.includes('temporarily unavailable')
    );
    
    if (message.includes('rate limit')) {
      const resetMatch = errorData.error.message.match(/try again in (\d+)s/);
      if (resetMatch) {
        error.rateLimitReset = Date.now() + (parseInt(resetMatch[1]) * 1000);
      }
    }
    
    if (message.includes('quota') || message.includes('billing')) {
      error.quotaExceeded = true;
    }
    
    return error;
  }
}