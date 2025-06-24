import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance Baseline Manager
 * Handles creation, storage, and comparison of performance baselines
 */
export class BaselineManager {
  constructor(options = {}) {
    this.baselineDir = options.baselineDir || path.join(__dirname, '../baselines');
    this.tolerance = options.tolerance || 0.1; // 10% tolerance by default
    this.metrics = options.metrics || [
      'response_time',
      'throughput',
      'error_rate',
      'memory_usage',
      'cpu_usage'
    ];
    
    this.ensureBaselineDir();
  }
  
  ensureBaselineDir() {
    fs.ensureDirSync(this.baselineDir);
  }
  
  /**
   * Create a new performance baseline
   */
  async createBaseline(templateType, testResults, metadata = {}) {
    const baseline = {
      templateType,
      timestamp: new Date().toISOString(),
      version: metadata.version || '1.0.0',
      gitCommit: metadata.gitCommit || 'unknown',
      environment: metadata.environment || 'development',
      metrics: this.extractMetrics(testResults),
      rawResults: testResults,
      metadata
    };
    
    const baselineFile = path.join(this.baselineDir, `${templateType}-baseline.json`);
    await fs.writeJson(baselineFile, baseline, { spaces: 2 });
    
    console.log(chalk.green(`✅ Created baseline for ${templateType}`));
    return baseline;
  }
  
  /**
   * Load existing baseline
   */
  async loadBaseline(templateType) {
    const baselineFile = path.join(this.baselineDir, `${templateType}-baseline.json`);
    
    if (!await fs.pathExists(baselineFile)) {
      throw new Error(`No baseline found for template type: ${templateType}`);
    }
    
    return await fs.readJson(baselineFile);
  }
  
  /**
   * Compare current results against baseline
   */
  async compareToBaseline(templateType, currentResults, metadata = {}) {
    const baseline = await this.loadBaseline(templateType);
    const currentMetrics = this.extractMetrics(currentResults);
    
    const comparison = {
      templateType,
      timestamp: new Date().toISOString(),
      baseline: {
        version: baseline.version,
        timestamp: baseline.timestamp,
        metrics: baseline.metrics
      },
      current: {
        version: metadata.version || 'current',
        timestamp: new Date().toISOString(),
        metrics: currentMetrics
      },
      analysis: this.analyzePerformanceChanges(baseline.metrics, currentMetrics),
      passed: true,
      issues: []
    };
    
    // Determine if regression test passed
    comparison.passed = comparison.analysis.every(metric => 
      metric.status === 'improved' || metric.status === 'stable'
    );
    
    // Collect issues
    comparison.issues = comparison.analysis
      .filter(metric => metric.status === 'regressed')
      .map(metric => ({
        metric: metric.name,
        severity: this.calculateSeverity(metric.changePercent),
        message: `${metric.name} regressed by ${metric.changePercent.toFixed(1)}%`,
        threshold: this.tolerance * 100,
        actual: metric.changePercent
      }));
    
    return comparison;
  }
  
  /**
   * Extract standardized metrics from test results
   */
  extractMetrics(testResults) {
    const metrics = {};
    
    // K6 Load Test Metrics
    if (testResults.metrics) {
      metrics.response_time = {
        avg: testResults.metrics.http_req_duration?.avg || 0,
        p95: testResults.metrics.http_req_duration?.p95 || 0,
        p99: testResults.metrics.http_req_duration?.p99 || 0,
        max: testResults.metrics.http_req_duration?.max || 0
      };
      
      metrics.throughput = {
        rps: testResults.metrics.http_reqs?.rate || 0,
        total_requests: testResults.metrics.http_reqs?.count || 0
      };
      
      metrics.error_rate = {
        percentage: (testResults.metrics.http_req_failed?.rate || 0) * 100,
        count: testResults.metrics.http_req_failed?.count || 0
      };
    }
    
    // Lighthouse Metrics
    if (testResults.lhr) {
      const audits = testResults.lhr.audits;
      
      metrics.web_vitals = {
        fcp: audits['first-contentful-paint']?.numericValue || 0,
        lcp: audits['largest-contentful-paint']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0,
        fid: audits['max-potential-fid']?.numericValue || 0,
        tbt: audits['total-blocking-time']?.numericValue || 0
      };
      
      metrics.performance_score = testResults.lhr.categories.performance?.score || 0;
      metrics.accessibility_score = testResults.lhr.categories.accessibility?.score || 0;
    }
    
    // Mobile Performance Metrics (Detox)
    if (testResults.mobile) {
      metrics.mobile_performance = {
        app_launch_time: testResults.mobile.appLaunchTime || 0,
        memory_usage: testResults.mobile.memoryUsage || 0,
        cpu_usage: testResults.mobile.cpuUsage || 0,
        battery_drain: testResults.mobile.batteryDrain || 0
      };
    }
    
    // System Metrics
    if (testResults.system) {
      metrics.system_performance = {
        memory_usage: testResults.system.memoryUsage || 0,
        cpu_usage: testResults.system.cpuUsage || 0,
        disk_io: testResults.system.diskIO || 0,
        network_io: testResults.system.networkIO || 0
      };
    }
    
    return metrics;
  }
  
  /**
   * Analyze performance changes between baseline and current
   */
  analyzePerformanceChanges(baselineMetrics, currentMetrics) {
    const analysis = [];
    
    const flattenMetrics = (metrics, prefix = '') => {
      const flattened = {};
      
      for (const [key, value] of Object.entries(metrics)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(flattened, flattenMetrics(value, newKey));
        } else if (typeof value === 'number') {
          flattened[newKey] = value;
        }
      }
      
      return flattened;
    };
    
