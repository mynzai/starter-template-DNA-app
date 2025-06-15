import { DNAModule } from '@starter-template-dna/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface Context7MCPConfig {
  enabled: boolean;
  maxContextLength?: number;
  enableAutoSummarization?: boolean;
  enableSemanticSearch?: boolean;
  retentionDays?: number;
  categories?: string[];
}

export interface ConversationContext {
  id: string;
  content: string;
  timestamp: Date;
  category?: string;
  metadata?: Record<string, any>;
  summary?: string;
}

export class Context7MCPModule extends DNAModule {
  public readonly id = 'context7-mcp';
  public readonly name = 'Context7 MCP Integration';
  public readonly description = 'Provides conversation context management through MCP';
  public readonly version = '1.0.0';
  public readonly category = 'ai-tools';
  
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(private config: Context7MCPConfig) {
    super();
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Initialize MCP client for Context7 operations
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: [
          '-y',
          '@smithery/cli@latest',
          'run',
          '@upstash/context7-mcp',
          '--key',
          'c89dbd54-0e5f-49a3-84ea-5d02b90591ed'
        ],
      });

      this.client = new Client(
        {
          name: 'dna-context7-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      await this.client.connect(this.transport);
      
      this.emit('initialized', { module: this.id });
    } catch (error) {
      this.emit('error', { module: this.id, error });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async storeContext(context: Omit<ConversationContext, 'id'>): Promise<string> {
    if (!this.client) {
      throw new Error('Context7 MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'store_context',
      arguments: {
        content: context.content,
        category: context.category,
        metadata: context.metadata,
        timestamp: context.timestamp.toISOString(),
      },
    });

    return result.content[0]?.text || '';
  }

  async retrieveContext(query: string, options?: {
    category?: string;
    limit?: number;
    timeRange?: { start: Date; end: Date };
  }): Promise<ConversationContext[]> {
    if (!this.client) {
      throw new Error('Context7 MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'retrieve_context',
      arguments: {
        query: query,
        category: options?.category,
        limit: options?.limit || 10,
        time_range: options?.timeRange ? {
          start: options.timeRange.start.toISOString(),
          end: options.timeRange.end.toISOString(),
        } : undefined,
      },
    });

    const contexts = JSON.parse(result.content[0]?.text || '[]');
    return contexts.map((ctx: any) => ({
      ...ctx,
      timestamp: new Date(ctx.timestamp),
    }));
  }

  async summarizeContext(contextIds: string[]): Promise<string> {
    if (!this.client) {
      throw new Error('Context7 MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'summarize_context',
      arguments: {
        context_ids: contextIds,
      },
    });

    return result.content[0]?.text || '';
  }

  async searchSimilar(content: string, options?: {
    threshold?: number;
    limit?: number;
    category?: string;
  }): Promise<ConversationContext[]> {
    if (!this.client) {
      throw new Error('Context7 MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'search_similar',
      arguments: {
        content: content,
        threshold: options?.threshold || 0.7,
        limit: options?.limit || 5,
        category: options?.category,
      },
    });

    const contexts = JSON.parse(result.content[0]?.text || '[]');
    return contexts.map((ctx: any) => ({
      ...ctx,
      timestamp: new Date(ctx.timestamp),
    }));
  }

  async deleteContext(contextId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Context7 MCP client not initialized');
    }

    await this.client.callTool({
      name: 'delete_context',
      arguments: {
        context_id: contextId,
      },
    });
  }

  async getContextStats(): Promise<{
    totalContexts: number;
    categories: Record<string, number>;
    oldestContext: Date;
    newestContext: Date;
  }> {
    if (!this.client) {
      throw new Error('Context7 MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'get_context_stats',
      arguments: {},
    });

    const stats = JSON.parse(result.content[0]?.text || '{}');
    return {
      ...stats,
      oldestContext: new Date(stats.oldestContext),
      newestContext: new Date(stats.newestContext),
    };
  }

  getCompatibleFrameworks(): string[] {
    return ['nextjs', 'react-native', 'flutter', 'tauri'];
  }

  generateCode(framework: string): Record<string, string> {
    const baseConfig = {
      enabled: true,
      maxContextLength: this.config.maxContextLength || 4000,
      enableAutoSummarization: this.config.enableAutoSummarization ?? true,
      enableSemanticSearch: this.config.enableSemanticSearch ?? true,
      retentionDays: this.config.retentionDays || 30,
    };

    switch (framework) {
      case 'nextjs':
        return {
          'lib/context-manager.ts': this.generateNextJSManager(baseConfig),
          'components/ContextProvider.tsx': this.generateNextJSProvider(baseConfig),
          'hooks/useContext.tsx': this.generateNextJSHook(baseConfig),
          'api/context/route.ts': this.generateNextJSAPI(baseConfig),
        };
      case 'flutter':
        return {
          'lib/services/context_service.dart': this.generateFlutterService(baseConfig),
          'lib/providers/context_provider.dart': this.generateFlutterProvider(baseConfig),
        };
      case 'react-native':
        return {
          'src/services/contextService.ts': this.generateReactNativeService(baseConfig),
          'src/hooks/useContextManager.ts': this.generateReactNativeHook(baseConfig),
        };
      default:
        return {
          'src/integrations/context7.ts': this.generateGenericIntegration(baseConfig),
        };
    }
  }

  private generateNextJSManager(config: any): string {
    return `
import { Context7MCPModule, ConversationContext } from '@starter-template-dna/dna-modules';

export class ContextManager {
  private context7Module: Context7MCPModule;

  constructor() {
    this.context7Module = new Context7MCPModule(${JSON.stringify(config, null, 2)});
  }

  async initialize() {
    await this.context7Module.initialize();
  }

  async addContext(content: string, category?: string, metadata?: Record<string, any>): Promise<string> {
    return await this.context7Module.storeContext({
      content,
      category,
      metadata,
      timestamp: new Date(),
    });
  }

  async searchContext(query: string, options?: {
    category?: string;
    limit?: number;
    days?: number;
  }): Promise<ConversationContext[]> {
    const timeRange = options?.days ? {
      start: new Date(Date.now() - options.days * 24 * 60 * 60 * 1000),
      end: new Date(),
    } : undefined;

    return await this.context7Module.retrieveContext(query, {
      category: options?.category,
      limit: options?.limit,
      timeRange,
    });
  }

  async findSimilar(content: string, threshold = 0.7): Promise<ConversationContext[]> {
    return await this.context7Module.searchSimilar(content, { threshold });
  }

  async summarizeConversation(contextIds: string[]): Promise<string> {
    return await this.context7Module.summarizeContext(contextIds);
  }

  async getStatistics() {
    return await this.context7Module.getContextStats();
  }

  async cleanup() {
    await this.context7Module.cleanup();
  }
}

export const contextManager = new ContextManager();
`;
  }

  private generateNextJSProvider(config: any): string {
    return `
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { contextManager, ConversationContext } from '../lib/context-manager';

interface ContextState {
  contexts: ConversationContext[];
  isLoading: boolean;
  addContext: (content: string, category?: string) => Promise<void>;
  searchContext: (query: string) => Promise<ConversationContext[]>;
  findSimilar: (content: string) => Promise<ConversationContext[]>;
}

const ContextContext = createContext<ContextState | undefined>(undefined);

export function ContextProvider({ children }: { children: React.ReactNode }) {
  const [contexts, setContexts] = useState<ConversationContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeContext = async () => {
      try {
        await contextManager.initialize();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize context manager:', error);
        setIsLoading(false);
      }
    };

    initializeContext();

    return () => {
      contextManager.cleanup();
    };
  }, []);

  const addContext = async (content: string, category?: string) => {
    try {
      const contextId = await contextManager.addContext(content, category);
      // Optionally refresh contexts or add to local state
    } catch (error) {
      console.error('Failed to add context:', error);
    }
  };

  const searchContext = async (query: string): Promise<ConversationContext[]> => {
    try {
      return await contextManager.searchContext(query);
    } catch (error) {
      console.error('Failed to search context:', error);
      return [];
    }
  };

  const findSimilar = async (content: string): Promise<ConversationContext[]> => {
    try {
      return await contextManager.findSimilar(content);
    } catch (error) {
      console.error('Failed to find similar context:', error);
      return [];
    }
  };

  const value: ContextState = {
    contexts,
    isLoading,
    addContext,
    searchContext,
    findSimilar,
  };

  return (
    <ContextContext.Provider value={value}>
      {children}
    </ContextContext.Provider>
  );
}

export function useContextState() {
  const context = useContext(ContextContext);
  if (context === undefined) {
    throw new Error('useContextState must be used within a ContextProvider');
  }
  return context;
}
`;
  }

  private generateNextJSHook(config: any): string {
    return `
import { useState, useCallback } from 'react';
import { useContextState } from '../components/ContextProvider';
import type { ConversationContext } from '../lib/context-manager';

export function useContext() {
  const { addContext, searchContext, findSimilar } = useContextState();
  const [searchResults, setSearchResults] = useState<ConversationContext[]>([]);
  const [similarResults, setSimilarResults] = useState<ConversationContext[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchContext(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchContext]);

  const handleFindSimilar = useCallback(async (content: string) => {
    if (!content.trim()) {
      setSimilarResults([]);
      return;
    }

    try {
      const results = await findSimilar(content);
      setSimilarResults(results);
    } catch (error) {
      console.error('Finding similar context failed:', error);
      setSimilarResults([]);
    }
  }, [findSimilar]);

  const handleAddContext = useCallback(async (content: string, category?: string) => {
    try {
      await addContext(content, category);
    } catch (error) {
      console.error('Adding context failed:', error);
      throw error;
    }
  }, [addContext]);

  return {
    searchResults,
    similarResults,
    isSearching,
    search: handleSearch,
    findSimilar: handleFindSimilar,
    addContext: handleAddContext,
  };
}
`;
  }

  private generateNextJSAPI(config: any): string {
    return `
import { NextRequest, NextResponse } from 'next/server';
import { contextManager } from '../../../lib/context-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const category = searchParams.get('category');
  const limit = searchParams.get('limit');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    await contextManager.initialize();
    
    const results = await contextManager.searchContext(query, {
      category: category || undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Context search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, category, metadata } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await contextManager.initialize();
    
    const contextId = await contextManager.addContext(content, category, metadata);

    return NextResponse.json({ contextId });
  } catch (error) {
    console.error('Adding context failed:', error);
    return NextResponse.json({ error: 'Failed to add context' }, { status: 500 });
  }
}
`;
  }

  private generateFlutterService(config: any): string {
    return `
import 'dart:convert';
import 'package:http/http.dart' as http;

class ConversationContext {
  final String id;
  final String content;
  final DateTime timestamp;
  final String? category;
  final Map<String, dynamic>? metadata;
  final String? summary;

  ConversationContext({
    required this.id,
    required this.content,
    required this.timestamp,
    this.category,
    this.metadata,
    this.summary,
  });

  factory ConversationContext.fromJson(Map<String, dynamic> json) {
    return ConversationContext(
      id: json['id'],
      content: json['content'],
      timestamp: DateTime.parse(json['timestamp']),
      category: json['category'],
      metadata: json['metadata'],
      summary: json['summary'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'category': category,
      'metadata': metadata,
      'summary': summary,
    };
  }
}

class ContextService {
  static const String _baseUrl = 'http://localhost:3000/api/context';

  Future<String> addContext(
    String content, {
    String? category,
    Map<String, dynamic>? metadata,
  }) async {
    final response = await http.post(
      Uri.parse(_baseUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'content': content,
        'category': category,
        'metadata': metadata,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['contextId'];
    }
    throw Exception('Failed to add context');
  }

  Future<List<ConversationContext>> searchContext(
    String query, {
    String? category,
    int? limit,
  }) async {
    final uri = Uri.parse(_baseUrl).replace(queryParameters: {
      'query': query,
      if (category != null) 'category': category,
      if (limit != null) 'limit': limit.toString(),
    });

    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final results = data['results'] as List;
      return results.map((item) => ConversationContext.fromJson(item)).toList();
    }
    throw Exception('Failed to search context');
  }

  Future<List<ConversationContext>> findSimilar(
    String content, {
    double threshold = 0.7,
    int limit = 5,
  }) async {
    final response = await http.post(
      Uri.parse('\$_baseUrl/similar'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'content': content,
        'threshold': threshold,
        'limit': limit,
      }),
    );

    if (response.statusCode == 200) {
      final results = jsonDecode(response.body) as List;
      return results.map((item) => ConversationContext.fromJson(item)).toList();
    }
    throw Exception('Failed to find similar contexts');
  }
}
`;
  }

  private generateFlutterProvider(config: any): string {
    return `
import 'package:flutter/foundation.dart';
import 'context_service.dart';

class ContextProvider extends ChangeNotifier {
  final ContextService _contextService = ContextService();
  
  List<ConversationContext> _contexts = [];
  List<ConversationContext> _searchResults = [];
  bool _isLoading = false;
  bool _isSearching = false;

  List<ConversationContext> get contexts => _contexts;
  List<ConversationContext> get searchResults => _searchResults;
  bool get isLoading => _isLoading;
  bool get isSearching => _isSearching;

  Future<void> addContext(
    String content, {
    String? category,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      _isLoading = true;
      notifyListeners();

      await _contextService.addContext(
        content,
        category: category,
        metadata: metadata,
      );

      _isLoading = false;
      notifyListeners();
    } catch (error) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> searchContext(String query, {String? category}) async {
    if (query.trim().isEmpty) {
      _searchResults = [];
      notifyListeners();
      return;
    }

    try {
      _isSearching = true;
      notifyListeners();

      _searchResults = await _contextService.searchContext(
        query,
        category: category,
      );

      _isSearching = false;
      notifyListeners();
    } catch (error) {
      _isSearching = false;
      _searchResults = [];
      notifyListeners();
      rethrow;
    }
  }

  Future<List<ConversationContext>> findSimilar(String content) async {
    try {
      return await _contextService.findSimilar(content);
    } catch (error) {
      rethrow;
    }
  }

  void clearSearchResults() {
    _searchResults = [];
    notifyListeners();
  }
}
`;
  }

  private generateReactNativeService(config: any): string {
    return `
interface ConversationContext {
  id: string;
  content: string;
  timestamp: Date;
  category?: string;
  metadata?: Record<string, any>;
  summary?: string;
}

class ContextService {
  private baseUrl = 'http://localhost:3000/api/context';

  async addContext(
    content: string,
    category?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        category,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add context');
    }

    const data = await response.json();
    return data.contextId;
  }

  async searchContext(
    query: string,
    options?: {
      category?: string;
      limit?: number;
    }
  ): Promise<ConversationContext[]> {
    const params = new URLSearchParams({
      query,
      ...(options?.category && { category: options.category }),
      ...(options?.limit && { limit: options.limit.toString() }),
    });

    const response = await fetch(\`\${this.baseUrl}?\${params}\`);

    if (!response.ok) {
      throw new Error('Failed to search context');
    }

    const data = await response.json();
    return data.results.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  }

  async findSimilar(
    content: string,
    threshold = 0.7,
    limit = 5
  ): Promise<ConversationContext[]> {
    const response = await fetch(\`\${this.baseUrl}/similar\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        threshold,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to find similar contexts');
    }

    const results = await response.json();
    return results.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  }
}

export const contextService = new ContextService();
export type { ConversationContext };
`;
  }

  private generateReactNativeHook(config: any): string {
    return `
import { useState, useCallback } from 'react';
import { contextService, ConversationContext } from '../services/contextService';

export function useContextManager() {
  const [searchResults, setSearchResults] = useState<ConversationContext[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const addContext = useCallback(async (
    content: string,
    category?: string,
    metadata?: Record<string, any>
  ) => {
    setIsAdding(true);
    try {
      const contextId = await contextService.addContext(content, category, metadata);
      return contextId;
    } finally {
      setIsAdding(false);
    }
  }, []);

  const searchContext = useCallback(async (
    query: string,
    options?: { category?: string; limit?: number }
  ) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await contextService.searchContext(query, options);
      setSearchResults(results);
      return results;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const findSimilar = useCallback(async (content: string) => {
    try {
      return await contextService.findSimilar(content);
    } catch (error) {
      console.error('Failed to find similar contexts:', error);
      return [];
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    searchResults,
    isSearching,
    isAdding,
    addContext,
    searchContext,
    findSimilar,
    clearSearch,
  };
}
`;
  }

  private generateGenericIntegration(config: any): string {
    return `
import { Context7MCPModule, ConversationContext } from '@starter-template-dna/dna-modules';

export class Context7Integration {
  private context7Module: Context7MCPModule;

  constructor() {
    this.context7Module = new Context7MCPModule(${JSON.stringify(config, null, 2)});
  }

  async initialize() {
    await this.context7Module.initialize();
  }

  async addContext(content: string, category?: string): Promise<string> {
    return await this.context7Module.storeContext({
      content,
      category,
      timestamp: new Date(),
    });
  }

  async searchContext(query: string, options?: {
    category?: string;
    limit?: number;
    days?: number;
  }): Promise<ConversationContext[]> {
    const timeRange = options?.days ? {
      start: new Date(Date.now() - options.days * 24 * 60 * 60 * 1000),
      end: new Date(),
    } : undefined;

    return await this.context7Module.retrieveContext(query, {
      category: options?.category,
      limit: options?.limit,
      timeRange,
    });
  }

  async findSimilar(content: string): Promise<ConversationContext[]> {
    return await this.context7Module.searchSimilar(content);
  }

  async summarizeContexts(contextIds: string[]): Promise<string> {
    return await this.context7Module.summarizeContext(contextIds);
  }

  async getStats() {
    return await this.context7Module.getContextStats();
  }

  async cleanup() {
    await this.context7Module.cleanup();
  }
}
`;
  }
}