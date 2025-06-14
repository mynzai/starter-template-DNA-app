import { EventEmitter } from 'events';

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  burstLimit?: number;
  windowSizeMs?: number;
  enableTokenBucket?: boolean;
  enableSlidingWindow?: boolean;
}

export interface RateLimitStatus {
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitError extends Error {
  type: 'requests' | 'tokens';
  limitType: 'per_minute' | 'burst';
  retryAfter: number;
  resetTime: number;
}

export interface RequestInfo {
  id: string;
  estimatedTokens: number;
  priority?: number;
  userId?: string;
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  public tryConsume(tokens: number): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  public getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  public getTimeUntilTokens(tokens: number): number {
    this.refill();
    
    if (this.tokens >= tokens) {
      return 0;
    }
    
    const needed = tokens - this.tokens;
    return Math.ceil(needed / this.refillRate);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

export class SlidingWindowCounter {
  private windows: Map<number, number> = new Map();
  private readonly windowSizeMs: number;
  private readonly limit: number;

  constructor(limit: number, windowSizeMs: number = 60000) {
    this.limit = limit;
    this.windowSizeMs = windowSizeMs;
  }

  public tryIncrement(amount: number = 1): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowSizeMs) * this.windowSizeMs;
    
    this.cleanup(now);
    
    const currentUsage = this.getCurrentUsage(now);
    
    if (currentUsage + amount <= this.limit) {
      const current = this.windows.get(windowStart) || 0;
      this.windows.set(windowStart, current + amount);
      return true;
    }
    
    return false;
  }

  public getCurrentUsage(now: number = Date.now()): number {
    const windowStart = Math.floor(now / this.windowSizeMs) * this.windowSizeMs;
    const previousWindowStart = windowStart - this.windowSizeMs;
    
    const currentWindow = this.windows.get(windowStart) || 0;
    const previousWindow = this.windows.get(previousWindowStart) || 0;
    
    // Calculate weighted usage based on time within current window
    const timeIntoWindow = now - windowStart;
    const weightForPrevious = Math.max(0, (this.windowSizeMs - timeIntoWindow) / this.windowSizeMs);
    
    return currentWindow + (previousWindow * weightForPrevious);
  }

  public getRemainingCapacity(now: number = Date.now()): number {
    return Math.max(0, this.limit - this.getCurrentUsage(now));
  }

  public getResetTime(now: number = Date.now()): number {
    const windowStart = Math.floor(now / this.windowSizeMs) * this.windowSizeMs;
    return windowStart + this.windowSizeMs;
  }

  private cleanup(now: number): void {
    const cutoff = now - (this.windowSizeMs * 2);
    
    for (const [windowStart] of this.windows) {
      if (windowStart < cutoff) {
        this.windows.delete(windowStart);
      }
    }
  }
}

export class RateLimiter extends EventEmitter {
  private readonly providerId: string;
  private readonly config: RateLimitConfig;
  private readonly requestCounter: SlidingWindowCounter;
  private readonly tokenCounter: SlidingWindowCounter;
  private readonly requestBucket?: TokenBucket;
  private readonly tokenBucket?: TokenBucket;

  constructor(providerId: string, config: RateLimitConfig) {
    super();
    
    this.providerId = providerId;
    this.config = {
      windowSizeMs: 60000, // 1 minute
      enableTokenBucket: true,
      enableSlidingWindow: true,
      ...config
    };

    // Initialize counters
    this.requestCounter = new SlidingWindowCounter(
      this.config.requestsPerMinute,
      this.config.windowSizeMs!
    );
    
    this.tokenCounter = new SlidingWindowCounter(
      this.config.tokensPerMinute,
      this.config.windowSizeMs!
    );

    // Initialize token buckets if enabled
    if (this.config.enableTokenBucket) {
      const requestRefillRate = this.config.requestsPerMinute / (this.config.windowSizeMs! / 1000);
      const tokenRefillRate = this.config.tokensPerMinute / (this.config.windowSizeMs! / 1000);
      
      this.requestBucket = new TokenBucket(
        this.config.burstLimit || this.config.requestsPerMinute,
        requestRefillRate / 1000 // per millisecond
      );
      
      this.tokenBucket = new TokenBucket(
        this.config.burstLimit || Math.floor(this.config.tokensPerMinute * 0.1),
        tokenRefillRate / 1000 // per millisecond
      );
    }
  }

