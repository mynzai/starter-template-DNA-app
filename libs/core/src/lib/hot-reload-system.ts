/**
 * @fileoverview Hot-Reload System for DNA Module Development - Epic 5 Story 1 AC4
 * Provides real-time module reloading, state preservation, and development tooling
 * for efficient DNA module development and testing.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import chokidar from 'chokidar';
import { debounce } from 'lodash';
import {
  DNAModule,
  DNAModuleContext,
  DNACompositionResult,
  SupportedFramework
} from './types';

/**
 * Hot-reload configuration options
 */
export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  ignorePaths: string[];
  debounceMs: number;
  preserveState: boolean;
  autoRecompile: boolean;
  reloadStrategies: {
    moduleChange: 'full' | 'incremental' | 'smart';
    configChange: 'reload' | 'update' | 'merge';
    dependencyChange: 'cascade' | 'selective' | 'minimal';
    templateChange: 'regenerate' | 'patch' | 'skip';
  };
  notifications: {
    desktop: boolean;
    console: boolean;
    websocket: boolean;
  };
  persistence: {
    saveState: boolean;
    stateFile: string;
    maxStateHistory: number;
  };
}

/**
 * File change event information
 */
export interface FileChangeEvent {
  readonly type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  readonly path: string;
  readonly relativePath: string;
  readonly timestamp: number;
  readonly stats?: import('fs').Stats;
  readonly changeType: 'module' | 'config' | 'dependency' | 'template' | 'unknown';
}

/**
 * Hot-reload session state
 */
export interface HotReloadSession {
  readonly id: string;
  readonly startTime: number;
  readonly watchedPaths: string[];
  readonly activeCompositions: Map<string, DNACompositionResult>;
  readonly moduleStates: Map<string, any>;
  readonly reloadHistory: FileChangeEvent[];
  readonly errorHistory: Array<{ timestamp: number; error: Error; path?: string }>;
}

/**
 * Module state snapshot for preservation
 */
export interface ModuleStateSnapshot {
  readonly moduleId: string;
  readonly version: string;
  readonly state: any;
  readonly timestamp: number;
  readonly context: Partial<DNAModuleContext>;
}

/**
 * Hot-reload operation result
 */
export interface HotReloadResult {
  readonly success: boolean;
  readonly operation: 'reload' | 'update' | 'regenerate' | 'compile';
  readonly affectedModules: string[];
  readonly duration: number;
  readonly errors: string[];
  readonly warnings: string[];
  readonly statePreserved: boolean;
}

/**
 * Advanced hot-reload system with intelligent change detection
 */
export class HotReloadSystem extends EventEmitter {
  private config: HotReloadConfig;
  private watcher: chokidar.FSWatcher | null = null;
  private session: HotReloadSession;
  private debouncedHandlers: Map<string, Function> = new Map();
  private moduleRegistry: Map<string, DNAModule> = new Map();
  private compositionCache: Map<string, DNACompositionResult> = new Map();
  private stateSnapshots: Map<string, ModuleStateSnapshot[]> = new Map();
  private isReloading = false;
  private websocketServer: any = null; // Would be a WebSocket server in real implementation

  constructor(
    config: Partial<HotReloadConfig> = {},
    private workingDirectory: string = process.cwd()
  ) {
    super();
    
    this.config = {
      enabled: true,
      watchPaths: ['./dna-modules', './templates', './config'],
      ignorePaths: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/*.log'],
      debounceMs: 500,
      preserveState: true,
      autoRecompile: true,
      reloadStrategies: {
        moduleChange: 'smart',
        configChange: 'merge',
        dependencyChange: 'selective',
        templateChange: 'regenerate'
      },
      notifications: {
        desktop: false,
        console: true,
        websocket: false
      },
      persistence: {
        saveState: true,
        stateFile: '.hot-reload-state.json',
        maxStateHistory: 50
      },
      ...config
    };

    this.session = this.createSession();
  }

  /**
   * Initialize hot-reload system
   */
  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.emit('hotreload:disabled');
      return;
    }

    this.emit('hotreload:initializing', { config: this.config });

    try {
      // Load persisted state if available
      await this.loadPersistedState();

      // Initialize file watcher
      await this.initializeWatcher();

      // Initialize WebSocket server if enabled
      if (this.config.notifications.websocket) {
        await this.initializeWebSocketServer();
      }

      // Setup debounced handlers
      this.setupDebouncedHandlers();

      this.emit('hotreload:initialized', {
        sessionId: this.session.id,
        watchedPaths: this.session.watchedPaths
      });

    } catch (error) {
      this.emit('hotreload:error', { error, phase: 'initialization' });
      throw error;
    }
  }

