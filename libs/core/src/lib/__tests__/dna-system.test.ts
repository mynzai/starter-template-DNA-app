/**
 * @fileoverview Comprehensive tests for DNA Module Architecture
 */

import {
  DNARegistry,
  DNAComposer,
  DNAMigrationManager,
  TemplateEngine,
  BaseDNAModule,
  FlutterDNAModule,
  ReactNativeDNAModule,
  NextJSDNAModule,
  SupportedFramework,
  DNAModuleCategory,
  CompatibilityLevel,
  DNAModuleMetadata,
  DNAModuleDependency,
  DNAModuleConflict,
  DNAModuleConfig,
  FrameworkImplementation,
  DNAModuleContext,
  DNAModuleFile,
  DNAComposition,
  TemplateConfig,
  TemplateType
} from '../index';

// Mock DNA Module for testing
class TestAuthModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'test-auth',
    name: 'Test Authentication',
    description: 'Test authentication module',
    version: '1.0.0',
    category: DNAModuleCategory.AUTHENTICATION,
    author: 'Test Team',
    license: 'MIT',
    keywords: ['test', 'auth'],
    deprecated: false,
    experimental: false
  };

  public readonly dependencies: DNAModuleDependency[] = [];
  public readonly conflicts: DNAModuleConflict[] = [];

  public readonly frameworks: FrameworkImplementation[] = [
    {
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['next-auth'],
      devDependencies: [],
      peerDependencies: [],
      configFiles: ['next.config.js'],
      templates: ['pages/api/auth/'],
      postInstallSteps: [],
      limitations: []
    }
  ];

  public readonly config: DNAModuleConfig = {
    schema: {},
    defaults: {},
    required: [],
    validation: { rules: {} }
  };

  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        relativePath: 'src/auth/auth.service.ts',
        content: '// Test auth service implementation',
        encoding: 'utf8',
        executable: false,
        overwrite: true,
        mergeStrategy: 'replace',
        conditions: {}
      }
    ];
  }
}

class TestAIModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'test-ai',
    name: 'Test AI Integration',
    description: 'Test AI integration module',
    version: '1.0.0',
    category: DNAModuleCategory.AI_INTEGRATION,
    author: 'Test Team',
    license: 'MIT',
    keywords: ['test', 'ai'],
    deprecated: false,
    experimental: false
  };

  public readonly dependencies: DNAModuleDependency[] = [
    {
      moduleId: 'test-auth',
      version: '^1.0.0',
      optional: false,
      reason: 'AI module requires authentication'
    }
  ];

  public readonly conflicts: DNAModuleConflict[] = [];

  public readonly frameworks: FrameworkImplementation[] = [
    {
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['openai'],
      devDependencies: [],
      peerDependencies: [],
      configFiles: [],
      templates: ['pages/api/ai/'],
      postInstallSteps: [],
      limitations: []
    }
  ];

  public readonly config: DNAModuleConfig = {
    schema: {},
    defaults: {},
    required: [],
    validation: { rules: {} }
  };

  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        relativePath: 'src/ai/ai.service.ts',
        content: '// Test AI service implementation',
        encoding: 'utf8',
        executable: false,
        overwrite: true,
        mergeStrategy: 'replace',
        conditions: {}
      }
    ];
  }
}

class ConflictingModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'conflicting-module',
    name: 'Conflicting Module',
    description: 'Module that conflicts with auth',
    version: '1.0.0',
    category: DNAModuleCategory.AUTHENTICATION,
    author: 'Test Team',
    license: 'MIT',
    keywords: ['test', 'conflict'],
    deprecated: false,
    experimental: false
  };

  public readonly dependencies: DNAModuleDependency[] = [];

  public readonly conflicts: DNAModuleConflict[] = [
    {
      moduleId: 'test-auth',
      reason: 'Cannot use both authentication modules',
      severity: 'error',
      resolution: 'Choose one authentication method'
    }
  ];

  public readonly frameworks: FrameworkImplementation[] = [
    {
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [],
      devDependencies: [],
      peerDependencies: [],
      configFiles: [],
      templates: [],
      postInstallSteps: [],
      limitations: []
    }
  ];

  public readonly config: DNAModuleConfig = {
    schema: {},
    defaults: {},
    required: [],
    validation: { rules: {} }
  };

  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [];
  }
}

