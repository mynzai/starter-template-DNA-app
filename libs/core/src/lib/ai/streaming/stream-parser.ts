import { EventEmitter } from 'events';
import { StreamChunk, ProviderError } from '../llm-provider';

export interface StreamParserOptions {
  timeout?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  bufferSize?: number;
  enableMetrics?: boolean;
}

export interface StreamMetrics {
  startTime: number;
  endTime?: number;
  totalChunks: number;
  totalTokens: number;
  errorCount: number;
  reconnectCount: number;
  timeToFirstToken?: number;
  avgChunkSize: number;
  throughputTokensPerSecond: number;
}

export interface StreamError extends Error {
  type: 'connection' | 'timeout' | 'parse' | 'interrupt' | 'unknown';
  recoverable: boolean;
  retryAfter?: number;
}

export class StreamParser extends EventEmitter {
  private options: Required<StreamParserOptions>;
  private metrics: StreamMetrics;
  private buffer: string = '';
  private isActive: boolean = false;
  private timeoutId?: NodeJS.Timeout;
  private abortController?: AbortController;

  constructor(options: StreamParserOptions = {}) {
    super();
    
    this.options = {
      timeout: 30000,
      reconnectAttempts: 3,
      reconnectDelay: 1000,
      bufferSize: 8192,
      enableMetrics: true,
      ...options
    };

    this.metrics = this.initializeMetrics();
  }

  public async parseStream(
    streamSource: () => Promise<AsyncIterable<Uint8Array>>,
    parseChunk: (data: string) => StreamChunk | null
  ): Promise<AsyncIterable<StreamChunk>> {
    return this.createParsedStream(streamSource, parseChunk);
  }

  private async *createParsedStream(
    streamSource: () => Promise<AsyncIterable<Uint8Array>>,
    parseChunk: (data: string) => StreamChunk | null
  ): AsyncIterable<StreamChunk> {
    this.metrics = this.initializeMetrics();
    this.isActive = true;
    let reconnectAttempts = 0;

    while (this.isActive && reconnectAttempts <= this.options.reconnectAttempts) {
      try {
        this.emit('stream:started', { attempt: reconnectAttempts + 1 });
        
        const stream = await streamSource();
        const decoder = new TextDecoder();
        
        this.setupTimeout();
        
        for await (const chunk of stream) {
          if (!this.isActive) {
            this.emit('stream:stopped', { reason: 'manual' });
            return;
          }

          try {
            this.resetTimeout();
            
            const text = decoder.decode(chunk, { stream: true });
            this.buffer += text;

            if (this.buffer.length > this.options.bufferSize) {
              this.emit('stream:buffer_overflow', { bufferSize: this.buffer.length });
              this.buffer = this.buffer.slice(-this.options.bufferSize);
            }

            const parsedChunks = this.processBuffer(parseChunk);
            
            for (const parsedChunk of parsedChunks) {
              this.updateMetrics(parsedChunk);
              
              if (this.options.enableMetrics) {
                parsedChunk.metrics = this.getCurrentMetrics();
              }
              
              yield parsedChunk;
            }

          } catch (error) {
            this.handleParseError(error as Error);
          }
        }

        this.clearTimeout();
        this.emit('stream:completed', { metrics: this.getMetrics() });
        return;

      } catch (error) {
        reconnectAttempts++;
        this.metrics.errorCount++;
        
        const streamError = this.createStreamError(error as Error);
        this.emit('stream:error', { error: streamError, attempt: reconnectAttempts });

        if (!streamError.recoverable || reconnectAttempts > this.options.reconnectAttempts) {
          this.emit('stream:failed', { 
            error: streamError, 
            totalAttempts: reconnectAttempts,
            metrics: this.getMetrics()
          });
          throw streamError;
        }

        this.metrics.reconnectCount++;
        this.emit('stream:reconnecting', { 
          attempt: reconnectAttempts, 
          delay: this.options.reconnectDelay 
        });
        
        await this.delay(this.options.reconnectDelay * Math.pow(2, reconnectAttempts - 1));
      }
    }
  }

