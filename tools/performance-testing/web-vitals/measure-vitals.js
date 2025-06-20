#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Web Vitals Measurement Tool
 * Measures Core Web Vitals and other performance metrics using Puppeteer
 */

const argv = yargs(hideBin(process.argv))
  .option('url', {
    alias: 'u',
    describe: 'URL to measure',
    type: 'string',
    default: 'http://localhost:3000'
  })
  .option('output', {
    alias: 'o',
    describe: 'Output file for results',
    type: 'string',
    default: 'web-vitals-results.json'
  })
  .option('timeout', {
    alias: 't',
    describe: 'Page load timeout in milliseconds',
    type: 'number',
    default: 30000
  })
  .option('runs', {
    alias: 'r',
    describe: 'Number of measurement runs',
    type: 'number',
    default: 3
  })
  .help()
  .argv;

async function measureWebVitals() {
  console.log(`🔍 Measuring Web Vitals for ${argv.url}...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  
  try {
    for (let run = 1; run <= argv.runs; run++) {
      console.log(`📊 Run ${run}/${argv.runs}...`);
      
      const page = await browser.newPage();
      
      // Enable performance monitoring
      await page.setCacheEnabled(false);
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Inject Web Vitals library
      await page.evaluateOnNewDocument(() => {
        // Web Vitals polyfill for measurement
        window.webVitalsData = {
          lcp: 0,
          fid: 0,
          cls: 0,
          fcp: 0,
          ttfb: 0
        };
        
        // Performance observer for LCP
        if ('PerformanceObserver' in window) {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            window.webVitalsData.lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Performance observer for FCP
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const firstEntry = entries[0];
            if (firstEntry && firstEntry.name === 'first-contentful-paint') {
              window.webVitalsData.fcp = firstEntry.startTime;
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
          
          // Performance observer for CLS
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            window.webVitalsData.cls = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
      });
      
      // Start navigation timing
      const navigationStart = Date.now();
      
      // Navigate to page
      const response = await page.goto(argv.url, {
        waitUntil: 'networkidle2',
        timeout: argv.timeout
      });
      
      const navigationEnd = Date.now();
      
      // Wait for page to settle
      await page.waitForTimeout(2000);
      
      // Get navigation timing metrics
      const navigationTiming = await page.evaluate(() => {
        const timing = performance.timing;
        const navigation = performance.getEntriesByType('navigation')[0];
        
        return {
          // Traditional timing
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          
          // Navigation API timing
          ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
          domInteractive: navigation ? navigation.domInteractive - navigation.fetchStart : 0,
          domComplete: navigation ? navigation.domComplete - navigation.fetchStart : 0,
          
          // Resource timing
          redirectTime: timing.redirectEnd - timing.redirectStart,
          dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
          connectTime: timing.connectEnd - timing.connectStart,
          requestTime: timing.responseEnd - timing.requestStart
        };
      });
      
      // Get Web Vitals data
      const webVitalsData = await page.evaluate(() => window.webVitalsData);
      
      // Calculate additional metrics
      const performanceMetrics = await page.evaluate(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const resourceEntries = performance.getEntriesByType('resource');
        
        let firstPaint = 0;
        let firstContentfulPaint = 0;
        
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            firstContentfulPaint = entry.startTime;
          }
        });
        
        // Calculate resource loading metrics
        const totalResources = resourceEntries.length;
        const totalResourceSize = resourceEntries.reduce((total, resource) => {
          return total + (resource.transferSize || 0);
        }, 0);
        
        const avgResourceTime = resourceEntries.length > 0 
          ? resourceEntries.reduce((total, resource) => total + resource.duration, 0) / resourceEntries.length
          : 0;
        
        return {
          firstPaint,
          firstContentfulPaint,
          totalResources,
          totalResourceSize,
          avgResourceTime
        };
      });
      
      // Get JavaScript heap usage
      const jsHeapSize = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });
      
      // Compile run results
      const runResult = {
        run: run,
        timestamp: new Date().toISOString(),
        url: argv.url,
        responseStatus: response.status(),
        navigationTime: navigationEnd - navigationStart,
        
        // Core Web Vitals
        lcp: webVitalsData.lcp,
        fid: 0, // FID requires real user interaction
        cls: webVitalsData.cls,
        
        // Additional Web Vitals
        fcp: webVitalsData.fcp || performanceMetrics.firstContentfulPaint,
        ttfb: navigationTiming.ttfb,
        
        // Performance timing
        timing: navigationTiming,
        
        // Resource metrics
        resources: {
          count: performanceMetrics.totalResources,
          totalSize: performanceMetrics.totalResourceSize,
          avgLoadTime: performanceMetrics.avgResourceTime
        },
        
        // Memory usage
        memory: jsHeapSize,
        
        // Scores (simplified)
        performanceScore: calculatePerformanceScore({
          lcp: webVitalsData.lcp,
          fcp: webVitalsData.fcp || performanceMetrics.firstContentfulPaint,
          cls: webVitalsData.cls,
          ttfb: navigationTiming.ttfb
        })
      };
      
      results.push(runResult);
      await page.close();
    }
    
    // Calculate aggregated results
    const aggregatedResults = aggregateResults(results);
    
    // Save results
    await fs.writeJson(argv.output, aggregatedResults, { spaces: 2 });
    
    console.log(`✅ Web Vitals measurement complete`);
    console.log(`📊 LCP: ${aggregatedResults.lcp.toFixed(2)}ms`);
    console.log(`📊 FCP: ${aggregatedResults.fcp.toFixed(2)}ms`);
    console.log(`📊 CLS: ${aggregatedResults.cls.toFixed(3)}`);
    console.log(`📊 TTFB: ${aggregatedResults.ttfb.toFixed(2)}ms`);
    console.log(`📊 Performance Score: ${aggregatedResults.performanceScore.toFixed(1)}/100`);
    
  } finally {
    await browser.close();
  }
  
  return argv.output;
}

/**
 * Calculate performance score based on Web Vitals
 */
function calculatePerformanceScore(metrics) {
  const weights = {
    lcp: 0.25,    // Largest Contentful Paint
    fcp: 0.15,    // First Contentful Paint  
    cls: 0.15,    // Cumulative Layout Shift
    ttfb: 0.10    // Time to First Byte
  };
  
  // Score each metric (0-100)
  const scores = {
    lcp: scoreMetric(metrics.lcp, [2500, 4000], false), // Lower is better
    fcp: scoreMetric(metrics.fcp, [1800, 3000], false), // Lower is better
    cls: scoreMetric(metrics.cls, [0.1, 0.25], false),  // Lower is better
    ttfb: scoreMetric(metrics.ttfb, [800, 1800], false) // Lower is better
  };
  
  // Calculate weighted score
  let totalScore = 0;
  let totalWeight = 0;
  
  Object.entries(scores).forEach(([metric, score]) => {
    if (score !== null && weights[metric]) {
      totalScore += score * weights[metric];
      totalWeight += weights[metric];
    }
  });
  
  return totalWeight > 0 ? totalScore / totalWeight * 100 : 0;
}

/**
 * Score individual metric
 */
function scoreMetric(value, thresholds, higherIsBetter = true) {
  if (value === null || value === undefined) return null;
  
  const [good, poor] = thresholds;
  
  if (higherIsBetter) {
    if (value >= good) return 1;
    if (value <= poor) return 0;
    return (value - poor) / (good - poor);
  } else {
    if (value <= good) return 1;
    if (value >= poor) return 0;
    return 1 - (value - good) / (poor - good);
  }
}

/**
 * Aggregate results from multiple runs
 */
function aggregateResults(results) {
  if (results.length === 0) return null;
  
  const aggregate = {
    runs: results.length,
    timestamp: new Date().toISOString(),
    url: results[0].url,
    
    // Core Web Vitals (median values)
    lcp: median(results.map(r => r.lcp)),
    fid: median(results.map(r => r.fid)),
    cls: median(results.map(r => r.cls)),
    fcp: median(results.map(r => r.fcp)),
    ttfb: median(results.map(r => r.ttfb)),
    
    // Performance scores
    performanceScore: average(results.map(r => r.performanceScore)),
    
    // Navigation timing (averages)
    timing: {
      domContentLoaded: average(results.map(r => r.timing.domContentLoaded)),
      loadComplete: average(results.map(r => r.timing.loadComplete)),
      domInteractive: average(results.map(r => r.timing.domInteractive)),
      domComplete: average(results.map(r => r.timing.domComplete))
    },
    
    // Resource metrics (averages)
    resources: {
      count: average(results.map(r => r.resources.count)),
      totalSize: average(results.map(r => r.resources.totalSize)),
      avgLoadTime: average(results.map(r => r.resources.avgLoadTime))
    },
    
    // Memory usage (averages, if available)
    memory: results[0].memory ? {
      usedJSHeapSize: average(results.map(r => r.memory?.usedJSHeapSize || 0)),
      totalJSHeapSize: average(results.map(r => r.memory?.totalJSHeapSize || 0))
    } : null,
    
    // Individual run results
    rawResults: results
  };
  
  return aggregate;
}

/**
 * Calculate median value
 */
function median(values) {
  const sorted = values.filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate average value
 */
function average(values) {
  const filtered = values.filter(v => v !== null && v !== undefined);
  return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
}

// Run measurement if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  measureWebVitals().catch(error => {
    console.error('❌ Web Vitals measurement failed:', error.message);
    process.exit(1);
  });
}

export { measureWebVitals };