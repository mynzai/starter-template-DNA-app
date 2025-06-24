#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance Dashboard Updater
 * Updates performance dashboard with latest test results and metrics
 */

const argv = yargs(hideBin(process.argv))
  .option('results', {
    alias: 'r',
    describe: 'Aggregated results JSON file',
    type: 'string',
    demandOption: true
  })
  .option('template-type', {
    alias: 't',
    describe: 'Template type being updated',
    type: 'string',
    demandOption: true
  })
  .option('commit', {
    alias: 'c',
    describe: 'Git commit hash',
    type: 'string',
    demandOption: true
  })
  .option('branch', {
    alias: 'b',
    describe: 'Git branch name',
    type: 'string',
    demandOption: true
  })
  .option('dashboard-dir', {
    alias: 'd',
    describe: 'Dashboard data directory',
    type: 'string',
    default: path.join(__dirname, '../dashboard-data')
  })
  .help()
  .argv;

async function updateDashboard() {
  console.log('📊 Updating performance dashboard...');
  
  // Ensure dashboard directory exists
  await fs.ensureDir(argv.dashboardDir);
  
  // Load results
  const results = await fs.readJson(argv.results);
  
  // Create dashboard entry
  const dashboardEntry = {
    timestamp: new Date().toISOString(),
    templateType: argv.templateType,
    commit: argv.commit,
    branch: argv.branch,
    metrics: extractDashboardMetrics(results.metrics),
    overallScore: results.metrics.derived?.overallPerformanceScore || 0,
    environment: results.testSession?.environment || 'unknown'
  };
  
  // Update historical data
  await updateHistoricalData(dashboardEntry);
  
  // Update current status
  await updateCurrentStatus(dashboardEntry);
  
  // Generate dashboard index
  await generateDashboardIndex();
  
  // Export Prometheus metrics
  await exportPrometheusMetrics(dashboardEntry);
  
  console.log(`✅ Dashboard updated for ${argv.templateType}`);
  
  return dashboardEntry;
}

/**
 * Extract key metrics for dashboard display
 */
function extractDashboardMetrics(metrics) {
  const dashboardMetrics = {};
  
  // API Metrics
  if (metrics.api) {
    dashboardMetrics.api = {
      responseTime: metrics.api.responseTime.avg,
      p95ResponseTime: metrics.api.responseTime.p95,
      throughput: metrics.api.throughput.rps,
      errorRate: metrics.api.errorRate.percentage
    };
  }
  
  // Web Metrics
  if (metrics.lighthouse) {
    dashboardMetrics.web = {
      performanceScore: metrics.lighthouse.scores.performance,
      lcp: metrics.lighthouse.metrics.lcp,
      fcp: metrics.lighthouse.metrics.fcp,
      cls: metrics.lighthouse.metrics.cls,
      tbt: metrics.lighthouse.metrics.tbt
    };
  } else if (metrics.webVitals) {
    dashboardMetrics.web = {
      performanceScore: metrics.webVitals.scores?.performance || 0,
      lcp: metrics.webVitals.coreWebVitals.lcp,
      fcp: metrics.webVitals.additionalMetrics.fcp,
      cls: metrics.webVitals.coreWebVitals.cls,
      tbt: metrics.webVitals.additionalMetrics.tbt
    };
  }
  
  // Mobile Metrics
  if (metrics.flutter) {
    dashboardMetrics.mobile = {
      fps: metrics.flutter.rendering.fps,
      frameTime: metrics.flutter.rendering.frameTime,
      appStartTime: metrics.flutter.startup.appStartTime,
      memoryUsage: metrics.flutter.memory.heapUsage
    };
  } else if (metrics.reactNative) {
    dashboardMetrics.mobile = {
      bundleSize: metrics.reactNative.javascript.bundleSize,
      initTime: metrics.reactNative.javascript.initTime,
      memoryUsage: metrics.reactNative.native.memoryUsage,
      navigationTime: metrics.reactNative.performance.navigationTime
    };
  }
  
  // System Metrics
  if (metrics.system) {
    dashboardMetrics.system = {
      cpuUsage: metrics.system.cpu.usage,
      memoryUsage: metrics.system.memory.usage,
      diskUsage: metrics.system.disk.usage
    };
  }
  
  return dashboardMetrics;
}

/**
 * Update historical performance data
 */
