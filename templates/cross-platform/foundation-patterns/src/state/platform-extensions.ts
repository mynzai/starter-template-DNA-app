/**
 * Platform-Specific State Management Extensions
 * Provides platform-optimized state management features for each supported platform
 */

import { UniversalStateStore, StateMiddleware, StateStoreConfig } from './shared-store.js';
import { platformDetector } from '../abstractions/platform.js';

/**
 * React Native State Extensions
 */
export class ReactNativeStateExtensions {
  static createReactNativeStore(config: StateStoreConfig = {}): UniversalStateStore {
    const enhancedConfig: StateStoreConfig = {
      ...config,
      persistence: {
        enabled: true,
        storage: 'secureStorage',
        ...config.persistence,
      },
      middlewares: [
        ...config.middlewares || [],
        this.createNetworkAwareMiddleware(),
        this.createAppStateMiddleware(),
        this.createPushNotificationMiddleware(),
      ],
    };
    
    return new UniversalStateStore(enhancedConfig);
  }
  
  // Network-aware middleware for React Native
  private static createNetworkAwareMiddleware(): StateMiddleware {
    return {
      name: 'react-native-network-aware',
      beforeChange: async (key, newValue, oldValue) => {
        try {
          const NetInfo = await import('@react-native-community/netinfo');
          const netInfo = await NetInfo.fetch();
          
          // Queue changes when offline
          if (!netInfo.isConnected) {
            // Store offline changes with special prefix
            if (!key.startsWith('__offline__')) {
              return { __offline__: true, key, value: newValue, timestamp: Date.now() };
            }
          }
        } catch {
          // NetInfo not available
        }
        
        return newValue;
      },
    };
  }
  
  // App state lifecycle middleware
  private static createAppStateMiddleware(): StateMiddleware {
    return {
      name: 'react-native-app-state',
      afterChange: async (change) => {
        try {
          const { AppState } = await import('react-native');
          
          // Save state when app goes to background
          AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
              // Trigger persistence on app state change
              // This would be handled by the store's persist method
            }
          });
        } catch {
          // AppState not available
        }
      },
    };
  }
  
  // Push notification state synchronization
  private static createPushNotificationMiddleware(): StateMiddleware {
    return {
      name: 'react-native-push-notification',
      afterChange: async (change) => {
        try {
          const PushNotification = await import('react-native-push-notification');
          
          // Update badge count based on state changes
          if (change.key.includes('notification') || change.key.includes('badge')) {
            const badgeCount = this.calculateBadgeCount(change);
            PushNotification.default.setApplicationIconBadgeNumber(badgeCount);
          }
        } catch {
          // Push notifications not available
        }
      },
    };
  }
  
  private static calculateBadgeCount(change: any): number {
    // Calculate badge count based on state changes
    return 0;
  }
}

/**
 * Flutter State Extensions
 */
export class FlutterStateExtensions {
  static createFlutterStore(config: StateStoreConfig = {}): UniversalStateStore {
    const enhancedConfig: StateStoreConfig = {
      ...config,
      persistence: {
        enabled: true,
        storage: 'secureStorage',
        ...config.persistence,
      },
      middlewares: [
        ...config.middlewares || [],
        this.createFlutterChannelMiddleware(),
        this.createIsolateAwareMiddleware(),
      ],
    };
    
    return new UniversalStateStore(enhancedConfig);
  }
  
  // Flutter platform channel communication
  private static createFlutterChannelMiddleware(): StateMiddleware {
    return {
      name: 'flutter-channel',
      afterChange: async (change) => {
        // In a real Flutter app, this would communicate with the Dart side
        // via platform channels to sync state with Flutter widgets
        if (typeof window !== 'undefined' && (window as any).flutter) {
          try {
            await (window as any).flutter.postMessage({
              type: 'state_change',
              data: change,
            });
          } catch (error) {
            console.warn('Failed to sync with Flutter:', error);
          }
        }
      },
    };
  }
  
  // Isolate-aware state management for Flutter
  private static createIsolateAwareMiddleware(): StateMiddleware {
    return {
      name: 'flutter-isolate-aware',
      beforeChange: async (key, newValue, oldValue) => {
        // Ensure state changes are serializable for isolate communication
        try {
          JSON.stringify(newValue);
          return newValue;
        } catch {
          console.warn(`Value for key "${key}" is not serializable for isolate communication`);
          return oldValue;
        }
      },
    };
  }
}

/**
 * Tauri State Extensions
 */
