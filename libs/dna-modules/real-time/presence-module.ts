/**
 * @fileoverview Presence Tracking DNA Module - Epic 5 Story 4 AC5
 * Provides real-time user presence tracking and activity monitoring
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
 * User presence states
 */
export enum PresenceState {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
  INVISIBLE = 'invisible',
  IDLE = 'idle'
}

/**
 * Activity types
 */
export enum ActivityType {
  ACTIVE = 'active',
  TYPING = 'typing',
  VIEWING = 'viewing',
  EDITING = 'editing',
  IDLE = 'idle',
  FOCUS = 'focus',
  BLUR = 'blur',
  MOUSE_MOVE = 'mouse_move',
  KEY_PRESS = 'key_press',
  CLICK = 'click',
  SCROLL = 'scroll',
  CUSTOM = 'custom'
}

/**
 * Presence visibility levels
 */
export enum VisibilityLevel {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private',
  CUSTOM = 'custom'
}

/**
 * Presence configuration
 */
export interface PresenceConfig {
  // User identification
  userId: string;
  userName?: string;
  userMetadata?: Record<string, any>;
  
  // Connection settings
  transportLayer: 'websocket' | 'webrtc' | 'sse' | 'custom';
  transportConfig: any;
  
  // Presence tracking
  enablePresenceTracking: boolean;
  presenceUpdateInterval: number; // milliseconds
  idleTimeout: number; // milliseconds
  awayTimeout: number; // milliseconds
  
  // Activity monitoring
  enableActivityTracking: boolean;
  trackedActivities: ActivityType[];
  activityDebounceTime: number; // milliseconds
  enableMouseTracking: boolean;
  enableKeyboardTracking: boolean;
  enableScrollTracking: boolean;
  enableFocusTracking: boolean;
  
  // Location tracking
  enableLocationTracking: boolean;
  locationTypes: ('page' | 'room' | 'channel' | 'document')[];
  
  // Privacy settings
  defaultVisibility: VisibilityLevel;
  allowStatusOverride: boolean;
  enableAnonymousMode: boolean;
  
  // Performance
  maxPresenceHistorySize: number;
  presenceBroadcastThrottle: number; // milliseconds
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number; // milliseconds
  
  // Persistence
  enablePersistence: boolean;
  persistenceStorage: 'memory' | 'localStorage' | 'indexedDB' | 'custom';
  persistenceKey: string;
  
  // Security
  enableEncryption: boolean;
  encryptionKey?: string;
  
  // Debugging
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * User presence information
 */
export interface UserPresence {
  userId: string;
  userName?: string;
  state: PresenceState;
  lastActivity: Date;
  lastSeen: Date;
  currentLocation?: string;
  customStatus?: string;
  metadata?: Record<string, any>;
  visibility: VisibilityLevel;
  isAnonymous: boolean;
}

/**
 * Activity event structure
 */
export interface ActivityEvent {
  id: string;
  userId: string;
  type: ActivityType;
  timestamp: Date;
  location?: string;
  data?: any;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Location information
 */
export interface LocationInfo {
  id: string;
  type: 'page' | 'room' | 'channel' | 'document';
  name: string;
  url?: string;
  metadata?: Record<string, any>;
  joinedAt: Date;
  lastActivity: Date;
}

/**
 * Presence statistics
 */
export interface PresenceStats {
  totalUsers: number;
  onlineUsers: number;
  activeUsers: number;
  idleUsers: number;
  awayUsers: number;
  invisibleUsers: number;
  averageSessionDuration: number;
  totalActivities: number;
  activitiesPerMinute: number;
  mostActiveLocation?: string;
  peakConcurrency: number;
  lastUpdate: Date;
}

/**
 * Presence subscription options
 */
export interface SubscriptionOptions {
  userId?: string;
  location?: string;
  presenceStates?: PresenceState[];
  activityTypes?: ActivityType[];
  includeAnonymous?: boolean;
  realTimeUpdates?: boolean;
}

/**
 * Batched presence update
 */
export interface PresenceBatch {
  id: string;
  updates: UserPresence[];
  activities: ActivityEvent[];
  timestamp: Date;
  checksum: string;
}

/**
 * Presence Tracking Module implementation
 */
export class PresenceModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'presence-tracking',
    name: 'Presence Tracking Module',
    version: '1.0.0',
    description: 'Real-time user presence tracking and activity monitoring',
    category: DNAModuleCategory.REAL_TIME,
    tags: ['presence', 'activity', 'real-time', 'user-tracking', 'monitoring'],
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
    dependencies: ['uuid'],
    devDependencies: ['@types/uuid'],
    peerDependencies: []
  };

