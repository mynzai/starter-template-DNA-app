import { BaselineManager } from '../regression-tests/baseline-manager.js';
import { runLoadTests } from './run-load-tests.js';
import chalk from 'chalk';

/**
 * Run regression tests against established baselines
 */
export async function runRegressionTests(templateType, metadata = {}) {
  console.log(chalk.blue(`🔄 Running regression tests for ${templateType}`));
  
  try {
    const baselineManager = new BaselineManager({
      tolerance: 0.1 // 10% tolerance
    });
    
    // Check if baseline exists
    let baseline;
    try {
      baseline = await baselineManager.loadBaseline(templateType);
      console.log(chalk.green(`✅ Found baseline for ${templateType} (version: ${baseline.version})`));
    } catch (error) {
      throw new Error(`No baseline found for ${templateType}. Create one with: dna-perf baseline create ${templateType}`);
    }
    
    // Run current performance tests
    console.log(chalk.yellow('🚀 Running current performance tests...'));
    const currentResults = await runLoadTests({
      type: 'all',
      templateType,
      users: 50, // Use moderate load for regression testing
      duration: '3m'
    });
    
    // Compare against baseline
    console.log(chalk.yellow('📊 Comparing against baseline...'));
    const comparison = await baselineManager.compareToBaseline(
      templateType, 
      currentResults, 
      metadata
    );
    
    // Generate regression report
    const report = baselineManager.generateRegressionReport(comparison);
    
    // Display results
    displayRegressionResults(report);
    
    return comparison;
    
  } catch (error) {
    console.error(chalk.red('❌ Regression tests failed:'), error.message);
    throw error;
  }
}

/**
 * Display regression test results in console
 */
function displayRegressionResults(report) {
  console.log(chalk.blue('\\n📋 Regression Test Results'));
  console.log(chalk.gray('─'.repeat(50)));
  
  const { summary, details } = report;
  
  // Overall status
  if (summary.passed) {
    console.log(chalk.green(`✅ PASSED: No significant regressions detected`));
  } else {
    console.log(chalk.red(`❌ FAILED: ${summary.regressions} regression(s) found`));
  }
  
  // Summary stats
  console.log(`\\n📊 Summary:`);
  console.log(`   Template: ${summary.templateType}`);
  console.log(`   Total Metrics: ${summary.totalMetrics}`);
  console.log(`   Improvements: ${chalk.green(summary.improvements)}`);
  console.log(`   Stable: ${chalk.blue(summary.stable)}`);
  console.log(`   Regressions: ${chalk.red(summary.regressions)}`);
  
  // Baseline info
  console.log(`\\n🔄 Baseline Comparison:`);
  console.log(`   Baseline Version: ${details.baseline.version}`);
  console.log(`   Baseline Date: ${new Date(details.baseline.timestamp).toLocaleString()}`);
  console.log(`   Current Date: ${new Date(details.current.timestamp).toLocaleString()}`);
  
  // Detailed analysis
  if (details.analysis.length > 0) {
    console.log(`\\n📈 Detailed Analysis:`);
    
    // Group by status
    const improved = details.analysis.filter(m => m.status === 'improved');
    const stable = details.analysis.filter(m => m.status === 'stable');
    const regressed = details.analysis.filter(m => m.status === 'regressed');
    
    // Show improvements
    if (improved.length > 0) {
      console.log(chalk.green(`\\n🚀 Improvements (${improved.length}):`));
      improved.slice(0, 5).forEach(metric => {
        const change = metric.changePercent > 0 ? `+${metric.changePercent.toFixed(1)}%` : `${metric.changePercent.toFixed(1)}%`;
        console.log(`   ${chalk.green('↗')} ${metric.name}: ${change} (${metric.baseline} → ${metric.current})`);
      });
      if (improved.length > 5) {
        console.log(chalk.gray(`   ... and ${improved.length - 5} more improvements`));
      }
    }
    
    // Show regressions
    if (regressed.length > 0) {
      console.log(chalk.red(`\\n📉 Regressions (${regressed.length}):`));
      regressed.forEach(metric => {
        const change = metric.changePercent > 0 ? `+${metric.changePercent.toFixed(1)}%` : `${metric.changePercent.toFixed(1)}%`;
        const severity = getSeverityIcon(Math.abs(metric.changePercent));
        console.log(`   ${chalk.red('↘')} ${severity} ${metric.name}: ${change} (${metric.baseline} → ${metric.current})`);
      });
    }
    
    // Show stable metrics (only if verbose)
    if (process.env.VERBOSE === 'true' && stable.length > 0) {
      console.log(chalk.blue(`\\n➡️  Stable Metrics (${stable.length}):`));
      stable.slice(0, 3).forEach(metric => {
        console.log(`   ${chalk.blue('→')} ${metric.name}: ${metric.current} (no significant change)`);
      });
      if (stable.length > 3) {
        console.log(chalk.gray(`   ... and ${stable.length - 3} more stable metrics`));
      }
    }
  }
  
  // Issues and violations
  if (details.issues.length > 0) {
    console.log(chalk.red(`\\n🚨 Issues Requiring Attention:`));
    details.issues.forEach((issue, index) => {
      const severityColor = getSeverityColor(issue.severity);
      console.log(`   ${index + 1}. ${severityColor(issue.severity.toUpperCase())}: ${issue.message}`);
      console.log(`      Threshold: ${issue.threshold}%, Actual: ${issue.actual.toFixed(1)}%`);
    });
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    console.log(chalk.yellow(`\\n💡 Recommendations:`));
    report.recommendations.forEach((rec, index) => {
      const priorityColor = getPriorityColor(rec.priority);
      console.log(`   ${index + 1}. ${priorityColor(rec.priority.toUpperCase())}: ${rec.message}`);
    });
  }
  
  console.log(chalk.gray('\\n─'.repeat(50)));
}

