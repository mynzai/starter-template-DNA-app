/**
 * Cross-Platform Notification Abstraction
 * Provides unified notification system across Flutter, React Native, Next.js, Tauri, and SvelteKit
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  sound?: string;
  category?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  silent?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  persistent?: boolean;
  tag?: string;
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
  destructive?: boolean;
}

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  canRequest: boolean;
}

export interface ScheduledNotification {
  id: string;
  options: NotificationOptions;
  scheduledTime: Date;
  repeatInterval?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface NotificationEvent {
  id: string;
  action?: string;
  notification: NotificationOptions;
  userInteraction: boolean;
}

/**
 * Platform-agnostic notification interface
 */
export abstract class NotificationAdapter {
  abstract platform: 'flutter' | 'react-native' | 'nextjs' | 'tauri' | 'sveltekit' | 'web';
  
  // Permission management
  abstract checkPermission(): Promise<NotificationPermission>;
  abstract requestPermission(): Promise<NotificationPermission>;
  
  // Immediate notifications
  abstract showNotification(options: NotificationOptions): Promise<string>;
  abstract hideNotification(id: string): Promise<void>;
  abstract clearAllNotifications(): Promise<void>;
  
  // Scheduled notifications
  abstract scheduleNotification(options: NotificationOptions, scheduledTime: Date, repeatInterval?: string): Promise<string>;
  abstract cancelScheduledNotification(id: string): Promise<void>;
  abstract getScheduledNotifications(): Promise<ScheduledNotification[]>;
  abstract clearAllScheduledNotifications(): Promise<void>;
  
  // Event handling
  abstract onNotificationClicked(callback: (event: NotificationEvent) => void): () => void;
  abstract onNotificationDismissed(callback: (event: NotificationEvent) => void): () => void;
  abstract onActionClicked(callback: (event: NotificationEvent) => void): () => void;
  
  // Platform capabilities
  abstract supportsActions(): boolean;
  abstract supportsScheduling(): boolean;
  abstract supportsSounds(): boolean;
  abstract supportsCustomIcons(): boolean;
  abstract supportsBadges(): boolean;
}

/**
 * Tauri Notification Implementation
 */
export class TauriNotificationAdapter extends NotificationAdapter {
  platform = 'tauri' as const;
  private notificationCallbacks: Map<string, () => void> = new Map();
  
  async checkPermission(): Promise<NotificationPermission> {
    try {
      const { isPermissionGranted } = await import('@tauri-apps/api/notification');
      const granted = await isPermissionGranted();
      
      return {
        granted,
        denied: !granted,
        canRequest: !granted,
      };
    } catch {
      return {
        granted: false,
        denied: true,
        canRequest: false,
      };
    }
  }
  
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const { requestPermission } = await import('@tauri-apps/api/notification');
      const permission = await requestPermission();
      
      return {
        granted: permission === 'granted',
        denied: permission === 'denied',
        canRequest: permission === 'default',
      };
    } catch {
      return {
        granted: false,
        denied: true,
        canRequest: false,
      };
    }
  }
  
  async showNotification(options: NotificationOptions): Promise<string> {
    const { sendNotification } = await import('@tauri-apps/api/notification');
    
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await sendNotification({
      title: options.title,
      body: options.body,
      icon: options.icon,
    });
    
    return id;
  }
  
  async hideNotification(id: string): Promise<void> {
    // Tauri doesn't support hiding individual notifications
  }
  
  async clearAllNotifications(): Promise<void> {
    // Tauri doesn't support clearing notifications programmatically
  }
  
  async scheduleNotification(options: NotificationOptions, scheduledTime: Date, repeatInterval?: string): Promise<string> {
    // Tauri doesn't have native scheduling, implement with setTimeout
    const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const delay = scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      const timeout = setTimeout(async () => {
        await this.showNotification(options);
        
        if (repeatInterval) {
          // Calculate next execution time
          const nextTime = new Date(scheduledTime);
          switch (repeatInterval) {
            case 'minute':
              nextTime.setMinutes(nextTime.getMinutes() + 1);
              break;
            case 'hour':
              nextTime.setHours(nextTime.getHours() + 1);
              break;
            case 'day':
              nextTime.setDate(nextTime.getDate() + 1);
              break;
            case 'week':
              nextTime.setDate(nextTime.getDate() + 7);
              break;
            case 'month':
              nextTime.setMonth(nextTime.getMonth() + 1);
              break;
          }
          
          // Reschedule
          await this.scheduleNotification(options, nextTime, repeatInterval);
        }
      }, delay);
      
      this.notificationCallbacks.set(id, () => clearTimeout(timeout));
    }
    
    return id;
  }
  
  async cancelScheduledNotification(id: string): Promise<void> {
    const callback = this.notificationCallbacks.get(id);
    if (callback) {
      callback();
      this.notificationCallbacks.delete(id);
    }
  }
  
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    // Tauri doesn't maintain a list of scheduled notifications
    return [];
  }
  
  async clearAllScheduledNotifications(): Promise<void> {
    for (const [id, callback] of this.notificationCallbacks) {
      callback();
    }
    this.notificationCallbacks.clear();
  }
  
  onNotificationClicked(callback: (event: NotificationEvent) => void): () => void {
    // Tauri doesn't expose click events directly
    return () => {};
  }
  
  onNotificationDismissed(callback: (event: NotificationEvent) => void): () => void {
    return () => {};
  }
  
  onActionClicked(callback: (event: NotificationEvent) => void): () => void {
    return () => {};
  }
  
  supportsActions(): boolean {
    return false;
  }
  
  supportsScheduling(): boolean {
    return true; // Via setTimeout implementation
  }
  
  supportsSounds(): boolean {
    return false;
  }
  
  supportsCustomIcons(): boolean {
    return true;
  }
  
  supportsBadges(): boolean {
    return false;
  }
}

