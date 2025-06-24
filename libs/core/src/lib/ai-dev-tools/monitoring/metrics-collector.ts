/**
 * @fileoverview Metrics Collector
 * Collects system and application performance metrics
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';
import {
  ResourceUsage,
  CPUUsage,
  MemoryUsage,
  NetworkUsage,
  StorageUsage,
  AIResourceUsage,
  ProcessUsage,
  EndpointUsage,
  StorageOperation,
  OperationType,
  DevToolsMetrics
} from './types';

export class MetricsCollector extends EventEmitter {
  private initialized = false;
  private activeSessions: Map<string, SessionData> = new Map();
  private networkRequests: Map<string, RequestData[]> = new Map();
  private storageOperations: Map<string, StorageOperation[]> = new Map();
  private processMonitoring: Map<string, ProcessMonitor> = new Map();
  
  private collectionInterval = 1000; // 1 second
  private collectionTimer?: NodeJS.Timeout;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Set up process monitoring
    this.setupProcessMonitoring();
    
    // Start periodic collection
    this.startPeriodicCollection();

    this.initialized = true;
    this.emit('collector:initialized');
  }

  async startSession(sessionId: string, operationType: OperationType): Promise<void> {
    const sessionData: SessionData = {
      id: sessionId,
      operationType,
      startTime: Date.now(),
      startCPU: process.cpuUsage(),
      startMemory: process.memoryUsage(),
      operations: [],
      networkRequests: [],
      storageOps: [],
      peakMemoryMB: 0,
      totalCPUTime: 0
    };

    this.activeSessions.set(sessionId, sessionData);
    this.networkRequests.set(sessionId, []);
    this.storageOperations.set(sessionId, []);

    // Set up process monitor for this session
    this.processMonitoring.set(sessionId, {
      pid: process.pid,
      startTime: Date.now(),
      cpuHistory: [],
      memoryHistory: [],
      active: true
    });

    this.emit('session:started', { sessionId, operationType });
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Stop monitoring
    const processMonitor = this.processMonitoring.get(sessionId);
    if (processMonitor) {
      processMonitor.active = false;
    }

    // Clean up
    this.activeSessions.delete(sessionId);
    this.networkRequests.delete(sessionId);
    this.storageOperations.delete(sessionId);
    this.processMonitoring.delete(sessionId);

    this.emit('session:ended', { sessionId });
  }

  async recordOperation(sessionId: string, operation: OperationData): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.operations.push({
      ...operation,
      timestamp: Date.now()
    });

    this.emit('operation:recorded', { sessionId, operation });
  }

  async recordNetworkRequest(
    sessionId: string,
    request: NetworkRequestData
  ): Promise<void> {
    const requests = this.networkRequests.get(sessionId);
    if (!requests) return;

    requests.push({
      ...request,
      timestamp: Date.now()
    });

    this.emit('network:recorded', { sessionId, request });
  }

  async recordStorageOperation(
    sessionId: string,
    operation: StorageOperation
  ): Promise<void> {
    const operations = this.storageOperations.get(sessionId);
    if (!operations) return;

    operations.push(operation);

    this.emit('storage:recorded', { sessionId, operation });
  }

  async getSessionMetrics(sessionId: string): Promise<ResourceUsage> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const currentCPU = process.cpuUsage(session.startCPU);
    const currentMemory = process.memoryUsage();
    const networkRequests = this.networkRequests.get(sessionId) || [];
    const storageOps = this.storageOperations.get(sessionId) || [];
    const processMonitor = this.processMonitoring.get(sessionId);

    return {
      cpu: await this.getCPUUsage(session, currentCPU, processMonitor),
      memory: this.getMemoryUsage(session, currentMemory),
      network: this.getNetworkUsage(networkRequests),
      storage: this.getStorageUsage(storageOps),
      ai: await this.getAIResourceUsage(session)
    };
  }

  async getMetricsHistory(filters: MetricsFilters): Promise<DevToolsMetrics[]> {
    // In a real implementation, this would query a database
    // For now, return empty array
    return [];
  }

  private setupProcessMonitoring(): void {
    // Monitor process events
    process.on('beforeExit', () => {
      this.emit('process:beforeExit');
    });

    process.on('exit', () => {
      this.emit('process:exit');
    });

    process.on('uncaughtException', (error) => {
      this.emit('process:uncaughtException', { error: error.message });
    });

    process.on('unhandledRejection', (reason) => {
      this.emit('process:unhandledRejection', { reason });
    });
  }

  private startPeriodicCollection(): void {
    this.collectionTimer = setInterval(() => {
      this.collectPeriodicMetrics();
    }, this.collectionInterval);
  }

  private collectPeriodicMetrics(): void {
    const timestamp = Date.now();
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();

    // Update process monitors
    for (const [sessionId, monitor] of this.processMonitoring) {
      if (!monitor.active) continue;

      monitor.cpuHistory.push({
        timestamp,
        user: cpuUsage.user,
        system: cpuUsage.system
      });

      monitor.memoryHistory.push({
        timestamp,
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      });

      // Keep only last 100 measurements (100 seconds)
      if (monitor.cpuHistory.length > 100) {
        monitor.cpuHistory.shift();
      }
      if (monitor.memoryHistory.length > 100) {
        monitor.memoryHistory.shift();
      }

      // Update session peak memory
      const session = this.activeSessions.get(sessionId);
      if (session) {
        const memoryMB = memoryUsage.rss / 1024 / 1024;
        session.peakMemoryMB = Math.max(session.peakMemoryMB, memoryMB);
      }
    }
  }

  private async getCPUUsage(
    session: SessionData,
    currentCPU: NodeJS.CpuUsage,
    processMonitor?: ProcessMonitor
  ): Promise<CPUUsage> {
    const totalCPUTime = (currentCPU.user + currentCPU.system) / 1000; // Convert to milliseconds
    const duration = Date.now() - session.startTime;
    const utilization = (totalCPUTime / duration) * 100;

    const cpuInfo = os.cpus();
    const loadAvg = os.loadavg();

    return {
      utilization: Math.min(utilization, 100),
      cores: cpuInfo.length,
      averageLoad: loadAvg[0],
      peakLoad: Math.max(...loadAvg),
      duration,
      processes: [{
        pid: process.pid,
        name: process.title || 'node',
        cpuPercent: utilization,
        memoryMB: process.memoryUsage().rss / 1024 / 1024,
        startTime: session.startTime,
        endTime: Date.now()
      }]
    };
  }

  private getMemoryUsage(session: SessionData, currentMemory: NodeJS.MemoryUsage): MemoryUsage {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      totalMB: Math.round(totalMemory / 1024 / 1024),
      usedMB: Math.round(usedMemory / 1024 / 1024),
      availableMB: Math.round(freeMemory / 1024 / 1024),
      peakUsageMB: session.peakMemoryMB,
      heapUsedMB: Math.round(currentMemory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(currentMemory.heapTotal / 1024 / 1024),
      external: currentMemory.external,
      buffers: 0, // Not available in Node.js
      cached: 0   // Not available in Node.js
    };
  }

  private getNetworkUsage(requests: NetworkRequestData[]): NetworkUsage {
    if (requests.length === 0) {
      return {
        bytesUploaded: 0,
        bytesDownloaded: 0,
        requestCount: 0,
        responseCount: 0,
        averageLatency: 0,
        peakLatency: 0,
        errorRate: 0,
        endpoints: []
      };
    }

    const totalUpload = requests.reduce((sum, req) => sum + (req.requestSize || 0), 0);
    const totalDownload = requests.reduce((sum, req) => sum + (req.responseSize || 0), 0);
    const successfulRequests = requests.filter(req => req.success);
    const latencies = requests.map(req => req.duration).filter(d => d > 0);
    const avgLatency = latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
    const peakLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
    const errorRate = requests.length > 0 ? (requests.length - successfulRequests.length) / requests.length : 0;

    // Group by endpoint
    const endpointMap = new Map<string, EndpointData>();
    requests.forEach(req => {
      const key = `${req.method} ${req.url}`;
      const existing = endpointMap.get(key) || {
        url: req.url,
        method: req.method,
        requests: [],
        totalBytes: 0,
        errorCount: 0,
        statusCodes: {}
      };
      
      existing.requests.push(req);
      existing.totalBytes += (req.requestSize || 0) + (req.responseSize || 0);
      if (!req.success) existing.errorCount++;
      
      const statusCode = req.statusCode || 0;
      existing.statusCodes[statusCode] = (existing.statusCodes[statusCode] || 0) + 1;
      
      endpointMap.set(key, existing);
    });

    const endpoints: EndpointUsage[] = Array.from(endpointMap.values()).map(endpoint => {
      const durations = endpoint.requests.map(r => r.duration).filter(d => d > 0);
      const avgDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
      
      return {
        url: endpoint.url,
        method: endpoint.method,
        requestCount: endpoint.requests.length,
        totalBytes: endpoint.totalBytes,
        averageLatency: avgDuration,
        errorCount: endpoint.errorCount,
        statusCodes: endpoint.statusCodes
      };
    });

    return {
      bytesUploaded: totalUpload,
      bytesDownloaded: totalDownload,
      requestCount: requests.length,
      responseCount: successfulRequests.length,
      averageLatency: avgLatency,
      peakLatency: peakLatency,
      errorRate: errorRate,
      endpoints: endpoints
    };
  }

  private getStorageUsage(operations: StorageOperation[]): StorageUsage {
    const totalSize = operations.reduce((sum, op) => sum + op.size, 0);
    const creates = operations.filter(op => op.type === 'create').length;
    const writes = operations.filter(op => op.type === 'write').length;
    const reads = operations.filter(op => op.type === 'read').length;
    const deletes = operations.filter(op => op.type === 'delete').length;

    return {
      diskSpaceUsed: totalSize,
      diskSpaceAvailable: 0, // Would need filesystem info
      filesCreated: creates,
      filesModified: writes,
      filesDeleted: deletes,
      temporaryFiles: 0, // Would need to track temp files
      cacheSize: 0, // Would need cache monitoring
      operations: operations
    };
  }

  private async getAIResourceUsage(session: SessionData): Promise<AIResourceUsage> {
    // This would integrate with AI provider SDKs to get actual usage
    // For now, return placeholder data
    return {
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        tokenRate: 0
      },
      requestCount: 0,
      averageResponseTime: 0,
      peakResponseTime: 0,
      providers: [],
      modelUsage: [],
      streamingUsage: {
        streamCount: 0,
        averageStreamDuration: 0,
        totalBytesStreamed: 0,
        averageChunkSize: 0,
        reconnectionCount: 0
      }
    };
  }

  async shutdown(): Promise<void> {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.endSession(sessionId);
    }

    this.initialized = false;
    this.emit('collector:shutdown');
  }
}

// Supporting interfaces
interface SessionData {
  id: string;
  operationType: OperationType;
  startTime: number;
  startCPU: NodeJS.CpuUsage;
  startMemory: NodeJS.MemoryUsage;
  operations: OperationData[];
  networkRequests: NetworkRequestData[];
  storageOps: StorageOperation[];
  peakMemoryMB: number;
  totalCPUTime: number;
}

interface OperationData {
  type: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

interface NetworkRequestData {
  url: string;
  method: string;
  duration: number;
  success: boolean;
  statusCode?: number;
  requestSize?: number;
  responseSize?: number;
  timestamp?: number;
}

interface ProcessMonitor {
  pid: number;
  startTime: number;
  cpuHistory: CPUMeasurement[];
  memoryHistory: MemoryMeasurement[];
  active: boolean;
}

interface CPUMeasurement {
  timestamp: number;
  user: number;
  system: number;
}

interface MemoryMeasurement {
  timestamp: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

interface EndpointData {
  url: string;
  method: string;
  requests: NetworkRequestData[];
  totalBytes: number;
  errorCount: number;
  statusCodes: Record<number, number>;
}

interface MetricsFilters {
  startTime?: number;
  endTime?: number;
  operationType?: OperationType;
  sessionId?: string;
  environment?: string;
}