/**
 * @fileoverview Server-Sent Events DNA Module - Epic 5 Story 4 AC3
 * Provides efficient unidirectional real-time updates from server to client
 */

import { EventEmitter } from 'events';
import { BaseDNAModule } from '../../core/src/lib/dna-module';
import {
  DNAModuleMetadata,
  DNAModuleFile,
  DNAModuleContext,
  SupportedFramework,
  DNAModuleCategory,
  FrameworkSupport
} from '../../core/src/lib/types';

/**
 * SSE connection states
 */
export enum SSEConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  CLOSED = 'closed'
}

/**
 * SSE event types
 */
export enum SSEEventType {
  MESSAGE = 'message',
  OPEN = 'open',
  ERROR = 'error',
  CLOSE = 'close',
  CUSTOM = 'custom'
}

/**
 * SSE configuration
 */
export interface SSEConfig {
  // Connection settings
  url: string;
  withCredentials: boolean;
  
  // Authentication
  headers?: Record<string, string>;
  authToken?: string;
  authMethod: 'header' | 'query';
  
  // Reconnection settings
  enableReconnection: boolean;
  maxReconnectAttempts: number;
  reconnectInterval: number; // milliseconds
  reconnectBackoffMultiplier: number;
  maxReconnectInterval: number; // milliseconds
  
  // Event filtering
  eventTypes: string[];
  enableFiltering: boolean;
  filters?: Record<string, any>;
  
  // Buffer management
  enableBuffering: boolean;
  maxBufferSize: number;
  bufferTimeout: number; // milliseconds
  
  // Heartbeat detection
  enableHeartbeat: boolean;
  heartbeatTimeout: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  
  // Performance
  enableCompression: boolean;
  maxMessageSize: number;
  
  // Error handling
  retryOnError: boolean;
  errorRetryDelay: number; // milliseconds
  
  // Debugging
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * SSE event message structure
 */
export interface SSEMessage {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
  timestamp: number;
  lastEventId?: string;
}

/**
 * Parsed SSE event data
 */
export interface ParsedSSEEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  raw: SSEMessage;
  metadata?: Record<string, any>;
}

/**
 * SSE connection statistics
 */
export interface SSEStats {
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectAttempts: number;
  totalEvents: number;
  eventsReceived: number;
  eventsFiltered: number;
  bytesReceived: number;
  errors: number;
  uptime: number;
  lastEventId?: string;
  averageLatency: number;
  connectionDuration: number;
}

/**
 * Event subscription
 */
export interface SSESubscription {
  id: string;
  eventType: string;
  callback: (event: ParsedSSEEvent) => void;
  filters?: Record<string, any>;
  active: boolean;
  createdAt: Date;
  eventCount: number;
}

/**
 * Buffered event for offline handling
 */
export interface BufferedEvent {
  event: ParsedSSEEvent;
  timestamp: number;
  attempts: number;
}

/**
 * Server-Sent Events Module implementation
 */
