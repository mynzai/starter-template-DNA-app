/**
 * @fileoverview Documentation Generation Usage Examples
 * Example implementations for AC4: Documentation Generation with AI enhancement
 */

import {
  DocumentationAIService,
  createDocumentationService,
  createMarkdownConfig,
  createAPIDocumentationConfig,
  detectDocumentationType,
  getRecommendedSectionsForType,
  validateDocumentationRequest,
  DOCUMENTATION_EVENTS,
  LIBRARY_DOCUMENTATION_PRESET,
  API_DOCUMENTATION_PRESET,
  TUTORIAL_DOCUMENTATION_PRESET
} from './index';

/**
 * Example 1: Basic documentation generation for a TypeScript library
 */
export async function basicLibraryDocumentationGeneration() {
  // Create documentation service with library preset
  const docService = createDocumentationService({
    ...LIBRARY_DOCUMENTATION_PRESET,
    defaultLanguage: 'typescript',
    defaultFormat: 'markdown',
    ai: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 3000
    }
  });

  // Set up event listeners
  docService.on(DOCUMENTATION_EVENTS.GENERATION_STARTED, ({ sourceFiles, type }) => {
    console.log(`🔄 Starting documentation generation for ${sourceFiles.join(', ')} (${type})`);
  });

  docService.on(DOCUMENTATION_EVENTS.GENERATION_PROGRESS, ({ stage, sectionsCount }) => {
    console.log(`📊 Progress: ${stage} - ${sectionsCount} sections processed`);
  });

  docService.on(DOCUMENTATION_EVENTS.GENERATION_COMPLETED, ({ response, duration }) => {
    console.log(`✅ Documentation generation completed in ${duration}ms`);
    console.log(`📝 Generated ${response.sections.length} sections, ${response.metrics.wordsGenerated} words`);
  });

  // Initialize the service
  await docService.initialize();

  // Sample TypeScript source code
  const sourceCode = `
/**
 * A utility library for mathematical operations
 */

/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum of a and b
 * @example
 * const result = add(5, 3); // Returns 8
 */
export function add(a: number, b: number): number {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Both arguments must be numbers');
  }
  return a + b;
}

/**
 * A calculator class with memory functionality
 */
export class Calculator {
  private memory: number = 0;

  /**
   * Adds a value to the current memory
   * @param value Value to add
   * @returns The new memory value
   */
  addToMemory(value: number): number {
    this.memory += value;
    return this.memory;
  }

  /**
   * Gets the current memory value
   * @returns Current memory value
   */
  getMemory(): number {
    return this.memory;
  }

  /**
   * Clears the memory
   */
  clearMemory(): void {
    this.memory = 0;
  }

  /**
   * Performs a calculation and stores result in memory
   * @param operation The operation to perform
   * @param operands The operands for the operation
   * @returns The calculation result
   */
  calculate(operation: 'add' | 'subtract' | 'multiply' | 'divide', ...operands: number[]): number {
    let result = operands[0];
    
    for (let i = 1; i < operands.length; i++) {
      switch (operation) {
        case 'add':
          result += operands[i];
          break;
        case 'subtract':
          result -= operands[i];
          break;
        case 'multiply':
          result *= operands[i];
          break;
        case 'divide':
          if (operands[i] === 0) throw new Error('Division by zero');
          result /= operands[i];
          break;
      }
    }
    
    this.memory = result;
    return result;
  }
}`;

  // Create documentation request
  const request = {
    sourceCode,
    sourceFiles: ['math-utils.ts'],
    language: 'typescript' as const,
    outputFormat: 'markdown' as const,
    documentationType: 'library' as const,
    options: {
      includeAPIReference: true,
      generateExamples: true,
      includeTypeDefinitions: true,
      includeUsageGuides: true,
      includeTroubleshooting: true,
      autoGenerateImages: false,
      includeCodeSnippets: true,
      includePerformanceNotes: true,
      includeSecurity: true
    },
    markdownConfig: createMarkdownConfig('github')
  };

  // Validate request
  const validationErrors = validateDocumentationRequest(request);
  if (validationErrors.length > 0) {
    console.error('❌ Validation errors:', validationErrors);
    return null;
  }

  // Generate documentation
  const result = await docService.generateDocumentation(request);

  console.log('\n📋 Documentation Generation Results:');
  console.log(`   Sections Generated: ${result.sections.length}`);
  console.log(`   Words Generated: ${result.metrics.wordsGenerated}`);
  console.log(`   Assets Generated: ${result.assets.length}`);
  console.log(`   Quality Score: ${result.metadata.quality.score}%`);
  console.log(`   Suggestions: ${result.suggestions.length}`);

  return result;
}

