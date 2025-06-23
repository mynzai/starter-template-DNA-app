/**
 * @fileoverview Recognition and Incentive System - Epic 6 Story 6 AC5
 * Comprehensive recognition, rewards, and incentive systems for community contributors
 */

import { EventEmitter } from 'events';

/**
 * Recognition types
 */
export enum RecognitionType {
  BADGE = 'badge',
  ACHIEVEMENT = 'achievement',
  CERTIFICATE = 'certificate',
  SPOTLIGHT = 'spotlight',
  HALL_OF_FAME = 'hall_of_fame',
  TITLE = 'title',
  PRIVILEGE = 'privilege',
  REWARD = 'reward'
}

/**
 * Badge rarity levels
 */
export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic'
}

/**
 * Achievement categories
 */
export enum AchievementCategory {
  CONTRIBUTION = 'contribution',
  COMMUNITY = 'community',
  EXPERTISE = 'expertise',
  MILESTONE = 'milestone',
  SPECIAL = 'special',
  LEADERSHIP = 'leadership',
  INNOVATION = 'innovation',
  MENTORSHIP = 'mentorship'
}

/**
 * Reward types
 */
export enum RewardType {
  POINTS = 'points',
  CREDITS = 'credits',
  SUBSCRIPTION = 'subscription',
  MERCHANDISE = 'merchandise',
  ACCESS = 'access',
  FEATURE = 'feature',
  CONSULTATION = 'consultation',
  CERTIFICATION = 'certification'
}

/**
 * Contributor levels
 */
export enum ContributorLevel {
  NEWCOMER = 'newcomer',
  CONTRIBUTOR = 'contributor',
  REGULAR = 'regular',
  TRUSTED = 'trusted',
  EXPERT = 'expert',
  CHAMPION = 'champion',
  LEGEND = 'legend'
}

/**
 * Recognition system configuration
 */
export interface RecognitionSystemConfig {
  // Badge system
  badgeSystem: BadgeSystemConfig;
  
  // Achievement system
  achievementSystem: AchievementSystemConfig;
  
  // Leaderboards
  leaderboards: LeaderboardConfig[];
  
  // Reward system
  rewardSystem: RewardSystemConfig;
  
  // Gamification
  gamification: GamificationConfig;
  
  // Special programs
  specialPrograms: SpecialProgramConfig[];
  
  // Notifications
  notifications: RecognitionNotificationConfig;
  
  // Analytics
  analytics: RecognitionAnalyticsConfig;
}

/**
 * Badge system configuration
 */
export interface BadgeSystemConfig {
  enabled: boolean;
  badges: BadgeDefinition[];
  collections: BadgeCollection[];
  displaySettings: BadgeDisplaySettings;
  verification: BadgeVerificationConfig;
}

/**
 * Badge definition
 */
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  
  // Visual
  icon: string;
  color: string;
  animation?: string;
  rarity: BadgeRarity;
  
  // Earning criteria
  criteria: BadgeCriteria;
  
  // Properties
  stackable: boolean;
  revocable: boolean;
  transferable: boolean;
  timeLimit?: number; // days
  
  // Metadata
  category: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  
  // Stats
  totalAwarded: number;
  activeHolders: number;
  
  // Requirements
  prerequisites: string[];
  exclusiveWith: string[];
}

/**
 * Badge criteria
 */
export interface BadgeCriteria {
  type: 'manual' | 'automatic' | 'nomination' | 'milestone' | 'time_based';
  conditions: CriteriaCondition[];
  verification: CriteriaVerification;
  cooldown?: number; // hours between earning same badge
}

/**
 * Criteria condition
 */
export interface CriteriaCondition {
  metric: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'contains';
  value: any;
  weight: number;
  timeframe?: TimeframeCriteria;
}

/**
 * Timeframe criteria
 */
export interface TimeframeCriteria {
  type: 'all_time' | 'sliding_window' | 'calendar_period' | 'since_date';
  duration?: number; // days for sliding window
  startDate?: Date;
  endDate?: Date;
}

/**
 * Criteria verification
 */
export interface CriteriaVerification {
  required: boolean;
  method: 'automatic' | 'manual' | 'peer' | 'admin';
  evidenceRequired: boolean;
  approvers?: string[];
}

/**
 * Badge collection
 */
export interface BadgeCollection {
  id: string;
  name: string;
  description: string;
  badges: string[];
  rewards: CollectionReward[];
  completionBadge?: string;
}

/**
 * Collection reward
 */
export interface CollectionReward {
  threshold: number; // percentage of collection completed
  rewards: RecognitionReward[];
}

/**
 * Badge display settings
 */
export interface BadgeDisplaySettings {
  profileDisplay: 'all' | 'featured' | 'recent' | 'top_rarity';
  maxDisplayed: number;
  showProgress: boolean;
  showRarity: boolean;
  showStats: boolean;
  animationsEnabled: boolean;
}

/**
 * Badge verification configuration
 */
export interface BadgeVerificationConfig {
  requireVerification: boolean;
  blockchainVerification: boolean;
  cryptographicSigning: boolean;
  auditTrail: boolean;
}

/**
 * Achievement system configuration
 */
export interface AchievementSystemConfig {
  enabled: boolean;
  achievements: AchievementDefinition[];
  progressTracking: ProgressTrackingConfig;
  milestones: MilestoneConfig[];
  challenges: ChallengeConfig[];
}

/**
 * Achievement definition
 */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  
  // Visual
  icon: string;
  color: string;
  banner?: string;
  
  // Earning
  criteria: AchievementCriteria;
  rewards: RecognitionReward[];
  
  // Properties
  hidden: boolean;
  secret: boolean;
  repeatable: boolean;
  
  // Metadata
  points: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  estimatedTime: string;
  
  // Dependencies
  prerequisites: string[];
  unlocks: string[];
  
  // Stats
  completionRate: number;
  averageTime: number; // days to complete
}

/**
 * Achievement criteria
 */
export interface AchievementCriteria {
  type: 'single' | 'cumulative' | 'streak' | 'percentage' | 'ranking';
  conditions: CriteriaCondition[];
  targets: AchievementTarget[];
  timeLimit?: number; // days to complete
}