  /**
   * Start hot-reload monitoring
   */
  public async start(): Promise<void> {
    if (!this.watcher) {
      await this.initialize();
    }

    this.emit('hotreload:started', { sessionId: this.session.id });
    
    if (this.config.notifications.console) {
      console.log(`🔥 Hot-reload started - watching ${this.session.watchedPaths.length} paths`);
    }
  }

  /**
   * Stop hot-reload monitoring
   */
  public async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    if (this.websocketServer) {
      // Close WebSocket server
      this.websocketServer = null;
    }

    // Save state if persistence is enabled
    if (this.config.persistence.saveState) {
      await this.saveState();
    }

    this.emit('hotreload:stopped', { sessionId: this.session.id });
    
    if (this.config.notifications.console) {
      console.log('🔥 Hot-reload stopped');
    }
  }

  /**
   * Register a DNA module for hot-reloading
   */
  public registerModule(module: DNAModule): void {
    this.moduleRegistry.set(module.metadata.id, module);
    
    // Create initial state snapshot if preservation is enabled
    if (this.config.preserveState) {
      this.createStateSnapshot(module.metadata.id, {});
    }

    this.emit('hotreload:module_registered', {
      moduleId: module.metadata.id,
      version: module.metadata.version
    });
  }

  /**
   * Register a composition for hot-reloading
   */
  public registerComposition(
    compositionId: string,
    composition: DNACompositionResult
  ): void {
    this.session.activeCompositions.set(compositionId, composition);
    this.compositionCache.set(compositionId, composition);

    this.emit('hotreload:composition_registered', {
      compositionId,
      moduleCount: composition.modules.length
    });
  }

  /**
   * Trigger manual reload of specific module
   */
  public async reloadModule(
    moduleId: string,
    options: {
      preserveState?: boolean;
      recompile?: boolean;
      cascadeChanges?: boolean;
    } = {}
  ): Promise<HotReloadResult> {
    const startTime = Date.now();
    
    this.emit('hotreload:manual_reload_started', { moduleId, options });

    try {
      const result = await this.performModuleReload(
        moduleId,
        {
          preserveState: options.preserveState ?? this.config.preserveState,
          recompile: options.recompile ?? this.config.autoRecompile,
          cascadeChanges: options.cascadeChanges ?? true
        }
      );

      this.emit('hotreload:manual_reload_completed', { moduleId, result });
      return result;

    } catch (error) {
      const result: HotReloadResult = {
        success: false,
        operation: 'reload',
        affectedModules: [moduleId],
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        statePreserved: false
      };

      this.emit('hotreload:manual_reload_failed', { moduleId, error, result });
      return result;
    }
  }

  /**
   * Get current session information
   */
  public getSession(): HotReloadSession {
    return { ...this.session };
  }

  /**
   * Get hot-reload statistics
   */
  public getStats(): {
    sessionDuration: number;
    watchedFiles: number;
    reloadCount: number;
    errorCount: number;
    averageReloadTime: number;
    registeredModules: number;
    activeCompositions: number;
  } {
    const reloadEvents = this.session.reloadHistory.length;
    const averageReloadTime = reloadEvents > 0 
      ? this.session.reloadHistory.reduce((sum, event) => sum + event.timestamp, 0) / reloadEvents
      : 0;

    return {
      sessionDuration: Date.now() - this.session.startTime,
      watchedFiles: this.session.watchedPaths.length,
      reloadCount: reloadEvents,
      errorCount: this.session.errorHistory.length,
      averageReloadTime,
      registeredModules: this.moduleRegistry.size,
      activeCompositions: this.session.activeCompositions.size
    };
  }

  /**
   * Clear reload history and errors
   */
  public clearHistory(): void {
    this.session = {
      ...this.session,
      reloadHistory: [],
      errorHistory: []
    };
    
    this.emit('hotreload:history_cleared');
  }

  // Private implementation methods

  private createSession(): HotReloadSession {
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      watchedPaths: [],
      activeCompositions: new Map(),
      moduleStates: new Map(),
      reloadHistory: [],
      errorHistory: []
    };
  }

  private async initializeWatcher(): Promise<void> {
    const watchPaths = this.config.watchPaths.map(path => 
      resolve(this.workingDirectory, path)
    );

    this.watcher = chokidar.watch(watchPaths, {
      ignored: this.config.ignorePaths,
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10,
      interval: 100,
      binaryInterval: 300
    });

    this.session.watchedPaths = watchPaths;

    this.watcher
      .on('add', (path, stats) => this.handleFileChange('add', path, stats))
      .on('change', (path, stats) => this.handleFileChange('change', path, stats))
      .on('unlink', (path) => this.handleFileChange('unlink', path))
      .on('addDir', (path, stats) => this.handleFileChange('addDir', path, stats))
      .on('unlinkDir', (path) => this.handleFileChange('unlinkDir', path))
      .on('error', (error) => this.handleWatcherError(error))
      .on('ready', () => this.emit('hotreload:watcher_ready'));
  }

  private setupDebouncedHandlers(): void {
    const changeTypes = ['module', 'config', 'dependency', 'template'];
    
    for (const changeType of changeTypes) {
      const handler = debounce(
        (events: FileChangeEvent[]) => this.processChangeEvents(changeType, events),
        this.config.debounceMs
      );
      
      this.debouncedHandlers.set(changeType, handler);
    }
  }

  private async handleFileChange(
    type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
    path: string,
    stats?: import('fs').Stats
  ): Promise<void> {
    const relativePath = relative(this.workingDirectory, path);
    const changeType = this.determineChangeType(path);
    
    const event: FileChangeEvent = {
      type,
      path,
      relativePath,
      timestamp: Date.now(),
      stats,
      changeType
    };

    // Add to history
    this.session.reloadHistory.push(event);
    
    // Trim history if needed
    if (this.session.reloadHistory.length > this.config.persistence.maxStateHistory) {
      this.session.reloadHistory.shift();
    }

    this.emit('hotreload:file_changed', event);

    // Get debounced handler for this change type
    const handler = this.debouncedHandlers.get(changeType);
    if (handler) {
      handler([event]);
    }
  }

  private handleWatcherError(error: Error): void {
    this.session.errorHistory.push({
      timestamp: Date.now(),
      error
    });

    this.emit('hotreload:watcher_error', { error });
    
    if (this.config.notifications.console) {
      console.error('🔥 Hot-reload watcher error:', error.message);
    }
  }

  private determineChangeType(path: string): 'module' | 'config' | 'dependency' | 'template' | 'unknown' {
    const normalizedPath = path.toLowerCase();
    
    if (normalizedPath.includes('module.json') || 
        normalizedPath.includes('.module.') ||
        normalizedPath.includes('/modules/')) {
      return 'module';
    }
    
    if (normalizedPath.includes('config') || 
        normalizedPath.includes('.config.') ||
        normalizedPath.includes('package.json')) {
      return 'config';
    }
    
    if (normalizedPath.includes('dependencies') ||
        normalizedPath.includes('package-lock.json') ||
        normalizedPath.includes('yarn.lock') ||
        normalizedPath.includes('pnpm-lock.yaml')) {
      return 'dependency';
    }
    
    if (normalizedPath.includes('template') ||
        normalizedPath.includes('.hbs') ||
        normalizedPath.includes('.mustache') ||
        normalizedPath.includes('.ejs')) {
      return 'template';
    }
    
    return 'unknown';
  }

  private async processChangeEvents(
    changeType: string,
    events: FileChangeEvent[]
  ): Promise<void> {
    if (this.isReloading) {
      this.emit('hotreload:reload_skipped', { reason: 'already_reloading', events });
      return;
    }

    this.isReloading = true;
    
    try {
      this.emit('hotreload:processing_started', { changeType, eventCount: events.length });

      switch (changeType) {
        case 'module':
          await this.handleModuleChanges(events);
          break;
        case 'config':
          await this.handleConfigChanges(events);
          break;
        case 'dependency':
          await this.handleDependencyChanges(events);
          break;
        case 'template':
          await this.handleTemplateChanges(events);
          break;
      }

      this.emit('hotreload:processing_completed', { changeType, eventCount: events.length });
      
    } catch (error) {
      this.session.errorHistory.push({
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('Unknown processing error')
      });
      
      this.emit('hotreload:processing_error', { changeType, error, events });
      
    } finally {
      this.isReloading = false;
    }
  }

  private async handleModuleChanges(events: FileChangeEvent[]): Promise<void> {
    const strategy = this.config.reloadStrategies.moduleChange;
    const affectedModules = new Set<string>();

    for (const event of events) {
      const moduleId = this.extractModuleIdFromPath(event.path);
      if (moduleId) {
        affectedModules.add(moduleId);
      }
    }

    for (const moduleId of affectedModules) {
      await this.reloadModuleByStrategy(moduleId, strategy);
    }
  }

  private async handleConfigChanges(events: FileChangeEvent[]): Promise<void> {
    const strategy = this.config.reloadStrategies.configChange;
    
    this.emit('hotreload:config_changes_detected', { 
      strategy, 
      files: events.map(e => e.relativePath) 
    });

    switch (strategy) {
      case 'reload':
        await this.reloadAllCompositions();
        break;
      case 'update':
        await this.updateConfigurations(events);
        break;
      case 'merge':
        await this.mergeConfigurations(events);
        break;
    }
  }

  private async handleDependencyChanges(events: FileChangeEvent[]): Promise<void> {
    const strategy = this.config.reloadStrategies.dependencyChange;
    
    this.emit('hotreload:dependency_changes_detected', { 
      strategy, 
      files: events.map(e => e.relativePath) 
    });

    switch (strategy) {
      case 'cascade':
        await this.cascadeDependencyChanges(events);
        break;
      case 'selective':
        await this.selectiveDependencyUpdate(events);
        break;
      case 'minimal':
        await this.minimalDependencyUpdate(events);
        break;
    }
  }

  private async handleTemplateChanges(events: FileChangeEvent[]): Promise<void> {
    const strategy = this.config.reloadStrategies.templateChange;
    
    this.emit('hotreload:template_changes_detected', { 
      strategy, 
      files: events.map(e => e.relativePath) 
    });

    switch (strategy) {
      case 'regenerate':
        await this.regenerateAffectedTemplates(events);
        break;
      case 'patch':
        await this.patchTemplateChanges(events);
        break;
      case 'skip':
        this.emit('hotreload:template_changes_skipped', { events });
        break;
    }
  }

  private extractModuleIdFromPath(path: string): string | null {
    // Extract module ID from file path
    // This is a simplified implementation
    const match = path.match(/\/modules\/([^/]+)\//i) || path.match(/([^/]+)\.module\./i);
    return match ? match[1] : null;
  }

  private async reloadModuleByStrategy(
    moduleId: string,
    strategy: 'full' | 'incremental' | 'smart'
  ): Promise<void> {
    this.emit('hotreload:module_reload_started', { moduleId, strategy });

    try {
      switch (strategy) {
        case 'full':
          await this.performFullModuleReload(moduleId);
          break;
        case 'incremental':
          await this.performIncrementalModuleReload(moduleId);
          break;
        case 'smart':
          await this.performSmartModuleReload(moduleId);
          break;
      }

      this.emit('hotreload:module_reload_completed', { moduleId, strategy });
      
    } catch (error) {
      this.emit('hotreload:module_reload_failed', { moduleId, strategy, error });
      throw error;
    }
  }

  private async performModuleReload(
    moduleId: string,
    options: {
      preserveState: boolean;
      recompile: boolean;
      cascadeChanges: boolean;
    }
  ): Promise<HotReloadResult> {
    const startTime = Date.now();
    const affectedModules = [moduleId];
    const errors: string[] = [];
    const warnings: string[] = [];
    let statePreserved = false;

    try {
      // Step 1: Preserve state if requested
      if (options.preserveState) {
        const currentState = this.session.moduleStates.get(moduleId);
        if (currentState) {
          this.createStateSnapshot(moduleId, currentState);
          statePreserved = true;
        }
      }

      // Step 2: Reload module
      await this.reloadModuleFromFile(moduleId);

      // Step 3: Restore state if preserved
      if (statePreserved) {
        await this.restoreModuleState(moduleId);
      }

      // Step 4: Cascade changes if requested
      if (options.cascadeChanges) {
        const dependentModules = await this.findDependentModules(moduleId);
        affectedModules.push(...dependentModules);
        
        for (const dependentModule of dependentModules) {
          await this.reloadModuleFromFile(dependentModule);
        }
      }

      // Step 5: Recompile if requested
      if (options.recompile) {
        await this.recompileAffectedCompositions(affectedModules);
      }

      return {
        success: true,
        operation: 'reload',
        affectedModules,
        duration: Date.now() - startTime,
        errors,
        warnings,
        statePreserved
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        operation: 'reload',
        affectedModules,
        duration: Date.now() - startTime,
        errors,
        warnings,
        statePreserved
      };
    }
  }

  private async performFullModuleReload(moduleId: string): Promise<void> {
    // Full reload: completely reload module and all dependencies
    this.emit('hotreload:full_reload', { moduleId });
    
    // Implementation would completely reload the module
    // This is a placeholder
  }

  private async performIncrementalModuleReload(moduleId: string): Promise<void> {
    // Incremental reload: only reload changed parts
    this.emit('hotreload:incremental_reload', { moduleId });
    
    // Implementation would analyze changes and reload only affected parts
    // This is a placeholder
  }

  private async performSmartModuleReload(moduleId: string): Promise<void> {
    // Smart reload: analyze impact and choose optimal strategy
    this.emit('hotreload:smart_reload', { moduleId });
    
    // Implementation would analyze the change impact and choose the best approach
    // This is a placeholder
  }

  private async reloadModuleFromFile(moduleId: string): Promise<void> {
    // Implementation would reload the module from its file
    this.emit('hotreload:module_file_reload', { moduleId });
  }

  private createStateSnapshot(moduleId: string, state: any): void {
    const snapshot: ModuleStateSnapshot = {
      moduleId,
      version: this.moduleRegistry.get(moduleId)?.metadata.version || 'unknown',
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      timestamp: Date.now(),
      context: {}
    };

    if (!this.stateSnapshots.has(moduleId)) {
      this.stateSnapshots.set(moduleId, []);
    }

    const snapshots = this.stateSnapshots.get(moduleId)!;
    snapshots.push(snapshot);

    // Keep only recent snapshots
    if (snapshots.length > this.config.persistence.maxStateHistory) {
      snapshots.shift();
    }

    this.emit('hotreload:state_snapshot_created', { moduleId, snapshot });
  }

  private async restoreModuleState(moduleId: string): Promise<void> {
    const snapshots = this.stateSnapshots.get(moduleId);
    if (!snapshots || snapshots.length === 0) {
      return;
    }

    const latestSnapshot = snapshots[snapshots.length - 1];
    this.session.moduleStates.set(moduleId, latestSnapshot.state);

    this.emit('hotreload:state_restored', { moduleId, snapshot: latestSnapshot });
  }

  private async findDependentModules(moduleId: string): Promise<string[]> {
    const dependents: string[] = [];
    
    for (const [id, module] of this.moduleRegistry) {
      if (id !== moduleId && module.dependencies.some(dep => dep.moduleId === moduleId)) {
        dependents.push(id);
      }
    }

    return dependents;
  }

  private async reloadAllCompositions(): Promise<void> {
    this.emit('hotreload:reloading_all_compositions');
    
    for (const [compositionId, composition] of this.session.activeCompositions) {
      await this.recompileComposition(compositionId, composition);
    }
  }

  private async updateConfigurations(events: FileChangeEvent[]): Promise<void> {
    this.emit('hotreload:updating_configurations', { events });
    // Implementation would update configurations based on file changes
  }

  private async mergeConfigurations(events: FileChangeEvent[]): Promise<void> {
    this.emit('hotreload:merging_configurations', { events });
    // Implementation would merge configuration changes
  }

  private async cascadeDependencyChanges(events: FileChangeEvent[]): Promise<void> {
    this.emit('hotreload:cascading_dependency_changes', { events });
    // Implementation would cascade dependency changes
  }

  private async selectiveDependencyUpdate(events: FileChangeEvent[]): Promise<void> {
    this.emit('hotreload:selective_dependency_update', { events });
    // Implementation would selectively update dependencies
  }

  private async minimalDependencyUpdate(events: FileChangeEvent[]): Promise<void> {
    this.emit('hotreload:minimal_dependency_update', { events });
    // Implementation would do minimal dependency updates
  }

  private async regenerateAffectedTemplates(events: FileChangeEvent[]): Promise<void> {
    this.emit('hotreload:regenerating_templates', { events });
    // Implementation would regenerate affected templates
  }

  private async patchTemplateChanges(events: FileChangeEvent[]): Promise<void> {
    this.emit('hotreload:patching_template_changes', { events });
    // Implementation would patch template changes
  }

  private async recompileAffectedCompositions(affectedModules: string[]): Promise<void> {
    const affectedCompositions = new Set<string>();
    
    // Find compositions that use the affected modules
    for (const [compositionId, composition] of this.session.activeCompositions) {
      if (composition.modules.some(module => affectedModules.includes(module.metadata.id))) {
        affectedCompositions.add(compositionId);
      }
    }

    // Recompile affected compositions
    for (const compositionId of affectedCompositions) {
      const composition = this.session.activeCompositions.get(compositionId)!;
      await this.recompileComposition(compositionId, composition);
    }
  }

  private async recompileComposition(
    compositionId: string,
    composition: DNACompositionResult
  ): Promise<void> {
    this.emit('hotreload:recompiling_composition', { compositionId, composition });
    // Implementation would recompile the composition
  }

  private async loadPersistedState(): Promise<void> {
    if (!this.config.persistence.saveState) {
      return;
    }

    try {
      const stateFile = resolve(this.workingDirectory, this.config.persistence.stateFile);
      const stateData = await fs.readFile(stateFile, 'utf8');
      const persistedState = JSON.parse(stateData);
      
      // Restore relevant state
      if (persistedState.moduleStates) {
        this.session.moduleStates = new Map(persistedState.moduleStates);
      }
      
      if (persistedState.stateSnapshots) {
        this.stateSnapshots = new Map(persistedState.stateSnapshots);
      }

      this.emit('hotreload:state_loaded', { stateFile });
      
    } catch (error) {
      // State file doesn't exist or is corrupted - start fresh
      this.emit('hotreload:state_load_failed', { error });
    }
  }

  private async saveState(): Promise<void> {
    if (!this.config.persistence.saveState) {
      return;
    }

    try {
      const stateFile = resolve(this.workingDirectory, this.config.persistence.stateFile);
      const stateData = {
        sessionId: this.session.id,
        timestamp: Date.now(),
        moduleStates: Array.from(this.session.moduleStates.entries()),
        stateSnapshots: Array.from(this.stateSnapshots.entries()),
        reloadHistory: this.session.reloadHistory.slice(-50) // Keep last 50 events
      };
      
      await fs.writeFile(stateFile, JSON.stringify(stateData, null, 2));
      this.emit('hotreload:state_saved', { stateFile });
      
    } catch (error) {
      this.emit('hotreload:state_save_failed', { error });
    }
  }

  private async initializeWebSocketServer(): Promise<void> {
    // Placeholder for WebSocket server initialization
    // In a real implementation, this would set up a WebSocket server
    // for real-time communication with development tools
    this.emit('hotreload:websocket_server_initialized');
  }
}

