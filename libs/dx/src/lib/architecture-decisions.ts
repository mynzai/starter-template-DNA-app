/**
 * @fileoverview Architecture Decision Records (ADR) System - Epic 6 Story 2 AC3
 * 
 * Provides comprehensive ADR management for documenting and explaining
 * architectural decisions in DNA templates and modules.
 * 
 * @version 1.0.0
 * @author DNA Development Team
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';

// Core ADR interfaces
export interface ADRConfig {
  projectName: string;
  framework: string;
  storageDir: string;
  templateDir: string;
  format: ADRFormat;
  numbering: NumberingScheme;
  categories: ADRCategory[];
  review: ReviewConfig;
  notification: NotificationConfig;
  versioning: VersioningConfig;
  search: ADRSearchConfig;
}

export type ADRFormat = 'markdown' | 'asciidoc' | 'restructuredtext';
export type NumberingScheme = 'sequential' | 'date-based' | 'custom';

export interface ADRCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  tags: string[];
}

export interface ReviewConfig {
  enabled: boolean;
  requiredReviewers: number;
  autoMerge: boolean;
  reviewers: string[];
}

export interface ADR {
  id: string;
  number: number;
  title: string;
  date: Date;
  status: ADRStatus;
  deciders: string[];
  category: string;
  context: ADRContext;
  decision: ADRDecision;
  consequences: ADRConsequences;
  metadata: ADRMetadata;
  links: ADRLink[];
  supersedes?: string;
  supersededBy?: string;
  amendments: Amendment[];
}

export type ADRStatus = 
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'deprecated'
  | 'superseded'
  | 'amended';

export interface ADRContext {
  description: string;
  problemStatement: string;
  decisionDrivers: string[];
  consideredOptions: Option[];
  constraints: string[];
  assumptions: string[];
}

export interface Option {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  effort: EffortLevel;
  risk: RiskLevel;
  cost: CostLevel;
}

export type EffortLevel = 'low' | 'medium' | 'high' | 'very-high';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CostLevel = 'low' | 'medium' | 'high' | 'very-high';

export interface ADRDecision {
  outcome: string;
  rationale: string;
  chosenOption: string;
  implementation: Implementation;
  validation: Validation;
}

export interface Implementation {
  description: string;
  steps: ImplementationStep[];
  timeline: string;
  resources: Resource[];
  dependencies: string[];
}

export interface ImplementationStep {
  order: number;
  description: string;
  responsible: string;
  deadline?: Date;
  completed: boolean;
}

export interface Resource {
  type: 'human' | 'technical' | 'financial';
  description: string;
  quantity?: number;
  cost?: number;
}

export interface Validation {
  criteria: string[];
  methods: string[];
  schedule: string;
  responsible: string;
}

export interface ADRConsequences {
  positive: Consequence[];
  negative: Consequence[];
  neutral: Consequence[];
  risks: Risk[];
  tradeoffs: Tradeoff[];
}

export interface Consequence {
  description: string;
  impact: ImpactLevel;
  timeframe: Timeframe;
  affectedAreas: string[];
}

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
export type Timeframe = 'immediate' | 'short-term' | 'medium-term' | 'long-term';

export interface Risk {
  description: string;
  probability: ProbabilityLevel;
  impact: ImpactLevel;
  mitigation: string;
  owner: string;
}

export type ProbabilityLevel = 'unlikely' | 'possible' | 'likely' | 'certain';

export interface Tradeoff {
  gained: string;
  lost: string;
  rationale: string;
}

export interface ADRMetadata {
  template: string;
  framework: string;
  project: string;
  team: string;
  version: string;
  tags: string[];
  relatedIssues: string[];
  relatedPRs: string[];
  discussions: string[];
}

export interface ADRLink {
  type: LinkType;
  target: string;
  title: string;
  description?: string;
}

export type LinkType = 
  | 'relates-to'
  | 'depends-on'
  | 'conflicts-with'
  | 'implements'
  | 'validates'
  | 'references';

export interface Amendment {
  id: string;
  date: Date;
  author: string;
  description: string;
  changes: Change[];
  reason: string;
  approved: boolean;
  approvers: string[];
}

export interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  justification: string;
}

// ADR Templates
export interface ADRTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  structure: TemplateStructure;
  fields: TemplateField[];
  examples: string[];
}

export interface TemplateStructure {
  sections: TemplateSection[];
  format: ADRFormat;
  style: string;
}

export interface TemplateSection {
  name: string;
  required: boolean;
  order: number;
  content: string;
  help: string;
}

export interface TemplateField {
  name: string;
  type: FieldType;
  required: boolean;
  default?: any;
  validation?: FieldValidation;
  help: string;
}

export type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number';

export interface FieldValidation {
  pattern?: string;
  min?: number;
  max?: number;
  options?: string[];
  custom?: string;
}

/**
 * Architecture Decision Records System
 */