  public async acquire(requestInfo: RequestInfo): Promise<void> {
    const now = Date.now();
    
    // Check if request can be made immediately
    const canMakeRequest = this.canMakeRequest(requestInfo, now);
    
    if (canMakeRequest.allowed) {
      this.consumeCapacity(requestInfo, now);
      
      this.emit('request:allowed', {
        providerId: this.providerId,
        requestId: requestInfo.id,
        tokensUsed: requestInfo.estimatedTokens,
        status: this.getStatus(now)
      });
      
      return;
    }

    // Calculate retry delay
    const retryAfter = this.calculateRetryDelay(requestInfo, now);
    
    const error: RateLimitError = new Error(
      `Rate limit exceeded for ${this.providerId}. ${canMakeRequest.reason}`
    ) as RateLimitError;
    
    error.type = canMakeRequest.limitType;
    error.limitType = 'per_minute';
    error.retryAfter = retryAfter;
    error.resetTime = this.getNextResetTime(now);

    this.emit('request:rejected', {
      providerId: this.providerId,
      requestId: requestInfo.id,
      reason: canMakeRequest.reason,
      retryAfter,
      status: this.getStatus(now)
    });

    throw error;
  }

  public canMakeRequest(
    requestInfo: RequestInfo,
    now: number = Date.now()
  ): { allowed: boolean; reason?: string; limitType?: 'requests' | 'tokens' } {
    // Check request limits
    if (this.config.enableSlidingWindow) {
      if (!this.requestCounter.tryIncrement(0)) { // Test without incrementing
        return {
          allowed: false,
          reason: `Request limit exceeded: ${this.config.requestsPerMinute} requests per minute`,
          limitType: 'requests'
        };
      }
    }

    if (this.config.enableTokenBucket && this.requestBucket) {
      if (!this.requestBucket.tryConsume(0)) { // Test without consuming
        return {
          allowed: false,
          reason: 'Request burst limit exceeded',
          limitType: 'requests'
        };
      }
    }

    // Check token limits
    if (this.config.enableSlidingWindow) {
      if (!this.tokenCounter.tryIncrement(0)) { // Test without incrementing
        return {
          allowed: false,
          reason: `Token limit exceeded: ${this.config.tokensPerMinute} tokens per minute`,
          limitType: 'tokens'
        };
      }
    }

    if (this.config.enableTokenBucket && this.tokenBucket) {
      if (!this.tokenBucket.tryConsume(0)) { // Test without consuming
        return {
          allowed: false,
          reason: 'Token burst limit exceeded',
          limitType: 'tokens'
        };
      }
    }

    return { allowed: true };
  }

  public getStatus(now: number = Date.now()): RateLimitStatus {
    const requestsRemaining = this.config.enableSlidingWindow
      ? this.requestCounter.getRemainingCapacity(now)
      : (this.requestBucket?.getAvailableTokens() || this.config.requestsPerMinute);

    const tokensRemaining = this.config.enableSlidingWindow
      ? this.tokenCounter.getRemainingCapacity(now)
      : (this.tokenBucket?.getAvailableTokens() || this.config.tokensPerMinute);

    const resetTime = this.getNextResetTime(now);

    return {
      requestsRemaining: Math.floor(requestsRemaining),
      tokensRemaining: Math.floor(tokensRemaining),
      resetTime
    };
  }

  private consumeCapacity(requestInfo: RequestInfo, now: number): void {
    // Consume from sliding window counters
    if (this.config.enableSlidingWindow) {
      this.requestCounter.tryIncrement(1);
      this.tokenCounter.tryIncrement(requestInfo.estimatedTokens);
    }

    // Consume from token buckets
    if (this.config.enableTokenBucket) {
      this.requestBucket?.tryConsume(1);
      this.tokenBucket?.tryConsume(requestInfo.estimatedTokens);
    }
  }