async function updateHistoricalData(entry) {
  const historyFile = path.join(argv.dashboardDir, `${argv.templateType}-history.json`);
  
  let history = [];
  if (await fs.pathExists(historyFile)) {
    history = await fs.readJson(historyFile);
  }
  
  // Add new entry
  history.push(entry);
  
  // Keep only last 100 entries (configurable)
  const maxEntries = process.env.DASHBOARD_MAX_HISTORY || 100;
  if (history.length > maxEntries) {
    history = history.slice(-maxEntries);
  }
  
  // Save updated history
  await fs.writeJson(historyFile, history, { spaces: 2 });
  
  console.log(`📈 Updated history for ${argv.templateType} (${history.length} entries)`);
}

/**
 * Update current status for all templates
 */
async function updateCurrentStatus(entry) {
  const statusFile = path.join(argv.dashboardDir, 'current-status.json');
  
  let status = {};
  if (await fs.pathExists(statusFile)) {
    status = await fs.readJson(statusFile);
  }
  
  // Update status for this template
  status[argv.templateType] = {
    lastUpdated: entry.timestamp,
    commit: entry.commit,
    branch: entry.branch,
    overallScore: entry.overallScore,
    metrics: entry.metrics,
    environment: entry.environment,
    status: determineStatus(entry.overallScore)
  };
  
  // Save updated status
  await fs.writeJson(statusFile, status, { spaces: 2 });
  
  console.log(`📊 Updated current status for ${argv.templateType}`);
}

/**
 * Determine status based on performance score
 */
function determineStatus(score) {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 60) return 'poor';
  return 'critical';
}

/**
 * Generate dashboard index with summary
 */
async function generateDashboardIndex() {
  const statusFile = path.join(argv.dashboardDir, 'current-status.json');
  const indexFile = path.join(argv.dashboardDir, 'index.html');
  
  if (!await fs.pathExists(statusFile)) {
    console.log('⚠️  No status file found, skipping index generation');
    return;
  }
  
  const status = await fs.readJson(statusFile);
  
  const html = generateDashboardHtml(status);
  await fs.writeFile(indexFile, html);
  
  console.log('📄 Generated dashboard index.html');
}

/**
 * Generate HTML dashboard
 */
