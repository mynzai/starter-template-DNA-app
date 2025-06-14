/**
 * @fileoverview Role-Based Access Control (RBAC) System DNA Module
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
 * Permission definition schema
 */
const PermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  resource: z.string(),
  action: z.enum(['create', 'read', 'update', 'delete', 'execute', 'manage', '*']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'starts_with', 'ends_with']),
    value: z.any()
  })).default([]),
  isSystem: z.boolean().default(false)
});

/**
 * Role definition schema
 */
const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()),
  parentRoles: z.array(z.string()).default([]),
  isSystem: z.boolean().default(false),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).default({})
});

/**
 * User role assignment schema
 */
const UserRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
  assignedBy: z.string().optional(),
  assignedAt: z.date().default(() => new Date()),
  expiresAt: z.date().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any()
  })).default([]),
  isActive: z.boolean().default(true)
});

/**
 * RBAC System configuration schema
 */
const RBACConfigSchema = z.object({
  // Core RBAC settings
  enableHierarchicalRoles: z.boolean().default(true),
  enableConditionalPermissions: z.boolean().default(true),
  enableTemporaryRoles: z.boolean().default(true),
  enableRoleInheritance: z.boolean().default(true),
  defaultRole: z.string().default('user'),
  
  // Permission system
  permissionNamingConvention: z.enum(['resource:action', 'action:resource', 'custom']).default('resource:action'),
  enableWildcardPermissions: z.boolean().default(true),
  enablePermissionGroups: z.boolean().default(true),
  enableDynamicPermissions: z.boolean().default(false),
  
  // Role management
  maxRolesPerUser: z.number().min(1).max(50).default(10),
  enableRoleApprovalWorkflow: z.boolean().default(false),
  enableRoleAuditing: z.boolean().default(true),
  roleAssignmentRequiresApproval: z.boolean().default(false),
  
  // Security settings
  enablePermissionCaching: z.boolean().default(true),
  cacheTimeout: z.string().default('15m'),
  enableAccessLogging: z.boolean().default(true),
  enablePermissionValidation: z.boolean().default(true),
  enableSecurityPolicies: z.boolean().default(true),
  
  // Storage configuration
  storageBackend: z.enum(['memory', 'redis', 'database', 'ldap']).default('database'),
  storageConfig: z.object({
    database: z.object({
      connectionString: z.string().optional(),
      rolesTable: z.string().default('roles'),
      permissionsTable: z.string().default('permissions'),
      userRolesTable: z.string().default('user_roles'),
      rolePermissionsTable: z.string().default('role_permissions')
    }).optional(),
    redis: z.object({
      host: z.string().default('localhost'),
      port: z.number().default(6379),
      password: z.string().optional(),
      database: z.number().default(0),
      keyPrefix: z.string().default('rbac:')
    }).optional(),
    ldap: z.object({
      url: z.string().optional(),
      baseDN: z.string().optional(),
      bindDN: z.string().optional(),
      bindPassword: z.string().optional(),
      groupAttribute: z.string().default('memberOf'),
      userAttribute: z.string().default('uid')
    }).optional()
  }).default({}),
  
  // Integration settings
  authModuleIntegration: z.object({
    jwtIntegration: z.boolean().default(true),
    oauthIntegration: z.boolean().default(true),
    sessionIntegration: z.boolean().default(true),
    biometricIntegration: z.boolean().default(true),
    syncRolesOnLogin: z.boolean().default(true),
    refreshRolesOnRequest: z.boolean().default(false)
  }).default({}),
  
  // Pre-defined system roles and permissions
  systemRoles: z.array(RoleSchema).default([
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access',
      permissions: ['*'],
      parentRoles: [],
      isSystem: true,
      isActive: true,
      metadata: {}
    },
    {
      id: 'user',
      name: 'User',
      description: 'Standard user access',
      permissions: ['user:read', 'profile:read', 'profile:update'],
      parentRoles: [],
      isSystem: true,
      isActive: true,
      metadata: {}
    },
    {
      id: 'moderator',
      name: 'Moderator',
      description: 'Content moderation access',
      permissions: ['content:read', 'content:update', 'content:delete', 'user:read'],
      parentRoles: ['user'],
      isSystem: true,
      isActive: true,
      metadata: {}
    }
  ]),
  
  systemPermissions: z.array(PermissionSchema).default([
    {
      id: 'admin-all',
      name: 'All Permissions',
      description: 'Wildcard permission for administrators',
      resource: '*',
      action: '*',
      conditions: [],
      isSystem: true
    },
    {
      id: 'user-read',
      name: 'Read Users',
      description: 'Permission to read user information',
      resource: 'user',
      action: 'read',
      conditions: [],
      isSystem: true
    },
    {
      id: 'profile-read',
      name: 'Read Profile',
      description: 'Permission to read own profile',
      resource: 'profile',
      action: 'read',
      conditions: [{ field: 'user_id', operator: 'eq', value: '{{current_user_id}}' }],
      isSystem: true
    },
    {
      id: 'profile-update',
      name: 'Update Profile',
      description: 'Permission to update own profile',
      resource: 'profile',
      action: 'update',
      conditions: [{ field: 'user_id', operator: 'eq', value: '{{current_user_id}}' }],
      isSystem: true
    }
  ])
});

