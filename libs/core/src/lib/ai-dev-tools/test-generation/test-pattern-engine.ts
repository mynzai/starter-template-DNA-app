/**
 * @fileoverview Test Pattern Engine
 * Manages test patterns and templates for different frameworks and languages
 */

import { EventEmitter } from 'events';
import {
  TestPattern,
  TestFramework,
  SupportedTestLanguage,
  TestType,
  TestPatternCategory,
  TestPatternVariable
} from './types';

export class TestPatternEngine extends EventEmitter {
  private patterns: Map<string, TestPattern> = new Map();
  private templates: Map<string, string> = new Map();
  private initialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadTestPatterns();
      await this.loadTemplates();
      this.initialized = true;
      this.emit('engine:initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('engine:error', { error: errorMessage });
      throw error;
    }
  }

  async getPattern(framework: TestFramework, patternName: string): Promise<TestPattern> {
    const key = `${framework}:${patternName}`;
    const pattern = this.patterns.get(key);
    
    if (!pattern) {
      throw new Error(`Pattern not found: ${key}`);
    }
    
    return pattern;
  }

  async getTemplate(framework: TestFramework, language: SupportedTestLanguage, templateType: string): Promise<string> {
    const key = `${framework}:${language}:${templateType}`;
    const template = this.templates.get(key);
    
    if (!template) {
      // Fallback to language-agnostic template
      const fallbackKey = `${framework}:${templateType}`;
      return this.templates.get(fallbackKey) || this.getDefaultTemplate(templateType);
    }
    
    return template;
  }

  renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    // Simple template variable replacement
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, this.formatVariable(value));
    }
    
    // Handle conditional blocks
    rendered = this.processConditionals(rendered, variables);
    
    // Handle loops
    rendered = this.processLoops(rendered, variables);
    
    return rendered;
  }

  getPatternsByCategory(category: TestPatternCategory, framework?: TestFramework): TestPattern[] {
    return Array.from(this.patterns.values()).filter(pattern => {
      const matchesCategory = pattern.category === category;
      const matchesFramework = !framework || pattern.framework === framework;
      return matchesCategory && matchesFramework;
    });
  }

  getPatternsByLanguage(language: SupportedTestLanguage, framework?: TestFramework): TestPattern[] {
    return Array.from(this.patterns.values()).filter(pattern => {
      const matchesLanguage = pattern.language === language;
      const matchesFramework = !framework || pattern.framework === framework;
      return matchesLanguage && matchesFramework;
    });
  }

  private async loadTestPatterns(): Promise<void> {
    // Jest patterns
    this.addPattern({
      id: 'jest-basic-function-test',
      name: 'Basic Function Test',
      description: 'Basic unit test for a function',
      language: 'javascript',
      framework: 'jest',
      pattern: `test('{{testName}}', () => {
  {{#if setup}}
  // Setup
  {{setup}}
  {{/if}}
  
  // Act
  const result = {{functionName}}({{#each parameters}}{{this.value}}{{#unless @last}}, {{/unless}}{{/each}});
  
  // Assert
  expect(result).{{assertion}};
});`,
      variables: [
        { name: 'testName', type: 'string', description: 'Name of the test', required: true },
        { name: 'functionName', type: 'string', description: 'Name of function to test', required: true },
        { name: 'parameters', type: 'array', description: 'Function parameters', required: false, defaultValue: [] },
        { name: 'assertion', type: 'string', description: 'Jest assertion', required: true, defaultValue: 'toBeDefined()' },
        { name: 'setup', type: 'string', description: 'Setup code', required: false }
      ],
      examples: [
        `test('should calculate sum correctly', () => {
  const result = calculateSum(2, 3);
  expect(result).toBe(5);
});`
      ],
      category: 'assertion',
      complexity: 1,
      applicableTestTypes: ['unit']
    });

    this.addPattern({
      id: 'jest-async-function-test',
      name: 'Async Function Test',
      description: 'Test for async functions',
      language: 'javascript',
      framework: 'jest',
      pattern: `test('{{testName}}', async () => {
  {{#if setup}}
  // Setup
  {{setup}}
  {{/if}}
  
  // Act
  {{#if expectsError}}
  await expect({{functionName}}({{#each parameters}}{{this.value}}{{#unless @last}}, {{/unless}}{{/each}})).rejects.{{assertion}};
  {{else}}
  const result = await {{functionName}}({{#each parameters}}{{this.value}}{{#unless @last}}, {{/unless}}{{/each}});
  expect(result).{{assertion}};
  {{/if}}
});`,
      variables: [
        { name: 'testName', type: 'string', description: 'Name of the test', required: true },
        { name: 'functionName', type: 'string', description: 'Name of async function to test', required: true },
        { name: 'parameters', type: 'array', description: 'Function parameters', required: false, defaultValue: [] },
        { name: 'assertion', type: 'string', description: 'Jest assertion', required: true },
        { name: 'expectsError', type: 'boolean', description: 'Whether function should throw', required: false, defaultValue: false },
        { name: 'setup', type: 'string', description: 'Setup code', required: false }
      ],
      examples: [
        `test('should fetch user data', async () => {
  const result = await fetchUser(123);
  expect(result).toHaveProperty('id', 123);
});`
      ],
      category: 'async-testing',
      complexity: 2,
      applicableTestTypes: ['unit', 'integration']
    });

    this.addPattern({
      id: 'jest-mock-function',
      name: 'Mock Function',
      description: 'Pattern for mocking functions',
      language: 'javascript',
      framework: 'jest',
      pattern: `const {{mockName}} = jest.fn({{#if mockImplementation}}{{mockImplementation}}{{/if}});
{{#if returnValue}}{{mockName}}.mockReturnValue({{returnValue}});{{/if}}
{{#if resolvedValue}}{{mockName}}.mockResolvedValue({{resolvedValue}});{{/if}}
{{#if rejectedValue}}{{mockName}}.mockRejectedValue({{rejectedValue}});{{/if}}`,
      variables: [
        { name: 'mockName', type: 'string', description: 'Name of the mock', required: true },
        { name: 'mockImplementation', type: 'function', description: 'Mock implementation', required: false },
        { name: 'returnValue', type: 'string', description: 'Return value for mock', required: false },
        { name: 'resolvedValue', type: 'string', description: 'Resolved value for async mock', required: false },
        { name: 'rejectedValue', type: 'string', description: 'Rejected value for async mock', required: false }
      ],
      examples: [
        `const mockFetch = jest.fn();
mockFetch.mockResolvedValue({ data: 'test' });`
      ],
      category: 'mocking',
      complexity: 2,
      applicableTestTypes: ['unit', 'integration']
    });

    // Python pytest patterns
    this.addPattern({
      id: 'pytest-basic-function-test',
      name: 'Basic Function Test',
      description: 'Basic unit test for a Python function',
      language: 'python',
      framework: 'pytest',
      pattern: `def test_{{functionName}}_{{testCase}}():
    {{#if setup}}
    # Setup
    {{setup}}
    {{/if}}
    
    # Act
    result = {{functionName}}({{#each parameters}}{{this.value}}{{#unless @last}}, {{/unless}}{{/each}})
    
    # Assert
    assert result {{assertion}}`,
      variables: [
        { name: 'functionName', type: 'string', description: 'Name of function to test', required: true },
        { name: 'testCase', type: 'string', description: 'Test case description', required: true },
        { name: 'parameters', type: 'array', description: 'Function parameters', required: false, defaultValue: [] },
        { name: 'assertion', type: 'string', description: 'Python assertion', required: true },
        { name: 'setup', type: 'string', description: 'Setup code', required: false }
      ],
      examples: [
        `def test_calculate_sum_positive_numbers():
    result = calculate_sum(2, 3)
    assert result == 5`
      ],
      category: 'assertion',
      complexity: 1,
      applicableTestTypes: ['unit']
    });

    this.addPattern({
      id: 'pytest-parametrized-test',
      name: 'Parametrized Test',
      description: 'Parametrized test pattern',
      language: 'python',
      framework: 'pytest',
      pattern: `@pytest.mark.parametrize("{{parameterNames}}", [
    {{#each testCases}}
    ({{#each this}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}),
    {{/each}}
])
def test_{{functionName}}_{{testCase}}({{parameterNames}}):
    {{#if setup}}
    # Setup
    {{setup}}
    {{/if}}
    
    # Act
    result = {{functionName}}({{parameterNames}})
    
    # Assert
    assert result {{assertion}}`,
      variables: [
        { name: 'functionName', type: 'string', description: 'Name of function to test', required: true },
        { name: 'testCase', type: 'string', description: 'Test case description', required: true },
        { name: 'parameterNames', type: 'string', description: 'Parameter names', required: true },
        { name: 'testCases', type: 'array', description: 'Test case data', required: true },
        { name: 'assertion', type: 'string', description: 'Python assertion', required: true },
        { name: 'setup', type: 'string', description: 'Setup code', required: false }
      ],
      examples: [
        `@pytest.mark.parametrize("a, b, expected", [
    (2, 3, 5),
    (0, 0, 0),
    (-1, 1, 0),
])
def test_add_numbers(a, b, expected):
    result = add(a, b)
    assert result == expected`
      ],
      category: 'data-generation',
      complexity: 3,
      applicableTestTypes: ['unit']
    });

    // Java JUnit5 patterns
    this.addPattern({
      id: 'junit5-basic-test',
      name: 'Basic JUnit5 Test',
      description: 'Basic unit test for Java method',
      language: 'java',
      framework: 'junit5',
      pattern: `@Test
@DisplayName("{{displayName}}")
void {{testMethodName}}() {
    {{#if setup}}
    // Setup
    {{setup}}
    {{/if}}
    
    // Act
    {{resultType}} result = {{objectName}}.{{methodName}}({{#each parameters}}{{this.value}}{{#unless @last}}, {{/unless}}{{/each}});
    
    // Assert
    {{assertion}}(result);
}`,
      variables: [
        { name: 'testMethodName', type: 'string', description: 'Test method name', required: true },
        { name: 'displayName', type: 'string', description: 'Display name for test', required: true },
        { name: 'objectName', type: 'string', description: 'Object under test', required: true },
        { name: 'methodName', type: 'string', description: 'Method to test', required: true },
        { name: 'resultType', type: 'string', description: 'Return type', required: true },
        { name: 'parameters', type: 'array', description: 'Method parameters', required: false, defaultValue: [] },
        { name: 'assertion', type: 'string', description: 'JUnit assertion', required: true },
        { name: 'setup', type: 'string', description: 'Setup code', required: false }
      ],
      examples: [
        `@Test
@DisplayName("Should calculate area correctly")
void shouldCalculateAreaCorrectly() {
    Rectangle rectangle = new Rectangle(5, 10);
    int result = rectangle.calculateArea();
    assertEquals(50, result);
}`
      ],
      category: 'assertion',
      complexity: 1,
      applicableTestTypes: ['unit']
    });

    // Add more patterns for other frameworks...
  }

  private async loadTemplates(): Promise<void> {
    // Jest templates
    this.templates.set('jest:javascript:test-file', `{{imports}}

{{#if setup}}
{{setup}}
{{/if}}

describe('{{testSuite.name}}', () => {
  {{#if testSuite.setup}}
  beforeEach(() => {
    {{testSuite.setup}}
  });
  {{/if}}
  
  {{#if testSuite.teardown}}
  afterEach(() => {
    {{testSuite.teardown}}
  });
  {{/if}}

  {{tests}}
});

{{#if teardown}}
{{teardown}}
{{/if}}`);

    this.templates.set('jest:typescript:test-file', `{{imports}}

{{#if setup}}
{{setup}}
{{/if}}

describe('{{testSuite.name}}', () => {
  {{#if testSuite.setup}}
  beforeEach(() => {
    {{testSuite.setup}}
  });
  {{/if}}
  
  {{#if testSuite.teardown}}
  afterEach(() => {
    {{testSuite.teardown}}
  });
  {{/if}}

  {{tests}}
});

{{#if teardown}}
{{teardown}}
{{/if}}`);

    // Pytest templates
    this.templates.set('pytest:python:test-file', `{{imports}}
import pytest

{{#if setup}}
{{setup}}
{{/if}}

class Test{{testSuite.name}}:
    {{#if testSuite.setup}}
    def setup_method(self):
        {{testSuite.setup}}
    {{/if}}
    
    {{#if testSuite.teardown}}
    def teardown_method(self):
        {{testSuite.teardown}}
    {{/if}}

    {{tests}}

{{#if teardown}}
{{teardown}}
{{/if}}`);

    // JUnit5 templates
    this.templates.set('junit5:java:test-file', `{{imports}}
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

{{#if setup}}
{{setup}}
{{/if}}

@DisplayName("{{testSuite.name}}")
class {{testSuite.name}}Test {
    {{#if testSuite.setup}}
    @BeforeEach
    void setUp() {
        {{testSuite.setup}}
    }
    {{/if}}
    
    {{#if testSuite.teardown}}
    @AfterEach
    void tearDown() {
        {{testSuite.teardown}}
    }
    {{/if}}

    {{tests}}
}

{{#if teardown}}
{{teardown}}
{{/if}}`);

    // Add more templates for other frameworks...
  }

  private addPattern(pattern: TestPattern): void {
    const key = `${pattern.framework}:${pattern.id}`;
    this.patterns.set(key, pattern);
  }

  private getDefaultTemplate(templateType: string): string {
    const defaults: Record<string, string> = {
      'test-file': `{{imports}}

{{#if setup}}
{{setup}}
{{/if}}

{{tests}}

{{#if teardown}}
{{teardown}}
{{/if}}`,
      'test-case': `{{testName}} {
  {{testCode}}
}`,
      'assertion': `expect({{actual}}).{{matcher}}({{expected}});`,
      'setup': `// Setup code here`,
      'teardown': `// Teardown code here`
    };

    return defaults[templateType] || '// Template not found';
  }

  private formatVariable(value: any): string {
    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'object') {
      return JSON.stringify(value);
    } else {
      return String(value);
    }
  }

  private processConditionals(template: string, variables: Record<string, any>): string {
    // Simple conditional processing: {{#if variable}}content{{/if}}
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return template.replace(conditionalRegex, (match, varName, content) => {
      const value = variables[varName];
      return value ? content : '';
    });
  }

  private processLoops(template: string, variables: Record<string, any>): string {
    // Simple loop processing: {{#each array}}{{this}}{{/each}}
    const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(loopRegex, (match, varName, content) => {
      const array = variables[varName];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = content;
        
        // Replace {{this}} with current item
        itemContent = itemContent.replace(/\{\{this\}\}/g, this.formatVariable(item));
        
        // Replace {{@index}} with current index
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
        
        // Replace {{@last}} with boolean indicating if this is the last item
        const isLast = index === array.length - 1;
        itemContent = itemContent.replace(/\{\{#unless @last\}\}/g, isLast ? '' : '');
        itemContent = itemContent.replace(/\{\{\/unless\}\}/g, '');
        
        return itemContent;
      }).join('');
    });
  }

  async createCustomPattern(pattern: Omit<TestPattern, 'id'>): Promise<string> {
    const id = `custom-${Date.now()}`;
    const fullPattern: TestPattern = { ...pattern, id };
    
    this.addPattern(fullPattern);
    this.emit('pattern:created', { id, pattern: fullPattern });
    
    return id;
  }

  async updatePattern(id: string, updates: Partial<TestPattern>): Promise<void> {
    const existingPattern = Array.from(this.patterns.values()).find(p => p.id === id);
    if (!existingPattern) {
      throw new Error(`Pattern not found: ${id}`);
    }

    const updatedPattern = { ...existingPattern, ...updates };
    const key = `${updatedPattern.framework}:${updatedPattern.id}`;
    
    this.patterns.set(key, updatedPattern);
    this.emit('pattern:updated', { id, pattern: updatedPattern });
  }

  async deletePattern(id: string): Promise<void> {
    const pattern = Array.from(this.patterns.values()).find(p => p.id === id);
    if (!pattern) {
      throw new Error(`Pattern not found: ${id}`);
    }

    const key = `${pattern.framework}:${pattern.id}`;
    this.patterns.delete(key);
    this.emit('pattern:deleted', { id });
  }

  getPatternStatistics(): {
    totalPatterns: number;
    patternsByFramework: Record<TestFramework, number>;
    patternsByLanguage: Record<SupportedTestLanguage, number>;
    patternsByCategory: Record<TestPatternCategory, number>;
  } {
    const patterns = Array.from(this.patterns.values());
    
    const patternsByFramework = patterns.reduce((acc, pattern) => {
      acc[pattern.framework] = (acc[pattern.framework] || 0) + 1;
      return acc;
    }, {} as Record<TestFramework, number>);

    const patternsByLanguage = patterns.reduce((acc, pattern) => {
      acc[pattern.language] = (acc[pattern.language] || 0) + 1;
      return acc;
    }, {} as Record<SupportedTestLanguage, number>);

    const patternsByCategory = patterns.reduce((acc, pattern) => {
      acc[pattern.category] = (acc[pattern.category] || 0) + 1;
      return acc;
    }, {} as Record<TestPatternCategory, number>);

    return {
      totalPatterns: patterns.length,
      patternsByFramework,
      patternsByLanguage,
      patternsByCategory
    };
  }

  async validatePattern(pattern: TestPattern): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate required fields
    if (!pattern.id) errors.push('Pattern ID is required');
    if (!pattern.name) errors.push('Pattern name is required');
    if (!pattern.pattern) errors.push('Pattern template is required');
    if (!pattern.framework) errors.push('Framework is required');
    if (!pattern.language) errors.push('Language is required');

    // Validate pattern template
    try {
      this.renderTemplate(pattern.pattern, {});
    } catch (error) {
      errors.push(`Invalid pattern template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate variables
    for (const variable of pattern.variables) {
      if (!variable.name) errors.push('Variable name is required');
      if (!variable.type) errors.push('Variable type is required');
      if (variable.required === undefined) errors.push('Variable required field must be specified');
    }

    return { valid: errors.length === 0, errors };
  }
}