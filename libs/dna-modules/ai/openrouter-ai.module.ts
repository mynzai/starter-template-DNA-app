import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

const OpenRouterConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().default('anthropic/claude-3-sonnet'),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  streaming: z.boolean().default(true),
  fallbackModels: z.array(z.string()).default(['openai/gpt-3.5-turbo']),
  rateLimiting: z.boolean().default(true),
  caching: z.boolean().default(true),
  transforms: z.object({
    prompt: z.boolean().default(false),
    response: z.boolean().default(false)
  }).default({ prompt: false, response: false })
});

type OpenRouterConfig = z.infer<typeof OpenRouterConfigSchema>;

export class OpenRouterAIModule extends BaseDNAModule<OpenRouterConfig> {
  metadata: DNAModuleMetadata = {
    id: 'ai-openrouter',
    name: 'OpenRouter AI Integration',
    description: 'Multi-model AI integration through OpenRouter with automatic fallbacks and model routing',
    version: '1.0.0',
    category: 'ai',
    tags: ['ai', 'openrouter', 'multi-model', 'claude', 'gpt', 'llama', 'routing'],
    author: 'DNA System',
    dependencies: [],
    conflicts: [],
    frameworks: ['nextjs', 'flutter', 'react-native', 'tauri', 'sveltekit'],
    maturityLevel: 'stable'
  };

  configurationSchema: ConfigurationSchema<OpenRouterConfig> = {
    schema: OpenRouterConfigSchema,
    defaultConfig: {
      apiKey: '',
      model: 'anthropic/claude-3-sonnet',
      maxTokens: 4096,
      temperature: 0.7,
      streaming: true,
      fallbackModels: ['openai/gpt-3.5-turbo'],
      rateLimiting: true,
      caching: true,
      transforms: { prompt: false, response: false }
    }
  };

