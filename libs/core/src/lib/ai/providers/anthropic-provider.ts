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

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  message?: {
    id: string;
    type: string;
    role: string;
    content: Array<{ type: string; text: string }>;
    model: string;
    stop_reason?: string;
    stop_sequence?: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  content_block?: {
    type: string;
    text: string;
  };
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicError {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet-20240620': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
};

const SUPPORTED_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

export class AnthropicProvider extends LLMProvider {
  public readonly name = 'anthropic';
  private baseURL: string;
  private apiVersion: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.anthropic.com';
    this.apiVersion = '2023-06-01';
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    if (!this.config.apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format');
    }
  }

  protected async setupProvider(): Promise<void> {
    try {
      const response = await this.makeRequest('/messages', 'POST', {
        model: this.config.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });

      if (!response.ok && response.status !== 400) {
        const errorData = await response.json() as AnthropicError;
        throw new Error(`Setup failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      this.emit('provider:setup_complete', {
        provider: this.name,
        modelsLoaded: SUPPORTED_MODELS.length
      });
    } catch (error) {
      throw new Error(`Failed to setup Anthropic provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsVision: true,
      supportsTools: true,
      maxTokens: 200000,
      maxContextLength: 200000,
      supportedModels: SUPPORTED_MODELS,
      rateLimits: this.config.rateLimits
    };
  }

  public async countTokens(prompt: string, options: GenerationOptions): Promise<number> {
    const approximateTokens = Math.ceil(prompt.length / 3.5);
    
    if (options.maxTokens) {
      return approximateTokens + options.maxTokens;
    }
    
    return approximateTokens + 1000;
  }

  protected calculateCost(tokenCount: number, model: string): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-5-sonnet-20241022'];
    const promptTokens = Math.ceil(tokenCount * 0.75);
    const completionTokens = Math.ceil(tokenCount * 0.25);
    
    return (promptTokens * pricing.input + completionTokens * pricing.output) / 1000000;
  }

  protected async *createStream(
    prompt: string,
    options: GenerationOptions,
    requestId: string
  ): AsyncIterable<StreamChunk> {
    const messages: AnthropicMessage[] = [
      { role: 'user', content: prompt }
    ];

    const requestBody = {
      model: options.model || this.config.defaultModel,
      max_tokens: options.maxTokens || 4000,
      messages,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: Array.isArray(options.stop) ? options.stop : (options.stop ? [options.stop] : undefined),
      stream: true
    };

    const response = await this.makeRequest('/messages', 'POST', requestBody);
    
    if (!response.ok) {
      const errorData = await response.json() as AnthropicError;
      throw this.createProviderError(errorData, requestId);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let totalUsage: TokenUsage | undefined;
    
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
            
            try {
              const parsed: AnthropicStreamEvent = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const delta = parsed.delta.text;
                content += delta;
                
                yield {
                  content,
                  delta,
                  usage: totalUsage,
                  finishReason: parsed.delta.stop_reason as any
                };
              } else if (parsed.type === 'message_delta' && parsed.usage) {
                totalUsage = {
                  promptTokens: parsed.usage.input_tokens,
                  completionTokens: parsed.usage.output_tokens,
                  totalTokens: parsed.usage.input_tokens + parsed.usage.output_tokens
                };
              } else if (parsed.type === 'message_stop') {
                return;
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
    const messages: AnthropicMessage[] = [
      { role: 'user', content: prompt }
    ];

    const requestBody = {
      model: options.model || this.config.defaultModel,
      max_tokens: options.maxTokens || 4000,
      messages,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: Array.isArray(options.stop) ? options.stop : (options.stop ? [options.stop] : undefined),
      stream: false
    };

    const startTime = Date.now();
    const response = await this.makeRequest('/messages', 'POST', requestBody);
    
    if (!response.ok) {
      const errorData = await response.json() as AnthropicError;
      throw this.createProviderError(errorData, requestId);
    }

    const data: AnthropicResponse = await response.json();
    const endTime = Date.now();
    
    const usage: TokenUsage = {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens
    };

    const metrics: GenerationMetrics = {
      startTime,
      endTime,
      duration: endTime - startTime,
      tokenUsage: usage,
      cost: this.calculateCost(usage.totalTokens, data.model)
    };

    return {
      content: data.content[0]?.text || '',
      usage,
      metrics,
      model: data.model,
      finishReason: data.stop_reason as any
    };
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'x-api-key': this.config.apiKey,
      'anthropic-version': this.apiVersion,
      'content-type': 'application/json',
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

  private createProviderError(errorData: AnthropicError, requestId: string): ProviderError {
    const error = new Error(errorData.error?.message || 'Anthropic API error') as ProviderError;
    
    error.code = errorData.error?.type || 'ANTHROPIC_ERROR';
    error.provider = this.name;
    error.requestId = requestId;
    
    const message = (errorData.error?.message || '').toLowerCase();
    error.retryable = (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('server error') ||
      message.includes('temporarily unavailable') ||
      message.includes('overloaded')
    );
    
    if (message.includes('rate limit')) {
      const resetMatch = errorData.error?.message?.match(/try again in (\d+) seconds?/);
      if (resetMatch) {
        error.rateLimitReset = Date.now() + (parseInt(resetMatch[1]) * 1000);
      }
    }
    
    if (message.includes('credit') || message.includes('billing') || message.includes('quota')) {
      error.quotaExceeded = true;
    }
    
    return error;
  }
}