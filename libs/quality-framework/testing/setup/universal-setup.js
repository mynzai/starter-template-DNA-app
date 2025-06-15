/**
 * Universal Test Setup for All Template Types
 * Configures common testing utilities and global mocks
 */

// Polyfills for testing environment
require('whatwg-fetch');

// Global test utilities
global.waitFor = (condition, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

// Global test helpers
global.createMockFunction = (returnValue) => {
  return jest.fn(() => returnValue);
};

global.createAsyncMockFunction = (returnValue, delay = 0) => {
  return jest.fn(() => 
    new Promise(resolve => setTimeout(() => resolve(returnValue), delay))
  );
};

// Performance monitoring in tests
global.measurePerformance = (fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return {
    result,
    duration: end - start,
  };
};

// Global error handling
global.suppressConsoleError = () => {
  const originalError = console.error;
  console.error = jest.fn();
  return () => {
    console.error = originalError;
  };
};

// Memory leak detection
global.checkMemoryLeak = () => {
  const memBefore = process.memoryUsage();
  return () => {
    const memAfter = process.memoryUsage();
    const leak = {
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal,
      external: memAfter.external - memBefore.external,
    };
    
    // Warn if significant memory increase (>50MB)
    if (leak.heapUsed > 50 * 1024 * 1024) {
      console.warn('Potential memory leak detected:', leak);
    }
    
    return leak;
  };
};

// Common mocks that apply to all projects
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
}));

// Environment detection
const isReactNative = () => {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
};

const isNext = () => {
  return typeof window !== 'undefined' && window.next;
};

const isNode = () => {
  return typeof process !== 'undefined' && process.versions && process.versions.node;
};

// Environment-specific setup
if (isReactNative()) {
  require('./react-native-setup');
} else if (isNext()) {
  require('./nextjs-setup');
} else if (isNode()) {
  require('./node-setup');
}

// Global cleanup
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset modules
  jest.resetModules();
});

// Global error logging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Performance budget warnings
const performanceBudget = {
  testDuration: 5000, // 5 seconds max per test
  memoryUsage: 100 * 1024 * 1024, // 100MB max
};

let testStartTime;
let testStartMemory;

beforeEach(() => {
  testStartTime = Date.now();
  testStartMemory = process.memoryUsage().heapUsed;
});

afterEach(() => {
  const testDuration = Date.now() - testStartTime;
  const memoryUsed = process.memoryUsage().heapUsed - testStartMemory;
  
  if (testDuration > performanceBudget.testDuration) {
    console.warn(`Test exceeded duration budget: ${testDuration}ms > ${performanceBudget.testDuration}ms`);
  }
  
  if (memoryUsed > performanceBudget.memoryUsage) {
    console.warn(`Test exceeded memory budget: ${memoryUsed} bytes > ${performanceBudget.memoryUsage} bytes`);
  }
});

console.log('Universal test setup completed');