  private calculateRetryDelay(requestInfo: RequestInfo, now: number): number {
    const delays: number[] = [];

    // Calculate delay based on sliding window
    if (this.config.enableSlidingWindow) {
      const requestResetTime = this.requestCounter.getResetTime(now);
      const tokenResetTime = this.tokenCounter.getResetTime(now);
      
      delays.push(requestResetTime - now);
      delays.push(tokenResetTime - now);
    }

    // Calculate delay based on token buckets
    if (this.config.enableTokenBucket) {
      if (this.requestBucket) {
        delays.push(this.requestBucket.getTimeUntilTokens(1));
      }
      
      if (this.tokenBucket) {
        delays.push(this.tokenBucket.getTimeUntilTokens(requestInfo.estimatedTokens));
      }
    }

    return Math.max(...delays, 1000); // Minimum 1 second delay
  }

  private getNextResetTime(now: number): number {
    const windowStart = Math.floor(now / this.config.windowSizeMs!) * this.config.windowSizeMs!;
    return windowStart + this.config.windowSizeMs!;
  }
}

export class ProviderRateLimitManager extends EventEmitter {
  private rateLimiters = new Map<string, RateLimiter>();
  private globalLimiter?: RateLimiter;

  constructor() {
    super();
  }

  public registerProvider(providerId: string, config: RateLimitConfig): void {
    const limiter = new RateLimiter(providerId, config);
    
    limiter.on('request:allowed', (data) => {
      this.emit('request:allowed', data);
    });
    
    limiter.on('request:rejected', (data) => {
      this.emit('request:rejected', data);
    });
    
    this.rateLimiters.set(providerId, limiter);
  }

  public setGlobalLimits(config: RateLimitConfig): void {
    this.globalLimiter = new RateLimiter('global', config);
    
    this.globalLimiter.on('request:allowed', (data) => {
      this.emit('global:allowed', data);
    });
    
    this.globalLimiter.on('request:rejected', (data) => {
      this.emit('global:rejected', data);
    });
  }

  public async acquire(providerId: string, requestInfo: RequestInfo): Promise<void> {
    // Check global limits first
    if (this.globalLimiter) {
      await this.globalLimiter.acquire(requestInfo);
    }

    // Then check provider-specific limits
    const limiter = this.rateLimiters.get(providerId);
    if (!limiter) {
      throw new Error(`No rate limiter configured for provider: ${providerId}`);
    }

    await limiter.acquire(requestInfo);
  }

  public getProviderStatus(providerId: string): RateLimitStatus | null {
    const limiter = this.rateLimiters.get(providerId);
    return limiter ? limiter.getStatus() : null;
  }

  public getGlobalStatus(): RateLimitStatus | null {
    return this.globalLimiter ? this.globalLimiter.getStatus() : null;
  }

  public getAllStatuses(): Record<string, RateLimitStatus> {
    const statuses: Record<string, RateLimitStatus> = {};
    
    for (const [providerId, limiter] of this.rateLimiters) {
      statuses[providerId] = limiter.getStatus();
    }
    
    if (this.globalLimiter) {
      statuses.global = this.globalLimiter.getStatus();
    }
    
    return statuses;
  }

  public canMakeRequest(
    providerId: string,
    requestInfo: RequestInfo
  ): { allowed: boolean; reason?: string; limitType?: 'requests' | 'tokens' } {
    // Check global limits first
    if (this.globalLimiter) {
      const globalCheck = this.globalLimiter.canMakeRequest(requestInfo);
      if (!globalCheck.allowed) {
        return globalCheck;
      }
    }

    // Then check provider-specific limits
    const limiter = this.rateLimiters.get(providerId);
    if (!limiter) {
      return { allowed: false, reason: `No rate limiter configured for provider: ${providerId}` };
    }

    return limiter.canMakeRequest(requestInfo);
  }
}