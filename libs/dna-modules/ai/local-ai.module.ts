import { z } from 'zod';
import { BaseDNAModule, DNAModuleMetadata, ConfigurationSchema, FrameworkImplementation } from '../../core/src/lib/dna-module';

const LocalAIConfigSchema = z.object({
  provider: z.enum(['ollama', 'llamacpp', 'huggingface']).default('ollama'),
  model: z.string().default('llama2'),
  endpoint: z.string().default('http://localhost:11434'),
  maxTokens: z.number().default(2048),
  temperature: z.number().min(0).max(2).default(0.7),
  streaming: z.boolean().default(true)
});

type LocalAIConfig = z.infer<typeof LocalAIConfigSchema>;

export class LocalAIModule extends BaseDNAModule<LocalAIConfig> {
  metadata: DNAModuleMetadata = {
    id: 'ai-local',
    name: 'Local AI Models',
    description: 'Local AI model integration supporting Ollama, LlamaCpp, and HuggingFace',
    version: '1.0.0',
    category: 'ai',
    tags: ['ai', 'local', 'ollama', 'llama', 'huggingface', 'privacy'],
    author: 'DNA System',
    dependencies: [],
    conflicts: [],
    frameworks: ['nextjs', 'tauri'],
    maturityLevel: 'beta'
  };

