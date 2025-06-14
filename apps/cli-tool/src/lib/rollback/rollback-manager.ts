/**
 * @fileoverview Robust rollback functionality with atomic operations
 * Provides transaction-like behavior with file system backup and restore mechanisms
 */

import fs from 'fs-extra';
import path from 'path';
import { logger } from '../../utils/logger';
import { RollbackError, RollbackFailedError } from '../errors/error-types';

export interface RollbackOperation {
  id: string;
  type: 'create_file' | 'create_directory' | 'modify_file' | 'delete_file' | 'delete_directory' | 'move_file' | 'copy_file';
  target: string;
  backup?: string;
  data?: unknown;
  timestamp: Date;
  completed: boolean;
}

export interface RollbackSnapshot {
  id: string;
  operations: RollbackOperation[];
  timestamp: Date;
  description: string;
  projectPath: string;
}

export class RollbackManager {
  private static instance: RollbackManager;
  private operations: Map<string, RollbackOperation[]> = new Map();
  private snapshots: Map<string, RollbackSnapshot> = new Map();
  private tempDir: string;
  private currentTransactionId?: string;

  private constructor() {
    this.tempDir = path.join(process.cwd(), '.dna-temp');
  }

  static getInstance(): RollbackManager {
    if (!RollbackManager.instance) {
      RollbackManager.instance = new RollbackManager();
    }
    return RollbackManager.instance;
  }

  /**
   * Start a new transaction for atomic operations
   */
  async startTransaction(description: string, projectPath: string): Promise<string> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentTransactionId = transactionId;
    
    this.operations.set(transactionId, []);
    
    // Ensure temp directory exists
    await fs.ensureDir(this.tempDir);
    
    logger.debug(`Started rollback transaction: ${transactionId} - ${description}`);
    
