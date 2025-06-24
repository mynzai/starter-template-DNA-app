/**
 * @fileoverview NoSQL Database DNA Module - Epic 5 Story 5 AC2
 * Provides unified interface for MongoDB and DynamoDB with document interface
 */

import { EventEmitter } from 'events';
import { BaseDNAModule } from '../../core/src/lib/dna-module';
import {
  DNAModuleMetadata,
  DNAModuleFile,
  DNAModuleContext,
  SupportedFramework,
  DNAModuleCategory,
  FrameworkSupport
} from '../../core/src/lib/types';

/**
 * Supported NoSQL database types
 */
export enum NoSQLDatabaseType {
  MONGODB = 'mongodb',
  DYNAMODB = 'dynamodb',
  COUCHDB = 'couchdb',
  CASSANDRA = 'cassandra',
  FIRESTORE = 'firestore'
}

/**
 * Query operators
 */
export enum QueryOperator {
  EQ = 'eq',
  NE = 'ne',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  IN = 'in',
  NIN = 'nin',
  EXISTS = 'exists',
  REGEX = 'regex',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith'
}

/**
 * Index types
 */
export enum IndexType {
  SINGLE = 'single',
  COMPOUND = 'compound',
  TEXT = 'text',
  GEO_2D = '2d',
  GEO_2DSPHERE = '2dsphere',
  HASHED = 'hashed',
  TTL = 'ttl'
}

/**
 * Consistency levels
 */
export enum ConsistencyLevel {
  EVENTUAL = 'eventual',
  STRONG = 'strong',
  BOUNDED_STALENESS = 'bounded_staleness',
  SESSION = 'session',
  CONSISTENT_PREFIX = 'consistent_prefix'
}

/**
 * NoSQL module configuration
 */
export interface NoSQLConfig {
  // Database connection
  type: NoSQLDatabaseType;
  connectionString?: string;
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  
  // AWS DynamoDB specific
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  
  // Connection settings
  maxPoolSize: number;
  minPoolSize: number;
  connectionTimeout: number; // milliseconds
  socketTimeout: number; // milliseconds
  serverSelectionTimeout: number; // milliseconds
  
  // Query settings
  defaultLimit: number;
  maxLimit: number;
  defaultConsistency: ConsistencyLevel;
  
  // Schema settings
  enforceSchema: boolean;
  schemaValidation: 'strict' | 'moderate' | 'off';
  autoIndex: boolean;
  
  // Performance
  enableQueryCache: boolean;
  queryCacheTTL: number; // seconds
  enableReadReplica: boolean;
  readPreference: 'primary' | 'secondary' | 'nearest';
  
  // Retry settings
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
  
  // Security
  enableSSL: boolean;
  sslCertificate?: string;
  enableEncryption: boolean;
  encryptionKey?: string;
  
  // Debugging
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Document interface
 */
export interface Document {
  _id?: string | any;
  [key: string]: any;
}

/**
 * Query filter interface
 */
export interface QueryFilter {
  [field: string]: any | {
    [operator: string]: any;
  };
}

/**
 * Query options
 */
export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
  consistency?: ConsistencyLevel;
  includeMetadata?: boolean;
  maxTimeMS?: number;
}

/**
 * Aggregation pipeline stage
 */
export interface AggregationStage {
  [operator: string]: any;
}

/**
 * Update operations
 */
export interface UpdateOperations {
  $set?: Record<string, any>;
  $unset?: Record<string, 1>;
  $inc?: Record<string, number>;
  $push?: Record<string, any>;
  $pull?: Record<string, any>;
  $addToSet?: Record<string, any>;
  $rename?: Record<string, string>;
  $min?: Record<string, any>;
  $max?: Record<string, any>;
  $currentDate?: Record<string, boolean | { $type: 'date' | 'timestamp' }>;
}

/**
 * Bulk operation
 */
export interface BulkOperation {
  type: 'insert' | 'update' | 'delete' | 'replace';
  filter?: QueryFilter;
  document?: Document;
  update?: UpdateOperations;
  upsert?: boolean;
}

/**
 * Collection interface
 */
export interface Collection {
  name: string;
  
  // Basic operations
  find(filter?: QueryFilter, options?: QueryOptions): Promise<Document[]>;
  findOne(filter: QueryFilter, options?: QueryOptions): Promise<Document | null>;
  findById(id: string | any): Promise<Document | null>;
  
