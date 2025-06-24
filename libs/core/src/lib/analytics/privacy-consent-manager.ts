import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { PrivacySettings } from './usage-analytics';

export interface ConsentRecord {
  timestamp: Date;
  version: string;
  settings: PrivacySettings;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentOptions {
  allowAnonymousUsage: boolean;
  allowErrorReporting: boolean;
  allowPerformanceMetrics: boolean;
  allowFeatureTracking: boolean;
  dataRetentionDays: number;
}

export interface ConsentPrompt {
  title: string;
  description: string;
  options: ConsentOptions;
  privacyPolicyUrl?: string;
  contactEmail?: string;
}

export class PrivacyConsentManager extends EventEmitter {
  private consentFilePath: string;
  private consentRecord: ConsentRecord | null = null;
  private readonly CONSENT_VERSION = '1.0.0';
  
  constructor(configPath?: string) {
    super();
    
    // Store consent in user's home directory
    this.consentFilePath = configPath || join(homedir(), '.dna-analytics-consent.json');
    this.loadConsent();
  }

  /**
   * Check if user has given consent
   */
  hasConsent(): boolean {
    return this.consentRecord !== null && this.consentRecord.settings.consentGiven;
  }

  /**
   * Get current consent settings
   */
  getConsentSettings(): PrivacySettings | null {
    return this.consentRecord?.settings || null;
  }

  /**
   * Get consent prompt configuration
   */
  getConsentPrompt(): ConsentPrompt {
    return {
      title: 'Help Improve DNA Template System',
      description: `
We'd like to collect anonymous usage data to improve the DNA template system.
This data helps us understand which templates and features are most useful,
identify common issues, and prioritize improvements.

What we collect:
- Anonymous template usage statistics
- Performance metrics (generation times, error rates)
- Feature usage patterns
- Framework preferences

What we DON'T collect:
- Personal information or identifiers
- Project source code or content
- API keys or secrets
- File paths or directory names

All data is anonymized and encrypted. You can change these settings anytime.
      `.trim(),
      options: {
        allowAnonymousUsage: true,
        allowErrorReporting: true,
        allowPerformanceMetrics: true,
        allowFeatureTracking: true,
        dataRetentionDays: 30
      },
      privacyPolicyUrl: 'https://dna-templates.dev/privacy',
      contactEmail: 'privacy@dna-templates.dev'
    };
  }

  /**
   * Request user consent
   */
  async requestConsent(options: ConsentOptions): Promise<PrivacySettings> {
    const settings: PrivacySettings = {
      consentGiven: options.allowAnonymousUsage || 
                    options.allowErrorReporting || 
                    options.allowPerformanceMetrics || 
                    options.allowFeatureTracking,
      consentTimestamp: new Date(),
      dataSharingLevel: this.determineSharingLevel(options),
      excludedDataTypes: this.determineExclusions(options)
    };

    await this.saveConsent(settings);
    
    this.emit('consent:updated', {
      settings,
      timestamp: new Date()
    });

    return settings;
  }

  /**
   * Update consent settings
   */
  async updateConsent(settings: PrivacySettings): Promise<void> {
    await this.saveConsent(settings);
    
    this.emit('consent:updated', {
      settings,
      timestamp: new Date()
    });
  }

  /**
   * Revoke consent
   */
  async revokeConsent(): Promise<void> {
    const settings: PrivacySettings = {
      consentGiven: false,
      consentTimestamp: new Date(),
      dataSharingLevel: 'none',
      excludedDataTypes: ['all']
    };

    await this.saveConsent(settings);
    
    this.emit('consent:revoked', {
      timestamp: new Date()
    });
  }

  /**
   * Check if consent needs renewal
   */
  needsConsentRenewal(): boolean {
    if (!this.consentRecord) return true;
    
    // Check version
    if (this.consentRecord.version !== this.CONSENT_VERSION) {
      return true;
    }
    
    // Check age (renew every 365 days)
    const consentAge = Date.now() - this.consentRecord.timestamp.getTime();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 365 days
    
    return consentAge > maxAge;
  }

