import { EventEmitter } from 'events';
import { TokenUsage, GenerationMetrics } from '../llm-provider';

export interface CostRecord {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  requestId: string;
  userId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptCost: number;
  completionCost: number;
  totalCost: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface BudgetLimit {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'total';
  amount: number;
  currency: 'USD';
  provider?: string;
  userId?: string;
  alertThresholds: number[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UsageSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  averageCostPerRequest: number;
  averageTokensPerRequest: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  costByDay: Record<string, number>;
  tokensByProvider: Record<string, number>;
}

export interface BudgetAlert {
  budgetId: string;
  threshold: number;
  currentUsage: number;
  limit: number;
  percentageUsed: number;
  timestamp: number;
  provider?: string;
  userId?: string;
}

export interface CostTrackingConfig {
  persistToDatabase: boolean;
  enableBudgetAlerts: boolean;
  enableRealTimeTracking: boolean;
  aggregationIntervalMs: number;
  maxRecordsInMemory: number;
  alertCheckIntervalMs: number;
}

export abstract class CostDatabase {
  public abstract storeCostRecord(record: CostRecord): Promise<void>;
  public abstract getCostRecords(
    filters: {
      startTime?: number;
      endTime?: number;
      provider?: string;
      userId?: string;
      model?: string;
    }
  ): Promise<CostRecord[]>;
  public abstract storeBudgetLimit(limit: BudgetLimit): Promise<void>;
  public abstract getBudgetLimits(userId?: string): Promise<BudgetLimit[]>;
  public abstract updateBudgetLimit(id: string, updates: Partial<BudgetLimit>): Promise<void>;
  public abstract deleteBudgetLimit(id: string): Promise<void>;
}

export class InMemoryCostDatabase extends CostDatabase {
  private costRecords: CostRecord[] = [];
  private budgetLimits: BudgetLimit[] = [];
  private maxRecords: number;

  constructor(maxRecords: number = 10000) {
    super();
    this.maxRecords = maxRecords;
  }

  public async storeCostRecord(record: CostRecord): Promise<void> {
    this.costRecords.push(record);
    
    if (this.costRecords.length > this.maxRecords) {
      this.costRecords = this.costRecords.slice(-Math.floor(this.maxRecords * 0.8));
    }
  }

  public async getCostRecords(filters: {
    startTime?: number;
    endTime?: number;
    provider?: string;
    userId?: string;
    model?: string;
  }): Promise<CostRecord[]> {
    return this.costRecords.filter(record => {
      if (filters.startTime && record.timestamp < filters.startTime) return false;
      if (filters.endTime && record.timestamp > filters.endTime) return false;
      if (filters.provider && record.provider !== filters.provider) return false;
      if (filters.userId && record.userId !== filters.userId) return false;
      if (filters.model && record.model !== filters.model) return false;
      return true;
    });
  }

  public async storeBudgetLimit(limit: BudgetLimit): Promise<void> {
    const existingIndex = this.budgetLimits.findIndex(l => l.id === limit.id);
    if (existingIndex >= 0) {
      this.budgetLimits[existingIndex] = limit;
    } else {
      this.budgetLimits.push(limit);
    }
  }

  public async getBudgetLimits(userId?: string): Promise<BudgetLimit[]> {
    return this.budgetLimits.filter(limit => {
      if (userId && limit.userId !== userId) return false;
      return limit.active;
    });
  }

  public async updateBudgetLimit(id: string, updates: Partial<BudgetLimit>): Promise<void> {
    const index = this.budgetLimits.findIndex(l => l.id === id);
    if (index >= 0) {
      this.budgetLimits[index] = {
        ...this.budgetLimits[index],
        ...updates,
        updatedAt: Date.now()
      };
    }
  }

  public async deleteBudgetLimit(id: string): Promise<void> {
    const index = this.budgetLimits.findIndex(l => l.id === id);
    if (index >= 0) {
      this.budgetLimits.splice(index, 1);
    }
  }
}

export class CostTracker extends EventEmitter {
  private database: CostDatabase;
  private config: CostTrackingConfig;
  private budgetCheckInterval?: NodeJS.Timeout;
  private aggregationQueue: CostRecord[] = [];
  private lastAggregation: number = 0;

  constructor(database: CostDatabase, config: Partial<CostTrackingConfig> = {}) {
    super();
    
    this.database = database;
    this.config = {
      persistToDatabase: true,
      enableBudgetAlerts: true,
      enableRealTimeTracking: true,
      aggregationIntervalMs: 60000, // 1 minute
      maxRecordsInMemory: 1000,
      alertCheckIntervalMs: 300000, // 5 minutes
      ...config
    };

    if (this.config.enableBudgetAlerts) {
      this.startBudgetChecking();
    }
  }

  public async trackUsage(
    provider: string,
    model: string,
    requestId: string,
    usage: TokenUsage,
    cost: number,
    metrics?: GenerationMetrics,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const record: CostRecord = {
      id: `${provider}-${requestId}-${Date.now()}`,
      timestamp: Date.now(),
      provider,
      model,
      requestId,
      userId,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      promptCost: cost * (usage.promptTokens / usage.totalTokens),
      completionCost: cost * (usage.completionTokens / usage.totalTokens),
      totalCost: cost,
      duration: metrics?.duration,
      metadata
    };

    this.emit('cost:tracked', record);

    if (this.config.persistToDatabase) {
      await this.database.storeCostRecord(record);
    }

    if (this.config.enableRealTimeTracking) {
      this.aggregationQueue.push(record);
      
      if (Date.now() - this.lastAggregation > this.config.aggregationIntervalMs) {
        await this.processAggregationQueue();
      }
    }

    if (this.config.enableBudgetAlerts) {
      await this.checkBudgetLimits(record);
    }
  }

  public async getCostSummary(
    startTime?: number,
    endTime?: number,
    filters?: {
      provider?: string;
      userId?: string;
      model?: string;
    }
  ): Promise<UsageSummary> {
    const records = await this.database.getCostRecords({
      startTime,
      endTime,
      ...filters
    });

    const summary: UsageSummary = {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: records.length,
      averageCostPerRequest: 0,
      averageTokensPerRequest: 0,
      costByProvider: {},
      costByModel: {},
      costByDay: {},
      tokensByProvider: {}
    };

    for (const record of records) {
      summary.totalCost += record.totalCost;
      summary.totalTokens += record.totalTokens;

      // Cost by provider
      summary.costByProvider[record.provider] = 
        (summary.costByProvider[record.provider] || 0) + record.totalCost;

      // Cost by model
      summary.costByModel[record.model] = 
        (summary.costByModel[record.model] || 0) + record.totalCost;

      // Tokens by provider
      summary.tokensByProvider[record.provider] = 
        (summary.tokensByProvider[record.provider] || 0) + record.totalTokens;

      // Cost by day
      const day = new Date(record.timestamp).toISOString().split('T')[0];
      summary.costByDay[day] = (summary.costByDay[day] || 0) + record.totalCost;
    }

    if (summary.totalRequests > 0) {
      summary.averageCostPerRequest = summary.totalCost / summary.totalRequests;
      summary.averageTokensPerRequest = summary.totalTokens / summary.totalRequests;
    }

    return summary;
  }

  public async createBudgetLimit(
    type: BudgetLimit['type'],
    amount: number,
    alertThresholds: number[] = [50, 80, 95],
    provider?: string,
    userId?: string
  ): Promise<string> {
    const budgetLimit: BudgetLimit = {
      id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      amount,
      currency: 'USD',
      provider,
      userId,
      alertThresholds: alertThresholds.sort((a, b) => a - b),
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.database.storeBudgetLimit(budgetLimit);
    
    this.emit('budget:created', budgetLimit);
    return budgetLimit.id;
  }

  public async updateBudgetLimit(
    id: string,
    updates: Partial<Pick<BudgetLimit, 'amount' | 'alertThresholds' | 'active'>>
  ): Promise<void> {
    await this.database.updateBudgetLimit(id, updates);
    this.emit('budget:updated', { id, updates });
  }

  public async deleteBudgetLimit(id: string): Promise<void> {
    await this.database.deleteBudgetLimit(id);
    this.emit('budget:deleted', { id });
  }

  public async getBudgetStatus(userId?: string): Promise<Array<{
    budget: BudgetLimit;
    currentUsage: number;
    percentageUsed: number;
    remainingAmount: number;
    projectedUsage?: number;
  }>> {
    const budgets = await this.database.getBudgetLimits(userId);
    const statuses = [];

    for (const budget of budgets) {
      const usage = await this.getCurrentUsageForBudget(budget);
      const percentageUsed = (usage / budget.amount) * 100;
      
      statuses.push({
        budget,
        currentUsage: usage,
        percentageUsed,
        remainingAmount: Math.max(0, budget.amount - usage),
        projectedUsage: await this.getProjectedUsage(budget)
      });
    }

    return statuses;
  }

  private async processAggregationQueue(): Promise<void> {
    if (this.aggregationQueue.length === 0) return;

    const records = [...this.aggregationQueue];
    this.aggregationQueue = [];
    this.lastAggregation = Date.now();

    const aggregatedData = {
      totalCost: records.reduce((sum, r) => sum + r.totalCost, 0),
      totalTokens: records.reduce((sum, r) => sum + r.totalTokens, 0),
      recordCount: records.length,
      providers: [...new Set(records.map(r => r.provider))],
      timespan: {
        start: Math.min(...records.map(r => r.timestamp)),
        end: Math.max(...records.map(r => r.timestamp))
      }
    };

    this.emit('cost:aggregated', aggregatedData);
  }

  private async checkBudgetLimits(record: CostRecord): Promise<void> {
    const budgets = await this.database.getBudgetLimits(record.userId);
    
    for (const budget of budgets) {
      if (budget.provider && budget.provider !== record.provider) continue;

      const currentUsage = await this.getCurrentUsageForBudget(budget);
      const percentageUsed = (currentUsage / budget.amount) * 100;

      for (const threshold of budget.alertThresholds) {
        if (percentageUsed >= threshold) {
          const alert: BudgetAlert = {
            budgetId: budget.id,
            threshold,
            currentUsage,
            limit: budget.amount,
            percentageUsed,
            timestamp: Date.now(),
            provider: budget.provider,
            userId: budget.userId
          };

          this.emit('budget:alert', alert);
          break;
        }
      }

      if (percentageUsed >= 100) {
        this.emit('budget:exceeded', {
          budgetId: budget.id,
          currentUsage,
          limit: budget.amount,
          overage: currentUsage - budget.amount,
          provider: budget.provider,
          userId: budget.userId
        });
      }
    }
  }

  private async getCurrentUsageForBudget(budget: BudgetLimit): Promise<number> {
    const now = Date.now();
    let startTime: number;

    switch (budget.type) {
      case 'daily':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'total':
        startTime = budget.createdAt;
        break;
    }

    const records = await this.database.getCostRecords({
      startTime,
      provider: budget.provider,
      userId: budget.userId
    });

    return records.reduce((sum, record) => sum + record.totalCost, 0);
  }

  private async getProjectedUsage(budget: BudgetLimit): Promise<number> {
    const currentUsage = await this.getCurrentUsageForBudget(budget);
    const now = Date.now();
    
    let periodStart: number;
    let periodLength: number;

    switch (budget.type) {
      case 'daily':
        periodStart = now - (24 * 60 * 60 * 1000);
        periodLength = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        periodStart = now - (7 * 24 * 60 * 60 * 1000);
        periodLength = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        periodStart = now - (30 * 24 * 60 * 60 * 1000);
        periodLength = 30 * 24 * 60 * 60 * 1000;
        break;
      case 'total':
        return currentUsage;
    }

    const elapsedTime = now - periodStart;
    const elapsedPercentage = elapsedTime / periodLength;
    
    if (elapsedPercentage === 0) return 0;
    
    return currentUsage / elapsedPercentage;
  }

  private startBudgetChecking(): void {
    this.budgetCheckInterval = setInterval(async () => {
      try {
        const budgets = await this.database.getBudgetLimits();
        
        for (const budget of budgets) {
          const currentUsage = await this.getCurrentUsageForBudget(budget);
          const percentageUsed = (currentUsage / budget.amount) * 100;

          if (percentageUsed >= 100) {
            this.emit('budget:periodic_check', {
              budgetId: budget.id,
              status: 'exceeded',
              percentageUsed
            });
          } else if (percentageUsed >= Math.max(...budget.alertThresholds)) {
            this.emit('budget:periodic_check', {
              budgetId: budget.id,
              status: 'warning',
              percentageUsed
            });
          }
        }
      } catch (error) {
        this.emit('budget:check_error', error);
      }
    }, this.config.alertCheckIntervalMs);
  }

  public destroy(): void {
    if (this.budgetCheckInterval) {
      clearInterval(this.budgetCheckInterval);
    }
  }
}