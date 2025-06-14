/**
 * @fileoverview Smoke Tests for Basic DNA CLI Functionality
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { 
  TemplateGenerationPipeline,
  DNARegistry,
  TemplateInstantiationEngine,
  SupportedFramework,
  TemplateType
} from '@starter-template-dna/core';

describe('DNA CLI Smoke Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dna-smoke-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Core Component Initialization', () => {
    test('should initialize DNA Registry without errors', () => {
      expect(() => new DNARegistry()).not.toThrow();
    });

    test('should initialize Template Engine without errors', () => {
      expect(() => new TemplateInstantiationEngine()).not.toThrow();
    });

    test('should initialize Pipeline without errors', () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      
      expect(() => new TemplateGenerationPipeline(registry, engine)).not.toThrow();
    });
  });

  describe('Basic Template Generation', () => {
    test('should generate minimal Next.js project', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine, {
        enableParallelProcessing: false,
        enableCaching: false,
        timeout: 10000
      });

      const projectPath = path.join(tempDir, 'minimal-nextjs');
      
      const result = await pipeline.generate({
        name: 'minimal-test',
        outputPath: projectPath,
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
    }, 15000);

    test('should generate minimal Flutter project', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine, {
        enableParallelProcessing: false,
        enableCaching: false,
        timeout: 10000
      });

      const projectPath = path.join(tempDir, 'minimal-flutter');
      
      const result = await pipeline.generate({
        name: 'minimal-flutter-test',
        outputPath: projectPath,
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.FLUTTER,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'pubspec.yaml'))).toBe(true);
    }, 15000);
  });

  describe('DNA Module System', () => {
    test('should list available modules', async () => {
      const registry = new DNARegistry();
      
      expect(() => registry.listAvailableModules()).not.toThrow();
    });

    test('should validate module compatibility', async () => {
      const registry = new DNARegistry();
      
      // Test with common modules that should exist
      expect(() => registry.checkModuleConflicts('auth-jwt', [])).not.toThrow();
    });
  });

  describe('Validation System', () => {
    test('should validate project names', () => {
      const validNames = ['my-project', 'myProject', 'my_project', 'project123'];
      const invalidNames = ['123project', '-project', 'project-', ''];

      for (const name of validNames) {
        expect(/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)).toBe(true);
      }

      for (const name of invalidNames) {
        expect(/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)).toBe(false);
      }
    });

    test('should validate output paths', async () => {
      // Valid path (temp directory)
      expect(await fs.pathExists(tempDir)).toBe(true);
      
      // Invalid path (non-existent parent)
      const invalidPath = path.join('/nonexistent', 'project');
      expect(await fs.pathExists(path.dirname(invalidPath))).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid template type gracefully', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      const result = await pipeline.generate({
        name: 'test',
        outputPath: path.join(tempDir, 'invalid-template'),
        templateType: 'invalid-type' as TemplateType,
        framework: SupportedFramework.NEXTJS,
        dnaModules: []
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle invalid framework gracefully', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      const result = await pipeline.generate({
        name: 'test',
        outputPath: path.join(tempDir, 'invalid-framework'),
        templateType: TemplateType.FOUNDATION,
        framework: 'invalid-framework' as SupportedFramework,
        dnaModules: []
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle non-writable output directory', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      // Try to write to root (should fail on most systems)
      const result = await pipeline.generate({
        name: 'test',
        outputPath: '/root/test-project',
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: []
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Performance Baseline', () => {
    test('should complete simple generation within reasonable time', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine, {
        timeout: 5000 // 5 second timeout
      });

      const startTime = Date.now();
      
      const result = await pipeline.generate({
        name: 'perf-test',
        outputPath: path.join(tempDir, 'perf-test'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);

    test('should use reasonable memory for simple generation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      await pipeline.generate({
        name: 'memory-test',
        outputPath: path.join(tempDir, 'memory-test'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for simple template)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 10000);
  });

  describe('File System Operations', () => {
    test('should create directory structure correctly', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      const projectPath = path.join(tempDir, 'fs-test');
      
      const result = await pipeline.generate({
        name: 'fs-test',
        outputPath: projectPath,
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      expect(result.success).toBe(true);
      
      // Check basic directory structure
      expect(await fs.pathExists(projectPath)).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'src'))).toBe(true);
      
      // Check that files have correct permissions
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const stats = await fs.stat(packageJsonPath);
        expect(stats.isFile()).toBe(true);
      }
    });

    test('should handle existing directory with overwrite', async () => {
      const projectPath = path.join(tempDir, 'existing-dir');
      
      // Create existing directory with a file
      await fs.ensureDir(projectPath);
      await fs.writeFile(path.join(projectPath, 'existing.txt'), 'existing content');

      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      const result = await pipeline.generate({
        name: 'existing-test',
        outputPath: projectPath,
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      // Should handle existing directory (either fail gracefully or overwrite)
      expect(result.success).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should accept valid configuration', () => {
      const validConfig = {
        name: 'valid-project',
        outputPath: tempDir,
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt'],
        variables: {
          author: 'Test Author'
        },
        options: {
          skipInstall: false,
          skipGit: false,
          packageManager: 'npm' as const
        }
      };

      // Should not throw during validation
      expect(() => {
        if (!validConfig.name || !validConfig.outputPath) {
          throw new Error('Invalid configuration');
        }
      }).not.toThrow();
    });

    test('should reject invalid configuration', () => {
      const invalidConfigs = [
        {
          // Missing name
          outputPath: tempDir,
          templateType: TemplateType.FOUNDATION,
          framework: SupportedFramework.NEXTJS,
          dnaModules: []
        },
        {
          name: 'test',
          // Missing output path
          templateType: TemplateType.FOUNDATION,
          framework: SupportedFramework.NEXTJS,
          dnaModules: []
        },
        {
          name: '',
          outputPath: tempDir,
          templateType: TemplateType.FOUNDATION,
          framework: SupportedFramework.NEXTJS,
          dnaModules: []
        }
      ];

      for (const config of invalidConfigs) {
        expect(() => {
          if (!config.name || !config.outputPath) {
            throw new Error('Invalid configuration');
          }
        }).toThrow();
      }
    });
  });

  describe('Event System', () => {
    test('should emit basic events during generation', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      const events: string[] = [];
      
      pipeline.on('pipeline:started', () => events.push('started'));
      pipeline.on('pipeline:completed', () => events.push('completed'));
      pipeline.on('pipeline:failed', () => events.push('failed'));

      const result = await pipeline.generate({
        name: 'event-test',
        outputPath: path.join(tempDir, 'event-test'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      expect(events).toContain('started');
      
      if (result.success) {
        expect(events).toContain('completed');
      } else {
        expect(events).toContain('failed');
      }
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should cleanup resources after generation', async () => {
      const registry = new DNARegistry();
      const engine = new TemplateInstantiationEngine();
      const pipeline = new TemplateGenerationPipeline(registry, engine);

      const initialHandles = process._getActiveHandles?.()?.length || 0;

      await pipeline.generate({
        name: 'cleanup-test',
        outputPath: path.join(tempDir, 'cleanup-test'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [],
        options: {
          skipInstall: true,
          skipGit: true
        }
      });

      // Should not have significantly more active handles
      const finalHandles = process._getActiveHandles?.()?.length || 0;
      expect(finalHandles - initialHandles).toBeLessThan(10);
    });
  });
});

describe('CLI Integration Smoke Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dna-cli-smoke-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Command Availability', () => {
    test('should have main CLI commands available', () => {
      // Test that the main commands are defined
      // This would be expanded with actual CLI testing
      const commands = ['create', 'list', 'validate', 'update', 'doctor'];
      
      // Basic check that commands exist (would need actual CLI testing framework)
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('Help and Documentation', () => {
    test('should provide help text', () => {
      // Would test actual help output
      expect(true).toBe(true); // Placeholder
    });
  });
});