import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance Budget Manager
 * Defines, enforces, and tracks performance budgets across all template types
 */
export class PerformanceBudgetManager {
  constructor(options = {}) {
    this.budgetFile = options.budgetFile || path.join(__dirname, 'budgets.json');
    this.violationFile = options.violationFile || path.join(__dirname, 'violations.json');
    this.budgets = {};
    this.violations = [];
    
    this.loadBudgets();
  }
  
  /**
   * Load performance budgets from configuration
   */
  async loadBudgets() {
    try {
      if (await fs.pathExists(this.budgetFile)) {
        this.budgets = await fs.readJson(this.budgetFile);
      } else {
        this.budgets = this.getDefaultBudgets();
        await this.saveBudgets();
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to load budgets, using defaults'));
      this.budgets = this.getDefaultBudgets();
    }
  }
  
  /**
   * Save performance budgets to file
   */
  async saveBudgets() {
    await fs.writeJson(this.budgetFile, this.budgets, { spaces: 2 });
  }
  
  /**
   * Define default performance budgets for all template types
   */
  getDefaultBudgets() {
    return {
      // High-Performance API Platform (Epic 3 Story 3)
      'high-performance-api': {
        name: 'High-Performance API Platform',
        sla: {
          availability: 99.9,        // 99.9% uptime
          response_time: 50,         // 50ms average response time
          throughput: 48000,         // 48k+ requests per second
          error_rate: 0.1,           // 0.1% error rate
          p95_response_time: 100,    // 95th percentile under 100ms
          p99_response_time: 200     // 99th percentile under 200ms
        },
        limits: {
          memory_usage: 512,         // 512MB max memory
          cpu_usage: 80,             // 80% max CPU
          disk_space: 10240,         // 10GB max disk
          connection_pool: 100       // 100 max connections
        },
        enforcement: 'strict'
      },
      
      // Real-time Collaboration Platform (Epic 3 Story 2)
      'real-time-collaboration': {
        name: 'Real-time Collaboration Platform',
        sla: {
          availability: 99.95,       // 99.95% uptime (more critical)
          response_time: 150,        // 150ms max for real-time feel
          latency: 100,              // 100ms max end-to-end latency
          throughput: 10000,         // 10k concurrent users
          error_rate: 0.05,          // 0.05% error rate
          connection_time: 500       // 500ms max connection time
        },
        limits: {
          memory_usage: 1024,        // 1GB max memory
          cpu_usage: 70,             // 70% max CPU
          websocket_connections: 10000, // 10k max WebSocket connections
          operation_queue: 1000      // 1k max pending operations
        },
        enforcement: 'strict'
      },
      
      // Data Visualization Platform (Epic 3 Story 4)
      'data-visualization': {
        name: 'Data Visualization Platform',
        sla: {
          availability: 99.5,        // 99.5% uptime
          render_time: 2000,         // 2s max initial render
          frame_rate: 60,            // 60fps for animations
          data_load_time: 5000,      // 5s max for 1M+ points
          error_rate: 0.2,           // 0.2% error rate
          export_time: 30000         // 30s max export time
        },
        limits: {
          memory_usage: 2048,        // 2GB max memory (large datasets)
          cpu_usage: 85,             // 85% max CPU
          gpu_memory: 1024,          // 1GB max GPU memory
          dataset_size: 10000000,    // 10M max data points
          chart_complexity: 1000     // Max 1000 chart elements
        },
        enforcement: 'warning'  // Less strict for visualization
      },
      
      // AI-Powered SaaS Platform (Epic 2)
      'ai-saas-platform': {
        name: 'AI-Powered SaaS Platform',
        sla: {
          availability: 99.8,        // 99.8% uptime
          response_time: 200,        // 200ms average (AI processing)
          ai_response_time: 3000,    // 3s max AI response
          throughput: 5000,          // 5k requests per second
          error_rate: 0.15,          // 0.15% error rate
          cold_start_time: 2000      // 2s max cold start
        },
        limits: {
          memory_usage: 1024,        // 1GB max memory
          cpu_usage: 75,             // 75% max CPU
          ai_tokens_per_minute: 100000, // 100k tokens/minute
          concurrent_ai_requests: 100,  // 100 concurrent AI calls
          storage_usage: 102400      // 100GB max storage
        },
        enforcement: 'moderate'
      },
      
      // Mobile AI Assistant (React Native)
      'mobile-ai-assistant-rn': {
        name: 'Mobile AI Assistant (React Native)',
        sla: {
          availability: 99.5,        // 99.5% uptime
          app_launch_time: 2000,     // 2s max app launch
          response_time: 500,        // 500ms max API response
          ai_response_time: 5000,    // 5s max AI response
          crash_rate: 0.1,           // 0.1% crash rate
          battery_efficiency: 95     // 95% battery efficiency
        },
        limits: {
          memory_usage: 150,         // 150MB max memory
          cpu_usage: 50,             // 50% max CPU (mobile)
          battery_drain: 5,          // 5% max battery drain/hour
          storage_usage: 1024,       // 1GB max storage
          network_usage: 100         // 100MB max network/day
        },
        enforcement: 'strict'  // Critical for mobile UX
      },
      
      // Mobile AI Assistant (Flutter)
      'mobile-ai-assistant-flutter': {
        name: 'Mobile AI Assistant (Flutter)',
        sla: {
          availability: 99.5,        // 99.5% uptime
          app_launch_time: 1500,     // 1.5s max app launch (Flutter advantage)
          response_time: 400,        // 400ms max API response
          ai_response_time: 5000,    // 5s max AI response
          crash_rate: 0.05,          // 0.05% crash rate (Flutter stability)
          battery_efficiency: 96     // 96% battery efficiency
        },
        limits: {
          memory_usage: 120,         // 120MB max memory (Flutter efficiency)
          cpu_usage: 45,             // 45% max CPU
          battery_drain: 4,          // 4% max battery drain/hour
          storage_usage: 800,        // 800MB max storage
          network_usage: 80          // 80MB max network/day
        },
        enforcement: 'strict'
      },
      
      // Web Performance (General)
      'web-performance': {
        name: 'Web Performance (General)',
        sla: {
          availability: 99.7,        // 99.7% uptime
          first_contentful_paint: 1800,    // 1.8s FCP
          largest_contentful_paint: 2500,  // 2.5s LCP
          total_blocking_time: 200,        // 200ms TBT
          cumulative_layout_shift: 0.1,    // 0.1 CLS
          performance_score: 85,           // 85+ Lighthouse score
          accessibility_score: 90         // 90+ accessibility score
        },
        limits: {
          bundle_size: 1024,         // 1MB max bundle size
          image_size: 500,           // 500KB max images
          font_size: 100,            // 100KB max fonts
          third_party_size: 200,     // 200KB max third-party
          dom_size: 1500             // 1500 max DOM nodes
        },
        enforcement: 'moderate'
      }
    };
  }
  
  /**
   * Check if performance results meet budget requirements
   */
  async checkBudget(templateType, performanceResults) {
    const budget = this.budgets[templateType];
    if (!budget) {
      throw new Error(`No budget defined for template type: ${templateType}`);
    }
    
    const violations = [];
    const results = {
      templateType,
      timestamp: new Date().toISOString(),
      budget: budget.name,
      enforcement: budget.enforcement,
      passed: true,
      violations: [],
      metrics: {}
    };
    
    // Check SLA violations
    for (const [metric, target] of Object.entries(budget.sla)) {
      const actual = this.extractMetricValue(performanceResults, metric);
      
      if (actual !== null && actual !== undefined) {
        const violation = this.checkMetricViolation(metric, actual, target, budget.enforcement);
        
        results.metrics[metric] = {
          target,
          actual,
          passed: !violation,
          deviation: this.calculateDeviation(actual, target, metric)
        };
        
        if (violation) {
          violations.push({
            type: 'sla',
            metric,
            target,
            actual,
            severity: this.calculateViolationSeverity(actual, target, metric),
            message: `${metric}: ${actual} exceeds target of ${target}`
          });
        }
      }
    }
    
    // Check resource limit violations
    for (const [metric, limit] of Object.entries(budget.limits)) {
      const actual = this.extractMetricValue(performanceResults, metric);
      
      if (actual !== null && actual !== undefined) {
        const violation = actual > limit;
        
        results.metrics[metric] = {
          limit,
          actual,
          passed: !violation,
          utilization: (actual / limit) * 100
        };
        
        if (violation) {
          violations.push({
            type: 'limit',
            metric,
            limit,
            actual,
            severity: this.calculateViolationSeverity(actual, limit, metric),
            message: `${metric}: ${actual} exceeds limit of ${limit}`
          });
        }
      }
    }
    
    results.violations = violations;
    results.passed = violations.length === 0;
    
    // Store violations for tracking
    if (violations.length > 0) {
      await this.recordViolations(templateType, violations);
    }
    
    return results;
  }
  
  /**
   * Extract metric value from performance results
   */
  extractMetricValue(results, metricName) {
    // Handle nested metric paths
    const pathMap = {
      // API metrics
      'response_time': ['metrics.http_req_duration.avg', 'response_time', 'responseTime'],
      'p95_response_time': ['metrics.http_req_duration.p95', 'p95_response_time'],
      'p99_response_time': ['metrics.http_req_duration.p99', 'p99_response_time'],
      'throughput': ['metrics.http_reqs.rate', 'throughput', 'rps'],
      'error_rate': ['metrics.http_req_failed.rate', 'error_rate', 'errorRate'],
      'availability': ['availability', 'uptime'],
      
      // Web metrics
      'first_contentful_paint': ['lhr.audits.first-contentful-paint.numericValue', 'fcp'],
      'largest_contentful_paint': ['lhr.audits.largest-contentful-paint.numericValue', 'lcp'],
      'total_blocking_time': ['lhr.audits.total-blocking-time.numericValue', 'tbt'],
      'cumulative_layout_shift': ['lhr.audits.cumulative-layout-shift.numericValue', 'cls'],
      'performance_score': ['lhr.categories.performance.score', 'performance_score'],
      'accessibility_score': ['lhr.categories.accessibility.score', 'accessibility_score'],
      
      // Mobile metrics
      'app_launch_time': ['mobile.appLaunchTime', 'app_launch_time', 'launchTime'],
      'crash_rate': ['mobile.crashRate', 'crash_rate', 'crashes'],
      'battery_drain': ['mobile.batteryDrain', 'battery_drain', 'battery'],
      
      // System metrics
      'memory_usage': ['system.memoryUsage', 'memory_usage', 'memory'],
      'cpu_usage': ['system.cpuUsage', 'cpu_usage', 'cpu'],
      'disk_usage': ['system.diskUsage', 'disk_usage', 'disk']
    };
    
    const paths = pathMap[metricName] || [metricName];
    
    for (const path of paths) {
      const value = this.getNestedValue(results, path);
      if (value !== null && value !== undefined) {
        return typeof value === 'number' ? value : parseFloat(value);
      }
    }
    
    return null;
  }
  
  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }
  
