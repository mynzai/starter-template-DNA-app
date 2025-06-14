/**
 * @fileoverview Unit tests for ProgressTracker
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { ProgressTracker } from '../progress-tracker';
import { setupTestEnvironment, teardownTestEnvironment, sleep } from '../../test-utils/test-helpers';

// Mock ora spinner
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  clear: jest.fn().mockReturnThis(),
  text: '',
};

jest.mock('ora', () => jest.fn(() => mockSpinner));

// Mock logger
const mockLogger = {
  success: jest.fn(),
  fail: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

jest.mock('../../utils/logger', () => ({ logger: mockLogger }));

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    setupTestEnvironment();
    jest.clearAllMocks();
    mockSpinner.text = '';
  });

  afterEach(() => {
    teardownTestEnvironment();
  });

  describe('Constructor', () => {
    it('should create tracker with progress enabled by default', () => {
      tracker = new ProgressTracker();
      expect(tracker).toBeInstanceOf(ProgressTracker);
    });

    it('should create tracker with progress disabled', () => {
      tracker = new ProgressTracker(false);
      expect(tracker).toBeInstanceOf(ProgressTracker);
    });
  });

  describe('start()', () => {
    it('should start spinner when enabled', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);

      expect(require('ora')).toHaveBeenCalledWith({
        text: 'Starting process',
        spinner: 'dots'
      });
      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should not start spinner when disabled', () => {
      tracker = new ProgressTracker(false);
      tracker.start('Starting process', 5);

      expect(require('ora')).not.toHaveBeenCalled();
      expect(mockSpinner.start).not.toHaveBeenCalled();
    });

    it('should initialize stage tracking', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);

      const progress = tracker.getProgress();
      expect(progress.current).toBe(0);
      expect(progress.total).toBe(5);
    });

    it('should record start time', () => {
      tracker = new ProgressTracker(true);
      const beforeStart = Date.now();
      
      tracker.start('Starting process', 5);
      tracker.update(1, 'Step 1');
      
      const progress = tracker.getProgress();
      expect(progress.message).toContain('Step 1');
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
    });

    it('should update spinner text with progress and elapsed time', () => {
      tracker.update(2, 'Processing step 2');

      expect(mockSpinner.text).toContain('[2/5]');
      expect(mockSpinner.text).toContain('Processing step 2');
      expect(mockSpinner.text).toMatch(/\(\d+ms\)/); // Should contain elapsed time
    });

    it('should not update spinner when disabled', () => {
      tracker = new ProgressTracker(false);
      tracker.start('Starting process', 5);
      
      const originalText = mockSpinner.text;
      tracker.update(2, 'Processing step 2');

      expect(mockSpinner.text).toBe(originalText);
    });

    it('should handle updates without total stages', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 0);
      
      tracker.update(2, 'Processing step 2');

      expect(mockSpinner.text).toContain('Processing step 2');
      expect(mockSpinner.text).not.toContain('[2/0]');
    });

    it('should track current stage correctly', () => {
      tracker.update(3, 'Step 3');

      const progress = tracker.getProgress();
      expect(progress.current).toBe(3);
      expect(progress.stage).toBe('3');
    });
  });

  describe('succeed()', () => {
    beforeEach(() => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
    });

    it('should call spinner succeed with elapsed time', () => {
      tracker.succeed('Process completed successfully');

      expect(mockSpinner.succeed).toHaveBeenCalled();
      const successCall = mockSpinner.succeed.mock.calls[0][0];
      expect(successCall).toContain('Process completed successfully');
      expect(successCall).toMatch(/\(\d+ms\)/);
    });

    it('should use logger when spinner is disabled', () => {
      tracker = new ProgressTracker(false);
      tracker.succeed('Process completed');

      expect(mockLogger.success).toHaveBeenCalledWith('Process completed');
      expect(mockSpinner.succeed).not.toHaveBeenCalled();
    });

    it('should clear spinner reference after success', () => {
      tracker.succeed('Process completed');
      
      // Subsequent calls should not affect the spinner
      tracker.update(1, 'Should not update');
      expect(mockSpinner.text).toBe('');
    });
  });

  describe('fail()', () => {
    beforeEach(() => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
    });

    it('should call spinner fail with elapsed time', () => {
      tracker.fail('Process failed');

      expect(mockSpinner.fail).toHaveBeenCalled();
      const failCall = mockSpinner.fail.mock.calls[0][0];
      expect(failCall).toContain('Process failed');
      expect(failCall).toMatch(/\(\d+ms\)/);
    });

    it('should use logger when spinner is disabled', () => {
      tracker = new ProgressTracker(false);
      tracker.fail('Process failed');

      expect(mockLogger.fail).toHaveBeenCalledWith('Process failed');
      expect(mockSpinner.fail).not.toHaveBeenCalled();
    });

    it('should clear spinner reference after failure', () => {
      tracker.fail('Process failed');
      
      // Subsequent calls should not affect the spinner
      tracker.update(1, 'Should not update');
      expect(mockSpinner.text).toBe('');
    });
  });

  describe('warn()', () => {
    beforeEach(() => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
    });

    it('should call spinner warn with elapsed time', () => {
      tracker.warn('Process warning');

      expect(mockSpinner.warn).toHaveBeenCalled();
      const warnCall = mockSpinner.warn.mock.calls[0][0];
      expect(warnCall).toContain('Process warning');
      expect(warnCall).toMatch(/\(\d+ms\)/);
    });

    it('should use logger when spinner is disabled', () => {
      tracker = new ProgressTracker(false);
      tracker.warn('Process warning');

      expect(mockLogger.warn).toHaveBeenCalledWith('Process warning');
      expect(mockSpinner.warn).not.toHaveBeenCalled();
    });
  });

  describe('info()', () => {
    beforeEach(() => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
    });

    it('should call spinner info with elapsed time', () => {
      tracker.info('Process info');

      expect(mockSpinner.info).toHaveBeenCalled();
      const infoCall = mockSpinner.info.mock.calls[0][0];
      expect(infoCall).toContain('Process info');
      expect(infoCall).toMatch(/\(\d+ms\)/);
    });

    it('should use logger when spinner is disabled', () => {
      tracker = new ProgressTracker(false);
      tracker.info('Process info');

      expect(mockLogger.info).toHaveBeenCalledWith('Process info');
      expect(mockSpinner.info).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should stop and clear spinner', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
      
      tracker.stop();

      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should handle stop when no spinner exists', () => {
      tracker = new ProgressTracker(false);
      
      expect(() => tracker.stop()).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should clear spinner display', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
      
      tracker.clear();

      expect(mockSpinner.clear).toHaveBeenCalled();
    });

    it('should handle clear when no spinner exists', () => {
      tracker = new ProgressTracker(false);
      
      expect(() => tracker.clear()).not.toThrow();
    });
  });

  describe('getProgress()', () => {
    it('should return current progress information', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Starting process', 5);
      tracker.update(3, 'Current step');

      const progress = tracker.getProgress();

      expect(progress).toEqual({
        stage: '3',
        current: 3,
        total: 5,
        message: expect.stringContaining('Current step')
      });
    });

    it('should return empty message when no spinner', () => {
      tracker = new ProgressTracker(false);
      tracker.start('Starting process', 5);

      const progress = tracker.getProgress();

      expect(progress.message).toBe('');
    });
  });

  describe('Elapsed time formatting', () => {
    beforeEach(() => {
      tracker = new ProgressTracker(true);
    });

    it('should format milliseconds correctly', () => {
      // Mock Date.now to control elapsed time
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);

      tracker.start('Test', 1);
      
      currentTime += 500; // 500ms elapsed
      tracker.succeed('Completed');

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('(500ms)')
      );

      Date.now = originalNow;
    });

    it('should format seconds correctly', () => {
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);

      tracker.start('Test', 1);
      
      currentTime += 2500; // 2.5 seconds elapsed
      tracker.succeed('Completed');

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('(2.5s)')
      );

      Date.now = originalNow;
    });

    it('should format minutes and seconds correctly', () => {
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);

      tracker.start('Test', 1);
      
      currentTime += 125000; // 2 minutes 5 seconds
      tracker.succeed('Completed');

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('(2m 5s)')
      );

      Date.now = originalNow;
    });
  });

  describe('Static helper methods', () => {
    describe('withProgress()', () => {
      it('should execute operation with progress tracking', async () => {
        const operation = jest.fn().mockResolvedValue('result');
        
        const result = await ProgressTracker.withProgress(
          'Testing operation',
          operation,
          true
        );

        expect(result).toBe('result');
        expect(operation).toHaveBeenCalled();
        expect(mockSpinner.start).toHaveBeenCalled();
        expect(mockSpinner.succeed).toHaveBeenCalledWith(
          expect.stringContaining('Testing operation')
        );
      });

      it('should handle operation failures', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
        
        await expect(
          ProgressTracker.withProgress('Failing operation', operation, true)
        ).rejects.toThrow('Operation failed');

        expect(mockSpinner.fail).toHaveBeenCalledWith(
          expect.stringContaining('Failed: Failing operation')
        );
      });

      it('should work with progress disabled', async () => {
        const operation = jest.fn().mockResolvedValue('result');
        
        const result = await ProgressTracker.withProgress(
          'Testing operation',
          operation,
          false
        );

        expect(result).toBe('result');
        expect(mockSpinner.start).not.toHaveBeenCalled();
      });
    });

    describe('withStages()', () => {
      it('should execute multiple stages with progress', async () => {
        const stage1 = jest.fn().mockResolvedValue(undefined);
        const stage2 = jest.fn().mockResolvedValue(undefined);
        const stage3 = jest.fn().mockResolvedValue(undefined);

        const stages = [
          { message: 'Stage 1', operation: stage1 },
          { message: 'Stage 2', operation: stage2 },
          { message: 'Stage 3', operation: stage3 }
        ];

        await ProgressTracker.withStages(stages, true);

        expect(stage1).toHaveBeenCalled();
        expect(stage2).toHaveBeenCalled();
        expect(stage3).toHaveBeenCalled();
        expect(mockSpinner.start).toHaveBeenCalledWith('Processing', 3);
        expect(mockSpinner.succeed).toHaveBeenCalledWith(
          expect.stringContaining('All stages completed')
        );
      });

      it('should handle stage failures', async () => {
        const stage1 = jest.fn().mockResolvedValue(undefined);
        const stage2 = jest.fn().mockRejectedValue(new Error('Stage 2 failed'));
        const stage3 = jest.fn().mockResolvedValue(undefined);

        const stages = [
          { message: 'Stage 1', operation: stage1 },
          { message: 'Stage 2', operation: stage2 },
          { message: 'Stage 3', operation: stage3 }
        ];

        await expect(
          ProgressTracker.withStages(stages, true)
        ).rejects.toThrow('Stage 2 failed');

        expect(stage1).toHaveBeenCalled();
        expect(stage2).toHaveBeenCalled();
        expect(stage3).not.toHaveBeenCalled(); // Should stop after failure
        expect(mockSpinner.fail).toHaveBeenCalledWith(
          expect.stringContaining('Failed: Stage 2')
        );
      });

      it('should work with progress disabled', async () => {
        const stage1 = jest.fn().mockResolvedValue(undefined);
        const stages = [{ message: 'Stage 1', operation: stage1 }];

        await ProgressTracker.withStages(stages, false);

        expect(stage1).toHaveBeenCalled();
        expect(mockSpinner.start).not.toHaveBeenCalled();
      });

      it('should handle empty stages array', async () => {
        await ProgressTracker.withStages([], true);

        expect(mockSpinner.start).toHaveBeenCalledWith('Processing', 0);
        expect(mockSpinner.succeed).toHaveBeenCalledWith(
          expect.stringContaining('All stages completed')
        );
      });

      it('should handle undefined stages gracefully', async () => {
        const stages = [
          { message: 'Stage 1', operation: jest.fn().mockResolvedValue(undefined) },
          undefined as any,
          { message: 'Stage 3', operation: jest.fn().mockResolvedValue(undefined) }
        ];

        await ProgressTracker.withStages(stages, true);

        expect(stages[0]!.operation).toHaveBeenCalled();
        expect(stages[2]!.operation).toHaveBeenCalled();
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle multiple start calls', () => {
      tracker = new ProgressTracker(true);
      
      tracker.start('First start', 3);
      tracker.start('Second start', 5);

      // Should not throw and should work with the latest start
      tracker.update(1, 'Update after restart');
      
      const progress = tracker.getProgress();
      expect(progress.total).toBe(5);
    });

    it('should handle updates before start', () => {
      tracker = new ProgressTracker(true);
      
      expect(() => tracker.update(1, 'Update before start')).not.toThrow();
    });

    it('should handle success/fail calls before start', () => {
      tracker = new ProgressTracker(true);
      
      expect(() => tracker.succeed('Success before start')).not.toThrow();
      expect(() => tracker.fail('Fail before start')).not.toThrow();
      
      // Should use logger fallback
      expect(mockLogger.success).toHaveBeenCalledWith('Success before start');
      expect(mockLogger.fail).toHaveBeenCalledWith('Fail before start');
    });

    it('should handle calls after spinner is cleared', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Test', 1);
      tracker.succeed('Completed');
      
      // These should not throw
      expect(() => tracker.update(1, 'After completion')).not.toThrow();
      expect(() => tracker.stop()).not.toThrow();
      expect(() => tracker.clear()).not.toThrow();
    });

    it('should handle ora initialization failures', () => {
      // Mock ora to throw during initialization
      const oraError = new Error('Ora initialization failed');
      jest.doMock('ora', () => jest.fn(() => { throw oraError; }));

      expect(() => new ProgressTracker(true)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not impact performance when disabled', () => {
      tracker = new ProgressTracker(false);
      
      const startTime = performance.now();
      
      tracker.start('Performance test', 1000);
      for (let i = 0; i < 1000; i++) {
        tracker.update(i, `Step ${i}`);
      }
      tracker.succeed('Completed');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete very quickly when disabled
      expect(duration).toBeLessThan(100); // Less than 100ms
    });

    it('should efficiently handle rapid updates', () => {
      tracker = new ProgressTracker(true);
      tracker.start('Performance test', 100);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        tracker.update(i, `Rapid update ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle 100 updates reasonably quickly
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });
});