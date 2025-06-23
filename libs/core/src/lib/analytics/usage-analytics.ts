import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { DNAModule } from '../types/dna-module.types';
import { TemplateDefinition } from '../types/template.types';

export interface AnalyticsEvent {
  eventType: string;
  timestamp: Date;
  sessionId: string;
  templateId?: string;
  moduleId?: string;
  frameworkType?: string;
  metadata?: Record<string, any>;
  anonymousUserId?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  anonymizeData: boolean;
  excludeFields?: string[];
  consentRequired: boolean;
  dataRetentionDays: number;
  allowedEventTypes?: string[];
  telemetryEndpoint?: string;
}

export interface UsageMetrics {
  templateUsage: Map<string, number>;
  moduleUsage: Map<string, number>;
  frameworkDistribution: Map<string, number>;
  generationTimes: number[];
  errorRates: Map<string, number>;
  userSessions: number;
  averageSessionDuration: number;
}

export interface PrivacySettings {
  consentGiven: boolean;
  consentTimestamp?: Date;
  dataSharingLevel: 'none' | 'anonymous' | 'full';
  excludedDataTypes: string[];
}

export class UsageAnalytics extends EventEmitter {
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private metrics: UsageMetrics;
  private sessionId: string;
  private privacySettings: PrivacySettings;
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    super();
    
    this.config = {
      enabled: false, // Opt-in by default
      anonymizeData: true,
      consentRequired: true,
      dataRetentionDays: 30,
      excludeFields: ['apiKeys', 'secrets', 'passwords', 'tokens'],
      ...config
    };

    this.metrics = {
      templateUsage: new Map(),
      moduleUsage: new Map(),
      frameworkDistribution: new Map(),
      generationTimes: [],
      errorRates: new Map(),
      userSessions: 0,
      averageSessionDuration: 0
    };

    this.sessionId = this.generateSessionId();
    this.privacySettings = {
      consentGiven: false,
      dataSharingLevel: 'none',
      excludedDataTypes: []
    };

