/**
 * @fileoverview Documentation Generation Module
 * Main exports for AC4: Documentation Generation with AI enhancement
 */

// Main Service
export { DocumentationAIService } from './documentation-ai-service';

// Core Components
export { CodeAnalyzer } from './code-analyzer';
export { DocumentationTemplateEngine } from './documentation-template-engine';
export { DocumentationValidator } from './documentation-validator';
export { ContentOptimizer, type OptimizationOptions } from './content-optimizer';
export { AssetGenerator } from './asset-generator';

// Type Exports
export type {
  DocumentationRequest,
  DocumentationResponse,
  DocumentationOptions,
  DocumentationConfig,
  SupportedDocLanguage,
  DocumentationFormat,
  DocumentationType,
  DocumentationSection,
  DocumentationAsset,
  DocumentationMetadata,
  DocumentationSuggestion,
  DocumentationMetrics,
  DocumentationValidationResult,
  APIDocumentationConfig,
  MarkdownOutputOptions,
  NavigationConfig,
  SidebarConfig,
  HeaderConfig,
  FooterConfig,
  NavigationItem,
  SectionType,
  SectionMetadata,
  AssetType,
  AssetMetadata,
  DocumentationComplexity,
  ComplexityFactor,
  DocumentationQuality,
  QualityFactor,
  QualityIssue,
  MaintenanceEffort,
  CustomSection,
  SectionVariable,
  APIServer,
  ServerVariable,
  AuthenticationConfig,
  OAuth2Flows,
  OAuth2Flow,
  CodeAnalysisResult,
  FunctionInfo,
  ClassInfo,
  InterfaceInfo,
  TypeInfo,
  ParameterInfo,
  ValidationRule,
  ConstantInfo,
  ModuleInfo,
  ExportInfo,
  ImportInfo,
  DependencyInfo,
  ConstructorInfo,
  MethodInfo,
  MethodSignature,
  PropertyInfo,
  GenericInfo,
  ExceptionInfo,
  DeprecationInfo,
  SourceLocation,
  CodeComplexity,
  DocumentationTemplate,
  TemplateVariable,
  TemplateSectionConfig,
  StyleConfig,
  ColorScheme,
  TypographyConfig,
  LayoutConfig,
  TemplateMetadata,
  ValidationError,
  ValidationWarning,
  Author,
  DocumentationAnalytics,
  PageView,
  SearchQuery,
  FeedbackData,
  ContentMetrics,
  UserBehavior,
  PerformanceMetrics,
  AccessibilityMetrics,
  AccessibilityViolation
} from './types';

// Utility Functions
export const createDocumentationService = (config?: Partial<DocumentationConfig>) => {
  return new DocumentationAIService(config);
};

export const createMarkdownConfig = (
  theme: 'github' | 'gitbook' | 'material' | 'minimal' | 'custom' = 'github'
): MarkdownOutputOptions => ({
  theme,
  includeTableOfContents: true,
  tocDepth: 3,
  includeBackToTop: true,
  enableSyntaxHighlighting: true,
  syntaxTheme: 'github',
  includeLineNumbers: false,
  enableMermaidDiagrams: true,
  enableMathJax: false,
  searchEnabled: true,
  navigation: {
    sidebar: {
      enabled: true,
      collapsible: true,
      autoGenerate: true
    },
    header: {
      search: true,
      darkModeToggle: true
    },
    footer: {
      enabled: true
    },
    breadcrumbs: true
  }
});

export const createAPIDocumentationConfig = (
  title: string,
  version: string,
  description: string
): APIDocumentationConfig => ({
  title,
  version,
  description,
  includeSchemas: true,
  includeExamples: true,
  includeHeaders: true,
  includeResponseCodes: true,
  groupByTags: true,
  generateSDK: false,
  generatePostmanCollection: true,
  generateInsomniaCollection: false
});

export const detectDocumentationType = (fileName: string): DocumentationType => {
  const name = fileName.toLowerCase();
  
  if (name.includes('readme')) return 'readme';
  if (name.includes('api') || name.includes('openapi') || name.includes('swagger')) return 'api';
  if (name.includes('tutorial') || name.includes('guide')) return 'tutorial';
  if (name.includes('changelog') || name.includes('history')) return 'changelog';
  if (name.includes('contributing')) return 'contributing';
  if (name.includes('architecture')) return 'architecture';
  if (name.includes('deployment')) return 'deployment';
  if (name.includes('troubleshooting') || name.includes('faq')) return 'troubleshooting';
  if (name.includes('examples')) return 'examples';
  if (name.includes('reference')) return 'reference';
  if (name.includes('spec')) return 'specification';
  
  return 'library'; // Default
};

export const getRecommendedSectionsForType = (type: DocumentationType): SectionType[] => {
  const sectionMap: Record<DocumentationType, SectionType[]> = {
    'api': ['overview', 'api_reference', 'examples'],
    'library': ['overview', 'installation', 'quickstart', 'api_reference', 'examples'],
    'framework': ['overview', 'installation', 'quickstart', 'guide', 'api_reference'],
    'tutorial': ['overview', 'tutorial', 'examples'],
    'guide': ['overview', 'guide', 'examples'],
    'reference': ['api_reference'],
    'changelog': ['changelog'],
    'readme': ['overview', 'installation', 'quickstart', 'examples'],
    'contributing': ['contributing'],
    'architecture': ['overview'],
    'deployment': ['overview'],
    'troubleshooting': ['troubleshooting', 'faq'],
    'faq': ['faq'],
    'examples': ['examples'],
    'specification': ['overview', 'api_reference']
  };
  
  return sectionMap[type] || ['overview'];
};

