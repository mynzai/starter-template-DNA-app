/**
 * @fileoverview Cost Tracker
 * Tracks and analyzes costs across AI providers, compute, storage, and network
 */

import { EventEmitter } from 'events';
import {
  CostTrackingData,
  CostBreakdown,
  ProviderCost,
  ComputeCost,
  StorageCost,
  NetworkCost,
  Budget,
  CostAlert,
  CostForecast,
  CostOptimizationRecommendation,
  UsageBreakdown,
  CostTrend,
  BillingPeriod
} from './types';

export class CostTracker extends EventEmitter {
  private initialized = false;
  private activeSessions: Map<string, SessionCostData> = new Map();
  private costHistory: CostRecord[] = [];
  private budgets: Map<string, Budget> = new Map();
  private costAlerts: CostAlert[] = [];
  
  // Cost rates and pricing
  private providerRates: Map<string, ProviderRates> = new Map();
  private computeRates: ComputeRates = {
    cpuHourRate: 0.05, // $0.05 per CPU hour
    memoryGBHourRate: 0.01, // $0.01 per GB hour
    storageGBMonthRate: 0.10, // $0.10 per GB month
    networkGBRate: 0.09 // $0.09 per GB transferred
  };

  constructor() {
    super();
    this.loadDefaultProviderRates();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load existing cost data
    await this.loadCostHistory();
    
    // Set up default budgets
    this.setupDefaultBudgets();

    this.initialized = true;
    this.emit('cost-tracker:initialized');
  }

  async startSession(sessionId: string): Promise<void> {
    const sessionData: SessionCostData = {
      id: sessionId,
      startTime: Date.now(),
      costs: {
        ai: 0,
        compute: 0,
        storage: 0,
        network: 0,
        total: 0
      },
      aiUsage: {
        providers: new Map(),
        totalTokens: 0,
        totalRequests: 0
      },
      computeUsage: {
        cpuHours: 0,
        memoryGBHours: 0,
        startCPU: process.cpuUsage(),
        startMemory: process.memoryUsage().rss
      },
      networkUsage: {
        bytesIn: 0,
        bytesOut: 0,
        requests: 0
      },
      storageUsage: {
        bytesStored: 0,
        operations: 0
      }
    };

    this.activeSessions.set(sessionId, sessionData);
    this.emit('session:started', { sessionId });
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Calculate final costs
    const finalCosts = await this.calculateSessionCosts(session);
    
    // Record in history
    const costRecord: CostRecord = {
      sessionId,
      timestamp: Date.now(),
      duration: Date.now() - session.startTime,
      costs: finalCosts,
      usage: {
        ai: session.aiUsage,
        compute: session.computeUsage,
        network: session.networkUsage,
        storage: session.storageUsage
      }
    };

    this.costHistory.push(costRecord);

    // Check budget thresholds
    await this.checkBudgetThresholds(finalCosts);

    // Clean up
    this.activeSessions.delete(sessionId);

    this.emit('session:ended', { sessionId, costs: finalCosts });
  }

  async recordAIUsage(
    sessionId: string,
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    requestDuration: number
  ): Promise<number> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return 0;

    const providerRates = this.providerRates.get(provider);
    if (!providerRates) {
      console.warn(`No rates found for provider: ${provider}`);
      return 0;
    }

    const modelRate = providerRates.models.get(model) || providerRates.defaultRate;
    const promptCost = (promptTokens / 1000) * modelRate.promptPer1k;
    const completionCost = (completionTokens / 1000) * modelRate.completionPer1k;
    const totalCost = promptCost + completionCost;

    // Update session data
    const providerKey = `${provider}:${model}`;
    const existing = session.aiUsage.providers.get(providerKey) || {
      provider,
      model,
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
      averageLatency: 0,
      totalDuration: 0
    };

