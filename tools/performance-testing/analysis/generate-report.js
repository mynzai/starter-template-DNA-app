#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance Report Generator
 * Creates comprehensive performance reports in various formats
 */

const argv = yargs(hideBin(process.argv))
  .option('results', {
    alias: 'r',
    describe: 'Aggregated results JSON file',
    type: 'string',
    demandOption: true
  })
  .option('regression-report', {
    alias: 'reg',
    describe: 'Regression analysis JSON file',
    type: 'string'
  })
  .option('template-type', {
    alias: 't',
    describe: 'Template type being reported',
    type: 'string',
    demandOption: true
  })
  .option('output-format', {
    alias: 'f',
    describe: 'Output format',
    type: 'string',
    choices: ['markdown', 'html', 'json', 'text'],
    default: 'markdown'
  })
  .option('output', {
    alias: 'o',
    describe: 'Output file path',
    type: 'string',
    default: 'performance-report.md'
  })
  .help()
  .argv;

async function generateReport() {
  console.log('📊 Generating performance report...');
  
  // Load results
  const results = await fs.readJson(argv.results);
  let regressionReport = null;
  
  if (argv.regressionReport && await fs.pathExists(argv.regressionReport)) {
    regressionReport = await fs.readJson(argv.regressionReport);
  }
  
  // Generate report based on format
  let reportContent;
  
  switch (argv.outputFormat) {
    case 'markdown':
      reportContent = generateMarkdownReport(results, regressionReport);
      break;
    case 'html':
      reportContent = generateHtmlReport(results, regressionReport);
      break;
    case 'json':
      reportContent = generateJsonReport(results, regressionReport);
      break;
    case 'text':
      reportContent = generateTextReport(results, regressionReport);
      break;
    default:
      throw new Error(`Unsupported output format: ${argv.outputFormat}`);
  }
  
  // Write report
  await fs.writeFile(argv.output, reportContent);
  
  console.log(`✅ Performance report generated: ${argv.output}`);
  console.log(`📄 Format: ${argv.outputFormat}`);
  
  return argv.output;
}

/**
 * Generate Markdown performance report
 */
