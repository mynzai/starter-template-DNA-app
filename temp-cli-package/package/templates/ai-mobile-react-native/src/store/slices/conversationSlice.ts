import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AIConversation, AIMessage } from '../../types/ai';

interface ConversationState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  searchQuery: string;
  filteredConversations: AIConversation[];
  totalTokensUsed: number;
  averageMessagesPerConversation: number;
}

const initialState: ConversationState = {
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  searchQuery: '',
  filteredConversations: [],
  totalTokensUsed: 0,
  averageMessagesPerConversation: 0,
};

const conversationSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    addConversation: (state, action: PayloadAction<AIConversation>) => {
      state.conversations.unshift(action.payload);
      state.filteredConversations = filterConversations(state.conversations, state.searchQuery);
      updateStats(state);
    },
    
    updateConversation: (state, action: PayloadAction<AIConversation>) => {
      const index = state.conversations.findIndex(conv => conv.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = action.payload;
        state.filteredConversations = filterConversations(state.conversations, state.searchQuery);
        updateStats(state);
      }
    },
    
    deleteConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(conv => conv.id !== action.payload);
      state.filteredConversations = filterConversations(state.conversations, state.searchQuery);
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = null;
      }
      updateStats(state);
    },
    
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    
    addMessageToConversation: (state, action: PayloadAction<{ conversationId: string; message: AIMessage }>) => {
      const conversation = state.conversations.find(conv => conv.id === action.payload.conversationId);
      if (conversation) {
        conversation.messages.push(action.payload.message);
        conversation.updatedAt = new Date();
        
        // Update title if this is the first user message
        if (conversation.messages.length === 1 && action.payload.message.role === 'user') {
          conversation.title = action.payload.message.content.slice(0, 50) + '...';
        }
        
        state.filteredConversations = filterConversations(state.conversations, state.searchQuery);
        updateStats(state);
      }
    },
    
    updateMessageInConversation: (state, action: PayloadAction<{ 
      conversationId: string; 
      messageId: string; 
      updates: Partial<AIMessage>;
    }>) => {
      const conversation = state.conversations.find(conv => conv.id === action.payload.conversationId);
      if (conversation) {
        const message = conversation.messages.find(msg => msg.id === action.payload.messageId);
        if (message) {
          Object.assign(message, action.payload.updates);
          conversation.updatedAt = new Date();
        }
      }
    },
    
    deleteMessageFromConversation: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
      const conversation = state.conversations.find(conv => conv.id === action.payload.conversationId);
      if (conversation) {
        conversation.messages = conversation.messages.filter(msg => msg.id !== action.payload.messageId);
        conversation.updatedAt = new Date();
        updateStats(state);
      }
    },
    
    clearAllConversations: (state) => {
      state.conversations = [];
      state.filteredConversations = [];
      state.activeConversationId = null;
      state.totalTokensUsed = 0;
      state.averageMessagesPerConversation = 0;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredConversations = filterConversations(state.conversations, action.payload);
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    loadConversations: (state, action: PayloadAction<AIConversation[]>) => {
      state.conversations = action.payload.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      state.filteredConversations = filterConversations(state.conversations, state.searchQuery);
      updateStats(state);
    },
    
    archiveConversation: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(conv => conv.id === action.payload);
      if (conversation) {
        conversation.metadata.archived = true;
        conversation.updatedAt = new Date();
        state.filteredConversations = filterConversations(state.conversations, state.searchQuery);
      }
    },
    
    unarchiveConversation: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(conv => conv.id === action.payload);
      if (conversation) {
        conversation.metadata.archived = false;
        conversation.updatedAt = new Date();
        state.filteredConversations = filterConversations(state.conversations, state.searchQuery);
      }
    },
    
    addTagToConversation: (state, action: PayloadAction<{ conversationId: string; tag: string }>) => {
      const conversation = state.conversations.find(conv => conv.id === action.payload.conversationId);
      if (conversation) {
        if (!conversation.metadata.tags) {
          conversation.metadata.tags = [];
        }
        if (!conversation.metadata.tags.includes(action.payload.tag)) {
          conversation.metadata.tags.push(action.payload.tag);
          conversation.updatedAt = new Date();
        }
      }
    },
    
    removeTagFromConversation: (state, action: PayloadAction<{ conversationId: string; tag: string }>) => {
      const conversation = state.conversations.find(conv => conv.id === action.payload.conversationId);
      if (conversation && conversation.metadata.tags) {
        conversation.metadata.tags = conversation.metadata.tags.filter(tag => tag !== action.payload.tag);
        conversation.updatedAt = new Date();
      }
    },
  },
});

