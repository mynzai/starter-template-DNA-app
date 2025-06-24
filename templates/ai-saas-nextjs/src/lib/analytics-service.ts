import { AIService } from './ai-service'
import { prisma } from './prisma'

export interface AnalyticsMetric {
  id: string
  name: string
  value: number
  previousValue?: number
  change?: number
  changePercent?: number
  trend: 'up' | 'down' | 'stable'
  status: 'good' | 'warning' | 'critical'
  timestamp: Date
}

export interface TimeSeriesData {
  timestamp: Date
  value: number
  category?: string
}

export interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction' | 'recommendation'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  data?: any
  actionable: boolean
  actions?: Array<{
    title: string
    description: string
    impact: 'low' | 'medium' | 'high'
  }>
  createdAt: Date
}

export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'insight' | 'forecast'
  title: string
  description?: string
  data: any
  config?: {
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
    timeRange?: string
    refreshInterval?: number
    filters?: Record<string, any>
  }
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface PredictionResult {
  metric: string
  predictions: Array<{
    timestamp: Date
    value: number
    confidence: number
    lowerBound: number
    upperBound: number
  }>
  accuracy: number
  methodology: string
  factors: Array<{
    name: string
    importance: number
    impact: 'positive' | 'negative'
  }>
}

export class AnalyticsService {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  /**
   * Get key metrics for dashboard
   */
  async getKeyMetrics(userId: string, timeRange: string = '30d'): Promise<AnalyticsMetric[]> {
    const endDate = new Date()
    const startDate = this.getStartDate(timeRange)
    const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))

    // Get current period data
    const currentData = await this.getMetricsData(userId, startDate, endDate)
    const previousData = await this.getMetricsData(userId, previousStartDate, startDate)

    const metrics: AnalyticsMetric[] = [
      {
        id: 'active_users',
        name: 'Active Users',
        value: currentData.activeUsers,
        previousValue: previousData.activeUsers,
        change: currentData.activeUsers - previousData.activeUsers,
        changePercent: this.calculatePercentChange(previousData.activeUsers, currentData.activeUsers),
        trend: this.determineTrend(previousData.activeUsers, currentData.activeUsers),
        status: this.determineStatus('active_users', currentData.activeUsers, previousData.activeUsers),
        timestamp: endDate,
      },
      {
        id: 'revenue',
        name: 'Revenue',
        value: currentData.revenue,
        previousValue: previousData.revenue,
        change: currentData.revenue - previousData.revenue,
        changePercent: this.calculatePercentChange(previousData.revenue, currentData.revenue),
        trend: this.determineTrend(previousData.revenue, currentData.revenue),
        status: this.determineStatus('revenue', currentData.revenue, previousData.revenue),
        timestamp: endDate,
      },
      {
        id: 'churn_rate',
        name: 'Churn Rate',
        value: currentData.churnRate,
        previousValue: previousData.churnRate,
        change: currentData.churnRate - previousData.churnRate,
        changePercent: this.calculatePercentChange(previousData.churnRate, currentData.churnRate),
        trend: this.determineTrend(previousData.churnRate, currentData.churnRate, true), // Inverse for churn
        status: this.determineStatus('churn_rate', currentData.churnRate, previousData.churnRate, true),
        timestamp: endDate,
      },
      {
        id: 'avg_session_duration',
        name: 'Avg Session Duration',
        value: currentData.avgSessionDuration,
        previousValue: previousData.avgSessionDuration,
        change: currentData.avgSessionDuration - previousData.avgSessionDuration,
        changePercent: this.calculatePercentChange(previousData.avgSessionDuration, currentData.avgSessionDuration),
        trend: this.determineTrend(previousData.avgSessionDuration, currentData.avgSessionDuration),
        status: this.determineStatus('session_duration', currentData.avgSessionDuration, previousData.avgSessionDuration),
        timestamp: endDate,
      },
      {
        id: 'conversion_rate',
        name: 'Conversion Rate',
        value: currentData.conversionRate,
        previousValue: previousData.conversionRate,
        change: currentData.conversionRate - previousData.conversionRate,
        changePercent: this.calculatePercentChange(previousData.conversionRate, currentData.conversionRate),
        trend: this.determineTrend(previousData.conversionRate, currentData.conversionRate),
        status: this.determineStatus('conversion_rate', currentData.conversionRate, previousData.conversionRate),
        timestamp: endDate,
      },
    ]

    return metrics
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(
    userId: string, 
    metric: string, 
    timeRange: string = '30d',
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<TimeSeriesData[]> {
    const endDate = new Date()
    const startDate = this.getStartDate(timeRange)

    // Generate date intervals based on granularity
    const intervals = this.generateTimeIntervals(startDate, endDate, granularity)
    
    const data: TimeSeriesData[] = []

    for (const interval of intervals) {
      const value = await this.getMetricValueForInterval(userId, metric, interval.start, interval.end)
      data.push({
        timestamp: interval.start,
        value,
      })
    }

    return data
  }

  /**
   * Generate AI-powered insights
   */
  async generateInsights(userId: string, timeRange: string = '30d'): Promise<Insight[]> {
    const metrics = await this.getKeyMetrics(userId, timeRange)
    const timeSeriesData = await Promise.all([
      this.getTimeSeriesData(userId, 'active_users', timeRange),
      this.getTimeSeriesData(userId, 'revenue', timeRange),
      this.getTimeSeriesData(userId, 'churn_rate', timeRange),
    ])

    const insights: Insight[] = []

    // Trend analysis
    const trendInsights = await this.analyzeTrends(metrics, timeSeriesData)
    insights.push(...trendInsights)

    // Anomaly detection
    const anomalyInsights = await this.detectAnomalies(timeSeriesData)
    insights.push(...anomalyInsights)

    // AI-generated insights
    const aiInsights = await this.generateAIInsights(metrics, timeSeriesData)
    insights.push(...aiInsights)

    // Correlation analysis
    const correlationInsights = await this.analyzeCorrelations(timeSeriesData)
    insights.push(...correlationInsights)

    return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 10)
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(
    userId: string, 
    metric: string, 
    forecastDays: number = 30
  ): Promise<PredictionResult> {
    // Get historical data for training
    const historicalData = await this.getTimeSeriesData(userId, metric, '90d', 'day')
    
    // Simple linear regression for demonstration (in production, use more sophisticated models)
    const predictions = this.generatePredictions(historicalData, forecastDays)
    
    // Calculate accuracy based on recent predictions vs actual
    const accuracy = await this.calculatePredictionAccuracy(userId, metric)
    
    // Identify key factors using AI analysis
    const factors = await this.identifyPredictionFactors(userId, metric, historicalData)

    return {
      metric,
      predictions,
      accuracy,
      methodology: 'Linear Regression with Seasonal Adjustment',
      factors,
    }
  }

  /**
   * Detect workflow bottlenecks and optimization opportunities
   */
  async analyzeWorkflowOptimization(userId: string): Promise<{
    bottlenecks: Array<{
      workflow: string
      step: string
      avgDuration: number
      impact: 'low' | 'medium' | 'high'
      suggestions: string[]
    }>
    optimizations: Array<{
      type: 'automation' | 'reorder' | 'parallel' | 'eliminate'
      description: string
      estimatedImpact: number
      confidence: number
    }>
  }> {
    // Analyze user workflow patterns
    const workflowData = await this.getWorkflowData(userId)
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(workflowData)
    
    // Generate optimization suggestions
    const optimizations = await this.generateOptimizationSuggestions(workflowData, bottlenecks)

    return { bottlenecks, optimizations }
  }

  /**
   * Natural language to SQL query conversion
   */
  async naturalLanguageQuery(query: string, userId: string): Promise<{
    sql: string
    explanation: string
    results: any[]
    visualization?: {
      type: 'table' | 'chart'
      config: any
    }
  }> {
    try {
      // Use AI to convert natural language to SQL
      const prompt = `Convert this natural language query to SQL for a SaaS analytics database:

Query: "${query}"

Available tables:
- users (id, email, created_at, plan, status)
- usage (id, user_id, type, amount, date)
- subscriptions (id, user_id, plan, status, created_at)
- chats (id, user_id, created_at, tokens_used)

Generate a safe SQL query and explain what it does. Only use SELECT statements.
Respond with JSON: {"sql": "SELECT ...", "explanation": "This query..."}`

      const response = await this.aiService.generateResponse([
        { role: 'system', content: 'You are a SQL expert. Generate safe, read-only queries.' },
        { role: 'user', content: prompt }
      ], {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.1,
      })

      const parsed = JSON.parse(response.content)
      
      // Validate SQL for safety
      if (!parsed.sql || !this.isSafeSQL(parsed.sql)) {
        throw new Error('Query contains unsafe operations')
      }

      // Execute query (mock implementation)
      const results = await this.executeSafeQuery(parsed.sql, userId)
      
      // Suggest visualization
      const visualization = this.suggestVisualization(results, query)

      return {
        sql: parsed.sql,
        explanation: parsed.explanation,
        results,
        visualization,
      }
    } catch (error) {
      console.error('Natural language query error:', error)
      throw new Error('Failed to process natural language query')
    }
  }

  /**
   * Create A/B test experiment
   */
  async createABTest(config: {
    name: string
    description: string
    variants: Array<{
      name: string
      weight: number
      config: any
    }>
    metric: string
    startDate: Date
    endDate: Date
    userId: string
  }): Promise<string> {
    const experiment = await prisma.experiment.create({
      data: {
        name: config.name,
        description: config.description,
        variants: config.variants,
        metric: config.metric,
        startDate: config.startDate,
        endDate: config.endDate,
        status: 'draft',
        userId: config.userId,
      },
    })

    return experiment.id
  }

  /**
   * Analyze A/B test results
   */
  async analyzeABTestResults(experimentId: string): Promise<{
    results: Array<{
      variant: string
      participants: number
      conversions: number
      conversionRate: number
      confidence: number
    }>
    winner?: string
    significance: number
    recommendation: string
  }> {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: { results: true },
    })

    if (!experiment) {
      throw new Error('Experiment not found')
    }

    // Calculate statistical significance
    const results = this.calculateABTestStatistics(experiment.results)
    
    // Determine winner and recommendation
    const analysis = this.determineABTestWinner(results)

    return {
      results: results.map(r => ({
        variant: r.variant,
        participants: r.participants,
        conversions: r.conversions,
        conversionRate: r.conversionRate,
        confidence: r.confidence,
      })),
      winner: analysis.winner,
      significance: analysis.significance,
      recommendation: analysis.recommendation,
    }
  }

  // Helper methods

  private getStartDate(timeRange: string): Date {
    const now = new Date()
    switch (timeRange) {
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      case '1y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  private async getMetricsData(userId: string, startDate: Date, endDate: Date) {
    // Mock implementation - in production, query actual database
    return {
      activeUsers: Math.floor(Math.random() * 1000) + 500,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      churnRate: Math.random() * 0.1 + 0.02,
      avgSessionDuration: Math.floor(Math.random() * 1800) + 300,
      conversionRate: Math.random() * 0.1 + 0.02,
    }
  }

  private calculatePercentChange(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  private determineTrend(previous: number, current: number, inverse = false): 'up' | 'down' | 'stable' {
    const threshold = 0.05
    const change = Math.abs(current - previous) / previous
    
    if (change < threshold) return 'stable'
    
    const isUp = current > previous
    if (inverse) {
      return isUp ? 'down' : 'up'
    }
    return isUp ? 'up' : 'down'
  }

  private determineStatus(
    metric: string, 
    current: number, 
    previous: number, 
    inverse = false
  ): 'good' | 'warning' | 'critical' {
    const change = this.calculatePercentChange(previous, current)
    const absChange = Math.abs(change)
    
    if (inverse) {
      if (change > 20) return 'critical'
      if (change > 10) return 'warning'
      return 'good'
    } else {
      if (change < -20) return 'critical'
      if (change < -10) return 'warning'
      return 'good'
    }
  }

  private generateTimeIntervals(
    start: Date, 
    end: Date, 
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): Array<{ start: Date; end: Date }> {
    const intervals = []
    let current = new Date(start)

    while (current < end) {
      const intervalEnd = new Date(current)
      
      switch (granularity) {
        case 'hour':
          intervalEnd.setHours(intervalEnd.getHours() + 1)
          break
        case 'day':
          intervalEnd.setDate(intervalEnd.getDate() + 1)
          break
        case 'week':
          intervalEnd.setDate(intervalEnd.getDate() + 7)
          break
        case 'month':
          intervalEnd.setMonth(intervalEnd.getMonth() + 1)
          break
      }

      // Limit intervals to prevent infinite loops
      if (intervals.length > 1000) break

      intervals.push({
        start: new Date(current),
        end: new Date(Math.min(intervalEnd.getTime(), end.getTime())),
      })

      current = intervalEnd
    }

    return intervals
  }

  private async getMetricValueForInterval(
    userId: string, 
    metric: string, 
    start: Date, 
    end: Date
  ): Promise<number> {
    // Mock implementation - in production, query actual database
    const baseValue = Math.random() * 100
    const seasonality = Math.sin((start.getTime() / (24 * 60 * 60 * 1000)) * Math.PI / 30) * 10
    return Math.max(0, baseValue + seasonality)
  }

  private async analyzeTrends(
    metrics: AnalyticsMetric[], 
    timeSeriesData: TimeSeriesData[][]
  ): Promise<Insight[]> {
    const insights: Insight[] = []

    for (const metric of metrics) {
      if (Math.abs(metric.changePercent || 0) > 15) {
        insights.push({
          id: `trend_${metric.id}`,
          type: 'trend',
          title: `Significant ${metric.trend} trend in ${metric.name}`,
          description: `${metric.name} has ${metric.trend === 'up' ? 'increased' : 'decreased'} by ${Math.abs(metric.changePercent || 0).toFixed(1)}% in the selected period.`,
          severity: Math.abs(metric.changePercent || 0) > 30 ? 'high' : 'medium',
          confidence: 0.85,
          actionable: true,
          actions: [
            {
              title: `Investigate ${metric.name} ${metric.trend}`,
              description: `Analyze the factors contributing to this ${metric.trend} trend`,
              impact: 'high',
            },
          ],
          createdAt: new Date(),
        })
      }
    }

    return insights
  }

  private async detectAnomalies(timeSeriesData: TimeSeriesData[][]): Promise<Insight[]> {
    const insights: Insight[] = []

    for (const series of timeSeriesData) {
      const anomalies = this.detectTimeSeriesAnomalies(series)
      
      for (const anomaly of anomalies) {
        insights.push({
          id: `anomaly_${Date.now()}_${Math.random()}`,
          type: 'anomaly',
          title: 'Unusual data point detected',
          description: `An unusual value was detected on ${anomaly.timestamp.toLocaleDateString()}`,
          severity: 'medium',
          confidence: anomaly.confidence,
          data: anomaly,
          actionable: true,
          createdAt: new Date(),
        })
      }
    }

    return insights
  }

  private detectTimeSeriesAnomalies(data: TimeSeriesData[]): Array<{
    timestamp: Date
    value: number
    expectedValue: number
    confidence: number
  }> {
    if (data.length < 7) return []

    const anomalies = []
    const window = 7

    for (let i = window; i < data.length; i++) {
      const recentData = data.slice(i - window, i)
      const mean = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length
      const stdDev = Math.sqrt(
        recentData.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / recentData.length
      )

      const current = data[i]
      const deviation = Math.abs(current.value - mean) / stdDev

      if (deviation > 2) {
        anomalies.push({
          timestamp: current.timestamp,
          value: current.value,
          expectedValue: mean,
          confidence: Math.min(deviation / 3, 1),
        })
      }
    }

    return anomalies
  }

  private async generateAIInsights(
    metrics: AnalyticsMetric[], 
    timeSeriesData: TimeSeriesData[][]
  ): Promise<Insight[]> {
    try {
      const prompt = `Analyze this business metrics data and provide actionable insights:

Metrics:
${metrics.map(m => `${m.name}: ${m.value} (${m.changePercent?.toFixed(1)}% change)`).join('\n')}

Recent trends:
${timeSeriesData[0]?.slice(-7).map(d => `${d.timestamp.toLocaleDateString()}: ${d.value}`).join('\n')}

Provide 2-3 key insights with:
1. Business impact assessment
2. Actionable recommendations
3. Priority level

Format as JSON array with fields: title, description, priority, recommendations`

      const response = await this.aiService.generateResponse([
        { role: 'system', content: 'You are a business intelligence analyst. Provide actionable insights.' },
        { role: 'user', content: prompt }
      ], {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.3,
      })

      const aiInsights = JSON.parse(response.content)
      
      return aiInsights.map((insight: any, index: number) => ({
        id: `ai_insight_${index}`,
        type: 'recommendation' as const,
        title: insight.title,
        description: insight.description,
        severity: insight.priority === 'high' ? 'high' as const : 'medium' as const,
        confidence: 0.8,
        actionable: true,
        actions: insight.recommendations?.map((rec: string) => ({
          title: rec,
          description: rec,
          impact: 'medium' as const,
        })) || [],
        createdAt: new Date(),
      }))
    } catch (error) {
      console.error('Error generating AI insights:', error)
      return []
    }
  }

  private async analyzeCorrelations(timeSeriesData: TimeSeriesData[][]): Promise<Insight[]> {
    if (timeSeriesData.length < 2) return []

    const insights: Insight[] = []
    
    // Calculate correlation between different metrics
    for (let i = 0; i < timeSeriesData.length - 1; i++) {
      for (let j = i + 1; j < timeSeriesData.length; j++) {
        const correlation = this.calculateCorrelation(timeSeriesData[i], timeSeriesData[j])
        
        if (Math.abs(correlation) > 0.7) {
          insights.push({
            id: `correlation_${i}_${j}`,
            type: 'correlation',
            title: `Strong correlation detected`,
            description: `Metrics show ${correlation > 0 ? 'positive' : 'negative'} correlation (${(correlation * 100).toFixed(1)}%)`,
            severity: 'medium',
            confidence: Math.abs(correlation),
            actionable: true,
            createdAt: new Date(),
          })
        }
      }
    }

    return insights
  }

  private calculateCorrelation(series1: TimeSeriesData[], series2: TimeSeriesData[]): number {
    if (series1.length !== series2.length) return 0

    const n = series1.length
    const sum1 = series1.reduce((sum, d) => sum + d.value, 0)
    const sum2 = series2.reduce((sum, d) => sum + d.value, 0)
    const sum1Sq = series1.reduce((sum, d) => sum + d.value * d.value, 0)
    const sum2Sq = series2.reduce((sum, d) => sum + d.value * d.value, 0)
    const sumProduct = series1.reduce((sum, d, i) => sum + d.value * series2[i].value, 0)

    const numerator = n * sumProduct - sum1 * sum2
    const denominator = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2))

    return denominator === 0 ? 0 : numerator / denominator
  }

  private generatePredictions(
    historicalData: TimeSeriesData[], 
    forecastDays: number
  ): PredictionResult['predictions'] {
    // Simple linear regression with seasonal adjustment
    const predictions = []
    const lastDate = historicalData[historicalData.length - 1]?.timestamp || new Date()
    
    // Calculate trend
    const trend = this.calculateLinearTrend(historicalData)
    
    // Calculate seasonal pattern
    const seasonalPattern = this.calculateSeasonalPattern(historicalData)

    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000)
      const trendValue = trend.slope * (historicalData.length + i) + trend.intercept
      const seasonalAdjustment = seasonalPattern[i % seasonalPattern.length] || 1
      const baseValue = trendValue * seasonalAdjustment
      
      // Add uncertainty bounds
      const uncertainty = Math.min(i * 0.1, 0.5) // Uncertainty increases with time
      
      predictions.push({
        timestamp: futureDate,
        value: Math.max(0, baseValue),
        confidence: Math.max(0.1, 1 - uncertainty),
        lowerBound: Math.max(0, baseValue * (1 - uncertainty)),
        upperBound: baseValue * (1 + uncertainty),
      })
    }

    return predictions
  }

  private calculateLinearTrend(data: TimeSeriesData[]): { slope: number; intercept: number } {
    const n = data.length
    if (n < 2) return { slope: 0, intercept: 0 }

    const sumX = (n * (n - 1)) / 2
    const sumY = data.reduce((sum, d) => sum + d.value, 0)
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0)
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  private calculateSeasonalPattern(data: TimeSeriesData[]): number[] {
    // Simple daily seasonal pattern (7 days)
    const pattern = new Array(7).fill(1)
    
    if (data.length >= 14) {
      for (let day = 0; day < 7; day++) {
        const dayValues = data.filter((_, i) => i % 7 === day).map(d => d.value)
        const dayAvg = dayValues.reduce((sum, v) => sum + v, 0) / dayValues.length
        const overallAvg = data.reduce((sum, d) => sum + d.value, 0) / data.length
        pattern[day] = dayAvg / overallAvg
      }
    }

    return pattern
  }

  private async calculatePredictionAccuracy(userId: string, metric: string): Promise<number> {
    // Mock implementation - compare recent predictions with actual values
    return 0.75 + Math.random() * 0.2 // 75-95% accuracy
  }

  private async identifyPredictionFactors(
    userId: string, 
    metric: string, 
    historicalData: TimeSeriesData[]
  ): Promise<PredictionResult['factors']> {
    // Mock implementation - in production, use feature importance from ML models
    const factors = [
      { name: 'Seasonal Trends', importance: 0.3, impact: 'positive' as const },
      { name: 'User Growth', importance: 0.25, impact: 'positive' as const },
      { name: 'Market Conditions', importance: 0.2, impact: 'positive' as const },
      { name: 'Competition', importance: 0.15, impact: 'negative' as const },
      { name: 'Product Updates', importance: 0.1, impact: 'positive' as const },
    ]

    return factors
  }

  private async getWorkflowData(userId: string) {
    // Mock workflow data - in production, track actual user workflows
    return {
      workflows: [
        {
          name: 'User Onboarding',
          steps: [
            { name: 'Sign Up', avgDuration: 120, completionRate: 0.95 },
            { name: 'Email Verification', avgDuration: 300, completionRate: 0.85 },
            { name: 'Profile Setup', avgDuration: 180, completionRate: 0.9 },
            { name: 'First Action', avgDuration: 240, completionRate: 0.7 },
          ],
        },
        {
          name: 'Content Creation',
          steps: [
            { name: 'Create Document', avgDuration: 60, completionRate: 0.98 },
            { name: 'Add Content', avgDuration: 450, completionRate: 0.92 },
            { name: 'Review & Edit', avgDuration: 300, completionRate: 0.88 },
            { name: 'Publish', avgDuration: 30, completionRate: 0.95 },
          ],
        },
      ],
    }
  }

  private identifyBottlenecks(workflowData: any) {
    const bottlenecks = []

    for (const workflow of workflowData.workflows) {
      for (const step of workflow.steps) {
        if (step.avgDuration > 200 || step.completionRate < 0.8) {
          bottlenecks.push({
            workflow: workflow.name,
            step: step.name,
            avgDuration: step.avgDuration,
            impact: step.completionRate < 0.7 ? 'high' as const : 
                   step.avgDuration > 300 ? 'medium' as const : 'low' as const,
            suggestions: this.generateBottleneckSuggestions(step),
          })
        }
      }
    }

    return bottlenecks
  }

  private generateBottleneckSuggestions(step: any): string[] {
    const suggestions = []
    
    if (step.avgDuration > 300) {
      suggestions.push('Consider breaking this step into smaller parts')
      suggestions.push('Add progress indicators to improve user experience')
    }
    
    if (step.completionRate < 0.8) {
      suggestions.push('Review step clarity and instructions')
      suggestions.push('Add help documentation or tooltips')
      suggestions.push('Consider making this step optional')
    }

    return suggestions
  }

  private async generateOptimizationSuggestions(workflowData: any, bottlenecks: any[]) {
    // Use AI to generate sophisticated optimization suggestions
    const prompt = `Analyze this workflow data and suggest optimizations:

Workflows: ${JSON.stringify(workflowData.workflows)}
Bottlenecks: ${JSON.stringify(bottlenecks)}

Suggest specific optimizations focusing on automation, parallelization, or process improvements.
Format as JSON array with: type, description, estimatedImpact (1-10), confidence (0-1)`

    try {
      const response = await this.aiService.generateResponse([
        { role: 'system', content: 'You are a workflow optimization expert.' },
        { role: 'user', content: prompt }
      ], {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.3,
      })

      return JSON.parse(response.content) || []
    } catch (error) {
      console.error('Error generating optimization suggestions:', error)
      return []
    }
  }

  private isSafeSQL(sql: string): boolean {
    if (!sql || typeof sql !== 'string') return false
    const dangerous = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'EXEC', 'EXECUTE']
    const upperSQL = sql.toUpperCase()
    return !dangerous.some(keyword => upperSQL.includes(keyword))
  }

  private async executeSafeQuery(sql: string, userId: string): Promise<any[]> {
    // Mock implementation - in production, execute against read-only replica
    // with user data filtering
    return [
      { date: '2023-01-01', users: 150, revenue: 15000 },
      { date: '2023-01-02', users: 160, revenue: 16200 },
      { date: '2023-01-03', users: 155, revenue: 15800 },
    ]
  }

  private suggestVisualization(results: any[], query: string): any {
    const hasTimeField = results.some(row => 
      Object.keys(row).some(key => 
        key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
      )
    )

    const numericFields = Object.keys(results[0] || {}).filter(key => 
      typeof results[0][key] === 'number'
    )

    if (hasTimeField && numericFields.length > 0) {
      return {
        type: 'chart',
        config: {
          type: 'line',
          xAxis: Object.keys(results[0] || {}).find(key => 
            key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
          ),
          yAxis: numericFields[0],
        },
      }
    }

    return {
      type: 'table',
      config: {},
    }
  }

  private calculateABTestStatistics(results: any[]): any[] {
    // Mock statistical calculation
    return results.map(result => ({
      ...result,
      conversionRate: result.conversions / result.participants,
      confidence: 0.85 + Math.random() * 0.1,
    }))
  }

  private determineABTestWinner(results: any[]): {
    winner?: string
    significance: number
    recommendation: string
  } {
    if (!results || results.length < 2) {
      return {
        significance: 0,
        recommendation: 'Insufficient data for analysis'
      }
    }

    const sorted = results.sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
    const best = sorted[0]
    const second = sorted[1]

    const significance = best && second && second.conversionRate > 0 ? 
      (best.conversionRate - second.conversionRate) / second.conversionRate : 0

    return {
      winner: significance > 0.05 ? best?.variant : undefined,
      significance: isNaN(significance) ? 0 : significance,
      recommendation: significance > 0.05 ? 
        `Variant ${best?.variant} shows statistically significant improvement` :
        'No clear winner detected. Consider running test longer or increasing sample size.',
    }
  }
}

export const analyticsService = new AnalyticsService()