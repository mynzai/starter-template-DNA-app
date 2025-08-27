'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { PWAProvider } from '@/contexts/PWAContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { PerformanceProvider } from '@/contexts/PerformanceContext';
import { InstallProvider } from '@/contexts/InstallContext';
import { FileSystemProvider } from '@/contexts/FileSystemContext';
import { ShareProvider } from '@/contexts/ShareContext';
import { BackgroundSyncProvider } from '@/contexts/BackgroundSyncContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Initialize performance monitoring
    if (typeof window !== 'undefined') {
      // Report Web Vitals
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });

      // Initialize error reporting
      window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        // Send to error reporting service
      });

      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // Send to error reporting service
      });

      // Initialize performance observer
      if ('PerformanceObserver' in window) {
        try {
          // Monitor layout shifts
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if ((entry as any).hadRecentInput) continue;
              console.log('Layout shift:', entry);
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // Monitor long tasks
          const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              console.log('Long task:', entry.duration);
            }
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });

          // Monitor navigation timing
          const navigationObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              console.log('Navigation timing:', entry);
            }
          });
          navigationObserver.observe({ entryTypes: ['navigation'] });

        } catch (error) {
          console.warn('PerformanceObserver setup failed:', error);
        }
      }

      // Memory usage monitoring
      if ('memory' in performance) {
        const logMemory = () => {
          const memory = (performance as any).memory;
          console.log('Memory usage:', {
            used: Math.round(memory.usedJSHeapSize / 1048576),
            total: Math.round(memory.totalJSHeapSize / 1048576),
            limit: Math.round(memory.jsHeapSizeLimit / 1048576)
          });
        };
        
        // Log memory usage every 30 seconds
        setInterval(logMemory, 30000);
      }

      // Network information monitoring
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        console.log('Network info:', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });

        connection.addEventListener('change', () => {
          console.log('Network changed:', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          });
        });
      }

      // Visibility change monitoring
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log('App hidden');
          // Pause non-critical operations
        } else {
          console.log('App visible');
          // Resume operations
        }
      });

      // Battery API monitoring
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          console.log('Battery level:', battery.level * 100 + '%');
          console.log('Battery charging:', battery.charging);

          battery.addEventListener('levelchange', () => {
            console.log('Battery level changed:', battery.level * 100 + '%');
          });

          battery.addEventListener('chargingchange', () => {
            console.log('Battery charging changed:', battery.charging);
          });
        });
      }

      // Device memory monitoring
      if ('deviceMemory' in navigator) {
        console.log('Device memory:', (navigator as any).deviceMemory + ' GB');
      }

      // Hardware concurrency
      console.log('CPU cores:', navigator.hardwareConcurrency);

      // Initialize critical resource hints
      const criticalResources = [
        '/api/critical-data',
        '/images/hero-image.webp'
      ];

      criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = resource;
        document.head.appendChild(link);
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PWAProvider>
          <NotificationProvider>
            <OfflineProvider>
              <PerformanceProvider>
                <InstallProvider>
                  <FileSystemProvider>
                    <ShareProvider>
                      <BackgroundSyncProvider>
                        {children}
                      </BackgroundSyncProvider>
                    </ShareProvider>
                  </FileSystemProvider>
                </InstallProvider>
              </PerformanceProvider>
            </OfflineProvider>
          </NotificationProvider>
        </PWAProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}