  // Write operations
  insertOne(document: Document): Promise<string>;
  insertMany(documents: Document[]): Promise<string[]>;
  updateOne(filter: QueryFilter, update: UpdateOperations, options?: { upsert?: boolean }): Promise<number>;
  updateMany(filter: QueryFilter, update: UpdateOperations, options?: { upsert?: boolean }): Promise<number>;
  replaceOne(filter: QueryFilter, document: Document, options?: { upsert?: boolean }): Promise<number>;
  deleteOne(filter: QueryFilter): Promise<number>;
  deleteMany(filter: QueryFilter): Promise<number>;
  
  // Aggregation
  aggregate(pipeline: AggregationStage[]): Promise<Document[]>;
  
  // Bulk operations
  bulkWrite(operations: BulkOperation[]): Promise<BulkWriteResult>;
  
  // Index management
  createIndex(fields: Record<string, 1 | -1>, options?: IndexOptions): Promise<string>;
  dropIndex(indexName: string): Promise<boolean>;
  listIndexes(): Promise<IndexInfo[]>;
  
  // Collection operations
  count(filter?: QueryFilter): Promise<number>;
  distinct(field: string, filter?: QueryFilter): Promise<any[]>;
  drop(): Promise<boolean>;
}

/**
 * Index options
 */
export interface IndexOptions {
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  background?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: QueryFilter;
  collation?: any;
}

/**
 * Index information
 */
export interface IndexInfo {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
  ttl?: number;
}

/**
 * Bulk write result
 */
export interface BulkWriteResult {
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  upsertedIds: string[];
}

/**
 * Transaction interface
 */
export interface NoSQLTransaction {
  id: string;
  status: 'pending' | 'committed' | 'aborted';
  startTime: Date;
  
  collection(name: string): Collection;
  commit(): Promise<void>;
  abort(): Promise<void>;
}

/**
 * Change stream event
 */
export interface ChangeEvent {
  operationType: 'insert' | 'update' | 'replace' | 'delete';
  documentKey: { _id: any };
  fullDocument?: Document;
  updateDescription?: {
    updatedFields: Record<string, any>;
    removedFields: string[];
  };
  timestamp: Date;
}

/**
 * Database statistics
 */
export interface NoSQLStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageOperationTime: number;
  cacheHits: number;
  cacheMisses: number;
  activeConnections: number;
  documentsProcessed: number;
  bytesTransferred: number;
  lastError?: Error;
}

/**
 * NoSQL Database Module implementation
 */
