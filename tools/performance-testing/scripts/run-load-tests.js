import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run comprehensive load tests for DNA templates
 */
export async function runLoadTests(options = {}) {
  const {
    type = 'all',
    templateType,
    users = 10,
    duration = '5m',
    env = 'dev',
    output = './reports',
    baseline = false
  } = options;
  
  console.log(chalk.blue(`🚀 Starting load tests for ${templateType || 'all templates'}`));
  console.log(chalk.gray(`   Type: ${type}, Users: ${users}, Duration: ${duration}, Environment: ${env}`));
  
  const results = {
    timestamp: new Date().toISOString(),
    templateType,
    testType: type,
    environment: env,
    configuration: { users, duration },
    results: {},
    summary: {
      totalRequests: 0,
      avgResponseTime: 0,
      successRate: 0,
      throughput: 0,
      errors: 0
    }
  };
  
  try {
    // Ensure output directory exists
    await fs.ensureDir(output);
    
    // Run different test types based on configuration
    if (type === 'all' || type === 'api') {
      console.log(chalk.yellow('📡 Running API load tests...'));
      results.results.api = await runK6Tests(templateType, users, duration, env);
    }
    
    if (type === 'all' || type === 'web') {
      console.log(chalk.yellow('🌐 Running web performance tests...'));
      results.results.web = await runLighthouseTests(templateType, env);
    }
    
    if (type === 'all' || type === 'mobile') {
      console.log(chalk.yellow('📱 Running mobile performance tests...'));
      results.results.mobile = await runMobileTests(templateType, env);
    }
    
    // Calculate summary metrics
    results.summary = calculateSummaryMetrics(results.results);
    
    // Save results
    const outputFile = path.join(output, `load-test-results-${Date.now()}.json`);
    await fs.writeJson(outputFile, results, { spaces: 2 });
    
    console.log(chalk.green(`✅ Load tests completed successfully`));
    console.log(chalk.gray(`📁 Results saved to: ${outputFile}`));
    
    return results;
    
  } catch (error) {
    console.error(chalk.red('❌ Load tests failed:'), error.message);
    throw error;
  }
}

/**
 * Run K6 API load tests
 */
async function runK6Tests(templateType, users, duration, env) {
  return new Promise((resolve, reject) => {
    const k6Script = path.join(__dirname, '../load-tests/api-performance.js');
    const outputFile = path.join(__dirname, '../reports/k6-results.json');
    
    const k6Process = spawn('k6', [
      'run',
      '--out', `json=${outputFile}`,
      '--env', `TEST_TYPE=${getAPITestType(templateType)}`,
      '--env', `ENVIRONMENT=${env}`,
      '--env', `VUS=${users}`,
      '--env', `DURATION=${duration}`,
      k6Script
    ], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    k6Process.stdout.on('data', (data) => {
      stdout += data.toString();
      // Show real-time output
      process.stdout.write(chalk.gray(data.toString()));
    });
    
    k6Process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    k6Process.on('close', async (code) => {
      if (code === 0) {
        try {
          // Parse K6 results
          const results = await parseK6Results(outputFile);
          resolve(results);
        } catch (error) {
          reject(new Error(`Failed to parse K6 results: ${error.message}`));
        }
      } else {
        reject(new Error(`K6 failed with exit code ${code}: ${stderr}`));
      }
    });
    
    k6Process.on('error', (error) => {
      reject(new Error(`Failed to start K6: ${error.message}`));
    });
  });
}

/**
 * Run Lighthouse web performance tests
 */
async function runLighthouseTests(templateType, env) {
  return new Promise((resolve, reject) => {
    const configFile = path.join(__dirname, '../configs/lighthouse-ci.json');
    const outputDir = path.join(__dirname, '../reports/lighthouse');
    
    const lhciProcess = spawn('lhci', [
      'autorun',
      '--config', configFile,
      '--upload.outputDir', outputDir
    ], {
      stdio: 'pipe',
      env: {
        ...process.env,
        LHCI_BUILD_CONTEXT__CURRENT_HASH: process.env.GITHUB_SHA || 'local',
        ENVIRONMENT: env
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    lhciProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(chalk.gray(data.toString()));
    });
    
    lhciProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    lhciProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const results = await parseLighthouseResults(outputDir);
          resolve(results);
        } catch (error) {
          reject(new Error(`Failed to parse Lighthouse results: ${error.message}`));
        }
      } else {
        reject(new Error(`Lighthouse CI failed with exit code ${code}: ${stderr}`));
      }
    });
    
    lhciProcess.on('error', (error) => {
      reject(new Error(`Failed to start Lighthouse CI: ${error.message}`));
    });
  });
}

