import { Notification, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import log from 'electron-log';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  actions?: Array<{ type: string; text: string }>;
  sound?: string;
  tag?: string;
  timeout?: number;
  replyPlaceholder?: string;
  hasReply?: boolean;
}

export class NotificationManager {
  private activeNotifications: Map<string, Notification> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private notificationCount = 0;

  constructor(mainWindow?: BrowserWindow) {
    this.mainWindow = mainWindow || null;
    this.setupNotificationHandlers();
  }

  private setupNotificationHandlers(): void {
    // Handle notification clicks globally
    if (process.platform === 'win32') {
      // Windows specific notification handling
      process.on('notification-clicked', (notificationId: string) => {
        this.handleNotificationClick(notificationId);
      });
    }
  }

  public async showNotification(options: NotificationOptions): Promise<string> {
    try {
      // Check if notifications are supported
      if (!Notification.isSupported()) {
        log.warn('Notifications are not supported on this system');
        return '';
      }

      // Generate unique notification ID
      const notificationId = `notification_${Date.now()}_${++this.notificationCount}`;

      // Prepare notification options
      const notificationOptions: Electron.NotificationConstructorOptions = {
        title: options.title,
        body: options.body,
        silent: options.silent || false,
        urgency: options.urgency || 'normal',
        sound: options.sound,
        tag: options.tag || notificationId,
        timeoutType: options.timeout ? 'default' : 'never',
        hasReply: options.hasReply || false,
        replyPlaceholder: options.replyPlaceholder || 'Reply...'
      };

      // Set icon
      if (options.icon) {
        if (options.icon.startsWith('http://') || options.icon.startsWith('https://')) {
          // External icon URL - create from URL
          notificationOptions.icon = nativeImage.createFromDataURL(options.icon);
        } else if (path.isAbsolute(options.icon)) {
          // Absolute path
          notificationOptions.icon = nativeImage.createFromPath(options.icon);
        } else {
          // Relative path from assets
          const iconPath = path.join(__dirname, '../../assets', options.icon);
          notificationOptions.icon = nativeImage.createFromPath(iconPath);
        }
      } else {
        // Default app icon
        const defaultIconPath = path.join(__dirname, '../../assets/notification-icon.png');
        notificationOptions.icon = nativeImage.createFromPath(defaultIconPath);
      }

      // Add actions (macOS and Windows)
      if (options.actions && (process.platform === 'darwin' || process.platform === 'win32')) {
        notificationOptions.actions = options.actions.map(action => ({
          type: 'button',
          text: action.text
        }));
      }

      // Create notification
      const notification = new Notification(notificationOptions);

      // Store active notification
      this.activeNotifications.set(notificationId, notification);

      // Setup event handlers
      notification.on('show', () => {
        log.info(`Notification shown: ${notificationId}`);
        this.sendToRenderer('notification-shown', { id: notificationId, ...options });
      });

      notification.on('click', () => {
        log.info(`Notification clicked: ${notificationId}`);
        this.handleNotificationClick(notificationId);
        this.sendToRenderer('notification-clicked', { id: notificationId, ...options });
        
        // Bring app to foreground
        this.focusApp();
      });

      notification.on('close', () => {
        log.info(`Notification closed: ${notificationId}`);
        this.activeNotifications.delete(notificationId);
        this.sendToRenderer('notification-closed', { id: notificationId, ...options });
      });

      notification.on('reply', (event, reply) => {
        log.info(`Notification reply: ${notificationId}, ${reply}`);
        this.sendToRenderer('notification-reply', { 
          id: notificationId, 
          reply, 
          ...options 
        });
      });

      notification.on('action', (event, index) => {
        log.info(`Notification action: ${notificationId}, action ${index}`);
        if (options.actions && options.actions[index]) {
          this.sendToRenderer('notification-action', { 
            id: notificationId, 
            action: options.actions[index],
            index,
            ...options 
          });
        }
      });

      notification.on('failed', (event, error) => {
        log.error(`Notification failed: ${notificationId}`, error);
        this.activeNotifications.delete(notificationId);
        this.sendToRenderer('notification-failed', { 
          id: notificationId, 
          error: error.toString(),
          ...options 
        });
      });

      // Show notification
      notification.show();

      // Auto-dismiss after timeout
      if (options.timeout && options.timeout > 0) {
        setTimeout(() => {
          this.dismissNotification(notificationId);
        }, options.timeout);
      }

      return notificationId;
    } catch (error) {
      log.error('Failed to show notification:', error);
      throw error;
    }
  }

