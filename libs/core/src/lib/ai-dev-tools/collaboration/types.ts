/**
 * @fileoverview Team Collaboration Types
 * Comprehensive type definitions for team collaboration and RBAC system
 */

// ============================================================================
// Core User and Team Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  lastSeen: number;
  createdAt: number;
  updatedAt: number;
  preferences: UserPreferences;
  profile: UserProfile;
}

export interface UserProfile {
  bio?: string;
  location?: string;
  timezone: string;
  language: string;
  skills: string[];
  experience: ExperienceLevel;
  socialLinks: Record<string, string>;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'auto';
  codeStyle: CodeStylePreferences;
  collaboration: CollaborationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  mentions: boolean;
  comments: boolean;
  reviews: boolean;
  projectUpdates: boolean;
  securityAlerts: boolean;
}

export interface CodeStylePreferences {
  indentSize: number;
  indentType: 'spaces' | 'tabs';
  lineLength: number;
  formatter: string;
  linter: string;
}

export interface CollaborationPreferences {
  autoAssignReviews: boolean;
  allowDirectMessages: boolean;
  shareActivity: boolean;
  showOnlineStatus: boolean;
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// ============================================================================
// Team and Organization Types
// ============================================================================

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  organizationId: string;
  ownerId: string;
  members: TeamMember[];
  settings: TeamSettings;
  stats: TeamStats;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  userId: string;
  role: TeamRole;
  permissions: Permission[];
  joinedAt: number;
  invitedBy: string;
  status: MemberStatus;
}

export interface TeamSettings {
  visibility: TeamVisibility;
  joinPolicy: JoinPolicy;
  defaultRole: TeamRole;
  allowGuestAccess: boolean;
  requireApproval: boolean;
  maxMembers: number;
  features: TeamFeature[];
}

export interface TeamStats {
  memberCount: number;
  projectCount: number;
  totalSessions: number;
  totalCost: number;
  averageSessionDuration: number;
  lastActivity: number;
}

export type TeamVisibility = 'public' | 'internal' | 'private';
export type JoinPolicy = 'open' | 'invite_only' | 'request_to_join';
export type MemberStatus = 'active' | 'inactive' | 'pending_invitation' | 'pending_approval';

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  description: string;
  logo?: string;
  website?: string;
  plan: SubscriptionPlan;
  settings: OrganizationSettings;
  billing: BillingInfo;
  createdAt: number;
  updatedAt: number;
}

export interface OrganizationSettings {
  ssoEnabled: boolean;
  ssoProvider?: string;
  enforceSSO: boolean;
  allowPersonalAccounts: boolean;
  requireMFA: boolean;
  sessionTimeout: number;
  auditLogging: boolean;
  dataRetention: number; // days
}

export interface SubscriptionPlan {
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  limits: PlanLimits;
  features: string[];
  price: number;
  billingCycle: 'monthly' | 'yearly';
}

export interface PlanLimits {
  maxUsers: number;
  maxTeams: number;
  maxProjects: number;
  maxStorageGB: number;
  maxAIRequests: number;
  maxCostBudget: number;
}

export interface BillingInfo {
  customerId: string;
  subscriptionId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  trialEnd?: number;
}

// ============================================================================
// RBAC (Role-Based Access Control) Types
// ============================================================================

export interface Role {
  id: string;
  name: string;
  description: string;
  type: RoleType;
  scope: RoleScope;
  permissions: Permission[];
  isSystem: boolean;
  isDefault: boolean;
  organizationId?: string;
  teamId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Permission {
  id: string;
  name: string;
  resource: Resource;
  actions: Action[];
  conditions?: AccessCondition[];
  scope: PermissionScope;
}

export interface AccessCondition {
  type: ConditionType;
  field: string;
  operator: ConditionOperator;
  value: any;
  description: string;
}

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  scope: AssignmentScope;
  resourceId?: string;
  conditions?: AccessCondition[];
  assignedBy: string;
  assignedAt: number;
  expiresAt?: number;
  isActive: boolean;
}

