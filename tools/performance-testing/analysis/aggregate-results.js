#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance Results Aggregator
 * Combines results from various performance testing tools into a unified format
 */

const argv = yargs(hideBin(process.argv))
  .option('input-dir', {
    alias: 'i',
    describe: 'Directory containing performance result files',
    type: 'string',
    demandOption: true
  })
  .option('output', {
    alias: 'o',
    describe: 'Output file for aggregated results',
    type: 'string',
    default: 'aggregated-results.json'
  })
  .option('template-type', {
    alias: 't',
    describe: 'Template type being tested',
    type: 'string',
    demandOption: true
  })
  .help()
  .argv;

async function aggregateResults() {
  console.log('🔍 Aggregating performance results...');
  
  const inputDir = path.resolve(argv.inputDir);
  const outputFile = path.resolve(argv.output);
  
  if (!await fs.pathExists(inputDir)) {
    throw new Error(`Input directory does not exist: ${inputDir}`);
  }
  
  // Find all result files
  const resultFiles = await glob('**/*-results.json', {
    cwd: inputDir,
    absolute: true
  });
  
  console.log(`📊 Found ${resultFiles.length} result files`);
  
  const aggregatedResults = {
    templateType: argv.templateType,
    timestamp: new Date().toISOString(),
    testSession: {
      commit: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      environment: process.env.GITHUB_ACTIONS ? 'ci' : 'local'
    },
    metrics: {},
    rawResults: {}
  };
  
  // Process each result file
  for (const resultFile of resultFiles) {
    try {
      const fileName = path.basename(resultFile, '.json');
      const resultData = await fs.readJson(resultFile);
      
      console.log(`📄 Processing ${fileName}...`);
      
      // Store raw results
      aggregatedResults.rawResults[fileName] = resultData;
      
      // Extract and normalize metrics based on tool type
      if (fileName.includes('k6-results')) {
        aggregatedResults.metrics.api = extractK6Metrics(resultData);
      } else if (fileName.includes('artillery-results')) {
        aggregatedResults.metrics.artillery = extractArtilleryMetrics(resultData);
      } else if (fileName.includes('autocannon-results')) {
        aggregatedResults.metrics.autocannon = extractAutocannonMetrics(resultData);
      } else if (fileName.includes('web-vitals-results')) {
        aggregatedResults.metrics.webVitals = extractWebVitalsMetrics(resultData);
      } else if (fileName.includes('flutter-perf-results')) {
        aggregatedResults.metrics.flutter = extractFlutterMetrics(resultData);
      } else if (fileName.includes('rn-perf-results')) {
        aggregatedResults.metrics.reactNative = extractReactNativeMetrics(resultData);
      } else if (fileName.includes('system-perf-results')) {
        aggregatedResults.metrics.system = extractSystemMetrics(resultData);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${resultFile}:`, error.message);
    }
  }
  
  // Process Lighthouse results separately
  const lighthouseDir = path.join(inputDir, '.lighthouseci');
  if (await fs.pathExists(lighthouseDir)) {
    console.log('📄 Processing Lighthouse results...');
    aggregatedResults.metrics.lighthouse = await extractLighthouseMetrics(lighthouseDir);
  }
  
  // Calculate derived metrics
  aggregatedResults.metrics.derived = calculateDerivedMetrics(aggregatedResults.metrics);
  
  // Write aggregated results
  await fs.writeJson(outputFile, aggregatedResults, { spaces: 2 });
  
  console.log(`✅ Aggregated results written to ${outputFile}`);
  console.log(`📊 Total metrics categories: ${Object.keys(aggregatedResults.metrics).length}`);
  
  return aggregatedResults;
}

/**
 * Extract metrics from K6 load test results
 */
function extractK6Metrics(k6Data) {
  const metrics = k6Data.metrics || {};
  
  return {
    responseTime: {
      avg: metrics.http_req_duration?.avg || 0,
      min: metrics.http_req_duration?.min || 0,
      max: metrics.http_req_duration?.max || 0,
      p90: metrics.http_req_duration?.p90 || 0,
      p95: metrics.http_req_duration?.p95 || 0,
      p99: metrics.http_req_duration?.p99 || 0
    },
    throughput: {
      rps: metrics.http_reqs?.rate || 0,
      totalRequests: metrics.http_reqs?.count || 0
    },
    errorRate: {
      percentage: (metrics.http_req_failed?.rate || 0) * 100,
      count: metrics.http_req_failed?.count || 0
    },
    connectivity: {
      connecting: metrics.http_req_connecting?.avg || 0,
      sending: metrics.http_req_sending?.avg || 0,
      receiving: metrics.http_req_receiving?.avg || 0,
      waiting: metrics.http_req_waiting?.avg || 0
    }
  };
}

/**
 * Extract metrics from Artillery stress test results
 */
function extractArtilleryMetrics(artilleryData) {
  const summary = artilleryData.aggregate || {};
  
  return {
    responseTime: {
      min: summary.latency?.min || 0,
      max: summary.latency?.max || 0,
      median: summary.latency?.median || 0,
      p95: summary.latency?.p95 || 0,
      p99: summary.latency?.p99 || 0
    },
    throughput: {
      rps: summary.rps?.mean || 0,
      totalRequests: summary.counters?.['http.requests'] || 0
    },
    errorRate: {
      count: summary.counters?.['http.request_rate'] || 0,
      codes: summary.codes || {}
    }
  };
}

/**
 * Extract metrics from Autocannon rapid test results
 */
function extractAutocannonMetrics(autocannonData) {
  return {
    responseTime: {
      avg: autocannonData.latency?.average || 0,
      min: autocannonData.latency?.min || 0,
      max: autocannonData.latency?.max || 0,
      p99: autocannonData.latency?.p99 || 0
    },
    throughput: {
      rps: autocannonData.requests?.average || 0,
      totalRequests: autocannonData.requests?.total || 0
    },
    errorRate: {
      count: autocannonData.errors || 0,
      rate: autocannonData.non2xx || 0
    },
    bytes: {
      read: autocannonData.throughput?.average || 0,
      total: autocannonData.throughput?.total || 0
    }
  };
}

/**
 * Extract Web Vitals metrics
 */
function extractWebVitalsMetrics(webVitalsData) {
  return {
    coreWebVitals: {
      lcp: webVitalsData.lcp || 0, // Largest Contentful Paint
      fid: webVitalsData.fid || 0, // First Input Delay
      cls: webVitalsData.cls || 0  // Cumulative Layout Shift
    },
    additionalMetrics: {
      fcp: webVitalsData.fcp || 0, // First Contentful Paint
      ttfb: webVitalsData.ttfb || 0, // Time to First Byte
      si: webVitalsData.si || 0,   // Speed Index
      tbt: webVitalsData.tbt || 0  // Total Blocking Time
    },
    scores: {
      performance: webVitalsData.performanceScore || 0,
      accessibility: webVitalsData.accessibilityScore || 0,
      seo: webVitalsData.seoScore || 0
    }
  };
}

/**
 * Extract Flutter performance metrics
 */
function extractFlutterMetrics(flutterData) {
  return {
    rendering: {
      fps: flutterData.fps || 0,
      frameTime: flutterData.averageFrameTime || 0,
      missedFrames: flutterData.missedFrames || 0
    },
    memory: {
      heapUsage: flutterData.heapUsage || 0,
      maxHeap: flutterData.maxHeap || 0,
      garbageCollections: flutterData.gcCount || 0
    },
    startup: {
      appStartTime: flutterData.appStartTime || 0,
      firstFrameTime: flutterData.firstFrameTime || 0
    }
  };
}

/**
 * Extract React Native performance metrics
 */
function extractReactNativeMetrics(rnData) {
  return {
    javascript: {
      bundleSize: rnData.bundleSize || 0,
      initTime: rnData.jsInitTime || 0,
      bridgeCalls: rnData.bridgeCalls || 0
    },
    native: {
      memoryUsage: rnData.memoryUsage || 0,
      cpuUsage: rnData.cpuUsage || 0
    },
    performance: {
      navigationTime: rnData.navigationTime || 0,
      renderTime: rnData.renderTime || 0,
      responseTime: rnData.responseTime || 0
    }
  };
}

/**
 * Extract system performance metrics
 */
function extractSystemMetrics(systemData) {
  return {
    cpu: {
      usage: systemData.cpuUsage || 0,
      loadAverage: systemData.loadAverage || []
    },
    memory: {
      usage: systemData.memoryUsage || 0,
      available: systemData.availableMemory || 0,
      total: systemData.totalMemory || 0
    },
    disk: {
      usage: systemData.diskUsage || 0,
      readOps: systemData.diskReadOps || 0,
      writeOps: systemData.diskWriteOps || 0
    },
    network: {
      bytesIn: systemData.networkBytesIn || 0,
      bytesOut: systemData.networkBytesOut || 0,
      packetsIn: systemData.networkPacketsIn || 0,
      packetsOut: systemData.networkPacketsOut || 0
    }
  };
}

/**
 * Extract Lighthouse metrics from CI results
 */
async function extractLighthouseMetrics(lighthouseDir) {
  try {
    const manifestPath = path.join(lighthouseDir, 'manifest.json');
    if (!await fs.pathExists(manifestPath)) {
      return null;
    }
    
    const manifest = await fs.readJson(manifestPath);
    const reports = manifest.map(entry => entry.jsonPath);
    
    if (reports.length === 0) {
      return null;
    }
    
    // Use the first report (or aggregate if multiple)
    const reportPath = path.join(lighthouseDir, reports[0]);
    const report = await fs.readJson(reportPath);
    
    const audits = report.audits || {};
    const categories = report.categories || {};
    
    return {
      scores: {
        performance: (categories.performance?.score || 0) * 100,
        accessibility: (categories.accessibility?.score || 0) * 100,
        bestPractices: (categories['best-practices']?.score || 0) * 100,
        seo: (categories.seo?.score || 0) * 100,
        pwa: (categories.pwa?.score || 0) * 100
      },
      metrics: {
        fcp: audits['first-contentful-paint']?.numericValue || 0,
        lcp: audits['largest-contentful-paint']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0,
        tbt: audits['total-blocking-time']?.numericValue || 0,
        si: audits['speed-index']?.numericValue || 0,
        fmp: audits['first-meaningful-paint']?.numericValue || 0
      },
      opportunities: Object.entries(audits)
        .filter(([key, audit]) => audit.scoreDisplayMode === 'numeric' && audit.score < 0.9)
        .map(([key, audit]) => ({
          id: key,
          title: audit.title,
          score: audit.score,
          savings: audit.details?.overallSavingsMs || 0
        }))
    };
  } catch (error) {
    console.error('Error processing Lighthouse results:', error.message);
    return null;
  }
}

/**
 * Calculate derived metrics from all collected data
 */
function calculateDerivedMetrics(metrics) {
  const derived = {};
  
  // Performance Score (0-100)
  let performanceFactors = [];
  
  if (metrics.api) {
    // API performance score based on response time and error rate
    const responseScore = Math.max(0, 100 - (metrics.api.responseTime.avg / 10));
    const errorScore = Math.max(0, 100 - (metrics.api.errorRate.percentage * 10));
    performanceFactors.push((responseScore + errorScore) / 2);
  }
  
  if (metrics.lighthouse) {
    performanceFactors.push(metrics.lighthouse.scores.performance);
  }
  
  if (metrics.webVitals) {
    // Web Vitals score based on Core Web Vitals
    const lcpScore = metrics.webVitals.coreWebVitals.lcp < 2500 ? 100 : 
                     metrics.webVitals.coreWebVitals.lcp < 4000 ? 50 : 0;
    const fidScore = metrics.webVitals.coreWebVitals.fid < 100 ? 100 :
                     metrics.webVitals.coreWebVitals.fid < 300 ? 50 : 0;
    const clsScore = metrics.webVitals.coreWebVitals.cls < 0.1 ? 100 :
                     metrics.webVitals.coreWebVitals.cls < 0.25 ? 50 : 0;
    
    performanceFactors.push((lcpScore + fidScore + clsScore) / 3);
  }
  
  if (performanceFactors.length > 0) {
    derived.overallPerformanceScore = performanceFactors.reduce((a, b) => a + b, 0) / performanceFactors.length;
  }
  
  // Resource Efficiency Score
  if (metrics.system) {
    const cpuScore = Math.max(0, 100 - metrics.system.cpu.usage);
    const memoryScore = Math.max(0, 100 - metrics.system.memory.usage);
    derived.resourceEfficiencyScore = (cpuScore + memoryScore) / 2;
  }
  
  // Reliability Score
  if (metrics.api) {
    derived.reliabilityScore = Math.max(0, 100 - metrics.api.errorRate.percentage);
  }
  
  return derived;
}

// Run aggregation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregateResults().catch(error => {
    console.error('❌ Aggregation failed:', error.message);
    process.exit(1);
  });
}

export { aggregateResults };