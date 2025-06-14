/**
 * @fileoverview Integration tests for list command
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { Command } from 'commander';
import { listCommand } from '../list';
import {
  CLITestHarness,
  createMockCommand
} from '../../test-utils/cli-test-harness';
import {
  FileSystemMock,
  createBasicProjectStructure
} from '../../test-utils/file-system-mock';
import {
  allMockTemplates,
  mockAISaasTemplate,
  mockFlutterTemplate,
  mockBasicTypescriptTemplate,
  mockReactNativeTemplate
} from '../../test-utils/template-fixtures';
import {
  setupTestEnvironment,
  teardownTestEnvironment
} from '../../test-utils/test-helpers';
import { SupportedFramework, TemplateType } from '@dna/core';

// Mock core types
jest.mock('@dna/core', () => ({
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
    REACT_NATIVE_HYBRID: 'react-native-hybrid',
    BUSINESS_APPS: 'business-apps'
  }
}));

describe('List Command Integration Tests', () => {
  let program: Command;
  let fsMock: FileSystemMock;

  beforeEach(() => {
    setupTestEnvironment();
    
    // Setup file system with comprehensive template structure
    fsMock = createBasicProjectStructure();
    
    // Add more templates for comprehensive testing
    fsMock.addFile('templates/ai-native/business-apps/template.json', JSON.stringify({
      id: 'business-apps',
      name: 'Business Applications',
      description: 'Enterprise business application template',
      type: 'business-apps',
      framework: 'react-native',
      version: '1.0.0',
      author: 'DNA Templates',
      tags: ['business', 'enterprise'],
      dnaModules: ['auth-oauth'],
      requirements: {},
      features: ['Authentication', 'Business Logic'],
      complexity: 'intermediate',
      estimatedSetupTime: 12,
      rating: 4.2,
      downloadCount: 850
    }));

    fsMock.addFile('templates/cross-platform/flutter-universal/template.json', JSON.stringify({
      id: 'flutter-universal',
      name: 'Flutter Universal App',
      description: 'Cross-platform Flutter application',
      type: 'flutter-universal',
      framework: 'flutter',
      version: '2.0.0',
      author: 'DNA Templates',
      tags: ['flutter', 'cross-platform'],
      dnaModules: ['auth-firebase'],
      requirements: {},
      features: ['Cross-platform', 'Material Design'],
      complexity: 'advanced',
      estimatedSetupTime: 15,
      rating: 4.6,
      downloadCount: 1200
    }));

    fsMock.setup();
    
    // Create command instance
    program = createMockCommand();
    program.addCommand(listCommand);
  });

  afterEach(() => {
    teardownTestEnvironment();
    fsMock.teardown();
    jest.clearAllMocks();
  });

  describe('Basic template listing', () => {
    it('should list all available templates', async () => {
      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Available Templates:');
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
      CLITestHarness.expectOutput(result, 'Basic TypeScript Project');
      CLITestHarness.expectOutput(result, 'Business Applications');
      CLITestHarness.expectOutput(result, 'Flutter Universal App');
      CLITestHarness.expectOutput(result, 'Total:');
    });

    it('should show template counts in summary', async () => {
      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, /Total: \d+ template\(s\)/);
      CLITestHarness.expectOutput(result, 'Use "dna-cli create" to start');
    });

    it('should show helpful hints', async () => {
      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Use "dna-cli create"');
      CLITestHarness.expectOutput(result, 'Use "dna-cli list --detailed"');
    });

    it('should handle empty template registry', async () => {
      // Clear all templates
      fsMock.reset();
      fsMock.addDirectory('templates');

      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'No templates found');
    });
  });

  describe('Framework filtering', () => {
    it('should filter templates by Next.js framework', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'nextjs'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
      expect(result.stdout).not.toContain('Flutter Universal App');
      expect(result.stdout).not.toContain('Basic TypeScript Project');
    });

    it('should filter templates by Flutter framework', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'flutter'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Flutter Universal App');
      expect(result.stdout).not.toContain('AI SaaS Application');
    });

    it('should filter templates by TypeScript framework', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'typescript'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Basic TypeScript Project');
    });

    it('should filter templates by React Native framework', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'react-native'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Business Applications');
    });

    it('should show no results for unknown framework', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'unknown-framework'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'No templates found');
    });
  });

  describe('Template type filtering', () => {
    it('should filter templates by AI SaaS type', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--type',
        'ai-saas'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
      expect(result.stdout).not.toContain('Basic TypeScript Project');
    });

    it('should filter templates by foundation type', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--type',
        'foundation'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Basic TypeScript Project');
      expect(result.stdout).not.toContain('AI SaaS Application');
    });

    it('should filter templates by Flutter universal type', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--type',
        'flutter-universal'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Flutter Universal App');
    });
  });

  describe('Complexity filtering', () => {
    it('should filter templates by beginner complexity', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--complexity',
        'beginner'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Basic TypeScript Project');
      expect(result.stdout).not.toContain('AI SaaS Application');
    });

    it('should filter templates by intermediate complexity', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--complexity',
        'intermediate'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
      CLITestHarness.expectOutput(result, 'Business Applications');
      expect(result.stdout).not.toContain('Basic TypeScript Project');
    });

    it('should filter templates by advanced complexity', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--complexity',
        'advanced'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Flutter Universal App');
      expect(result.stdout).not.toContain('AI SaaS Application');
    });
  });

  describe('DNA module filtering', () => {
    it('should filter templates by single DNA module', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--dna',
        'auth-jwt'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
      expect(result.stdout).not.toContain('Basic TypeScript Project');
    });

    it('should filter templates by multiple DNA modules', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--dna',
        'auth-jwt,payment-stripe'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
    });

    it('should handle whitespace in DNA module lists', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--dna',
        ' auth-jwt , payment-stripe '
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
    });

    it('should show no results for non-existent DNA module', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--dna',
        'nonexistent-module'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'No templates found');
    });
  });

  describe('Search functionality', () => {
    it('should search templates by name', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--query',
        'AI SaaS'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
      expect(result.stdout).not.toContain('Basic TypeScript Project');
    });

    it('should search templates by description', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--query',
        'cross-platform'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Flutter Universal App');
    });

    it('should search templates by tags', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--query',
        'enterprise'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Business Applications');
    });

    it('should handle case-insensitive search', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--query',
        'flutter'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Flutter Universal App');
    });

    it('should show no results for non-matching search', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--query',
        'nonexistent-search-term'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'No templates found');
    });
  });

  describe('Category display', () => {
    it('should group templates by categories', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--categories'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Templates by Category:');
      CLITestHarness.expectOutput(result, 'AI Native');
      CLITestHarness.expectOutput(result, 'Foundation');
      CLITestHarness.expectOutput(result, 'Cross Platform');
    });

    it('should show template counts per category', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--categories'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, /AI Native.*\d+ template\(s\)/);
      CLITestHarness.expectOutput(result, /Foundation.*\d+ template\(s\)/);
    });

    it('should show category icons', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--categories'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, '🤖 AI Native');
      CLITestHarness.expectOutput(result, '🏗️ Foundation');
      CLITestHarness.expectOutput(result, '🌐 Cross Platform');
    });

    it('should combine categories with filtering', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--categories',
        '--complexity',
        'intermediate'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI Native');
      expect(result.stdout).not.toContain('Foundation'); // No intermediate foundation templates
    });
  });

  describe('Detailed display', () => {
    it('should show detailed template information', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--detailed'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Framework:');
      CLITestHarness.expectOutput(result, 'Complexity:');
      CLITestHarness.expectOutput(result, 'Setup time:');
      CLITestHarness.expectOutput(result, 'Rating:');
      CLITestHarness.expectOutput(result, 'Version:');
      CLITestHarness.expectOutput(result, 'Author:');
      CLITestHarness.expectOutput(result, 'DNA Modules:');
      CLITestHarness.expectOutput(result, 'Tags:');
      CLITestHarness.expectOutput(result, 'Features:');
    });

    it('should show download counts in detailed view', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--detailed'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Downloads:');
      CLITestHarness.expectOutput(result, '1,200'); // Flutter template download count
    });

    it('should show complexity icons in detailed view', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--detailed'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, '🟢'); // Beginner
      CLITestHarness.expectOutput(result, '🟡'); // Intermediate
      CLITestHarness.expectOutput(result, '🔴'); // Advanced
    });

    it('should truncate long feature lists in detailed view', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--detailed',
        '--framework',
        'nextjs'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Features:');
      // Should show first 3 features and "... and X more" if there are more
    });
  });

  describe('JSON output', () => {
    it('should output templates as JSON', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--json'
      ]);

      CLITestHarness.expectSuccess(result);
      
      // Should be valid JSON
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      
      const templates = JSON.parse(result.stdout);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      // Check structure of first template
      const firstTemplate = templates[0];
      expect(firstTemplate).toHaveProperty('id');
      expect(firstTemplate).toHaveProperty('name');
      expect(firstTemplate).toHaveProperty('description');
      expect(firstTemplate).toHaveProperty('framework');
      expect(firstTemplate).toHaveProperty('complexity');
    });

    it('should output filtered templates as JSON', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--json',
        '--framework',
        'nextjs'
      ]);

      CLITestHarness.expectSuccess(result);
      
      const templates = JSON.parse(result.stdout);
      expect(templates.every((t: any) => t.framework === 'nextjs')).toBe(true);
    });

    it('should output empty array for no matches in JSON', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--json',
        '--framework',
        'nonexistent'
      ]);

      CLITestHarness.expectSuccess(result);
      
      const templates = JSON.parse(result.stdout);
      expect(templates).toEqual([]);
    });

    it('should not show summary or hints in JSON mode', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--json'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(result.stdout).not.toContain('Total:');
      expect(result.stdout).not.toContain('Use "dna-cli create"');
    });
  });

  describe('Combined filtering', () => {
    it('should combine multiple filters', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'nextjs',
        '--complexity',
        'intermediate',
        '--type',
        'ai-saas'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
      expect(result.stdout).not.toContain('Basic TypeScript Project');
    });

    it('should show no results when filters exclude all templates', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'flutter',
        '--complexity',
        'beginner' // No beginner Flutter templates
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'No templates found');
    });

    it('should combine search with filtering', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--query',
        'app',
        '--framework',
        'flutter'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Flutter Universal App');
    });

    it('should combine categories with filtering', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--categories',
        '--framework',
        'nextjs'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'AI Native');
      expect(result.stdout).not.toContain('Foundation');
    });
  });

  describe('Display formatting', () => {
    it('should show template ratings with stars', async () => {
      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, '⭐ 4.7'); // AI SaaS rating
      CLITestHarness.expectOutput(result, '⭐ 4.6'); // Flutter rating
    });

    it('should show setup time estimates', async () => {
      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, '⏱️  8min'); // AI SaaS setup time
      CLITestHarness.expectOutput(result, '⏱️  15min'); // Flutter setup time
    });

    it('should show DNA modules with gene emoji', async () => {
      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, '🧬 auth-jwt');
      CLITestHarness.expectOutput(result, '🧬 auth-firebase');
    });

    it('should truncate DNA module lists in compact view', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'nextjs'
      ]);

      CLITestHarness.expectSuccess(result);
      // AI SaaS has multiple modules, should show truncation
      CLITestHarness.expectOutput(result, '+'); // Indicates more modules
    });

    it('should use separator lines in detailed view', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--detailed'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, '─'.repeat(80));
    });
  });

  describe('Color output', () => {
    it('should use colored output by default', async () => {
      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      // Colors are applied via chalk, which in test mode might not show ANSI codes
      // but we can verify the output contains the expected content
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
    });

    it('should disable colors when --no-color is used', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--no-color'
      ]);

      CLITestHarness.expectSuccess(result);
      // In a real implementation, this would affect chalk output
      CLITestHarness.expectOutput(result, 'Available Templates');
    });
  });

  describe('Error handling', () => {
    it('should handle template registry loading errors', async () => {
      // Mock fs error
      fsMock.mockFs.pathExists.mockRejectedValue(new Error('File system error'));

      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result); // Should handle gracefully
      CLITestHarness.expectOutput(result, 'No templates found');
    });

    it('should handle malformed template files', async () => {
      fsMock.addFile('templates/broken/invalid-template/template.json', 'invalid json');

      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      // Should skip invalid templates and show valid ones
      CLITestHarness.expectOutput(result, 'AI SaaS Application');
    });

    it('should handle missing template directories', async () => {
      fsMock.reset();
      fsMock.addDirectory('templates');

      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'No templates found');
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of templates efficiently', async () => {
      // Add many templates
      for (let i = 0; i < 100; i++) {
        fsMock.addFile(`templates/perf/template-${i}/template.json`, JSON.stringify({
          id: `template-${i}`,
          name: `Template ${i}`,
          description: `Performance test template ${i}`,
          type: 'foundation',
          framework: 'typescript',
          version: '1.0.0',
          author: 'Test',
          tags: ['test'],
          dnaModules: [],
          requirements: {},
          features: [],
          complexity: 'beginner',
          estimatedSetupTime: 1
        }));
      }

      const startTime = performance.now();
      const result = await CLITestHarness.runCommand(program, ['list']);
      const endTime = performance.now();

      CLITestHarness.expectSuccess(result);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      CLITestHarness.expectOutput(result, 'Template 99'); // Verify all templates loaded
    });

    it('should handle complex filtering efficiently', async () => {
      const startTime = performance.now();
      const result = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'nextjs',
        '--complexity',
        'intermediate',
        '--dna',
        'auth-jwt,payment-stripe',
        '--query',
        'SaaS',
        '--detailed'
      ]);
      const endTime = performance.now();

      CLITestHarness.expectSuccess(result);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Edge cases', () => {
    it('should handle templates with missing optional fields', async () => {
      fsMock.addFile('templates/minimal/basic-minimal/template.json', JSON.stringify({
        id: 'basic-minimal',
        name: 'Minimal Template',
        description: 'Minimal template with required fields only',
        type: 'foundation',
        framework: 'typescript',
        version: '1.0.0'
        // Missing optional fields like author, tags, etc.
      }));

      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Minimal Template');
    });

    it('should handle templates with very long names', async () => {
      const longName = 'Very Long Template Name That Exceeds Normal Display Width And Tests Text Wrapping';
      fsMock.addFile('templates/edge/long-name/template.json', JSON.stringify({
        id: 'long-name',
        name: longName,
        description: 'Template with very long name',
        type: 'foundation',
        framework: 'typescript',
        version: '1.0.0',
        author: 'Test',
        tags: [],
        dnaModules: [],
        requirements: {},
        features: [],
        complexity: 'beginner',
        estimatedSetupTime: 1
      }));

      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, longName);
    });

    it('should handle templates with special characters in names', async () => {
      const specialName = 'Template with "quotes" & symbols @#$%';
      fsMock.addFile('templates/edge/special-chars/template.json', JSON.stringify({
        id: 'special-chars',
        name: specialName,
        description: 'Template with special characters',
        type: 'foundation',
        framework: 'typescript',
        version: '1.0.0',
        author: 'Test',
        tags: [],
        dnaModules: [],
        requirements: {},
        features: [],
        complexity: 'beginner',
        estimatedSetupTime: 1
      }));

      const result = await CLITestHarness.runCommand(program, ['list']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, specialName);
    });
  });
});