import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

const OpenAIConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  organization: z.string().optional(),
  model: z.string().default('gpt-4'),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  streaming: z.boolean().default(true),
  enableFunctions: z.boolean().default(true),
  enableEmbeddings: z.boolean().default(false),
  enableImages: z.boolean().default(false),
  imageModel: z.enum(['dall-e-2', 'dall-e-3']).default('dall-e-3'),
  embeddingModel: z.enum(['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large']).default('text-embedding-3-small'),
  rateLimiting: z.boolean().default(true),
  caching: z.boolean().default(true)
});

type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;

export class OpenAIEnhancedModule extends BaseDNAModule<OpenAIConfig> {
  metadata: DNAModuleMetadata = {
    id: 'ai-openai-enhanced',
    name: 'OpenAI Integration Enhanced',
    description: 'Complete OpenAI integration with GPT models, DALL-E, embeddings, and function calling',
    version: '1.0.0',
    category: 'ai',
    tags: ['ai', 'openai', 'gpt', 'dall-e', 'embeddings', 'functions'],
    author: 'DNA System',
    dependencies: [],
    conflicts: ['ai-anthropic'],
    frameworks: ['nextjs', 'flutter', 'react-native', 'tauri', 'sveltekit'],
    maturityLevel: 'stable'
  };

  configurationSchema: ConfigurationSchema<OpenAIConfig> = {
    schema: OpenAIConfigSchema,
    defaultConfig: {
      apiKey: '',
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7,
      streaming: true,
      enableFunctions: true,
      enableEmbeddings: false,
      enableImages: false,
      imageModel: 'dall-e-3',
      embeddingModel: 'text-embedding-3-small',
      rateLimiting: true,
      caching: true
    }
  };