  private config: PresenceConfig;
  private eventEmitter: EventEmitter;
  private currentPresence: UserPresence;
  private presenceMap: Map<string, UserPresence> = new Map();
  private activityHistory: ActivityEvent[] = [];
  private locationHistory: LocationInfo[] = [];
  private stats: PresenceStats;
  
  // Timers and intervals
  private presenceTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private awayTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Activity tracking
  private lastActivity: Date = new Date();
  private pendingActivities: ActivityEvent[] = [];
  private activityListeners: Map<string, EventListener> = new Map();
  
  // Transport connection
  private transportConnection: any = null;
  private isConnected: boolean = false;

  constructor(config: PresenceConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    this.currentPresence = {
      userId: config.userId,
      userName: config.userName,
      state: PresenceState.OFFLINE,
      lastActivity: new Date(),
      lastSeen: new Date(),
      visibility: config.defaultVisibility,
      isAnonymous: config.enableAnonymousMode
    };
    
    this.stats = {
      totalUsers: 0,
      onlineUsers: 0,
      activeUsers: 0,
      idleUsers: 0,
      awayUsers: 0,
      invisibleUsers: 0,
      averageSessionDuration: 0,
      totalActivities: 0,
      activitiesPerMinute: 0,
      peakConcurrency: 0,
      lastUpdate: new Date()
    };
    
    this.validateConfig();
    this.initializeTransport();
    
    if (config.enableActivityTracking) {
      this.setupActivityTracking();
    }
  }

  /**
   * Initialize transport layer connection
   */
  private async initializeTransport(): Promise<void> {
    switch (this.config.transportLayer) {
      case 'websocket':
        this.log('info', 'Initializing WebSocket transport for presence');
        break;
      case 'webrtc':
        this.log('info', 'Initializing WebRTC transport for presence');
        break;
      case 'sse':
        this.log('info', 'Initializing SSE transport for presence');
        break;
      default:
        this.log('info', 'Using custom transport for presence');
    }
  }

  /**
   * Connect to presence network
   */
  public async connect(): Promise<boolean> {
    try {
      await this.establishTransportConnection();
      
      // Set initial presence state
      await this.setPresenceState(PresenceState.ONLINE);
      
      // Start presence updates
      this.startPresenceUpdates();
      
      // Start activity monitoring
      if (this.config.enableActivityTracking) {
        this.startActivityMonitoring();
      }
      
      this.isConnected = true;
      this.eventEmitter.emit('connected');
      this.log('info', 'Presence tracking connected');
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to connect to presence network', error);
      return false;
    }
  }

  /**
   * Disconnect from presence network
   */
  public async disconnect(): Promise<void> {
    // Set offline state
    await this.setPresenceState(PresenceState.OFFLINE);
    
    // Stop all timers
    this.stopAllTimers();
    
    // Remove activity listeners
    this.removeActivityListeners();
    
    // Close transport connection
    if (this.transportConnection) {
      this.transportConnection = null;
    }
    
    this.isConnected = false;
    this.eventEmitter.emit('disconnected');
    this.log('info', 'Presence tracking disconnected');
  }

  /**
   * Set user presence state
   */
  public async setPresenceState(
    state: PresenceState, 
    customStatus?: string, 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const oldState = this.currentPresence.state;
    
    this.currentPresence.state = state;
    this.currentPresence.lastSeen = new Date();
    this.currentPresence.customStatus = customStatus;
    
    if (metadata) {
      this.currentPresence.metadata = { ...this.currentPresence.metadata, ...metadata };
    }
    
    // Update activity timestamp for active states
    if ([PresenceState.ONLINE, PresenceState.BUSY].includes(state)) {
      this.currentPresence.lastActivity = new Date();
      this.lastActivity = new Date();
    }
    
    // Broadcast presence update
    await this.broadcastPresenceUpdate();
    
    // Reset idle/away timers
    this.resetIdleTimers();
    
    this.eventEmitter.emit('presence:changed', { 
      userId: this.config.userId, 
      oldState, 
      newState: state,
      presence: this.currentPresence 
    });
    
    this.log('info', `Presence state changed: ${oldState} -> ${state}`);
    
    return true;
  }

