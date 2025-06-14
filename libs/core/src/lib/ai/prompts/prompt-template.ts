export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: PromptVariable[];
  version: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  tags: string[];
  metadata: Record<string, any>;
  isActive: boolean;
  parentId?: string; // For versioning
  examples?: PromptExample[];
}

export interface PromptExample {
  name: string;
  description: string;
  variables: Record<string, any>;
  expectedOutput?: string;
}

export interface PromptVersion {
  version: string;
  templateId: string;
  template: string;
  variables: PromptVariable[];
  changelog: string;
  createdAt: number;
  createdBy: string;
  isActive: boolean;
  performance?: PromptPerformanceMetrics;
}

export interface PromptPerformanceMetrics {
  avgResponseTime: number;
  totalExecutions: number;
  successRate: number;
  avgTokenUsage: number;
  avgCost: number;
  lastExecuted: number;
  qualityScore?: number;
}

export interface PromptExecutionContext {
  templateId: string;
  version: string;
  variables: Record<string, any>;
  provider: string;
  model: string;
  executedAt: number;
  executedBy: string;
  metadata: Record<string, any>;
}

export interface PromptExecutionResult {
  context: PromptExecutionContext;
  compiledPrompt: string;
  response: string;
  responseTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  success: boolean;
  error?: string;
  quality?: {
    score: number;
    feedback: string;
    reviewer: string;
    reviewedAt: number;
  };
}

export interface PromptSearchCriteria {
  query?: string;
  category?: string;
  tags?: string[];
  createdBy?: string;
  createdAfter?: number;
  createdBefore?: number;
  isActive?: boolean;
  hasVariables?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'usage' | 'performance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PromptValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingVariables: string[];
  unusedVariables: string[];
  compiledPrompt?: string;
}

export interface PromptCompilationOptions {
  strictMode?: boolean;
  allowMissingVariables?: boolean;
  defaultMissingValue?: string;
  preserveWhitespace?: boolean;
  escapeHtml?: boolean;
}

export class PromptTemplateError extends Error {
  constructor(
    message: string,
    public code: string,
    public templateId?: string,
    public version?: string
  ) {
    super(message);
    this.name = 'PromptTemplateError';
  }
}

export class PromptValidationError extends PromptTemplateError {
  constructor(
    message: string,
    public validationErrors: string[],
    templateId?: string
  ) {
    super(message, 'VALIDATION_ERROR', templateId);
    this.name = 'PromptValidationError';
  }
}

export class PromptCompilationError extends PromptTemplateError {
  constructor(
    message: string,
    public missingVariables: string[],
    templateId?: string,
    version?: string
  ) {
    super(message, 'COMPILATION_ERROR', templateId, version);
    this.name = 'PromptCompilationError';
  }
}

export class PromptVersionError extends PromptTemplateError {
  constructor(
    message: string,
    templateId?: string,
    version?: string
  ) {
    super(message, 'VERSION_ERROR', templateId, version);
    this.name = 'PromptVersionError';
  }
}