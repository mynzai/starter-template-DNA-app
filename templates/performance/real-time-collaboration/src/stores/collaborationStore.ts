import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { invoke } from '@tauri-apps/api/tauri';

import type {
  CollaborationSession,
  Operation,
  OperationResult,
  UserPresence,
  ConnectionQuality,
  PeerConnection,
} from '../types';

export interface CollaborationState {
  // Session state
  session: CollaborationSession | null;
  isConnected: boolean;
  connectionQuality: ConnectionQuality | null;
  
  // Peer connections
  peerConnections: Map<string, PeerConnection>;
  
  // User presence
  userPresences: Map<string, UserPresence>;
  currentUserPresence: UserPresence | null;
  
  // Operations
  pendingOperations: Operation[];
  operationHistory: Operation[];
  
  // WebRTC state
  localPeerId: string | null;
  signalingConnected: boolean;
  
  // Performance tracking
  lastOperationLatency: number | null;
  averageLatency: number;
  totalOperations: number;
}

export interface CollaborationActions {
  // Session management
  initializeSession: (session: CollaborationSession) => Promise<void>;
  joinSession: (sessionId: string, userId: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  
  // Operations
  applyOperation: (operation: Omit<Operation, 'id' | 'timestamp'>) => Promise<OperationResult>;
  addPendingOperation: (operation: Operation) => void;
  removePendingOperation: (operationId: string) => void;
  
  // Presence management
  updateUserPresence: (presence: Partial<UserPresence>) => Promise<void>;
  updatePresenceList: (presences: UserPresence[]) => void;
  
  // Connection management
  createPeerConnection: (remoteUserId: string) => Promise<string>;
  updateConnectionQuality: (quality: ConnectionQuality) => void;
  handlePeerDisconnection: (peerId: string) => void;
  
  // WebRTC signaling
  connectToSignalingServer: (serverUrl: string) => Promise<void>;
  disconnectFromSignalingServer: () => void;
  
  // Utility
  reset: () => void;
}

type CollaborationStore = CollaborationState & CollaborationActions;

const initialState: CollaborationState = {
  session: null,
  isConnected: false,
  connectionQuality: null,
  peerConnections: new Map(),
  userPresences: new Map(),
  currentUserPresence: null,
  pendingOperations: [],
  operationHistory: [],
  localPeerId: null,
  signalingConnected: false,
  lastOperationLatency: null,
  averageLatency: 0,
  totalOperations: 0,
};

export const useCollaborationStore = create<CollaborationStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // Session management
      initializeSession: async (session: CollaborationSession) => {
        try {
          set((state) => {
            state.session = session;
            state.isConnected = true;
          });

          // Initialize WebRTC connections for existing participants
          const currentState = get();
          for (const participantId of session.participants) {
            if (participantId !== currentState.localPeerId) {
              await get().createPeerConnection(participantId);
            }
          }

          console.log('Session initialized:', session.id);
        } catch (error) {
          console.error('Failed to initialize session:', error);
          throw error;
        }
      },

      joinSession: async (sessionId: string, userId: string) => {
        try {
          const session = await invoke<CollaborationSession>('join_session', {
            sessionId,
            userId,
          });

          set((state) => {
            state.session = session;
            state.isConnected = true;
            state.localPeerId = userId;
          });

          // Create WebRTC connections to existing participants
          for (const participantId of session.participants) {
            if (participantId !== userId) {
              await get().createPeerConnection(participantId);
            }
          }

          console.log('Joined session:', sessionId);
        } catch (error) {
          console.error('Failed to join session:', error);
          throw error;
        }
      },

      leaveSession: async () => {
        try {
          const currentState = get();
          if (currentState.session && currentState.localPeerId) {
            await invoke('leave_session', {
              sessionId: currentState.session.id,
              userId: currentState.localPeerId,
            });
          }

          // Close all peer connections
          for (const [peerId] of currentState.peerConnections) {
            await get().handlePeerDisconnection(peerId);
          }

          // Disconnect from signaling server
          get().disconnectFromSignalingServer();

          // Reset state
          get().reset();

          console.log('Left session');
        } catch (error) {
          console.error('Failed to leave session:', error);
          throw error;
        }
      },

      // Operations
      applyOperation: async (operation: Omit<Operation, 'id' | 'timestamp'>) => {
        const startTime = performance.now();
        
        try {
          // Create full operation object
          const fullOperation: Operation = {
            ...operation,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          };

          // Add to pending operations
          get().addPendingOperation(fullOperation);

          // Apply operation via Tauri backend
          const result = await invoke<OperationResult>('apply_operation', {
            operationData: JSON.stringify(fullOperation),
            sessionId: get().session?.id,
          });

          // Calculate latency
          const latency = performance.now() - startTime;
          
          set((state) => {
            // Remove from pending operations
            state.pendingOperations = state.pendingOperations.filter(
              (op) => op.id !== fullOperation.id
            );
            
            // Add to history if successful
            if (result.success) {
              state.operationHistory.push(fullOperation);
              
              // Keep history bounded
              if (state.operationHistory.length > 1000) {
                state.operationHistory.shift();
              }
            }
            
            // Update performance metrics
            state.lastOperationLatency = latency;
            state.totalOperations += 1;
            state.averageLatency = 
              (state.averageLatency * (state.totalOperations - 1) + latency) / state.totalOperations;
          });

          console.log(`Operation applied in ${latency.toFixed(2)}ms:`, result);
          return result;
        } catch (error) {
          // Remove from pending operations on error
          set((state) => {
            state.pendingOperations = state.pendingOperations.filter(
              (op) => op.id !== operation.id
            );
          });
          
          console.error('Failed to apply operation:', error);
          throw error;
        }
      },

