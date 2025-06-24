/**
 * @fileoverview Performance Monitoring CI/CD Tests
 * Validates the performance monitoring and regression detection CI/CD templates
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/testing-library/jest-dom';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Performance Monitoring CI/CD Templates', () => {
  const templatesDir = path.join(__dirname, '../templates/ci-cd');
  const performanceWorkflowPath = path.join(templatesDir, 'performance-monitoring.yml');
  const toolsDir = path.join(__dirname, '../../../../tools/performance-testing');
  
  test('performance monitoring workflow file exists and is valid YAML', async () => {
    expect(await fs.pathExists(performanceWorkflowPath)).toBe(true);
    
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    expect(() => yaml.load(workflowContent)).not.toThrow();
  });
  
  test('performance monitoring workflow has required jobs', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    expect(workflow).toHaveProperty('jobs');
    expect(workflow.jobs).toHaveProperty('setup');
    expect(workflow.jobs).toHaveProperty('benchmark');
    expect(workflow.jobs).toHaveProperty('regression-analysis');
    expect(workflow.jobs).toHaveProperty('alerting');
    expect(workflow.jobs).toHaveProperty('performance-gate');
  });
  
  test('workflow includes template type detection', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    const setupJob = workflow.jobs.setup;
    expect(setupJob.outputs).toHaveProperty('template-type');
    expect(setupJob.outputs).toHaveProperty('framework');
    expect(setupJob.outputs).toHaveProperty('has-web');
    expect(setupJob.outputs).toHaveProperty('has-api');
    expect(setupJob.outputs).toHaveProperty('has-mobile');
  });
  
  test('benchmark job includes matrix strategy for different test types', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    const benchmarkJob = workflow.jobs.benchmark;
    expect(benchmarkJob.strategy).toHaveProperty('matrix');
    expect(benchmarkJob.strategy.matrix).toHaveProperty('test-type');
    
    const testTypes = benchmarkJob.strategy.matrix['test-type'];
    expect(testTypes).toContain('api');
    expect(testTypes).toContain('web');
    expect(testTypes).toContain('mobile');
    expect(testTypes).toContain('system');
  });
  
  test('regression analysis includes baseline comparison', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    const regressionJob = workflow.jobs['regression-analysis'];
    const steps = regressionJob.steps;
    
    const hasBaselineComparison = steps.some((step: any) => 
      step.name?.includes('Compare against baseline') || 
      step.run?.includes('baseline-manager.js compare')
    );
    
    expect(hasBaselineComparison).toBe(true);
  });
  
  test('alerting job triggers on regressions', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    const alertingJob = workflow.jobs.alerting;
    expect(alertingJob.if).toContain('has-regressions');
  });
  
  test('performance analysis tools exist', async () => {
    const aggregateResultsPath = path.join(toolsDir, 'analysis/aggregate-results.js');
    const generateReportPath = path.join(toolsDir, 'analysis/generate-report.js');
    const baselineManagerPath = path.join(toolsDir, 'regression-tests/baseline-manager.js');
    const webVitalsPath = path.join(toolsDir, 'web-vitals/measure-vitals.js');
    const dashboardUpdatePath = path.join(toolsDir, 'monitoring/update-dashboard.js');
    
    expect(await fs.pathExists(aggregateResultsPath)).toBe(true);
    expect(await fs.pathExists(generateReportPath)).toBe(true);
    expect(await fs.pathExists(baselineManagerPath)).toBe(true);
    expect(await fs.pathExists(webVitalsPath)).toBe(true);
    expect(await fs.pathExists(dashboardUpdatePath)).toBe(true);
  });
  
  test('aggregate results tool has proper CLI interface', async () => {
    const aggregateResultsPath = path.join(toolsDir, 'analysis/aggregate-results.js');
    const content = await fs.readFile(aggregateResultsPath, 'utf8');
    
    // Check for required CLI options
    expect(content).toContain('input-dir');
    expect(content).toContain('output');
    expect(content).toContain('template-type');
    
    // Check for main function
    expect(content).toContain('aggregateResults');
  });
  
  test('report generator supports multiple output formats', async () => {
    const generateReportPath = path.join(toolsDir, 'analysis/generate-report.js');
    const content = await fs.readFile(generateReportPath, 'utf8');
    
    // Check for supported formats
    expect(content).toContain('markdown');
    expect(content).toContain('html');
    expect(content).toContain('json');
    expect(content).toContain('text');
  });
  
  test('baseline manager supports create and compare operations', async () => {
    const baselineManagerPath = path.join(toolsDir, 'regression-tests/baseline-manager.js');
    const content = await fs.readFile(baselineManagerPath, 'utf8');
    
    // Check for core methods
    expect(content).toContain('createBaseline');
    expect(content).toContain('compareToBaseline');
    expect(content).toContain('analyzePerformanceChanges');
  });
  
  test('web vitals tool measures core web vitals', async () => {
    const webVitalsPath = path.join(toolsDir, 'web-vitals/measure-vitals.js');
    const content = await fs.readFile(webVitalsPath, 'utf8');
    
    // Check for Core Web Vitals
    expect(content).toContain('lcp'); // Largest Contentful Paint
    expect(content).toContain('fid'); // First Input Delay
    expect(content).toContain('cls'); // Cumulative Layout Shift
    expect(content).toContain('fcp'); // First Contentful Paint
    expect(content).toContain('ttfb'); // Time to First Byte
  });
  
  test('dashboard updater generates proper metrics export', async () => {
    const dashboardUpdatePath = path.join(toolsDir, 'monitoring/update-dashboard.js');
    const content = await fs.readFile(dashboardUpdatePath, 'utf8');
    
    // Check for dashboard functionality
    expect(content).toContain('updateHistoricalData');
    expect(content).toContain('updateCurrentStatus');
    expect(content).toContain('exportPrometheusMetrics');
    expect(content).toContain('generateDashboardHtml');
  });
  
  test('workflow includes proper environment variables', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    expect(workflow.env).toHaveProperty('NODE_VERSION');
    expect(workflow.env).toHaveProperty('PERFORMANCE_TIMEOUT');
    expect(workflow.env).toHaveProperty('REGRESSION_THRESHOLD');
  });
  
  test('workflow supports manual triggering with options', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    expect(workflow.on).toHaveProperty('workflow_dispatch');
    const dispatch = workflow.on.workflow_dispatch;
    
    expect(dispatch.inputs).toHaveProperty('create_baseline');
    expect(dispatch.inputs).toHaveProperty('target_environment');
  });
  
  test('performance gate fails on critical regressions', async () => {
    const workflowContent = await fs.readFile(performanceWorkflowPath, 'utf8');
    const workflow = yaml.load(workflowContent) as any;
    
    const performanceGateJob = workflow.jobs['performance-gate'];
    const steps = performanceGateJob.steps;
    
    const hasGateLogic = steps.some((step: any) => 
      step.run?.includes('exit 1') && 
      step.run?.includes('CRITICAL_REGRESSIONS')
    );
    
    expect(hasGateLogic).toBe(true);
  });
});

describe('Performance Monitoring Integration', () => {
  test('cicd-workflows.ts includes updated PerformanceConfig interface', async () => {
    const cicdWorkflowsPath = path.join(__dirname, '../cicd-workflows.ts');
    const content = await fs.readFile(cicdWorkflowsPath, 'utf8');
    
    // Check for new performance config properties
    expect(content).toContain('regressionDetection');
    expect(content).toContain('dashboard');
    expect(content).toContain('PerformanceDashboardConfig');
    expect(content).toContain('RegressionDetectionConfig');
  });
  
  test('PerformanceConfig supports comprehensive monitoring configuration', async () => {
    const cicdWorkflowsPath = path.join(__dirname, '../cicd-workflows.ts');
    const content = await fs.readFile(cicdWorkflowsPath, 'utf8');
    
    // Check for detailed configuration options
    expect(content).toContain('RegressionMetric');
    expect(content).toContain('DashboardWidget');
    expect(content).toContain('HistoricalDataConfig');
    expect(content).toContain('PerformanceReportingConfig');
  });
});