/**
 * Achievement target
 */
export interface AchievementTarget {
  metric: string;
  target: number;
  current?: number;
  weight: number;
}

/**
 * Progress tracking configuration
 */
export interface ProgressTrackingConfig {
  realTimeUpdates: boolean;
  progressNotifications: boolean;
  milestoneAlerts: boolean;
  streakTracking: boolean;
  historicalData: boolean;
}

/**
 * Milestone configuration
 */
export interface MilestoneConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  thresholds: MilestoneThreshold[];
  rewards: RecognitionReward[];
}

/**
 * Milestone threshold
 */
export interface MilestoneThreshold {
  value: number;
  badge?: string;
  title?: string;
  rewards: RecognitionReward[];
}

/**
 * Challenge configuration
 */
export interface ChallengeConfig {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'team' | 'community';
  
  // Timing
  startDate: Date;
  endDate: Date;
  duration: number; // days
  
  // Participation
  eligibility: EligibilityCriteria;
  maxParticipants?: number;
  teamSize?: number;
  
  // Goals
  objectives: ChallengeObjective[];
  
  // Rewards
  prizes: ChallengePrize[];
  participationRewards: RecognitionReward[];
  
  // Rules
  rules: string[];
  scoring: ScoringConfig;
}

/**
 * Eligibility criteria
 */
export interface EligibilityCriteria {
  minLevel?: ContributorLevel;
  minReputation?: number;
  requiredBadges?: string[];
  excludedUsers?: string[];
  geographicRestrictions?: string[];
}

/**
 * Challenge objective
 */
export interface ChallengeObjective {
  id: string;
  description: string;
  metric: string;
  target: number;
  weight: number;
  bonus?: ObjectiveBonus;
}

/**
 * Objective bonus
 */
export interface ObjectiveBonus {
  threshold: number;
  multiplier: number;
  description: string;
}

/**
 * Challenge prize
 */
export interface ChallengePrize {
  position: number;
  name: string;
  description: string;
  rewards: RecognitionReward[];
  eligibleParticipants: number;
}

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  method: 'points' | 'ranking' | 'completion' | 'time_based';
  weights: Record<string, number>;
  bonuses: ScoringBonus[];
  penalties: ScoringPenalty[];
}

/**
 * Scoring bonus
 */
export interface ScoringBonus {
  condition: string;
  multiplier: number;
  description: string;
}

/**
 * Scoring penalty
 */
export interface ScoringPenalty {
  condition: string;
  penalty: number;
  description: string;
}

/**
 * Leaderboard configuration
 */
export interface LeaderboardConfig {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'category' | 'time_period' | 'challenge';
  
  // Metrics
  primaryMetric: string;
  secondaryMetrics: string[];
  
  // Timeframe
  timeframe: 'all_time' | 'yearly' | 'monthly' | 'weekly' | 'daily';
  refreshInterval: number; // minutes
  
  // Display
  size: number;
  showRankings: boolean;
  showProgress: boolean;
  publiclyVisible: boolean;
  
  // Eligibility
  eligibility: EligibilityCriteria;
  
  // Rewards
  rewards: LeaderboardReward[];
  
  // Categories
  categories: string[];
}

/**
 * Leaderboard reward
 */
export interface LeaderboardReward {
  rankRange: { min: number; max: number };
  rewards: RecognitionReward[];
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

/**
 * Reward system configuration
 */
export interface RewardSystemConfig {
  enabled: boolean;
  rewards: RewardDefinition[];
  redemption: RedemptionConfig;
  economy: EconomyConfig;
  partnerships: PartnershipConfig[];
}

/**
 * Reward definition
 */
export interface RewardDefinition {
  id: string;
  name: string;
  description: string;
  type: RewardType;
  
  // Cost
  cost: RewardCost;
  
  // Availability
  availability: RewardAvailability;
  
  // Fulfillment
  fulfillment: RewardFulfillment;
  
  // Properties
  transferable: boolean;
  stackable: boolean;
  expirable: boolean;
  expirationDays?: number;
  
  // Metadata
  category: string;
  tags: string[];
  popularity: number;
  satisfaction: number;
}

/**
 * Recognition reward
 */
export interface RecognitionReward {
  type: RewardType;
  value: number;
  description: string;
  metadata: Record<string, any>;
}

/**
 * Reward cost
 */
export interface RewardCost {
  points?: number;
  credits?: number;
  badges?: string[];
  level?: ContributorLevel;
  special?: boolean;
}

/**
 * Reward availability
 */
export interface RewardAvailability {
  unlimited: boolean;
  maxTotal?: number;
  maxPerUser?: number;
  maxPerPeriod?: { count: number; period: 'day' | 'week' | 'month' };
  startDate?: Date;
  endDate?: Date;
  eligibility: EligibilityCriteria;
}

/**
 * Reward fulfillment
 */
export interface RewardFulfillment {
  method: 'automatic' | 'manual' | 'external' | 'voucher';
  provider?: string;
  processingTime: string;
  requirements: string[];
  instructions?: string;
}

/**
 * Redemption configuration
 */
export interface RedemptionConfig {
  enabled: boolean;
  processingTime: number; // hours
  approvalRequired: boolean;
  approvers: string[];
  minimumBalance: number;
  cooldownPeriod: number; // hours
}

/**
 * Economy configuration
 */
export interface EconomyConfig {
  pointsSystem: PointsSystemConfig;
  creditsSystem: CreditsSystemConfig;
  exchange: ExchangeConfig;
  inflation: InflationConfig;
}

/**
 * Points system configuration
 */
export interface PointsSystemConfig {
  enabled: boolean;
  earningRates: EarningRate[];
  bonuses: PointsBonus[];
  decay: PointsDecay;
  limits: PointsLimits;
}

/**
 * Earning rate
 */
export interface EarningRate {
  action: string;
  points: number;
  multipliers: PointsMultiplier[];
  cooldown?: number; // minutes
  dailyLimit?: number;
}

/**
 * Points multiplier
 */
export interface PointsMultiplier {
  condition: string;
  multiplier: number;
  description: string;
}

/**
 * Points bonus
 */
export interface PointsBonus {
  event: string;
  bonus: number;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  requirements: string[];
}

/**
 * Points decay
 */
export interface PointsDecay {
  enabled: boolean;
  rate: number; // percentage per period
  period: 'daily' | 'weekly' | 'monthly';
  minimumActivity: number; // days
  exemptions: string[]; // conditions that prevent decay
}

/**
 * Points limits
 */
export interface PointsLimits {
  dailyEarningLimit: number;
  weeklyEarningLimit: number;
  monthlyEarningLimit: number;
  maxBalance: number;
  transferLimit: number;
}

/**
 * Credits system configuration
 */
export interface CreditsSystemConfig {
  enabled: boolean;
  conversionRate: number; // points to credits
  purchaseEnabled: boolean;
  giftingEnabled: boolean;
  expiration: number; // days
}

/**
 * Exchange configuration
 */
export interface ExchangeConfig {
  pointsToCredits: boolean;
  creditsToPoints: boolean;
  exchangeRate: number;
  fees: ExchangeFee[];
  limits: ExchangeLimits;
}

/**
 * Exchange fee
 */
export interface ExchangeFee {
  type: 'percentage' | 'fixed';
  value: number;
  minimum?: number;
  maximum?: number;
}

/**
 * Exchange limits
 */
export interface ExchangeLimits {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  minimumAmount: number;
}

/**
 * Inflation configuration
 */
export interface InflationConfig {
  enabled: boolean;
  rate: number; // percentage per year
  adjustmentFrequency: 'monthly' | 'quarterly' | 'annually';
  targetSupply: number;
}

/**
 * Partnership configuration
 */
export interface PartnershipConfig {
  id: string;
  name: string;
  description: string;
  type: 'sponsor' | 'reward_provider' | 'education' | 'certification';
  
