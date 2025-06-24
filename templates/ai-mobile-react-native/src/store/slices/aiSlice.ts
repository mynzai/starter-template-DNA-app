import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AIService from '../../services/AIService';
import { AIProvider, AIRequest, AIResponse, AIConversation, AIMessage, AIError } from '../../types/ai';

interface AIState {
  // Service status
  isInitialized: boolean;
  isOnline: boolean;
  currentProvider: AIProvider;
  
  // Active conversation
  activeConversationId: string | null;
  isTyping: boolean;
  isProcessing: boolean;
  
  // Messages and responses
  streamingMessage: string;
  lastResponse: AIResponse | null;
  
  // Error handling
  error: AIError | null;
  retryCount: number;
  
  // Statistics
  stats: {
    totalRequests: number;
    totalTokens: number;
    averageResponseTime: number;
    errorCount: number;
  };
  
  // Settings
  settings: {
    defaultProvider: AIProvider;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
    enableStreaming: boolean;
    autoSave: boolean;
  };
}

const initialState: AIState = {
  isInitialized: false,
  isOnline: false,
  currentProvider: 'openai',
  activeConversationId: null,
  isTyping: false,
  isProcessing: false,
  streamingMessage: '',
  lastResponse: null,
  error: null,
  retryCount: 0,
  stats: {
    totalRequests: 0,
    totalTokens: 0,
    averageResponseTime: 0,
    errorCount: 0,
  },
  settings: {
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7,
    enableStreaming: true,
    autoSave: true,
  },
};

// Async thunks
export const initializeAI = createAsyncThunk(
  'ai/initialize',
  async (config?: { openaiApiKey?: string; anthropicApiKey?: string }) => {
    const aiService = AIService.getInstance(config);
    await aiService.initialize();
    return {
      initialized: true,
      online: aiService.online,
    };
  }
);

export const sendMessage = createAsyncThunk(
  'ai/sendMessage',
  async (
    params: {
      message: string;
      conversationId?: string;
      options?: Partial<AIRequest>;
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { ai: AIState };
      const aiService = AIService.getInstance();
      
      const startTime = Date.now();
      
      const response = await aiService.sendMessage(
        params.message,
        params.conversationId || state.ai.activeConversationId || undefined,
        {
          model: state.ai.settings.defaultModel,
          maxTokens: state.ai.settings.maxTokens,
          temperature: state.ai.settings.temperature,
          stream: state.ai.settings.enableStreaming,
          ...params.options,
        }
      );
      
      const responseTime = Date.now() - startTime;
      
      return {
        response,
        responseTime,
        conversationId: response.metadata?.conversationId,
      };
    } catch (error: any) {
      return rejectWithValue({
        code: error.code || 'SEND_MESSAGE_ERROR',
        message: error.message,
        retryable: true,
      });
    }
  }
);

