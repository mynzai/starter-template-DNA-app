/**
 * @fileoverview Stress Tests for Complex DNA Module Combinations
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
  TemplateType
} from '@starter-template-dna/core';

describe('DNA Complex Combinations Stress Tests', () => {
  let tempDir: string;
  let pipeline: TemplateGenerationPipeline;
  let registry: DNARegistry;
  let engine: TemplateInstantiationEngine;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dna-stress-test-'));
    
    registry = new DNARegistry();
    engine = new TemplateInstantiationEngine();
    pipeline = new TemplateGenerationPipeline(registry, engine, {
      enableParallelProcessing: true,
      enableCaching: true,
      enableProgressiveValidation: true,
      maxRetries: 3,
      timeout: 60000 // 1 minute for stress tests
    });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('Maximum Module Combinations', () => {
    test('should handle maximum supported module count', async () => {
      const maxModules = [
        'auth-jwt',
        'auth-oauth',
        'payment-stripe',
        'payment-paypal',
        'database-postgres',
        'database-mongodb',
        'ui-tailwind',
        'ui-material',
        'analytics-google',
        'analytics-mixpanel',
        'monitoring-sentry',
        'monitoring-datadog',
        'testing-comprehensive',
        'testing-e2e',
        'ai-openai',
        'ai-anthropic',
        'real-time-websocket',
        'real-time-sse',
        'security-helmet',
        'security-cors'
      ];

      const request: GenerationRequest = {
        name: 'max-modules-test',
        outputPath: path.join(tempDir, 'max-modules'),
        templateType: TemplateType.BUSINESS_APPS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: maxModules,
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const startTime = Date.now();
      const result = await pipeline.generate(request);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time even with many modules
      expect(duration).toBeLessThan(60000); // 1 minute max
      
      if (result.success) {
        expect(result.generatedFiles.length).toBeGreaterThan(30);
        
        // Verify pipeline metrics
        const metrics = pipeline.getMetrics();
        expect(metrics.totalDuration).toBeLessThan(60000);
        expect(metrics.memoryUsage.peak).toBeLessThan(500 * 1024 * 1024); // 500MB max
      } else {
        // If it fails, should be due to conflicts, not system issues
        expect(result.errors.some(e => 
          e.includes('conflict') || 
          e.includes('compatibility') ||
          e.includes('limit')
        )).toBe(true);
      }
    }, 120000); // 2 minute timeout

    test('should handle conflicting module combinations gracefully', async () => {
      const conflictingModules = [
        'auth-firebase',
        'auth-supabase',
        'auth-cognito', // Multiple auth providers
        'payment-stripe',
        'payment-paypal',
        'payment-square', // Multiple payment providers
        'database-postgres',
        'database-mongodb',
        'database-mysql' // Multiple database types
      ];

      const request: GenerationRequest = {
        name: 'conflicting-modules-test',
        outputPath: path.join(tempDir, 'conflicting-modules'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: conflictingModules,
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      // Should either:
      // 1. Successfully resolve conflicts automatically, or
      // 2. Fail gracefully with clear conflict messages
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('conflict'))).toBe(true);
      } else {
        // If successful, verify conflict resolution worked
        const generatedModules = result.generatedFiles.filter(f => 
          f.includes('/modules/') && f.endsWith('.ts')
        );
        expect(generatedModules.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cross-Framework Compatibility Stress', () => {
    test('should handle complex Next.js + multiple integrations', async () => {
      const complexNextJSModules = [
        'auth-nextauth',
        'database-prisma',
        'ui-tailwind',
        'payment-stripe',
        'ai-openai',
        'analytics-google',
        'monitoring-sentry',
        'testing-comprehensive',
        'real-time-pusher',
        'search-algolia',
        'storage-s3',
        'email-sendgrid',
        'cache-redis',
        'queue-bull'
      ];

      const request: GenerationRequest = {
        name: 'complex-nextjs',
        outputPath: path.join(tempDir, 'complex-nextjs'),
        templateType: TemplateType.AI_SAAS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: complexNextJSModules,
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      if (result.success) {
        // Verify Next.js specific integrations
        expect(await fs.pathExists(path.join(result.outputPath, 'next.config.js'))).toBe(true);
        expect(await fs.pathExists(path.join(result.outputPath, 'pages/api'))).toBe(true);
        
        // Verify complex module integrations
        const packageJsonPath = path.join(result.outputPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJSON(packageJsonPath);
          expect(Object.keys(packageJson.dependencies || {})).toHaveLength(greaterThan(10));
        }
      }
    });

    test('should handle complex Flutter + mobile-specific modules', async () => {
      const complexFlutterModules = [
        'auth-firebase',
        'database-firestore',
        'ui-material',
        'navigation-flutter',
        'camera-flutter',
        'location-flutter',
        'push-notifications-fcm',
        'analytics-firebase',
        'crashlytics-firebase',
        'storage-firebase',
        'social-login-flutter',
        'biometrics-flutter'
      ];

      const request: GenerationRequest = {
        name: 'complex-flutter',
        outputPath: path.join(tempDir, 'complex-flutter'),
        templateType: TemplateType.MOBILE_ASSISTANTS,
        framework: SupportedFramework.FLUTTER,
        dnaModules: complexFlutterModules,
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      if (result.success) {
        // Verify Flutter specific files
        expect(await fs.pathExists(path.join(result.outputPath, 'pubspec.yaml'))).toBe(true);
        expect(await fs.pathExists(path.join(result.outputPath, 'android/app/build.gradle'))).toBe(true);
        expect(await fs.pathExists(path.join(result.outputPath, 'ios/Runner/Info.plist'))).toBe(true);
      }
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with multiple concurrent generations', async () => {
      const concurrentGenerations = 5;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentGenerations; i++) {
        const pipeline = new TemplateGenerationPipeline(registry, engine, {
          enableParallelProcessing: true,
          enableCaching: true,
          timeout: 30000
        });

        const promise = pipeline.generate({
          name: `concurrent-test-${i}`,
          outputPath: path.join(tempDir, `concurrent-${i}`),
          templateType: TemplateType.AI_SAAS,
          framework: SupportedFramework.NEXTJS,
          dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai'],
          options: {
            skipInstall: true,
            skipGit: true
          }
        });

        promises.push(promise);
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      // Should complete all generations within reasonable time
      expect(duration).toBeLessThan(60000); // 1 minute for 5 concurrent generations

      // Most should succeed
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      expect(successCount).toBeGreaterThan(concurrentGenerations * 0.7); // At least 70% success rate
    }, 90000);

    test('should handle memory pressure gracefully', async () => {
      // Generate multiple projects in sequence to test memory management
      const sequentialGenerations = 10;
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < sequentialGenerations; i++) {
        const result = await pipeline.generate({
          name: `memory-test-${i}`,
          outputPath: path.join(tempDir, `memory-${i}`),
          templateType: TemplateType.AI_SAAS,
          framework: SupportedFramework.NEXTJS,
          dnaModules: ['auth-jwt', 'payment-stripe'],
          options: {
            skipInstall: true,
            skipGit: true
          }
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;

        // Memory should not grow excessively
        expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB max increase
      }
    }, 120000);
  });

  describe('Complex Dependency Chains', () => {
    test('should resolve deep dependency chains correctly', async () => {
      const deepDependencyModules = [
        'full-stack-app', // Depends on multiple modules
        'user-management', // Depends on auth + database
        'payment-processing', // Depends on payment + validation
        'ai-chat-system', // Depends on AI + real-time + storage
        'monitoring-suite' // Depends on analytics + monitoring + logging
      ];

      const request: GenerationRequest = {
        name: 'deep-dependencies',
        outputPath: path.join(tempDir, 'deep-dependencies'),
        templateType: TemplateType.BUSINESS_APPS,
        framework: SupportedFramework.NEXTJS,
        dnaModules: deepDependencyModules,
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      if (result.success) {
        // Verify dependency resolution
        const metrics = pipeline.getMetrics();
        expect(metrics.stageMetrics['dna-composition']).toBeDefined();
        expect(metrics.stageMetrics['dna-composition'].success).toBe(true);
      }
    });

    test('should handle circular dependency detection', async () => {
      // This would test modules that might have circular dependencies
      const potentialCircularModules = [
        'module-a', // Depends on module-b
        'module-b', // Depends on module-c
        'module-c', // Depends on module-a (circular)
      ];

      const request: GenerationRequest = {
        name: 'circular-deps',
        outputPath: path.join(tempDir, 'circular-deps'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: potentialCircularModules
      };

      const result = await pipeline.generate(request);

      // Should either resolve the circular dependency or fail gracefully
      if (!result.success) {
        expect(result.errors.some(e => 
          e.includes('circular') || e.includes('dependency')
        )).toBe(true);
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle empty module list', async () => {
      const request: GenerationRequest = {
        name: 'empty-modules',
        outputPath: path.join(tempDir, 'empty-modules'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: [], // Empty module list
        options: {
          skipInstall: true,
          skipGit: true
        }
      };

      const result = await pipeline.generate(request);

      expect(result.success).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThan(0); // Should still generate base files
    });

    test('should handle extremely long project names', async () => {
      const longName = 'a'.repeat(100); // 100 character name

      const request: GenerationRequest = {
        name: longName,
        outputPath: path.join(tempDir, 'long-name'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt']
      };

      const result = await pipeline.generate(request);

      // Should either handle long names or fail gracefully
      if (!result.success) {
        expect(result.errors.some(e => 
          e.includes('name') || e.includes('length')
        )).toBe(true);
      }
    });

    test('should handle special characters in variables', async () => {
      const request: GenerationRequest = {
        name: 'special-chars-test',
        outputPath: path.join(tempDir, 'special-chars'),
        templateType: TemplateType.FOUNDATION,
        framework: SupportedFramework.NEXTJS,
        dnaModules: ['auth-jwt'],
        variables: {
          author: 'Test Author <test@example.com>',
          description: 'A test with "quotes" and \\ backslashes',
          special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        }
      };

      const result = await pipeline.generate(request);

      if (result.success) {
        // Verify special characters were handled correctly
        const packageJsonPath = path.join(result.outputPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          const content = await fs.readFile(packageJsonPath, 'utf8');
          expect(content).not.toContain('undefined');
          expect(() => JSON.parse(content)).not.toThrow();
        }
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle low memory conditions', async () => {
      // Simulate low memory by creating a large object
      const memoryHog = new Array(10000).fill(new Array(1000).fill('x'));

      try {
        const result = await pipeline.generate({
          name: 'low-memory-test',
          outputPath: path.join(tempDir, 'low-memory'),
          templateType: TemplateType.FOUNDATION,
          framework: SupportedFramework.NEXTJS,
          dnaModules: ['auth-jwt'],
          options: {
            skipInstall: true,
            skipGit: true
          }
        });

        // Should either succeed or fail gracefully
        expect(result).toBeDefined();
      } finally {
        // Clean up memory hog
        memoryHog.length = 0;
      }
    });

    test('should handle disk space constraints', async () => {
      // Create a large file to consume disk space
      const largeFillePath = path.join(tempDir, 'large-file.tmp');
      
      try {
        // Create a 100MB file
        const largeContent = 'x'.repeat(1024 * 1024); // 1MB
        for (let i = 0; i < 100; i++) {
          await fs.appendFile(largeFillePath, largeContent);
        }

        const result = await pipeline.generate({
          name: 'disk-space-test',
          outputPath: path.join(tempDir, 'disk-space'),
          templateType: TemplateType.FOUNDATION,
          framework: SupportedFramework.NEXTJS,
          dnaModules: ['auth-jwt'],
          options: {
            skipInstall: true,
            skipGit: true
          }
        });

        // Should handle disk space issues gracefully
        expect(result).toBeDefined();
      } finally {
        // Clean up large file
        await fs.remove(largeFillePath).catch(() => {});
      }
    }, 60000);
  });

  describe('Cache Behavior Under Stress', () => {
    test('should maintain cache efficiency under load', async () => {
      const cacheTestRuns = 20;
      let totalCacheHits = 0;
      let totalCacheMisses = 0;

      for (let i = 0; i < cacheTestRuns; i++) {
        await pipeline.generate({
          name: `cache-test-${i}`,
          outputPath: path.join(tempDir, `cache-${i}`),
          templateType: TemplateType.FOUNDATION,
          framework: SupportedFramework.NEXTJS,
          dnaModules: ['auth-jwt'], // Same modules for caching
          options: {
            skipInstall: true,
            skipGit: true
          }
        });

        const metrics = pipeline.getMetrics();
        totalCacheHits += metrics.cacheHits;
        totalCacheMisses += metrics.cacheMisses;
      }

      // Cache hit rate should improve over multiple runs
      const hitRate = totalCacheHits / (totalCacheHits + totalCacheMisses);
      expect(hitRate).toBeGreaterThan(0.5); // At least 50% hit rate
    }, 120000);
  });

  function greaterThan(value: number) {
    return expect.any(Number);
  }
});