  /**
   * Get current user presence
   */
  public getCurrentPresence(): UserPresence {
    return { ...this.currentPresence };
  }

  /**
   * Get presence for specific user
   */
  public getUserPresence(userId: string): UserPresence | null {
    return this.presenceMap.get(userId) || null;
  }

  /**
   * Get all online users
   */
  public getOnlineUsers(): UserPresence[] {
    return Array.from(this.presenceMap.values()).filter(
      presence => presence.state !== PresenceState.OFFLINE
    );
  }

  /**
   * Join location (room, channel, etc.)
   */
  public async joinLocation(
    locationId: string, 
    locationType: 'page' | 'room' | 'channel' | 'document',
    locationName: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const location: LocationInfo = {
      id: locationId,
      type: locationType,
      name: locationName,
      metadata,
      joinedAt: new Date(),
      lastActivity: new Date()
    };
    
    // Add to location history
    this.locationHistory.push(location);
    
    // Trim history if needed
    if (this.locationHistory.length > this.config.maxPresenceHistorySize) {
      this.locationHistory = this.locationHistory.slice(-this.config.maxPresenceHistorySize);
    }
    
    // Update current presence location
    this.currentPresence.currentLocation = locationId;
    
    // Broadcast location update
    await this.broadcastPresenceUpdate();
    
    this.eventEmitter.emit('location:joined', { location, userId: this.config.userId });
    this.log('info', `Joined location: ${locationName} (${locationId})`);
    
    return true;
  }

  /**
   * Leave current location
   */
  public async leaveLocation(): Promise<boolean> {
    const currentLocation = this.currentPresence.currentLocation;
    
    this.currentPresence.currentLocation = undefined;
    
    // Update location history
    const locationInfo = this.locationHistory.find(loc => loc.id === currentLocation);
    if (locationInfo) {
      locationInfo.lastActivity = new Date();
    }
    
    // Broadcast location update
    await this.broadcastPresenceUpdate();
    
    this.eventEmitter.emit('location:left', { locationId: currentLocation, userId: this.config.userId });
    this.log('info', `Left location: ${currentLocation}`);
    
    return true;
  }

  /**
   * Track custom activity
   */
  public trackActivity(
    type: ActivityType,
    data?: any,
    duration?: number,
    metadata?: Record<string, any>
  ): void {
    const activity: ActivityEvent = {
      id: this.generateActivityId(),
      userId: this.config.userId,
      type,
      timestamp: new Date(),
      location: this.currentPresence.currentLocation,
      data,
      duration,
      metadata
    };
    
    // Add to activity history
    this.activityHistory.push(activity);
    
    // Trim history if needed
    if (this.activityHistory.length > this.config.maxPresenceHistorySize) {
      this.activityHistory = this.activityHistory.slice(-this.config.maxPresenceHistorySize);
    }
    
    // Update last activity
    this.lastActivity = new Date();
    this.currentPresence.lastActivity = new Date();
    
    // Reset idle timers
    this.resetIdleTimers();
    
    // Queue for broadcasting if batching is enabled
    if (this.config.enableBatching) {
      this.pendingActivities.push(activity);
      this.scheduleBatchedUpdate();
    } else {
      this.broadcastActivity(activity);
    }
    
    this.eventEmitter.emit('activity:tracked', activity);
    this.stats.totalActivities++;
  }