export class SSEModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'server-sent-events',
    name: 'Server-Sent Events Module',
    version: '1.0.0',
    description: 'Efficient unidirectional real-time updates from server to client',
    category: DNAModuleCategory.REAL_TIME,
    tags: ['sse', 'server-sent-events', 'real-time', 'streaming', 'notifications'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.PARTIAL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['web', 'desktop'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: [],
    devDependencies: [],
    peerDependencies: []
  };

  private config: SSEConfig;
  private eventEmitter: EventEmitter;
  private eventSource: EventSource | null = null;
  private state: SSEConnectionState = SSEConnectionState.DISCONNECTED;
  private subscriptions: Map<string, SSESubscription> = new Map();
  private stats: SSEStats;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private eventBuffer: BufferedEvent[] = [];
  private lastHeartbeat: number = 0;

  constructor(config: SSEConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.stats = {
      reconnectAttempts: 0,
      totalEvents: 0,
      eventsReceived: 0,
      eventsFiltered: 0,
      bytesReceived: 0,
      errors: 0,
      uptime: 0,
      averageLatency: 0,
      connectionDuration: 0
    };
    
    this.validateConfig();
  }

  /**
   * Connect to SSE endpoint
   */
  public async connect(): Promise<boolean> {
    if (this.state === SSEConnectionState.CONNECTED || this.state === SSEConnectionState.CONNECTING) {
      return true;
    }

    this.setState(SSEConnectionState.CONNECTING);
    
    try {
      await this.establishConnection();
      return true;
    } catch (error) {
      this.handleConnectionError(error);
      return false;
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  public disconnect(): void {
    this.clearTimers();
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.setState(SSEConnectionState.DISCONNECTED);
    this.stats.disconnectedAt = new Date();
  }

  /**
   * Subscribe to specific event type
   */
  public subscribe(
    eventType: string,
    callback: (event: ParsedSSEEvent) => void,
    filters?: Record<string, any>
  ): string {
    const subscription: SSESubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      callback,
      filters,
      active: true,
      createdAt: new Date(),
      eventCount: 0
    };

    this.subscriptions.set(subscription.id, subscription);
    
    this.eventEmitter.emit('subscription:created', { subscription });
    this.log('info', `Subscribed to event type: ${eventType}`);
    
    return subscription.id;
  }

  /**
   * Unsubscribe from event type
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.active = false;
    this.subscriptions.delete(subscriptionId);

    this.eventEmitter.emit('subscription:removed', { subscription });
    this.log('info', `Unsubscribed from event type: ${subscription.eventType}`);
    
    return true;
  }

  /**
   * Get connection state
   */
  public getState(): SSEConnectionState {
    return this.state;
  }

  /**
   * Get connection statistics
   */
  public getStats(): SSEStats {
    const now = Date.now();
    if (this.stats.connectedAt) {
      this.stats.uptime = now - this.stats.connectedAt.getTime();
      this.stats.connectionDuration = this.stats.uptime;
    }
    return { ...this.stats };
  }

  /**
   * Get active subscriptions
   */
  public getSubscriptions(): SSESubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }

  /**
   * Clear event buffer
   */
  public clearBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * Get buffered events count
   */
  public getBufferSize(): number {
    return this.eventBuffer.length;
  }

  /**
   * Establish SSE connection
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let url = this.config.url;
        
        // Add auth token to URL if using query method
        if (this.config.authMethod === 'query' && this.config.authToken) {
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}token=${encodeURIComponent(this.config.authToken)}`;
        }

        // Add last event ID for resuming
        if (this.stats.lastEventId) {
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}lastEventId=${encodeURIComponent(this.stats.lastEventId)}`;
        }

        const options: EventSourceInit = {
          withCredentials: this.config.withCredentials
        };

        this.eventSource = new EventSource(url, options);

        // Set up event handlers
        this.eventSource.onopen = () => {
          this.handleConnectionOpen();
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.eventSource.onerror = (error) => {
          this.handleConnectionError(error);
          if (this.state === SSEConnectionState.CONNECTING) {
            reject(error);
          }
        };

        // Set up custom event listeners for configured event types
        this.config.eventTypes.forEach(eventType => {
          this.eventSource!.addEventListener(eventType, (event) => {
            this.handleCustomEvent(event as MessageEvent);
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle connection open
   */
  private handleConnectionOpen(): void {
    this.setState(SSEConnectionState.CONNECTED);
    this.stats.connectedAt = new Date();
    this.stats.reconnectAttempts = 0;
    this.lastHeartbeat = Date.now();

    this.log('info', 'SSE connection established');

    // Start heartbeat monitoring
    if (this.config.enableHeartbeat) {
      this.startHeartbeatMonitoring();
    }

    // Process buffered events
    this.processBufferedEvents();

    this.eventEmitter.emit('connected');
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const sseMessage = this.parseSSEMessage(event);
      const parsedEvent = this.parseEventData(sseMessage);

      this.updateStats(sseMessage);
      this.updateLastEventId(sseMessage.id);

      // Apply global filters
      if (this.config.enableFiltering && !this.passesGlobalFilters(parsedEvent)) {
        this.stats.eventsFiltered++;
        return;
      }

      // Route to subscribers
      this.routeEventToSubscribers(parsedEvent);

      // Buffer event if offline handling is enabled
      if (this.config.enableBuffering) {
        this.bufferEvent(parsedEvent);
      }

      this.eventEmitter.emit('message', parsedEvent);
      this.log('debug', `Message received: ${parsedEvent.type}`, parsedEvent.data);

    } catch (error) {
      this.stats.errors++;
      this.log('error', 'Failed to process SSE message', error);
    }
  }

  /**
   * Handle custom events
   */
  private handleCustomEvent(event: MessageEvent): void {
    this.handleMessage(event);
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: any): void {
    this.stats.errors++;
    
    if (this.state !== SSEConnectionState.FAILED) {
      this.setState(SSEConnectionState.FAILED);
    }
    
    this.log('error', 'SSE connection error', error);

    // Attempt reconnection if enabled
    if (this.config.enableReconnection && this.state !== SSEConnectionState.CLOSED) {
      this.scheduleReconnection();
    }

    this.eventEmitter.emit('error', error);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.stats.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setState(SSEConnectionState.FAILED);
      this.log('error', 'Max reconnection attempts reached');
      return;
    }

    this.setState(SSEConnectionState.RECONNECTING);
    this.stats.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectBackoffMultiplier, this.stats.reconnectAttempts - 1),
      this.config.maxReconnectInterval
    );

    this.log('info', `Reconnecting in ${delay}ms (attempt ${this.stats.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Parse SSE message format
   */
  private parseSSEMessage(event: MessageEvent): SSEMessage {
    return {
      id: event.lastEventId || undefined,
      event: event.type || 'message',
      data: event.data,
      timestamp: Date.now(),
      lastEventId: event.lastEventId
    };
  }

  /**
   * Parse event data (try JSON, fallback to string)
   */
  private parseEventData(sseMessage: SSEMessage): ParsedSSEEvent {
    let data: any;
    
    try {
      data = JSON.parse(sseMessage.data);
    } catch {
      data = sseMessage.data;
    }

    return {
      id: sseMessage.id || this.generateEventId(),
      type: sseMessage.event || 'message',
      data,
      timestamp: sseMessage.timestamp,
      raw: sseMessage
    };
  }

  /**
   * Route event to appropriate subscribers
   */
  private routeEventToSubscribers(event: ParsedSSEEvent): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.active && this.eventMatches(event, subscription)) {
        // Apply subscription-specific filters
        if (subscription.filters && !this.passesSubscriptionFilters(event, subscription.filters)) {
          continue;
        }

        try {
          subscription.callback(event);
          subscription.eventCount++;
        } catch (error) {
          this.log('error', 'Subscriber callback error', error);
        }
      }
    }
  }

  /**
   * Check if event matches subscription
   */
  private eventMatches(event: ParsedSSEEvent, subscription: SSESubscription): boolean {
    return subscription.eventType === '*' || 
           subscription.eventType === event.type ||
           event.type.startsWith(subscription.eventType);
  }

  /**
   * Check if event passes global filters
   */
  private passesGlobalFilters(event: ParsedSSEEvent): boolean {
    if (!this.config.filters) {
      return true;
    }

    return this.matchesFilters(event.data, this.config.filters);
  }

  /**
   * Check if event passes subscription filters
   */
  private passesSubscriptionFilters(event: ParsedSSEEvent, filters: Record<string, any>): boolean {
    return this.matchesFilters(event.data, filters);
  }

  /**
   * Check if data matches filters
   */
  private matchesFilters(data: any, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (data[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Buffer event for offline handling
   */
  private bufferEvent(event: ParsedSSEEvent): void {
    if (this.eventBuffer.length >= this.config.maxBufferSize) {
      this.eventBuffer.shift(); // Remove oldest
    }

    this.eventBuffer.push({
      event,
      timestamp: Date.now(),
      attempts: 0
    });

    // Clean old buffered events
    const cutoff = Date.now() - this.config.bufferTimeout;
    this.eventBuffer = this.eventBuffer.filter(buffered => buffered.timestamp > cutoff);
  }

  /**
   * Process buffered events when reconnected
   */
  private processBufferedEvents(): void {
    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];

    for (const bufferedEvent of eventsToProcess) {
      this.routeEventToSubscribers(bufferedEvent.event);
    }

    if (eventsToProcess.length > 0) {
      this.log('info', `Processed ${eventsToProcess.length} buffered events`);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;

      if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
        this.log('warn', 'Heartbeat timeout detected');
        this.handleConnectionError(new Error('Heartbeat timeout'));
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Update connection statistics
   */
  private updateStats(message: SSEMessage): void {
    this.stats.eventsReceived++;
    this.stats.totalEvents++;
    this.stats.bytesReceived += message.data.length;
    this.lastHeartbeat = Date.now();

    // Calculate latency if message has timestamp
    if (message.timestamp) {
      const latency = Date.now() - message.timestamp;
      this.stats.averageLatency = (this.stats.averageLatency + latency) / 2;
    }
  }

  /**
   * Update last event ID for resuming
   */
  private updateLastEventId(eventId?: string): void {
    if (eventId) {
      this.stats.lastEventId = eventId;
    }
  }

  /**
   * Set connection state
   */
  private setState(newState: SSEConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      this.eventEmitter.emit('state:changed', { oldState, newState });
      this.log('info', `State changed: ${oldState} -> ${newState}`);
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sse_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sse_evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message with level
   */
  private log(level: string, message: string, data?: any): void {
    if (!this.config.enableLogging) return;
    
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevel = logLevels.indexOf(this.config.logLevel);
    const currentLevel = logLevels.indexOf(level);
    
    if (currentLevel >= configLevel) {
      console[level as keyof Console](`[SSE] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.url) {
      throw new Error('SSE URL is required');
    }
    
    if (this.config.maxReconnectAttempts < 0) {
      throw new Error('Max reconnect attempts must be non-negative');
    }
    
    if (this.config.reconnectInterval < 0) {
      throw new Error('Reconnect interval must be non-negative');
    }
  }

  /**
   * Get generated files for the SSE module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core SSE types
    files.push({
      path: 'src/lib/real-time/sse/types.ts',
      content: this.generateSSETypes(),
      type: 'typescript'
    });

    // SSE service
    files.push({
      path: 'src/lib/real-time/sse/service.ts',
      content: this.generateSSEService(context),
      type: 'typescript'
    });

    // Event buffer manager
    files.push({
      path: 'src/lib/real-time/sse/buffer.ts',
      content: this.generateBufferManager(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate SSE types file
   */
  private generateSSETypes(): string {
    return `// Generated SSE types - Epic 5 Story 4 AC3
export * from './types/sse-types';
export * from './types/event-types';
export * from './types/subscription-types';
`;
  }

  /**
   * Generate SSE service file
   */
  private generateSSEService(context: DNAModuleContext): string {
    return `// Generated SSE Service - Epic 5 Story 4 AC3
import { SSEModule } from './sse-module';

export class SSEService extends SSEModule {
  // SSE service for ${context.framework}
}
`;
  }

  /**
   * Generate buffer manager file
   */
  private generateBufferManager(context: DNAModuleContext): string {
    return `// Generated SSE Buffer Manager - Epic 5 Story 4 AC3
export class SSEBufferManager {
  // Event buffer management for ${context.framework}
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/pages/api/sse/events.ts',
        content: `// Next.js SSE Events API
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // SSE endpoint implementation
}
`,
        type: 'typescript'
      },
      {
        path: 'src/hooks/useSSE.ts',
        content: `// Next.js SSE Hook
import { useEffect, useState } from 'react';

export const useSSE = (url: string) => {
  // SSE hook implementation
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for SSE events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  public emit(event: string, ...args: any[]): boolean {
    return this.eventEmitter.emit(event, ...args);
  }
}

/**
 * Default SSE configuration
 */
export const defaultSSEConfig: SSEConfig = {
  url: 'http://localhost:3000/api/sse',
  withCredentials: false,
  authMethod: 'header',
  enableReconnection: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 1000,
  reconnectBackoffMultiplier: 2,
  maxReconnectInterval: 30000,
  eventTypes: ['message', 'update', 'notification'],
  enableFiltering: false,
  enableBuffering: true,
  maxBufferSize: 100,
  bufferTimeout: 300000, // 5 minutes
  enableHeartbeat: true,
  heartbeatTimeout: 60000,
  heartbeatInterval: 30000,
  enableCompression: false,
  maxMessageSize: 65536,
  retryOnError: true,
  errorRetryDelay: 3000,
  enableLogging: true,
  logLevel: 'info'
};

export default SSEModule;