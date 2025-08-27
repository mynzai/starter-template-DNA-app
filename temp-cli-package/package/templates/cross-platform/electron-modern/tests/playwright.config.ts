import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Electron testing
 * Replaces deprecated Spectron with modern testing approach
 */
export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/e2e/**/*.ts'
  ],
  
  // Global test timeout
  timeout: 30000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000
  },
  
  // Fail fast on CI
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  
  // Output directory
  outputDir: 'test-results',
  
  // Global setup and teardown
  globalSetup: require.resolve('./setup/global-setup.ts'),
  globalTeardown: require.resolve('./setup/global-teardown.ts'),
  
  // Use projects for different test types
  projects: [
    {
      name: 'electron-main',
      testDir: './tests/main',
      use: {
        // Electron-specific configuration
        ...devices['Desktop Chrome'],
        contextOptions: {
          ignoreHTTPSErrors: true,
        }
      }
    },
    {
      name: 'electron-renderer',
      testDir: './tests/renderer',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          ignoreHTTPSErrors: true,
        }
      }
    },
    {
      name: 'electron-e2e',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        // Electron app configuration
        launchOptions: {
          executablePath: getElectronPath(),
          args: [
            path.join(__dirname, '../dist/main/main.js'),
            '--test-mode'
          ]
        },
        contextOptions: {
          ignoreHTTPSErrors: true,
          recordVideo: {
            mode: 'retain-on-failure',
            size: { width: 1280, height: 720 }
          },
          recordHar: {
            mode: 'retain-on-failure',
            path: 'test-results/har'
          }
        }
      }
    },
    {
      name: 'electron-performance',
      testDir: './tests/performance',
      timeout: 60000,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: getElectronPath(),
          args: [
            path.join(__dirname, '../dist/main/main.js'),
            '--test-mode',
            '--performance-mode'
          ]
        }
      }
    },
    {
      name: 'electron-security',
      testDir: './tests/security',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: getElectronPath(),
          args: [
            path.join(__dirname, '../dist/main/main.js'),
            '--test-mode',
            '--security-audit'
          ]
        }
      }
    }
  ],
  
  // Web server for renderer tests
  webServer: {
    command: 'npm run dev:renderer',
    port: 9080,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
  
  // Test execution options
  use: {
    // Base URL for renderer tests
    baseURL: 'http://localhost:9080',
    
    // Trace collection
    trace: 'retain-on-failure',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 15000
  }
});

/**
 * Get Electron executable path based on platform
 */
function getElectronPath(): string {
  const electronPath = require('electron');
  
  if (typeof electronPath === 'string') {
    return electronPath;
  }
  
  // Fallback for different electron installations
  switch (process.platform) {
    case 'darwin':
      return path.join(__dirname, '../node_modules/.bin/electron');
    case 'win32':
      return path.join(__dirname, '../node_modules/.bin/electron.cmd');
    default:
      return path.join(__dirname, '../node_modules/.bin/electron');
  }
}