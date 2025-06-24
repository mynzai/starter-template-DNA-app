/**
 * @fileoverview Real-time Collaboration Manager
 * Manages live collaboration features including presence, cursors, and real-time updates
 */

import { EventEmitter } from 'events';
import {
  User,
  CollaborationSession,
  SessionParticipant,
  CursorPosition,
  Selection,
  Message,
  ParticipantStatus,
  ParticipantRole,
  SessionPermission,
  SessionAction
} from './types';

export class RealtimeManager extends EventEmitter {
  private initialized = false;
  private connections: Map<string, Connection> = new Map();
  private sessions: Map<string, LiveSession> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private cursors: Map<string, Map<string, CursorPosition>> = new Map(); // sessionId -> userId -> cursor
  private selections: Map<string, Map<string, Selection>> = new Map(); // sessionId -> userId -> selection
  
  // Real-time synchronization
  private operationQueue: Map<string, OperationQueue> = new Map();
  private conflictResolver: ConflictResolver;
  private presenceHeartbeat: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.conflictResolver = new ConflictResolver();
    this.setupHeartbeat();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.startPresenceHeartbeat();
    this.initialized = true;
    this.emit('realtime:initialized');
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async createConnection(
    userId: string,
    sessionId: string,
    connectionType: ConnectionType = 'websocket'
  ): Promise<Connection> {
    const connection: Connection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionId,
      type: connectionType,
      status: 'connecting',
      establishedAt: Date.now(),
      lastActivity: Date.now(),
      metadata: {
        userAgent: 'unknown',
        ip: 'unknown'
      }
    };

    this.connections.set(connection.id, connection);

    // Update connection status
    setTimeout(() => {
      connection.status = 'connected';
      this.connections.set(connection.id, connection);
      this.emit('connection:established', { connection });
    }, 100);