      addPendingOperation: (operation: Operation) => {
        set((state) => {
          state.pendingOperations.push(operation);
        });
      },

      removePendingOperation: (operationId: string) => {
        set((state) => {
          state.pendingOperations = state.pendingOperations.filter(
            (op) => op.id !== operationId
          );
        });
      },

      // Presence management
      updateUserPresence: async (presence: Partial<UserPresence>) => {
        try {
          const currentState = get();
          if (!currentState.localPeerId) {
            throw new Error('No local peer ID set');
          }

          const updatedPresence: UserPresence = {
            userId: currentState.localPeerId,
            displayName: 'Current User', // Should come from user profile
            avatarUrl: null,
            status: 'online',
            cursorPosition: null,
            selection: null,
            lastSeen: new Date().toISOString(),
            connectionQuality: currentState.connectionQuality || {
              latencyMs: null,
              signalStrength: 100,
              packetLoss: 0,
            },
            ...presence,
          };

          await invoke('update_user_presence', {
            userId: currentState.localPeerId,
            presenceData: JSON.stringify(updatedPresence),
          });

          set((state) => {
            state.currentUserPresence = updatedPresence;
            state.userPresences.set(updatedPresence.userId, updatedPresence);
          });

          console.log('Updated user presence:', updatedPresence);
        } catch (error) {
          console.error('Failed to update user presence:', error);
          throw error;
        }
      },

      updatePresenceList: (presences: UserPresence[]) => {
        set((state) => {
          state.userPresences.clear();
          for (const presence of presences) {
            state.userPresences.set(presence.userId, presence);
          }
        });
      },

      // Connection management
      createPeerConnection: async (remoteUserId: string) => {
        try {
          const connectionId = await invoke<string>('create_webrtc_connection', {
            remoteUserId,
          });

          const peerConnection: PeerConnection = {
            id: connectionId,
            userId: remoteUserId,
            connectedAt: new Date().toISOString(),
            latencyMs: null,
          };

          set((state) => {
            state.peerConnections.set(remoteUserId, peerConnection);
          });

          console.log(`Created peer connection to ${remoteUserId}:`, connectionId);
          return connectionId;
        } catch (error) {
          console.error(`Failed to create peer connection to ${remoteUserId}:`, error);
          throw error;
        }
      },

      updateConnectionQuality: (quality: ConnectionQuality) => {
        set((state) => {
          state.connectionQuality = quality;
          
          // Update current user presence with new quality
          if (state.currentUserPresence) {
            state.currentUserPresence.connectionQuality = quality;
            state.userPresences.set(state.currentUserPresence.userId, state.currentUserPresence);
          }
        });
      },

      handlePeerDisconnection: (peerId: string) => {
        set((state) => {
          state.peerConnections.delete(peerId);
          
          // Remove from user presences
          for (const [userId, presence] of state.userPresences) {
            if (presence.userId === peerId) {
              state.userPresences.delete(userId);
              break;
            }
          }
        });
        
        console.log(`Peer ${peerId} disconnected`);
      },

      // WebRTC signaling
      connectToSignalingServer: async (serverUrl: string) => {
        try {
          // This would be implemented using WebSocket connection
          // For now, we'll simulate the connection
          set((state) => {
            state.signalingConnected = true;
          });
          
          console.log(`Connected to signaling server: ${serverUrl}`);
        } catch (error) {
          console.error('Failed to connect to signaling server:', error);
          throw error;
        }
      },

      disconnectFromSignalingServer: () => {
        set((state) => {
          state.signalingConnected = false;
        });
        
        console.log('Disconnected from signaling server');
      },

      // Utility
      reset: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },
    }))
  )
);

// Subscribe to connection quality changes for automatic presence updates
useCollaborationStore.subscribe(
  (state) => state.connectionQuality,
  (connectionQuality) => {
    if (connectionQuality) {
      const store = useCollaborationStore.getState();
      if (store.currentUserPresence) {
        store.updateUserPresence({ connectionQuality });
      }
    }
  }
);

// Subscribe to session changes for automatic cleanup
useCollaborationStore.subscribe(
  (state) => state.session,
  (session, previousSession) => {
    if (previousSession && !session) {
      // Session ended, perform cleanup
      console.log('Session ended, performing cleanup');
    }
  }
);