export type RoleType = 'system' | 'organization' | 'team' | 'project' | 'custom';
export type RoleScope = 'global' | 'organization' | 'team' | 'project' | 'resource';
export type PermissionScope = 'global' | 'organization' | 'team' | 'project' | 'resource';
export type AssignmentScope = 'global' | 'organization' | 'team' | 'project';

export type TeamRole = 
  | 'owner'
  | 'admin' 
  | 'maintainer'
  | 'developer'
  | 'reviewer'
  | 'viewer'
  | 'guest';

export type SystemRole = 
  | 'super_admin'
  | 'org_admin'
  | 'org_member'
  | 'support'
  | 'billing_admin';

export type Resource = 
  | 'user'
  | 'team'
  | 'organization'
  | 'project'
  | 'template'
  | 'session'
  | 'cost'
  | 'analytics'
  | 'settings'
  | 'billing'
  | 'audit'
  | 'integration'
  | 'ai_model'
  | 'workspace';

export type Action = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'invite'
  | 'remove'
  | 'assign'
  | 'unassign'
  | 'approve'
  | 'reject'
  | 'share'
  | 'export'
  | 'import'
  | 'execute'
  | 'review'
  | 'comment'
  | 'moderate';

export type ConditionType = 
  | 'time_based'
  | 'location_based'
  | 'resource_based'
  | 'attribute_based'
  | 'dynamic';

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'regex';

// ============================================================================
// Project and Workspace Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  teamId: string;
  ownerId: string;
  collaborators: ProjectCollaborator[];
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  resources: ProjectResource[];
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
}

export interface ProjectCollaborator {
  userId: string;
  role: ProjectRole;
  permissions: Permission[];
  accessLevel: AccessLevel;
  addedBy: string;
  addedAt: number;
  lastActivity: number;
}

export interface ProjectSettings {
  autoSave: boolean;
  versionControl: boolean;
  backupEnabled: boolean;
  shareCode: boolean;
  allowComments: boolean;
  requireReview: boolean;
  cicdEnabled: boolean;
  notifications: ProjectNotificationSettings;
}

export interface ProjectNotificationSettings {
  onCodeChange: boolean;
  onComment: boolean;
  onReview: boolean;
  onError: boolean;
  onCompletion: boolean;
}

export interface ProjectMetadata {
  framework: string[];
  languages: string[];
  tags: string[];
  size: ProjectSize;
  complexity: ProjectComplexity;
  estimatedDuration: number;
  actualDuration?: number;
  costBudget?: number;
  actualCost?: number;
}

export interface ProjectResource {
  id: string;
  type: ResourceType;
  name: string;
  path: string;
  size: number;
  checksum: string;
  version: string;
  lastModified: number;
  modifiedBy: string;
  locked: boolean;
  lockedBy?: string;
}

export type ProjectType = 
  | 'web_app'
  | 'mobile_app'
  | 'desktop_app'
  | 'api'
  | 'library'
  | 'component'
  | 'template'
  | 'documentation'
  | 'experiment';

export type ProjectStatus = 
  | 'draft'
  | 'active'
  | 'in_review'
  | 'completed'
  | 'archived'
  | 'deleted';

export type ProjectVisibility = 'public' | 'internal' | 'private';
export type ProjectRole = 'owner' | 'maintainer' | 'contributor' | 'reviewer' | 'viewer';
export type AccessLevel = 'full' | 'read_write' | 'read_only' | 'comment_only';
export type ProjectSize = 'small' | 'medium' | 'large' | 'enterprise';
export type ProjectComplexity = 'simple' | 'moderate' | 'complex' | 'expert';
export type ResourceType = 'code' | 'config' | 'asset' | 'documentation' | 'test' | 'data';

// ============================================================================
// Collaboration Features Types
// ============================================================================

export interface CollaborationSession {
  id: string;
  projectId: string;
  name: string;
  type: SessionType;
  status: SessionStatus;
  participants: SessionParticipant[];
  host: string;
  settings: SessionSettings;
  resources: SessionResource[];
  startTime: number;
  endTime?: number;
  duration?: number;
  recordings?: SessionRecording[];
}

export interface SessionParticipant {
  userId: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joinedAt: number;
  leftAt?: number;
  permissions: SessionPermission[];
  cursor?: CursorPosition;
  selection?: Selection;
}

