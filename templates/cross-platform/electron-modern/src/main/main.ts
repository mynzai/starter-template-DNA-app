import { app, BrowserWindow, Menu, shell, ipcMain, dialog, Tray, nativeImage, systemPreferences } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';
import path from 'path';
import { format as formatUrl } from 'url';
import { AppUpdater } from './updater';
import { createSecureWindow } from './security';
import { setupIPC } from './ipc';
import { NotificationManager } from './notifications';
import { FileManager } from './file-manager';

// Initialize electron-log
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Initialize secure store
const store = new Store({
  schema: {
    windowBounds: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
      default: { width: 1200, height: 800 }
    },
    preferences: {
      type: 'object',
      properties: {
        theme: { type: 'string', default: 'system' },
        autoUpdate: { type: 'boolean', default: true },
        minimizeToTray: { type: 'boolean', default: true },
        startMinimized: { type: 'boolean', default: false }
      },
      default: {}
    }
  }
});

// Global references
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let appUpdater: AppUpdater | null = null;
let notificationManager: NotificationManager | null = null;
let fileManager: FileManager | null = null;

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationUrl) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow navigation to same origin or local files
    if (parsedUrl.origin !== 'http://localhost:9080' && parsedUrl.protocol !== 'file:') {
      navigationEvent.preventDefault();
    }
  });
});

// Security: Disable node integration in all renderers
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    // Strip away preload scripts if unused or verify their location is legitimate
    delete webPreferences.preload;
    delete webPreferences.preloadURL;

    // Disable Node.js integration
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
  });
});

function createMainWindow(): BrowserWindow {
  // Get window bounds from store
  const windowBounds = store.get('windowBounds') as { x?: number; y?: number; width: number; height: number };
  
  const window = createSecureWindow({
    ...windowBounds,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
    icon: path.join(__dirname, '../../assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webgl: false,
      plugins: false,
      navigateOnDragDrop: false,
      spellcheck: true
    }
  });

  // Security: Content Security Policy
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          \"default-src 'self'; \" +
          \"script-src 'self' 'unsafe-inline'; \" +
          \"style-src 'self' 'unsafe-inline'; \" +
          \"img-src 'self' data: https:; \" +
          \"connect-src 'self' https:; \" +
          \"font-src 'self' data:; \" +
          \"media-src 'self'; \" +
          \"object-src 'none'; \" +
          \"base-uri 'self'; \" +
          \"form-action 'self'; \" +
          \"frame-ancestors 'none'; \" +
          \"upgrade-insecure-requests\"
        ]
      }
    });
  });

  // Load the application
  if (isDevelopment) {
    window.loadURL('http://localhost:9080');
    window.webContents.openDevTools();
  } else {
    window.loadURL(formatUrl({
      pathname: path.join(__dirname, '../renderer/index.html'),
      protocol: 'file',
      slashes: true
    }));
  }

  // Handle window events
  window.on('ready-to-show', () => {
    window.show();
    
    // Focus on creation
    if (isDevelopment) {
      window.webContents.focus();
    }
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  // Save window bounds on resize/move
  window.on('resize', () => {
    if (!window.isMaximized()) {
      store.set('windowBounds', window.getBounds());
    }
  });

  window.on('move', () => {
    if (!window.isMaximized()) {
      store.set('windowBounds', window.getBounds());
    }
  });

  // Handle minimize to tray
  window.on('minimize', (event) => {
    if (store.get('preferences.minimizeToTray')) {
      event.preventDefault();
      window.hide();
    }
  });

  // Handle close to tray
  window.on('close', (event) => {
    if (!app.isQuiting && store.get('preferences.minimizeToTray')) {
      event.preventDefault();
      window.hide();
    }
  });

  return window;
}

function createTray(): Tray {
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, '../../assets/tray-icon.png'));
  const tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Preferences',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('show-preferences');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        if (appUpdater) {
          appUpdater.checkForUpdates();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Modern Electron App');
  tray.setContextMenu(contextMenu);

  // Handle tray click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  return tray;
}

function createMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow && fileManager) {
              const result = await fileManager.openFile();
              if (result) {
                mainWindow.webContents.send('file-opened', result);
              }
            }
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-save');
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('show-preferences');
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About',
              message: 'Modern Electron App',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`
            });
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            if (appUpdater) {
              appUpdater.checkForUpdates();
            }
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Edit menu
    (template[2].submenu as Electron.MenuItemConstructorOptions[]).push(
      { type: 'separator' },
      {
        label: 'Speech',
        submenu: [
          { role: 'startSpeaking' },
          { role: 'stopSpeaking' }
        ]
      }
    );

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  return Menu.buildFromTemplate(template);
}

const isDevelopment = process.env.NODE_ENV !== 'production';

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App event handlers
  app.whenReady().then(async () => {
    log.info('App is ready');

    // Security: Remove default menu in production
    if (!isDevelopment) {
      Menu.setApplicationMenu(null);
    }

    // Create main window
    mainWindow = createMainWindow();

    // Create application menu
    const menu = createMenu();
    Menu.setApplicationMenu(menu);

    // Create system tray
    if (store.get('preferences.minimizeToTray')) {
      tray = createTray();
    }

    // Initialize services
    appUpdater = new AppUpdater(mainWindow);
    notificationManager = new NotificationManager();
    fileManager = new FileManager(mainWindow);

    // Setup IPC handlers
    setupIPC(mainWindow, store, notificationManager, fileManager);

    // Start auto-updater
    if (store.get('preferences.autoUpdate') && !isDevelopment) {
      appUpdater.checkForUpdates();
    }

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });

    // Request permissions on macOS
    if (process.platform === 'darwin') {
      try {
        const notificationPermission = await systemPreferences.askForMediaAccess('notifications');
        log.info('Notification permission:', notificationPermission);
        
        const microphonePermission = await systemPreferences.askForMediaAccess('microphone');
        log.info('Microphone permission:', microphonePermission);
        
        const cameraPermission = await systemPreferences.askForMediaAccess('camera');
        log.info('Camera permission:', cameraPermission);
      } catch (error) {
        log.error('Error requesting permissions:', error);
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    app.isQuiting = true;
  });

  // Security: Prevent protocol hijacking
  app.setAsDefaultProtocolClient('modern-electron-app');

  // Handle protocol for deep linking
  app.on('open-url', (event, url) => {
    event.preventDefault();
    log.info('Deep link received:', url);
    
    if (mainWindow) {
      mainWindow.webContents.send('deep-link', url);
    }
  });

  // Handle security warnings
  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
  });
}

// Export for testing
export { createMainWindow, createTray, createMenu };