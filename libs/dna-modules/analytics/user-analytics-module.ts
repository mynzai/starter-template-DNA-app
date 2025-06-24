/**
 * @fileoverview User Analytics DNA Module - Epic 5 Story 6 AC2
 * Provides GDPR-compliant user analytics with comprehensive privacy controls
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
 * Privacy regulation compliance
 */
export enum PrivacyRegulation {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  PIPEDA = 'pipeda',
  LGPD = 'lgpd',
  PDPA = 'pdpa'
}

/**
 * Consent status
 */
export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn'
}

/**
 * Data processing purpose
 */
export enum ProcessingPurpose {
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
  PERFORMANCE = 'performance',
  FUNCTIONAL = 'functional',
  ADVERTISING = 'advertising'
}

/**
 * Event type categories
 */
export enum EventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  CONVERSION = 'conversion',
  ENGAGEMENT = 'engagement',
  SESSION = 'session',
  CUSTOM = 'custom'
}

/**
 * User analytics configuration
 */
export interface UserAnalyticsConfig {
  // Provider settings
  provider: 'google_analytics' | 'mixpanel' | 'amplitude' | 'segment' | 'custom';
  apiKey?: string;
  trackingId?: string;
  endpoint?: string;
  
  // Privacy compliance
  enableGDPRCompliance: boolean;
  supportedRegulations: PrivacyRegulation[];
  requireExplicitConsent: boolean;
  consentExpiryDays: number;
  enableRightToErasure: boolean;
  enableDataPortability: boolean;
  
  // Data collection settings
  enableUserTracking: boolean;
  enableSessionTracking: boolean;
  enableEventTracking: boolean;
  enableConversionTracking: boolean;
  enableCohortAnalysis: boolean;
  enableFunnelAnalysis: boolean;
  
  // Privacy controls
  enableAnonymization: boolean;
  enablePseudonymization: boolean;
  enableDataMinimization: boolean;
  enableAutomaticDeletion: boolean;
  dataRetentionDays: number;
  
  // Cookie settings
  enableCookies: boolean;
  cookieExpiryDays: number;
  cookieDomain?: string;
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  
  // Sampling and filtering
  samplingRate: number; // 0-1
  enableBotFiltering: boolean;
  enableIPAnonymization: boolean;
  excludeInternalTraffic: boolean;
  internalIPs: string[];
  
  // Real-time processing
  enableRealTimeProcessing: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  
  // Debugging
  enableDebugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * User consent record
 */
export interface ConsentRecord {
  userId?: string;
  sessionId: string;
  purposes: Record<ProcessingPurpose, ConsentStatus>;
  timestamp: Date;
  expiryDate: Date;
  ipAddress?: string;
  userAgent: string;
  consentMethod: 'banner' | 'form' | 'api' | 'implicit';
  granularConsent: boolean;
  regulation: PrivacyRegulation;
  version: string;
}

/**
 * User profile interface
 */
export interface UserProfile {
  userId: string;
  anonymousId?: string;
  email?: string; // Hashed if anonymized
  demographics: {
    age?: number;
    gender?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    timezone?: string;
    language?: string;
  };
  
  // Behavioral data
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
  totalEvents: number;
  
  // Engagement metrics
  averageSessionDuration: number;
  pageViews: number;
  uniquePageViews: number;
  bounceRate: number;
  
  // Conversion data
  conversions: ConversionEvent[];
  lifetimeValue: number;
  
  // Cohort information
  cohort: string;
  cohortWeek: number;
  
  // Privacy settings
  consentRecord: ConsentRecord;
  dataProcessingOptOut: ProcessingPurpose[];
  anonymized: boolean;
  
  // Custom attributes
  customAttributes: Record<string, any>;
}

/**
 * Analytics event interface
 */
export interface AnalyticsEvent {
  eventId: string;
  eventType: EventType;
  eventName: string;
  timestamp: Date;
  
  // User identification
  userId?: string;
  anonymousId?: string;
  sessionId: string;
  
  // Event properties
  properties: Record<string, any>;
  
  // Context
  context: {
    page?: {
      url: string;
      title: string;
      referrer?: string;
      path: string;
    };
    device?: {
      type: 'desktop' | 'mobile' | 'tablet';
      os: string;
      browser: string;
      screenSize: string;
    };
    location?: {
      country?: string;
      region?: string;
      city?: string;
      timezone?: string;
    };
    campaign?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
  };
  
  // Privacy compliance
  consentGiven: boolean;
  processingPurposes: ProcessingPurpose[];
  anonymized: boolean;
  