/**
 * React Native Notification Implementation
 */
export class ReactNativeNotificationAdapter extends NotificationAdapter {
  platform = 'react-native' as const;
  
  async checkPermission(): Promise<NotificationPermission> {
    try {
      const PushNotification = await import('react-native-push-notification');
      
      return new Promise((resolve) => {
        PushNotification.default.checkPermissions((permissions: any) => {
          resolve({
            granted: permissions.alert && permissions.badge && permissions.sound,
            denied: !permissions.alert,
            canRequest: true,
          });
        });
      });
    } catch {
      return {
        granted: false,
        denied: true,
        canRequest: false,
      };
    }
  }
  
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const PushNotification = await import('react-native-push-notification');
      
      return new Promise((resolve) => {
        PushNotification.default.requestPermissions().then((permissions: any) => {
          resolve({
            granted: permissions.alert && permissions.badge && permissions.sound,
            denied: !permissions.alert,
            canRequest: false,
          });
        });
      });
    } catch {
      return {
        granted: false,
        denied: true,
        canRequest: false,
      };
    }
  }
  
  async showNotification(options: NotificationOptions): Promise<string> {
    const PushNotification = await import('react-native-push-notification');
    
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    PushNotification.default.localNotification({
      id: id,
      title: options.title,
      message: options.body,
      soundName: options.sound,
      category: options.category,
      userInfo: options.data,
      actions: options.actions?.map(action => action.title),
      largeIcon: options.icon,
      smallIcon: options.badge,
      priority: options.priority === 'high' ? 'high' : 'default',
      playSound: !options.silent,
      ongoing: options.persistent,
      tag: options.tag,
    });
    
    return id;
  }
  
  async hideNotification(id: string): Promise<void> {
    const PushNotification = await import('react-native-push-notification');
    PushNotification.default.cancelLocalNotification(id);
  }
  
  async clearAllNotifications(): Promise<void> {
    const PushNotification = await import('react-native-push-notification');
    PushNotification.default.cancelAllLocalNotifications();
  }
  
  async scheduleNotification(options: NotificationOptions, scheduledTime: Date, repeatInterval?: string): Promise<string> {
    const PushNotification = await import('react-native-push-notification');
    
    const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    PushNotification.default.localNotificationSchedule({
      id: id,
      title: options.title,
      message: options.body,
      date: scheduledTime,
      repeatType: repeatInterval as any,
      soundName: options.sound,
      category: options.category,
      userInfo: options.data,
      actions: options.actions?.map(action => action.title),
      largeIcon: options.icon,
      smallIcon: options.badge,
      priority: options.priority === 'high' ? 'high' : 'default',
      playSound: !options.silent,
    });
    
    return id;
  }
  
  async cancelScheduledNotification(id: string): Promise<void> {
    const PushNotification = await import('react-native-push-notification');
    PushNotification.default.cancelLocalNotification(id);
  }
  
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    const PushNotification = await import('react-native-push-notification');
    
    return new Promise((resolve) => {
      PushNotification.default.getScheduledLocalNotifications((notifications: any[]) => {
        const scheduled = notifications.map(notif => ({
          id: notif.id,
          options: {
            title: notif.title,
            body: notif.message,
            data: notif.userInfo,
          },
          scheduledTime: new Date(notif.date),
        }));
        resolve(scheduled);
      });
    });
  }
  
  async clearAllScheduledNotifications(): Promise<void> {
    const PushNotification = await import('react-native-push-notification');
    PushNotification.default.cancelAllLocalNotifications();
  }
  
  onNotificationClicked(callback: (event: NotificationEvent) => void): () => void {
    const PushNotification = require('react-native-push-notification');
    
    const handler = (notification: any) => {
      callback({
        id: notification.id,
        notification: {
          title: notification.title,
          body: notification.message,
          data: notification.userInfo,
        },
        userInteraction: notification.userInteraction,
      });
    };
    
    PushNotification.configure({
      onNotification: handler,
    });
    
    return () => {
      // React Native push notification doesn't provide easy cleanup
    };
  }
  
  onNotificationDismissed(callback: (event: NotificationEvent) => void): () => void {
    return () => {};
  }
  
  onActionClicked(callback: (event: NotificationEvent) => void): () => void {
    const PushNotification = require('react-native-push-notification');
    
    const handler = (notification: any) => {
      if (notification.action) {
        callback({
          id: notification.id,
          action: notification.action,
          notification: {
            title: notification.title,
            body: notification.message,
            data: notification.userInfo,
          },
          userInteraction: true,
        });
      }
    };
    
    PushNotification.configure({
      onAction: handler,
    });
    
    return () => {};
  }
  
  supportsActions(): boolean {
    return true;
  }
  
  supportsScheduling(): boolean {
    return true;
  }
  
  supportsSounds(): boolean {
    return true;
  }
  
  supportsCustomIcons(): boolean {
    return true;
  }
  
  supportsBadges(): boolean {
    return true;
  }
}

