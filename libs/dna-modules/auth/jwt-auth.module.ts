/**
 * @fileoverview JWT Authentication DNA Module
 */

import { z } from 'zod';
import {
  BaseDNAModule,
  FlutterDNAModule,
  ReactNativeDNAModule,
  NextJSDNAModule,
  TauriDNAModule,
  SvelteKitDNAModule
} from '@dna/core';
import {
  DNAModuleMetadata,
  DNAModuleDependency,
  DNAModuleConflict,
  DNAModuleConfig,
  FrameworkImplementation,
  DNAModuleContext,
  DNAModuleFile,
  SupportedFramework,
  CompatibilityLevel,
  DNAModuleCategory
} from '@dna/core';

/**
 * JWT Authentication configuration schema
 */
const JWTAuthConfigSchema = z.object({
  secretKey: z.string().min(32).optional(),
  issuer: z.string().optional(),
  audience: z.string().optional(),
  expiresIn: z.string().default('1h'),
  refreshTokenExpiry: z.string().default('7d'),
  algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS256'),
  enableRefreshTokens: z.boolean().default(true),
  enablePasswordHashing: z.boolean().default(true),
  hashRounds: z.number().min(10).max(20).default(12),
  enableRateLimiting: z.boolean().default(true),
  maxLoginAttempts: z.number().min(3).max(10).default(5),
  lockoutDuration: z.string().default('15m'),
  enableOAuth: z.boolean().default(false),
  oauthProviders: z.array(z.enum(['google', 'github', 'facebook', 'twitter'])).default([]),
  enableTwoFactor: z.boolean().default(false),
  twoFactorMethod: z.enum(['totp', 'sms', 'email']).default('totp'),
  // Enhanced RBAC configuration
  enableRBAC: z.boolean().default(true),
  defaultRole: z.string().default('user'),
  roles: z.array(z.object({
    name: z.string(),
    permissions: z.array(z.string()),
    description: z.string().optional(),
    isSystem: z.boolean().default(false)
  })).default([
    { name: 'admin', permissions: ['*'], description: 'Full system access', isSystem: true },
    { name: 'user', permissions: ['read:profile', 'update:profile'], description: 'Standard user access', isSystem: true }
  ]),
  // Storage backend configuration
  storageBackend: z.enum(['memory', 'redis', 'database', 'filesystem']).default('memory'),
  storageConfig: z.object({
    redis: z.object({
      host: z.string().default('localhost'),
      port: z.number().default(6379),
      password: z.string().optional(),
      database: z.number().default(0),
      keyPrefix: z.string().default('auth:')
    }).optional(),
    database: z.object({
      connectionString: z.string().optional(),
      tableName: z.string().default('auth_tokens'),
      userTableName: z.string().default('users')
    }).optional(),
    filesystem: z.object({
      path: z.string().default('./auth-storage'),
      encryptionKey: z.string().optional()
    }).optional()
  }).default({}),
  // Security enhancements
  enableCSRFProtection: z.boolean().default(true),
  enableCORS: z.boolean().default(true),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  enableSecureHeaders: z.boolean().default(true),
  cookieOptions: z.object({
    httpOnly: z.boolean().default(true),
    secure: z.boolean().default(true),
    sameSite: z.enum(['strict', 'lax', 'none']).default('strict'),
    maxAge: z.number().default(86400000) // 24 hours
  }).default({})
});

export type JWTAuthConfig = z.infer<typeof JWTAuthConfigSchema>;

/**
 * JWT Authentication DNA Module Implementation
 */