    return connection;
  }

  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.status = 'disconnected';
    connection.closedAt = Date.now();

    // Clean up user presence
    await this.updateUserPresence(connection.userId, 'offline');
    
    // Remove from active sessions
    if (connection.sessionId) {
      await this.removeParticipantFromSession(connection.sessionId, connection.userId);
    }

    // Remove cursors and selections
    this.removeCursor(connection.sessionId, connection.userId);
    this.removeSelection(connection.sessionId, connection.userId);

    this.connections.set(connectionId, connection);
    this.emit('connection:closed', { connection });

    // Clean up after delay
    setTimeout(() => {
      this.connections.delete(connectionId);
    }, 60000); // Keep for 1 minute for debugging
  }

  async getActiveConnections(sessionId?: string): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(connection =>
      connection.status === 'connected' &&
      (!sessionId || connection.sessionId === sessionId)
    );
  }

  async heartbeat(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.lastActivity = Date.now();
    this.connections.set(connectionId, connection);

    // Update user presence
    await this.updateUserPresence(connection.userId, 'online');
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async createLiveSession(
    sessionId: string,
    hostId: string,
    sessionData: Partial<LiveSession> = {}
  ): Promise<LiveSession> {
    const liveSession: LiveSession = {
      id: sessionId,
      hostId,
      participants: new Map(),
      cursors: new Map(),
      selections: new Map(),
      sharedDocuments: new Map(),
      operationLog: [],
      status: 'active',
      startTime: Date.now(),
      lastActivity: Date.now(),
      settings: {
        allowAnonymous: false,
        maxParticipants: 50,
        requireApproval: false,
        allowVoice: true,
        allowVideo: true,
        allowScreenShare: true,
        allowFileShare: true,
        moderationEnabled: false,
        recordSession: false,
        ...sessionData.settings
      },
      metadata: sessionData.metadata || {}
    };

    this.sessions.set(sessionId, liveSession);
    this.cursors.set(sessionId, new Map());
    this.selections.set(sessionId, new Map());
    this.operationQueue.set(sessionId, new OperationQueue());

    this.emit('session:live:created', { session: liveSession });
    return liveSession;
  }

  async addParticipantToSession(
    sessionId: string,
    userId: string,
    role: ParticipantRole = 'participant'
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Live session not found: ${sessionId}`);
    }

    const participant: LiveParticipant = {
      userId,
      role,
      status: 'joined',
      joinedAt: Date.now(),
      permissions: this.getDefaultPermissions(role),
      cursor: null,
      selection: null,
      isTyping: false,
      isSpeaking: false,
      hasVideo: false,
      hasScreen: false
    };

    session.participants.set(userId, participant);
    session.lastActivity = Date.now();

    await this.updateUserPresence(userId, 'online', sessionId);

    this.emit('session:participant:joined', {
      sessionId,
      userId,
      participant,
      session
    });
  }

  async removeParticipantFromSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    participant.status = 'left';
    participant.leftAt = Date.now();
    session.participants.delete(userId);
    session.lastActivity = Date.now();

    // Clean up cursors and selections
    this.removeCursor(sessionId, userId);
    this.removeSelection(sessionId, userId);

    this.emit('session:participant:left', {
      sessionId,
      userId,
      participant,
      session
    });
  }

  async updateParticipantRole(
    sessionId: string,
    userId: string,
    newRole: ParticipantRole,
    updatedBy: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    const oldRole = participant.role;
    participant.role = newRole;
    participant.permissions = this.getDefaultPermissions(newRole);
    session.lastActivity = Date.now();

    this.emit('session:participant:role:updated', {
      sessionId,
      userId,
      oldRole,
      newRole,
      updatedBy,
      participant
    });
  }

  // ============================================================================
  // Cursor and Selection Management
  // ============================================================================

  async updateCursor(
    sessionId: string,
    userId: string,
    cursor: CursorPosition
  ): Promise<void> {
    const sessionCursors = this.cursors.get(sessionId);
    if (!sessionCursors) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    sessionCursors.set(userId, cursor);
    
    // Update participant cursor
    const participant = session.participants.get(userId);
    if (participant) {
      participant.cursor = cursor;
    }

    session.lastActivity = Date.now();

    this.emit('cursor:updated', {
      sessionId,
      userId,
      cursor,
      participants: Array.from(session.participants.keys())
    });
  }

  async updateSelection(
    sessionId: string,
    userId: string,
    selection: Selection
  ): Promise<void> {
    const sessionSelections = this.selections.get(sessionId);
    if (!sessionSelections) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    sessionSelections.set(userId, selection);
    
    // Update participant selection
    const participant = session.participants.get(userId);
    if (participant) {
      participant.selection = selection;
    }

    session.lastActivity = Date.now();

    this.emit('selection:updated', {
      sessionId,
      userId,
      selection,
      participants: Array.from(session.participants.keys())
    });
  }

  async setTypingStatus(
    sessionId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    participant.isTyping = isTyping;
    session.lastActivity = Date.now();

    this.emit('typing:status:changed', {
      sessionId,
      userId,
      isTyping
    });

    // Auto-clear typing status after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        if (participant.isTyping) {
          this.setTypingStatus(sessionId, userId, false);
        }
      }, 3000);
    }
  }

  private removeCursor(sessionId: string, userId: string): void {
    const sessionCursors = this.cursors.get(sessionId);
    if (sessionCursors) {
      sessionCursors.delete(userId);
    }
  }

  private removeSelection(sessionId: string, userId: string): void {
    const sessionSelections = this.selections.get(sessionId);
    if (sessionSelections) {
      sessionSelections.delete(userId);
    }
  }

  // ============================================================================
  // Document Collaboration
  // ============================================================================

  async applyOperation(
    sessionId: string,
    userId: string,
    operation: CollaborativeOperation
  ): Promise<OperationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const queue = this.operationQueue.get(sessionId);
    if (!queue) {
      throw new Error(`Operation queue not found for session: ${sessionId}`);
    }

    // Check permissions
    await this.checkOperationPermission(session, userId, operation);

    // Add operation to queue with timestamp and author
    const queuedOperation: QueuedOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      userId,
      timestamp: Date.now(),
      status: 'pending'
    };

    const result = await queue.enqueue(queuedOperation);
    
    // Apply operation if no conflicts
    if (result.applied) {
      session.operationLog.push(queuedOperation);
      session.lastActivity = Date.now();

      // Update shared document
      await this.updateSharedDocument(sessionId, operation);

      this.emit('operation:applied', {
        sessionId,
        operation: queuedOperation,
        result
      });
    } else {
      this.emit('operation:conflict', {
        sessionId,
        operation: queuedOperation,
        conflicts: result.conflicts
      });
    }

    return result;
  }

  async getDocumentState(sessionId: string, documentId: string): Promise<DocumentState | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const document = session.sharedDocuments.get(documentId);
    return document || null;
  }

  async shareDocument(
    sessionId: string,
    documentId: string,
    document: SharedDocument
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.sharedDocuments.set(documentId, {
      ...document,
      lastModified: Date.now(),
      version: (document.version || 0) + 1
    });

    session.lastActivity = Date.now();

    this.emit('document:shared', {
      sessionId,
      documentId,
      document
    });
  }

  private async updateSharedDocument(
    sessionId: string,
    operation: CollaborativeOperation
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const document = session.sharedDocuments.get(operation.documentId);
    if (!document) return;

    // Apply operation to document content
    switch (operation.type) {
      case 'insert':
        document.content = this.applyInsertOperation(document.content, operation);
        break;
      case 'delete':
        document.content = this.applyDeleteOperation(document.content, operation);
        break;
      case 'replace':
        document.content = this.applyReplaceOperation(document.content, operation);
        break;
    }

    document.lastModified = Date.now();
    document.version++;
    session.sharedDocuments.set(operation.documentId, document);
  }

  private applyInsertOperation(content: string, operation: CollaborativeOperation): string {
    const { position, text } = operation.data;
    return content.slice(0, position) + text + content.slice(position);
  }

  private applyDeleteOperation(content: string, operation: CollaborativeOperation): string {
    const { start, length } = operation.data;
    return content.slice(0, start) + content.slice(start + length);
  }

  private applyReplaceOperation(content: string, operation: CollaborativeOperation): string {
    const { start, length, text } = operation.data;
    return content.slice(0, start) + text + content.slice(start + length);
  }

  // ============================================================================
  // Presence Management
  // ============================================================================

  async updateUserPresence(
    userId: string,
    status: PresenceStatus,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const presence: UserPresence = {
      userId,
      status,
      lastSeen: Date.now(),
      sessionId,
      metadata: metadata || {}
    };

    this.userPresence.set(userId, presence);

    this.emit('presence:updated', {
      userId,
      presence,
      sessionId
    });
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    return this.userPresence.get(userId) || null;
  }

  async getSessionPresence(sessionId: string): Promise<UserPresence[]> {
    return Array.from(this.userPresence.values()).filter(presence =>
      presence.sessionId === sessionId && presence.status !== 'offline'
    );
  }

  // ============================================================================
  // Voice and Video Management
  // ============================================================================

  async enableVoice(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    participant.isSpeaking = true;
    session.lastActivity = Date.now();

    this.emit('voice:enabled', { sessionId, userId });
  }

  async disableVoice(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    participant.isSpeaking = false;
    session.lastActivity = Date.now();

    this.emit('voice:disabled', { sessionId, userId });
  }

  async enableVideo(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    participant.hasVideo = true;
    session.lastActivity = Date.now();

    this.emit('video:enabled', { sessionId, userId });
  }

  async disableVideo(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    participant.hasVideo = false;
    session.lastActivity = Date.now();

    this.emit('video:disabled', { sessionId, userId });
  }

  async startScreenShare(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    // Check if someone else is already sharing
    const currentSharer = Array.from(session.participants.values()).find(p => p.hasScreen);
    if (currentSharer && currentSharer.userId !== userId) {
      throw new Error('Another participant is already sharing their screen');
    }

    participant.hasScreen = true;
    session.lastActivity = Date.now();

    this.emit('screen:share:started', { sessionId, userId });
  }

  async stopScreenShare(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    participant.hasScreen = false;
    session.lastActivity = Date.now();

    this.emit('screen:share:stopped', { sessionId, userId });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private async checkOperationPermission(
    session: LiveSession,
    userId: string,
    operation: CollaborativeOperation
  ): Promise<void> {
    const participant = session.participants.get(userId);
    if (!participant) {
      throw new Error('User is not a session participant');
    }

    // Check if user has edit permissions
    const canEdit = participant.permissions.some(permission =>
      permission.action === 'edit' && permission.allowed
    );

    if (!canEdit) {
      throw new Error('User does not have edit permissions');
    }

    // Additional operation-specific checks could go here
  }

  private getDefaultPermissions(role: ParticipantRole): SessionPermission[] {
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

  private setupHeartbeat(): void {
    // Clean up inactive connections every 30 seconds
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 30000);
  }

  private startPresenceHeartbeat(): void {
    this.presenceHeartbeat = setInterval(() => {
      this.updatePresenceStatus();
    }, 5000); // Update every 5 seconds
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const timeout = 300000; // 5 minutes

    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.status === 'connected' && now - connection.lastActivity > timeout) {
        this.closeConnection(connectionId);
      }
    }
  }

  private updatePresenceStatus(): void {
    const now = Date.now();
    const offlineThreshold = 60000; // 1 minute

    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.status !== 'offline' && now - presence.lastSeen > offlineThreshold) {
        this.updateUserPresence(userId, 'offline');
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat);
      this.presenceHeartbeat = null;
    }

    // Close all connections
    const activeConnections = await this.getActiveConnections();
    for (const connection of activeConnections) {
      await this.closeConnection(connection.id);
    }

    this.initialized = false;
    this.emit('realtime:shutdown');
  }
}

// ============================================================================
// Supporting Classes and Interfaces
// ============================================================================

class ConflictResolver {
  resolve(operations: QueuedOperation[]): OperationResult {
    // Simple last-write-wins strategy
    // In a production system, this would be more sophisticated
    return {
      applied: true,
      conflicts: [],
      transformedOperation: operations[operations.length - 1]?.operation || null
    };
  }
}

class OperationQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;

  async enqueue(operation: QueuedOperation): Promise<OperationResult> {
    this.queue.push(operation);
    return this.processQueue();
  }

  private async processQueue(): Promise<OperationResult> {
    if (this.processing) {
      return { applied: false, conflicts: [], transformedOperation: null };
    }

    this.processing = true;
    
    try {
      const operation = this.queue.shift();
      if (!operation) {
        return { applied: false, conflicts: [], transformedOperation: null };
      }

      // Simple processing - mark as applied
      operation.status = 'applied';
      
      return {
        applied: true,
        conflicts: [],
        transformedOperation: operation.operation
      };
    } finally {
      this.processing = false;
    }
  }
}

// Supporting interfaces
interface Connection {
  id: string;
  userId: string;
  sessionId: string;
  type: ConnectionType;
  status: ConnectionStatus;
  establishedAt: number;
  lastActivity: number;
  closedAt?: number;
  metadata: {
    userAgent: string;
    ip: string;
    [key: string]: any;
  };
}

interface LiveSession {
  id: string;
  hostId: string;
  participants: Map<string, LiveParticipant>;
  cursors: Map<string, CursorPosition>;
  selections: Map<string, Selection>;
  sharedDocuments: Map<string, SharedDocument>;
  operationLog: QueuedOperation[];
  status: 'active' | 'paused' | 'ended';
  startTime: number;
  endTime?: number;
  lastActivity: number;
  settings: LiveSessionSettings;
  metadata: Record<string, any>;
}

interface LiveParticipant {
  userId: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joinedAt: number;
  leftAt?: number;
  permissions: SessionPermission[];
  cursor: CursorPosition | null;
  selection: Selection | null;
  isTyping: boolean;
  isSpeaking: boolean;
  hasVideo: boolean;
  hasScreen: boolean;
}

interface LiveSessionSettings {
  allowAnonymous: boolean;
  maxParticipants: number;
  requireApproval: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  allowScreenShare: boolean;
  allowFileShare: boolean;
  moderationEnabled: boolean;
  recordSession: boolean;
}

interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
  sessionId?: string;
  metadata: Record<string, any>;
}

interface CollaborativeOperation {
  type: OperationType;
  documentId: string;
  data: OperationData;
}

interface QueuedOperation {
  id: string;
  operation: CollaborativeOperation;
  userId: string;
  timestamp: number;
  status: 'pending' | 'applied' | 'rejected';
}

interface OperationResult {
  applied: boolean;
  conflicts: string[];
  transformedOperation: CollaborativeOperation | null;
}

interface SharedDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  version: number;
  lastModified: number;
  modifiedBy: string;
}

interface DocumentState {
  document: SharedDocument;
  cursors: Map<string, CursorPosition>;
  selections: Map<string, Selection>;
  activeUsers: string[];
}

interface OperationData {
  position?: number;
  start?: number;
  length?: number;
  text?: string;
  [key: string]: any;
}

type ConnectionType = 'websocket' | 'sse' | 'polling';
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
type OperationType = 'insert' | 'delete' | 'replace' | 'format' | 'move';