/**
 * @fileoverview Community Forum System - Epic 6 Story 6 AC4
 * Community forums and discussion spaces with threading, moderation, and engagement features
 */

import { EventEmitter } from 'events';

/**
 * Forum categories
 */
export enum ForumCategory {
  GENERAL = 'general',
  ANNOUNCEMENTS = 'announcements',
  HELP_SUPPORT = 'help_support',
  FEATURE_REQUESTS = 'feature_requests',
  BUG_REPORTS = 'bug_reports',
  SHOWCASE = 'showcase',
  TUTORIALS = 'tutorials',
  DEVELOPMENT = 'development',
  TEMPLATES = 'templates',
  FEEDBACK = 'feedback',
  OFF_TOPIC = 'off_topic'
}

/**
 * Discussion types
 */
export enum DiscussionType {
  QUESTION = 'question',
  DISCUSSION = 'discussion',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll',
  TUTORIAL = 'tutorial',
  SHOWCASE = 'showcase',
  FEEDBACK = 'feedback',
  IDEA = 'idea'
}

/**
 * Post status
 */
export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
  LOCKED = 'locked',
  ARCHIVED = 'archived'
}

/**
 * User roles in forum
 */
export enum ForumRole {
  MEMBER = 'member',
  TRUSTED_MEMBER = 'trusted_member',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  GUEST = 'guest'
}

/**
 * Moderation actions
 */
export enum ModerationAction {
  WARN = 'warn',
  HIDE_POST = 'hide_post',
  LOCK_DISCUSSION = 'lock_discussion',
  DELETE_POST = 'delete_post',
  MOVE_DISCUSSION = 'move_discussion',
  PIN_DISCUSSION = 'pin_discussion',
  UNPIN_DISCUSSION = 'unpin_discussion',
  FEATURE_DISCUSSION = 'feature_discussion',
  BAN_USER = 'ban_user',
  SUSPEND_USER = 'suspend_user'
}

/**
 * Reaction types
 */
export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  LAUGH = 'laugh',
  CONFUSED = 'confused',
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
  CELEBRATE = 'celebrate',
  ROCKET = 'rocket'
}

/**
 * Forum system configuration
 */
export interface ForumSystemConfig {
  // Categories configuration
  categories: CategoryConfiguration[];
  
  // User permissions
  permissions: PermissionConfiguration;
  
  // Moderation settings
  moderation: ModerationConfiguration;
  
  // Gamification
  gamification: GamificationConfiguration;
  
  // Search and discovery
  search: SearchConfiguration;
  
  // Notifications
  notifications: NotificationConfiguration;
  
  // Content filtering
  contentFiltering: ContentFilteringConfiguration;
  
  // Analytics
  analytics: AnalyticsConfiguration;
}

/**
 * Category configuration
 */
export interface CategoryConfiguration {
  id: string;
  name: string;
  description: string;
  category: ForumCategory;
  color: string;
  icon: string;
  
  // Access control
  readPermissions: string[];
  writePermissions: string[];
  moderatePermissions: string[];
  
  // Settings
  allowedTypes: DiscussionType[];
  requireApproval: boolean;
  allowAnonymous: boolean;
  
  // Moderation
  autoModeration: boolean;
  moderators: string[];
  
  // Display
  displayOrder: number;
  featured: boolean;
  archived: boolean;
  
  // Metrics
  discussionCount: number;
  postCount: number;
  lastActivity?: Date;
}

/**
 * Permission configuration
 */
export interface PermissionConfiguration {
  // Global permissions
  globalPermissions: GlobalPermission[];
  
  // Role permissions
  rolePermissions: Map<ForumRole, RolePermission>;
  
  // Category permissions
  categoryPermissions: Map<string, CategoryPermission>;
  
  // User permissions
  userPermissions: Map<string, UserPermission>;
}

/**
 * Global permission
 */
export interface GlobalPermission {
  action: string;
  roles: ForumRole[];
  conditions?: PermissionCondition[];
}

/**
 * Role permission
 */
export interface RolePermission {
  role: ForumRole;
  permissions: string[];
  restrictions: string[];
  limits: PermissionLimit[];
}

/**
 * Category permission
 */
export interface CategoryPermission {
  categoryId: string;
  read: string[];
  write: string[];
  moderate: string[];
  admin: string[];
}

/**
 * User permission
 */
export interface UserPermission {
  userId: string;
  granted: string[];
  denied: string[];
  temporary: TemporaryPermission[];
}

/**
 * Permission condition
 */
export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

/**
 * Permission limit
 */
export interface PermissionLimit {
  action: string;
  count: number;
  period: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Temporary permission
 */
export interface TemporaryPermission {
  permission: string;
  expiresAt: Date;
  reason: string;
}

/**
 * Moderation configuration
 */
export interface ModerationConfiguration {
  // Auto-moderation
  autoModeration: AutoModerationConfig;
  
  // Human moderation
  humanModeration: HumanModerationConfig;
  
  // Report system
  reportSystem: ReportSystemConfig;
  
