/**
 * @fileoverview Issue Tracking System - Epic 6 Story 6 AC3
 * Feature request and bug reporting workflows with comprehensive tracking and resolution
 */

import { EventEmitter } from 'events';

/**
 * Issue types
 */
export enum IssueType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  ENHANCEMENT = 'enhancement',
  DOCUMENTATION = 'documentation',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  USABILITY = 'usability',
  COMPATIBILITY = 'compatibility',
  REGRESSION = 'regression',
  QUESTION = 'question'
}

/**
 * Issue severity levels
 */
export enum IssueSeverity {
  CRITICAL = 'critical',      // System unusable, data loss
  HIGH = 'high',              // Major functionality broken
  MEDIUM = 'medium',          // Minor functionality affected
  LOW = 'low',                // Cosmetic or enhancement
  WISHLIST = 'wishlist'       // Nice to have features
}

/**
 * Issue priority levels
 */
export enum IssuePriority {
  P0 = 'p0',  // Fix immediately
  P1 = 'p1',  // Fix in current sprint
  P2 = 'p2',  // Fix in next sprint
  P3 = 'p3',  // Fix when time permits
  P4 = 'p4'   // Backlog
}

/**
 * Issue status
 */
export enum IssueStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  TRIAGED = 'triaged',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  UNDER_REVIEW = 'under_review',
  TESTING = 'testing',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
  WONT_FIX = 'wont_fix'
}

/**
 * Issue resolution types
 */
export enum ResolutionType {
  FIXED = 'fixed',
  IMPLEMENTED = 'implemented',
  DOCUMENTED = 'documented',
  DUPLICATE = 'duplicate',
  INVALID = 'invalid',
  WONT_FIX = 'wont_fix',
  CANNOT_REPRODUCE = 'cannot_reproduce',
  WORKS_AS_DESIGNED = 'works_as_designed'
}

/**
 * Issue workflow state
 */
export enum WorkflowState {
  INTAKE = 'intake',
  TRIAGE = 'triage',
  PLANNING = 'planning',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  RELEASE = 'release',
  CLOSURE = 'closure'
}

/**
 * Issue tracking system configuration
 */
export interface IssueTrackingConfig {
  // Workflow configuration
  workflows: WorkflowConfiguration[];
  
  // Triage settings
  triage: TriageConfiguration;
  
  // Assignment rules
  assignment: AssignmentConfiguration;
  
  // Templates
  templates: IssueTemplateConfiguration[];
  
  // Automation
  automation: AutomationConfiguration;
  
  // SLA and escalation
  sla: SLAConfiguration;
  
  // Integration settings
  integrations: IntegrationConfiguration[];
  
  // Notification settings
  notifications: NotificationConfiguration;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfiguration {
  issueType: IssueType;
  states: WorkflowStateConfig[];
  transitions: WorkflowTransition[];
  autoTransitions: AutoTransition[];
  validators: WorkflowValidator[];
}

/**
 * Workflow state configuration
 */
export interface WorkflowStateConfig {
  state: WorkflowState;
  name: string;
  description: string;
  allowedRoles: string[];
  requiredFields: string[];
  actions: StateAction[];
  timeLimit?: number; // hours
}

/**
 * State action
 */
export interface StateAction {
  id: string;
  name: string;
  type: 'assign' | 'comment' | 'attach' | 'relate' | 'escalate' | 'notify';
  config: Record<string, any>;
  automated: boolean;
}

/**
 * Workflow transition
 */
export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  trigger: string;
  conditions: TransitionCondition[];
  actions: TransitionAction[];
  permissions: string[];
}

/**
 * Transition condition
 */
export interface TransitionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

/**
 * Transition action
 */
export interface TransitionAction {
  type: 'set_field' | 'notify' | 'assign' | 'escalate' | 'trigger_webhook';
  config: Record<string, any>;
}

/**
 * Auto transition
 */
export interface AutoTransition {
  from: WorkflowState;
  to: WorkflowState;
  trigger: 'timeout' | 'external_event' | 'condition_met';
  conditions: Record<string, any>;
  delay?: number; // hours
}

/**
 * Workflow validator
 */
export interface WorkflowValidator {
  state: WorkflowState;
  validations: ValidationRule[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
  field: string;
  rule: 'required' | 'min_length' | 'max_length' | 'format' | 'custom';
  value?: any;
  message: string;
}

/**
 * Triage configuration
 */
export interface TriageConfiguration {
  // Auto-triage settings
  autoTriage: AutoTriageConfig;
  
  // Triage team
  triageTeam: TriageTeamConfig;
  
  // Triage criteria
  triageCriteria: TriageCriteriaConfig;
  
