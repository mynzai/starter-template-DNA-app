'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface NotificationContextType {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
  showPersistentNotification: (title: string, options?: NotificationOptions) => Promise<void>;
  subscribeToPush: () => Promise<PushSubscription | null>;
  unsubscribeFromPush: () => Promise<boolean>;
  pushSubscription: PushSubscription | null;
  notificationHistory: NotificationItem[];
  clearHistory: () => void;
}

interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  vibrate?: number[];
  silent?: boolean;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  timestamp?: number;
}

interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationItem[]>([]);

  // Check notification support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('Notification' in window && 'serviceWorker' in navigator);
      
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  }, []);

  // Load existing push subscription
  useEffect(() => {
    if (isSupported && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          const subscription = await registration.pushManager.getSubscription();
          setPushSubscription(subscription);
        } catch (error) {
          console.error('Failed to get push subscription:', error);
        }
      });
    }
  }, [isSupported]);

  // Load notification history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification-history');
      if (saved) {
        try {
          setNotificationHistory(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to parse notification history:', error);
        }
      }
    }
  }, []);

  // Save notification history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-history', JSON.stringify(notificationHistory));
    }
  }, [notificationHistory]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Show simple notification
  const showNotification = useCallback(async (
    title: string, 
    options: NotificationOptions = {}
  ): Promise<void> => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/badge-72x72.png',
        image: options.image,
        tag: options.tag,
        data: options.data,
        vibrate: options.vibrate || [200, 100, 200],
        silent: options.silent || false,
        requireInteraction: options.requireInteraction || false,
        timestamp: options.timestamp || Date.now()
      });

      // Add to history
      const historyItem: NotificationItem = {
        id: Date.now().toString(),
        title,
        body: options.body,
        timestamp: Date.now(),
        read: false
      };
      
      setNotificationHistory(prev => [historyItem, ...prev.slice(0, 49)]);

      // Handle notification events
      notification.onclick = () => {
        console.log('Notification clicked');
        notification.close();
        
        // Mark as read
        setNotificationHistory(prev => 
          prev.map(item => 
            item.id === historyItem.id ? { ...item, read: true } : item
          )
        );
        
        // Focus window if possible
        if (window.focus) {
          window.focus();
        }
        
        // Handle custom click action
        if (options.data?.url) {
          window.open(options.data.url, '_blank');
        }
      };

      notification.onclose = () => {
        console.log('Notification closed');
      };

      notification.onerror = (error) => {
        console.error('Notification error:', error);
      };

      // Auto-close after 10 seconds if not persistent
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }
      
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [permission, requestPermission]);

  // Show persistent notification via service worker
  const showPersistentNotification = useCallback(async (
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (!('serviceWorker' in navigator)) {
      // Fallback to regular notification
      return showNotification(title, options);
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/badge-72x72.png',
        image: options.image,
        tag: options.tag,
        data: options.data,
        vibrate: options.vibrate || [200, 100, 200],
        silent: options.silent || false,
        actions: options.actions || [
          {
            action: 'view',
            title: 'View',
            icon: '/icons/action-view.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/action-dismiss.png'
          }
        ],
        requireInteraction: options.requireInteraction || false,
        timestamp: options.timestamp || Date.now()
      });

      // Add to history
      const historyItem: NotificationItem = {
        id: Date.now().toString(),
        title,
        body: options.body,
        timestamp: Date.now(),
        read: false
      };
      
      setNotificationHistory(prev => [historyItem, ...prev.slice(0, 49)]);
      
    } catch (error) {
      console.error('Failed to show persistent notification:', error);
    }
  }, [permission, requestPermission, showNotification]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push messaging not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.error('VAPID public key not configured');
          return null;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      setPushSubscription(subscription);
      
      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      console.log('Push subscription created successfully');
      return subscription;
      
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }, [permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!pushSubscription) {
      return true;
    }

    try {
      // Unsubscribe from push service
      await pushSubscription.unsubscribe();
      
      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON()
        })
      });

      setPushSubscription(null);
      console.log('Push subscription removed successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }, [pushSubscription]);

  // Clear notification history
  const clearHistory = useCallback(() => {
    setNotificationHistory([]);
  }, []);

  // Listen for notification events from service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICKED') {
          // Handle notification click from service worker
          const { action, data } = event.data;
          
          console.log('Notification action:', action, data);
          
          // Mark as read in history
          if (data?.historyId) {
            setNotificationHistory(prev => 
              prev.map(item => 
                item.id === data.historyId ? { ...item, read: true } : item
              )
            );
          }
        }
      });
    }
  }, []);

  const value: NotificationContextType = {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showPersistentNotification,
    subscribeToPush,
    unsubscribeFromPush,
    pushSubscription,
    notificationHistory,
    clearHistory
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}