  // Content policies
  contentPolicies: ContentPolicy[];
}

/**
 * Auto-moderation configuration
 */
export interface AutoModerationConfig {
  enabled: boolean;
  rules: ModerationRule[];
  actions: AutoModerationAction[];
  thresholds: ModerationThreshold[];
}

/**
 * Moderation rule
 */
export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  conditions: ModerationCondition[];
  action: ModerationAction;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

/**
 * Moderation condition
 */
export interface ModerationCondition {
  type: 'content' | 'user' | 'context' | 'metadata';
  field: string;
  operator: string;
  value: any;
}

/**
 * Auto-moderation action
 */
export interface AutoModerationAction {
  trigger: string;
  action: ModerationAction;
  config: Record<string, any>;
  requiresReview: boolean;
}

/**
 * Moderation threshold
 */
export interface ModerationThreshold {
  metric: string;
  threshold: number;
  action: ModerationAction;
  notifyModerators: boolean;
}

/**
 * Human moderation configuration
 */
export interface HumanModerationConfig {
  enabled: boolean;
  moderationQueue: ModerationQueueConfig;
  escalation: EscalationConfig;
  appeals: AppealConfig;
}

/**
 * Moderation queue configuration
 */
export interface ModerationQueueConfig {
  prioritization: 'severity' | 'age' | 'reports' | 'user-reputation';
  batchSize: number;
  reviewTimeLimit: number; // hours
  autoEscalation: boolean;
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
  triggers: EscalationTrigger[];
}

/**
 * Escalation level
 */
export interface EscalationLevel {
  level: number;
  roles: ForumRole[];
  timeoutHours: number;
  actions: string[];
}

/**
 * Escalation trigger
 */
export interface EscalationTrigger {
  condition: string;
  targetLevel: number;
  automatic: boolean;
}

/**
 * Appeal configuration
 */
export interface AppealConfig {
  enabled: boolean;
  timeLimit: number; // days
  reviewers: string[];
  autoRestore: boolean;
}

/**
 * Report system configuration
 */
export interface ReportSystemConfig {
  enabled: boolean;
  reasons: ReportReason[];
  anonymousReports: boolean;
  reportThreshold: number;
  autoActions: ReportAction[];
}

/**
 * Report reason
 */
export interface ReportReason {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  requiresDetails: boolean;
}

/**
 * Report action
 */
export interface ReportAction {
  reportCount: number;
  action: ModerationAction;
  automatic: boolean;
}

/**
 * Content policy
 */
export interface ContentPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  violations: PolicyViolation[];
}

/**
 * Policy rule
 */
export interface PolicyRule {
  rule: string;
  description: string;
  examples: string[];
  severity: 'minor' | 'major' | 'severe';
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  action: ModerationAction;
  points: number;
  duration?: number; // days
}

/**
 * Gamification configuration
 */
export interface GamificationConfiguration {
  enabled: boolean;
  reputation: ReputationConfig;
  badges: BadgeConfig[];
  achievements: AchievementConfig[];
  leaderboards: LeaderboardConfig[];
}

/**
 * Reputation configuration
 */
export interface ReputationConfig {
  enabled: boolean;
  actions: ReputationAction[];
  limits: ReputationLimit[];
  display: ReputationDisplay;
}

/**
 * Reputation action
 */
export interface ReputationAction {
  action: string;
  points: number;
  cooldown?: number; // minutes
  dailyLimit?: number;
}

/**
 * Reputation limit
 */
export interface ReputationLimit {
  action: string;
  minReputation: number;
  maxPerDay?: number;
}

/**
 * Reputation display
 */
export interface ReputationDisplay {
  showScore: boolean;
  showLevel: boolean;
  levels: ReputationLevel[];
}

/**
 * Reputation level
 */
export interface ReputationLevel {
  threshold: number;
  name: string;
  color: string;
  privileges: string[];
}

/**
 * Badge configuration
 */
export interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: BadgeCriteria;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  stackable: boolean;
}

/**
 * Badge criteria
 */
export interface BadgeCriteria {
  conditions: Record<string, any>;
  thresholds: Record<string, number>;
  timeframe?: 'day' | 'week' | 'month' | 'year' | 'all-time';
}

/**
 * Achievement configuration
 */
export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  points: number;
  criteria: AchievementCriteria;
  hidden: boolean;
}

/**
 * Achievement criteria
 */
export interface AchievementCriteria {
  type: 'single' | 'cumulative' | 'streak' | 'milestone';
  conditions: Record<string, any>;
  target: number;
}

/**
 * Leaderboard configuration
 */
export interface LeaderboardConfig {
  id: string;
  name: string;
  metric: string;
  timeframe: 'day' | 'week' | 'month' | 'year' | 'all-time';
  size: number;
  public: boolean;
  categories: string[];
}

/**
 * Search configuration
 */
export interface SearchConfiguration {
  enabled: boolean;
  indexing: IndexingConfig;
  features: SearchFeature[];
  filters: SearchFilter[];
  suggestions: SuggestionConfig;
}

/**
 * Indexing configuration
 */
export interface IndexingConfig {
  realTime: boolean;
  batchSize: number;
  fields: IndexedField[];
  stopWords: string[];
  stemming: boolean;
}

/**
 * Indexed field
 */
export interface IndexedField {
  field: string;
  weight: number;
  searchable: boolean;
  faceted: boolean;
}

/**
 * Search feature
 */
