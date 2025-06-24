/**
 * @fileoverview RBAC Manager
 * Advanced Role-Based Access Control system with dynamic permissions
 */

import { EventEmitter } from 'events';
import {
  Role,
  Permission,
  RoleAssignment,
  User,
  AccessCondition,
  RoleType,
  RoleScope,
  PermissionScope,
  Resource,
  Action,
  ConditionType,
  ConditionOperator,
  SystemRole,
  TeamRole,
  ProjectRole
} from './types';

export class RBACManager extends EventEmitter {
  private initialized = false;
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private roleAssignments: Map<string, RoleAssignment> = new Map();
  private roleHierarchy: Map<string, string[]> = new Map();
  private permissionCache: Map<string, CachedPermission> = new Map();
  
  // Permission evaluation
  private conditionEvaluators: Map<ConditionType, ConditionEvaluator> = new Map();
  private accessPolicies: Map<string, AccessPolicy> = new Map();

  constructor() {
    super();
    this.setupDefaultRoles();
    this.setupConditionEvaluators();
    this.setupRoleHierarchy();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load roles and permissions from storage
    await this.loadRolesAndPermissions();
    
    // Set up permission cache cleanup
    this.startCacheCleanup();

    this.initialized = true;
    this.emit('rbac:initialized');
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  async createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const role: Role = {
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...roleData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Validate role permissions
    await this.validateRolePermissions(role.permissions);

    this.roles.set(role.id, role);
    this.clearPermissionCache();

    this.emit('role:created', { role });
    return role;
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    if (role.isSystem && updates.permissions) {
      throw new Error('Cannot modify permissions of system roles');
    }

    const updatedRole = {
      ...role,
      ...updates,
      updatedAt: Date.now()
    };

    if (updates.permissions) {
      await this.validateRolePermissions(updates.permissions);
    }

    this.roles.set(roleId, updatedRole);
    this.clearPermissionCache();

    this.emit('role:updated', { role: updatedRole, changes: updates });
    return updatedRole;
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) return;

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Check if role is in use
    const assignments = this.getRoleAssignments(roleId);
    if (assignments.length > 0) {
      throw new Error(`Cannot delete role ${roleId}: still assigned to ${assignments.length} users`);
    }

    this.roles.delete(roleId);
    this.clearPermissionCache();

    this.emit('role:deleted', { roleId, role });
  }

  async getRoleById(roleId: string): Promise<Role | undefined> {
    return this.roles.get(roleId);
  }

  async getRolesByType(type: RoleType): Promise<Role[]> {
    return Array.from(this.roles.values()).filter(role => role.type === type);
  }

  async getRolesByScope(scope: RoleScope): Promise<Role[]> {
    return Array.from(this.roles.values()).filter(role => role.scope === scope);
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  async createPermission(permissionData: Omit<Permission, 'id'>): Promise<Permission> {
    const permission: Permission = {
      id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...permissionData
    };

    await this.validatePermission(permission);
    this.permissions.set(permission.id, permission);
    this.clearPermissionCache();

    this.emit('permission:created', { permission });
    return permission;
  }

  async updatePermission(permissionId: string, updates: Partial<Permission>): Promise<Permission> {
    const permission = this.permissions.get(permissionId);
    if (!permission) {
      throw new Error(`Permission not found: ${permissionId}`);
    }

    const updatedPermission = { ...permission, ...updates };
    await this.validatePermission(updatedPermission);

    this.permissions.set(permissionId, updatedPermission);
    this.clearPermissionCache();

    this.emit('permission:updated', { permission: updatedPermission, changes: updates });
    return updatedPermission;
  }

  async deletePermission(permissionId: string): Promise<void> {
    const permission = this.permissions.get(permissionId);
    if (!permission) return;

    // Check if permission is in use by any roles
    const rolesUsingPermission = Array.from(this.roles.values()).filter(role =>
      role.permissions.some(p => p.id === permissionId)
    );

    if (rolesUsingPermission.length > 0) {
      throw new Error(`Cannot delete permission ${permissionId}: used by ${rolesUsingPermission.length} roles`);
    }

    this.permissions.delete(permissionId);
    this.clearPermissionCache();

    this.emit('permission:deleted', { permissionId, permission });
  }

  // ============================================================================
  // Role Assignment Management
  // ============================================================================

  async assignRole(assignmentData: Omit<RoleAssignment, 'id'>): Promise<RoleAssignment> {
    const assignment: RoleAssignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...assignmentData
    };

    // Validate role exists
    const role = this.roles.get(assignment.roleId);
    if (!role) {
      throw new Error(`Role not found: ${assignment.roleId}`);
    }

    // Check for duplicate assignments
    const existingAssignment = this.findExistingAssignment(
      assignment.userId,
      assignment.roleId,
      assignment.scope,
      assignment.resourceId
    );

    if (existingAssignment) {
      throw new Error('User already has this role assignment');
    }

    this.roleAssignments.set(assignment.id, assignment);
    this.clearUserPermissionCache(assignment.userId);

    this.emit('role:assigned', { assignment });
    return assignment;
  }