    existing.requests++;
    existing.promptTokens += promptTokens;
    existing.completionTokens += completionTokens;
    existing.cost += totalCost;
    existing.totalDuration += requestDuration;
    existing.averageLatency = existing.totalDuration / existing.requests;

    session.aiUsage.providers.set(providerKey, existing);
    session.aiUsage.totalTokens += promptTokens + completionTokens;
    session.aiUsage.totalRequests++;
    session.costs.ai += totalCost;
    session.costs.total += totalCost;

    this.emit('ai:usage:recorded', {
      sessionId,
      provider,
      model,
      cost: totalCost,
      tokens: promptTokens + completionTokens
    });

    return totalCost;
  }

  async recordComputeUsage(sessionId: string, cpuUsage: NodeJS.CpuUsage, memoryUsage: number): Promise<number> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return 0;

    const duration = Date.now() - session.startTime;
    const cpuHours = ((cpuUsage.user + cpuUsage.system) / 1000000) / 3600000; // Convert microseconds to hours
    const memoryGBHours = (memoryUsage / 1024 / 1024 / 1024) * (duration / 3600000); // Convert to GB-hours

    const cpuCost = cpuHours * this.computeRates.cpuHourRate;
    const memoryCost = memoryGBHours * this.computeRates.memoryGBHourRate;
    const totalCost = cpuCost + memoryCost;

    session.computeUsage.cpuHours += cpuHours;
    session.computeUsage.memoryGBHours += memoryGBHours;
    session.costs.compute += totalCost;
    session.costs.total += totalCost;

    this.emit('compute:usage:recorded', {
      sessionId,
      cpuHours,
      memoryGBHours,
      cost: totalCost
    });

    return totalCost;
  }

  async recordNetworkUsage(sessionId: string, bytesIn: number, bytesOut: number): Promise<number> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return 0;

    const totalBytes = bytesIn + bytesOut;
    const totalGB = totalBytes / 1024 / 1024 / 1024;
    const cost = totalGB * this.computeRates.networkGBRate;

    session.networkUsage.bytesIn += bytesIn;
    session.networkUsage.bytesOut += bytesOut;
    session.networkUsage.requests++;
    session.costs.network += cost;
    session.costs.total += cost;

    this.emit('network:usage:recorded', {
      sessionId,
      bytesIn,
      bytesOut,
      cost
    });

    return cost;
  }

  async recordStorageUsage(sessionId: string, bytesStored: number, operations: number): Promise<number> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return 0;

    const storageGB = bytesStored / 1024 / 1024 / 1024;
    const cost = storageGB * this.computeRates.storageGBMonthRate;

    session.storageUsage.bytesStored += bytesStored;
    session.storageUsage.operations += operations;
    session.costs.storage += cost;
    session.costs.total += cost;

    this.emit('storage:usage:recorded', {
      sessionId,
      bytesStored,
      operations,
      cost
    });

    return cost;
  }

  async recordCosts(sessionId: string, costs: Partial<CostBreakdown>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    if (costs.totalCost) {
      session.costs.total += costs.totalCost;
    }

    // Record provider costs
    if (costs.aiProviderCosts) {
      for (const providerCost of costs.aiProviderCosts) {
        await this.recordAIUsage(
          sessionId,
          providerCost.provider,
          providerCost.model,
          providerCost.promptTokens,
          providerCost.completionTokens,
          0 // Duration not available
        );
      }
    }

    this.emit('costs:recorded', { sessionId, costs });
  }

  async getSessionCosts(sessionId: string): Promise<CostBreakdown> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return await this.calculateSessionCosts(session);
  }

  async getCostTracking(accountId?: string): Promise<CostTrackingData> {
    const currentPeriod = this.getCurrentBillingPeriod();
    const periodCosts = this.getCostsByPeriod(currentPeriod);
    
    return {
      accountId: accountId || 'default',
      billingPeriod: currentPeriod,
      totalCost: periodCosts.total,
      currency: 'USD',
      budgets: Array.from(this.budgets.values()),
      alerts: this.getActiveAlerts(),
      forecasts: await this.generateForecasts(currentPeriod),
      recommendations: await this.generateOptimizationRecommendations(),
      usage: this.getUsageBreakdown(currentPeriod),
      trends: this.calculateCostTrends()
    };
  }

  async getCostHistory(timeRange: { start: number; end: number }): Promise<CostRecord[]> {
    return this.costHistory.filter(record =>
      record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
    );
  }

  async createBudget(budget: Omit<Budget, 'id'>): Promise<string> {
    const budgetId = `budget-${Date.now()}`;
    const newBudget: Budget = {
      id: budgetId,
      ...budget,
      spent: 0,
      percentage: 0,
      status: 'under'
    };

    this.budgets.set(budgetId, newBudget);
    this.emit('budget:created', { budgetId, budget: newBudget });

    return budgetId;
  }

  async updateBudget(budgetId: string, updates: Partial<Budget>): Promise<void> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      throw new Error(`Budget not found: ${budgetId}`);
    }

    Object.assign(budget, updates);
    this.budgets.set(budgetId, budget);
    
    this.emit('budget:updated', { budgetId, budget });
  }

  async setBudgetAlert(budgetId: string, threshold: number): Promise<void> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      throw new Error(`Budget not found: ${budgetId}`);
    }

    if (!budget.alertThresholds.includes(threshold)) {
      budget.alertThresholds.push(threshold);
      budget.alertThresholds.sort((a, b) => a - b);
    }

    this.emit('budget:alert:set', { budgetId, threshold });
  }

  private loadDefaultProviderRates(): void {
    // OpenAI rates (as of 2024)
    this.providerRates.set('openai', {
      defaultRate: { promptPer1k: 0.003, completionPer1k: 0.006 },
      models: new Map([
        ['gpt-4', { promptPer1k: 0.03, completionPer1k: 0.06 }],
        ['gpt-4-32k', { promptPer1k: 0.06, completionPer1k: 0.12 }],
        ['gpt-3.5-turbo', { promptPer1k: 0.0015, completionPer1k: 0.002 }],
        ['gpt-3.5-turbo-16k', { promptPer1k: 0.003, completionPer1k: 0.004 }],
        ['text-davinci-003', { promptPer1k: 0.02, completionPer1k: 0.02 }],
        ['text-embedding-ada-002', { promptPer1k: 0.0001, completionPer1k: 0 }]
      ])
    });

    // Anthropic rates
    this.providerRates.set('anthropic', {
      defaultRate: { promptPer1k: 0.008, completionPer1k: 0.024 },
      models: new Map([
        ['claude-3-opus', { promptPer1k: 0.015, completionPer1k: 0.075 }],
        ['claude-3-sonnet', { promptPer1k: 0.003, completionPer1k: 0.015 }],
        ['claude-3-haiku', { promptPer1k: 0.00025, completionPer1k: 0.00125 }],
        ['claude-2.1', { promptPer1k: 0.008, completionPer1k: 0.024 }],
        ['claude-2.0', { promptPer1k: 0.008, completionPer1k: 0.024 }],
        ['claude-instant-1.2', { promptPer1k: 0.0008, completionPer1k: 0.0024 }]
      ])
    });

    // Ollama (local) - minimal costs
    this.providerRates.set('ollama', {
      defaultRate: { promptPer1k: 0, completionPer1k: 0 },
      models: new Map()
    });
  }

  private async loadCostHistory(): Promise<void> {
    // In a real implementation, this would load from persistent storage
    this.costHistory = [];
  }

  private setupDefaultBudgets(): void {
    // Create default monthly budget
    const monthlyBudget: Budget = {
      id: 'monthly-default',
      name: 'Monthly AI Development Budget',
      amount: 100, // $100 per month
      spent: 0,
      percentage: 0,
      status: 'under',
      alertThresholds: [50, 75, 90], // Alert at 50%, 75%, 90%
      scope: {
        services: ['ai', 'compute', 'storage', 'network'],
        projects: [],
        environments: ['development', 'staging', 'production'],
        timeframe: 'monthly'
      }
    };

    this.budgets.set(monthlyBudget.id, monthlyBudget);
  }

  private async calculateSessionCosts(session: SessionCostData): Promise<CostBreakdown> {
    const aiProviderCosts: ProviderCost[] = Array.from(session.aiUsage.providers.values()).map(usage => ({
      provider: usage.provider,
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cost: usage.cost,
      requestCount: usage.requests,
      costPerToken: usage.cost / (usage.promptTokens + usage.completionTokens),
      costPerRequest: usage.cost / usage.requests
    }));

    const computeCosts: ComputeCost = {
      cpuHours: session.computeUsage.cpuHours,
      costPerHour: this.computeRates.cpuHourRate,
      totalCost: session.costs.compute
    };

    const storageCosts: StorageCost = {
      gigabytesUsed: session.storageUsage.bytesStored / 1024 / 1024 / 1024,
      costPerGB: this.computeRates.storageGBMonthRate,
      totalCost: session.costs.storage,
      transferCost: 0,
      operationCost: 0
    };

    const networkCosts: NetworkCost = {
      bytesTransferred: session.networkUsage.bytesIn + session.networkUsage.bytesOut,
      costPerGB: this.computeRates.networkGBRate,
      totalCost: session.costs.network,
      regionTransfers: []
    };

    return {
      totalCost: session.costs.total,
      currency: 'USD',
      aiProviderCosts,
      computeCosts,
      storageCosts,
      networkCosts,
      breakdown: [
        { category: 'ai', amount: session.costs.ai, percentage: (session.costs.ai / session.costs.total) * 100, details: {} },
        { category: 'compute', amount: session.costs.compute, percentage: (session.costs.compute / session.costs.total) * 100, details: {} },
        { category: 'storage', amount: session.costs.storage, percentage: (session.costs.storage / session.costs.total) * 100, details: {} },
        { category: 'network', amount: session.costs.network, percentage: (session.costs.network / session.costs.total) * 100, details: {} }
      ],
      billing: {
        billingPeriod: 'monthly',
        currentSpend: session.costs.total,
        alertThresholds: [50, 75, 90]
      }
    };
  }

  private async checkBudgetThresholds(costs: CostBreakdown): Promise<void> {
    for (const budget of this.budgets.values()) {
      const currentPeriod = this.getCurrentBillingPeriod();
      const periodSpending = this.getBudgetSpending(budget, currentPeriod);
      
      budget.spent = periodSpending;
      budget.percentage = (periodSpending / budget.amount) * 100;

      // Update status
      if (budget.percentage >= 100) {
        budget.status = 'exceeded';
      } else if (budget.percentage >= 90) {
        budget.status = 'over';
      } else if (budget.percentage >= 75) {
        budget.status = 'approaching';
      } else {
        budget.status = 'under';
      }

      // Check alert thresholds
      for (const threshold of budget.alertThresholds) {
        if (budget.percentage >= threshold && !this.hasRecentAlert(budget.id, threshold)) {
          await this.createCostAlert({
            type: 'budget_exceeded',
            severity: threshold >= 90 ? 'critical' : 'warning',
            message: `Budget "${budget.name}" has reached ${budget.percentage.toFixed(1)}% (${threshold}% threshold)`,
            threshold,
            currentValue: budget.percentage,
            budgetId: budget.id
          });
        }
      }

      this.emit('budget:updated', { budgetId: budget.id, budget });
    }
  }

  private getCurrentBillingPeriod(): BillingPeriod {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start: start.getTime(),
      end: end.getTime(),
      current: true,
      daysRemaining: Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    };
  }

  private getCostsByPeriod(period: BillingPeriod): { total: number; breakdown: Record<string, number> } {
    const periodCosts = this.costHistory.filter(record =>
      record.timestamp >= period.start && record.timestamp <= period.end
    );

    const total = periodCosts.reduce((sum, record) => sum + record.costs.totalCost, 0);
    const breakdown = {
      ai: periodCosts.reduce((sum, record) => sum + record.costs.aiProviderCosts.reduce((s, p) => s + p.cost, 0), 0),
      compute: periodCosts.reduce((sum, record) => sum + record.costs.computeCosts.totalCost, 0),
      storage: periodCosts.reduce((sum, record) => sum + record.costs.storageCosts.totalCost, 0),
      network: periodCosts.reduce((sum, record) => sum + record.costs.networkCosts.totalCost, 0)
    };

    return { total, breakdown };
  }

  private getBudgetSpending(budget: Budget, period: BillingPeriod): number {
    // Calculate spending for this budget in the given period
    return this.costHistory
      .filter(record => record.timestamp >= period.start && record.timestamp <= period.end)
      .reduce((sum, record) => sum + record.costs.totalCost, 0);
  }

  private getActiveAlerts(): CostAlert[] {
    return this.costAlerts.filter(alert => alert.status === 'active');
  }

  private async generateForecasts(period: BillingPeriod): Promise<CostForecast[]> {
    // Simple linear forecast based on current spending trend
    const daysElapsed = (Date.now() - period.start) / (1000 * 60 * 60 * 24);
    const currentSpend = this.getCostsByPeriod(period).total;
    const dailyRate = currentSpend / Math.max(daysElapsed, 1);
    const remainingDays = period.daysRemaining;
    
    const monthlyForecast = currentSpend + (dailyRate * remainingDays);

    return [{
      period: 'month',
      estimatedCost: monthlyForecast,
      confidence: 0.7,
      factors: [
        { name: 'current_trend', impact: 0.8, confidence: 0.8, description: 'Based on current spending trend' },
        { name: 'seasonal_variation', impact: 0.1, confidence: 0.5, description: 'Potential seasonal changes' }
      ],
      trend: dailyRate > 0 ? 'increasing' : 'stable',
      scenarios: [
        { name: 'optimistic', estimatedCost: monthlyForecast * 0.8, probability: 0.2, assumptions: ['Reduced usage', 'Optimization improvements'] },
        { name: 'realistic', estimatedCost: monthlyForecast, probability: 0.6, assumptions: ['Current trend continues'] },
        { name: 'pessimistic', estimatedCost: monthlyForecast * 1.3, probability: 0.2, assumptions: ['Increased usage', 'Price changes'] }
      ]
    }];
  }

  private async generateOptimizationRecommendations(): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];

    // Analyze AI provider usage
    const aiCosts = this.costHistory.reduce((sum, record) => 
      sum + record.costs.aiProviderCosts.reduce((s, p) => s + p.cost, 0), 0
    );

    if (aiCosts > 50) { // $50 threshold
      recommendations.push({
        id: 'ai-model-optimization',
        type: 'provider_switch',
        priority: 'high',
        title: 'Optimize AI Model Selection',
        description: 'Consider using more cost-effective models for suitable tasks',
        estimatedSavings: aiCosts * 0.3,
        effort: 'medium',
        impact: 'high',
        implementation: 'Review model usage patterns and switch to cheaper alternatives where quality allows',
        risks: ['Potential quality reduction', 'Integration changes required'],
        requirements: ['Model performance testing', 'Integration updates'],
        roi: 2 // 2 months ROI
      });
    }

    return recommendations;
  }

  private getUsageBreakdown(period: BillingPeriod): UsageBreakdown {
    const periodRecords = this.costHistory.filter(record =>
      record.timestamp >= period.start && record.timestamp <= period.end
    );

    // Group by service
    const byService = [
      {
        service: 'AI Providers',
        cost: periodRecords.reduce((sum, record) => sum + record.costs.aiProviderCosts.reduce((s, p) => s + p.cost, 0), 0),
        usage: { requests: periodRecords.reduce((sum, record) => sum + record.usage.ai.totalRequests, 0) },
        percentage: 0,
        trend: 'up' as const
      }
    ];

    // Calculate percentages
    const totalCost = byService.reduce((sum, service) => sum + service.cost, 0);
    byService.forEach(service => {
      service.percentage = totalCost > 0 ? (service.cost / totalCost) * 100 : 0;
    });

    return {
      byService,
      byProject: [],
      byEnvironment: [],
      byUser: [],
      byTime: []
    };
  }

  private calculateCostTrends(): CostTrend[] {
    // Calculate trends over the last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentRecords = this.costHistory.filter(record => record.timestamp >= thirtyDaysAgo);

    if (recentRecords.length < 2) {
      return [];
    }

    const totalCosts = recentRecords.map(record => ({
      timestamp: record.timestamp,
      cost: record.costs.totalCost,
      volume: 1,
      context: {}
    }));

    return [{
      metric: 'total_cost',
      timeframe: 'daily',
      direction: 'stable',
      changePercent: 0,
      dataPoints: totalCosts
    }];
  }

  private hasRecentAlert(budgetId: string, threshold: number): boolean {
    const recentTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
    return this.costAlerts.some(alert =>
      alert.timestamp > recentTime &&
      alert.message.includes(budgetId) &&
      alert.threshold === threshold
    );
  }

  private async createCostAlert(alertData: Partial<CostAlert & { budgetId?: string }>): Promise<void> {
    const alert: CostAlert = {
      id: `alert-${Date.now()}`,
      type: alertData.type || 'cost_spike',
      severity: alertData.severity || 'warning',
      message: alertData.message || 'Cost alert triggered',
      threshold: alertData.threshold || 0,
      currentValue: alertData.currentValue || 0,
      timestamp: Date.now(),
      acknowledged: false,
      actionRequired: true,
      recommendations: []
    };

    this.costAlerts.push(alert);
    
    this.emit('cost:threshold:exceeded', {
      alert,
      threshold: alert.threshold,
      current: alert.currentValue
    });
  }

  async shutdown(): Promise<void> {
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.endSession(sessionId);
    }

    // Save cost history
    await this.saveCostHistory();

    this.initialized = false;
    this.emit('cost-tracker:shutdown');
  }

  private async saveCostHistory(): Promise<void> {
    // In a real implementation, this would persist to storage
    this.emit('cost:history:save', { records: this.costHistory });
  }
}