export interface SearchFeature {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Search filter
 */
export interface SearchFilter {
  field: string;
  type: 'text' | 'select' | 'date' | 'range';
  options?: string[];
  defaultValue?: any;
}

/**
 * Suggestion configuration
 */
export interface SuggestionConfig {
  enabled: boolean;
  minQueryLength: number;
  maxSuggestions: number;
  sources: string[];
}

/**
 * Notification configuration
 */
export interface NotificationConfiguration {
  channels: NotificationChannel[];
  rules: NotificationRule[];
  preferences: NotificationPreference[];
  digests: DigestConfig[];
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  id: string;
  type: 'email' | 'push' | 'in_app' | 'webhook';
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
  type: 'author' | 'participants' | 'followers' | 'moderators' | 'role' | 'user';
  identifier?: string;
}

/**
 * Notification preference
 */
export interface NotificationPreference {
  userId: string;
  preferences: UserNotificationPreference[];
}

/**
 * User notification preference
 */
export interface UserNotificationPreference {
  event: string;
  channels: string[];
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

/**
 * Digest configuration
 */
export interface DigestConfig {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  content: DigestContent[];
  recipients: string[];
}

/**
 * Digest content
 */
export interface DigestContent {
  section: string;
  source: string;
  limit: number;
  criteria: Record<string, any>;
}

/**
 * Content filtering configuration
 */
export interface ContentFilteringConfiguration {
  profanityFilter: ProfanityFilterConfig;
  spamDetection: SpamDetectionConfig;
  duplicateDetection: DuplicateDetectionConfig;
  qualityFilters: QualityFilterConfig[];
}

/**
 * Profanity filter configuration
 */
export interface ProfanityFilterConfig {
  enabled: boolean;
  strictness: 'low' | 'medium' | 'high';
  customWords: string[];
  whitelist: string[];
  action: 'warn' | 'block' | 'moderate';
}

/**
 * Spam detection configuration
 */
export interface SpamDetectionConfig {
  enabled: boolean;
  algorithms: SpamAlgorithm[];
  thresholds: SpamThreshold[];
  actions: SpamAction[];
}

/**
 * Spam algorithm
 */
export interface SpamAlgorithm {
  name: string;
  enabled: boolean;
  weight: number;
  config: Record<string, any>;
}

/**
 * Spam threshold
 */
export interface SpamThreshold {
  score: number;
  action: 'flag' | 'moderate' | 'block';
  notifyModerators: boolean;
}

/**
 * Spam action
 */
export interface SpamAction {
  trigger: string;
  action: ModerationAction;
  automatic: boolean;
}

/**
 * Duplicate detection configuration
 */
export interface DuplicateDetectionConfig {
  enabled: boolean;
  similarity: number; // 0-1
  timeWindow: number; // hours
  action: 'warn' | 'suggest' | 'block';
}

/**
 * Quality filter configuration
 */
export interface QualityFilterConfig {
  name: string;
  enabled: boolean;
  criteria: QualityCriteria[];
  action: 'warn' | 'suggest' | 'require_improvement';
}

/**
 * Quality criteria
 */
export interface QualityCriteria {
  metric: string;
  threshold: number;
  weight: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfiguration {
  enabled: boolean;
  metrics: AnalyticsMetric[];
  reporting: ReportingConfig;
  privacy: PrivacyConfig;
}

/**
 * Analytics metric
 */
export interface AnalyticsMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  dimensions: string[];
  enabled: boolean;
}

/**
 * Reporting configuration
 */
export interface ReportingConfig {
  scheduledReports: ScheduledReport[];
  dashboards: Dashboard[];
  exports: ExportConfig[];
}

/**
 * Scheduled report
 */
export interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  sections: string[];
}

/**
 * Dashboard
 */
export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  public: boolean;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  config: Record<string, any>;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'json' | 'csv' | 'xml';
  frequency: 'realtime' | 'daily' | 'weekly';
  destination: string;
}

/**
 * Privacy configuration
 */
export interface PrivacyConfig {
  anonymizeData: boolean;
  retentionDays: number;
  consentRequired: boolean;
  optOut: boolean;
}

/**
 * Forum user
 */
export interface ForumUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  
  // Forum-specific data
  role: ForumRole;
  reputation: number;
  badges: UserBadge[];
  achievements: UserAchievement[];
  
  // Activity
  joinedAt: Date;
  lastActive: Date;
  postCount: number;
  discussionCount: number;
  
  // Moderation
  warnings: Warning[];
  suspensions: Suspension[];
  banned: boolean;
  
  // Preferences
  preferences: UserPreferences;
  
  // Stats
  stats: UserStats;
}

/**
 * User badge
 */
export interface UserBadge {
  badgeId: string;
  earnedAt: Date;
  count: number;
}

/**
 * User achievement
 */
export interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress: number;
}

/**
 * Warning
 */
export interface Warning {
  id: string;
  reason: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt?: Date;
  acknowledged: boolean;
}

/**
 * Suspension
 */
export interface Suspension {
  id: string;
  reason: string;
  issuedBy: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
}

/**
 * User preferences
 */
export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
  showEmail: boolean;
  showOnlineStatus: boolean;
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * User statistics
 */
export interface UserStats {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  helpfulAnswers: number;
  bestAnswers: number;
  streak: number;
  longestStreak: number;
}

/**
 * Discussion
 */
export interface Discussion {
  id: string;
  title: string;
  slug: string;
  type: DiscussionType;
  categoryId: string;
  
  // Content
  content: string;
  excerpt: string;
  tags: string[];
  
  // Author
  author: ForumUser;
  
  // Status
  status: PostStatus;
  locked: boolean;
  pinned: boolean;
  featured: boolean;
  solved: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastPostAt: Date;
  
  // Metrics
  viewCount: number;
  postCount: number;
  participantCount: number;
  
  // Engagement
  reactions: Reaction[];
  bookmarks: Bookmark[];
  
  // Moderation
  reportCount: number;
  moderationFlags: ModerationFlag[];
  
  // Metadata
  metadata: DiscussionMetadata;
  
  // Related content
  relatedDiscussions: string[];
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * Post
 */
export interface Post {
  id: string;
  discussionId: string;
  parentId?: string; // For threading
  
  // Content
  content: string;
  rawContent: string;
  contentType: 'markdown' | 'html' | 'text';
  
  // Author
  author: ForumUser;
  
  // Status
  status: PostStatus;
  edited: boolean;
  editReason?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  
  // Hierarchy
  level: number;
  childCount: number;
  
  // Engagement
  reactions: Reaction[];
  helpful: boolean;
  solution: boolean;
  
  // Moderation
  reportCount: number;
  moderationFlags: ModerationFlag[];
  
  // Attachments
  attachments: Attachment[];
  
