/**
 * @fileoverview WebSocket Communication DNA Module - Epic 5 Story 4 AC1
 * Provides reliable WebSocket connections with automatic reconnection and message queuing
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
 * WebSocket connection states
 */
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  CLOSED = 'closed'
}

/**
 * Message priority levels
 */
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Message types
 */
export enum MessageType {
  TEXT = 'text',
  BINARY = 'binary',
  JSON = 'json',
  PING = 'ping',
  PONG = 'pong',
  HEARTBEAT = 'heartbeat',
  AUTH = 'auth',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe'
}

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  // Connection settings
  url: string;
  protocols?: string[];
  
  // Reconnection settings
  enableReconnection: boolean;
  maxReconnectAttempts: number;
  reconnectInterval: number; // in milliseconds
  reconnectBackoffMultiplier: number;
  maxReconnectInterval: number; // in milliseconds
  
  // Heartbeat settings
  enableHeartbeat: boolean;
  heartbeatInterval: number; // in milliseconds
  heartbeatTimeout: number; // in milliseconds
  
  // Message queuing
  enableMessageQueue: boolean;
  maxQueueSize: number;
  queuePersistence: 'memory' | 'localStorage' | 'indexedDB';
  
  // Authentication
  authToken?: string;
  authMethod: 'header' | 'query' | 'message';
  autoAuth: boolean;
  
  // Compression
  enableCompression: boolean;
  compressionThreshold: number; // bytes
  
  // Rate limiting
  enableRateLimit: boolean;
  maxMessagesPerSecond: number;
  
  // Security
  enableTLS: boolean;
  validateCertificate: boolean;
  allowedOrigins: string[];
  
  // Debugging
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  timeout?: number;
  channel?: string;
  metadata?: Record<string, any>;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectAttempts: number;
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  latency: number;
  uptime: number;
  errors: number;
}

/**
 * Subscription management
 */
export interface Subscription {
  id: string;
  channel: string;
  callback: (message: any) => void;
  filters?: Record<string, any>;
  active: boolean;
  createdAt: Date;
}

/**
 * WebSocket Module implementation
 */
