import { EventEmitter } from 'events';
import { RequestInfo, RateLimitStatus } from './rate-limiter';

export interface QueuedRequest {
  requestInfo: RequestInfo;
  promise: {
    resolve: (value: void) => void;
    reject: (error: Error) => void;
  };
  timestamp: number;
  retries: number;
  priority: number;
  timeoutId?: NodeJS.Timeout;
}

export interface QueueConfig {
  maxSize: number;
  processingConcurrency: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  priorityLevels: number;
  enableBackpressure: boolean;
}

export interface QueueMetrics {
  totalRequests: number;
  processedRequests: number;
  failedRequests: number;
  currentSize: number;
  avgWaitTime: number;
  avgProcessingTime: number;
  throughputPerSecond: number;
}

export class PriorityRequestQueue extends EventEmitter {
  private queues: Map<number, QueuedRequest[]> = new Map();
  private processing = new Set<string>();
  private config: QueueConfig;
  private metrics: QueueMetrics;
  private startTime: number;

  constructor(config: Partial<QueueConfig> = {}) {
    super();
    
    this.config = {
      maxSize: 1000,
      processingConcurrency: 10,
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      priorityLevels: 5,
      enableBackpressure: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();

    // Initialize priority queues
    for (let i = 0; i < this.config.priorityLevels; i++) {
      this.queues.set(i, []);
    }
  }

  public async enqueue(requestInfo: RequestInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const priority = this.normalizePriority(requestInfo.priority || 0);
      
      // Check queue capacity
      if (this.getTotalQueueSize() >= this.config.maxSize) {
        if (this.config.enableBackpressure) {
          this.handleBackpressure();
        }
        reject(new Error('Queue is full'));
        return;
      }

      const queuedRequest: QueuedRequest = {
        requestInfo,
        promise: { resolve, reject },
        timestamp: Date.now(),
        retries: 0,
        priority,
        timeoutId: setTimeout(() => {
          this.handleTimeout(queuedRequest);
        }, this.config.timeoutMs)
      };

      // Add to appropriate priority queue
      const queue = this.queues.get(priority)!;
      queue.push(queuedRequest);
      
      this.metrics.totalRequests++;
      
      this.emit('request:queued', {
        requestId: requestInfo.id,
        priority,
        queueSize: this.getTotalQueueSize(),
        position: this.getRequestPosition(queuedRequest)
      });

      // Process queue if not at capacity
      this.processQueue();
    });
  }

  public getMetrics(): QueueMetrics {
    const now = Date.now();
    const elapsedSeconds = (now - this.startTime) / 1000;
    
    return {
      ...this.metrics,
      currentSize: this.getTotalQueueSize(),
      throughputPerSecond: elapsedSeconds > 0 ? this.metrics.processedRequests / elapsedSeconds : 0
    };
  }

  public getQueueStatus(): Record<number, number> {
    const status: Record<number, number> = {};
    
    for (const [priority, queue] of this.queues) {
      status[priority] = queue.length;
    }
    
    return status;
  }

  public async clear(): Promise<void> {
    // Cancel all pending requests
    for (const queue of this.queues.values()) {
      for (const request of queue) {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        request.promise.reject(new Error('Queue cleared'));
      }
      queue.length = 0;
    }

    this.processing.clear();
    
    this.emit('queue:cleared', {
      clearedRequests: this.metrics.totalRequests - this.metrics.processedRequests - this.metrics.failedRequests
    });
  }

  public async pause(): Promise<void> {
    this.emit('queue:paused');
  }

  public async resume(): Promise<void> {
    this.emit('queue:resumed');
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    // Check if we can process more requests
    if (this.processing.size >= this.config.processingConcurrency) {
      return;
    }

    const request = this.getNextRequest();
    if (!request) {
      return;
    }

    // Mark as processing
    this.processing.add(request.requestInfo.id);
    
    try {
      const startTime = Date.now();
      
      this.emit('request:processing', {
        requestId: request.requestInfo.id,
        priority: request.priority,
        waitTime: startTime - request.timestamp
      });

      // Clear timeout since we're processing
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }

      // Process the request (resolve the promise to allow the request to proceed)
      request.promise.resolve();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const waitTime = startTime - request.timestamp;
      
      this.updateMetrics(true, waitTime, processingTime);
      
      this.emit('request:completed', {
        requestId: request.requestInfo.id,
        priority: request.priority,
        waitTime,
        processingTime
      });

    } catch (error) {
      await this.handleRequestError(request, error as Error);
    } finally {
      this.processing.delete(request.requestInfo.id);
      
      // Process next request
      setImmediate(() => this.processQueue());
    }
  }

  private getNextRequest(): QueuedRequest | null {
    // Process from highest to lowest priority
    for (let priority = this.config.priorityLevels - 1; priority >= 0; priority--) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    
    return null;
  }

  private async handleRequestError(request: QueuedRequest, error: Error): Promise<void> {
    request.retries++;
    
    if (request.retries <= this.config.maxRetries) {
      // Retry request
      const delay = this.config.retryDelayMs * Math.pow(2, request.retries - 1);
      
      setTimeout(() => {
        const queue = this.queues.get(request.priority)!;
        queue.unshift(request); // Put back at front of its priority queue
        this.processQueue();
      }, delay);
      
      this.emit('request:retry', {
        requestId: request.requestInfo.id,
        attempt: request.retries,
        delay,
        error: error.message
      });
      
    } else {
      // Max retries exceeded
      request.promise.reject(error);
      this.updateMetrics(false, Date.now() - request.timestamp, 0);
      
      this.emit('request:failed', {
        requestId: request.requestInfo.id,
        priority: request.priority,
        retries: request.retries,
        error: error.message
      });
    }
  }

  private handleTimeout(request: QueuedRequest): void {
    // Remove from queue if still there
    for (const queue of this.queues.values()) {
      const index = queue.indexOf(request);
      if (index >= 0) {
        queue.splice(index, 1);
        break;
      }
    }

    request.promise.reject(new Error('Request timeout in queue'));
    this.updateMetrics(false, Date.now() - request.timestamp, 0);
    
    this.emit('request:timeout', {
      requestId: request.requestInfo.id,
      priority: request.priority,
      waitTime: Date.now() - request.timestamp
    });
  }

  private handleBackpressure(): void {
    // Remove lowest priority requests first
    for (let priority = 0; priority < this.config.priorityLevels; priority++) {
      const queue = this.queues.get(priority)!;
      
      if (queue.length > 0) {
        const removed = queue.shift()!;
        
        if (removed.timeoutId) {
          clearTimeout(removed.timeoutId);
        }
        
        removed.promise.reject(new Error('Request dropped due to backpressure'));
        
        this.emit('request:dropped', {
          requestId: removed.requestInfo.id,
          priority: removed.priority,
          reason: 'backpressure'
        });
        
        break;
      }
    }
  }

  private getTotalQueueSize(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  private getRequestPosition(request: QueuedRequest): number {
    let position = 0;
    
    // Count requests in higher priority queues
    for (let p = this.config.priorityLevels - 1; p > request.priority; p--) {
      position += this.queues.get(p)!.length;
    }
    
    // Count requests before this one in same priority queue
    const queue = this.queues.get(request.priority)!;
    const index = queue.indexOf(request);
    if (index >= 0) {
      position += index;
    }
    
    return position + 1; // 1-based position
  }

  private normalizePriority(priority: number): number {
    return Math.max(0, Math.min(this.config.priorityLevels - 1, Math.floor(priority)));
  }

  private updateMetrics(success: boolean, waitTime: number, processingTime: number): void {
    if (success) {
      this.metrics.processedRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update rolling averages
    const totalCompleted = this.metrics.processedRequests + this.metrics.failedRequests;
    
    this.metrics.avgWaitTime = (
      (this.metrics.avgWaitTime * (totalCompleted - 1) + waitTime) / totalCompleted
    );
    
    if (success) {
      this.metrics.avgProcessingTime = (
        (this.metrics.avgProcessingTime * (this.metrics.processedRequests - 1) + processingTime) / this.metrics.processedRequests
      );
    }
  }

  private initializeMetrics(): QueueMetrics {
    return {
      totalRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      currentSize: 0,
      avgWaitTime: 0,
      avgProcessingTime: 0,
      throughputPerSecond: 0
    };
  }
}

export class CircuitBreaker extends EventEmitter {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private monitoringPeriod: number = 300000 // 5 minutes
  ) {
    super();
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        this.emit('state:half-open');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  public getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  public getMetrics(): { state: string; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.emit('state:closed');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.emit('state:open', {
        failureCount: this.failureCount,
        threshold: this.threshold
      });
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
    this.emit('state:reset');
  }
}