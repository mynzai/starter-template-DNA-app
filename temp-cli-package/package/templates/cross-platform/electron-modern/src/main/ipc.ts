import { ipcMain, BrowserWindow, app, shell, clipboard } from 'electron';
import Store from 'electron-store';
import log from 'electron-log';
import { NotificationManager } from './notifications';
import { FileManager } from './file-manager';

/**
 * Setup all IPC handlers for secure communication between main and renderer processes
 */
export function setupIPC(
  mainWindow: BrowserWindow,
  store: Store,
  notificationManager: NotificationManager,
  fileManager: FileManager
): void {
  
  // App information handlers
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:get-platform', () => {
    return process.platform;
  });

  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  // File operation handlers
  ipcMain.handle('file:open', async (event, filters) => {
    try {
      const result = await fileManager.openFile({ filters });
      return result;
    } catch (error) {
      log.error('IPC file:open error:', error);
      throw error;
    }
  });

  ipcMain.handle('file:save', async (event, content, filePath) => {
    try {
      const result = await fileManager.saveFile(content, filePath);
      return result;
    } catch (error) {
      log.error('IPC file:save error:', error);
      throw error;
    }
  });

  ipcMain.handle('file:show-save-dialog', async (event, options) => {
    try {
      const result = await fileManager.showSaveDialog(options);
      return result;
    } catch (error) {
      log.error('IPC file:show-save-dialog error:', error);
      throw error;
    }
  });

  ipcMain.handle('file:delete', async (event, filePath) => {
    try {
      const result = await fileManager.deleteFile(filePath);
      return result;
    } catch (error) {
      log.error('IPC file:delete error:', error);
      throw error;
    }
  });

  ipcMain.handle('file:show-item-in-folder', async (event, filePath) => {
    try {
      await fileManager.showItemInFolder(filePath);
      return true;
    } catch (error) {
      log.error('IPC file:show-item-in-folder error:', error);
      throw error;
    }
  });

  ipcMain.handle('file:get-recent', () => {
    try {
      return fileManager.getRecentFiles();
    } catch (error) {
      log.error('IPC file:get-recent error:', error);
      throw error;
    }
  });

  ipcMain.handle('file:clear-recent', () => {
    try {
      fileManager.clearRecentFiles();
      return true;
    } catch (error) {
      log.error('IPC file:clear-recent error:', error);
      throw error;
    }
  });

  // Notification handlers
  ipcMain.handle('notification:show', async (event, options) => {
    try {
      const notificationId = await notificationManager.showNotification(options);
      return notificationId;
    } catch (error) {
      log.error('IPC notification:show error:', error);
      throw error;
    }
  });

  ipcMain.handle('notification:dismiss', async (event, notificationId) => {
    try {
      const result = notificationManager.dismissNotification(notificationId);
      return result;
    } catch (error) {
      log.error('IPC notification:dismiss error:', error);
      throw error;
    }
  });

  ipcMain.handle('notification:dismiss-all', () => {
    try {
      notificationManager.dismissAllNotifications();
      return true;
    } catch (error) {
      log.error('IPC notification:dismiss-all error:', error);
      throw error;
    }
  });

  ipcMain.handle('notification:get-active', () => {
    try {
      return notificationManager.getActiveNotifications();
    } catch (error) {
      log.error('IPC notification:get-active error:', error);
      throw error;
    }
  });

  ipcMain.handle('notification:update-badge', (event, count) => {
    try {
      notificationManager.updateBadgeCount(count);
      return true;
    } catch (error) {
      log.error('IPC notification:update-badge error:', error);
      throw error;
    }
  });

  ipcMain.handle('notification:request-permission', async () => {
    try {
      const result = await notificationManager.requestPermission();
      return result;
    } catch (error) {
      log.error('IPC notification:request-permission error:', error);
      throw error;
    }
  });

  ipcMain.handle('notification:get-permission-status', () => {
    try {
      return notificationManager.getPermissionStatus();
    } catch (error) {
      log.error('IPC notification:get-permission-status error:', error);
      throw error;
    }
  });

  // Store handlers with validation
  ipcMain.handle('store:get', (event, key) => {
    try {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('Invalid key');
      }
      return store.get(key);
    } catch (error) {
      log.error('IPC store:get error:', error);
      throw error;
    }
  });

  ipcMain.handle('store:set', (event, key, value) => {
    try {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('Invalid key');
      }
      store.set(key, value);
      return true;
    } catch (error) {
      log.error('IPC store:set error:', error);
      throw error;
    }
  });

  ipcMain.handle('store:delete', (event, key) => {
    try {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('Invalid key');
      }
      store.delete(key);
      return true;
    } catch (error) {
      log.error('IPC store:delete error:', error);
      throw error;
    }
  });

  ipcMain.handle('store:clear', () => {
    try {
      store.clear();
      return true;
    } catch (error) {
      log.error('IPC store:clear error:', error);
      throw error;
    }
  });

  // Preferences handlers
  ipcMain.handle('preferences:get', () => {
    try {
      return store.get('preferences', {});
    } catch (error) {
      log.error('IPC preferences:get error:', error);
      throw error;
    }
  });

  ipcMain.handle('preferences:set', (event, preferences) => {
    try {
      if (typeof preferences !== 'object' || preferences === null) {
        throw new Error('Invalid preferences object');
      }
      
      // Validate preferences structure
      const validatedPreferences = validatePreferences(preferences);
      store.set('preferences', validatedPreferences);
      
      // Apply preferences immediately
      applyPreferences(validatedPreferences, mainWindow, notificationManager);
      
      return true;
    } catch (error) {
      log.error('IPC preferences:set error:', error);
      throw error;
    }
  });

  ipcMain.handle('preferences:reset', () => {
    try {
      const defaultPreferences = getDefaultPreferences();
      store.set('preferences', defaultPreferences);
      applyPreferences(defaultPreferences, mainWindow, notificationManager);
      return defaultPreferences;
    } catch (error) {
      log.error('IPC preferences:reset error:', error);
      throw error;
    }
  });

  // System integration handlers
  ipcMain.handle('system:open-external', async (event, url) => {
    try {
      if (typeof url !== 'string' || !isValidURL(url)) {
        throw new Error('Invalid URL');
      }
      await shell.openExternal(url);
      return true;
    } catch (error) {
      log.error('IPC system:open-external error:', error);
      throw error;
    }
  });

  ipcMain.handle('system:show-item-in-folder', async (event, filePath) => {
    try {
      if (typeof filePath !== 'string' || filePath.length === 0) {
        throw new Error('Invalid file path');
      }
      shell.showItemInFolder(filePath);
      return true;
    } catch (error) {
      log.error('IPC system:show-item-in-folder error:', error);
      throw error;
    }
  });

  ipcMain.handle('system:copy-to-clipboard', (event, text) => {
    try {
      if (typeof text !== 'string') {
        throw new Error('Invalid text');
      }
      clipboard.writeText(text);
      return true;
    } catch (error) {
      log.error('IPC system:copy-to-clipboard error:', error);
      throw error;
    }
  });

  ipcMain.handle('system:read-from-clipboard', () => {
    try {
      return clipboard.readText();
    } catch (error) {
      log.error('IPC system:read-from-clipboard error:', error);
      throw error;
    }
  });

  // Auto-updater handlers (these will be connected to the updater instance)
  ipcMain.handle('updater:check-for-updates', () => {
    try {
      // This will be handled by the AppUpdater instance
      mainWindow.webContents.send('updater:check-requested');
      return true;
    } catch (error) {
      log.error('IPC updater:check-for-updates error:', error);
      throw error;
    }
  });

  ipcMain.handle('updater:download-update', () => {
    try {
      mainWindow.webContents.send('updater:download-requested');
      return true;
    } catch (error) {
      log.error('IPC updater:download-update error:', error);
      throw error;
    }
  });

  ipcMain.handle('updater:install-update', () => {
    try {
      mainWindow.webContents.send('updater:install-requested');
      return true;
    } catch (error) {
      log.error('IPC updater:install-update error:', error);
      throw error;
    }
  });

  // Error handling
  ipcMain.on('renderer-error', (event, error) => {
    log.error('Renderer process error:', error);
  });

  // Performance monitoring
  ipcMain.handle('performance:get-metrics', () => {
    try {
      return {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        arch: process.arch,
        versions: process.versions
      };
    } catch (error) {
      log.error('IPC performance:get-metrics error:', error);
      throw error;
    }
  });

  log.info('IPC handlers setup completed');
}

