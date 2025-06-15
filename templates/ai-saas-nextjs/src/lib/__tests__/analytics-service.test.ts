// Mock Prisma first before any imports
jest.mock('../prisma', () => ({
  prisma: {
    experiment: {
      create: jest.fn().mockResolvedValue({
        id: 'exp-123',
        name: 'Test Experiment',
        status: 'draft',
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'exp-123',
        name: 'Test Experiment',
        results: [
          { variant: 'A', participants: 100, conversions: 12 },
          { variant: 'B', participants: 100, conversions: 18 },
        ],
      }),
    },
  },
}))

// Mock the AI service
jest.mock('../ai-service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockImplementation((messages, options) => {
      const userMessage = messages.find(m => m.role === 'user')?.content || ''
      
      if (userMessage.includes('optimization suggestions')) {
        return Promise.resolve({
          content: JSON.stringify([
            {
              type: 'automation',
              description: 'Automate manual step',
              estimatedImpact: 8,
              confidence: 0.9
            }
          ])
        })
      }
      
      if (userMessage.includes('natural language query')) {
        return Promise.resolve({
          content: JSON.stringify({
            sql: 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL 30 DAY',
            explanation: 'This query retrieves users created in the last 30 days'
          })
        })
      }
      
      // Default response for insights
      return Promise.resolve({
        content: JSON.stringify([
          {
            title: 'Revenue Growth Opportunity',
            description: 'Significant potential for growth in premium conversions',
            priority: 'high',
            recommendations: [
              'Implement targeted upselling campaigns',
              'Improve onboarding for premium features'
            ]
          }
        ])
      })
    }),
  })),
}))

import { AnalyticsService } from '../analytics-service'