export class NoSQLModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'nosql-database',
    name: 'NoSQL Database Module',
    version: '1.0.0',
    description: 'Unified interface for MongoDB and DynamoDB with document interface',
    category: DNAModuleCategory.DATABASE,
    tags: ['nosql', 'database', 'mongodb', 'dynamodb', 'document'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.PARTIAL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['web', 'desktop', 'server'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: ['mongodb', 'aws-sdk'],
    devDependencies: ['@types/mongodb', '@types/aws-sdk'],
    peerDependencies: []
  };

  private config: NoSQLConfig;
  private eventEmitter: EventEmitter;
  private client: any = null;
  private database: any = null;
  private collections: Map<string, Collection> = new Map();
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private stats: NoSQLStats;
  private transactions: Map<string, NoSQLTransaction> = new Map();
  private changeStreams: Map<string, any> = new Map();

  constructor(config: NoSQLConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageOperationTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      activeConnections: 0,
      documentsProcessed: 0,
      bytesTransferred: 0
    };
    
    this.validateConfig();
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<boolean> {
    try {
      this.log('info', `Connecting to ${this.config.type} database...`);
      
      // Create connection based on database type
      await this.createConnection();
      
      // Select database
      await this.selectDatabase();
      
      // Create indexes if auto-indexing is enabled
      if (this.config.autoIndex) {
        await this.createDefaultIndexes();
      }
      
      this.eventEmitter.emit('connected');
      this.log('info', 'NoSQL database connected successfully');
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to connect to database', error);
      this.stats.lastError = error as Error;
      return false;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      // Close change streams
      for (const [name, stream] of this.changeStreams) {
        await stream.close();
      }
      this.changeStreams.clear();
      
      // Abort active transactions
      for (const transaction of this.transactions.values()) {
        if (transaction.status === 'pending') {
          await transaction.abort();
        }
      }
      this.transactions.clear();
      
      // Close client connection
      if (this.client) {
        await this.closeConnection();
      }
      
      this.eventEmitter.emit('disconnected');
      this.log('info', 'NoSQL database disconnected');
    } catch (error) {
      this.log('error', 'Error during disconnect', error);
    }
  }

  /**
   * Get collection
   */
  public collection(name: string): Collection {
    let collection = this.collections.get(name);
    
    if (!collection) {
      collection = this.createCollection(name);
      this.collections.set(name, collection);
    }
    
    return collection;
  }

  /**
   * Create collection implementation
   */
  private createCollection(name: string): Collection {
    const self = this;
    
    return {
      name,
      
      async find(filter: QueryFilter = {}, options: QueryOptions = {}) {
        return self.executeFind(name, filter, options);
      },
      
      async findOne(filter: QueryFilter, options: QueryOptions = {}) {
        const results = await this.find(filter, { ...options, limit: 1 });
        return results[0] || null;
      },
      
      async findById(id: string | any) {
        return this.findOne({ _id: id });
      },
      
      async insertOne(document: Document) {
        return self.executeInsertOne(name, document);
      },
      
      async insertMany(documents: Document[]) {
        return self.executeInsertMany(name, documents);
      },
      
      async updateOne(filter: QueryFilter, update: UpdateOperations, options = {}) {
        return self.executeUpdateOne(name, filter, update, options);
      },
      
      async updateMany(filter: QueryFilter, update: UpdateOperations, options = {}) {
        return self.executeUpdateMany(name, filter, update, options);
      },
      
      async replaceOne(filter: QueryFilter, document: Document, options = {}) {
        return self.executeReplaceOne(name, filter, document, options);
      },
      
      async deleteOne(filter: QueryFilter) {
        return self.executeDeleteOne(name, filter);
      },
      
      async deleteMany(filter: QueryFilter) {
        return self.executeDeleteMany(name, filter);
      },
      
      async aggregate(pipeline: AggregationStage[]) {
        return self.executeAggregate(name, pipeline);
      },
      
      async bulkWrite(operations: BulkOperation[]) {
        return self.executeBulkWrite(name, operations);
      },
      
      async createIndex(fields: Record<string, 1 | -1>, options = {}) {
        return self.executeCreateIndex(name, fields, options);
      },
      
      async dropIndex(indexName: string) {
        return self.executeDropIndex(name, indexName);
      },
      
      async listIndexes() {
        return self.executeListIndexes(name);
      },
      
      async count(filter: QueryFilter = {}) {
        return self.executeCount(name, filter);
      },
      
      async distinct(field: string, filter: QueryFilter = {}) {
        return self.executeDistinct(name, field, filter);
      },
      
      async drop() {
        return self.executeDropCollection(name);
      }
    };
  }

  /**
   * Begin transaction
   */
  public async beginTransaction(): Promise<NoSQLTransaction> {
    if (this.config.type !== NoSQLDatabaseType.MONGODB) {
      throw new Error('Transactions are only supported in MongoDB');
    }
    
    const transaction: NoSQLTransaction = {
      id: this.generateTransactionId(),
      status: 'pending',
      startTime: new Date(),
      
      collection: (name: string) => {
        // Return transaction-aware collection
        return this.createTransactionCollection(name, transaction);
      },
      
      commit: async () => {
        // Commit transaction logic
        transaction.status = 'committed';
        this.transactions.delete(transaction.id);
        this.eventEmitter.emit('transaction:committed', transaction);
      },
      
      abort: async () => {
        // Abort transaction logic
        transaction.status = 'aborted';
        this.transactions.delete(transaction.id);
        this.eventEmitter.emit('transaction:aborted', transaction);
      }
    };
    
    this.transactions.set(transaction.id, transaction);
    this.eventEmitter.emit('transaction:started', transaction);
    
    return transaction;
  }

  /**
   * Watch collection for changes
   */
  public watch(collectionName: string, pipeline?: any[]): EventEmitter {
    const changeStream = new EventEmitter();
    
    // In production, this would create actual change streams
    // For now, returning event emitter for interface
    this.changeStreams.set(collectionName, changeStream);
    
    this.eventEmitter.emit('changestream:created', { collection: collectionName });
    
    return changeStream;
  }

  /**
   * Get database statistics
   */
  public getStats(): NoSQLStats {
    return { ...this.stats };
  }

  /**
   * Clear query cache
   */
  public clearCache(): void {
    this.queryCache.clear();
    this.log('info', 'Query cache cleared');
  }

  /**
   * Execute find operation
   */
  private async executeFind(
    collection: string,
    filter: QueryFilter,
    options: QueryOptions
  ): Promise<Document[]> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      // Check cache if enabled
      if (this.config.enableQueryCache) {
        const cacheKey = this.generateCacheKey('find', collection, filter, options);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          return cached;
        }
        this.stats.cacheMisses++;
      }
      
      // Execute query based on database type
      let results: Document[] = [];
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          results = await this.executeMongoFind(collection, filter, options);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          results = await this.executeDynamoQuery(collection, filter, options);
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      this.stats.documentsProcessed += results.length;
      
      // Cache results if applicable
      if (this.config.enableQueryCache) {
        const cacheKey = this.generateCacheKey('find', collection, filter, options);
        this.addToCache(cacheKey, results);
      }
      
      this.eventEmitter.emit('operation:find', { collection, filter, options, results, duration });
      
      return results;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Find operation failed', { collection, filter, error });
      throw error;
    }
  }

  /**
   * Execute insert one operation
   */
  private async executeInsertOne(collection: string, document: Document): Promise<string> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      // Generate ID if not provided
      if (!document._id) {
        document._id = this.generateDocumentId();
      }
      
      // Add timestamps
      document.createdAt = new Date();
      document.updatedAt = new Date();
      
      // Execute insert based on database type
      let insertedId: string;
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          insertedId = await this.executeMongoInsertOne(collection, document);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          insertedId = await this.executeDynamoPutItem(collection, document);
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      this.stats.documentsProcessed++;
      
      this.eventEmitter.emit('operation:insert', { collection, document, insertedId, duration });
      
      return insertedId;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Insert operation failed', { collection, error });
      throw error;
    }
  }

  /**
   * Execute insert many operation
   */
  private async executeInsertMany(collection: string, documents: Document[]): Promise<string[]> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      // Prepare documents
      const preparedDocs = documents.map(doc => ({
        ...doc,
        _id: doc._id || this.generateDocumentId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // Execute bulk insert
      let insertedIds: string[] = [];
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          insertedIds = await this.executeMongoInsertMany(collection, preparedDocs);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          insertedIds = await this.executeDynamoBatchWrite(collection, preparedDocs);
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      this.stats.documentsProcessed += documents.length;
      
      this.eventEmitter.emit('operation:insertMany', { collection, count: documents.length, duration });
      
      return insertedIds;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Insert many operation failed', { collection, error });
      throw error;
    }
  }

  /**
   * Execute update one operation
   */
  private async executeUpdateOne(
    collection: string,
    filter: QueryFilter,
    update: UpdateOperations,
    options: any
  ): Promise<number> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      // Add update timestamp
      if (!update.$set) update.$set = {};
      update.$set.updatedAt = new Date();
      
      // Execute update
      let modifiedCount: number = 0;
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          modifiedCount = await this.executeMongoUpdateOne(collection, filter, update, options);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          modifiedCount = await this.executeDynamoUpdateItem(collection, filter, update, options);
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      
      // Clear cache for this collection
      this.clearCollectionCache(collection);
      
      this.eventEmitter.emit('operation:update', { collection, filter, update, modifiedCount, duration });
      
      return modifiedCount;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Update operation failed', { collection, filter, error });
      throw error;
    }
  }

  /**
   * Execute update many operation
   */
  private async executeUpdateMany(
    collection: string,
    filter: QueryFilter,
    update: UpdateOperations,
    options: any
  ): Promise<number> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      // Add update timestamp
      if (!update.$set) update.$set = {};
      update.$set.updatedAt = new Date();
      
      // Execute update
      let modifiedCount: number = 0;
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          modifiedCount = await this.executeMongoUpdateMany(collection, filter, update, options);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          // DynamoDB doesn't support update many directly, need to query then update
          const items = await this.executeDynamoQuery(collection, filter, {});
          for (const item of items) {
            await this.executeDynamoUpdateItem(collection, { _id: item._id }, update, options);
            modifiedCount++;
          }
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      
      // Clear cache for this collection
      this.clearCollectionCache(collection);
      
      this.eventEmitter.emit('operation:updateMany', { collection, filter, update, modifiedCount, duration });
      
      return modifiedCount;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Update many operation failed', { collection, filter, error });
      throw error;
    }
  }

  /**
   * Execute replace one operation
   */
  private async executeReplaceOne(
    collection: string,
    filter: QueryFilter,
    document: Document,
    options: any
  ): Promise<number> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      // Preserve original ID and timestamps
      const existing = await this.executeFind(collection, filter, { limit: 1 });
      if (existing.length > 0) {
        document._id = existing[0]._id;
        document.createdAt = existing[0].createdAt;
      }
      document.updatedAt = new Date();
      
      // Execute replace
      let modifiedCount: number = 0;
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          modifiedCount = await this.executeMongoReplaceOne(collection, filter, document, options);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          modifiedCount = await this.executeDynamoPutItem(collection, document) ? 1 : 0;
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      
      // Clear cache for this collection
      this.clearCollectionCache(collection);
      
      this.eventEmitter.emit('operation:replace', { collection, filter, document, modifiedCount, duration });
      
      return modifiedCount;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Replace operation failed', { collection, filter, error });
      throw error;
    }
  }

  /**
   * Execute delete one operation
   */
  private async executeDeleteOne(collection: string, filter: QueryFilter): Promise<number> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      let deletedCount: number = 0;
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          deletedCount = await this.executeMongoDeleteOne(collection, filter);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          const item = await this.executeDynamoQuery(collection, filter, { limit: 1 });
          if (item.length > 0) {
            await this.executeDynamoDeleteItem(collection, item[0]._id);
            deletedCount = 1;
          }
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      
      // Clear cache for this collection
      this.clearCollectionCache(collection);
      
      this.eventEmitter.emit('operation:delete', { collection, filter, deletedCount, duration });
      
      return deletedCount;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Delete operation failed', { collection, filter, error });
      throw error;
    }
  }

  /**
   * Execute delete many operation
   */
  private async executeDeleteMany(collection: string, filter: QueryFilter): Promise<number> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      let deletedCount: number = 0;
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          deletedCount = await this.executeMongoDeleteMany(collection, filter);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          // DynamoDB doesn't support delete many directly
          const items = await this.executeDynamoQuery(collection, filter, {});
          for (const item of items) {
            await this.executeDynamoDeleteItem(collection, item._id);
            deletedCount++;
          }
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      
      // Clear cache for this collection
      this.clearCollectionCache(collection);
      
      this.eventEmitter.emit('operation:deleteMany', { collection, filter, deletedCount, duration });
      
      return deletedCount;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Delete many operation failed', { collection, filter, error });
      throw error;
    }
  }

  /**
   * Execute aggregation pipeline
   */
  private async executeAggregate(collection: string, pipeline: AggregationStage[]): Promise<Document[]> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      let results: Document[] = [];
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          results = await this.executeMongoAggregate(collection, pipeline);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          throw new Error('Aggregation is not supported in DynamoDB');
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      this.stats.documentsProcessed += results.length;
      
      this.eventEmitter.emit('operation:aggregate', { collection, pipeline, results, duration });
      
      return results;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Aggregation failed', { collection, pipeline, error });
      throw error;
    }
  }

  /**
   * Execute bulk write operations
   */
  private async executeBulkWrite(collection: string, operations: BulkOperation[]): Promise<BulkWriteResult> {
    const startTime = Date.now();
    this.stats.totalOperations++;
    
    try {
      const result: BulkWriteResult = {
        insertedCount: 0,
        matchedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        upsertedCount: 0,
        upsertedIds: []
      };
      
      // Process operations
      for (const op of operations) {
        switch (op.type) {
          case 'insert':
            if (op.document) {
              const id = await this.executeInsertOne(collection, op.document);
              result.insertedCount++;
              result.upsertedIds.push(id);
            }
            break;
            
          case 'update':
            if (op.filter && op.update) {
              const count = await this.executeUpdateMany(collection, op.filter, op.update, { upsert: op.upsert });
              result.modifiedCount += count;
            }
            break;
            
          case 'delete':
            if (op.filter) {
              const count = await this.executeDeleteMany(collection, op.filter);
              result.deletedCount += count;
            }
            break;
            
          case 'replace':
            if (op.filter && op.document) {
              const count = await this.executeReplaceOne(collection, op.filter, op.document, { upsert: op.upsert });
              result.modifiedCount += count;
            }
            break;
        }
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateOperationStats(duration, true);
      
      this.eventEmitter.emit('operation:bulkWrite', { collection, operations: operations.length, result, duration });
      
      return result;
    } catch (error) {
      this.stats.failedOperations++;
      this.stats.lastError = error as Error;
      this.log('error', 'Bulk write failed', { collection, error });
      throw error;
    }
  }

  /**
   * Execute create index
   */
  private async executeCreateIndex(
    collection: string,
    fields: Record<string, 1 | -1>,
    options: IndexOptions
  ): Promise<string> {
    try {
      const indexName = options.name || this.generateIndexName(fields);
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          await this.executeMongoCreateIndex(collection, fields, options);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          // DynamoDB indexes are created at table creation time
          this.log('warn', 'DynamoDB indexes must be created when creating the table');
          break;
      }
      
      this.eventEmitter.emit('index:created', { collection, indexName, fields });
      return indexName;
      
    } catch (error) {
      this.log('error', 'Create index failed', { collection, fields, error });
      throw error;
    }
  }

  /**
   * Execute drop index
   */
  private async executeDropIndex(collection: string, indexName: string): Promise<boolean> {
    try {
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          await this.executeMongoDropIndex(collection, indexName);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          this.log('warn', 'DynamoDB indexes cannot be dropped');
          return false;
      }
      
      this.eventEmitter.emit('index:dropped', { collection, indexName });
      return true;
      
    } catch (error) {
      this.log('error', 'Drop index failed', { collection, indexName, error });
      throw error;
    }
  }

  /**
   * Execute list indexes
   */
  private async executeListIndexes(collection: string): Promise<IndexInfo[]> {
    try {
      let indexes: IndexInfo[] = [];
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          indexes = await this.executeMongoListIndexes(collection);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          indexes = await this.executeDynamoDescribeTable(collection);
          break;
      }
      
      return indexes;
    } catch (error) {
      this.log('error', 'List indexes failed', { collection, error });
      throw error;
    }
  }

  /**
   * Execute count operation
   */
  private async executeCount(collection: string, filter: QueryFilter): Promise<number> {
    try {
      let count: number = 0;
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          count = await this.executeMongoCount(collection, filter);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          // DynamoDB doesn't have efficient count, need to scan
          const items = await this.executeDynamoQuery(collection, filter, {});
          count = items.length;
          break;
      }
      
      return count;
    } catch (error) {
      this.log('error', 'Count operation failed', { collection, filter, error });
      throw error;
    }
  }

  /**
   * Execute distinct operation
   */
  private async executeDistinct(collection: string, field: string, filter: QueryFilter): Promise<any[]> {
    try {
      let values: any[] = [];
      
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          values = await this.executeMongoDistinct(collection, field, filter);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          // DynamoDB doesn't have distinct, need to query and extract unique values
          const items = await this.executeDynamoQuery(collection, filter, {});
          const uniqueValues = new Set(items.map(item => item[field]));
          values = Array.from(uniqueValues);
          break;
      }
      
      return values;
    } catch (error) {
      this.log('error', 'Distinct operation failed', { collection, field, filter, error });
      throw error;
    }
  }

  /**
   * Execute drop collection
   */
  private async executeDropCollection(collection: string): Promise<boolean> {
    try {
      switch (this.config.type) {
        case NoSQLDatabaseType.MONGODB:
          await this.executeMongoDropCollection(collection);
          break;
        case NoSQLDatabaseType.DYNAMODB:
          await this.executeDynamoDeleteTable(collection);
          break;
      }
      
      // Remove from collections map
      this.collections.delete(collection);
      
      // Clear cache for this collection
      this.clearCollectionCache(collection);
      
      this.eventEmitter.emit('collection:dropped', { collection });
      return true;
      
    } catch (error) {
      this.log('error', 'Drop collection failed', { collection, error });
      throw error;
    }
  }

  /**
   * Create connection based on database type
   */
  private async createConnection(): Promise<void> {
    // In production, this would use the actual database drivers
    switch (this.config.type) {
      case NoSQLDatabaseType.MONGODB:
        this.log('debug', 'Creating MongoDB connection');
        // this.client = new MongoClient(connectionString);
        break;
      case NoSQLDatabaseType.DYNAMODB:
        this.log('debug', 'Creating DynamoDB connection');
        // this.client = new AWS.DynamoDB.DocumentClient(config);
        break;
      default:
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }
  }

  /**
   * Select database
   */
  private async selectDatabase(): Promise<void> {
    // In production, select actual database
    this.database = { name: this.config.database };
  }

  /**
   * Close connection
   */
  private async closeConnection(): Promise<void> {
    if (this.client) {
      // Close actual connection
      this.client = null;
    }
  }

  /**
   * Create default indexes
   */
  private async createDefaultIndexes(): Promise<void> {
    // Create common indexes like _id, createdAt, updatedAt
    for (const collection of this.collections.values()) {
      try {
        await this.executeCreateIndex(collection.name, { createdAt: -1 }, { background: true });
        await this.executeCreateIndex(collection.name, { updatedAt: -1 }, { background: true });
      } catch (error) {
        this.log('warn', `Failed to create default indexes for ${collection.name}`, error);
      }
    }
  }

  /**
   * Create transaction collection
   */
  private createTransactionCollection(name: string, transaction: NoSQLTransaction): Collection {
    // Return collection that executes operations within transaction context
    const collection = this.createCollection(name);
    // Wrap methods to use transaction
    return collection;
  }

  /**
   * MongoDB-specific operations (mocked)
   */
  private async executeMongoFind(collection: string, filter: QueryFilter, options: QueryOptions): Promise<Document[]> {
    // Mock implementation
    return [];
  }

  private async executeMongoInsertOne(collection: string, document: Document): Promise<string> {
    return document._id || this.generateDocumentId();
  }

  private async executeMongoInsertMany(collection: string, documents: Document[]): Promise<string[]> {
    return documents.map(doc => doc._id || this.generateDocumentId());
  }

  private async executeMongoUpdateOne(collection: string, filter: QueryFilter, update: UpdateOperations, options: any): Promise<number> {
    return 1;
  }

  private async executeMongoUpdateMany(collection: string, filter: QueryFilter, update: UpdateOperations, options: any): Promise<number> {
    return 0;
  }

  private async executeMongoReplaceOne(collection: string, filter: QueryFilter, document: Document, options: any): Promise<number> {
    return 1;
  }

  private async executeMongoDeleteOne(collection: string, filter: QueryFilter): Promise<number> {
    return 1;
  }

  private async executeMongoDeleteMany(collection: string, filter: QueryFilter): Promise<number> {
    return 0;
  }

  private async executeMongoAggregate(collection: string, pipeline: AggregationStage[]): Promise<Document[]> {
    return [];
  }

  private async executeMongoCreateIndex(collection: string, fields: Record<string, 1 | -1>, options: IndexOptions): Promise<void> {
    // Mock implementation
  }

  private async executeMongoDropIndex(collection: string, indexName: string): Promise<void> {
    // Mock implementation
  }

  private async executeMongoListIndexes(collection: string): Promise<IndexInfo[]> {
    return [];
  }

  private async executeMongoCount(collection: string, filter: QueryFilter): Promise<number> {
    return 0;
  }

  private async executeMongoDistinct(collection: string, field: string, filter: QueryFilter): Promise<any[]> {
    return [];
  }

  private async executeMongoDropCollection(collection: string): Promise<void> {
    // Mock implementation
  }

  /**
   * DynamoDB-specific operations (mocked)
   */
  private async executeDynamoQuery(collection: string, filter: QueryFilter, options: QueryOptions): Promise<Document[]> {
    // Mock implementation
    return [];
  }

  private async executeDynamoPutItem(collection: string, document: Document): Promise<string> {
    return document._id || this.generateDocumentId();
  }

  private async executeDynamoBatchWrite(collection: string, documents: Document[]): Promise<string[]> {
    return documents.map(doc => doc._id || this.generateDocumentId());
  }

  private async executeDynamoUpdateItem(collection: string, filter: QueryFilter, update: UpdateOperations, options: any): Promise<number> {
    return 1;
  }

  private async executeDynamoDeleteItem(collection: string, id: string): Promise<void> {
    // Mock implementation
  }

  private async executeDynamoDescribeTable(collection: string): Promise<IndexInfo[]> {
    return [];
  }

  private async executeDynamoDeleteTable(collection: string): Promise<void> {
    // Mock implementation
  }

  /**
   * Update operation statistics
   */
  private updateOperationStats(duration: number, success: boolean): void {
    if (success) {
      this.stats.successfulOperations++;
      
      // Update average operation time
      const totalTime = this.stats.averageOperationTime * (this.stats.successfulOperations - 1) + duration;
      this.stats.averageOperationTime = totalTime / this.stats.successfulOperations;
    } else {
      this.stats.failedOperations++;
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(operation: string, collection: string, ...args: any[]): string {
    const key = `${operation}:${collection}:${JSON.stringify(args)}`;
    return btoa(key);
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.config.queryCacheTTL * 1000) {
        return cached.result;
      }
      
      // Expired, remove from cache
      this.queryCache.delete(key);
    }
    
    return null;
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, result: any): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    // Implement cache size limit
    if (this.queryCache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < 100; i++) {
        this.queryCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear collection cache
   */
  private clearCollectionCache(collection: string): void {
    for (const [key] of this.queryCache) {
      if (key.includes(`:${collection}:`)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Generate document ID
   */
  private generateDocumentId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `nosql_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate index name
   */
  private generateIndexName(fields: Record<string, 1 | -1>): string {
    const fieldNames = Object.keys(fields).join('_');
    return `idx_${fieldNames}_${Date.now()}`;
  }

  /**
   * Log message with level
   */
  private log(level: string, message: string, data?: any): void {
    if (!this.config.enableLogging) return;
    
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevel = logLevels.indexOf(this.config.logLevel);
    const currentLevel = logLevels.indexOf(level);
    
    if (currentLevel >= configLevel) {
      console[level as keyof Console](`[NoSQL] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.database) {
      throw new Error('Database name is required');
    }
    
    if (this.config.minPoolSize > this.config.maxPoolSize) {
      throw new Error('Min pool size cannot be greater than max pool size');
    }
  }

  /**
   * Get generated files for the NoSQL module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core NoSQL types
    files.push({
      path: 'src/lib/database/nosql/types.ts',
      content: this.generateNoSQLTypes(),
      type: 'typescript'
    });

    // NoSQL service
    files.push({
      path: 'src/lib/database/nosql/service.ts',
      content: this.generateNoSQLService(context),
      type: 'typescript'
    });

    // Query builder
    files.push({
      path: 'src/lib/database/nosql/query-builder.ts',
      content: this.generateQueryBuilder(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate NoSQL types file
   */
  private generateNoSQLTypes(): string {
    return `// Generated NoSQL types - Epic 5 Story 5 AC2
export * from './types/nosql-types';
export * from './types/document-types';
export * from './types/query-types';
`;
  }

  /**
   * Generate NoSQL service file
   */
  private generateNoSQLService(context: DNAModuleContext): string {
    return `// Generated NoSQL Service - Epic 5 Story 5 AC2
import { NoSQLModule } from './nosql-module';

export class NoSQLService extends NoSQLModule {
  // NoSQL service for ${context.framework}
}
`;
  }

  /**
   * Generate query builder file
   */
  private generateQueryBuilder(context: DNAModuleContext): string {
    return `// Generated NoSQL Query Builder - Epic 5 Story 5 AC2
export class NoSQLQueryBuilder {
  // Query builder for ${context.framework}
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/lib/database/nosql/mongoose-models.ts',
        content: `// Mongoose models for Next.js
import mongoose from 'mongoose';

// Define your models here
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for NoSQL events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  public emit(event: string, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args);
  }
}

/**
 * Default NoSQL configuration
 */
export const defaultNoSQLConfig: NoSQLConfig = {
  type: NoSQLDatabaseType.MONGODB,
  connectionString: 'mongodb://localhost:27017',
  database: 'myapp',
  maxPoolSize: 10,
  minPoolSize: 2,
  connectionTimeout: 10000,
  socketTimeout: 30000,
  serverSelectionTimeout: 5000,
  defaultLimit: 100,
  maxLimit: 1000,
  defaultConsistency: ConsistencyLevel.SESSION,
  enforceSchema: false,
  schemaValidation: 'moderate',
  autoIndex: true,
  enableQueryCache: true,
  queryCacheTTL: 60,
  enableReadReplica: false,
  readPreference: 'primary',
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableSSL: false,
  enableEncryption: false,
  enableLogging: true,
  logLevel: 'info'
};

export default NoSQLModule;