function generateMarkdownReport(results, regressionReport) {
  const metrics = results.metrics;
  const templateType = results.templateType;
  const timestamp = new Date(results.timestamp).toLocaleString();
  
  let report = `# Performance Report: ${templateType}\n\n`;
  report += `**Generated:** ${timestamp}  \n`;
  report += `**Commit:** ${results.testSession.commit}  \n`;
  report += `**Branch:** ${results.testSession.branch}  \n`;
  report += `**Environment:** ${results.testSession.environment}\n\n`;
  
  // Executive Summary
  report += `## 📋 Executive Summary\n\n`;
  
  if (metrics.derived?.overallPerformanceScore !== undefined) {
    const score = metrics.derived.overallPerformanceScore;
    const emoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
    report += `**Overall Performance Score:** ${emoji} ${score.toFixed(1)}/100\n\n`;
  }
  
  if (regressionReport) {
    const status = regressionReport.passed ? '✅ PASSED' : '❌ FAILED';
    report += `**Regression Status:** ${status}\n`;
    if (regressionReport.issues.length > 0) {
      report += `**Issues Found:** ${regressionReport.issues.length}\n`;
    }
    report += '\n';
  }
  
  // Performance Metrics
  report += `## 📊 Performance Metrics\n\n`;
  
  // API Performance
  if (metrics.api) {
    report += `### 🌐 API Performance\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Average Response Time | ${metrics.api.responseTime.avg.toFixed(2)}ms |\n`;
    report += `| 95th Percentile | ${metrics.api.responseTime.p95.toFixed(2)}ms |\n`;
    report += `| 99th Percentile | ${metrics.api.responseTime.p99.toFixed(2)}ms |\n`;
    report += `| Throughput | ${metrics.api.throughput.rps.toFixed(2)} req/s |\n`;
    report += `| Error Rate | ${metrics.api.errorRate.percentage.toFixed(2)}% |\n\n`;
  }
  
  // Web Performance
  if (metrics.lighthouse) {
    report += `### 🌐 Web Performance (Lighthouse)\n\n`;
    report += `| Category | Score |\n`;
    report += `|----------|-------|\n`;
    report += `| Performance | ${metrics.lighthouse.scores.performance}/100 |\n`;
    report += `| Accessibility | ${metrics.lighthouse.scores.accessibility}/100 |\n`;
    report += `| Best Practices | ${metrics.lighthouse.scores.bestPractices}/100 |\n`;
    report += `| SEO | ${metrics.lighthouse.scores.seo}/100 |\n\n`;
    
    report += `#### Core Web Vitals\n\n`;
    report += `| Metric | Value | Target |\n`;
    report += `|--------|-------|--------|\n`;
    report += `| Largest Contentful Paint | ${metrics.lighthouse.metrics.lcp}ms | <2500ms |\n`;
    report += `| First Contentful Paint | ${metrics.lighthouse.metrics.fcp}ms | <1800ms |\n`;
    report += `| Cumulative Layout Shift | ${metrics.lighthouse.metrics.cls} | <0.1 |\n`;
    report += `| Total Blocking Time | ${metrics.lighthouse.metrics.tbt}ms | <200ms |\n\n`;
  }
  
  // Mobile Performance
  if (metrics.flutter || metrics.reactNative) {
    report += `### 📱 Mobile Performance\n\n`;
    
    if (metrics.flutter) {
      report += `#### Flutter Performance\n\n`;
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| FPS | ${metrics.flutter.rendering.fps} |\n`;
      report += `| Average Frame Time | ${metrics.flutter.rendering.frameTime}ms |\n`;
      report += `| Missed Frames | ${metrics.flutter.rendering.missedFrames} |\n`;
      report += `| Heap Usage | ${(metrics.flutter.memory.heapUsage / 1024 / 1024).toFixed(2)}MB |\n`;
      report += `| App Start Time | ${metrics.flutter.startup.appStartTime}ms |\n\n`;
    }
    
    if (metrics.reactNative) {
      report += `#### React Native Performance\n\n`;
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| Bundle Size | ${(metrics.reactNative.javascript.bundleSize / 1024 / 1024).toFixed(2)}MB |\n`;
      report += `| JS Init Time | ${metrics.reactNative.javascript.initTime}ms |\n`;
      report += `| Memory Usage | ${(metrics.reactNative.native.memoryUsage / 1024 / 1024).toFixed(2)}MB |\n`;
      report += `| Navigation Time | ${metrics.reactNative.performance.navigationTime}ms |\n\n`;
    }
  }
  
  // System Performance
  if (metrics.system) {
    report += `### 🖥️ System Performance\n\n`;
    report += `| Resource | Usage |\n`;
    report += `|----------|-------|\n`;
    report += `| CPU | ${metrics.system.cpu.usage.toFixed(1)}% |\n`;
    report += `| Memory | ${metrics.system.memory.usage.toFixed(1)}% |\n`;
    report += `| Disk | ${metrics.system.disk.usage.toFixed(1)}% |\n`;
    report += `| Network In | ${(metrics.system.network.bytesIn / 1024 / 1024).toFixed(2)}MB |\n`;
    report += `| Network Out | ${(metrics.system.network.bytesOut / 1024 / 1024).toFixed(2)}MB |\n\n`;
  }
  
  // Regression Analysis
  if (regressionReport) {
    report += `## 🔍 Regression Analysis\n\n`;
    
    if (regressionReport.passed) {
      report += `✅ **No performance regressions detected**\n\n`;
    } else {
      report += `❌ **Performance regressions detected**\n\n`;
      
      report += `### Issues Found\n\n`;
      regressionReport.issues.forEach(issue => {
        const severityEmoji = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'low': '🟢'
        }[issue.severity] || '⚪';
        
        report += `- ${severityEmoji} **${issue.metric}**: ${issue.message}\n`;
      });
      report += '\n';
    }
    
    // Performance Trends
    if (regressionReport.analysis && regressionReport.analysis.length > 0) {
      report += `### Performance Trends\n\n`;
      report += `| Metric | Baseline | Current | Change | Status |\n`;
      report += `|--------|----------|---------|--------|--------|\n`;
      
      regressionReport.analysis.slice(0, 10).forEach(metric => {
        const statusEmoji = {
          'improved': '📈',
          'stable': '📊',
          'regressed': '📉'
        }[metric.status] || '❓';
        
        const changeStr = `${metric.changePercent > 0 ? '+' : ''}${metric.changePercent.toFixed(1)}%`;
        
        report += `| ${metric.name} | ${metric.baseline.toFixed(2)} | ${metric.current.toFixed(2)} | ${changeStr} | ${statusEmoji} ${metric.status} |\n`;
      });
      report += '\n';
    }
    
    // Recommendations
    if (regressionReport.recommendations && regressionReport.recommendations.length > 0) {
      report += `### 💡 Recommendations\n\n`;
      regressionReport.recommendations.forEach(rec => {
        const priorityEmoji = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'low': '🟢'
        }[rec.priority] || '⚪';
        
        report += `- ${priorityEmoji} **${rec.type}**: ${rec.message}\n`;
      });
      report += '\n';
    }
  }
  
  // Performance Budget
  report += `## 💰 Performance Budget Status\n\n`;
  report += generateBudgetStatus(metrics, templateType);
  
  // Historical Comparison
  report += `## 📈 Historical Context\n\n`;
  report += `This report compares current performance against established baselines. `;
  report += `Regular monitoring helps identify performance trends and prevent regressions.\n\n`;
  
  // Actions Required
  if (regressionReport && !regressionReport.passed) {
    report += `## ⚡ Actions Required\n\n`;
    report += `1. **Investigate Root Cause**: Review recent changes that may have impacted performance\n`;
    report += `2. **Optimize Critical Issues**: Focus on critical and high severity regressions first\n`;
    report += `3. **Re-run Tests**: Verify fixes by running performance tests again\n`;
    report += `4. **Update Baselines**: Consider updating baselines if intentional changes were made\n\n`;
  }
  
  report += `---\n`;
  report += `*Generated by DNA Performance Monitoring System*\n`;
  
  return report;
}