  // Integration
  apiEndpoint?: string;
  authentication: PartnershipAuth;
  
  // Rewards
  rewards: PartnershipReward[];
  
  // Terms
  terms: PartnershipTerms;
  
  // Status
  active: boolean;
  startDate: Date;
  endDate?: Date;
}

/**
 * Partnership authentication
 */
export interface PartnershipAuth {
  type: 'api_key' | 'oauth' | 'webhook' | 'manual';
  credentials: Record<string, string>;
  verificationRequired: boolean;
}

/**
 * Partnership reward
 */
export interface PartnershipReward {
  id: string;
  name: string;
  description: string;
  value: string;
  eligibility: EligibilityCriteria;
  fulfillment: RewardFulfillment;
}

/**
 * Partnership terms
 */
export interface PartnershipTerms {
  maxRedemptions?: number;
  costPerRedemption?: number;
  revenue_share?: number;
  exclusivity?: boolean;
  geographical_restrictions?: string[];
}

/**
 * Gamification configuration
 */
export interface GamificationConfig {
  enabled: boolean;
  levels: LevelConfig[];
  streaks: StreakConfig[];
  quests: QuestConfig[];
  socialFeatures: SocialFeaturesConfig;
}

/**
 * Level configuration
 */
export interface LevelConfig {
  level: number;
  name: string;
  title: string;
  requiredPoints: number;
  requiredReputation: number;
  
  // Rewards
  levelUpRewards: RecognitionReward[];
  privileges: string[];
  
  // Visual
  icon: string;
  color: string;
  badge?: string;
}

/**
 * Streak configuration
 */
export interface StreakConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  
  // Rules
  minimumValue: number;
  resetConditions: string[];
  gracePeriod: number; // days
  
  // Rewards
  milestones: StreakMilestone[];
  
  // Properties
  publiclyVisible: boolean;
  competitiveMode: boolean;
}

/**
 * Streak milestone
 */
export interface StreakMilestone {
  days: number;
  name: string;
  rewards: RecognitionReward[];
  badge?: string;
}

/**
 * Quest configuration
 */
export interface QuestConfig {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special' | 'onboarding';
  
  // Objectives
  objectives: QuestObjective[];
  
  // Rewards
  completionRewards: RecognitionReward[];
  progressRewards: QuestProgressReward[];
  
  // Properties
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  repeatable: boolean;
  
  // Availability
  availability: QuestAvailability;
}

/**
 * Quest objective
 */
export interface QuestObjective {
  id: string;
  description: string;
  metric: string;
  target: number;
  optional: boolean;
  weight: number;
}

/**
 * Quest progress reward
 */
export interface QuestProgressReward {
  progress: number; // percentage
  rewards: RecognitionReward[];
}

/**
 * Quest availability
 */
export interface QuestAvailability {
  startDate?: Date;
  endDate?: Date;
  eligibility: EligibilityCriteria;
  maxCompletions?: number;
  cooldown?: number; // hours
}

/**
 * Social features configuration
 */
export interface SocialFeaturesConfig {
  profileShowcase: ProfileShowcaseConfig;
  socialSharing: SocialSharingConfig;
  mentorship: MentorshipConfig;
  teamChallenges: TeamChallengeConfig;
}

/**
 * Profile showcase configuration
 */
export interface ProfileShowcaseConfig {
  enabled: boolean;
  featuredBadges: number;
  featuredAchievements: number;
  showProgress: boolean;
  showStats: boolean;
  customization: ProfileCustomizationConfig;
}

/**
 * Profile customization configuration
 */
export interface ProfileCustomizationConfig {
  themes: ProfileTheme[];
  banners: ProfileBanner[];
  frames: ProfileFrame[];
  animations: boolean;
}

/**
 * Profile theme
 */
export interface ProfileTheme {
  id: string;
  name: string;
  colors: Record<string, string>;
  unlockRequirement: string;
}

/**
 * Profile banner
 */
export interface ProfileBanner {
  id: string;
  name: string;
  imageUrl: string;
  unlockRequirement: string;
}

/**
 * Profile frame
 */
export interface ProfileFrame {
  id: string;
  name: string;
  frameUrl: string;
  unlockRequirement: string;
}

/**
 * Social sharing configuration
 */
export interface SocialSharingConfig {
  enabled: boolean;
  platforms: string[];
  templates: SharingTemplate[];
  incentives: SharingIncentive[];
}

/**
 * Sharing template
 */
export interface SharingTemplate {
  platform: string;
  event: string;
  template: string;
  hashtags: string[];
}