  /**
   * Subscribe to presence updates
   */
  public subscribe(
    callback: (presence: UserPresence) => void,
    options: SubscriptionOptions = {}
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const wrappedCallback = (presence: UserPresence) => {
      // Apply filters
      if (options.userId && presence.userId !== options.userId) return;
      if (options.location && presence.currentLocation !== options.location) return;
      if (options.presenceStates && !options.presenceStates.includes(presence.state)) return;
      if (!options.includeAnonymous && presence.isAnonymous) return;
      
      callback(presence);
    };
    
    this.eventEmitter.on('presence:update', wrappedCallback);
    
    // Store subscription for cleanup
    this.eventEmitter.on('unsubscribe', (id: string) => {
      if (id === subscriptionId) {
        this.eventEmitter.off('presence:update', wrappedCallback);
      }
    });
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from presence updates
   */
  public unsubscribe(subscriptionId: string): void {
    this.eventEmitter.emit('unsubscribe', subscriptionId);
  }

  /**
   * Get presence statistics
   */
  public getStats(): PresenceStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get activity history
   */
  public getActivityHistory(
    startTime?: Date,
    endTime?: Date,
    activityTypes?: ActivityType[]
  ): ActivityEvent[] {
    let filtered = [...this.activityHistory];
    
    if (startTime) {
      filtered = filtered.filter(activity => activity.timestamp >= startTime);
    }
    
    if (endTime) {
      filtered = filtered.filter(activity => activity.timestamp <= endTime);
    }
    
    if (activityTypes && activityTypes.length > 0) {
      filtered = filtered.filter(activity => activityTypes.includes(activity.type));
    }
    
    return filtered;
  }

  /**
   * Get location history
   */
  public getLocationHistory(): LocationInfo[] {
    return [...this.locationHistory];
  }

  /**
   * Handle incoming presence update
   */
  public handlePresenceUpdate(presence: UserPresence): void {
    const existingPresence = this.presenceMap.get(presence.userId);
    
    // Update presence map
    this.presenceMap.set(presence.userId, presence);
    
    // Emit events based on changes
    if (!existingPresence) {
      this.eventEmitter.emit('user:joined', presence);
    } else if (existingPresence.state !== presence.state) {
      this.eventEmitter.emit('presence:changed', {
        userId: presence.userId,
        oldState: existingPresence.state,
        newState: presence.state,
        presence
      });
    }
    
    // Handle offline users
    if (presence.state === PresenceState.OFFLINE) {
      this.eventEmitter.emit('user:left', presence);
    }
    
    this.eventEmitter.emit('presence:update', presence);
  }

  /**
   * Handle incoming activity event
   */
  public handleActivity(activity: ActivityEvent): void {
    // Update user's last activity if they exist in presence map
    const userPresence = this.presenceMap.get(activity.userId);
    if (userPresence) {
      userPresence.lastActivity = activity.timestamp;
      this.presenceMap.set(activity.userId, userPresence);
    }
    
    this.eventEmitter.emit('activity:received', activity);
  }

  /**
   * Setup activity tracking listeners
   */
  private setupActivityTracking(): void {
    if (typeof window === 'undefined') return; // Server-side
    
    // Mouse tracking
    if (this.config.enableMouseTracking) {
      const mouseHandler = this.debounce(() => {
        this.trackActivity(ActivityType.MOUSE_MOVE);
      }, this.config.activityDebounceTime);
      
      window.addEventListener('mousemove', mouseHandler);
      this.activityListeners.set('mousemove', mouseHandler);
    }
    
    // Keyboard tracking
    if (this.config.enableKeyboardTracking) {
      const keyHandler = this.debounce(() => {
        this.trackActivity(ActivityType.KEY_PRESS);
      }, this.config.activityDebounceTime);
      
      window.addEventListener('keydown', keyHandler);
      this.activityListeners.set('keydown', keyHandler);
    }
    
    // Scroll tracking
    if (this.config.enableScrollTracking) {
      const scrollHandler = this.debounce(() => {
        this.trackActivity(ActivityType.SCROLL);
      }, this.config.activityDebounceTime);
      
      window.addEventListener('scroll', scrollHandler);
      this.activityListeners.set('scroll', scrollHandler);
    }
    
    // Focus tracking
    if (this.config.enableFocusTracking) {
      const focusHandler = () => this.trackActivity(ActivityType.FOCUS);
      const blurHandler = () => this.trackActivity(ActivityType.BLUR);
      
      window.addEventListener('focus', focusHandler);
      window.addEventListener('blur', blurHandler);
      this.activityListeners.set('focus', focusHandler);
      this.activityListeners.set('blur', blurHandler);
    }
    
    // Click tracking
    const clickHandler = () => this.trackActivity(ActivityType.CLICK);
    window.addEventListener('click', clickHandler);
    this.activityListeners.set('click', clickHandler);
  }

  /**
   * Remove activity tracking listeners
   */
  private removeActivityListeners(): void {
    if (typeof window === 'undefined') return;
    
    for (const [event, listener] of this.activityListeners) {
      window.removeEventListener(event, listener);
    }
    
    this.activityListeners.clear();
  }

  /**
   * Start presence updates
   */
  private startPresenceUpdates(): void {
    this.presenceTimer = setInterval(() => {
      this.broadcastPresenceUpdate();
    }, this.config.presenceUpdateInterval);
  }

  /**
   * Start activity monitoring
   */
  private startActivityMonitoring(): void {
    this.resetIdleTimers();
  }

  /**
   * Reset idle and away timers
   */
  private resetIdleTimers(): void {
    // Clear existing timers
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.awayTimer) {
      clearTimeout(this.awayTimer);
    }
    
    // Set idle timer
    this.idleTimer = setTimeout(() => {
      if (this.currentPresence.state === PresenceState.ONLINE) {
        this.setPresenceState(PresenceState.IDLE);
      }
    }, this.config.idleTimeout);
    
    // Set away timer
    this.awayTimer = setTimeout(() => {
      if ([PresenceState.ONLINE, PresenceState.IDLE].includes(this.currentPresence.state)) {
        this.setPresenceState(PresenceState.AWAY);
      }
    }, this.config.awayTimeout);
  }