export interface SessionSettings {
  allowJoinAnytime: boolean;
  requireApproval: boolean;
  maxParticipants: number;
  recordSession: boolean;
  allowAnonymous: boolean;
  lockResources: boolean;
  shareScreen: boolean;
  voiceChat: boolean;
  videoChat: boolean;
}

export interface SessionResource {
  resourceId: string;
  type: ResourceType;
  permissions: ResourcePermission[];
  lockStatus: LockStatus;
  lockedBy?: string;
  lastModified: number;
}

export interface SessionRecording {
  id: string;
  name: string;
  duration: number;
  size: number;
  format: string;
  url: string;
  thumbnails: string[];
  createdAt: number;
}

export interface CursorPosition {
  file: string;
  line: number;
  column: number;
  timestamp: number;
}

export interface Selection {
  file: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
  text: string;
  timestamp: number;
}

export type SessionType = 
  | 'code_review'
  | 'pair_programming'
  | 'team_meeting'
  | 'demo'
  | 'training'
  | 'planning'
  | 'debug_session';

export type SessionStatus = 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type ParticipantRole = 'host' | 'co_host' | 'presenter' | 'participant' | 'observer';
export type ParticipantStatus = 'joined' | 'left' | 'disconnected' | 'kicked' | 'banned';
export type LockStatus = 'unlocked' | 'soft_lock' | 'hard_lock';

export interface SessionPermission {
  action: SessionAction;
  allowed: boolean;
  conditions?: AccessCondition[];
}

export interface ResourcePermission {
  action: ResourceAction;
  allowed: boolean;
  conditions?: AccessCondition[];
}

export type SessionAction = 
  | 'join'
  | 'leave'
  | 'invite'
  | 'kick'
  | 'mute'
  | 'share_screen'
  | 'record'
  | 'moderate'
  | 'end_session';

export type ResourceAction = 
  | 'view'
  | 'edit'
  | 'comment'
  | 'share'
  | 'download'
  | 'lock'
  | 'unlock'
  | 'version_control';

// ============================================================================
// Communication Types
// ============================================================================

export interface Message {
  id: string;
  type: MessageType;
  content: MessageContent;
  senderId: string;
  recipientId?: string;
  channelId?: string;
  threadId?: string;
  replyToId?: string;
  mentions: string[];
  attachments: Attachment[];
  reactions: Reaction[];
  status: MessageStatus;
  priority: MessagePriority;
  timestamp: number;
  editedAt?: number;
  deletedAt?: number;
}

export interface MessageContent {
  text?: string;
  html?: string;
  markdown?: string;
  code?: CodeBlock;
  media?: MediaContent;
  location?: LocationContent;
  poll?: PollContent;
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  lineNumbers?: boolean;
  highlightedLines?: number[];
}