/**
 * Example 2: API documentation generation with OpenAPI format
 */
export async function apiDocumentationGeneration() {
  const docService = createDocumentationService({
    ...API_DOCUMENTATION_PRESET,
    defaultLanguage: 'typescript',
    defaultFormat: 'openapi'
  });

  await docService.initialize();

  const apiSourceCode = `
/**
 * User management API endpoints
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  active: boolean;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

/**
 * Creates a new user
 * @route POST /api/users
 * @param userData User data for creation
 * @returns Created user object
 * @throws {ValidationError} When user data is invalid
 * @throws {ConflictError} When email already exists
 */
export async function createUser(userData: CreateUserRequest): Promise<User> {
  // Implementation would be here
  throw new Error('Not implemented');
}

/**
 * Gets a user by ID
 * @route GET /api/users/:id
 * @param id User ID
 * @returns User object or null if not found
 */
export async function getUser(id: string): Promise<User | null> {
  // Implementation would be here
  return null;
}

/**
 * Updates a user
 * @route PUT /api/users/:id
 * @param id User ID
 * @param updates Partial user data to update
 * @returns Updated user object
 */
export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  // Implementation would be here
  throw new Error('Not implemented');
}

/**
 * Deletes a user
 * @route DELETE /api/users/:id
 * @param id User ID
 * @returns Boolean indicating success
 */
export async function deleteUser(id: string): Promise<boolean> {
  // Implementation would be here
  return false;
}`;

  const apiConfig = createAPIDocumentationConfig(
    'User Management API',
    '1.0.0',
    'API for managing user accounts and data'
  );

  apiConfig.authentication = {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT token authentication'
  };

  apiConfig.servers = [
    {
      url: 'https://api.example.com/v1',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.example.com/v1',
      description: 'Staging server'
    }
  ];

  const request = {
    sourceCode: apiSourceCode,
    sourceFiles: ['user-api.ts'],
    language: 'typescript' as const,
    outputFormat: 'openapi' as const,
    documentationType: 'api' as const,
    apiConfig,
    options: {
      includeAPIReference: true,
      generateExamples: true,
      includeHeaders: true,
      includeResponseCodes: true,
      generatePostmanCollection: true
    }
  };

  const result = await docService.generateDocumentation(request);

  console.log('\n🔗 API Documentation Results:');
  console.log(`   API Endpoints Documented: ${result.sections.filter(s => s.type === 'api_reference').length}`);
  console.log(`   Format: ${result.outputFormat}`);
  console.log(`   Authentication: ${apiConfig.authentication?.type}`);

  return result;
}

/**
 * Example 3: Tutorial documentation with interactive examples
 */
