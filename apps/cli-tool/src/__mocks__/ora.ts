/**
 * Mock implementation of ora for testing
 */

import { jest } from '@jest/globals';

const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  text: '',
  isSpinning: false,
};

export default function ora(options?: any): typeof mockSpinner {
  return mockSpinner;
}