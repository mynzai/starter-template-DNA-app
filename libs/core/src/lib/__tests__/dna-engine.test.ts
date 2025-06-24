/**
 * @fileoverview DNA Engine Integration Tests - Epic 5 Story 1
 * Comprehensive tests for all acceptance criteria:
 * AC1: Module registry with metadata, versioning, and compatibility rules
 * AC2: Dependency resolution engine preventing conflicts and circular dependencies
 * AC3: Module composition API with validation and safety checks
 * AC4: Hot-reload capability for module development and testing
 * AC5: Module lifecycle management (install, update, remove, rollback)
 */

import { DNAEngine, createDNAEngine } from '../dna-engine';
import { DependencyResolver, ResolutionStrategy } from '../dependency-resolver';
import { HotReloadSystem, createHotReloadSystem } from '../hot-reload-system';
import { ModuleLifecycleManager, createModuleLifecycleManager } from '../module-lifecycle-manager';
import { BaseDNAModule } from '../dna-module';
import {
  DNAModule,
  DNAModuleMetadata,
  DNARegistryConfig,
  DNAComposition,
  SupportedFramework,
  TemplateType,
  CompatibilityLevel,
  DNAModuleCategory
} from '../types';

// Mock DNA Module for testing
class TestDNAModule extends BaseDNAModule {
  public readonly id: string;
  public readonly metadata: DNAModuleMetadata;
  public readonly dependencies = [];
  public readonly conflicts = [];
  public readonly frameworks = [];
  public readonly config = {
    schema: {},
    defaults: {},
    required: [],
    validation: { rules: {} }
  };

  constructor(id: string, version: string = '1.0.0', category: DNAModuleCategory = DNAModuleCategory.TESTING) {
    super();
    this.id = id;
    this.metadata = {
      id,
      name: `Test Module ${id}`,
      version,
      category,
      description: `Test module for ${id}`,
      keywords: ['test'],
      deprecated: false,
      experimental: false
    };
  }

  async generateFiles() {
    return [];
  }
}

