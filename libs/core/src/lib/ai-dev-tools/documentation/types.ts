/**
 * @fileoverview Documentation Generation Types
 * Type definitions for AC4: Documentation Generation with AI enhancement
 */

export interface DocumentationRequest {
  sourceCode: string;
  sourceFiles: string[];
  language: SupportedDocLanguage;
  outputFormat: DocumentationFormat;
  documentationType: DocumentationType;
  options?: DocumentationOptions;
  apiConfig?: APIDocumentationConfig;
  markdownConfig?: MarkdownOutputOptions;
}

export interface DocumentationResponse {
  id: string;
  sourceFiles: string[];
  outputFormat: DocumentationFormat;
  documentationType: DocumentationType;
  content: string;
  sections: DocumentationSection[];
  assets: DocumentationAsset[];
  metadata: DocumentationMetadata;
  suggestions: DocumentationSuggestion[];
  metrics: DocumentationMetrics;
  timestamp: number;
}

export interface DocumentationOptions {
  includePrivateMembers?: boolean;
  includeInternalComments?: boolean;
  generateExamples?: boolean;
  includeTypeDefinitions?: boolean;
  includeUsageGuides?: boolean;
  includeTutorials?: boolean;
  includeAPIReference?: boolean;
  includeChangelog?: boolean;
  includeTroubleshooting?: boolean;
  autoGenerateImages?: boolean;
  includeCodeSnippets?: boolean;
  generateInteractiveExamples?: boolean;
  includePerformanceNotes?: boolean;
  includeSecurity?: boolean;
  customSections?: CustomSection[];
  templatePath?: string;
  outputPath?: string;
  baseUrl?: string;
}

export type SupportedDocLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'scala'
  | 'cpp'
  | 'c'
  | 'shell'
  | 'sql'
  | 'yaml'
  | 'json';

export type DocumentationFormat = 
  | 'markdown'
  | 'html'
  | 'pdf'
  | 'docx'
  | 'json'
  | 'openapi'
  | 'swagger'
  | 'gitbook'
  | 'confluence'
  | 'notion'
  | 'sphinx'
  | 'jekyll'
  | 'docusaurus'
  | 'vuepress'
  | 'latex';

export type DocumentationType = 
  | 'api'
  | 'library'
  | 'framework'
  | 'tutorial'
  | 'guide'
  | 'reference'
  | 'changelog'
  | 'readme'
  | 'contributing'
  | 'architecture'
  | 'deployment'
  | 'troubleshooting'
  | 'faq'
  | 'examples'
  | 'specification';

export interface APIDocumentationConfig {
  title: string;
  version: string;
  description: string;
  baseUrl?: string;
  servers?: APIServer[];
  authentication?: AuthenticationConfig;
  includeSchemas?: boolean;
  includeExamples?: boolean;
  includeHeaders?: boolean;
  includeResponseCodes?: boolean;
  groupByTags?: boolean;
  customTags?: string[];
  generateSDK?: boolean;
  generatePostmanCollection?: boolean;
  generateInsomniaCollection?: boolean;
}

export interface MarkdownOutputOptions {
  theme?: 'github' | 'gitbook' | 'material' | 'minimal' | 'custom';
  includeTableOfContents?: boolean;
  tocDepth?: number;
  includeBackToTop?: boolean;
  enableSyntaxHighlighting?: boolean;
  syntaxTheme?: string;
  includeLineNumbers?: boolean;
  enableMermaidDiagrams?: boolean;
  enableMathJax?: boolean;
  customCSS?: string;
  customJavaScript?: string;
  navigation?: NavigationConfig;
  searchEnabled?: boolean;
}

export interface NavigationConfig {
  sidebar?: SidebarConfig;
  header?: HeaderConfig;
  footer?: FooterConfig;
  breadcrumbs?: boolean;
}

export interface SidebarConfig {
  enabled: boolean;
  collapsible: boolean;
  autoGenerate: boolean;
  customItems?: NavigationItem[];
}

export interface HeaderConfig {
  logo?: string;
  title?: string;
  navigation?: NavigationItem[];
  search?: boolean;
  darkModeToggle?: boolean;
}