export const isValidLanguageForDocumentation = (language: string): language is SupportedDocLanguage => {
  const supportedLanguages: SupportedDocLanguage[] = [
    'javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust',
    'php', 'ruby', 'swift', 'kotlin', 'dart', 'scala', 'cpp', 'c',
    'shell', 'sql', 'yaml', 'json'
  ];
  
  return supportedLanguages.includes(language as SupportedDocLanguage);
};

export const getLanguageFromFileExtension = (fileName: string): SupportedDocLanguage => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const extensionMap: Record<string, SupportedDocLanguage> = {
    'js': 'javascript',
    'mjs': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'scala': 'scala',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'c': 'c',
    'h': 'c',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json'
  };
  
  return extensionMap[ext || ''] || 'javascript';
};

export const validateDocumentationRequest = (request: DocumentationRequest): string[] => {
  const errors: string[] = [];
  
  if (!request.sourceCode?.trim()) {
    errors.push('Source code is required');
  }
  
  if (!request.sourceFiles || request.sourceFiles.length === 0) {
    errors.push('At least one source file must be specified');
  }
  
  if (!isValidLanguageForDocumentation(request.language)) {
    errors.push(`Unsupported language: ${request.language}`);
  }
  
  if (request.apiConfig && request.documentationType !== 'api') {
    errors.push('API configuration can only be used with API documentation type');
  }
  
  return errors;
};

// Event Constants
export const DOCUMENTATION_EVENTS = {
  SERVICE_INITIALIZED: 'service:initialized',
  SERVICE_ERROR: 'service:error',
  SERVICE_SHUTDOWN: 'service:shutdown',
  GENERATION_STARTED: 'generation:started',
  GENERATION_PROGRESS: 'generation:progress',
  GENERATION_COMPLETED: 'generation:completed',
  GENERATION_ERROR: 'generation:error',
  ANALYSIS_STARTED: 'analysis:started',
  ANALYSIS_COMPLETED: 'analysis:completed',
  ANALYSIS_ERROR: 'analysis:error',
  VALIDATION_STARTED: 'validation:started',
  VALIDATION_COMPLETED: 'validation:completed',
  VALIDATION_ERROR: 'validation:error',
  OPTIMIZATION_STARTED: 'optimization:started',
  OPTIMIZATION_COMPLETED: 'optimization:completed',
  OPTIMIZATION_ERROR: 'optimization:error',
  ASSET_GENERATION_STARTED: 'asset:generation:started',
  ASSET_GENERATION_COMPLETED: 'asset:generation:completed',
  ASSET_GENERATION_ERROR: 'asset:generation:error'
} as const;

// Default Configurations
export const DEFAULT_DOCUMENTATION_CONFIG: DocumentationConfig = {
  defaultLanguage: 'typescript',
  defaultFormat: 'markdown',
  defaultOptions: {
    includePrivateMembers: false,
    includeInternalComments: true,
    generateExamples: true,
    includeTypeDefinitions: true,
    includeUsageGuides: true,
    includeTutorials: false,
    includeAPIReference: true,
    includeChangelog: false,
    includeTroubleshooting: true,
    autoGenerateImages: false,
    includeCodeSnippets: true,
    generateInteractiveExamples: false,
    includePerformanceNotes: true,
    includeSecurity: true
  },
  templates: [],
  validation: {
    enabled: true,
    rules: ['grammar', 'completeness', 'consistency', 'clarity'],
    strict: false
  },
  ai: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 3000
  },
  output: {
    baseDir: './docs',
    assetsDir: './docs/assets',
    templatesDir: './docs/templates'
  },
  generation: {
    includeTimestamps: true,
    generateTOC: true,
    enableSearch: true,
    enableVersioning: false
  }
};

// Quality Thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 80,
  ACCEPTABLE: 70,
  POOR: 60,
  FAILING: 50
} as const;

// Documentation Presets
export const LIBRARY_DOCUMENTATION_PRESET = {
  documentationType: 'library' as DocumentationType,
  format: 'markdown' as DocumentationFormat,
  options: {
    includeAPIReference: true,
    generateExamples: true,
    includeUsageGuides: true,
    includeInstallation: true,
    includeTroubleshooting: true
  }
};

export const API_DOCUMENTATION_PRESET = {
  documentationType: 'api' as DocumentationType,
  format: 'openapi' as DocumentationFormat,
  options: {
    includeAPIReference: true,
    generateExamples: true,
    includeAuthenticationGuide: true,
    includeErrorHandling: true,
    generatePostmanCollection: true
  }
};

export const TUTORIAL_DOCUMENTATION_PRESET = {
  documentationType: 'tutorial' as DocumentationType,
  format: 'markdown' as DocumentationFormat,
  options: {
    includeTutorials: true,
    generateExamples: true,
    includeStepByStep: true,
    includePrerequisites: true,
    generateInteractiveExamples: true
  }
};

// Export all types for convenience
export type { DocumentationAIService } from './documentation-ai-service';