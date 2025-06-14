/**
 * @fileoverview Unit tests for TemplateRegistry
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

// Mock fs-extra before importing TemplateRegistry
const mockFs = {
  pathExists: jest.fn() as jest.MockedFunction<any>,
  readdir: jest.fn() as jest.MockedFunction<any>,
  stat: jest.fn() as jest.MockedFunction<any>,
  readJSON: jest.fn() as jest.MockedFunction<any>,
};

jest.mock('fs-extra', () => mockFs);

import { TemplateRegistry } from '../template-registry';
import { TemplateMetadata, TemplateFilterOptions } from '../../types/cli';
import { SupportedFramework, TemplateType } from '@dna/core';
import {
  FileSystemMock,
  createBasicProjectStructure,
  createEmptyFileSystem
} from '../../test-utils/file-system-mock';
import {
  allMockTemplates,
  mockAISaasTemplate,
  mockFlutterTemplate,
  mockBasicTypescriptTemplate,
  createTestTemplate
} from '../../test-utils/template-fixtures';
import { setupTestEnvironment, teardownTestEnvironment } from '../../test-utils/test-helpers';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;
  let fsMock: FileSystemMock;

  beforeEach(() => {
    setupTestEnvironment();
    fsMock = createBasicProjectStructure();
    fsMock.setup();
    
    // Setup fs-extra mocks
    mockFs.pathExists.mockResolvedValue(true);
    mockFs.readdir.mockResolvedValue(['ai-native', 'foundation']);
    mockFs.stat.mockImplementation((...args: any[]) => ({
      isDirectory: () => !args[0].includes('.json')
    }));
    
    // Mock template.json files
    mockFs.readJSON.mockImplementation((...args: any[]) => {
      const filePath = args[0];
      if (filePath.includes('ai-saas')) {
        return Promise.resolve({
          id: 'ai-saas',
          name: 'AI SaaS Application',
          description: 'AI-powered SaaS application template',
          type: 'ai-saas',
          framework: 'nextjs',
          version: '1.0.0',
          author: 'DNA Templates',
          tags: ['ai', 'saas', 'nextjs'],
          dnaModules: ['auth-jwt', 'ai-openai'],
          requirements: { node: '>=18.0.0' },
          features: ['Authentication', 'AI Integration', 'Database'],
          complexity: 'intermediate',
          estimatedSetupTime: 8,
          rating: 4.7,
          downloadCount: 1500
        });
      } else if (filePath.includes('basic-typescript')) {
        return Promise.resolve({
          id: 'basic-typescript',
          name: 'Basic TypeScript Project',
          description: 'Simple TypeScript project template',
          type: 'foundation',
          framework: 'typescript',
          version: '1.0.0',
          author: 'DNA Templates',
          tags: ['typescript', 'basic'],
          dnaModules: [],
          requirements: { node: '>=18.0.0' },
          features: ['TypeScript', 'ESLint', 'Prettier'],
          complexity: 'beginner',
          estimatedSetupTime: 3,
          rating: 4.2,
          downloadCount: 800
        });
      }
      return Promise.reject(new Error('Template not found'));
    });
    
    // Mock template directory structure
    jest.spyOn(mockFs, 'readdir')
      .mockResolvedValueOnce(['ai-native', 'foundation']) // Root categories
      .mockResolvedValueOnce(['ai-saas']) // ai-native templates
      .mockResolvedValueOnce(['basic-typescript']); // foundation templates
    
    registry = new TemplateRegistry();
  });

  afterEach(() => {
    teardownTestEnvironment();
    fsMock.teardown();
    jest.clearAllMocks();
    
    // Reset fs-extra mocks
    mockFs.pathExists.mockReset();
    mockFs.readdir.mockReset();
    mockFs.stat.mockReset();
    mockFs.readJSON.mockReset();
  });

  describe('load()', () => {
    it('should successfully load templates from directory structure', async () => {
      await registry.load();
      const templates = registry.getTemplates();
      
      expect(templates).toHaveLength(2);
      expect(templates.find(t => t.id === 'ai-saas')).toBeDefined();
      expect(templates.find(t => t.id === 'basic-typescript')).toBeDefined();
    });

    it('should handle missing templates directory gracefully', async () => {
      const emptyFs = createEmptyFileSystem();
      emptyFs.setup();
      
      const emptyRegistry = new TemplateRegistry();
      await emptyRegistry.load();
      
      expect(emptyRegistry.getTemplates()).toHaveLength(0);
      emptyFs.teardown();
    });

    it('should skip invalid template directories', async () => {
      // Add invalid template directory
      fsMock.addDirectory('templates/invalid/broken-template');
      fsMock.addFile('templates/invalid/broken-template/invalid.json', '{ invalid json');
      
      await registry.load();
      const templates = registry.getTemplates();
      
      // Should still load valid templates, skip invalid ones
      expect(templates).toHaveLength(2);
    });

    it('should generate metadata for templates without template.json', async () => {
      // Add template directory without template.json
      fsMock.addDirectory('templates/test/no-metadata-template');
      fsMock.addFile('templates/test/no-metadata-template/README.md', '# Test');
      
      await registry.load();
      const templates = registry.getTemplates();
      
      const generatedTemplate = templates.find(t => t.id === 'test-no-metadata-template');
      expect(generatedTemplate).toBeDefined();
      expect(generatedTemplate!.name).toBe('No Metadata Template');
      expect(generatedTemplate!.description).toContain('A test template');
    });

    it('should validate required fields in template.json', async () => {
      // Add template with invalid metadata
      fsMock.addDirectory('templates/invalid/incomplete-template');
      fsMock.addFile('templates/invalid/incomplete-template/template.json', JSON.stringify({
        name: 'Incomplete Template'
        // Missing required fields: description, type, framework, version
      }));
      
      await registry.load();
      const templates = registry.getTemplates();
      
      // Should not include the invalid template
      expect(templates.find(t => t.name === 'Incomplete Template')).toBeUndefined();
    });

    it('should sort templates by rating and name', async () => {
      // Add templates with different ratings
      const template1 = {
        id: 'high-rated',
        name: 'High Rated Template',
        description: 'Template with high rating',
        type: 'foundation',
        framework: 'typescript',
        version: '1.0.0',
        rating: 4.8
      };
      
      const template2 = {
        id: 'low-rated',
        name: 'Low Rated Template',
        description: 'Template with low rating',
        type: 'foundation',
        framework: 'typescript',
        version: '1.0.0',
        rating: 3.2
      };
      
      fsMock.addDirectory('templates/test/high-rated');
      fsMock.addFile('templates/test/high-rated/template.json', JSON.stringify(template1));
      
      fsMock.addDirectory('templates/test/low-rated');
      fsMock.addFile('templates/test/low-rated/template.json', JSON.stringify(template2));
      
      await registry.load();
      const templates = registry.getTemplates();
      
      // High rated template should come first
      const highRatedIndex = templates.findIndex(t => t.rating === 4.8);
      const lowRatedIndex = templates.findIndex(t => t.rating === 3.2);
      
      expect(highRatedIndex).toBeLessThan(lowRatedIndex);
    });
  });

  describe('getTemplate()', () => {
    beforeEach(async () => {
      await registry.load();
    });

    it('should return template by ID', async () => {
      await registry.load();
      const template = registry.getTemplate('ai-saas');
      expect(template).toBeDefined();
      expect(template!.name).toBe('AI SaaS Application');
    });

    it('should return undefined for non-existent template', () => {
      const template = registry.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('searchTemplates()', () => {
    beforeEach(async () => {
      // Create registry with mock templates for better search testing
      const searchRegistry = new TemplateRegistry();
      jest.spyOn(searchRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (searchRegistry as any).templates = allMockTemplates;
      });
      jest.spyOn(searchRegistry as any, 'sortTemplates').mockImplementation(() => {
        (searchRegistry as any).initializeFuzzySearch();
      });
      
      await searchRegistry.load();
      registry = searchRegistry;
    });

    it('should return all templates for empty query', () => {
      const results = registry.searchTemplates('');
      expect(results).toHaveLength(allMockTemplates.length);
    });

    it('should search by template name', () => {
      const results = registry.searchTemplates('AI SaaS');
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('ai-saas');
    });

    it('should search by description', () => {
      const results = registry.searchTemplates('cross-platform');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.framework === SupportedFramework.FLUTTER)).toBe(true);
    });

    it('should search by tags', () => {
      const results = registry.searchTemplates('typescript');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.tags.includes('typescript'))).toBe(true);
    });

    it('should search by features', () => {
      const results = registry.searchTemplates('authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.features.some(f => f.toLowerCase().includes('auth')))).toBe(true);
    });

    it('should use fuzzy search by default', () => {
      // Test with slight misspelling
      const results = registry.searchTemplates('AI Saas'); // Missing capital S
      expect(results.length).toBeGreaterThan(0);
    });

    it('should fallback to basic search when fuzzy search fails', () => {
      // Mock Fuse.js to return null to force fallback
      const originalFuseInstance = (registry as any).fuseInstance;
      (registry as any).fuseInstance = null;
      
      const results = registry.searchTemplates('AI SaaS', false);
      expect(results.length).toBeGreaterThan(0);
      
      // Restore
      (registry as any).fuseInstance = originalFuseInstance;
    });
  });

  describe('filterByFramework()', () => {
    beforeEach(async () => {
      const filterRegistry = new TemplateRegistry();
      jest.spyOn(filterRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (filterRegistry as any).templates = allMockTemplates;
      });
      await filterRegistry.load();
      registry = filterRegistry;
    });

    it('should filter templates by framework', () => {
      const nextjsTemplates = registry.filterByFramework('nextjs');
      expect(nextjsTemplates.every(t => t.framework === SupportedFramework.NEXTJS)).toBe(true);
    });

    it('should be case insensitive', () => {
      const flutterTemplates = registry.filterByFramework('FLUTTER');
      expect(flutterTemplates.every(t => t.framework === SupportedFramework.FLUTTER)).toBe(true);
    });

    it('should return empty array for unknown framework', () => {
      const results = registry.filterByFramework('unknown-framework');
      expect(results).toHaveLength(0);
    });
  });

  describe('filterByComplexity()', () => {
    beforeEach(async () => {
      const complexityRegistry = new TemplateRegistry();
      jest.spyOn(complexityRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (complexityRegistry as any).templates = allMockTemplates;
      });
      await complexityRegistry.load();
      registry = complexityRegistry;
    });

    it('should filter templates by complexity level', () => {
      const beginnerTemplates = registry.filterByComplexity('beginner');
      expect(beginnerTemplates.every(t => t.complexity === 'beginner')).toBe(true);
    });

    it('should return correct templates for each complexity level', () => {
      const intermediateTemplates = registry.filterByComplexity('intermediate');
      const advancedTemplates = registry.filterByComplexity('advanced');
      
      expect(intermediateTemplates.length).toBeGreaterThan(0);
      expect(advancedTemplates.length).toBeGreaterThan(0);
      expect(intermediateTemplates.every(t => t.complexity === 'intermediate')).toBe(true);
      expect(advancedTemplates.every(t => t.complexity === 'advanced')).toBe(true);
    });
  });

  describe('filterByType()', () => {
    beforeEach(async () => {
      const typeRegistry = new TemplateRegistry();
      jest.spyOn(typeRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (typeRegistry as any).templates = allMockTemplates;
      });
      await typeRegistry.load();
      registry = typeRegistry;
    });

    it('should filter templates by type', () => {
      const aiSaasTemplates = registry.filterByType(TemplateType.AI_SAAS);
      expect(aiSaasTemplates.every(t => t.type === TemplateType.AI_SAAS)).toBe(true);
    });

    it('should return templates for different types', () => {
      const foundationTemplates = registry.filterByType(TemplateType.FOUNDATION);
      const flutterTemplates = registry.filterByType(TemplateType.FLUTTER_UNIVERSAL);
      
      expect(foundationTemplates.length).toBeGreaterThan(0);
      expect(flutterTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('filterByDnaModule()', () => {
    beforeEach(async () => {
      const moduleRegistry = new TemplateRegistry();
      jest.spyOn(moduleRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (moduleRegistry as any).templates = allMockTemplates;
      });
      await moduleRegistry.load();
      registry = moduleRegistry;
    });

    it('should filter templates by DNA module', () => {
      const authTemplates = registry.filterByDnaModule('auth-jwt');
      expect(authTemplates.every(t => t.dnaModules.includes('auth-jwt'))).toBe(true);
    });

    it('should return empty array for non-existent module', () => {
      const results = registry.filterByDnaModule('non-existent-module');
      expect(results).toHaveLength(0);
    });
  });

  describe('filterByTag()', () => {
    beforeEach(async () => {
      const tagRegistry = new TemplateRegistry();
      jest.spyOn(tagRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (tagRegistry as any).templates = allMockTemplates;
      });
      await tagRegistry.load();
      registry = tagRegistry;
    });

    it('should filter templates by tag', () => {
      const aiTemplates = registry.filterByTag('ai');
      expect(aiTemplates.every(t => t.tags.includes('ai'))).toBe(true);
    });

    it('should return empty array for non-existent tag', () => {
      const results = registry.filterByTag('non-existent-tag');
      expect(results).toHaveLength(0);
    });
  });

  describe('filterTemplates()', () => {
    beforeEach(async () => {
      const filterRegistry = new TemplateRegistry();
      jest.spyOn(filterRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (filterRegistry as any).templates = allMockTemplates;
      });
      await filterRegistry.load();
      registry = filterRegistry;
    });

    it('should apply single filter', () => {
      const options: TemplateFilterOptions = {
        framework: SupportedFramework.NEXTJS
      };
      
      const results = registry.filterTemplates(options);
      expect(results.every(t => t.framework === SupportedFramework.NEXTJS)).toBe(true);
    });

    it('should apply multiple filters', () => {
      const options: TemplateFilterOptions = {
        framework: SupportedFramework.NEXTJS,
        type: TemplateType.AI_SAAS,
        complexity: 'intermediate'
      };
      
      const results = registry.filterTemplates(options);
      expect(results.every(t => 
        t.framework === SupportedFramework.NEXTJS && 
        t.type === TemplateType.AI_SAAS && 
        t.complexity === 'intermediate'
      )).toBe(true);
    });

    it('should filter by DNA modules (any match)', () => {
      const options: TemplateFilterOptions = {
        dnaModules: ['auth-jwt', 'payment-stripe']
      };
      
      const results = registry.filterTemplates(options);
      expect(results.every(t => 
        t.dnaModules.includes('auth-jwt') || t.dnaModules.includes('payment-stripe')
      )).toBe(true);
    });

    it('should filter by tags (any match)', () => {
      const options: TemplateFilterOptions = {
        tags: ['ai', 'typescript']
      };
      
      const results = registry.filterTemplates(options);
      expect(results.every(t => 
        t.tags.includes('ai') || t.tags.includes('typescript')
      )).toBe(true);
    });

    it('should filter by maximum setup time', () => {
      const options: TemplateFilterOptions = {
        maxSetupTime: 5
      };
      
      const results = registry.filterTemplates(options);
      expect(results.every(t => t.estimatedSetupTime <= 5)).toBe(true);
    });

    it('should filter by minimum rating', () => {
      const options: TemplateFilterOptions = {
        minRating: 4.0
      };
      
      const results = registry.filterTemplates(options);
      expect(results.every(t => t.rating && t.rating >= 4.0)).toBe(true);
    });

    it('should combine search query with other filters', () => {
      const options: TemplateFilterOptions = {
        query: 'AI',
        framework: SupportedFramework.NEXTJS
      };
      
      const results = registry.filterTemplates(options);
      expect(results.every(t => t.framework === SupportedFramework.NEXTJS)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array when no templates match all filters', () => {
      const options: TemplateFilterOptions = {
        framework: SupportedFramework.FLUTTER,
        type: TemplateType.AI_SAAS, // No Flutter AI SaaS templates in mock data
      };
      
      const results = registry.filterTemplates(options);
      expect(results).toHaveLength(0);
    });
  });

  describe('getTemplatesByCategory()', () => {
    beforeEach(async () => {
      const categoryRegistry = new TemplateRegistry();
      jest.spyOn(categoryRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (categoryRegistry as any).templates = allMockTemplates;
      });
      await categoryRegistry.load();
      registry = categoryRegistry;
    });

    it('should group templates by category', () => {
      const categories = registry.getTemplatesByCategory();
      
      expect(categories['AI Native']).toBeDefined();
      expect(categories['Cross Platform']).toBeDefined();
      expect(categories['Foundation']).toBeDefined();
    });

    it('should correctly categorize templates', () => {
      const categories = registry.getTemplatesByCategory();
      
      // AI Native category should contain AI SaaS and Business Apps templates
      const aiNativeTemplates = categories['AI Native'];
      expect(aiNativeTemplates?.some(t => t.type === TemplateType.AI_SAAS)).toBe(true);
      expect(aiNativeTemplates?.some(t => t.type === TemplateType.BUSINESS_APPS)).toBe(true);
      
      // Cross Platform category should contain Flutter templates
      const crossPlatformTemplates = categories['Cross Platform'];
      expect(crossPlatformTemplates?.some(t => t.type === TemplateType.FLUTTER_UNIVERSAL)).toBe(true);
    });

    it('should not create empty categories', () => {
      const categories = registry.getTemplatesByCategory();
      
      Object.values(categories).forEach(categoryTemplates => {
        expect(categoryTemplates.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAvailableFrameworks()', () => {
    beforeEach(async () => {
      const frameworkRegistry = new TemplateRegistry();
      jest.spyOn(frameworkRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (frameworkRegistry as any).templates = allMockTemplates;
      });
      await frameworkRegistry.load();
      registry = frameworkRegistry;
    });

    it('should return unique list of frameworks', () => {
      const frameworks = registry.getAvailableFrameworks();
      
      expect(frameworks).toContain(SupportedFramework.NEXTJS);
      expect(frameworks).toContain('typescript'); // Use string since TYPESCRIPT enum doesn't exist
      
      // Should not contain duplicates
      expect(new Set(frameworks).size).toBe(frameworks.length);
    });
  });

  describe('getAvailableComplexities()', () => {
    beforeEach(async () => {
      const complexityRegistry = new TemplateRegistry();
      jest.spyOn(complexityRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (complexityRegistry as any).templates = allMockTemplates;
      });
      await complexityRegistry.load();
      registry = complexityRegistry;
    });

    it('should return unique list of complexity levels', () => {
      const complexities = registry.getAvailableComplexities();
      
      expect(complexities).toContain('beginner');
      expect(complexities).toContain('intermediate');
      expect(complexities).toContain('advanced');
      
      // Should not contain duplicates
      expect(new Set(complexities).size).toBe(complexities.length);
    });
  });

  describe('getAvailableDnaModules()', () => {
    beforeEach(async () => {
      const moduleRegistry = new TemplateRegistry();
      jest.spyOn(moduleRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (moduleRegistry as any).templates = allMockTemplates;
      });
      await moduleRegistry.load();
      registry = moduleRegistry;
    });

    it('should return sorted unique list of DNA modules', () => {
      const modules = registry.getAvailableDnaModules();
      
      expect(modules).toContain('auth-jwt');
      expect(modules).toContain('payment-stripe');
      expect(modules).toContain('ai-openai');
      
      // Should be sorted
      const sortedModules = [...modules].sort();
      expect(modules).toEqual(sortedModules);
      
      // Should not contain duplicates
      expect(new Set(modules).size).toBe(modules.length);
    });
  });

  describe('getAvailableTags()', () => {
    beforeEach(async () => {
      const tagRegistry = new TemplateRegistry();
      jest.spyOn(tagRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (tagRegistry as any).templates = allMockTemplates;
      });
      await tagRegistry.load();
      registry = tagRegistry;
    });

    it('should return sorted unique list of tags', () => {
      const tags = registry.getAvailableTags();
      
      expect(tags).toContain('ai');
      expect(tags).toContain('typescript');
      expect(tags).toContain('flutter');
      
      // Should be sorted
      const sortedTags = [...tags].sort();
      expect(tags).toEqual(sortedTags);
      
      // Should not contain duplicates
      expect(new Set(tags).size).toBe(tags.length);
    });
  });

  describe('getRecommendedTemplates()', () => {
    beforeEach(async () => {
      const recommendedRegistry = new TemplateRegistry();
      jest.spyOn(recommendedRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (recommendedRegistry as any).templates = allMockTemplates;
      });
      await recommendedRegistry.load();
      registry = recommendedRegistry;
    });

    it('should return templates with rating >= 4.0', () => {
      const recommended = registry.getRecommendedTemplates();
      
      expect(recommended.every(t => t.rating && t.rating >= 4.0)).toBe(true);
    });

    it('should limit results to specified count', () => {
      const recommended = registry.getRecommendedTemplates(2);
      expect(recommended.length).toBeLessThanOrEqual(2);
    });

    it('should sort by rating (highest first)', () => {
      const recommended = registry.getRecommendedTemplates();
      
      for (let i = 1; i < recommended.length; i++) {
        const current = recommended[i]!.rating || 0;
        const previous = recommended[i - 1]!.rating || 0;
        expect(current).toBeLessThanOrEqual(previous);
      }
    });
  });

  describe('getPopularTemplates()', () => {
    beforeEach(async () => {
      const popularRegistry = new TemplateRegistry();
      jest.spyOn(popularRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (popularRegistry as any).templates = allMockTemplates;
      });
      await popularRegistry.load();
      registry = popularRegistry;
    });

    it('should return templates with download count > 0', () => {
      const popular = registry.getPopularTemplates();
      
      expect(popular.every(t => t.downloadCount && t.downloadCount > 0)).toBe(true);
    });

    it('should limit results to specified count', () => {
      const popular = registry.getPopularTemplates(2);
      expect(popular.length).toBeLessThanOrEqual(2);
    });

    it('should sort by download count (highest first)', () => {
      const popular = registry.getPopularTemplates();
      
      for (let i = 1; i < popular.length; i++) {
        const current = popular[i]!.downloadCount || 0;
        const previous = popular[i - 1]!.downloadCount || 0;
        expect(current).toBeLessThanOrEqual(previous);
      }
    });
  });

  describe('update()', () => {
    beforeEach(async () => {
      await registry.load();
    });

    it('should simulate template registry update', async () => {
      const initialCount = registry.getTemplates().length;
      const updateInfo = await registry.update();
      
      expect(updateInfo.updated).toBe(true);
      expect(updateInfo.newTemplates).toBeGreaterThanOrEqual(0);
      expect(updateInfo.updatedTemplates).toBe(0); // Simulated value
      expect(updateInfo.changes).toBeInstanceOf(Array);
      expect(updateInfo.changes.length).toBeGreaterThan(0);
    });

    it('should update last update time', async () => {
      const beforeTime = await registry.getLastUpdateTime();
      await registry.update();
      const afterTime = await registry.getLastUpdateTime();
      
      expect(afterTime).toBeGreaterThan(beforeTime);
    });
  });

  describe('Error handling', () => {
    it('should handle file system errors gracefully', async () => {
      const errorFs = createEmptyFileSystem();
      errorFs.setup();
      errorFs.mockFs.pathExists.mockRejectedValue(new Error('File system error'));
      
      const errorRegistry = new TemplateRegistry();
      
      // Should not throw, should initialize with empty registry
      await expect(errorRegistry.load()).resolves.not.toThrow();
      expect(errorRegistry.getTemplates()).toHaveLength(0);
      
      errorFs.teardown();
    });

    it('should handle JSON parsing errors', async () => {
      // Add template with invalid JSON
      fsMock.addDirectory('templates/broken/invalid-json');
      fsMock.addFile('templates/broken/invalid-json/template.json', '{ "name": "Invalid", invalid json }');
      
      await registry.load();
      
      // Should skip the invalid template and continue
      const templates = registry.getTemplates();
      expect(templates.find(t => t.name === 'Invalid')).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should initialize fuzzy search for large template sets', async () => {
      // Create registry with many templates
      const largeRegistry = new TemplateRegistry();
      const manyTemplates = Array.from({ length: 100 }, (_, i) => 
        createTestTemplate({ id: `template-${i}`, name: `Template ${i}` })
      );
      
      jest.spyOn(largeRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (largeRegistry as any).templates = manyTemplates;
      });
      
      await largeRegistry.load();
      
      // Fuzzy search should be initialized
      expect((largeRegistry as any).fuseInstance).toBeDefined();
    });

    it('should handle search on large template sets efficiently', async () => {
      const largeRegistry = new TemplateRegistry();
      const manyTemplates = Array.from({ length: 1000 }, (_, i) => 
        createTestTemplate({ 
          id: `template-${i}`, 
          name: `Template ${i}`,
          description: i % 10 === 0 ? 'Special AI template' : 'Regular template'
        })
      );
      
      jest.spyOn(largeRegistry as any, 'loadLocalTemplates').mockImplementation(async () => {
        (largeRegistry as any).templates = manyTemplates;
      });
      
      await largeRegistry.load();
      
      const startTime = Date.now();
      const results = largeRegistry.searchTemplates('AI');
      const endTime = Date.now();
      
      expect(results.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});