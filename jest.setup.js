// Jest setup file for global test configuration

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Setup test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  randomString: (length = 10) => Math.random().toString(36).substring(2, 2 + length),
  randomNumber: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
};