  public dismissNotification(notificationId: string): boolean {
    const notification = this.activeNotifications.get(notificationId);
    
    if (notification) {
      notification.close();
      this.activeNotifications.delete(notificationId);
      return true;
    }
    
    return false;
  }

  public dismissAllNotifications(): void {
    for (const [id, notification] of this.activeNotifications) {
      notification.close();
    }
    this.activeNotifications.clear();
  }

  public getActiveNotifications(): string[] {
    return Array.from(this.activeNotifications.keys());
  }

  public updateBadgeCount(count: number): void {
    if (process.platform === 'darwin') {
      // macOS dock badge
      require('electron').app.setBadgeCount(count);
    } else if (process.platform === 'win32') {
      // Windows taskbar badge
      if (this.mainWindow) {
        if (count > 0) {
          const badgeIconPath = path.join(__dirname, '../../assets/badge-icon.png');
          const badgeIcon = nativeImage.createFromPath(badgeIconPath);
          this.mainWindow.setOverlayIcon(badgeIcon, count.toString());
        } else {
          this.mainWindow.setOverlayIcon(null, '');
        }
      }
    }
  }

  public async requestPermission(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        // macOS permission request
        const { systemPreferences } = require('electron');
        const status = await systemPreferences.askForMediaAccess('notifications');
        return status;
      } else if (process.platform === 'win32') {
        // Windows notifications are enabled by default
        return true;
      } else {
        // Linux - check if libnotify is available
        return Notification.isSupported();
      }
    } catch (error) {
      log.error('Failed to request notification permission:', error);
      return false;
    }
  }

  public getPermissionStatus(): string {
    if (Notification.isSupported()) {
      return 'granted';
    } else {
      return 'denied';
    }
  }

  // Predefined notification types
  public async showInfoNotification(title: string, body: string): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'info-icon.png',
      urgency: 'normal'
    });
  }

  public async showWarningNotification(title: string, body: string): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'warning-icon.png',
      urgency: 'normal',
      sound: 'warning'
    });
  }

  public async showErrorNotification(title: string, body: string): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'error-icon.png',
      urgency: 'critical',
      sound: 'error'
    });
  }

  public async showSuccessNotification(title: string, body: string): Promise<string> {
    return this.showNotification({
      title,
      body,
      icon: 'success-icon.png',
      urgency: 'normal',
      sound: 'success'
    });
  }

  public async showUpdateNotification(version: string, releaseNotes: string): Promise<string> {
    return this.showNotification({
      title: 'Update Available',
      body: `Version ${version} is ready to install`,
      icon: 'update-icon.png',
      actions: [
        { type: 'button', text: 'Install Now' },
        { type: 'button', text: 'Later' }
      ],
      urgency: 'normal'
    });
  }

  public async showProgressNotification(title: string, progress: number): Promise<string> {
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    
    return this.showNotification({
      title,
      body: `${progressBar} ${progress}%`,
      icon: 'progress-icon.png',
      silent: true,
      tag: 'progress' // This will replace previous progress notifications
    });
  }

  private handleNotificationClick(notificationId: string): void {
    // Bring app to foreground when notification is clicked
    this.focusApp();
  }

  private focusApp(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
      this.mainWindow.show();
    }
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  public setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  public cleanup(): void {
    this.dismissAllNotifications();
    this.updateBadgeCount(0);
  }
}