  /**
   * Get consent age in days
   */
  getConsentAge(): number {
    if (!this.consentRecord) return -1;
    
    const age = Date.now() - this.consentRecord.timestamp.getTime();
    return Math.floor(age / (24 * 60 * 60 * 1000));
  }

  /**
   * Export consent record
   */
  exportConsentRecord(): string {
    if (!this.consentRecord) {
      return JSON.stringify({ error: 'No consent record found' }, null, 2);
    }

    return JSON.stringify({
      ...this.consentRecord,
      exportDate: new Date().toISOString(),
      consentAge: this.getConsentAge()
    }, null, 2);
  }

  /**
   * Validate consent for specific data type
   */
  isDataTypeAllowed(dataType: string): boolean {
    if (!this.hasConsent()) return false;
    
    const settings = this.getConsentSettings();
    if (!settings) return false;
    
    if (settings.dataSharingLevel === 'none') return false;
    if (settings.excludedDataTypes.includes('all')) return false;
    if (settings.excludedDataTypes.includes(dataType)) return false;
    
    return true;
  }

  /**
   * Get privacy-friendly display text
   */
  getPrivacyStatus(): string {
    if (!this.hasConsent()) {
      return 'Analytics disabled - No data is being collected';
    }

    const settings = this.getConsentSettings();
    if (!settings) return 'Unknown status';

    switch (settings.dataSharingLevel) {
      case 'none':
        return 'Analytics disabled - No data is being collected';
      case 'anonymous':
        return 'Anonymous analytics enabled - No personal data collected';
      case 'full':
        return 'Full analytics enabled - Usage data is being collected';
      default:
        return 'Unknown analytics status';
    }
  }

  /**
   * Load consent from file
   */
  private loadConsent(): void {
    try {
      if (existsSync(this.consentFilePath)) {
        const data = readFileSync(this.consentFilePath, 'utf-8');
        const record = JSON.parse(data);
        
        // Parse dates
        record.timestamp = new Date(record.timestamp);
        if (record.settings.consentTimestamp) {
          record.settings.consentTimestamp = new Date(record.settings.consentTimestamp);
        }
        
        this.consentRecord = record;
      }
    } catch (error) {
      // Invalid consent file, will request new consent
      this.consentRecord = null;
    }
  }

  /**
   * Save consent to file
   */
  private async saveConsent(settings: PrivacySettings): Promise<void> {
    this.consentRecord = {
      timestamp: new Date(),
      version: this.CONSENT_VERSION,
      settings
    };

    try {
      writeFileSync(
        this.consentFilePath,
        JSON.stringify(this.consentRecord, null, 2),
        'utf-8'
      );
    } catch (error) {
      this.emit('consent:save-error', error);
      throw new Error(`Failed to save consent: ${error}`);
    }
  }

  /**
   * Determine sharing level from options
   */
  private determineSharingLevel(options: ConsentOptions): 'none' | 'anonymous' | 'full' {
    if (!options.allowAnonymousUsage && 
        !options.allowErrorReporting && 
        !options.allowPerformanceMetrics && 
        !options.allowFeatureTracking) {
      return 'none';
    }

    // For this implementation, we always use anonymous
    return 'anonymous';
  }

  /**
   * Determine exclusions from options
   */
  private determineExclusions(options: ConsentOptions): string[] {
    const exclusions: string[] = [];

    if (!options.allowAnonymousUsage) {
      exclusions.push('templateGeneration', 'moduleUsage');
    }
    if (!options.allowErrorReporting) {
      exclusions.push('errorTracking');
    }
    if (!options.allowPerformanceMetrics) {
      exclusions.push('performanceMetrics');
    }
    if (!options.allowFeatureTracking) {
      exclusions.push('featureUsage');
    }

    return exclusions;
  }
}