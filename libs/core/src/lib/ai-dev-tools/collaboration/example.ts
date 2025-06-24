/**
 * @fileoverview Team Collaboration System Example
 * Demonstrates comprehensive usage of the team collaboration system with RBAC
 */

import {
  CollaborationService,
  RBACManager,
  RealtimeManager,
  User,
  Team,
  Project,
  CollaborationSession,
  TeamRole,
  ProjectRole,
  ParticipantRole,
  SessionType,
  ReviewType,
  UserPreferences,
  TeamSettings,
  ProjectSettings,
  AlertingConfig
} from './index';

/**
 * Example demonstrating comprehensive team collaboration setup and usage
 */
export class TeamCollaborationExample {
  private collaborationService: CollaborationService;
  private rbacManager: RBACManager;
  private realtimeManager: RealtimeManager;

  constructor() {
    this.collaborationService = new CollaborationService();
    this.rbacManager = new RBACManager();
    this.realtimeManager = new RealtimeManager();
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for collaboration events
   */
  private setupEventListeners(): void {
    // User events
    this.collaborationService.on('user:created', (data) => {
      console.log(`👤 User created: ${data.user.displayName} (${data.user.email})`);
    });

    this.collaborationService.on('user:status:changed', (data) => {
      console.log(`🟢 User status changed: ${data.userId} -> ${data.status}`);
    });

    // Team events
    this.collaborationService.on('team:created', (data) => {
      console.log(`👥 Team created: ${data.team.name}`);
    });

    this.collaborationService.on('team:member:added', (data) => {
      console.log(`➕ Team member added: ${data.userId} as ${data.role} to ${data.teamId}`);
    });

    this.collaborationService.on('team:member:role:updated', (data) => {
      console.log(`🔄 Role updated: ${data.userId} from ${data.oldRole} to ${data.newRole}`);
    });

    // Project events
    this.collaborationService.on('project:created', (data) => {
      console.log(`📁 Project created: ${data.project.name}`);
    });

    this.collaborationService.on('project:collaborator:added', (data) => {
      console.log(`➕ Collaborator added: ${data.userId} as ${data.role} to project ${data.projectId}`);
    });

    // Session events
    this.collaborationService.on('session:created', (data) => {
      console.log(`🚀 Collaboration session created: ${data.session.name} (${data.session.type})`);
    });

    this.collaborationService.on('session:participant:joined', (data) => {
      console.log(`👋 Participant joined session: ${data.userId} as ${data.role}`);
    });

    this.collaborationService.on('session:participant:left', (data) => {
      console.log(`👋 Participant left session: ${data.userId}`);
    });

    // Real-time events
    this.realtimeManager.on('connection:established', (data) => {
      console.log(`🔗 Real-time connection established: ${data.connection.userId}`);
    });

    this.realtimeManager.on('cursor:updated', (data) => {
      console.log(`🖱️  Cursor updated: ${data.userId} at ${data.cursor.file}:${data.cursor.line}:${data.cursor.column}`);
    });

    this.realtimeManager.on('presence:updated', (data) => {
      console.log(`👁️  Presence updated: ${data.userId} -> ${data.presence.status}`);
    });

    // RBAC events
    this.rbacManager.on('role:assigned', (data) => {
      console.log(`🎯 Role assigned: ${data.assignment.roleId} to ${data.assignment.userId}`);
    });

    this.rbacManager.on('permission:denied', (data) => {
      console.warn(`⛔ Permission denied: ${data.action} on ${data.resource} for ${data.userId}`);
    });

    // Message events
    this.collaborationService.on('message:sent', (data) => {
      console.log(`💬 Message sent: ${data.message.senderId} in ${data.channelId}`);
    });

    // Review events
    this.collaborationService.on('review:created', (data) => {
      console.log(`📝 Review created: ${data.review.title} by ${data.review.requesterId}`);
    });

    this.collaborationService.on('review:submitted', (data) => {
      console.log(`✅ Review submitted: ${data.reviewerId} -> ${data.status}`);
    });
  }

  /**
   * Example: Complete team collaboration workflow
   */
  async demonstrateFullWorkflow(): Promise<void> {
    console.log('\n=== Team Collaboration Full Workflow Demo ===\n');

    // Initialize all services
    await this.initialize();

    try {
      // Step 1: Create organization and team
      const { organization, team, users } = await this.setupOrganizationAndTeam();

      // Step 2: Create project and add collaborators
      const project = await this.setupProject(team.id, users);

      // Step 3: Start collaboration session
      const session = await this.setupCollaborationSession(project.id, users);

      // Step 4: Demonstrate real-time collaboration
      await this.demonstrateRealtimeCollaboration(session.id, users);

      // Step 5: Demonstrate code review process
      await this.demonstrateCodeReview(project.id, users);

      // Step 6: Demonstrate RBAC features
      await this.demonstrateRBAC(team.id, users);

      // Step 7: Clean up
      await this.cleanupSession(session.id, users);

    } catch (error) {
      console.error('❌ Workflow failed:', error);
    }
  }

  /**
   * Initialize all collaboration services
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing collaboration services...\n');

    await this.collaborationService.initialize();
    await this.rbacManager.initialize();
    await this.realtimeManager.initialize();

    console.log('✅ All services initialized successfully\n');
  }

  /**
   * Set up organization and team structure
   */
  private async setupOrganizationAndTeam(): Promise<{
    organization: any;
    team: Team;
    users: User[];
  }> {
    console.log('🏢 Setting up organization and team...\n');

    // Create users
    const alice = await this.collaborationService.createUser({
      email: 'alice@company.com',
      username: 'alice',
      displayName: 'Alice Johnson',
      status: 'active',
      lastSeen: Date.now(),
      preferences: this.createDefaultPreferences(),
      profile: {
        bio: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        timezone: 'America/Los_Angeles',
        language: 'en',
        skills: ['TypeScript', 'React', 'Node.js'],
        experience: 'expert',
        socialLinks: {}
      }
    });

    const bob = await this.collaborationService.createUser({
      email: 'bob@company.com',
      username: 'bob',
      displayName: 'Bob Smith',
      status: 'active',
      lastSeen: Date.now(),
      preferences: this.createDefaultPreferences(),
      profile: {
        bio: 'Full Stack Developer',
        location: 'New York, NY',
        timezone: 'America/New_York',
        language: 'en',
        skills: ['JavaScript', 'Python', 'React'],
        experience: 'advanced',
        socialLinks: {}
      }
    });

    const charlie = await this.collaborationService.createUser({
      email: 'charlie@company.com',
      username: 'charlie',
      displayName: 'Charlie Brown',
      status: 'active',
      lastSeen: Date.now(),
      preferences: this.createDefaultPreferences(),
      profile: {
        bio: 'Junior Developer',
        location: 'Austin, TX',
        timezone: 'America/Chicago',
        language: 'en',
        skills: ['JavaScript', 'CSS', 'HTML'],
        experience: 'intermediate',
        socialLinks: {}
      }
    });

    // Create team
    const team = await this.collaborationService.createTeam({
      name: 'AI Development Team',
      description: 'Team working on AI-powered development tools',
      organizationId: 'org-demo',
      ownerId: alice.id,
      members: [],
      settings: this.createDefaultTeamSettings(),
      stats: {
        memberCount: 0,
        projectCount: 0,
        totalSessions: 0,
        totalCost: 0,
        averageSessionDuration: 0,
        lastActivity: Date.now()
      }
    });

    // Add team members
    await this.collaborationService.addTeamMember(team.id, bob.id, 'developer', alice.id);
    await this.collaborationService.addTeamMember(team.id, charlie.id, 'developer', alice.id);

    console.log(`✅ Team "${team.name}" created with ${team.members.length} members\n`);

    return {
      organization: { id: 'org-demo', name: 'Demo Organization' },
      team,
      users: [alice, bob, charlie]
    };
  }

  /**
   * Set up project and collaborators
   */
  private async setupProject(teamId: string, users: User[]): Promise<Project> {
    console.log('📁 Setting up project...\n');

    const [alice, bob, charlie] = users;

    const project = await this.collaborationService.createProject({
      name: 'AI Code Generation Tool',
      description: 'Next-generation AI-powered code generation platform',
      type: 'web_app',
      status: 'active',
      visibility: 'internal',
      teamId,
      ownerId: alice.id,
      collaborators: [],
      settings: this.createDefaultProjectSettings(),
      metadata: {
        framework: ['React', 'Node.js', 'TypeScript'],
        languages: ['TypeScript', 'JavaScript'],
        tags: ['AI', 'Code Generation', 'Developer Tools'],
        size: 'medium',
        complexity: 'complex',
        estimatedDuration: 12, // weeks
        costBudget: 50000
      },
      resources: []
    });

    // Add collaborators
    await this.collaborationService.addProjectCollaborator(project.id, bob.id, 'contributor', alice.id);
    await this.collaborationService.addProjectCollaborator(project.id, charlie.id, 'reviewer', alice.id);

    console.log(`✅ Project "${project.name}" created with ${project.collaborators.length} collaborators\n`);

    return project;
  }

  /**
   * Set up collaboration session
   */
  private async setupCollaborationSession(projectId: string, users: User[]): Promise<CollaborationSession> {
    console.log('🚀 Starting collaboration session...\n');

    const [alice] = users;

    const session = await this.collaborationService.createSession({
      projectId,
      name: 'Code Review & Pair Programming',
      type: 'code_review',
      status: 'active',
      participants: [],
      host: alice.id,
      settings: {
        allowJoinAnytime: true,
        requireApproval: false,
        maxParticipants: 10,
        recordSession: true,
        allowAnonymous: false,
        lockResources: false,
        shareScreen: true,
        voiceChat: true,
        videoChat: true
      },
      resources: []
    });

    // Join session participants
    for (const user of users) {
      const role: ParticipantRole = user.id === alice.id ? 'host' : 'participant';
      await this.collaborationService.joinSession(session.id, user.id, role);
    }

    console.log(`✅ Session "${session.name}" started with ${session.participants.length} participants\n`);

    return session;
  }

  /**
   * Demonstrate real-time collaboration features
   */
  private async demonstrateRealtimeCollaboration(sessionId: string, users: User[]): Promise<void> {
    console.log('🔄 Demonstrating real-time collaboration...\n');

    const [alice, bob, charlie] = users;

    // Create live session
    await this.realtimeManager.createLiveSession(sessionId, alice.id);

    // Create connections for each user
    const connections = await Promise.all(users.map(user =>
      this.realtimeManager.createConnection(user.id, sessionId)
    ));

    // Add participants to live session
    for (const user of users) {
      const role: ParticipantRole = user.id === alice.id ? 'host' : 'participant';
      await this.realtimeManager.addParticipantToSession(sessionId, user.id, role);
    }

    // Simulate cursor movements
    await this.realtimeManager.updateCursor(sessionId, alice.id, {
      file: 'src/components/CodeEditor.tsx',
      line: 42,
      column: 15,
      timestamp: Date.now()
    });

    await this.sleep(500);

    await this.realtimeManager.updateCursor(sessionId, bob.id, {
      file: 'src/components/CodeEditor.tsx',
      line: 38,
      column: 8,
      timestamp: Date.now()
    });

    // Simulate text selection
    await this.realtimeManager.updateSelection(sessionId, alice.id, {
      file: 'src/components/CodeEditor.tsx',
      start: { line: 42, column: 15 },
      end: { line: 42, column: 25 },
      text: 'handleClick',
      timestamp: Date.now()
    });

    // Simulate typing status
    await this.realtimeManager.setTypingStatus(sessionId, bob.id, true);
    await this.sleep(2000);
    await this.realtimeManager.setTypingStatus(sessionId, bob.id, false);

    // Simulate voice/video
    await this.realtimeManager.enableVoice(sessionId, alice.id);
    await this.realtimeManager.enableVideo(sessionId, alice.id);
    
    await this.sleep(1000);
    
    await this.realtimeManager.startScreenShare(sessionId, alice.id);

    console.log('✅ Real-time collaboration demonstrated\n');
  }

  /**
   * Demonstrate code review process
   */
  private async demonstrateCodeReview(projectId: string, users: User[]): Promise<void> {
    console.log('📝 Demonstrating code review process...\n');

    const [alice, bob, charlie] = users;

    // Create code review
    const review = await this.collaborationService.createReview({
      type: 'code_review',
      status: 'pending',
      targetId: projectId,
      targetType: 'project',
      reviewerId: charlie.id,
      requesterId: bob.id,
      title: 'Code Review: AI Model Integration',
      description: 'Please review the new AI model integration feature',
      priority: 'high',
      criteria: [
        {
          id: 'code-quality',
          name: 'Code Quality',
          description: 'Code follows best practices and is well-structured',
          weight: 0.3,
          required: true,
          status: 'pending',
          maxScore: 10
        },
        {
          id: 'performance',
          name: 'Performance',
          description: 'Code is optimized for performance',
          weight: 0.25,
          required: true,
          status: 'pending',
          maxScore: 10
        },
        {
          id: 'security',
          name: 'Security',
          description: 'Code follows security best practices',
          weight: 0.25,
          required: true,
          status: 'pending',
          maxScore: 10
        },
        {
          id: 'documentation',
          name: 'Documentation',
          description: 'Code is well documented',
          weight: 0.2,
          required: false,
          status: 'pending',
          maxScore: 10
        }
      ],
      comments: [],
      suggestions: [],
      approvals: [],
      metadata: {
        filesChanged: 12,
        linesAdded: 450,
        linesRemoved: 85,
        complexity: 7.5,
        testCoverage: 85,
        securityScore: 9.2,
        performanceImpact: 'minimal',
        estimatedReviewTime: 120, // minutes
      }
    });

    // Simulate review process
    await this.sleep(1000);

    // Submit review
    await this.collaborationService.submitReview(
      review.id,
      charlie.id,
      'approved',
      'Great work! The code quality is excellent and performance optimizations are well implemented. Minor suggestions have been added as comments.'
    );

    console.log('✅ Code review process demonstrated\n');
  }

  /**
   * Demonstrate RBAC features
   */
  private async demonstrateRBAC(teamId: string, users: User[]): Promise<void> {
    console.log('🔐 Demonstrating RBAC features...\n');

    const [alice, bob, charlie] = users;

    // Create custom role
    const customRole = await this.rbacManager.createRole({
      name: 'Senior Developer',
      description: 'Senior developer with additional permissions',
      type: 'team',
      scope: 'team',
      permissions: [
        {
          id: 'senior-dev-permissions',
          name: 'Senior Developer Permissions',
          resource: 'project',
          actions: ['read', 'update', 'review', 'assign'],
          scope: 'resource'
        }
      ],
      isSystem: false,
      isDefault: false,
      teamId
    });

    // Assign custom role to Bob
    await this.rbacManager.assignRole({
      userId: bob.id,
      roleId: customRole.id,
      scope: 'team',
      resourceId: teamId,
      assignedBy: alice.id,
      assignedAt: Date.now(),
      isActive: true
    });

    // Test permission checking
    try {
      await this.rbacManager.checkPermission(bob.id, 'project', 'review', teamId);
      console.log('✅ Permission check passed: Bob can review projects');
    } catch (error) {
      console.log('❌ Permission check failed:', error.message);
    }

    // Test permission denial
    try {
      await this.rbacManager.checkPermission(charlie.id, 'team', 'delete', teamId);
      console.log('✅ Permission check passed: Charlie can delete team');
    } catch (error) {
      console.log('❌ Permission check failed (expected):', error.message);
    }

    // Get user permissions
    const bobPermissions = await this.rbacManager.getUserPermissions(bob.id, 'team', teamId);
    console.log(`📋 Bob has ${bobPermissions.permissions.length} permissions across ${bobPermissions.roles.length} roles`);

    console.log('✅ RBAC features demonstrated\n');
  }

  /**
   * Clean up session
   */
  private async cleanupSession(sessionId: string, users: User[]): Promise<void> {
    console.log('🧹 Cleaning up session...\n');

    const [alice] = users;

    // End collaboration session
    await this.collaborationService.endSession(sessionId, alice.id);

    // Close real-time connections
    const connections = await this.realtimeManager.getActiveConnections(sessionId);
    for (const connection of connections) {
      await this.realtimeManager.closeConnection(connection.id);
    }

    console.log('✅ Session cleaned up successfully\n');
  }

  /**
   * Utility methods
   */
  private createDefaultPreferences(): UserPreferences {
    return {
      notifications: {
        email: true,
        push: true,
        inApp: true,
        mentions: true,
        comments: true,
        reviews: true,
        projectUpdates: true,
        securityAlerts: true
      },
      theme: 'auto',
      codeStyle: {
        indentSize: 2,
        indentType: 'spaces',
        lineLength: 100,
        formatter: 'prettier',
        linter: 'eslint'
      },
      collaboration: {
        autoAssignReviews: false,
        allowDirectMessages: true,
        shareActivity: true,
        showOnlineStatus: true
      }
    };
  }

  private createDefaultTeamSettings(): TeamSettings {
    return {
      visibility: 'internal',
      joinPolicy: 'invite_only',
      defaultRole: 'developer',
      allowGuestAccess: false,
      requireApproval: true,
      maxMembers: 50,
      features: [
        { name: 'code_review', enabled: true },
        { name: 'real_time_collaboration', enabled: true },
        { name: 'voice_chat', enabled: true },
        { name: 'video_chat', enabled: true },
        { name: 'screen_sharing', enabled: true },
        { name: 'file_sharing', enabled: true }
      ]
    };
  }

  private createDefaultProjectSettings(): ProjectSettings {
    return {
      autoSave: true,
      versionControl: true,
      backupEnabled: true,
      shareCode: true,
      allowComments: true,
      requireReview: true,
      cicdEnabled: true,
      notifications: {
        onCodeChange: true,
        onComment: true,
        onReview: true,
        onError: true,
        onCompletion: true
      }
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down collaboration services...');
    
    await this.realtimeManager.shutdown();
    await this.rbacManager.shutdown();
    await this.collaborationService.shutdown();
    
    console.log('✅ All services shut down successfully');
  }
}

/**
 * Example usage scenarios for specific features
 */
export class CollaborationUsageExamples {

  /**
   * Basic team setup example
   */
  static async basicTeamSetup(): Promise<void> {
    const collaborationService = new CollaborationService();
    await collaborationService.initialize();

    // Create a user
    const user = await collaborationService.createUser({
      email: 'john@example.com',
      username: 'john',
      displayName: 'John Doe',
      status: 'active',
      lastSeen: Date.now(),
      preferences: {
        notifications: {
          email: true,
          push: false,
          inApp: true,
          mentions: true,
          comments: true,
          reviews: true,
          projectUpdates: false,
          securityAlerts: true
        },
        theme: 'dark',
        codeStyle: {
          indentSize: 4,
          indentType: 'spaces',
          lineLength: 120,
          formatter: 'prettier',
          linter: 'eslint'
        },
        collaboration: {
          autoAssignReviews: true,
          allowDirectMessages: true,
          shareActivity: true,
          showOnlineStatus: true
        }
      },
      profile: {
        timezone: 'UTC',
        language: 'en',
        skills: ['JavaScript', 'TypeScript'],
        experience: 'intermediate',
        socialLinks: {}
      }
    });

    console.log('Basic team setup completed:', {
      userId: user.id,
      displayName: user.displayName
    });

    await collaborationService.shutdown();
  }

  /**
   * Real-time collaboration example
   */
  static async realtimeCollaborationExample(): Promise<void> {
    const realtimeManager = new RealtimeManager();
    await realtimeManager.initialize();

    // Create session and connection
    const sessionId = 'demo-session';
    const userId = 'demo-user';

    await realtimeManager.createLiveSession(sessionId, userId);
    const connection = await realtimeManager.createConnection(userId, sessionId);

    // Simulate real-time interactions
    await realtimeManager.updateCursor(sessionId, userId, {
      file: 'example.ts',
      line: 10,
      column: 5,
      timestamp: Date.now()
    });

    await realtimeManager.setTypingStatus(sessionId, userId, true);

    console.log('Real-time collaboration example completed:', {
      sessionId,
      connectionId: connection.id
    });

    await realtimeManager.shutdown();
  }

  /**
   * RBAC permission example
   */
  static async rbacPermissionExample(): Promise<void> {
    const rbacManager = new RBACManager();
    await rbacManager.initialize();

    // Create custom role
    const role = await rbacManager.createRole({
      name: 'Code Reviewer',
      description: 'Can review and approve code changes',
      type: 'project',
      scope: 'project',
      permissions: [
        {
          id: 'review-permission',
          name: 'Code Review Permission',
          resource: 'project',
          actions: ['read', 'review', 'comment'],
          scope: 'resource'
        }
      ],
      isSystem: false,
      isDefault: false
    });

    // Assign role
    const assignment = await rbacManager.assignRole({
      userId: 'demo-user',
      roleId: role.id,
      scope: 'project',
      resourceId: 'demo-project',
      assignedBy: 'admin-user',
      assignedAt: Date.now(),
      isActive: true
    });

    console.log('RBAC permission example completed:', {
      roleId: role.id,
      assignmentId: assignment.id
    });

    await rbacManager.shutdown();
  }
}

// Export example runner
export async function runTeamCollaborationExamples(): Promise<void> {
  console.log('🚀 Running Team Collaboration Examples\n');

  const example = new TeamCollaborationExample();
  
  try {
    await example.demonstrateFullWorkflow();
    
    console.log('\n--- Additional Examples ---\n');
    
    await CollaborationUsageExamples.basicTeamSetup();
    await CollaborationUsageExamples.realtimeCollaborationExample();
    await CollaborationUsageExamples.rbacPermissionExample();
    
    console.log('\n✅ All team collaboration examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    throw error;
  } finally {
    await example.shutdown();
  }
}

// Auto-run if this file is executed directly
if (require.main === module) {
  runTeamCollaborationExamples().catch(console.error);
}