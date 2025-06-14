/**
 * @fileoverview Inquirer mocking utilities for testing interactive prompts
 */

import { jest } from '@jest/globals';

export interface MockPromptResponse {
  [key: string]: any;
}

export interface MockPromptSequence {
  responses: MockPromptResponse[];
  index?: number;
}

export class InquirerMock {
  private static instance: InquirerMock | null = null;
  private mockSequence: MockPromptSequence | null = null;
  private originalInquirer: any;

  private constructor() {}

  static getInstance(): InquirerMock {
    if (!InquirerMock.instance) {
      InquirerMock.instance = new InquirerMock();
    }
    return InquirerMock.instance;
  }

  setup(): void {
    this.originalInquirer = require('inquirer');
    
    const mockInquirer = {
      prompt: jest.fn().mockImplementation(this.mockPrompt.bind(this)),
      Separator: this.originalInquirer.Separator,
      registerPrompt: this.originalInquirer.registerPrompt,
      createPromptModule: this.originalInquirer.createPromptModule,
    };

    jest.doMock('inquirer', () => mockInquirer);
  }

  teardown(): void {
    jest.restoreAllMocks();
    this.mockSequence = null;
  }

  setResponses(responses: MockPromptResponse | MockPromptResponse[]): void {
    if (Array.isArray(responses)) {
      this.mockSequence = {
        responses,
        index: 0
      };
    } else {
      this.mockSequence = {
        responses: [responses],
        index: 0
      };
    }
  }

  private async mockPrompt(questions: any): Promise<MockPromptResponse> {
    if (!this.mockSequence) {
      throw new Error('No mock responses configured. Call setResponses() first.');
    }

    if (this.mockSequence.index! >= this.mockSequence.responses.length) {
      throw new Error(`No more mock responses available. Index: ${this.mockSequence.index}, Total: ${this.mockSequence.responses.length}`);
    }

    const response = this.mockSequence.responses[this.mockSequence.index!]!;
    this.mockSequence.index!++;

    // Validate that all required questions have responses
    const questionArray = Array.isArray(questions) ? questions : [questions];
    const missingResponses = questionArray
      .filter((q: any) => q.name && !(q.name in response))
      .map((q: any) => q.name);

    if (missingResponses.length > 0) {
      throw new Error(`Missing mock responses for questions: ${missingResponses.join(', ')}`);
    }

    return response;
  }

  // Helper methods for common prompt scenarios
  static mockConfirmation(confirm: boolean): InquirerMock {
    const mock = InquirerMock.getInstance();
    mock.setResponses({ confirm });
    return mock;
  }

  static mockTextInput(input: string, field: string = 'input'): InquirerMock {
    const mock = InquirerMock.getInstance();
    mock.setResponses({ [field]: input });
    return mock;
  }

  static mockSelection(selection: string | number, field: string = 'selection'): InquirerMock {
    const mock = InquirerMock.getInstance();
    mock.setResponses({ [field]: selection });
    return mock;
  }

  static mockMultipleSelections(selections: (string | number)[], field: string = 'selections'): InquirerMock {
    const mock = InquirerMock.getInstance();
    mock.setResponses({ [field]: selections });
    return mock;
  }

  static mockProjectCreation(options: {
    projectName?: string;
    templateId?: string;
    framework?: string;
    dnaModules?: string[];
    variables?: Record<string, any>;
    overwrite?: boolean;
  }): InquirerMock {
    const mock = InquirerMock.getInstance();
    const responses: MockPromptResponse[] = [];

    // Project name prompt
    if (options.projectName) {
      responses.push({ name: options.projectName });
    }

    // Overwrite confirmation if needed
    if (options.overwrite !== undefined) {
      responses.push({ shouldOverwrite: options.overwrite });
    }

    // Template selection
    if (options.templateId) {
      responses.push({ templateId: options.templateId });
    }

    // Framework selection
    if (options.framework) {
      responses.push({ framework: options.framework });
    }

    // DNA modules selection
    if (options.dnaModules) {
      responses.push({ dnaModules: options.dnaModules });
    }

    // Template variables
    if (options.variables) {
      responses.push(options.variables);
    }

    mock.setResponses(responses);
    return mock;
  }

  static mockTemplateSearch(options: {
    searchQuery?: string;
    category?: string;
    framework?: string;
    complexity?: string;
    selectedTemplate?: string;
  }): InquirerMock {
    const mock = InquirerMock.getInstance();
    const responses: MockPromptResponse[] = [];

    if (options.searchQuery) {
      responses.push({ searchQuery: options.searchQuery });
    }

    if (options.category) {
      responses.push({ category: options.category });
    }

    if (options.framework) {
      responses.push({ framework: options.framework });
    }

    if (options.complexity) {
      responses.push({ complexity: options.complexity });
    }

    if (options.selectedTemplate) {
      responses.push({ selectedTemplate: options.selectedTemplate });
    }

    mock.setResponses(responses);
    return mock;
  }