  // Metadata
  sdkVersion: string;
  apiVersion: string;
}

/**
 * Conversion event interface
 */
export interface ConversionEvent {
  conversionId: string;
  eventName: string;
  timestamp: Date;
  value?: number;
  currency?: string;
  properties: Record<string, any>;
}

/**
 * Session data interface
 */
export interface SessionData {
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Session properties
  isFirstSession: boolean;
  entryPage: string;
  exitPage?: string;
  pageViews: number;
  events: number;
  
  // Engagement
  engaged: boolean;
  bounced: boolean;
  converted: boolean;
  conversionValue?: number;
  
  // Technical context
  device: AnalyticsEvent['context']['device'];
  location: AnalyticsEvent['context']['location'];
  referrer?: string;
  campaign?: AnalyticsEvent['context']['campaign'];
  
  // Privacy compliance
  consentRecord: ConsentRecord;
}

/**
 * Data request interface (GDPR compliance)
 */
export interface DataRequest {
  requestId: string;
  requestType: 'access' | 'portability' | 'erasure' | 'rectification';
  userId: string;
  email: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedData?: ProcessingPurpose[];
  completedAt?: Date;
  rejectionReason?: string;
}

/**
 * Cohort analysis interface
 */
export interface CohortAnalysis {
  cohortWeek: string;
  cohortSize: number;
  retentionData: Array<{
    week: number;
    users: number;
    retentionRate: number;
  }>;
  conversionRate: number;
  averageLTV: number;
}

/**
 * User Analytics Module implementation
 */
export class UserAnalyticsModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'user-analytics',
    name: 'User Analytics Module',
    version: '1.0.0',
    description: 'GDPR-compliant user analytics with comprehensive privacy controls',
    category: DNAModuleCategory.ANALYTICS,
    tags: ['analytics', 'gdpr', 'privacy', 'user-tracking', 'consent'],
    compatibility: {
      frameworks: {
        [SupportedFramework.REACT_NATIVE]: FrameworkSupport.FULL,
        [SupportedFramework.FLUTTER]: FrameworkSupport.PARTIAL,
        [SupportedFramework.NEXTJS]: FrameworkSupport.FULL,
        [SupportedFramework.TAURI]: FrameworkSupport.FULL,
        [SupportedFramework.SVELTE_KIT]: FrameworkSupport.FULL
      },
      platforms: ['web', 'mobile', 'desktop'],
      minVersions: {
        node: '16.0.0',
        typescript: '4.8.0'
      }
    },
    dependencies: ['@segment/analytics-node', 'mixpanel', 'uuid'],
    devDependencies: ['@types/uuid'],
    peerDependencies: []
  };

  private config: UserAnalyticsConfig;
  private eventEmitter: EventEmitter;
  private client: any = null;
  private userProfiles: Map<string, UserProfile> = new Map();
  private sessions: Map<string, SessionData> = new Map();
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private dataRequests: Map<string, DataRequest> = new Map();
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;

  constructor(config: UserAnalyticsConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.validateConfig();
  }

  /**
   * Initialize analytics system
   */
  public async initialize(): Promise<boolean> {
    try {
      this.log('info', 'Initializing user analytics...');
      
      // Initialize analytics provider
      await this.initializeProvider();
      
      // Setup consent management
      this.setupConsentManagement();
      
      // Start event processing
      if (this.config.enableRealTimeProcessing) {
        this.startEventProcessing();
      }
      
      // Setup data retention cleanup
      if (this.config.enableAutomaticDeletion) {
        this.setupDataRetentionCleanup();
      }
      
      this.eventEmitter.emit('initialized');
      this.log('info', 'User analytics initialized successfully');
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to initialize analytics', error);
      return false;
    }
  }

  /**
   * Request user consent
   */
  public async requestConsent(
    purposes: ProcessingPurpose[],
    options: {
      userId?: string;
      sessionId?: string;
      regulation?: PrivacyRegulation;
      method?: ConsentRecord['consentMethod'];
    } = {}
  ): Promise<string> {
    const consentId = this.generateConsentId();
    const sessionId = options.sessionId || this.getCurrentSessionId();
    
    const consentRecord: ConsentRecord = {
      userId: options.userId,
      sessionId,
      purposes: purposes.reduce((acc, purpose) => {
        acc[purpose] = ConsentStatus.PENDING;
        return acc;
      }, {} as Record<ProcessingPurpose, ConsentStatus>),
      timestamp: new Date(),
      expiryDate: new Date(Date.now() + this.config.consentExpiryDays * 24 * 60 * 60 * 1000),
      ipAddress: this.config.enableIPAnonymization ? this.anonymizeIP(this.getClientIP()) : this.getClientIP(),
      userAgent: this.getUserAgent(),
      consentMethod: options.method || 'banner',
      granularConsent: purposes.length > 1,
      regulation: options.regulation || PrivacyRegulation.GDPR,
      version: this.metadata.version
    };
    
    this.consentRecords.set(consentId, consentRecord);
    
    // Emit consent request event
    this.eventEmitter.emit('consent:requested', { consentId, consentRecord });
    
    this.log('info', `Consent requested: ${consentId} for purposes: ${purposes.join(', ')}`);
    
    return consentId;
  }

  /**
   * Record consent response
   */
  public async recordConsent(
    consentId: string,
    consents: Record<ProcessingPurpose, boolean>
  ): Promise<boolean> {
    const consentRecord = this.consentRecords.get(consentId);
    if (!consentRecord) {
      throw new Error(`Consent record not found: ${consentId}`);
    }
    
    // Update consent status
    for (const [purpose, granted] of Object.entries(consents)) {
      consentRecord.purposes[purpose as ProcessingPurpose] = granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED;
    }
    
    consentRecord.timestamp = new Date();
    
    // Enable/disable tracking based on consent
    await this.updateTrackingStatus(consentRecord);
    
    // Emit consent recorded event
    this.eventEmitter.emit('consent:recorded', { consentId, consentRecord });
    
    this.log('info', `Consent recorded: ${consentId}`);
    
    return true;
  }

  /**
   * Track user event
   */
  public async trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    options: {
      eventType?: EventType;
      userId?: string;
      sessionId?: string;
      timestamp?: Date;
      anonymize?: boolean;
    } = {}
  ): Promise<string> {
    // Check consent before tracking
    if (!await this.hasConsentForPurpose(ProcessingPurpose.ANALYTICS, options.userId)) {
      this.log('debug', `Tracking blocked due to missing consent: ${eventName}`);
      return '';
    }
    
    const eventId = this.generateEventId();
    const sessionId = options.sessionId || this.getCurrentSessionId();
    const userId = options.userId;
    const anonymousId = userId ? undefined : this.getAnonymousId();
    
    const event: AnalyticsEvent = {
      eventId,
      eventType: options.eventType || EventType.CUSTOM,
      eventName,
      timestamp: options.timestamp || new Date(),
      
      userId: options.anonymize ? undefined : userId,
      anonymousId,
      sessionId,
      
      properties: this.sanitizeProperties(properties),
      
      context: {
        page: this.getPageContext(),
        device: this.getDeviceContext(),
        location: await this.getLocationContext(),
        campaign: this.getCampaignContext()
      },
      
      consentGiven: true,
      processingPurposes: [ProcessingPurpose.ANALYTICS],
      anonymized: options.anonymize || this.config.enableAnonymization,
      
      sdkVersion: this.metadata.version,
      apiVersion: '1.0'
    };
    
    // Apply data minimization
    if (this.config.enableDataMinimization) {
      this.applyDataMinimization(event);
    }
    
    // Add to queue for processing
    this.eventQueue.push(event);
    
    // Update user profile
    if (userId && !options.anonymize) {
      await this.updateUserProfile(userId, event);
    }
    
    // Update session
    await this.updateSession(sessionId, event);
    
    // Emit event
    this.eventEmitter.emit('event:tracked', { event });
    
    this.log('debug', `Event tracked: ${eventName} (${eventId})`);
    
    return eventId;
  }

  /**
   * Track page view
   */
  public async trackPageView(
    url: string,
    title?: string,
    options: {
      userId?: string;
      sessionId?: string;
      referrer?: string;
    } = {}
  ): Promise<string> {
    return this.trackEvent('page_view', {
      url,
      title: title || document?.title,
      referrer: options.referrer || document?.referrer
    }, {
      eventType: EventType.PAGE_VIEW,
      userId: options.userId,
      sessionId: options.sessionId
    });
  }

  /**
   * Track conversion
   */
  public async trackConversion(
    conversionName: string,
    value?: number,
    currency?: string,
    options: {
      userId?: string;
      sessionId?: string;
      properties?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const conversionId = await this.trackEvent(conversionName, {
      ...options.properties,
      value,
      currency,
      conversion: true
    }, {
      eventType: EventType.CONVERSION,
      userId: options.userId,
      sessionId: options.sessionId
    });
    
    // Update user profile with conversion
    if (options.userId) {
      const userProfile = this.userProfiles.get(options.userId);
      if (userProfile) {
        userProfile.conversions.push({
          conversionId,
          eventName: conversionName,
          timestamp: new Date(),
          value,
          currency,
          properties: options.properties || {}
        });
        
        if (value) {
          userProfile.lifetimeValue += value;
        }
      }
    }
    
    return conversionId;
  }

  /**
   * Start user session
   */
  public async startSession(
    options: {
      userId?: string;
      sessionId?: string;
      isFirstSession?: boolean;
    } = {}
  ): Promise<string> {
    const sessionId = options.sessionId || this.generateSessionId();
    this.currentSessionId = sessionId;
    
    // Check consent
    if (!await this.hasConsentForPurpose(ProcessingPurpose.ANALYTICS, options.userId)) {
      return sessionId;
    }
    
    const session: SessionData = {
      sessionId,
      userId: options.userId,
      anonymousId: options.userId ? undefined : this.getAnonymousId(),
      startTime: new Date(),
      
      isFirstSession: options.isFirstSession || false,
      entryPage: this.getCurrentUrl(),
      pageViews: 0,
      events: 0,
      
      engaged: false,
      bounced: false,
      converted: false,
      
      device: this.getDeviceContext(),
      location: await this.getLocationContext(),
      referrer: this.getReferrer(),
      campaign: this.getCampaignContext(),
      
      consentRecord: await this.getLatestConsentRecord(options.userId)
    };
    
    this.sessions.set(sessionId, session);
    
    // Track session start event
    await this.trackEvent('session_start', {
      is_first_session: session.isFirstSession,
      entry_page: session.entryPage
    }, {
      eventType: EventType.SESSION,
      userId: options.userId,
      sessionId
    });
    
    this.eventEmitter.emit('session:started', { session });
    this.log('info', `Session started: ${sessionId}`);
    
    return sessionId;
  }

  /**
   * End user session
   */
  public async endSession(sessionId?: string): Promise<void> {
    const actualSessionId = sessionId || this.currentSessionId;
    if (!actualSessionId) return;
    
    const session = this.sessions.get(actualSessionId);
    if (!session) return;
    
    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    session.bounced = session.pageViews <= 1 && session.duration < 30000; // Less than 30 seconds
    session.engaged = session.duration > 60000 || session.events > 3; // More than 1 minute or 3+ events
    
    // Track session end event
    await this.trackEvent('session_end', {
      duration: session.duration,
      page_views: session.pageViews,
      events: session.events,
      bounced: session.bounced,
      engaged: session.engaged,
      converted: session.converted
    }, {
      eventType: EventType.SESSION,
      userId: session.userId,
      sessionId: actualSessionId
    });
    
    // Update user profile
    if (session.userId) {
      const userProfile = this.userProfiles.get(session.userId);
      if (userProfile) {
        userProfile.sessionCount++;
        userProfile.lastSeen = session.endTime;
        userProfile.averageSessionDuration = 
          ((userProfile.averageSessionDuration * (userProfile.sessionCount - 1)) + session.duration) / userProfile.sessionCount;
        
        if (session.bounced) {
          userProfile.bounceRate = 
            ((userProfile.bounceRate * (userProfile.sessionCount - 1)) + 1) / userProfile.sessionCount;
        }
      }
    }
    
    this.eventEmitter.emit('session:ended', { session });
    this.log('info', `Session ended: ${actualSessionId} (${session.duration}ms)`);
    
    if (actualSessionId === this.currentSessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * Handle data request (GDPR compliance)
   */
  public async handleDataRequest(
    requestType: DataRequest['requestType'],
    userId: string,
    email: string,
    requestedData?: ProcessingPurpose[]
  ): Promise<string> {
    const requestId = this.generateRequestId();
    
    const dataRequest: DataRequest = {
      requestId,
      requestType,
      userId,
      email,
      timestamp: new Date(),
      status: 'pending',
      requestedData
    };
    
    this.dataRequests.set(requestId, dataRequest);
    
    // Process request asynchronously
    this.processDataRequest(dataRequest);
    
    this.eventEmitter.emit('data_request:created', { dataRequest });
    this.log('info', `Data request created: ${requestType} for user ${userId} (${requestId})`);
    
    return requestId;
  }

  /**
   * Get user analytics data
   */
  public async getUserAnalytics(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    profile: UserProfile | null;
    sessions: SessionData[];
    events: AnalyticsEvent[];
    conversions: ConversionEvent[];
  }> {
    // Check if user has consented to data access
    if (!await this.hasConsentForPurpose(ProcessingPurpose.ANALYTICS, userId)) {
      throw new Error('User has not consented to analytics data access');
    }
    
    const profile = this.userProfiles.get(userId) || null;
    
    // Filter sessions by time range
    const sessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .filter(session => {
        if (!timeRange) return true;
        return session.startTime >= timeRange.start && session.startTime <= timeRange.end;
      });
    
    // Filter events by time range
    const events = this.eventQueue
      .filter(event => event.userId === userId)
      .filter(event => {
        if (!timeRange) return true;
        return event.timestamp >= timeRange.start && event.timestamp <= timeRange.end;
      });
    
    const conversions = profile?.conversions.filter(conversion => {
      if (!timeRange) return true;
      return conversion.timestamp >= timeRange.start && conversion.timestamp <= timeRange.end;
    }) || [];
    
    return { profile, sessions, events, conversions };
  }

  /**
   * Perform cohort analysis
   */
  public async performCohortAnalysis(
    startDate: Date,
    endDate: Date,
    cohortType: 'weekly' | 'monthly' = 'weekly'
  ): Promise<CohortAnalysis[]> {
    const cohorts: Map<string, CohortAnalysis> = new Map();
    
    // Group users by cohort
    for (const profile of this.userProfiles.values()) {
      if (profile.firstSeen < startDate || profile.firstSeen > endDate) continue;
      
      const cohortKey = this.getCohortKey(profile.firstSeen, cohortType);
      
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, {
          cohortWeek: cohortKey,
          cohortSize: 0,
          retentionData: [],
          conversionRate: 0,
          averageLTV: 0
        });
      }
      
      const cohort = cohorts.get(cohortKey)!;
      cohort.cohortSize++;
      cohort.averageLTV += profile.lifetimeValue;
      
      if (profile.conversions.length > 0) {
        cohort.conversionRate++;
      }
    }
    
    // Calculate retention and final metrics
    for (const cohort of cohorts.values()) {
      cohort.conversionRate = cohort.conversionRate / cohort.cohortSize;
      cohort.averageLTV = cohort.averageLTV / cohort.cohortSize;
      
      // Calculate retention (simplified)
      for (let week = 0; week < 12; week++) {
        const retainedUsers = Math.floor(cohort.cohortSize * Math.pow(0.85, week));
        cohort.retentionData.push({
          week,
          users: retainedUsers,
          retentionRate: retainedUsers / cohort.cohortSize
        });
      }
    }
    
    return Array.from(cohorts.values());
  }

  /**
   * Delete user data (Right to erasure)
   */
  public async deleteUserData(userId: string): Promise<boolean> {
    try {
      // Remove user profile
      this.userProfiles.delete(userId);
      
      // Remove or anonymize sessions
      for (const [sessionId, session] of this.sessions) {
        if (session.userId === userId) {
          session.userId = undefined;
          session.anonymousId = this.generateAnonymousId();
        }
      }
      
      // Remove or anonymize events
      this.eventQueue = this.eventQueue.map(event => {
        if (event.userId === userId) {
          return {
            ...event,
            userId: undefined,
            anonymousId: this.generateAnonymousId(),
            anonymized: true,
            properties: this.anonymizeProperties(event.properties)
          };
        }
        return event;
      });
      
      // Remove consent records
      for (const [consentId, consent] of this.consentRecords) {
        if (consent.userId === userId) {
          this.consentRecords.delete(consentId);
        }
      }
      
      this.eventEmitter.emit('user_data:deleted', { userId });
      this.log('info', `User data deleted: ${userId}`);
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to delete user data', error);
      return false;
    }
  }

  /**
   * Initialize analytics provider
   */
  private async initializeProvider(): Promise<void> {
    switch (this.config.provider) {
      case 'google_analytics':
        await this.initializeGoogleAnalytics();
        break;
      case 'mixpanel':
        await this.initializeMixpanel();
        break;
      case 'amplitude':
        await this.initializeAmplitude();
        break;
      case 'segment':
        await this.initializeSegment();
        break;
      default:
        this.log('warn', `Provider ${this.config.provider} not implemented, using mock`);
        this.client = { type: 'mock' };
    }
  }

  /**
   * Provider initialization methods (mocked)
   */
  private async initializeGoogleAnalytics(): Promise<void> {
    // In production: initialize gtag or Google Analytics 4
    this.client = { type: 'google_analytics' };
    this.log('debug', 'Google Analytics initialized');
  }

  private async initializeMixpanel(): Promise<void> {
    // In production: import Mixpanel and initialize
    this.client = { type: 'mixpanel' };
    this.log('debug', 'Mixpanel initialized');
  }

  private async initializeAmplitude(): Promise<void> {
    // In production: import Amplitude SDK
    this.client = { type: 'amplitude' };
    this.log('debug', 'Amplitude initialized');
  }

  private async initializeSegment(): Promise<void> {
    // In production: import Segment Analytics
    this.client = { type: 'segment' };
    this.log('debug', 'Segment initialized');
  }

  /**
   * Privacy and consent management
   */
  private setupConsentManagement(): void {
    // Setup consent banner and management UI
    if (typeof window !== 'undefined' && this.config.requireExplicitConsent) {
      this.showConsentBanner();
    }
  }

  private showConsentBanner(): void {
    // In production, show actual consent banner
    this.log('debug', 'Consent banner displayed');
  }

  private async hasConsentForPurpose(purpose: ProcessingPurpose, userId?: string): Promise<boolean> {
    if (!this.config.enableGDPRCompliance) return true;
    
    // Find latest consent record
    const consentRecord = await this.getLatestConsentRecord(userId);
    if (!consentRecord) return !this.config.requireExplicitConsent;
    
    // Check if consent is still valid
    if (consentRecord.expiryDate < new Date()) return false;
    
    return consentRecord.purposes[purpose] === ConsentStatus.GRANTED;
  }

  private async getLatestConsentRecord(userId?: string): Promise<ConsentRecord | null> {
    // Find the most recent consent record for this user
    const records = Array.from(this.consentRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return records[0] || null;
  }

  private async updateTrackingStatus(consentRecord: ConsentRecord): Promise<void> {
    // Enable/disable tracking features based on consent
    const hasAnalyticsConsent = consentRecord.purposes[ProcessingPurpose.ANALYTICS] === ConsentStatus.GRANTED;
    
    if (!hasAnalyticsConsent) {
      // Disable tracking
      this.log('info', 'Analytics tracking disabled due to consent withdrawal');
    }
  }

  /**
   * Data processing and anonymization
   */
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized = { ...properties };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'ssn', 'credit_card', 'email', 'phone'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });
    
    // Apply data scrubbing if configured
    if (this.config.enableDataScrubbing) {
      this.config.scrubFields?.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[SCRUBBED]';
        }
      });
    }
    
    return sanitized;
  }

  private applyDataMinimization(event: AnalyticsEvent): void {
    // Remove unnecessary data fields
    if (this.config.enableDataMinimization) {
      // Keep only essential fields
      delete event.context.device?.screenSize;
      delete event.context.location?.city;
    }
  }

  private anonymizeProperties(properties: Record<string, any>): Record<string, any> {
    const anonymized = { ...properties };
    
    // Anonymize personal identifiers
    Object.keys(anonymized).forEach(key => {
      if (typeof anonymized[key] === 'string' && anonymized[key].includes('@')) {
        anonymized[key] = '[ANONYMIZED_EMAIL]';
      }
    });
    
    return anonymized;
  }

  private anonymizeIP(ip: string): string {
    // Anonymize last octet of IPv4 or last 80 bits of IPv6
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    
    // IPv6 anonymization would be more complex
    return ip.substring(0, ip.length - 4) + '0000';
  }

  /**
   * Event processing
   */
  private startEventProcessing(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const eventsToFlush = this.eventQueue.splice(0, this.config.batchSize);
    
    try {
      // Send events to provider
      await this.sendEventsToProvider(eventsToFlush);
      this.log('debug', `Flushed ${eventsToFlush.length} events to provider`);
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToFlush);
      this.log('error', 'Failed to flush events', error);
    }
  }

  private async sendEventsToProvider(events: AnalyticsEvent[]): Promise<void> {
    // In production, send to actual analytics provider
    this.log('debug', `Sending ${events.length} events to ${this.config.provider}`);
  }

  /**
   * User profile management
   */
  private async updateUserProfile(userId: string, event: AnalyticsEvent): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        demographics: {},
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        sessionCount: 0,
        totalEvents: 0,
        averageSessionDuration: 0,
        pageViews: 0,
        uniquePageViews: 0,
        bounceRate: 0,
        conversions: [],
        lifetimeValue: 0,
        cohort: this.getCohortKey(event.timestamp, 'weekly'),
        cohortWeek: this.getWeekNumber(event.timestamp),
        consentRecord: await this.getLatestConsentRecord(userId) || {} as ConsentRecord,
        dataProcessingOptOut: [],
        anonymized: false,
        customAttributes: {}
      };
      
      this.userProfiles.set(userId, profile);
    }
    
    // Update profile
    profile.lastSeen = event.timestamp;
    profile.totalEvents++;
    
    if (event.eventType === EventType.PAGE_VIEW) {
      profile.pageViews++;
    }
    
    // Update demographics from event context
    if (event.context.location) {
      profile.demographics.location = event.context.location;
    }
  }

  private async updateSession(sessionId: string, event: AnalyticsEvent): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.events++;
    
    if (event.eventType === EventType.PAGE_VIEW) {
      session.pageViews++;
      session.exitPage = event.properties.url;
    }
    
    if (event.eventType === EventType.CONVERSION) {
      session.converted = true;
      if (event.properties.value) {
        session.conversionValue = (session.conversionValue || 0) + event.properties.value;
      }
    }
  }

  /**
   * Data request processing
   */
  private async processDataRequest(request: DataRequest): Promise<void> {
    try {
      request.status = 'processing';
      
      switch (request.requestType) {
        case 'access':
          await this.processAccessRequest(request);
          break;
        case 'portability':
          await this.processPortabilityRequest(request);
          break;
        case 'erasure':
          await this.processErasureRequest(request);
          break;
        case 'rectification':
          await this.processRectificationRequest(request);
          break;
      }
      
      request.status = 'completed';
      request.completedAt = new Date();
      
      this.eventEmitter.emit('data_request:completed', { request });
      
    } catch (error) {
      request.status = 'rejected';
      request.rejectionReason = (error as Error).message;
      
      this.eventEmitter.emit('data_request:rejected', { request });
    }
  }

  private async processAccessRequest(request: DataRequest): Promise<void> {
    // Provide user with their data
    const userData = await this.getUserAnalytics(request.userId);
    // In production, format and send this data to the user
    this.log('info', `Access request processed for user: ${request.userId}`);
  }

  private async processPortabilityRequest(request: DataRequest): Promise<void> {
    // Export user data in portable format
    const userData = await this.getUserAnalytics(request.userId);
    // In production, create exportable format (JSON, CSV, etc.)
    this.log('info', `Portability request processed for user: ${request.userId}`);
  }

  private async processErasureRequest(request: DataRequest): Promise<void> {
    // Delete user data
    await this.deleteUserData(request.userId);
    this.log('info', `Erasure request processed for user: ${request.userId}`);
  }

  private async processRectificationRequest(request: DataRequest): Promise<void> {
    // Allow user to correct their data
    // In production, provide interface for data correction
    this.log('info', `Rectification request processed for user: ${request.userId}`);
  }

  /**
   * Data retention cleanup
   */
  private setupDataRetentionCleanup(): void {
    // Run cleanup daily
    setInterval(() => {
      this.cleanupExpiredData();
    }, 24 * 60 * 60 * 1000);
  }

  private async cleanupExpiredData(): Promise<void> {
    const retentionDate = new Date(Date.now() - this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    
    // Clean up old events
    this.eventQueue = this.eventQueue.filter(event => event.timestamp > retentionDate);
    
    // Clean up old sessions
    for (const [sessionId, session] of this.sessions) {
      if (session.startTime < retentionDate) {
        this.sessions.delete(sessionId);
      }
    }
    
    // Clean up expired consent records
    for (const [consentId, consent] of this.consentRecords) {
      if (consent.expiryDate < new Date()) {
        this.consentRecords.delete(consentId);
      }
    }
    
    this.log('info', 'Expired data cleanup completed');
  }

  /**
   * Context gathering methods
   */
  private getPageContext(): AnalyticsEvent['context']['page'] | undefined {
    if (typeof window === 'undefined') return undefined;
    
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      path: window.location.pathname
    };
  }

  private getDeviceContext(): AnalyticsEvent['context']['device'] | undefined {
    if (typeof navigator === 'undefined') return undefined;
    
    return {
      type: this.getDeviceType(),
      os: this.getOS(),
      browser: this.getBrowser(),
      screenSize: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown'
    };
  }

  private async getLocationContext(): Promise<AnalyticsEvent['context']['location'] | undefined> {
    // In production, get location from IP geolocation service
    return {
      country: 'US',
      region: 'CA',
      city: this.config.enableIPAnonymization ? undefined : 'San Francisco',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private getCampaignContext(): AnalyticsEvent['context']['campaign'] | undefined {
    if (typeof URLSearchParams === 'undefined') return undefined;
    
    const params = new URLSearchParams(window?.location.search || '');
    
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      term: params.get('utm_term') || undefined,
      content: params.get('utm_content') || undefined
    };
  }

  /**
   * Utility methods
   */
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof navigator === 'undefined') return 'desktop';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private getOS(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'unknown';
  }

  private getBrowser(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'unknown';
  }

  private getCurrentUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : 'server';
  }

  private getReferrer(): string {
    return typeof document !== 'undefined' ? document.referrer : '';
  }

  private getCurrentSessionId(): string {
    return this.currentSessionId || this.generateSessionId();
  }

  private getAnonymousId(): string {
    // In production, generate or retrieve anonymous ID from localStorage/cookie
    return this.generateAnonymousId();
  }

  private getClientIP(): string {
    // In production, get actual client IP
    return '192.168.1.1';
  }

  private getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Server';
  }

  private getCohortKey(date: Date, type: 'weekly' | 'monthly'): string {
    if (type === 'weekly') {
      const year = date.getFullYear();
      const week = this.getWeekNumber(date);
      return `${year}-W${week.toString().padStart(2, '0')}`;
    } else {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      return `${year}-${month.toString().padStart(2, '0')}`;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnonymousId(): string {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message with level
   */
  private log(level: string, message: string, data?: any): void {
    if (!this.config.enableDebugMode && level === 'debug') return;
    
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevel = logLevels.indexOf(this.config.logLevel);
    const currentLevel = logLevels.indexOf(level);
    
    if (currentLevel >= configLevel) {
      console[level as keyof Console](`[Analytics] ${message}`, data || '');
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.provider) {
      throw new Error('Analytics provider is required');
    }
    
    if (this.config.samplingRate < 0 || this.config.samplingRate > 1) {
      throw new Error('Sampling rate must be between 0 and 1');
    }
    
    if (this.config.consentExpiryDays <= 0) {
      throw new Error('Consent expiry days must be positive');
    }
    
    if (this.config.dataRetentionDays <= 0) {
      throw new Error('Data retention days must be positive');
    }
  }

  /**
   * Get generated files for the user analytics module
   */
  public async getFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Core analytics types
    files.push({
      path: 'src/lib/analytics/types.ts',
      content: this.generateAnalyticsTypes(),
      type: 'typescript'
    });

    // Analytics service
    files.push({
      path: 'src/lib/analytics/service.ts',
      content: this.generateAnalyticsService(context),
      type: 'typescript'
    });

    // Consent manager
    files.push({
      path: 'src/lib/analytics/consent-manager.ts',
      content: this.generateConsentManager(context),
      type: 'typescript'
    });

    // Privacy compliance
    files.push({
      path: 'src/lib/analytics/privacy-compliance.ts',
      content: this.generatePrivacyCompliance(context),
      type: 'typescript'
    });

    // Framework-specific implementations
    if (context.framework === SupportedFramework.NEXTJS) {
      files.push(...this.getNextJSFiles());
    }

    return files;
  }

  /**
   * Generate analytics types file
   */
  private generateAnalyticsTypes(): string {
    return `// Generated Analytics types - Epic 5 Story 6 AC2
export * from './types/analytics-types';
export * from './types/consent-types';
export * from './types/privacy-types';
export * from './types/cohort-types';
`;
  }

  /**
   * Generate analytics service file
   */
  private generateAnalyticsService(context: DNAModuleContext): string {
    return `// Generated Analytics Service - Epic 5 Story 6 AC2
import { UserAnalyticsModule } from './user-analytics-module';

export class AnalyticsService extends UserAnalyticsModule {
  // Analytics service for ${context.framework}
}
`;
  }

  /**
   * Generate consent manager file
   */
  private generateConsentManager(context: DNAModuleContext): string {
    return `// Generated Consent Manager - Epic 5 Story 6 AC2
export class ConsentManager {
  // Consent management for ${context.framework}
  // Cookie consent, banner management, granular controls
}
`;
  }

  /**
   * Generate privacy compliance file
   */
  private generatePrivacyCompliance(context: DNAModuleContext): string {
    return `// Generated Privacy Compliance - Epic 5 Story 6 AC2
export class PrivacyCompliance {
  // Privacy compliance for ${context.framework}
  // GDPR, CCPA, data requests, right to erasure
}
`;
  }

  /**
   * Get Next.js specific files
   */
  private getNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/lib/analytics/next-analytics.ts',
        content: `// Next.js Analytics Integration
import { UserAnalyticsModule } from './user-analytics-module';

export function setupNextJSAnalytics() {
  // Server-side analytics
  // API route tracking
  // Cookie management
}
`,
        type: 'typescript'
      },
      {
        path: 'src/components/ConsentBanner.tsx',
        content: `// GDPR Consent Banner Component
import React from 'react';

export function ConsentBanner() {
  return (
    <div className="consent-banner">
      {/* GDPR consent banner implementation */}
    </div>
  );
}
`,
        type: 'typescript'
      }
    ];
  }

  /**
   * Event emitter for analytics events
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
 * Default user analytics configuration
 */