/**
 * Validate preferences object
 */
function validatePreferences(preferences: any): any {
  const validatedPrefs: any = {};
  
  // Theme validation
  if (preferences.theme && ['light', 'dark', 'system'].includes(preferences.theme)) {
    validatedPrefs.theme = preferences.theme;
  } else {
    validatedPrefs.theme = 'system';
  }
  
  // Auto-update validation
  if (typeof preferences.autoUpdate === 'boolean') {
    validatedPrefs.autoUpdate = preferences.autoUpdate;
  } else {
    validatedPrefs.autoUpdate = true;
  }
  
  // Minimize to tray validation
  if (typeof preferences.minimizeToTray === 'boolean') {
    validatedPrefs.minimizeToTray = preferences.minimizeToTray;
  } else {
    validatedPrefs.minimizeToTray = true;
  }
  
  // Start minimized validation
  if (typeof preferences.startMinimized === 'boolean') {
    validatedPrefs.startMinimized = preferences.startMinimized;
  } else {
    validatedPrefs.startMinimized = false;
  }
  
  // Notifications validation
  if (typeof preferences.enableNotifications === 'boolean') {
    validatedPrefs.enableNotifications = preferences.enableNotifications;
  } else {
    validatedPrefs.enableNotifications = true;
  }
  
  return validatedPrefs;
}

/**
 * Get default preferences
 */
function getDefaultPreferences(): any {
  return {
    theme: 'system',
    autoUpdate: true,
    minimizeToTray: true,
    startMinimized: false,
    enableNotifications: true
  };
}

/**
 * Apply preferences to the application
 */
function applyPreferences(
  preferences: any, 
  mainWindow: BrowserWindow, 
  notificationManager: NotificationManager
): void {
  try {
    // Apply theme
    if (preferences.theme) {
      mainWindow.webContents.send('theme-changed', preferences.theme);
    }
    
    // Handle other preferences as needed
    log.info('Preferences applied:', preferences);
  } catch (error) {
    log.error('Error applying preferences:', error);
  }
}

/**
 * Validate URL for security
 */
function isValidURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}