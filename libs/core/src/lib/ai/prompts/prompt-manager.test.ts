import { PromptManager } from './prompt-manager';
import { PromptCompiler } from './prompt-compiler';
import { 
  PromptTemplate, 
  PromptVariable,
  PromptExecutionResult,
  PromptExecutionContext,
  PromptSearchCriteria 
} from './prompt-template';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Prompt Management System', () => {
  const tempDir = path.join(__dirname, '.temp-prompt-test');
  let promptManager: PromptManager;

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  beforeEach(async () => {
    promptManager = new PromptManager({
      storageDirectory: tempDir,
      enableVersioning: true,
      maxVersionsPerTemplate: 5,
      enableMetrics: true
    });
    
    // Wait a bit for async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await promptManager.destroy();
    // Clean up temp files
    const files = await fs.readdir(tempDir);
    for (const file of files) {
      await fs.remove(path.join(tempDir, file));
    }
  });

  describe('PromptCompiler', () => {
    let compiler: PromptCompiler;

    beforeEach(() => {
      compiler = new PromptCompiler();
    });

    test('should compile simple template with variables', () => {
      const template: PromptTemplate = {
        id: 'test-1',
        name: 'Test Template',
        description: 'Test',
        category: 'test',
        template: 'Hello {{name}}, you are {{age}} years old.',
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'number', required: true }
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test',
        tags: [],
        metadata: {},
        isActive: true
      };

      const variables = { name: 'John', age: 25 };
      const result = compiler.compile(template, variables);
      
      expect(result).toBe('Hello John, you are 25 years old.');
    });

    test('should handle conditionals', () => {
      const template: PromptTemplate = {
        id: 'test-2',
        name: 'Conditional Template',
        description: 'Test',
        category: 'test',
        template: 'Hello {{name}}{{#if isPremium}}, welcome to Premium!{{/if}}',
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'isPremium', type: 'boolean', required: false }
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test',
        tags: [],
        metadata: {},
        isActive: true
      };

      const withPremium = compiler.compile(template, { name: 'John', isPremium: true });
      expect(withPremium).toBe('Hello John, welcome to Premium!');

      const withoutPremium = compiler.compile(template, { name: 'John', isPremium: false });
      expect(withoutPremium).toBe('Hello John');
    });

    test('should handle loops', () => {
      const template: PromptTemplate = {
        id: 'test-3',
        name: 'Loop Template',
        description: 'Test',
        category: 'test',
        template: 'Items: {{#each items}}{{@index}}: {{this}}{{/each}}',
        variables: [
          { name: 'items', type: 'array', required: true }
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test',
        tags: [],
        metadata: {},
        isActive: true
      };

      const variables = { items: ['Apple', 'Banana', 'Cherry'] };
      const result = compiler.compile(template, variables);
      
      expect(result).toBe('Items: 0: Apple1: Banana2: Cherry');
    });

    test('should validate variable types', () => {
      const template: PromptTemplate = {
        id: 'test-4',
        name: 'Validation Template',
        description: 'Test',
        category: 'test',
        template: 'Hello {{name}}, you are {{age}} years old.',
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'number', required: true }
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test',
        tags: [],
        metadata: {},
        isActive: true
      };

      const invalidVariables = { name: 'John', age: 'not-a-number' };
      const validation = compiler.validate(template, invalidVariables);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Variable 'age' must be a number, got string");
    });

    test('should handle default values', () => {
      const template: PromptTemplate = {
        id: 'test-5',
        name: 'Default Template',
        description: 'Test',
        category: 'test',
        template: 'Hello {{name}}, your role is {{role}}.',
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'role', type: 'string', required: false, defaultValue: 'user' }
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test',
        tags: [],
        metadata: {},
        isActive: true
      };

      const variables = { name: 'John' };
      const result = compiler.compile(template, variables);
      
      expect(result).toBe('Hello John, your role is user.');
    });

    test('should validate variable constraints', () => {
      const template: PromptTemplate = {
        id: 'test-6',
        name: 'Constraint Template',
        description: 'Test',
        category: 'test',
        template: 'Your code is {{code}}',
        variables: [
          { 
            name: 'code', 
            type: 'string', 
            required: true,
            validation: {
              pattern: '^[A-Z]{3}\\d{3}$',
              minLength: 6,
              maxLength: 6
            }
          }
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'test',
        tags: [],
        metadata: {},
        isActive: true
      };

      const invalidVariables = { code: 'abc123' }; // Lowercase letters
      const validation = compiler.validate(template, invalidVariables);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('does not match pattern'))).toBe(true);

      const validVariables = { code: 'ABC123' };
      const validValidation = compiler.validate(template, validVariables);
      expect(validValidation.isValid).toBe(true);
    });
  });

  describe('PromptManager', () => {
    test('should create a new template', async () => {
      const templateData = {
        name: 'Welcome Template',
        description: 'A template for welcoming users',
        category: 'greetings',
        template: 'Welcome {{name}} to our {{platform}}!',
        variables: [
          { name: 'name', type: 'string' as const, required: true },
          { name: 'platform', type: 'string' as const, required: true }
        ],
        createdBy: 'test-user',
        tags: ['welcome', 'greeting'],
        metadata: { audience: 'new-users' }
      };

      const template = await promptManager.createTemplate(templateData);

      expect(template.id).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.version).toBe('1.0.0');
      expect(template.isActive).toBe(true);
      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
    });

    test('should retrieve template by ID', async () => {
      const templateData = {
        name: 'Test Template',
        description: 'Test',
        category: 'test',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string' as const, required: true }],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      const created = await promptManager.createTemplate(templateData);
      const retrieved = await promptManager.getTemplate(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.name).toBe(templateData.name);
    });

    test('should update template and create new version', async () => {
      const templateData = {
        name: 'Original Template',
        description: 'Original description',
        category: 'test',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string' as const, required: true }],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      const original = await promptManager.createTemplate(templateData);
      
      const updated = await promptManager.updateTemplate(original.id, {
        description: 'Updated description',
        template: 'Hello {{name}}, welcome!'
      }, 'Added welcome message');

      expect(updated.version).toBe('1.0.1');
      expect(updated.description).toBe('Updated description');
      expect(updated.template).toBe('Hello {{name}}, welcome!');

      // Verify version was created
      const versions = await promptManager.getVersions(original.id);
      expect(versions).toHaveLength(2); // Initial + updated
      expect(versions.some(v => v.version === '1.0.1')).toBe(true);
    });

    test('should search templates by criteria', async () => {
      // Create multiple templates
      await promptManager.createTemplate({
        name: 'Email Template',
        description: 'For emails',
        category: 'communication',
        template: 'Email to {{recipient}}',
        variables: [{ name: 'recipient', type: 'string' as const, required: true }],
        createdBy: 'user1',
        tags: ['email', 'communication'],
        metadata: {}
      });

      await promptManager.createTemplate({
        name: 'SMS Template',
        description: 'For SMS',
        category: 'communication',
        template: 'SMS to {{phone}}',
        variables: [{ name: 'phone', type: 'string' as const, required: true }],
        createdBy: 'user2',
        tags: ['sms', 'communication'],
        metadata: {}
      });

      await promptManager.createTemplate({
        name: 'Report Template',
        description: 'For reports',
        category: 'reporting',
        template: 'Report: {{title}}',
        variables: [{ name: 'title', type: 'string' as const, required: true }],
        createdBy: 'user1',
        tags: ['report'],
        metadata: {}
      });

      // Search by category
      const communicationTemplates = await promptManager.searchTemplates({
        category: 'communication'
      });
      expect(communicationTemplates).toHaveLength(2);

      // Search by tags
      const emailTemplates = await promptManager.searchTemplates({
        tags: ['email']
      });
      expect(emailTemplates).toHaveLength(1);
      expect(emailTemplates[0].name).toBe('Email Template');

      // Search by query
      const smsTemplates = await promptManager.searchTemplates({
        query: 'SMS'
      });
      expect(smsTemplates).toHaveLength(1);

      // Search by creator
      const user1Templates = await promptManager.searchTemplates({
        createdBy: 'user1'
      });
      expect(user1Templates).toHaveLength(2);
    });

    test('should compile template with variables', async () => {
      const templateData = {
        name: 'Greeting Template',
        description: 'Greets users',
        category: 'greeting',
        template: 'Hello {{name}}, you have {{count}} messages.',
        variables: [
          { name: 'name', type: 'string' as const, required: true },
          { name: 'count', type: 'number' as const, required: true }
        ],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      const template = await promptManager.createTemplate(templateData);
      const compiled = await promptManager.compileTemplate(template.id, {
        name: 'Alice',
        count: 5
      });

      expect(compiled).toBe('Hello Alice, you have 5 messages.');
    });

    test('should validate template before creation', async () => {
      const invalidTemplateData = {
        name: '', // Invalid: empty name
        description: 'Test',
        category: 'test',
        template: 'Hello {{name}}',
        variables: [
          { name: 'name', type: 'string' as const, required: true },
          { name: 'name', type: 'number' as const, required: true } // Invalid: duplicate name
        ],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      await expect(promptManager.createTemplate(invalidTemplateData))
        .rejects.toThrow('Template validation failed');
    });

    test('should record and retrieve execution metrics', async () => {
      const templateData = {
        name: 'Metrics Template',
        description: 'For testing metrics',
        category: 'test',
        template: 'Test template {{value}}',
        variables: [{ name: 'value', type: 'string' as const, required: true }],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      const template = await promptManager.createTemplate(templateData);

      // Record some executions
      const executionResult: PromptExecutionResult = {
        context: {
          templateId: template.id,
          version: template.version,
          variables: { value: 'test' },
          provider: 'openai',
          model: 'gpt-4',
          executedAt: Date.now(),
          executedBy: 'test-user',
          metadata: {}
        },
        compiledPrompt: 'Test template test',
        response: 'Generated response',
        responseTime: 1500,
        tokenUsage: { prompt: 10, completion: 20, total: 30 },
        cost: 0.001,
        success: true
      };

      await promptManager.recordExecution(executionResult);

      // Get metrics
      const metrics = promptManager.getTemplateMetrics(template.id);
      
      expect(metrics).not.toBeNull();
      expect(metrics!.totalExecutions).toBe(1);
      expect(metrics!.successRate).toBe(1);
      expect(metrics!.avgResponseTime).toBe(1500);
      expect(metrics!.avgTokenUsage).toBe(30);
      expect(metrics!.avgCost).toBe(0.001);
    });

    test('should handle template versioning correctly', async () => {
      const templateData = {
        name: 'Versioned Template',
        description: 'Test versioning',
        category: 'test',
        template: 'Version 1: {{message}}',
        variables: [{ name: 'message', type: 'string' as const, required: true }],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      const template = await promptManager.createTemplate(templateData);
      
      // Update multiple times
      await promptManager.updateTemplate(template.id, {
        template: 'Version 2: {{message}}'
      }, 'Updated to version 2');

      await promptManager.updateTemplate(template.id, {
        template: 'Version 3: {{message}}'
      }, 'Updated to version 3');

      // Get specific version
      const version1 = await promptManager.getTemplate(template.id, '1.0.0');
      const version2 = await promptManager.getTemplate(template.id, '1.0.1');
      const latest = await promptManager.getTemplate(template.id);

      expect(version1!.template).toBe('Version 1: {{message}}');
      expect(version2!.template).toBe('Version 2: {{message}}');
      expect(latest!.template).toBe('Version 3: {{message}}');
      expect(latest!.version).toBe('1.0.2');

      // Check versions list
      const versions = await promptManager.getVersions(template.id);
      expect(versions).toHaveLength(3);
      expect(versions.map(v => v.version)).toEqual(['1.0.0', '1.0.1', '1.0.2']);
    });

    test('should delete template (mark as inactive)', async () => {
      const templateData = {
        name: 'Delete Test',
        description: 'Test deletion',
        category: 'test',
        template: 'To be deleted',
        variables: [],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      const template = await promptManager.createTemplate(templateData);
      const deleted = await promptManager.deleteTemplate(template.id);

      expect(deleted).toBe(true);

      const retrieved = await promptManager.getTemplate(template.id);
      expect(retrieved!.isActive).toBe(false);
    });

    test('should emit events for template operations', async () => {
      const events: any[] = [];
      
      promptManager.on('template:created', (data) => events.push({ type: 'created', data }));
      promptManager.on('template:updated', (data) => events.push({ type: 'updated', data }));
      promptManager.on('template:compiled', (data) => events.push({ type: 'compiled', data }));

      const templateData = {
        name: 'Event Test',
        description: 'Test events',
        category: 'test',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string' as const, required: true }],
        createdBy: 'test',
        tags: [],
        metadata: {}
      };

      const template = await promptManager.createTemplate(templateData);
      await promptManager.updateTemplate(template.id, { description: 'Updated' });
      await promptManager.compileTemplate(template.id, { name: 'World' });

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('created');
      expect(events[1].type).toBe('updated');
      expect(events[2].type).toBe('compiled');
    });

    test('should persist and load templates across manager instances', async () => {
      const templateData = {
        name: 'Persistence Test',
        description: 'Test persistence',
        category: 'test',
        template: 'Persistent template {{value}}',
        variables: [{ name: 'value', type: 'string' as const, required: true }],
        createdBy: 'test',
        tags: ['persistent'],
        metadata: {}
      };

      // Create template with first manager
      const template = await promptManager.createTemplate(templateData);
      await promptManager.destroy();

      // Create new manager and verify template is loaded
      const newManager = new PromptManager({
        storageDirectory: tempDir,
        enableVersioning: true,
        enableMetrics: true
      });

      // Wait for the new manager to initialize
      await new Promise(resolve => setTimeout(resolve, 200));

      const loaded = await newManager.getTemplate(template.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe(templateData.name);
      expect(loaded!.tags).toEqual(['persistent']);

      await newManager.destroy();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete template lifecycle', async () => {
      // Create template
      const template = await promptManager.createTemplate({
        name: 'Lifecycle Test',
        description: 'Complete lifecycle test',
        category: 'test',
        template: 'Hello {{name}}, your score is {{score}}/100.',
        variables: [
          { name: 'name', type: 'string' as const, required: true },
          { 
            name: 'score', 
            type: 'number' as const, 
            required: true,
            validation: { min: 0, max: 100 }
          }
        ],
        createdBy: 'test-user',
        tags: ['test', 'score'],
        metadata: { purpose: 'scoring' }
      });

      // Validate template
      const validation = await promptManager.validateTemplate(template);
      expect(validation.isValid).toBe(true);

      // Compile template
      const compiled = await promptManager.compileTemplate(template.id, {
        name: 'Alice',
        score: 95
      });
      expect(compiled).toBe('Hello Alice, your score is 95/100.');

      // Update template
      const updated = await promptManager.updateTemplate(template.id, {
        template: 'Hello {{name}}, your excellent score is {{score}}/100!'
      }, 'Made it more enthusiastic');

      // Record execution
      await promptManager.recordExecution({
        context: {
          templateId: template.id,
          version: updated.version,
          variables: { name: 'Alice', score: 95 },
          provider: 'openai',
          model: 'gpt-4',
          executedAt: Date.now(),
          executedBy: 'test-user',
          metadata: {}
        },
        compiledPrompt: compiled,
        response: 'Great job Alice!',
        responseTime: 1200,
        tokenUsage: { prompt: 15, completion: 8, total: 23 },
        cost: 0.0015,
        success: true
      });

      // Get metrics
      const metrics = promptManager.getTemplateMetrics(template.id);
      expect(metrics!.totalExecutions).toBe(1);
      expect(metrics!.successRate).toBe(1);

      // Search for template
      const searchResults = await promptManager.searchTemplates({
        tags: ['score'],
        category: 'test'
      });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe(template.id);

      // Get versions
      const versions = await promptManager.getVersions(template.id);
      expect(versions).toHaveLength(2);
    });
  });
});