  /**
   * Check if metric violates budget
   */
  checkMetricViolation(metric, actual, target, enforcement) {
    // Some metrics are "lower is better", others are "higher is better"
    const lowerIsBetter = [
      'response_time', 'p95_response_time', 'p99_response_time',
      'error_rate', 'crash_rate', 'battery_drain',
      'first_contentful_paint', 'largest_contentful_paint',
      'total_blocking_time', 'cumulative_layout_shift',
      'app_launch_time', 'render_time', 'data_load_time',
      'export_time', 'ai_response_time', 'cold_start_time',
      'memory_usage', 'cpu_usage', 'disk_usage'
    ];
    
    const higherIsBetter = [
      'availability', 'throughput', 'frame_rate',
      'performance_score', 'accessibility_score',
      'battery_efficiency'
    ];
    
    if (lowerIsBetter.includes(metric)) {
      return actual > target;
    } else if (higherIsBetter.includes(metric)) {
      return actual < target;
    }
    
    // Default: assume lower is better
    return actual > target;
  }
  
  /**
   * Calculate deviation percentage
   */
  calculateDeviation(actual, target, metric) {
    if (target === 0) return 0;
    
    const deviation = ((actual - target) / target) * 100;
    
    // For "higher is better" metrics, negative deviation is bad
    const higherIsBetter = [
      'availability', 'throughput', 'frame_rate',
      'performance_score', 'accessibility_score',
      'battery_efficiency'
    ];
    
    if (higherIsBetter.includes(metric)) {
      return -deviation; // Flip sign so positive is always bad
    }
    
    return deviation;
  }
  