export interface FooterConfig {
  enabled: boolean;
  content?: string;
  links?: NavigationItem[];
  copyright?: string;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  children?: NavigationItem[];
}

export interface DocumentationSection {
  id: string;
  title: string;
  type: SectionType;
  content: string;
  level: number;
  order: number;
  metadata: SectionMetadata;
  subsections: DocumentationSection[];
}

export type SectionType = 
  | 'overview'
  | 'installation'
  | 'quickstart'
  | 'api_reference'
  | 'examples'
  | 'tutorial'
  | 'guide'
  | 'troubleshooting'
  | 'faq'
  | 'changelog'
  | 'contributing'
  | 'license'
  | 'custom';

export interface SectionMetadata {
  generatedAt: number;
  source: string;
  aiGenerated: boolean;
  reviewRequired: boolean;
  lastUpdated?: number;
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: number;
}

export interface DocumentationAsset {
  id: string;
  type: AssetType;
  name: string;
  path: string;
  url?: string;
  size: number;
  format: string;
  metadata: AssetMetadata;
}

export type AssetType = 
  | 'image'
  | 'diagram'
  | 'video'
  | 'audio'
  | 'file'
  | 'code_snippet'
  | 'interactive_demo'
  | 'api_collection';

export interface AssetMetadata {
  alt?: string;
  caption?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  duration?: number;
  language?: string;
  tags: string[];
}

export interface DocumentationMetadata {
  title: string;
  description: string;
  version: string;
  language: SupportedDocLanguage;
  authors: Author[];
  created: number;
  lastModified: number;
  tags: string[];
  categories: string[];
  readingTime: number;
  wordCount: number;
  codeBlockCount: number;
  imageCount: number;
  linkCount: number;
  tableCount: number;
  complexity: DocumentationComplexity;
  completeness: number;
  quality: DocumentationQuality;
}

export interface Author {
  name: string;
  email?: string;
  url?: string;
  role?: string;
}

export interface DocumentationComplexity {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score: number;
  factors: ComplexityFactor[];
}

export interface ComplexityFactor {
  type: 'vocabulary' | 'concepts' | 'code_complexity' | 'prerequisites' | 'length';
  score: number;
  description: string;
}

export interface DocumentationQuality {
  score: number;
  factors: QualityFactor[];
  issues: QualityIssue[];
  suggestions: string[];
}

export interface QualityFactor {
  type: 'clarity' | 'completeness' | 'accuracy' | 'consistency' | 'usefulness';
  score: number;
  weight: number;
  description: string;
}

export interface QualityIssue {
  type: 'grammar' | 'spelling' | 'clarity' | 'consistency' | 'completeness' | 'accuracy';
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: {
    section: string;
    line?: number;
    column?: number;
  };
  suggestion: string;
}