  /**
   * Broadcast presence update
   */
  private async broadcastPresenceUpdate(): Promise<void> {
    try {
      const update = { ...this.currentPresence };
      
      // Send through transport layer
      this.eventEmitter.emit('presence:broadcast', update);
      
      this.log('debug', 'Presence update broadcasted', update);
    } catch (error) {
      this.log('error', 'Failed to broadcast presence update', error);
    }
  }

  /**
   * Broadcast activity event
   */
  private async broadcastActivity(activity: ActivityEvent): Promise<void> {
    try {
      // Send through transport layer
      this.eventEmitter.emit('activity:broadcast', activity);
      
      this.log('debug', 'Activity broadcasted', activity);
    } catch (error) {
      this.log('error', 'Failed to broadcast activity', error);
    }
  }

  /**
   * Schedule batched update
   */
  private scheduleBatchedUpdate(): void {
    if (this.batchTimer) return; // Already scheduled
    
    // Check if batch is full
    if (this.pendingActivities.length >= this.config.batchSize) {
      this.sendBatchedUpdate();
      return;
    }
    
    // Schedule timeout-based batch
    this.batchTimer = setTimeout(() => {
      this.sendBatchedUpdate();
    }, this.config.batchTimeout);
  }

  /**
   * Send batched update
   */
  private sendBatchedUpdate(): void {
    if (this.pendingActivities.length === 0) return;
    
    const batch: PresenceBatch = {
      id: this.generateBatchId(),
      updates: [this.currentPresence],
      activities: [...this.pendingActivities],
      timestamp: new Date(),
      checksum: this.calculateBatchChecksum(this.pendingActivities)
    };
    
    // Clear pending activities
    this.pendingActivities = [];
    
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Broadcast batch
    this.eventEmitter.emit('batch:broadcast', batch);
    this.log('debug', 'Batched update sent', batch);
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const presences = Array.from(this.presenceMap.values());
    
    this.stats.totalUsers = presences.length;
    this.stats.onlineUsers = presences.filter(p => p.state === PresenceState.ONLINE).length;
    this.stats.activeUsers = presences.filter(p => 
      [PresenceState.ONLINE, PresenceState.BUSY].includes(p.state)
    ).length;
    this.stats.idleUsers = presences.filter(p => p.state === PresenceState.IDLE).length;
    this.stats.awayUsers = presences.filter(p => p.state === PresenceState.AWAY).length;
    this.stats.invisibleUsers = presences.filter(p => p.state === PresenceState.INVISIBLE).length;
    
    // Calculate activities per minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentActivities = this.activityHistory.filter(a => a.timestamp >= oneMinuteAgo);
    this.stats.activitiesPerMinute = recentActivities.length;
    
    this.stats.lastUpdate = new Date();
  }

