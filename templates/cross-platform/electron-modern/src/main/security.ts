import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import path from 'path';

/**
 * Security-first BrowserWindow creation with hardened defaults
 */
export function createSecureWindow(options: BrowserWindowConstructorOptions = {}): BrowserWindow {
  const secureOptions: BrowserWindowConstructorOptions = {
    // Basic window options
    width: 1200,
    height: 800,
    show: false,
    
    // Security hardening
    webPreferences: {
      // Core security
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      
      // Additional security
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webgl: false,
      plugins: false,
      navigateOnDragDrop: false,
      spellcheck: true,
      
      // Preload script for secure IPC
      preload: path.join(__dirname, 'preload.js'),
      
      // Additional isolation
      partition: 'persist:secure-session',
      
      // Prevent access to Node APIs
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      
      // Content blocking
      nativeWindowOpen: false,
      safeDialogs: true,
      safeDialogsMessage: 'This app has been blocked from creating additional dialogs',
      
      // Override any insecure options from user
      ...options.webPreferences
    },
    
    // Merge with user options (user options take precedence for non-security settings)
    ...options,
    
    // Force security-critical options (cannot be overridden)
    webPreferences: {
      ...options.webPreferences,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    }
  };

  const window = new BrowserWindow(secureOptions);

  // Additional security measures
  setupSecurityHandlers(window);
  
  return window;
}

/**
 * Setup additional security event handlers
 */
function setupSecurityHandlers(window: BrowserWindow): void {
  // Prevent new window creation
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Allow opening external URLs in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
    }
    
    // Deny all window.open() requests
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow local development and file protocol
    if (
      process.env.NODE_ENV === 'development' &&
      parsedUrl.origin === 'http://localhost:9080'
    ) {
      return;
    }
    
    if (parsedUrl.protocol === 'file:') {
      return;
    }
    
    // Block all other navigation attempts
    event.preventDefault();
  });

  // Block file downloads
  window.webContents.session.on('will-download', (event, item, webContents) => {
    // You can allow specific file types or implement a whitelist
    const allowedExtensions = ['.txt', '.json', '.csv', '.pdf'];
    const fileExtension = path.extname(item.getFilename()).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      event.preventDefault();
    } else {
      // Set download path to user's default download directory
      const downloadPath = path.join(require('os').homedir(), 'Downloads', item.getFilename());
      item.setSavePath(downloadPath);
    }
  });

  // Monitor certificate errors
  window.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    // In production, you should implement proper certificate validation
    if (process.env.NODE_ENV === 'development') {
      // Allow localhost certificates in development
      if (url.startsWith('https://localhost')) {
        event.preventDefault();
        callback(true);
        return;
      }
    }
    
    // Reject certificate errors in production
    callback(false);
  });

  // Block permissions that aren't needed
  window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Define allowed permissions for your app
    const allowedPermissions = [
      'notifications',
      'clipboard-read',
      'clipboard-sanitized-write'
    ];
    
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Set secure session configuration
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // Add security headers
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        ...securityHeaders
      }
    });
  });

  // Clear sensitive data on window close
  window.on('closed', () => {
    window.webContents.session.clearStorageData({
      storages: ['cookies', 'localstorage', 'sessionstorage', 'websql', 'indexdb']
    });
  });
}

/**
 * Content Security Policy configuration
 */
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'img-src': ["'self'", "data:", "https:"],
  'font-src': ["'self'", "data:", "https://fonts.gstatic.com"],
  'connect-src': ["'self'", "https:"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_POLICY)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Validate URL against allowed patterns
 */
export function isUrlAllowed(url: string): boolean {
  const allowedPatterns = [
    /^file:\/\/.*$/,
    /^http:\/\/localhost:9080.*$/,
    /^https:\/\/api\.yourdomain\.com.*$/
  ];

  return allowedPatterns.some(pattern => pattern.test(url));
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file path to prevent directory traversal
 */
export function validateFilePath(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  
  // Check for directory traversal attempts
  if (normalizedPath.includes('..')) {
    return false;
  }
  
  // Ensure path is within allowed directories
  const allowedDirectories = [
    path.join(require('os').homedir(), 'Documents'),
    path.join(require('os').homedir(), 'Downloads'),
    path.join(require('os').homedir(), 'Desktop')
  ];
  
  return allowedDirectories.some(dir => 
    normalizedPath.startsWith(path.normalize(dir))
  );
}