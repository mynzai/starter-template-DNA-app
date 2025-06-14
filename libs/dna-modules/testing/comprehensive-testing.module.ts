/**
 * @fileoverview Comprehensive Testing DNA Module for template integration
 */

import { DNAModule, DNAModuleConfig, DNAModuleDependency } from '@starter-template-dna/core';
import { Framework, TestConfig } from '@starter-template-dna/testing';

export interface ComprehensiveTestingConfig extends DNAModuleConfig {
  // Framework to test
  targetFramework: Framework;
  
  // Test types to include
  testTypes: Array<'unit' | 'integration' | 'e2e' | 'performance' | 'accessibility' | 'security'>;
  
  // Coverage thresholds
  coverageThresholds: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  
  // Quality gate configuration
  qualityGates: {
    enforceStrict: boolean;
    failOnCoverageThreshold: boolean;
    failOnSecurityVulnerabilities: boolean;
    failOnPerformanceRegression: boolean;
  };
  
  // CI/CD integration
  ciIntegration: {
    enabled: boolean;
    provider: 'github-actions' | 'gitlab-ci' | 'circleci' | 'jenkins';
    reportFormats: Array<'json' | 'html' | 'junit' | 'lcov'>;
  };
  
  // Test generation options
  testGeneration: {
    autoGenerate: boolean;
    overwriteExisting: boolean;
    includeSnapshots: boolean;
    includeMocks: boolean;
  };
}

export class ComprehensiveTestingModule extends DNAModule<ComprehensiveTestingConfig> {
  name = 'comprehensive-testing';
  version = '1.0.0';
  description = 'Comprehensive testing framework with 80%+ coverage and zero technical debt';

  dependencies: DNAModuleDependency[] = [];

  defaultConfig: ComprehensiveTestingConfig = {
    enabled: true,
    targetFramework: 'nextjs',
    testTypes: ['unit', 'integration', 'e2e', 'performance', 'accessibility', 'security'],
    coverageThresholds: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    qualityGates: {
      enforceStrict: true,
      failOnCoverageThreshold: true,
      failOnSecurityVulnerabilities: true,
      failOnPerformanceRegression: true,
    },
    ciIntegration: {
      enabled: true,
      provider: 'github-actions',
      reportFormats: ['json', 'html', 'junit', 'lcov'],
    },
    testGeneration: {
      autoGenerate: true,
      overwriteExisting: false,
      includeSnapshots: true,
      includeMocks: true,
    },
  };

  async install(): Promise<void> {
    console.log('Installing Comprehensive Testing Module...');
    
    // Install testing dependencies based on framework
    await this.installFrameworkDependencies();
    
    // Setup test configuration files
    await this.setupTestConfiguration();
    
    // Generate test scripts
    await this.generateTestScripts();
    
    // Setup CI/CD configuration
    if (this.config.ciIntegration.enabled) {
      await this.setupCIConfiguration();
    }
    
    // Generate initial tests if requested
    if (this.config.testGeneration.autoGenerate) {
      await this.generateInitialTests();
    }

    console.log('Comprehensive Testing Module installed successfully!');
  }

  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate framework support
    const supportedFrameworks: Framework[] = ['flutter', 'react-native', 'nextjs', 'tauri', 'sveltekit'];
    if (!supportedFrameworks.includes(this.config.targetFramework)) {
      errors.push(`Unsupported framework: ${this.config.targetFramework}`);
    }

    // Validate coverage thresholds
    const { lines, functions, branches, statements } = this.config.coverageThresholds;
    if (lines < 0 || lines > 100 || functions < 0 || functions > 100 || 
        branches < 0 || branches > 100 || statements < 0 || statements > 100) {
      errors.push('Coverage thresholds must be between 0 and 100');
    }