/**
 * Web/Next.js Notification Implementation
 */
export class WebNotificationAdapter extends NotificationAdapter {
  platform = 'nextjs' as const;
  private activeNotifications: Map<string, Notification> = new Map();
  private scheduledTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  async checkPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return {
        granted: false,
        denied: true,
        canRequest: false,
      };
    }
    
    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      canRequest: permission === 'default',
    };
  }
  
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return {
        granted: false,
        denied: true,
        canRequest: false,
      };
    }
    
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      canRequest: false,
    };
  }
  
  async showNotification(options: NotificationOptions): Promise<string> {
    const permission = await this.checkPermission();
    if (!permission.granted) {
      throw new Error('Notification permission not granted');
    }
    
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      badge: options.badge,
      tag: options.tag,
      data: options.data,
      actions: options.actions?.map(action => ({
        action: action.id,
        title: action.title,
        icon: action.icon,
      })),
      silent: options.silent,
      timestamp: Date.now(),
    });
    
    this.activeNotifications.set(id, notification);
    
    // Auto-close after timeout
    if (options.timeout && options.timeout > 0) {
      setTimeout(() => {
        notification.close();
        this.activeNotifications.delete(id);
      }, options.timeout);
    }
    
    return id;
  }
  
  async hideNotification(id: string): Promise<void> {
    const notification = this.activeNotifications.get(id);
    if (notification) {
      notification.close();
      this.activeNotifications.delete(id);
    }
  }
  
  async clearAllNotifications(): Promise<void> {
    for (const [id, notification] of this.activeNotifications) {
      notification.close();
    }
    this.activeNotifications.clear();
  }
  
  async scheduleNotification(options: NotificationOptions, scheduledTime: Date, repeatInterval?: string): Promise<string> {
    const id = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const delay = scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      const timeout = setTimeout(async () => {
        await this.showNotification(options);
        this.scheduledTimeouts.delete(id);
        
        if (repeatInterval) {
          const nextTime = new Date(scheduledTime);
          switch (repeatInterval) {
            case 'minute':
              nextTime.setMinutes(nextTime.getMinutes() + 1);
              break;
            case 'hour':
              nextTime.setHours(nextTime.getHours() + 1);
              break;
            case 'day':
              nextTime.setDate(nextTime.getDate() + 1);
              break;
            case 'week':
              nextTime.setDate(nextTime.getDate() + 7);
              break;
            case 'month':
              nextTime.setMonth(nextTime.getMonth() + 1);
              break;
          }
          
          await this.scheduleNotification(options, nextTime, repeatInterval);
        }
      }, delay);
      
      this.scheduledTimeouts.set(id, timeout);
    }
    
    return id;
  }
  
  async cancelScheduledNotification(id: string): Promise<void> {
    const timeout = this.scheduledTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledTimeouts.delete(id);
    }
  }
  
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    // Web API doesn't maintain scheduled notification list
    return [];
  }
  
  async clearAllScheduledNotifications(): Promise<void> {
    for (const timeout of this.scheduledTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.scheduledTimeouts.clear();
  }
  
  onNotificationClicked(callback: (event: NotificationEvent) => void): () => void {
    const handler = (event: Event) => {
      const notification = event.target as Notification;
      callback({
        id: notification.tag || 'unknown',
        notification: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
        userInteraction: true,
      });
    };
    
    // Listen for clicks on future notifications
    const originalShow = this.showNotification.bind(this);
    this.showNotification = async (options: NotificationOptions) => {
      const id = await originalShow(options);
      const notification = this.activeNotifications.get(id);
      if (notification) {
        notification.addEventListener('click', handler);
      }
      return id;
    };
    
    return () => {
      this.showNotification = originalShow;
    };
  }
  
  onNotificationDismissed(callback: (event: NotificationEvent) => void): () => void {
    const handler = (event: Event) => {
      const notification = event.target as Notification;
      callback({
        id: notification.tag || 'unknown',
        notification: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
        userInteraction: false,
      });
    };
    
    const originalShow = this.showNotification.bind(this);
    this.showNotification = async (options: NotificationOptions) => {
      const id = await originalShow(options);
      const notification = this.activeNotifications.get(id);
      if (notification) {
        notification.addEventListener('close', handler);
      }
      return id;
    };
    
    return () => {
      this.showNotification = originalShow;
    };
  }
  
  onActionClicked(callback: (event: NotificationEvent) => void): () => void {
    // Web notifications don't support action callbacks directly
    return () => {};
  }
  
  supportsActions(): boolean {
    return 'actions' in Notification.prototype;
  }
  
  supportsScheduling(): boolean {
    return true;
  }
  
  supportsSounds(): boolean {
    return false;
  }
  
  supportsCustomIcons(): boolean {
    return true;
  }
  
  supportsBadges(): boolean {
    return 'badge' in Notification.prototype;
  }
}

