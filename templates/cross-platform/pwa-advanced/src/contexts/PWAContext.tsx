'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface PWAContextType {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  isUpdateAvailable: boolean;
  updateApp: () => void;
  registration: ServiceWorkerRegistration | null;
  networkInfo: NetworkInfo | null;
}

interface NetworkInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  // Update network info
  const updateNetworkInfo = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkInfo({
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      });
    }
  }, []);

  // Update app function
  const updateApp = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Update network info
    updateNetworkInfo();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App is online');
      
      // Trigger background sync when coming back online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'BACKGROUND_SYNC'
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Service Worker registration and management
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        setIsServiceWorkerReady(true);
        console.log('Service Worker is ready');

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
                console.log('New app version available');
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          const { type, data } = event.data;
          
          switch (type) {
            case 'UPDATE_AVAILABLE':
              setIsUpdateAvailable(true);
              break;
            case 'CONTENT_UPDATED':
              console.log('Content updated:', data);
              // Optionally refresh the page or update UI
              break;
            case 'CACHE_UPDATED':
              console.log('Cache updated');
              break;
            case 'BACKGROUND_SYNC_SUCCESS':
              console.log('Background sync completed');
              break;
            case 'BACKGROUND_SYNC_FAILED':
              console.error('Background sync failed');
              break;
          }
        });

        // Check for updates periodically
        const checkForUpdates = () => {
          reg.update().catch((error) => {
            console.error('Update check failed:', error);
          });
        };

        // Check for updates every 30 minutes
        setInterval(checkForUpdates, 30 * 60 * 1000);
      });

      // Listen for custom SW update events
      window.addEventListener('sw-update-available', () => {
        setIsUpdateAvailable(true);
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  // Visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && registration) {
        // Check for updates when app becomes visible
        registration.update().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [registration]);

  // App state change handling
  useEffect(() => {
    const handleAppStateChange = () => {
      if (isOnline && registration) {
        // Sync data when app becomes active and online
        navigator.serviceWorker.controller?.postMessage({
          type: 'SYNC_DATA'
        });
      }
    };

    window.addEventListener('focus', handleAppStateChange);
    
    return () => {
      window.removeEventListener('focus', handleAppStateChange);
    };
  }, [isOnline, registration]);

  // Page load completion
  useEffect(() => {
    // Mark app as loaded for performance tracking
    if (isServiceWorkerReady) {
      if ('performance' in window && 'mark' in performance) {
        performance.mark('app-loaded');
      }
    }
  }, [isServiceWorkerReady]);

  const value: PWAContextType = {
    isOnline,
    isServiceWorkerReady,
    isUpdateAvailable,
    updateApp,
    registration,
    networkInfo
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}