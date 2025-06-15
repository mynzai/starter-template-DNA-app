import { DNAModule } from '@starter-template-dna/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface SupabaseMCPConfig {
  enabled: boolean;
  projectUrl?: string;
  anonKey?: string;
  serviceKey?: string;
  enableRealtime?: boolean;
  enableAuth?: boolean;
  enableStorage?: boolean;
  tables?: string[];
}

export class SupabaseMCPModule extends DNAModule {
  public readonly id = 'supabase-mcp';
  public readonly name = 'Supabase MCP Integration';
  public readonly description = 'Provides Supabase database and backend services through MCP';
  public readonly version = '1.0.0';
  public readonly category = 'database';
  
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(private config: SupabaseMCPConfig) {
    super();
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Initialize MCP client for Supabase operations
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: [
          '-y',
          '@smithery/cli@latest',
          'run',
          '@supabase-community/supabase-mcp',
          '--key',
          'c89dbd54-0e5f-49a3-84ea-5d02b90591ed',
          '--profile',
          'inevitable-ant-rajgzt'
        ],
      });

      this.client = new Client(
        {
          name: 'dna-supabase-client',
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

  async createTable(tableName: string, schema: Record<string, any>): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase MCP client not initialized');
    }

    await this.client.callTool({
      name: 'create_table',
      arguments: {
        table_name: tableName,
        schema: schema,
      },
    });
  }

  async insertData(tableName: string, data: Record<string, any>[]): Promise<any> {
    if (!this.client) {
      throw new Error('Supabase MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'insert_data',
      arguments: {
        table_name: tableName,
        data: data,
      },
    });

    return JSON.parse(result.content[0]?.text || '[]');
  }

  async queryData(tableName: string, filters?: Record<string, any>): Promise<any[]> {
    if (!this.client) {
      throw new Error('Supabase MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'query_data',
      arguments: {
        table_name: tableName,
        filters: filters,
      },
    });

    return JSON.parse(result.content[0]?.text || '[]');
  }

  async updateData(tableName: string, id: string, updates: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('Supabase MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'update_data',
      arguments: {
        table_name: tableName,
        id: id,
        updates: updates,
      },
    });

    return JSON.parse(result.content[0]?.text || '{}');
  }

  async deleteData(tableName: string, id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase MCP client not initialized');
    }

    await this.client.callTool({
      name: 'delete_data',
      arguments: {
        table_name: tableName,
        id: id,
      },
    });
  }

  async setupAuth(): Promise<void> {
    if (!this.client || !this.config.enableAuth) {
      return;
    }

    await this.client.callTool({
      name: 'setup_auth',
      arguments: {
        enable_signup: true,
        enable_email_confirmation: true,
      },
    });
  }

  async uploadFile(bucket: string, fileName: string, fileData: Buffer): Promise<string> {
    if (!this.client || !this.config.enableStorage) {
      throw new Error('Supabase storage not enabled or client not initialized');
    }

    const result = await this.client.callTool({
      name: 'upload_file',
      arguments: {
        bucket: bucket,
        file_name: fileName,
        file_data: fileData.toString('base64'),
      },
    });

    return result.content[0]?.text || '';
  }

  getCompatibleFrameworks(): string[] {
    return ['nextjs', 'react-native', 'flutter', 'tauri'];
  }

  generateCode(framework: string): Record<string, string> {
    const baseConfig = {
      enabled: true,
      projectUrl: this.config.projectUrl || 'YOUR_SUPABASE_URL',
      anonKey: this.config.anonKey || 'YOUR_SUPABASE_ANON_KEY',
      enableRealtime: this.config.enableRealtime ?? true,
      enableAuth: this.config.enableAuth ?? true,
      enableStorage: this.config.enableStorage ?? true,
    };

    switch (framework) {
      case 'nextjs':
        return {
          'lib/supabase.ts': this.generateNextJSClient(baseConfig),
          'lib/database.ts': this.generateNextJSDatabase(baseConfig),
          'lib/auth.ts': this.generateNextJSAuth(baseConfig),
          '.env.local.example': this.generateEnvExample(baseConfig),
        };
      case 'flutter':
        return {
          'lib/services/supabase_service.dart': this.generateFlutterService(baseConfig),
          'lib/models/user_model.dart': this.generateFlutterModels(),
        };
      case 'react-native':
        return {
          'src/services/supabase.ts': this.generateReactNativeService(baseConfig),
          'src/hooks/useAuth.ts': this.generateReactNativeAuth(baseConfig),
        };
      default:
        return {
          'src/integrations/supabase.ts': this.generateGenericIntegration(baseConfig),
        };
    }
  }

  private generateNextJSClient(config: any): string {
    return `
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  // Add your database types here
};
`;
  }

  private generateNextJSDatabase(config: any): string {
    return `
import { supabase } from './supabase';

export class DatabaseService {
  async createRecord<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getRecords<T>(table: string, filters?: Record<string, any>): Promise<T[]> {
    let query = supabase.from(table).select('*');
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateRecord<T>(table: string, id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRecord(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  subscribeToChanges(table: string, callback: (payload: any) => void) {
    return supabase
      .channel(\`public:\${table}\`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
  }
}

export const db = new DatabaseService();
`;
  }

  private generateNextJSAuth(config: any): string {
    return `
import { supabase } from './supabase';

export class AuthService {
  async signUp(email: string, password: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const auth = new AuthService();
`;
  }

  private generateFlutterService(config: any): string {
    return `
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;
  
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: 'YOUR_SUPABASE_URL',
      anonKey: 'YOUR_SUPABASE_ANON_KEY',
    );
  }

  // Authentication methods
  Future<AuthResponse> signUp(String email, String password) async {
    return await client.auth.signUp(
      email: email,
      password: password,
    );
  }

  Future<AuthResponse> signIn(String email, String password) async {
    return await client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  User? get currentUser => client.auth.currentUser;

  // Database methods
  Future<List<Map<String, dynamic>>> getRecords(String table) async {
    final response = await client.from(table).select();
    return List<Map<String, dynamic>>.from(response);
  }

  Future<Map<String, dynamic>> createRecord(
    String table, 
    Map<String, dynamic> data
  ) async {
    final response = await client
        .from(table)
        .insert(data)
        .select()
        .single();
    return response;
  }

  Future<Map<String, dynamic>> updateRecord(
    String table,
    String id,
    Map<String, dynamic> updates
  ) async {
    final response = await client
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return response;
  }

  Future<void> deleteRecord(String table, String id) async {
    await client.from(table).delete().eq('id', id);
  }

  // Realtime subscription
  RealtimeChannel subscribeToTable(
    String table,
    Function(PostgresChangeEvent) callback
  ) {
    return client
        .channel('public:$table')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: table,
          callback: callback,
        )
        .subscribe();
  }
}
`;
  }

  private generateFlutterModels(): string {
    return `
class UserModel {
  final String id;
  final String email;
  final String? name;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserModel({
    required this.id,
    required this.email,
    this.name,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
`;
  }

  private generateReactNativeService(config: any): string {
    return `
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export class SupabaseService {
  // Authentication
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Database operations
  async createRecord<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getRecords<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) throw error;
    return data || [];
  }
}

export const supabaseService = new SupabaseService();
`;
  }

  private generateReactNativeAuth(config: any): string {
    return `
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
`;
  }

  private generateGenericIntegration(config: any): string {
    return `
import { SupabaseMCPModule } from '@starter-template-dna/dna-modules';

export class SupabaseIntegration {
  private supabaseModule: SupabaseMCPModule;

  constructor() {
    this.supabaseModule = new SupabaseMCPModule(${JSON.stringify(config, null, 2)});
  }

  async initialize() {
    await this.supabaseModule.initialize();
  }

  async setupDatabase(tables: Array<{name: string, schema: any}>) {
    for (const table of tables) {
      await this.supabaseModule.createTable(table.name, table.schema);
    }
  }

  async insertData(table: string, records: any[]) {
    return await this.supabaseModule.insertData(table, records);
  }

  async queryData(table: string, filters?: any) {
    return await this.supabaseModule.queryData(table, filters);
  }

  async updateRecord(table: string, id: string, updates: any) {
    return await this.supabaseModule.updateData(table, id, updates);
  }

  async deleteRecord(table: string, id: string) {
    await this.supabaseModule.deleteData(table, id);
  }
}
`;
  }

  private generateEnvExample(config: any): string {
    return `
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`;
  }
}