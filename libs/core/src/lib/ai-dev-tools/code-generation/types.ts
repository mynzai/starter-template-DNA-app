/**
 * @fileoverview Code Generation Types
 * Type definitions for AC1: Code Generation Templates
 */

export interface CodeGenerationRequest {
  prompt: string;
  language: SupportedLanguage;
  framework?: string;
  template?: string;
  context?: CodeContext;
  options?: GenerationOptions;
}

export interface CodeGenerationResponse {
  code: string;
  language: SupportedLanguage;
  framework?: string;
  explanation?: string;
  suggestions?: string[];
  syntaxHighlighted?: string;
  metadata: CodeMetadata;
}

export interface LanguageTemplate {
  id: string;
  name: string;
  language: SupportedLanguage;
  framework?: string;
  template: string;
  variables: TemplateVariable[];
  patterns: CodePattern[];
  syntaxRules: SyntaxRule[];
  examples: CodeExample[];
}

export interface SyntaxHighlightConfig {
  language: SupportedLanguage;
  theme: 'light' | 'dark' | 'auto';
  showLineNumbers: boolean;
  highlightErrors: boolean;
  customRules?: SyntaxRule[];
}

export interface FrameworkDetectionResult {
  framework: string;
  confidence: number;
  version?: string;
  patterns: string[];
  suggestions: string[];
}

export interface CodeContext {
  projectType?: string;
  existingCode?: string;
  dependencies?: string[];
  architecture?: string;
  patterns?: string[];
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  includeComments?: boolean;
  includeTests?: boolean;
  optimizeForReadability?: boolean;
  followConventions?: boolean;
}

export interface CodeMetadata {
  tokensUsed: number;
  generationTime: number;
  complexity: number;
  quality: number;
  testability: number;
  maintainability: number;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: string;
}

export interface CodePattern {
  id: string;
  name: string;
  description: string;
  pattern: string;
  replacement?: string;
  examples: string[];
  categories: string[];
}

export interface SyntaxRule {
  id: string;
  pattern: RegExp;
  token: string;
  style: {
    color?: string;
    fontWeight?: string;
    fontStyle?: string;
    backgroundColor?: string;
  };
}

export interface CodeExample {
  title: string;
  description: string;
  input: string;
  output: string;
  explanation: string;
}

export type SupportedLanguage = 
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'rust'
  | 'go'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'sql'
  | 'html'
  | 'css'
  | 'scss'
  | 'json'
  | 'yaml'
  | 'xml';

export interface LanguageConfig {
  language: SupportedLanguage;
  fileExtensions: string[];
  commentStyles: {
    single?: string;
    multi?: { start: string; end: string };
  };
  keywords: string[];
  builtinTypes: string[];
  frameworks: string[];
  testingFrameworks: string[];
  packageManagers: string[];
}

export interface FrameworkTemplate {
  framework: string;
  language: SupportedLanguage;
  templates: {
    component: string;
    service: string;
    model: string;
    controller: string;
    test: string;
    config: string;
  };
  patterns: {
    imports: string;
    exports: string;
    functions: string;
    classes: string;
    interfaces: string;
  };
}