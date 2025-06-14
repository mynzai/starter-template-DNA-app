/**
 * @fileoverview Unit tests for ProjectGenerator
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { ProjectGenerator } from '../project-generator';
import { TemplateRegistry } from '../template-registry';
import { ProgressTracker } from '../progress-tracker';
import { ProjectConfig, GenerationOptions } from '../../types/cli';
import {
  FileSystemMock,
  createBasicProjectStructure,
  createEmptyFileSystem
} from '../../test-utils/file-system-mock';
import {
  ProcessMock,
  createSuccessfulProcessMock,
  createFailingProcessMock,
  expectCommandCalled
} from '../../test-utils/process-mock';
import {
  allMockTemplates,
  mockAISaasTemplate,
  mockBasicTypescriptTemplate,
  mockProjectConfigs
} from '../../test-utils/template-fixtures';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  createMockProgressTracker,
  createMockLogger
} from '../../test-utils/test-helpers';
import { SupportedFramework } from '@dna/core';

// Mock the TemplateInstantiationEngine
jest.mock('@dna/core', () => ({
  TemplateInstantiationEngine: jest.fn().mockImplementation(() => ({
    instantiateTemplate: jest.fn().mockResolvedValue({
      success: true,
      errors: []
    })
  })),
  SupportedFramework: {
    NEXTJS: 'nextjs',
    FLUTTER: 'flutter',
    REACT_NATIVE: 'react-native',
    TYPESCRIPT: 'typescript'
  },
  TemplateType: {
    AI_SAAS: 'ai-saas',
    FOUNDATION: 'foundation',
    FLUTTER_UNIVERSAL: 'flutter-universal',
    REACT_NATIVE_HYBRID: 'react-native-hybrid'
  }
}));

describe('ProjectGenerator', () => {
  let generator: ProjectGenerator;
  let mockRegistry: jest.Mocked<TemplateRegistry>;
  let mockProgressTracker: jest.Mocked<ProgressTracker>;
  let fsMock: FileSystemMock;
  let processMock: ProcessMock;
  let config: ProjectConfig;
  let options: GenerationOptions;

  beforeEach(() => {
    setupTestEnvironment();
    
    // Setup file system mock
    fsMock = createBasicProjectStructure();
    fsMock.setup();
    
    // Setup process mock
    processMock = createSuccessfulProcessMock();
    
    // Setup mocks
    mockRegistry = {
      load: jest.fn(),
      getTemplate: jest.fn(),
      getTemplates: jest.fn().mockReturnValue(allMockTemplates),
    } as any;

    mockProgressTracker = createMockProgressTracker() as any;

    // Setup default config
    config = { ...mockProjectConfigs.basic };
    options = {
      interactive: false,
      dryRun: false,
      overwrite: false,
      backup: true,
      progress: true
    };

    generator = new ProjectGenerator(config, options, mockProgressTracker);
  });

  afterEach(() => {
    teardownTestEnvironment();
    fsMock.teardown();
    processMock.teardown();
    jest.clearAllMocks();
  });

  describe('validateConfiguration()', () => {
    it('should validate successfully for valid template', async () => {
      mockRegistry.getTemplate.mockReturnValue(mockBasicTypescriptTemplate);
      (generator as any).registry = mockRegistry;

      await expect(generator.validateConfiguration()).resolves.not.toThrow();
      
      expect(mockRegistry.load).toHaveBeenCalled();
      expect(mockRegistry.getTemplate).toHaveBeenCalledWith('basic-typescript');
    });

    it('should throw error for non-existent template', async () => {
      mockRegistry.getTemplate.mockReturnValue(undefined);
      (generator as any).registry = mockRegistry;

      await expect(generator.validateConfiguration()).rejects.toThrow(
        'Template "basic-typescript" not found'
      );
    });

    it('should warn about incompatible DNA modules', async () => {
      const mockLogger = createMockLogger();
      jest.doMock('../../utils/logger', () => ({ logger: mockLogger }));

      const template = {
        ...mockBasicTypescriptTemplate,
        dnaModules: ['testing-jest'] // Different from config
      };
      config.dnaModules = ['auth-jwt', 'incompatible-module'];
      
      mockRegistry.getTemplate.mockReturnValue(template);
      (generator as any).registry = mockRegistry;

      await generator.validateConfiguration();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Some DNA modules may not be compatible')
      );
    });

    it('should validate system requirements', async () => {
      const template = {
        ...mockBasicTypescriptTemplate,
        requirements: {
          node: '>=18.0.0'
        }
      };
      
      mockRegistry.getTemplate.mockReturnValue(template);
      (generator as any).registry = mockRegistry;

      // Mock fs.stat to simulate directory check
      const mockStat = jest.fn().mockResolvedValue({ size: 1000000000 }); // 1GB available
      fsMock.mockFs.stat = mockStat;

      await expect(generator.validateConfiguration()).resolves.not.toThrow();
    });

    it('should throw error for insufficient disk space', async () => {
      const template = {
        ...mockBasicTypescriptTemplate,
        requirements: {}
      };
      
      mockRegistry.getTemplate.mockReturnValue(template);
      (generator as any).registry = mockRegistry;

      // Mock fs.stat to simulate low disk space
      const mockStat = jest.fn().mockResolvedValue({ size: 100000 }); // 100KB available
      fsMock.mockFs.stat = mockStat;

      await expect(generator.validateConfiguration()).rejects.toThrow(
        'Insufficient disk space for template generation'
      );
    });
  });

  describe('prepareDirectory()', () => {
    it('should create project directory in normal mode', async () => {
      await generator.prepareDirectory();

      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith(config.path);
    });

    it('should skip directory creation in dry run mode', async () => {
      options.dryRun = true;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      await generator.prepareDirectory();

      expect(fsMock.mockFs.ensureDir).not.toHaveBeenCalled();
    });

    it('should create backup when overwriting existing directory', async () => {
      options.overwrite = true;
      options.backup = true;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      // Mock existing directory
      fsMock.mockFs.pathExists.mockResolvedValue(true);

      await generator.prepareDirectory();

      expect(fsMock.mockFs.copy).toHaveBeenCalledWith(
        config.path,
        expect.stringMatching(new RegExp(`${config.path}\\.backup\\.\\d+`))
      );
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(config.path);
      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith(config.path);
    });

    it('should not create backup when backup is disabled', async () => {
      options.overwrite = true;
      options.backup = false;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      fsMock.mockFs.pathExists.mockResolvedValue(true);

      await generator.prepareDirectory();

      expect(fsMock.mockFs.copy).not.toHaveBeenCalled();
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(config.path);
    });

    it('should set file permissions on Unix systems', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      await generator.prepareDirectory();

      expect(fsMock.mockFs.chmod).toHaveBeenCalledWith(config.path, 0o755);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should skip chmod on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      await generator.prepareDirectory();

      expect(fsMock.mockFs.chmod).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('generateFiles()', () => {
    beforeEach(() => {
      mockRegistry.getTemplate.mockReturnValue(mockBasicTypescriptTemplate);
      (generator as any).registry = mockRegistry;
    });

    it('should use TemplateInstantiationEngine for file generation', async () => {
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = {
        instantiateTemplate: jest.fn().mockResolvedValue({
          success: true,
          errors: []
        })
      };
      TemplateInstantiationEngine.mockImplementation(() => mockEngine);

      await generator.generateFiles();

      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        {
          name: config.name,
          type: mockBasicTypescriptTemplate.type,
          framework: config.framework,
          dnaModules: config.dnaModules,
          outputPath: config.path,
          variables: config.variables
        },
        {
          skipDependencyInstall: true,
          skipGitInit: true,
          dryRun: options.dryRun,
          overwrite: options.overwrite,
          backup: options.backup,
          progressCallback: expect.any(Function)
        }
      );
    });

    it('should throw error when template generation fails', async () => {
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = {
        instantiateTemplate: jest.fn().mockResolvedValue({
          success: false,
          errors: ['Template generation failed', 'Invalid template structure']
        })
      };
      TemplateInstantiationEngine.mockImplementation(() => mockEngine);

      await expect(generator.generateFiles()).rejects.toThrow(
        'Template generation failed: Template generation failed, Invalid template structure'
      );
    });

    it('should handle progress callback correctly', async () => {
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = {
        instantiateTemplate: jest.fn().mockImplementation((config, options) => {
          // Simulate progress callback
          if (options.progressCallback) {
            options.progressCallback('Generating files', 0.5);
          }
          return Promise.resolve({ success: true, errors: [] });
        })
      };
      TemplateInstantiationEngine.mockImplementation(() => mockEngine);

      await generator.generateFiles();

      expect(mockEngine.instantiateTemplate).toHaveBeenCalled();
    });
  });

  describe('installDependencies()', () => {
    it('should install dependencies with npm by default', async () => {
      await generator.installDependencies();

      expectCommandCalled('npm', ['install']);
    });

    it('should install dependencies with specified package manager', async () => {
      config.packageManager = 'yarn';
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      await generator.installDependencies();

      expectCommandCalled('yarn', ['install']);
    });

    it('should support different package managers', async () => {
      const packageManagers = [
        { name: 'yarn', command: 'yarn', args: ['install'] },
        { name: 'pnpm', command: 'pnpm', args: ['install'] },
        { name: 'bun', command: 'bun', args: ['install'] }
      ];

      for (const pm of packageManagers) {
        jest.clearAllMocks();
        processMock.teardown();
        processMock = createSuccessfulProcessMock();

        config.packageManager = pm.name as any;
        generator = new ProjectGenerator(config, options, mockProgressTracker);

        await generator.installDependencies();

        expectCommandCalled(pm.command, pm.args);
      }
    });

    it('should skip installation in dry run mode', async () => {
      options.dryRun = true;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      await generator.installDependencies();

      expect(require('child_process').spawn).not.toHaveBeenCalled();
    });

    it('should throw error when installation fails', async () => {
      processMock.teardown();
      processMock = createFailingProcessMock();

      await expect(generator.installDependencies()).rejects.toThrow(
        expect.stringContaining('Command failed with exit code 1')
      );
    });

    it('should run installation in correct directory', async () => {
      await generator.installDependencies();

      expect(require('child_process').spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        expect.objectContaining({
          cwd: config.path
        })
      );
    });

    it('should handle stdio options based on progress setting', async () => {
      await generator.installDependencies();

      expect(require('child_process').spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        expect.objectContaining({
          stdio: 'pipe' // progress is enabled
        })
      );

      // Test with progress disabled
      options.progress = false;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      jest.clearAllMocks();
      await generator.installDependencies();

      expect(require('child_process').spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        expect.objectContaining({
          stdio: 'inherit'
        })
      );
    });
  });

  describe('initializeGit()', () => {
    it('should initialize git repository with initial commit', async () => {
      await generator.initializeGit();

      expectCommandCalled('git', ['init']);
      expectCommandCalled('git', ['add', '.']);
      expectCommandCalled('git', ['commit', '-m', 'Initial commit from DNA CLI']);
    });

    it('should skip git initialization in dry run mode', async () => {
      options.dryRun = true;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      await generator.initializeGit();

      expect(require('child_process').spawn).not.toHaveBeenCalled();
    });

    it('should run git commands in correct directory', async () => {
      await generator.initializeGit();

      const spawnCalls = require('child_process').spawn.mock.calls;
      spawnCalls.forEach((call: any[]) => {
        expect(call[2]).toEqual(expect.objectContaining({
          cwd: config.path
        }));
      });
    });

    it('should handle git command failures', async () => {
      processMock.teardown();
      processMock = createFailingProcessMock();

      await expect(generator.initializeGit()).rejects.toThrow();
    });
  });

  describe('finalize()', () => {
    it('should create DNA configuration file', async () => {
      const expectedConfig = {
        template: config.template,
        framework: config.framework,
        modules: config.dnaModules,
        generated: expect.any(String),
        version: '0.1.0'
      };

      await generator.finalize();

      expect(fsMock.mockFs.writeJSON).toHaveBeenCalledWith(
        `${config.path}/dna.config.json`,
        expectedConfig,
        { spaces: 2 }
      );
    });

    it('should skip finalization in dry run mode', async () => {
      options.dryRun = true;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      await generator.finalize();

      expect(fsMock.mockFs.writeJSON).not.toHaveBeenCalled();
    });

    it('should include correct timestamp in config', async () => {
      const beforeTime = new Date();
      await generator.finalize();
      const afterTime = new Date();

      const writeJSONCall = fsMock.mockFs.writeJSON.mock.calls[0];
      const configData = writeJSONCall?.[1] as any;
      const generatedTime = new Date(configData.generated);

      expect(generatedTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(generatedTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('rollback()', () => {
    it('should remove created directory', async () => {
      fsMock.mockFs.pathExists.mockResolvedValue(true);

      await generator.rollback();

      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(config.path);
    });

    it('should restore backup if it exists', async () => {
      // Simulate backup creation
      options.overwrite = true;
      options.backup = true;
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      fsMock.mockFs.pathExists.mockImplementation((path: string) => {
        if (path === config.path) return Promise.resolve(true);
        if (path.includes('.backup.')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      // First create backup
      await generator.prepareDirectory();
      
      // Then rollback
      await generator.rollback();

      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(config.path);
      expect(fsMock.mockFs.move).toHaveBeenCalledWith(
        expect.stringMatching(/\.backup\.\d+$/),
        config.path
      );
    });

    it('should handle rollback errors gracefully', async () => {
      const mockLogger = createMockLogger();
      jest.doMock('../../utils/logger', () => ({ logger: mockLogger }));

      fsMock.mockFs.remove.mockRejectedValue(new Error('Permission denied'));

      await expect(generator.rollback()).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to rollback changes:',
        expect.any(Error)
      );
    });

    it('should not restore backup if it does not exist', async () => {
      fsMock.mockFs.pathExists.mockImplementation((path: string) => {
        if (path === config.path) return Promise.resolve(true);
        return Promise.resolve(false); // No backup exists
      });

      await generator.rollback();

      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(config.path);
      expect(fsMock.mockFs.move).not.toHaveBeenCalled();
    });
  });

  describe('Framework-specific file generation', () => {
    it('should generate Next.js specific files', async () => {
      config.framework = SupportedFramework.NEXTJS;
      config.template = 'ai-saas';
      mockRegistry.getTemplate.mockReturnValue(mockAISaasTemplate);
      (generator as any).registry = mockRegistry;

      const templateEngine = {
        instantiateTemplate: jest.fn().mockResolvedValue({ success: true, errors: [] })
      };
      jest.doMock('@dna/core', () => ({
        TemplateInstantiationEngine: jest.fn(() => templateEngine),
        TemplateType: { AI_SAAS: 'ai-saas' },
        SupportedFramework: { NEXTJS: 'nextjs' }
      }));

      await generator.generateFiles();

      expect(templateEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: SupportedFramework.NEXTJS,
          type: 'ai-saas'
        }),
        expect.any(Object)
      );
    });

    it('should generate Flutter specific files', async () => {
      config.framework = SupportedFramework.FLUTTER;
      config.template = 'flutter-universal';
      mockRegistry.getTemplate.mockReturnValue({
        ...mockAISaasTemplate,
        framework: SupportedFramework.FLUTTER,
        type: 'flutter-universal' as any
      });
      (generator as any).registry = mockRegistry;

      const templateEngine = {
        instantiateTemplate: jest.fn().mockResolvedValue({ success: true, errors: [] })
      };
      jest.doMock('@dna/core', () => ({
        TemplateInstantiationEngine: jest.fn(() => templateEngine),
        TemplateType: { FLUTTER_UNIVERSAL: 'flutter-universal' },
        SupportedFramework: { FLUTTER: 'flutter' }
      }));

      await generator.generateFiles();

      expect(templateEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: SupportedFramework.FLUTTER
        }),
        expect.any(Object)
      );
    });
  });

  describe('DNA Module integration', () => {
    it('should pass DNA modules to template engine', async () => {
      config.dnaModules = ['auth-jwt', 'payment-stripe', 'ai-openai'];
      mockRegistry.getTemplate.mockReturnValue(mockAISaasTemplate);
      (generator as any).registry = mockRegistry;

      const templateEngine = {
        instantiateTemplate: jest.fn().mockResolvedValue({ success: true, errors: [] })
      };
      jest.doMock('@dna/core', () => ({
        TemplateInstantiationEngine: jest.fn(() => templateEngine),
        TemplateType: { AI_SAAS: 'ai-saas' },
        SupportedFramework: { NEXTJS: 'nextjs' }
      }));

      await generator.generateFiles();

      expect(templateEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai']
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error scenarios', () => {
    it('should handle template engine instantiation errors', async () => {
      jest.doMock('@dna/core', () => ({
        TemplateInstantiationEngine: jest.fn(() => {
          throw new Error('Engine initialization failed');
        })
      }));

      // Re-create generator to pick up the new mock
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      await expect(generator.generateFiles()).rejects.toThrow(
        'Engine initialization failed'
      );
    });

    it('should handle file system errors during preparation', async () => {
      fsMock.mockFs.ensureDir.mockRejectedValue(new Error('Permission denied'));

      await expect(generator.prepareDirectory()).rejects.toThrow('Permission denied');
    });

    it('should handle missing template path validation', async () => {
      config.path = '';
      generator = new ProjectGenerator(config, options, mockProgressTracker);

      await expect(generator.installDependencies()).rejects.toThrow(
        'Project path is not defined'
      );
    });
  });

  describe('Progress tracking integration', () => {
    it('should update progress tracker during generation', async () => {
      mockRegistry.getTemplate.mockReturnValue(mockBasicTypescriptTemplate);
      (generator as any).registry = mockRegistry;

      // Mock the full flow
      await generator.validateConfiguration();
      await generator.prepareDirectory();
      await generator.generateFiles();
      await generator.installDependencies();
      await generator.initializeGit();
      await generator.finalize();

      // Verify progress tracker was called
      expect(mockProgressTracker.start).toHaveBeenCalled();
      expect(mockProgressTracker.update).toHaveBeenCalled();
      expect(mockProgressTracker.succeed).toHaveBeenCalled();
    });

    it('should handle progress tracker errors gracefully', async () => {
      mockProgressTracker.update.mockImplementation(() => {
        throw new Error('Progress update failed');
      });

      // Should not break the generation process
      await expect(generator.prepareDirectory()).resolves.not.toThrow();
    });
  });

  describe('Configuration validation edge cases', () => {
    it('should handle templates with no requirements', async () => {
      const template = {
        ...mockBasicTypescriptTemplate,
        requirements: {}
      };
      mockRegistry.getTemplate.mockReturnValue(template);
      (generator as any).registry = mockRegistry;

      await expect(generator.validateConfiguration()).resolves.not.toThrow();
    });

    it('should handle templates with undefined requirements', async () => {
      const template = {
        ...mockBasicTypescriptTemplate,
        requirements: undefined as any
      };
      mockRegistry.getTemplate.mockReturnValue(template);
      (generator as any).registry = mockRegistry;

      await expect(generator.validateConfiguration()).resolves.not.toThrow();
    });
  });
});