    const baselineFlat = flattenMetrics(baselineMetrics);
    const currentFlat = flattenMetrics(currentMetrics);
    
    for (const [metricName, baselineValue] of Object.entries(baselineFlat)) {
      const currentValue = currentFlat[metricName];
      
      if (currentValue !== undefined && baselineValue !== 0) {
        const changePercent = ((currentValue - baselineValue) / baselineValue) * 100;
        const absChangePercent = Math.abs(changePercent);
        
        let status = 'stable';
        if (absChangePercent > this.tolerance * 100) {
          // Determine if this is an improvement or regression
          const isImprovement = this.isImprovement(metricName, changePercent);
          status = isImprovement ? 'improved' : 'regressed';
        }
        
        analysis.push({
          name: metricName,
          baseline: baselineValue,
          current: currentValue,
          change: currentValue - baselineValue,
          changePercent: changePercent,
          status: status,
          significance: this.calculateSignificance(absChangePercent)
        });
      }
    }
    
    return analysis.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }
  
  /**
   * Determine if a change is an improvement based on metric type
   */
  isImprovement(metricName, changePercent) {
    // Lower is better for these metrics
    const lowerIsBetter = [
      'response_time',
      'error_rate',
      'memory_usage',
      'cpu_usage',
      'fcp', 'lcp', 'cls', 'fid', 'tbt',
      'app_launch_time',
      'battery_drain'
    ];
    
    // Higher is better for these metrics
    const higherIsBetter = [
      'throughput',
      'rps',
      'performance_score',
      'accessibility_score'
    ];
    
    const isLowerBetter = lowerIsBetter.some(metric => metricName.includes(metric));
    const isHigherBetter = higherIsBetter.some(metric => metricName.includes(metric));
    
    if (isLowerBetter) {
      return changePercent < 0; // Decrease is improvement
    } else if (isHigherBetter) {
      return changePercent > 0; // Increase is improvement
    }
    
    // Default: assume lower is better
    return changePercent < 0;
  }
  
  /**
   * Calculate severity of performance regression
   */
  calculateSeverity(changePercent) {
    const absChange = Math.abs(changePercent);
    
    if (absChange >= 50) return 'critical';
    if (absChange >= 25) return 'high';
    if (absChange >= 10) return 'medium';
    return 'low';
  }
  
  /**
   * Calculate statistical significance of change
   */
  calculateSignificance(changePercent) {
    if (changePercent >= 20) return 'high';
    if (changePercent >= 10) return 'medium';
    if (changePercent >= 5) return 'low';
    return 'negligible';
  }
  
  /**
   * Generate regression report
   */
  generateRegressionReport(comparison) {
    const report = {
      summary: {
        templateType: comparison.templateType,
        timestamp: comparison.timestamp,
        passed: comparison.passed,
        totalMetrics: comparison.analysis.length,
        regressions: comparison.issues.length,
        improvements: comparison.analysis.filter(m => m.status === 'improved').length,
        stable: comparison.analysis.filter(m => m.status === 'stable').length
      },
      details: {
        baseline: comparison.baseline,
        current: comparison.current,
        analysis: comparison.analysis,
        issues: comparison.issues
      },
      recommendations: this.generateRecommendations(comparison)
    };
    
    return report;
  }
  
  /**
   * Generate optimization recommendations
   */
  generateRecommendations(comparison) {
    const recommendations = [];
    
    comparison.issues.forEach(issue => {
      switch (issue.metric) {
        case 'response_time.avg':
        case 'response_time.p95':
          recommendations.push({
            type: 'optimization',
            priority: issue.severity,
            message: 'Consider optimizing database queries, adding caching, or scaling horizontally',
            metric: issue.metric
          });
          break;
          
        case 'error_rate.percentage':
          recommendations.push({
            type: 'reliability',
            priority: issue.severity,
            message: 'Investigate error sources and improve error handling mechanisms',
            metric: issue.metric
          });
          break;
          
        case 'web_vitals.lcp':
        case 'web_vitals.fcp':
          recommendations.push({
            type: 'frontend',
            priority: issue.severity,
            message: 'Optimize images, implement lazy loading, and minimize render-blocking resources',
            metric: issue.metric
          });
          break;
          
        case 'mobile_performance.app_launch_time':
          recommendations.push({
            type: 'mobile',
            priority: issue.severity,
            message: 'Optimize app initialization, reduce bundle size, and implement code splitting',
            metric: issue.metric
          });
          break;
          
        default:
          recommendations.push({
            type: 'general',
            priority: issue.severity,
            message: `Performance regression detected in ${issue.metric}. Review recent changes and optimize accordingly.`,
            metric: issue.metric
          });
      }
    });
    
    return recommendations;
  }
  
  /**
   * List all available baselines
   */
  async listBaselines() {
    const files = await fs.readdir(this.baselineDir);
    const baselines = [];
    
    for (const file of files) {
      if (file.endsWith('-baseline.json')) {
        const baseline = await fs.readJson(path.join(this.baselineDir, file));
        baselines.push({
          templateType: baseline.templateType,
          version: baseline.version,
          timestamp: baseline.timestamp,
          file: file
        });
      }
    }
    
    return baselines;
  }
  
  /**
   * Delete a baseline
   */
  async deleteBaseline(templateType) {
    const baselineFile = path.join(this.baselineDir, `${templateType}-baseline.json`);
    
    if (await fs.pathExists(baselineFile)) {
      await fs.remove(baselineFile);
      console.log(chalk.yellow(`🗑️  Deleted baseline for ${templateType}`));
    } else {
      throw new Error(`No baseline found for template type: ${templateType}`);
    }
  }
}