export class ADRSystem extends EventEmitter {
  private config: ADRConfig;
  private adrs: Map<string, ADR> = new Map();
  private templates: Map<string, ADRTemplate> = new Map();
  private nextNumber: number = 1;

  constructor(config: ADRConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize ADR system
   */
  public async initialize(): Promise<void> {
    this.emit('adr:initializing');
    
    try {
      await this.ensureDirectories();
      await this.loadExistingADRs();
      await this.loadTemplates();
      
      this.emit('adr:initialized');
    } catch (error) {
      this.emit('adr:error', error);
      throw error;
    }
  }

  /**
   * Create new ADR
   */
  public async createADR(data: CreateADRData): Promise<ADR> {
    const number = this.getNextNumber();
    const id = this.generateADRId(number, data.title);
    
    const adr: ADR = {
      id,
      number,
      title: data.title,
      date: new Date(),
      status: 'proposed',
      deciders: data.deciders || [],
      category: data.category,
      context: data.context,
      decision: data.decision,
      consequences: data.consequences,
      metadata: {
        template: data.template || 'default',
        framework: this.config.framework,
        project: this.config.projectName,
        team: data.team || '',
        version: '1.0.0',
        tags: data.tags || [],
        relatedIssues: [],
        relatedPRs: [],
        discussions: []
      },
      links: data.links || [],
      amendments: []
    };

    await this.saveADR(adr);
    this.adrs.set(id, adr);
    
    this.emit('adr:created', adr);
    return adr;
  }

  /**
   * Update ADR status
   */
  public async updateADRStatus(id: string, status: ADRStatus, reason?: string): Promise<void> {
    const adr = this.adrs.get(id);
    if (!adr) {
      throw new Error('ADR not found');
    }

    const oldStatus = adr.status;
    adr.status = status;

    if (reason) {
      adr.amendments.push({
        id: this.generateAmendmentId(),
        date: new Date(),
        author: 'system',
        description: `Status changed from ${oldStatus} to ${status}`,
        changes: [{
          field: 'status',
          oldValue: oldStatus,
          newValue: status,
          justification: reason
        }],
        reason,
        approved: true,
        approvers: []
      });
    }

    await this.saveADR(adr);
    this.emit('adr:status-updated', { adr, oldStatus, newStatus: status });
  }

  /**
   * Search ADRs
   */
  public async searchADRs(query: string, filters?: ADRFilters): Promise<ADR[]> {
    const results: ADR[] = [];
    
    for (const adr of this.adrs.values()) {
      if (this.matchesSearch(adr, query, filters)) {
        results.push(adr);
      }
    }
    
    return results.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Get ADR by ID
   */
  public async getADR(id: string): Promise<ADR | undefined> {
    return this.adrs.get(id);
  }

  /**
   * Get ADRs by category
   */
  public async getADRsByCategory(category: string): Promise<ADR[]> {
    return Array.from(this.adrs.values())
      .filter(adr => adr.category === category)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Create amendment
   */
  public async createAmendment(
    adrId: string, 
    amendment: Omit<Amendment, 'id' | 'date' | 'approved' | 'approvers'>
  ): Promise<string> {
    const adr = this.adrs.get(adrId);
    if (!adr) {
      throw new Error('ADR not found');
    }

    const amendmentId = this.generateAmendmentId();
    const fullAmendment: Amendment = {
      ...amendment,
      id: amendmentId,
      date: new Date(),
      approved: false,
      approvers: []
    };

    adr.amendments.push(fullAmendment);
    await this.saveADR(adr);
    
    this.emit('adr:amendment-created', { adrId, amendment: fullAmendment });
    return amendmentId;
  }

  /**
   * Generate ADR report
   */
  public async generateReport(options: ReportOptions = {}): Promise<ADRReport> {
    const adrs = await this.filterADRsForReport(options);
    
    const report: ADRReport = {
      generatedAt: new Date(),
      project: this.config.projectName,
      framework: this.config.framework,
      totalADRs: adrs.length,
      byStatus: this.groupByStatus(adrs),
      byCategory: this.groupByCategory(adrs),
      timeline: this.generateTimeline(adrs),
      recentChanges: this.getRecentChanges(adrs, 30),
      upcomingReviews: this.getUpcomingReviews(adrs),
      metrics: this.calculateMetrics(adrs)
    };

    this.emit('adr:report-generated', report);
    return report;
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.config.storageDir, { recursive: true });
    await fs.mkdir(this.config.templateDir, { recursive: true });
  }

  private async loadExistingADRs(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.storageDir);
      const adrFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.adoc'));
      
      for (const file of adrFiles) {
        const content = await fs.readFile(path.join(this.config.storageDir, file), 'utf-8');
        const adr = this.parseADR(content);
        if (adr) {
          this.adrs.set(adr.id, adr);
          this.nextNumber = Math.max(this.nextNumber, adr.number + 1);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }

  private async loadTemplates(): Promise<void> {
    // Load built-in templates
    const defaultTemplate: ADRTemplate = {
      id: 'default',
      name: 'Default ADR Template',
      description: 'Standard template for architecture decisions',
      category: 'general',
      structure: {
        sections: [
          { name: 'Title', required: true, order: 1, content: '# ADR-{number}: {title}', help: 'Brief noun phrase' },
          { name: 'Status', required: true, order: 2, content: '## Status\n\n{status}', help: 'Proposed, Accepted, Rejected, etc.' },
          { name: 'Context', required: true, order: 3, content: '## Context\n\n{context}', help: 'What is the issue that we\'re seeing that is motivating this decision?' },
          { name: 'Decision', required: true, order: 4, content: '## Decision\n\n{decision}', help: 'What is the change that we\'re proposing?' },
          { name: 'Consequences', required: true, order: 5, content: '## Consequences\n\n{consequences}', help: 'What becomes easier or more difficult?' }
        ],
        format: 'markdown',
        style: 'standard'
      },
      fields: [],
      examples: []
    };
    
    this.templates.set('default', defaultTemplate);
  }

  private async saveADR(adr: ADR): Promise<void> {
    const filename = `${String(adr.number).padStart(4, '0')}-${adr.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = path.join(this.config.storageDir, filename);
    const content = this.formatADR(adr);
    
    await fs.writeFile(filepath, content, 'utf-8');
  }

  private formatADR(adr: ADR): string {
    return `# ADR-${String(adr.number).padStart(4, '0')}: ${adr.title}

## Status

${adr.status.toUpperCase()}

## Context

${adr.context.description}

### Problem Statement

${adr.context.problemStatement}

### Decision Drivers

${adr.context.decisionDrivers.map(d => `- ${d}`).join('\n')}

### Considered Options

${adr.context.consideredOptions.map(o => `
#### ${o.name}

${o.description}

**Pros:**
${o.pros.map(p => `- ${p}`).join('\n')}

**Cons:**
${o.cons.map(c => `- ${c}`).join('\n')}

**Effort:** ${o.effort} | **Risk:** ${o.risk} | **Cost:** ${o.cost}
`).join('\n')}

## Decision

${adr.decision.outcome}

### Rationale

${adr.decision.rationale}

### Chosen Option

${adr.decision.chosenOption}

## Consequences

### Positive

${adr.consequences.positive.map(c => `- ${c.description} (Impact: ${c.impact}, Timeframe: ${c.timeframe})`).join('\n')}

### Negative

${adr.consequences.negative.map(c => `- ${c.description} (Impact: ${c.impact}, Timeframe: ${c.timeframe})`).join('\n')}

### Risks

${adr.consequences.risks.map(r => `- ${r.description} (Probability: ${r.probability}, Impact: ${r.impact})`).join('\n')}

## Metadata

- **Date:** ${adr.date.toISOString()}
- **Deciders:** ${adr.deciders.join(', ')}
- **Category:** ${adr.category}
- **Tags:** ${adr.metadata.tags.join(', ')}
`;
  }

  private parseADR(content: string): ADR | null {
    // Simple parser - would be more sophisticated in production
    return null;
  }

  private getNextNumber(): number {
    return this.nextNumber++;
  }

  private generateADRId(number: number, title: string): string {
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `adr-${String(number).padStart(4, '0')}-${slug}`;
  }

  private generateAmendmentId(): string {
    return `amendment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private matchesSearch(adr: ADR, query: string, filters?: ADRFilters): boolean {
    const searchText = `${adr.title} ${adr.context.description} ${adr.decision.outcome}`.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (!searchText.includes(queryLower)) {
      return false;
    }

    if (filters) {
      if (filters.status && adr.status !== filters.status) return false;
      if (filters.category && adr.category !== filters.category) return false;
      if (filters.dateFrom && adr.date < filters.dateFrom) return false;
      if (filters.dateTo && adr.date > filters.dateTo) return false;
    }

    return true;
  }

  private filterADRsForReport(options: ReportOptions): ADR[] {
    let adrs = Array.from(this.adrs.values());
    
    if (options.status) {
      adrs = adrs.filter(adr => adr.status === options.status);
    }
    if (options.category) {
      adrs = adrs.filter(adr => adr.category === options.category);
    }
    if (options.dateFrom) {
      adrs = adrs.filter(adr => adr.date >= options.dateFrom!);
    }
    if (options.dateTo) {
      adrs = adrs.filter(adr => adr.date <= options.dateTo!);
    }
    
    return adrs;
  }

  private groupByStatus(adrs: ADR[]): Record<ADRStatus, number> {
    const groups: Record<ADRStatus, number> = {
      proposed: 0,
      accepted: 0,
      rejected: 0,
      deprecated: 0,
      superseded: 0,
      amended: 0
    };
    
    for (const adr of adrs) {
      groups[adr.status]++;
    }
    
    return groups;
  }

  private groupByCategory(adrs: ADR[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const adr of adrs) {
      groups[adr.category] = (groups[adr.category] || 0) + 1;
    }
    
    return groups;
  }

  private generateTimeline(adrs: ADR[]): TimelineEntry[] {
    return adrs
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(adr => ({
        date: adr.date,
        adrId: adr.id,
        title: adr.title,
        status: adr.status,
        event: 'created'
      }));
  }

  private getRecentChanges(adrs: ADR[], days: number): RecentChange[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const changes: RecentChange[] = [];
    
    for (const adr of adrs) {
      for (const amendment of adr.amendments) {
        if (amendment.date >= cutoff) {
          changes.push({
            date: amendment.date,
            adrId: adr.id,
            type: 'amendment',
            description: amendment.description,
            author: amendment.author
          });
        }
      }
    }
    
    return changes.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private getUpcomingReviews(adrs: ADR[]): ADR[] {
    // Implementation would check review schedules
    return [];
  }

  private calculateMetrics(adrs: ADR[]): ADRMetrics {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      averageDecisionTime: this.calculateAverageDecisionTime(adrs),
      acceptanceRate: this.calculateAcceptanceRate(adrs),
      amendmentRate: this.calculateAmendmentRate(adrs),
      recentActivity: adrs.filter(adr => adr.date >= thirtyDaysAgo).length,
      mostActiveCategory: this.getMostActiveCategory(adrs),
      averageOptionsConsidered: this.calculateAverageOptions(adrs)
    };
  }

  private calculateAverageDecisionTime(adrs: ADR[]): number {
    // Simplified - would need to track proposal to decision time
    return 7; // days
  }

  private calculateAcceptanceRate(adrs: ADR[]): number {
    const total = adrs.length;
    const accepted = adrs.filter(adr => adr.status === 'accepted').length;
    return total > 0 ? (accepted / total) * 100 : 0;
  }

  private calculateAmendmentRate(adrs: ADR[]): number {
    const withAmendments = adrs.filter(adr => adr.amendments.length > 0).length;
    return adrs.length > 0 ? (withAmendments / adrs.length) * 100 : 0;
  }

  private getMostActiveCategory(adrs: ADR[]): string {
    const counts = this.groupByCategory(adrs);
    let maxCategory = '';
    let maxCount = 0;
    
    for (const [category, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxCategory = category;
      }
    }
    
    return maxCategory;
  }

  private calculateAverageOptions(adrs: ADR[]): number {
    if (adrs.length === 0) return 0;
    
    const total = adrs.reduce((sum, adr) => sum + adr.context.consideredOptions.length, 0);
    return total / adrs.length;
  }
}

// Supporting interfaces
interface NotificationConfig {
  enabled: boolean;
  channels: string[];
  events: string[];
}

interface VersioningConfig {
  enabled: boolean;
  strategy: 'git' | 'database' | 'file';
}

interface ADRSearchConfig {
  enabled: boolean;
  indexFields: string[];
}

interface CreateADRData {
  title: string;
  category: string;
  context: ADRContext;
  decision: ADRDecision;
  consequences: ADRConsequences;
  template?: string;
  deciders?: string[];
  team?: string;
  tags?: string[];
  links?: ADRLink[];
}

interface ADRFilters {
  status?: ADRStatus;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
}

interface ReportOptions {
  status?: ADRStatus;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface ADRReport {
  generatedAt: Date;
  project: string;
  framework: string;
  totalADRs: number;
  byStatus: Record<ADRStatus, number>;
  byCategory: Record<string, number>;
  timeline: TimelineEntry[];
  recentChanges: RecentChange[];
  upcomingReviews: ADR[];
  metrics: ADRMetrics;
}

interface TimelineEntry {
  date: Date;
  adrId: string;
  title: string;
  status: ADRStatus;
  event: string;
}

interface RecentChange {
  date: Date;
  adrId: string;
  type: string;
  description: string;
  author: string;
}

interface ADRMetrics {
  averageDecisionTime: number;
  acceptanceRate: number;
  amendmentRate: number;
  recentActivity: number;
  mostActiveCategory: string;
  averageOptionsConsidered: number;
}