/**
 * Factory function to create hot-reload system
 */
export function createHotReloadSystem(
  config: Partial<HotReloadConfig> = {},
  workingDirectory: string = process.cwd()
): HotReloadSystem {
  return new HotReloadSystem(config, workingDirectory);
}

/**
 * Default hot-reload configuration for development
 */
export const DEFAULT_DEV_CONFIG: HotReloadConfig = {
  enabled: true,
  watchPaths: ['./dna-modules', './templates', './config'],
  ignorePaths: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/*.log'],
  debounceMs: 300,
  preserveState: true,
  autoRecompile: true,
  reloadStrategies: {
    moduleChange: 'smart',
    configChange: 'merge',
    dependencyChange: 'selective',
    templateChange: 'regenerate'
  },
  notifications: {
    desktop: false,
    console: true,
    websocket: true
  },
  persistence: {
    saveState: true,
    stateFile: '.hot-reload-state.json',
    maxStateHistory: 100
  }
};

/**
 * Production-safe hot-reload configuration
 */
export const PRODUCTION_SAFE_CONFIG: HotReloadConfig = {
  enabled: false,
  watchPaths: [],
  ignorePaths: ['**/*'],
  debounceMs: 1000,
  preserveState: false,
  autoRecompile: false,
  reloadStrategies: {
    moduleChange: 'full',
    configChange: 'reload',
    dependencyChange: 'cascade',
    templateChange: 'skip'
  },
  notifications: {
    desktop: false,
    console: false,
    websocket: false
  },
  persistence: {
    saveState: false,
    stateFile: '',
    maxStateHistory: 0
  }
};
