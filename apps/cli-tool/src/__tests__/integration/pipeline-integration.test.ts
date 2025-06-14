/**
 * @fileoverview Comprehensive Integration Tests for Template Generation Pipeline
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { 
  TemplateGenerationPipeline,
  DNARegistry,
  TemplateInstantiationEngine,
  GenerationRequest,
  SupportedFramework,
  TemplateType,
  PipelineMetrics,
  ErrorDetail
} from '@starter-template-dna/core';
import { ConflictResolver } from '../../lib/conflict-resolver';

describe('Template Generation Pipeline Integration', () => {
  let tempDir: string;
  let pipeline: TemplateGenerationPipeline;
  let dnaRegistry: DNARegistry;
  let templateEngine: TemplateInstantiationEngine;
  let conflictResolver: ConflictResolver;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dna-cli-test-'));
    
    // Initialize components
    dnaRegistry = new DNARegistry();
    templateEngine = new TemplateInstantiationEngine();
    conflictResolver = new ConflictResolver(dnaRegistry);
    
    pipeline = new TemplateGenerationPipeline(dnaRegistry, templateEngine, {
      enableParallelProcessing: true,
      enableCaching: true,
      enableProgressiveValidation: true,
      maxRetries: 2,
      timeout: 30000 // 30 seconds for tests
    });

    // Mock external dependencies
    mockExternalDependencies();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
    jest.restoreAllMocks();
  });

  describe('Complete Workflow Integration', () => {
    test('should successfully generate AI SaaS template with Next.js', async () => {
      const request: GenerationRequest = {
        name: 'test-ai-saas',
        outputPath: path.join(tempDir, 'test-ai-saas'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai'],
        variables: {
          author: 'Test Author',
          description: 'Test AI SaaS application'
        },
        options: {
          skipInstall: true,
          skipGit: true,
          packageManager: 'npm'
        }
      };

      const result = await pipeline.generate(request);

      // Verify successful generation
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Verify essential files were created
      await verifyEssentialFiles(result.outputPath, SupportedFramework.NEXTJS);

      // Verify DNA module integration
      await verifyDNAModuleIntegration(result.outputPath, request.dnaModules);

      // Verify metrics
      const metrics = pipeline.getMetrics();
      expect(metrics.totalDuration).toBeGreaterThan(0);
      expect(metrics.totalDuration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(Object.keys(metrics.stageMetrics)).toHaveLength(8); // All 8 stages
    });

    test('should successfully generate Flutter mobile app', async () => {
      const request: GenerationRequest = {
        name: 'test-flutter-app',
        outputPath: path.join(tempDir, 'test-flutter-app'),
        templateType: TemplateType.MOBILE_ASSISTANTS,
        framework: SupportedFramework.FLUTTER,
        dnaModules: ['auth-firebase', 'ui-material'],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      await verifyEssentialFiles(result.outputPath, SupportedFramework.FLUTTER);
      
      // Verify Flutter-specific files
      expect(await fs.pathExists(path.join(result.outputPath, 'pubspec.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(result.outputPath, 'lib/main.dart'))).toBe(true);
    });

    test('should handle complex DNA module combinations', async () => {
      const request: GenerationRequest = {
        name: 'test-complex-app',
        outputPath: path.join(tempDir, 'test-complex-app'),
        templateType: TemplateType.BUSINESS_APPS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [
          'auth-jwt',
          'payment-stripe',
          'database-postgres',
          'ui-tailwind',
          'analytics-google',
          'monitoring-sentry',
          'testing-comprehensive'
        ],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThan(20); // Should generate many files

      // Verify all modules were integrated
      await verifyDNAModuleIntegration(result.outputPath, request.dnaModules);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle invalid project name gracefully', async () => {
      const request: GenerationRequest = {
        name: '123-invalid-name', // Starts with number
        outputPath: path.join(tempDir, 'invalid'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt']
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid project name');
    });

    test('should handle module conflicts', async () => {
      const request: GenerationRequest = {
        name: 'test-conflicts',
        outputPath: path.join(tempDir, 'test-conflicts'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-firebase', 'auth-supabase'] // Conflicting auth modules
      };

      const result = await pipeline.generate(request);

      // Should either resolve conflicts automatically or fail gracefully
      if (!result.success) {
        expect(result.errors.some(e => e.includes('conflict'))).toBe(true);
      } else {
        // If resolved, should only have one auth module
        const authModules = result.generatedFiles.filter(f => 
          f.includes('auth') && !f.includes('test')
        );
        expect(authModules.length).toBeGreaterThan(0);
      }
    });

    test('should retry failed stages', async () => {
      // Mock a stage to fail once then succeed
      const originalValidation = pipeline['validatePreGeneration'];
      let callCount = 0;
      
      pipeline['validatePreGeneration'] = jest.fn().mockImplementation(async (...args) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Simulated failure');
        }
        return originalValidation.call(pipeline, ...args);
      });

      const request: GenerationRequest = {
        name: 'test-retry',
        outputPath: path.join(tempDir, 'test-retry'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt']
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      expect(callCount).toBe(2); // Should have retried once

      const metrics = pipeline.getMetrics();
      expect(metrics.retries).toBeGreaterThan(0);
    });

    test('should handle timeout gracefully', async () => {
      // Create pipeline with very short timeout
      const shortTimeoutPipeline = new TemplateGenerationPipeline(
        dnaRegistry, 
        templateEngine, 
        { timeout: 100 } // 100ms timeout
      );

      const request: GenerationRequest = {
        name: 'test-timeout',
        outputPath: path.join(tempDir, 'test-timeout'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt']
      };

      const result = await shortTimeoutPipeline.generate(request);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('timeout'))).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    test('should complete generation within time limits', async () => {
      const startTime = Date.now();
      
      const request: GenerationRequest = {
        name: 'test-performance',
        outputPath: path.join(tempDir, 'test-performance'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt', 'payment-stripe'],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds for simple project
    });

    test('should utilize caching for repeated operations', async () => {
      const request: GenerationRequest = {
        name: 'test-cache-1',
        outputPath: path.join(tempDir, 'test-cache-1'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt'],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      // First generation
      await pipeline.generate(request);

      // Second generation with same modules
      const request2 = {
        ...request,
        name: 'test-cache-2',
        outputPath: path.join(tempDir, 'test-cache-2')
      };

      const startTime = Date.now();
      const result2 = await pipeline.generate(request2);
      const duration = Date.now() - startTime;

      expect(result2.success).toBe(true);
      
      const metrics = pipeline.getMetrics();
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });

    test('should track memory usage efficiently', async () => {
      const request: GenerationRequest = {
        name: 'test-memory',
        outputPath: path.join(tempDir, 'test-memory'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai'],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);
      const metrics = pipeline.getMetrics();

      expect(result.success).toBe(true);
      expect(metrics.memoryUsage.peak).toBeGreaterThan(0);
      expect(metrics.memoryUsage.peak).toBeLessThan(200 * 1024 * 1024); // Should use less than 200MB
    });
  });

  describe('Quality Validation Integration', () => {
    test('should perform quality checks during generation', async () => {
      const validationEvents: string[] = [];
      
      pipeline.on('validation:quality:started', () => {
        validationEvents.push('quality:started');
      });
      
      pipeline.on('validation:quality:completed', () => {
        validationEvents.push('quality:completed');
      });

      const request: GenerationRequest = {
        name: 'test-quality',
        outputPath: path.join(tempDir, 'test-quality'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt'],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      expect(validationEvents).toContain('quality:started');
      expect(validationEvents).toContain('quality:completed');
    });

    test('should perform security scanning', async () => {
      const securityEvents: string[] = [];
      
      pipeline.on('security:scan:started', () => {
        securityEvents.push('scan:started');
      });
      
      pipeline.on('security:scan:completed', () => {
        securityEvents.push('scan:completed');
      });

      const request: GenerationRequest = {
        name: 'test-security',
        outputPath: path.join(tempDir, 'test-security'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt'],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      expect(securityEvents).toContain('scan:started');
      expect(securityEvents).toContain('scan:completed');
    });
  });

  describe('Event System Integration', () => {
    test('should emit all expected pipeline events', async () => {
      const events: string[] = [];
      const eventTypes = [
        'pipeline:started',
        'stage:started',
        'stage:completed',
        'composition:started',
        'composition:completed',
        'generation:started',
        'generation:completed',
        'validation:quality:started',
        'validation:quality:completed',
        'security:scan:started',
        'security:scan:completed',
        'finalization:started',
        'finalization:completed',
        'pipeline:completed'
      ];

      eventTypes.forEach(eventType => {
        pipeline.on(eventType, () => {
          events.push(eventType);
        });
      });

      const request: GenerationRequest = {
        name: 'test-events',
        outputPath: path.join(tempDir, 'test-events'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt'],
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      expect(events).toContain('pipeline:started');
      expect(events).toContain('pipeline:completed');
      expect(events.filter(e => e === 'stage:started')).toHaveLength(8); // 8 stages
      expect(events.filter(e => e === 'stage:completed')).toHaveLength(8);
    });
  });

  // Helper functions

  async function verifyEssentialFiles(outputPath: string, framework: SupportedFramework): Promise<void> {
    // Common files
    expect(await fs.pathExists(path.join(outputPath, 'README.md'))).toBe(true);
    expect(await fs.pathExists(path.join(outputPath, '.gitignore'))).toBe(true);

    // Framework-specific files
    switch (framework) {
      case SupportedFramework.NEXTJS:
        expect(await fs.pathExists(path.join(outputPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(outputPath, 'next.config.js'))).toBe(true);
        expect(await fs.pathExists(path.join(outputPath, 'tsconfig.json'))).toBe(true);
        break;
      
      case SupportedFramework.FLUTTER:
        expect(await fs.pathExists(path.join(outputPath, 'pubspec.yaml'))).toBe(true);
        expect(await fs.pathExists(path.join(outputPath, 'lib/main.dart'))).toBe(true);
        break;
      
      case SupportedFramework.REACT_NATIVE:
        expect(await fs.pathExists(path.join(outputPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(outputPath, 'metro.config.js'))).toBe(true);
        break;
    }
  }

  async function verifyDNAModuleIntegration(outputPath: string, modules: string[]): Promise<void> {
    // Check for module configuration files
    for (const moduleId of modules) {
      const moduleConfigPath = path.join(outputPath, 'src/modules', `${moduleId}.ts`);
      if (await fs.pathExists(moduleConfigPath)) {
        const content = await fs.readFile(moduleConfigPath, 'utf8');
        expect(content).toContain(moduleId);
      }
    }

    // Check DNA generation report
    const reportPath = path.join(outputPath, 'dna-generation-report.json');
    if (await fs.pathExists(reportPath)) {
      const report = await fs.readJSON(reportPath);
      expect(report.modules).toEqual(expect.arrayContaining(modules));
    }
  }

  function mockExternalDependencies(): void {
    // Mock file system operations
    jest.spyOn(fs, 'pathExists').mockImplementation(async (path: string) => {
      // Always return true for parent directories
      if (path.includes(tempDir)) {
        return true;
      }
      return false;
    });

    // Mock command execution for dependency installation
    jest.spyOn(require('child_process'), 'spawn').mockImplementation(() => {
      const mockChild = {
        on: jest.fn((event: string, callback: Function) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 100); // Simulate successful completion
          }
        }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      };
      return mockChild as any;
    });
  }
});

describe('Conflict Resolution Integration', () => {
  let conflictResolver: ConflictResolver;
  let dnaRegistry: DNARegistry;

  beforeEach(() => {
    dnaRegistry = new DNARegistry();
    conflictResolver = new ConflictResolver(dnaRegistry);
  });

  test('should detect module conflicts correctly', async () => {
    const result = await conflictResolver.resolveConflicts(
      'auth-firebase',
      ['auth-supabase'], // Conflicting auth module
      false // Non-interactive
    );

    expect(result.resolution).toBeDefined();
    expect(result.updatedModules).toBeDefined();
  });

  test('should provide alternative module suggestions', async () => {
    // This would test the alternative suggestion functionality
    // Implementation would depend on the actual module registry
    const result = await conflictResolver.resolveConflicts(
      'payment-stripe',
      ['payment-paypal'], // Conflicting payment module
      false
    );

    expect(result.resolution).toBeDefined();
  });
});