/**
 * Sharing incentive
 */
export interface SharingIncentive {
  platform: string;
  event: string;
  rewards: RecognitionReward[];
  cooldown: number; // hours
}

/**
 * Mentorship configuration
 */
export interface MentorshipConfig {
  enabled: boolean;
  mentorRequirements: EligibilityCriteria;
  matchingAlgorithm: string;
  rewards: MentorshipReward[];
  program: MentorshipProgram;
}

/**
 * Mentorship reward
 */
export interface MentorshipReward {
  type: 'mentor' | 'mentee' | 'both';
  trigger: string;
  rewards: RecognitionReward[];
}

/**
 * Mentorship program
 */
export interface MentorshipProgram {
  duration: number; // weeks
  checkpoints: MentorshipCheckpoint[];
  graduationRequirements: string[];
  certificate: boolean;
}

/**
 * Mentorship checkpoint
 */
export interface MentorshipCheckpoint {
  week: number;
  name: string;
  requirements: string[];
  rewards: RecognitionReward[];
}

/**
 * Team challenge configuration
 */
export interface TeamChallengeConfig {
  enabled: boolean;
  maxTeamSize: number;
  formationPeriod: number; // days
  challenges: TeamChallengeDefinition[];
}

/**
 * Team challenge definition
 */
export interface TeamChallengeDefinition {
  id: string;
  name: string;
  description: string;
  objectives: ChallengeObjective[];
  rewards: TeamChallengeReward[];
  duration: number; // days
}

/**
 * Team challenge reward
 */
export interface TeamChallengeReward {
  position: number;
  teamRewards: RecognitionReward[];
  individualRewards: RecognitionReward[];
}

/**
 * Special program configuration
 */
export interface SpecialProgramConfig {
  id: string;
  name: string;
  description: string;
  type: 'ambassador' | 'mvp' | 'beta_tester' | 'expert' | 'mentor';
  
  // Selection
  nomination: boolean;
  application: boolean;
  invitation: boolean;
  
  // Requirements
  requirements: ProgramRequirement[];
  
  // Benefits
  benefits: ProgramBenefit[];
  
  // Duration
  duration: number; // months
  renewable: boolean;
  
  // Responsibilities
  responsibilities: string[];
  expectations: string[];
  
  // Evaluation
  evaluation: ProgramEvaluation;
}

/**
 * Program requirement
 */
export interface ProgramRequirement {
  type: 'badge' | 'reputation' | 'activity' | 'nomination' | 'assessment';
  description: string;
  criteria: any;
  mandatory: boolean;
}

/**
 * Program benefit
 */
export interface ProgramBenefit {
  type: 'access' | 'recognition' | 'reward' | 'privilege' | 'networking';
  description: string;
  value: any;
}

/**
 * Program evaluation
 */
export interface ProgramEvaluation {
  frequency: 'monthly' | 'quarterly' | 'annually';
  criteria: EvaluationCriteria[];
  consequences: EvaluationConsequence[];
}

/**
 * Evaluation criteria
 */
export interface EvaluationCriteria {
  metric: string;
  weight: number;
  threshold: number;
  description: string;
}

/**
 * Evaluation consequence
 */
export interface EvaluationConsequence {
  condition: string;
  action: 'continue' | 'warning' | 'probation' | 'removal';
  description: string;
}

/**
 * Recognition notification configuration
 */
export interface RecognitionNotificationConfig {
  channels: RecognitionNotificationChannel[];
  templates: RecognitionNotificationTemplate[];
  rules: RecognitionNotificationRule[];
  preferences: NotificationPreference[];
}

/**
 * Recognition notification channel
 */
export interface RecognitionNotificationChannel {
  id: string;
  type: 'email' | 'push' | 'in_app' | 'social' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Recognition notification template
 */
export interface RecognitionNotificationTemplate {
  id: string;
  event: string;
  channel: string;
  subject: string;
  body: string;
  variables: string[];
}

/**
 * Recognition notification rule
 */
export interface RecognitionNotificationRule {
  event: string;
  conditions: Record<string, any>;
  channels: string[];
  immediate: boolean;
  digest: boolean;
}

/**
 * Notification preference
 */
export interface NotificationPreference {
  userId: string;
  event: string;
  channels: string[];
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

/**
 * Recognition analytics configuration
 */
export interface RecognitionAnalyticsConfig {
  enabled: boolean;
  metrics: AnalyticsMetric[];
  dashboards: AnalyticsDashboard[];
  reports: AnalyticsReport[];
  insights: InsightConfig[];
}

/**
 * Analytics metric
 */
export interface AnalyticsMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'rate';
  dimensions: string[];
  aggregations: string[];
}

/**
 * Analytics dashboard
 */
export interface AnalyticsDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  audience: string[];
  updateFrequency: string;
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'leaderboard';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

/**
 * Analytics report
 */
export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  sections: ReportSection[];
}

/**
 * Report section
 */
export interface ReportSection {
  name: string;
  type: 'summary' | 'trends' | 'top_performers' | 'insights';
  config: Record<string, any>;
}

/**
 * Insight configuration
 */
export interface InsightConfig {
  name: string;
  algorithm: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

/**
 * User recognition profile
 */
export interface UserRecognitionProfile {
  userId: string;
  
  // Progress
  level: ContributorLevel;
  experience: number;
  nextLevelProgress: number;
  
  // Points and credits
  points: number;
  credits: number;
  lifetimePoints: number;
  
  // Recognition items
  badges: UserBadge[];
  achievements: UserAchievement[];
  titles: UserTitle[];
  certificates: UserCertificate[];
  
  // Streaks
  streaks: UserStreak[];
  longestStreaks: UserStreak[];
  
  // Leaderboard positions
  leaderboardPositions: LeaderboardPosition[];
  
  // Special programs
  programs: UserProgram[];
  
  // Statistics
  stats: RecognitionStats;
  
  // Preferences
  preferences: UserRecognitionPreferences;
  