describe('DNA Engine Foundation - Epic 5 Story 1', () => {
  let engine: DNAEngine;
  let dependencyResolver: DependencyResolver;
  let hotReloadSystem: HotReloadSystem;
  let lifecycleManager: ModuleLifecycleManager;
  
  const testConfig: DNARegistryConfig = {
    sources: [
      { type: 'local', path: './test-modules' }
    ],
    validation: {
      allowExperimental: true,
      allowDeprecated: false
    }
  };

  beforeEach(async () => {
    engine = createDNAEngine(testConfig);
    dependencyResolver = new DependencyResolver(new Map());
    hotReloadSystem = createHotReloadSystem({ enabled: false }); // Disable for tests
    lifecycleManager = createModuleLifecycleManager();
  });

  afterEach(async () => {
    await engine.cleanup();
    await hotReloadSystem.stop();
  });

  describe('AC1: Module Registry with Metadata, Versioning, and Compatibility Rules', () => {
    test('should initialize engine and registry', async () => {
      await engine.initialize();
      
      const metrics = engine.getPerformanceMetrics();
      expect(metrics.has('initialization_time')).toBe(true);
      expect(metrics.get('initialization_time')).toBeGreaterThan(0);
    });

    test('should register modules with versioning support', async () => {
      await engine.initialize();
      
      const module1 = new TestDNAModule('test-auth', '1.0.0', DNAModuleCategory.AUTHENTICATION);
      const module2 = new TestDNAModule('test-auth', '1.1.0', DNAModuleCategory.AUTHENTICATION);
      
      await engine.registerModule(module1);
      await engine.registerModule(module2);
      
      const moduleInfo = engine.getModuleInfo('test-auth');
      expect(moduleInfo).toBeDefined();
      expect(moduleInfo!.module.metadata.version).toBe('1.1.0'); // Latest version
      expect(moduleInfo!.versions.size).toBe(2);
      expect(moduleInfo!.versions.has('1.0.0')).toBe(true);
      expect(moduleInfo!.versions.has('1.1.0')).toBe(true);
    });

    test('should track compatibility matrix between modules', async () => {
      await engine.initialize();
      
      const authModule = new TestDNAModule('auth', '1.0.0', DNAModuleCategory.AUTHENTICATION);
      const paymentModule = new TestDNAModule('payment', '1.0.0', DNAModuleCategory.PAYMENT);
      
      await engine.registerModule(authModule);
      await engine.registerModule(paymentModule);
      
      const authInfo = engine.getModuleInfo('auth');
      expect(authInfo).toBeDefined();
      expect(authInfo!.compatibility.has('payment')).toBe(true);
    });

    test('should filter modules by criteria', async () => {
      await engine.initialize();
      
      const authModule = new TestDNAModule('auth', '1.0.0', DNAModuleCategory.AUTHENTICATION);
      const paymentModule = new TestDNAModule('payment', '1.0.0', DNAModuleCategory.PAYMENT);
      const experimentalModule = new TestDNAModule('experimental', '0.1.0', DNAModuleCategory.TESTING);
      experimentalModule.metadata.experimental = true;
      
      await engine.registerModule(authModule);
      await engine.registerModule(paymentModule);
      await engine.registerModule(experimentalModule);
      
      const authModules = engine.getModules({ category: DNAModuleCategory.AUTHENTICATION });
      expect(authModules).toHaveLength(1);
      expect(authModules[0].module.metadata.id).toBe('auth');
      
      const stableModules = engine.getModules({ experimental: false });
      expect(stableModules).toHaveLength(2);
      
      const experimentalModules = engine.getModules({ experimental: true });
      expect(experimentalModules).toHaveLength(1);
      expect(experimentalModules[0].module.metadata.id).toBe('experimental');
    });
  });

  describe('AC2: Dependency Resolution Engine', () => {
    test('should resolve dependencies without conflicts', async () => {
      const moduleRegistry = new Map<string, DNAModule[]>();
      
      const baseModule = new TestDNAModule('base', '1.0.0');
      const authModule = new TestDNAModule('auth', '1.0.0');
      authModule.dependencies.push({
        moduleId: 'base',
        version: '^1.0.0',
        optional: false,
        reason: 'Base functionality required'
      });
      
      moduleRegistry.set('base', [baseModule]);
      moduleRegistry.set('auth', [authModule]);
      
      const resolver = new DependencyResolver(moduleRegistry);
      
      const result = await resolver.resolveDependencies(
        ['auth'],
        {
          targetFramework: SupportedFramework.TYPESCRIPT,
          strategy: ResolutionStrategy.STABLE,
          allowExperimental: false,
          allowDeprecated: false,
          allowConflicts: false,
          maxDepth: 10,
          excludeModules: new Set(),
          preferredVersions: new Map(),
          compatibilityMatrix: new Map()
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.resolved.size).toBe(2);
      expect(result.resolved.has('base')).toBe(true);
      expect(result.resolved.has('auth')).toBe(true);
      expect(result.installOrder).toEqual(['base', 'auth']); // Base first, then auth
      expect(result.conflicts).toHaveLength(0);
    });

    test('should detect circular dependencies', async () => {
      const moduleRegistry = new Map<string, DNAModule[]>();
      
      const moduleA = new TestDNAModule('module-a', '1.0.0');
      const moduleB = new TestDNAModule('module-b', '1.0.0');
      
      // Create circular dependency
      moduleA.dependencies.push({
        moduleId: 'module-b',
        version: '^1.0.0',
        optional: false,
        reason: 'Needs module B'
      });
      
      moduleB.dependencies.push({
        moduleId: 'module-a',
        version: '^1.0.0',
        optional: false,
        reason: 'Needs module A'
      });
      
      moduleRegistry.set('module-a', [moduleA]);
      moduleRegistry.set('module-b', [moduleB]);
      
      const resolver = new DependencyResolver(moduleRegistry);
      
      const result = await resolver.resolveDependencies(
        ['module-a'],
        {
          targetFramework: SupportedFramework.TYPESCRIPT,
          strategy: ResolutionStrategy.STABLE,
          allowExperimental: false,
          allowDeprecated: false,
          allowConflicts: false,
          maxDepth: 10,
          excludeModules: new Set(),
          preferredVersions: new Map(),
          compatibilityMatrix: new Map()
        }
      );
      
      expect(result.success).toBe(false);
      expect(result.conflicts.some(c => c.type === 'circular')).toBe(true);
    });

    test('should handle version conflicts', async () => {
      const moduleRegistry = new Map<string, DNAModule[]>();
      
      const baseV1 = new TestDNAModule('base', '1.0.0');
      const baseV2 = new TestDNAModule('base', '2.0.0');
      const moduleA = new TestDNAModule('module-a', '1.0.0');
      const moduleB = new TestDNAModule('module-b', '1.0.0');
      
      // Module A needs base v1
      moduleA.dependencies.push({
        moduleId: 'base',
        version: '^1.0.0',
        optional: false,
        reason: 'Needs base v1'
      });
      
      // Module B needs base v2
      moduleB.dependencies.push({
        moduleId: 'base',
        version: '^2.0.0',
        optional: false,
        reason: 'Needs base v2'
      });
      
      moduleRegistry.set('base', [baseV1, baseV2]);
      moduleRegistry.set('module-a', [moduleA]);
      moduleRegistry.set('module-b', [moduleB]);
      
      const resolver = new DependencyResolver(moduleRegistry);
      
      const result = await resolver.resolveDependencies(
        ['module-a', 'module-b'],
        {
          targetFramework: SupportedFramework.TYPESCRIPT,
          strategy: ResolutionStrategy.LATEST,
          allowExperimental: false,
          allowDeprecated: false,
          allowConflicts: false,
          maxDepth: 10,
          excludeModules: new Set(),
          preferredVersions: new Map(),
          compatibilityMatrix: new Map()
        }
      );
      
      // Should detect version conflict
      expect(result.conflicts.some(c => c.type === 'version')).toBe(true);
    });
  });

  describe('AC3: Module Composition API with Validation and Safety Checks', () => {
    test('should compose modules with validation', async () => {
      await engine.initialize();
      
      const authModule = new TestDNAModule('auth', '1.0.0', DNAModuleCategory.AUTHENTICATION);
      const paymentModule = new TestDNAModule('payment', '1.0.0', DNAModuleCategory.PAYMENT);
      
      await engine.registerModule(authModule);
      await engine.registerModule(paymentModule);
      
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'auth', version: '1.0.0', config: {} },
          { moduleId: 'payment', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.TYPESCRIPT,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {},
        projectName: 'test-project'
      };
      
      const result = await engine.composeModules(composition);
      
      expect(result.valid).toBe(true);
      expect(result.modules).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.performance.compositionTime).toBeGreaterThan(0);
    });

    test('should fail composition with invalid modules', async () => {
      await engine.initialize();
      
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'nonexistent', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.TYPESCRIPT,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };
      
      const result = await engine.composeModules(composition);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MODULE_NOT_FOUND')).toBe(true);
    });

    test('should perform safety checks during composition', async () => {
      await engine.initialize();
      
      const conflictingModule1 = new TestDNAModule('conflict1', '1.0.0');
      const conflictingModule2 = new TestDNAModule('conflict2', '1.0.0');
      
      // Add explicit conflict
      conflictingModule1.conflicts.push({
        moduleId: 'conflict2',
        reason: 'Cannot be used together',
        severity: 'error'
      });
      
      await engine.registerModule(conflictingModule1);
      await engine.registerModule(conflictingModule2);
      
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'conflict1', version: '1.0.0', config: {} },
          { moduleId: 'conflict2', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.TYPESCRIPT,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };
      
      const result = await engine.composeModules(composition);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code.includes('CONFLICT'))).toBe(true);
    });
  });

  describe('AC4: Hot-Reload Capability', () => {
    test('should initialize hot-reload system', async () => {
      const hotReload = createHotReloadSystem({
        enabled: true,
        watchPaths: ['./test-modules'],
        debounceMs: 100
      });
      
      await hotReload.initialize();
      
      const session = hotReload.getSession();
      expect(session.id).toBeDefined();
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.watchedPaths).toContain(expect.stringContaining('test-modules'));
      
      await hotReload.stop();
    });

    test('should register modules for hot-reloading', async () => {
      const hotReload = createHotReloadSystem({ enabled: false });
      
      const testModule = new TestDNAModule('hot-reload-test', '1.0.0');
      hotReload.registerModule(testModule);
      
      const stats = hotReload.getStats();
      expect(stats.registeredModules).toBe(1);
    });

    test('should handle manual module reload', async () => {
      const hotReload = createHotReloadSystem({ enabled: false });
      
      const testModule = new TestDNAModule('manual-reload-test', '1.0.0');
      hotReload.registerModule(testModule);
      
      const result = await hotReload.reloadModule('manual-reload-test', {
        preserveState: true,
        recompile: false
      });
      
      expect(result.success).toBe(true);
      expect(result.operation).toBe('reload');
      expect(result.affectedModules).toContain('manual-reload-test');
    });

    test('should manage hot-reload statistics', async () => {
      const hotReload = createHotReloadSystem({ enabled: false });
      
      const initialStats = hotReload.getStats();
      expect(initialStats.reloadCount).toBe(0);
      expect(initialStats.errorCount).toBe(0);
      
      // Register a module and perform reload
      const testModule = new TestDNAModule('stats-test', '1.0.0');
      hotReload.registerModule(testModule);
      
      await hotReload.reloadModule('stats-test');
      
      const updatedStats = hotReload.getStats();
      expect(updatedStats.registeredModules).toBe(1);
    });
  });

  describe('AC5: Module Lifecycle Management', () => {
    test('should handle module installation', async () => {
      const lifecycle = createModuleLifecycleManager({
        backupEnabled: false, // Disable for tests
        rollbackEnabled: false
      });
      
      const result = await lifecycle.installModule('test-install', {
        dryRun: true // Dry run for testing
      });
      
      expect(result.operation).toBe('install');
      expect(result.moduleId).toBe('test-install');
      expect(result.success).toBe(true); // Dry run should succeed
    });

    test('should handle module updates', async () => {
      const lifecycle = createModuleLifecycleManager({
        backupEnabled: false,
        rollbackEnabled: false
      });
      
      const result = await lifecycle.updateModule('test-update', {
        targetVersion: '2.0.0',
        dryRun: true
      });
      
      expect(result.operation).toBe('update');
      expect(result.moduleId).toBe('test-update');
      expect(result.success).toBe(true);
    });

    test('should handle module removal', async () => {
      const lifecycle = createModuleLifecycleManager({
        backupEnabled: false,
        rollbackEnabled: false
      });
      
      const result = await lifecycle.removeModule('test-remove', {
        dryRun: true
      });
      
      expect(result.operation).toBe('remove');
      expect(result.moduleId).toBe('test-remove');
      expect(result.success).toBe(true);
    });

    test('should track operation history', async () => {
      const lifecycle = createModuleLifecycleManager({
        backupEnabled: false,
        rollbackEnabled: false
      });
      
      await lifecycle.installModule('history-test', { dryRun: true });
      await lifecycle.updateModule('history-test', { dryRun: true });
      await lifecycle.removeModule('history-test', { dryRun: true });
      
      const history = lifecycle.getOperationHistory('history-test');
      expect(history).toHaveLength(3);
      expect(history[0].operation).toBe('install');
      expect(history[1].operation).toBe('update');
      expect(history[2].operation).toBe('remove');
    });

    test('should manage rollback points', async () => {
      const lifecycle = createModuleLifecycleManager({
        backupEnabled: true,
        rollbackEnabled: true
      });
      
      const installResult = await lifecycle.installModule('rollback-test', { dryRun: true });
      
      if (installResult.rollbackId) {
        const rollbackPoints = lifecycle.getRollbackPoints('rollback-test');
        expect(rollbackPoints).toHaveLength(1);
        expect(rollbackPoints[0].moduleId).toBe('rollback-test');
        expect(rollbackPoints[0].operation).toBe('install');
      }
    });

    test('should cleanup old artifacts', async () => {
      const lifecycle = createModuleLifecycleManager({
        backupEnabled: true,
        rollbackEnabled: true
      });
      
      const cleanupResult = await lifecycle.cleanup({
        olderThan: 0, // Clean up everything
        maxCount: 0
      });
      
      expect(cleanupResult.removedRollbackPoints).toBeGreaterThanOrEqual(0);
      expect(cleanupResult.freedSpace).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all systems for complete workflow', async () => {
      // Initialize all systems
      await engine.initialize();
      
      // Register test modules
      const authModule = new TestDNAModule('auth', '1.0.0', DNAModuleCategory.AUTHENTICATION);
      const paymentModule = new TestDNAModule('payment', '1.0.0', DNAModuleCategory.PAYMENT);
      
      await engine.registerModule(authModule);
      await engine.registerModule(paymentModule);
      
      // Test composition
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'auth', version: '1.0.0', config: {} },
          { moduleId: 'payment', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.TYPESCRIPT,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };
      
      const compositionResult = await engine.composeModules(composition);
      expect(compositionResult.valid).toBe(true);
      
      // Test hot-reload registration
      const hotReload = createHotReloadSystem({ enabled: false });
      hotReload.registerModule(authModule);
      hotReload.registerModule(paymentModule);
      
      const hotReloadStats = hotReload.getStats();
      expect(hotReloadStats.registeredModules).toBe(2);
      
      // Test lifecycle operations
      const lifecycle = createModuleLifecycleManager({ backupEnabled: false });
      
      const installResult = await lifecycle.installModule('integration-test', { dryRun: true });
      expect(installResult.success).toBe(true);
      
      const updateResult = await lifecycle.updateModule('integration-test', { dryRun: true });
      expect(updateResult.success).toBe(true);
      
      // Verify performance metrics
      const engineMetrics = engine.getPerformanceMetrics();
      expect(engineMetrics.size).toBeGreaterThan(0);
      
      await hotReload.stop();
    });

    test('should handle error scenarios gracefully', async () => {
      await engine.initialize();
      
      // Test with invalid composition
      const invalidComposition: DNAComposition = {
        modules: [
          { moduleId: 'nonexistent', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.TYPESCRIPT,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };
      
      const result = await engine.composeModules(invalidComposition);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Verify engine is still functional
      const testModule = new TestDNAModule('recovery-test', '1.0.0');
      await engine.registerModule(testModule);
      
      const moduleInfo = engine.getModuleInfo('recovery-test');
      expect(moduleInfo).toBeDefined();
    });
  });
});
