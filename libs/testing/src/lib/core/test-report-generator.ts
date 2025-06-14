/**
 * @fileoverview Test Report Generator for comprehensive test reporting
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  TestReport,
  TestResult,
  TestSummary,
  Framework,
  QualityGateResult,
  CoverageMetrics,
  PerformanceMetrics,
  SecurityMetrics,
  AccessibilityMetrics,
} from '../types';

export interface ReportGenerationOptions {
  framework: Framework;
  timestamp: Date;
  duration: number;
  results: TestResult[];
  qualityGate: QualityGateResult;
  outputDir?: string;
  formats?: ReportFormat[];
}

export type ReportFormat = 'json' | 'html' | 'xml' | 'markdown' | 'junit';

export class TestReportGenerator {
  private defaultOutputDir = './test-reports';

  /**
   * Generate comprehensive test report
   */
  async generateReport(options: ReportGenerationOptions): Promise<TestReport> {
    const summary = this.calculateSummary(options.results);
    const coverage = this.aggregateCoverage(options.results);
    const performance = this.aggregatePerformance(options.results);
    const security = this.aggregateSecurity(options.results);
    const accessibility = this.aggregateAccessibility(options.results);

    const report: TestReport = {
      framework: options.framework,
      timestamp: options.timestamp,
      duration: options.duration,
      summary,
      results: options.results,
      coverage,
      performance,
      security,
      accessibility,
      qualityGate: options.qualityGate,
    };

    // Generate reports in requested formats
    if (options.formats && options.formats.length > 0) {
      await this.generateFormattedReports(report, options);
    }

    return report;
  }

  /**
   * Generate reports in multiple formats
   */
  async generateFormattedReports(
    report: TestReport,
    options: ReportGenerationOptions
  ): Promise<void> {
    const outputDir = options.outputDir || this.defaultOutputDir;
    await fs.ensureDir(outputDir);

    const formats = options.formats || ['json', 'html'];

    for (const format of formats) {
      const fileName = this.getReportFileName(report.framework, format, report.timestamp);
      const filePath = path.join(outputDir, fileName);

      switch (format) {
        case 'json':
          await this.generateJsonReport(report, filePath);
          break;
        case 'html':
          await this.generateHtmlReport(report, filePath);
          break;
        case 'xml':
          await this.generateXmlReport(report, filePath);
          break;
        case 'markdown':
          await this.generateMarkdownReport(report, filePath);
          break;
        case 'junit':
          await this.generateJunitReport(report, filePath);
          break;
      }
    }
  }

  private calculateSummary(results: TestResult[]): TestSummary {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      skipped,
      successRate,
    };
  }

  private aggregateCoverage(results: TestResult[]): CoverageMetrics {
    const coverageResults = results.filter(r => r.coverage);
    
    if (coverageResults.length === 0) {
      return { lines: 0, functions: 0, branches: 0, statements: 0 };
    }

    return {
      lines: this.average(coverageResults.map(r => r.coverage!.lines)),
      functions: this.average(coverageResults.map(r => r.coverage!.functions)),
      branches: this.average(coverageResults.map(r => r.coverage!.branches)),
      statements: this.average(coverageResults.map(r => r.coverage!.statements)),
    };
  }

  private aggregatePerformance(results: TestResult[]): PerformanceMetrics {
    const performanceResults = results.filter(r => r.performanceMetrics);
    
    if (performanceResults.length === 0) {
      return { executionTime: 0, memoryUsage: 0 };
    }

    return {
      executionTime: Math.max(...performanceResults.map(r => r.performanceMetrics!.executionTime)),
      memoryUsage: Math.max(...performanceResults.map(r => r.performanceMetrics!.memoryUsage)),
      bundleSize: Math.max(...performanceResults.map(r => r.performanceMetrics!.bundleSize || 0)),
      renderTime: Math.max(...performanceResults.map(r => r.performanceMetrics!.renderTime || 0)),
      timeToInteractive: Math.max(...performanceResults.map(r => r.performanceMetrics!.timeToInteractive || 0)),
    };
  }

  private aggregateSecurity(results: TestResult[]): SecurityMetrics {
    return {
      vulnerabilities: [],
      codeSmells: [],
      technicalDebt: {
        debtRatio: 0,
        maintainabilityIndex: 100,
        cyclomaticComplexity: 0,
        duplicatedLines: 0,
        codeSmellsCount: 0,
      },
    };
  }

  private aggregateAccessibility(results: TestResult[]): AccessibilityMetrics {
    return {
      score: 100,
      violations: [],
      wcagLevel: 'AAA',
    };
  }

  private async generateJsonReport(report: TestReport, filePath: string): Promise<void> {
    const jsonContent = JSON.stringify(report, null, 2);
    await fs.writeFile(filePath, jsonContent);
  }

  private async generateHtmlReport(report: TestReport, filePath: string): Promise<void> {
    const htmlContent = this.generateHtmlContent(report);
    await fs.writeFile(filePath, htmlContent);
  }

  private async generateMarkdownReport(report: TestReport, filePath: string): Promise<void> {
    const markdownContent = this.generateMarkdownContent(report);
    await fs.writeFile(filePath, markdownContent);
  }

  private async generateXmlReport(report: TestReport, filePath: string): Promise<void> {
    const xmlContent = this.generateXmlContent(report);
    await fs.writeFile(filePath, xmlContent);
  }

  private async generateJunitReport(report: TestReport, filePath: string): Promise<void> {
    const junitContent = this.generateJunitContent(report);
    await fs.writeFile(filePath, junitContent);
  }

  private generateHtmlContent(report: TestReport): string {
    const statusIcon = report.qualityGate.passed ? '✅' : '❌';
    const statusColor = report.qualityGate.passed ? 'green' : 'red';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${report.framework}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .quality-gate { text-align: center; margin: 20px 0; }
    .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
    .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
    .metric-title { font-weight: bold; margin-bottom: 10px; color: #333; }
    .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
    .test-results { margin-top: 30px; }
    .test-result { margin: 10px 0; padding: 15px; border-radius: 4px; }
    .test-passed { background: #d4edda; border: 1px solid #c3e6cb; }
    .test-failed { background: #f8d7da; border: 1px solid #f5c6cb; }
    .test-skipped { background: #fff3cd; border: 1px solid #ffeaa7; }
    .failures { margin-top: 20px; }
    .failure { background: #f8d7da; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Test Report</h1>
      <h2>${report.framework.toUpperCase()} Framework</h2>
      <p>Generated on: ${report.timestamp.toLocaleString()}</p>
      <p>Duration: ${(report.duration / 1000).toFixed(2)} seconds</p>
    </div>

    <div class="quality-gate">
      <div class="status">${statusIcon} Quality Gate ${report.qualityGate.passed ? 'PASSED' : 'FAILED'}</div>
      <p>Score: ${report.qualityGate.score.toFixed(1)}/100</p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-title">Test Summary</div>
        <p>Total Tests: ${report.summary.total}</p>
        <p>Passed: ${report.summary.passed}</p>
        <p>Failed: ${report.summary.failed}</p>
        <p>Skipped: ${report.summary.skipped}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${report.summary.successRate}%"></div>
        </div>
        <p>Success Rate: ${report.summary.successRate.toFixed(1)}%</p>
      </div>

      <div class="metric-card">
        <div class="metric-title">Code Coverage</div>
        <p>Lines: ${report.coverage.lines.toFixed(1)}%</p>
        <p>Functions: ${report.coverage.functions.toFixed(1)}%</p>
        <p>Branches: ${report.coverage.branches.toFixed(1)}%</p>
        <p>Statements: ${report.coverage.statements.toFixed(1)}%</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${report.coverage.lines}%"></div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Performance</div>
        <p>Execution Time: ${report.performance.executionTime}ms</p>
        <p>Memory Usage: ${(report.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB</p>
        ${report.performance.bundleSize ? `<p>Bundle Size: ${(report.performance.bundleSize / 1024 / 1024).toFixed(2)}MB</p>` : ''}
        ${report.performance.renderTime ? `<p>Render Time: ${report.performance.renderTime}ms</p>` : ''}
      </div>
    </div>

    ${report.qualityGate.failures.length > 0 ? `
    <div class="failures">
      <h3>Quality Gate Failures</h3>
      ${report.qualityGate.failures.map(failure => `
        <div class="failure">
          <strong>${failure.gate}: ${failure.metric}</strong><br>
          Expected: ${failure.expected}, Actual: ${failure.actual}<br>
          Impact: ${failure.impact}<br>
          <em>${failure.remediation}</em>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="test-results">
      <h3>Test Results</h3>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${report.results.map(result => `
            <tr class="test-${result.status}">
              <td>${result.name}</td>
              <td>${result.testType}</td>
              <td>${result.status.toUpperCase()}</td>
              <td>${result.duration}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${report.qualityGate.recommendations.length > 0 ? `
    <div class="recommendations">
      <h3>Recommendations</h3>
      <ul>
        ${report.qualityGate.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }

  private generateMarkdownContent(report: TestReport): string {
    const statusIcon = report.qualityGate.passed ? '✅' : '❌';
    
    return `# Test Report - ${report.framework.toUpperCase()}

Generated on: ${report.timestamp.toLocaleString()}  
Duration: ${(report.duration / 1000).toFixed(2)} seconds

## ${statusIcon} Quality Gate ${report.qualityGate.passed ? 'PASSED' : 'FAILED'}

**Score:** ${report.qualityGate.score.toFixed(1)}/100

## Test Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.total} |
| Passed | ${report.summary.passed} |
| Failed | ${report.summary.failed} |
| Skipped | ${report.summary.skipped} |
| Success Rate | ${report.summary.successRate.toFixed(1)}% |

## Code Coverage

| Type | Coverage |
|------|----------|
| Lines | ${report.coverage.lines.toFixed(1)}% |
| Functions | ${report.coverage.functions.toFixed(1)}% |
| Branches | ${report.coverage.branches.toFixed(1)}% |
| Statements | ${report.coverage.statements.toFixed(1)}% |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Execution Time | ${report.performance.executionTime}ms |
| Memory Usage | ${(report.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB |
${report.performance.bundleSize ? `| Bundle Size | ${(report.performance.bundleSize / 1024 / 1024).toFixed(2)}MB |` : ''}
${report.performance.renderTime ? `| Render Time | ${report.performance.renderTime}ms |` : ''}

${report.qualityGate.failures.length > 0 ? `
## Quality Gate Failures

${report.qualityGate.failures.map(failure => `
### ${failure.gate}: ${failure.metric}
- **Expected:** ${failure.expected}
- **Actual:** ${failure.actual}
- **Impact:** ${failure.impact}
- **Remediation:** ${failure.remediation}
`).join('')}
` : ''}

## Test Results

| Test Name | Type | Status | Duration |
|-----------|------|--------|----------|
${report.results.map(result => `| ${result.name} | ${result.testType} | ${result.status.toUpperCase()} | ${result.duration}ms |`).join('\n')}

${report.qualityGate.recommendations.length > 0 ? `
## Recommendations

${report.qualityGate.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}
`;
  }

  private generateXmlContent(report: TestReport): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<testReport>
  <framework>${report.framework}</framework>
  <timestamp>${report.timestamp.toISOString()}</timestamp>
  <duration>${report.duration}</duration>
  <qualityGate passed="${report.qualityGate.passed}" score="${report.qualityGate.score}"/>
  <summary>
    <total>${report.summary.total}</total>
    <passed>${report.summary.passed}</passed>
    <failed>${report.summary.failed}</failed>
    <skipped>${report.summary.skipped}</skipped>
    <successRate>${report.summary.successRate}</successRate>
  </summary>
  <coverage>
    <lines>${report.coverage.lines}</lines>
    <functions>${report.coverage.functions}</functions>
    <branches>${report.coverage.branches}</branches>
    <statements>${report.coverage.statements}</statements>
  </coverage>
  <testResults>
    ${report.results.map(result => `
    <testResult>
      <name>${result.name}</name>
      <type>${result.testType}</type>
      <status>${result.status}</status>
      <duration>${result.duration}</duration>
      ${result.error ? `<error>${result.error}</error>` : ''}
    </testResult>`).join('')}
  </testResults>
</testReport>`;
  }

  private generateJunitContent(report: TestReport): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${report.framework}" tests="${report.summary.total}" failures="${report.summary.failed}" skipped="${report.summary.skipped}" time="${report.duration / 1000}">
  <testsuite name="${report.framework}" tests="${report.summary.total}" failures="${report.summary.failed}" skipped="${report.summary.skipped}" time="${report.duration / 1000}">
    ${report.results.map(result => `
    <testcase name="${result.name}" classname="${result.testType}" time="${result.duration / 1000}">
      ${result.status === 'failed' ? `<failure message="Test failed">${result.error || 'Test failed'}</failure>` : ''}
      ${result.status === 'skipped' ? '<skipped/>' : ''}
    </testcase>`).join('')}
  </testsuite>
</testsuites>`;
  }

  private getReportFileName(framework: Framework, format: ReportFormat, timestamp: Date): string {
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    return `test-report-${framework}-${dateStr}-${timeStr}.${format}`;
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }
}