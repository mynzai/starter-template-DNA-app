/**
 * @fileoverview Alert Manager
 * Manages performance alerts, notifications, and escalations
 */

import { EventEmitter } from 'events';
import {
  PerformanceAlert,
  AlertType,
  AlertSource,
  AlertMetrics,
  AlertContext,
  AlertAction,
  AlertResolution,
  AlertingConfig,
  NotificationChannel,
  AlertRule,
  EscalationPolicy,
  SuppressionRule
} from './types';

export class AlertManager extends EventEmitter {
  private initialized = false;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private activeSuppressions: Map<string, ActiveSuppression> = new Map();
  private notificationChannels: Map<string, NotificationHandler> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  
  private config: AlertingConfig;

  constructor(config: AlertingConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize notification channels
    await this.initializeNotificationChannels();
    
    // Load alert rules
    this.loadAlertRules();
    
    // Start periodic cleanup
    this.startPeriodicCleanup();

    this.initialized = true;
    this.emit('alert-manager:initialized');
  }

  async createAlert(alertData: Partial<PerformanceAlert>): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      type: alertData.type || 'performance_degradation',
      severity: alertData.severity || 'warning',
      title: alertData.title || 'Performance Alert',
      message: alertData.message || 'Performance issue detected',
      timestamp: Date.now(),
      source: alertData.source || {
        service: 'unknown',
        component: 'unknown',
        environment: 'unknown'
      },
      metrics: alertData.metrics || {
        current: {},
        threshold: {},
        baseline: {}
      },
      context: alertData.context || {
        tags: {}
      },
      actions: alertData.actions || this.getDefaultActions(alertData.type || 'performance_degradation'),
      status: 'active'
    };

    // Check if this alert should be suppressed
    if (await this.shouldSuppressAlert(alert)) {
      this.emit('alert:suppressed', { alertId, alert });
      return alertId;
    }

    // Store the alert
    this.alerts.set(alertId, alert);

    // Send notifications
    await this.sendNotifications(alert);

    // Set up escalation if configured
    this.setupEscalation(alert);

    // Execute automatic actions
    await this.executeAutomaticActions(alert);

    this.emit('alert:created', alert);
    
    return alertId;
  }

  async acknowledgeAlert(alertId: string, userId?: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'acknowledged';
    
    // Clear escalation timer
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    // Add acknowledgment context
    alert.context = {
      ...alert.context,
      acknowledgedBy: userId,
      acknowledgedAt: Date.now()
    };

    await this.sendAcknowledgmentNotifications(alert, userId);
    
    this.emit('alert:acknowledged', { alertId, userId, alert });
  }

  async resolveAlert(alertId: string, resolution: string, userId?: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'resolved';
    alert.resolution = {
      timestamp: Date.now(),
      action: resolution,
      result: 'fixed',
      details: resolution
    };

    // Clear escalation timer
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    // Add resolution context
    alert.context = {
      ...alert.context,
      resolvedBy: userId,
      resolvedAt: Date.now(),
      resolutionDetails: resolution
    };

    await this.sendResolutionNotifications(alert, userId);
    
    this.emit('alert:resolved', { alertId, resolution, userId, alert });
  }

  async suppressAlert(alertId: string, duration: number, reason: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'suppressed';
    
    const suppression: ActiveSuppression = {
      alertId,
      startTime: Date.now(),
      endTime: Date.now() + duration,
      reason,
      pattern: this.createSuppressionPattern(alert)
    };

    this.activeSuppressions.set(alertId, suppression);

    // Set timer to remove suppression
    setTimeout(() => {
      this.activeSuppressions.delete(alertId);
      if (alert.status === 'suppressed') {
        alert.status = 'active';
      }
    }, duration);

    this.emit('alert:suppressed', { alertId, duration, reason, alert });
  }

  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  async getAlertsHistory(timeRange: { start: number; end: number }): Promise<PerformanceAlert[]> {
    return Array.from(this.alerts.values()).filter(alert =>
      alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end
    );
  }

  async getAlertById(alertId: string): Promise<PerformanceAlert | undefined> {
    return this.alerts.get(alertId);
  }

  async updateConfig(newConfig: AlertingConfig): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize notification channels if needed
    if (newConfig.channels) {
      await this.initializeNotificationChannels();
    }

    this.emit('alert-manager:config:updated', { config: this.config });
  }

  async addNotificationChannel(type: string, config: any): Promise<void> {
    const handler = this.createNotificationHandler(type, config);
    this.notificationChannels.set(type, handler);
    
    this.emit('notification:channel:added', { type, config });
  }

  async testNotificationChannel(type: string): Promise<boolean> {
    const handler = this.notificationChannels.get(type);
    if (!handler) {
      throw new Error(`Notification channel not found: ${type}`);
    }

    try {
      await handler.test();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('notification:test:failed', { type, error: errorMessage });
      return false;
    }
  }

  private async initializeNotificationChannels(): Promise<void> {
    for (const channel of this.config.channels) {
      if (channel.enabled) {
        const handler = this.createNotificationHandler(channel.type, channel.config);
        this.notificationChannels.set(channel.type, handler);
      }
    }
  }

  private createNotificationHandler(type: string, config: any): NotificationHandler {
    switch (type) {
      case 'email':
        return new EmailNotificationHandler(config);
      case 'slack':
        return new SlackNotificationHandler(config);
      case 'webhook':
        return new WebhookNotificationHandler(config);
      case 'sms':
        return new SMSNotificationHandler(config);
      case 'push':
        return new PushNotificationHandler(config);
      default:
        throw new Error(`Unsupported notification channel type: ${type}`);
    }
  }

  private loadAlertRules(): void {
    // Load and validate alert rules
    for (const rule of this.config.rules) {
      if (rule.enabled) {
        this.validateAlertRule(rule);
      }
    }
  }

  private validateAlertRule(rule: AlertRule): void {
    if (!rule.name || !rule.condition || rule.threshold === undefined) {
      throw new Error(`Invalid alert rule: ${rule.name}`);
    }
  }

  private startPeriodicCleanup(): void {
    // Clean up old resolved alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);
  }

  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.status === 'resolved' && alert.timestamp < cutoffTime) {
        this.alerts.delete(alertId);
      }
    }

    this.emit('alerts:cleanup', { removedCount: 0 });
  }

  private async shouldSuppressAlert(alert: PerformanceAlert): Promise<boolean> {
    // Check global suppression rules
    for (const rule of this.config.suppressions) {
      if (rule.enabled && this.matchesSuppressionRule(alert, rule)) {
        return true;
      }
    }

    // Check active suppressions
    for (const suppression of this.activeSuppressions.values()) {
      if (Date.now() < suppression.endTime && this.matchesSuppressionPattern(alert, suppression.pattern)) {
        return true;
      }
    }

    // Check for duplicate alerts (same type, source, severity within last 5 minutes)
    const recentTime = Date.now() - (5 * 60 * 1000);
    for (const existingAlert of this.alerts.values()) {
      if (
        existingAlert.timestamp > recentTime &&
        existingAlert.type === alert.type &&
        existingAlert.severity === alert.severity &&
        this.isSameSource(existingAlert.source, alert.source)
      ) {
        return true; // Suppress duplicate
      }
    }

    return false;
  }

  private matchesSuppressionRule(alert: PerformanceAlert, rule: SuppressionRule): boolean {
    // Simple pattern matching - in real implementation would use more sophisticated logic
    return rule.condition.includes(alert.type) || rule.condition.includes(alert.source.service);
  }

  private matchesSuppressionPattern(alert: PerformanceAlert, pattern: SuppressionPattern): boolean {
    return (
      (!pattern.type || alert.type === pattern.type) &&
      (!pattern.source || this.isSameSource(alert.source, pattern.source)) &&
      (!pattern.severity || alert.severity === pattern.severity)
    );
  }

  private isSameSource(source1: AlertSource, source2: AlertSource): boolean {
    return (
      source1.service === source2.service &&
      source1.component === source2.component &&
      source1.environment === source2.environment
    );
  }

  private createSuppressionPattern(alert: PerformanceAlert): SuppressionPattern {
    return {
      type: alert.type,
      source: alert.source,
      severity: alert.severity
    };
  }

  private async sendNotifications(alert: PerformanceAlert): Promise<void> {
    const applicableChannels = this.getApplicableChannels(alert);
    
    for (const channelType of applicableChannels) {
      const handler = this.notificationChannels.get(channelType);
      if (handler) {
        try {
          await handler.send(alert);
          this.emit('notification:sent', { alertId: alert.id, channel: channelType });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.emit('notification:failed', { 
            alertId: alert.id, 
            channel: channelType, 
            error: errorMessage 
          });
        }
      }
    }
  }

  private async sendAcknowledgmentNotifications(alert: PerformanceAlert, userId?: string): Promise<void> {
    const applicableChannels = this.getApplicableChannels(alert);
    
    for (const channelType of applicableChannels) {
      const handler = this.notificationChannels.get(channelType);
      if (handler && handler.sendAcknowledgment) {
        try {
          await handler.sendAcknowledgment(alert, userId);
        } catch (error) {
          // Log error but don't fail
        }
      }
    }
  }

  private async sendResolutionNotifications(alert: PerformanceAlert, userId?: string): Promise<void> {
    const applicableChannels = this.getApplicableChannels(alert);
    
    for (const channelType of applicableChannels) {
      const handler = this.notificationChannels.get(channelType);
      if (handler && handler.sendResolution) {
        try {
          await handler.sendResolution(alert, userId);
        } catch (error) {
          // Log error but don't fail
        }
      }
    }
  }

  private getApplicableChannels(alert: PerformanceAlert): string[] {
    return this.config.channels
      .filter(channel => 
        channel.enabled && 
        (channel.severityFilter.length === 0 || channel.severityFilter.includes(alert.severity))
      )
      .map(channel => channel.type);
  }

  private setupEscalation(alert: PerformanceAlert): void {
    if (this.config.escalation.length === 0) return;

    const policy = this.config.escalation[0]; // Use first policy for now
    
    const timer = setTimeout(async () => {
      if (this.alerts.get(alert.id)?.status === 'active') {
        await this.escalateAlert(alert, policy);
      }
    }, policy.timeout * 60 * 1000); // Convert minutes to milliseconds

    this.escalationTimers.set(alert.id, timer);
  }

  private async escalateAlert(alert: PerformanceAlert, policy: EscalationPolicy): Promise<void> {
    // Execute escalation actions
    for (const level of policy.levels) {
      for (const channelType of level.channels) {
        const handler = this.notificationChannels.get(channelType);
        if (handler && handler.sendEscalation) {
          try {
            await handler.sendEscalation(alert, level);
          } catch (error) {
            // Log error but continue with other channels
          }
        }
      }
    }

    this.emit('alert:escalated', { alertId: alert.id, policy: policy.name });
  }

  private async executeAutomaticActions(alert: PerformanceAlert): Promise<void> {
    for (const action of alert.actions) {
      if (action.automated && this.shouldExecuteAction(action, alert)) {
        try {
          await this.executeAction(action, alert);
          this.emit('action:executed', { alertId: alert.id, action: action.type });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.emit('action:failed', { 
            alertId: alert.id, 
            action: action.type, 
            error: errorMessage 
          });
        }
      }
    }
  }

  private shouldExecuteAction(action: AlertAction, alert: PerformanceAlert): boolean {
    // Check conditions for executing the action
    if (action.conditions.length === 0) return true;
    
    // Simple condition checking - in real implementation would be more sophisticated
    return action.conditions.every(condition => {
      if (condition.includes('severity')) {
        return condition.includes(alert.severity);
      }
      if (condition.includes('type')) {
        return condition.includes(alert.type);
      }
      return true;
    });
  }

  private async executeAction(action: AlertAction, alert: PerformanceAlert): Promise<void> {
    switch (action.type) {
      case 'investigate':
        // Trigger investigation workflow
        this.emit('action:investigate', { alertId: alert.id });
        break;
      case 'autofix':
        // Execute autofix script
        if (action.script) {
          // In real implementation, would execute the script safely
          this.emit('action:autofix', { alertId: alert.id, script: action.script });
        }
        break;
      case 'scale':
        // Trigger scaling action
        this.emit('action:scale', { alertId: alert.id });
        break;
      case 'rollback':
        // Trigger rollback
        this.emit('action:rollback', { alertId: alert.id });
        break;
      default:
        // Custom action
        this.emit('action:custom', { alertId: alert.id, actionType: action.type });
    }
  }

  private getDefaultActions(alertType: AlertType): AlertAction[] {
    const actionMap: Record<AlertType, AlertAction[]> = {
      'high_latency': [
        {
          type: 'investigate',
          description: 'Investigate high latency causes',
          automated: false,
          priority: 1,
          conditions: []
        }
      ],
      'error_rate_spike': [
        {
          type: 'investigate',
          description: 'Investigate error rate increase',
          automated: false,
          priority: 1,
          conditions: []
        }
      ],
      'cost_threshold_exceeded': [
        {
          type: 'notify',
          description: 'Notify cost management team',
          automated: true,
          priority: 1,
          conditions: []
        }
      ],
      'resource_exhaustion': [
        {
          type: 'scale',
          description: 'Scale resources automatically',
          automated: true,
          priority: 1,
          conditions: ['severity:critical']
        }
      ],
      'performance_degradation': [
        {
          type: 'investigate',
          description: 'Investigate performance issue',
          automated: false,
          priority: 1,
          conditions: []
        }
      ],
      'quality_regression': [
        {
          type: 'investigate',
          description: 'Investigate quality regression',
          automated: false,
          priority: 2,
          conditions: []
        }
      ],
      'security_issue': [
        {
          type: 'escalate',
          description: 'Escalate to security team',
          automated: true,
          priority: 1,
          conditions: []
        }
      ],
      'availability_issue': [
        {
          type: 'autofix',
          description: 'Attempt automatic recovery',
          automated: true,
          priority: 1,
          conditions: []
        }
      ],
      'capacity_limit': [
        {
          type: 'scale',
          description: 'Scale capacity',
          automated: true,
          priority: 1,
          conditions: []
        }
      ],
      'anomaly_detected': [
        {
          type: 'investigate',
          description: 'Investigate anomaly',
          automated: false,
          priority: 2,
          conditions: []
        }
      ]
    };

    return actionMap[alertType] || [];
  }

  async shutdown(): Promise<void> {
    // Clear all escalation timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();

    // Shutdown notification handlers
    for (const handler of this.notificationChannels.values()) {
      if (handler.shutdown) {
        await handler.shutdown();
      }
    }

    this.initialized = false;
    this.emit('alert-manager:shutdown');
  }
}