// Helper functions
function filterConversations(conversations: AIConversation[], searchQuery: string): AIConversation[] {
  if (!searchQuery.trim()) {
    return conversations.filter(conv => !conv.metadata.archived);
  }
  
  const query = searchQuery.toLowerCase();
  return conversations.filter(conversation => {
    if (conversation.metadata.archived) return false;
    
    // Search in title
    if (conversation.title.toLowerCase().includes(query)) return true;
    
    // Search in messages
    if (conversation.messages.some(msg => msg.content.toLowerCase().includes(query))) return true;
    
    // Search in tags
    if (conversation.metadata.tags?.some(tag => tag.toLowerCase().includes(query))) return true;
    
    return false;
  });
}

function updateStats(state: ConversationState): void {
  // Calculate total tokens used
  state.totalTokensUsed = state.conversations.reduce((total, conversation) => {
    return total + conversation.messages.reduce((msgTotal, message) => {
      return msgTotal + (message.metadata?.usage?.totalTokens || 0);
    }, 0);
  }, 0);
  
  // Calculate average messages per conversation
  if (state.conversations.length > 0) {
    const totalMessages = state.conversations.reduce((total, conv) => total + conv.messages.length, 0);
    state.averageMessagesPerConversation = totalMessages / state.conversations.length;
  } else {
    state.averageMessagesPerConversation = 0;
  }
}

export const {
  addConversation,
  updateConversation,
  deleteConversation,
  setActiveConversation,
  addMessageToConversation,
  updateMessageInConversation,
  deleteMessageFromConversation,
  clearAllConversations,
  setSearchQuery,
  setLoading,
  loadConversations,
  archiveConversation,
  unarchiveConversation,
  addTagToConversation,
  removeTagFromConversation,
} = conversationSlice.actions;

// Selectors
export const selectConversations = (state: { conversations: ConversationState }) => 
  state.conversations.filteredConversations.length > 0 
    ? state.conversations.filteredConversations 
    : state.conversations.conversations.filter(conv => !conv.metadata.archived);

export const selectActiveConversation = (state: { conversations: ConversationState }) => {
  if (!state.conversations.activeConversationId) return null;
  return state.conversations.conversations.find(conv => conv.id === state.conversations.activeConversationId) || null;
};

export const selectConversationById = (conversationId: string) => (state: { conversations: ConversationState }) =>
  state.conversations.conversations.find(conv => conv.id === conversationId);

export const selectArchivedConversations = (state: { conversations: ConversationState }) =>
  state.conversations.conversations.filter(conv => conv.metadata.archived);

export const selectConversationStats = (state: { conversations: ConversationState }) => ({
  total: state.conversations.conversations.length,
  active: state.conversations.conversations.filter(conv => !conv.metadata.archived).length,
  archived: state.conversations.conversations.filter(conv => conv.metadata.archived).length,
  totalTokensUsed: state.conversations.totalTokensUsed,
  averageMessagesPerConversation: state.conversations.averageMessagesPerConversation,
});

export const selectAllTags = (state: { conversations: ConversationState }) => {
  const tags = new Set<string>();
  state.conversations.conversations.forEach(conv => {
    conv.metadata.tags?.forEach(tag => tags.add(tag));
  });
  return Array.from(tags);
};

export default conversationSlice;