export interface MediaContent {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnail?: string;
  size: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LocationContent {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

export interface PollContent {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  expiresAt?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  timestamp: number;
}

export type MessageType = 
  | 'text'
  | 'code'
  | 'file'
  | 'image'
  | 'video'
  | 'audio'
  | 'location'
  | 'poll'
  | 'system'
  | 'notification';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Channel {
  id: string;
  name: string;
  description: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  teamId?: string;
  projectId?: string;
  ownerId: string;
  members: ChannelMember[];
  settings: ChannelSettings;
  metadata: ChannelMetadata;
  createdAt: number;
  updatedAt: number;
  lastActivity: number;
}

export interface ChannelMember {
  userId: string;
  role: ChannelRole;
  permissions: Permission[];
  joinedAt: number;
  lastSeen: number;
  notificationSettings: ChannelNotificationSettings;
}

export interface ChannelSettings {
  allowFiles: boolean;
  allowImages: boolean;
  allowLinks: boolean;
  allowMentions: boolean;
  allowReactions: boolean;
  moderationEnabled: boolean;
  slowMode: number; // seconds between messages
  maxMessageLength: number;
  retentionDays: number;
}

export interface ChannelMetadata {
  messageCount: number;
  memberCount: number;
  activeMembers: number;
  averageResponseTime: number;
  tags: string[];
  pinnedMessages: string[];
}

export interface ChannelNotificationSettings {
  mute: boolean;
  mentions: boolean;
  allMessages: boolean;
  keywords: string[];
}

export type ChannelType = 'text' | 'voice' | 'video' | 'announcement' | 'thread';
export type ChannelVisibility = 'public' | 'private' | 'archived';
export type ChannelRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

// ============================================================================
// Review and Feedback Types
// ============================================================================

export interface Review {
  id: string;
  type: ReviewType;
  status: ReviewStatus;
  targetId: string; // project, code, template, etc.
  targetType: ReviewTarget;
  reviewerId: string;
  requesterId: string;
  title: string;
  description: string;
  priority: ReviewPriority;
  criteria: ReviewCriteria[];
  comments: ReviewComment[];
  suggestions: ReviewSuggestion[];
  approvals: ReviewApproval[];
  metadata: ReviewMetadata;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  completedAt?: number;
}

export interface ReviewCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  required: boolean;
  status: CriteriaStatus;
  score?: number;
  maxScore: number;
  comments?: string;
}

export interface ReviewComment {
  id: string;
  authorId: string;
  content: string;
  type: CommentType;
  line?: number;
  file?: string;
  severity: CommentSeverity;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  replies: ReviewComment[];
  attachments: Attachment[];
  timestamp: number;
  editedAt?: number;
}

export interface ReviewSuggestion {
  id: string;
  authorId: string;
  type: SuggestionType;
  title: string;
  description: string;
  implementation: string;
  impact: SuggestionImpact;
  effort: SuggestionEffort;
  status: SuggestionStatus;
  votes: SuggestionVote[];
  comments: ReviewComment[];
  createdAt: number;
  updatedAt: number;
}

export interface ReviewApproval {
  reviewerId: string;
  status: ApprovalStatus;
  timestamp: number;
  comments?: string;
  conditions?: string[];
}

export interface ReviewMetadata {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  complexity: number;
  testCoverage?: number;
  securityScore?: number;
  performanceImpact?: string;
  estimatedReviewTime: number;
  actualReviewTime?: number;
}

export interface SuggestionVote {
  userId: string;
  type: VoteType;
  timestamp: number;
  weight: number;
}

export type ReviewType = 
  | 'code_review'
  | 'design_review'
  | 'security_review'
  | 'performance_review'
  | 'architecture_review'
  | 'documentation_review';

export type ReviewStatus = 'draft' | 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
export type ReviewTarget = 'project' | 'code' | 'template' | 'documentation' | 'design';
export type ReviewPriority = 'low' | 'normal' | 'high' | 'critical';
export type CriteriaStatus = 'pending' | 'passed' | 'failed' | 'skipped';
export type CommentType = 'general' | 'suggestion' | 'issue' | 'question' | 'praise';
export type CommentSeverity = 'info' | 'minor' | 'major' | 'critical' | 'blocking';
export type SuggestionType = 'improvement' | 'optimization' | 'refactor' | 'feature' | 'bug_fix';
export type SuggestionImpact = 'low' | 'medium' | 'high' | 'critical';
export type SuggestionEffort = 'trivial' | 'low' | 'medium' | 'high' | 'complex';
export type SuggestionStatus = 'open' | 'accepted' | 'rejected' | 'implemented' | 'deferred';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'conditional';
export type VoteType = 'up' | 'down' | 'neutral';

// ============================================================================
// Activity and Audit Types
// ============================================================================

export interface Activity {
  id: string;
  type: ActivityType;
  action: string;
  actorId: string;
  targetId?: string;
  targetType?: string;
  objectId?: string;
  objectType?: string;
  description: string;
  metadata: ActivityMetadata;
  context: ActivityContext;
  timestamp: number;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface ActivityMetadata {
  changes?: Change[];
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  affectedResources?: string[];
  metrics?: Record<string, number>;
  tags?: string[];
}

export interface ActivityContext {
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  sessionId?: string;
  source: ActivitySource;
  platform: string;
  version: string;
}

export interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  type: ChangeType;
}

export interface AuditLog {
  id: string;
  event: AuditEvent;
  severity: AuditSeverity;
  category: AuditCategory;
  actor: AuditActor;
  target?: AuditTarget;
  action: string;
  result: AuditResult;
  details: AuditDetails;
  metadata: AuditMetadata;
  timestamp: number;
  retention: RetentionPolicy;
}

export interface AuditActor {
  id: string;
  type: ActorType;
  name: string;
  ip?: string;
  userAgent?: string;
  location?: string;
}

export interface AuditTarget {
  id: string;
  type: string;
  name: string;
  path?: string;
  version?: string;
}

export interface AuditDetails {
  description: string;
  changes?: Change[];
  context?: Record<string, any>;
  riskLevel: RiskLevel;
  compliance?: ComplianceInfo[];
}

export interface AuditMetadata {
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  source: string;
  tags: string[];
  custom?: Record<string, any>;
}

export interface ComplianceInfo {
  framework: string;
  requirement: string;
  status: ComplianceStatus;
  evidence?: string;
}

export interface RetentionPolicy {
  duration: number; // days
  reason: string;
  deleteAfter: number;
  archiveAfter?: number;
}

export type ActivityType = 
  | 'user'
  | 'team'
  | 'project'
  | 'session'
  | 'review'
  | 'collaboration'
  | 'system'
  | 'security'
  | 'billing';

export type ActivitySource = 'web' | 'api' | 'cli' | 'mobile' | 'system' | 'integration';
export type ChangeType = 'create' | 'update' | 'delete' | 'move' | 'rename' | 'permission';
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AuditCategory = 'authentication' | 'authorization' | 'data' | 'system' | 'compliance';
export type ActorType = 'user' | 'service' | 'system' | 'api' | 'integration';
export type AuditResult = 'success' | 'failure' | 'partial' | 'blocked' | 'error';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending' | 'exempt';

// ============================================================================
// Feature Flags and Configuration Types
// ============================================================================

export interface TeamFeature {
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
  restrictions?: FeatureRestriction[];
}

export interface FeatureRestriction {
  type: RestrictionType;
  condition: string;
  value: any;
  message?: string;
}

export type RestrictionType = 'plan' | 'role' | 'permission' | 'usage' | 'time' | 'location';

// ============================================================================
// Integration and Webhook Types
// ============================================================================

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  config: IntegrationConfig;
  credentials: IntegrationCredentials;
  webhooks: Webhook[];
  permissions: IntegrationPermission[];
  organizationId: string;
  teamId?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
}