/**
 * Generate performance budget status
 */
function generateBudgetStatus(metrics, templateType) {
  const budgets = getPerformanceBudgets(templateType);
  let status = '';
  
  if (metrics.api && budgets.api) {
    status += `### 🌐 API Budget\n\n`;
    status += `| Metric | Current | Budget | Status |\n`;
    status += `|--------|---------|--------|--------|\n`;
    
    const responseTimeStatus = metrics.api.responseTime.avg <= budgets.api.responseTime ? '✅' : '❌';
    status += `| Response Time | ${metrics.api.responseTime.avg.toFixed(2)}ms | ${budgets.api.responseTime}ms | ${responseTimeStatus} |\n`;
    
    const errorRateStatus = metrics.api.errorRate.percentage <= budgets.api.errorRate ? '✅' : '❌';
    status += `| Error Rate | ${metrics.api.errorRate.percentage.toFixed(2)}% | ${budgets.api.errorRate}% | ${errorRateStatus} |\n\n`;
  }
  
  if (metrics.lighthouse && budgets.web) {
    status += `### 🌐 Web Budget\n\n`;
    status += `| Metric | Current | Budget | Status |\n`;
    status += `|--------|---------|--------|--------|\n`;
    
    const performanceStatus = metrics.lighthouse.scores.performance >= budgets.web.performanceScore ? '✅' : '❌';
    status += `| Performance Score | ${metrics.lighthouse.scores.performance} | ${budgets.web.performanceScore} | ${performanceStatus} |\n`;
    
    const lcpStatus = metrics.lighthouse.metrics.lcp <= budgets.web.lcp ? '✅' : '❌';
    status += `| LCP | ${metrics.lighthouse.metrics.lcp}ms | ${budgets.web.lcp}ms | ${lcpStatus} |\n`;
    
    const clsStatus = metrics.lighthouse.metrics.cls <= budgets.web.cls ? '✅' : '❌';
    status += `| CLS | ${metrics.lighthouse.metrics.cls} | ${budgets.web.cls} | ${clsStatus} |\n\n`;
  }
  
  return status || 'No performance budgets configured for this template type.\n\n';
}

/**
 * Get performance budgets for template type
 */
function getPerformanceBudgets(templateType) {
  const budgets = {
    'ai-saas': {
      api: {
        responseTime: 200,
        errorRate: 0.1,
        throughput: 100
      },
      web: {
        performanceScore: 90,
        lcp: 2500,
        cls: 0.1
      }
    },
    'high-performance': {
      api: {
        responseTime: 50,
        errorRate: 0.01,
        throughput: 1000
      },
      web: {
        performanceScore: 95,
        lcp: 1500,
        cls: 0.05
      }
    },
    'data-visualization': {
      web: {
        performanceScore: 85,
        lcp: 3000,
        cls: 0.15
      }
    },
    'cross-platform': {
      mobile: {
        appStartTime: 2000,
        memoryUsage: 150,
        batteryDrain: 2
      }
    }
  };
  
  return budgets[templateType] || {};
}

/**
 * Generate HTML report (basic implementation)
 */
function generateHtmlReport(results, regressionReport) {
  const markdownReport = generateMarkdownReport(results, regressionReport);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report: ${results.templateType}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
    </style>
</head>
<body>
    <pre>${markdownReport}</pre>
</body>
</html>
  `;
}

/**
 * Generate JSON report
 */
function generateJsonReport(results, regressionReport) {
  return JSON.stringify({
    report: {
      templateType: results.templateType,
      timestamp: results.timestamp,
      testSession: results.testSession,
      metrics: results.metrics,
      regression: regressionReport,
      generated: new Date().toISOString()
    }
  }, null, 2);
}

/**
 * Generate text report
 */
function generateTextReport(results, regressionReport) {
  let report = `PERFORMANCE REPORT: ${results.templateType}\n`;
  report += `Generated: ${new Date(results.timestamp).toLocaleString()}\n`;
  report += `Commit: ${results.testSession.commit}\n`;
  report += `Branch: ${results.testSession.branch}\n\n`;
  
  if (results.metrics.derived?.overallPerformanceScore !== undefined) {
    report += `Overall Performance Score: ${results.metrics.derived.overallPerformanceScore.toFixed(1)}/100\n\n`;
  }
  
  if (regressionReport) {
    report += `Regression Status: ${regressionReport.passed ? 'PASSED' : 'FAILED'}\n`;
    if (regressionReport.issues.length > 0) {
      report += `Issues Found: ${regressionReport.issues.length}\n`;
    }
    report += '\n';
  }
  
  // Add basic metrics summary
  if (results.metrics.api) {
    report += `API Performance:\n`;
    report += `  Response Time: ${results.metrics.api.responseTime.avg.toFixed(2)}ms\n`;
    report += `  Error Rate: ${results.metrics.api.errorRate.percentage.toFixed(2)}%\n\n`;
  }
  
  return report;
}

// Run report generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateReport().catch(error => {
    console.error('❌ Report generation failed:', error.message);
    process.exit(1);
  });
}

export { generateReport };