export class WebSocketModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'websocket-communication',
    name: 'WebSocket Communication Module',
    version: '1.0.0',
    description: 'Reliable WebSocket connections with automatic reconnection and message queuing',
    category: DNAModuleCategory.REAL_TIME,
    tags: ['websocket', 'real-time', 'communication', 'messaging', 'live'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.FULL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['ios', 'android', 'web', 'desktop'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: ['ws'],
    devDependencies: ['@types/ws'],
    peerDependencies: []
  };

  private config: WebSocketConfig;
  private eventEmitter: EventEmitter;
  private websocket: WebSocket | null = null;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions: Map<string, Subscription> = new Map();
  private stats: ConnectionStats;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private rateLimitTokens: number;
  private rateLimitLastRefill: number;

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.stats = {
      reconnectAttempts: 0,
      totalMessages: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      latency: 0,
      uptime: 0,
      errors: 0
    };
    
    this.rateLimitTokens = config.maxMessagesPerSecond;
    this.rateLimitLastRefill = Date.now();
    
    this.validateConfig();
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(): Promise<boolean> {
    if (this.state === WebSocketState.CONNECTED || this.state === WebSocketState.CONNECTING) {
      return true;
    }

    this.setState(WebSocketState.CONNECTING);
    
    try {
      await this.establishConnection();
      return true;
    } catch (error) {
      this.handleConnectionError(error);
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.clearTimers();
    
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }
    
    this.setState(WebSocketState.DISCONNECTED);
    this.stats.disconnectedAt = new Date();
  }

  /**
   * Send message through WebSocket
   */
  public async sendMessage(
    payload: any,
    type: MessageType = MessageType.JSON,
    priority: MessagePriority = MessagePriority.NORMAL,
    options: {
      timeout?: number;
      maxRetries?: number;
      channel?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<boolean> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type,
      priority,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout,
      channel: options.channel,
      metadata: options.metadata
    };

    // Rate limiting check
    if (this.config.enableRateLimit && !this.checkRateLimit()) {
      this.log('warn', 'Rate limit exceeded, queueing message');
      if (this.config.enableMessageQueue) {
        this.queueMessage(message);
      }
      return false;
    }

    if (this.state === WebSocketState.CONNECTED) {
      return this.transmitMessage(message);
    } else {
      if (this.config.enableMessageQueue) {
        this.queueMessage(message);
      }
      return false;
    }
  }

  /**
   * Subscribe to channel/topic
   */
  public subscribe(
    channel: string,
    callback: (message: any) => void,
    filters?: Record<string, any>
  ): string {
    const subscription: Subscription = {
      id: this.generateSubscriptionId(),
      channel,
      callback,
      filters,
      active: true,
      createdAt: new Date()
    };

    this.subscriptions.set(subscription.id, subscription);
    
    // Send subscription message to server
    this.sendMessage({
      action: 'subscribe',
      channel,
      filters
    }, MessageType.SUBSCRIBE);

    this.eventEmitter.emit('subscription:created', { subscription });
    
    return subscription.id;
  }

  /**
   * Unsubscribe from channel/topic
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.active = false;
    this.subscriptions.delete(subscriptionId);

    // Send unsubscription message to server
    this.sendMessage({
      action: 'unsubscribe',
      channel: subscription.channel
    }, MessageType.UNSUBSCRIBE);

    this.eventEmitter.emit('subscription:removed', { subscription });
    
    return true;
  }

  /**
   * Get connection state
   */
  public getState(): WebSocketState {
    return this.state;
  }

  /**
   * Get connection statistics
   */
  public getStats(): ConnectionStats {
    const now = Date.now();
    if (this.stats.connectedAt) {
      this.stats.uptime = now - this.stats.connectedAt.getTime();
    }
    return { ...this.stats };
  }

  /**
   * Get queued messages count
   */
  public getQueueSize(): number {
    return this.messageQueue.length;
  }

  /**
   * Clear message queue
   */
  public clearQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Establish WebSocket connection
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

        this.websocket = new WebSocket(url, this.config.protocols);

        // Set up event handlers
        this.websocket.onopen = () => {
          this.handleConnectionOpen();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.websocket.onclose = (event) => {
          this.handleConnectionClose(event);
        };

        this.websocket.onerror = (error) => {
          this.handleConnectionError(error);
          reject(error);
        };

        // Add auth header if using header method
        if (this.config.authMethod === 'header' && this.config.authToken) {
          // Note: WebSocket API doesn't support custom headers in browser
          // This would need to be handled server-side or use a different approach
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle connection open
   */
  private handleConnectionOpen(): void {
    this.setState(WebSocketState.CONNECTED);
    this.stats.connectedAt = new Date();
    this.stats.reconnectAttempts = 0;

    this.log('info', 'WebSocket connected');

    // Send authentication message if using message method
    if (this.config.autoAuth && this.config.authMethod === 'message' && this.config.authToken) {
      this.sendMessage({
        type: 'auth',
        token: this.config.authToken
      }, MessageType.AUTH);
    }

    // Start heartbeat
    if (this.config.enableHeartbeat) {
      this.startHeartbeat();
    }

    // Process queued messages
    this.processMessageQueue();

    this.eventEmitter.emit('connected');
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      let data: any;
      
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data);
        } catch {
          data = { type: 'text', payload: event.data };
        }
      } else {
        data = { type: 'binary', payload: event.data };
      }

      this.stats.messagesReceived++;
      this.stats.bytesTransferred += event.data.length || 0;

      // Handle heartbeat responses
      if (data.type === 'pong' || data.type === 'heartbeat') {
        this.handleHeartbeatResponse(data);
        return;
      }

      // Route message to subscribers
      if (data.channel) {
        this.routeMessageToSubscribers(data);
      }

      // Calculate latency if message has timestamp
      if (data.timestamp) {
        this.stats.latency = Date.now() - data.timestamp;
      }

      this.eventEmitter.emit('message', data);
      this.log('debug', 'Message received', data);
    } catch (error) {
      this.stats.errors++;
      this.log('error', 'Failed to process message', error);
    }
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(event: CloseEvent): void {
    this.setState(WebSocketState.DISCONNECTED);
    this.stats.disconnectedAt = new Date();
    this.clearTimers();

    this.log('info', `WebSocket closed: ${event.code} ${event.reason}`);

    // Attempt reconnection if enabled
    if (this.config.enableReconnection && !event.wasClean) {
      this.scheduleReconnection();
    }

    this.eventEmitter.emit('disconnected', { code: event.code, reason: event.reason });
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: any): void {
    this.stats.errors++;
    this.setState(WebSocketState.FAILED);
    
    this.log('error', 'WebSocket error', error);
    this.eventEmitter.emit('error', error);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.stats.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setState(WebSocketState.FAILED);
      this.log('error', 'Max reconnection attempts reached');
      return;
    }

    this.setState(WebSocketState.RECONNECTING);
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
   * Transmit message through WebSocket
   */
  private transmitMessage(message: WebSocketMessage): boolean {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      let payload: string | ArrayBuffer;

      switch (message.type) {
        case MessageType.JSON:
          payload = JSON.stringify(message.payload);
          break;
        case MessageType.TEXT:
          payload = String(message.payload);
          break;
        case MessageType.BINARY:
          payload = message.payload;
          break;
        default:
          payload = JSON.stringify(message);
      }

      this.websocket.send(payload);
      this.stats.messagesSent++;
      this.stats.totalMessages++;
      
      if (typeof payload === 'string') {
        this.stats.bytesTransferred += payload.length;
      }

      this.log('debug', 'Message sent', message);
      this.eventEmitter.emit('message:sent', message);
      
      return true;
    } catch (error) {
      this.stats.errors++;
      this.log('error', 'Failed to send message', error);
      
      // Queue message for retry if configured
      if (message.retries < message.maxRetries) {
        message.retries++;
        this.queueMessage(message);
      }
      
      return false;
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority message
      const lowPriorityIndex = this.messageQueue.findIndex(m => m.priority === MessagePriority.LOW);
      if (lowPriorityIndex !== -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        this.messageQueue.shift();
      }
    }

    // Insert message based on priority
    const insertIndex = this.findInsertIndex(message.priority);
    this.messageQueue.splice(insertIndex, 0, message);

    // Persist queue if configured
    if (this.config.queuePersistence !== 'memory') {
      this.persistQueue();
    }

    this.eventEmitter.emit('message:queued', message);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      if (!this.transmitMessage(message)) {
        this.queueMessage(message);
        break; // Stop processing if transmission fails
      }
    }
  }

  /**
   * Route message to appropriate subscribers
   */
  private routeMessageToSubscribers(data: any): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.active && subscription.channel === data.channel) {
        // Apply filters if configured
        if (subscription.filters && !this.matchesFilters(data, subscription.filters)) {
          continue;
        }

        try {
          subscription.callback(data);
        } catch (error) {
          this.log('error', 'Subscriber callback error', error);
        }
      }
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({ timestamp: Date.now() }, MessageType.PING);
    }, this.config.heartbeatInterval);
  }

  /**
   * Handle heartbeat response
   */
  private handleHeartbeatResponse(data: any): void {
    if (data.timestamp) {
      this.stats.latency = Date.now() - data.timestamp;
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    if (!this.config.enableRateLimit) {
      return true;
    }

    const now = Date.now();
    const timeSinceLastRefill = now - this.rateLimitLastRefill;
    
    // Refill tokens based on time passed
    const tokensToAdd = Math.floor(timeSinceLastRefill / 1000) * this.config.maxMessagesPerSecond;
    this.rateLimitTokens = Math.min(this.config.maxMessagesPerSecond, this.rateLimitTokens + tokensToAdd);
    this.rateLimitLastRefill = now;

    if (this.rateLimitTokens > 0) {
      this.rateLimitTokens--;
      return true;
    }

    return false;
  }

  /**
   * Set connection state
   */
  private setState(newState: WebSocketState): void {
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
   * Find insert index for message priority
   */
  private findInsertIndex(priority: MessagePriority): number {
    const priorityOrder = [MessagePriority.CRITICAL, MessagePriority.HIGH, MessagePriority.NORMAL, MessagePriority.LOW];
    const targetIndex = priorityOrder.indexOf(priority);
    
    for (let i = 0; i < this.messageQueue.length; i++) {
      const currentIndex = priorityOrder.indexOf(this.messageQueue[i].priority);
      if (currentIndex > targetIndex) {
        return i;
      }
    }
    
    return this.messageQueue.length;
  }

  /**
   * Check if message matches subscription filters
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
   * Persist message queue
   */
  private persistQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const queueData = JSON.stringify(this.messageQueue);
      
      switch (this.config.queuePersistence) {
        case 'localStorage':
          localStorage.setItem('websocket_queue', queueData);
          break;
        case 'indexedDB':
          // Implementation would use IndexedDB API
          break;
      }
    } catch (error) {
      this.log('error', 'Failed to persist queue', error);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `ws_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `ws_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      console[level as keyof Console](`[WebSocket] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.url) {
      throw new Error('WebSocket URL is required');
    }
    
    if (this.config.maxReconnectAttempts < 0) {
      throw new Error('Max reconnect attempts must be non-negative');
    }
    
    if (this.config.reconnectInterval < 0) {
      throw new Error('Reconnect interval must be non-negative');
    }
  }

  /**
   * Get generated files for the WebSocket module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core WebSocket types
    files.push({
      path: 'src/lib/real-time/websocket/types.ts',
      content: this.generateWebSocketTypes(),
      type: 'typescript'
    });

    // WebSocket service
    files.push({
      path: 'src/lib/real-time/websocket/service.ts',
      content: this.generateWebSocketService(context),
      type: 'typescript'
    });

    // Message queue manager
    files.push({
      path: 'src/lib/real-time/websocket/queue.ts',
      content: this.generateQueueManager(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    } else if (context.framework === SupportedFramework.REACT_NATIVE) {
      files.push(...this.getReactNativeFiles());
    }

    return files;
  }

  /**
   * Generate WebSocket types file
   */
  private generateWebSocketTypes(): string {
    return `// Generated WebSocket types - Epic 5 Story 4 AC1
export * from './types/websocket-types';
export * from './types/message-types';
export * from './types/subscription-types';
`;
  }

  /**
   * Generate WebSocket service file
   */
  private generateWebSocketService(context: DNAModuleContext): string {
    return `// Generated WebSocket Service - Epic 5 Story 4 AC1
import { WebSocketModule } from './websocket-module';

export class WebSocketService extends WebSocketModule {
  // WebSocket service for ${context.framework}
}
`;
  }

  /**
   * Generate queue manager file
   */
  private generateQueueManager(context: DNAModuleContext): string {
    return `// Generated Queue Manager - Epic 5 Story 4 AC1
export class MessageQueueManager {
  // Message queue management for ${context.framework}
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/components/WebSocketProvider.tsx',
        content: `// Next.js WebSocket Provider
import React from 'react';

export const WebSocketProvider: React.FC = ({ children }) => {
  return <div>{children}</div>;
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Get React Native specific files
   */
  private getReactNativeFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/hooks/useWebSocket.ts',
        content: `// React Native WebSocket Hook
import { useEffect, useState } from 'react';

export const useWebSocket = (url: string) => {
  // WebSocket hook implementation
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for WebSocket events
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
 * Default WebSocket configuration
 */
export const defaultWebSocketConfig: WebSocketConfig = {
  url: 'ws://localhost:8080',
  protocols: [],
  enableReconnection: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 1000,
  reconnectBackoffMultiplier: 2,
  maxReconnectInterval: 30000,
  enableHeartbeat: true,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  enableMessageQueue: true,
  maxQueueSize: 100,
  queuePersistence: 'memory',
  authMethod: 'header',
  autoAuth: true,
  enableCompression: false,
  compressionThreshold: 1024,
  enableRateLimit: true,
  maxMessagesPerSecond: 10,
  enableTLS: false,
  validateCertificate: true,
  allowedOrigins: ['*'],
  enableLogging: true,
  logLevel: 'info'
};

export default WebSocketModule;