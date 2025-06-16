/**
 * Cross-Platform Shared State Management
 * Unified state management system that works across Flutter, React Native, Next.js, Tauri, and SvelteKit
 */

import { platformDetector } from '../abstractions/platform.js';

export type StateValue = string | number | boolean | object | null | undefined;

export interface StateChange<T = StateValue> {
  key: string;
  previousValue: T;
  newValue: T;
  timestamp: Date;
  source: 'local' | 'remote' | 'sync';
}

export interface StateSubscription {
  id: string;
  key: string;
  callback: (change: StateChange) => void;
  filter?: (change: StateChange) => boolean;
}

export interface StatePersistenceConfig {
  enabled: boolean;
  keys?: string[];
  storage: 'memory' | 'localStorage' | 'secureStorage' | 'database';
  encryption?: boolean;
}

export interface StateSyncConfig {
  enabled: boolean;
  endpoint?: string;
  authentication?: {
    type: 'bearer' | 'apiKey' | 'oauth';
    token: string;
  };
  conflictResolution: 'lastWrite' | 'firstWrite' | 'merge' | 'manual';
  batchSize?: number;
  syncInterval?: number;
}

export interface StateStoreConfig {
  persistence?: StatePersistenceConfig;
  sync?: StateSyncConfig;
  enableDevTools?: boolean;
  middlewares?: StateMiddleware[];
}

export interface StateMiddleware {
  name: string;
  beforeChange?: (key: string, newValue: StateValue, oldValue: StateValue) => StateValue | Promise<StateValue>;
  afterChange?: (change: StateChange) => void | Promise<void>;
}

/**
 * Platform-agnostic state store interface
 */
export abstract class StateStoreAdapter {
  abstract platform: string;
  protected state: Map<string, StateValue> = new Map();
  protected subscriptions: Map<string, StateSubscription[]> = new Map();
  protected config: StateStoreConfig;
  
  constructor(config: StateStoreConfig = {}) {
    this.config = config;
  }
  
  // Core state operations
  abstract get<T = StateValue>(key: string): T | undefined;
  abstract set<T = StateValue>(key: string, value: T): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract has(key: string): boolean;
  abstract keys(): string[];
  abstract values(): StateValue[];
  abstract entries(): [string, StateValue][];
  
  // Batch operations
  abstract setBatch(updates: Record<string, StateValue>): Promise<void>;
  abstract getBatch<T = StateValue>(keys: string[]): Record<string, T>;
  
  // Subscriptions
  abstract subscribe(key: string, callback: (change: StateChange) => void, filter?: (change: StateChange) => boolean): () => void;
  abstract subscribeAll(callback: (change: StateChange) => void): () => void;
  
  // Persistence
  abstract persist(): Promise<void>;
  abstract restore(): Promise<void>;
  
  // Synchronization
  abstract sync(): Promise<void>;
  abstract enableAutoSync(interval?: number): () => void;
  
  // State history and debugging
  abstract getHistory(key?: string): StateChange[];
  abstract enableDevTools(): void;
  abstract disableDevTools(): void;
}

/**
 * Universal State Store Implementation
 * Works across all platforms with platform-specific optimizations
 */
export class UniversalStateStore extends StateStoreAdapter {
  platform: string;
  private subscriptionCounter = 0;
  private history: StateChange[] = [];
  private maxHistorySize = 1000;
  private middlewares: StateMiddleware[] = [];
  private syncTimer?: NodeJS.Timeout;
  private pendingSyncChanges: StateChange[] = [];
  
  constructor(config: StateStoreConfig = {}) {
    super(config);
    this.platform = platformDetector.detectPlatform();
    this.middlewares = config.middlewares || [];
    
    if (config.persistence?.enabled) {
      this.restore();
    }
    
    if (config.sync?.enabled && config.sync.syncInterval) {
      this.enableAutoSync(config.sync.syncInterval);
    }
    
    if (config.enableDevTools) {
      this.enableDevTools();
    }
  }
  
  get<T = StateValue>(key: string): T | undefined {
    return this.state.get(key) as T;
  }
  