export interface DocumentationSuggestion {
  id: string;
  type: 'improvement' | 'addition' | 'restructure' | 'clarification' | 'example' | 'cross_reference';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  section?: string;
  suggestedContent?: string;
  reasoning: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface DocumentationMetrics {
  generationTime: number;
  sectionsGenerated: number;
  wordsGenerated: number;
  codeSnippetsGenerated: number;
  examplesGenerated: number;
  aiConfidence: number;
  humanReviewRecommended: boolean;
  readabilityScore: number;
  completenessScore: number;
  qualityScore: number;
  estimatedMaintenanceEffort: MaintenanceEffort;
}

export interface MaintenanceEffort {
  level: 'low' | 'medium' | 'high';
  hoursPerMonth: number;
  factors: string[];
  recommendations: string[];
}

export interface CustomSection {
  id: string;
  title: string;
  template: string;
  variables: SectionVariable[];
  order: number;
  required: boolean;
}

export interface SectionVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface APIServer {
  url: string;
  description: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface AuthenticationConfig {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuth2Flows;
  openIdConnectUrl?: string;
}

export interface OAuth2Flows {
  implicit?: OAuth2Flow;
  password?: OAuth2Flow;
  clientCredentials?: OAuth2Flow;
  authorizationCode?: OAuth2Flow;
}

export interface OAuth2Flow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface CodeAnalysisResult {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  types: TypeInfo[];
  constants: ConstantInfo[];
  modules: ModuleInfo[];
  dependencies: DependencyInfo[];
  complexity: CodeComplexity;
}

export interface FunctionInfo {
  name: string;
  description?: string;
  parameters: ParameterInfo[];
  returnType: TypeInfo;
  isAsync: boolean;
  isPublic: boolean;
  isStatic: boolean;
  examples: string[];
  throws: ExceptionInfo[];
  since?: string;
  deprecated?: DeprecationInfo;
  tags: string[];
  sourceLocation: SourceLocation;
}

export interface ClassInfo {
  name: string;
  description?: string;
  extends?: string;
  implements: string[];
  constructors: ConstructorInfo[];
  methods: MethodInfo[];
  properties: PropertyInfo[];
  isPublic: boolean;
  isAbstract: boolean;
  generics: GenericInfo[];
  examples: string[];
  since?: string;
  deprecated?: DeprecationInfo;
  tags: string[];
  sourceLocation: SourceLocation;
}

export interface InterfaceInfo {
  name: string;
  description?: string;
  extends: string[];
  methods: MethodSignature[];
  properties: PropertyInfo[];
  generics: GenericInfo[];
  examples: string[];
  since?: string;
  deprecated?: DeprecationInfo;
  tags: string[];
  sourceLocation: SourceLocation;
}

export interface TypeInfo {
  name: string;
  type: string;
  description?: string;
  nullable: boolean;
  optional: boolean;
  defaultValue?: any;
  constraints?: string[];
  examples: any[];
}

export interface ParameterInfo {
  name: string;
  type: TypeInfo;
  description?: string;
  required: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value?: any;
  message?: string;
}

export interface ConstantInfo {
  name: string;
  value: any;
  type: string;
  description?: string;
  isPublic: boolean;
  deprecated?: DeprecationInfo;
  sourceLocation: SourceLocation;
}

export interface ModuleInfo {
  name: string;
  description?: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  path: string;
  version?: string;
  dependencies: string[];
  deprecated?: DeprecationInfo;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable';
  isDefault: boolean;
  description?: string;
}

export interface ImportInfo {
  name: string;
  from: string;
  isDefault: boolean;
  alias?: string;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer' | 'optional';
  description?: string;
  license?: string;
  repository?: string;
  size?: number;
}

export interface ConstructorInfo {
  parameters: ParameterInfo[];
  description?: string;
  examples: string[];
  throws: ExceptionInfo[];
  isPublic: boolean;
  deprecated?: DeprecationInfo;
  sourceLocation: SourceLocation;
}

export interface MethodInfo {
  name: string;
  description?: string;
  parameters: ParameterInfo[];
  returnType: TypeInfo;
  isAsync: boolean;
  isPublic: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  overrides?: string;
  examples: string[];
  throws: ExceptionInfo[];
  since?: string;
  deprecated?: DeprecationInfo;
  tags: string[];
  sourceLocation: SourceLocation;
}

export interface MethodSignature {
  name: string;
  parameters: ParameterInfo[];
  returnType: TypeInfo;
  description?: string;
  optional: boolean;
}

export interface PropertyInfo {
  name: string;
  type: TypeInfo;
  description?: string;
  isPublic: boolean;
  isStatic: boolean;
  isReadonly: boolean;
  getter?: boolean;
  setter?: boolean;
  defaultValue?: any;
  examples: any[];
  since?: string;
  deprecated?: DeprecationInfo;
  sourceLocation: SourceLocation;
}

export interface GenericInfo {
  name: string;
  constraint?: string;
  defaultType?: string;
  description?: string;
}

export interface ExceptionInfo {
  type: string;
  description: string;
  when: string;
}

export interface DeprecationInfo {
  since: string;
  reason: string;
  alternative?: string;
  willBeRemovedIn?: string;
}

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface CodeComplexity {
  overall: number;
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  factors: ComplexityFactor[];
}

export interface DocumentationTemplate {
  id: string;
  name: string;
  description: string;
  format: DocumentationFormat;
  type: DocumentationType;
  language: SupportedDocLanguage;
  template: string;
  variables: TemplateVariable[];
  sections: TemplateSectionConfig[];
  styles?: StyleConfig;
  metadata: TemplateMetadata;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'section';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
}

export interface TemplateSectionConfig {
  id: string;
  title: string;
  type: SectionType;
  required: boolean;
  order: number;
  condition?: string;
  template: string;
  variables: TemplateVariable[];
}

export interface StyleConfig {
  theme: string;
  colors: ColorScheme;
  typography: TypographyConfig;
  layout: LayoutConfig;
  customCSS?: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  code: string;
  codeBackground: string;
}

export interface TypographyConfig {
  fontFamily: string;
  codeFontFamily: string;
  fontSize: {
    base: string;
    heading1: string;
    heading2: string;
    heading3: string;
    code: string;
  };
  lineHeight: {
    base: number;
    heading: number;
    code: number;
  };
}

export interface LayoutConfig {
  maxWidth: string;
  sidebar: {
    width: string;
    position: 'left' | 'right';
  };
  spacing: {
    base: string;
    section: string;
    paragraph: string;
  };
}

export interface TemplateMetadata {
  version: string;
  author: Author;
  created: number;
  lastModified: number;
  tags: string[];
  category: string;
  license: string;
  repository?: string;
  demo?: string;
}

export interface DocumentationValidationResult {
  valid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  checkedRules: string[];
}

export interface ValidationError {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    section: string;
    line?: number;
    column?: number;
  };
  fix?: string;
}

export interface ValidationWarning {
  rule: string;
  message: string;
  location?: {
    section: string;
    line?: number;
    column?: number;
  };
  suggestion: string;
}

export interface DocumentationConfig {
  defaultLanguage: SupportedDocLanguage;
  defaultFormat: DocumentationFormat;
  defaultOptions: DocumentationOptions;
  templates: DocumentationTemplate[];
  validation: {
    enabled: boolean;
    rules: string[];
    strict: boolean;
  };
  ai: {
    provider: 'openai' | 'anthropic' | 'ollama';
    model: string;
    temperature: number;
    maxTokens: number;
  };
  output: {
    baseDir: string;
    assetsDir: string;
    templatesDir: string;
  };
  generation: {
    includeTimestamps: boolean;
    generateTOC: boolean;
    enableSearch: boolean;
    enableVersioning: boolean;
  };
}

export interface DocumentationAnalytics {
  pageViews: PageView[];
  searchQueries: SearchQuery[];
  feedbackData: FeedbackData[];
  contentMetrics: ContentMetrics;
  userBehavior: UserBehavior;
  performanceMetrics: PerformanceMetrics;
}

export interface PageView {
  path: string;
  timestamp: number;
  userAgent: string;
  referrer?: string;
  duration?: number;
  exitPage: boolean;
}

export interface SearchQuery {
  query: string;
  timestamp: number;
  resultsCount: number;
  clickedResult?: string;
  position?: number;
}

export interface FeedbackData {
  page: string;
  rating: number;
  comment?: string;
  timestamp: number;
  helpful: boolean;
  category?: string;
}

export interface ContentMetrics {
  totalPages: number;
  totalWords: number;
  averageReadingTime: number;
  mostViewedPages: string[];
  leastViewedPages: string[];
  outdatedPages: string[];
  brokenLinks: string[];
}

export interface UserBehavior {
  averageSessionDuration: number;
  bounceRate: number;
  pagesPerSession: number;
  commonPaths: string[];
  dropOffPoints: string[];
  searchUsage: number;
}

export interface PerformanceMetrics {
  averageLoadTime: number;
  searchResponseTime: number;
  imageLoadTime: number;
  mobilePerformance: number;
  desktopPerformance: number;
  accessibility: AccessibilityMetrics;
}

export interface AccessibilityMetrics {
  score: number;
  violations: AccessibilityViolation[];
  improvements: string[];
}

export interface AccessibilityViolation {
  type: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  element?: string;
  fix: string;
}