    return transactionId;
  }

  /**
   * Create a snapshot of the current state
   */
  async createSnapshot(transactionId: string, description: string, projectPath: string): Promise<void> {
    const operations = this.operations.get(transactionId) || [];
    
    const snapshot: RollbackSnapshot = {
      id: `snapshot_${transactionId}`,
      operations: [...operations],
      timestamp: new Date(),
      description,
      projectPath,
    };
    
    this.snapshots.set(snapshot.id, snapshot);
    logger.debug(`Created snapshot: ${snapshot.id}`);
  }

  /**
   * Record a file creation operation
   */
  async recordFileCreation(transactionId: string, filePath: string, content?: string): Promise<void> {
    const operation: RollbackOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'create_file',
      target: filePath,
      data: content,
      timestamp: new Date(),
      completed: false,
    };

    this.addOperation(transactionId, operation);
    
    try {
      if (content !== undefined) {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content);
      }
      operation.completed = true;
      logger.debug(`Recorded file creation: ${filePath}`);
    } catch (error) {
      throw new RollbackError(
        `Failed to create file: ${filePath}`,
        'FILE_CREATION_FAILED',
        'Check file path and permissions',
        { filePath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Record a directory creation operation
   */
  async recordDirectoryCreation(transactionId: string, dirPath: string): Promise<void> {
    const operation: RollbackOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'create_directory',
      target: dirPath,
      timestamp: new Date(),
      completed: false,
    };

    this.addOperation(transactionId, operation);
    
    try {
      await fs.ensureDir(dirPath);
      operation.completed = true;
      logger.debug(`Recorded directory creation: ${dirPath}`);
    } catch (error) {
      throw new RollbackError(
        `Failed to create directory: ${dirPath}`,
        'DIRECTORY_CREATION_FAILED',
        'Check directory path and permissions',
        { dirPath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Record a file modification operation with backup
   */
  async recordFileModification(transactionId: string, filePath: string, newContent: string): Promise<void> {
    let backupPath: string | undefined;
    
    // Create backup if file exists
    if (await fs.pathExists(filePath)) {
      backupPath = path.join(this.tempDir, `backup_${transactionId}_${path.basename(filePath)}_${Date.now()}`);
      await fs.copy(filePath, backupPath);
    }

    const operation: RollbackOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'modify_file',
      target: filePath,
      backup: backupPath,
      data: newContent,
      timestamp: new Date(),
      completed: false,
    };

    this.addOperation(transactionId, operation);
    
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, newContent);
      operation.completed = true;
      logger.debug(`Recorded file modification: ${filePath}`);
    } catch (error) {
      throw new RollbackError(
        `Failed to modify file: ${filePath}`,
        'FILE_MODIFICATION_FAILED',
        'Check file path and permissions',
        { filePath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Record a file copy operation
   */
  async recordFileCopy(transactionId: string, sourcePath: string, targetPath: string): Promise<void> {
    const operation: RollbackOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'copy_file',
      target: targetPath,
      data: sourcePath,
      timestamp: new Date(),
      completed: false,
    };

    this.addOperation(transactionId, operation);
    
    try {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
      operation.completed = true;
      logger.debug(`Recorded file copy: ${sourcePath} -> ${targetPath}`);
    } catch (error) {
      throw new RollbackError(
        `Failed to copy file: ${sourcePath} -> ${targetPath}`,
        'FILE_COPY_FAILED',
        'Check source file exists and target path is writable',
        { sourcePath, targetPath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Record a file move operation
   */
  async recordFileMove(transactionId: string, sourcePath: string, targetPath: string): Promise<void> {
    let backupPath: string | undefined;
    
    // Create backup of source file
    if (await fs.pathExists(sourcePath)) {
      backupPath = path.join(this.tempDir, `backup_move_${transactionId}_${path.basename(sourcePath)}_${Date.now()}`);
      await fs.copy(sourcePath, backupPath);
    }

    const operation: RollbackOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'move_file',
      target: targetPath,
      backup: backupPath,
      data: sourcePath,
      timestamp: new Date(),
      completed: false,
    };

    this.addOperation(transactionId, operation);
    
    try {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.move(sourcePath, targetPath);
      operation.completed = true;
      logger.debug(`Recorded file move: ${sourcePath} -> ${targetPath}`);
    } catch (error) {
      throw new RollbackError(
        `Failed to move file: ${sourcePath} -> ${targetPath}`,
        'FILE_MOVE_FAILED',
        'Check source file exists and target path is writable',
        { sourcePath, targetPath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Commit the transaction (cleanup temp files)
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const operations = this.operations.get(transactionId);
    if (!operations) {
      throw new RollbackError(
        `Transaction not found: ${transactionId}`,
        'TRANSACTION_NOT_FOUND',
        'Ensure the transaction was started correctly'
      );
    }

    // Clean up backup files for this transaction
    for (const operation of operations) {
      if (operation.backup && await fs.pathExists(operation.backup)) {
        try {
          await fs.remove(operation.backup);
        } catch (error) {
          logger.warn(`Failed to cleanup backup file: ${operation.backup}`);
        }
      }
    }

    // Remove transaction from tracking
    this.operations.delete(transactionId);
    
    // Clean up snapshots
    const snapshotId = `snapshot_${transactionId}`;
    this.snapshots.delete(snapshotId);
    
    if (this.currentTransactionId === transactionId) {
      this.currentTransactionId = undefined;
    }

    logger.debug(`Committed transaction: ${transactionId}`);
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    const operations = this.operations.get(transactionId);
    if (!operations) {
      throw new RollbackError(
        `Transaction not found: ${transactionId}`,
        'TRANSACTION_NOT_FOUND',
        'Ensure the transaction was started correctly'
      );
    }

    const completedOperations: string[] = [];
    const failedRollbacks: string[] = [];

    // Process operations in reverse order
    const reversedOperations = [...operations].reverse();
    
    for (const operation of reversedOperations) {
      if (!operation.completed) {
        continue; // Skip operations that weren't completed
      }

      try {
        await this.rollbackOperation(operation);
        completedOperations.push(operation.id);
      } catch (error) {
        logger.error(`Failed to rollback operation ${operation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedRollbacks.push(operation.id);
      }
    }

    // Clean up transaction
    this.operations.delete(transactionId);
    
    if (this.currentTransactionId === transactionId) {
      this.currentTransactionId = undefined;
    }

    if (failedRollbacks.length > 0) {
      throw new RollbackFailedError(
        `Failed to rollback ${failedRollbacks.length} operations`,
        completedOperations
      );
    }

    logger.info(`Successfully rolled back transaction: ${transactionId} (${completedOperations.length} operations)`);
  }

  /**
   * Rollback to a specific snapshot
   */
  async rollbackToSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new RollbackError(
        `Snapshot not found: ${snapshotId}`,
        'SNAPSHOT_NOT_FOUND',
        'Ensure the snapshot was created correctly'
      );
    }

    const completedOperations: string[] = [];
    const failedRollbacks: string[] = [];

    // Process operations from the snapshot in reverse order
    const reversedOperations = [...snapshot.operations].reverse();
    
    for (const operation of reversedOperations) {
      if (!operation.completed) {
        continue;
      }

      try {
        await this.rollbackOperation(operation);
        completedOperations.push(operation.id);
      } catch (error) {
        logger.error(`Failed to rollback operation ${operation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedRollbacks.push(operation.id);
      }
    }

    if (failedRollbacks.length > 0) {
      throw new RollbackFailedError(
        `Failed to rollback ${failedRollbacks.length} operations from snapshot`,
        completedOperations
      );
    }

    logger.info(`Successfully rolled back to snapshot: ${snapshotId} (${completedOperations.length} operations)`);
  }

  /**
   * Emergency cleanup - removes all files created in the current transaction
   */
  async emergencyCleanup(projectPath: string): Promise<void> {
    try {
      if (await fs.pathExists(projectPath)) {
        const stats = await fs.stat(projectPath);
        if (stats.isDirectory()) {
          await fs.remove(projectPath);
          logger.info(`Emergency cleanup: removed project directory ${projectPath}`);
        }
      }
    } catch (error) {
      logger.error(`Emergency cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new RollbackError(
        'Emergency cleanup failed',
        'EMERGENCY_CLEANUP_FAILED',
        'Manual cleanup may be required',
        { projectPath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): { exists: boolean; operationCount: number; completedCount: number } {
    const operations = this.operations.get(transactionId);
    if (!operations) {
      return { exists: false, operationCount: 0, completedCount: 0 };
    }

    const completedCount = operations.filter(op => op.completed).length;
    return { exists: true, operationCount: operations.length, completedCount };
  }

  /**
   * List all active transactions
   */
  getActiveTransactions(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * List all snapshots
   */
  getSnapshots(): RollbackSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Clean up temp directory
   */
  async cleanupTempDirectory(): Promise<void> {
    try {
      if (await fs.pathExists(this.tempDir)) {
        await fs.remove(this.tempDir);
        logger.debug('Cleaned up temp directory');
      }
    } catch (error) {
      logger.warn(`Failed to cleanup temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private addOperation(transactionId: string, operation: RollbackOperation): void {
    const operations = this.operations.get(transactionId) || [];
    operations.push(operation);
    this.operations.set(transactionId, operations);
  }

  private async rollbackOperation(operation: RollbackOperation): Promise<void> {
    switch (operation.type) {
      case 'create_file':
        await this.rollbackFileCreation(operation);
        break;
      case 'create_directory':
        await this.rollbackDirectoryCreation(operation);
        break;
      case 'modify_file':
        await this.rollbackFileModification(operation);
        break;
      case 'copy_file':
        await this.rollbackFileCopy(operation);
        break;
      case 'move_file':
        await this.rollbackFileMove(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  private async rollbackFileCreation(operation: RollbackOperation): Promise<void> {
    if (await fs.pathExists(operation.target)) {
      await fs.remove(operation.target);
      logger.debug(`Rolled back file creation: ${operation.target}`);
    }
  }

  private async rollbackDirectoryCreation(operation: RollbackOperation): Promise<void> {
    if (await fs.pathExists(operation.target)) {
      const stats = await fs.stat(operation.target);
      if (stats.isDirectory()) {
        // Only remove if directory is empty
        const contents = await fs.readdir(operation.target);
        if (contents.length === 0) {
          await fs.remove(operation.target);
          logger.debug(`Rolled back directory creation: ${operation.target}`);
        } else {
          logger.warn(`Cannot rollback directory ${operation.target}: not empty`);
        }
      }
    }
  }

  private async rollbackFileModification(operation: RollbackOperation): Promise<void> {
    if (operation.backup && await fs.pathExists(operation.backup)) {
      // Restore from backup
      await fs.copy(operation.backup, operation.target);
      await fs.remove(operation.backup);
      logger.debug(`Rolled back file modification: ${operation.target}`);
    } else {
      // No backup, remove the file
      if (await fs.pathExists(operation.target)) {
        await fs.remove(operation.target);
        logger.debug(`Rolled back file modification (no backup): ${operation.target}`);
      }
    }
  }

  private async rollbackFileCopy(operation: RollbackOperation): Promise<void> {
    if (await fs.pathExists(operation.target)) {
      await fs.remove(operation.target);
      logger.debug(`Rolled back file copy: ${operation.target}`);
    }
  }

  private async rollbackFileMove(operation: RollbackOperation): Promise<void> {
    if (operation.backup && await fs.pathExists(operation.backup)) {
      // Restore original file from backup
      const sourcePath = operation.data as string;
      await fs.copy(operation.backup, sourcePath);
      await fs.remove(operation.backup);
      
      // Remove the moved file
      if (await fs.pathExists(operation.target)) {
        await fs.remove(operation.target);
      }
      
      logger.debug(`Rolled back file move: ${operation.target} -> ${sourcePath}`);
    }
  }
}