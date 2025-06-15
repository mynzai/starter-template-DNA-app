/**
 * Universal Quality Metrics Dashboard
 * Displays comprehensive quality metrics for all template types
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';

interface QualityMetrics {
  timestamp: string;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  performance: {
    buildTime: number;
    testTime: number;
    bundleSize: number;
    lighthouse: {
      performance: number;
      accessibility: number;
      bestPractices: number;
      seo: number;
      pwa: number;
    };
  };
  security: {
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    secrets: number;
    dependencies: {
      total: number;
      outdated: number;
      vulnerable: number;
    };
  };
  codeQuality: {
    lintErrors: number;
    lintWarnings: number;
    codeSmells: number;
    technicalDebt: number; // in minutes
    maintainabilityIndex: number;
    cyclomaticComplexity: number;
  };
  testing: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    flakyTests: number;
    testExecutionTime: number;
  };
  deployment: {
    successRate: number;
    frequency: number;
    leadTime: number; // in hours
    recoveryTime: number; // in hours
  };
}

interface QualityTrend {
  date: string;
  qualityScore: number;
  coverage: number;
  performance: number;
  security: number;
  maintainability: number;
}

const QualityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [trends, setTrends] = useState<QualityTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchQualityMetrics();
    fetchQualityTrends();
  }, [timeRange]);

  const fetchQualityMetrics = async () => {
    try {
      // In a real implementation, this would fetch from your metrics API
      const response = await fetch(`/api/quality/metrics?range=${timeRange}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch quality metrics:', error);
      // Fallback to mock data for demo
      setMetrics(getMockMetrics());
    } finally {
      setLoading(false);
    }
  };

  const fetchQualityTrends = async () => {
    try {
      const response = await fetch(`/api/quality/trends?range=${timeRange}`);
      const data = await response.json();
      setTrends(data);
    } catch (error) {
      console.error('Failed to fetch quality trends:', error);
      setTrends(getMockTrends());
    }
  };

  const calculateQualityScore = (metrics: QualityMetrics): number => {
    const weights = {
      coverage: 0.25,
      performance: 0.20,
      security: 0.25,
      codeQuality: 0.20,
      testing: 0.10,
    };

    const coverageScore = (
      metrics.coverage.lines +
      metrics.coverage.branches +
      metrics.coverage.functions +
      metrics.coverage.statements
    ) / 4;

    const performanceScore = (
      metrics.performance.lighthouse.performance +
      metrics.performance.lighthouse.accessibility +
      metrics.performance.lighthouse.bestPractices +
      metrics.performance.lighthouse.seo
    ) / 4;

    const securityScore = Math.max(0, 100 - (
      metrics.security.vulnerabilities.critical * 20 +
      metrics.security.vulnerabilities.high * 10 +
      metrics.security.vulnerabilities.medium * 5 +
      metrics.security.vulnerabilities.low * 1 +
      metrics.security.secrets * 15
    ));

    const codeQualityScore = Math.max(0, 100 - (
      metrics.codeQuality.lintErrors * 2 +
      metrics.codeQuality.lintWarnings * 0.5 +
      metrics.codeQuality.codeSmells * 1
    ));

    const testingScore = metrics.testing.totalTests > 0 
      ? (metrics.testing.passedTests / metrics.testing.totalTests) * 100
      : 0;

    return Math.round(
      coverageScore * weights.coverage +
      performanceScore * weights.performance +
      securityScore * weights.security +
      codeQualityScore * weights.codeQuality +
      testingScore * weights.testing
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 80) return '#f59e0b'; // yellow
    if (score >= 70) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center text-gray-500 p-8">
        Failed to load quality metrics
      </div>
    );
  }

  const qualityScore = calculateQualityScore(metrics);
  const vulnerabilityData = [
    { name: 'Critical', value: metrics.security.vulnerabilities.critical, color: '#dc2626' },
    { name: 'High', value: metrics.security.vulnerabilities.high, color: '#ea580c' },
    { name: 'Medium', value: metrics.security.vulnerabilities.medium, color: '#d97706' },
    { name: 'Low', value: metrics.security.vulnerabilities.low, color: '#65a30d' },
  ];

  const coverageData = [
    { name: 'Lines', value: metrics.coverage.lines },
    { name: 'Branches', value: metrics.coverage.branches },
    { name: 'Functions', value: metrics.coverage.functions },
    { name: 'Statements', value: metrics.coverage.statements },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quality Dashboard</h1>
          <p className="text-gray-600">Comprehensive quality metrics and trends</p>
          
          {/* Time Range Selector */}
          <div className="mt-4 flex space-x-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="col-span-1 md:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Overall Quality Score</h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <ResponsiveContainer width={120} height={120}>
                  <RadialBarChart data={[{ score: qualityScore }]} startAngle={90} endAngle={-270}>
                    <RadialBar
                      dataKey="score"
                      cornerRadius={10}
                      fill={getScoreColor(qualityScore)}
                      maxValue={100}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: getScoreColor(qualityScore) }}>
                      {qualityScore}
                    </div>
                    <div className="text-sm text-gray-500">
                      Grade {getScoreGrade(qualityScore)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Coverage</span>
                      <span>{Math.round((metrics.coverage.lines + metrics.coverage.branches + metrics.coverage.functions + metrics.coverage.statements) / 4)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(metrics.coverage.lines + metrics.coverage.branches + metrics.coverage.functions + metrics.coverage.statements) / 4}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Performance</span>
                      <span>{Math.round((metrics.performance.lighthouse.performance + metrics.performance.lighthouse.accessibility + metrics.performance.lighthouse.bestPractices + metrics.performance.lighthouse.seo) / 4)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(metrics.performance.lighthouse.performance + metrics.performance.lighthouse.accessibility + metrics.performance.lighthouse.bestPractices + metrics.performance.lighthouse.seo) / 4}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Security</span>
                      <span>{Math.max(0, 100 - (metrics.security.vulnerabilities.critical * 20 + metrics.security.vulnerabilities.high * 10 + metrics.security.vulnerabilities.medium * 5 + metrics.security.vulnerabilities.low * 1))}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full" 
                        style={{ width: `${Math.max(0, 100 - (metrics.security.vulnerabilities.critical * 20 + metrics.security.vulnerabilities.high * 10 + metrics.security.vulnerabilities.medium * 5 + metrics.security.vulnerabilities.low * 1))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Test Coverage</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {Math.round((metrics.coverage.lines + metrics.coverage.branches + metrics.coverage.functions + metrics.coverage.statements) / 4)}%
            </div>
            <div className="text-sm text-gray-500">
              {metrics.testing.passedTests}/{metrics.testing.totalTests} tests passing
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3">Security Score</h3>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {metrics.security.vulnerabilities.critical + metrics.security.vulnerabilities.high + metrics.security.vulnerabilities.medium + metrics.security.vulnerabilities.low}
            </div>
            <div className="text-sm text-gray-500">
              {metrics.security.vulnerabilities.critical} critical issues
            </div>
          </div>
        </div>

        {/* Quality Trends */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quality Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="qualityScore" stroke="#2563eb" strokeWidth={2} name="Quality Score" />
              <Line type="monotone" dataKey="coverage" stroke="#10b981" strokeWidth={2} name="Coverage" />
              <Line type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={2} name="Performance" />
              <Line type="monotone" dataKey="security" stroke="#ef4444" strokeWidth={2} name="Security" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coverage Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Coverage Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={coverageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Security Vulnerabilities */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Security Vulnerabilities</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={vulnerabilityData.filter(item => item.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {vulnerabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Build Time</span>
                <span className="font-semibold">{metrics.performance.buildTime}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Test Time</span>
                <span className="font-semibold">{metrics.performance.testTime}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Bundle Size</span>
                <span className="font-semibold">{(metrics.performance.bundleSize / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Lighthouse Score</span>
                <span className="font-semibold">{metrics.performance.lighthouse.performance}/100</span>
              </div>
            </div>
          </div>

          {/* Code Quality */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Code Quality</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Lint Errors</span>
                <span className={`font-semibold ${metrics.codeQuality.lintErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.codeQuality.lintErrors}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Lint Warnings</span>
                <span className={`font-semibold ${metrics.codeQuality.lintWarnings > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.codeQuality.lintWarnings}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Code Smells</span>
                <span className="font-semibold">{metrics.codeQuality.codeSmells}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Technical Debt</span>
                <span className="font-semibold">{Math.round(metrics.codeQuality.technicalDebt / 60)}h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock data for demonstration
const getMockMetrics = (): QualityMetrics => ({
  timestamp: new Date().toISOString(),
  coverage: {
    lines: 85,
    branches: 78,
    functions: 92,
    statements: 87,
  },
  performance: {
    buildTime: 45,
    testTime: 12,
    bundleSize: 2048000,
    lighthouse: {
      performance: 92,
      accessibility: 95,
      bestPractices: 88,
      seo: 90,
      pwa: 85,
    },
  },
  security: {
    vulnerabilities: {
      critical: 0,
      high: 1,
      medium: 3,
      low: 5,
    },
    secrets: 0,
    dependencies: {
      total: 245,
      outdated: 12,
      vulnerable: 4,
    },
  },
  codeQuality: {
    lintErrors: 2,
    lintWarnings: 8,
    codeSmells: 15,
    technicalDebt: 180,
    maintainabilityIndex: 78,
    cyclomaticComplexity: 3.2,
  },
  testing: {
    totalTests: 156,
    passedTests: 152,
    failedTests: 2,
    skippedTests: 2,
    flakyTests: 1,
    testExecutionTime: 12.5,
  },
  deployment: {
    successRate: 94,
    frequency: 2.3,
    leadTime: 4.5,
    recoveryTime: 0.8,
  },
});

const getMockTrends = (): QualityTrend[] => {
  const days = 30;
  const trends: QualityTrend[] = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      qualityScore: Math.round(80 + Math.random() * 15),
      coverage: Math.round(75 + Math.random() * 20),
      performance: Math.round(85 + Math.random() * 10),
      security: Math.round(90 + Math.random() * 10),
      maintainability: Math.round(70 + Math.random() * 25),
    });
  }
  
  return trends;
};

export default QualityDashboard;