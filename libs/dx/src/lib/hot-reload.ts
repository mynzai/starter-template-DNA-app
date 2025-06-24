/**
 * @fileoverview Hot Reload System - Epic 6 Story 1 AC2
 * Provides fast development feedback loops with intelligent hot module replacement
 */

import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';
import * as WebSocket from 'ws';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Hot reload configuration
 */
export interface HotReloadConfig {
  // Watch settings
  watchPaths: string[];
  ignorePaths: string[];
  extensions: string[];
  
  // Performance settings
  debounceDelay: number; // ms
  batchUpdates: boolean;
  maxBatchSize: number;
  
  // Server settings
  port: number;
  host: string;
  secure: boolean;
  
  // Reload strategies
  strategy: ReloadStrategy;
  preserveState: boolean;
  clearConsole: boolean;
  
  // Module handling
  enableHMR: boolean; // Hot Module Replacement
  hmrTimeout: number;
  acceptPatterns: string[];
  
  // Error handling
  errorRecovery: boolean;
  maxRetries: number;
  fallbackReload: boolean;
  
  // Optimizations
  enableCaching: boolean;
  enableCompression: boolean;
  enableDiffing: boolean;
  
  // Development features
  enableOverlay: boolean;
  enableLogging: boolean;
  logLevel: LogLevel;
}

/**
 * Reload strategies
 */
export enum ReloadStrategy {
  FULL_RELOAD = 'full_reload',
  HOT_RELOAD = 'hot_reload',
  LIVE_RELOAD = 'live_reload',
  INCREMENTAL = 'incremental',
  SMART = 'smart'
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * File change event
 */
export interface FileChangeEvent {
  type: ChangeType;
  path: string;
  oldPath?: string;
  content?: string;
  hash?: string;
  timestamp: Date;
  affectedModules?: string[];
}

/**
 * Change types
 */
export enum ChangeType {
  ADD = 'add',
  CHANGE = 'change',
  UNLINK = 'unlink',
  ADD_DIR = 'addDir',
  UNLINK_DIR = 'unlinkDir'
}

/**
 * Module update
 */
export interface ModuleUpdate {
  id: string;
  type: UpdateType;
  path: string;
  content?: string;
  dependencies?: string[];
  exports?: string[];
  acceptedBy?: string[];
  timestamp: Date;
}

/**
 * Update types
 */
export enum UpdateType {
  MODULE = 'module',
  STYLE = 'style',
  ASSET = 'asset',
  CONFIG = 'config',
  TEMPLATE = 'template'
}

/**
 * Hot reload state
 */
export interface HotReloadState {
  connected: boolean;
  lastUpdate: Date;
  pendingUpdates: ModuleUpdate[];
  activeModules: Map<string, ModuleInfo>;
  errorCount: number;
  reloadCount: number;
}

/**
 * Module info
 */
export interface ModuleInfo {
  id: string;
  path: string;
  hash: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  exports: string[];
  acceptsSelf: boolean;
  lastModified: Date;
  errorState?: ErrorState;
}

/**
 * Error state
 */
export interface ErrorState {
  error: Error;
  timestamp: Date;
  retryCount: number;
  recoverable: boolean;
}

/**
 * Client connection
 */
export interface ClientConnection {
  id: string;
  ws: WebSocket;
  state: ClientState;
  capabilities: ClientCapabilities;
  lastActivity: Date;
}

/**
 * Client state
 */
export interface ClientState {
  connected: boolean;
  synced: boolean;
  pendingUpdates: string[];
  appliedUpdates: string[];
  errors: Error[];
}

/**
 * Client capabilities
 */
export interface ClientCapabilities {
  hmr: boolean;
  cssInjection: boolean;
  errorOverlay: boolean;
  preserveState: boolean;
  diffing: boolean;
}

/**
 * Update manifest
 */
export interface UpdateManifest {
  id: string;
  timestamp: Date;
  updates: ModuleUpdate[];
  removals: string[];
  critical: boolean;
  requiresReload: boolean;
  preserveState: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  fileWatchTime: number;
  compilationTime: number;
  transmissionTime: number;
  applicationTime: number;
  totalTime: number;
  moduleCount: number;
  updateSize: number;
}

/**
 * Hot Reload Server
 */
export class HotReloadServer {
  private config: HotReloadConfig;
  private eventEmitter: EventEmitter;
  private watcher?: chokidar.FSWatcher;
  private wsServer?: WebSocket.Server;
  private clients: Map<string, ClientConnection>;
  private state: HotReloadState;
  private moduleGraph: ModuleGraph;
  private updateQueue: ModuleUpdate[];
  private batchTimer?: NodeJS.Timeout;