/**
 * Get severity icon based on percentage change
 */
function getSeverityIcon(changePercent) {
  if (changePercent >= 50) return '🔴'; // Critical
  if (changePercent >= 25) return '🟠'; // High
  if (changePercent >= 10) return '🟡'; // Medium
  return '🟢'; // Low
}

/**
 * Get color function for severity
 */
function getSeverityColor(severity) {
  const colors = {
    critical: chalk.red.bold,
    high: chalk.red,
    medium: chalk.yellow,
    low: chalk.blue
  };
  return colors[severity] || chalk.gray;
}

/**
 * Get color function for priority
 */
function getPriorityColor(priority) {
  const colors = {
    critical: chalk.red.bold,
    high: chalk.red,
    medium: chalk.yellow,
    low: chalk.blue
  };
  return colors[priority] || chalk.gray;
}

/**
 * Create regression test summary for CI/CD
 */
export function createRegressionSummary(comparison) {
  const summary = {
    passed: comparison.passed,
    templateType: comparison.templateType,
    timestamp: comparison.timestamp,
    regressions: comparison.issues.length,
    improvements: comparison.analysis.filter(m => m.status === 'improved').length,
    stable: comparison.analysis.filter(m => m.status === 'stable').length,
    criticalIssues: comparison.issues.filter(i => i.severity === 'critical').length,
    highIssues: comparison.issues.filter(i => i.severity === 'high').length
  };
  
  return summary;
}

/**
 * Export regression results for reporting
 */
export async function exportRegressionResults(comparison, outputPath) {
  const fs = await import('fs-extra');
  
  const exportData = {
    ...comparison,
    exportedAt: new Date().toISOString(),
    format: 'regression-test-results',
    version: '1.0.0'
  };
  
  await fs.writeJson(outputPath, exportData, { spaces: 2 });
  console.log(chalk.green(`📁 Regression results exported to ${outputPath}`));
}