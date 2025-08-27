'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface PerformanceContextType {
  metrics: PerformanceMetrics;
  vitals: WebVitals;
  networkInfo: NetworkInfo | null;
  memoryInfo: MemoryInfo | null;
  startMeasurement: (name: string) => void;
  endMeasurement: (name: string) => number | null;
  trackCustomMetric: (name: string, value: number) => void;
  exportMetrics: () => string;
}

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  domLoad: number | null;
  windowLoad: number | null;
  customMetrics: Record<string, number>;
}

interface WebVitals {
  good: number;
  needsImprovement: number;
  poor: number;
}

interface NetworkInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    domLoad: null,
    windowLoad: null,
    customMetrics: {}
  });

  const [vitals, setVitals] = useState<WebVitals>({
    good: 0,
    needsImprovement: 0,
    poor: 0
  });

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [measurementStartTimes, setMeasurementStartTimes] = useState<Record<string, number>>({});

  // Initialize performance monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Monitor Web Vitals
    const initWebVitals = async () => {
      try {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

        // First Contentful Paint
        getFCP((metric) => {
          setMetrics(prev => ({ ...prev, fcp: metric.value }));
          categorizeVital('FCP', metric.value, [1800, 3000]);
          console.log('FCP:', metric.value);
        });

        // Largest Contentful Paint
        getLCP((metric) => {
          setMetrics(prev => ({ ...prev, lcp: metric.value }));
          categorizeVital('LCP', metric.value, [2500, 4000]);
          console.log('LCP:', metric.value);
        });

        // First Input Delay
        getFID((metric) => {
          setMetrics(prev => ({ ...prev, fid: metric.value }));
          categorizeVital('FID', metric.value, [100, 300]);
          console.log('FID:', metric.value);
        });

        // Cumulative Layout Shift
        getCLS((metric) => {
          setMetrics(prev => ({ ...prev, cls: metric.value }));
          categorizeVital('CLS', metric.value, [0.1, 0.25]);
          console.log('CLS:', metric.value);
        });

        // Time to First Byte
        getTTFB((metric) => {
          setMetrics(prev => ({ ...prev, ttfb: metric.value }));
          categorizeVital('TTFB', metric.value, [800, 1800]);
          console.log('TTFB:', metric.value);
        });

      } catch (error) {
        console.error('Failed to load web-vitals:', error);
      }
    };

    initWebVitals();

    // Monitor Navigation Timing
    const measureNavigationTiming = () => {
      if ('performance' in window && 'timing' in performance) {
        const timing = performance.timing;
        const domLoad = timing.domContentLoadedEventEnd - timing.navigationStart;
        const windowLoad = timing.loadEventEnd - timing.navigationStart;

        setMetrics(prev => ({
          ...prev,
          domLoad,
          windowLoad
        }));

        console.log('DOM Load:', domLoad);
        console.log('Window Load:', windowLoad);
      }
    };

    // Wait for page load
    if (document.readyState === 'complete') {
      measureNavigationTiming();
    } else {
      window.addEventListener('load', measureNavigationTiming);
    }

    // Monitor Network Information
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkInfo({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        });
      }
    };

    updateNetworkInfo();
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateNetworkInfo);
    }

    // Monitor Memory Usage
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
      }
    };

    updateMemoryInfo();
    const memoryInterval = setInterval(updateMemoryInfo, 10000); // Update every 10 seconds

    // Monitor Performance Entries
    if ('PerformanceObserver' in window) {
      try {
        // Monitor paint events
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        // Monitor layout shifts
        const layoutShiftObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          if (clsValue > 0) {
            setMetrics(prev => ({ ...prev, cls: clsValue }));
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });

        // Monitor long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.warn('Long task detected:', entry.duration);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // Monitor navigation
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Navigation timing:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
              load: navEntry.loadEventEnd - navEntry.navigationStart,
              ttfb: navEntry.responseStart - navEntry.navigationStart
            });
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });

      } catch (error) {
        console.warn('PerformanceObserver setup failed:', error);
      }
    }

    // Cleanup
    return () => {
      clearInterval(memoryInterval);
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateNetworkInfo);
      }
      window.removeEventListener('load', measureNavigationTiming);
    };
  }, []);

  // Categorize Web Vitals scores
  const categorizeVital = useCallback((name: string, value: number, thresholds: [number, number]) => {
    const [good, needsImprovement] = thresholds;
    
    setVitals(prev => {
      const newVitals = { ...prev };
      
      if (value <= good) {
        newVitals.good++;
      } else if (value <= needsImprovement) {
        newVitals.needsImprovement++;
      } else {
        newVitals.poor++;
      }
      
      return newVitals;
    });
  }, []);

  // Start custom measurement
  const startMeasurement = useCallback((name: string) => {
    const startTime = performance.now();
    setMeasurementStartTimes(prev => ({ ...prev, [name]: startTime }));
    
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }, []);

  // End custom measurement
  const endMeasurement = useCallback((name: string): number | null => {
    const endTime = performance.now();
    const startTime = measurementStartTimes[name];
    
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`);
      return null;
    }

    const duration = endTime - startTime;
    
    // Clean up start time
    setMeasurementStartTimes(prev => {
      const { [name]: removed, ...rest } = prev;
      return rest;
    });

    // Add to custom metrics
    setMetrics(prev => ({
      ...prev,
      customMetrics: {
        ...prev.customMetrics,
        [name]: duration
      }
    }));

    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }

    console.log(`${name} took ${duration.toFixed(2)}ms`);
    return duration;
  }, [measurementStartTimes]);

  // Track custom metric
  const trackCustomMetric = useCallback((name: string, value: number) => {
    setMetrics(prev => ({
      ...prev,
      customMetrics: {
        ...prev.customMetrics,
        [name]: value
      }
    }));

    console.log(`Custom metric ${name}:`, value);
  }, []);

  // Export metrics as JSON
  const exportMetrics = useCallback((): string => {
    const exportData = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics,
      vitals,
      networkInfo,
      memoryInfo,
      performanceEntries: performance.getEntriesByType('navigation').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }, [metrics, vitals, networkInfo, memoryInfo]);

  // Send metrics to analytics
  useEffect(() => {
    const sendMetrics = () => {
      if (typeof window !== 'undefined' && 'gtag' in window) {
        Object.entries(metrics).forEach(([name, value]) => {
          if (value !== null && typeof value === 'number') {
            (window as any).gtag('event', 'performance_metric', {
              event_category: 'Performance',
              event_label: name,
              value: Math.round(value)
            });
          }
        });
      }
    };

    // Send metrics after initial load
    const timer = setTimeout(sendMetrics, 5000);
    return () => clearTimeout(timer);
  }, [metrics]);

  const value: PerformanceContextType = {
    metrics,
    vitals,
    networkInfo,
    memoryInfo,
    startMeasurement,
    endMeasurement,
    trackCustomMetric,
    exportMetrics
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}