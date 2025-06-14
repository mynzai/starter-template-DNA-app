/**
 * Mock implementation of inquirer for testing
 */

import { jest } from '@jest/globals';

export const prompt = jest.fn().mockResolvedValue({});

export default {
  prompt
};