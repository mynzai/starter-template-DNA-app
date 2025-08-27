import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Define the API interface for type safety
interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  
  // File operations
  openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<{ filePath: string; content: string } | null>;
  saveFile: (content: string, filePath?: string) => Promise<string | null>;
  showSaveDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  
  // Notifications
  showNotification: (title: string, body: string, icon?: string) => Promise<void>;
  
  // Store operations
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  
  // App preferences
  preferences: {
    get: () => Promise<any>;
    set: (preferences: any) => Promise<void>;
    reset: () => Promise<void>;
  };
  
  // System integration
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
  readFromClipboard: () => Promise<string>;
  
  // Auto updater
  updater: {
    checkForUpdates: () => void;
    downloadUpdate: () => void;
    installUpdate: () => void;
    onUpdateAvailable: (callback: (info: any) => void) => () => void;
    onUpdateDownloaded: (callback: (info: any) => void) => () => void;
    onUpdateError: (callback: (error: Error) => void) => () => void;
  };
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  once: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
  
  // Deep linking
  onDeepLink: (callback: (url: string) => void) => () => void;
  
  // Menu actions
  onMenuAction: (callback: (action: string, data?: any) => void) => () => void;
}

// Allowed IPC channels for security
const ALLOWED_CHANNELS = {
  // Outgoing (renderer to main)
  invoke: [
    'app:get-version',
    'app:get-platform',
    'window:minimize',
    'window:maximize',
    'window:close',
    'file:open',
    'file:save',
    'file:show-save-dialog',
    'notification:show',
    'store:get',
    'store:set',
    'store:delete',
    'store:clear',
    'preferences:get',
    'preferences:set',
    'preferences:reset',
    'system:open-external',
    'system:show-item-in-folder',
    'system:copy-to-clipboard',
    'system:read-from-clipboard',
    'updater:check-for-updates',
    'updater:download-update',
    'updater:install-update'
  ],
  
  // Incoming (main to renderer)
  on: [
    'menu-new',
    'menu-save',
    'show-preferences',
    'file-opened',
    'deep-link',
    'update-available',
    'update-downloaded',
    'update-error',
    'notification-clicked',
    'notification-closed'
  ]
};

// Helper function to validate channels
function isValidChannel(channel: string, type: 'invoke' | 'on'): boolean {
  return ALLOWED_CHANNELS[type].includes(channel);
}

// Create the secure API
const electronAPI: ElectronAPI = {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // File operations
  openFile: (filters) => ipcRenderer.invoke('file:open', filters),
  saveFile: (content, filePath) => ipcRenderer.invoke('file:save', content, filePath),
  showSaveDialog: (options) => ipcRenderer.invoke('file:show-save-dialog', options),
  
  // Notifications
  showNotification: (title, body, icon) => ipcRenderer.invoke('notification:show', { title, body, icon }),
  
  // Store operations
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    clear: () => ipcRenderer.invoke('store:clear')
  },
  
  // App preferences
  preferences: {
    get: () => ipcRenderer.invoke('preferences:get'),
    set: (preferences) => ipcRenderer.invoke('preferences:set', preferences),
    reset: () => ipcRenderer.invoke('preferences:reset')
  },
  
  // System integration
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  showItemInFolder: (path) => ipcRenderer.invoke('system:show-item-in-folder', path),
  copyToClipboard: (text) => ipcRenderer.invoke('system:copy-to-clipboard', text),
  readFromClipboard: () => ipcRenderer.invoke('system:read-from-clipboard'),
  
  // Auto updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    installUpdate: () => ipcRenderer.invoke('updater:install-update'),
    onUpdateAvailable: (callback) => {
      const listener = (_event: IpcRendererEvent, info: any) => callback(info);
      ipcRenderer.on('update-available', listener);
      return () => ipcRenderer.removeListener('update-available', listener);
    },
    onUpdateDownloaded: (callback) => {
      const listener = (_event: IpcRendererEvent, info: any) => callback(info);
      ipcRenderer.on('update-downloaded', listener);
      return () => ipcRenderer.removeListener('update-downloaded', listener);
    },
    onUpdateError: (callback) => {
      const listener = (_event: IpcRendererEvent, error: Error) => callback(error);
      ipcRenderer.on('update-error', listener);
      return () => ipcRenderer.removeListener('update-error', listener);
    }
  },
  
  // Event listeners with channel validation
  on: (channel, callback) => {
    if (!isValidChannel(channel, 'on')) {
      throw new Error(`Invalid channel: ${channel}`);
    }
    
    const listener = (_event: IpcRendererEvent, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener(channel, listener);
  },
  
  once: (channel, callback) => {
    if (!isValidChannel(channel, 'on')) {
      throw new Error(`Invalid channel: ${channel}`);
    }
    
    ipcRenderer.once(channel, (_event: IpcRendererEvent, ...args: any[]) => callback(...args));
  },
  
  removeAllListeners: (channel) => {
    if (!isValidChannel(channel, 'on')) {
      throw new Error(`Invalid channel: ${channel}`);
    }
    
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Deep linking
  onDeepLink: (callback) => {
    const listener = (_event: IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('deep-link', listener);
    return () => ipcRenderer.removeListener('deep-link', listener);
  },
  
  // Menu actions
  onMenuAction: (callback) => {
    const menuChannels = ['menu-new', 'menu-save', 'show-preferences', 'file-opened'];
    const listeners: Array<() => void> = [];
    
    menuChannels.forEach(channel => {
      const listener = (_event: IpcRendererEvent, data?: any) => callback(channel.replace('menu-', ''), data);
      ipcRenderer.on(channel, listener);
      listeners.push(() => ipcRenderer.removeListener(channel, listener));
    });
    
    // Return cleanup function for all listeners
    return () => listeners.forEach(cleanup => cleanup());
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose a version for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('electronDev', {
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
    env: process.env.NODE_ENV
  });
}

// Prevent the renderer process from accessing Node.js APIs
delete (window as any).require;
delete (window as any).exports;
delete (window as any).module;

// Security: Remove common global variables that could be misused
delete (window as any).global;
delete (window as any).Buffer;
delete (window as any).process;

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electronDev?: {
      versions: NodeJS.ProcessVersions;
      platform: string;
      arch: string;
      env: string;
    };
  }
}