export class TauriStateExtensions {
  static createTauriStore(config: StateStoreConfig = {}): UniversalStateStore {
    const enhancedConfig: StateStoreConfig = {
      ...config,
      persistence: {
        enabled: true,
        storage: 'secureStorage',
        ...config.persistence,
      },
      middlewares: [
        ...config.middlewares || [],
        this.createTauriCommandMiddleware(),
        this.createTauriEventMiddleware(),
        this.createTauriFileWatchMiddleware(),
      ],
    };
    
    return new UniversalStateStore(enhancedConfig);
  }
  
  // Tauri command integration
  private static createTauriCommandMiddleware(): StateMiddleware {
    return {
      name: 'tauri-command',
      afterChange: async (change) => {
        try {
          const { invoke } = await import('@tauri-apps/api/tauri');
          
          // Notify Rust backend of state changes
          await invoke('state_changed', {
            key: change.key,
            value: change.newValue,
            timestamp: change.timestamp.toISOString(),
          });
        } catch (error) {
          console.warn('Failed to invoke Tauri command:', error);
        }
      },
    };
  }
  
  // Tauri event system integration
  private static createTauriEventMiddleware(): StateMiddleware {
    return {
      name: 'tauri-event',
      afterChange: async (change) => {
        try {
          const { emit } = await import('@tauri-apps/api/event');
          
          // Emit events for other parts of the application
          await emit('state-change', {
            key: change.key,
            value: change.newValue,
            previous: change.previousValue,
            timestamp: change.timestamp.toISOString(),
          });
        } catch (error) {
          console.warn('Failed to emit Tauri event:', error);
        }
      },
    };
  }
  
  // File watching integration
  private static createTauriFileWatchMiddleware(): StateMiddleware {
    return {
      name: 'tauri-file-watch',
      afterChange: async (change) => {
        // Integration with file system changes
        if (change.key.startsWith('file_') || change.key.includes('document')) {
          try {
            const { emit } = await import('@tauri-apps/api/event');
            await emit('file-state-change', change);
          } catch (error) {
            console.warn('Failed to emit file state change:', error);
          }
        }
      },
    };
  }
}

/**
 * Next.js State Extensions
 */
export class NextJSStateExtensions {
  static createNextJSStore(config: StateStoreConfig = {}): UniversalStateStore {
    const enhancedConfig: StateStoreConfig = {
      ...config,
      persistence: {
        enabled: true,
        storage: 'localStorage',
        ...config.persistence,
      },
      middlewares: [
        ...config.middlewares || [],
        this.createSSRMiddleware(),
        this.createHydrateMiddleware(),
        this.createRouterMiddleware(),
      ],
    };
    
    return new UniversalStateStore(enhancedConfig);
  }
  
  // Server-side rendering awareness
  private static createSSRMiddleware(): StateMiddleware {
    return {
      name: 'nextjs-ssr',
      beforeChange: async (key, newValue, oldValue) => {
        // Skip certain state changes during SSR
        if (typeof window === 'undefined') {
          // Server-side: only allow essential state changes
          if (key.startsWith('client_') || key.includes('dom_')) {
            return oldValue;
          }
        }
        
        return newValue;
      },
    };
  }
  
  // Hydration-aware state management
  private static createHydrateMiddleware(): StateMiddleware {
    return {
      name: 'nextjs-hydrate',
      afterChange: async (change) => {
        // Handle hydration mismatches
        if (typeof window !== 'undefined' && (window as any).__NEXT_HYDRATED) {
          // Store is hydrated, safe to persist changes
          return;
        }
        
        // Queue changes during hydration
        if (!window || !(window as any).__NEXT_HYDRATE_QUEUE) {
          (window as any).__NEXT_HYDRATE_QUEUE = [];
        }
        (window as any).__NEXT_HYDRATE_QUEUE.push(change);
      },
    };
  }
  
  // Next.js router integration
  private static createRouterMiddleware(): StateMiddleware {
    return {
      name: 'nextjs-router',
      afterChange: async (change) => {
        // Sync certain state changes with URL query parameters
        if (change.key.startsWith('query_') || change.key.includes('filter')) {
          try {
            if (typeof window !== 'undefined' && (window as any).next?.router) {
              const router = (window as any).next.router;
              const query = { ...router.query };
              
              if (change.newValue !== undefined) {
                query[change.key] = String(change.newValue);
              } else {
                delete query[change.key];
              }
              
              await router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
            }
          } catch (error) {
            console.warn('Failed to sync with Next.js router:', error);
          }
        }
      },
    };
  }
}