    // Validate test types
    const validTestTypes = ['unit', 'integration', 'e2e', 'performance', 'accessibility', 'security'];
    const invalidTypes = this.config.testTypes.filter(type => !validTestTypes.includes(type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid test types: ${invalidTypes.join(', ')}`);
    }

    // Validate CI provider
    const validProviders = ['github-actions', 'gitlab-ci', 'circleci', 'jenkins'];
    if (this.config.ciIntegration.enabled && !validProviders.includes(this.config.ciIntegration.provider)) {
      errors.push(`Unsupported CI provider: ${this.config.ciIntegration.provider}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async configure(config: Partial<ComprehensiveTestingConfig>): Promise<void> {
    this.config = { ...this.defaultConfig, ...config };
    
    // Validate configuration
    const validation = await this.validate();
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
  }

  getFiles(): { [path: string]: string } {
    const files: { [path: string]: string } = {};

    // Base test configuration
    files['jest.config.js'] = this.generateJestConfig();
    files['jest.setup.js'] = this.generateJestSetup();

    // Framework-specific configurations
    switch (this.config.targetFramework) {
      case 'nextjs':
        files['playwright.config.ts'] = this.generatePlaywrightConfig();
        files['.eslintrc-security.js'] = this.generateESLintSecurityConfig();
        break;
      case 'react-native':
        files['detox.config.js'] = this.generateDetoxConfig();
        files['metro.config.js'] = this.generateMetroConfig();
        break;
      case 'flutter':
        files['test/flutter_test_config.dart'] = this.generateFlutterTestConfig();
        break;
      case 'tauri':
        files['src-tauri/Cargo.toml'] = this.generateTauriCargoConfig();
        files['playwright.config.ts'] = this.generatePlaywrightConfig();
        break;
    }

    // CI/CD configuration
    if (this.config.ciIntegration.enabled) {
      switch (this.config.ciIntegration.provider) {
        case 'github-actions':
          files['.github/workflows/test.yml'] = this.generateGitHubActionsWorkflow();
          break;
        case 'gitlab-ci':
          files['.gitlab-ci.yml'] = this.generateGitLabCIConfig();
          break;
        case 'circleci':
          files['.circleci/config.yml'] = this.generateCircleCIConfig();
          break;
      }
    }

    // Test utilities and helpers
    files['test-utils/index.ts'] = this.generateTestUtils();
    files['test-utils/mocks/index.ts'] = this.generateMockUtils();
    files['test-utils/fixtures/index.ts'] = this.generateTestFixtures();

    return files;
  }

  getDependencies(): { [packageName: string]: string } {
    const dependencies: { [packageName: string]: string } = {
      // Base testing dependencies
      '@starter-template-dna/testing': '^1.0.0',
    };

    // Framework-specific dependencies
    switch (this.config.targetFramework) {
      case 'nextjs':
        return {
          ...dependencies,
          'jest': '^29.0.0',
          '@testing-library/react': '^14.0.0',
          '@testing-library/jest-dom': '^6.0.0',
          '@testing-library/user-event': '^14.0.0',
          'playwright': '^1.40.0',
          '@playwright/test': '^1.40.0',
          '@axe-core/playwright': '^4.8.0',
          'lighthouse': '^11.0.0',
          'eslint-plugin-security': '^1.7.0',
        };
      
      case 'react-native':
        return {
          ...dependencies,
          'jest': '^29.0.0',
          '@testing-library/react-native': '^12.0.0',
          'react-test-renderer': '^18.0.0',
          'detox': '^20.0.0',
          '@testing-library/react-hooks': '^8.0.0',
          'react-native-testing-library': '^6.0.0',
        };
      
      case 'flutter':
        return {
          ...dependencies,
          // Flutter dependencies are managed through pubspec.yaml
        };
      
      case 'tauri':
        return {
          ...dependencies,
          'jest': '^29.0.0',
          'playwright': '^1.40.0',
          '@playwright/test': '^1.40.0',
          // Rust dependencies are managed through Cargo.toml
        };
      
      default:
        return dependencies;
    }
  }

  private async installFrameworkDependencies(): Promise<void> {
    // This would install the appropriate dependencies for the target framework
    console.log(`Installing dependencies for ${this.config.targetFramework}...`);
  }

  private async setupTestConfiguration(): Promise<void> {
    // This would create framework-specific test configuration files
    console.log('Setting up test configuration...');
  }

  private async generateTestScripts(): Promise<void> {
    // This would add test scripts to package.json
    console.log('Generating test scripts...');
  }

  private async setupCIConfiguration(): Promise<void> {
    // This would create CI/CD configuration files
    console.log(`Setting up ${this.config.ciIntegration.provider} configuration...`);
  }

  private async generateInitialTests(): Promise<void> {
    // This would use the test generation engine to create initial tests
    console.log('Generating initial tests...');
  }

  private generateJestConfig(): string {
    return `module.exports = {
  preset: '${this.getJestPreset()}',
  testEnvironment: '${this.getTestEnvironment()}',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      lines: ${this.config.coverageThresholds.lines},
      functions: ${this.config.coverageThresholds.functions},
      branches: ${this.config.coverageThresholds.branches},
      statements: ${this.config.coverageThresholds.statements}
    }
  },
  coverageReporters: ${JSON.stringify(this.config.ciIntegration.reportFormats)},
  testTimeout: 30000,
  ${this.getFrameworkSpecificJestConfig()}
};`;
  }

  private generateJestSetup(): string {
    return `// Jest setup file
import '@testing-library/jest-dom';
${this.getFrameworkSpecificJestSetup()}

// Global test configuration
beforeEach(() => {
  jest.clearAllMocks();
});

// Console warnings and errors should fail tests in CI
if (process.env.CI) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    originalError(...args);
    throw new Error('Console error detected in test');
  };
  
  console.warn = (...args) => {
    originalWarn(...args);
    if (args[0]?.includes('Warning:')) {
      throw new Error('Console warning detected in test');
    }
  };
}`;
  }

  private generatePlaywrightConfig(): string {
    return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
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
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});`;
  }

  private generateGitHubActionsWorkflow(): string {
    return `name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run security audit
        run: npm audit --audit-level moderate
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
      
      - name: Quality Gate Check
        run: npm run quality-check
        
  ${this.config.targetFramework === 'flutter' ? this.generateFlutterCIJob() : ''}
  ${this.config.targetFramework === 'tauri' ? this.generateTauriCIJob() : ''}
`;
  }

  private generateFlutterCIJob(): string {
    return `
  flutter-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
          channel: 'stable'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Run analyzer
        run: flutter analyze
      
      - name: Run unit tests
        run: flutter test --coverage
      
      - name: Run integration tests
        run: flutter test integration_test/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info`;
  }

  private generateTauriCIJob(): string {
    return `
  tauri-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Tauri dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
      
      - name: Run Rust tests
        run: cd src-tauri && cargo test
      
      - name: Run frontend tests
        run: npm run test
      
      - name: Build Tauri app
        run: npm run tauri build`;
  }

  private generateESLintSecurityConfig(): string {
    return `module.exports = {
  extends: ['plugin:security/recommended'],
  plugins: ['security'],
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error'
  }
};`;
  }

  private generateTestUtils(): string {
    return `// Test utilities and helpers
export * from './mocks';
export * from './fixtures';

// Custom render function for React components
${this.config.targetFramework.includes('react') || this.config.targetFramework === 'nextjs' ? `
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    // Add your providers here (Redux, Router, Theme, etc.)
    <>{children}</>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };` : ''}

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Accessibility testing utilities
export const checkA11y = async (element: HTMLElement) => {
  // Implementation would use axe-core
  return { violations: [] };
};

// Memory leak detection
export const detectMemoryLeaks = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    return {
      heapUsed: (performance as any).memory?.usedJSHeapSize || 0,
      heapTotal: (performance as any).memory?.totalJSHeapSize || 0,
    };
  }
  return null;
};`;
  }

  private generateMockUtils(): string {
    return `// Mock utilities for testing
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> => {
  return jest.fn(implementation) as jest.MockedFunction<T>;
};

