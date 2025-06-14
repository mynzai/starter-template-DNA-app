import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

const AnthropicConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().default('claude-3-sonnet-20240229'),
  maxTokens: z.number().default(4096),
  streaming: z.boolean().default(true),
  rateLimiting: z.boolean().default(true),
  caching: z.boolean().default(true)
});

type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>;

export class AnthropicAIModule extends BaseDNAModule<AnthropicConfig> {
  metadata: DNAModuleMetadata = {
    id: 'ai-anthropic',
    name: 'Anthropic Claude Integration',
    description: 'Complete Anthropic Claude AI integration with streaming and advanced features',
    version: '1.0.0',
    category: 'ai',
    tags: ['ai', 'anthropic', 'claude', 'llm', 'streaming'],
    author: 'DNA System',
    dependencies: [],
    conflicts: [],
    frameworks: ['nextjs', 'flutter', 'react-native'],
    maturityLevel: 'stable'
  };

  configurationSchema: ConfigurationSchema<AnthropicConfig> = {
    schema: AnthropicConfigSchema,
    defaultConfig: {
      apiKey: '',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      streaming: true,
      rateLimiting: true,
      caching: true
    }
  };

  frameworkImplementations: Record<string, FrameworkImplementation> = {
    nextjs: {
      dependencies: {
        '@anthropic-ai/sdk': '^0.17.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'lib/anthropic-client.ts',
          content: () => this.generateAnthropicClient()
        },
        {
          path: 'components/AnthropicChat.tsx',
          content: () => this.generateChatComponent()
        },
        {
          path: 'api/anthropic/chat.ts',
          content: () => this.generateChatAPI()
        }
      ]
    }
  };

  private generateAnthropicClient(): string {
    return `
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClient {
  private client: Anthropic;
  private rateLimiter: Map<string, number> = new Map();
  private cache: Map<string, any> = new Map();

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '${this.config.apiKey}'
    });
  }

  async generateText(
    prompt: string,
    options?: {
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const cacheKey = \`\${prompt}-\${JSON.stringify(options)}\`;
    
    if (${this.config.caching} && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (${this.config.rateLimiting} && !this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await this.client.messages.create({
        model: options?.model || '${this.config.model}',
        max_tokens: options?.maxTokens || ${this.config.maxTokens},
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: options?.systemPrompt
      });

      const result = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      if (${this.config.caching}) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  async *streamText(
    prompt: string,
    options?: {
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
    }
  ): AsyncGenerator<string, void, unknown> {
    if (!${this.config.streaming}) {
      const result = await this.generateText(prompt, options);
      yield result;
      return;
    }

    if (${this.config.rateLimiting} && !this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const stream = await this.client.messages.create({
        model: options?.model || '${this.config.model}',
        max_tokens: options?.maxTokens || ${this.config.maxTokens},
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: options?.systemPrompt,
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 
            chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      console.error('Anthropic streaming error:', error);
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

    // Check if under limit (simplified: 100 requests per minute)
    if (this.rateLimiter.size >= 100) {
      return false;
    }

    this.rateLimiter.set(Math.random().toString(), now);
    return true;
  }
}

export const anthropicClient = new AnthropicClient();
`;
  }

  private generateChatComponent(): string {
    return `
'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AnthropicChatProps {
  systemPrompt?: string;
  maxTokens?: number;
  onError?: (error: string) => void;
}

export default function AnthropicChat({ 
  systemPrompt, 
  maxTokens, 
  onError 
}: AnthropicChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: input,
          systemPrompt,
          maxTokens
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

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

  return (
    <div className="anthropic-chat">
      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={\`message \${message.role}\`}
          >
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
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
        .anthropic-chat {
          display: flex;
          flex-direction: column;
          height: 600px;
          border: 1px solid #ddd;
          border-radius: 8px;
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
          background-color: #e3f2fd;
          margin-left: 20%;
        }

        .message.assistant {
          background-color: #f5f5f5;
          margin-right: 20%;
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
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
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
import { anthropicClient } from '../../lib/anthropic-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { prompt, systemPrompt, maxTokens } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
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
    for await (const chunk of anthropicClient.streamText(prompt, {
      systemPrompt,
      maxTokens
    })) {
      res.write(\`data: \${JSON.stringify({ content: chunk })}\\n\\n\`);
    }

    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (error) {
    console.error('Anthropic API error:', error);
    res.write(\`data: \${JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })}\\n\\n\`);
    res.end();
  }
}
`;
  }
}