  async set<T = StateValue>(key: string, value: T): Promise<void> {
    const oldValue = this.state.get(key);
    let newValue = value;
    
    // Apply beforeChange middlewares
    for (const middleware of this.middlewares) {
      if (middleware.beforeChange) {
        newValue = await middleware.beforeChange(key, newValue, oldValue) as T;
      }
    }
    
    this.state.set(key, newValue);
    
    const change: StateChange<T> = {
      key,
      previousValue: oldValue as T,
      newValue,
      timestamp: new Date(),
      source: 'local',
    };
    
    // Add to history
    this.addToHistory(change);
    
    // Notify subscribers
    this.notifySubscribers(key, change);
    
    // Apply afterChange middlewares
    for (const middleware of this.middlewares) {
      if (middleware.afterChange) {
        await middleware.afterChange(change);
      }
    }
    
    // Queue for sync if enabled
    if (this.config.sync?.enabled) {
      this.pendingSyncChanges.push(change);
    }
    
    // Persist if enabled
    if (this.config.persistence?.enabled) {
      await this.persist();
    }
  }
  
  async delete(key: string): Promise<void> {
    const oldValue = this.state.get(key);
    if (oldValue === undefined) return;
    
    this.state.delete(key);
    
    const change: StateChange = {
      key,
      previousValue: oldValue,
      newValue: undefined,
      timestamp: new Date(),
      source: 'local',
    };
    
    this.addToHistory(change);
    this.notifySubscribers(key, change);
    
    if (this.config.sync?.enabled) {
      this.pendingSyncChanges.push(change);
    }
    
    if (this.config.persistence?.enabled) {
      await this.persist();
    }
  }
  
  async clear(): Promise<void> {
    const keys = Array.from(this.state.keys());
    
    for (const key of keys) {
      await this.delete(key);
    }
  }
  
  has(key: string): boolean {
    return this.state.has(key);
  }
  
  keys(): string[] {
    return Array.from(this.state.keys());
  }
  
  values(): StateValue[] {
    return Array.from(this.state.values());
  }
  
  entries(): [string, StateValue][] {
    return Array.from(this.state.entries());
  }
  
  async setBatch(updates: Record<string, StateValue>): Promise<void> {
    const changes: StateChange[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const oldValue = this.state.get(key);
      let newValue = value;
      
      // Apply beforeChange middlewares
      for (const middleware of this.middlewares) {
        if (middleware.beforeChange) {
          newValue = await middleware.beforeChange(key, newValue, oldValue);
        }
      }
      
      this.state.set(key, newValue);
      
      const change: StateChange = {
        key,
        previousValue: oldValue,
        newValue,
        timestamp: new Date(),
        source: 'local',
      };
      
      changes.push(change);
    }
    
    // Process all changes
    for (const change of changes) {
      this.addToHistory(change);
      this.notifySubscribers(change.key, change);
      
      // Apply afterChange middlewares
      for (const middleware of this.middlewares) {
        if (middleware.afterChange) {
          await middleware.afterChange(change);
        }
      }
    }
    
    if (this.config.sync?.enabled) {
      this.pendingSyncChanges.push(...changes);
    }
    
    if (this.config.persistence?.enabled) {
      await this.persist();
    }
  }
  
  getBatch<T = StateValue>(keys: string[]): Record<string, T> {
    const result: Record<string, T> = {};
    
    for (const key of keys) {
      const value = this.state.get(key);
      if (value !== undefined) {
        result[key] = value as T;
      }
    }
    
    return result;
  }
  