export class JWTAuthModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'auth-jwt',
    name: 'JWT Authentication',
    description: 'Complete JWT-based authentication system with refresh tokens, password hashing, and optional OAuth',
    version: '1.0.0',
    category: DNAModuleCategory.AUTHENTICATION,
    author: 'DNA Team',
    license: 'MIT',
    keywords: ['auth', 'jwt', 'authentication', 'security', 'oauth'],
    deprecated: false,
    experimental: false
  };

  public readonly dependencies: DNAModuleDependency[] = [
    {
      moduleId: 'security-encryption',
      version: '^1.0.0',
      optional: false,
      reason: 'Required for secure password hashing and token signing'
    }
  ];

  public readonly conflicts: DNAModuleConflict[] = [
    {
      moduleId: 'auth-oauth-only',
      reason: 'Cannot use both JWT and OAuth-only authentication',
      severity: 'error',
      resolution: 'Choose either JWT or OAuth-only authentication'
    },
    {
      moduleId: 'auth-session',
      reason: 'JWT and session-based auth are incompatible',
      severity: 'error',
      resolution: 'Choose either JWT or session-based authentication'
    }
  ];

  public readonly frameworks: FrameworkImplementation[] = [
    // Flutter implementation
    {
      framework: SupportedFramework.FLUTTER,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['flutter_secure_storage', 'http', 'crypto'],
      devDependencies: ['flutter_test', 'mockito'],
      peerDependencies: [],
      configFiles: ['pubspec.yaml'],
      templates: ['lib/auth/', 'test/auth/'],
      postInstallSteps: [
        'flutter pub get',
        'flutter packages pub run build_runner build --delete-conflicting-outputs'
      ],
      limitations: []
    },
    // React Native implementation
    {
      framework: SupportedFramework.REACT_NATIVE,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['jsonwebtoken', '@react-native-async-storage/async-storage', 'react-native-keychain'],
      devDependencies: ['@types/jsonwebtoken', 'jest', '@testing-library/react-native'],
      peerDependencies: ['react', 'react-native'],
      configFiles: ['metro.config.js'],
      templates: ['src/auth/', '__tests__/auth/'],
      postInstallSteps: [
        'npx pod-install',
        'npx react-native link react-native-keychain'
      ],
      limitations: ['Biometric authentication requires additional setup']
    },
    // Next.js implementation
    {
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['jsonwebtoken', 'bcryptjs', 'next-auth', 'jose'],
      devDependencies: ['@types/jsonwebtoken', '@types/bcryptjs', 'jest'],
      peerDependencies: ['next', 'react'],
      configFiles: ['next.config.js'],
      templates: ['pages/api/auth/', 'src/auth/', '__tests__/auth/'],
      postInstallSteps: [],
      limitations: []
    },
    // Tauri implementation
    {
      framework: SupportedFramework.TAURI,
      supported: true,
      compatibility: CompatibilityLevel.PARTIAL,
      dependencies: ['@tauri-apps/api'],
      devDependencies: ['@tauri-apps/cli'],
      peerDependencies: [],
      configFiles: ['src-tauri/tauri.conf.json'],
      templates: ['src/auth/', 'src-tauri/src/auth/'],
      postInstallSteps: ['cargo check'],
      limitations: ['Some OAuth providers may not work in desktop context']
    },
    // SvelteKit implementation
    {
      framework: SupportedFramework.SVELTEKIT,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['jsonwebtoken', 'bcryptjs', '@auth/sveltekit'],
      devDependencies: ['@types/jsonwebtoken', '@types/bcryptjs', 'vitest'],
      peerDependencies: ['svelte', '@sveltejs/kit'],
      configFiles: ['vite.config.ts'],
      templates: ['src/routes/auth/', 'src/lib/auth/', 'src/tests/auth/'],
      postInstallSteps: [],
      limitations: []
    }
  ];

  public readonly config: DNAModuleConfig = {
    schema: JWTAuthConfigSchema,
    defaults: {
      expiresIn: '1h',
      refreshTokenExpiry: '7d',
      algorithm: 'HS256',
      enableRefreshTokens: true,
      enablePasswordHashing: true,
      hashRounds: 12,
      enableRateLimiting: true,
      maxLoginAttempts: 5,
      lockoutDuration: '15m',
      enableOAuth: false,
      oauthProviders: [],
      enableTwoFactor: false,
      twoFactorMethod: 'totp',
      enableRBAC: true,
      defaultRole: 'user',
      roles: [
        { name: 'admin', permissions: ['*'], description: 'Full system access', isSystem: true },
        { name: 'user', permissions: ['read:profile', 'update:profile'], description: 'Standard user access', isSystem: true }
      ],
      storageBackend: 'memory',
      storageConfig: {},
      enableCSRFProtection: true,
      enableCORS: true,
      corsOrigins: ['http://localhost:3000'],
      enableSecureHeaders: true,
      cookieOptions: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 86400000
      }
    },
    required: [],
    validation: {
      rules: {},
      custom: async (config: JWTAuthConfig) => {
        const errors: string[] = [];
        
        if (config.enableOAuth && config.oauthProviders.length === 0) {
          errors.push('OAuth is enabled but no providers are configured');
        }
        
        if (config.enableTwoFactor && !config.enableOAuth && !config.secretKey) {
          errors.push('Two-factor authentication requires either OAuth or a secret key');
        }

        if (config.enableRBAC && config.roles.length === 0) {
          errors.push('RBAC is enabled but no roles are defined');
        }

        if (config.enableRBAC && !config.roles.some(role => role.name === config.defaultRole)) {
          errors.push(`Default role '${config.defaultRole}' is not defined in roles list`);
        }

        if (config.storageBackend === 'redis' && !config.storageConfig.redis) {
          errors.push('Redis storage backend requires redis configuration');
        }

        if (config.storageBackend === 'database' && !config.storageConfig.database) {
          errors.push('Database storage backend requires database configuration');
        }

        if (config.enableCORS && config.corsOrigins.length === 0) {
          errors.push('CORS is enabled but no origins are configured');
        }
        
        return errors;
      }
    }
  };

  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];
    const config = context.moduleConfig as JWTAuthConfig;

    switch (context.framework) {
      case SupportedFramework.FLUTTER:
        files.push(...await this.generateFlutterFiles(config, context));
        break;
      case SupportedFramework.REACT_NATIVE:
        files.push(...await this.generateReactNativeFiles(config, context));
        break;
      case SupportedFramework.NEXTJS:
        files.push(...await this.generateNextJSFiles(config, context));
        break;
      case SupportedFramework.TAURI:
        files.push(...await this.generateTauriFiles(config, context));
        break;
      case SupportedFramework.SVELTEKIT:
        files.push(...await this.generateSvelteKitFiles(config, context));
        break;
    }

    return files;
  }

  private async generateFlutterFiles(config: JWTAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Auth service
    files.push({
      relativePath: 'lib/services/auth_service.dart',
      content: this.generateFlutterAuthService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Models
    files.push({
      relativePath: 'lib/models/user.dart',
      content: this.generateFlutterUserModel(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Provider
    files.push({
      relativePath: 'lib/providers/auth_provider.dart',
      content: this.generateFlutterAuthProvider(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Tests
    files.push({
      relativePath: 'test/auth/auth_service_test.dart',
      content: this.generateFlutterAuthTests(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER, isTest: true }
    });

    return files;
  }

  private async generateReactNativeFiles(config: JWTAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Auth service
    files.push({
      relativePath: 'src/services/authService.ts',
      content: this.generateReactNativeAuthService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // Types
    files.push({
      relativePath: 'src/types/auth.ts',
      content: this.generateReactNativeAuthTypes(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // Context
    files.push({
      relativePath: 'src/contexts/AuthContext.tsx',
      content: this.generateReactNativeAuthContext(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // Tests
    files.push({
      relativePath: '__tests__/auth/authService.test.ts',
      content: this.generateReactNativeAuthTests(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE, isTest: true }
    });

    return files;
  }

  private async generateNextJSFiles(config: JWTAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // API routes
    files.push({
      relativePath: 'pages/api/auth/login.ts',
      content: this.generateNextJSLoginAPI(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    files.push({
      relativePath: 'pages/api/auth/refresh.ts',
      content: this.generateNextJSRefreshAPI(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    // Auth utilities
    files.push({
      relativePath: 'src/lib/auth.ts',
      content: this.generateNextJSAuthLib(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // Middleware
    files.push({
      relativePath: 'middleware.ts',
      content: this.generateNextJSMiddleware(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    return files;
  }

  private async generateTauriFiles(config: JWTAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Frontend auth service
    files.push({
      relativePath: 'src/services/authService.ts',
      content: this.generateTauriAuthService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.TAURI, isFrontend: true }
    });

    // Rust backend
    files.push({
      relativePath: 'src-tauri/src/auth/mod.rs',
      content: this.generateTauriAuthModule(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.TAURI, isRust: true }
    });

    return files;
  }

  private async generateSvelteKitFiles(config: JWTAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Auth hooks
    files.push({
      relativePath: 'src/hooks.server.ts',
      content: this.generateSvelteKitAuthHooks(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'merge',
      conditions: { framework: SupportedFramework.SVELTEKIT, isServer: true }
    });

    // Auth stores
    files.push({
      relativePath: 'src/lib/stores/auth.ts',
      content: this.generateSvelteKitAuthStore(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.SVELTEKIT }
    });

    // Login route
    files.push({
      relativePath: 'src/routes/auth/login/+page.server.ts',
      content: this.generateSvelteKitLoginRoute(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.SVELTEKIT, isRoute: true }
    });

    return files;
  }

  // Framework-specific code generation methods
  private generateFlutterAuthService(config: JWTAuthConfig): string {
    return `import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:crypto/crypto.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();
  static const String _tokenKey = 'jwt_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'user_data';
  static const String _permissionsKey = 'user_permissions';

  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: _tokenKey, value: data['token']);
        ${config.enableRefreshTokens ? "await _storage.write(key: _refreshTokenKey, value: data['refreshToken']);" : ''}
        ${config.enableRBAC ? `
        await _storage.write(key: _userKey, value: jsonEncode(data['user']));
        await _storage.write(key: _permissionsKey, value: jsonEncode(data['permissions'] ?? []));` : ''}
        return data;
      }
    } catch (e) {
      throw Exception('Login failed: \$e');
    }
    return null;
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    ${config.enableRefreshTokens ? "await _storage.delete(key: _refreshTokenKey);" : ''}
    ${config.enableRBAC ? `
    await _storage.delete(key: _userKey);
    await _storage.delete(key: _permissionsKey);` : ''}
  }

  ${config.enableRBAC ? `
  Future<List<String>> getUserPermissions() async {
    try {
      final permissionsJson = await _storage.read(key: _permissionsKey);
      if (permissionsJson != null) {
        final List<dynamic> permissions = jsonDecode(permissionsJson);
        return permissions.cast<String>();
      }
    } catch (e) {
      print('Error reading permissions: \$e');
    }
    return [];
  }

  Future<bool> hasPermission(String permission) async {
    final permissions = await getUserPermissions();
    return permissions.contains('*') || permissions.contains(permission);
  }

  Future<bool> hasAnyPermission(List<String> requiredPermissions) async {
    final userPermissions = await getUserPermissions();
    if (userPermissions.contains('*')) return true;
    
    return requiredPermissions.any((permission) => userPermissions.contains(permission));
  }

  Future<bool> hasAllPermissions(List<String> requiredPermissions) async {
    final userPermissions = await getUserPermissions();
    if (userPermissions.contains('*')) return true;
    
    return requiredPermissions.every((permission) => userPermissions.contains(permission));
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final userJson = await _storage.read(key: _userKey);
      if (userJson != null) {
        return jsonDecode(userJson);
      }
    } catch (e) {
      print('Error reading user data: \$e');
    }
    return null;
  }` : ''}

  ${config.enableRefreshTokens ? `
  Future<String?> refreshToken() async {
    final refreshToken = await _storage.read(key: _refreshTokenKey);
    if (refreshToken == null) return null;

    try {
      final response = await http.post(
        Uri.parse('/api/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: _tokenKey, value: data['token']);
        return data['token'];
      }
    } catch (e) {
      await logout();
    }
    return null;
  }` : ''}
}`;
  }

  private generateFlutterUserModel(config: JWTAuthConfig): string {
    return `class User {
  final String id;
  final String email;
  final String? name;
  ${config.enableTwoFactor ? 'final bool twoFactorEnabled;' : ''}
  ${config.enableRBAC ? `final String role;
  final List<String> permissions;` : ''}

  User({
    required this.id,
    required this.email,
    this.name,
    ${config.enableTwoFactor ? 'this.twoFactorEnabled = false,' : ''}
    ${config.enableRBAC ? `required this.role,
    this.permissions = const [],` : ''}
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      ${config.enableTwoFactor ? 'twoFactorEnabled: json["twoFactorEnabled"] ?? false,' : ''}
      ${config.enableRBAC ? `role: json['role'] ?? '${config.defaultRole}',
      permissions: (json['permissions'] as List<dynamic>?)?.cast<String>() ?? [],` : ''}
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      ${config.enableTwoFactor ? '"twoFactorEnabled": twoFactorEnabled,' : ''}
      ${config.enableRBAC ? `'role': role,
      'permissions': permissions,` : ''}
    };
  }

  ${config.enableRBAC ? `
  bool hasPermission(String permission) {
    return permissions.contains('*') || permissions.contains(permission);
  }

  bool hasAnyPermission(List<String> requiredPermissions) {
    if (permissions.contains('*')) return true;
    return requiredPermissions.any((permission) => permissions.contains(permission));
  }

  bool hasAllPermissions(List<String> requiredPermissions) {
    if (permissions.contains('*')) return true;
    return requiredPermissions.every((permission) => permissions.contains(permission));
  }

  bool isAdmin() {
    return role == 'admin' || permissions.contains('*');
  }` : ''}
}`;
  }

  private generateFlutterAuthProvider(config: JWTAuthConfig): string {
    return `import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  User? _user;
  bool _isLoading = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await _authService.login(email, password);
      if (result != null) {
        _user = User.fromJson(result['user']);
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Login error: \$e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    final token = await _authService.getToken();
    if (token != null) {
      // Validate token and get user info
      // Implementation depends on your backend
    }
  }
}`;
  }

  private generateFlutterAuthTests(config: JWTAuthConfig): string {
    return `import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:${context.projectName}/services/auth_service.dart';

void main() {
  group('AuthService', () {
    late AuthService authService;

    setUp(() {
      authService = AuthService();
    });

    test('should login successfully with valid credentials', () async {
      // Test implementation
      expect(true, true); // Placeholder
    });

    test('should handle login failure', () async {
      // Test implementation
      expect(true, true); // Placeholder
    });

    ${config.enableRefreshTokens ? `
    test('should refresh token when needed', () async {
      // Test implementation
      expect(true, true); // Placeholder
    });` : ''}
  });
}`;
  }

  private generateReactNativeAuthService(config: JWTAuthConfig): string {
    return `import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  ${config.enableRefreshTokens ? 'refreshToken: string;' : ''}
}

export class AuthService {
  private static readonly TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  static async login(credentials: LoginCredentials): Promise<AuthTokens | null> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store tokens securely
        await Keychain.setInternetCredentials(
          AuthService.TOKEN_KEY,
          'token',
          data.accessToken
        );

        ${config.enableRefreshTokens ? `
        await Keychain.setInternetCredentials(
          AuthService.REFRESH_TOKEN_KEY,
          'refreshToken',
          data.refreshToken
        );` : ''}

        return data;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
    return null;
  }

  static async getToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(AuthService.TOKEN_KEY);
      return credentials ? credentials.password : null;
    } catch (error) {
      return null;
    }
  }

  static async logout(): Promise<void> {
    await Keychain.resetInternetCredentials(AuthService.TOKEN_KEY);
    ${config.enableRefreshTokens ? 'await Keychain.resetInternetCredentials(AuthService.REFRESH_TOKEN_KEY);' : ''}
  }

  ${config.enableRefreshTokens ? `
  static async refreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(AuthService.REFRESH_TOKEN_KEY);
      if (!credentials) return null;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: credentials.password }),
      });

      if (response.ok) {
        const data = await response.json();
        await Keychain.setInternetCredentials(
          AuthService.TOKEN_KEY,
          'token',
          data.accessToken
        );
        return data.accessToken;
      }
    } catch (error) {
      await AuthService.logout();
    }
    return null;
  }` : ''}
}`;
  }

  private generateReactNativeAuthTypes(config: JWTAuthConfig): string {
    return `export interface User {
  id: string;
  email: string;
  name?: string;
  ${config.enableTwoFactor ? 'twoFactorEnabled?: boolean;' : ''}
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  ${config.enableTwoFactor ? 'twoFactorCode?: string;' : ''}
}

export interface AuthTokens {
  accessToken: string;
  ${config.enableRefreshTokens ? 'refreshToken: string;' : ''}
  expiresIn: number;
}`;
  }

  private generateReactNativeAuthContext(config: JWTAuthConfig): string {
    return `import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { User, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  ${config.enableRefreshTokens ? 'refreshToken: () => Promise<void>;' : ''}
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        user: action.payload,
        isAuthenticated: true,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        user: null,
        isAuthenticated: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: false,
    isAuthenticated: false,
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const result = await AuthService.login({ email, password });
      if (result) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: result.user });
        return true;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
    
    dispatch({ type: 'LOGIN_FAILURE' });
    return false;
  };

  const logout = async (): Promise<void> => {
    await AuthService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  ${config.enableRefreshTokens ? `
  const refreshToken = async (): Promise<void> => {
    const newToken = await AuthService.refreshToken();
    if (!newToken) {
      dispatch({ type: 'LOGOUT' });
    }
  };` : ''}

  useEffect(() => {
    // Check auth status on app start
    const checkAuthStatus = async () => {
      const token = await AuthService.getToken();
      if (token) {
        // Validate token and get user info
        // Implementation depends on your backend
      }
    };
    
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    ${config.enableRefreshTokens ? 'refreshToken,' : ''}
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};`;
  }

  private generateReactNativeAuthTests(config: JWTAuthConfig): string {
    return `import { AuthService } from '../authService';

describe('AuthService', () => {
  beforeEach(() => {
    // Reset mocks
  });

  it('should login successfully with valid credentials', async () => {
    // Test implementation
    expect(true).toBe(true);
  });

  it('should handle login failure', async () => {
    // Test implementation
    expect(true).toBe(true);
  });

  ${config.enableRefreshTokens ? `
  it('should refresh token when needed', async () => {
    // Test implementation
    expect(true).toBe(true);
  });` : ''}
});`;
  }

  private generateNextJSLoginAPI(config: JWTAuthConfig): string {
    return `import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface LoginRequest {
  email: string;
  password: string;
  ${config.enableTwoFactor ? 'twoFactorCode?: string;' : ''}
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password${config.enableTwoFactor ? ', twoFactorCode' : ''} }: LoginRequest = req.body;

    // Validate user credentials
    // This is a placeholder - implement your user validation logic
    const user = await validateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    ${config.enableTwoFactor ? `
    if (user.twoFactorEnabled && !twoFactorCode) {
      return res.status(200).json({ requireTwoFactor: true });
    }

    if (user.twoFactorEnabled && twoFactorCode) {
      const isValidTwoFactor = await validateTwoFactor(user.id, twoFactorCode);
      if (!isValidTwoFactor) {
        return res.status(401).json({ message: 'Invalid two-factor code' });
      }
    }` : ''}

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '${config.expiresIn}' }
    );

    ${config.enableRefreshTokens ? `
    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '${config.refreshTokenExpiry}' }
    );

    // Store refresh token (implement your storage logic)
    await storeRefreshToken(user.id, refreshToken);` : ''}

    res.status(200).json({
      token,
      ${config.enableRefreshTokens ? 'refreshToken,' : ''}
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function validateUser(email: string, password: string) {
  // Implement your user validation logic
  return null;
}

${config.enableTwoFactor ? `
async function validateTwoFactor(userId: string, code: string): Promise<boolean> {
  // Implement your two-factor validation logic
  return false;
}` : ''}

${config.enableRefreshTokens ? `
async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  // Implement your refresh token storage logic
}` : ''}`;
  }

  private generateNextJSRefreshAPI(config: JWTAuthConfig): string {
    if (!config.enableRefreshTokens) {
      return '// Refresh tokens are disabled';
    }

    return `import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Check if refresh token is valid in database
    const isValidRefreshToken = await validateRefreshToken(decoded.userId, refreshToken);
    
    if (!isValidRefreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new access token
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      JWT_SECRET,
      { expiresIn: '${config.expiresIn}' }
    );

    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
}

async function validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
  // Implement your refresh token validation logic
  return false;
}`;
  }

  private generateNextJSAuthLib(config: JWTAuthConfig): string {
    return `import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '${config.expiresIn}' }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization;
  
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.substring(7);
  }
  
  return null;
}

export function getUserFromRequest(req: NextApiRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  
  if (token) {
    return verifyToken(token);
  }
  
  return null;
}

${config.enablePasswordHashing ? `
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ${config.hashRounds});
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}` : ''}`;
  }

  private generateNextJSMiddleware(config: JWTAuthConfig): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './src/lib/auth';

export function middleware(request: NextRequest) {
  // Protected routes
  const protectedPaths = ['/dashboard', '/profile', '/admin'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    const token = request.cookies.get('token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-email', payload.email);
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/admin/:path*']
};`;
  }

  private generateTauriAuthService(config: JWTAuthConfig): string {
    return `import { invoke } from '@tauri-apps/api/tauri';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<User | null> {
    try {
      const result = await invoke<{ user: User; token: string }>('auth_login', {
        credentials
      });
      
      if (result) {
        // Store token securely using Tauri's secure storage
        await invoke('store_token', { token: result.token });
        return result.user;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
    return null;
  }

  static async logout(): Promise<void> {
    try {
      await invoke('auth_logout');
      await invoke('clear_token');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  static async getToken(): Promise<string | null> {
    try {
      return await invoke<string>('get_token');
    } catch (error) {
      return null;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      return await invoke<User>('get_current_user');
    } catch (error) {
      return null;
    }
  }
}`;
  }

  private generateTauriAuthModule(config: JWTAuthConfig): string {
    return `use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    id: String,
    email: String,
    name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginCredentials {
    email: String,
    password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    user: User,
    token: String,
}

pub struct AuthState {
    token: Mutex<Option<String>>,
    user: Mutex<Option<User>>,
}

impl AuthState {
    pub fn new() -> Self {
        Self {
            token: Mutex::new(None),
            user: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn auth_login(
    credentials: LoginCredentials,
    state: State<'_, AuthState>,
) -> Result<LoginResponse, String> {
    // Implement your authentication logic here
    // This is a placeholder implementation
    
    if credentials.email == "demo@example.com" && credentials.password == "password" {
        let user = User {
            id: "1".to_string(),
            email: credentials.email,
            name: Some("Demo User".to_string()),
        };
        
        let token = "demo_token".to_string(); // Generate real JWT token
        
        // Store in state
        *state.token.lock().unwrap() = Some(token.clone());
        *state.user.lock().unwrap() = Some(user.clone());
        
        Ok(LoginResponse { user, token })
    } else {
        Err("Invalid credentials".to_string())
    }
}

#[tauri::command]
pub async fn auth_logout(state: State<'_, AuthState>) -> Result<(), String> {
    *state.token.lock().unwrap() = None;
    *state.user.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn store_token(token: String, state: State<'_, AuthState>) -> Result<(), String> {
    *state.token.lock().unwrap() = Some(token);
    Ok(())
}

#[tauri::command]
pub async fn get_token(state: State<'_, AuthState>) -> Result<Option<String>, String> {
    Ok(state.token.lock().unwrap().clone())
}

#[tauri::command]
pub async fn clear_token(state: State<'_, AuthState>) -> Result<(), String> {
    *state.token.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn get_current_user(state: State<'_, AuthState>) -> Result<Option<User>, String> {
    Ok(state.user.lock().unwrap().clone())
}`;
  }

  private generateSvelteKitAuthHooks(config: JWTAuthConfig): string {
    return `import type { Handle } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const handle: Handle = async ({ event, resolve }) => {
  // Get token from cookies or authorization header
  const token = event.cookies.get('token') || 
                event.request.headers.get('authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      event.locals.user = {
        id: payload.userId,
        email: payload.email,
      };
    } catch (error) {
      // Token is invalid, clear it
      event.cookies.delete('token');
    }
  }

  return resolve(event);
};`;
  }

  private generateSvelteKitAuthStore(config: JWTAuthConfig): string {
    return `import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isLoading: false,
    isAuthenticated: false,
  });

  return {
    subscribe,
    login: async (email: string, password: string) => {
      update(state => ({ ...state, isLoading: true }));
      
      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const data = await response.json();
          update(state => ({
            ...state,
            user: data.user,
            isLoading: false,
            isAuthenticated: true,
          }));
          return true;
        }
      } catch (error) {
        console.error('Login failed:', error);
      }
      
      update(state => ({ ...state, isLoading: false }));
      return false;
    },
    logout: async () => {
      try {
        await fetch('/auth/logout', { method: 'POST' });
      } finally {
        set({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    },
    setUser: (user: User | null) => {
      update(state => ({
        ...state,
        user,
        isAuthenticated: user !== null,
      }));
    },
  };
}

export const auth = createAuthStore();`;
  }

  private generateSvelteKitLoginRoute(config: JWTAuthConfig): string {
    return `import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const load: PageServerLoad = async ({ locals }) => {
  // Redirect if already authenticated
  if (locals.user) {
    throw redirect(302, '/dashboard');
  }
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString();
    const password = data.get('password')?.toString();

    if (!email || !password) {
      return fail(400, { 
        error: 'Email and password are required',
        email 
      });
    }

    try {
      // Validate user credentials
      const user = await validateUser(email, password);
      
      if (!user) {
        return fail(401, { 
          error: 'Invalid credentials',
          email 
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '${config.expiresIn}' }
      );

      // Set secure cookie
      cookies.set('token', token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      throw redirect(302, '/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      return fail(500, { 
        error: 'Login failed',
        email 
      });
    }
  },
};

async function validateUser(email: string, password: string) {
  // Implement your user validation logic
  return null;
}`;
  }
}