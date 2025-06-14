import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { z } from 'zod';
import { ProviderConfig } from '../llm-provider';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentConfig {
  environment: Environment;
  providers: Record<string, ProviderConfig>;
  globalSettings: {
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableMetrics: boolean;
    enableCaching: boolean;
    defaultTimeout: number;
    retryAttempts: number;
  };
  security: {
    enableRateLimiting: boolean;
    enableCostTracking: boolean;
    requireAPIKeyValidation: boolean;
    allowedOrigins?: string[];
    encryptCredentials: boolean;
  };
  performance: {
    maxConcurrentRequests: number;
    requestQueueSize: number;
    cacheSize: number;
    cacheTTL: number;
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    alertThresholds: {
      errorRate: number;
      latency: number;
      costPerHour: number;
    };
  };
}

// Zod schemas for validation
const ProviderConfigSchema = z.object({
  name: z.string(),
  apiKey: z.string(),
  baseURL: z.string().url().optional(),
  defaultModel: z.string(),
  rateLimits: z.object({
    requestsPerMinute: z.number().positive(),
    tokensPerMinute: z.number().positive()
  }),
  costLimits: z.object({
    dailyBudget: z.number().nonnegative(),
    monthlyBudget: z.number().nonnegative()
  }),
  retryConfig: z.object({
    maxRetries: z.number().nonnegative(),
    backoffMultiplier: z.number().positive(),
    maxBackoffMs: z.number().positive()
  }).optional(),
  timeout: z.number().positive().optional(),
  headers: z.record(z.string()).optional()
});

const EnvironmentConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production', 'test']),
  providers: z.record(ProviderConfigSchema),
  globalSettings: z.object({
    enableLogging: z.boolean(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
    enableMetrics: z.boolean(),
    enableCaching: z.boolean(),
    defaultTimeout: z.number().positive(),
    retryAttempts: z.number().nonnegative()
  }),
  security: z.object({
    enableRateLimiting: z.boolean(),
    enableCostTracking: z.boolean(),
    requireAPIKeyValidation: z.boolean(),
    allowedOrigins: z.array(z.string()).optional(),
    encryptCredentials: z.boolean()
  }),
  performance: z.object({
    maxConcurrentRequests: z.number().positive(),
    requestQueueSize: z.number().positive(),
    cacheSize: z.number().positive(),
    cacheTTL: z.number().positive()
  }),
  monitoring: z.object({
    enableHealthChecks: z.boolean(),
    healthCheckInterval: z.number().positive(),
    alertThresholds: z.object({
      errorRate: z.number().min(0).max(1),
      latency: z.number().positive(),
      costPerHour: z.number().nonnegative()
    })
  })
});

export interface ConfigOverride {
  path: string;
  value: any;
  reason?: string;
  appliedAt: number;
}

export class EnvironmentConfigManager extends EventEmitter {
  private config: EnvironmentConfig;
  private configPath: string;
  private overrides: ConfigOverride[] = [];
  private watchers: fs.FSWatcher[] = [];
  private validationErrors: string[] = [];

  constructor(environment?: Environment, configPath?: string) {
    super();
    
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = this.getDefaultConfig(environment || this.detectEnvironment());
    
    this.loadConfig();
    this.setupConfigWatching();
  }

