/**
 * @fileoverview Team Collaboration Module
 * Exports all team collaboration and RBAC components
 */

// Core services
export { CollaborationService } from './collaboration-service';
export { RBACManager, PermissionDeniedError } from './rbac-manager';
export { RealtimeManager } from './realtime-manager';

// Type definitions
export * from './types';

// Re-export for convenience
export type {
  // Core collaboration types
  User,
  Team,
  Organization,
  Project,
  CollaborationSession,
  
  // User and team management types
  UserProfile,
  UserPreferences,
  TeamMember,
  TeamSettings,
  TeamStats,
  ProjectCollaborator,
  ProjectSettings,
  ProjectMetadata,
  
  // RBAC types
  Role,
  Permission,
  RoleAssignment,
  AccessCondition,
  RoleType,
  RoleScope,
  PermissionScope,
  TeamRole,
  ProjectRole,
  SystemRole,
  Resource,
  Action,
  
  // Session and collaboration types
  SessionParticipant,
  SessionSettings,
  SessionRecording,
  CursorPosition,
  Selection,
  SessionType,
  SessionStatus,
  ParticipantRole,
  ParticipantStatus,
  
  // Communication types
  Message,
  MessageContent,
  MessageType,
  Channel,
  ChannelMember,
  ChannelSettings,
  ChannelType,
  Attachment,
  Reaction,
  
  // Review and feedback types
  Review,
  ReviewComment,
  ReviewSuggestion,
  ReviewApproval,
  ReviewType,
  ReviewStatus,
  ReviewCriteria,
  ApprovalStatus,
  
  // Activity and audit types
  Activity,
  ActivityType,
  ActivityMetadata,
  ActivityContext,
  AuditLog,
  AuditSeverity,
  AuditCategory,
  
  // Utility types
  UserStatus,
  ExperienceLevel,
  TeamVisibility,
  ProjectVisibility,
  AccessLevel,
  MemberStatus,
  ConditionType,
  ConditionOperator
} from './types';