  // Escalation rules
  escalationRules: EscalationRule[];
}

/**
 * Auto-triage configuration
 */
export interface AutoTriageConfig {
  enabled: boolean;
  algorithms: TriageAlgorithm[];
  confidenceThreshold: number;
  fallbackToHuman: boolean;
}

/**
 * Triage algorithm
 */
export interface TriageAlgorithm {
  name: string;
  type: 'keyword' | 'ml_classification' | 'similarity' | 'rule_based';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Triage team configuration
 */
export interface TriageTeamConfig {
  members: TriageMember[];
  schedule: TriageSchedule;
  workloadDistribution: 'round_robin' | 'expertise_based' | 'load_balanced';
}

/**
 * Triage member
 */
export interface TriageMember {
  userId: string;
  expertise: string[];
  maxDailyIssues: number;
  available: boolean;
  timezone: string;
}

/**
 * Triage schedule
 */
export interface TriageSchedule {
  workingHours: WorkingHours;
  responseTimeTarget: number; // hours
  escalationTime: number; // hours
  weekends: boolean;
  holidays: string[];
}

/**
 * Working hours
 */
export interface WorkingHours {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

/**
 * Time slot
 */
export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  timezone: string;
}

/**
 * Triage criteria configuration
 */
export interface TriageCriteriaConfig {
  severityRules: SeverityRule[];
  priorityRules: PriorityRule[];
  assignmentRules: AssignmentRule[];
}

/**
 * Severity rule
 */
export interface SeverityRule {
  conditions: Record<string, any>;
  severity: IssueSeverity;
  confidence: number;
}

/**
 * Priority rule
 */
export interface PriorityRule {
  conditions: Record<string, any>;
  priority: IssuePriority;
  confidence: number;
}

/**
 * Assignment rule
 */
export interface AssignmentRule {
  conditions: Record<string, any>;
  assignee: string;
  team: string;
  confidence: number;
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  trigger: 'timeout' | 'severity' | 'manual' | 'external';
  conditions: Record<string, any>;
  actions: EscalationAction[];
  enabled: boolean;
}

/**
 * Escalation action
 */
export interface EscalationAction {
  type: 'notify' | 'reassign' | 'escalate_priority' | 'escalate_severity';
  targets: string[];
  message?: string;
}

/**
 * Assignment configuration
 */
export interface AssignmentConfiguration {
  autoAssignment: boolean;
  assignmentStrategy: 'expertise' | 'workload' | 'round_robin' | 'manual';
  teams: TeamConfiguration[];
  individuals: IndividualConfiguration[];
  fallbackAssignee: string;
}

/**
 * Team configuration
 */
export interface TeamConfiguration {
  id: string;
  name: string;
  members: string[];
  expertise: string[];
  capacity: number;
  timezone: string;
  workingHours: WorkingHours;
}

/**
 * Individual configuration
 */
export interface IndividualConfiguration {
  userId: string;
  expertise: string[];
  capacity: number;
  timezone: string;
  workingHours: WorkingHours;
  vacationDates: Date[];
}

/**
 * Issue template configuration
 */
export interface IssueTemplateConfiguration {
  id: string;
  name: string;
  issueType: IssueType;
  title: string;
  description: string;
  fields: TemplateField[];
  requiredSections: TemplateSection[];
  validations: TemplateValidation[];
}

/**
 * Template field
 */
export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'file' | 'date';
  required: boolean;
  options?: string[];
  validation?: FieldValidation;
  placeholder?: string;
  helpText?: string;
}

/**
 * Template section
 */
export interface TemplateSection {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  required: boolean;
  validation?: SectionValidation;
}

/**
 * Section validation
 */
export interface SectionValidation {
  minLength?: number;
  maxLength?: number;
  requiredKeywords?: string[];
}

/**
 * Template validation
 */
export interface TemplateValidation {
  field: string;
  rules: ValidationRule[];
}

/**
 * Field validation
 */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  allowedValues?: string[];
}

/**
 * Automation configuration
 */
export interface AutomationConfiguration {
  // Auto-labeling
  autoLabeling: AutoLabelingConfig;
  
  // Auto-assignment
  autoAssignment: AutoAssignmentConfig;
  
  // Auto-closing
  autoClosing: AutoClosingConfig;
  
  // Integration triggers
  integrationTriggers: IntegrationTrigger[];
}

/**
 * Auto-labeling configuration
 */
export interface AutoLabelingConfig {
  enabled: boolean;
  rules: LabelingRule[];
  mlModels: MLModelConfig[];
}

/**
 * Labeling rule
 */
export interface LabelingRule {
  conditions: Record<string, any>;
  labels: string[];
  confidence: number;
}

/**
 * ML model configuration
 */
export interface MLModelConfig {
  name: string;
  endpoint: string;
  inputFormat: string;
  outputFormat: string;
  confidenceThreshold: number;
}

/**
 * Auto-assignment configuration
 */
export interface AutoAssignmentConfig {
  enabled: boolean;
  strategy: 'expertise' | 'workload' | 'availability';
  rules: AssignmentRule[];
}

/**
 * Auto-closing configuration
 */
export interface AutoClosingConfig {
  enabled: boolean;
  inactivityPeriod: number; // days
  warningPeriod: number; // days before closing
  exemptLabels: string[];
}

/**
 * Integration trigger
 */