  public async loadConfig(): Promise<void> {
    try {
      // Load base environment config
      await this.loadEnvironmentConfig();
      
      // Apply environment variable overrides
      this.applyEnvironmentVariables();
      
      // Validate configuration
      this.validateConfig();
      
      this.emit('config:loaded', {
        environment: this.config.environment,
        providers: Object.keys(this.config.providers),
        configPath: this.configPath
      });

    } catch (error) {
      this.emit('config:error', {
        error: error instanceof Error ? error.message : String(error),
        configPath: this.configPath
      });
      throw error;
    }
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public getProviderConfig(provider: string): ProviderConfig | null {
    return this.config.providers[provider] || null;
  }

  public async updateConfig(updates: Partial<EnvironmentConfig>): Promise<void> {
    try {
      // Deep merge updates
      const newConfig = this.deepMerge(this.config, updates);
      
      // Validate new configuration
      const validation = EnvironmentConfigSchema.safeParse(newConfig);
      if (!validation.success) {
        throw new Error(`Invalid configuration: ${validation.error.message}`);
      }

      this.config = validation.data;
      
      // Save to file
      await this.saveConfig();
      
      this.emit('config:updated', {
        updates,
        timestamp: Date.now()
      });

    } catch (error) {
      this.emit('config:error', {
        operation: 'update',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public setOverride(path: string, value: any, reason?: string): void {
    // Remove existing override for this path
    this.overrides = this.overrides.filter(o => o.path !== path);
    
    // Add new override
    const override: ConfigOverride = {
      path,
      value,
      reason,
      appliedAt: Date.now()
    };
    
    this.overrides.push(override);
    
    // Apply override to current config
    this.applyOverride(override);
    
    this.emit('config:override', override);
  }

  public removeOverride(path: string): boolean {
    const index = this.overrides.findIndex(o => o.path === path);
    
    if (index >= 0) {
      const removed = this.overrides.splice(index, 1)[0];
      
      // Reload config to remove override effect
      this.loadConfig();
      
      this.emit('config:override_removed', removed);
      return true;
    }
    
    return false;
  }

  public getOverrides(): ConfigOverride[] {
    return [...this.overrides];
  }

  public async reloadConfig(): Promise<void> {
    await this.loadConfig();
    
    // Reapply all overrides
    for (const override of this.overrides) {
      this.applyOverride(override);
    }
    
    this.emit('config:reloaded', {
      timestamp: Date.now(),
      overrides: this.overrides.length
    });
  }

  public validateConfig(): boolean {
    this.validationErrors = [];
    
    try {
      const validation = EnvironmentConfigSchema.safeParse(this.config);
      
      if (!validation.success) {
        this.validationErrors = validation.error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        );
        return false;
      }

      // Additional business logic validation
      this.validateBusinessRules();
      
      return this.validationErrors.length === 0;

    } catch (error) {
      this.validationErrors.push(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  public getValidationErrors(): string[] {
    return [...this.validationErrors];
  }

  private async loadEnvironmentConfig(): Promise<void> {
    const envConfigPath = this.getEnvironmentConfigPath();
    
    if (await fs.pathExists(envConfigPath)) {
      const configData = await fs.readJson(envConfigPath);
      this.config = { ...this.config, ...configData };
    }
  }

  private applyEnvironmentVariables(): void {
    const envMappings = {
      'AI_LOG_LEVEL': 'globalSettings.logLevel',
      'AI_ENABLE_LOGGING': 'globalSettings.enableLogging',
      'AI_ENABLE_METRICS': 'globalSettings.enableMetrics',
      'AI_DEFAULT_TIMEOUT': 'globalSettings.defaultTimeout',
      'AI_MAX_CONCURRENT': 'performance.maxConcurrentRequests',
      'AI_QUEUE_SIZE': 'performance.requestQueueSize',
      'AI_ENABLE_RATE_LIMITING': 'security.enableRateLimiting',
      'AI_ENABLE_COST_TRACKING': 'security.enableCostTracking',
      'AI_ENCRYPT_CREDENTIALS': 'security.encryptCredentials'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        const parsedValue = this.parseEnvironmentValue(value);
        this.setConfigValue(configPath, parsedValue);
        
        this.setOverride(configPath, parsedValue, `Environment variable: ${envVar}`);
      }
    }

    // Provider-specific environment variables
    const providerEnvPattern = /^AI_([A-Z]+)_(.+)$/;
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(providerEnvPattern);
      if (match && value) {
        const [, provider, setting] = match;
        const providerKey = provider.toLowerCase();
        const settingKey = setting.toLowerCase().replace(/_/g, '');
        
        if (this.config.providers[providerKey]) {
          const configPath = `providers.${providerKey}.${settingKey}`;
          const parsedValue = this.parseEnvironmentValue(value);
          
          this.setConfigValue(configPath, parsedValue);
          this.setOverride(configPath, parsedValue, `Environment variable: ${key}`);
        }
      }
    }
  }

  private parseEnvironmentValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // Fall back to string/boolean/number parsing
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      
      const numValue = Number(value);
      if (!isNaN(numValue)) return numValue;
      
      return value;
    }
  }

  private setConfigValue(path: string, value: any): void {
    const keys = path.split('.');
    let current: any = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private applyOverride(override: ConfigOverride): void {
    this.setConfigValue(override.path, override.value);
  }

  private validateBusinessRules(): void {
    // Validate provider configurations
    for (const [name, provider] of Object.entries(this.config.providers)) {
      if (provider.costLimits.dailyBudget > provider.costLimits.monthlyBudget) {
        this.validationErrors.push(
          `Provider ${name}: Daily budget cannot exceed monthly budget`
        );
      }
      
      if (provider.rateLimits.requestsPerMinute <= 0) {
        this.validationErrors.push(
          `Provider ${name}: Requests per minute must be positive`
        );
      }
    }

    // Validate performance settings
    if (this.config.performance.maxConcurrentRequests > this.config.performance.requestQueueSize) {
      this.validationErrors.push(
        'Max concurrent requests cannot exceed queue size'
      );
    }

    // Validate monitoring thresholds
    if (this.config.monitoring.alertThresholds.errorRate > 1) {
      this.validationErrors.push(
        'Error rate threshold cannot exceed 1.0 (100%)'
      );
    }
  }

  private detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    
    switch (nodeEnv) {
      case 'development':
      case 'dev':
        return 'development';
      case 'staging':
      case 'stage':
        return 'staging';
      case 'production':
      case 'prod':
        return 'production';
      case 'test':
        return 'test';
      default:
        return 'development';
    }
  }

  private getDefaultConfigPath(): string {
    return path.join(process.cwd(), 'config', 'ai.json');
  }

  private getEnvironmentConfigPath(): string {
    const configDir = path.dirname(this.configPath);
    const environment = this.config.environment;
    return path.join(configDir, `ai.${environment}.json`);
  }

  private getDefaultConfig(environment: Environment): EnvironmentConfig {
    const isDevelopment = environment === 'development';
    const isProduction = environment === 'production';

    return {
      environment,
      providers: {},
      globalSettings: {
        enableLogging: true,
        logLevel: isDevelopment ? 'debug' : 'info',
        enableMetrics: true,
        enableCaching: isProduction,
        defaultTimeout: 30000,
        retryAttempts: isProduction ? 3 : 1
      },
      security: {
        enableRateLimiting: isProduction,
        enableCostTracking: true,
        requireAPIKeyValidation: isProduction,
        encryptCredentials: isProduction
      },
      performance: {
        maxConcurrentRequests: isDevelopment ? 5 : 20,
        requestQueueSize: isDevelopment ? 50 : 200,
        cacheSize: isDevelopment ? 100 : 1000,
        cacheTTL: isDevelopment ? 300000 : 3600000 // 5 min vs 1 hour
      },
      monitoring: {
        enableHealthChecks: isProduction,
        healthCheckInterval: 60000, // 1 minute
        alertThresholds: {
          errorRate: 0.05, // 5%
          latency: 5000, // 5 seconds
          costPerHour: isDevelopment ? 1 : 10
        }
      }
    };
  }

  private async saveConfig(): Promise<void> {
    const envConfigPath = this.getEnvironmentConfigPath();
    await fs.ensureDir(path.dirname(envConfigPath));
    await fs.writeJson(envConfigPath, this.config, { spaces: 2 });
  }

  private setupConfigWatching(): void {
    if (fs.existsSync(this.configPath)) {
      const watcher = fs.watch(this.configPath, { persistent: false }, () => {
        this.reloadConfig();
      });
      
      this.watchers.push(watcher);
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  public destroy(): void {
    // Close file watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    
    // Clear overrides
    this.overrides = [];
  }
}