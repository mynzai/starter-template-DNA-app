import { EventEmitter } from 'events';
import {
  LLMProvider,
  AIRequest,
  AIResponse,
  StreamChunk,
  ProviderConfig,
  ProviderError,
  GenerationOptions,
  ProviderCapabilities
} from './llm-provider';

export interface AIServiceConfig {
  defaultProvider?: string;
  fallbackProviders?: string[];
  loadBalancing?: {
    strategy: 'round-robin' | 'least-loaded' | 'cost-optimized' | 'latency-optimized';
    enableFailover: boolean;
    maxRetries: number;
    retryDelayMs: number;
  };
  globalRateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  costLimits?: {
    dailyBudget: number;
    monthlyBudget: number;
    alertThreshold: number;
  };
}

export interface ProviderHealth {
  isHealthy: boolean;
  errorRate: number;
  avgLatency: number;
  lastError?: string;
  lastHealthCheck: number;
}

export interface LoadBalancingMetrics {
  provider: string;
  requestCount: number;
  totalLatency: number;
  errorCount: number;
  totalCost: number;
  lastUsed: number;
}

export class AIService extends EventEmitter {
  private providers = new Map<string, LLMProvider>();
  private config: AIServiceConfig;
  private metrics = new Map<string, LoadBalancingMetrics>();
  private health = new Map<string, ProviderHealth>();
  private currentProviderIndex = 0;
  private initialized = false;

  constructor(config: AIServiceConfig = {}) {
    super();
    this.config = {
      loadBalancing: {
        strategy: 'round-robin',
        enableFailover: true,
        maxRetries: 3,
        retryDelayMs: 1000
      },
      ...config
    };
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.providers.size === 0) {
      throw new Error('No providers registered. Add providers before initializing.');
    }