  async removeRoleAssignment(assignmentId: string): Promise<void> {
    const assignment = this.roleAssignments.get(assignmentId);
    if (!assignment) return;

    assignment.isActive = false;
    this.roleAssignments.set(assignmentId, assignment);
    this.clearUserPermissionCache(assignment.userId);

    this.emit('role:unassigned', { assignment });
  }

  async removeUserRoleAssignments(
    userId: string,
    scope?: RoleScope,
    resourceId?: string
  ): Promise<void> {
    const assignments = this.getUserRoleAssignments(userId, scope, resourceId);
    
    for (const assignment of assignments) {
      assignment.isActive = false;
      this.roleAssignments.set(assignment.id, assignment);
    }

    this.clearUserPermissionCache(userId);
    this.emit('roles:bulk:unassigned', { userId, count: assignments.length });
  }

  async getUserRoleAssignments(
    userId: string,
    scope?: RoleScope,
    resourceId?: string
  ): Promise<RoleAssignment[]> {
    return Array.from(this.roleAssignments.values()).filter(assignment =>
      assignment.userId === userId &&
      assignment.isActive &&
      (!scope || assignment.scope === scope) &&
      (!resourceId || assignment.resourceId === resourceId) &&
      (!assignment.expiresAt || assignment.expiresAt > Date.now())
    );
  }

  async getRoleAssignments(roleId: string): Promise<RoleAssignment[]> {
    return Array.from(this.roleAssignments.values()).filter(assignment =>
      assignment.roleId === roleId && assignment.isActive
    );
  }

  // ============================================================================
  // Permission Checking and Evaluation
  // ============================================================================

  async hasPermission(
    userId: string,
    resource: Resource,
    action: Action,
    resourceId?: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const cacheKey = this.getPermissionCacheKey(userId, resource, action, resourceId);
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.hasPermission;
    }

    const hasPermission = await this.evaluatePermission(userId, resource, action, resourceId, context);
    
    // Cache the result
    this.permissionCache.set(cacheKey, {
      hasPermission,
      expiresAt: Date.now() + 300000, // 5 minutes
      userId,
      resource,
      action,
      resourceId
    });

