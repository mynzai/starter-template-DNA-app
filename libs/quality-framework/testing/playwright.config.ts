import { defineConfig, devices } from '@playwright/test';

/**
 * Universal Playwright Configuration for E2E Testing
 * Supports: Web apps, mobile views, API testing
 */

export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Timeout settings
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ...(process.env.CI ? [['github']] : []),
  ],
  
  // Global test setup
  globalSetup: require.resolve('./setup/playwright-global-setup.ts'),
  globalTeardown: require.resolve('./setup/playwright-global-teardown.ts'),
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context options
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // User agent
    userAgent: 'DNA-Template-E2E-Tests',
  },

  // Test projects for different scenarios
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile emulation
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet emulation
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },

    // API testing
    {
      name: 'api',
      testDir: './e2e/api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
      },
    },

    // Performance testing
    {
      name: 'performance',
      testDir: './e2e/performance',
      use: {
        ...devices['Desktop Chrome'],
        // Enable additional Chrome flags for performance testing
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-gpu-benchmarking',
            '--enable-threaded-compositing',
          ],
        },
      },
    },

    // Accessibility testing
    {
      name: 'accessibility',
      testDir: './e2e/accessibility',
      use: { ...devices['Desktop Chrome'] },
    },

    // Visual regression testing
    {
      name: 'visual',
      testDir: './e2e/visual',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent rendering for screenshots
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
  ],

  // Test output directory
  outputDir: 'test-results/',
  
  // Web server configuration for local testing
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global test configuration
  globalTimeout: 60 * 60 * 1000, // 1 hour for entire test suite
  
  // Test metadata
  metadata: {
    executor: process.env.CI ? 'CI' : 'Local',
    environment: process.env.NODE_ENV || 'test',
    version: process.env.npm_package_version || '1.0.0',
  },
});