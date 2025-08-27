"use strict";
/**
 * @fileoverview Robust rollback functionality with atomic operations
 * Provides transaction-like behavior with file system backup and restore mechanisms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackManager = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = require("../../utils/logger");
const error_types_1 = require("../errors/error-types");
class RollbackManager {
    constructor() {
        this.operations = new Map();
        this.snapshots = new Map();
        this.tempDir = path_1.default.join(process.cwd(), '.dna-temp');
    }
    static getInstance() {
        if (!RollbackManager.instance) {
            RollbackManager.instance = new RollbackManager();
        }
        return RollbackManager.instance;
    }
    /**
     * Start a new transaction for atomic operations
     */
    async startTransaction(description, projectPath) {
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.currentTransactionId = transactionId;
        this.operations.set(transactionId, []);
        // Ensure temp directory exists
        await fs_extra_1.default.ensureDir(this.tempDir);
        logger_1.logger.debug(`Started rollback transaction: ${transactionId} - ${description}`);
        return transactionId;
    }
    /**
     * Create a snapshot of the current state
     */
    async createSnapshot(transactionId, description, projectPath) {
        const operations = this.operations.get(transactionId) || [];
        const snapshot = {
            id: `snapshot_${transactionId}`,
            operations: [...operations],
            timestamp: new Date(),
            description,
            projectPath,
        };
        this.snapshots.set(snapshot.id, snapshot);
        logger_1.logger.debug(`Created snapshot: ${snapshot.id}`);
    }
    /**
     * Record a file creation operation
     */
    async recordFileCreation(transactionId, filePath, content) {
        const operation = {
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
                await fs_extra_1.default.ensureDir(path_1.default.dirname(filePath));
                await fs_extra_1.default.writeFile(filePath, content);
            }
            operation.completed = true;
            logger_1.logger.debug(`Recorded file creation: ${filePath}`);
        }
        catch (error) {
            throw new error_types_1.RollbackError(`Failed to create file: ${filePath}`, 'FILE_CREATION_FAILED', 'Check file path and permissions', { filePath, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Record a directory creation operation
     */
    async recordDirectoryCreation(transactionId, dirPath) {
        const operation = {
            id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'create_directory',
            target: dirPath,
            timestamp: new Date(),
            completed: false,
        };
        this.addOperation(transactionId, operation);
        try {
            await fs_extra_1.default.ensureDir(dirPath);
            operation.completed = true;
            logger_1.logger.debug(`Recorded directory creation: ${dirPath}`);
        }
        catch (error) {
            throw new error_types_1.RollbackError(`Failed to create directory: ${dirPath}`, 'DIRECTORY_CREATION_FAILED', 'Check directory path and permissions', { dirPath, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Record a file modification operation with backup
     */
    async recordFileModification(transactionId, filePath, newContent) {
        let backupPath;
        // Create backup if file exists
        if (await fs_extra_1.default.pathExists(filePath)) {
            backupPath = path_1.default.join(this.tempDir, `backup_${transactionId}_${path_1.default.basename(filePath)}_${Date.now()}`);
            await fs_extra_1.default.copy(filePath, backupPath);
        }
        const operation = {
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
            await fs_extra_1.default.ensureDir(path_1.default.dirname(filePath));
            await fs_extra_1.default.writeFile(filePath, newContent);
            operation.completed = true;
            logger_1.logger.debug(`Recorded file modification: ${filePath}`);
        }
        catch (error) {
            throw new error_types_1.RollbackError(`Failed to modify file: ${filePath}`, 'FILE_MODIFICATION_FAILED', 'Check file path and permissions', { filePath, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Record a file copy operation
     */
    async recordFileCopy(transactionId, sourcePath, targetPath) {
        const operation = {
            id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'copy_file',
            target: targetPath,
            data: sourcePath,
            timestamp: new Date(),
            completed: false,
        };
        this.addOperation(transactionId, operation);
        try {
            await fs_extra_1.default.ensureDir(path_1.default.dirname(targetPath));
            await fs_extra_1.default.copy(sourcePath, targetPath);
            operation.completed = true;
            logger_1.logger.debug(`Recorded file copy: ${sourcePath} -> ${targetPath}`);
        }
        catch (error) {
            throw new error_types_1.RollbackError(`Failed to copy file: ${sourcePath} -> ${targetPath}`, 'FILE_COPY_FAILED', 'Check source file exists and target path is writable', { sourcePath, targetPath, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Record a file move operation
     */
    async recordFileMove(transactionId, sourcePath, targetPath) {
        let backupPath;
        // Create backup of source file
        if (await fs_extra_1.default.pathExists(sourcePath)) {
            backupPath = path_1.default.join(this.tempDir, `backup_move_${transactionId}_${path_1.default.basename(sourcePath)}_${Date.now()}`);
            await fs_extra_1.default.copy(sourcePath, backupPath);
        }
        const operation = {
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
            await fs_extra_1.default.ensureDir(path_1.default.dirname(targetPath));
            await fs_extra_1.default.move(sourcePath, targetPath);
            operation.completed = true;
            logger_1.logger.debug(`Recorded file move: ${sourcePath} -> ${targetPath}`);
        }
        catch (error) {
            throw new error_types_1.RollbackError(`Failed to move file: ${sourcePath} -> ${targetPath}`, 'FILE_MOVE_FAILED', 'Check source file exists and target path is writable', { sourcePath, targetPath, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Commit the transaction (cleanup temp files)
     */
    async commitTransaction(transactionId) {
        const operations = this.operations.get(transactionId);
        if (!operations) {
            throw new error_types_1.RollbackError(`Transaction not found: ${transactionId}`, 'TRANSACTION_NOT_FOUND', 'Ensure the transaction was started correctly');
        }
        // Clean up backup files for this transaction
        for (const operation of operations) {
            if (operation.backup && await fs_extra_1.default.pathExists(operation.backup)) {
                try {
                    await fs_extra_1.default.remove(operation.backup);
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to cleanup backup file: ${operation.backup}`);
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
        logger_1.logger.debug(`Committed transaction: ${transactionId}`);
    }
    /**
     * Rollback a transaction
     */
    async rollbackTransaction(transactionId) {
        const operations = this.operations.get(transactionId);
        if (!operations) {
            throw new error_types_1.RollbackError(`Transaction not found: ${transactionId}`, 'TRANSACTION_NOT_FOUND', 'Ensure the transaction was started correctly');
        }
        const completedOperations = [];
        const failedRollbacks = [];
        // Process operations in reverse order
        const reversedOperations = [...operations].reverse();
        for (const operation of reversedOperations) {
            if (!operation.completed) {
                continue; // Skip operations that weren't completed
            }
            try {
                await this.rollbackOperation(operation);
                completedOperations.push(operation.id);
            }
            catch (error) {
                logger_1.logger.error(`Failed to rollback operation ${operation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                failedRollbacks.push(operation.id);
            }
        }
        // Clean up transaction
        this.operations.delete(transactionId);
        if (this.currentTransactionId === transactionId) {
            this.currentTransactionId = undefined;
        }
        if (failedRollbacks.length > 0) {
            throw new error_types_1.RollbackFailedError(`Failed to rollback ${failedRollbacks.length} operations`, completedOperations);
        }
        logger_1.logger.info(`Successfully rolled back transaction: ${transactionId} (${completedOperations.length} operations)`);
    }
    /**
     * Rollback to a specific snapshot
     */
    async rollbackToSnapshot(snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            throw new error_types_1.RollbackError(`Snapshot not found: ${snapshotId}`, 'SNAPSHOT_NOT_FOUND', 'Ensure the snapshot was created correctly');
        }
        const completedOperations = [];
        const failedRollbacks = [];
        // Process operations from the snapshot in reverse order
        const reversedOperations = [...snapshot.operations].reverse();
        for (const operation of reversedOperations) {
            if (!operation.completed) {
                continue;
            }
            try {
                await this.rollbackOperation(operation);
                completedOperations.push(operation.id);
            }
            catch (error) {
                logger_1.logger.error(`Failed to rollback operation ${operation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                failedRollbacks.push(operation.id);
            }
        }
        if (failedRollbacks.length > 0) {
            throw new error_types_1.RollbackFailedError(`Failed to rollback ${failedRollbacks.length} operations from snapshot`, completedOperations);
        }
        logger_1.logger.info(`Successfully rolled back to snapshot: ${snapshotId} (${completedOperations.length} operations)`);
    }
    /**
     * Emergency cleanup - removes all files created in the current transaction
     */
    async emergencyCleanup(projectPath) {
        try {
            if (await fs_extra_1.default.pathExists(projectPath)) {
                const stats = await fs_extra_1.default.stat(projectPath);
                if (stats.isDirectory()) {
                    await fs_extra_1.default.remove(projectPath);
                    logger_1.logger.info(`Emergency cleanup: removed project directory ${projectPath}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Emergency cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new error_types_1.RollbackError('Emergency cleanup failed', 'EMERGENCY_CLEANUP_FAILED', 'Manual cleanup may be required', { projectPath, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Get transaction status
     */
    getTransactionStatus(transactionId) {
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
    getActiveTransactions() {
        return Array.from(this.operations.keys());
    }
    /**
     * List all snapshots
     */
    getSnapshots() {
        return Array.from(this.snapshots.values());
    }
    /**
     * Clean up temp directory
     */
    async cleanupTempDirectory() {
        try {
            if (await fs_extra_1.default.pathExists(this.tempDir)) {
                await fs_extra_1.default.remove(this.tempDir);
                logger_1.logger.debug('Cleaned up temp directory');
            }
        }
        catch (error) {
            logger_1.logger.warn(`Failed to cleanup temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Private helper methods
    addOperation(transactionId, operation) {
        const operations = this.operations.get(transactionId) || [];
        operations.push(operation);
        this.operations.set(transactionId, operations);
    }
    async rollbackOperation(operation) {
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
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }
    async rollbackFileCreation(operation) {
        if (await fs_extra_1.default.pathExists(operation.target)) {
            await fs_extra_1.default.remove(operation.target);
            logger_1.logger.debug(`Rolled back file creation: ${operation.target}`);
        }
    }
    async rollbackDirectoryCreation(operation) {
        if (await fs_extra_1.default.pathExists(operation.target)) {
            const stats = await fs_extra_1.default.stat(operation.target);
            if (stats.isDirectory()) {
                // Only remove if directory is empty
                const contents = await fs_extra_1.default.readdir(operation.target);
                if (contents.length === 0) {
                    await fs_extra_1.default.remove(operation.target);
                    logger_1.logger.debug(`Rolled back directory creation: ${operation.target}`);
                }
                else {
                    logger_1.logger.warn(`Cannot rollback directory ${operation.target}: not empty`);
                }
            }
        }
    }
    async rollbackFileModification(operation) {
        if (operation.backup && await fs_extra_1.default.pathExists(operation.backup)) {
            // Restore from backup
            await fs_extra_1.default.copy(operation.backup, operation.target);
            await fs_extra_1.default.remove(operation.backup);
            logger_1.logger.debug(`Rolled back file modification: ${operation.target}`);
        }
        else {
            // No backup, remove the file
            if (await fs_extra_1.default.pathExists(operation.target)) {
                await fs_extra_1.default.remove(operation.target);
                logger_1.logger.debug(`Rolled back file modification (no backup): ${operation.target}`);
            }
        }
    }
    async rollbackFileCopy(operation) {
        if (await fs_extra_1.default.pathExists(operation.target)) {
            await fs_extra_1.default.remove(operation.target);
            logger_1.logger.debug(`Rolled back file copy: ${operation.target}`);
        }
    }
    async rollbackFileMove(operation) {
        if (operation.backup && await fs_extra_1.default.pathExists(operation.backup)) {
            // Restore original file from backup
            const sourcePath = operation.data;
            await fs_extra_1.default.copy(operation.backup, sourcePath);
            await fs_extra_1.default.remove(operation.backup);
            // Remove the moved file
            if (await fs_extra_1.default.pathExists(operation.target)) {
                await fs_extra_1.default.remove(operation.target);
            }
            logger_1.logger.debug(`Rolled back file move: ${operation.target} -> ${sourcePath}`);
        }
    }
}
exports.RollbackManager = RollbackManager;
//# sourceMappingURL=rollback-manager.js.map