describe('DNA Module Architecture', () => {
  let registry: DNARegistry;
  let composer: DNAComposer;
  let migrationManager: DNAMigrationManager;
  let templateEngine: TemplateEngine;
  let testAuthModule: TestAuthModule;
  let testAIModule: TestAIModule;
  let conflictingModule: ConflictingModule;

  beforeEach(async () => {
    // Initialize test modules
    testAuthModule = new TestAuthModule();
    testAIModule = new TestAIModule();
    conflictingModule = new ConflictingModule();

    // Initialize DNA system components
    registry = new DNARegistry({
      sources: [{ type: 'local', path: './test-modules', priority: 1 }],
      cache: { enabled: false, ttl: 0, path: '' },
      validation: { strict: true, allowExperimental: true, allowDeprecated: false }
    });

    composer = new DNAComposer(registry);
    migrationManager = new DNAMigrationManager();
    templateEngine = new TemplateEngine({
      registry,
      composer,
      migrationManager
    });

    // Register test modules
    registry.registerModule(testAuthModule);
    registry.registerModule(testAIModule);
    registry.registerModule(conflictingModule);
  });

  describe('DNARegistry', () => {
    it('should register and retrieve DNA modules', () => {
      const module = registry.getModule('test-auth');
      expect(module).toBeDefined();
      expect(module?.metadata.id).toBe('test-auth');
      expect(module?.metadata.name).toBe('Test Authentication');
    });

    it('should get all modules', () => {
      const modules = registry.getAllModules();
      expect(modules.length).toBe(3);
      expect(modules.map(m => m.metadata.id)).toContain('test-auth');
      expect(modules.map(m => m.metadata.id)).toContain('test-ai');
      expect(modules.map(m => m.metadata.id)).toContain('conflicting-module');
    });

    it('should get modules by category', () => {
      const authModules = registry.getModulesByCategory(DNAModuleCategory.AUTHENTICATION);
      expect(authModules.length).toBe(2);
      expect(authModules.map(m => m.metadata.id)).toContain('test-auth');
      expect(authModules.map(m => m.metadata.id)).toContain('conflicting-module');

      const aiModules = registry.getModulesByCategory(DNAModuleCategory.AI_INTEGRATION);
      expect(aiModules.length).toBe(1);
      expect(aiModules[0].metadata.id).toBe('test-ai');
    });

    it('should get modules for framework', () => {
      const nextJSModules = registry.getModulesForFramework(SupportedFramework.NEXTJS);
      expect(nextJSModules.length).toBe(3);

      const flutterModules = registry.getModulesForFramework(SupportedFramework.FLUTTER);
      expect(flutterModules.length).toBe(0);
    });

    it('should search modules by keywords', () => {
      const authResults = registry.searchModules('auth');
      expect(authResults.length).toBe(2);

      const aiResults = registry.searchModules('ai');
      expect(aiResults.length).toBe(1);
      expect(aiResults[0].metadata.id).toBe('test-ai');
    });

    it('should detect circular dependencies', () => {
      const modules = [testAuthModule, testAIModule];
      const hasCircular = registry.hasCircularDependencies(modules);
      expect(hasCircular).toBe(false);
    });
  });

  describe('DNAComposer', () => {
    it('should compose valid DNA modules', async () => {
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-auth', version: '1.0.0', config: {} },
          { moduleId: 'test-ai', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const result = await composer.compose(composition);

      expect(result.valid).toBe(true);
      expect(result.modules.length).toBe(2);
      expect(result.dependencyOrder).toEqual(['test-auth', 'test-ai']);
      expect(result.errors.length).toBe(0);
    });

    it('should detect module conflicts', async () => {
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-auth', version: '1.0.0', config: {} },
          { moduleId: 'conflicting-module', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const result = await composer.compose(composition);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MODULE_CONFLICT')).toBe(true);
    });

    it('should validate dependency resolution', async () => {
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-ai', version: '1.0.0', config: {} }
          // Missing test-auth dependency
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const result = await composer.compose(composition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_DEPENDENCY')).toBe(true);
    });

    it('should generate files for valid composition', async () => {
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-auth', version: '1.0.0', config: {} },
          { moduleId: 'test-ai', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const compositionResult = await composer.compose(composition);
      expect(compositionResult.valid).toBe(true);

      const context: Omit<DNAModuleContext, 'activeModules'> = {
        projectName: 'test-project',
        outputPath: '/tmp/test',
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        moduleConfig: {},
        globalConfig: {},
        availableModules: new Map(),
        fileSystem: {
          async exists() { return false; },
          async read() { return ''; },
          async write() { },
          async copy() { },
          async mkdir() { },
          async remove() { },
          async list() { return []; }
        },
        logger: {
          debug() { },
          info() { },
          warn() { },
          error() { },
          success() { }
        }
      };

      const files = await composer.generateFiles(compositionResult, context);

      expect(files.length).toBe(2);
      expect(files.map(f => f.relativePath)).toContain('src/auth/auth.service.ts');
      expect(files.map(f => f.relativePath)).toContain('src/ai/ai.service.ts');
    });

    it('should get composition preview', async () => {
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-auth', version: '1.0.0', config: {} },
          { moduleId: 'test-ai', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const preview = await composer.getCompositionPreview(composition);

      expect(preview.valid).toBe(true);
      expect(preview.modules.length).toBe(2);
      expect(preview.dependencies).toEqual(['test-auth', 'test-ai']);
      expect(preview.estimatedFiles).toBeGreaterThan(0);
      expect(preview.estimatedComplexity).toBeGreaterThan(0);
    });

    it('should optimize composition', async () => {
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-auth', version: '1.0.0', config: {} },
          { moduleId: 'test-ai', version: '1.0.0', config: {} },
          { moduleId: 'conflicting-module', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const optimization = await composer.optimizeComposition(composition);

      expect(optimization.suggestions.length).toBeGreaterThan(0);
      expect(optimization.optimizedComplexity).toBeLessThanOrEqual(optimization.originalComplexity);
    });
  });

  describe('DNAMigrationManager', () => {
    it('should detect migration need', () => {
      const isNeeded = migrationManager.isMigrationNeeded('test-module', '1.0.0', '2.0.0');
      expect(isNeeded).toBe(false); // No migrations registered yet
    });

    it('should get migration preview', () => {
      const preview = migrationManager.getMigrationPreview('test-module', '1.0.0', '2.0.0');
      expect(preview.steps).toEqual([]);
      expect(preview.breakingChanges).toBe(0);
      expect(preview.manualSteps).toBe(0);
    });

    it('should validate migration compatibility', async () => {
      const validation = await migrationManager.validateMigration(testAuthModule, {
        moduleId: 'test-auth',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        projectPath: '/tmp/test',
        dryRun: true
      });

      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });
  });

  describe('TemplateEngine Integration', () => {
    beforeEach(async () => {
      await templateEngine.initialize();
    });

    it('should generate template with DNA modules', async () => {
      const config: TemplateConfig = {
        name: 'test-project',
        type: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['test-auth', 'test-ai'],
        outputPath: '/tmp/test-project',
        variables: {}
      };

      const result = await templateEngine.generateTemplate(config);

      expect(result.success).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      expect(result.metrics.filesGenerated).toBeGreaterThan(0);
    });

    it('should fail with conflicting modules', async () => {
      const config: TemplateConfig = {
        name: 'test-project',
        type: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['test-auth', 'conflicting-module'],
        outputPath: '/tmp/test-project',
        variables: {}
      };

      const result = await templateEngine.generateTemplate(config);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should get composition preview through template engine', async () => {
      const config: TemplateConfig = {
        name: 'test-project',
        type: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['test-auth', 'test-ai'],
        outputPath: '/tmp/test-project',
        variables: {}
      };

      const preview = await templateEngine.getCompositionPreview(config);

      expect(preview.valid).toBe(true);
      expect(preview.modules.length).toBe(2);
      expect(preview.dependencies).toEqual(['test-auth', 'test-ai']);
    });

    it('should optimize composition through template engine', async () => {
      const config: TemplateConfig = {
        name: 'test-project',
        type: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['test-auth', 'test-ai', 'conflicting-module'],
        outputPath: '/tmp/test-project',
        variables: {}
      };

      const optimization = await templateEngine.optimizeComposition(config);

      expect(optimization.suggestions.length).toBeGreaterThan(0);
      expect(optimization.optimizedComposition.modules.length).toBeLessThanOrEqual(config.dnaModules.length);
    });

    it('should check migration needs', () => {
      const config: TemplateConfig = {
        name: 'test-project',
        type: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['test-auth', 'test-ai'],
        outputPath: '/tmp/test-project',
        variables: {}
      };

      const currentVersions = {
        'test-auth': '0.9.0',
        'test-ai': '0.8.0'
      };

      const isNeeded = templateEngine.isMigrationNeeded(config, currentVersions);
      expect(isNeeded).toBe(false); // No migrations registered
    });

    it('should handle module not found', async () => {
      const config: TemplateConfig = {
        name: 'test-project',
        type: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['non-existent-module'],
        outputPath: '/tmp/test-project',
        variables: {}
      };

      await expect(templateEngine.generateTemplate(config)).resolves.toEqual(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.stringContaining('non-existent-module')
          ])
        })
      );
    });
  });

  describe('Framework-Specific Base Classes', () => {
    it('should create Flutter DNA module', () => {
      class TestFlutterModule extends FlutterDNAModule {
        public readonly metadata: DNAModuleMetadata = {
          id: 'test-flutter',
          name: 'Test Flutter Module',
          description: 'Test Flutter module',
          version: '1.0.0',
          category: DNAModuleCategory.UI_FRAMEWORK,
          author: 'Test Team',
          license: 'MIT',
          keywords: ['flutter'],
          deprecated: false,
          experimental: false
        };

        public readonly dependencies: DNAModuleDependency[] = [];
        public readonly conflicts: DNAModuleConflict[] = [];

        public readonly frameworks: FrameworkImplementation[] = [
          this.createFlutterImplementation({
            dependencies: ['http'],
            devDependencies: ['flutter_test']
          })
        ];

        public readonly config: DNAModuleConfig = {
          schema: {},
          defaults: {},
          required: [],
          validation: { rules: {} }
        };

        public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
          return [
            this.generateFlutterFile({
              path: 'lib/test.dart',
              content: 'class TestWidget extends StatelessWidget {}',
              isLibrary: true
            })
          ];
        }
      }

      const flutterModule = new TestFlutterModule();
      expect(flutterModule.metadata.id).toBe('test-flutter');
      expect(flutterModule.frameworks[0].framework).toBe(SupportedFramework.FLUTTER);
      expect(flutterModule.frameworks[0].dependencies).toContain('http');
    });

    it('should create React Native DNA module', () => {
      class TestReactNativeModule extends ReactNativeDNAModule {
        public readonly metadata: DNAModuleMetadata = {
          id: 'test-react-native',
          name: 'Test React Native Module',
          description: 'Test React Native module',
          version: '1.0.0',
          category: DNAModuleCategory.UI_FRAMEWORK,
          author: 'Test Team',
          license: 'MIT',
          keywords: ['react-native'],
          deprecated: false,
          experimental: false
        };

        public readonly dependencies: DNAModuleDependency[] = [];
        public readonly conflicts: DNAModuleConflict[] = [];

        public readonly frameworks: FrameworkImplementation[] = [
          this.createReactNativeImplementation({
            dependencies: ['react-native-sse'],
            devDependencies: ['@testing-library/react-native']
          })
        ];

        public readonly config: DNAModuleConfig = {
          schema: {},
          defaults: {},
          required: [],
          validation: { rules: {} }
        };

        public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
          return [
            this.generateReactNativeFile({
              path: 'src/TestComponent.tsx',
              content: 'export const TestComponent = () => <View />;',
              isComponent: true
            })
          ];
        }
      }

      const reactNativeModule = new TestReactNativeModule();
      expect(reactNativeModule.metadata.id).toBe('test-react-native');
      expect(reactNativeModule.frameworks[0].framework).toBe(SupportedFramework.REACT_NATIVE);
      expect(reactNativeModule.frameworks[0].dependencies).toContain('react-native-sse');
    });

    it('should create Next.js DNA module', () => {
      class TestNextJSModule extends NextJSDNAModule {
        public readonly metadata: DNAModuleMetadata = {
          id: 'test-nextjs',
          name: 'Test Next.js Module',
          description: 'Test Next.js module',
          version: '1.0.0',
          category: DNAModuleCategory.UI_FRAMEWORK,
          author: 'Test Team',
          license: 'MIT',
          keywords: ['nextjs'],
          deprecated: false,
          experimental: false
        };

        public readonly dependencies: DNAModuleDependency[] = [];
        public readonly conflicts: DNAModuleConflict[] = [];

        public readonly frameworks: FrameworkImplementation[] = [
          this.createNextJSImplementation({
            dependencies: ['swr'],
            devDependencies: ['@types/jest']
          })
        ];

        public readonly config: DNAModuleConfig = {
          schema: {},
          defaults: {},
          required: [],
          validation: { rules: {} }
        };

        public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
          return [
            this.generateNextJSFile({
              path: 'pages/test.tsx',
              content: 'export default function TestPage() { return <div>Test</div>; }',
              isPage: true
            })
          ];
        }
      }

      const nextJSModule = new TestNextJSModule();
      expect(nextJSModule.metadata.id).toBe('test-nextjs');
      expect(nextJSModule.frameworks[0].framework).toBe(SupportedFramework.NEXTJS);
      expect(nextJSModule.frameworks[0].dependencies).toContain('swr');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty composition', async () => {
      const composition: DNAComposition = {
        modules: [],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const result = await composer.compose(composition);
      expect(result.valid).toBe(true);
      expect(result.modules.length).toBe(0);
    });

    it('should handle invalid module versions', async () => {
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-auth', version: '999.0.0', config: {} }
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const result = await composer.compose(composition);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MODULE_NOT_FOUND')).toBe(true);
    });

    it('should handle framework incompatibility', async () => {
      // Register a module that doesn't support Flutter
      const composition: DNAComposition = {
        modules: [
          { moduleId: 'test-auth', version: '1.0.0', config: {} }
        ],
        framework: SupportedFramework.FLUTTER,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const result = await composer.compose(composition);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FRAMEWORK_INCOMPATIBLE')).toBe(true);
    });

    it('should handle module configuration validation errors', async () => {
      // Create a module with strict validation
      class StrictModule extends BaseDNAModule {
        public readonly metadata: DNAModuleMetadata = {
          id: 'strict-module',
          name: 'Strict Module',
          description: 'Module with strict validation',
          version: '1.0.0',
          category: DNAModuleCategory.TESTING,
          author: 'Test Team',
          license: 'MIT',
          keywords: ['strict'],
          deprecated: false,
          experimental: false
        };

        public readonly dependencies: DNAModuleDependency[] = [];
        public readonly conflicts: DNAModuleConflict[] = [];

        public readonly frameworks: FrameworkImplementation[] = [
          {
            framework: SupportedFramework.NEXTJS,
            supported: true,
            compatibility: CompatibilityLevel.FULL,
            dependencies: [],
            devDependencies: [],
            peerDependencies: [],
            configFiles: [],
            templates: [],
            postInstallSteps: [],
            limitations: []
          }
        ];

        public readonly config: DNAModuleConfig = {
          schema: {},
          defaults: {},
          required: ['apiKey'],
          validation: {
            rules: {},
            custom: async (config: any) => {
              const errors: string[] = [];
              if (!config.apiKey) {
                errors.push('API key is required');
              }
              return errors;
            }
          }
        };

        public async generateFiles(): Promise<DNAModuleFile[]> {
          return [];
        }
      }

      const strictModule = new StrictModule();
      registry.registerModule(strictModule);

      const composition: DNAComposition = {
        modules: [
          { moduleId: 'strict-module', version: '1.0.0', config: {} } // Missing apiKey
        ],
        framework: SupportedFramework.NEXTJS,
        templateType: TemplateType.AI_SAAS,
        globalConfig: {}
      };

      const result = await composer.compose(composition);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('API key is required'))).toBe(true);
    });
  });
});