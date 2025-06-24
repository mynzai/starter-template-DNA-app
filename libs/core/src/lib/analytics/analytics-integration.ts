import { EventEmitter } from 'events';
import { UsageAnalytics, AnalyticsConfig, PrivacySettings } from './usage-analytics';
import { TemplateGenerationPipeline } from '../template-generation-pipeline';
import { DNARegistry } from '../dna-registry';
import { TemplateInstantiationEngine } from '../template-instantiation-engine';
import { TemplateDefinition } from '../types/template.types';
import { DNAModule } from '../types/dna-module.types';

export interface AnalyticsIntegrationConfig extends AnalyticsConfig {
  autoTrackPipeline: boolean;
  autoTrackModules: boolean;
  autoTrackErrors: boolean;
  sessionTimeout: number;
}

export interface AnalyticsSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  events: number;
  errors: number;
  templatesGenerated: number;
}

export class AnalyticsIntegration extends EventEmitter {
  private analytics: UsageAnalytics;
  private config: AnalyticsIntegrationConfig;
  private sessions: Map<string, AnalyticsSession> = new Map();
  private currentSession: AnalyticsSession | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<AnalyticsIntegrationConfig> = {}) {
    super();
    
    this.config = {
      autoTrackPipeline: true,
      autoTrackModules: true,
      autoTrackErrors: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      ...config
    };
    
    this.analytics = new UsageAnalytics(config);
  }

  /**
   * Initialize analytics with privacy settings
   */
  async initialize(privacySettings: PrivacySettings): Promise<void> {
    await this.analytics.enableAnalytics(privacySettings);
    this.startNewSession();
    
    this.emit('analytics:initialized', {
      timestamp: new Date(),
      privacyLevel: privacySettings.dataSharingLevel
    });
  }

  /**
   * Integrate with template generation pipeline
   */
  integratePipeline(pipeline: TemplateGenerationPipeline): void {
    if (!this.config.autoTrackPipeline) return;
    
    // Track pipeline start
    pipeline.on('pipeline:started', ({ request }) => {
      this.analytics.trackFeatureUsage('pipeline_generation', {
        templateId: request.templateId,
        framework: request.framework,
        moduleCount: request.selectedModules?.length || 0
      });
    });
    
    // Track stage progress
    pipeline.on('stage:completed', ({ stage, duration }) => {
      this.analytics.trackFeatureUsage('pipeline_stage', {
        stage: stage.name,
        duration,
        success: true
      });
    });
    
    // Track pipeline completion
    pipeline.on('pipeline:completed', ({ result, metrics }) => {
      if (result.template && result.modules) {
        this.analytics.trackTemplateGeneration(
          result.template,
          result.modules,
          metrics.totalDuration,
          true
        );
      }
      
      if (this.currentSession) {
        this.currentSession.templatesGenerated++;
      }
    });
    
    // Track pipeline errors
    pipeline.on('pipeline:error', ({ error, stage }) => {
      this.analytics.trackError(error, {
        stage: stage?.name,
        context: 'pipeline_generation'
      });
      
      if (this.currentSession) {
        this.currentSession.errors++;
      }
    });
  }

  /**
   * Integrate with DNA registry
   */
  integrateRegistry(registry: DNARegistry): void {
    if (!this.config.autoTrackModules) return;
    
    // Track module registration
    registry.on('module:registered', ({ moduleId }) => {
      this.analytics.trackModuleUsage(moduleId, 'registration');
    });
    
    // Track module discovery
    registry.on('modules:discovered', ({ modules }) => {
      modules.forEach(module => {
        this.analytics.trackModuleUsage(module.id, 'discovery');
      });
    });
    
    // Track module updates
    registry.on('module:updated', ({ moduleId }) => {
      this.analytics.trackModuleUsage(moduleId, 'update');
    });
  }

  /**
   * Integrate with template instantiation engine
   */
  integrateEngine(engine: TemplateInstantiationEngine): void {
    // Track file operations
    engine.on('file:processed', ({ file, operation }) => {
      this.analytics.trackFeatureUsage('file_operation', {
        operation,
        fileType: file.split('.').pop()
      });
    });
    
    // Track template instantiation
    engine.on('instantiation:completed', ({ targetPath, fileCount }) => {
      this.analytics.trackFeatureUsage('template_instantiation', {
        targetPath: this.analytics['anonymizeString'](targetPath),
        fileCount
      });
    });
    
    // Track errors
    if (this.config.autoTrackErrors) {
      engine.on('instantiation:error', ({ error, context }) => {
        this.analytics.trackError(error, context);
      });
    }
  }

  /**
   * Track custom events
   */
  trackEvent(eventName: string, data?: Record<string, any>): void {
    this.analytics.trackFeatureUsage(eventName, data);
    
    if (this.currentSession) {
      this.currentSession.events++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return this.analytics.getMetrics();
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(): {
    current: AnalyticsSession | null;
    history: AnalyticsSession[];
    summary: {
      totalSessions: number;
      averageDuration: number;
      totalTemplates: number;
      errorRate: number;
    };
  } {
    const history = Array.from(this.sessions.values());
    const totalDuration = history.reduce((sum, session) => {
      const duration = session.endTime 
        ? session.endTime.getTime() - session.startTime.getTime()
        : 0;
      return sum + duration;
    }, 0);
    
    const totalEvents = history.reduce((sum, session) => sum + session.events, 0);
    const totalErrors = history.reduce((sum, session) => sum + session.errors, 0);
    const totalTemplates = history.reduce((sum, session) => sum + session.templatesGenerated, 0);
    
    return {
      current: this.currentSession,
      history,
      summary: {
        totalSessions: history.length,
        averageDuration: history.length > 0 ? totalDuration / history.length : 0,
        totalTemplates,
        errorRate: totalEvents > 0 ? totalErrors / totalEvents : 0
      }
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format: 'json' | 'csv' = 'json'): Promise<string> {
    const baseExport = await this.analytics.exportAnalytics(format);
    const sessionData = this.getSessionAnalytics();
    
    if (format === 'json') {
      const data = JSON.parse(baseExport);
      data.sessions = sessionData;
      return JSON.stringify(data, null, 2);
    }
    
    return baseExport;
  }

  /**
   * Start a new session
   */
  private startNewSession(): void {
    if (this.currentSession) {
      this.endCurrentSession();
    }
    
    this.currentSession = {
      id: `session-${Date.now()}`,
      startTime: new Date(),
      events: 0,
      errors: 0,
      templatesGenerated: 0
    };
    
    this.resetSessionTimer();
    
    this.emit('session:started', {
      sessionId: this.currentSession.id
    });
  }

  /**
   * End current session
   */
  private endCurrentSession(): void {
    if (!this.currentSession) return;
    
    this.currentSession.endTime = new Date();
    this.sessions.set(this.currentSession.id, this.currentSession);
    
    this.emit('session:ended', {
      sessionId: this.currentSession.id,
      duration: this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime(),
      events: this.currentSession.events,
      errors: this.currentSession.errors
    });
    
    this.currentSession = null;
  }

  /**
   * Reset session timer
   */
  private resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.sessionTimer = setTimeout(() => {
      this.endCurrentSession();
    }, this.config.sessionTimeout);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.endCurrentSession();
    this.analytics.disableAnalytics();
  }
}