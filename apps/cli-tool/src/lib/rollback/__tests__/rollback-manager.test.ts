/**
 * @fileoverview Unit tests for RollbackManager
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { RollbackManager, RollbackOperation, RollbackSnapshot } from '../rollback-manager';
import {
  FileSystemMock,
  createEmptyFileSystem
} from '../../../test-utils/file-system-mock';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  createMockLogger
} from '../../../test-utils/test-helpers';

// Mock logger
const mockLogger = createMockLogger();
jest.mock('../../../utils/logger', () => ({ logger: mockLogger }));

// Mock error types
class MockRollbackError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string,
    public context?: any
  ) {
    super(message);
    this.name = 'RollbackError';
  }
}

class MockRollbackFailedError extends Error {
  constructor(
    message: string,
    public completedOperations: string[]
  ) {
    super(message);
    this.name = 'RollbackFailedError';
  }
}

jest.mock('../../errors/error-types', () => ({
  RollbackError: MockRollbackError,
  RollbackFailedError: MockRollbackFailedError
}));

describe('RollbackManager', () => {
  let rollbackManager: RollbackManager;
  let fsMock: FileSystemMock;

  beforeEach(() => {
    setupTestEnvironment();
    fsMock = createEmptyFileSystem();
    fsMock.setup();
    
    // Reset singleton instance
    (RollbackManager as any).instance = undefined;
    rollbackManager = RollbackManager.getInstance();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownTestEnvironment();
    fsMock.teardown();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RollbackManager.getInstance();
      const instance2 = RollbackManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with empty state', () => {
      const activeTransactions = rollbackManager.getActiveTransactions();
      const snapshots = rollbackManager.getSnapshots();
      
      expect(activeTransactions).toHaveLength(0);
      expect(snapshots).toHaveLength(0);
    });
  });

  describe('startTransaction()', () => {
    it('should create a new transaction', async () => {
      const transactionId = await rollbackManager.startTransaction(
        'Test transaction',
        '/test/project'
      );

      expect(transactionId).toMatch(/^tx_\d+_[a-z0-9]+$/);
      expect(rollbackManager.getActiveTransactions()).toContain(transactionId);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Started rollback transaction: ${transactionId}`)
      );
    });

    it('should ensure temp directory exists', async () => {
      await rollbackManager.startTransaction('Test', '/test/project');

      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.dna-temp')
      );
    });

    it('should generate unique transaction IDs', async () => {
      const id1 = await rollbackManager.startTransaction('Test 1', '/test/1');
      const id2 = await rollbackManager.startTransaction('Test 2', '/test/2');

      expect(id1).not.toBe(id2);
    });

    it('should track multiple transactions', async () => {
      const id1 = await rollbackManager.startTransaction('Test 1', '/test/1');
      const id2 = await rollbackManager.startTransaction('Test 2', '/test/2');

      const activeTransactions = rollbackManager.getActiveTransactions();
      expect(activeTransactions).toContain(id1);
      expect(activeTransactions).toContain(id2);
    });
  });

  describe('createSnapshot()', () => {
    it('should create snapshot of transaction state', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      // Add some operations first
      await rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'content');
      await rollbackManager.recordDirectoryCreation(transactionId, '/test/dir');

      await rollbackManager.createSnapshot(transactionId, 'Test snapshot', '/test/project');

      const snapshots = rollbackManager.getSnapshots();
      expect(snapshots).toHaveLength(1);
      
      const snapshot = snapshots[0]!;
      expect(snapshot.description).toBe('Test snapshot');
      expect(snapshot.projectPath).toBe('/test/project');
      expect(snapshot.operations).toHaveLength(2);
    });

    it('should handle transaction with no operations', async () => {
      const transactionId = await rollbackManager.startTransaction('Empty', '/test/project');
      
      await rollbackManager.createSnapshot(transactionId, 'Empty snapshot', '/test/project');

      const snapshots = rollbackManager.getSnapshots();
      expect(snapshots[0]!.operations).toHaveLength(0);
    });
  });

  describe('recordFileCreation()', () => {
    let transactionId: string;

    beforeEach(async () => {
      transactionId = await rollbackManager.startTransaction('Test', '/test/project');
    });

    it('should record file creation with content', async () => {
      await rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'Hello World');

      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith('/test');
      expect(fsMock.mockFs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'Hello World');
      expect(mockLogger.debug).toHaveBeenCalledWith('Recorded file creation: /test/file.txt');
    });

    it('should record file creation without content', async () => {
      await rollbackManager.recordFileCreation(transactionId, '/test/file.txt');

      expect(fsMock.mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Recorded file creation: /test/file.txt');
    });

    it('should throw RollbackError on file creation failure', async () => {
      fsMock.mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(
        rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'content')
      ).rejects.toThrow(MockRollbackError);
    });

    it('should mark operation as completed on success', async () => {
      await rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'content');

      const status = rollbackManager.getTransactionStatus(transactionId);
      expect(status.completedCount).toBe(1);
    });
  });

  describe('recordDirectoryCreation()', () => {
    let transactionId: string;

    beforeEach(async () => {
      transactionId = await rollbackManager.startTransaction('Test', '/test/project');
    });

    it('should record directory creation', async () => {
      await rollbackManager.recordDirectoryCreation(transactionId, '/test/newdir');

      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith('/test/newdir');
      expect(mockLogger.debug).toHaveBeenCalledWith('Recorded directory creation: /test/newdir');
    });

    it('should throw RollbackError on directory creation failure', async () => {
      fsMock.mockFs.ensureDir.mockRejectedValue(new Error('Permission denied'));

      await expect(
        rollbackManager.recordDirectoryCreation(transactionId, '/test/newdir')
      ).rejects.toThrow(MockRollbackError);
    });
  });

  describe('recordFileModification()', () => {
    let transactionId: string;

    beforeEach(async () => {
      transactionId = await rollbackManager.startTransaction('Test', '/test/project');
    });

    it('should create backup for existing file', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(true);

      await rollbackManager.recordFileModification(transactionId, '/test/existing.txt', 'new content');

      expect(fsMock.mockFs.copy).toHaveBeenCalledWith(
        '/test/existing.txt',
        expect.stringMatching(/backup_.*_existing\.txt_\d+$/)
      );
      expect(fsMock.mockFs.writeFile).toHaveBeenCalledWith('/test/existing.txt', 'new content');
    });

    it('should not create backup for non-existing file', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(false);

      await rollbackManager.recordFileModification(transactionId, '/test/new.txt', 'content');

      expect(fsMock.mockFs.copy).not.toHaveBeenCalled();
      expect(fsMock.mockFs.writeFile).toHaveBeenCalledWith('/test/new.txt', 'content');
    });

    it('should throw RollbackError on modification failure', async () => {
      fsMock.mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(
        rollbackManager.recordFileModification(transactionId, '/test/file.txt', 'content')
      ).rejects.toThrow(MockRollbackError);
    });
  });

  describe('recordFileCopy()', () => {
    let transactionId: string;

    beforeEach(async () => {
      transactionId = await rollbackManager.startTransaction('Test', '/test/project');
    });

    it('should record file copy operation', async () => {
      await rollbackManager.recordFileCopy(transactionId, '/source/file.txt', '/target/file.txt');

      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith('/target');
      expect(fsMock.mockFs.copy).toHaveBeenCalledWith('/source/file.txt', '/target/file.txt');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Recorded file copy: /source/file.txt -> /target/file.txt'
      );
    });

    it('should throw RollbackError on copy failure', async () => {
      fsMock.mockFs.copy.mockRejectedValue(new Error('Source not found'));

      await expect(
        rollbackManager.recordFileCopy(transactionId, '/source/file.txt', '/target/file.txt')
      ).rejects.toThrow(MockRollbackError);
    });
  });

  describe('recordFileMove()', () => {
    let transactionId: string;

    beforeEach(async () => {
      transactionId = await rollbackManager.startTransaction('Test', '/test/project');
    });

    it('should create backup before moving existing file', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(true);

      await rollbackManager.recordFileMove(transactionId, '/source/file.txt', '/target/file.txt');

      expect(fsMock.mockFs.copy).toHaveBeenCalledWith(
        '/source/file.txt',
        expect.stringMatching(/backup_move_.*_file\.txt_\d+$/)
      );
      expect(fsMock.mockFs.move).toHaveBeenCalledWith('/source/file.txt', '/target/file.txt');
    });

    it('should not create backup for non-existing file', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(false);

      await rollbackManager.recordFileMove(transactionId, '/source/file.txt', '/target/file.txt');

      expect(fsMock.mockFs.copy).not.toHaveBeenCalled();
      expect(fsMock.mockFs.move).toHaveBeenCalledWith('/source/file.txt', '/target/file.txt');
    });
  });

  describe('commitTransaction()', () => {
    it('should clean up backup files and remove transaction', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      // Create operations with backups
      fsMock.mockFs.pathExists.mockImplementation((path: string) => {
        return Promise.resolve(path.includes('backup_'));
      });

      await rollbackManager.recordFileModification(transactionId, '/test/file.txt', 'content');
      await rollbackManager.commitTransaction(transactionId);

      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(
        expect.stringContaining('backup_')
      );
      expect(rollbackManager.getActiveTransactions()).not.toContain(transactionId);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Committed transaction: ${transactionId}`);
    });

    it('should handle backup cleanup failures gracefully', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      fsMock.mockFs.pathExists.mockResolvedValue(true);
      fsMock.mockFs.remove.mockRejectedValue(new Error('Cleanup failed'));

      await rollbackManager.recordFileModification(transactionId, '/test/file.txt', 'content');
      
      await expect(rollbackManager.commitTransaction(transactionId)).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup backup file')
      );
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(
        rollbackManager.commitTransaction('nonexistent')
      ).rejects.toThrow('Transaction not found: nonexistent');
    });
  });

  describe('rollbackTransaction()', () => {
    it('should rollback operations in reverse order', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      await rollbackManager.recordFileCreation(transactionId, '/test/file1.txt', 'content1');
      await rollbackManager.recordFileCreation(transactionId, '/test/file2.txt', 'content2');
      await rollbackManager.recordDirectoryCreation(transactionId, '/test/dir');

      fsMock.mockFs.pathExists.mockResolvedValue(true);
      fsMock.mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      fsMock.mockFs.readdir.mockResolvedValue([]);

      await rollbackManager.rollbackTransaction(transactionId);

      // Should remove files and directory in reverse order
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/dir');
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/file2.txt');
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/file1.txt');
      
      expect(rollbackManager.getActiveTransactions()).not.toContain(transactionId);
    });

    it('should skip incomplete operations', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      // Mock an operation that fails to complete
      fsMock.mockFs.writeFile.mockRejectedValueOnce(new Error('Write failed'));
      
      try {
        await rollbackManager.recordFileCreation(transactionId, '/test/file1.txt', 'content1');
      } catch {
        // Expected to fail
      }
      
      await rollbackManager.recordFileCreation(transactionId, '/test/file2.txt', 'content2');

      fsMock.mockFs.pathExists.mockResolvedValue(true);
      await rollbackManager.rollbackTransaction(transactionId);

      // Should only rollback the completed operation (file2.txt)
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/file2.txt');
      expect(fsMock.mockFs.remove).not.toHaveBeenCalledWith('/test/file1.txt');
    });

    it('should throw RollbackFailedError if some operations fail to rollback', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      await rollbackManager.recordFileCreation(transactionId, '/test/file1.txt', 'content1');
      await rollbackManager.recordFileCreation(transactionId, '/test/file2.txt', 'content2');

      // Mock one rollback to fail
      let removeCallCount = 0;
      fsMock.mockFs.remove.mockImplementation(() => {
        removeCallCount++;
        if (removeCallCount === 1) {
          return Promise.reject(new Error('Rollback failed'));
        }
        return Promise.resolve();
      });
      
      fsMock.mockFs.pathExists.mockResolvedValue(true);

      await expect(rollbackManager.rollbackTransaction(transactionId)).rejects.toThrow(
        MockRollbackFailedError
      );
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(
        rollbackManager.rollbackTransaction('nonexistent')
      ).rejects.toThrow('Transaction not found: nonexistent');
    });
  });

  describe('rollbackToSnapshot()', () => {
    it('should rollback to snapshot state', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      await rollbackManager.recordFileCreation(transactionId, '/test/file1.txt', 'content1');
      await rollbackManager.createSnapshot(transactionId, 'Snapshot 1', '/test/project');
      await rollbackManager.recordFileCreation(transactionId, '/test/file2.txt', 'content2');

      const snapshots = rollbackManager.getSnapshots();
      const snapshotId = snapshots[0]!.id;

      fsMock.mockFs.pathExists.mockResolvedValue(true);
      await rollbackManager.rollbackToSnapshot(snapshotId);

      // Should only rollback file1.txt (which was in the snapshot)
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/file1.txt');
      expect(fsMock.mockFs.remove).not.toHaveBeenCalledWith('/test/file2.txt');
    });

    it('should throw error for non-existent snapshot', async () => {
      await expect(
        rollbackManager.rollbackToSnapshot('nonexistent')
      ).rejects.toThrow('Snapshot not found: nonexistent');
    });
  });

  describe('Operation-specific rollback behavior', () => {
    let transactionId: string;

    beforeEach(async () => {
      transactionId = await rollbackManager.startTransaction('Test', '/test/project');
    });

    describe('File creation rollback', () => {
      it('should remove created file', async () => {
        await rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'content');
        
        fsMock.mockFs.pathExists.mockResolvedValue(true);
        await rollbackManager.rollbackTransaction(transactionId);

        expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/file.txt');
      });

      it('should handle file that no longer exists', async () => {
        await rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'content');
        
        fsMock.mockFs.pathExists.mockResolvedValue(false);
        await expect(rollbackManager.rollbackTransaction(transactionId)).resolves.not.toThrow();
      });
    });

    describe('Directory creation rollback', () => {
      it('should remove empty directory', async () => {
        await rollbackManager.recordDirectoryCreation(transactionId, '/test/dir');
        
        fsMock.mockFs.pathExists.mockResolvedValue(true);
        fsMock.mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
        fsMock.mockFs.readdir.mockResolvedValue([]);

        await rollbackManager.rollbackTransaction(transactionId);

        expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/dir');
      });

      it('should not remove non-empty directory', async () => {
        await rollbackManager.recordDirectoryCreation(transactionId, '/test/dir');
        
        fsMock.mockFs.pathExists.mockResolvedValue(true);
        fsMock.mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
        fsMock.mockFs.readdir.mockResolvedValue(['file.txt']);

        await rollbackManager.rollbackTransaction(transactionId);

        expect(fsMock.mockFs.remove).not.toHaveBeenCalledWith('/test/dir');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Cannot rollback directory /test/dir: not empty'
        );
      });
    });

    describe('File modification rollback', () => {
      it('should restore from backup', async () => {
        fsMock.mockFs.pathExists.mockImplementation((path: string) => {
          return Promise.resolve(path.includes('backup_') || path === '/test/file.txt');
        });

        await rollbackManager.recordFileModification(transactionId, '/test/file.txt', 'new content');
        await rollbackManager.rollbackTransaction(transactionId);

        expect(fsMock.mockFs.copy).toHaveBeenCalledWith(
          expect.stringContaining('backup_'),
          '/test/file.txt'
        );
      });

      it('should remove file if no backup exists', async () => {
        fsMock.mockFs.pathExists.mockImplementation((path: string) => {
          return Promise.resolve(path === '/test/file.txt' && !path.includes('backup_'));
        });

        await rollbackManager.recordFileModification(transactionId, '/test/file.txt', 'new content');
        await rollbackManager.rollbackTransaction(transactionId);

        expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/file.txt');
      });
    });

    describe('File copy rollback', () => {
      it('should remove copied file', async () => {
        await rollbackManager.recordFileCopy(transactionId, '/source/file.txt', '/target/file.txt');
        
        fsMock.mockFs.pathExists.mockResolvedValue(true);
        await rollbackManager.rollbackTransaction(transactionId);

        expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/target/file.txt');
      });
    });

    describe('File move rollback', () => {
      it('should restore original file and remove moved file', async () => {
        fsMock.mockFs.pathExists.mockImplementation((path: string) => {
          return Promise.resolve(path.includes('backup_') || path === '/target/file.txt');
        });

        await rollbackManager.recordFileMove(transactionId, '/source/file.txt', '/target/file.txt');
        await rollbackManager.rollbackTransaction(transactionId);

        expect(fsMock.mockFs.copy).toHaveBeenCalledWith(
          expect.stringContaining('backup_move_'),
          '/source/file.txt'
        );
        expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/target/file.txt');
      });
    });
  });

  describe('emergencyCleanup()', () => {
    it('should remove project directory', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(true);
      fsMock.mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      await rollbackManager.emergencyCleanup('/test/project');

      expect(fsMock.mockFs.remove).toHaveBeenCalledWith('/test/project');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Emergency cleanup: removed project directory /test/project'
      );
    });

    it('should handle non-existent directory', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(false);

      await expect(rollbackManager.emergencyCleanup('/test/project')).resolves.not.toThrow();
      expect(fsMock.mockFs.remove).not.toHaveBeenCalled();
    });

    it('should throw RollbackError on cleanup failure', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(true);
      fsMock.mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      fsMock.mockFs.remove.mockRejectedValue(new Error('Permission denied'));

      await expect(rollbackManager.emergencyCleanup('/test/project')).rejects.toThrow(
        MockRollbackError
      );
    });
  });

  describe('Status and monitoring', () => {
    it('should return transaction status', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      let status = rollbackManager.getTransactionStatus(transactionId);
      expect(status).toEqual({ exists: true, operationCount: 0, completedCount: 0 });

      await rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'content');
      
      status = rollbackManager.getTransactionStatus(transactionId);
      expect(status).toEqual({ exists: true, operationCount: 1, completedCount: 1 });
    });

    it('should return false for non-existent transaction', () => {
      const status = rollbackManager.getTransactionStatus('nonexistent');
      expect(status).toEqual({ exists: false, operationCount: 0, completedCount: 0 });
    });

    it('should list active transactions', async () => {
      const id1 = await rollbackManager.startTransaction('Test 1', '/test/1');
      const id2 = await rollbackManager.startTransaction('Test 2', '/test/2');

      const activeTransactions = rollbackManager.getActiveTransactions();
      expect(activeTransactions).toContain(id1);
      expect(activeTransactions).toContain(id2);
    });

    it('should list snapshots', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      await rollbackManager.createSnapshot(transactionId, 'Snapshot 1', '/test/project');
      await rollbackManager.createSnapshot(transactionId, 'Snapshot 2', '/test/project');

      const snapshots = rollbackManager.getSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]!.description).toBe('Snapshot 1');
      expect(snapshots[1]!.description).toBe('Snapshot 2');
    });
  });

  describe('cleanupTempDirectory()', () => {
    it('should remove temp directory', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(true);

      await rollbackManager.cleanupTempDirectory();

      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(
        expect.stringContaining('.dna-temp')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaned up temp directory');
    });

    it('should handle non-existent temp directory', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(false);

      await expect(rollbackManager.cleanupTempDirectory()).resolves.not.toThrow();
      expect(fsMock.mockFs.remove).not.toHaveBeenCalled();
    });

    it('should handle cleanup failure gracefully', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(true);
      fsMock.mockFs.remove.mockRejectedValue(new Error('Cleanup failed'));

      await expect(rollbackManager.cleanupTempDirectory()).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup temp directory')
      );
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle unknown operation types', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      // Manually add an operation with unknown type
      const operations = (rollbackManager as any).operations.get(transactionId);
      operations.push({
        id: 'test_op',
        type: 'unknown_type',
        target: '/test/file.txt',
        timestamp: new Date(),
        completed: true
      });

      fsMock.mockFs.pathExists.mockResolvedValue(true);
      
      await expect(rollbackManager.rollbackTransaction(transactionId)).rejects.toThrow(
        'Unknown operation type: unknown_type'
      );
    });

    it('should handle concurrent transaction access', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        rollbackManager.startTransaction(`Concurrent ${i}`, `/test/${i}`)
      );

      const transactionIds = await Promise.all(promises);
      
      expect(transactionIds).toHaveLength(10);
      expect(new Set(transactionIds).size).toBe(10); // All unique
    });

    it('should handle file system errors during backup creation', async () => {
      const transactionId = await rollbackManager.startTransaction('Test', '/test/project');
      
      fsMock.mockFs.pathExists.mockResolvedValue(true);
      fsMock.mockFs.copy.mockRejectedValue(new Error('Backup failed'));

      await expect(
        rollbackManager.recordFileModification(transactionId, '/test/file.txt', 'content')
      ).rejects.toThrow(MockRollbackError);
    });
  });

  describe('Memory and performance', () => {
    it('should efficiently handle large numbers of operations', async () => {
      const transactionId = await rollbackManager.startTransaction('Large test', '/test/project');
      
      const startTime = performance.now();
      
      // Add 1000 operations
      for (let i = 0; i < 1000; i++) {
        await rollbackManager.recordFileCreation(transactionId, `/test/file${i}.txt`);
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const status = rollbackManager.getTransactionStatus(transactionId);
      expect(status.operationCount).toBe(1000);
    });

    it('should clean up memory after transaction completion', async () => {
      const transactionId = await rollbackManager.startTransaction('Memory test', '/test/project');
      
      await rollbackManager.recordFileCreation(transactionId, '/test/file.txt', 'content');
      await rollbackManager.commitTransaction(transactionId);

      // Transaction should be removed from memory
      expect(rollbackManager.getActiveTransactions()).not.toContain(transactionId);
      
      const status = rollbackManager.getTransactionStatus(transactionId);
      expect(status.exists).toBe(false);
    });
  });
});