    const initPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        await provider.initialize();
        this.initializeProviderMetrics(provider.name);
        this.updateProviderHealth(provider.name, true);
      } catch (error) {
        this.updateProviderHealth(provider.name, false, error instanceof Error ? error.message : String(error));
        this.emit('provider:initialization_failed', {
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.allSettled(initPromises);

    const healthyProviders = Array.from(this.health.values()).filter(h => h.isHealthy);
    if (healthyProviders.length === 0) {
      throw new Error('No providers successfully initialized');
    }

    this.initialized = true;
    this.emit('service:initialized', {
      totalProviders: this.providers.size,
      healthyProviders: healthyProviders.length
    });
  }

  public registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
    this.initializeProviderMetrics(provider.name);

    provider.on('generation:started', (data) => {
      this.emit('generation:started', { ...data, service: 'ai-service' });
    });

    provider.on('generation:completed', (data) => {
      this.updateMetrics(provider.name, data);
      this.emit('generation:completed', { ...data, service: 'ai-service' });
    });

    provider.on('generation:failed', (data) => {
      this.updateErrorMetrics(provider.name);
      this.updateProviderHealth(provider.name, false, data.error);
      this.emit('generation:failed', { ...data, service: 'ai-service' });
    });

    if (!this.config.defaultProvider) {
      this.config.defaultProvider = provider.name;
    }
  }

  public async generate(request: AIRequest): Promise<AIResponse> {
    this.ensureInitialized();

    const provider = await this.selectProvider(request);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= (this.config.loadBalancing?.maxRetries || 3); attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.config.loadBalancing?.retryDelayMs || 1000);
        }

        const startTime = Date.now();
        const response = await provider.generateCompletion(request.prompt, request.options);

        this.updateMetrics(provider.name, {
          provider: provider.name,
          requestId: response.requestId,
          usage: response.usage,
          metrics: {
            ...response.metrics,
            startTime,
            endTime: Date.now()
          }
        });

        this.updateProviderHealth(provider.name, true);
        return response;

      } catch (error) {
        lastError = error as Error;
        this.updateErrorMetrics(provider.name);
        
        const providerError = error as ProviderError;
        
        if (!providerError.retryable || attempt === (this.config.loadBalancing?.maxRetries || 3)) {
          break;
        }

        if (this.config.loadBalancing?.enableFailover && attempt < (this.config.loadBalancing?.maxRetries || 3)) {
          const fallbackProvider = await this.selectFallbackProvider(provider.name, request);
          if (fallbackProvider) {
            provider = fallbackProvider;
            continue;
          }
        }
      }
    }

    throw lastError || new Error('Generation failed after all retries');
  }

  public async generateStream(request: AIRequest): Promise<AsyncIterable<StreamChunk>> {
    this.ensureInitialized();

    const provider = await this.selectProvider(request);
    
    try {
      const stream = await provider.generateStream(request.prompt, request.options);
      return this.wrapStream(stream, provider.name);
    } catch (error) {
      this.updateErrorMetrics(provider.name);
      this.updateProviderHealth(provider.name, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public getProviderCapabilities(): Record<string, ProviderCapabilities> {
    const capabilities: Record<string, ProviderCapabilities> = {};
    
    for (const [name, provider] of this.providers) {
      capabilities[name] = provider.getCapabilities();
    }
    
    return capabilities;
  }

  public getMetrics(): Record<string, LoadBalancingMetrics> {
    const metricsObj: Record<string, LoadBalancingMetrics> = {};
    
    for (const [name, metrics] of this.metrics) {
      metricsObj[name] = { ...metrics };
    }
    
    return metricsObj;
  }

  public getHealth(): Record<string, ProviderHealth> {
    const healthObj: Record<string, ProviderHealth> = {};
    
    for (const [name, health] of this.health) {
      healthObj[name] = { ...health };
    }
    
    return healthObj;
  }

  public async estimateCost(request: AIRequest): Promise<Record<string, number>> {
    const costs: Record<string, number> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        costs[name] = await provider.estimateCost(request.prompt, request.options);
      } catch (error) {
        costs[name] = 0;
      }
    }
    
    return costs;
  }

  private async selectProvider(request: AIRequest): Promise<LLMProvider> {
    const strategy = this.config.loadBalancing?.strategy || 'round-robin';
    const healthyProviders = this.getHealthyProviders();

    if (healthyProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    let selectedProvider: string;

    switch (strategy) {
      case 'round-robin':
        selectedProvider = this.selectRoundRobin(healthyProviders);
        break;
      
      case 'least-loaded':
        selectedProvider = this.selectLeastLoaded(healthyProviders);
        break;
      
      case 'cost-optimized':
        selectedProvider = await this.selectCostOptimized(healthyProviders, request);
        break;
      
      case 'latency-optimized':
        selectedProvider = this.selectLatencyOptimized(healthyProviders);
        break;
      
      default:
        selectedProvider = healthyProviders[0];
    }

    const provider = this.providers.get(selectedProvider);
    if (!provider) {
      throw new Error(`Selected provider ${selectedProvider} not found`);
    }

    return provider;
  }

  private async selectFallbackProvider(failedProvider: string, request: AIRequest): Promise<LLMProvider | null> {
    const fallbackProviders = this.config.fallbackProviders || [];
    const healthyProviders = this.getHealthyProviders().filter(p => p !== failedProvider);

    for (const fallback of fallbackProviders) {
      if (healthyProviders.includes(fallback)) {
        const provider = this.providers.get(fallback);
        if (provider) return provider;
      }
    }

    if (healthyProviders.length > 0) {
      const provider = this.providers.get(healthyProviders[0]);
      if (provider) return provider;
    }

    return null;
  }

  private selectRoundRobin(providers: string[]): string {
    const provider = providers[this.currentProviderIndex % providers.length];
    this.currentProviderIndex++;
    return provider;
  }

  private selectLeastLoaded(providers: string[]): string {
    return providers.reduce((least, current) => {
      const leastMetrics = this.metrics.get(least);
      const currentMetrics = this.metrics.get(current);
      
      if (!leastMetrics) return current;
      if (!currentMetrics) return least;
      
      return currentMetrics.requestCount < leastMetrics.requestCount ? current : least;
    });
  }

  private async selectCostOptimized(providers: string[], request: AIRequest): Promise<string> {
    const costs: Array<{ provider: string; cost: number }> = [];
    
    for (const provider of providers) {
      try {
        const providerInstance = this.providers.get(provider);
        if (providerInstance) {
          const cost = await providerInstance.estimateCost(request.prompt, request.options);
          costs.push({ provider, cost });
        }
      } catch (error) {
        costs.push({ provider, cost: Infinity });
      }
    }
    
    costs.sort((a, b) => a.cost - b.cost);
    return costs[0]?.provider || providers[0];
  }

  private selectLatencyOptimized(providers: string[]): string {
    return providers.reduce((fastest, current) => {
      const fastestMetrics = this.metrics.get(fastest);
      const currentMetrics = this.metrics.get(current);
      
      if (!fastestMetrics || fastestMetrics.requestCount === 0) return current;
      if (!currentMetrics || currentMetrics.requestCount === 0) return fastest;
      
      const fastestAvgLatency = fastestMetrics.totalLatency / fastestMetrics.requestCount;
      const currentAvgLatency = currentMetrics.totalLatency / currentMetrics.requestCount;
      
      return currentAvgLatency < fastestAvgLatency ? current : fastest;
    });
  }

  private getHealthyProviders(): string[] {
    return Array.from(this.health.entries())
      .filter(([_, health]) => health.isHealthy)
      .map(([name, _]) => name);
  }

  private async *wrapStream(stream: AsyncIterable<StreamChunk>, providerName: string): AsyncIterable<StreamChunk> {
    const startTime = Date.now();
    let tokenCount = 0;
    
    try {
      for await (const chunk of stream) {
        tokenCount += chunk.usage?.totalTokens || 0;
        yield chunk;
      }
      
      const endTime = Date.now();
      this.updateMetrics(providerName, {
        provider: providerName,
        requestId: 'stream',
        usage: { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount },
        metrics: {
          startTime,
          endTime,
          duration: endTime - startTime,
          tokenUsage: { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount }
        }
      });
      
      this.updateProviderHealth(providerName, true);
    } catch (error) {
      this.updateErrorMetrics(providerName);
      this.updateProviderHealth(providerName, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private initializeProviderMetrics(providerName: string): void {
    this.metrics.set(providerName, {
      provider: providerName,
      requestCount: 0,
      totalLatency: 0,
      errorCount: 0,
      totalCost: 0,
      lastUsed: 0
    });

    this.health.set(providerName, {
      isHealthy: false,
      errorRate: 0,
      avgLatency: 0,
      lastHealthCheck: Date.now()
    });
  }

  private updateMetrics(providerName: string, data: any): void {
    const metrics = this.metrics.get(providerName);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.totalLatency += data.metrics?.duration || 0;
    metrics.totalCost += data.metrics?.cost || 0;
    metrics.lastUsed = Date.now();

    const health = this.health.get(providerName);
    if (health) {
      health.avgLatency = metrics.totalLatency / metrics.requestCount;
      health.errorRate = metrics.errorCount / metrics.requestCount;
    }
  }

  private updateErrorMetrics(providerName: string): void {
    const metrics = this.metrics.get(providerName);
    if (metrics) {
      metrics.errorCount++;
    }

    const health = this.health.get(providerName);
    if (health) {
      health.errorRate = metrics ? metrics.errorCount / metrics.requestCount : 1;
    }
  }

  private updateProviderHealth(providerName: string, isHealthy: boolean, error?: string): void {
    const health = this.health.get(providerName);
    if (!health) return;

    health.isHealthy = isHealthy;
    health.lastHealthCheck = Date.now();
    
    if (error) {
      health.lastError = error;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AIService not initialized. Call initialize() first.');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}