  // Mentions
  mentions: Mention[];
}

/**
 * Reaction
 */
export interface Reaction {
  id: string;
  type: ReactionType;
  userId: string;
  createdAt: Date;
}

/**
 * Bookmark
 */
export interface Bookmark {
  id: string;
  userId: string;
  createdAt: Date;
  notes?: string;
}

/**
 * Moderation flag
 */
export interface ModerationFlag {
  id: string;
  reason: string;
  reportedBy: string;
  reportedAt: Date;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

/**
 * Discussion metadata
 */
export interface DiscussionMetadata {
  templateId?: string;
  templateVersion?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: number;
  language?: string;
  codeSnippets?: CodeSnippet[];
}

/**
 * Code snippet
 */
export interface CodeSnippet {
  id: string;
  language: string;
  code: string;
  filename?: string;
  highlighted: boolean;
}

/**
 * Attachment
 */
export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
  thumbnail?: string;
}

/**
 * Mention
 */
export interface Mention {
  id: string;
  userId: string;
  username: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Search result
 */
export interface SearchResult {
  discussions: DiscussionSearchResult[];
  posts: PostSearchResult[];
  users: UserSearchResult[];
  total: number;
  took: number; // milliseconds
  facets: SearchFacet[];
}

/**
 * Discussion search result
 */
export interface DiscussionSearchResult {
  discussion: Discussion;
  score: number;
  highlights: SearchHighlight[];
}

/**
 * Post search result
 */
export interface PostSearchResult {
  post: Post;
  discussion: Discussion;
  score: number;
  highlights: SearchHighlight[];
}

/**
 * User search result
 */
export interface UserSearchResult {
  user: ForumUser;
  score: number;
  highlights: SearchHighlight[];
}

/**
 * Search highlight
 */
export interface SearchHighlight {
  field: string;
  fragments: string[];
}

/**
 * Search facet
 */
export interface SearchFacet {
  field: string;
  values: SearchFacetValue[];
}

/**
 * Search facet value
 */
export interface SearchFacetValue {
  value: string;
  count: number;
  selected: boolean;
}

/**
 * Forum statistics
 */
export interface ForumStatistics {
  discussions: number;
  posts: number;
  users: number;
  categories: number;
  
  // Activity
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  
  // Engagement
  averagePostsPerDiscussion: number;
  averageResponseTime: number; // hours
  solutionRate: number; // percentage
  
  // Growth
  newUsersToday: number;
  newDiscussionsToday: number;
  newPostsToday: number;
  
  // Top categories
  topCategories: CategoryStats[];
  
  // Recent activity
  recentActivity: ActivityEvent[];
}

/**
 * Category statistics
 */
export interface CategoryStats {
  categoryId: string;
  name: string;
  discussions: number;
  posts: number;
  participants: number;
  growth: number; // percentage
}

/**
 * Activity event
 */
export interface ActivityEvent {
  type: 'discussion_created' | 'post_created' | 'user_joined' | 'solution_marked';
  timestamp: Date;
  actor: ForumUser;
  target?: any;
  metadata: Record<string, any>;
}

/**
 * Forum System
 */
export class ForumSystem extends EventEmitter {
  private config: ForumSystemConfig;
  private discussions: Map<string, Discussion> = new Map();
  private posts: Map<string, Post> = new Map();
  private users: Map<string, ForumUser> = new Map();
  private categories: Map<string, CategoryConfiguration> = new Map();

  constructor(config: ForumSystemConfig) {
    super();
    this.config = config;
    this.initializeCategories();
  }

  /**
   * Initialize categories
   */
  private initializeCategories(): void {
    for (const category of this.config.categories) {
      this.categories.set(category.id, category);
    }
  }

  /**
   * Create a new discussion
   */
  public async createDiscussion(
    title: string,
    content: string,
    type: DiscussionType,
    categoryId: string,
    author: ForumUser,
    options: {
      tags?: string[];
      metadata?: Partial<DiscussionMetadata>;
      seoTitle?: string;
      seoDescription?: string;
    } = {}
  ): Promise<Discussion> {
    const discussionId = this.generateDiscussionId();
    
    // Validate permissions
    await this.validatePermissions(author, 'create_discussion', categoryId);
    
    // Validate content
    const validation = await this.validateContent(content, author);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    // Create discussion
    const discussion: Discussion = {
      id: discussionId,
      title: title.trim(),
      slug: this.generateSlug(title),
      type,
      categoryId,
      content,
      excerpt: this.generateExcerpt(content),
      tags: options.tags || [],
      author,
      status: PostStatus.PUBLISHED,
      locked: false,
      pinned: false,
      featured: false,
      solved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastPostAt: new Date(),
      viewCount: 0,
      postCount: 1,
      participantCount: 1,
      reactions: [],
      bookmarks: [],
      reportCount: 0,
      moderationFlags: [],
      metadata: options.metadata || {},
      relatedDiscussions: [],
      seoTitle: options.seoTitle,
      seoDescription: options.seoDescription
    };

    this.discussions.set(discussionId, discussion);

    // Create initial post
    await this.createPost(discussionId, content, author);

    // Update category stats
    await this.updateCategoryStats(categoryId);

    // Update user stats
    await this.updateUserStats(author.id, 'discussion_created');

    // Apply gamification
    await this.applyGamification(author.id, 'create_discussion');

    this.emit('discussion:created', { discussionId, discussion });

    return discussion;
  }

  /**
   * Create a new post
   */
  public async createPost(
    discussionId: string,
    content: string,
    author: ForumUser,
    parentId?: string
  ): Promise<Post> {
    const discussion = this.discussions.get(discussionId);
    if (!discussion) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    if (discussion.locked) {
      throw new Error('Discussion is locked');
    }

    // Validate permissions
    await this.validatePermissions(author, 'create_post', discussion.categoryId);

    // Validate content
    const validation = await this.validateContent(content, author);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    const postId = this.generatePostId();
    const level = parentId ? this.calculatePostLevel(parentId) + 1 : 0;

    const post: Post = {
      id: postId,
      discussionId,
      parentId,
      content,
      rawContent: content,
      contentType: 'markdown',
      author,
      status: PostStatus.PUBLISHED,
      edited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      level,
      childCount: 0,
      reactions: [],
      helpful: false,
      solution: false,
      reportCount: 0,
      moderationFlags: [],
      attachments: [],
      mentions: this.extractMentions(content)
    };

    this.posts.set(postId, post);

    // Update discussion stats
    discussion.postCount++;
    discussion.lastPostAt = new Date();
    discussion.updatedAt = new Date();

    // Update participant count
    const participants = new Set([discussion.author.id]);
    for (const p of this.getDiscussionPosts(discussionId)) {
      participants.add(p.author.id);
    }
    discussion.participantCount = participants.size;

    // Update parent post child count
    if (parentId) {
      const parentPost = this.posts.get(parentId);
      if (parentPost) {
        parentPost.childCount++;
      }
    }

    // Update user stats
    await this.updateUserStats(author.id, 'post_created');

    // Apply gamification
    await this.applyGamification(author.id, 'create_post');

    // Send notifications
    await this.sendNotifications('post_created', { post, discussion });

    this.emit('post:created', { postId, post, discussionId });

    return post;
  }