// Supporting interfaces and classes
interface ActiveSuppression {
  alertId: string;
  startTime: number;
  endTime: number;
  reason: string;
  pattern: SuppressionPattern;
}

interface SuppressionPattern {
  type?: AlertType;
  source?: AlertSource;
  severity?: string;
}

abstract class NotificationHandler {
  constructor(protected config: any) {}
  
  abstract send(alert: PerformanceAlert): Promise<void>;
  abstract test(): Promise<void>;
  
  async sendAcknowledgment?(alert: PerformanceAlert, userId?: string): Promise<void>;
  async sendResolution?(alert: PerformanceAlert, userId?: string): Promise<void>;
  async sendEscalation?(alert: PerformanceAlert, level: any): Promise<void>;
  async shutdown?(): Promise<void>;
}

class EmailNotificationHandler extends NotificationHandler {
  async send(alert: PerformanceAlert): Promise<void> {
    // Send email notification
    console.log(`Email notification: ${alert.title} - ${alert.message}`);
  }

  async test(): Promise<void> {
    // Test email configuration
    console.log('Testing email configuration...');
  }
}

class SlackNotificationHandler extends NotificationHandler {
  async send(alert: PerformanceAlert): Promise<void> {
    // Send Slack notification
    console.log(`Slack notification: ${alert.title} - ${alert.message}`);
  }

  async test(): Promise<void> {
    // Test Slack configuration
    console.log('Testing Slack configuration...');
  }
}

class WebhookNotificationHandler extends NotificationHandler {
  async send(alert: PerformanceAlert): Promise<void> {
    // Send webhook notification
    console.log(`Webhook notification: ${alert.title} - ${alert.message}`);
  }

  async test(): Promise<void> {
    // Test webhook configuration
    console.log('Testing webhook configuration...');
  }
}

class SMSNotificationHandler extends NotificationHandler {
  async send(alert: PerformanceAlert): Promise<void> {
    // Send SMS notification
    console.log(`SMS notification: ${alert.title} - ${alert.message}`);
  }

  async test(): Promise<void> {
    // Test SMS configuration
    console.log('Testing SMS configuration...');
  }
}

class PushNotificationHandler extends NotificationHandler {
  async send(alert: PerformanceAlert): Promise<void> {
    // Send push notification
    console.log(`Push notification: ${alert.title} - ${alert.message}`);
  }

  async test(): Promise<void> {
    // Test push notification configuration
    console.log('Testing push notification configuration...');
  }
}