export interface IntegrationConfig {
  baseUrl?: string;
  apiVersion?: string;
  timeout: number;
  retryAttempts: number;
  batchSize?: number;
  syncInterval?: number;
  mappings?: FieldMapping[];
  filters?: IntegrationFilter[];
}

export interface IntegrationCredentials {
  type: CredentialType;
  data: Record<string, any>;
  encrypted: boolean;
  expiresAt?: number;
  lastRotated?: number;
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  status: WebhookStatus;
  headers?: Record<string, string>;
  retryPolicy: RetryPolicy;
  deliveries: WebhookDelivery[];
  createdAt: number;
  updatedAt: number;
}

export interface WebhookDelivery {
  id: string;
  event: WebhookEvent;
  payload: any;
  response?: WebhookResponse;
  status: DeliveryStatus;
  attempts: number;
  timestamp: number;
  duration?: number;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
  required: boolean;
}

export interface IntegrationFilter {
  field: string;
  operator: string;
  value: any;
  active: boolean;
}

export interface IntegrationPermission {
  scope: string;
  actions: string[];
  granted: boolean;
  grantedAt: number;
  grantedBy: string;
}

export type IntegrationType = 'git' | 'ci_cd' | 'communication' | 'project_management' | 'monitoring';
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'suspended';
export type CredentialType = 'api_key' | 'oauth' | 'basic_auth' | 'certificate' | 'token';
export type WebhookEvent = 
  | 'user.created'
  | 'user.updated'
  | 'team.created'
  | 'project.created'
  | 'session.started'
  | 'session.completed'
  | 'review.created'
  | 'review.completed';
export type WebhookStatus = 'active' | 'inactive' | 'failed' | 'suspended';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';
export type BackoffStrategy = 'linear' | 'exponential' | 'fixed';