/**
 * Platform Detection and Factory
 */
export function createNotificationAdapter(): NotificationAdapter {
  // Browser environment
  if (typeof window !== 'undefined') {
    // Check for Tauri
    if ('__TAURI__' in window) {
      return new TauriNotificationAdapter();
    }
    return new WebNotificationAdapter();
  }
  
  // React Native environment
  if (typeof global !== 'undefined' && 'navigator' in global && 'product' in (global as any).navigator) {
    return new ReactNativeNotificationAdapter();
  }
  
  // Default to web for SSR environments
  return new WebNotificationAdapter();
}

/**
 * Convenience wrapper for notification operations
 */
export class NotificationManager {
  private adapter: NotificationAdapter;
  
  constructor(adapter?: NotificationAdapter) {
    this.adapter = adapter || createNotificationAdapter();
  }
  
  get platform() {
    return this.adapter.platform;
  }
  
  get capabilities() {
    return {
      actions: this.adapter.supportsActions(),
      scheduling: this.adapter.supportsScheduling(),
      sounds: this.adapter.supportsSounds(),
      customIcons: this.adapter.supportsCustomIcons(),
      badges: this.adapter.supportsBadges(),
    };
  }
  
  // Permission management
  checkPermission() {
    return this.adapter.checkPermission();
  }
  
  requestPermission() {
    return this.adapter.requestPermission();
  }
  
  // Immediate notifications
  showNotification(options: NotificationOptions) {
    return this.adapter.showNotification(options);
  }
  
  hideNotification(id: string) {
    return this.adapter.hideNotification(id);
  }
  
  clearAllNotifications() {
    return this.adapter.clearAllNotifications();
  }
  
  // Scheduled notifications
  scheduleNotification(options: NotificationOptions, scheduledTime: Date, repeatInterval?: string) {
    return this.adapter.scheduleNotification(options, scheduledTime, repeatInterval);
  }
  
  cancelScheduledNotification(id: string) {
    return this.adapter.cancelScheduledNotification(id);
  }
  
  getScheduledNotifications() {
    return this.adapter.getScheduledNotifications();
  }
  
  clearAllScheduledNotifications() {
    return this.adapter.clearAllScheduledNotifications();
  }
  
  // Event handling
  onNotificationClicked(callback: (event: NotificationEvent) => void) {
    return this.adapter.onNotificationClicked(callback);
  }
  
  onNotificationDismissed(callback: (event: NotificationEvent) => void) {
    return this.adapter.onNotificationDismissed(callback);
  }
  
  onActionClicked(callback: (event: NotificationEvent) => void) {
    return this.adapter.onActionClicked(callback);
  }
  
  // Convenience methods
  async showSimpleNotification(title: string, body: string, icon?: string) {
    return this.showNotification({ title, body, icon });
  }
  
  async scheduleReminderNotification(title: string, body: string, scheduledTime: Date) {
    return this.scheduleNotification({ title, body }, scheduledTime);
  }
  
  async ensurePermissionAndShow(options: NotificationOptions) {
    const permission = await this.checkPermission();
    if (!permission.granted && permission.canRequest) {
      const newPermission = await this.requestPermission();
      if (!newPermission.granted) {
        throw new Error('Notification permission denied');
      }
    } else if (!permission.granted) {
      throw new Error('Notification permission not available');
    }
    
    return this.showNotification(options);
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();