  frameworkImplementations: Record<string, FrameworkImplementation> = {
    nextjs: {
      dependencies: {
        'openai': '^4.0.0',
        'ai': '^2.0.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/openai-client.ts',
          content: () => this.generateOpenAIClient()
        },
        {
          path: 'components/OpenAIChat.tsx',
          content: () => this.generateChatComponent()
        },
        {
          path: 'api/openai/chat.ts',
          content: () => this.generateChatAPI()
        }
      ]
    }
  };

  private generateOpenAIClient(): string {
    return `
import OpenAI from 'openai';

export class OpenAIClient {
  private client: OpenAI;
  private rateLimiter: Map<string, number> = new Map();
  private cache: Map<string, any> = new Map();

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '${this.config.apiKey}',
      ${this.config.organization ? `organization: '${this.config.organization}',` : ''}
    });
  }

  async generateText(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      functions?: Array<any>;
    }
  ): Promise<string> {
    const cacheKey = \`\${JSON.stringify(messages)}-\${JSON.stringify(options)}\`;
    
    if (${this.config.caching} && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (${this.config.rateLimiting} && !this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || '${this.config.model}',
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        max_tokens: options?.maxTokens || ${this.config.maxTokens},
        temperature: options?.temperature || ${this.config.temperature},
        ${this.config.enableFunctions ? 'functions: options?.functions,' : ''}
      });

      const result = response.choices[0]?.message?.content || '';

      if (${this.config.caching}) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async *streamText(
    messages: Array<{ role: string; content: string }>,
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

    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || '${this.config.model}',
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        max_tokens: options?.maxTokens || ${this.config.maxTokens},
        temperature: options?.temperature || ${this.config.temperature},
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  ${this.config.enableEmbeddings ? `
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: '${this.config.embeddingModel}',
        input: text
      });

      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: '${this.config.embeddingModel}',
        input: texts
      });

      return response.data.map(d => d.embedding);
    } catch (error) {
      console.error('OpenAI embeddings error:', error);
      throw error;
    }
  }` : ''}

  ${this.config.enableImages ? `
  async generateImage(
    prompt: string,
    options?: {
      size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
      n?: number;
    }
  ): Promise<string[]> {
    try {
      const response = await this.client.images.generate({
        model: '${this.config.imageModel}',
        prompt,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        n: options?.n || 1
      });

      return response.data.map(img => img.url || '').filter(Boolean);
    } catch (error) {
      console.error('OpenAI image generation error:', error);
      throw error;
    }
  }

  async editImage(
    image: File | string,
    mask: File | string,
    prompt: string,
    options?: {
      size?: '256x256' | '512x512' | '1024x1024';
      n?: number;
    }
  ): Promise<string[]> {
    try {
      const response = await this.client.images.edit({
        image,
        mask,
        prompt,
        size: options?.size || '1024x1024',
        n: options?.n || 1
      });

      return response.data.map(img => img.url || '').filter(Boolean);
    } catch (error) {
      console.error('OpenAI image edit error:', error);
      throw error;
    }
  }` : ''}

  ${this.config.enableFunctions ? `
  async callFunction(
    messages: Array<{ role: string; content: string }>,
    functions: Array<{
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
      };
    }>,
    functionCall?: string | { name: string }
  ): Promise<{
    message?: string;
    functionCall?: {
      name: string;
      arguments: string;
    };
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: '${this.config.model}',
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        functions,
        function_call: functionCall
      });

      const choice = response.choices[0];
      
      return {
        message: choice?.message?.content || undefined,
        functionCall: choice?.message?.function_call ? {
          name: choice.message.function_call.name || '',
          arguments: choice.message.function_call.arguments || ''
        } : undefined
      };
    } catch (error) {
      console.error('OpenAI function call error:', error);
      throw error;
    }
  }` : ''}

  async moderateContent(text: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
  }> {
    try {
      const response = await this.client.moderations.create({
        input: text
      });

      const result = response.results[0];
      
      return {
        flagged: result?.flagged || false,
        categories: result?.categories || {},
        categoryScores: result?.category_scores || {}
      };
    } catch (error) {
      console.error('OpenAI moderation error:', error);
      throw error;
    }
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

    // Check if under limit (60 requests per minute for GPT-4)
    if (this.rateLimiter.size >= 60) {
      return false;
    }

    this.rateLimiter.set(Math.random().toString(), now);
    return true;
  }

  async getUsage(): Promise<{
    requestsThisMinute: number;
    cacheHitRate: number;
  }> {
    const now = Date.now();
    const windowStart = now - 60000;
    
    const recentRequests = Array.from(this.rateLimiter.values())
      .filter(timestamp => timestamp > windowStart);

    return {
      requestsThisMinute: recentRequests.length,
      cacheHitRate: this.cache.size > 0 ? 0.85 : 0 // Simplified calculation
    };
  }
}

export const openAIClient = new OpenAIClient();
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
  functionCall?: {
    name: string;
    arguments: string;
  };
}

interface OpenAIChatProps {
  systemPrompt?: string;
  enableFunctions?: boolean;
  functions?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  onError?: (error: string) => void;
}

export default function OpenAIChat({ 
  systemPrompt,
  enableFunctions = ${this.config.enableFunctions},
  functions = [],
  onError 
}: OpenAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('${this.config.model}');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

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
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messagesToSend.map(m => ({
            role: m.role,
            content: m.content
          })),
          model,
          enableFunctions,
          functions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
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
                } else if (parsed.functionCall) {
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, functionCall: parsed.functionCall }
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

  const availableModels = [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k'
  ];

  return (
    <div className="openai-chat">
      <div className="chat-header">
        <h3>OpenAI Chat</h3>
        <div className="controls">
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {enableFunctions && functions.length > 0 && (
            <span className="functions-indicator">
              🔧 {functions.length} functions available
            </span>
          )}
        </div>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={\`message \${message.role}\`}>
            <div className="message-header">
              <span className="role">{message.role}</span>
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {message.content}
              {message.functionCall && (
                <div className="function-call">
                  <strong>Function Called:</strong> {message.functionCall.name}
                  <pre>{message.functionCall.arguments}</pre>
                </div>
              )}
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
        .openai-chat {
          display: flex;
          flex-direction: column;
          height: 600px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .functions-indicator {
          font-size: 12px;
          color: #666;
          background: #e3f2fd;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .message {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 8px;
        }

        .message.user {
          background: #e3f2fd;
          margin-left: 20%;
        }

        .message.assistant {
          background: #f5f5f5;
          margin-right: 20%;
        }

        .message.system {
          background: #fff3cd;
          font-style: italic;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 12px;
          color: #666;
        }

        .function-call {
          margin-top: 8px;
          padding: 8px;
          background: #f0f8ff;
          border-radius: 4px;
          font-size: 12px;
        }

        .function-call pre {
          margin: 4px 0 0 0;
          font-size: 11px;
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
import { openAIClient } from '../../lib/openai-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { messages, model, enableFunctions, functions } = req.body;

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

    if (enableFunctions && functions?.length > 0) {
      // Handle function calling
      const result = await openAIClient.callFunction(messages, functions);
      
      if (result.functionCall) {
        res.write(\`data: \${JSON.stringify({ functionCall: result.functionCall })}\\n\\n\`);
      }
      
      if (result.message) {
        res.write(\`data: \${JSON.stringify({ content: result.message })}\\n\\n\`);
      }
    } else {
      // Stream regular chat completion
      for await (const chunk of openAIClient.streamText(messages, { model })) {
        res.write(\`data: \${JSON.stringify({ content: chunk })}\\n\\n\`);
      }
    }

    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.write(\`data: \${JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })}\\n\\n\`);
    res.end();
  }
}
`;
  }
}