function generateDashboardHtml(status) {
  const templates = Object.keys(status);
  
  let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 2px solid #eee; 
            padding-bottom: 20px; 
        }
        .templates-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        .template-card { 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            padding: 20px; 
            background: #fafafa; 
        }
        .template-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 15px; 
        }
        .template-name { 
            font-size: 18px; 
            font-weight: bold; 
        }
        .status-badge { 
            padding: 4px 8px; 
            border-radius: 4px; 
            color: white; 
            font-size: 12px; 
            font-weight: bold; 
        }
        .status-excellent { background-color: #28a745; }
        .status-good { background-color: #6c757d; }
        .status-fair { background-color: #ffc107; color: #212529; }
        .status-poor { background-color: #fd7e14; }
        .status-critical { background-color: #dc3545; }
        .score { 
            font-size: 24px; 
            font-weight: bold; 
            text-align: center; 
            margin: 15px 0; 
        }
        .metrics { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 10px; 
            margin-top: 15px; 
        }
        .metric { 
            padding: 8px; 
            background: white; 
            border-radius: 4px; 
            border: 1px solid #eee; 
        }
        .metric-label { 
            font-size: 11px; 
            color: #666; 
            text-transform: uppercase; 
        }
        .metric-value { 
            font-size: 14px; 
            font-weight: bold; 
        }
        .last-updated { 
            font-size: 11px; 
            color: #999; 
            margin-top: 15px; 
            text-align: center; 
        }
        .summary { 
            display: flex; 
            justify-content: space-around; 
            margin-bottom: 30px; 
            padding: 20px; 
            background: #f8f9fa; 
            border-radius: 8px; 
        }
        .summary-item { 
            text-align: center; 
        }
        .summary-number { 
            font-size: 24px; 
            font-weight: bold; 
            color: #495057; 
        }
        .summary-label { 
            font-size: 12px; 
            color: #6c757d; 
            text-transform: uppercase; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Performance Dashboard</h1>
            <p>Real-time performance monitoring for all template types</p>
        </div>
        
        <div class="summary">
            <div class="summary-item">
                <div class="summary-number">${templates.length}</div>
                <div class="summary-label">Templates</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${templates.filter(t => status[t].status === 'excellent' || status[t].status === 'good').length}</div>
                <div class="summary-label">Healthy</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${templates.filter(t => status[t].status === 'poor' || status[t].status === 'critical').length}</div>
                <div class="summary-label">Issues</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">${Math.round(templates.reduce((sum, t) => sum + status[t].overallScore, 0) / templates.length || 0)}</div>
                <div class="summary-label">Avg Score</div>
            </div>
        </div>
        
        <div class="templates-grid">
  `;
  
  templates.forEach(templateType => {
    const data = status[templateType];
    const lastUpdated = new Date(data.lastUpdated).toLocaleString();
    
    html += `
            <div class="template-card">
                <div class="template-header">
                    <div class="template-name">${templateType}</div>
                    <div class="status-badge status-${data.status}">${data.status.toUpperCase()}</div>
                </div>
                
                <div class="score">${Math.round(data.overallScore)}/100</div>
                
                <div class="metrics">
    `;
    
    // Add relevant metrics based on what's available
    if (data.metrics.api) {
      html += `
                    <div class="metric">
                        <div class="metric-label">Response Time</div>
                        <div class="metric-value">${data.metrics.api.responseTime?.toFixed(0) || 0}ms</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Error Rate</div>
                        <div class="metric-value">${data.metrics.api.errorRate?.toFixed(2) || 0}%</div>
                    </div>
      `;
    }
    
    if (data.metrics.web) {
      html += `
                    <div class="metric">
                        <div class="metric-label">LCP</div>
                        <div class="metric-value">${data.metrics.web.lcp?.toFixed(0) || 0}ms</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Performance</div>
                        <div class="metric-value">${data.metrics.web.performanceScore || 0}/100</div>
                    </div>
      `;
    }
    
    html += `
                </div>
                
                <div class="last-updated">
                    Last updated: ${lastUpdated}<br>
                    Commit: ${data.commit?.substring(0, 8) || 'unknown'} (${data.branch})
                </div>
            </div>
    `;
  });
  
  html += `
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            Generated by DNA Performance Monitoring System • Last updated: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
  `;
  
  return html;
}

/**
 * Export metrics in Prometheus format
 */
async function exportPrometheusMetrics(entry) {
  const metricsFile = path.join(argv.dashboardDir, 'performance-metrics.txt');
  
  let metricsContent = `# HELP dna_performance_score Overall performance score for template\n`;
  metricsContent += `# TYPE dna_performance_score gauge\n`;
  metricsContent += `dna_performance_score{template="${argv.templateType}",branch="${argv.branch}"} ${entry.overallScore}\n\n`;
  
  // API metrics
  if (entry.metrics.api) {
    metricsContent += `# HELP dna_api_response_time API response time in milliseconds\n`;
    metricsContent += `# TYPE dna_api_response_time gauge\n`;
    metricsContent += `dna_api_response_time{template="${argv.templateType}",branch="${argv.branch}"} ${entry.metrics.api.responseTime}\n\n`;
    
    metricsContent += `# HELP dna_api_throughput API throughput in requests per second\n`;
    metricsContent += `# TYPE dna_api_throughput gauge\n`;
    metricsContent += `dna_api_throughput{template="${argv.templateType}",branch="${argv.branch}"} ${entry.metrics.api.throughput}\n\n`;
    
    metricsContent += `# HELP dna_api_error_rate API error rate percentage\n`;
    metricsContent += `# TYPE dna_api_error_rate gauge\n`;
    metricsContent += `dna_api_error_rate{template="${argv.templateType}",branch="${argv.branch}"} ${entry.metrics.api.errorRate}\n\n`;
  }
  
  // Web metrics
  if (entry.metrics.web) {
    metricsContent += `# HELP dna_web_lcp Largest Contentful Paint in milliseconds\n`;
    metricsContent += `# TYPE dna_web_lcp gauge\n`;
    metricsContent += `dna_web_lcp{template="${argv.templateType}",branch="${argv.branch}"} ${entry.metrics.web.lcp}\n\n`;
    
    metricsContent += `# HELP dna_web_performance_score Web performance score\n`;
    metricsContent += `# TYPE dna_web_performance_score gauge\n`;
    metricsContent += `dna_web_performance_score{template="${argv.templateType}",branch="${argv.branch}"} ${entry.metrics.web.performanceScore}\n\n`;
  }
  
  await fs.writeFile(metricsFile, metricsContent);
  
  console.log('📈 Exported Prometheus metrics');
}

// Run dashboard update if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDashboard().catch(error => {
    console.error('❌ Dashboard update failed:', error.message);
    process.exit(1);
  });
}

export { updateDashboard };