  private processBuffer(parseChunk: (data: string) => StreamChunk | null): StreamChunk[] {
    const chunks: StreamChunk[] = [];
    const lines = this.buffer.split('\n');
    
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsed = parseChunk(line.trim());
          if (parsed) {
            chunks.push(parsed);
          }
        } catch (error) {
          this.emit('stream:parse_error', { 
            line: line.substring(0, 100),
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return chunks;
  }

  private setupTimeout(): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      this.handleTimeout();
    }, this.options.timeout);
  }

  private resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.setupTimeout();
    }
  }

  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private handleTimeout(): void {
    this.emit('stream:timeout', { 
      timeout: this.options.timeout,
      metrics: this.getMetrics()
    });
    
    this.stop('timeout');
  }

  private handleParseError(error: Error): void {
    this.metrics.errorCount++;
    
    const streamError: StreamError = {
      ...error,
      type: 'parse',
      recoverable: true
    };

    this.emit('stream:parse_error', { 
      error: streamError,
      buffer: this.buffer.substring(0, 200)
    });
  }

  private createStreamError(error: Error): StreamError {
    const streamError = error as StreamError;
    
    if (!streamError.type) {
      if (error.message.includes('timeout')) {
        streamError.type = 'timeout';
        streamError.recoverable = true;
      } else if (error.message.includes('connection') || error.message.includes('network')) {
        streamError.type = 'connection';
        streamError.recoverable = true;
      } else if (error.message.includes('abort')) {
        streamError.type = 'interrupt';
        streamError.recoverable = false;
      } else {
        streamError.type = 'unknown';
        streamError.recoverable = true;
      }
    }

    if (error.message.includes('rate limit')) {
      streamError.recoverable = true;
      const retryMatch = error.message.match(/try again in (\d+)/);
      if (retryMatch) {
        streamError.retryAfter = parseInt(retryMatch[1]) * 1000;
      }
    }

    return streamError;
  }

  private updateMetrics(chunk: StreamChunk): void {
    if (!this.options.enableMetrics) return;

    this.metrics.totalChunks++;
    
    if (chunk.usage?.totalTokens) {
      this.metrics.totalTokens += chunk.usage.totalTokens;
    } else if (chunk.delta) {
      this.metrics.totalTokens += Math.ceil(chunk.delta.length / 4);
    }

    if (this.metrics.timeToFirstToken === undefined && chunk.delta) {
      this.metrics.timeToFirstToken = Date.now() - this.metrics.startTime;
      this.emit('stream:first_token', { 
        latency: this.metrics.timeToFirstToken,
        content: chunk.delta.substring(0, 50)
      });
    }

    const currentTime = Date.now();
    const duration = (currentTime - this.metrics.startTime) / 1000;
    
    if (duration > 0) {
      this.metrics.throughputTokensPerSecond = this.metrics.totalTokens / duration;
    }

    if (this.metrics.totalChunks > 0) {
      this.metrics.avgChunkSize = this.metrics.totalTokens / this.metrics.totalChunks;
    }
  }

  private getCurrentMetrics(): Partial<StreamMetrics> {
    return {
      totalChunks: this.metrics.totalChunks,
      totalTokens: this.metrics.totalTokens,
      timeToFirstToken: this.metrics.timeToFirstToken,
      throughputTokensPerSecond: this.metrics.throughputTokensPerSecond,
      avgChunkSize: this.metrics.avgChunkSize
    };
  }

  private initializeMetrics(): StreamMetrics {
    return {
      startTime: Date.now(),
      totalChunks: 0,
      totalTokens: 0,
      errorCount: 0,
      reconnectCount: 0,
      avgChunkSize: 0,
      throughputTokensPerSecond: 0
    };
  }

  public getMetrics(): StreamMetrics {
    return {
      ...this.metrics,
      endTime: this.metrics.endTime || Date.now()
    };
  }

  public stop(reason: string = 'manual'): void {
    this.isActive = false;
    this.clearTimeout();
    
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.metrics.endTime = Date.now();
    this.emit('stream:stopped', { reason, metrics: this.getMetrics() });
  }

  public isStreamActive(): boolean {
    return this.isActive;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static createOpenAIParser(): (data: string) => StreamChunk | null {
    return (line: string) => {
      if (!line.startsWith('data: ')) return null;
      
      const data = line.slice(6);
      if (data === '[DONE]') return null;
      
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content || '';
        
        if (!delta) return null;
        
        return {
          content: '',
          delta,
          usage: parsed.usage ? {
            promptTokens: parsed.usage.prompt_tokens || 0,
            completionTokens: parsed.usage.completion_tokens || 0,
            totalTokens: parsed.usage.total_tokens || 0
          } : undefined,
          finishReason: parsed.choices?.[0]?.finish_reason
        };
      } catch {
        return null;
      }
    };
  }

  public static createAnthropicParser(): (data: string) => StreamChunk | null {
    let content = '';
    
    return (line: string) => {
      if (!line.startsWith('data: ')) return null;
      
      const data = line.slice(6);
      
      try {
        const parsed = JSON.parse(data);
        
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          const delta = parsed.delta.text;
          content += delta;
          
          return {
            content,
            delta,
            usage: parsed.usage ? {
              promptTokens: parsed.usage.input_tokens || 0,
              completionTokens: parsed.usage.output_tokens || 0,
              totalTokens: (parsed.usage.input_tokens || 0) + (parsed.usage.output_tokens || 0)
            } : undefined,
            finishReason: parsed.delta.stop_reason
          };
        }
        
        return null;
      } catch {
        return null;
      }
    };
  }

  public static createOllamaParser(): (data: string) => StreamChunk | null {
    let content = '';
    
    return (line: string) => {
      try {
        const parsed = JSON.parse(line);
        
        if (parsed.response) {
          const delta = parsed.response;
          content += delta;
          
          return {
            content,
            delta,
            usage: {
              promptTokens: parsed.prompt_eval_count || 0,
              completionTokens: parsed.eval_count || 0,
              totalTokens: (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0)
            },
            finishReason: parsed.done ? 'stop' : undefined
          };
        }
        
        return null;
      } catch {
        return null;
      }
    };
  }
}