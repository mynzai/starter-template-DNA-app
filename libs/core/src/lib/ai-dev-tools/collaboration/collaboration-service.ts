/**
 * @fileoverview Team Collaboration Service
 * Main orchestration service for team collaboration features with RBAC
 */

import { EventEmitter } from 'events';
import {
  User,
  Team,
  Organization,
  Project,
  CollaborationSession,
  Message,
  Channel,
  Review,
  Activity,
  Role,
  Permission,
  RoleAssignment,
  TeamMember,
  ProjectCollaborator,
  SessionParticipant,
  UserStatus,
  TeamRole,
  ProjectRole,
  SessionType,
  ReviewType,
  ActivityType,
  Resource,
  Action
} from './types';

export class CollaborationService extends EventEmitter {
  private initialized = false;
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private organizations: Map<string, Organization> = new Map();
  private projects: Map<string, Project> = new Map();
  private sessions: Map<string, CollaborationSession> = new Map();
  private channels: Map<string, Channel> = new Map();
  private messages: Map<string, Message> = new Map();
  private reviews: Map<string, Review> = new Map();
  private activities: Map<string, Activity> = new Map();
  private roles: Map<string, Role> = new Map();
  private roleAssignments: Map<string, RoleAssignment> = new Map();

  // Real-time connections
  private activeConnections: Map<string, ConnectionInfo> = new Map();
  private presenceManager: PresenceManager;
  private notificationManager: NotificationManager;

  constructor() {
    super();
    this.presenceManager = new PresenceManager();
    this.notificationManager = new NotificationManager();
    this.setupDefaultRoles();
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize presence and notification systems
    await this.presenceManager.initialize();
    await this.notificationManager.initialize();

    this.initialized = true;
    this.emit('collaboration:initialized');
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...userData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.users.set(user.id, user);
    await this.logActivity('user', 'create', user.id, user.id, 'User created', { user });

    this.emit('user:created', { user });
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: Date.now()
    };

    this.users.set(userId, updatedUser);
    await this.logActivity('user', 'update', userId, userId, 'User updated', { updates });

    this.emit('user:updated', { user: updatedUser, changes: updates });
    return updatedUser;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async getUsersByTeam(teamId: string): Promise<User[]> {
    const team = this.teams.get(teamId);
    if (!team) return [];

    const userIds = team.members.map(member => member.userId);
    return userIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }

  async setUserStatus(userId: string, status: UserStatus): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    await this.updateUser(userId, { status, lastSeen: Date.now() });
    await this.presenceManager.updatePresence(userId, { status });

