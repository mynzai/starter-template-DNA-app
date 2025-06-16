import EventEmitter from 'events';
import { createPrometheusMetrics } from './prometheus-metrics.js';
import { AlertManager } from './alert-manager.js';
import chalk from 'chalk';

/**
 * Real-time Performance Monitoring System
 * Continuously monitors performance metrics and triggers alerts
 */
export class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      interval: options.interval || 30000, // 30 seconds
      retentionPeriod: options.retentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
      alertThresholds: options.alertThresholds || this.getDefaultThresholds(),
      enableMetrics: options.enableMetrics !== false,
      enableAlerts: options.enableAlerts !== false
    };
    
    this.metrics = createPrometheusMetrics();
    this.alertManager = new AlertManager(this.config.alertThresholds);
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.performanceData = new Map();
    
    this.setupEventHandlers();
  }
  
  /**
   * Start continuous performance monitoring
   */
  async startMonitoring(targets = []) {
    if (this.isMonitoring) {
      console.log(chalk.yellow('⚠️  Monitoring is already running'));
      return;
    }
    
    this.targets = targets.length > 0 ? targets : this.getDefaultTargets();
    this.isMonitoring = true;
    
    console.log(chalk.green(`🔍 Starting performance monitoring for ${this.targets.length} targets`));
    console.log(chalk.blue(`📊 Monitoring interval: ${this.config.interval / 1000}s`));
    
    // Initial monitoring pass
    await this.performMonitoringCycle();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCycle();
      } catch (error) {
        console.error(chalk.red('❌ Monitoring cycle failed:'), error.message);
        this.emit('monitoring_error', error);
      }
    }, this.config.interval);
    
    this.emit('monitoring_started', { targets: this.targets });
  }
  
  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log(chalk.yellow('⚠️  Monitoring is not running'));
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log(chalk.green('🛑 Stopped performance monitoring'));
    this.emit('monitoring_stopped');
  }
  
  /**
   * Perform a single monitoring cycle
   */
  async performMonitoringCycle() {
    const timestamp = Date.now();
    const results = [];
    
    for (const target of this.targets) {
      try {
        const result = await this.monitorTarget(target);
        result.timestamp = timestamp;
        results.push(result);
        
        // Store performance data
        this.storePerformanceData(target.name, result);
        
        // Update Prometheus metrics
        if (this.config.enableMetrics) {
          this.updateMetrics(target.name, result);
        }
        
        // Check for alerts
        if (this.config.enableAlerts) {
          await this.checkAlerts(target, result);
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Failed to monitor ${target.name}:`), error.message);
        results.push({
          target: target.name,
          error: error.message,
          timestamp
        });
      }
    }
    
    this.emit('monitoring_cycle_complete', results);
    return results;
  }
  
  /**
   * Monitor a specific target
   */
  async monitorTarget(target) {
    const result = {
      target: target.name,
      type: target.type,
      metrics: {}
    };
    
    switch (target.type) {
      case 'api':
        result.metrics = await this.monitorAPI(target);
        break;
      case 'web':
        result.metrics = await this.monitorWeb(target);
        break;
      case 'mobile':
        result.metrics = await this.monitorMobile(target);
        break;
      case 'system':
        result.metrics = await this.monitorSystem(target);
        break;
      default:
        throw new Error(`Unknown target type: ${target.type}`);
    }
    
    return result;
  }
  
  /**
   * Monitor API performance
   */
  async monitorAPI(target) {
    const start = Date.now();
    
    try {
      const response = await fetch(target.url, {
        method: target.method || 'GET',
        headers: target.headers || {},
        timeout: target.timeout || 10000
      });
      
      const responseTime = Date.now() - start;
      const isSuccess = response.ok;
      
      return {
        response_time: responseTime,
        status_code: response.status,
        success: isSuccess,
        error_rate: isSuccess ? 0 : 1,
        availability: isSuccess ? 1 : 0,
        content_size: parseInt(response.headers.get('content-length') || '0')
      };
      
    } catch (error) {
      return {
        response_time: Date.now() - start,
        status_code: 0,
        success: false,
        error_rate: 1,
        availability: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Monitor web performance using Lighthouse
   */
  async monitorWeb(target) {
    // Simplified web monitoring - in practice, you'd integrate with Lighthouse API
    const start = Date.now();
    
    try {
      const response = await fetch(target.url, { timeout: 10000 });
      const responseTime = Date.now() - start;
      
      // Mock Lighthouse-style metrics
      return {
        first_contentful_paint: responseTime * 0.3,
        largest_contentful_paint: responseTime * 0.8,
        speed_index: responseTime * 0.6,
        total_blocking_time: Math.random() * 100,
        cumulative_layout_shift: Math.random() * 0.1,
        performance_score: Math.max(0, 1 - (responseTime / 5000)),
        availability: response.ok ? 1 : 0
      };
      
    } catch (error) {
      return {
        first_contentful_paint: 0,
        largest_contentful_paint: 0,
        speed_index: 0,
        total_blocking_time: 0,
        cumulative_layout_shift: 1,
        performance_score: 0,
        availability: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Monitor mobile app performance
   */
  async monitorMobile(target) {
    // Mock mobile monitoring - in practice, you'd integrate with device testing
    return {
      app_launch_time: 1000 + Math.random() * 2000,
      memory_usage: 100 + Math.random() * 100,
      cpu_usage: 10 + Math.random() * 30,
      battery_drain: Math.random() * 5,
      crash_rate: Math.random() * 0.01,
      availability: 1
    };
  }
  
  /**
   * Monitor system performance
   */
  async monitorSystem(target) {
    // Mock system monitoring - in practice, you'd use system APIs
    return {
      cpu_usage: 20 + Math.random() * 40,
      memory_usage: 30 + Math.random() * 50,
      disk_usage: 40 + Math.random() * 30,
      network_io: Math.random() * 1000,
      disk_io: Math.random() * 500,
      availability: 1
    };
  }
  
  /**
   * Store performance data with retention
   */
  storePerformanceData(targetName, data) {
    if (!this.performanceData.has(targetName)) {
      this.performanceData.set(targetName, []);
    }
    
    const targetData = this.performanceData.get(targetName);
    targetData.push(data);
    
    // Apply retention policy
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    const filteredData = targetData.filter(d => d.timestamp > cutoffTime);
    this.performanceData.set(targetName, filteredData);
  }
  
  /**
   * Update Prometheus metrics
   */
  updateMetrics(targetName, data) {
    const labels = { target: targetName, type: data.type };
    
    // Update common metrics
    if (data.metrics.response_time !== undefined) {
      this.metrics.responseTime.observe(labels, data.metrics.response_time);
    }
    
    if (data.metrics.error_rate !== undefined) {
      this.metrics.errorRate.set(labels, data.metrics.error_rate);
    }
    
    if (data.metrics.availability !== undefined) {
      this.metrics.availability.set(labels, data.metrics.availability);
    }
    
    // Update type-specific metrics
    switch (data.type) {
      case 'web':
        if (data.metrics.performance_score !== undefined) {
          this.metrics.performanceScore.set(labels, data.metrics.performance_score);
        }
        break;
        
      case 'system':
        if (data.metrics.cpu_usage !== undefined) {
          this.metrics.cpuUsage.set(labels, data.metrics.cpu_usage);
        }
        if (data.metrics.memory_usage !== undefined) {
          this.metrics.memoryUsage.set(labels, data.metrics.memory_usage);
        }
        break;
    }
  }
  
  /**
   * Check for performance alerts
   */
  async checkAlerts(target, data) {
    const alerts = this.alertManager.checkThresholds(target, data);
    
    for (const alert of alerts) {
      console.log(chalk.red(`🚨 ALERT: ${alert.message}`));
      this.emit('performance_alert', alert);
      
      // Trigger remediation if configured
      if (alert.remediation) {
        try {
          await this.triggerRemediation(alert);
        } catch (error) {
          console.error(chalk.red('❌ Remediation failed:'), error.message);
        }
      }
    }
  }
  
  /**
   * Trigger automated remediation
   */
  async triggerRemediation(alert) {
    console.log(chalk.blue(`🔧 Triggering remediation: ${alert.remediation.action}`));
    
    switch (alert.remediation.type) {
      case 'scale_up':
        await this.scaleUpInstances(alert.target);
        break;
      case 'restart_service':
        await this.restartService(alert.target);
        break;
      case 'clear_cache':
        await this.clearCache(alert.target);
        break;
      default:
        console.log(chalk.yellow(`⚠️  Unknown remediation type: ${alert.remediation.type}`));
    }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(targetName, timeRange = 3600000) { // 1 hour default
    const targetData = this.performanceData.get(targetName);
    if (!targetData || targetData.length === 0) {
      return null;
    }
    
    const cutoffTime = Date.now() - timeRange;
    const recentData = targetData.filter(d => d.timestamp > cutoffTime);
    
    if (recentData.length === 0) {
      return null;
    }
    
    const stats = {
      target: targetName,
      timeRange: timeRange,
      dataPoints: recentData.length,
      metrics: {}
    };
    
    // Calculate statistics for each metric
    const metricKeys = Object.keys(recentData[0].metrics);
    
    metricKeys.forEach(key => {
      const values = recentData
        .map(d => d.metrics[key])
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length > 0) {
        stats.metrics[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          p95: this.calculatePercentile(values, 95),
          p99: this.calculatePercentile(values, 99)
        };
      }
    });
    
    return stats;
  }
  
  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * Generate monitoring report
   */
  generateReport(timeRange = 3600000) {
    const report = {
      timestamp: new Date().toISOString(),
      timeRange: timeRange,
      targets: {},
      summary: {
        totalTargets: this.targets.length,
        healthyTargets: 0,
        degradedTargets: 0,
        failingTargets: 0
      }
    };
    
    this.targets.forEach(target => {
      const stats = this.getPerformanceStats(target.name, timeRange);
      if (stats) {
        report.targets[target.name] = stats;
        
        // Determine target health
        const availability = stats.metrics.availability?.avg || 0;
        if (availability > 0.99) {
          report.summary.healthyTargets++;
        } else if (availability > 0.95) {
          report.summary.degradedTargets++;
        } else {
          report.summary.failingTargets++;
        }
      }
    });
    
    return report;
  }
  
  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.on('performance_alert', (alert) => {
      // Log alert to monitoring system
      console.log(chalk.red(`🚨 Performance Alert: ${alert.message}`));
    });
    
    this.on('monitoring_error', (error) => {
      console.error(chalk.red('❌ Monitoring Error:'), error.message);
    });
  }
  
  /**
   * Get default monitoring targets
   */
  getDefaultTargets() {
    return [
      {
        name: 'high-performance-api',
        type: 'api',
        url: 'http://localhost:3000/health',
        method: 'GET'
      },
      {
        name: 'real-time-collaboration',
        type: 'api',
        url: 'http://localhost:8080/health',
        method: 'GET'
      },
      {
        name: 'data-visualization',
        type: 'web',
        url: 'http://localhost:5173'
      },
      {
        name: 'system-performance',
        type: 'system'
      }
    ];
  }
  
  /**
   * Get default alert thresholds
   */
  getDefaultThresholds() {
    return {
      api: {
        response_time: { warning: 100, critical: 500 },
        error_rate: { warning: 0.01, critical: 0.05 },
        availability: { warning: 0.99, critical: 0.95 }
      },
      web: {
        performance_score: { warning: 0.8, critical: 0.6 },
        first_contentful_paint: { warning: 2000, critical: 4000 },
        largest_contentful_paint: { warning: 2500, critical: 4000 }
      },
      mobile: {
        app_launch_time: { warning: 3000, critical: 5000 },
        memory_usage: { warning: 200, critical: 300 },
        crash_rate: { warning: 0.01, critical: 0.05 }
      },
      system: {
        cpu_usage: { warning: 70, critical: 90 },
        memory_usage: { warning: 80, critical: 95 },
        disk_usage: { warning: 85, critical: 95 }
      }
    };
  }
  
  // Mock remediation methods (would be implemented based on infrastructure)
  async scaleUpInstances(target) {
    console.log(chalk.blue(`🔧 Scaling up instances for ${target}`));
  }
  
  async restartService(target) {
    console.log(chalk.blue(`🔧 Restarting service for ${target}`));
  }
  
  async clearCache(target) {
    console.log(chalk.blue(`🔧 Clearing cache for ${target}`));
  }
}