export type RBACConfig = z.infer<typeof RBACConfigSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * RBAC System DNA Module Implementation
 */
export class RBACSystemModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'auth-rbac-system',
    name: 'RBAC System',
    description: 'Comprehensive Role-Based Access Control system with hierarchical roles, conditional permissions, and multi-storage backend support',
    version: '1.0.0',
    category: DNAModuleCategory.AUTHENTICATION,
    author: 'DNA Team',
    license: 'MIT',
    keywords: ['rbac', 'authorization', 'permissions', 'roles', 'access-control', 'security'],
    deprecated: false,
    experimental: false
  };

  public readonly dependencies: DNAModuleDependency[] = [
    {
      moduleId: 'security-encryption',
      version: '^1.0.0',
      optional: false,
      reason: 'Required for secure permission and role data handling'
    }
  ];

  public readonly conflicts: DNAModuleConflict[] = [];

  public readonly frameworks: FrameworkImplementation[] = [
    // Flutter implementation
    {
      framework: SupportedFramework.FLUTTER,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [
        'flutter_secure_storage',
        'http',
        'shared_preferences'
      ],
      devDependencies: ['flutter_test', 'mockito'],
      peerDependencies: [],
      configFiles: ['pubspec.yaml'],
      templates: ['lib/rbac/', 'test/rbac/'],
      postInstallSteps: [
        'flutter pub get'
      ],
      limitations: []
    },
    // React Native implementation
    {
      framework: SupportedFramework.REACT_NATIVE,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [
        '@react-native-async-storage/async-storage',
        'react-native-keychain'
      ],
      devDependencies: ['@types/react-native', 'jest', '@testing-library/react-native'],
      peerDependencies: ['react', 'react-native'],
      configFiles: ['metro.config.js'],
      templates: ['src/rbac/', '__tests__/rbac/'],
      postInstallSteps: [],
      limitations: []
    },
    // Next.js implementation (full server-side support)
    {
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [
        'lodash',
        'redis',
        'pg',
        'mysql2',
        'mongodb'
      ],
      devDependencies: ['@types/lodash', 'jest'],
      peerDependencies: ['next', 'react'],
      configFiles: ['next.config.js'],
      templates: ['pages/api/rbac/', 'src/rbac/', '__tests__/rbac/'],
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
      templates: ['src/rbac/', 'src-tauri/src/rbac/'],
      postInstallSteps: ['cargo check'],
      limitations: ['Limited server-side RBAC capabilities']
    },
    // SvelteKit implementation
    {
      framework: SupportedFramework.SVELTEKIT,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [
        'lodash',
        'redis',
        'pg'
      ],
      devDependencies: ['@types/lodash', 'vitest'],
      peerDependencies: ['svelte', '@sveltejs/kit'],
      configFiles: ['vite.config.ts'],
      templates: ['src/routes/rbac/', 'src/lib/rbac/', 'src/tests/rbac/'],
      postInstallSteps: [],
      limitations: []
    }
  ];

  public readonly config: DNAModuleConfig = {
    schema: RBACConfigSchema,
    defaults: {
      enableHierarchicalRoles: true,
      enableConditionalPermissions: true,
      enableTemporaryRoles: true,
      enableRoleInheritance: true,
      defaultRole: 'user',
      permissionNamingConvention: 'resource:action',
      enableWildcardPermissions: true,
      enablePermissionGroups: true,
      enableDynamicPermissions: false,
      maxRolesPerUser: 10,
      enableRoleApprovalWorkflow: false,
      enableRoleAuditing: true,
      roleAssignmentRequiresApproval: false,
      enablePermissionCaching: true,
      cacheTimeout: '15m',
      enableAccessLogging: true,
      enablePermissionValidation: true,
      enableSecurityPolicies: true,
      storageBackend: 'database',
      storageConfig: {},
      authModuleIntegration: {
        jwtIntegration: true,
        oauthIntegration: true,
        sessionIntegration: true,
        biometricIntegration: true,
        syncRolesOnLogin: true,
        refreshRolesOnRequest: false
      },
      systemRoles: [
        {
          id: 'admin',
          name: 'Administrator',
          description: 'Full system access',
          permissions: ['*'],
          parentRoles: [],
          isSystem: true,
          isActive: true,
          metadata: {}
        },
        {
          id: 'user',
          name: 'User',
          description: 'Standard user access',
          permissions: ['user:read', 'profile:read', 'profile:update'],
          parentRoles: [],
          isSystem: true,
          isActive: true,
          metadata: {}
        }
      ],
      systemPermissions: [
        {
          id: 'admin-all',
          name: 'All Permissions',
          description: 'Wildcard permission for administrators',
          resource: '*',
          action: '*',
          conditions: [],
          isSystem: true
        },
        {
          id: 'user-read',
          name: 'Read Users',
          description: 'Permission to read user information',
          resource: 'user',
          action: 'read',
          conditions: [],
          isSystem: true
        }
      ]
    },
    required: [],
    validation: {
      rules: {},
      custom: async (config: RBACConfig) => {
        const errors: string[] = [];
        
        if (config.storageBackend === 'database' && !config.storageConfig.database) {
          errors.push('Database storage backend requires database configuration');
        }

        if (config.storageBackend === 'redis' && !config.storageConfig.redis) {
          errors.push('Redis storage backend requires redis configuration');
        }

        if (config.storageBackend === 'ldap' && !config.storageConfig.ldap) {
          errors.push('LDAP storage backend requires ldap configuration');
        }

        if (config.maxRolesPerUser < 1) {
          errors.push('Max roles per user must be at least 1');
        }

        // Validate system roles reference valid permissions
        const systemPermissionIds = new Set(config.systemPermissions.map(p => p.id));
        for (const role of config.systemRoles) {
          for (const permissionId of role.permissions) {
            if (permissionId !== '*' && !systemPermissionIds.has(permissionId)) {
              errors.push(`Role '${role.id}' references unknown permission '${permissionId}'`);
            }
          }
        }
        
        return errors;
      }
    }
  };

  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];
    const config = context.moduleConfig as RBACConfig;

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

  private async generateFlutterFiles(config: RBACConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // RBAC service
    files.push({
      relativePath: 'lib/services/rbac_service.dart',
      content: this.generateFlutterRBACService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // RBAC models
    files.push({
      relativePath: 'lib/models/rbac_models.dart',
      content: this.generateFlutterRBACModels(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Permission checker widget
    files.push({
      relativePath: 'lib/widgets/permission_widget.dart',
      content: this.generateFlutterPermissionWidget(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    return files;
  }

  private async generateReactNativeFiles(config: RBACConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // RBAC service
    files.push({
      relativePath: 'src/services/rbacService.ts',
      content: this.generateReactNativeRBACService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // RBAC context
    files.push({
      relativePath: 'src/contexts/RBACContext.tsx',
      content: this.generateReactNativeRBACContext(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // Permission components
    files.push({
      relativePath: 'src/components/PermissionGate.tsx',
      content: this.generateReactNativePermissionGate(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    return files;
  }

  private async generateNextJSFiles(config: RBACConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // RBAC core service
    files.push({
      relativePath: 'src/lib/rbac/core.ts',
      content: this.generateNextJSRBACCore(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // Permission manager
    files.push({
      relativePath: 'src/lib/rbac/permissionManager.ts',
      content: this.generateNextJSPermissionManager(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // Role manager
    files.push({
      relativePath: 'src/lib/rbac/roleManager.ts',
      content: this.generateNextJSRoleManager(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // RBAC middleware
    files.push({
      relativePath: 'src/middleware/rbac.ts',
      content: this.generateNextJSRBACMiddleware(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    // API routes for RBAC management
    files.push({
      relativePath: 'pages/api/rbac/permissions/index.ts',
      content: this.generateNextJSPermissionsAPI(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    files.push({
      relativePath: 'pages/api/rbac/roles/index.ts',
      content: this.generateNextJSRolesAPI(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    // Storage implementations
    files.push({
      relativePath: 'src/lib/rbac/storage/databaseStorage.ts',
      content: this.generateNextJSDatabaseStorage(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    files.push({
      relativePath: 'src/lib/rbac/storage/redisStorage.ts',
      content: this.generateNextJSRedisStorage(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    return files;
  }

  private async generateTauriFiles(config: RBACConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Frontend RBAC service
    files.push({
      relativePath: 'src/services/rbacService.ts',
      content: this.generateTauriRBACService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.TAURI, isFrontend: true }
    });

    return files;
  }

  private async generateSvelteKitFiles(config: RBACConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // RBAC service
    files.push({
      relativePath: 'src/lib/rbac/core.ts',
      content: this.generateSvelteKitRBACCore(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.SVELTEKIT }
    });

    // RBAC hooks
    files.push({
      relativePath: 'src/hooks.server.ts',
      content: this.generateSvelteKitRBACHooks(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'merge',
      conditions: { framework: SupportedFramework.SVELTEKIT, isServer: true }
    });

    return files;
  }

  // Code generation methods
  private generateNextJSRBACCore(config: RBACConfig): string {
    return `import { Permission, Role, UserRole } from '../types/rbac';

export interface RBACContext {
  userId: string;
  userRoles: string[];
  userPermissions: string[];
  sessionData?: any;
  requestContext?: any;
}

export class RBACEngine {
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();
  private permissionCache: Map<string, boolean> = new Map();
  private cacheTimeout: number;

  constructor(cacheTimeout: string = '${config.cacheTimeout}') {
    this.cacheTimeout = this.parseDuration(cacheTimeout) * 1000;
    this.initializeSystemData();
  }

  private initializeSystemData(): void {
    // Initialize system permissions
    const systemPermissions: Permission[] = ${JSON.stringify(config.systemPermissions, null, 2)};
    systemPermissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });

    // Initialize system roles
    const systemRoles: Role[] = ${JSON.stringify(config.systemRoles, null, 2)};
    systemRoles.forEach(role => {
      this.roles.set(role.id, role);
    });
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    context: RBACContext,
    permissionId: string,
    resource?: any
  ): Promise<boolean> {
    ${config.enablePermissionCaching ? `
    const cacheKey = \`\${context.userId}:\${permissionId}:\${JSON.stringify(resource)}\`;
    const cached = this.permissionCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }` : ''}

    try {
      const hasPermission = await this.checkPermission(context, permissionId, resource);
      
      ${config.enablePermissionCaching ? `
      this.permissionCache.set(cacheKey, hasPermission);
      setTimeout(() => this.permissionCache.delete(cacheKey), this.cacheTimeout);` : ''}
      
      ${config.enableAccessLogging ? `
      this.logAccess(context, permissionId, hasPermission, resource);` : ''}
      
      return hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  private async checkPermission(
    context: RBACContext,
    permissionId: string,
    resource?: any
  ): Promise<boolean> {
    // Check for wildcard permission
    if (context.userPermissions.includes('*')) {
      return true;
    }

    // Direct permission check
    if (context.userPermissions.includes(permissionId)) {
      const permission = this.permissions.get(permissionId);
      if (permission) {
        return this.evaluateConditions(permission.conditions, context, resource);
      }
      return true;
    }

    ${config.enableHierarchicalRoles ? `
    // Check inherited permissions from roles
    for (const roleId of context.userRoles) {
      if (await this.roleHasPermission(roleId, permissionId, context, resource)) {
        return true;
      }
    }` : ''}

    ${config.enableWildcardPermissions ? `
    // Check wildcard permissions
    const wildcardPermissions = context.userPermissions.filter(p => p.includes('*'));
    for (const wildcardPerm of wildcardPermissions) {
      if (this.matchesWildcard(wildcardPerm, permissionId)) {
        return true;
      }
    }` : ''}

    return false;
  }

  ${config.enableHierarchicalRoles ? `
  private async roleHasPermission(
    roleId: string,
    permissionId: string,
    context: RBACContext,
    resource?: any
  ): Promise<boolean> {
    const role = this.roles.get(roleId);
    if (!role || !role.isActive) return false;

    // Check direct role permissions
    if (role.permissions.includes('*') || role.permissions.includes(permissionId)) {
      const permission = this.permissions.get(permissionId);
      if (permission) {
        return this.evaluateConditions(permission.conditions, context, resource);
      }
      return true;
    }

    // Check parent roles
    if (config.enableRoleInheritance) {
      for (const parentRoleId of role.parentRoles) {
        if (await this.roleHasPermission(parentRoleId, permissionId, context, resource)) {
          return true;
        }
      }
    }

    return false;
  }` : ''}

  ${config.enableConditionalPermissions ? `
  private evaluateConditions(
    conditions: any[],
    context: RBACContext,
    resource?: any
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const { field, operator, value } = condition;
      let fieldValue: any;

      // Get field value from context or resource
      if (field.startsWith('context.')) {
        fieldValue = this.getNestedValue(context, field.substring(8));
      } else if (field.startsWith('resource.')) {
        fieldValue = this.getNestedValue(resource, field.substring(9));
      } else if (field === 'user_id') {
        fieldValue = context.userId;
      } else {
        fieldValue = resource?.[field];
      }

      // Replace template variables
      let expectedValue = value;
      if (typeof value === 'string' && value.includes('{{')) {
        expectedValue = value.replace(/{{current_user_id}}/g, context.userId);
      }

      return this.evaluateCondition(fieldValue, operator, expectedValue);
    });
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'eq': return fieldValue === expectedValue;
      case 'ne': return fieldValue !== expectedValue;
      case 'gt': return fieldValue > expectedValue;
      case 'gte': return fieldValue >= expectedValue;
      case 'lt': return fieldValue < expectedValue;
      case 'lte': return fieldValue <= expectedValue;
      case 'in': return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'not_in': return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
      case 'contains': return String(fieldValue).includes(String(expectedValue));
      case 'starts_with': return String(fieldValue).startsWith(String(expectedValue));
      case 'ends_with': return String(fieldValue).endsWith(String(expectedValue));
      default: return false;
    }
  }` : ''}

  ${config.enableWildcardPermissions ? `
  private matchesWildcard(wildcardPattern: string, permissionId: string): boolean {
    const regex = new RegExp(wildcardPattern.replace(/\\*/g, '.*'));
    return regex.test(permissionId);
  }` : ''}

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  ${config.enableAccessLogging ? `
  private logAccess(
    context: RBACContext,
    permissionId: string,
    granted: boolean,
    resource?: any
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      permission: permissionId,
      granted,
      resource: resource ? JSON.stringify(resource) : null,
      userAgent: context.requestContext?.headers?.['user-agent'],
      ip: context.requestContext?.ip
    };
    
    // Log to your preferred logging system
    console.log('RBAC Access Log:', logEntry);
  }` : ''}

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = this.userRoles.get(userId) || [];
    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      if (!userRole.isActive) continue;
      
      const role = this.roles.get(userRole.roleId);
      if (role && role.isActive) {
        role.permissions.forEach(permission => permissions.add(permission));
        
        ${config.enableRoleInheritance ? `
        // Add inherited permissions
        const inheritedPermissions = await this.getInheritedPermissions(role);
        inheritedPermissions.forEach(permission => permissions.add(permission));` : ''}
      }
    }

    return Array.from(permissions);
  }

  ${config.enableRoleInheritance ? `
  private async getInheritedPermissions(role: Role): Promise<string[]> {
    const permissions = new Set<string>();
    
    for (const parentRoleId of role.parentRoles) {
      const parentRole = this.roles.get(parentRoleId);
      if (parentRole && parentRole.isActive) {
        parentRole.permissions.forEach(permission => permissions.add(permission));
        
        // Recursively get permissions from parent roles
        const parentPermissions = await this.getInheritedPermissions(parentRole);
        parentPermissions.forEach(permission => permissions.add(permission));
      }
    }
    
    return Array.from(permissions);
  }` : ''}

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      ${config.roleAssignmentRequiresApproval ? `
      // In real implementation, this would queue for approval
      console.log(\`Role assignment requires approval: \${userId} -> \${roleId}\`);
      return false;` : `
      const userRolesList = this.userRoles.get(userId) || [];
      
      // Check if user already has this role
      if (userRolesList.some(ur => ur.roleId === roleId && ur.isActive)) {
        return false;
      }

      // Check max roles limit
      if (userRolesList.filter(ur => ur.isActive).length >= ${config.maxRolesPerUser}) {
        throw new Error('Maximum number of roles per user exceeded');
      }

      const userRole: UserRole = {
        userId,
        roleId,
        assignedBy,
        assignedAt: new Date(),
        expiresAt,
        conditions: [],
        isActive: true
      };

      userRolesList.push(userRole);
      this.userRoles.set(userId, userRolesList);

      // Clear permission cache for this user
      this.clearUserCache(userId);

      return true;`}
    } catch (error) {
      console.error('Role assignment failed:', error);
      return false;
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const userRolesList = this.userRoles.get(userId) || [];
      const updatedRoles = userRolesList.map(ur => 
        ur.roleId === roleId ? { ...ur, isActive: false } : ur
      );
      
      this.userRoles.set(userId, updatedRoles);
      this.clearUserCache(userId);
      
      return true;
    } catch (error) {
      console.error('Role removal failed:', error);
      return false;
    }
  }

  private clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.permissionCache.keys())
      .filter(key => key.startsWith(\`\${userId}:\`));
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\\d+)([hmsdwy])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
      y: 31556952
    };

    return value * (multipliers[unit] || 60);
  }
}

// Export singleton instance
export const rbacEngine = new RBACEngine();`;
  }

  private generateNextJSRBACMiddleware(config: RBACConfig): string {
    return `import { NextApiRequest, NextApiResponse } from 'next';
import { rbacEngine, RBACContext } from '../lib/rbac/core';

interface ExtendedNextApiRequest extends NextApiRequest {
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  rbacContext?: RBACContext;
}

export function withRBAC(
  requiredPermission: string,
  options: {
    resource?: (req: ExtendedNextApiRequest) => any;
    requireAllPermissions?: boolean;
  } = {}
) {
  return function (handler: (req: ExtendedNextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
      try {
        // Ensure user is authenticated
        if (!req.user?.id) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Build RBAC context
        const rbacContext: RBACContext = {
          userId: req.user.id,
          userRoles: req.user.roles || [],
          userPermissions: req.user.permissions || [],
          sessionData: req.session,
          requestContext: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            ip: req.connection.remoteAddress
          }
        };

        req.rbacContext = rbacContext;

        // Get resource for permission check
        const resource = options.resource ? options.resource(req) : null;

        // Check permission
        const hasPermission = await rbacEngine.hasPermission(
          rbacContext,
          requiredPermission,
          resource
        );

        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: requiredPermission
          });
        }

        // Continue to handler
        return handler(req, res);
      } catch (error) {
        console.error('RBAC middleware error:', error);
        return res.status(500).json({ error: 'Authorization check failed' });
      }
    };
  };
}

export function requirePermissions(permissions: string[]) {
  return function (handler: (req: ExtendedNextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
      if (!req.rbacContext) {
        return res.status(500).json({ error: 'RBAC context not initialized' });
      }

      const permissionChecks = await Promise.all(
        permissions.map(permission => 
          rbacEngine.hasPermission(req.rbacContext!, permission)
        )
      );

      const hasAllPermissions = permissionChecks.every(check => check);
      
      if (!hasAllPermissions) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions
        });
      }

      return handler(req, res);
    };
  };
}

export function requireRole(role: string) {
  return function (handler: (req: ExtendedNextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
      if (!req.user?.roles.includes(role)) {
        return res.status(403).json({ 
          error: 'Insufficient role',
          required: role
        });
      }

      return handler(req, res);
    };
  };
}

export async function checkPermission(
  req: ExtendedNextApiRequest,
  permission: string,
  resource?: any
): Promise<boolean> {
  if (!req.rbacContext) return false;
  
  return rbacEngine.hasPermission(req.rbacContext, permission, resource);
}`;
  }

  // Helper methods and placeholder implementations
  private generateFlutterRBACService(config: RBACConfig): string {
    return `// Flutter RBAC service implementation
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class RBACService {
  static const _storage = FlutterSecureStorage();
  static const String _rolesKey = 'user_roles';
  static const String _permissionsKey = 'user_permissions';
  
  Future<bool> hasPermission(String permission, [Map<String, dynamic>? resource]) async {
    final permissions = await getUserPermissions();
    
    // Check for wildcard permission
    if (permissions.contains('*')) return true;
    
    // Direct permission check
    if (permissions.contains(permission)) return true;
    
    ${config.enableWildcardPermissions ? `
    // Check wildcard permissions
    for (final perm in permissions) {
      if (perm.contains('*') && _matchesWildcard(perm, permission)) {
        return true;
      }
    }` : ''}
    
    return false;
  }
  
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
  
  ${config.enableWildcardPermissions ? `
  bool _matchesWildcard(String wildcardPattern, String permission) {
    final regex = RegExp(wildcardPattern.replaceAll('*', '.*'));
    return regex.hasMatch(permission);
  }` : ''}
}`;
  }

  private generateFlutterRBACModels(config: RBACConfig): string {
    return '// Flutter RBAC models implementation';
  }

  private generateFlutterPermissionWidget(config: RBACConfig): string {
    return '// Flutter permission widget implementation';
  }

  private generateReactNativeRBACService(config: RBACConfig): string {
    return '// React Native RBAC service implementation';
  }

  private generateReactNativeRBACContext(config: RBACConfig): string {
    return '// React Native RBAC context implementation';
  }

  private generateReactNativePermissionGate(config: RBACConfig): string {
    return '// React Native permission gate component implementation';
  }

  private generateNextJSPermissionManager(config: RBACConfig): string {
    return '// Next.js permission manager implementation';
  }

  private generateNextJSRoleManager(config: RBACConfig): string {
    return '// Next.js role manager implementation';
  }

  private generateNextJSPermissionsAPI(config: RBACConfig): string {
    return '// Next.js permissions API implementation';
  }

  private generateNextJSRolesAPI(config: RBACConfig): string {
    return '// Next.js roles API implementation';
  }

  private generateNextJSDatabaseStorage(config: RBACConfig): string {
    return '// Next.js database storage implementation';
  }

  private generateNextJSRedisStorage(config: RBACConfig): string {
    return '// Next.js Redis storage implementation';
  }

  private generateTauriRBACService(config: RBACConfig): string {
    return '// Tauri RBAC service implementation';
  }

  private generateSvelteKitRBACCore(config: RBACConfig): string {
    return '// SvelteKit RBAC core implementation';
  }

  private generateSvelteKitRBACHooks(config: RBACConfig): string {
    return '// SvelteKit RBAC hooks implementation';
  }
}