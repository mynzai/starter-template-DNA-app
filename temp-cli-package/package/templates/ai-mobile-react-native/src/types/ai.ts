export type AIProvider = 'openai' | 'anthropic' | 'offline' | 'custom';

export interface AIRequest {
  message: string;
  conversationId: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  systemPrompt?: string;
  attachments?: AIAttachment[];
}

export interface AIResponse {
  id: string;
  content: string;
  provider: AIProvider;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    timestamp: Date;
    conversationId?: string;
    finishReason?: string;
    stopReason?: string;
    streaming?: boolean;
    offline?: boolean;
    [key: string]: any;
  };
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: AIAttachment[];
  metadata?: {
    provider?: AIProvider;
    model?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    [key: string]: any;
  };
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    platform: string;
    version: string;
    tags?: string[];
    archived?: boolean;
    [key: string]: any;
  };
}

export interface AIAttachment {
  id: string;
  type: 'image' | 'document' | 'audio' | 'video';
  uri: string;
  name?: string;
  size?: number;
  mimeType?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: any;
  };
}

export interface AICapabilities {
  textGeneration: boolean;
  imageAnalysis: boolean;
  voiceRecognition: boolean;
  textToSpeech: boolean;
  documentAnalysis: boolean;
  streaming: boolean;
  offlineMode: boolean;
}

export interface AIError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
  provider?: AIProvider;
}

export interface AIStats {
  totalConversations: number;
  totalMessages: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  providerUsage: Record<AIProvider, number>;
  errorRate: number;
  cacheHitRate: number;
}

export interface AISettings {
  defaultProvider: AIProvider;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  enableStreaming: boolean;
  enableCaching: boolean;
  enableOfflineMode: boolean;
  autoSave: boolean;
  notificationSettings: {
    enableResponseNotifications: boolean;
    enableErrorNotifications: boolean;
    enableInsightNotifications: boolean;
  };
}