/**
 * SvelteKit State Extensions
 */
export class SvelteKitStateExtensions {
  static createSvelteKitStore(config: StateStoreConfig = {}): UniversalStateStore {
    const enhancedConfig: StateStoreConfig = {
      ...config,
      persistence: {
        enabled: true,
        storage: 'localStorage',
        ...config.persistence,
      },
      middlewares: [
        ...config.middlewares || [],
        this.createSvelteStoreMiddleware(),
        this.createSvelteKitNavMiddleware(),
      ],
    };
    
    return new UniversalStateStore(enhancedConfig);
  }
  
  // Svelte store system integration
  private static createSvelteStoreMiddleware(): StateMiddleware {
    return {
      name: 'sveltekit-store',
      afterChange: async (change) => {
        // Integration with Svelte's reactive store system
        if (typeof window !== 'undefined' && (window as any).__SVELTE_STORES) {
          const stores = (window as any).__SVELTE_STORES;
          
          if (stores[change.key]) {
            stores[change.key].set(change.newValue);
          }
        }
      },
    };
  }
  
  // SvelteKit navigation integration
  private static createSvelteKitNavMiddleware(): StateMiddleware {
    return {
      name: 'sveltekit-navigation',
      afterChange: async (change) => {
        // Sync with SvelteKit page store and navigation
        if (change.key.startsWith('page_') || change.key.includes('navigation')) {
          try {
            if (typeof window !== 'undefined' && (window as any).__SVELTEKIT__) {
              // Integration with SvelteKit's page store would go here
              const event = new CustomEvent('state-navigation-change', {
                detail: change,
              });
              window.dispatchEvent(event);
            }
          } catch (error) {
            console.warn('Failed to sync with SvelteKit navigation:', error);
          }
        }
      },
    };
  }
}

/**
 * Offline/Online State Synchronization
 */
export class OfflineStateManager {
  private store: UniversalStateStore;
  private offlineQueue: any[] = [];
  private isOnline = true;
  
  constructor(store: UniversalStateStore) {
    this.store = store;
    this.setupNetworkListeners();
  }
  
  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushOfflineQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }
  
  private async flushOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length > 0) {
      const change = this.offlineQueue.shift();
      try {
        await this.store.sync();
      } catch (error) {
        // Re-queue on failure
        this.offlineQueue.unshift(change);
        break;
      }
    }
  }
  
  isConnected(): boolean {
    return this.isOnline;
  }
  
  getQueuedChanges(): any[] {
    return [...this.offlineQueue];
  }
}

/**
 * Platform-specific store factory
 */
export function createPlatformStore(config: StateStoreConfig = {}): UniversalStateStore {
  const platform = platformDetector.detectPlatform();
  
  switch (platform) {
    case 'react-native':
      return ReactNativeStateExtensions.createReactNativeStore(config);
    
    case 'flutter':
      return FlutterStateExtensions.createFlutterStore(config);
    
    case 'tauri':
      return TauriStateExtensions.createTauriStore(config);
    
    case 'nextjs':
      return NextJSStateExtensions.createNextJSStore(config);
    
    case 'sveltekit':
      return SvelteKitStateExtensions.createSvelteKitStore(config);
    
    default:
      return new UniversalStateStore(config);
  }
}

/**
 * Cross-platform state synchronization utilities
 */
export class CrossPlatformStateSync {
  private stores: Map<string, UniversalStateStore> = new Map();
  
  registerStore(name: string, store: UniversalStateStore): void {
    this.stores.set(name, store);
    
    // Set up bidirectional sync between stores
    store.subscribeAll((change) => {
      this.syncChangeToOtherStores(name, change);
    });
  }
  
  private syncChangeToOtherStores(sourceStoreName: string, change: any): void {
    for (const [storeName, store] of this.stores) {
      if (storeName !== sourceStoreName) {
        // Apply change to other stores with 'sync' source
        store.set(change.key, change.newValue);
      }
    }
  }
  
  getAllStores(): Map<string, UniversalStateStore> {
    return new Map(this.stores);
  }
  
  getStore(name: string): UniversalStateStore | undefined {
    return this.stores.get(name);
  }
}

// Export platform-specific store instances
export const platformStore = createPlatformStore({
  persistence: { enabled: true },
  enableDevTools: process?.env?.NODE_ENV === 'development',
});