  /**
   * Calculate violation severity
   */
  calculateViolationSeverity(actual, target, metric) {
    const deviation = Math.abs(this.calculateDeviation(actual, target, metric));
    
    if (deviation >= 100) return 'critical';  // 100%+ over target
    if (deviation >= 50) return 'high';       // 50%+ over target
    if (deviation >= 25) return 'medium';     // 25%+ over target
    if (deviation >= 10) return 'low';        // 10%+ over target
    
    return 'minimal';
  }
  
  /**
   * Record budget violations for tracking
   */
  async recordViolations(templateType, violations) {
    const violationRecord = {
      templateType,
      timestamp: new Date().toISOString(),
      violations: violations.map(v => ({
        ...v,
        id: this.generateViolationId()
      }))
    };
    
    this.violations.push(violationRecord);
    
    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-1000);
    }
    
    // Save to file
    try {
      await fs.writeJson(this.violationFile, this.violations, { spaces: 2 });
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to save violations'));
    }
  }
  
  /**
   * Generate unique violation ID
   */
  generateViolationId() {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get violation history for a template type
   */
  getViolationHistory(templateType, timeRange = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoffTime = Date.now() - timeRange;
    
    return this.violations
      .filter(v => v.templateType === templateType)
      .filter(v => new Date(v.timestamp).getTime() > cutoffTime)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  /**
   * Generate budget compliance report
   */
  generateComplianceReport(timeRange = 30 * 24 * 60 * 60 * 1000) { // 30 days
    const report = {
      timestamp: new Date().toISOString(),
      timeRange: timeRange,
      templates: {},
      summary: {
        totalTemplates: Object.keys(this.budgets).length,
        compliantTemplates: 0,
        violatingTemplates: 0,
        totalViolations: 0
      }
    };
    
    // Analyze each template type
    for (const templateType of Object.keys(this.budgets)) {
      const violations = this.getViolationHistory(templateType, timeRange);
      const isCompliant = violations.length === 0;
      
      report.templates[templateType] = {
        budget: this.budgets[templateType].name,
        enforcement: this.budgets[templateType].enforcement,
        compliant: isCompliant,
        violationCount: violations.length,
        lastViolation: violations[0]?.timestamp || null,
        violationTypes: this.getViolationTypeSummary(violations)
      };
      
      if (isCompliant) {
        report.summary.compliantTemplates++;
      } else {
        report.summary.violatingTemplates++;
      }
      
      report.summary.totalViolations += violations.length;
    }
    
    return report;
  }
  
  /**
   * Get summary of violation types
   */
  getViolationTypeSummary(violations) {
    const summary = {};
    
    violations.forEach(record => {
      record.violations.forEach(violation => {
        const key = `${violation.type}_${violation.metric}`;
        summary[key] = (summary[key] || 0) + 1;
      });
    });
    
    return summary;
  }
  
  /**
   * Update budget for a template type
   */
  async updateBudget(templateType, updates) {
    if (!this.budgets[templateType]) {
      throw new Error(`No budget found for template type: ${templateType}`);
    }
    
    // Deep merge updates
    this.budgets[templateType] = {
      ...this.budgets[templateType],
      sla: { ...this.budgets[templateType].sla, ...(updates.sla || {}) },
      limits: { ...this.budgets[templateType].limits, ...(updates.limits || {}) },
      enforcement: updates.enforcement || this.budgets[templateType].enforcement
    };
    
    await this.saveBudgets();
    
    console.log(chalk.green(`✅ Updated budget for ${templateType}`));
  }
  
  /**
   * Validate budget configuration
   */
  validateBudget(budget) {
    const required = ['name', 'sla', 'limits', 'enforcement'];
    const missing = required.filter(field => !budget[field]);
    
    if (missing.length > 0) {
      throw new Error(`Budget missing required fields: ${missing.join(', ')}`);
    }
    
    const validEnforcement = ['strict', 'moderate', 'warning'];
    if (!validEnforcement.includes(budget.enforcement)) {
      throw new Error(`Invalid enforcement level: ${budget.enforcement}`);
    }
    
    return true;
  }
  
  /**
   * Export budget configuration
   */
  async exportBudgets(outputPath) {
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      budgets: this.budgets
    };
    
    await fs.writeJson(outputPath, exportData, { spaces: 2 });
    console.log(chalk.green(`📊 Budgets exported to ${outputPath}`));
  }
}