export interface IntegrationTrigger {
  event: string;
  conditions: Record<string, any>;
  integrations: string[];
  config: Record<string, any>;
}

/**
 * SLA configuration
 */
export interface SLAConfiguration {
  responseTargets: SLATarget[];
  resolutionTargets: SLATarget[];
  escalationMatrix: EscalationMatrix;
  businessHours: BusinessHours;
}

/**
 * SLA target
 */
export interface SLATarget {
  issueType: IssueType;
  severity: IssueSeverity;
  priority: IssuePriority;
  targetHours: number;
  warningHours: number;
}

/**
 * Escalation matrix
 */
export interface EscalationMatrix {
  levels: EscalationLevel[];
}

/**
 * Escalation level
 */
export interface EscalationLevel {
  level: number;
  triggerAfterHours: number;
  escalateTo: string[];
  actions: string[];
}

/**
 * Business hours
 */
export interface BusinessHours {
  timezone: string;
  workingDays: string[];
  workingHours: TimeSlot;
  holidays: Holiday[];
}

/**
 * Holiday
 */
export interface Holiday {
  name: string;
  date: Date;
  type: 'fixed' | 'floating';
}

/**
 * Integration configuration
 */
export interface IntegrationConfiguration {
  type: 'github' | 'jira' | 'slack' | 'discord' | 'email' | 'webhook' | 'teams';
  config: Record<string, any>;
  enabled: boolean;
  bidirectional: boolean;
  fieldMapping: FieldMapping[];
  syncRules: SyncRule[];
}

/**
 * Field mapping
 */
export interface FieldMapping {
  localField: string;
  remoteField: string;
  transformation?: string;
  direction: 'import' | 'export' | 'bidirectional';
}

/**
 * Sync rule
 */
export interface SyncRule {
  trigger: string;
  conditions: Record<string, any>;
  actions: string[];
}

/**
 * Notification configuration
 */
export interface NotificationConfiguration {
  channels: NotificationChannel[];
  rules: NotificationRule[];
  templates: NotificationTemplate[];
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'in_app' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Notification rule
 */
export interface NotificationRule {
  event: string;
  conditions: Record<string, any>;
  channels: string[];
  recipients: NotificationRecipient[];
  template: string;
  enabled: boolean;
}

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  type: 'reporter' | 'assignee' | 'watcher' | 'team' | 'role' | 'user';
  identifier: string;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  format: 'text' | 'html' | 'markdown';
  variables: string[];
}

/**
 * Issue record
 */
export interface Issue {
  id: string;
  type: IssueType;
  title: string;
  description: string;
  
  // Classification
  severity: IssueSeverity;
  priority: IssuePriority;
  status: IssueStatus;
  
  // People
  reporter: IssueUser;
  assignee?: IssueUser;
  watchers: IssueUser[];
  
  // Workflow
  workflowState: WorkflowState;
  stateHistory: StateTransition[];
  
  // Content
  environment: EnvironmentInfo;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  attachments: Attachment[];
  
  // Metadata
  labels: string[];
  tags: string[];
  component?: string;
  version?: string;
  
  // Tracking
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Resolution
  resolution?: ResolutionType;
  resolutionComment?: string;
  
  // Relationships
  duplicateOf?: string;
  relatedIssues: IssueRelation[];
  
  // Metrics
  timeToTriage?: number; // hours
  timeToAssign?: number; // hours
  timeToResolve?: number; // hours
  
  // Community interaction
  votes: IssueVote[];
  comments: IssueComment[];
  
  // SLA tracking
  slaStatus: SLAStatus;
  slaBreaches: SLABreach[];
}

/**
 * Issue user
 */
export interface IssueUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

/**
 * State transition
 */
export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  timestamp: Date;
  user: string;
  reason?: string;
  automated: boolean;
}

/**
 * Environment information
 */
export interface EnvironmentInfo {
  operatingSystem: string;
  browser?: string;
  nodeVersion?: string;
  templateVersion?: string;
  framework?: string;
  additionalInfo: Record<string, string>;
}

/**
 * Attachment
 */
export interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
  thumbnail?: string;
}

/**
 * Issue relation
 */
export interface IssueRelation {
  issueId: string;
  type: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'child_of' | 'parent_of';
  description?: string;
}

/**
 * Issue vote
 */
export interface IssueVote {
  userId: string;
  type: 'upvote' | 'downvote';
  timestamp: Date;
}

/**
 * Issue comment
 */
export interface IssueComment {
  id: string;
  author: IssueUser;
  content: string;
  timestamp: Date;
  edited: boolean;
  editedAt?: Date;
  type: 'comment' | 'solution' | 'workaround' | 'question';
  helpful: boolean;
  helpfulVotes: number;
}

/**
 * SLA status
 */
export interface SLAStatus {
  responseTarget?: Date;
  resolutionTarget?: Date;
  responseStatus: 'met' | 'warning' | 'breached';
  resolutionStatus: 'met' | 'warning' | 'breached';
  timeRemaining?: number; // hours
}