  /**
   * Validate user permissions
   */
  private async validatePermissions(
    user: ForumUser,
    action: string,
    categoryId?: string
  ): Promise<void> {
    // Check global permissions
    const globalPerms = this.config.permissions.globalPermissions
      .filter(p => p.action === action);

    for (const perm of globalPerms) {
      if (perm.roles.includes(user.role)) {
        // Check conditions if any
        if (perm.conditions) {
          const conditionsMet = this.evaluatePermissionConditions(user, perm.conditions);
          if (!conditionsMet) {
            throw new Error(`Permission denied: conditions not met for ${action}`);
          }
        }
        return; // Permission granted
      }
    }

    // Check category permissions if applicable
    if (categoryId) {
      const categoryPerms = this.config.permissions.categoryPermissions.get(categoryId);
      if (categoryPerms) {
        const hasPermission = this.checkCategoryPermission(user, action, categoryPerms);
        if (hasPermission) {
          return;
        }
      }
    }

    throw new Error(`Permission denied: ${action}`);
  }

  /**
   * Check category permission
   */
  private checkCategoryPermission(
    user: ForumUser,
    action: string,
    categoryPerms: CategoryPermission
  ): boolean {
    switch (action) {
      case 'create_discussion':
      case 'create_post':
        return categoryPerms.write.includes(user.id) || 
               categoryPerms.write.includes(user.role);
      case 'moderate':
        return categoryPerms.moderate.includes(user.id) || 
               categoryPerms.moderate.includes(user.role);
      default:
        return categoryPerms.read.includes(user.id) || 
               categoryPerms.read.includes(user.role);
    }
  }

  /**
   * Evaluate permission conditions
   */
  private evaluatePermissionConditions(
    user: ForumUser,
    conditions: PermissionCondition[]
  ): boolean {
    for (const condition of conditions) {
      const userValue = (user as any)[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          if (userValue !== condition.value) return false;
          break;
        case 'not_equals':
          if (userValue === condition.value) return false;
          break;
        case 'greater_than':
          if (userValue <= condition.value) return false;
          break;
        case 'less_than':
          if (userValue >= condition.value) return false;
          break;
        case 'contains':
          if (!userValue || !userValue.includes(condition.value)) return false;
          break;
      }
    }
    return true;
  }

  /**
   * Validate content
   */
  private async validateContent(
    content: string,
    author: ForumUser
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!content || content.trim().length === 0) {
      errors.push('Content cannot be empty');
    }

    if (content.length > 50000) {
      errors.push('Content is too long (max 50,000 characters)');
    }

    // Profanity filter
    if (this.config.contentFiltering.profanityFilter.enabled) {
      const profanityCheck = this.checkProfanity(content);
      if (profanityCheck.hasProfanity) {
        errors.push('Content contains inappropriate language');
      }
    }

    // Spam detection
    if (this.config.contentFiltering.spamDetection.enabled) {
      const spamCheck = await this.checkSpam(content, author);
      if (spamCheck.isSpam) {
        errors.push('Content appears to be spam');
      }
    }

