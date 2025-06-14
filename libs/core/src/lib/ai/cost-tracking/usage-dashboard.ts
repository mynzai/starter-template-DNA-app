import { EventEmitter } from 'events';
import { CostTracker, UsageSummary, CostRecord, BudgetLimit } from './cost-tracker';

export interface DashboardData {
  overview: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    averageCostPerRequest: number;
    costTrend: 'up' | 'down' | 'stable';
    budgetStatus: 'healthy' | 'warning' | 'critical';
  };
  timeSeriesData: {
    daily: Array<{ date: string; cost: number; tokens: number; requests: number }>;
    hourly: Array<{ hour: string; cost: number; tokens: number; requests: number }>;
  };
  breakdown: {
    byProvider: Array<{ provider: string; cost: number; percentage: number }>;
    byModel: Array<{ model: string; cost: number; percentage: number }>;
    byUser: Array<{ userId: string; cost: number; percentage: number }>;
  };
  budgets: Array<{
    budget: BudgetLimit;
    currentUsage: number;
    percentageUsed: number;
    status: 'healthy' | 'warning' | 'critical';
    projectedUsage?: number;
  }>;
  alerts: Array<{
    type: 'budget' | 'cost_spike' | 'unusual_usage';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }>;
}

export interface DashboardConfig {
  refreshIntervalMs: number;
  timeRangeHours: number;
  enableRealTimeUpdates: boolean;
  alertThresholds: {
    costSpike: number; // percentage increase
    unusualUsage: number; // standard deviations from norm
  };
}

export class UsageDashboard extends EventEmitter {
  private costTracker: CostTracker;
  private config: DashboardConfig;
  private refreshInterval?: NodeJS.Timeout;
  private cachedData?: DashboardData;
  private lastRefresh: number = 0;

  constructor(costTracker: CostTracker, config: Partial<DashboardConfig> = {}) {
    super();
    
    this.costTracker = costTracker;
    this.config = {
      refreshIntervalMs: 60000, // 1 minute
      timeRangeHours: 24,
      enableRealTimeUpdates: true,
      alertThresholds: {
        costSpike: 50, // 50% increase
        unusualUsage: 2 // 2 standard deviations
      },
      ...config
    };

    if (this.config.enableRealTimeUpdates) {
      this.startRealTimeUpdates();
    }

    this.setupCostTrackerListeners();
  }

  public async getDashboardData(forceRefresh: boolean = false): Promise<DashboardData> {
    const now = Date.now();
    const cacheValid = this.cachedData && 
      (now - this.lastRefresh) < this.config.refreshIntervalMs;

    if (!forceRefresh && cacheValid) {
      return this.cachedData!;
    }

    const endTime = now;
    const startTime = now - (this.config.timeRangeHours * 60 * 60 * 1000);

    const [
      currentSummary,
      previousSummary,
      timeSeriesData,
      budgetStatuses,
      alerts
    ] = await Promise.all([
      this.costTracker.getCostSummary(startTime, endTime),
      this.costTracker.getCostSummary(
        startTime - (this.config.timeRangeHours * 60 * 60 * 1000),
        startTime
      ),
      this.generateTimeSeriesData(startTime, endTime),
      this.costTracker.getBudgetStatus(),
      this.generateAlerts(startTime, endTime)
    ]);

    const dashboardData: DashboardData = {
      overview: this.generateOverview(currentSummary, previousSummary, budgetStatuses),
      timeSeriesData,
      breakdown: this.generateBreakdown(currentSummary),
      budgets: budgetStatuses.map(status => ({
        ...status,
        status: this.getBudgetHealthStatus(status.percentageUsed)
      })),
      alerts
    };

    this.cachedData = dashboardData;
    this.lastRefresh = now;

    this.emit('dashboard:updated', dashboardData);
    return dashboardData;
  }

  public async exportUsageReport(
    startTime: number,
    endTime: number,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const summary = await this.costTracker.getCostSummary(startTime, endTime);
    const timeSeriesData = await this.generateTimeSeriesData(startTime, endTime);
    
    const reportData = {
      summary,
      timeSeriesData,
      generatedAt: new Date().toISOString(),
      period: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString()
      }
    };

    if (format === 'csv') {
      return this.convertToCSV(reportData);
    }