    if (this.config.enabled && this.config.telemetryEndpoint) {
      this.startFlushInterval();
    }
  }

  /**
   * Enable analytics with user consent
   */
  async enableAnalytics(privacySettings: PrivacySettings): Promise<void> {
    if (!privacySettings.consentGiven && this.config.consentRequired) {
      throw new Error('User consent required to enable analytics');
    }

    this.privacySettings = privacySettings;
    this.config.enabled = true;
    
    this.emit('analytics:enabled', {
      timestamp: new Date(),
      privacyLevel: privacySettings.dataSharingLevel
    });

    if (this.config.telemetryEndpoint) {
      this.startFlushInterval();
    }
  }

  /**
   * Disable analytics and clear data
   */
  disableAnalytics(): void {
    this.config.enabled = false;
    this.clearAnalyticsData();
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.emit('analytics:disabled', {
      timestamp: new Date()
    });
  }

  /**
   * Track a template generation event
   */
  trackTemplateGeneration(
    template: TemplateDefinition,
    modules: DNAModule[],
    duration: number,
    success: boolean
  ): void {
    if (!this.isTrackingAllowed('templateGeneration')) return;

    const event: AnalyticsEvent = {
      eventType: 'template_generation',
      timestamp: new Date(),
      sessionId: this.sessionId,
      templateId: template.id,
      frameworkType: template.framework,
      metadata: {
        moduleCount: modules.length,
        moduleIds: this.anonymizeModuleIds(modules.map(m => m.id)),
        duration,
        success,
        templateVersion: template.version
      }
    };

    this.recordEvent(event);
    this.updateMetrics(event);
  }

  /**
   * Track module usage
   */
  trackModuleUsage(moduleId: string, context: string): void {
    if (!this.isTrackingAllowed('moduleUsage')) return;

    const event: AnalyticsEvent = {
      eventType: 'module_usage',
      timestamp: new Date(),
      sessionId: this.sessionId,
      moduleId: this.anonymizeString(moduleId),
      metadata: {
        context,
        timestamp: new Date().toISOString()
      }
    };

    this.recordEvent(event);
  }

  /**
   * Track errors for improvement insights
   */
  trackError(error: Error, context: Record<string, any>): void {
    if (!this.isTrackingAllowed('errorTracking')) return;

    const sanitizedContext = this.sanitizeData(context);
    
    const event: AnalyticsEvent = {
      eventType: 'error',
      timestamp: new Date(),
      sessionId: this.sessionId,
      metadata: {
        errorType: error.name,
        errorMessage: this.anonymizeString(error.message),
        stack: this.config.anonymizeData ? undefined : error.stack,
        context: sanitizedContext
      }
    };

    this.recordEvent(event);
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, metadata?: Record<string, any>): void {
    if (!this.isTrackingAllowed('featureUsage')) return;

    const event: AnalyticsEvent = {
      eventType: 'feature_usage',
      timestamp: new Date(),
      sessionId: this.sessionId,
      metadata: {
        feature: featureName,
        ...this.sanitizeData(metadata || {})
      }
    };

    this.recordEvent(event);
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): UsageMetrics {
    if (!this.config.enabled) {
      return this.getEmptyMetrics();
    }

    return {
      ...this.metrics,
      templateUsage: new Map(this.metrics.templateUsage),
      moduleUsage: new Map(this.metrics.moduleUsage),
      frameworkDistribution: new Map(this.metrics.frameworkDistribution),
      generationTimes: [...this.metrics.generationTimes],
      errorRates: new Map(this.metrics.errorRates)
    };
  }

  /**
   * Export analytics data (privacy-compliant)
   */
  async exportAnalytics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const exportData = {
      sessionId: this.anonymizeString(this.sessionId),
      exportDate: new Date().toISOString(),
      metrics: this.getMetrics(),
      events: this.events.map(e => this.sanitizeEvent(e)),
      privacyLevel: this.privacySettings.dataSharingLevel
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      return this.convertToCSV(exportData);
    }
  }

  /**
   * Clear all analytics data
   */
  clearAnalyticsData(): void {
    this.events = [];
    this.eventBuffer = [];
    this.metrics = {
      templateUsage: new Map(),
      moduleUsage: new Map(),
      frameworkDistribution: new Map(),
      generationTimes: [],
      errorRates: new Map(),
      userSessions: 0,
      averageSessionDuration: 0
    };
  }

  /**
   * Check if tracking is allowed for event type
   */
  private isTrackingAllowed(eventType: string): boolean {
    if (!this.config.enabled) return false;
    if (!this.privacySettings.consentGiven && this.config.consentRequired) return false;
    if (this.privacySettings.excludedDataTypes.includes(eventType)) return false;
    if (this.config.allowedEventTypes && !this.config.allowedEventTypes.includes(eventType)) return false;
    
    return true;
  }

  /**
   * Record an event
   */
  private recordEvent(event: AnalyticsEvent): void {
    const sanitizedEvent = this.sanitizeEvent(event);
    
    this.events.push(sanitizedEvent);
    this.eventBuffer.push(sanitizedEvent);
    
    // Apply data retention
    this.applyDataRetention();
    
    this.emit('event:recorded', sanitizedEvent);
  }

  /**
   * Update metrics based on event
   */
  private updateMetrics(event: AnalyticsEvent): void {
    switch (event.eventType) {
      case 'template_generation':
        if (event.templateId) {
          const count = this.metrics.templateUsage.get(event.templateId) || 0;
          this.metrics.templateUsage.set(event.templateId, count + 1);
        }
        if (event.frameworkType) {
          const count = this.metrics.frameworkDistribution.get(event.frameworkType) || 0;
          this.metrics.frameworkDistribution.set(event.frameworkType, count + 1);
        }
        if (event.metadata?.duration) {
          this.metrics.generationTimes.push(event.metadata.duration);
        }
        break;
        
      case 'module_usage':
        if (event.moduleId) {
          const count = this.metrics.moduleUsage.get(event.moduleId) || 0;
          this.metrics.moduleUsage.set(event.moduleId, count + 1);
        }
        break;
        
      case 'error':
        const errorType = event.metadata?.errorType || 'unknown';
        const count = this.metrics.errorRates.get(errorType) || 0;
        this.metrics.errorRates.set(errorType, count + 1);
        break;
    }
  }

  /**
   * Sanitize event data
   */
  private sanitizeEvent(event: AnalyticsEvent): AnalyticsEvent {
    const sanitized = { ...event };
    
    if (this.config.anonymizeData) {
      sanitized.anonymousUserId = this.generateAnonymousId();
      delete sanitized.sessionId;
    }
    
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeData(sanitized.metadata);
    }
    
    return sanitized;
  }

  /**
   * Sanitize data object
   */
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.config.excludeFields?.some(field => key.toLowerCase().includes(field))) {
        continue;
      }
      
      if (typeof value === 'string' && this.config.anonymizeData) {
        sanitized[key] = this.anonymizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Anonymize string data
   */
  private anonymizeString(str: string): string {
    if (!this.config.anonymizeData) return str;
    
    // Keep structure but hash content
    const parts = str.split(/[\/\-_\.]/);
    return parts.map(part => {
      if (part.length > 3) {
        return createHash('sha256').update(part).digest('hex').substring(0, 8);
      }
      return part;
    }).join('-');
  }

  /**
   * Anonymize module IDs
   */
  private anonymizeModuleIds(moduleIds: string[]): string[] {
    if (!this.config.anonymizeData) return moduleIds;
    return moduleIds.map(id => this.anonymizeString(id));
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate anonymous user ID
   */
  private generateAnonymousId(): string {
    const data = `${this.sessionId}-${new Date().toISOString()}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Apply data retention policy
   */
  private applyDataRetention(): void {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.dataRetentionDays);
    
    this.events = this.events.filter(event => 
      event.timestamp > retentionDate
    );
  }

  /**
   * Start flush interval for telemetry
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 60000); // Flush every minute
  }

  /**
   * Flush events to telemetry endpoint
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0 || !this.config.telemetryEndpoint) return;
    
    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      // In production, this would send to telemetry endpoint
      // For now, we just emit an event
      this.emit('events:flushed', {
        count: eventsToFlush.length,
        timestamp: new Date()
      });
    } catch (error) {
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...eventsToFlush);
      this.emit('flush:error', error);
    }
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): UsageMetrics {
    return {
      templateUsage: new Map(),
      moduleUsage: new Map(),
      frameworkDistribution: new Map(),
      generationTimes: [],
      errorRates: new Map(),
      userSessions: 0,
      averageSessionDuration: 0
    };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion for metrics
    const lines: string[] = ['Metric,Value'];
    
    lines.push(`Total Templates,${data.metrics.templateUsage.size}`);
    lines.push(`Total Modules,${data.metrics.moduleUsage.size}`);
    lines.push(`User Sessions,${data.metrics.userSessions}`);
    lines.push(`Average Session Duration,${data.metrics.averageSessionDuration}`);
    
    return lines.join('\n');
  }
}