  static mockValidationFlow(options: {
    continueValidation?: boolean;
    fixIssues?: boolean;
    selectedFixes?: string[];
  }): InquirerMock {
    const mock = InquirerMock.getInstance();
    const responses: MockPromptResponse[] = [];

    if (options.continueValidation !== undefined) {
      responses.push({ continueValidation: options.continueValidation });
    }

    if (options.fixIssues !== undefined) {
      responses.push({ fixIssues: options.fixIssues });
    }

    if (options.selectedFixes) {
      responses.push({ selectedFixes: options.selectedFixes });
    }

    mock.setResponses(responses);
    return mock;
  }

  // Advanced mock scenarios
  static mockInteractiveTemplateCreation(): InquirerMock {
    const mock = InquirerMock.getInstance();
    mock.setResponses([
      { name: 'my-awesome-project' },
      { shouldOverwrite: false },
      { showCategories: true },
      { category: 'AI Native' },
      { templateId: 'ai-saas' },
      { dnaModules: ['auth-jwt', 'payment-stripe'] },
      {
        projectName: 'my-awesome-project',
        description: 'An awesome AI-powered SaaS application',
        author: 'Developer',
        databaseType: 'postgresql',
        enableAnalytics: true
      }
    ]);
    return mock;
  }

  static mockCancelledFlow(): InquirerMock {
    const mock = InquirerMock.getInstance();
    mock.setResponses([
      { name: 'cancelled-project' },
      { shouldOverwrite: false },
      { templateId: null } // Simulates cancellation
    ]);
    return mock;
  }

  static mockErrorRecovery(): InquirerMock {
    const mock = InquirerMock.getInstance();
    mock.setResponses([
      { name: 'error-project' },
      { shouldOverwrite: true },
      { retryAfterError: true },
      { cleanupAfterError: true }
    ]);
    return mock;
  }
}

// Utility functions for specific test scenarios
export function setupInquirerMock(): InquirerMock {
  const mock = InquirerMock.getInstance();
  mock.setup();
  return mock;
}

export function teardownInquirerMock(): void {
  const mock = InquirerMock.getInstance();
  mock.teardown();
}

// Jest mock factory for inquirer
export function createInquirerMock(responses: MockPromptResponse[]): any {
  return {
    prompt: jest.fn().mockImplementation(async () => {
      if (responses.length === 0) {
        throw new Error('No more mock responses available');
      }
      return responses.shift();
    }),
    Separator: class Separator {
      constructor(public line?: string) {}
    }
  };
}

// Response builders for common scenarios
export const ResponseBuilders = {
  projectName: (name: string) => ({ name }),
  
  confirmation: (value: boolean, field: string = 'confirm') => ({ [field]: value }),
  
  templateSelection: (templateId: string) => ({ templateId }),
  
  dnaModules: (modules: string[]) => ({ dnaModules: modules }),
  
  variables: (vars: Record<string, any>) => vars,
  
  overwrite: (shouldOverwrite: boolean) => ({ shouldOverwrite }),
  
  search: (query: string) => ({ searchQuery: query }),
  
  category: (category: string) => ({ category }),
  
  framework: (framework: string) => ({ framework })
};

// Pre-built response sequences
export const ResponseSequences = {
  basicProjectCreation: [
    ResponseBuilders.projectName('test-project'),
    ResponseBuilders.templateSelection('basic-typescript'),
    ResponseBuilders.confirmation(false, 'skipInstall'),
    ResponseBuilders.confirmation(false, 'skipGit')
  ],
  
  aiSaasProjectCreation: [
    ResponseBuilders.projectName('ai-saas-app'),
    ResponseBuilders.templateSelection('ai-saas'),
    ResponseBuilders.dnaModules(['auth-jwt', 'payment-stripe', 'ai-openai']),
    ResponseBuilders.variables({
      projectName: 'ai-saas-app',
      description: 'AI-powered SaaS application',
      databaseType: 'postgresql',
      enableAnalytics: true
    })
  ],
  
  conflictResolution: [
    ResponseBuilders.projectName('existing-project'),
    ResponseBuilders.overwrite(true),
    ResponseBuilders.templateSelection('basic-typescript')
  ],
  
  cancellation: [
    ResponseBuilders.projectName('cancelled-project'),
    { templateId: null } // Represents user cancellation
  ]
};