  frameworkImplementations: Record<string, FrameworkImplementation> = {
    nextjs: {
      dependencies: {
        'node-fetch': '^3.3.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/openrouter-client.ts',
          content: () => this.generateOpenRouterClient()
        },
        {
          path: 'components/OpenRouterChat.tsx',
          content: () => this.generateChatComponent()
        },
        {
          path: 'api/openrouter/chat.ts',
          content: () => this.generateChatAPI()
        },
        {
          path: 'api/openrouter/models.ts',
          content: () => this.generateModelsAPI()
        }
      ]
    },
    flutter: {
      dependencies: {
        'http': '^1.1.0',
        'shared_preferences': '^2.2.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/services/openrouter_service.dart',
          content: () => this.generateFlutterService()
        }
      ]
    }
  };

  private generateOpenRouterClient(): string {
    return `
import fetch from 'node-fetch';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider: {
    max_completion_tokens?: number;
  };
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private rateLimiter: Map<string, number> = new Map();
  private cache: Map<string, any> = new Map();
  private availableModels: OpenRouterModel[] = [];

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '${this.config.apiKey}';
  }

  async initialize(): Promise<void> {
    await this.loadAvailableModels();
  }

  async loadAvailableModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch(\`\${this.baseUrl}/models\`, {
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'DNA Template AI Integration'
        }
      });

      if (!response.ok) {
        throw new Error(\`Failed to load models: \${response.statusText}\`);
      }

      const data = await response.json();
      this.availableModels = data.data || [];
      return this.availableModels;
    } catch (error) {
      console.error('OpenRouter models loading error:', error);
      return [];
    }
  }

  async generateText(
    messages: OpenRouterMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    const model = options?.model || '${this.config.model}';
    const cacheKey = \`\${model}-\${JSON.stringify(messages)}-\${JSON.stringify(options)}\`;
    
    if (${this.config.caching} && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (${this.config.rateLimiting} && !this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    const payload = {
      model,
      messages,
      max_tokens: options?.maxTokens || ${this.config.maxTokens},
      temperature: options?.temperature || ${this.config.temperature},
      stream: false
    };

    try {
      const response = await this.makeRequest('/chat/completions', payload);
      const result = response.choices[0]?.message?.content || '';

      if (${this.config.caching}) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      // Try fallback models
      for (const fallbackModel of ${JSON.stringify(this.config.fallbackModels)}) {
        try {
          const fallbackPayload = { ...payload, model: fallbackModel };
          const response = await this.makeRequest('/chat/completions', fallbackPayload);
          return response.choices[0]?.message?.content || '';
        } catch (fallbackError) {
          console.warn(\`Fallback model \${fallbackModel} also failed:\`, fallbackError);
        }
      }
      
      throw error;
    }
  }

  async *streamText(
    messages: OpenRouterMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    if (!${this.config.streaming}) {
      const result = await this.generateText(messages, options);
      yield result;
      return;
    }

    if (${this.config.rateLimiting} && !this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    const model = options?.model || '${this.config.model}';
    const payload = {
      model,
      messages,
      max_tokens: options?.maxTokens || ${this.config.maxTokens},
      temperature: options?.temperature || ${this.config.temperature},
      stream: true
    };

    try {
      const response = await fetch(\`\${this.baseUrl}/chat/completions\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'DNA Template AI Integration'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(\`OpenRouter API error: \${response.statusText}\`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      throw error;
    }
  }

  async getModelInfo(modelId: string): Promise<OpenRouterModel | undefined> {
    if (this.availableModels.length === 0) {
      await this.loadAvailableModels();
    }
    
    return this.availableModels.find(model => model.id === modelId);
  }

  async getRecommendedModel(task: 'chat' | 'code' | 'creative' | 'analysis'): Promise<string> {
    const recommendations = {
      chat: 'anthropic/claude-3-sonnet',
      code: 'anthropic/claude-3-sonnet',
      creative: 'openai/gpt-4-turbo',
      analysis: 'anthropic/claude-3-opus'
    };

    return recommendations[task] || '${this.config.model}';
  }

  private async makeRequest(endpoint: string, payload: any): Promise<OpenRouterResponse> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'DNA Template AI Integration'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(\`OpenRouter API error: \${response.statusText} - \${JSON.stringify(errorData)}\`);
    }

    return await response.json();
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Clean old entries
    for (const [key, timestamp] of this.rateLimiter.entries()) {
      if (timestamp < windowStart) {
        this.rateLimiter.delete(key);
      }
    }

    // Check if under limit (100 requests per minute)
    if (this.rateLimiter.size >= 100) {
      return false;
    }

    this.rateLimiter.set(Math.random().toString(), now);
    return true;
  }

  getAvailableModels(): OpenRouterModel[] {
    return this.availableModels;
  }

  getModelsByProvider(provider: string): OpenRouterModel[] {
    return this.availableModels.filter(model => 
      model.id.toLowerCase().includes(provider.toLowerCase())
    );
  }
}

export const openRouterClient = new OpenRouterClient();
`;
  }

  private generateChatComponent(): string {
    return `
'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
}

interface OpenRouterChatProps {
  initialModel?: string;
  systemPrompt?: string;
  onModelChange?: (model: string) => void;
  onError?: (error: string) => void;
}

export default function OpenRouterChat({ 
  initialModel = 'anthropic/claude-3-sonnet',
  systemPrompt,
  onModelChange,
  onError 
}: OpenRouterChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadModelInfo(selectedModel);
  }, [selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/openrouter/models');
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadModelInfo = async (modelId: string) => {
    try {
      const response = await fetch(\`/api/openrouter/models?id=\${modelId}\`);
      if (response.ok) {
        const info = await response.json();
        setModelInfo(info);
      }
    } catch (error) {
      console.error('Failed to load model info:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const messagesToSend = [
      ...(systemPrompt ? [{
        id: 'system',
        role: 'system' as const,
        content: systemPrompt,
        timestamp: new Date()
      }] : []),
      ...messages.filter(m => m.role !== 'system'),
      userMessage
    ];

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/openrouter/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messagesToSend.map(m => ({
            role: m.role,
            content: m.content
          })),
          model: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  ));
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    onModelChange?.(newModel);
  };

  const getProviderColor = (modelId: string) => {
    if (modelId.includes('anthropic')) return '#8B5CF6';
    if (modelId.includes('openai')) return '#10B981';
    if (modelId.includes('google')) return '#F59E0B';
    if (modelId.includes('meta')) return '#3B82F6';
    return '#6B7280';
  };

  return (
    <div className="openrouter-chat">
      <div className="chat-header">
        <div className="model-selector">
          <label>Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.id})
              </option>
            ))}
          </select>
        </div>
        
        {modelInfo && (
          <div className="model-info">
            <span 
              className="provider-badge"
              style={{ backgroundColor: getProviderColor(selectedModel) }}
            >
              {selectedModel.split('/')[0]}
            </span>
            <span className="context-length">
              Context: {modelInfo.context_length?.toLocaleString()} tokens
            </span>
            <span className="pricing">
              ${modelInfo.pricing?.prompt}/1M prompt • ${modelInfo.pricing?.completion}/1M completion
            </span>
          </div>
        )}
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={\`message \${message.role}\`}
          >
            <div className="message-header">
              <span className="role">{message.role}</span>
              {message.model && (
                <span className="model-used">{message.model}</span>
              )}
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>

      <style jsx>{\`
        .openrouter-chat {
          display: flex;
          flex-direction: column;
          height: 700px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
        }

        .chat-header {
          padding: 16px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .model-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .model-selector select {
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .model-info {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #666;
        }

        .provider-badge {
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #fafafa;
        }

        .message {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 8px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .message.user {
          margin-left: 10%;
          background: #e3f2fd;
        }

        .message.assistant {
          margin-right: 10%;
          background: #f5f5f5;
        }

        .message.system {
          background: #fff3cd;
          margin: 0;
          font-style: italic;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 12px;
          color: #666;
        }

        .role {
          font-weight: 600;
          text-transform: capitalize;
        }

        .model-used {
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        .message.loading {
          background-color: #f0f0f0;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #999;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .input-area {
          display: flex;
          padding: 16px;
          border-top: 1px solid #ddd;
          background: white;
        }

        .input-area input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-right: 8px;
        }

        .input-area button {
          padding: 8px 16px;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .input-area button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      \`}</style>
    </div>
  );
}
`;
  }

  private generateChatAPI(): string {
    return `
import { NextApiRequest, NextApiResponse } from 'next';
import { openRouterClient } from '../../lib/openrouter-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { messages, model, maxTokens, temperature } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Messages array is required' });
  }

  try {
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Stream the response
    for await (const chunk of openRouterClient.streamText(messages, {
      model,
      maxTokens,
      temperature
    })) {
      res.write(\`data: \${JSON.stringify({ content: chunk })}\\n\\n\`);
    }

    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (error) {
    console.error('OpenRouter API error:', error);
    res.write(\`data: \${JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })}\\n\\n\`);
    res.end();
  }
}
`;
  }

  private generateModelsAPI(): string {
    return `
import { NextApiRequest, NextApiResponse } from 'next';
import { openRouterClient } from '../../lib/openrouter-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, provider } = req.query;

    if (id && typeof id === 'string') {
      // Get specific model info
      const modelInfo = await openRouterClient.getModelInfo(id);
      if (!modelInfo) {
        return res.status(404).json({ message: 'Model not found' });
      }
      return res.json(modelInfo);
    }

    if (provider && typeof provider === 'string') {
      // Get models by provider
      const models = openRouterClient.getModelsByProvider(provider);
      return res.json(models);
    }

    // Get all available models
    const models = await openRouterClient.loadAvailableModels();
    res.json(models);
  } catch (error) {
    console.error('OpenRouter models API error:', error);
    res.status(500).json({ 
      message: 'Failed to load models',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
`;
  }

  private generateFlutterService(): string {
    return `
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class OpenRouterMessage {
  final String role;
  final String content;

  OpenRouterMessage({required this.role, required this.content});

  Map<String, dynamic> toJson() => {
    'role': role,
    'content': content,
  };
}

class OpenRouterModel {
  final String id;
  final String name;
  final String? description;
  final Map<String, String> pricing;
  final int contextLength;

  OpenRouterModel({
    required this.id,
    required this.name,
    this.description,
    required this.pricing,
    required this.contextLength,
  });

  factory OpenRouterModel.fromJson(Map<String, dynamic> json) {
    return OpenRouterModel(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      pricing: Map<String, String>.from(json['pricing']),
      contextLength: json['context_length'],
    );
  }
}

class OpenRouterService {
  static const String _baseUrl = 'https://openrouter.ai/api/v1';
  static const String _apiKeyKey = 'openrouter_api_key';
  
  String? _apiKey;
  List<OpenRouterModel> _availableModels = [];

  Future<void> initialize(String apiKey) async {
    _apiKey = apiKey;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_apiKeyKey, apiKey);
    await loadAvailableModels();
  }

  Future<void> loadStoredApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    _apiKey = prefs.getString(_apiKeyKey);
  }

  Future<List<OpenRouterModel>> loadAvailableModels() async {
    if (_apiKey == null) {
      throw Exception('API key not set');
    }

    try {
      final response = await http.get(
        Uri.parse('\$_baseUrl/models'),
        headers: {
          'Authorization': 'Bearer \$_apiKey',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://your-app.com',
          'X-Title': 'DNA Template AI Integration',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _availableModels = (data['data'] as List)
            .map((model) => OpenRouterModel.fromJson(model))
            .toList();
        return _availableModels;
      } else {
        throw Exception('Failed to load models: \${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error loading models: \$e');
    }
  }

  Future<String> generateText(
    List<OpenRouterMessage> messages, {
    String model = '${this.config.model}',
    int maxTokens = ${this.config.maxTokens},
    double temperature = ${this.config.temperature},
  }) async {
    if (_apiKey == null) {
      throw Exception('API key not set');
    }

    final payload = {
      'model': model,
      'messages': messages.map((m) => m.toJson()).toList(),
      'max_tokens': maxTokens,
      'temperature': temperature,
      'stream': false,
    };

    try {
      final response = await http.post(
        Uri.parse('\$_baseUrl/chat/completions'),
        headers: {
          'Authorization': 'Bearer \$_apiKey',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://your-app.com',
          'X-Title': 'DNA Template AI Integration',
        },
        body: json.encode(payload),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['choices'][0]['message']['content'] ?? '';
      } else {
        throw Exception('OpenRouter API error: \${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error generating text: \$e');
    }
  }

  Stream<String> streamText(
    List<OpenRouterMessage> messages, {
    String model = '${this.config.model}',
    int maxTokens = ${this.config.maxTokens},
    double temperature = ${this.config.temperature},
  }) async* {
    if (_apiKey == null) {
      throw Exception('API key not set');
    }

    final payload = {
      'model': model,
      'messages': messages.map((m) => m.toJson()).toList(),
      'max_tokens': maxTokens,
      'temperature': temperature,
      'stream': true,
    };

    try {
      final request = http.Request('POST', Uri.parse('\$_baseUrl/chat/completions'));
      request.headers.addAll({
        'Authorization': 'Bearer \$_apiKey',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-app.com',
        'X-Title': 'DNA Template AI Integration',
      });
      request.body = json.encode(payload);

      final response = await request.send();
      
      if (response.statusCode == 200) {
        await for (final chunk in response.stream.transform(utf8.decoder)) {
          final lines = chunk.split('\\n');
          for (final line in lines) {
            if (line.startsWith('data: ')) {
              final data = line.substring(6);
              if (data == '[DONE]') return;
              
              try {
                final parsed = json.decode(data);
                final content = parsed['choices']?[0]?['delta']?['content'];
                if (content != null) {
                  yield content;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } else {
        throw Exception('OpenRouter streaming error: \${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error streaming text: \$e');
    }
  }

  List<OpenRouterModel> getAvailableModels() => _availableModels;

  List<OpenRouterModel> getModelsByProvider(String provider) {
    return _availableModels
        .where((model) => model.id.toLowerCase().contains(provider.toLowerCase()))
        .toList();
  }

  OpenRouterModel? getModelInfo(String modelId) {
    return _availableModels.firstWhere(
      (model) => model.id == modelId,
      orElse: () => throw Exception('Model not found'),
    );
  }

  String getRecommendedModel(String task) {
    switch (task) {
      case 'chat':
        return 'anthropic/claude-3-sonnet';
      case 'code':
        return 'anthropic/claude-3-sonnet';
      case 'creative':
        return 'openai/gpt-4-turbo';
      case 'analysis':
        return 'anthropic/claude-3-opus';
      default:
        return '${this.config.model}';
    }
  }
}
`;
  }
}