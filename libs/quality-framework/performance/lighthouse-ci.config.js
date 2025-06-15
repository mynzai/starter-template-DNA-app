/**
 * Lighthouse CI Configuration for Performance Monitoring
 * Provides automated performance testing for web applications
 */

module.exports = {
  ci: {
    // Lighthouse CI server configuration
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/analytics',
        'http://localhost:3000/chat',
        'http://localhost:3000/settings',
      ],
      
      // Collection settings
      numberOfRuns: 3,
      settings: {
        // Lighthouse settings
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        
        // Performance budgets
        budgets: [
          {
            resourceSizes: [
              { resourceType: 'document', budget: 18000 },
              { resourceType: 'script', budget: 300000 },
              { resourceType: 'stylesheet', budget: 75000 },
              { resourceType: 'image', budget: 200000 },
              { resourceType: 'font', budget: 100000 },
              { resourceType: 'other', budget: 100000 },
              { resourceType: 'total', budget: 800000 },
            ],
            resourceCounts: [
              { resourceType: 'document', budget: 1 },
              { resourceType: 'script', budget: 15 },
              { resourceType: 'stylesheet', budget: 8 },
              { resourceType: 'image', budget: 20 },
              { resourceType: 'font', budget: 4 },
              { resourceType: 'other', budget: 10 },
              { resourceType: 'total', budget: 100 },
            ],
            timings: [
              { metric: 'first-contentful-paint', budget: 2000 },
              { metric: 'largest-contentful-paint', budget: 2500 },
              { metric: 'cumulative-layout-shift', budget: 0.1 },
              { metric: 'total-blocking-time', budget: 300 },
              { metric: 'speed-index', budget: 3000 },
              { metric: 'interactive', budget: 3500 },
            ],
          },
        ],
        
        // Skip certain audits that may not be relevant
        skipAudits: [
          'canonical',
          'uses-http2',
          'uses-long-cache-ttl',
          'uses-text-compression',
        ],
        
        // Only run performance category for CI
        onlyCategories: ['performance'],
        
        // Throttling settings
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
    },
    
    // Assertion configuration
    assert: {
      assertions: {
        // Performance assertions
        'categories:performance': ['error', { minScore: 0.8 }],
        'audits:first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'audits:largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'audits:cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'audits:total-blocking-time': ['error', { maxNumericValue: 300 }],
        'audits:speed-index': ['error', { maxNumericValue: 3000 }],
        'audits:interactive': ['error', { maxNumericValue: 3500 }],
        
        // Resource assertions
        'audits:unused-javascript': ['warn', { maxNumericValue: 0.2 }],
        'audits:unused-css-rules': ['warn', { maxNumericValue: 0.2 }],
        'audits:render-blocking-resources': ['warn', { maxNumericValue: 100 }],
        'audits:efficient-animated-content': ['warn', { maxNumericValue: 100 }],
        'audits:uses-optimized-images': ['warn', { maxNumericValue: 100 }],
        'audits:modern-image-formats': ['warn', { maxNumericValue: 100 }],
        
        // Best practices
        'audits:dom-size': ['warn', { maxNumericValue: 1500 }],
        'audits:critical-request-chains': ['warn', { maxNumericValue: 3 }],
        'audits:uses-rel-preconnect': ['warn', { maxNumericValue: 100 }],
        'audits:font-display': ['warn', { maxNumericValue: 100 }],
      },
      
      // What to do when assertions fail
      preset: 'lighthouse:recommended',
    },
    
    // Upload configuration (for CI/CD integration)
    upload: {
      target: 'temporary-public-storage',
      // For production, configure with your preferred storage:
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: 'your-lhci-token',
    },
    
    // Server configuration (if running LHCI server)
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'sqlite',
        sqlDatabasePath: './lhci.db',
      },
    },
    
    // Wizard configuration for setup
    wizard: {
      preset: 'lighthouse:recommended',
    },
  },
  
  // Custom configuration for different environments
  environments: {
    // Development environment
    development: {
      collect: {
        numberOfRuns: 1,
        settings: {
          preset: 'desktop',
          throttling: {
            rttMs: 0,
            throughputKbps: 0,
            cpuSlowdownMultiplier: 1,
          },
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['warn', { minScore: 0.7 }],
        },
      },
    },
    
    // Staging environment
    staging: {
      collect: {
        numberOfRuns: 3,
        settings: {
          preset: 'desktop',
        },
      },
    },
    
    // Production environment
    production: {
      collect: {
        numberOfRuns: 5,
        settings: {
          preset: 'desktop',
          throttling: {
            rttMs: 150,
            throughputKbps: 1600,
            cpuSlowdownMultiplier: 4,
          },
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: 0.9 }],
          'audits:first-contentful-paint': ['error', { maxNumericValue: 1500 }],
          'audits:largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        },
      },
    },
  },
};