export const streamMessage = createAsyncThunk(
  'ai/streamMessage',
  async (
    params: {
      message: string;
      conversationId?: string;
      options?: Partial<AIRequest>;
    },
    { getState, dispatch }
  ) => {
    const state = getState() as { ai: AIState };
    const aiService = AIService.getInstance();
    
    const startTime = Date.now();
    
    const response = await aiService.streamMessage(
      params.message,
      params.conversationId || state.ai.activeConversationId || undefined,
      (chunk: string) => {
        dispatch(aiSlice.actions.appendStreamChunk(chunk));
      },
      {
        model: state.ai.settings.defaultModel,
        maxTokens: state.ai.settings.maxTokens,
        temperature: state.ai.settings.temperature,
        ...params.options,
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    return {
      response,
      responseTime,
      conversationId: response.metadata?.conversationId,
    };
  }
);

export const retryLastRequest = createAsyncThunk(
  'ai/retryLastRequest',
  async (_, { getState, dispatch }) => {
    const state = getState() as { ai: AIState };
    
    if (!state.ai.lastResponse || state.ai.retryCount >= 3) {
      throw new Error('Cannot retry: no previous request or max retries exceeded');
    }
    
    // Get the last user message from conversation
    // This would need to be implemented based on conversation structure
    throw new Error('Retry functionality not fully implemented');
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    
    clearStreamingMessage: (state) => {
      state.streamingMessage = '';
    },
    
    appendStreamChunk: (state, action: PayloadAction<string>) => {
      state.streamingMessage += action.payload;
    },
    
    setStreamingMessage: (state, action: PayloadAction<string>) => {
      state.streamingMessage = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
      state.retryCount = 0;
    },
    
    updateSettings: (state, action: PayloadAction<Partial<AIState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    setProvider: (state, action: PayloadAction<AIProvider>) => {
      state.currentProvider = action.payload;
      state.settings.defaultProvider = action.payload;
    },
    
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    
    incrementRetryCount: (state) => {
      state.retryCount += 1;
    },
    
    resetRetryCount: (state) => {
      state.retryCount = 0;
    },
    
    updateStats: (state, action: PayloadAction<{
      responseTime?: number;
      tokens?: number;
      error?: boolean;
    }>) => {
      const { responseTime, tokens, error } = action.payload;
      
      state.stats.totalRequests += 1;
      
      if (tokens) {
        state.stats.totalTokens += tokens;
      }
      
      if (responseTime) {
        const currentAvg = state.stats.averageResponseTime;
        const requestCount = state.stats.totalRequests;
        state.stats.averageResponseTime = 
          (currentAvg * (requestCount - 1) + responseTime) / requestCount;
      }
      
      if (error) {
        state.stats.errorCount += 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize AI
      .addCase(initializeAI.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(initializeAI.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.isInitialized = action.payload.initialized;
        state.isOnline = action.payload.online;
        state.error = null;
      })
      .addCase(initializeAI.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = {
          code: 'INITIALIZATION_ERROR',
          message: action.error.message || 'Failed to initialize AI service',
          retryable: true,
        };
      })
      
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
        state.isTyping = false;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.lastResponse = action.payload.response;
        state.activeConversationId = action.payload.conversationId || state.activeConversationId;
        state.retryCount = 0;
        
        // Update stats
        aiSlice.caseReducers.updateStats(state, {
          payload: {
            responseTime: action.payload.responseTime,
            tokens: action.payload.response.usage.totalTokens,
          },
          type: 'ai/updateStats',
        });
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as AIError;
        state.retryCount += 1;
        
        // Update error stats
        aiSlice.caseReducers.updateStats(state, {
          payload: { error: true },
          type: 'ai/updateStats',
        });
      })
      
      // Stream message
      .addCase(streamMessage.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
        state.streamingMessage = '';
        state.isTyping = false;
      })
      .addCase(streamMessage.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.lastResponse = action.payload.response;
        state.activeConversationId = action.payload.conversationId || state.activeConversationId;
        state.streamingMessage = '';
        state.retryCount = 0;
        
        // Update stats
        aiSlice.caseReducers.updateStats(state, {
          payload: {
            responseTime: action.payload.responseTime,
            tokens: action.payload.response.usage.totalTokens,
          },
          type: 'ai/updateStats',
        });
      })
      .addCase(streamMessage.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.error as AIError;
        state.streamingMessage = '';
        state.retryCount += 1;
        
        // Update error stats
        aiSlice.caseReducers.updateStats(state, {
          payload: { error: true },
          type: 'ai/updateStats',
        });
      })
      
      // Retry last request
      .addCase(retryLastRequest.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(retryLastRequest.fulfilled, (state) => {
        state.isProcessing = false;
        state.retryCount = 0;
      })
      .addCase(retryLastRequest.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = {
          code: 'RETRY_ERROR',
          message: action.error.message || 'Failed to retry request',
          retryable: false,
        };
      });
  },
});

// Export actions
export const {
  setActiveConversation,
  setTyping,
  clearStreamingMessage,
  appendStreamChunk,
  setStreamingMessage,
  clearError,
  updateSettings,
  setProvider,
  setOnlineStatus,
  incrementRetryCount,
  resetRetryCount,
  updateStats,
} = aiSlice.actions;

// Selectors
export const selectAI = (state: { ai: AIState }) => state.ai;
export const selectIsInitialized = (state: { ai: AIState }) => state.ai.isInitialized;
export const selectIsProcessing = (state: { ai: AIState }) => state.ai.isProcessing;
export const selectIsOnline = (state: { ai: AIState }) => state.ai.isOnline;
export const selectCurrentProvider = (state: { ai: AIState }) => state.ai.currentProvider;
export const selectActiveConversationId = (state: { ai: AIState }) => state.ai.activeConversationId;
export const selectStreamingMessage = (state: { ai: AIState }) => state.ai.streamingMessage;
export const selectLastResponse = (state: { ai: AIState }) => state.ai.lastResponse;
export const selectError = (state: { ai: AIState }) => state.ai.error;
export const selectStats = (state: { ai: AIState }) => state.ai.stats;
export const selectSettings = (state: { ai: AIState }) => state.ai.settings;

export default aiSlice;