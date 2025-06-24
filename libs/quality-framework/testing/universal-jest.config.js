/**
 * Universal Jest Configuration for All Template Types
 * Supports: React, React Native, Next.js, Node.js, TypeScript
 */

const path = require('path');

module.exports = {
  // Test environment detection based on project type
  testEnvironment: process.env.TEST_ENV || 'node',
  
  // Setup files for different environments
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/libs/quality-framework/testing/setup/universal-setup.js'
  ],

  // Module name mapping for different frameworks
  moduleNameMapping: {
    // Common aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    
    // React Native specific
    '^react-native$': 'react-native-web',
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    
    // CSS and assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/libs/quality-framework/testing/mocks/fileMock.js',
  },

  // File extensions to process
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/**/?(*.)(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '/.next/',
    '/android/',
    '/ios/',
    '/e2e/',
  ],

  // Transform patterns
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },

  // Modules to transform (don't ignore these in node_modules)
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|react-navigation-.*)/)',
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx,js,jsx}',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
    '!src/**/*.config.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],

  // Coverage thresholds (can be overridden per project)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'json', 'html', 'clover'],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Test timeout
  testTimeout: 30000,

  // Globals for different environments
  globals: {
    __DEV__: true,
    __TEST__: true,
  },

  // Environment variables
  setupFiles: [
    '<rootDir>/libs/quality-framework/testing/setup/env-setup.js',
  ],

  // Custom test runners for different scenarios
  projects: [
    // Unit tests
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)'],
      testEnvironment: 'jsdom',
    },
    
    // Integration tests
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.(test|spec).(ts|tsx|js|jsx)'],
      testEnvironment: 'node',
      testTimeout: 60000,
    },
    
    // Component tests (React/React Native)
    {
      displayName: 'components',
      testMatch: ['<rootDir>/src/components/**/*.(test|spec).(ts|tsx|js|jsx)'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/libs/quality-framework/testing/setup/react-setup.js'
      ],
    },
  ],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
    ['jest-html-reporters', {
      publicPath: 'coverage',
      filename: 'report.html',
      expand: true,
    }],
  ],

  // Verbose output
  verbose: process.env.CI === 'true',

  // Snapshot serializers
  snapshotSerializers: [
    'enzyme-to-json/serializer',
  ],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,
  
  // Performance optimization
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};