    this.emit('user:status:changed', { userId, status });
  }

  // ============================================================================
  // Team Management
  // ============================================================================

  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const team: Team = {
      id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...teamData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add owner as first member
    if (!team.members.find(m => m.userId === team.ownerId)) {
      team.members.push({
        userId: team.ownerId,
        role: 'owner',
        permissions: await this.getPermissionsForRole('owner', 'team'),
        joinedAt: Date.now(),
        invitedBy: team.ownerId,
        status: 'active'
      });
    }

    this.teams.set(team.id, team);
    await this.logActivity('team', 'create', team.ownerId, team.id, 'Team created', { team });

    this.emit('team:created', { team });
    return team;
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: TeamRole = 'developer',
    invitedBy: string
  ): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    // Check if user is already a member
    if (team.members.find(m => m.userId === userId)) {
      throw new Error(`User ${userId} is already a team member`);
    }

    // Check permissions
    await this.checkPermission(invitedBy, 'team', 'invite', teamId);

    const member: TeamMember = {
      userId,
      role,
      permissions: await this.getPermissionsForRole(role, 'team'),
      joinedAt: Date.now(),
      invitedBy,
      status: 'active'
    };

    team.members.push(member);
    team.stats.memberCount = team.members.length;
    team.updatedAt = Date.now();

    this.teams.set(teamId, team);

    // Create role assignment
    await this.assignRole(userId, role, 'team', teamId, invitedBy);

    await this.logActivity('team', 'add_member', invitedBy, teamId, 'Team member added', {
      userId,
      role
    });

    this.emit('team:member:added', { teamId, userId, role, member });
  }

  async removeTeamMember(teamId: string, userId: string, removedBy: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    // Check permissions
    await this.checkPermission(removedBy, 'team', 'remove', teamId);

    // Cannot remove owner
    const member = team.members.find(m => m.userId === userId);
    if (member?.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    team.members = team.members.filter(m => m.userId !== userId);
    team.stats.memberCount = team.members.length;
    team.updatedAt = Date.now();

    this.teams.set(teamId, team);

    // Remove role assignments
    await this.removeRoleAssignments(userId, 'team', teamId);

    await this.logActivity('team', 'remove_member', removedBy, teamId, 'Team member removed', {
      userId
    });

    this.emit('team:member:removed', { teamId, userId, removedBy });
  }

  async updateTeamMemberRole(
    teamId: string,
    userId: string,
    newRole: TeamRole,
    updatedBy: string
  ): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    // Check permissions
    await this.checkPermission(updatedBy, 'team', 'assign', teamId);

    const member = team.members.find(m => m.userId === userId);
    if (!member) {
      throw new Error(`User ${userId} is not a team member`);
    }

    const oldRole = member.role;
    member.role = newRole;
    member.permissions = await this.getPermissionsForRole(newRole, 'team');
    team.updatedAt = Date.now();

    this.teams.set(teamId, team);

    // Update role assignment
    await this.updateRoleAssignment(userId, newRole, 'team', teamId, updatedBy);

    await this.logActivity('team', 'update_member_role', updatedBy, teamId, 'Team member role updated', {
      userId,
      oldRole,
      newRole
    });

    this.emit('team:member:role:updated', { teamId, userId, oldRole, newRole, updatedBy });
  }

  // ============================================================================
  // Project Management
  // ============================================================================

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt'>): Promise<Project> {
    const project: Project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...projectData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now()
    };

    // Add owner as first collaborator
    if (!project.collaborators.find(c => c.userId === project.ownerId)) {
      project.collaborators.push({
        userId: project.ownerId,
        role: 'owner',
        permissions: await this.getPermissionsForRole('owner', 'project'),
        accessLevel: 'full',
        addedBy: project.ownerId,
        addedAt: Date.now(),
        lastActivity: Date.now()
      });
    }

    this.projects.set(project.id, project);
    await this.logActivity('project', 'create', project.ownerId, project.id, 'Project created', { project });

    this.emit('project:created', { project });
    return project;
  }

  async addProjectCollaborator(
    projectId: string,
    userId: string,
    role: ProjectRole = 'contributor',
    addedBy: string
  ): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Check permissions
    await this.checkPermission(addedBy, 'project', 'invite', projectId);

    // Check if user is already a collaborator
    if (project.collaborators.find(c => c.userId === userId)) {
      throw new Error(`User ${userId} is already a project collaborator`);
    }

    const collaborator: ProjectCollaborator = {
      userId,
      role,
      permissions: await this.getPermissionsForRole(role, 'project'),
      accessLevel: this.roleToAccessLevel(role),
      addedBy,
      addedAt: Date.now(),
      lastActivity: Date.now()
    };

    project.collaborators.push(collaborator);
    project.updatedAt = Date.now();

    this.projects.set(projectId, project);

    // Create role assignment
    await this.assignRole(userId, role, 'project', projectId, addedBy);

    await this.logActivity('project', 'add_collaborator', addedBy, projectId, 'Project collaborator added', {
      userId,
      role
    });

    this.emit('project:collaborator:added', { projectId, userId, role, collaborator });
  }

  // ============================================================================
  // Collaboration Sessions
  // ============================================================================

  async createSession(sessionData: Omit<CollaborationSession, 'id' | 'startTime'>): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...sessionData,
      startTime: Date.now()
    };

    // Add host as first participant
    if (!session.participants.find(p => p.userId === session.host)) {
      session.participants.push({
        userId: session.host,
        role: 'host',
        status: 'joined',
        joinedAt: Date.now(),
        permissions: await this.getSessionPermissions('host')
      });
    }

    this.sessions.set(session.id, session);
    await this.logActivity('session', 'create', session.host, session.id, 'Collaboration session created', { session });

    this.emit('session:created', { session });
    return session;
  }

  async joinSession(sessionId: string, userId: string, role: ParticipantRole = 'participant'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check if session allows new participants
    if (!session.settings.allowJoinAnytime && session.status === 'active') {
      throw new Error('Session does not allow joining after start');
    }

    // Check if user is already a participant
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      if (existingParticipant.status === 'joined') {
        throw new Error('User is already in the session');
      }
      // Update existing participant status
      existingParticipant.status = 'joined';
      existingParticipant.joinedAt = Date.now();
    } else {
      // Add new participant
      const participant: SessionParticipant = {
        userId,
        role,
        status: 'joined',
        joinedAt: Date.now(),
        permissions: await this.getSessionPermissions(role)
      };
      session.participants.push(participant);
    }

    this.sessions.set(sessionId, session);

    await this.logActivity('session', 'join', userId, sessionId, 'User joined session', { role });

    this.emit('session:participant:joined', { sessionId, userId, role });
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.status = 'left';
      participant.leftAt = Date.now();
    }

    this.sessions.set(sessionId, session);

    await this.logActivity('session', 'leave', userId, sessionId, 'User left session');

    this.emit('session:participant:left', { sessionId, userId });
  }

  async endSession(sessionId: string, endedBy: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check permissions
    if (session.host !== endedBy) {
      const participant = session.participants.find(p => p.userId === endedBy);
      if (!participant || !['host', 'co_host'].includes(participant.role)) {
        throw new Error('Insufficient permissions to end session');
      }
    }

    session.status = 'completed';
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Mark all participants as left
    session.participants.forEach(p => {
      if (p.status === 'joined') {
        p.status = 'left';
        p.leftAt = session.endTime;
      }
    });

    this.sessions.set(sessionId, session);

    await this.logActivity('session', 'end', endedBy, sessionId, 'Session ended', {
      duration: session.duration
    });

    this.emit('session:ended', { sessionId, session, endedBy });
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  async sendMessage(
    channelId: string,
    senderId: string,
    content: string,
    type: MessageType = 'text'
  ): Promise<Message> {
    // Check channel permissions
    await this.checkChannelPermission(senderId, channelId, 'send_message');

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: { text: content },
      senderId,
      channelId,
      mentions: this.extractMentions(content),
      attachments: [],
      reactions: [],
      status: 'sent',
      priority: 'normal',
      timestamp: Date.now()
    };

    this.messages.set(message.id, message);

    // Update channel last activity
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.lastActivity = Date.now();
      channel.metadata.messageCount++;
      this.channels.set(channelId, channel);
    }

    await this.logActivity('collaboration', 'send_message', senderId, channelId, 'Message sent', {
      messageId: message.id,
      type
    });

    // Send notifications for mentions
    await this.notificationManager.sendMentionNotifications(message);

    this.emit('message:sent', { message, channelId });
    return message;
  }

  async editMessage(messageId: string, newContent: string, editorId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    // Check permissions (only sender or channel admin can edit)
    if (message.senderId !== editorId) {
      await this.checkChannelPermission(editorId, message.channelId!, 'moderate');
    }

    message.content.text = newContent;
    message.editedAt = Date.now();
    message.mentions = this.extractMentions(newContent);

    this.messages.set(messageId, message);

    await this.logActivity('collaboration', 'edit_message', editorId, message.channelId!, 'Message edited', {
      messageId
    });

    this.emit('message:edited', { message, editorId });
  }

  async deleteMessage(messageId: string, deletedBy: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    // Check permissions (only sender or channel admin can delete)
    if (message.senderId !== deletedBy) {
      await this.checkChannelPermission(deletedBy, message.channelId!, 'moderate');
    }

    message.deletedAt = Date.now();
    this.messages.set(messageId, message);

    await this.logActivity('collaboration', 'delete_message', deletedBy, message.channelId!, 'Message deleted', {
      messageId
    });

    this.emit('message:deleted', { messageId, deletedBy });
  }

  // ============================================================================
  // Review System
  // ============================================================================

  async createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    const review: Review = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...reviewData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.reviews.set(review.id, review);

    await this.logActivity('review', 'create', review.requesterId, review.id, 'Review created', { review });

    // Notify reviewer
    await this.notificationManager.sendReviewNotification(review);

    this.emit('review:created', { review });
    return review;
  }

  async submitReview(
    reviewId: string,
    reviewerId: string,
    status: ReviewStatus,
    comments: string
  ): Promise<void> {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error(`Review not found: ${reviewId}`);
    }

    if (review.reviewerId !== reviewerId) {
      throw new Error('Only assigned reviewer can submit review');
    }

    review.status = status;
    review.completedAt = Date.now();
    review.updatedAt = Date.now();

    // Add approval entry
    review.approvals.push({
      reviewerId,
      status: status === 'approved' ? 'approved' : 'rejected',
      timestamp: Date.now(),
      comments
    });

    this.reviews.set(reviewId, review);

    await this.logActivity('review', 'submit', reviewerId, reviewId, 'Review submitted', {
      status,
      comments
    });

    // Notify requester
    await this.notificationManager.sendReviewCompletionNotification(review);

    this.emit('review:submitted', { review, reviewerId, status });
  }

  // ============================================================================
  // RBAC (Role-Based Access Control)
  // ============================================================================

  async assignRole(
    userId: string,
    roleId: string,
    scope: AssignmentScope,
    resourceId?: string,
    assignedBy?: string
  ): Promise<RoleAssignment> {
    const assignment: RoleAssignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      roleId,
      scope,
      resourceId,
      assignedBy: assignedBy || 'system',
      assignedAt: Date.now(),
      isActive: true
    };

    this.roleAssignments.set(assignment.id, assignment);

    await this.logActivity('user', 'assign_role', assignedBy || 'system', userId, 'Role assigned', {
      roleId,
      scope,
      resourceId
    });

    this.emit('role:assigned', { assignment });
    return assignment;
  }

  async removeRoleAssignments(userId: string, scope?: AssignmentScope, resourceId?: string): Promise<void> {
    const assignmentsToRemove = Array.from(this.roleAssignments.values()).filter(assignment =>
      assignment.userId === userId &&
      assignment.isActive &&
      (!scope || assignment.scope === scope) &&
      (!resourceId || assignment.resourceId === resourceId)
    );

    assignmentsToRemove.forEach(assignment => {
      assignment.isActive = false;
      this.roleAssignments.set(assignment.id, assignment);
    });

    await this.logActivity('user', 'remove_role', 'system', userId, 'Role assignments removed', {
      count: assignmentsToRemove.length,
      scope,
      resourceId
    });

    this.emit('roles:removed', { userId, scope, resourceId, count: assignmentsToRemove.length });
  }

  async updateRoleAssignment(
    userId: string,
    newRoleId: string,
    scope: AssignmentScope,
    resourceId?: string,
    updatedBy?: string
  ): Promise<void> {
    // Remove existing assignments for this scope/resource
    await this.removeRoleAssignments(userId, scope, resourceId);
    
    // Create new assignment
    await this.assignRole(userId, newRoleId, scope, resourceId, updatedBy);
  }

  async checkPermission(
    userId: string,
    resource: Resource,
    action: Action,
    resourceId?: string
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId, resourceId);
    
    for (const roleId of userRoles) {
      const role = this.roles.get(roleId);
      if (!role) continue;

      const hasPermission = role.permissions.some(permission =>
        permission.resource === resource &&
        permission.actions.includes(action) &&
        this.evaluateConditions(permission.conditions || [], { userId, resourceId })
      );

      if (hasPermission) {
        return true;
      }
    }

    throw new Error(`Insufficient permissions: ${action} on ${resource}`);
  }

  private async getUserRoles(userId: string, resourceId?: string): Promise<string[]> {
    const assignments = Array.from(this.roleAssignments.values()).filter(assignment =>
      assignment.userId === userId &&
      assignment.isActive &&
      (!resourceId || assignment.resourceId === resourceId)
    );

    return assignments.map(assignment => assignment.roleId);
  }

  private async getPermissionsForRole(role: string, context: string): Promise<Permission[]> {
    // This would typically load from a database
    // For now, return basic permissions based on role
    const basicPermissions: Record<string, Permission[]> = {
      owner: [
        {
          id: 'owner-all',
          name: 'Full Access',
          resource: 'project',
          actions: ['create', 'read', 'update', 'delete', 'invite', 'remove', 'assign'],
          scope: 'resource'
        }
      ],
      admin: [
        {
          id: 'admin-manage',
          name: 'Management Access',
          resource: 'project',
          actions: ['read', 'update', 'invite', 'remove', 'assign'],
          scope: 'resource'
        }
      ],
      developer: [
        {
          id: 'dev-basic',
          name: 'Development Access',
          resource: 'project',
          actions: ['read', 'update', 'comment'],
          scope: 'resource'
        }
      ],
      viewer: [
        {
          id: 'viewer-read',
          name: 'Read Only Access',
          resource: 'project',
          actions: ['read'],
          scope: 'resource'
        }
      ]
    };

    return basicPermissions[role] || [];
  }

  private async getSessionPermissions(role: ParticipantRole): Promise<SessionPermission[]> {
    const permissionMap: Record<ParticipantRole, SessionAction[]> = {
      host: ['join', 'leave', 'invite', 'kick', 'mute', 'share_screen', 'record', 'moderate', 'end_session'],
      co_host: ['join', 'leave', 'invite', 'kick', 'mute', 'share_screen', 'record', 'moderate'],
      presenter: ['join', 'leave', 'share_screen', 'record'],
      participant: ['join', 'leave', 'share_screen'],
      observer: ['join', 'leave']
    };

    return permissionMap[role].map(action => ({
      action,
      allowed: true
    }));
  }

  private evaluateConditions(conditions: AccessCondition[], context: any): boolean {
    return conditions.every(condition => {
      // Simple condition evaluation - would be more sophisticated in production
      const value = context[condition.field];
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return Array.isArray(value) ? value.includes(condition.value) : false;
        default:
          return true;
      }
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private async checkChannelPermission(userId: string, channelId: string, action: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const member = channel.members.find(m => m.userId === userId);
    if (!member) {
      throw new Error('User is not a channel member');
    }

    // Basic permission check based on role
    const allowedActions: Record<string, string[]> = {
      owner: ['send_message', 'edit_message', 'delete_message', 'moderate', 'manage'],
      admin: ['send_message', 'edit_message', 'delete_message', 'moderate'],
      moderator: ['send_message', 'edit_message', 'moderate'],
      member: ['send_message', 'edit_message'],
      guest: ['send_message']
    };

    const userActions = allowedActions[member.role] || [];
    if (!userActions.includes(action)) {
      throw new Error(`Insufficient permissions: ${action} in channel ${channelId}`);
    }
  }

  private roleToAccessLevel(role: ProjectRole): AccessLevel {
    const accessMap: Record<ProjectRole, AccessLevel> = {
      owner: 'full',
      maintainer: 'read_write',
      contributor: 'read_write',
      reviewer: 'comment_only',
      viewer: 'read_only'
    };
    return accessMap[role] || 'read_only';
  }

  private extractMentions(content: string): string[] {
    const mentionPattern = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  private async logActivity(
    type: ActivityType,
    action: string,
    actorId: string,
    targetId: string,
    description: string,
    metadata: any = {}
  ): Promise<void> {
    const activity: Activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      actorId,
      targetId,
      description,
      metadata: {
        ...metadata,
        affectedResources: [targetId],
        tags: [type, action]
      },
      context: {
        source: 'collaboration_service',
        platform: 'web',
        version: '1.0.0'
      },
      timestamp: Date.now()
    };

    this.activities.set(activity.id, activity);
    this.emit('activity:logged', { activity });
  }

  private setupDefaultRoles(): void {
    // Create default system roles
    const defaultRoles: Role[] = [
      {
        id: 'team-owner',
        name: 'Team Owner',
        description: 'Full control over team',
        type: 'team',
        scope: 'team',
        permissions: [],
        isSystem: true,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'team-admin',
        name: 'Team Admin',
        description: 'Administrative access to team',
        type: 'team',
        scope: 'team',
        permissions: [],
        isSystem: true,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'project-owner',
        name: 'Project Owner',
        description: 'Full control over project',
        type: 'project',
        scope: 'project',
        permissions: [],
        isSystem: true,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    defaultRoles.forEach(role => this.roles.set(role.id, role));
  }

  private setupEventHandlers(): void {
    // Set up internal event handlers
    this.on('user:created', this.handleUserCreated.bind(this));
    this.on('team:created', this.handleTeamCreated.bind(this));
    this.on('session:created', this.handleSessionCreated.bind(this));
  }

  private async handleUserCreated(data: { user: User }): Promise<void> {
    // Initialize user in presence manager
    await this.presenceManager.registerUser(data.user.id);
  }

  private async handleTeamCreated(data: { team: Team }): Promise<void> {
    // Create default channels for the team
    await this.createDefaultChannels(data.team.id);
  }

  private async handleSessionCreated(data: { session: CollaborationSession }): Promise<void> {
    // Set up session monitoring
    this.monitorSession(data.session.id);
  }

  private async createDefaultChannels(teamId: string): Promise<void> {
    // Implementation would create default channels like #general, #random
    // This is a placeholder
  }

  private monitorSession(sessionId: string): void {
    // Implementation would set up session monitoring
    // This is a placeholder
  }

  async shutdown(): Promise<void> {
    await this.presenceManager.shutdown();
    await this.notificationManager.shutdown();
    
    this.initialized = false;
    this.emit('collaboration:shutdown');
  }
}

// ============================================================================
// Supporting Classes
// ============================================================================

class PresenceManager {
  private userPresence: Map<string, UserPresence> = new Map();

  async initialize(): Promise<void> {
    // Initialize presence tracking
  }

  async registerUser(userId: string): Promise<void> {
    this.userPresence.set(userId, {
      userId,
      status: 'offline',
      lastSeen: Date.now(),
      activities: []
    });
  }

  async updatePresence(userId: string, presence: Partial<UserPresence>): Promise<void> {
    const current = this.userPresence.get(userId);
    if (current) {
      Object.assign(current, presence, { lastSeen: Date.now() });
      this.userPresence.set(userId, current);
    }
  }

  async shutdown(): Promise<void> {
    this.userPresence.clear();
  }
}

class NotificationManager {
  async initialize(): Promise<void> {
    // Initialize notification system
  }

  async sendMentionNotifications(message: Message): Promise<void> {
    // Send notifications for mentioned users
    for (const mention of message.mentions) {
      // Implementation would send actual notifications
      console.log(`Mention notification for @${mention} in message ${message.id}`);
    }
  }

  async sendReviewNotification(review: Review): Promise<void> {
    // Send review request notification
    console.log(`Review notification sent to ${review.reviewerId} for review ${review.id}`);
  }

  async sendReviewCompletionNotification(review: Review): Promise<void> {
    // Send review completion notification
    console.log(`Review completion notification sent to ${review.requesterId} for review ${review.id}`);
  }

  async shutdown(): Promise<void> {
    // Clean up notification system
  }
}

// Supporting interfaces
interface ConnectionInfo {
  userId: string;
  sessionId: string;
  connectedAt: number;
  lastActivity: number;
  socketId?: string;
}

interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: number;
  activities: string[];
  location?: string;
}

interface SessionPermission {
  action: SessionAction;
  allowed: boolean;
  conditions?: AccessCondition[];
}

interface AccessCondition {
  type: string;
  field: string;
  operator: string;
  value: any;
}

type MessageType = 'text' | 'code' | 'file' | 'image';
type ReviewStatus = 'draft' | 'pending' | 'in_progress' | 'approved' | 'rejected';
type SessionAction = 'join' | 'leave' | 'invite' | 'kick' | 'mute' | 'share_screen' | 'record' | 'moderate' | 'end_session';
type ParticipantRole = 'host' | 'co_host' | 'presenter' | 'participant' | 'observer';
type AssignmentScope = 'global' | 'organization' | 'team' | 'project';