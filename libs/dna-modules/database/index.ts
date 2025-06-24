/**
 * @fileoverview Database & Storage DNA Modules - Epic 5 Story 5
 * Complete database solution with SQL, NoSQL, Cache, File Storage, and Migration/Backup tools
 */

// SQL Database Module - AC1
export { SQLModule, defaultSQLConfig } from './sql-module';
export type {
  SQLConfig,
  SQLDatabaseType,
  QueryBuilder,
  QueryResult,
  Transaction,
  ModelDefinition,
  Migration as SQLMigration
} from './sql-module';

// NoSQL Database Module - AC2
export { NoSQLModule, defaultNoSQLConfig } from './nosql-module';
export type {
  NoSQLConfig,
  NoSQLDatabaseType,
  Document,
  QueryFilter,
  Collection,
  NoSQLTransaction,
  ChangeEvent
} from './nosql-module';

// Cache Module - AC3
export { CacheModule, defaultCacheConfig } from './cache-module';
export type {
  CacheConfig,
  CacheType,
  CacheEntry,
  CacheStats,
  ListOperations,
  SetOperations,
  HashOperations,
  SortedSetOperations
} from './cache-module';

// File Storage Module - AC4
export { FileStorageModule, defaultFileStorageConfig } from './file-storage-module';
export type {
  FileStorageConfig,
  StorageProvider,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  UploadProgress,
  DownloadProgress,
  PresignedUrlOptions
} from './file-storage-module';

// Migration & Backup Module - AC5
export { MigrationBackupModule, defaultMigrationConfig } from './migration-backup-module';
export type {
  MigrationConfig,
  Migration,
  MigrationType,
  BackupConfig,
  BackupType,
  MigrationResult,
  BackupResult,
  DatabaseType as MigrationDatabaseType
} from './migration-backup-module';

/**
 * Database DNA Module Factory
 * Provides unified access to all database functionality
 */
export class DatabaseDNAFactory {
  /**
   * Create SQL database module
   */
  static createSQL(config: any) {
    return new SQLModule(config);
  }

  /**
   * Create NoSQL database module
   */
  static createNoSQL(config: any) {
    return new NoSQLModule(config);
  }

  /**
   * Create cache module
   */
  static createCache(config: any) {
    return new CacheModule(config);
  }

  /**
   * Create file storage module
   */
  static createFileStorage(config: any) {
    return new FileStorageModule(config);
  }

  /**
   * Create migration & backup module
   */
  static createMigrationBackup(config: any) {
    return new MigrationBackupModule(config);
  }

  /**
   * Create complete database stack
   */
  static createDatabaseStack(configs: {
    sql?: any;
    nosql?: any;
    cache?: any;
    storage?: any;
    migration?: any;
  }) {
    return {
      sql: configs.sql ? this.createSQL(configs.sql) : null,
      nosql: configs.nosql ? this.createNoSQL(configs.nosql) : null,
      cache: configs.cache ? this.createCache(configs.cache) : null,
      storage: configs.storage ? this.createFileStorage(configs.storage) : null,
      migration: configs.migration ? this.createMigrationBackup(configs.migration) : null
    };
  }
}

/**
 * Default database configurations for quick setup
 */
export const defaultDatabaseConfigs = {
  sql: defaultSQLConfig,
  nosql: defaultNoSQLConfig,
  cache: defaultCacheConfig,
  storage: defaultFileStorageConfig,
  migration: defaultMigrationConfig
};

export default DatabaseDNAFactory;