  constructor(config: HotReloadConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.clients = new Map();
    this.state = {
      connected: false,
      lastUpdate: new Date(),
      pendingUpdates: [],
      activeModules: new Map(),
      errorCount: 0,
      reloadCount: 0
    };
    this.moduleGraph = new ModuleGraph();
    this.updateQueue = [];
  }

  /**
   * Start the hot reload server
   */
  public async start(): Promise<void> {
    this.eventEmitter.emit('server:starting');
    
    try {
      // Start WebSocket server
      await this.startWebSocketServer();
      
      // Start file watcher
      await this.startFileWatcher();
      
      // Initialize module graph
      await this.initializeModuleGraph();
      
      this.state.connected = true;
      this.eventEmitter.emit('server:started');
      
    } catch (error) {
      this.eventEmitter.emit('server:error', { error });
      throw error;
    }
  }

  /**
   * Stop the hot reload server
   */
  public async stop(): Promise<void> {
    this.eventEmitter.emit('server:stopping');
    
    try {
      // Close file watcher
      if (this.watcher) {
        await this.watcher.close();
      }
      
      // Close WebSocket connections
      for (const client of this.clients.values()) {
        client.ws.close();
      }
      
      // Close WebSocket server
      if (this.wsServer) {
        this.wsServer.close();
      }
      
      this.state.connected = false;
      this.eventEmitter.emit('server:stopped');
      
    } catch (error) {
      this.eventEmitter.emit('server:error', { error });
      throw error;
    }
  }

  /**
   * Handle file change
   */
  public async handleFileChange(event: FileChangeEvent): Promise<void> {
    this.eventEmitter.emit('file:changed', event);
    
    try {
      // Determine update type
      const updateType = this.getUpdateType(event.path);
      
      // Create module update
      const update: ModuleUpdate = {
        id: this.generateUpdateId(),
        type: updateType,
        path: event.path,
        content: event.content,
        timestamp: new Date()
      };
      
      // Analyze module dependencies
      if (updateType === UpdateType.MODULE) {
        const moduleInfo = await this.analyzeModule(event.path);
        update.dependencies = Array.from(moduleInfo.dependencies);
        update.exports = moduleInfo.exports;
      }
      
      // Add to update queue
      this.queueUpdate(update);
      
    } catch (error) {
      this.handleUpdateError(error as Error, event);
    }
  }

  /**
   * Send updates to clients
   */
  public async sendUpdates(): Promise<void> {
    if (this.updateQueue.length === 0) return;
    
    const manifest: UpdateManifest = {
      id: this.generateUpdateId(),
      timestamp: new Date(),
      updates: [...this.updateQueue],
      removals: [],
      critical: false,
      requiresReload: false,
      preserveState: this.config.preserveState
    };
    
    // Clear queue
    this.updateQueue = [];
    
    // Check if full reload is needed
    manifest.requiresReload = this.requiresFullReload(manifest);
    
    // Send to all connected clients
    for (const client of this.clients.values()) {
      await this.sendUpdateToClient(client, manifest);
    }
    
    // Update state
    this.state.lastUpdate = new Date();
    this.state.pendingUpdates = [];
  }

  // Private methods

  private async startWebSocketServer(): Promise<void> {
    this.wsServer = new WebSocket.Server({
      port: this.config.port,
      host: this.config.host
    });
    
    this.wsServer.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        id: clientId,
        ws,
        state: {
          connected: true,
          synced: false,
          pendingUpdates: [],
          appliedUpdates: [],
          errors: []
        },
        capabilities: {
          hmr: true,
          cssInjection: true,
          errorOverlay: true,
          preserveState: true,
          diffing: true
        },
        lastActivity: new Date()
      };
      
      this.clients.set(clientId, client);
      this.setupClientHandlers(client);
      