  // History
  recognitionHistory: RecognitionEvent[];
}

/**
 * User badge
 */
export interface UserBadge {
  badgeId: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  earnedAt: Date;
  count: number;
  featured: boolean;
  verified: boolean;
  evidence?: string;
  awardedBy?: string;
}

/**
 * User achievement
 */
export interface UserAchievement {
  achievementId: string;
  name: string;
  description: string;
  category: AchievementCategory;
  points: number;
  unlockedAt: Date;
  progress: number;
  completedAt?: Date;
  timeToComplete?: number; // days
}

/**
 * User title
 */
export interface UserTitle {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  active: boolean;
  expiresAt?: Date;
  source: string;
}

/**
 * User certificate
 */
export interface UserCertificate {
  id: string;
  name: string;
  description: string;
  issuer: string;
  issuedAt: Date;
  expiresAt?: Date;
  verificationUrl: string;
  credentialId: string;
}

/**
 * User streak
 */
export interface UserStreak {
  streakId: string;
  name: string;
  currentStreak: number;
  longestStreak: number;
  lastUpdate: Date;
  milestones: StreakMilestoneProgress[];
  active: boolean;
}

/**
 * Streak milestone progress
 */
export interface StreakMilestoneProgress {
  days: number;
  name: string;
  achieved: boolean;
  achievedAt?: Date;
}

/**
 * Leaderboard position
 */
export interface LeaderboardPosition {
  leaderboardId: string;
  name: string;
  position: number;
  score: number;
  change: number; // position change from last period
  percentile: number;
  category?: string;
}

/**
 * User program
 */
export interface UserProgram {
  programId: string;
  name: string;
  type: string;
  status: 'active' | 'graduated' | 'suspended' | 'terminated';
  joinedAt: Date;
  expiresAt?: Date;
  progress: ProgramProgress;
  benefits: string[];
}

/**
 * Program progress
 */
export interface ProgramProgress {
  completedRequirements: string[];
  pendingRequirements: string[];
  evaluationScore?: number;
  nextReview?: Date;
}

/**
 * Recognition statistics
 */
export interface RecognitionStats {
  totalBadges: number;
  uniqueBadges: number;
  rareestBadge: BadgeRarity;
  
  totalAchievements: number;
  completedAchievements: number;
  achievementCompletion: number; // percentage
  
  totalPoints: number;
  pointsThisMonth: number;
  pointsLastMonth: number;
  
  recognitionRank: number;
  recognitionPercentile: number;
  
  streakRecord: number;
  activeStreaks: number;
  
  leaderboardAppearances: number;
  topPositions: number;
  
  socialShares: number;
  mentorshipSessions: number;
  
  firstRecognition: Date;
  latestRecognition: Date;
  mostActiveMonth: string;
}

/**
 * User recognition preferences
 */
export interface UserRecognitionPreferences {
  profileVisibility: 'public' | 'community' | 'private';
  showcaseBadges: string[];
  showcaseAchievements: string[];
  
  notifications: {
    badgeEarned: boolean;
    achievementUnlocked: boolean;
    levelUp: boolean;
    leaderboardPosition: boolean;
    streakMilestone: boolean;
    challengeInvite: boolean;
    programInvite: boolean;
  };
  
  socialSharing: {
    autoShare: boolean;
    platforms: string[];
    shareTypes: string[];
  };
  
  mentorship: {
    availableAsMentor: boolean;
    lookingForMentor: boolean;
    expertise: string[];
    interests: string[];
  };
}

/**
 * Recognition event
 */
export interface RecognitionEvent {
  id: string;
  type: RecognitionType;
  timestamp: Date;
  
  // Event details
  title: string;
  description: string;
  category: string;
  
  // Recognition item
  itemId: string;
  itemName: string;
  
  // Context
  source: string;
  trigger: string;
  metadata: Record<string, any>;
  
  // Social
  shared: boolean;
  sharedPlatforms: string[];
  reactions: EventReaction[];
  
  // Verification
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

/**
 * Event reaction
 */
export interface EventReaction {
  userId: string;
  type: 'like' | 'celebrate' | 'inspire' | 'wow';
  timestamp: Date;
}

/**
 * Recognition System
 */
export class RecognitionSystem extends EventEmitter {
  private config: RecognitionSystemConfig;
  private userProfiles: Map<string, UserRecognitionProfile> = new Map();
  private badges: Map<string, BadgeDefinition> = new Map();
  private achievements: Map<string, AchievementDefinition> = new Map();
  private leaderboards: Map<string, LeaderboardData> = new Map();
  private activeChallenges: Map<string, ActiveChallenge> = new Map();

  constructor(config: RecognitionSystemConfig) {
    super();
    this.config = config;
    this.initializeSystem();
  }

  /**
   * Initialize recognition system
   */
  private initializeSystem(): void {
    // Initialize badges
    for (const badge of this.config.badgeSystem.badges) {
      this.badges.set(badge.id, badge);
    }

    // Initialize achievements
    for (const achievement of this.config.achievementSystem.achievements) {
      this.achievements.set(achievement.id, achievement);
    }

    // Initialize leaderboards
    for (const leaderboard of this.config.leaderboards) {
      this.leaderboards.set(leaderboard.id, {
        config: leaderboard,
        entries: [],
        lastUpdated: new Date()
      });
    }
  }