  configurationSchema: ConfigurationSchema<LocalAIConfig> = {
    schema: LocalAIConfigSchema,
    defaultConfig: {
      provider: 'ollama',
      model: 'llama2',
      endpoint: 'http://localhost:11434',
      maxTokens: 2048,
      temperature: 0.7,
      streaming: true
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
          path: 'lib/local-ai-client.ts',
          content: () => this.generateLocalAIClient()
        },
        {
          path: 'components/LocalAIChat.tsx',
          content: () => this.generateLocalChatComponent()
        },
        {
          path: 'api/local-ai/chat.ts',
          content: () => this.generateLocalChatAPI()
        }
      ]
    },
    tauri: {
      dependencies: {
        '@tauri-apps/api': '^1.5.0'
      },
      devDependencies: {},
      files: [
        {
          path: 'src/lib/local-ai.ts',
          content: () => this.generateTauriLocalAI()
        }
      ]
    }
  };

  private generateLocalAIClient(): string {
    return `
import fetch from 'node-fetch';

export interface LocalAIResponse {
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class LocalAIClient {
  private endpoint: string;
  private provider: string;
  private model: string;

  constructor() {
    this.endpoint = '${this.config.endpoint}';
    this.provider = '${this.config.provider}';
    this.model = '${this.config.model}';
  }

  async generateText(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    if (this.provider === 'ollama') {
      return this.generateWithOllama(prompt, options);
    } else if (this.provider === 'llamacpp') {
      return this.generateWithLlamaCpp(prompt, options);
    } else if (this.provider === 'huggingface') {
      return this.generateWithHuggingFace(prompt, options);
    }
    
    throw new Error(\`Unsupported provider: \${this.provider}\`);
  }

  async *streamText(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncGenerator<string, void, unknown> {
    if (!${this.config.streaming}) {
      const result = await this.generateText(prompt, options);
      yield result;
      return;
    }

    if (this.provider === 'ollama') {
      yield* this.streamWithOllama(prompt, options);
    } else {
      // Fallback to non-streaming for other providers
      const result = await this.generateText(prompt, options);
      yield result;
    }
  }

  private async generateWithOllama(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const payload = {
      model: this.model,
      prompt: options?.systemPrompt ? \`\${options.systemPrompt}\\n\\n\${prompt}\` : prompt,
      stream: false,
      options: {
        temperature: options?.temperature || ${this.config.temperature},
        num_predict: options?.maxTokens || ${this.config.maxTokens}
      }
    };

    try {
      const response = await fetch(\`\${this.endpoint}/api/generate\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(\`Ollama API error: \${response.statusText}\`);
      }

      const data = await response.json() as LocalAIResponse;
      return data.response;
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw error;
    }
  }

  private async *streamWithOllama(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): AsyncGenerator<string, void, unknown> {
    const payload = {
      model: this.model,
      prompt: options?.systemPrompt ? \`\${options.systemPrompt}\\n\\n\${prompt}\` : prompt,
      stream: true,
      options: {
        temperature: options?.temperature || ${this.config.temperature},
        num_predict: options?.maxTokens || ${this.config.maxTokens}
      }
    };

    try {
      const response = await fetch(\`\${this.endpoint}/api/generate\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(\`Ollama API error: \${response.statusText}\`);
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
          try {
            const data = JSON.parse(line) as LocalAIResponse;
            if (data.response) {
              yield data.response;
            }
            if (data.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw error;
    }
  }

  private async generateWithLlamaCpp(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const payload = {
      prompt: options?.systemPrompt ? \`\${options.systemPrompt}\\n\\n\${prompt}\` : prompt,
      n_predict: options?.maxTokens || ${this.config.maxTokens},
      temperature: options?.temperature || ${this.config.temperature},
      stream: false
    };

    try {
      const response = await fetch(\`\${this.endpoint}/completion\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(\`LlamaCpp API error: \${response.statusText}\`);
      }

      const data = await response.json();
      return data.content || '';
    } catch (error) {
      console.error('LlamaCpp generation error:', error);
      throw error;
    }
  }

  private async generateWithHuggingFace(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    // This would require HuggingFace Transformers.js or similar
    // For now, return a placeholder
    return "HuggingFace integration coming soon";
  }

  async getAvailableModels(): Promise<string[]> {
    if (this.provider === 'ollama') {
      try {
        const response = await fetch(\`\${this.endpoint}/api/tags\`);
        if (response.ok) {
          const data = await response.json();
          return data.models?.map((m: any) => m.name) || [];
        }
      } catch (error) {
        console.error('Failed to get Ollama models:', error);
      }
    }
    
    return [this.model];
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(\`\${this.endpoint}/api/version\`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const localAIClient = new LocalAIClient();
`;
  }

  private generateLocalChatComponent(): string {
    return `
'use client';

import { useState, useEffect } from 'react';

interface LocalAIChatProps {
  systemPrompt?: string;
  model?: string;
  onModelChange?: (model: string) => void;
}

export default function LocalAIChat({ 
  systemPrompt, 
  model,
  onModelChange 
}: LocalAIChatProps) {
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(model || 'llama2');

  useEffect(() => {
    checkConnection();
    loadAvailableModels();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/local-ai/health');
      setConnected(response.ok);
    } catch {
      setConnected(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/local-ai/models');
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !connected) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/local-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: input,
          model: selectedModel,
          systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
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
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (connected === false) {
    return (
      <div className="local-ai-error">
        <h3>Local AI Not Available</h3>
        <p>Please ensure your local AI server is running:</p>
        <ul>
          <li>Ollama: <code>ollama serve</code></li>
          <li>LlamaCpp: Start your server on port 8080</li>
        </ul>
        <button onClick={checkConnection}>Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="local-ai-chat">
      <div className="chat-header">
        <h3>Local AI Chat</h3>
        <div className="model-selector">
          <label>Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              onModelChange?.(e.target.value);
            }}
          >
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
        <div className="connection-status">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={\`message \${message.role}\`}>
            <div className="message-content">{message.content}</div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={loading || !connected}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim() || !connected}
        >
          Send
        </button>
      </div>
    </div>
  );
}
`;
  }

  private generateLocalChatAPI(): string {
    return `
import { NextApiRequest, NextApiResponse } from 'next';
import { localAIClient } from '../../lib/local-ai-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { prompt, model, systemPrompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    for await (const chunk of localAIClient.streamText(prompt, {
      systemPrompt
    })) {
      res.write(\`data: \${JSON.stringify({ content: chunk })}\\n\\n\`);
    }

    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (error) {
    console.error('Local AI error:', error);
    res.write(\`data: \${JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })}\\n\\n\`);
    res.end();
  }
}
`;
  }

  private generateTauriLocalAI(): string {
    return `
import { invoke } from '@tauri-apps/api/tauri';

export class TauriLocalAI {
  async generateText(prompt: string, model?: string): Promise<string> {
    try {
      return await invoke('generate_text', {
        prompt,
        model: model || '${this.config.model}'
      });
    } catch (error) {
      console.error('Tauri AI generation error:', error);
      throw error;
    }
  }

  async checkModelAvailability(): Promise<string[]> {
    try {
      return await invoke('list_available_models');
    } catch (error) {
      console.error('Failed to check models:', error);
      return [];
    }
  }
}

export const tauriLocalAI = new TauriLocalAI();
`;
  }
}