/**
 * SLA breach
 */
export interface SLABreach {
  type: 'response' | 'resolution';
  targetDate: Date;
  actualDate: Date;
  delayHours: number;
  reason?: string;
}

/**
 * Issue submission data
 */
export interface IssueSubmissionData {
  type: IssueType;
  title: string;
  description: string;
  severity?: IssueSeverity;
  component?: string;
  version?: string;
  environment?: Partial<EnvironmentInfo>;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  attachments?: File[];
  labels?: string[];
}

/**
 * Issue search criteria
 */
export interface IssueSearchCriteria {
  query?: string;
  type?: IssueType;
  status?: IssueStatus;
  severity?: IssueSeverity;
  priority?: IssuePriority;
  assignee?: string;
  reporter?: string;
  labels?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  component?: string;
  version?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Issue statistics
 */
export interface IssueStatistics {
  total: number;
  byType: Map<IssueType, number>;
  byStatus: Map<IssueStatus, number>;
  bySeverity: Map<IssueSeverity, number>;
  byPriority: Map<IssuePriority, number>;
  
  // Metrics
  averageTimeToTriage: number;
  averageTimeToResolve: number;
  resolutionRate: number;
  
  // Trends
  creationTrend: TrendData[];
  resolutionTrend: TrendData[];
  
  // SLA metrics
  slaCompliance: number;
  slaBreaches: number;
}

/**
 * Trend data
 */
export interface TrendData {
  date: Date;
  count: number;
}

/**
 * Issue Tracking System
 */
export class IssueTrackingSystem extends EventEmitter {
  private config: IssueTrackingConfig;
  private issues: Map<string, Issue> = new Map();
  private templates: Map<string, IssueTemplateConfiguration> = new Map();
  private triageQueue: string[] = [];

  constructor(config: IssueTrackingConfig) {
    super();
    this.config = config;
    this.initializeTemplates();
  }