  /**
   * Stop all timers
   */
  private stopAllTimers(): void {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    
    if (this.awayTimer) {
      clearTimeout(this.awayTimer);
      this.awayTimer = null;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Establish transport connection
   */
  private async establishTransportConnection(): Promise<void> {
    // Integration with transport modules would happen here
    this.transportConnection = { connected: true };
  }

  /**
   * Debounce function
   */
  private debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Calculate batch checksum
   */
  private calculateBatchChecksum(activities: ActivityEvent[]): string {
    const data = JSON.stringify(activities.map(a => a.id).sort());
    return btoa(data).slice(0, 16);
  }

  /**
   * Generate unique activity ID
   */
  private generateActivityId(): string {
    return `activity_${this.config.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `presence_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `presence_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      console[level as keyof Console](`[Presence] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.userId) {
      throw new Error('User ID is required for presence tracking');
    }
    
    if (this.config.presenceUpdateInterval < 1000) {
      throw new Error('Presence update interval must be at least 1000ms');
    }
    
    if (this.config.idleTimeout < 30000) {
      throw new Error('Idle timeout must be at least 30 seconds');
    }
  }

  /**
   * Get generated files for the presence module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core presence types
    files.push({
      path: 'src/lib/real-time/presence/types.ts',
      content: this.generatePresenceTypes(),
      type: 'typescript'
    });

    // Presence service
    files.push({
      path: 'src/lib/real-time/presence/service.ts',
      content: this.generatePresenceService(context),
      type: 'typescript'
    });

    // Activity tracker
    files.push({
      path: 'src/lib/real-time/presence/activity-tracker.ts',
      content: this.generateActivityTracker(context),
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
   * Generate presence types file
   */
  private generatePresenceTypes(): string {
    return `// Generated Presence types - Epic 5 Story 4 AC5
export * from './types/presence-types';
export * from './types/activity-types';
export * from './types/location-types';
`;
  }

  /**
   * Generate presence service file
   */
  private generatePresenceService(context: DNAModuleContext): string {
    return `// Generated Presence Service - Epic 5 Story 4 AC5
import { PresenceModule } from './presence-module';

export class PresenceService extends PresenceModule {
  // Presence service for ${context.framework}
}
`;
  }

  /**
   * Generate activity tracker file
   */
  private generateActivityTracker(context: DNAModuleContext): string {
    return `// Generated Activity Tracker - Epic 5 Story 4 AC5
export class ActivityTracker {
  // Activity tracking implementation for ${context.framework}
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/hooks/usePresence.ts',
        content: `// Next.js Presence Hook
import { useEffect, useState } from 'react';

export const usePresence = (userId?: string) => {
  // Presence hook implementation
};
`,
        type: 'typescript'
      },
      {
        path: 'src/components/PresenceIndicator.tsx',
        content: `// Next.js Presence Indicator Component
import React from 'react';

export const PresenceIndicator: React.FC = () => {
  return <div>{/* Presence indicator UI */}</div>;
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
        path: 'src/hooks/usePresenceRN.ts',
        content: `// React Native Presence Hook
import { useEffect, useState } from 'react';

export const usePresenceRN = (userId?: string) => {
  // React Native presence hook implementation
};
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for presence events
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
 * Default presence configuration
 */
export const defaultPresenceConfig: PresenceConfig = {
  userId: 'default-user',
  userName: 'Anonymous User',
  transportLayer: 'websocket',
  transportConfig: {},
  enablePresenceTracking: true,
  presenceUpdateInterval: 30000, // 30 seconds
  idleTimeout: 300000, // 5 minutes
  awayTimeout: 900000, // 15 minutes
  enableActivityTracking: true,
  trackedActivities: [
    ActivityType.ACTIVE,
    ActivityType.TYPING,
    ActivityType.VIEWING,
    ActivityType.MOUSE_MOVE,
    ActivityType.KEY_PRESS,
    ActivityType.CLICK
  ],
  activityDebounceTime: 1000,
  enableMouseTracking: true,
  enableKeyboardTracking: true,
  enableScrollTracking: true,
  enableFocusTracking: true,
  enableLocationTracking: true,
  locationTypes: ['page', 'room', 'channel'],
  defaultVisibility: VisibilityLevel.PUBLIC,
  allowStatusOverride: true,
  enableAnonymousMode: false,
  maxPresenceHistorySize: 1000,
  presenceBroadcastThrottle: 5000,
  enableBatching: true,
  batchSize: 10,
  batchTimeout: 10000,
  enablePersistence: true,
  persistenceStorage: 'localStorage',
  persistenceKey: 'presence_data',
  enableEncryption: false,
  enableLogging: true,
  logLevel: 'info'
};

export default PresenceModule;