  subscribe(key: string, callback: (change: StateChange) => void, filter?: (change: StateChange) => boolean): () => void {
    const subscription: StateSubscription = {
      id: `sub_${++this.subscriptionCounter}`,
      key,
      callback,
      filter,
    };
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    
    this.subscriptions.get(key)!.push(subscription);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(key);
      if (subs) {
        const index = subs.findIndex(s => s.id === subscription.id);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }
  
  subscribeAll(callback: (change: StateChange) => void): () => void {
    const subscription: StateSubscription = {
      id: `sub_all_${++this.subscriptionCounter}`,
      key: '*',
      callback,
    };
    
    if (!this.subscriptions.has('*')) {
      this.subscriptions.set('*', []);
    }
    
    this.subscriptions.get('*')!.push(subscription);
    
    return () => {
      const subs = this.subscriptions.get('*');
      if (subs) {
        const index = subs.findIndex(s => s.id === subscription.id);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }
  
  async persist(): Promise<void> {
    if (!this.config.persistence?.enabled) return;
    
    const data = Object.fromEntries(this.state.entries());
    
    // Determine what to persist
    let persistData = data;
    if (this.config.persistence.keys) {
      persistData = {};
      for (const key of this.config.persistence.keys) {
        if (data[key] !== undefined) {
          persistData[key] = data[key];
        }
      }
    }
    
    const serialized = JSON.stringify(persistData);
    
    try {
      switch (this.config.persistence.storage) {
        case 'localStorage':
          await this.persistToLocalStorage(serialized);
          break;
        case 'secureStorage':
          await this.persistToSecureStorage(serialized);
          break;
        case 'database':
          await this.persistToDatabase(serialized);
          break;
        default:
          // Memory storage - no persistence needed
          break;
      }
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
  
  async restore(): Promise<void> {
    if (!this.config.persistence?.enabled) return;
    
    try {
      let serialized: string | null = null;
      
      switch (this.config.persistence.storage) {
        case 'localStorage':
          serialized = await this.restoreFromLocalStorage();
          break;
        case 'secureStorage':
          serialized = await this.restoreFromSecureStorage();
          break;
        case 'database':
          serialized = await this.restoreFromDatabase();
          break;
        default:
          return;
      }
      
      if (serialized) {
        const data = JSON.parse(serialized);
        
        for (const [key, value] of Object.entries(data)) {
          this.state.set(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }
  
  async sync(): Promise<void> {
    if (!this.config.sync?.enabled || this.pendingSyncChanges.length === 0) return;
    
    try {
      const changes = this.pendingSyncChanges.splice(0, this.config.sync.batchSize || 100);
      
      if (this.config.sync.endpoint) {
        const response = await fetch(this.config.sync.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.sync.authentication && {
              'Authorization': `${this.config.sync.authentication.type === 'bearer' ? 'Bearer' : 'ApiKey'} ${this.config.sync.authentication.token}`,
            }),
          },
          body: JSON.stringify({ changes }),
        });
        
        if (!response.ok) {
          // Re-add changes to queue on failure
          this.pendingSyncChanges.unshift(...changes);
          throw new Error(`Sync failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Handle remote changes
        if (result.changes) {
          await this.applyRemoteChanges(result.changes);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  }
  
  enableAutoSync(interval: number = 5000): () => void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      this.sync();
    }, interval);
    
    return () => {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = undefined;
      }
    };
  }
  
  getHistory(key?: string): StateChange[] {
    if (key) {
      return this.history.filter(change => change.key === key);
    }
    return [...this.history];
  }
  
  enableDevTools(): void {
    if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
      // Redux DevTools integration
      const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect();
      
      this.subscribeAll((change) => {
        devTools.send({
          type: `SET_${change.key.toUpperCase()}`,
          payload: change.newValue,
        }, Object.fromEntries(this.state.entries()));
      });
    }
  }
  
  disableDevTools(): void {
    // DevTools integration cleanup would go here
  }
  
  // Platform-specific persistence methods
  
  private async persistToLocalStorage(data: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('state_store', data);
    }
  }
  
  private async restoreFromLocalStorage(): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('state_store');
    }
    return null;
  }
  
  private async persistToSecureStorage(data: string): Promise<void> {
    switch (this.platform) {
      case 'react-native':
        try {
          const Keychain = await import('react-native-keychain');
          await Keychain.setInternetCredentials('state_store', 'state', data);
        } catch (error) {
          console.error('Secure storage not available, falling back to localStorage');
          await this.persistToLocalStorage(data);
        }
        break;
      
      case 'tauri':
        try {
          const { Store } = await import('@tauri-apps/plugin-store');
          const store = new Store('.state.dat');
          await store.set('data', data);
          await store.save();
        } catch (error) {
          console.error('Tauri store not available, falling back to localStorage');
          await this.persistToLocalStorage(data);
        }
        break;
      
      default:
        await this.persistToLocalStorage(data);
        break;
    }
  }
  
  private async restoreFromSecureStorage(): Promise<string | null> {
    switch (this.platform) {
      case 'react-native':
        try {
          const Keychain = await import('react-native-keychain');
          const credentials = await Keychain.getInternetCredentials('state_store');
          return credentials ? credentials.password : null;
        } catch {
          return this.restoreFromLocalStorage();
        }
      
      case 'tauri':
        try {
          const { Store } = await import('@tauri-apps/plugin-store');
          const store = new Store('.state.dat');
          return await store.get('data') as string | null;
        } catch {
          return this.restoreFromLocalStorage();
        }
      
      default:
        return this.restoreFromLocalStorage();
    }
  }
  
  private async persistToDatabase(data: string): Promise<void> {
    // Platform-specific database implementation would go here
    // For now, fall back to localStorage
    await this.persistToLocalStorage(data);
  }
  
  private async restoreFromDatabase(): Promise<string | null> {
    // Platform-specific database implementation would go here
    // For now, fall back to localStorage
    return this.restoreFromLocalStorage();
  }
  
  private addToHistory(change: StateChange): void {
    this.history.push(change);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
  
  private notifySubscribers(key: string, change: StateChange): void {
    // Notify key-specific subscribers
    const keySubscriptions = this.subscriptions.get(key) || [];
    for (const subscription of keySubscriptions) {
      if (!subscription.filter || subscription.filter(change)) {
        subscription.callback(change);
      }
    }
    
    // Notify global subscribers
    const globalSubscriptions = this.subscriptions.get('*') || [];
    for (const subscription of globalSubscriptions) {
      if (!subscription.filter || subscription.filter(change)) {
        subscription.callback(change);
      }
    }
  }
  
  private async applyRemoteChanges(changes: StateChange[]): Promise<void> {
    for (const change of changes) {
      // Apply conflict resolution
      const shouldApply = await this.resolveConflict(change);
      
      if (shouldApply) {
        this.state.set(change.key, change.newValue);
        
        const localChange: StateChange = {
          ...change,
          source: 'remote',
        };
        
        this.addToHistory(localChange);
        this.notifySubscribers(change.key, localChange);
      }
    }
  }
  
  private async resolveConflict(remoteChange: StateChange): Promise<boolean> {
    const localValue = this.state.get(remoteChange.key);
    const conflictResolution = this.config.sync?.conflictResolution || 'lastWrite';
    
    switch (conflictResolution) {
      case 'lastWrite':
        return true; // Always accept remote changes
      
      case 'firstWrite':
        return localValue === undefined; // Only accept if no local value
      
      case 'merge':
        // Implement merge logic based on value types
        if (typeof localValue === 'object' && typeof remoteChange.newValue === 'object') {
          const merged = { ...localValue, ...remoteChange.newValue };
          remoteChange.newValue = merged;
        }
        return true;
      
      case 'manual':
        // Emit conflict event for manual resolution
        // This would trigger a UI prompt or custom conflict resolver
        return false;
      
      default:
        return true;
    }
  }
}

/**
 * Framework-specific adapters
 */

// React hook integration
export function useStateStore(store: UniversalStateStore) {
  if (typeof window === 'undefined') return { get: store.get.bind(store), set: store.set.bind(store) };
  
  const [, forceUpdate] = (window as any).React?.useState(0) || [null, () => {}];
  
  (window as any).React?.useEffect(() => {
    const unsubscribe = store.subscribeAll(() => {
      forceUpdate((n: number) => n + 1);
    });
    
    return unsubscribe;
  }, [store]);
  
  return {
    get: store.get.bind(store),
    set: store.set.bind(store),
    delete: store.delete.bind(store),
    subscribe: store.subscribe.bind(store),
  };
}

// Svelte store integration
export function createSvelteStore(store: UniversalStateStore) {
  return {
    subscribe: (callback: (value: any) => void) => {
      // Initial value
      callback(Object.fromEntries(store.entries()));
      
      // Subscribe to changes
      return store.subscribeAll(() => {
        callback(Object.fromEntries(store.entries()));
      });
    },
    set: store.set.bind(store),
    update: (updater: (value: any) => any) => {
      const current = Object.fromEntries(store.entries());
      const updated = updater(current);
      store.setBatch(updated);
    },
  };
}

// Vue composition API integration
export function useStateStoreComposition(store: UniversalStateStore) {
  if (typeof window === 'undefined') return { state: {}, set: store.set.bind(store) };
  
  const state = (window as any).Vue?.reactive(Object.fromEntries(store.entries())) || {};
  
  store.subscribeAll((change) => {
    if (state && change.newValue !== undefined) {
      state[change.key] = change.newValue;
    } else if (state && change.newValue === undefined) {
      delete state[change.key];
    }
  });
  
  return {
    state,
    set: store.set.bind(store),
    delete: store.delete.bind(store),
  };
}

// Export default store instance
export const sharedStore = new UniversalStateStore({
  persistence: {
    enabled: true,
    storage: 'localStorage',
  },
  enableDevTools: process?.env?.NODE_ENV === 'development',
});