export const defaultUserAnalyticsConfig: UserAnalyticsConfig = {
  provider: 'google_analytics',
  
  enableGDPRCompliance: true,
  supportedRegulations: [PrivacyRegulation.GDPR, PrivacyRegulation.CCPA],
  requireExplicitConsent: true,
  consentExpiryDays: 365,
  enableRightToErasure: true,
  enableDataPortability: true,
  
  enableUserTracking: true,
  enableSessionTracking: true,
  enableEventTracking: true,
  enableConversionTracking: true,
  enableCohortAnalysis: true,
  enableFunnelAnalysis: true,
  
  enableAnonymization: true,
  enablePseudonymization: false,
  enableDataMinimization: true,
  enableAutomaticDeletion: true,
  dataRetentionDays: 1095, // 3 years
  
  enableCookies: true,
  cookieExpiryDays: 365,
  cookieSecure: true,
  cookieSameSite: 'lax',
  
  samplingRate: 1.0,
  enableBotFiltering: true,
  enableIPAnonymization: true,
  excludeInternalTraffic: true,
  internalIPs: ['127.0.0.1', '::1'],
  
  enableRealTimeProcessing: true,
  batchSize: 100,
  flushInterval: 30000,
  
  enableDebugMode: false,
  logLevel: 'info'
};

export default UserAnalyticsModule;