// Supporting interfaces
interface SessionCostData {
  id: string;
  startTime: number;
  costs: {
    ai: number;
    compute: number;
    storage: number;
    network: number;
    total: number;
  };
  aiUsage: {
    providers: Map<string, AIProviderUsage>;
    totalTokens: number;
    totalRequests: number;
  };
  computeUsage: {
    cpuHours: number;
    memoryGBHours: number;
    startCPU: NodeJS.CpuUsage;
    startMemory: number;
  };
  networkUsage: {
    bytesIn: number;
    bytesOut: number;
    requests: number;
  };
  storageUsage: {
    bytesStored: number;
    operations: number;
  };
}

interface AIProviderUsage {
  provider: string;
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  averageLatency: number;
  totalDuration: number;
}

interface ProviderRates {
  defaultRate: ModelRate;
  models: Map<string, ModelRate>;
}

interface ModelRate {
  promptPer1k: number;
  completionPer1k: number;
}

interface ComputeRates {
  cpuHourRate: number;
  memoryGBHourRate: number;
  storageGBMonthRate: number;
  networkGBRate: number;
}

interface CostRecord {
  sessionId: string;
  timestamp: number;
  duration: number;
  costs: CostBreakdown;
  usage: {
    ai: {
      providers: Map<string, AIProviderUsage>;
      totalTokens: number;
      totalRequests: number;
    };
    compute: any;
    network: any;
    storage: any;
  };
}