/**
 * Run mobile performance tests
 */
async function runMobileTests(templateType, env) {
  // Mock mobile test implementation
  // In a real scenario, this would integrate with Detox or similar
  
  console.log(chalk.yellow('📱 Simulating mobile performance tests...'));
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate test time
  
  return {
    appLaunchTime: 1500 + Math.random() * 1000,
    memoryUsage: 100 + Math.random() * 50,
    cpuUsage: 20 + Math.random() * 30,
    batteryDrain: Math.random() * 5,
    crashRate: Math.random() * 0.01,
    networkUsage: 50 + Math.random() * 100,
    renderTime: 500 + Math.random() * 500
  };
}

/**
 * Parse K6 JSON results
 */
async function parseK6Results(outputFile) {
  try {
    if (!await fs.pathExists(outputFile)) {
      throw new Error('K6 results file not found');
    }
    
    const content = await fs.readFile(outputFile, 'utf8');
    const lines = content.trim().split('\\n').filter(line => line);
    
    const metrics = {};
    const values = {};
    
    // Parse K6 JSON output
    lines.forEach(line => {
      try {
        const data = JSON.parse(line);
        
        if (data.type === 'Metric') {
          if (!values[data.metric]) {
            values[data.metric] = [];
          }
          values[data.metric].push(data.data.value);
        }
      } catch (error) {
        // Skip invalid JSON lines
      }
    });
    
    // Calculate aggregated metrics
    Object.keys(values).forEach(metric => {
      const vals = values[metric];
      if (vals.length > 0) {
        metrics[metric] = {
          count: vals.length,
          avg: vals.reduce((sum, v) => sum + v, 0) / vals.length,
          min: Math.min(...vals),
          max: Math.max(...vals),
          p95: percentile(vals, 95),
          p99: percentile(vals, 99)
        };
      }
    });
    
    return {
      metrics,
      rawData: values,
      summary: {
        totalRequests: metrics.http_reqs?.count || 0,
        avgResponseTime: metrics.http_req_duration?.avg || 0,
        errorRate: metrics.http_req_failed?.avg || 0,
        throughput: metrics.http_reqs?.avg || 0
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to parse K6 results: ${error.message}`);
  }
}

/**
 * Parse Lighthouse results
 */
async function parseLighthouseResults(outputDir) {
  try {
    const files = await fs.readdir(outputDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('manifest'));
    
    if (jsonFiles.length === 0) {
      throw new Error('No Lighthouse result files found');
    }
    
    // Use the most recent result
    const latestFile = jsonFiles.sort().pop();
    const resultPath = path.join(outputDir, latestFile);
    const lighthouse = await fs.readJson(resultPath);
    
    return {
      lhr: lighthouse,
      summary: {
        performanceScore: lighthouse.categories?.performance?.score || 0,
        accessibilityScore: lighthouse.categories?.accessibility?.score || 0,
        firstContentfulPaint: lighthouse.audits?.['first-contentful-paint']?.numericValue || 0,
        largestContentfulPaint: lighthouse.audits?.['largest-contentful-paint']?.numericValue || 0,
        totalBlockingTime: lighthouse.audits?.['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift: lighthouse.audits?.['cumulative-layout-shift']?.numericValue || 0
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to parse Lighthouse results: ${error.message}`);
  }
}

/**
 * Calculate summary metrics from all test results
 */
function calculateSummaryMetrics(results) {
  const summary = {
    totalRequests: 0,
    avgResponseTime: 0,
    successRate: 0,
    throughput: 0,
    errors: 0,
    performanceScore: 0
  };
  
  // API metrics
  if (results.api) {
    summary.totalRequests = results.api.summary.totalRequests;
    summary.avgResponseTime = results.api.summary.avgResponseTime;
    summary.throughput = results.api.summary.throughput;
    summary.successRate = (1 - results.api.summary.errorRate) * 100;
    summary.errors = results.api.summary.totalRequests * results.api.summary.errorRate;
  }
  
  // Web metrics
  if (results.web) {
    summary.performanceScore = results.web.summary.performanceScore * 100;
  }
  
  // Mobile metrics would be added here
  
  return summary;
}

/**
 * Get API test type based on template
 */
function getAPITestType(templateType) {
  const mapping = {
    'high-performance-api': 'api',
    'real-time-collaboration': 'collaboration',
    'data-visualization': 'visualization',
    'ai-saas-platform': 'api',
    'mobile-ai-assistant-rn': 'mobile',
    'mobile-ai-assistant-flutter': 'mobile'
  };
  
  return mapping[templateType] || 'api';
}

/**
 * Calculate percentile
 */
function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}