export async function tutorialDocumentationGeneration() {
  const docService = createDocumentationService({
    ...TUTORIAL_DOCUMENTATION_PRESET,
    defaultLanguage: 'javascript',
    defaultFormat: 'markdown'
  });

  await docService.initialize();

  const tutorialCode = `
/**
 * Getting Started with Our Library
 * This tutorial walks you through the basics
 */

// Step 1: Installation
// npm install our-awesome-library

// Step 2: Basic Usage
import { createClient } from 'our-awesome-library';

const client = createClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Step 3: Making your first request
async function getUser(id) {
  try {
    const user = await client.users.get(id);
    console.log('User:', user);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Step 4: Advanced usage with error handling
async function createUserWithValidation(userData) {
  // Validate input
  if (!userData.email || !userData.name) {
    throw new Error('Email and name are required');
  }

  // Create user
  const user = await client.users.create(userData);
  
  // Log success
  console.log('User created successfully:', user.id);
  
  return user;
}

// Step 5: Using webhooks
client.webhooks.on('user.created', (event) => {
  console.log('New user created:', event.data);
});

// Step 6: Cleanup
process.on('exit', () => {
  client.disconnect();
});`;

  const request = {
    sourceCode: tutorialCode,
    sourceFiles: ['getting-started.js'],
    language: 'javascript' as const,
    outputFormat: 'markdown' as const,
    documentationType: 'tutorial' as const,
    options: {
      includeTutorials: true,
      generateExamples: true,
      generateInteractiveExamples: true,
      includeCodeSnippets: true,
      includeStepByStep: true,
      includePrerequisites: true
    },
    markdownConfig: {
      ...createMarkdownConfig('material'),
      enableMermaidDiagrams: true,
      enableMathJax: false
    }
  };

  const result = await docService.generateDocumentation(request);

  console.log('\n📚 Tutorial Documentation Results:');
  console.log(`   Tutorial Steps: ${result.sections.filter(s => s.type === 'tutorial').length}`);
  console.log(`   Interactive Examples: ${result.assets.filter(a => a.type === 'interactive_demo').length}`);
  console.log(`   Reading Time: ${result.metadata.readingTime} minutes`);

  return result;
}

/**
 * Example 4: Multi-format documentation generation
 */
export async function multiFormatDocumentationGeneration() {
  const sourceCode = `
/**
 * A simple data processing utility
 */

export interface DataProcessor {
  process(data: any[]): any[];
  validate(data: any): boolean;
  transform(data: any, transformer: (item: any) => any): any;
}

export class StandardDataProcessor implements DataProcessor {
  private filters: Array<(item: any) => boolean> = [];

  addFilter(filter: (item: any) => boolean): void {
    this.filters.push(filter);
  }

  process(data: any[]): any[] {
    return data.filter(item => 
      this.filters.every(filter => filter(item))
    );
  }

  validate(data: any): boolean {
    return data !== null && data !== undefined;
  }

  transform(data: any, transformer: (item: any) => any): any {
    if (Array.isArray(data)) {
      return data.map(transformer);
    }
    return transformer(data);
  }
}`;

  const formats = ['markdown', 'html', 'json'] as const;
  const results = [];

  for (const format of formats) {
    console.log(`\n🔄 Generating ${format.toUpperCase()} documentation...`);
    
    const docService = createDocumentationService({
      defaultLanguage: 'typescript',
      defaultFormat: format
    });

    await docService.initialize();

    const request = {
      sourceCode,
      sourceFiles: ['data-processor.ts'],
      language: 'typescript' as const,
      outputFormat: format,
      documentationType: 'library' as const,
      options: {
        includeAPIReference: true,
        generateExamples: true,
        includeTypeDefinitions: true
      }
    };

    const result = await docService.generateDocumentation(request);
    results.push({ format, result });

    console.log(`✅ ${format.toUpperCase()}: ${result.content.length} characters generated`);
  }

  console.log('\n📊 Multi-Format Results Summary:');
  results.forEach(({ format, result }) => {
    console.log(`   ${format.toUpperCase()}: ${result.content.length} chars, ${result.sections.length} sections`);
  });

  return results;
}

/**
 * Example 5: Documentation validation and optimization
 */