describe('AnalyticsService', () => {
  let service: AnalyticsService

  beforeEach(() => {
    service = new AnalyticsService()
    jest.clearAllMocks()
  })

  describe('Key Metrics', () => {
    it('should return key metrics with proper structure', async () => {
      const metrics = await service.getKeyMetrics('user-123', '30d')

      expect(metrics).toHaveLength(5)
      expect(metrics[0]).toMatchObject({
        id: 'active_users',
        name: 'Active Users',
        value: expect.any(Number),
        trend: expect.stringMatching(/^(up|down|stable)$/),
        status: expect.stringMatching(/^(good|warning|critical)$/),
        timestamp: expect.any(Date),
      })
    })

    it('should calculate percentage changes correctly', async () => {
      const metrics = await service.getKeyMetrics('user-123', '7d')

      metrics.forEach(metric => {
        if (metric.previousValue && metric.previousValue > 0) {
          const expectedChange = ((metric.value - metric.previousValue) / metric.previousValue) * 100
          expect(metric.changePercent).toBeCloseTo(expectedChange, 1)
        }
      })
    })

    it('should determine trends correctly', async () => {
      const metrics = await service.getKeyMetrics('user-123', '30d')

      metrics.forEach(metric => {
        if (metric.previousValue !== undefined) {
          if (metric.id === 'churn_rate') {
            // Churn rate has inverse trend logic
            if (metric.value > metric.previousValue) {
              expect(metric.trend).toBe('down') // Higher churn is bad (down trend)
            }
          } else {
            if (metric.value > metric.previousValue) {
              expect(metric.trend).toBe('up')
            }
          }
        }
      })
    })
  })

  describe('Time Series Data', () => {
    it('should generate time series data with correct intervals', async () => {
      const data = await service.getTimeSeriesData('user-123', 'active_users', '7d', 'day')

      expect(data.length).toBe(7)
      data.forEach(point => {
        expect(point).toMatchObject({
          timestamp: expect.any(Date),
          value: expect.any(Number),
        })
        expect(point.value).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle different granularities', async () => {
      const hourlyData = await service.getTimeSeriesData('user-123', 'revenue', '24h', 'hour')
      const dailyData = await service.getTimeSeriesData('user-123', 'revenue', '7d', 'day')

      expect(hourlyData.length).toBeLessThanOrEqual(25) // Allow for rounding
      expect(dailyData.length).toBeLessThanOrEqual(8) // Allow for rounding
      expect(hourlyData.length).toBeGreaterThan(20)
      expect(dailyData.length).toBeGreaterThan(5)
    })
  })

  describe('AI Insights Generation', () => {
    it('should generate insights with proper structure', async () => {
      const insights = await service.generateInsights('user-123', '30d')

      expect(insights).toBeDefined()
      expect(Array.isArray(insights)).toBe(true)
      
      if (insights.length > 0) {
        expect(insights[0]).toMatchObject({
          id: expect.any(String),
          type: expect.stringMatching(/^(trend|anomaly|correlation|prediction|recommendation)$/),
          title: expect.any(String),
          description: expect.any(String),
          severity: expect.stringMatching(/^(low|medium|high|critical)$/),
          confidence: expect.any(Number),
          actionable: expect.any(Boolean),
          createdAt: expect.any(Date),
        })
      }
    })

    it('should sort insights by confidence', async () => {
      const insights = await service.generateInsights('user-123', '30d')

      for (let i = 1; i < insights.length; i++) {
        expect(insights[i-1].confidence).toBeGreaterThanOrEqual(insights[i].confidence)
      }
    })

    it('should limit insights to top 10', async () => {
      const insights = await service.generateInsights('user-123', '30d')
      expect(insights.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Predictive Analytics', () => {
    it('should generate predictions with proper structure', async () => {
      const predictions = await service.getPredictiveAnalytics('user-123', 'active_users', 30)

      expect(predictions).toMatchObject({
        metric: 'active_users',
        predictions: expect.any(Array),
        accuracy: expect.any(Number),
        methodology: expect.any(String),
        factors: expect.any(Array),
      })

      expect(predictions.predictions).toHaveLength(30)
      expect(predictions.accuracy).toBeGreaterThanOrEqual(0)
      expect(predictions.accuracy).toBeLessThanOrEqual(1)
    })

    it('should generate valid prediction points', async () => {
      const predictions = await service.getPredictiveAnalytics('user-123', 'revenue', 14)

      predictions.predictions.forEach(prediction => {
        expect(prediction).toMatchObject({
          timestamp: expect.any(Date),
          value: expect.any(Number),
          confidence: expect.any(Number),
          lowerBound: expect.any(Number),
          upperBound: expect.any(Number),
        })

        expect(prediction.value).toBeGreaterThanOrEqual(0)
        expect(prediction.confidence).toBeGreaterThanOrEqual(0.1)
        expect(prediction.confidence).toBeLessThanOrEqual(1)
        expect(prediction.lowerBound).toBeLessThanOrEqual(prediction.value)
        expect(prediction.upperBound).toBeGreaterThanOrEqual(prediction.value)
      })
    })

    it('should include prediction factors', async () => {
      const predictions = await service.getPredictiveAnalytics('user-123', 'churn_rate', 30)

      expect(predictions.factors.length).toBeGreaterThan(0)
      predictions.factors.forEach(factor => {
        expect(factor).toMatchObject({
          name: expect.any(String),
          importance: expect.any(Number),
          impact: expect.stringMatching(/^(positive|negative)$/),
        })
        expect(factor.importance).toBeGreaterThanOrEqual(0)
        expect(factor.importance).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Workflow Optimization', () => {
    it('should analyze workflow bottlenecks', async () => {
      const analysis = await service.analyzeWorkflowOptimization('user-123')

      expect(analysis).toMatchObject({
        bottlenecks: expect.any(Array),
        optimizations: expect.any(Array),
      })

      analysis.bottlenecks.forEach(bottleneck => {
        expect(bottleneck).toMatchObject({
          workflow: expect.any(String),
          step: expect.any(String),
          avgDuration: expect.any(Number),
          impact: expect.stringMatching(/^(low|medium|high)$/),
          suggestions: expect.any(Array),
        })
      })
    })

    it('should generate optimization suggestions', async () => {
      const analysis = await service.analyzeWorkflowOptimization('user-123')

      analysis.optimizations.forEach(optimization => {
        expect(optimization).toMatchObject({
          type: expect.stringMatching(/^(automation|reorder|parallel|eliminate)$/),
          description: expect.any(String),
          estimatedImpact: expect.any(Number),
          confidence: expect.any(Number),
        })
      })
    })
  })

  describe('Natural Language Queries', () => {
    it('should convert natural language to SQL', async () => {
      const query = 'Show me users who signed up last month'
      const result = await service.naturalLanguageQuery(query, 'user-123')

      expect(result).toMatchObject({
        sql: expect.any(String),
        explanation: expect.any(String),
        results: expect.any(Array),
      })

      expect(result.sql).toContain('SELECT')
      expect(result.sql.toUpperCase()).not.toContain('DELETE')
      expect(result.sql.toUpperCase()).not.toContain('UPDATE')
      expect(result.sql.toUpperCase()).not.toContain('INSERT')
    })

    it('should provide query explanations', async () => {
      const query = 'Count active users in the last week'
      const result = await service.naturalLanguageQuery(query, 'user-123')

      expect(result.explanation).toBeDefined()
      expect(result.explanation.length).toBeGreaterThan(10)
    })

    it('should suggest appropriate visualizations', async () => {
      const query = 'Show revenue over time'
      const result = await service.naturalLanguageQuery(query, 'user-123')

      if (result.visualization) {
        expect(result.visualization).toMatchObject({
          type: expect.stringMatching(/^(table|chart)$/),
          config: expect.any(Object),
        })
      }
    })
  })

  describe('A/B Testing', () => {
    it('should create A/B test experiments', async () => {
      const config = {
        name: 'Button Color Test',
        description: 'Testing different button colors',
        variants: [
          { name: 'Control', weight: 0.5, config: { color: 'blue' } },
          { name: 'Treatment', weight: 0.5, config: { color: 'green' } },
        ],
        metric: 'conversion_rate',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userId: 'user-123',
      }

      const experimentId = await service.createABTest(config)

      expect(experimentId).toBeDefined()
      expect(typeof experimentId).toBe('string')
    })

    it('should analyze A/B test results', async () => {
      const analysis = await service.analyzeABTestResults('exp-123')

      expect(analysis).toMatchObject({
        results: expect.any(Array),
        significance: expect.any(Number),
        recommendation: expect.any(String),
      })

      analysis.results.forEach(result => {
        expect(result).toMatchObject({
          variant: expect.any(String),
          participants: expect.any(Number),
          conversions: expect.any(Number),
          conversionRate: expect.any(Number),
          confidence: expect.any(Number),
        })
      })
    })

    it('should determine statistical significance', async () => {
      const analysis = await service.analyzeABTestResults('exp-123')

      expect(analysis.significance).toBeGreaterThanOrEqual(0)
      expect(analysis.recommendation).toBeDefined()

      if (analysis.winner) {
        expect(typeof analysis.winner).toBe('string')
      }
    })
  })

  describe('Helper Methods', () => {
    it('should calculate correlation correctly', () => {
      const series1 = [
        { timestamp: new Date(), value: 10 },
        { timestamp: new Date(), value: 20 },
        { timestamp: new Date(), value: 30 },
      ]
      const series2 = [
        { timestamp: new Date(), value: 15 },
        { timestamp: new Date(), value: 25 },
        { timestamp: new Date(), value: 35 },
      ]

      const correlation = service['calculateCorrelation'](series1, series2)
      expect(correlation).toBeCloseTo(1, 2) // Perfect positive correlation
    })

    it('should detect anomalies in time series', () => {
      const normalData = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        value: 100 + Math.random() * 10, // Normal range: 100-110
      }))

      // Add anomaly
      const dataWithAnomaly = [
        ...normalData,
        {
          timestamp: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          value: 200, // Anomaly: much higher than normal
        },
      ]

      const anomalies = service['detectTimeSeriesAnomalies'](dataWithAnomaly)
      expect(anomalies.length).toBeGreaterThan(0)
    })

    it('should validate SQL safety', () => {
      const safeQueries = [
        'SELECT * FROM users',
        'SELECT COUNT(*) FROM subscriptions WHERE status = "active"',
      ]

      const unsafeQueries = [
        'DELETE FROM users',
        'UPDATE users SET password = "hacked"',
        'DROP TABLE users',
      ]

      safeQueries.forEach(query => {
        expect(service['isSafeSQL'](query)).toBe(true)
      })

      unsafeQueries.forEach(query => {
        expect(service['isSafeSQL'](query)).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockRejectedValue(new Error('AI service error'))

      const insights = await service.generateInsights('user-123', '30d')
      
      // Should still return basic insights even if AI fails
      expect(insights).toBeDefined()
      expect(Array.isArray(insights)).toBe(true)
    })

    it('should handle invalid natural language queries', async () => {
      await expect(
        service.naturalLanguageQuery('', 'user-123')
      ).rejects.toThrow()
    })

    it('should handle missing experiment data', async () => {
      const { prisma } = require('../prisma')
      prisma.experiment.findUnique.mockResolvedValue(null)

      await expect(
        service.analyzeABTestResults('non-existent-exp')
      ).rejects.toThrow('Experiment not found')
    })
  })

  describe('Data Quality', () => {
    it('should ensure metrics have valid values', async () => {
      const metrics = await service.getKeyMetrics('user-123', '30d')

      metrics.forEach(metric => {
        expect(metric.value).toBeGreaterThanOrEqual(0)
        if (metric.changePercent !== undefined) {
          expect(isFinite(metric.changePercent)).toBe(true)
        }
      })
    })

    it('should generate realistic time series data', async () => {
      const data = await service.getTimeSeriesData('user-123', 'active_users', '30d', 'day')

      // Check for reasonable variance (not all values should be the same)
      const values = data.map(d => d.value)
      const min = Math.min(...values)
      const max = Math.max(...values)
      expect(max - min).toBeGreaterThan(0)

      // Check for temporal ordering
      for (let i = 1; i < data.length; i++) {
        expect(data[i].timestamp.getTime()).toBeGreaterThan(data[i-1].timestamp.getTime())
      }
    })
  })
})