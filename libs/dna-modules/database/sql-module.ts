/**
 * @fileoverview SQL Database DNA Module - Epic 5 Story 5 AC1
 * Provides unified interface for PostgreSQL, MySQL, and SQLite with ORM abstraction
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
 * Supported SQL database types
 */
export enum SQLDatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
  MARIADB = 'mariadb',
  MSSQL = 'mssql'
}

/**
 * Query builder types
 */
export enum QueryType {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  CREATE = 'create',
  ALTER = 'alter',
  DROP = 'drop',
  TRUNCATE = 'truncate',
  RAW = 'raw'
}

/**
 * Transaction isolation levels
 */
export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE'
}

/**
 * Migration direction
 */
export enum MigrationDirection {
  UP = 'up',
  DOWN = 'down'
}

/**
 * SQL module configuration
 */
export interface SQLConfig {
  // Database connection
  type: SQLDatabaseType;
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  filename?: string; // For SQLite
  
  // Connection pool settings
  poolMin: number;
  poolMax: number;
  acquireTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  connectionTimeout: number; // milliseconds
  
  // Query settings
  enableQueryLogging: boolean;
  slowQueryThreshold: number; // milliseconds
  defaultLimit: number;
  maxLimit: number;
  
  // ORM settings
  enableORM: boolean;
  modelDirectory?: string;
  enableTimestamps: boolean;
  timestampFields: {
    created: string;
    updated: string;
    deleted?: string;
  };
  
  // Migration settings
  enableMigrations: boolean;
  migrationsDirectory: string;
  migrationsTable: string;
  
  // Performance
  enableQueryCache: boolean;
  queryCacheTTL: number; // seconds
  enablePreparedStatements: boolean;
  
  // Security
  enableSSL: boolean;
  sslConfig?: {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
  
  // Debugging
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  id: string;
  type: SQLDatabaseType;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: Date;
  lastQuery?: Date;
  activeQueries: number;
  poolSize: number;
}

/**
 * Query builder interface
 */
export interface QueryBuilder {
  select(...columns: string[]): QueryBuilder;
  from(table: string, alias?: string): QueryBuilder;
  join(table: string, condition: string): QueryBuilder;
  leftJoin(table: string, condition: string): QueryBuilder;
  rightJoin(table: string, condition: string): QueryBuilder;
  where(column: string, operator: string, value: any): QueryBuilder;
  whereIn(column: string, values: any[]): QueryBuilder;
  whereNull(column: string): QueryBuilder;
  whereNotNull(column: string): QueryBuilder;
  whereBetween(column: string, min: any, max: any): QueryBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  groupBy(...columns: string[]): QueryBuilder;
  having(column: string, operator: string, value: any): QueryBuilder;
  limit(limit: number): QueryBuilder;
  offset(offset: number): QueryBuilder;
  build(): string;
  execute(): Promise<QueryResult>;
}

/**
 * Query result interface
 */
export interface QueryResult {
  rows: any[];
  fields: FieldInfo[];
  rowCount: number;
  command: string;
  duration: number;
  cached: boolean;
}

/**
 * Field information
 */
export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
  autoIncrement: boolean;
  defaultValue?: any;
}

/**
 * Transaction interface
 */
export interface Transaction {
  id: string;
  isolationLevel: IsolationLevel;
  status: 'pending' | 'committed' | 'rolled_back';
  startTime: Date;
  
  query(sql: string, params?: any[]): Promise<QueryResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  savepoint(name: string): Promise<void>;
  releaseSavepoint(name: string): Promise<void>;
  rollbackToSavepoint(name: string): Promise<void>;
}

/**
 * Model definition interface
 */
export interface ModelDefinition {
  tableName: string;
  primaryKey: string;
  fields: Record<string, FieldDefinition>;
  indexes?: IndexDefinition[];
  relations?: RelationDefinition[];
  hooks?: ModelHooks;
}

/**
 * Field definition
 */
export interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text' | 'binary';
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: any;
  length?: number;
  precision?: number;
  scale?: number;
  enum?: string[];
  validate?: (value: any) => boolean | string;
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name: string;
  fields: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

/**
 * Relation definition
 */
export interface RelationDefinition {
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
  model: string;
  foreignKey?: string;
  through?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

/**
 * Model hooks
 */
export interface ModelHooks {
  beforeCreate?: (instance: any) => Promise<void>;
  afterCreate?: (instance: any) => Promise<void>;
  beforeUpdate?: (instance: any) => Promise<void>;
  afterUpdate?: (instance: any) => Promise<void>;
  beforeDelete?: (instance: any) => Promise<void>;
  afterDelete?: (instance: any) => Promise<void>;
  beforeValidate?: (instance: any) => Promise<void>;
  afterValidate?: (instance: any) => Promise<void>;
}

/**
 * Migration interface
 */
export interface Migration {
  version: string;
  name: string;
  timestamp: Date;
  up: (db: SQLModule) => Promise<void>;
  down: (db: SQLModule) => Promise<void>;
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHits: number;
  cacheMisses: number;
  activeConnections: number;
  poolUtilization: number;
  lastError?: Error;
}

/**
 * SQL Database Module implementation
 */
export class SQLModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'sql-database',
    name: 'SQL Database Module',
    version: '1.0.0',
    description: 'Unified interface for PostgreSQL, MySQL, and SQLite with ORM abstraction',
    category: DNAModuleCategory.DATABASE,
    tags: ['sql', 'database', 'postgresql', 'mysql', 'sqlite', 'orm'],
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
    dependencies: ['knex', 'pg', 'mysql2', 'sqlite3'],
    devDependencies: ['@types/knex'],
    peerDependencies: []
  };

  private config: SQLConfig;
  private eventEmitter: EventEmitter;
  private connection: DatabaseConnection | null = null;
  private connectionPool: any = null;
  private models: Map<string, ModelDefinition> = new Map();
  private migrations: Map<string, Migration> = new Map();
  private queryCache: Map<string, { result: QueryResult; timestamp: number }> = new Map();
  private stats: DatabaseStats;
  private transactionStack: Transaction[] = [];

  constructor(config: SQLConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      activeConnections: 0,
      poolUtilization: 0
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
      
      // Initialize connection pool
      await this.initializePool();
      
      // Run migrations if enabled
      if (this.config.enableMigrations) {
        await this.runPendingMigrations();
      }
      
      this.connection = {
        id: this.generateConnectionId(),
        type: this.config.type,
        status: 'connected',
        createdAt: new Date(),
        activeQueries: 0,
        poolSize: this.config.poolMax
      };
      
      this.eventEmitter.emit('connected', this.connection);
      this.log('info', 'Database connected successfully');
      
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
      // Close all active transactions
      for (const transaction of this.transactionStack) {
        await transaction.rollback();
      }
      
      // Close connection pool
      if (this.connectionPool) {
        await this.destroyPool();
      }
      
      if (this.connection) {
        this.connection.status = 'disconnected';
      }
      
      this.eventEmitter.emit('disconnected');
      this.log('info', 'Database disconnected');
    } catch (error) {
      this.log('error', 'Error during disconnect', error);
    }
  }

  /**
   * Execute raw SQL query
   */
  public async query(sql: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    this.stats.totalQueries++;
    
    try {
      // Check cache if enabled
      if (this.config.enableQueryCache && sql.toLowerCase().startsWith('select')) {
        const cacheKey = this.generateCacheKey(sql, params);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          return cached;
        }
        this.stats.cacheMisses++;
      }
      
      // Execute query
      const result = await this.executeQuery(sql, params);
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updateQueryStats(duration, true);
      
      // Log slow queries
      if (duration > this.config.slowQueryThreshold) {
        this.stats.slowQueries++;
        this.log('warn', `Slow query detected (${duration}ms)`, { sql, params });
      }
      
      // Cache result if applicable
      if (this.config.enableQueryCache && sql.toLowerCase().startsWith('select')) {
        const cacheKey = this.generateCacheKey(sql, params);
        this.addToCache(cacheKey, result);
      }
      
      this.eventEmitter.emit('query:executed', { sql, params, result, duration });
      
      return result;
    } catch (error) {
      this.stats.failedQueries++;
      this.stats.lastError = error as Error;
      this.log('error', 'Query execution failed', { sql, params, error });
      throw error;
    }
  }

  /**
   * Create query builder
   */
  public createQueryBuilder(): QueryBuilder {
    const self = this;
    const query: any = {
      type: QueryType.SELECT,
      table: '',
      columns: ['*'],
      joins: [],
      conditions: [],
      groupByColumns: [],
      havingConditions: [],
      orderByColumns: [],
      limitValue: this.config.defaultLimit,
      offsetValue: 0
    };

    const builder: QueryBuilder = {
      select(...columns: string[]) {
        query.columns = columns.length > 0 ? columns : ['*'];
        return this;
      },

      from(table: string, alias?: string) {
        query.table = alias ? `${table} AS ${alias}` : table;
        return this;
      },

      join(table: string, condition: string) {
        query.joins.push({ type: 'INNER', table, condition });
        return this;
      },

      leftJoin(table: string, condition: string) {
        query.joins.push({ type: 'LEFT', table, condition });
        return this;
      },

      rightJoin(table: string, condition: string) {
        query.joins.push({ type: 'RIGHT', table, condition });
        return this;
      },

      where(column: string, operator: string, value: any) {
        query.conditions.push({ column, operator, value, type: 'AND' });
        return this;
      },

      whereIn(column: string, values: any[]) {
        query.conditions.push({ column, operator: 'IN', value: values, type: 'AND' });
        return this;
      },

      whereNull(column: string) {
        query.conditions.push({ column, operator: 'IS NULL', value: null, type: 'AND' });
        return this;
      },

      whereNotNull(column: string) {
        query.conditions.push({ column, operator: 'IS NOT NULL', value: null, type: 'AND' });
        return this;
      },

      whereBetween(column: string, min: any, max: any) {
        query.conditions.push({ column, operator: 'BETWEEN', value: [min, max], type: 'AND' });
        return this;
      },

      orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC') {
        query.orderByColumns.push({ column, direction });
        return this;
      },

      groupBy(...columns: string[]) {
        query.groupByColumns.push(...columns);
        return this;
      },

      having(column: string, operator: string, value: any) {
        query.havingConditions.push({ column, operator, value });
        return this;
      },

      limit(limit: number) {
        query.limitValue = Math.min(limit, self.config.maxLimit);
        return this;
      },

      offset(offset: number) {
        query.offsetValue = offset;
        return this;
      },

      build() {
        return self.buildSQL(query);
      },

      async execute() {
        const sql = this.build();
        return self.query(sql);
      }
    };

    return builder;
  }

  /**
   * Begin transaction
   */
  public async beginTransaction(isolationLevel: IsolationLevel = IsolationLevel.READ_COMMITTED): Promise<Transaction> {
    const transaction: Transaction = {
      id: this.generateTransactionId(),
      isolationLevel,
      status: 'pending',
      startTime: new Date(),
      
      async query(sql: string, params?: any[]) {
        // Execute query within transaction context
        return await this.query(sql, params);
      },
      
      async commit() {
        await this.query('COMMIT');
        transaction.status = 'committed';
        self.transactionStack = self.transactionStack.filter(t => t.id !== transaction.id);
        self.eventEmitter.emit('transaction:committed', transaction);
      },
      
      async rollback() {
        await this.query('ROLLBACK');
        transaction.status = 'rolled_back';
        self.transactionStack = self.transactionStack.filter(t => t.id !== transaction.id);
        self.eventEmitter.emit('transaction:rolled_back', transaction);
      },
      
      async savepoint(name: string) {
        await this.query(`SAVEPOINT ${name}`);
      },
      
      async releaseSavepoint(name: string) {
        await this.query(`RELEASE SAVEPOINT ${name}`);
      },
      
      async rollbackToSavepoint(name: string) {
        await this.query(`ROLLBACK TO SAVEPOINT ${name}`);
      }
    };
    
    // Set isolation level and begin transaction
    await this.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    await this.query('BEGIN');
    
    this.transactionStack.push(transaction);
    this.eventEmitter.emit('transaction:started', transaction);
    
    return transaction;
  }

  /**
   * Define model
   */
  public defineModel(name: string, definition: ModelDefinition): void {
    this.models.set(name, definition);
    
    // Create table if it doesn't exist
    if (this.config.enableORM) {
      this.createTableFromModel(definition);
    }
    
    this.eventEmitter.emit('model:defined', { name, definition });
    this.log('info', `Model '${name}' defined`);
  }

  /**
   * Get model instance
   */
  public model(name: string): any {
    const definition = this.models.get(name);
    if (!definition) {
      throw new Error(`Model '${name}' not found`);
    }
    
    // Return ORM-style model interface
    return {
      definition,
      
      async findAll(options: any = {}) {
        const query = this.createQueryBuilder().from(definition.tableName);
        
        if (options.where) {
          Object.entries(options.where).forEach(([column, value]) => {
            query.where(column, '=', value);
          });
        }
        
        if (options.orderBy) {
          Object.entries(options.orderBy).forEach(([column, direction]) => {
            query.orderBy(column, direction as 'ASC' | 'DESC');
          });
        }
        
        if (options.limit) {
          query.limit(options.limit);
        }
        
        if (options.offset) {
          query.offset(options.offset);
        }
        
        return await query.execute();
      },
      
      async findOne(options: any = {}) {
        const results = await this.findAll({ ...options, limit: 1 });
        return results.rows[0] || null;
      },
      
      async findById(id: any) {
        return await this.findOne({ where: { [definition.primaryKey]: id } });
      },
      
      async create(data: any) {
        // Run hooks
        if (definition.hooks?.beforeCreate) {
          await definition.hooks.beforeCreate(data);
        }
        
        // Add timestamps if enabled
        if (this.config.enableTimestamps) {
          data[this.config.timestampFields.created] = new Date();
          data[this.config.timestampFields.updated] = new Date();
        }
        
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const sql = `INSERT INTO ${definition.tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.query(sql, values);
        
        const instance = result.rows[0];
        
        // Run hooks
        if (definition.hooks?.afterCreate) {
          await definition.hooks.afterCreate(instance);
        }
        
        return instance;
      },
      
      async update(id: any, data: any) {
        // Run hooks
        if (definition.hooks?.beforeUpdate) {
          await definition.hooks.beforeUpdate(data);
        }
        
        // Update timestamp
        if (this.config.enableTimestamps) {
          data[this.config.timestampFields.updated] = new Date();
        }
        
        const assignments = Object.keys(data).map((col, i) => `${col} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(data)];
        
        const sql = `UPDATE ${definition.tableName} SET ${assignments} WHERE ${definition.primaryKey} = $1 RETURNING *`;
        const result = await this.query(sql, values);
        
        const instance = result.rows[0];
        
        // Run hooks
        if (definition.hooks?.afterUpdate) {
          await definition.hooks.afterUpdate(instance);
        }
        
        return instance;
      },
      
      async delete(id: any) {
        const instance = await this.findById(id);
        
        // Run hooks
        if (definition.hooks?.beforeDelete) {
          await definition.hooks.beforeDelete(instance);
        }
        
        if (this.config.enableTimestamps && this.config.timestampFields.deleted) {
          // Soft delete
          const sql = `UPDATE ${definition.tableName} SET ${this.config.timestampFields.deleted} = $2 WHERE ${definition.primaryKey} = $1`;
          await this.query(sql, [id, new Date()]);
        } else {
          // Hard delete
          const sql = `DELETE FROM ${definition.tableName} WHERE ${definition.primaryKey} = $1`;
          await this.query(sql, [id]);
        }
        
        // Run hooks
        if (definition.hooks?.afterDelete) {
          await definition.hooks.afterDelete(instance);
        }
        
        return true;
      }
    };
  }

  /**
   * Register migration
   */
  public registerMigration(migration: Migration): void {
    this.migrations.set(migration.version, migration);
    this.log('info', `Migration '${migration.name}' registered`);
  }

  /**
   * Run migrations
   */
  public async migrate(direction: MigrationDirection = MigrationDirection.UP, target?: string): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = this.getPendingMigrations(appliedMigrations);
    
    if (direction === MigrationDirection.UP) {
      for (const migration of pendingMigrations) {
        if (target && migration.version === target) {
          break;
        }
        
        await this.runMigration(migration, direction);
      }
    } else {
      // Rollback migrations
      const migrationsToRollback = appliedMigrations.reverse();
      
      for (const version of migrationsToRollback) {
        const migration = this.migrations.get(version);
        if (!migration) continue;
        
        await this.runMigration(migration, direction);
        
        if (target && migration.version === target) {
          break;
        }
      }
    }
  }

  /**
   * Get database statistics
   */
  public getStats(): DatabaseStats {
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
   * Create connection based on database type
   */
  private async createConnection(): Promise<void> {
    // In production, this would use the actual database drivers
    // For now, simulating connection
    switch (this.config.type) {
      case SQLDatabaseType.POSTGRESQL:
        this.log('debug', 'Creating PostgreSQL connection');
        break;
      case SQLDatabaseType.MYSQL:
        this.log('debug', 'Creating MySQL connection');
        break;
      case SQLDatabaseType.SQLITE:
        this.log('debug', 'Creating SQLite connection');
        break;
      default:
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }
  }

  /**
   * Initialize connection pool
   */
  private async initializePool(): Promise<void> {
    // In production, implement actual connection pooling
    this.connectionPool = {
      min: this.config.poolMin,
      max: this.config.poolMax,
      active: 0
    };
  }

  /**
   * Destroy connection pool
   */
  private async destroyPool(): Promise<void> {
    if (this.connectionPool) {
      // Close all connections in pool
      this.connectionPool = null;
    }
  }

  /**
   * Execute query (implementation would use actual database driver)
   */
  private async executeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    // This is a mock implementation
    // In production, this would execute against the actual database
    
    return {
      rows: [],
      fields: [],
      rowCount: 0,
      command: sql.split(' ')[0].toUpperCase(),
      duration: Math.random() * 100,
      cached: false
    };
  }

  /**
   * Build SQL from query object
   */
  private buildSQL(query: any): string {
    let sql = `SELECT ${query.columns.join(', ')} FROM ${query.table}`;
    
    // Add joins
    for (const join of query.joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
    }
    
    // Add where conditions
    if (query.conditions.length > 0) {
      const whereClause = query.conditions.map((cond: any) => {
        if (cond.operator === 'IN') {
          const values = cond.value.map((v: any) => `'${v}'`).join(', ');
          return `${cond.column} IN (${values})`;
        } else if (cond.operator === 'BETWEEN') {
          return `${cond.column} BETWEEN '${cond.value[0]}' AND '${cond.value[1]}'`;
        } else if (cond.value === null) {
          return `${cond.column} ${cond.operator}`;
        } else {
          return `${cond.column} ${cond.operator} '${cond.value}'`;
        }
      }).join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
    }
    
    // Add group by
    if (query.groupByColumns.length > 0) {
      sql += ` GROUP BY ${query.groupByColumns.join(', ')}`;
    }
    
    // Add having
    if (query.havingConditions.length > 0) {
      const havingClause = query.havingConditions.map((cond: any) => 
        `${cond.column} ${cond.operator} '${cond.value}'`
      ).join(' AND ');
      
      sql += ` HAVING ${havingClause}`;
    }
    
    // Add order by
    if (query.orderByColumns.length > 0) {
      const orderByClause = query.orderByColumns.map((col: any) => 
        `${col.column} ${col.direction}`
      ).join(', ');
      
      sql += ` ORDER BY ${orderByClause}`;
    }
    
    // Add limit and offset
    sql += ` LIMIT ${query.limitValue} OFFSET ${query.offsetValue}`;
    
    return sql;
  }

  /**
   * Create table from model definition
   */
  private async createTableFromModel(definition: ModelDefinition): Promise<void> {
    const columns: string[] = [];
    
    // Build column definitions
    for (const [fieldName, field] of Object.entries(definition.fields)) {
      let columnDef = `${fieldName} ${this.mapFieldType(field.type)}`;
      
      if (field.length) {
        columnDef += `(${field.length})`;
      }
      
      if (fieldName === definition.primaryKey) {
        columnDef += ' PRIMARY KEY';
      }
      
      if (field.unique) {
        columnDef += ' UNIQUE';
      }
      
      if (!field.nullable) {
        columnDef += ' NOT NULL';
      }
      
      if (field.defaultValue !== undefined) {
        columnDef += ` DEFAULT '${field.defaultValue}'`;
      }
      
      columns.push(columnDef);
    }
    
    // Create table SQL
    const sql = `CREATE TABLE IF NOT EXISTS ${definition.tableName} (${columns.join(', ')})`;
    
    try {
      await this.query(sql);
      
      // Create indexes
      if (definition.indexes) {
        for (const index of definition.indexes) {
          const indexSql = `CREATE ${index.unique ? 'UNIQUE' : ''} INDEX IF NOT EXISTS ${index.name} ON ${definition.tableName} (${index.fields.join(', ')})`;
          await this.query(indexSql);
        }
      }
    } catch (error) {
      this.log('error', `Failed to create table for model: ${definition.tableName}`, error);
    }
  }

  /**
   * Map field type to SQL type
   */
  private mapFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'VARCHAR',
      text: 'TEXT',
      number: 'INTEGER',
      boolean: 'BOOLEAN',
      date: 'TIMESTAMP',
      json: 'JSON',
      binary: 'BLOB'
    };
    
    return typeMap[type] || 'VARCHAR';
  }

  /**
   * Get applied migrations
   */
  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.query(
        `SELECT version FROM ${this.config.migrationsTable} ORDER BY timestamp ASC`
      );
      return result.rows.map(row => row.version);
    } catch {
      // Migrations table doesn't exist yet
      await this.createMigrationsTable();
      return [];
    }
  }

  /**
   * Create migrations table
   */
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.config.migrationsTable} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.query(sql);
  }

  /**
   * Get pending migrations
   */
  private getPendingMigrations(appliedMigrations: string[]): Migration[] {
    const pending: Migration[] = [];
    
    for (const [version, migration] of this.migrations) {
      if (!appliedMigrations.includes(version)) {
        pending.push(migration);
      }
    }
    
    // Sort by version
    return pending.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Run single migration
   */
  private async runMigration(migration: Migration, direction: MigrationDirection): Promise<void> {
    const transaction = await this.beginTransaction();
    
    try {
      if (direction === MigrationDirection.UP) {
        await migration.up(this);
        
        // Record migration
        await this.query(
          `INSERT INTO ${this.config.migrationsTable} (version, name) VALUES ($1, $2)`,
          [migration.version, migration.name]
        );
        
        this.log('info', `Migration '${migration.name}' applied`);
      } else {
        await migration.down(this);
        
        // Remove migration record
        await this.query(
          `DELETE FROM ${this.config.migrationsTable} WHERE version = $1`,
          [migration.version]
        );
        
        this.log('info', `Migration '${migration.name}' rolled back`);
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Run pending migrations
   */
  private async runPendingMigrations(): Promise<void> {
    if (!this.config.enableMigrations) return;
    
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = this.getPendingMigrations(appliedMigrations);
    
    if (pendingMigrations.length > 0) {
      this.log('info', `Running ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.runMigration(migration, MigrationDirection.UP);
      }
    }
  }

  /**
   * Update query statistics
   */
  private updateQueryStats(duration: number, success: boolean): void {
    if (success) {
      this.stats.successfulQueries++;
      
      // Update average query time
      const totalTime = this.stats.averageQueryTime * (this.stats.successfulQueries - 1) + duration;
      this.stats.averageQueryTime = totalTime / this.stats.successfulQueries;
    } else {
      this.stats.failedQueries++;
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(sql: string, params?: any[]): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return btoa(`${sql}:${paramStr}`);
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): QueryResult | null {
    const cached = this.queryCache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.config.queryCacheTTL * 1000) {
        return { ...cached.result, cached: true };
      }
      
      // Expired, remove from cache
      this.queryCache.delete(key);
    }
    
    return null;
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, result: QueryResult): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    // Implement cache size limit if needed
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
   * Generate connection ID
   */
  private generateConnectionId(): string {
    return `sql_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `sql_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      console[level as keyof Console](`[SQL] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.database) {
      throw new Error('Database name is required');
    }
    
    if (this.config.type === SQLDatabaseType.SQLITE && !this.config.filename) {
      throw new Error('Filename is required for SQLite');
    }
    
    if (this.config.poolMin > this.config.poolMax) {
      throw new Error('Pool minimum cannot be greater than maximum');
    }
  }

  /**
   * Get generated files for the SQL module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core SQL types
    files.push({
      path: 'src/lib/database/sql/types.ts',
      content: this.generateSQLTypes(),
      type: 'typescript'
    });

    // SQL service
    files.push({
      path: 'src/lib/database/sql/service.ts',
      content: this.generateSQLService(context),
      type: 'typescript'
    });

    // Query builder
    files.push({
      path: 'src/lib/database/sql/query-builder.ts',
      content: this.generateQueryBuilder(context),
      type: 'typescript'
    });

    // Migration runner
    files.push({
      path: 'src/lib/database/sql/migrations.ts',
      content: this.generateMigrationRunner(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate SQL types file
   */
  private generateSQLTypes(): string {
    return `// Generated SQL types - Epic 5 Story 5 AC1
export * from './types/sql-types';
export * from './types/query-types';
export * from './types/model-types';
export * from './types/migration-types';
`;
  }

  /**
   * Generate SQL service file
   */
  private generateSQLService(context: DNAModuleContext): string {
    return `// Generated SQL Service - Epic 5 Story 5 AC1
import { SQLModule } from './sql-module';

export class SQLService extends SQLModule {
  // SQL service for ${context.framework}
}
`;
  }

  /**
   * Generate query builder file
   */
  private generateQueryBuilder(context: DNAModuleContext): string {
    return `// Generated Query Builder - Epic 5 Story 5 AC1
export class QueryBuilder {
  // Query builder implementation for ${context.framework}
}
`;
  }

  /**
   * Generate migration runner file
   */
  private generateMigrationRunner(context: DNAModuleContext): string {
    return `// Generated Migration Runner - Epic 5 Story 5 AC1
export class MigrationRunner {
  // Migration runner for ${context.framework}
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/lib/database/sql/prisma-schema.prisma',
        content: `// Prisma schema for Next.js
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`,
        type: 'prisma'
      }
    ];
  }

  /**
   * Event emitter for SQL events
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
 * Default SQL configuration
 */
export const defaultSQLConfig: SQLConfig = {
  type: SQLDatabaseType.POSTGRESQL,
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: '',
  poolMin: 2,
  poolMax: 10,
  acquireTimeout: 30000,
  idleTimeout: 10000,
  connectionTimeout: 5000,
  enableQueryLogging: true,
  slowQueryThreshold: 1000,
  defaultLimit: 100,
  maxLimit: 1000,
  enableORM: true,
  enableTimestamps: true,
  timestampFields: {
    created: 'created_at',
    updated: 'updated_at',
    deleted: 'deleted_at'
  },
  enableMigrations: true,
  migrationsDirectory: './migrations',
  migrationsTable: 'migrations',
  enableQueryCache: true,
  queryCacheTTL: 60,
  enablePreparedStatements: true,
  enableSSL: false,
  enableLogging: true,
  logLevel: 'info'
};

export default SQLModule;