    // Quality filters
    for (const filter of this.config.contentFiltering.qualityFilters) {
      if (!filter.enabled) continue;
      
      const qualityCheck = this.checkQuality(content, filter);
      if (!qualityCheck.passed) {
        errors.push(`Content quality issue: ${qualityCheck.reason}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for profanity
   */
  private checkProfanity(content: string): { hasProfanity: boolean; words: string[] } {
    const { profanityFilter } = this.config.contentFiltering;
    const words = content.toLowerCase().split(/\s+/);
    const profanityWords: string[] = [];

    for (const word of words) {
      if (profanityFilter.customWords.includes(word)) {
        if (!profanityFilter.whitelist.includes(word)) {
          profanityWords.push(word);
        }
      }
    }

    return {
      hasProfanity: profanityWords.length > 0,
      words: profanityWords
    };
  }

  /**
   * Check for spam
   */
  private async checkSpam(
    content: string,
    author: ForumUser
  ): Promise<{ isSpam: boolean; score: number; reasons: string[] }> {
    let totalScore = 0;
    const reasons: string[] = [];

    // Simple heuristics
    const repeatedChars = /(.)\1{10,}/.test(content);
    const allCaps = content.toUpperCase() === content && content.length > 20;
    const tooManyLinks = (content.match(/https?:\/\//g) || []).length > 5;
    const lowReputation = author.reputation < 10;

    if (repeatedChars) {
      totalScore += 0.3;
      reasons.push('Repeated characters detected');
    }
    
    if (allCaps) {
      totalScore += 0.2;
      reasons.push('Excessive capitalization');
    }
    
    if (tooManyLinks) {
      totalScore += 0.4;
      reasons.push('Too many links');
    }
    
    if (lowReputation) {
      totalScore += 0.1;
      reasons.push('Low user reputation');
    }

    const threshold = 0.7;
    return {
      isSpam: totalScore >= threshold,
      score: totalScore,
      reasons
    };
  }

  /**
   * Check content quality
   */
  private checkQuality(
    content: string,
    filter: QualityFilterConfig
  ): { passed: boolean; reason?: string } {
    let score = 0;

    for (const criteria of filter.criteria) {
      let value = 0;
      
      switch (criteria.metric) {
        case 'length':
          value = content.length;
          break;
        case 'word_count':
          value = content.split(/\s+/).length;
          break;
        case 'sentence_count':
          value = content.split(/[.!?]+/).length;
          break;
        case 'readability':
          value = this.calculateReadability(content);
          break;
      }

      if (value >= criteria.threshold) {
        score += criteria.weight;
      }
    }

    const passed = score >= 0.7; // Require 70% quality score
    return {
      passed,
      reason: passed ? undefined : `Quality score ${score.toFixed(2)} below threshold`
    };
  }

  /**
   * Calculate readability score
   */
  private calculateReadability(content: string): number {
    // Simple readability calculation (mock)
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const syllables = this.countSyllables(content);

    // Flesch Reading Ease approximation
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in text
   */
  private countSyllables(text: string): number {
    // Simple syllable counting (mock)
    return text.toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiouy]+/g, 'a').length;
  }

  /**
   * Generate slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string, maxLength = 200): string {
    const plainText = content.replace(/[#*`_~\[\]()]/g, '').trim();
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Calculate post level in thread
   */
  private calculatePostLevel(parentId: string): number {
    const parent = this.posts.get(parentId);
    return parent ? parent.level : 0;
  }

  /**
   * Extract mentions from content
   */
  private extractMentions(content: string): Mention[] {
    const mentions: Mention[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({
        id: this.generateMentionId(),
        userId: match[1], // Would need to resolve username to ID
        username: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    return mentions;
  }

  /**
   * Update category statistics
   */
  private async updateCategoryStats(categoryId: string): Promise<void> {
    const category = this.categories.get(categoryId);
    if (!category) return;

    category.discussionCount++;
    category.lastActivity = new Date();
  }

  /**
   * Update user statistics
   */
  private async updateUserStats(userId: string, action: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    switch (action) {
      case 'discussion_created':
        user.discussionCount++;
        break;
      case 'post_created':
        user.postCount++;
        break;
    }

    user.lastActive = new Date();
  }

  /**
   * Apply gamification rewards
   */
  private async applyGamification(userId: string, action: string): Promise<void> {
    if (!this.config.gamification.enabled) return;

    const user = this.users.get(userId);
    if (!user) return;

    // Apply reputation points
    const reputationAction = this.config.gamification.reputation.actions
      .find(a => a.action === action);
    
    if (reputationAction) {
      user.reputation += reputationAction.points;
      this.emit('user:reputation-changed', { userId, change: reputationAction.points });
    }

    // Check for badge achievements
    await this.checkBadgeAchievements(user);

    // Check for achievements
    await this.checkAchievements(user);
  }

  /**
   * Check badge achievements
   */
  private async checkBadgeAchievements(user: ForumUser): Promise<void> {
    for (const badgeConfig of this.config.gamification.badges) {
      const hasEarned = user.badges.some(b => b.badgeId === badgeConfig.id);
      if (hasEarned && !badgeConfig.stackable) continue;

      const meetsRequirements = this.evaluateBadgeCriteria(user, badgeConfig.criteria);
      if (meetsRequirements) {
        this.awardBadge(user, badgeConfig.id);
      }
    }
  }

  /**
   * Evaluate badge criteria
   */
  private evaluateBadgeCriteria(user: ForumUser, criteria: BadgeCriteria): boolean {
    // Mock evaluation - real implementation would check various criteria
    return Math.random() > 0.8; // 20% chance for demo
  }

  /**
   * Award badge to user
   */
  private awardBadge(user: ForumUser, badgeId: string): void {
    const existingBadge = user.badges.find(b => b.badgeId === badgeId);
    
    if (existingBadge) {
      existingBadge.count++;
    } else {
      user.badges.push({
        badgeId,
        earnedAt: new Date(),
        count: 1
      });
    }

    this.emit('user:badge-earned', { userId: user.id, badgeId });
  }

  /**
   * Check achievements
   */
  private async checkAchievements(user: ForumUser): Promise<void> {
    for (const achievementConfig of this.config.gamification.achievements) {
      const existing = user.achievements.find(a => a.achievementId === achievementConfig.id);
      if (existing && existing.progress >= 100) continue;

      const progress = this.calculateAchievementProgress(user, achievementConfig.criteria);
      
      if (!existing) {
        user.achievements.push({
          achievementId: achievementConfig.id,
          unlockedAt: progress >= 100 ? new Date() : new Date(0),
          progress
        });
      } else {
        existing.progress = progress;
        if (progress >= 100 && existing.unlockedAt.getTime() === 0) {
          existing.unlockedAt = new Date();
          this.emit('user:achievement-unlocked', { userId: user.id, achievementId: achievementConfig.id });
        }
      }
    }
  }

  /**
   * Calculate achievement progress
   */
  private calculateAchievementProgress(user: ForumUser, criteria: AchievementCriteria): number {
    // Mock calculation
    return Math.min(100, (user.postCount * 10) % 101);
  }

  /**
   * Send notifications
   */
  private async sendNotifications(event: string, data: any): Promise<void> {
    const rules = this.config.notifications.rules.filter(r => r.event === event && r.enabled);
    
    for (const rule of rules) {
      const conditionsMet = this.evaluateNotificationConditions(data, rule.conditions);
      if (!conditionsMet) continue;

      for (const recipient of rule.recipients) {
        const users = this.resolveNotificationRecipients(recipient, data);
        
        for (const user of users) {
          this.emit('notification:send', {
            event,
            userId: user.id,
            channels: rule.channels,
            template: rule.template,
            data
          });
        }
      }
    }
  }

  /**
   * Evaluate notification conditions
   */
  private evaluateNotificationConditions(data: any, conditions: Record<string, any>): boolean {
    // Mock evaluation
    return true;
  }

  /**
   * Resolve notification recipients
   */
  private resolveNotificationRecipients(
    recipient: NotificationRecipient,
    data: any
  ): ForumUser[] {
    const users: ForumUser[] = [];

    switch (recipient.type) {
      case 'author':
        if (data.discussion) {
          users.push(data.discussion.author);
        }
        break;
      case 'participants':
        if (data.discussionId) {
          const posts = this.getDiscussionPosts(data.discussionId);
          const participantIds = new Set(posts.map(p => p.author.id));
          for (const userId of participantIds) {
            const user = this.users.get(userId);
            if (user) users.push(user);
          }
        }
        break;
      case 'moderators':
        // Get moderators for the category
        break;
    }

    return users;
  }

  /**
   * React to post
   */
  public async reactToPost(
    postId: string,
    userId: string,
    reactionType: ReactionType
  ): Promise<void> {
    const post = this.posts.get(postId);
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Remove existing reaction from this user
    post.reactions = post.reactions.filter(r => r.userId !== userId);

    // Add new reaction
    post.reactions.push({
      id: this.generateReactionId(),
      type: reactionType,
      userId,
      createdAt: new Date()
    });

    this.emit('post:reacted', { postId, userId, reactionType });
  }

  /**
   * Mark post as solution
   */
  public async markAsSolution(
    postId: string,
    discussionId: string,
    markerId: string
  ): Promise<void> {
    const post = this.posts.get(postId);
    const discussion = this.discussions.get(discussionId);
    
    if (!post || !discussion) {
      throw new Error('Post or discussion not found');
    }

    // Check permissions (discussion author or moderator)
    const user = this.users.get(markerId);
    if (!user) {
      throw new Error('User not found');
    }

    const canMark = discussion.author.id === markerId || 
                   user.role === ForumRole.MODERATOR || 
                   user.role === ForumRole.ADMIN;
    
    if (!canMark) {
      throw new Error('Permission denied');
    }

    // Unmark all other solutions in this discussion
    for (const p of this.getDiscussionPosts(discussionId)) {
      p.solution = false;
    }

    // Mark this post as solution
    post.solution = true;
    discussion.solved = true;

    // Award reputation to solution author
    const solutionAuthor = this.users.get(post.author.id);
    if (solutionAuthor) {
      solutionAuthor.reputation += 15; // Solution bonus
      solutionAuthor.stats.bestAnswers++;
    }

    this.emit('post:marked-as-solution', { postId, discussionId, markerId });
  }

  /**
   * Search forum content
   */
  public async search(
    query: string,
    filters: {
      categories?: string[];
      types?: DiscussionType[];
      authors?: string[];
      dateRange?: { start: Date; end: Date };
      tags?: string[];
      solved?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Search discussions
    let discussions = Array.from(this.discussions.values());
    
    // Apply query filter
    if (query) {
      const queryLower = query.toLowerCase();
      discussions = discussions.filter(d => 
        d.title.toLowerCase().includes(queryLower) ||
        d.content.toLowerCase().includes(queryLower) ||
        d.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    // Apply filters
    if (filters.categories) {
      discussions = discussions.filter(d => filters.categories!.includes(d.categoryId));
    }
    
    if (filters.types) {
      discussions = discussions.filter(d => filters.types!.includes(d.type));
    }
    
    if (filters.authors) {
      discussions = discussions.filter(d => filters.authors!.includes(d.author.id));
    }
    
    if (filters.solved !== undefined) {
      discussions = discussions.filter(d => d.solved === filters.solved);
    }
    
    if (filters.tags) {
      discussions = discussions.filter(d => 
        filters.tags!.some(tag => d.tags.includes(tag))
      );
    }

    // Sort by relevance (mock scoring)
    const discussionResults = discussions.map(discussion => ({
      discussion,
      score: this.calculateRelevanceScore(discussion, query),
      highlights: this.generateHighlights(discussion, query)
    })).sort((a, b) => b.score - a.score);

    // Search posts
    let posts = Array.from(this.posts.values());
    
    if (query) {
      const queryLower = query.toLowerCase();
      posts = posts.filter(p => p.content.toLowerCase().includes(queryLower));
    }

    const postResults = posts.map(post => ({
      post,
      discussion: this.discussions.get(post.discussionId)!,
      score: this.calculatePostRelevanceScore(post, query),
      highlights: this.generatePostHighlights(post, query)
    })).sort((a, b) => b.score - a.score);

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    
    const paginatedDiscussions = discussionResults.slice(offset, offset + limit);
    const paginatedPosts = postResults.slice(offset, offset + limit);

    const took = Date.now() - startTime;

    return {
      discussions: paginatedDiscussions,
      posts: paginatedPosts,
      users: [], // Would implement user search
      total: discussionResults.length + postResults.length,
      took,
      facets: this.generateSearchFacets(discussions, posts)
    };
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(discussion: Discussion, query: string): number {
    if (!query) return 1;
    
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Title match (highest weight)
    if (discussion.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Content match
    if (discussion.content.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Tag match
    if (discussion.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      score += 3;
    }
    
    // Boost based on engagement
    score += Math.log(discussion.viewCount + 1) * 0.1;
    score += Math.log(discussion.postCount + 1) * 0.2;
    
    return score;
  }

  /**
   * Calculate post relevance score
   */
  private calculatePostRelevanceScore(post: Post, query: string): number {
    if (!query) return 1;
    
    const queryLower = query.toLowerCase();
    let score = 0;
    
    if (post.content.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    if (post.solution) {
      score += 3; // Boost solutions
    }
    
    if (post.helpful) {
      score += 2; // Boost helpful posts
    }
    
    return score;
  }

  /**
   * Generate search highlights
   */
  private generateHighlights(discussion: Discussion, query: string): SearchHighlight[] {
    if (!query) return [];
    
    const highlights: SearchHighlight[] = [];
    const queryLower = query.toLowerCase();
    
    // Title highlights
    if (discussion.title.toLowerCase().includes(queryLower)) {
      highlights.push({
        field: 'title',
        fragments: [this.highlightText(discussion.title, query)]
      });
    }
    
    // Content highlights
    if (discussion.content.toLowerCase().includes(queryLower)) {
      highlights.push({
        field: 'content',
        fragments: [this.highlightText(discussion.content, query, 200)]
      });
    }
    
    return highlights;
  }

  /**
   * Generate post highlights
   */
  private generatePostHighlights(post: Post, query: string): SearchHighlight[] {
    if (!query) return [];
    
    const highlights: SearchHighlight[] = [];
    
    if (post.content.toLowerCase().includes(query.toLowerCase())) {
      highlights.push({
        field: 'content',
        fragments: [this.highlightText(post.content, query, 200)]
      });
    }
    
    return highlights;
  }

  /**
   * Highlight text with query
   */
  private highlightText(text: string, query: string, maxLength?: number): string {
    if (maxLength && text.length > maxLength) {
      const queryIndex = text.toLowerCase().indexOf(query.toLowerCase());
      if (queryIndex !== -1) {
        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(text.length, queryIndex + query.length + 50);
        text = '...' + text.substring(start, end) + '...';
      } else {
        text = text.substring(0, maxLength) + '...';
      }
    }
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Generate search facets
   */
  private generateSearchFacets(discussions: Discussion[], posts: Post[]): SearchFacet[] {
    const facets: SearchFacet[] = [];
    
    // Category facet
    const categoryCount = new Map<string, number>();
    for (const discussion of discussions) {
      const category = this.categories.get(discussion.categoryId);
      if (category) {
        categoryCount.set(category.name, (categoryCount.get(category.name) || 0) + 1);
      }
    }
    
    facets.push({
      field: 'category',
      values: Array.from(categoryCount.entries()).map(([value, count]) => ({
        value,
        count,
        selected: false
      }))
    });
    
    return facets;
  }

  /**
   * Get discussion posts
   */
  public getDiscussionPosts(discussionId: string): Post[] {
    return Array.from(this.posts.values())
      .filter(p => p.discussionId === discussionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get forum statistics
   */
  public getStatistics(): ForumStatistics {
    const allDiscussions = Array.from(this.discussions.values());
    const allPosts = Array.from(this.posts.values());
    const allUsers = Array.from(this.users.values());

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActiveUsers = allUsers.filter(u => u.lastActive >= today).length;
    const weeklyActiveUsers = allUsers.filter(u => u.lastActive >= weekAgo).length;
    const monthlyActiveUsers = allUsers.filter(u => u.lastActive >= monthAgo).length;

    const newUsersToday = allUsers.filter(u => u.joinedAt >= today).length;
    const newDiscussionsToday = allDiscussions.filter(d => d.createdAt >= today).length;
    const newPostsToday = allPosts.filter(p => p.createdAt >= today).length;

    const totalPosts = allPosts.length;
    const totalDiscussions = allDiscussions.length;
    const averagePostsPerDiscussion = totalDiscussions > 0 ? totalPosts / totalDiscussions : 0;

    const solvedDiscussions = allDiscussions.filter(d => d.solved).length;
    const solutionRate = totalDiscussions > 0 ? (solvedDiscussions / totalDiscussions) * 100 : 0;

    // Calculate top categories
    const categoryStats = new Map<string, CategoryStats>();
    for (const discussion of allDiscussions) {
      const category = this.categories.get(discussion.categoryId);
      if (category) {
        const stats = categoryStats.get(discussion.categoryId) || {
          categoryId: discussion.categoryId,
          name: category.name,
          discussions: 0,
          posts: 0,
          participants: new Set(),
          growth: 0
        };
        
        stats.discussions++;
        stats.participants.add(discussion.author.id);
        
        // Count posts in this category
        const discussionPosts = allPosts.filter(p => p.discussionId === discussion.id);
        stats.posts += discussionPosts.length;
        discussionPosts.forEach(p => stats.participants.add(p.author.id));
        
        categoryStats.set(discussion.categoryId, {
          ...stats,
          participants: stats.participants.size
        } as CategoryStats);
      }
    }

    const topCategories = Array.from(categoryStats.values())
      .sort((a, b) => b.discussions - a.discussions)
      .slice(0, 5);

    return {
      discussions: totalDiscussions,
      posts: totalPosts,
      users: allUsers.length,
      categories: this.categories.size,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      averagePostsPerDiscussion,
      averageResponseTime: 2.5, // Mock value
      solutionRate,
      newUsersToday,
      newDiscussionsToday,
      newPostsToday,
      topCategories,
      recentActivity: [] // Would implement activity tracking
    };
  }

  private generateDiscussionId(): string {
    return `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePostId(): string {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReactionId(): string {
    return `react_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMentionId(): string {
    return `mention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get discussion by ID
   */
  public getDiscussion(discussionId: string): Discussion | undefined {
    return this.discussions.get(discussionId);
  }

  /**
   * Get post by ID
   */
  public getPost(postId: string): Post | undefined {
    return this.posts.get(postId);
  }

  /**
   * Get user by ID
   */
  public getUser(userId: string): ForumUser | undefined {
    return this.users.get(userId);
  }

  /**
   * Register a new user
   */
  public registerUser(user: ForumUser): void {
    this.users.set(user.id, user);
    this.emit('user:registered', { userId: user.id });
  }

  /**
   * Get discussions by category
   */
  public getDiscussionsByCategory(categoryId: string): Discussion[] {
    return Array.from(this.discussions.values())
      .filter(d => d.categoryId === categoryId)
      .sort((a, b) => b.lastPostAt.getTime() - a.lastPostAt.getTime());
  }

  /**
   * Get trending discussions
   */
  public getTrendingDiscussions(limit = 10): Discussion[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    return Array.from(this.discussions.values())
      .filter(d => now - d.createdAt.getTime() < 7 * dayMs) // Last 7 days
      .sort((a, b) => {
        // Simple trending score: views + posts * 2
        const scoreA = a.viewCount + a.postCount * 2;
        const scoreB = b.viewCount + b.postCount * 2;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get recent discussions
   */
  public getRecentDiscussions(limit = 10): Discussion[] {
    return Array.from(this.discussions.values())
      .sort((a, b) => b.lastPostAt.getTime() - a.lastPostAt.getTime())
      .slice(0, limit);
  }
}