    return JSON.stringify(reportData, null, 2);
  }

  private generateOverview(
    current: UsageSummary,
    previous: UsageSummary,
    budgetStatuses: Array<{ percentageUsed: number }>
  ): DashboardData['overview'] {
    const costTrend = this.calculateTrend(current.totalCost, previous.totalCost);
    const budgetStatus = this.getOverallBudgetStatus(budgetStatuses);

    return {
      totalCost: current.totalCost,
      totalTokens: current.totalTokens,
      totalRequests: current.totalRequests,
      averageCostPerRequest: current.averageCostPerRequest,
      costTrend,
      budgetStatus
    };
  }

  private generateBreakdown(summary: UsageSummary): DashboardData['breakdown'] {
    const totalCost = summary.totalCost;

    const byProvider = Object.entries(summary.costByProvider)
      .map(([provider, cost]) => ({
        provider,
        cost,
        percentage: (cost / totalCost) * 100
      }))
      .sort((a, b) => b.cost - a.cost);

    const byModel = Object.entries(summary.costByModel)
      .map(([model, cost]) => ({
        model,
        cost,
        percentage: (cost / totalCost) * 100
      }))
      .sort((a, b) => b.cost - a.cost);

    return {
      byProvider,
      byModel,
      byUser: [] // Would need user data from cost records
    };
  }

  private async generateTimeSeriesData(
    startTime: number,
    endTime: number
  ): Promise<DashboardData['timeSeriesData']> {
    const records = await this.getCostRecordsInRange(startTime, endTime);
    
    const daily = this.aggregateByPeriod(records, 'day');
    const hourly = this.aggregateByPeriod(records, 'hour');

    return { daily, hourly };
  }

  private async getCostRecordsInRange(startTime: number, endTime: number): Promise<CostRecord[]> {
    // This would need to be implemented to get raw cost records
    // For now, we'll simulate based on summary data
    return [];
  }

  private aggregateByPeriod(
    records: CostRecord[],
    period: 'hour' | 'day'
  ): Array<{ date: string; cost: number; tokens: number; requests: number }> {
    const aggregated = new Map<string, { cost: number; tokens: number; requests: number }>();

    for (const record of records) {
      const date = new Date(record.timestamp);
      let key: string;

      if (period === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.toISOString().split('T')[0]}T${date.getUTCHours().toString().padStart(2, '0')}:00:00Z`;
      }

      const existing = aggregated.get(key) || { cost: 0, tokens: 0, requests: 0 };
      aggregated.set(key, {
        cost: existing.cost + record.totalCost,
        tokens: existing.tokens + record.totalTokens,
        requests: existing.requests + 1
      });
    }

    return Array.from(aggregated.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async generateAlerts(
    startTime: number,
    endTime: number
  ): Promise<DashboardData['alerts']> {
    const alerts: DashboardData['alerts'] = [];

    // Budget alerts
    const budgetStatuses = await this.costTracker.getBudgetStatus();
    for (const status of budgetStatuses) {
      if (status.percentageUsed >= 100) {
        alerts.push({
          type: 'budget',
          severity: 'critical',
          message: `Budget exceeded: ${status.percentageUsed.toFixed(1)}% of limit used`,
          timestamp: Date.now(),
          metadata: { budgetId: status.budget.id }
        });
      } else if (status.percentageUsed >= 80) {
        alerts.push({
          type: 'budget',
          severity: 'warning',
          message: `Budget warning: ${status.percentageUsed.toFixed(1)}% of limit used`,
          timestamp: Date.now(),
          metadata: { budgetId: status.budget.id }
        });
      }
    }

    // Cost spike detection
    const currentSummary = await this.costTracker.getCostSummary(startTime, endTime);
    const previousSummary = await this.costTracker.getCostSummary(
      startTime - (endTime - startTime),
      startTime
    );

    if (previousSummary.totalCost > 0) {
      const costIncrease = ((currentSummary.totalCost - previousSummary.totalCost) / previousSummary.totalCost) * 100;
      
      if (costIncrease > this.config.alertThresholds.costSpike) {
        alerts.push({
          type: 'cost_spike',
          severity: 'warning',
          message: `Cost spike detected: ${costIncrease.toFixed(1)}% increase from previous period`,
          timestamp: Date.now(),
          metadata: { increase: costIncrease }
        });
      }
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    if (previous === 0) return 'stable';
    
    const change = ((current - previous) / previous) * 100;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private getOverallBudgetStatus(
    budgetStatuses: Array<{ percentageUsed: number }>
  ): 'healthy' | 'warning' | 'critical' {
    if (budgetStatuses.length === 0) return 'healthy';
    
    const maxPercentage = Math.max(...budgetStatuses.map(s => s.percentageUsed));
    
    if (maxPercentage >= 100) return 'critical';
    if (maxPercentage >= 80) return 'warning';
    return 'healthy';
  }

  private getBudgetHealthStatus(percentageUsed: number): 'healthy' | 'warning' | 'critical' {
    if (percentageUsed >= 100) return 'critical';
    if (percentageUsed >= 80) return 'warning';
    return 'healthy';
  }

  private convertToCSV(data: any): string {
    const flatten = (obj: any, prefix = ''): Record<string, any> => {
      let result: Record<string, any> = {};
      
      for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(result, flatten(value, newKey));
        } else {
          result[newKey] = value;
        }
      }
      
      return result;
    };

    const flattened = flatten(data);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);
    
    return [
      headers.join(','),
      values.map(v => typeof v === 'string' ? `"${v}"` : v).join(',')
    ].join('\n');
  }

  private startRealTimeUpdates(): void {
    this.refreshInterval = setInterval(async () => {
      try {
        await this.getDashboardData(true);
      } catch (error) {
        this.emit('dashboard:error', error);
      }
    }, this.config.refreshIntervalMs);
  }

  private setupCostTrackerListeners(): void {
    this.costTracker.on('cost:tracked', () => {
      this.invalidateCache();
    });

    this.costTracker.on('budget:alert', (alert) => {
      this.emit('dashboard:budget_alert', alert);
    });

    this.costTracker.on('budget:exceeded', (data) => {
      this.emit('dashboard:budget_exceeded', data);
    });
  }

  private invalidateCache(): void {
    this.cachedData = undefined;
    this.lastRefresh = 0;
  }

  public destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}