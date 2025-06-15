'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info, Zap, Target, Brain, Search } from 'lucide-react'
import type { AnalyticsMetric, Insight, PredictionResult } from '@/lib/analytics-service'

interface AnalyticsData {
  metrics: AnalyticsMetric[]
  insights: Insight[]
  timeRange: string
  generatedAt: string
}

interface PredictiveData {
  predictions: PredictionResult
  metric: string
  forecastDays: number
  generatedAt: string
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [predictiveData, setPredictiveData] = useState<PredictiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('active_users')
  const [nlQuery, setNlQuery] = useState('')
  const [queryResult, setQueryResult] = useState<any>(null)
  const [queryLoading, setQueryLoading] = useState(false)

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch metrics and insights in parallel
        const [metricsResponse, insightsResponse] = await Promise.all([
          fetch(`/api/analytics/metrics?timeRange=${timeRange}`),
          fetch(`/api/analytics/insights?timeRange=${timeRange}`)
        ])

        if (!metricsResponse.ok || !insightsResponse.ok) {
          throw new Error('Failed to fetch analytics data')
        }

        const [metricsData, insightsData] = await Promise.all([
          metricsResponse.json(),
          insightsResponse.json()
        ])

        setAnalyticsData({
          metrics: metricsData.metrics,
          insights: insightsData.insights,
          timeRange: metricsData.timeRange,
          generatedAt: metricsData.generatedAt,
        })
      } catch (error) {
        console.error('Analytics error:', error)
        setError('Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [timeRange])

  // Load predictive analytics
  const loadPredictions = async () => {
    try {
      const response = await fetch(`/api/analytics/predictions?metric=${selectedMetric}&days=30`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch predictions')
      }

      const data = await response.json()
      setPredictiveData(data)
    } catch (error) {
      console.error('Predictions error:', error)
    }
  }

  // Handle natural language query
  const handleNLQuery = async () => {
    if (!nlQuery.trim()) return

    try {
      setQueryLoading(true)
      const response = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery }),
      })

      if (!response.ok) {
        throw new Error('Failed to process query')
      }

      const result = await response.json()
      setQueryResult(result)
    } catch (error) {
      console.error('Query error:', error)
    } finally {
      setQueryLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium': return <Info className="h-4 w-4 text-blue-500" />
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Intelligence</h1>
            <p className="text-gray-600 mt-2">AI-powered analytics and insights for your business</p>
          </div>
          <div className="flex gap-3">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="query">Natural Language</TabsTrigger>
            <TabsTrigger value="experiments">A/B Tests</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analyticsData?.metrics.map((metric) => (
                <Card key={metric.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                    {getTrendIcon(metric.trend)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
                    <div className="flex items-center space-x-2 text-xs">
                      <Badge className={getStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                      {metric.changePercent && (
                        <span className={`${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts would go here - simplified for this implementation */}
            <Card>
              <CardHeader>
                <CardTitle>Trends Overview</CardTitle>
                <CardDescription>Key metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Chart visualization would be implemented here with real time series data
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyticsData?.insights.map((insight) => (
                <Card key={insight.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(insight.severity)}
                        <Badge variant="outline">{insight.type}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Confidence: {Math.round(insight.confidence * 100)}%
                      </span>
                      <Badge variant={insight.actionable ? 'default' : 'secondary'}>
                        {insight.actionable ? 'Actionable' : 'Informational'}
                      </Badge>
                    </div>
                    {insight.actions && insight.actions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Recommended Actions:</h4>
                        {insight.actions.map((action, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg">
                            <div className="font-medium text-sm">{action.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{action.description}</div>
                            <Badge size="sm" className="mt-2">{action.impact} impact</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Predictive Analytics
              </h2>
              <div className="flex gap-3">
                <select 
                  value={selectedMetric} 
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="active_users">Active Users</option>
                  <option value="revenue">Revenue</option>
                  <option value="churn_rate">Churn Rate</option>
                </select>
                <Button onClick={loadPredictions}>
                  <Target className="h-4 w-4 mr-2" />
                  Generate Forecast
                </Button>
              </div>
            </div>

            {predictiveData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Forecast: {predictiveData.metric}</CardTitle>
                    <CardDescription>
                      {predictiveData.forecastDays}-day prediction with {Math.round(predictiveData.predictions.accuracy * 100)}% accuracy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      Prediction chart would be rendered here
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Factors</CardTitle>
                    <CardDescription>Influences on predictions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {predictiveData.predictions.factors.map((factor, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{factor.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${factor.importance * 100}%` }}
                            ></div>
                          </div>
                          <Badge size="sm" variant={factor.impact === 'positive' ? 'default' : 'destructive'}>
                            {factor.impact}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Natural Language Query Tab */}
          <TabsContent value="query" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Natural Language Data Query
                </CardTitle>
                <CardDescription>
                  Ask questions about your data in plain English
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="e.g., Show me users who signed up last month"
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNLQuery()}
                  />
                  <Button onClick={handleNLQuery} disabled={queryLoading}>
                    {queryLoading ? 'Processing...' : 'Query'}
                  </Button>
                </div>

                {queryResult && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Generated SQL:</h4>
                      <code className="text-xs bg-gray-100 p-2 rounded block">
                        {queryResult.sql}
                      </code>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Explanation:</h4>
                      <p className="text-sm text-gray-600">{queryResult.explanation}</p>
                    </div>

                    {queryResult.results && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Results:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                {Object.keys(queryResult.results[0] || {}).map((key) => (
                                  <th key={key} className="text-left p-2 font-medium">{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.results.slice(0, 10).map((row: any, index: number) => (
                                <tr key={index} className="border-b">
                                  {Object.values(row).map((value: any, cellIndex) => (
                                    <td key={cellIndex} className="p-2">{String(value)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* A/B Tests Tab */}
          <TabsContent value="experiments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="h-6 w-6" />
                A/B Testing Framework
              </h2>
              <Button>
                Create New Experiment
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Experiments</CardTitle>
                <CardDescription>Running A/B tests and their performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  No active experiments. Create your first A/B test to get started.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}