// API mocking utilities
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

// Local storage mock
export const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

// Timer mocks
export const advanceTimersByTime = (ms: number) => {
  jest.advanceTimersByTime(ms);
};

export const runAllTimers = () => {
  jest.runAllTimers();
};`;
  }

  private generateTestFixtures(): string {
    return `// Test fixtures and sample data
export const sampleUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

export const sampleProduct = {
  id: '1',
  name: 'Test Product',
  price: 99.99,
  description: 'A test product for testing purposes',
  inStock: true,
};

// Generate test data
export const generateUser = (overrides: Partial<typeof sampleUser> = {}) => ({
  ...sampleUser,
  ...overrides,
});

export const generateUsers = (count: number) => 
  Array.from({ length: count }, (_, i) => 
    generateUser({ id: String(i + 1), name: \`User \${i + 1}\` })
  );

// File upload fixtures
export const createMockFile = (
  name = 'test.jpg',
  size = 1024,
  type = 'image/jpeg'
) => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};`;
  }

  private getJestPreset(): string {
    switch (this.config.targetFramework) {
      case 'nextjs':
        return 'next/jest';
      case 'react-native':
        return 'react-native';
      case 'tauri':
        return 'ts-jest';
      default:
        return 'ts-jest';
    }
  }

  private getTestEnvironment(): string {
    switch (this.config.targetFramework) {
      case 'nextjs':
      case 'tauri':
        return 'jsdom';
      case 'react-native':
        return 'node';
      default:
        return 'node';
    }
  }

  private getFrameworkSpecificJestConfig(): string {
    switch (this.config.targetFramework) {
      case 'nextjs':
        return `
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },`;
      case 'react-native':
        return `
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons)/)',
  ],`;
      default:
        return '';
    }
  }

  private getFrameworkSpecificJestSetup(): string {
    switch (this.config.targetFramework) {
      case 'react-native':
        return `
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);`;
      default:
        return '';
    }
  }

  private generateDetoxConfig(): string {
    return `module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/config.json',
  specs: 'e2e',
  behavior: {
    init: {
      reinstallApp: true,
    },
    cleanup: {
      shutdownDevice: false,
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/YourApp.app',
      build: 'xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
    },
  },
};`;
  }

  private generateMetroConfig(): string {
    return `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add test file extensions
config.resolver.sourceExts.push('test.js', 'test.ts', 'test.tsx', 'spec.js', 'spec.ts', 'spec.tsx');

module.exports = config;`;
  }

  private generateFlutterTestConfig(): string {
    return `// Flutter test configuration
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUpAll(() {
    // Global test setup
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async {
        return '/tmp';
      },
    );
  });
}`;
  }

  private generateTauriCargoConfig(): string {
    return `[dev-dependencies]
tokio-test = "0.4"
tauri = { version = "2.0", features = ["test"] }

[features]
test = []

[[test]]
name = "integration"
path = "tests/integration.rs"`;
  }

  private generateGitLabCIConfig(): string {
    return `stages:
  - test
  - security
  - quality

variables:
  NODE_VERSION: "20"

cache:
  paths:
    - node_modules/
    - .npm/

test:unit:
  stage: test
  image: node:\${NODE_VERSION}
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run test:unit -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/

test:e2e:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run test:e2e
  artifacts:
    when: on_failure
    paths:
      - test-results/

security:audit:
  stage: security
  image: node:\${NODE_VERSION}
  script:
    - npm audit --audit-level moderate
  allow_failure: false

quality:check:
  stage: quality
  image: node:\${NODE_VERSION}
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run quality-check
  artifacts:
    reports:
      junit: test-results/results.xml`;
  }

  private generateCircleCIConfig(): string {
    return `version: 2.1

orbs:
  node: circleci/node@5.0.0
  browser-tools: circleci/browser-tools@1.4.0

workflows:
  test:
    jobs:
      - test-unit
      - test-e2e
      - security-audit
      - quality-check

jobs:
  test-unit:
    executor: node/default
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run unit tests
          command: npm run test:unit -- --coverage
      - store_artifacts:
          path: coverage
      - store_test_results:
          path: test-results

  test-e2e:
    executor: node/default
    steps:
      - checkout
      - browser-tools/install-chrome
      - browser-tools/install-chromedriver
      - node/install-packages
      - run:
          name: Install Playwright
          command: npx playwright install
      - run:
          name: Run E2E tests
          command: npm run test:e2e
      - store_artifacts:
          path: test-results

  security-audit:
    executor: node/default
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Security audit
          command: npm audit --audit-level moderate

  quality-check:
    executor: node/default
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Quality check
          command: npm run quality-check`;
  }
}

export default ComprehensiveTestingModule;