export async function documentationValidationExample() {
  const docService = createDocumentationService({
    validation: {
      enabled: true,
      strict: true,
      rules: ['grammar', 'completeness', 'consistency', 'clarity', 'structure']
    }
  });

  await docService.initialize();

  // Intentionally flawed documentation for testing validation
  const flawedCode = `
// poor documentation example
export function badFunction(x,y) {
  return x+y;
}

// missing documentation
export function anotherFunction(data) {
  if (!data) return;
  return data.map(item => item.value);
}

export class MyClass {
  // no documentation for constructor
  constructor(options) {
    this.options = options;
  }
  
  // minimal documentation
  doSomething() {
    return this.options;
  }
}`;

  const request = {
    sourceCode: flawedCode,
    sourceFiles: ['flawed-example.js'],
    language: 'javascript' as const,
    outputFormat: 'markdown' as const,
    documentationType: 'library' as const,
    options: {
      includeAPIReference: true,
      generateExamples: true
    }
  };

  const result = await docService.generateDocumentation(request);

  console.log('\n🔍 Validation Results:');
  console.log(`   Quality Score: ${result.metadata.quality.score}%`);
  console.log(`   Completeness: ${result.metadata.completeness}%`);
  console.log(`   Suggestions: ${result.suggestions.length}`);

  if (result.suggestions.length > 0) {
    console.log('\n💡 Improvement Suggestions:');
    result.suggestions.slice(0, 3).forEach((suggestion, i) => {
      console.log(`   ${i + 1}. ${suggestion.title}: ${suggestion.description}`);
    });
  }

  return result;
}

/**
 * Example 6: Documentation type detection and configuration
 */
export async function documentationTypeDetection() {
  const files = [
    'README.md',
    'api-reference.md',
    'tutorial-getting-started.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'architecture-overview.md',
    'deployment-guide.md',
    'troubleshooting.md',
    'user-guide.md',
    'api-spec.yaml'
  ];

  console.log('\n🔍 Documentation Type Detection:');

  files.forEach(fileName => {
    const detectedType = detectDocumentationType(fileName);
    const recommendedSections = getRecommendedSectionsForType(detectedType);
    
    console.log(`   ${fileName}:`);
    console.log(`     Type: ${detectedType}`);
    console.log(`     Recommended sections: ${recommendedSections.join(', ')}`);
    console.log('');
  });

  // Create services for each type
  const typeConfigs = [
    { type: 'library', preset: LIBRARY_DOCUMENTATION_PRESET },
    { type: 'api', preset: API_DOCUMENTATION_PRESET },
    { type: 'tutorial', preset: TUTORIAL_DOCUMENTATION_PRESET }
  ];

  console.log('📋 Preset Configurations:');
  typeConfigs.forEach(({ type, preset }) => {
    console.log(`   ${type.toUpperCase()} preset:`);
    console.log(`     Format: ${preset.format}`);
    console.log(`     Type: ${preset.documentationType}`);
    console.log(`     Key options: ${Object.keys(preset.options).slice(0, 3).join(', ')}`);
    console.log('');
  });
}

// Export all examples for easy testing
export const examples = {
  basicLibraryDocumentationGeneration,
  apiDocumentationGeneration,
  tutorialDocumentationGeneration,
  multiFormatDocumentationGeneration,
  documentationValidationExample,
  documentationTypeDetection
};

/**
 * Helper function to run all examples
 */
export async function runAllDocumentationExamples() {
  console.log('🚀 Running all documentation generation examples...\n');

  try {
    // Run basic library documentation
    console.log('='.repeat(60));
    console.log('📚 Example 1: Basic Library Documentation');
    console.log('='.repeat(60));
    await basicLibraryDocumentationGeneration();

    // Run API documentation
    console.log('\n' + '='.repeat(60));
    console.log('🔗 Example 2: API Documentation');
    console.log('='.repeat(60));
    await apiDocumentationGeneration();

    // Run tutorial documentation
    console.log('\n' + '='.repeat(60));
    console.log('📚 Example 3: Tutorial Documentation');
    console.log('='.repeat(60));
    await tutorialDocumentationGeneration();

    // Run multi-format generation
    console.log('\n' + '='.repeat(60));
    console.log('📄 Example 4: Multi-Format Generation');
    console.log('='.repeat(60));
    await multiFormatDocumentationGeneration();

    // Run validation example
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Example 5: Validation & Quality');
    console.log('='.repeat(60));
    await documentationValidationExample();

    // Run type detection
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Example 6: Type Detection');
    console.log('='.repeat(60));
    await documentationTypeDetection();

    console.log('\n✅ All documentation examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    throw error;
  }
}