  /**
   * Initialize issue templates
   */
  private initializeTemplates(): void {
    for (const template of this.config.templates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Submit a new issue
   */
  public async submitIssue(
    submissionData: IssueSubmissionData,
    reporter: IssueUser
  ): Promise<Issue> {
    const issueId = this.generateIssueId();
    
    // Validate submission
    const validation = await this.validateSubmission(submissionData);
    if (!validation.valid) {
      throw new Error(`Issue validation failed: ${validation.errors.join(', ')}`);
    }

    // Create issue
    const issue: Issue = {
      id: issueId,
      type: submissionData.type,
      title: submissionData.title,
      description: submissionData.description,
      severity: submissionData.severity || IssueSeverity.MEDIUM,
      priority: IssuePriority.P3, // Will be set during triage
      status: IssueStatus.SUBMITTED,
      reporter,
      watchers: [reporter],
      workflowState: WorkflowState.INTAKE,
      stateHistory: [{
        from: WorkflowState.INTAKE,
        to: WorkflowState.INTAKE,
        timestamp: new Date(),
        user: reporter.id,
        automated: false
      }],
      environment: this.normalizeEnvironment(submissionData.environment),
      stepsToReproduce: submissionData.stepsToReproduce,
      expectedBehavior: submissionData.expectedBehavior,
      actualBehavior: submissionData.actualBehavior,
      attachments: [], // Will be processed separately
      labels: submissionData.labels || [],
      tags: [],
      component: submissionData.component,
      version: submissionData.version,
      createdAt: new Date(),
      updatedAt: new Date(),
      relatedIssues: [],
      votes: [],
      comments: [],
      slaStatus: await this.calculateSLA(submissionData.type, IssueSeverity.MEDIUM),
      slaBreaches: []
    };

    this.issues.set(issueId, issue);
    
    // Add to triage queue
    this.triageQueue.push(issueId);
    
    // Trigger auto-triage if enabled
    if (this.config.triage.autoTriage.enabled) {
      await this.autoTriage(issue);
    }
    
    // Apply automation rules
    await this.applyAutomationRules(issue, 'created');
    
    this.emit('issue:submitted', { issueId, issue });
    
    return issue;
  }

  /**
   * Validate issue submission
   */
  private async validateSubmission(
    submissionData: IssueSubmissionData
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!submissionData.title || submissionData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!submissionData.description || submissionData.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (submissionData.title && submissionData.title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }

    if (submissionData.description && submissionData.description.length > 10000) {
      errors.push('Description must be 10000 characters or less');
    }

    // Type-specific validation
    if (submissionData.type === IssueType.BUG_REPORT) {
      if (!submissionData.stepsToReproduce) {
        errors.push('Steps to reproduce are required for bug reports');
      }
      if (!submissionData.expectedBehavior) {
        errors.push('Expected behavior is required for bug reports');
      }
      if (!submissionData.actualBehavior) {
        errors.push('Actual behavior is required for bug reports');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize environment information
   */
  private normalizeEnvironment(env?: Partial<EnvironmentInfo>): EnvironmentInfo {
    return {
      operatingSystem: env?.operatingSystem || 'unknown',
      browser: env?.browser,
      nodeVersion: env?.nodeVersion,
      templateVersion: env?.templateVersion,
      framework: env?.framework,
      additionalInfo: env?.additionalInfo || {}
    };
  }

  /**
   * Calculate SLA for issue
   */
  private async calculateSLA(type: IssueType, severity: IssueSeverity): Promise<SLAStatus> {
    const targets = this.config.sla.responseTargets.find(
      t => t.issueType === type && t.severity === severity
    );

    if (!targets) {
      return {
        responseStatus: 'met',
        resolutionStatus: 'met'
      };
    }

    const now = new Date();
    const responseTarget = new Date(now.getTime() + targets.targetHours * 60 * 60 * 1000);
    
    const resolutionTargets = this.config.sla.resolutionTargets.find(
      t => t.issueType === type && t.severity === severity
    );
    
    const resolutionTarget = resolutionTargets 
      ? new Date(now.getTime() + resolutionTargets.targetHours * 60 * 60 * 1000)
      : undefined;

    return {
      responseTarget,
      resolutionTarget,
      responseStatus: 'met',
      resolutionStatus: 'met',
      timeRemaining: targets.targetHours
    };
  }

  /**
   * Auto-triage issue
   */
  private async autoTriage(issue: Issue): Promise<void> {
    const { autoTriage } = this.config.triage;
    
    for (const algorithm of autoTriage.algorithms) {
      if (!algorithm.enabled) continue;
      
      const result = await this.runTriageAlgorithm(issue, algorithm);
      
      if (result.confidence >= autoTriage.confidenceThreshold) {
        // Apply triage results
        if (result.severity) {
          issue.severity = result.severity;
        }
        if (result.priority) {
          issue.priority = result.priority;
        }
        if (result.assignee) {
          issue.assignee = result.assignee;
        }
        if (result.labels) {
          issue.labels.push(...result.labels);
        }
        
        // Move to triaged state
        await this.transitionIssue(issue.id, WorkflowState.TRIAGE, 'auto-triage', true);
        
        this.emit('issue:auto-triaged', { issueId: issue.id, result });
        return;
      }
    }
    
    // Fallback to human triage if configured
    if (autoTriage.fallbackToHuman) {
      await this.assignToTriageTeam(issue);
    }
  }

  /**
   * Run triage algorithm
   */
  private async runTriageAlgorithm(
    issue: Issue,
    algorithm: TriageAlgorithm
  ): Promise<{
    confidence: number;
    severity?: IssueSeverity;
    priority?: IssuePriority;
    assignee?: IssueUser;
    labels?: string[];
  }> {
    // Mock implementation - real implementation would use ML models or rule engines
    const confidence = Math.random();
    
    switch (algorithm.type) {
      case 'keyword':
        return this.keywordBasedTriage(issue, algorithm.config);
      case 'ml_classification':
        return this.mlBasedTriage(issue, algorithm.config);
      case 'rule_based':
        return this.ruleBasedTriage(issue, algorithm.config);
      default:
        return { confidence: 0 };
    }
  }

  /**
   * Keyword-based triage
   */
  private keywordBasedTriage(
    issue: Issue,
    config: Record<string, any>
  ): Promise<{ confidence: number; severity?: IssueSeverity; labels?: string[] }> {
    const content = `${issue.title} ${issue.description}`.toLowerCase();
    const keywords = config.keywords || {};
    
    let severity: IssueSeverity | undefined;
    const labels: string[] = [];
    
    // Check for critical keywords
    if (content.includes('crash') || content.includes('data loss')) {
      severity = IssueSeverity.CRITICAL;
      labels.push('critical');
    } else if (content.includes('error') || content.includes('broken')) {
      severity = IssueSeverity.HIGH;
      labels.push('bug');
    } else if (content.includes('enhancement') || content.includes('feature')) {
      severity = IssueSeverity.LOW;
      labels.push('enhancement');
    }
    
    const confidence = severity ? 0.8 : 0.3;
    
    return Promise.resolve({ confidence, severity, labels });
  }

  /**
   * ML-based triage
   */
  private mlBasedTriage(
    issue: Issue,
    config: Record<string, any>
  ): Promise<{ confidence: number; severity?: IssueSeverity; priority?: IssuePriority }> {
    // Mock ML prediction
    const confidence = Math.random() * 0.5 + 0.5;
    const severities = Object.values(IssueSeverity);
    const priorities = Object.values(IssuePriority);
    
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    
    return Promise.resolve({ confidence, severity, priority });
  }

  /**
   * Rule-based triage
   */
  private ruleBasedTriage(
    issue: Issue,
    config: Record<string, any>
  ): Promise<{ confidence: number; severity?: IssueSeverity; assignee?: IssueUser }> {
    // Mock rule evaluation
    const confidence = Math.random() * 0.4 + 0.6;
    
    // Example rule: security issues get high severity
    if (issue.type === IssueType.SECURITY) {
      return Promise.resolve({
        confidence,
        severity: IssueSeverity.HIGH
      });
    }
    
    return Promise.resolve({ confidence });
  }

  /**
   * Assign to triage team
   */
  private async assignToTriageTeam(issue: Issue): Promise<void> {
    const { triageTeam } = this.config.triage;
    
    // Find available triage member
    const availableMembers = triageTeam.members.filter(m => m.available);
    
    if (availableMembers.length === 0) {
      // No one available, escalate
      this.emit('triage:no-availability', { issueId: issue.id });
      return;
    }
    
    let assignee: TriageMember;
    
    switch (triageTeam.workloadDistribution) {
      case 'expertise_based':
        assignee = this.selectByExpertise(availableMembers, issue);
        break;
      case 'load_balanced':
        assignee = this.selectByWorkload(availableMembers);
        break;
      default:
        assignee = availableMembers[0]; // Round robin
    }
    
    // Create assignee user object
    issue.assignee = {
      id: assignee.userId,
      username: assignee.userId,
      email: `${assignee.userId}@example.com`,
      name: assignee.userId,
      role: 'triager'
    };
    
    this.emit('issue:assigned', { issueId: issue.id, assigneeId: assignee.userId });
  }

  /**
   * Select triage member by expertise
   */
  private selectByExpertise(members: TriageMember[], issue: Issue): TriageMember {
    // Find members with relevant expertise
    const relevantMembers = members.filter(m => 
      m.expertise.includes(issue.type) || 
      m.expertise.includes(issue.component || '')
    );
    
    return relevantMembers.length > 0 ? relevantMembers[0] : members[0];
  }

  /**
   * Select triage member by workload
   */
  private selectByWorkload(members: TriageMember[]): TriageMember {
    // Mock workload calculation
    return members.sort((a, b) => 
      this.getCurrentWorkload(a.userId) - this.getCurrentWorkload(b.userId)
    )[0];
  }

  /**
   * Get current workload for user
   */
  private getCurrentWorkload(userId: string): number {
    return Array.from(this.issues.values())
      .filter(i => i.assignee?.id === userId && i.status !== IssueStatus.CLOSED)
      .length;
  }

  /**
   * Transition issue state
   */
  public async transitionIssue(
    issueId: string,
    newState: WorkflowState,
    reason?: string,
    automated = false
  ): Promise<void> {
    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    const oldState = issue.workflowState;
    
    // Validate transition
    const workflow = this.getWorkflowForIssue(issue);
    const transition = workflow.transitions.find(
      t => t.from === oldState && t.to === newState
    );
    
    if (!transition) {
      throw new Error(`Invalid transition from ${oldState} to ${newState}`);
    }

    // Update issue
    issue.workflowState = newState;
    issue.updatedAt = new Date();
    
    // Add to state history
    issue.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: new Date(),
      user: issue.assignee?.id || 'system',
      reason,
      automated
    });
    
    // Update status based on workflow state
    this.updateStatusFromWorkflowState(issue, newState);
    
    // Execute transition actions
    for (const action of transition.actions) {
      await this.executeTransitionAction(issue, action);
    }
    
    this.emit('issue:transitioned', { 
      issueId, 
      from: oldState, 
      to: newState, 
      automated 
    });
  }

  /**
   * Get workflow for issue
   */
  private getWorkflowForIssue(issue: Issue): WorkflowConfiguration {
    const workflow = this.config.workflows.find(w => w.issueType === issue.type);
    if (!workflow) {
      throw new Error(`No workflow found for issue type ${issue.type}`);
    }
    return workflow;
  }

  /**
   * Update status from workflow state
   */
  private updateStatusFromWorkflowState(issue: Issue, state: WorkflowState): void {
    switch (state) {
      case WorkflowState.INTAKE:
        issue.status = IssueStatus.SUBMITTED;
        break;
      case WorkflowState.TRIAGE:
        issue.status = IssueStatus.TRIAGED;
        break;
      case WorkflowState.PLANNING:
        issue.status = IssueStatus.ACCEPTED;
        break;
      case WorkflowState.DEVELOPMENT:
        issue.status = IssueStatus.IN_PROGRESS;
        break;
      case WorkflowState.TESTING:
        issue.status = IssueStatus.TESTING;
        break;
      case WorkflowState.CLOSURE:
        issue.status = IssueStatus.RESOLVED;
        break;
    }
  }

  /**
   * Execute transition action
   */
  private async executeTransitionAction(
    issue: Issue,
    action: TransitionAction
  ): Promise<void> {
    switch (action.type) {
      case 'set_field':
        this.setIssueField(issue, action.config);
        break;
      case 'notify':
        await this.sendNotification(issue, action.config);
        break;
      case 'assign':
        await this.assignIssue(issue, action.config);
        break;
      case 'escalate':
        await this.escalateIssue(issue, action.config);
        break;
      case 'trigger_webhook':
        await this.triggerWebhook(issue, action.config);
        break;
    }
  }

  /**
   * Set issue field
   */
  private setIssueField(issue: Issue, config: Record<string, any>): void {
    for (const [field, value] of Object.entries(config)) {
      if (field in issue) {
        (issue as any)[field] = value;
      }
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(issue: Issue, config: Record<string, any>): Promise<void> {
    this.emit('notification:send', {
      issueId: issue.id,
      type: config.type,
      recipients: config.recipients,
      message: config.message
    });
  }

  /**
   * Assign issue
   */
  private async assignIssue(issue: Issue, config: Record<string, any>): Promise<void> {
    if (config.assigneeId) {
      issue.assignee = {
        id: config.assigneeId,
        username: config.assigneeId,
        email: `${config.assigneeId}@example.com`,
        name: config.assigneeId,
        role: 'developer'
      };
    }
  }

  /**
   * Escalate issue
   */
  private async escalateIssue(issue: Issue, config: Record<string, any>): Promise<void> {
    // Increase priority
    const priorities = Object.values(IssuePriority);
    const currentIndex = priorities.indexOf(issue.priority);
    if (currentIndex > 0) {
      issue.priority = priorities[currentIndex - 1];
    }
    
    this.emit('issue:escalated', { issueId: issue.id, newPriority: issue.priority });
  }

  /**
   * Trigger webhook
   */
  private async triggerWebhook(issue: Issue, config: Record<string, any>): Promise<void> {
    this.emit('webhook:trigger', {
      url: config.url,
      method: config.method || 'POST',
      payload: {
        issue,
        event: 'transition',
        timestamp: new Date()
      }
    });
  }

  /**
   * Apply automation rules
   */
  private async applyAutomationRules(issue: Issue, event: string): Promise<void> {
    const { automation } = this.config;
    
    // Auto-labeling
    if (automation.autoLabeling.enabled) {
      await this.applyAutoLabeling(issue);
    }
    
    // Auto-assignment
    if (automation.autoAssignment.enabled && !issue.assignee) {
      await this.applyAutoAssignment(issue);
    }
  }

  /**
   * Apply auto-labeling
   */
  private async applyAutoLabeling(issue: Issue): Promise<void> {
    const { autoLabeling } = this.config.automation;
    
    for (const rule of autoLabeling.rules) {
      if (this.evaluateConditions(issue, rule.conditions)) {
        issue.labels.push(...rule.labels);
      }
    }
    
    // Remove duplicates
    issue.labels = [...new Set(issue.labels)];
  }

  /**
   * Apply auto-assignment
   */
  private async applyAutoAssignment(issue: Issue): Promise<void> {
    const { autoAssignment } = this.config.automation;
    
    for (const rule of autoAssignment.rules) {
      if (this.evaluateConditions(issue, rule.conditions)) {
        issue.assignee = {
          id: rule.assignee,
          username: rule.assignee,
          email: `${rule.assignee}@example.com`,
          name: rule.assignee,
          role: 'developer'
        };
        break;
      }
    }
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(issue: Issue, conditions: Record<string, any>): boolean {
    // Mock condition evaluation
    return Math.random() > 0.5;
  }

  /**
   * Comment on issue
   */
  public async addComment(
    issueId: string,
    author: IssueUser,
    content: string,
    type: 'comment' | 'solution' | 'workaround' | 'question' = 'comment'
  ): Promise<string> {
    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    const commentId = this.generateCommentId();
    const comment: IssueComment = {
      id: commentId,
      author,
      content,
      timestamp: new Date(),
      edited: false,
      type,
      helpful: false,
      helpfulVotes: 0
    };

    issue.comments.push(comment);
    issue.updatedAt = new Date();

    this.emit('issue:commented', { issueId, commentId, comment });
    
    return commentId;
  }

  /**
   * Vote on issue
   */
  public async voteOnIssue(
    issueId: string,
    userId: string,
    type: 'upvote' | 'downvote'
  ): Promise<void> {
    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    // Remove existing vote from this user
    issue.votes = issue.votes.filter(v => v.userId !== userId);
    
    // Add new vote
    issue.votes.push({
      userId,
      type,
      timestamp: new Date()
    });

    this.emit('issue:voted', { issueId, userId, type });
  }

  /**
   * Search issues
   */
  public searchIssues(criteria: IssueSearchCriteria): Issue[] {
    let results = Array.from(this.issues.values());

    // Apply filters
    if (criteria.type) {
      results = results.filter(i => i.type === criteria.type);
    }
    
    if (criteria.status) {
      results = results.filter(i => i.status === criteria.status);
    }
    
    if (criteria.severity) {
      results = results.filter(i => i.severity === criteria.severity);
    }
    
    if (criteria.priority) {
      results = results.filter(i => i.priority === criteria.priority);
    }
    
    if (criteria.assignee) {
      results = results.filter(i => i.assignee?.id === criteria.assignee);
    }
    
    if (criteria.reporter) {
      results = results.filter(i => i.reporter.id === criteria.reporter);
    }
    
    if (criteria.labels && criteria.labels.length > 0) {
      results = results.filter(i => 
        criteria.labels!.every(label => i.labels.includes(label))
      );
    }
    
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      results = results.filter(i => 
        i.title.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query)
      );
    }
    
    // Apply date filters
    if (criteria.createdAfter) {
      results = results.filter(i => i.createdAt >= criteria.createdAfter!);
    }
    
    if (criteria.createdBefore) {
      results = results.filter(i => i.createdAt <= criteria.createdBefore!);
    }

    // Sort results
    if (criteria.sortBy) {
      results.sort((a, b) => {
        const aValue = (a as any)[criteria.sortBy!];
        const bValue = (b as any)[criteria.sortBy!];
        
        if (criteria.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    } else {
      // Default sort by creation date, newest first
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Apply pagination
    if (criteria.offset) {
      results = results.slice(criteria.offset);
    }
    
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Get issue by ID
   */
  public getIssue(issueId: string): Issue | undefined {
    return this.issues.get(issueId);
  }

  /**
   * Get issue statistics
   */
  public getStatistics(): IssueStatistics {
    const allIssues = Array.from(this.issues.values());
    
    const byType = new Map<IssueType, number>();
    const byStatus = new Map<IssueStatus, number>();
    const bySeverity = new Map<IssueSeverity, number>();
    const byPriority = new Map<IssuePriority, number>();

    let totalTriageTime = 0;
    let totalResolveTime = 0;
    let triageCount = 0;
    let resolveCount = 0;
    let slaBreaches = 0;

    for (const issue of allIssues) {
      // Count by categories
      byType.set(issue.type, (byType.get(issue.type) || 0) + 1);
      byStatus.set(issue.status, (byStatus.get(issue.status) || 0) + 1);
      bySeverity.set(issue.severity, (bySeverity.get(issue.severity) || 0) + 1);
      byPriority.set(issue.priority, (byPriority.get(issue.priority) || 0) + 1);
      
      // Calculate time metrics
      if (issue.timeToTriage) {
        totalTriageTime += issue.timeToTriage;
        triageCount++;
      }
      
      if (issue.timeToResolve) {
        totalResolveTime += issue.timeToResolve;
        resolveCount++;
      }
      
      // Count SLA breaches
      slaBreaches += issue.slaBreaches.length;
    }

    const resolvedCount = allIssues.filter(i => 
      i.status === IssueStatus.RESOLVED || i.status === IssueStatus.CLOSED
    ).length;

    return {
      total: allIssues.length,
      byType,
      byStatus,
      bySeverity,
      byPriority,
      averageTimeToTriage: triageCount > 0 ? totalTriageTime / triageCount : 0,
      averageTimeToResolve: resolveCount > 0 ? totalResolveTime / resolveCount : 0,
      resolutionRate: allIssues.length > 0 ? resolvedCount / allIssues.length * 100 : 0,
      creationTrend: this.calculateCreationTrend(),
      resolutionTrend: this.calculateResolutionTrend(),
      slaCompliance: this.calculateSLACompliance(),
      slaBreaches
    };
  }

  /**
   * Calculate creation trend
   */
  private calculateCreationTrend(): TrendData[] {
    const trend: TrendData[] = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const count = Array.from(this.issues.values())
        .filter(issue => {
          const issueDate = new Date(issue.createdAt);
          return issueDate.toDateString() === date.toDateString();
        }).length;
      
      trend.push({ date, count });
    }
    
    return trend;
  }

  /**
   * Calculate resolution trend
   */
  private calculateResolutionTrend(): TrendData[] {
    const trend: TrendData[] = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const count = Array.from(this.issues.values())
        .filter(issue => {
          if (!issue.resolvedAt) return false;
          const resolvedDate = new Date(issue.resolvedAt);
          return resolvedDate.toDateString() === date.toDateString();
        }).length;
      
      trend.push({ date, count });
    }
    
    return trend;
  }

  /**
   * Calculate SLA compliance
   */
  private calculateSLACompliance(): number {
    const allIssues = Array.from(this.issues.values());
    const issuesWithSLA = allIssues.filter(i => i.slaStatus.responseTarget);
    
    if (issuesWithSLA.length === 0) return 100;
    
    const compliantIssues = issuesWithSLA.filter(i => 
      i.slaStatus.responseStatus === 'met' && i.slaStatus.resolutionStatus === 'met'
    );
    
    return (compliantIssues.length / issuesWithSLA.length) * 100;
  }

  private generateIssueId(): string {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get triage queue
   */
  public getTriageQueue(): Issue[] {
    return this.triageQueue
      .map(id => this.issues.get(id))
      .filter(issue => issue !== undefined) as Issue[];
  }

  /**
   * Get issues by assignee
   */
  public getIssuesByAssignee(assigneeId: string): Issue[] {
    return Array.from(this.issues.values())
      .filter(i => i.assignee?.id === assigneeId);
  }

  /**
   * Get issues by reporter
   */
  public getIssuesByReporter(reporterId: string): Issue[] {
    return Array.from(this.issues.values())
      .filter(i => i.reporter.id === reporterId);
  }
}