  /**
   * Award badge to user
   */
  public async awardBadge(
    userId: string,
    badgeId: string,
    awardedBy?: string,
    evidence?: string
  ): Promise<void> {
    const badge = this.badges.get(badgeId);
    if (!badge) {
      throw new Error(`Badge ${badgeId} not found`);
    }

    const profile = await this.getUserProfile(userId);
    
    // Check if user already has this badge (for non-stackable badges)
    if (!badge.stackable) {
      const existingBadge = profile.badges.find(b => b.badgeId === badgeId);
      if (existingBadge) {
        throw new Error(`User already has badge ${badgeId}`);
      }
    }

    // Verify criteria if required
    if (badge.criteria.verification.required) {
      const verified = await this.verifyBadgeCriteria(userId, badge);
      if (!verified) {
        throw new Error(`Badge criteria not met for ${badgeId}`);
      }
    }

    // Award the badge
    const userBadge: UserBadge = {
      badgeId,
      name: badge.name,
      description: badge.description,
      rarity: badge.rarity,
      earnedAt: new Date(),
      count: 1,
      featured: false,
      verified: badge.criteria.verification.required,
      evidence,
      awardedBy
    };

    // Update existing badge count if stackable
    const existingBadge = profile.badges.find(b => b.badgeId === badgeId);
    if (existingBadge && badge.stackable) {
      existingBadge.count++;
      existingBadge.earnedAt = new Date();
    } else {
      profile.badges.push(userBadge);
    }

    // Update badge statistics
    badge.totalAwarded++;
    badge.activeHolders = this.countBadgeHolders(badgeId);

    // Add to recognition history
    this.addRecognitionEvent(userId, {
      type: RecognitionType.BADGE,
      title: `Earned ${badge.name} Badge`,
      description: badge.description,
      category: badge.category,
      itemId: badgeId,
      itemName: badge.name,
      source: awardedBy || 'system',
      trigger: 'manual'
    });

    // Award points based on rarity
    const points = this.getBadgePoints(badge.rarity);
    await this.awardPoints(userId, points, `Earned ${badge.name} badge`);

    // Check for collection completion
    await this.checkCollectionCompletion(userId, badgeId);

    // Send notifications
    await this.sendRecognitionNotification(userId, 'badge_earned', {
      badge: userBadge,
      points
    });

    this.emit('badge:awarded', { userId, badgeId, badge: userBadge });
  }

  /**
   * Unlock achievement for user
   */
  public async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      throw new Error(`Achievement ${achievementId} not found`);
    }

    const profile = await this.getUserProfile(userId);
    
    // Check if already unlocked
    const existing = profile.achievements.find(a => a.achievementId === achievementId);
    if (existing && existing.completedAt) {
      if (!achievement.repeatable) {
        throw new Error(`Achievement ${achievementId} already unlocked`);
      }
    }

    // Verify criteria
    const progress = await this.calculateAchievementProgress(userId, achievement);
    if (progress < 100) {
      throw new Error(`Achievement criteria not met: ${progress}% complete`);
    }

    // Unlock the achievement
    const userAchievement: UserAchievement = {
      achievementId,
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      points: achievement.points,
      unlockedAt: new Date(),
      progress: 100,
      completedAt: new Date(),
      timeToComplete: this.calculateTimeToComplete(userId, achievementId)
    };

    if (existing) {
      Object.assign(existing, userAchievement);
    } else {
      profile.achievements.push(userAchievement);
    }

    // Award points and rewards
    await this.awardPoints(userId, achievement.points, `Unlocked ${achievement.name} achievement`);
    
    for (const reward of achievement.rewards) {
      await this.applyReward(userId, reward);
    }

    // Add to recognition history
    this.addRecognitionEvent(userId, {
      type: RecognitionType.ACHIEVEMENT,
      title: `Unlocked ${achievement.name}`,
      description: achievement.description,
      category: achievement.category.toString(),
      itemId: achievementId,
      itemName: achievement.name,
      source: 'system',
      trigger: 'automatic'
    });

    // Check for level up
    await this.checkLevelUp(userId);

    // Send notifications
    await this.sendRecognitionNotification(userId, 'achievement_unlocked', {
      achievement: userAchievement
    });

    this.emit('achievement:unlocked', { userId, achievementId, achievement: userAchievement });
  }

  /**
   * Award points to user
   */
  public async awardPoints(userId: string, points: number, reason: string): Promise<void> {
    const profile = await this.getUserProfile(userId);
    
    // Apply multipliers
    const multipliedPoints = this.applyPointsMultipliers(userId, points);
    
    // Check daily limits
    const dailyLimit = this.config.rewardSystem.economy.pointsSystem.limits.dailyEarningLimit;
    if (profile.stats.pointsThisMonth + multipliedPoints > dailyLimit) {
      throw new Error('Daily points earning limit exceeded');
    }

    // Award points
    profile.points += multipliedPoints;
    profile.lifetimePoints += multipliedPoints;
    profile.experience += multipliedPoints;
    profile.stats.pointsThisMonth += multipliedPoints;

    // Check for level up
    await this.checkLevelUp(userId);

    // Update leaderboards
    await this.updateLeaderboards(userId);

    this.emit('points:awarded', { userId, points: multipliedPoints, reason });
  }

  /**
   * Apply points multipliers
   */
  private applyPointsMultipliers(userId: string, points: number): number {
    // Mock implementation - would apply various multipliers based on user state
    return points;
  }

  /**
   * Check and handle level up
   */
  private async checkLevelUp(userId: string): Promise<void> {
    const profile = await this.getUserProfile(userId);
    const levels = this.config.gamification.levels;
    
    const currentLevel = levels.find(l => l.level === this.getLevelFromContributorLevel(profile.level));
    const nextLevel = levels.find(l => l.level === (currentLevel?.level || 0) + 1);
    
    if (nextLevel && profile.experience >= nextLevel.requiredPoints) {
      // Level up!
      const oldLevel = profile.level;
      profile.level = this.getContributorLevelFromLevel(nextLevel.level);
      
      // Award level up rewards
      for (const reward of nextLevel.levelUpRewards) {
        await this.applyReward(userId, reward);
      }

      // Add to recognition history
      this.addRecognitionEvent(userId, {
        type: RecognitionType.PRIVILEGE,
        title: `Reached ${nextLevel.name}`,
        description: `Advanced to ${nextLevel.title}`,
        category: 'level_up',
        itemId: nextLevel.level.toString(),
        itemName: nextLevel.name,
        source: 'system',
        trigger: 'automatic'
      });

      // Send notifications
      await this.sendRecognitionNotification(userId, 'level_up', {
        oldLevel,
        newLevel: profile.level,
        rewards: nextLevel.levelUpRewards
      });

      this.emit('user:level_up', { userId, oldLevel, newLevel: profile.level });
    }
  }

  /**
   * Apply reward to user
   */
  private async applyReward(userId: string, reward: RecognitionReward): Promise<void> {
    const profile = await this.getUserProfile(userId);

    switch (reward.type) {
      case RewardType.POINTS:
        profile.points += reward.value;
        break;
      case RewardType.CREDITS:
        profile.credits += reward.value;
        break;
      // Handle other reward types
    }

    this.emit('reward:applied', { userId, reward });
  }