    return hasPermission;
  }

  async checkPermission(
    userId: string,
    resource: Resource,
    action: Action,
    resourceId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    const hasPermission = await this.hasPermission(userId, resource, action, resourceId, context);
    
    if (!hasPermission) {
      const error = new PermissionDeniedError(
        `Access denied: ${action} on ${resource}${resourceId ? ` (${resourceId})` : ''}`,
        userId,
        resource,
        action,
        resourceId
      );
      
      this.emit('permission:denied', {
        userId,
        resource,
        action,
        resourceId,
        context,
        error
      });
      
      throw error;
    }

    this.emit('permission:granted', {
      userId,
      resource,
      action,
      resourceId,
      context
    });
  }

  async getUserPermissions(
    userId: string,
    scope?: RoleScope,
    resourceId?: string
  ): Promise<EffectivePermissions> {
    const assignments = await this.getUserRoleAssignments(userId, scope, resourceId);
    const roles = await Promise.all(assignments.map(a => this.getRoleById(a.roleId)));
    const validRoles = roles.filter(Boolean) as Role[];

    // Collect all permissions from assigned roles
    const allPermissions: Permission[] = [];
    const roleHierarchyPermissions: Permission[] = [];

    for (const role of validRoles) {
      allPermissions.push(...role.permissions);
      
      // Add permissions from role hierarchy
      const inheritedRoles = this.getInheritedRoles(role.id);
      for (const inheritedRoleId of inheritedRoles) {
        const inheritedRole = await this.getRoleById(inheritedRoleId);
        if (inheritedRole) {
          roleHierarchyPermissions.push(...inheritedRole.permissions);
        }
      }
    }

    // Merge and deduplicate permissions
    const uniquePermissions = this.mergePermissions([...allPermissions, ...roleHierarchyPermissions]);

    return {
      userId,
      scope,
      resourceId,
      roles: validRoles,
      permissions: uniquePermissions,
      assignments,
      effectiveAt: Date.now()
    };
  }

  async getResourcePermissions(
    resourceType: Resource,
    resourceId: string
  ): Promise<ResourcePermissions> {
    const assignments = Array.from(this.roleAssignments.values()).filter(assignment =>
      assignment.isActive &&
      assignment.resourceId === resourceId &&
      (!assignment.expiresAt || assignment.expiresAt > Date.now())
    );

    const userPermissions: UserResourcePermission[] = [];

    for (const assignment of assignments) {
      const role = await this.getRoleById(assignment.roleId);
      if (!role) continue;

      const relevantPermissions = role.permissions.filter(p => p.resource === resourceType);
      
      userPermissions.push({
        userId: assignment.userId,
        roleId: assignment.roleId,
        roleName: role.name,
        permissions: relevantPermissions,
        assignedAt: assignment.assignedAt
      });
    }

    return {
      resourceType,
      resourceId,
      userPermissions,
      totalUsers: new Set(userPermissions.map(up => up.userId)).size,
      lastUpdated: Date.now()
    };
  }

  // ============================================================================
  // Advanced Permission Features
  // ============================================================================

  async createAccessPolicy(policyData: Omit<AccessPolicy, 'id' | 'createdAt'>): Promise<AccessPolicy> {
    const policy: AccessPolicy = {
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...policyData,
      createdAt: Date.now()
    };

    this.accessPolicies.set(policy.id, policy);
    this.clearPermissionCache();

    this.emit('policy:created', { policy });
    return policy;
  }

  async evaluateAccessPolicy(
    policyId: string,
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    const policy = this.accessPolicies.get(policyId);
    if (!policy) {
      throw new Error(`Access policy not found: ${policyId}`);
    }

    const result: PolicyEvaluationResult = {
      policyId,
      allowed: false,
      conditions: [],
      evaluatedAt: Date.now(),
      context
    };

    // Evaluate policy conditions
    for (const condition of policy.conditions) {
      const evaluator = this.conditionEvaluators.get(condition.type);
      if (!evaluator) {
        continue;
      }

      const conditionResult = await evaluator.evaluate(condition, context);
      result.conditions.push(conditionResult);
    }

    // Apply policy logic (all conditions must pass for allow policies)
    if (policy.effect === 'allow') {
      result.allowed = result.conditions.every(c => c.passed);
    } else {
      result.allowed = !result.conditions.some(c => c.passed);
    }

    this.emit('policy:evaluated', { result });
    return result;
  }

  async createConditionalPermission(
    permissionData: Omit<Permission, 'id'>,
    conditions: AccessCondition[]
  ): Promise<Permission> {
    const permission = await this.createPermission({
      ...permissionData,
      conditions
    });

    this.emit('conditional:permission:created', { permission });
    return permission;
  }

  async createTemporaryRole(
    roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>,
    expiresIn: number // milliseconds
  ): Promise<Role> {
    const role = await this.createRole(roleData);
    
    // Set up automatic cleanup
    setTimeout(async () => {
      try {
        await this.deleteRole(role.id);
        this.emit('temporary:role:expired', { roleId: role.id });
      } catch (error) {
        this.emit('temporary:role:cleanup:failed', { roleId: role.id, error });
      }
    }, expiresIn);

    this.emit('temporary:role:created', { role, expiresIn });
    return role;
  }

  // ============================================================================
  // Utility and Helper Methods
  // ============================================================================

  private async evaluatePermission(
    userId: string,
    resource: Resource,
    action: Action,
    resourceId?: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId, undefined, resourceId);
    
    for (const assignment of assignments) {
      const role = await this.getRoleById(assignment.roleId);
      if (!role) continue;

      // Check role hierarchy
      const rolesToCheck = [role.id, ...this.getInheritedRoles(role.id)];
      
      for (const roleId of rolesToCheck) {
        const roleToCheck = await this.getRoleById(roleId);
        if (!roleToCheck) continue;

        for (const permission of roleToCheck.permissions) {
          if (permission.resource === resource && permission.actions.includes(action)) {
            // Check permission conditions
            if (await this.evaluatePermissionConditions(permission, userId, resourceId, context)) {
              return true;
            }
          }
        }
      }
    }

    // Check access policies
    for (const policy of this.accessPolicies.values()) {
      if (policy.resource === resource && policy.actions.includes(action)) {
        const policyResult = await this.evaluateAccessPolicy(policy.id, {
          userId,
          resource,
          action,
          resourceId,
          ...context
        });
        
        if (policyResult.allowed) {
          return true;
        }
      }
    }

    return false;
  }

  private async evaluatePermissionConditions(
    permission: Permission,
    userId: string,
    resourceId?: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    if (!permission.conditions || permission.conditions.length === 0) {
      return true;
    }

    const evaluationContext = {
      userId,
      resourceId,
      timestamp: Date.now(),
      ...context
    };

    for (const condition of permission.conditions) {
      const evaluator = this.conditionEvaluators.get(condition.type);
      if (!evaluator) {
        continue;
      }

      const result = await evaluator.evaluate(condition, evaluationContext);
      if (!result.passed) {
        return false;
      }
    }

    return true;
  }

  private getInheritedRoles(roleId: string): string[] {
    return this.roleHierarchy.get(roleId) || [];
  }

  private mergePermissions(permissions: Permission[]): Permission[] {
    const merged = new Map<string, Permission>();
    
    for (const permission of permissions) {
      const existing = merged.get(permission.id);
      if (!existing) {
        merged.set(permission.id, permission);
      } else {
        // Merge actions
        const mergedActions = [...new Set([...existing.actions, ...permission.actions])];
        merged.set(permission.id, { ...existing, actions: mergedActions });
      }
    }

    return Array.from(merged.values());
  }

  private findExistingAssignment(
    userId: string,
    roleId: string,
    scope: RoleScope,
    resourceId?: string
  ): RoleAssignment | undefined {
    return Array.from(this.roleAssignments.values()).find(assignment =>
      assignment.userId === userId &&
      assignment.roleId === roleId &&
      assignment.scope === scope &&
      assignment.resourceId === resourceId &&
      assignment.isActive
    );
  }

  private getPermissionCacheKey(
    userId: string,
    resource: Resource,
    action: Action,
    resourceId?: string
  ): string {
    return `${userId}:${resource}:${action}:${resourceId || 'global'}`;
  }

  private clearPermissionCache(): void {
    this.permissionCache.clear();
  }

  private clearUserPermissionCache(userId: string): void {
    for (const [key, cached] of this.permissionCache.entries()) {
      if (cached.userId === userId) {
        this.permissionCache.delete(key);
      }
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.permissionCache.entries()) {
        if (cached.expiresAt <= now) {
          this.permissionCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  private async validateRolePermissions(permissions: Permission[]): Promise<void> {
    for (const permission of permissions) {
      await this.validatePermission(permission);
    }
  }

  private async validatePermission(permission: Permission): Promise<void> {
    // Validate resource and actions exist
    const validResources: Resource[] = [
      'user', 'team', 'organization', 'project', 'template', 'session',
      'cost', 'analytics', 'settings', 'billing', 'audit', 'integration',
      'ai_model', 'workspace'
    ];

    const validActions: Action[] = [
      'create', 'read', 'update', 'delete', 'invite', 'remove', 'assign',
      'unassign', 'approve', 'reject', 'share', 'export', 'import',
      'execute', 'review', 'comment', 'moderate'
    ];

    if (!validResources.includes(permission.resource)) {
      throw new Error(`Invalid resource: ${permission.resource}`);
    }

    for (const action of permission.actions) {
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action: ${action}`);
      }
    }

    // Validate conditions
    if (permission.conditions) {
      for (const condition of permission.conditions) {
        if (!this.conditionEvaluators.has(condition.type)) {
          throw new Error(`Unsupported condition type: ${condition.type}`);
        }
      }
    }
  }

  private setupDefaultRoles(): void {
    const defaultRoles: Role[] = [
      // System roles
      {
        id: 'super-admin',
        name: 'Super Administrator',
        description: 'Full system access',
        type: 'system',
        scope: 'global',
        permissions: [
          {
            id: 'super-admin-all',
            name: 'All Permissions',
            resource: 'organization',
            actions: ['create', 'read', 'update', 'delete', 'invite', 'remove', 'assign'],
            scope: 'global'
          }
        ],
        isSystem: true,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      
      // Team roles
      {
        id: 'team-owner',
        name: 'Team Owner',
        description: 'Full team control',
        type: 'team',
        scope: 'team',
        permissions: [
          {
            id: 'team-manage-all',
            name: 'Team Management',
            resource: 'team',
            actions: ['read', 'update', 'delete', 'invite', 'remove', 'assign'],
            scope: 'resource'
          }
        ],
        isSystem: true,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // Project roles
      {
        id: 'project-owner',
        name: 'Project Owner',
        description: 'Full project control',
        type: 'project',
        scope: 'project',
        permissions: [
          {
            id: 'project-manage-all',
            name: 'Project Management',
            resource: 'project',
            actions: ['read', 'update', 'delete', 'invite', 'remove', 'assign'],
            scope: 'resource'
          }
        ],
        isSystem: true,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    defaultRoles.forEach(role => this.roles.set(role.id, role));
  }

  private setupConditionEvaluators(): void {
    this.conditionEvaluators.set('time_based', new TimeBasedEvaluator());
    this.conditionEvaluators.set('location_based', new LocationBasedEvaluator());
    this.conditionEvaluators.set('resource_based', new ResourceBasedEvaluator());
    this.conditionEvaluators.set('attribute_based', new AttributeBasedEvaluator());
    this.conditionEvaluators.set('dynamic', new DynamicEvaluator());
  }

  private setupRoleHierarchy(): void {
    // Define role inheritance hierarchy
    this.roleHierarchy.set('super-admin', ['org-admin', 'team-owner', 'project-owner']);
    this.roleHierarchy.set('org-admin', ['team-admin', 'project-maintainer']);
    this.roleHierarchy.set('team-admin', ['team-developer']);
    this.roleHierarchy.set('project-maintainer', ['project-contributor']);
  }

  private async loadRolesAndPermissions(): Promise<void> {
    // In a real implementation, this would load from a database
    // For now, we already have default roles set up
  }

  async shutdown(): Promise<void> {
    this.clearPermissionCache();
    this.initialized = false;
    this.emit('rbac:shutdown');
  }
}

// ============================================================================
// Supporting Classes and Interfaces
// ============================================================================

export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public userId: string,
    public resource: Resource,
    public action: Action,
    public resourceId?: string
  ) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

interface CachedPermission {
  hasPermission: boolean;
  expiresAt: number;
  userId: string;
  resource: Resource;
  action: Action;
  resourceId?: string;
}

interface EffectivePermissions {
  userId: string;
  scope?: RoleScope;
  resourceId?: string;
  roles: Role[];
  permissions: Permission[];
  assignments: RoleAssignment[];
  effectiveAt: number;
}

interface ResourcePermissions {
  resourceType: Resource;
  resourceId: string;
  userPermissions: UserResourcePermission[];
  totalUsers: number;
  lastUpdated: number;
}

interface UserResourcePermission {
  userId: string;
  roleId: string;
  roleName: string;
  permissions: Permission[];
  assignedAt: number;
}

interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  resource: Resource;
  actions: Action[];
  effect: 'allow' | 'deny';
  conditions: AccessCondition[];
  priority: number;
  enabled: boolean;
  createdAt: number;
}

interface PolicyContext {
  userId: string;
  resource: Resource;
  action: Action;
  resourceId?: string;
  timestamp?: number;
  [key: string]: any;
}

interface PolicyEvaluationResult {
  policyId: string;
  allowed: boolean;
  conditions: ConditionEvaluationResult[];
  evaluatedAt: number;
  context: PolicyContext;
}

interface ConditionEvaluationResult {
  conditionId?: string;
  type: ConditionType;
  passed: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

abstract class ConditionEvaluator {
  abstract evaluate(condition: AccessCondition, context: any): Promise<ConditionEvaluationResult>;
}

class TimeBasedEvaluator extends ConditionEvaluator {
  async evaluate(condition: AccessCondition, context: any): Promise<ConditionEvaluationResult> {
    const now = new Date();
    let passed = false;
    let reason = '';

    switch (condition.field) {
      case 'time_of_day':
        const currentHour = now.getHours();
        const [startHour, endHour] = condition.value;
        passed = currentHour >= startHour && currentHour <= endHour;
        reason = `Current hour ${currentHour} ${passed ? 'is' : 'is not'} within allowed range ${startHour}-${endHour}`;
        break;
      
      case 'day_of_week':
        const currentDay = now.getDay();
        passed = condition.value.includes(currentDay);
        reason = `Current day ${currentDay} ${passed ? 'is' : 'is not'} in allowed days`;
        break;
      
      case 'date_range':
        const currentTimestamp = now.getTime();
        const [startDate, endDate] = condition.value;
        passed = currentTimestamp >= startDate && currentTimestamp <= endDate;
        reason = `Current date ${passed ? 'is' : 'is not'} within allowed range`;
        break;
      
      default:
        passed = true;
        reason = 'Unknown time-based condition';
    }

    return {
      type: 'time_based',
      passed,
      reason,
      metadata: { evaluatedAt: now.toISOString() }
    };
  }
}

class LocationBasedEvaluator extends ConditionEvaluator {
  async evaluate(condition: AccessCondition, context: any): Promise<ConditionEvaluationResult> {
    // Placeholder implementation
    return {
      type: 'location_based',
      passed: true,
      reason: 'Location-based evaluation not implemented'
    };
  }
}

class ResourceBasedEvaluator extends ConditionEvaluator {
  async evaluate(condition: AccessCondition, context: any): Promise<ConditionEvaluationResult> {
    let passed = false;
    let reason = '';

    switch (condition.field) {
      case 'resource_owner':
        passed = context.resourceOwnerId === context.userId;
        reason = `User ${passed ? 'is' : 'is not'} the resource owner`;
        break;
      
      case 'resource_type':
        passed = condition.value === context.resourceType;
        reason = `Resource type ${passed ? 'matches' : 'does not match'} required type`;
        break;
      
      default:
        passed = true;
        reason = 'Unknown resource-based condition';
    }

    return {
      type: 'resource_based',
      passed,
      reason
    };
  }
}

class AttributeBasedEvaluator extends ConditionEvaluator {
  async evaluate(condition: AccessCondition, context: any): Promise<ConditionEvaluationResult> {
    const fieldValue = context[condition.field];
    let passed = false;
    let reason = '';

    switch (condition.operator) {
      case 'equals':
        passed = fieldValue === condition.value;
        break;
      case 'not_equals':
        passed = fieldValue !== condition.value;
        break;
      case 'contains':
        passed = Array.isArray(fieldValue) && fieldValue.includes(condition.value);
        break;
      case 'in':
        passed = Array.isArray(condition.value) && condition.value.includes(fieldValue);
        break;
      default:
        passed = true;
    }

    reason = `Field '${condition.field}' with value '${fieldValue}' ${passed ? 'satisfies' : 'does not satisfy'} condition`;

    return {
      type: 'attribute_based',
      passed,
      reason,
      metadata: { field: condition.field, value: fieldValue, operator: condition.operator }
    };
  }
}

class DynamicEvaluator extends ConditionEvaluator {
  async evaluate(condition: AccessCondition, context: any): Promise<ConditionEvaluationResult> {
    // Placeholder for dynamic evaluation (could involve external APIs, complex business logic, etc.)
    return {
      type: 'dynamic',
      passed: true,
      reason: 'Dynamic evaluation not implemented'
    };
  }
}