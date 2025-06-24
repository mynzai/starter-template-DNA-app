// Core collaboration types
export interface CollaborationSession {
  id: string;
  documentId: string;
  participants: string[];
  createdAt: string;
}

export interface PeerConnection {
  id: string;
  userId: string;
  connectedAt: string;
  latencyMs: number | null;
}

// Operational transformation types
export interface Operation {
  id: string;
  clientId: string;
  operationType: OperationType;
  timestamp: string;
  revision: number;
}

export type OperationType =
  | { type: 'Insert'; position: number; content: string }
  | { type: 'Delete'; position: number; length: number }
  | { type: 'Retain'; length: number };

export interface OperationResult {
  success: boolean;
  newRevision: number;
  transformedOperations: Operation[];
  conflictResolved: boolean;
}

// Document types
export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  language?: string;
  fileExtension?: string;
  sizeBytes: number;
  lineCount: number;
  characterCount: number;
  wordCount: number;
  collaborators: string[];
  tags: string[];
}

export interface DocumentState {
  document: Document;
  currentRevision: number;
  operationCount: number;
  activeCollaborators: string[];
  lastOperationTimestamp?: string;
  conflictCount: number;
  syncState: SyncState;
}

export type SyncState =
  | 'Synchronized'
  | 'MinorConflicts'
  | 'MajorConflicts'
  | 'Synchronizing'
  | 'Corrupted';

// User presence types
export interface UserPresence {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  status: PresenceStatus;
  cursorPosition?: CursorPosition;
  selection?: TextSelection;
  lastSeen: string;
  connectionQuality: ConnectionQuality;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface CursorPosition {
  documentId: string;
  line: number;
  column: number;
  absolutePosition: number;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
  text: string;
}

export interface ConnectionQuality {
  latencyMs?: number;
  signalStrength: number; // 0-100
  packetLoss: number; // 0.0-1.0
}

// Performance monitoring types
export interface PerformanceMetrics {
  avgOperationLatencyMs: number;
  p95OperationLatencyMs: number;
  totalOperations: number;
  operationsPerSecond: number;
  memoryUsageBytes: number;
  connections: ConnectionMetrics;
  webrtc: WebRTCMetrics;
  document: DocumentMetrics;
  timestamp: string;
}

export interface ConnectionMetrics {
  activeConnections: number;
  totalConnections: number;
  avgConnectionTimeMs: number;
  connectionFailures: number;
  disconnections: number;
}

export interface WebRTCMetrics {
  avgPeerLatencyMs: number;
  maxPeerLatencyMs: number;
  dataChannelsActive: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransmitted: number;
  packetLossRate: number;
}

export interface DocumentMetrics {
  documentsActive: number;
  totalDocumentOperations: number;
  avgDocumentSizeBytes: number;
  conflictsResolved: number;
  syncFailures: number;
}

export interface OptimizationRecommendation {
  category: string;
  severity: RecommendationSeverity;
  description: string;
  suggestions: string[];
}

export type RecommendationSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

// WebRTC signaling types
export type SignalingMessage =
  | {
      type: 'Join';
      roomId: string;
      userId: string;
      userName: string;
    }
  | {
      type: 'Leave';
      roomId: string;
      userId: string;
    }
  | {
      type: 'Offer';
      roomId: string;
      fromUser: string;
      toUser: string;
      offer: RTCSessionDescriptionInit;
    }
  | {
      type: 'Answer';
      roomId: string;
      fromUser: string;
      toUser: string;
      answer: RTCSessionDescriptionInit;
    }
  | {
      type: 'IceCandidate';
      roomId: string;
      fromUser: string;
      toUser: string;
      candidate: RTCIceCandidateInit;
    }
  | {
      type: 'UserList';
      roomId: string;
      users: UserInfo[];
    }
  | {
      type: 'Error';
      message: string;
    };

export interface UserInfo {
  userId: string;
  userName: string;
  connectedAt: string;
}

// Editor types
export interface EditorState {
  content: string;
  cursorPosition: CursorPosition;
  selection?: TextSelection;
  language?: string;
  readOnly: boolean;
}

export interface EditorChange {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  length?: number;
  text?: string;
  source: 'user' | 'remote' | 'undo' | 'redo';
}

// Application configuration
export interface AppConfig {
  signalingServer: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  webrtc: {
    iceServers: RTCIceServer[];
    maxPeers: number;
    connectionTimeout: number;
  };
  performance: {
    monitoringInterval: number;
    latencyThreshold: number;
    memoryThreshold: number;
    enableProfiling: boolean;
  };
  editor: {
    theme: string;
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
  };
}

// Event types for real-time communication
export interface CollaborationEvent {
  type: CollaborationEventType;
  sessionId: string;
  userId: string;
  timestamp: string;
  data: unknown;
}

export type CollaborationEventType =
  | 'operation'
  | 'presence-update'
  | 'cursor-move'
  | 'selection-change'
  | 'user-join'
  | 'user-leave'
  | 'document-save'
  | 'conflict-detected'
  | 'sync-complete';

// Utility types
export interface Point {
  x: number;
  y: number;
}

export interface Range {
  start: number;
  end: number;
}

export interface Timestamp {
  created: string;
  updated: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface CollaborationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// Theme and styling types
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Keyboard shortcut types
export interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  action: string;
  description: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}