  /**
   * Get user recognition profile
   */
  public async getUserProfile(userId: string): Promise<UserRecognitionProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = this.createDefaultProfile(userId);
      this.userProfiles.set(userId, profile);
    }
    
    return profile;
  }

  /**
   * Create default user profile
   */
  private createDefaultProfile(userId: string): UserRecognitionProfile {
    return {
      userId,
      level: ContributorLevel.NEWCOMER,
      experience: 0,
      nextLevelProgress: 0,
      points: 0,
      credits: 0,
      lifetimePoints: 0,
      badges: [],
      achievements: [],
      titles: [],
      certificates: [],
      streaks: [],
      longestStreaks: [],
      leaderboardPositions: [],
      programs: [],
      stats: {
        totalBadges: 0,
        uniqueBadges: 0,
        rareestBadge: BadgeRarity.COMMON,
        totalAchievements: 0,
        completedAchievements: 0,
        achievementCompletion: 0,
        totalPoints: 0,
        pointsThisMonth: 0,
        pointsLastMonth: 0,
        recognitionRank: 0,
        recognitionPercentile: 0,
        streakRecord: 0,
        activeStreaks: 0,
        leaderboardAppearances: 0,
        topPositions: 0,
        socialShares: 0,
        mentorshipSessions: 0,
        firstRecognition: new Date(),
        latestRecognition: new Date(),
        mostActiveMonth: new Date().toISOString().slice(0, 7)
      },
      preferences: {
        profileVisibility: 'public',
        showcaseBadges: [],
        showcaseAchievements: [],
        notifications: {
          badgeEarned: true,
          achievementUnlocked: true,
          levelUp: true,
          leaderboardPosition: true,
          streakMilestone: true,
          challengeInvite: true,
          programInvite: true
        },
        socialSharing: {
          autoShare: false,
          platforms: [],
          shareTypes: []
        },
        mentorship: {
          availableAsMentor: false,
          lookingForMentor: false,
          expertise: [],
          interests: []
        }
      },
      recognitionHistory: []
    };
  }

  /**
   * Verify badge criteria
   */
  private async verifyBadgeCriteria(userId: string, badge: BadgeDefinition): Promise<boolean> {
    // Mock implementation - would verify actual criteria
    return Math.random() > 0.2; // 80% pass rate for demo
  }

  /**
   * Calculate achievement progress
   */
  private async calculateAchievementProgress(
    userId: string,
    achievement: AchievementDefinition
  ): Promise<number> {
    // Mock implementation - would calculate actual progress
    return Math.random() * 100;
  }

  /**
   * Get badge points based on rarity
   */
  private getBadgePoints(rarity: BadgeRarity): number {
    const pointMap = {
      [BadgeRarity.COMMON]: 10,
      [BadgeRarity.UNCOMMON]: 25,
      [BadgeRarity.RARE]: 50,
      [BadgeRarity.EPIC]: 100,
      [BadgeRarity.LEGENDARY]: 250,
      [BadgeRarity.MYTHIC]: 500
    };
    return pointMap[rarity] || 10;
  }

  /**
   * Count badge holders
   */
  private countBadgeHolders(badgeId: string): number {
    let count = 0;
    for (const profile of this.userProfiles.values()) {
      if (profile.badges.some(b => b.badgeId === badgeId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check collection completion
   */
  private async checkCollectionCompletion(userId: string, badgeId: string): Promise<void> {
    const profile = await this.getUserProfile(userId);
    
    for (const collection of this.config.badgeSystem.collections) {
      if (!collection.badges.includes(badgeId)) continue;
      
      const userBadges = profile.badges.map(b => b.badgeId);
      const collectionBadges = collection.badges;
      const completedCount = collectionBadges.filter(b => userBadges.includes(b)).length;
      const completionPercentage = (completedCount / collectionBadges.length) * 100;
      
      // Check for threshold rewards
      for (const reward of collection.rewards) {
        if (completionPercentage >= reward.threshold) {
          for (const r of reward.rewards) {
            await this.applyReward(userId, r);
          }
        }
      }
      
      // Award completion badge if fully completed
      if (completionPercentage === 100 && collection.completionBadge) {
        await this.awardBadge(userId, collection.completionBadge, 'system', 'Collection completion');
      }
    }
  }

  /**
   * Calculate time to complete achievement
   */
  private calculateTimeToComplete(userId: string, achievementId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 30) + 1; // 1-30 days
  }

  /**
   * Add recognition event to user history
   */
  private addRecognitionEvent(userId: string, eventData: Partial<RecognitionEvent>): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    const event: RecognitionEvent = {
      id: this.generateEventId(),
      type: eventData.type!,
      timestamp: new Date(),
      title: eventData.title!,
      description: eventData.description!,
      category: eventData.category!,
      itemId: eventData.itemId!,
      itemName: eventData.itemName!,
      source: eventData.source!,
      trigger: eventData.trigger!,
      metadata: eventData.metadata || {},
      shared: false,
      sharedPlatforms: [],
      reactions: [],
      verified: false
    };

    profile.recognitionHistory.push(event);
    profile.stats.latestRecognition = new Date();
  }

  /**
   * Send recognition notification
   */
  private async sendRecognitionNotification(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    const profile = await this.getUserProfile(userId);
    
    // Check user preferences
    const eventKey = event as keyof typeof profile.preferences.notifications;
    if (!profile.preferences.notifications[eventKey]) {
      return; // User has disabled this notification
    }

    // Find notification rules
    const rules = this.config.notifications.rules.filter(r => r.event === event);
    
    for (const rule of rules) {
      this.emit('notification:send', {
        userId,
        event,
        channels: rule.channels,
        data,
        immediate: rule.immediate
      });
    }
  }

  /**
   * Update leaderboards
   */
  private async updateLeaderboards(userId: string): Promise<void> {
    for (const [leaderboardId, leaderboardData] of this.leaderboards) {
      const config = leaderboardData.config;
      
      // Calculate user score for this leaderboard
      const score = await this.calculateLeaderboardScore(userId, config);
      
      // Update or add entry
      const existingIndex = leaderboardData.entries.findIndex(e => e.userId === userId);
      const entry = {
        userId,
        score,
        rank: 0, // Will be calculated after sorting
        change: 0,
        timestamp: new Date()
      };
      
      if (existingIndex >= 0) {
        const oldRank = leaderboardData.entries[existingIndex].rank;
        leaderboardData.entries[existingIndex] = entry;
        
        // Calculate rank change after sorting
        leaderboardData.entries.sort((a, b) => b.score - a.score);
        leaderboardData.entries.forEach((e, i) => e.rank = i + 1);
        
        entry.change = oldRank - entry.rank;
      } else {
        leaderboardData.entries.push(entry);
        leaderboardData.entries.sort((a, b) => b.score - a.score);
        leaderboardData.entries.forEach((e, i) => e.rank = i + 1);
      }
      
      // Trim to leaderboard size
      leaderboardData.entries = leaderboardData.entries.slice(0, config.size);
      leaderboardData.lastUpdated = new Date();
      
      // Update user profile
      const profile = await this.getUserProfile(userId);
      const position = leaderboardData.entries.find(e => e.userId === userId);
      if (position) {
        const existingPosition = profile.leaderboardPositions.find(p => p.leaderboardId === leaderboardId);
        if (existingPosition) {
          existingPosition.position = position.rank;
          existingPosition.score = position.score;
          existingPosition.change = position.change;
        } else {
          profile.leaderboardPositions.push({
            leaderboardId,
            name: config.name,
            position: position.rank,
            score: position.score,
            change: position.change,
            percentile: (position.rank / leaderboardData.entries.length) * 100
          });
        }
      }
    }
  }

  /**
   * Calculate leaderboard score
   */
  private async calculateLeaderboardScore(userId: string, config: LeaderboardConfig): Promise<number> {
    const profile = await this.getUserProfile(userId);
    
    switch (config.primaryMetric) {
      case 'points':
        return profile.points;
      case 'badges':
        return profile.badges.length;
      case 'achievements':
        return profile.achievements.filter(a => a.completedAt).length;
      case 'reputation':
        return profile.experience;
      default:
        return 0;
    }
  }

  /**
   * Convert contributor level to numeric level
   */
  private getLevelFromContributorLevel(level: ContributorLevel): number {
    const levelMap = {
      [ContributorLevel.NEWCOMER]: 1,
      [ContributorLevel.CONTRIBUTOR]: 2,
      [ContributorLevel.REGULAR]: 3,
      [ContributorLevel.TRUSTED]: 4,
      [ContributorLevel.EXPERT]: 5,
      [ContributorLevel.CHAMPION]: 6,
      [ContributorLevel.LEGEND]: 7
    };
    return levelMap[level] || 1;
  }

  /**
   * Convert numeric level to contributor level
   */
  private getContributorLevelFromLevel(level: number): ContributorLevel {
    const levels = [
      ContributorLevel.NEWCOMER,
      ContributorLevel.CONTRIBUTOR,
      ContributorLevel.REGULAR,
      ContributorLevel.TRUSTED,
      ContributorLevel.EXPERT,
      ContributorLevel.CHAMPION,
      ContributorLevel.LEGEND
    ];
    return levels[level - 1] || ContributorLevel.NEWCOMER;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get leaderboard data
   */
  public getLeaderboard(leaderboardId: string): LeaderboardEntry[] {
    const leaderboard = this.leaderboards.get(leaderboardId);
    return leaderboard ? leaderboard.entries : [];
  }

  /**
   * Get user's badges
   */
  public getUserBadges(userId: string): UserBadge[] {
    const profile = this.userProfiles.get(userId);
    return profile ? profile.badges : [];
  }

  /**
   * Get user's achievements
   */
  public getUserAchievements(userId: string): UserAchievement[] {
    const profile = this.userProfiles.get(userId);
    return profile ? profile.achievements : [];
  }

  /**
   * Get system statistics
   */
  public getSystemStatistics(): {
    totalUsers: number;
    totalBadgesAwarded: number;
    totalAchievementsUnlocked: number;
    totalPointsAwarded: number;
    mostPopularBadge: string;
    mostCompletedAchievement: string;
    averageUserLevel: number;
  } {
    const profiles = Array.from(this.userProfiles.values());
    
    const totalBadgesAwarded = profiles.reduce((sum, p) => sum + p.badges.length, 0);
    const totalAchievementsUnlocked = profiles.reduce((sum, p) => 
      sum + p.achievements.filter(a => a.completedAt).length, 0
    );
    const totalPointsAwarded = profiles.reduce((sum, p) => sum + p.lifetimePoints, 0);
    
    // Badge popularity
    const badgeCounts = new Map<string, number>();
    for (const profile of profiles) {
      for (const badge of profile.badges) {
        badgeCounts.set(badge.badgeId, (badgeCounts.get(badge.badgeId) || 0) + 1);
      }
    }
    const mostPopularBadge = Array.from(badgeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
    
    // Achievement completion
    const achievementCounts = new Map<string, number>();
    for (const profile of profiles) {
      for (const achievement of profile.achievements) {
        if (achievement.completedAt) {
          achievementCounts.set(achievement.achievementId, 
            (achievementCounts.get(achievement.achievementId) || 0) + 1);
        }
      }
    }
    const mostCompletedAchievement = Array.from(achievementCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
    
    const averageUserLevel = profiles.length > 0
      ? profiles.reduce((sum, p) => sum + this.getLevelFromContributorLevel(p.level), 0) / profiles.length
      : 0;

    return {
      totalUsers: profiles.length,
      totalBadgesAwarded,
      totalAchievementsUnlocked,
      totalPointsAwarded,
      mostPopularBadge,
      mostCompletedAchievement,
      averageUserLevel
    };
  }
}

/**
 * Helper interfaces for internal use
 */
interface LeaderboardData {
  config: LeaderboardConfig;
  entries: LeaderboardEntry[];
  lastUpdated: Date;
}

interface LeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
  change: number;
  timestamp: Date;
}

interface ActiveChallenge {
  config: ChallengeConfig;
  participants: ChallengeParticipant[];
  startedAt: Date;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

interface ChallengeParticipant {
  userId: string;
  joinedAt: Date;
  progress: Record<string, number>;
  score: number;
  rank: number;
}