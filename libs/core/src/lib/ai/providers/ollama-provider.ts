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

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  response?: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaCompletionResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

interface OllamaError {
  error: string;
}

const MODEL_FAMILIES = {
  'llama': { contextLength: 4096, maxTokens: 4000 },
  'mistral': { contextLength: 8192, maxTokens: 4000 },
  'neural-chat': { contextLength: 4096, maxTokens: 4000 },
  'starling': { contextLength: 8192, maxTokens: 4000 },
  'codellama': { contextLength: 16384, maxTokens: 4000 },
  'wizard': { contextLength: 8192, maxTokens: 4000 },
  'vicuna': { contextLength: 4096, maxTokens: 4000 },
  'orca': { contextLength: 4096, maxTokens: 4000 },
  'dolphin': { contextLength: 4096, maxTokens: 4000 },
  'default': { contextLength: 4096, maxTokens: 4000 }
};

export class OllamaProvider extends LLMProvider {
  public readonly name = 'ollama';
  private baseURL: string;
  private models: OllamaModel[] = [];

  constructor(config: ProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:11434';
  }

  protected async validateConfig(): Promise<void> {
    if (this.config.apiKey && this.config.apiKey !== '') {
      console.warn('Ollama typically does not require API keys when running locally');
    }
  }

  protected async setupProvider(): Promise<void> {
    try {
      const response = await this.makeRequest('/api/tags', 'GET');
      
      if (!response.ok) {
        throw new Error(`Failed to connect to Ollama at ${this.baseURL}`);
      }
      
      const data = await response.json();
      this.models = data.models || [];
      
      if (this.models.length === 0) {
        console.warn('No models found in Ollama. Make sure to pull models using "ollama pull <model>"');
      }
      
      this.emit('provider:setup_complete', {
        provider: this.name,
        modelsLoaded: this.models.length,
        baseURL: this.baseURL
      });
    } catch (error) {
      throw new Error(`Failed to setup Ollama provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getCapabilities(): ProviderCapabilities {
    const maxContextLength = Math.max(
      ...this.models.map(model => this.getModelCapabilities(model.name).contextLength),
      4096
    );
    
    const maxTokens = Math.max(
      ...this.models.map(model => this.getModelCapabilities(model.name).maxTokens),
      4000
    );

    return {
      supportsStreaming: true,
      supportsVision: false,
      supportsTools: false,
      maxTokens,
      maxContextLength,
      supportedModels: this.models.map(m => m.name),
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
    return 0;
  }

  protected async *createStream(
    prompt: string,
    options: GenerationOptions,
    requestId: string
  ): AsyncIterable<StreamChunk> {
    const requestBody = {
      model: options.model || this.config.defaultModel,
      prompt,
      stream: true,
      options: {
        temperature: options.temperature,
        top_p: options.topP,
        num_predict: options.maxTokens || 4000,
        stop: Array.isArray(options.stop) ? options.stop : (options.stop ? [options.stop] : undefined)
      }
    };

    const response = await this.makeRequest('/api/generate', 'POST', requestBody);
    
    if (!response.ok) {
      const errorData = await response.json() as OllamaError;
      throw this.createProviderError(errorData, requestId);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let totalTokens = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed: OllamaStreamResponse = JSON.parse(line);
              
              if (parsed.response) {
                const delta = parsed.response;
                content += delta;
                totalTokens += 1;
                
                yield {
                  content,
                  delta,
                  usage: {
                    promptTokens: parsed.prompt_eval_count || 0,
                    completionTokens: parsed.eval_count || totalTokens,
                    totalTokens: (parsed.prompt_eval_count || 0) + (parsed.eval_count || totalTokens)
                  }
                };
              }
              
              if (parsed.done) {
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
    const requestBody = {
      model: options.model || this.config.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature,
        top_p: options.topP,
        num_predict: options.maxTokens || 4000,
        stop: Array.isArray(options.stop) ? options.stop : (options.stop ? [options.stop] : undefined)
      }
    };

    const startTime = Date.now();
    const response = await this.makeRequest('/api/generate', 'POST', requestBody);
    
    if (!response.ok) {
      const errorData = await response.json() as OllamaError;
      throw this.createProviderError(errorData, requestId);
    }

    const data: OllamaCompletionResponse = await response.json();
    const endTime = Date.now();
    
    const usage: TokenUsage = {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    };

    const metrics: GenerationMetrics = {
      startTime,
      endTime,
      duration: endTime - startTime,
      tokenUsage: usage,
      cost: 0,
      latencyToFirstToken: data.load_duration ? Math.round(data.load_duration / 1000000) : undefined,
      tokensPerSecond: data.eval_duration ? (data.eval_count || 0) / (data.eval_duration / 1000000000) : undefined
    };

    return {
      content: data.response,
      usage,
      metrics,
      model: data.model,
      finishReason: 'stop'
    };
  }

  private getModelCapabilities(modelName: string): { contextLength: number; maxTokens: number } {
    const family = Object.keys(MODEL_FAMILIES).find(f => 
      modelName.toLowerCase().includes(f.toLowerCase())
    ) || 'default';
    
    return MODEL_FAMILIES[family as keyof typeof MODEL_FAMILIES];
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    if (this.config.apiKey && this.config.apiKey !== '') {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 60000)
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
      
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        throw new Error(`Cannot connect to Ollama at ${this.baseURL}. Make sure Ollama is running.`);
      }
      
      throw error;
    }
  }

  private createProviderError(errorData: OllamaError, requestId: string): ProviderError {
    const error = new Error(errorData.error || 'Ollama API error') as ProviderError;
    
    error.code = 'OLLAMA_ERROR';
    error.provider = this.name;
    error.requestId = requestId;
    
    const message = (errorData.error || '').toLowerCase();
    error.retryable = (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('temporarily unavailable')
    );
    
    if (message.includes('model') && message.includes('not found')) {
      error.retryable = false;
    }
    
    return error;
  }

  public async listAvailableModels(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/api/tags', 'GET');
      const data = await response.json();
      return (data.models || []).map((model: OllamaModel) => model.name);
    } catch (error) {
      return [];
    }
  }

  public async pullModel(modelName: string): Promise<void> {
    const requestBody = {
      name: modelName,
      stream: false
    };

    const response = await this.makeRequest('/api/pull', 'POST', requestBody);
    
    if (!response.ok) {
      const errorData = await response.json() as OllamaError;
      throw new Error(`Failed to pull model ${modelName}: ${errorData.error}`);
    }

    await this.setupProvider();
  }
}