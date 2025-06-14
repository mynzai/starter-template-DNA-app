/**
 * @fileoverview Unit tests for TemplateSelector
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { TemplateSelector } from '../template-selector';
import { TemplateRegistry } from '../template-registry';
import { TemplateMetadata } from '../../types/cli';
import {
  InquirerMock,
  setupInquirerMock,
  teardownInquirerMock,
  ResponseBuilders,
  ResponseSequences
} from '../../test-utils/inquirer-mock';
import {
  allMockTemplates,
  mockAISaasTemplate,
  mockFlutterTemplate,
  mockBasicTypescriptTemplate,
  createTestTemplate,
  createComplexTemplate,
  mockTemplateVariables
} from '../../test-utils/template-fixtures';
import { setupTestEnvironment, teardownTestEnvironment } from '../../test-utils/test-helpers';
import { SupportedFramework, TemplateType } from '@dna/core';

describe('TemplateSelector', () => {
  let selector: TemplateSelector;
  let mockRegistry: jest.Mocked<TemplateRegistry>;
  let inquirerMock: InquirerMock;

  beforeEach(() => {
    setupTestEnvironment();
    inquirerMock = setupInquirerMock();
    
    // Create mock registry
    mockRegistry = {
      getTemplates: jest.fn(),
      getTemplate: jest.fn(),
      searchTemplates: jest.fn(),
      filterTemplates: jest.fn(),
      getTemplatesByCategory: jest.fn(),
      getAvailableFrameworks: jest.fn(),
      getAvailableComplexities: jest.fn(),
      getAvailableDnaModules: jest.fn(),
      getAvailableTags: jest.fn(),
      getRecommendedTemplates: jest.fn(),
      getPopularTemplates: jest.fn(),
      filterByFramework: jest.fn(),
      filterByComplexity: jest.fn(),
      filterByType: jest.fn(),
      filterByDnaModule: jest.fn(),
      filterByTag: jest.fn(),
      load: jest.fn(),
      update: jest.fn(),
      getLastUpdateTime: jest.fn(),
    } as any;

    // Set default mock returns
    mockRegistry.getTemplates.mockReturnValue(allMockTemplates);
    mockRegistry.getAvailableFrameworks.mockReturnValue([
      SupportedFramework.NEXTJS,
      SupportedFramework.FLUTTER,
      SupportedFramework.REACT_NATIVE,
      SupportedFramework.TYPESCRIPT
    ]);
    mockRegistry.getAvailableComplexities.mockReturnValue(['beginner', 'intermediate', 'advanced']);
    mockRegistry.getAvailableDnaModules.mockReturnValue(['auth-jwt', 'payment-stripe', 'ai-openai']);
    mockRegistry.getAvailableTags.mockReturnValue(['ai', 'typescript', 'flutter', 'saas']);

    selector = new TemplateSelector(mockRegistry);
  });

  afterEach(() => {
    teardownTestEnvironment();
    teardownInquirerMock();
    jest.clearAllMocks();
  });

  describe('selectTemplate()', () => {
    it('should return null when no templates are available', async () => {
      mockRegistry.getTemplates.mockReturnValue([]);
      
      const result = await selector.selectTemplate();
      
      expect(result).toBeNull();
      expect(mockRegistry.getTemplates).toHaveBeenCalled();
    });

    it('should show all action options by default', async () => {
      inquirerMock.setResponses([
        { action: 'browse' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      await selector.selectTemplate();

      // Verify the action prompt was called with all options
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'action',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'browse' }),
            expect.objectContaining({ value: 'categories' }),
            expect.objectContaining({ value: 'search' }),
            expect.objectContaining({ value: 'filter' }),
            expect.objectContaining({ value: 'recommended' })
          ])
        })
      ]);
    });

    it('should respect selection options', async () => {
      inquirerMock.setResponses([
        { action: 'browse' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      await selector.selectTemplate({
        showCategories: false,
        showFilters: false,
        showRecommended: false,
        allowSearch: false
      });

      // Should only show browse option
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'action',
          choices: [
            expect.objectContaining({ value: 'browse' })
          ]
        })
      ]);
    });

    it('should handle browse action', async () => {
      inquirerMock.setResponses([
        { action: 'browse' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
    });

    it('should handle categories action', async () => {
      mockRegistry.getTemplatesByCategory.mockReturnValue({
        'AI Native': [mockAISaasTemplate],
        'Foundation': [mockBasicTypescriptTemplate]
      });

      inquirerMock.setResponses([
        { action: 'categories' },
        { selectedCategory: 'AI Native' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
      expect(mockRegistry.getTemplatesByCategory).toHaveBeenCalled();
    });

    it('should handle search action', async () => {
      mockRegistry.searchTemplates.mockReturnValue([mockAISaasTemplate]);

      inquirerMock.setResponses([
        { action: 'search' },
        { query: 'AI SaaS' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
      expect(mockRegistry.searchTemplates).toHaveBeenCalledWith('AI SaaS');
    });

    it('should handle filter action', async () => {
      mockRegistry.filterTemplates.mockReturnValue([mockAISaasTemplate]);

      inquirerMock.setResponses([
        { action: 'filter' },
        { selectedFramework: SupportedFramework.NEXTJS },
        { selectedComplexity: 'intermediate' },
        { selectedModules: ['auth-jwt'] },
        { maxSetupTime: 10 },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
      expect(mockRegistry.filterTemplates).toHaveBeenCalledWith({
        framework: SupportedFramework.NEXTJS,
        complexity: 'intermediate',
        dnaModules: ['auth-jwt'],
        maxSetupTime: 10
      });
    });

    it('should handle recommended action', async () => {
      mockRegistry.getRecommendedTemplates.mockReturnValue([mockAISaasTemplate]);

      inquirerMock.setResponses([
        { action: 'recommended' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
      expect(mockRegistry.getRecommendedTemplates).toHaveBeenCalled();
    });

    it('should return null when user cancels', async () => {
      inquirerMock.setResponses([
        { action: 'browse' },
        { selectedTemplate: 'ai-saas' },
        { confirm: false }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toBeNull();
    });
  });

  describe('browseTemplates()', () => {
    it('should limit results to maxResults', async () => {
      const manyTemplates = Array.from({ length: 50 }, (_, i) => 
        createTestTemplate({ id: `template-${i}`, name: `Template ${i}` })
      );
      mockRegistry.getTemplates.mockReturnValue(manyTemplates);

      inquirerMock.setResponses([
        { action: 'browse' },
        { selectedTemplate: 'template-0' },
        { confirm: true }
      ]);

      await selector.selectTemplate({ maxResults: 10 });

      // Should only show first 10 templates in the selection
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'selectedTemplate',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'template-0' }),
            expect.objectContaining({ value: 'template-9' })
          ])
        })
      ]);
    });
  });

  describe('selectByCategory()', () => {
    it('should handle empty categories', async () => {
      mockRegistry.getTemplatesByCategory.mockReturnValue({});

      inquirerMock.setResponses([
        { action: 'categories' }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toBeNull();
    });

    it('should show category template counts', async () => {
      mockRegistry.getTemplatesByCategory.mockReturnValue({
        'AI Native': [mockAISaasTemplate],
        'Foundation': [mockBasicTypescriptTemplate, createTestTemplate()]
      });

      inquirerMock.setResponses([
        { action: 'categories' },
        { selectedCategory: 'Foundation' },
        { selectedTemplate: 'basic-typescript' },
        { confirm: true }
      ]);

      await selector.selectTemplate();

      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'selectedCategory',
          choices: expect.arrayContaining([
            expect.objectContaining({ 
              name: 'AI Native (1 templates)',
              value: 'AI Native'
            }),
            expect.objectContaining({ 
              name: 'Foundation (2 templates)',
              value: 'Foundation'
            })
          ])
        })
      ]);
    });
  });

  describe('searchTemplates()', () => {
    it('should validate search input', async () => {
      inquirerMock.setResponses([
        { action: 'search' },
        { query: '   ' }, // Empty string after trim
        { query: 'AI SaaS' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      await selector.selectTemplate();

      // Verify validation was called
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'query',
          validate: expect.any(Function)
        })
      ]);
    });

    it('should handle no search results', async () => {
      mockRegistry.searchTemplates.mockReturnValue([]);

      inquirerMock.setResponses([
        { action: 'search' },
        { query: 'nonexistent' },
        { browseFallback: false }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toBeNull();
      expect(mockRegistry.searchTemplates).toHaveBeenCalledWith('nonexistent');
    });

    it('should offer to browse all templates when search fails', async () => {
      mockRegistry.searchTemplates.mockReturnValue([]);

      inquirerMock.setResponses([
        { action: 'search' },
        { query: 'nonexistent' },
        { browseFallback: true },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
    });
  });

  describe('filterTemplates()', () => {
    it('should collect all filter options', async () => {
      mockRegistry.filterTemplates.mockReturnValue([mockAISaasTemplate]);

      inquirerMock.setResponses([
        { action: 'filter' },
        { selectedFramework: SupportedFramework.NEXTJS },
        { selectedComplexity: 'intermediate' },
        { selectedModules: ['auth-jwt', 'payment-stripe'] },
        { maxSetupTime: 5 },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      await selector.selectTemplate();

      expect(mockRegistry.filterTemplates).toHaveBeenCalledWith({
        framework: SupportedFramework.NEXTJS,
        complexity: 'intermediate',
        dnaModules: ['auth-jwt', 'payment-stripe'],
        maxSetupTime: 5
      });
    });

    it('should handle "any" selections in filters', async () => {
      mockRegistry.filterTemplates.mockReturnValue([mockAISaasTemplate]);

      inquirerMock.setResponses([
        { action: 'filter' },
        { selectedFramework: null },
        { selectedComplexity: null },
        { selectedModules: [] },
        { maxSetupTime: null },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      await selector.selectTemplate();

      expect(mockRegistry.filterTemplates).toHaveBeenCalledWith({});
    });

    it('should handle no DNA modules available', async () => {
      mockRegistry.getAvailableDnaModules.mockReturnValue([]);
      mockRegistry.filterTemplates.mockReturnValue([mockBasicTypescriptTemplate]);

      inquirerMock.setResponses([
        { action: 'filter' },
        { selectedFramework: SupportedFramework.TYPESCRIPT },
        { selectedComplexity: 'beginner' },
        { maxSetupTime: null },
        { selectedTemplate: 'basic-typescript' },
        { confirm: true }
      ]);

      await selector.selectTemplate();

      // Should not prompt for DNA modules
      expect(mockRegistry.filterTemplates).toHaveBeenCalledWith({
        framework: SupportedFramework.TYPESCRIPT,
        complexity: 'beginner'
      });
    });

    it('should handle no filtered results', async () => {
      mockRegistry.filterTemplates.mockReturnValue([]);

      inquirerMock.setResponses([
        { action: 'filter' },
        { selectedFramework: SupportedFramework.NEXTJS },
        { selectedComplexity: 'advanced' },
        { selectedModules: [] },
        { maxSetupTime: null }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toBeNull();
    });
  });

  describe('selectRecommended()', () => {
    it('should fallback to browse when no recommended templates', async () => {
      mockRegistry.getRecommendedTemplates.mockReturnValue([]);

      inquirerMock.setResponses([
        { action: 'recommended' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
      expect(mockRegistry.getRecommendedTemplates).toHaveBeenCalled();
    });
  });

  describe('selectFromTemplateList()', () => {
    it('should return null for empty template list', async () => {
      inquirerMock.setResponses([
        { action: 'browse' }
      ]);

      mockRegistry.getTemplates.mockReturnValue([]);

      const result = await selector.selectTemplate();

      expect(result).toBeNull();
    });

    it('should auto-select and confirm single template', async () => {
      const singleTemplate = [mockAISaasTemplate];
      mockRegistry.getTemplates.mockReturnValue(singleTemplate);

      inquirerMock.setResponses([
        { action: 'browse' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
    });

    it('should handle user rejection of single template', async () => {
      const singleTemplate = [mockAISaasTemplate];
      mockRegistry.getTemplates.mockReturnValue(singleTemplate);

      inquirerMock.setResponses([
        { action: 'browse' },
        { confirm: false }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toBeNull();
    });

    it('should display template details with all information', async () => {
      const templateWithDetails = {
        ...mockAISaasTemplate,
        rating: 4.7,
        dnaModules: ['auth-jwt', 'payment-stripe'],
        features: ['Auth', 'Payments', 'AI', 'Database', 'UI', 'API'],
        tags: ['ai', 'saas', 'nextjs']
      };

      inquirerMock.setResponses([
        { action: 'browse' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      mockRegistry.getTemplates.mockReturnValue([templateWithDetails]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(templateWithDetails);
    });

    it('should handle template not found in list', async () => {
      inquirerMock.setResponses([
        { action: 'browse' },
        { selectedTemplate: 'nonexistent-template' },
        { confirm: true }
      ]);

      // Mock templates but selectedTemplate returns non-existent ID
      const result = await selector.selectTemplate();

      expect(result).toBeNull();
    });
  });

  describe('selectDnaModules()', () => {
    it('should return empty array for no available modules', async () => {
      const result = await selector.selectDnaModules([]);
      expect(result).toEqual([]);
    });

    it('should pre-select specified modules', async () => {
      inquirerMock.setResponses([
        { selectedModules: ['auth-jwt', 'payment-stripe'] }
      ]);

      const result = await selector.selectDnaModules(
        ['auth-jwt', 'payment-stripe', 'ai-openai'],
        ['auth-jwt', 'payment-stripe']
      );

      expect(result).toEqual(['auth-jwt', 'payment-stripe']);

      // Verify pre-selection
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'selectedModules',
          choices: expect.arrayContaining([
            expect.objectContaining({ 
              value: 'auth-jwt',
              checked: true
            }),
            expect.objectContaining({ 
              value: 'payment-stripe',
              checked: true
            }),
            expect.objectContaining({ 
              value: 'ai-openai',
              checked: false
            })
          ])
        })
      ]);
    });

    it('should handle user selecting different modules', async () => {
      inquirerMock.setResponses([
        { selectedModules: ['ai-openai'] }
      ]);

      const result = await selector.selectDnaModules(
        ['auth-jwt', 'payment-stripe', 'ai-openai'],
        ['auth-jwt']
      );

      expect(result).toEqual(['ai-openai']);
    });
  });

  describe('collectTemplateVariables()', () => {
    it('should return default variables when template has no custom variables', async () => {
      const template = createTestTemplate({ variables: [] });
      
      const result = await selector.collectTemplateVariables(template, 'my-project');

      expect(result).toEqual({
        projectName: 'my-project',
        projectNamePascal: 'MyProject',
        projectNameKebab: 'my-project',
        year: new Date().getFullYear().toString(),
        date: new Date().toISOString().split('T')[0]
      });
    });

    it('should collect required string variables', async () => {
      const template = createTestTemplate({
        variables: [
          {
            name: 'description',
            description: 'Project description',
            required: true,
            type: 'string'
          }
        ]
      });

      inquirerMock.setResponses([
        { description: 'My awesome project' }
      ]);

      const result = await selector.collectTemplateVariables(template, 'my-project');

      expect(result.description).toBe('My awesome project');
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'input',
          name: 'description',
          message: 'Project description'
        })
      ]);
    });

    it('should collect boolean variables', async () => {
      const template = createTestTemplate({
        variables: [
          {
            name: 'enableAnalytics',
            description: 'Enable analytics tracking',
            required: true,
            type: 'boolean',
            default: 'false'
          }
        ]
      });

      inquirerMock.setResponses([
        { enableAnalytics: true }
      ]);

      const result = await selector.collectTemplateVariables(template, 'my-project');

      expect(result.enableAnalytics).toBe('true');
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'enableAnalytics',
          message: 'Enable analytics tracking',
          default: 'false'
        })
      ]);
    });

    it('should collect select variables', async () => {
      const template = createTestTemplate({
        variables: [
          {
            name: 'databaseType',
            description: 'Database type to use',
            required: true,
            type: 'select',
            options: ['postgresql', 'mysql', 'sqlite']
          }
        ]
      });

      inquirerMock.setResponses([
        { databaseType: 'postgresql' }
      ]);

      const result = await selector.collectTemplateVariables(template, 'my-project');

      expect(result.databaseType).toBe('postgresql');
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'databaseType',
          message: 'Database type to use',
          choices: ['postgresql', 'mysql', 'sqlite']
        })
      ]);
    });

    it('should handle sensitive variables', async () => {
      const template = createTestTemplate({
        variables: [
          {
            name: 'apiKey',
            description: 'API key for external service',
            required: true,
            type: 'string',
            sensitive: true
          }
        ]
      });

      inquirerMock.setResponses([
        { shouldSet: true },
        { apiKey: 'secret-key-123' }
      ]);

      const result = await selector.collectTemplateVariables(template, 'my-project');

      expect(result.apiKey).toBe('secret-key-123');
      
      // Should first ask if user wants to set it
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'shouldSet',
          message: 'Set API key for external service now? (can be added later to environment)',
          default: false
        })
      ]);

      // Then ask for the value with password masking
      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'password',
          name: 'apiKey',
          mask: '*'
        })
      ]);
    });

    it('should skip sensitive variables when user declines', async () => {
      const template = createTestTemplate({
        variables: [
          {
            name: 'apiKey',
            description: 'API key for external service',
            required: true,
            type: 'string',
            sensitive: true
          }
        ]
      });

      inquirerMock.setResponses([
        { shouldSet: false }
      ]);

      const result = await selector.collectTemplateVariables(template, 'my-project');

      expect(result.apiKey).toBeUndefined();
    });

    it('should skip non-required variables that are already set', async () => {
      const template = createTestTemplate({
        variables: [
          {
            name: 'projectName', // Already set as default
            description: 'Project name',
            required: true,
            type: 'string'
          },
          {
            name: 'description',
            description: 'Project description',
            required: false,
            type: 'string'
          }
        ]
      });

      // Should not prompt for projectName since it's already in the default variables
      const result = await selector.collectTemplateVariables(template, 'my-project');

      expect(result.projectName).toBe('my-project');
      expect(require('inquirer').prompt).not.toHaveBeenCalled();
    });

    it('should use default values when provided', async () => {
      const template = createTestTemplate({
        variables: [
          {
            name: 'description',
            description: 'Project description',
            required: true,
            type: 'string',
            default: 'Default description'
          }
        ]
      });

      inquirerMock.setResponses([
        { description: 'Custom description' }
      ]);

      await selector.collectTemplateVariables(template, 'my-project');

      expect(require('inquirer').prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          default: 'Default description'
        })
      ]);
    });
  });

  describe('String conversion utilities', () => {
    it('should convert to PascalCase correctly', async () => {
      const template = createTestTemplate({ variables: [] });
      
      const result = await selector.collectTemplateVariables(template, 'my-awesome-project');

      expect(result.projectNamePascal).toBe('MyAwesomeProject');
    });

    it('should convert to kebab-case correctly', async () => {
      const template = createTestTemplate({ variables: [] });
      
      const result = await selector.collectTemplateVariables(template, 'MyAwesomeProject');

      expect(result.projectNameKebab).toBe('my-awesome-project');
    });

    it('should handle edge cases in string conversion', async () => {
      const template = createTestTemplate({ variables: [] });
      
      const result = await selector.collectTemplateVariables(template, 'project_with_underscores');

      expect(result.projectNamePascal).toBe('ProjectWithUnderscores');
      expect(result.projectNameKebab).toBe('project-with-underscores');
    });
  });

  describe('Display formatting', () => {
    it('should format template choices with all information', () => {
      const template = {
        ...mockAISaasTemplate,
        rating: 4.5,
        complexity: 'intermediate' as const,
        estimatedSetupTime: 8
      };

      // Access private method for testing
      const formatted = (selector as any).formatTemplateChoice(template);

      expect(formatted).toContain(template.name);
      expect(formatted).toContain(template.framework);
      expect(formatted).toContain('4.5');
      expect(formatted).toContain('8min');
      expect(formatted).toContain('🟡'); // intermediate complexity icon
      expect(formatted).toContain(template.description);
    });

    it('should get correct complexity icons', () => {
      const getIcon = (selector as any).getComplexityIcon.bind(selector);

      expect(getIcon('beginner')).toBe('🟢');
      expect(getIcon('intermediate')).toBe('🟡');
      expect(getIcon('advanced')).toBe('🔴');
      expect(getIcon('unknown')).toBe('⚪');
    });

    it('should display template details with proper formatting', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const template = {
        ...mockAISaasTemplate,
        rating: 4.7,
        dnaModules: ['auth-jwt', 'payment-stripe'],
        features: ['Auth', 'Payments', 'AI', 'Database'],
        tags: ['ai', 'saas']
      };

      (selector as any).displayTemplateDetails(template);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(template.name));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('auth-jwt'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auth'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('#ai'));
      
      consoleSpy.mockRestore();
    });

    it('should truncate long feature lists', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const template = {
        ...mockAISaasTemplate,
        features: Array.from({ length: 8 }, (_, i) => `Feature ${i + 1}`)
      };

      (selector as any).displayTemplateDetails(template);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('... and 3 more'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should handle registry errors gracefully', async () => {
      mockRegistry.getTemplates.mockImplementation(() => {
        throw new Error('Registry error');
      });

      await expect(selector.selectTemplate()).rejects.toThrow('Registry error');
    });

    it('should handle inquirer prompt errors', async () => {
      jest.spyOn(require('inquirer'), 'prompt').mockRejectedValue(new Error('Prompt error'));

      await expect(selector.selectTemplate()).rejects.toThrow('Prompt error');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete template selection workflow', async () => {
      mockRegistry.getTemplatesByCategory.mockReturnValue({
        'AI Native': [mockAISaasTemplate, mockFlutterTemplate]
      });

      inquirerMock.setResponses([
        { action: 'categories' },
        { selectedCategory: 'AI Native' },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
      expect(mockRegistry.getTemplatesByCategory).toHaveBeenCalled();
    });

    it('should handle complex filtering workflow', async () => {
      mockRegistry.filterTemplates.mockReturnValue([mockAISaasTemplate]);

      inquirerMock.setResponses([
        { action: 'filter' },
        { selectedFramework: SupportedFramework.NEXTJS },
        { selectedComplexity: 'intermediate' },
        { selectedModules: ['auth-jwt', 'ai-openai'] },
        { maxSetupTime: 10 },
        { selectedTemplate: 'ai-saas' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockAISaasTemplate);
      expect(mockRegistry.filterTemplates).toHaveBeenCalledWith({
        framework: SupportedFramework.NEXTJS,
        complexity: 'intermediate',
        dnaModules: ['auth-jwt', 'ai-openai'],
        maxSetupTime: 10
      });
    });

    it('should handle search with fallback workflow', async () => {
      mockRegistry.searchTemplates.mockReturnValue([]);

      inquirerMock.setResponses([
        { action: 'search' },
        { query: 'nonexistent' },
        { browseFallback: true },
        { selectedTemplate: 'basic-typescript' },
        { confirm: true }
      ]);

      const result = await selector.selectTemplate();

      expect(result).toEqual(mockBasicTypescriptTemplate);
    });
  });
});