      // Send initial state
      this.sendInitialState(client);
    });
  }

  private async startFileWatcher(): Promise<void> {
    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: this.config.ignorePaths,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });
    
    // Setup event handlers
    this.watcher
      .on('add', (path) => this.handleFileEvent(ChangeType.ADD, path))
      .on('change', (path) => this.handleFileEvent(ChangeType.CHANGE, path))
      .on('unlink', (path) => this.handleFileEvent(ChangeType.UNLINK, path))
      .on('addDir', (path) => this.handleFileEvent(ChangeType.ADD_DIR, path))
      .on('unlinkDir', (path) => this.handleFileEvent(ChangeType.UNLINK_DIR, path))
      .on('error', (error) => this.eventEmitter.emit('watcher:error', { error }));
  }

  private async handleFileEvent(type: ChangeType, filePath: string): Promise<void> {
    // Filter by extension
    const ext = path.extname(filePath);
    if (!this.config.extensions.includes(ext)) return;
    
    // Read file content if needed
    let content: string | undefined;
    if (type === ChangeType.ADD || type === ChangeType.CHANGE) {
      try {
        content = await fs.promises.readFile(filePath, 'utf-8');
      } catch (error) {
        this.log(`Failed to read file: ${filePath}`, LogLevel.ERROR);
        return;
      }
    }
    
    // Create event
    const event: FileChangeEvent = {
      type,
      path: filePath,
      content,
      hash: content ? this.hashContent(content) : undefined,
      timestamp: new Date()
    };
    
    // Handle with debounce
    if (this.config.debounceDelay > 0) {
      this.debounceFileChange(event);
    } else {
      await this.handleFileChange(event);
    }
  }

  private debounceFileChange(event: FileChangeEvent): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(async () => {
      await this.handleFileChange(event);
      
      if (this.config.batchUpdates) {
        await this.sendUpdates();
      }
    }, this.config.debounceDelay);
  }

  private async initializeModuleGraph(): Promise<void> {
    // Scan initial modules
    for (const watchPath of this.config.watchPaths) {
      await this.scanDirectory(watchPath);
    }
  }

  private async scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!this.isIgnored(fullPath)) {
            await this.scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.config.extensions.includes(ext)) {
            await this.addModuleToGraph(fullPath);
          }
        }
      }
    } catch (error) {
      this.log(`Failed to scan directory: ${dir}`, LogLevel.ERROR);
    }
  }

  private async addModuleToGraph(filePath: string): Promise<ModuleInfo> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const hash = this.hashContent(content);
    
    const moduleInfo: ModuleInfo = {
      id: filePath,
      path: filePath,
      hash,
      dependencies: new Set(),
      dependents: new Set(),
      exports: [],
      acceptsSelf: false,
      lastModified: new Date()
    };
    
    // Analyze module
    this.analyzeModuleDependencies(moduleInfo, content);
    
    // Add to graph
    this.moduleGraph.addModule(moduleInfo);
    this.state.activeModules.set(filePath, moduleInfo);
    
    return moduleInfo;
  }

  private analyzeModuleDependencies(moduleInfo: ModuleInfo, content: string): void {
    // Simple regex-based dependency extraction
    // In real implementation, would use proper AST parsing
    
    // Find imports
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    const requireRegex = /require\s*\(['"](.+?)['"]\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      moduleInfo.dependencies.add(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      moduleInfo.dependencies.add(match[1]);
    }
    
    // Find exports
    const exportRegex = /export\s+(default\s+)?(function|class|const|let|var)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      moduleInfo.exports.push(match[3]);
    }
    
    // Check for HMR acceptance
    if (content.includes('module.hot.accept')) {
      moduleInfo.acceptsSelf = true;
    }
  }

  private getUpdateType(filePath: string): UpdateType {
    const ext = path.extname(filePath);
    
    switch (ext) {
      case '.css':
      case '.scss':
      case '.sass':
      case '.less':
        return UpdateType.STYLE;
        
      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
        return UpdateType.MODULE;
        
      case '.json':
      case '.yaml':
      case '.yml':
        return UpdateType.CONFIG;
        
      case '.html':
      case '.vue':
      case '.svelte':
        return UpdateType.TEMPLATE;
        
      default:
        return UpdateType.ASSET;
    }
  }

  private queueUpdate(update: ModuleUpdate): void {
    this.updateQueue.push(update);
    
    if (!this.config.batchUpdates) {
      this.sendUpdates();
    } else if (this.updateQueue.length >= this.config.maxBatchSize) {
      this.sendUpdates();
    }
  }

  private requiresFullReload(manifest: UpdateManifest): boolean {
    // Check if any updates require full reload
    for (const update of manifest.updates) {
      // Config changes usually require full reload
      if (update.type === UpdateType.CONFIG) {
        return true;
      }
      
      // Check if module can be hot reloaded
      if (update.type === UpdateType.MODULE) {
        const moduleInfo = this.state.activeModules.get(update.path);
        if (!moduleInfo?.acceptsSelf && !this.hasAcceptingParent(moduleInfo)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private hasAcceptingParent(moduleInfo?: ModuleInfo): boolean {
    if (!moduleInfo) return false;
    
    for (const dependent of moduleInfo.dependents) {
      const parentInfo = this.state.activeModules.get(dependent);
      if (parentInfo?.acceptsSelf) {
        return true;
      }
      if (this.hasAcceptingParent(parentInfo)) {
        return true;
      }
    }
    
    return false;
  }

  private async sendUpdateToClient(client: ClientConnection, manifest: UpdateManifest): Promise<void> {
    try {
      const message = {
        type: 'update',
        manifest,
        timestamp: Date.now()
      };
      
      client.ws.send(JSON.stringify(message));
      client.state.pendingUpdates.push(manifest.id);
      
    } catch (error) {
      this.handleClientError(client, error as Error);
    }
  }

  private setupClientHandlers(client: ClientConnection): void {
    client.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(client, message);
      } catch (error) {
        this.log('Invalid client message', LogLevel.ERROR);
      }
    });
    
    client.ws.on('close', () => {
      this.clients.delete(client.id);
      this.eventEmitter.emit('client:disconnected', { clientId: client.id });
    });
    
    client.ws.on('error', (error) => {
      this.handleClientError(client, error);
    });
  }

  private async handleClientMessage(client: ClientConnection, message: any): Promise<void> {
    client.lastActivity = new Date();
    
    switch (message.type) {
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
        
      case 'update-applied':
        this.handleUpdateApplied(client, message.updateId);
        break;
        
      case 'update-failed':
        this.handleUpdateFailed(client, message.updateId, message.error);
        break;
        
      case 'capabilities':
        client.capabilities = message.capabilities;
        break;
        
      case 'state-snapshot':
        // Handle state preservation
        break;
        
      case 'error':
        client.state.errors.push(message.error);
        this.handleClientError(client, message.error);
        break;
    }
  }

  private handleUpdateApplied(client: ClientConnection, updateId: string): void {
    const index = client.state.pendingUpdates.indexOf(updateId);
    if (index !== -1) {
      client.state.pendingUpdates.splice(index, 1);
      client.state.appliedUpdates.push(updateId);
    }
    
    // Check if client is fully synced
    if (client.state.pendingUpdates.length === 0) {
      client.state.synced = true;
    }
  }

  private handleUpdateFailed(client: ClientConnection, updateId: string, error: Error): void {
    client.state.errors.push(error);
    
    if (this.config.errorRecovery) {
      // Attempt recovery
      this.attemptErrorRecovery(client, updateId, error);
    } else if (this.config.fallbackReload) {
      // Trigger full reload
      this.triggerFullReload(client);
    }
  }

  private async attemptErrorRecovery(client: ClientConnection, updateId: string, error: Error): Promise<void> {
    // Implement error recovery strategies
    this.log(`Attempting error recovery for client ${client.id}`, LogLevel.INFO);
    
    // For now, just trigger a full reload
    this.triggerFullReload(client);
  }

  private triggerFullReload(client: ClientConnection): void {
    const message = {
      type: 'reload',
      reason: 'error-recovery',
      timestamp: Date.now()
    };
    
    client.ws.send(JSON.stringify(message));
    this.state.reloadCount++;
  }

  private sendInitialState(client: ClientConnection): void {
    const message = {
      type: 'initial-state',
      modules: Array.from(this.state.activeModules.values()).map(m => ({
        id: m.id,
        path: m.path,
        hash: m.hash,
        dependencies: Array.from(m.dependencies),
        exports: m.exports
      })),
      timestamp: Date.now()
    };
    
    client.ws.send(JSON.stringify(message));
  }

  private handleClientError(client: ClientConnection, error: Error): void {
    this.log(`Client error (${client.id}): ${error.message}`, LogLevel.ERROR);
    client.state.errors.push(error);
    
    // Send error to client for overlay display
    if (client.capabilities.errorOverlay) {
      const message = {
        type: 'error',
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        }
      };
      
      try {
        client.ws.send(JSON.stringify(message));
      } catch {
        // Client might be disconnected
      }
    }
  }

  private handleUpdateError(error: Error, event: FileChangeEvent): void {
    this.state.errorCount++;
    this.eventEmitter.emit('update:error', { error, event });
    
    // Notify clients
    for (const client of this.clients.values()) {
      this.handleClientError(client, error);
    }
  }

  private async analyzeModule(filePath: string): Promise<ModuleInfo> {
    let moduleInfo = this.state.activeModules.get(filePath);
    
    if (!moduleInfo) {
      moduleInfo = await this.addModuleToGraph(filePath);
    } else {
      // Update existing module
      const content = await fs.promises.readFile(filePath, 'utf-8');
      moduleInfo.hash = this.hashContent(content);
      moduleInfo.lastModified = new Date();
      
      // Re-analyze dependencies
      moduleInfo.dependencies.clear();
      moduleInfo.exports = [];
      this.analyzeModuleDependencies(moduleInfo, content);
    }
    
    return moduleInfo;
  }

  private isIgnored(filePath: string): boolean {
    for (const pattern of this.config.ignorePaths) {
      if (filePath.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private generateUpdateId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private generateClientId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private log(message: string, level: LogLevel): void {
    if (!this.config.enableLogging) return;
    
    const levelValue = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3
    };
    
    if (levelValue[level] >= levelValue[this.config.logLevel]) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * Module graph for dependency tracking
 */
class ModuleGraph {
  private modules: Map<string, ModuleInfo>;
  
  constructor() {
    this.modules = new Map();
  }
  
  public addModule(module: ModuleInfo): void {
    this.modules.set(module.id, module);
    
    // Update dependents
    for (const dep of module.dependencies) {
      const depModule = this.modules.get(dep);
      if (depModule) {
        depModule.dependents.add(module.id);
      }
    }
  }
  
  public removeModule(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (!module) return;
    
    // Remove from dependents
    for (const dep of module.dependencies) {
      const depModule = this.modules.get(dep);
      if (depModule) {
        depModule.dependents.delete(moduleId);
      }
    }
    
    this.modules.delete(moduleId);
  }
  
  public getModule(moduleId: string): ModuleInfo | undefined {
    return this.modules.get(moduleId);
  }
  
  public getAffectedModules(moduleId: string): Set<string> {
    const affected = new Set<string>();
    const visited = new Set<string>();
    
    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const module = this.modules.get(id);
      if (!module) return;
      
      affected.add(id);
      
      // Traverse dependents
      for (const dependent of module.dependents) {
        traverse(dependent);
      }
    };
    
    traverse(moduleId);
    return affected;
  }
  
  public clear(): void {
    this.modules.clear();
  }
}

/**
 * Hot Reload Client
 */
export class HotReloadClient {
  private ws?: WebSocket;
  private config: HotReloadClientConfig;
  private eventEmitter: EventEmitter;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts: number = 0;
  private updateHandlers: Map<UpdateType, UpdateHandler>;
  private stateSnapshot?: any;

  constructor(config: HotReloadClientConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.updateHandlers = new Map();
    this.setupDefaultHandlers();
  }

  /**
   * Connect to hot reload server
   */
  public connect(): void {
    const protocol = this.config.secure ? 'wss' : 'ws';
    const url = `${protocol}://${this.config.host}:${this.config.port}`;
    
    try {
      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  /**
   * Register update handler
   */
  public registerHandler(type: UpdateType, handler: UpdateHandler): void {
    this.updateHandlers.set(type, handler);
  }

  /**
   * Apply update manifest
   */
  public async applyUpdate(manifest: UpdateManifest): Promise<void> {
    this.eventEmitter.emit('update:applying', manifest);
    
    try {
      // Save state if needed
      if (manifest.preserveState && this.config.preserveState) {
        this.stateSnapshot = await this.captureState();
      }
      
      // Apply each update
      for (const update of manifest.updates) {
        await this.applyModuleUpdate(update);
      }
      
      // Remove deleted modules
      for (const removal of manifest.removals) {
        await this.removeModule(removal);
      }
      
      // Restore state if saved
      if (this.stateSnapshot) {
        await this.restoreState(this.stateSnapshot);
        this.stateSnapshot = undefined;
      }
      
      // Notify server
      this.sendMessage({
        type: 'update-applied',
        updateId: manifest.id
      });
      
      this.eventEmitter.emit('update:applied', manifest);
      
    } catch (error) {
      this.handleUpdateError(manifest.id, error as Error);
    }
  }

  // Private methods

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.eventEmitter.emit('connected');
      
      // Send capabilities
      this.sendMessage({
        type: 'capabilities',
        capabilities: {
          hmr: true,
          cssInjection: true,
          errorOverlay: this.config.enableOverlay,
          preserveState: this.config.preserveState,
          diffing: true
        }
      });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleServerMessage(message);
      } catch (error) {
        console.error('Failed to parse server message:', error);
      }
    };
    
    this.ws.onerror = (event) => {
      this.handleConnectionError(new Error('WebSocket error'));
    };
    
    this.ws.onclose = () => {
      this.eventEmitter.emit('disconnected');
      this.attemptReconnect();
    };
  }

  private handleServerMessage(message: any): void {
    switch (message.type) {
      case 'update':
        this.applyUpdate(message.manifest);
        break;
        
      case 'reload':
        this.performReload(message.reason);
        break;
        
      case 'error':
        this.displayError(message.error);
        break;
        
      case 'initial-state':
        this.handleInitialState(message);
        break;
        
      case 'pong':
        // Keep-alive response
        break;
    }
  }

  private setupDefaultHandlers(): void {
    // Module update handler
    this.registerHandler(UpdateType.MODULE, async (update) => {
      if (this.config.enableHMR) {
        await this.applyHMR(update);
      } else {
        this.performReload('module-update');
      }
    });
    
    // Style update handler
    this.registerHandler(UpdateType.STYLE, async (update) => {
      await this.injectStyles(update);
    });
    
    // Asset update handler
    this.registerHandler(UpdateType.ASSET, async (update) => {
      await this.reloadAsset(update);
    });
    
    // Config update handler
    this.registerHandler(UpdateType.CONFIG, async (update) => {
      this.performReload('config-change');
    });
    
    // Template update handler
    this.registerHandler(UpdateType.TEMPLATE, async (update) => {
      if (this.config.enableHMR) {
        await this.applyTemplateUpdate(update);
      } else {
        this.performReload('template-update');
      }
    });
  }

  private async applyModuleUpdate(update: ModuleUpdate): Promise<void> {
    const handler = this.updateHandlers.get(update.type);
    
    if (handler) {
      await handler(update);
    } else {
      console.warn(`No handler registered for update type: ${update.type}`);
      this.performReload('no-handler');
    }
  }

  private async applyHMR(update: ModuleUpdate): Promise<void> {
    // This is a simplified HMR implementation
    // Real implementation would integrate with webpack/vite HMR API
    
    try {
      // Create module proxy
      const moduleProxy = {
        id: update.path,
        hot: {
          accept: (callback?: Function) => {
            if (callback) {
              callback();
            }
          },
          dispose: (callback: Function) => {
            callback();
          },
          data: {}
        }
      };
      
      // Evaluate new module code
      // In real implementation, this would be done safely
      const newModule = eval(update.content || '');
      
      // Update module in registry
      if (typeof window !== 'undefined' && (window as any).__modules__) {
        (window as any).__modules__[update.path] = newModule;
      }
      
      // Trigger accept callbacks
      this.eventEmitter.emit('hmr:accepted', update);
      
    } catch (error) {
      throw new Error(`HMR failed for ${update.path}: ${(error as Error).message}`);
    }
  }

  private async injectStyles(update: ModuleUpdate): Promise<void> {
    if (typeof document === 'undefined') return;
    
    const styleId = `hot-style-${update.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.setAttribute('data-hot-reload', 'true');
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = update.content || '';
    
    this.eventEmitter.emit('style:injected', update);
  }

  private async reloadAsset(update: ModuleUpdate): Promise<void> {
    if (typeof document === 'undefined') return;
    
    // Find all elements using this asset
    const elements = document.querySelectorAll(`[src="${update.path}"], [href="${update.path}"]`);
    
    elements.forEach((element) => {
      const timestamp = Date.now();
      
      if (element.hasAttribute('src')) {
        element.setAttribute('src', `${update.path}?t=${timestamp}`);
      } else if (element.hasAttribute('href')) {
        element.setAttribute('href', `${update.path}?t=${timestamp}`);
      }
    });
    
    this.eventEmitter.emit('asset:reloaded', update);
  }

  private async applyTemplateUpdate(update: ModuleUpdate): Promise<void> {
    // Framework-specific template hot reload
    // This would be implemented based on the framework being used
    
    this.eventEmitter.emit('template:updated', update);
  }

  private async removeModule(modulePath: string): Promise<void> {
    // Remove module from registry
    if (typeof window !== 'undefined' && (window as any).__modules__) {
      delete (window as any).__modules__[modulePath];
    }
    
    this.eventEmitter.emit('module:removed', modulePath);
  }

  private async captureState(): Promise<any> {
    // Capture application state for preservation
    // This would be framework-specific
    
    const state: any = {};
    
    // Emit event for custom state capture
    this.eventEmitter.emit('state:capture', state);
    
    return state;
  }

  private async restoreState(state: any): Promise<void> {
    // Restore application state
    // This would be framework-specific
    
    this.eventEmitter.emit('state:restore', state);
  }

  private performReload(reason: string): void {
    console.log(`[HMR] Reloading page (${reason})...`);
    
    if (this.config.clearConsole) {
      console.clear();
    }
    
    window.location.reload();
  }

  private displayError(error: any): void {
    console.error('[HMR] Error:', error);
    
    if (this.config.enableOverlay) {
      this.showErrorOverlay(error);
    }
  }

  private showErrorOverlay(error: any): void {
    if (typeof document === 'undefined') return;
    
    // Create or update error overlay
    let overlay = document.getElementById('hot-reload-error-overlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'hot-reload-error-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        font-family: monospace;
        padding: 20px;
        overflow: auto;
        z-index: 999999;
      `;
      document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
      <h2 style="color: #ff5555;">🔥 Hot Reload Error</h2>
      <pre style="color: #ff5555;">${error.message}</pre>
      <pre style="color: #888; font-size: 12px;">${error.stack || ''}</pre>
      <button onclick="document.getElementById('hot-reload-error-overlay').remove()" 
              style="margin-top: 20px; padding: 10px 20px; background: #ff5555; 
                     color: white; border: none; cursor: pointer;">
        Dismiss
      </button>
    `;
  }

  private handleInitialState(message: any): void {
    // Process initial module state
    this.eventEmitter.emit('initial:state', message.modules);
  }

  private handleConnectionError(error: Error): void {
    console.error('[HMR] Connection error:', error);
    this.eventEmitter.emit('connection:error', error);
  }

  private handleUpdateError(updateId: string, error: Error): void {
    console.error('[HMR] Update failed:', error);
    
    // Notify server
    this.sendMessage({
      type: 'update-failed',
      updateId,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    
    // Display error
    this.displayError(error);
    
    this.eventEmitter.emit('update:error', { updateId, error });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[HMR] Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`[HMR] Attempting to reconnect (${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

/**
 * Hot reload client configuration
 */
export interface HotReloadClientConfig {
  host: string;
  port: number;
  secure: boolean;
  enableHMR: boolean;
  preserveState: boolean;
  clearConsole: boolean;
  enableOverlay: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
}

/**
 * Update handler type
 */
export type UpdateHandler = (update: ModuleUpdate) => Promise<void>;

/**
 * Create hot reload server
 */
export function createHotReloadServer(config?: Partial<HotReloadConfig>): HotReloadServer {
  const defaultConfig: HotReloadConfig = {
    watchPaths: ['./src'],
    ignorePaths: ['node_modules', '.git', 'dist', 'build'],
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json'],
    debounceDelay: 100,
    batchUpdates: true,
    maxBatchSize: 10,
    port: 3001,
    host: 'localhost',
    secure: false,
    strategy: ReloadStrategy.SMART,
    preserveState: true,
    clearConsole: true,
    enableHMR: true,
    hmrTimeout: 20000,
    acceptPatterns: [],
    errorRecovery: true,
    maxRetries: 3,
    fallbackReload: true,
    enableCaching: true,
    enableCompression: true,
    enableDiffing: true,
    enableOverlay: true,
    enableLogging: true,
    logLevel: LogLevel.INFO
  };
  
  return new HotReloadServer({ ...defaultConfig, ...config });
}

/**
 * Create hot reload client
 */
export function createHotReloadClient(config?: Partial<HotReloadClientConfig>): HotReloadClient {
  const defaultConfig: HotReloadClientConfig = {
    host: 'localhost',
    port: 3001,
    secure: false,
    enableHMR: true,
    preserveState: true,
    clearConsole: true,
    enableOverlay: true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 10
  };
  
  return new HotReloadClient({ ...defaultConfig, ...config });
}