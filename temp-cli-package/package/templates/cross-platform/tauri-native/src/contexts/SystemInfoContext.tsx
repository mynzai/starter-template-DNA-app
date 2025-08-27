import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

interface SystemInfo {
  osName: string;
  osVersion: string;
  kernelVersion: string;
  hostname: string;
  cpuInfo: {
    name: string;
    brand: string;
    cores: number;
    frequency: number;
    usagePerCore: number[];
    globalUsage: number;
  };
  memoryInfo: {
    total: number;
    used: number;
    available: number;
    free: number;
    swapTotal: number;
    swapUsed: number;
    swapFree: number;
  };
  diskInfo: Record<string, number>;
  networkInfo: Record<string, {
    name: string;
    received: number;
    transmitted: number;
    packetsReceived: number;
    packetsTransmitted: number;
    errorsReceived: number;
    errorsTransmitted: number;
  }>;
  processCount: number;
  bootTime: number;
  uptime: number;
  cpuUsage: number;
}

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: Record<string, number>;
  networkUsage: Record<string, number>;
  processCount: number;
  uptime: number;
}

interface SystemInfoContextType {
  systemInfo: SystemInfo | null;
  performanceMetrics: PerformanceMetrics | null;
  isLoading: boolean;
  error: string | null;
  refreshSystemInfo: () => Promise<void>;
  startMonitoring: (intervalMs?: number) => Promise<void>;
  stopMonitoring: () => void;
}

const SystemInfoContext = createContext<SystemInfoContextType | undefined>(undefined);

export function SystemInfoProvider({ children }: { children: ReactNode }) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monitoringInterval, setMonitoringInterval] = useState<number | null>(null);

  const refreshSystemInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const info = await invoke<SystemInfo>('get_system_info');
      setSystemInfo(info);
      
      const metrics = await invoke<PerformanceMetrics>('get_performance_metrics');
      setPerformanceMetrics(metrics);
      
    } catch (err) {
      console.error('Failed to get system information:', err);
      setError(err instanceof Error ? err.message : 'Failed to get system information');
    } finally {
      setIsLoading(false);
    }
  };

  const startMonitoring = async (intervalMs: number = 5000) => {
    try {
      // Stop any existing monitoring
      stopMonitoring();
      
      // Start monitoring with Tauri backend
      await invoke('monitor_system_resources', { intervalMs });
      
      // Set up frontend interval for local updates
      const interval = window.setInterval(async () => {
        try {
          const metrics = await invoke<PerformanceMetrics>('get_performance_metrics');
          setPerformanceMetrics(metrics);
        } catch (err) {
          console.error('Failed to update performance metrics:', err);
        }
      }, intervalMs);
      
      setMonitoringInterval(interval);
      
    } catch (err) {
      console.error('Failed to start monitoring:', err);
      setError(err instanceof Error ? err.message : 'Failed to start monitoring');
    }
  };

  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  };

  // Initialize system info on mount
  useEffect(() => {
    refreshSystemInfo();
    
    // Start monitoring by default
    startMonitoring(5000);
    
    // Clean up on unmount
    return () => {
      stopMonitoring();
    };
  }, []);

  // Listen for system metrics events from backend
  useEffect(() => {
    const unlisten = listen<PerformanceMetrics>('system-metrics', (event) => {
      setPerformanceMetrics(event.payload);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const value: SystemInfoContextType = {
    systemInfo,
    performanceMetrics,
    isLoading,
    error,
    refreshSystemInfo,
    startMonitoring,
    stopMonitoring,
  };

  return (
    <SystemInfoContext.Provider value={value}>
      {children}
    </SystemInfoContext.Provider>
  );
}

export function useSystemInfo() {
  const context = useContext(SystemInfoContext);
  if (!context) {
    throw new Error('useSystemInfo must be used within a SystemInfoProvider');
  }
  return context;
}

// Utility hooks
export function useCpuUsage() {
  const { performanceMetrics } = useSystemInfo();
  return performanceMetrics?.cpuUsage ?? 0;
}

export function useMemoryUsage() {
  const { systemInfo, performanceMetrics } = useSystemInfo();
  
  if (!systemInfo || !performanceMetrics) {
    return { used: 0, total: 0, percentage: 0 };
  }
  
  const percentage = (performanceMetrics.memoryUsage / systemInfo.memoryInfo.total) * 100;
  
  return {
    used: performanceMetrics.memoryUsage,
    total: systemInfo.memoryInfo.total,
    percentage,
  };
}

export function useDiskUsage() {
  const { performanceMetrics } = useSystemInfo();
  return performanceMetrics?.diskUsage ?? {};
}

export function useNetworkUsage() {
  const { performanceMetrics } = useSystemInfo();
  return performanceMetrics?.networkUsage ?? {};
}

export function useSystemUptime() {
  const { systemInfo } = useSystemInfo();
  
  if (!systemInfo) return 0;
  
  // Convert seconds to milliseconds and format
  const uptimeMs = systemInfo.uptime * 1000;
  return uptimeMs;
}
