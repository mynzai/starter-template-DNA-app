/**
 * @fileoverview Interactive Documentation System - Epic 6 Story 2 AC1
 * 
 * Provides comprehensive interactive documentation with live code examples,
 * tutorials, and hands-on learning experiences for DNA templates and modules.
 * 
 * Features:
 * - Live code playground with real-time execution
 * - Interactive tutorials with step-by-step guidance
 * - Code examples with syntax highlighting and validation
 * - Template-specific documentation generation
 * - Multi-format content support (Markdown, MDX, HTML)
 * - Real-time collaboration and community contributions
 * - Progress tracking and learning analytics
 * - Framework-specific examples and patterns
 * 
 * @version 1.0.0
 * @author DNA Development Team
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Core documentation interfaces
export interface InteractiveDocsConfig {
  projectName: string;
  framework: string;
  baseUrl: string;
  outputDir: string;
  sourceDir: string;
  theme: DocsTheme;
  features: DocsFeatures;
  playground: PlaygroundConfig;
  tutorials: TutorialConfig;
  examples: ExampleConfig;
  search: SearchConfig;
  analytics: AnalyticsConfig;
  collaboration: CollaborationConfig;
  deployment: DeploymentConfig;
  integrations: Integration[];
  plugins: DocsPlugin[];
  customization: CustomizationConfig;
}

export interface DocsTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  codeBackgroundColor: string;
  borderColor: string;
  fontFamily: string;
  codeFontFamily: string;
  layout: LayoutConfig;
  components: ComponentTheme;
  responsive: ResponsiveConfig;
  darkMode: DarkModeConfig;
  animations: AnimationConfig;
}

export interface LayoutConfig {
  header: HeaderConfig;
  sidebar: SidebarConfig;
  footer: FooterConfig;
  content: ContentConfig;
  navigation: NavigationConfig;
}

export interface HeaderConfig {
  enabled: boolean;
  height: number;
  logo: LogoConfig;
  navigation: NavigationItem[];
  search: boolean;
  darkModeToggle: boolean;
  languageSelector: boolean;
  userMenu: boolean;
}

export interface LogoConfig {
  src: string;
  alt: string;
  width: number;
  height: number;
  link: string;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  external?: boolean;
  children?: NavigationItem[];
  badge?: string;
  description?: string;
}

export interface SidebarConfig {
  enabled: boolean;
  width: number;
  collapsible: boolean;
  autoCollapse: boolean;
  position: 'left' | 'right';
  categories: SidebarCategory[];
}

export interface SidebarCategory {
  title: string;
  icon?: string;
  collapsed?: boolean;
  items: SidebarItem[];
}

export interface SidebarItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  description?: string;
  children?: SidebarItem[];
}

export interface FooterConfig {
  enabled: boolean;
  content: string;
  links: FooterLink[];
  social: SocialLink[];
  copyright: string;
}

export interface FooterLink {
  title: string;
  href: string;
  external?: boolean;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface ContentConfig {
  maxWidth: number;
  padding: number;
  enableToc: boolean;
  tocPosition: 'right' | 'left' | 'inline';
  enableBreadcrumbs: boolean;
  enableEditButton: boolean;
  enableFeedback: boolean;
}

export interface NavigationConfig {
  enablePrevNext: boolean;
  enableBackToTop: boolean;
  stickyNavigation: boolean;
  showProgress: boolean;
}

export interface ComponentTheme {
  codeBlock: CodeBlockTheme;
  callout: CalloutTheme;
  tabs: TabsTheme;
  accordion: AccordionTheme;
  table: TableTheme;
  button: ButtonTheme;
  card: CardTheme;
}

export interface CodeBlockTheme {
  theme: string;
  showLineNumbers: boolean;
  showCopyButton: boolean;
  highlightLines: boolean;
  wrapLines: boolean;
  fontSize: number;
  borderRadius: number;
}

export interface CalloutTheme {
  variants: Record<string, CalloutVariant>;
}

export interface CalloutVariant {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
}

export interface TabsTheme {
  borderColor: string;
  activeColor: string;
  hoverColor: string;
  backgroundColor: string;
}

export interface AccordionTheme {
  borderColor: string;
  backgroundColor: string;
  hoverColor: string;
  iconColor: string;
}

export interface TableTheme {
  borderColor: string;
  headerBackgroundColor: string;
  stripedBackgroundColor: string;
  hoverColor: string;
}

export interface ButtonTheme {
  variants: Record<string, ButtonVariant>;
}

export interface ButtonVariant {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  hoverBackgroundColor: string;
  hoverTextColor: string;
}

export interface CardTheme {
  backgroundColor: string;
  borderColor: string;
  shadowColor: string;
  borderRadius: number;
}

export interface ResponsiveConfig {
  breakpoints: Record<string, number>;
  mobileNavigation: boolean;
  collapseSidebar: boolean;
  stackLayout: boolean;
}

export interface DarkModeConfig {
  enabled: boolean;
  defaultMode: 'light' | 'dark' | 'system';
  storageKey: string;
  togglePosition: 'header' | 'sidebar' | 'floating';
}

export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: string;
  pageTransitions: boolean;
  hoverEffects: boolean;
  scrollAnimations: boolean;
}

export interface DocsFeatures {
  enablePlayground: boolean;
  enableTutorials: boolean;
  enableExamples: boolean;
  enableVersioning: boolean;
  enableTranslations: boolean;
  enableComments: boolean;
  enableRatings: boolean;
  enableBookmarks: boolean;
  enableSharing: boolean;
  enablePrint: boolean;
  enableOffline: boolean;
  enablePWA: boolean;
  enableAnalytics: boolean;
  enableSearch: boolean;
  enableAI: boolean;
}

export interface PlaygroundConfig {
  enabled: boolean;
  frameworks: PlaygroundFramework[];
  features: PlaygroundFeatures;
  sandboxes: SandboxProvider[];
  templates: PlaygroundTemplate[];
  sharing: SharingConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

export interface PlaygroundFramework {
  name: string;
  version: string;
  runtime: 'browser' | 'node' | 'webcontainer' | 'iframe';
  dependencies: string[];
  preset: string;
  transpiler: TranspilerConfig;
  bundler: BundlerConfig;
  devServer: DevServerConfig;
}

export interface TranspilerConfig {
  name: 'babel' | 'swc' | 'esbuild' | 'typescript';
  options: Record<string, any>;
  plugins: string[];
}

export interface BundlerConfig {
  name: 'webpack' | 'vite' | 'rollup' | 'esbuild' | 'parcel';
  options: Record<string, any>;
  plugins: string[];
}

export interface DevServerConfig {
  port: number;
  hot: boolean;
  liveReload: boolean;
  proxy: Record<string, string>;
}

export interface PlaygroundFeatures {
  enableConsole: boolean;
  enableTerminal: boolean;
  enableFileExplorer: boolean;
  enableMultiFile: boolean;
  enableImports: boolean;
  enableExports: boolean;
  enableTests: boolean;
  enableDebugger: boolean;
  enableFormatting: boolean;
  enableLinting: boolean;
  enableTypeCheck: boolean;
  enableAutoSave: boolean;
  enableVersionControl: boolean;
  enableCollaboration: boolean;
}

export interface SandboxProvider {
  name: string;
  type: 'local' | 'cloud' | 'iframe';
  url?: string;
  config: SandboxConfig;
}

export interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  diskLimit: number;
  networkAccess: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  environment: Record<string, string>;
}

export interface PlaygroundTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  tags: string[];
  files: PlaygroundFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  configuration: Record<string, any>;
  preview: PreviewConfig;
}

export interface PlaygroundFile {
  path: string;
  content: string;
  language: string;
  readOnly: boolean;
  hidden: boolean;
  collapsed: boolean;
}

export interface PreviewConfig {
  enabled: boolean;
  port: number;
  path: string;
  autoRefresh: boolean;
  devices: DevicePreset[];
}

export interface DevicePreset {
  name: string;
  width: number;
  height: number;
  userAgent: string;
}

export interface SharingConfig {
  enabled: boolean;
  providers: SharingProvider[];
  embedCode: boolean;
  publicGallery: boolean;
  privateSharing: boolean;
}

export interface SharingProvider {
  name: string;
  type: 'url' | 'embed' | 'download' | 'export';
  config: Record<string, any>;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  enableCompression: boolean;
  enableLazyLoading: boolean;
  bundleSizeLimit: number;
  executionTimeout: number;
  memoryLimit: number;
}

export interface SecurityConfig {
  enableSandboxing: boolean;
  allowedScripts: string[];
  blockedScripts: string[];
  allowedDomains: string[];
  blockedDomains: string[];
  enableCSP: boolean;
  cspPolicy: string;
}

export interface TutorialConfig {
  enabled: boolean;
  categories: TutorialCategory[];
  features: TutorialFeatures;
  assessment: AssessmentConfig;
  progress: ProgressConfig;
  certificates: CertificateConfig;
}

export interface TutorialCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  prerequisites: string[];
  estimatedTime: number;
  difficulty: TutorialDifficulty;
  tutorials: Tutorial[];
}

export type TutorialDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: TutorialDifficulty;
  estimatedTime: number;
  tags: string[];
  prerequisites: string[];
  objectives: string[];
  steps: TutorialStep[];
  resources: Resource[];
  assessment: Assessment;
  metadata: TutorialMetadata;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: StepContent;
  validation: StepValidation;
  hints: Hint[];
  resources: Resource[];
  navigation: StepNavigation;
}

export interface StepContent {
  type: ContentType;
  content: string;
  code?: CodeContent;
  media?: MediaContent;
  interactive?: InteractiveContent;
  quiz?: QuizContent;
}

export type ContentType = 
  | 'text' 
  | 'code' 
  | 'media' 
  | 'interactive' 
  | 'quiz' 
  | 'playground' 
  | 'embedded';

export interface CodeContent {
  language: string;
  code: string;
  editable: boolean;
  runnable: boolean;
  highlightLines: number[];
  explanation: string;
  solution?: string;
}

export interface MediaContent {
  type: 'image' | 'video' | 'audio' | 'iframe';
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  controls?: boolean;
  autoplay?: boolean;
}

export interface InteractiveContent {
  type: 'form' | 'survey' | 'game' | 'simulation' | 'widget';
  config: Record<string, any>;
  validation: Record<string, any>;
}

export interface QuizContent {
  questions: QuizQuestion[];
  randomize: boolean;
  timeLimit?: number;
  passingScore: number;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: QuizOption[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  hints: string[];
}

export type QuestionType = 
  | 'multiple-choice' 
  | 'multiple-select' 
  | 'true-false' 
  | 'fill-blank' 
  | 'code' 
  | 'drag-drop';

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface StepValidation {
  type: ValidationType;
  rules: ValidationRule[];
  feedback: ValidationFeedback;
}

export type ValidationType = 'automatic' | 'manual' | 'peer' | 'instructor';

export interface ValidationRule {
  id: string;
  type: 'code' | 'output' | 'file' | 'behavior' | 'custom';
  condition: string;
  message: string;
  points: number;
}

export interface ValidationFeedback {
  success: string;
  failure: string;
  partial: string;
  hints: string[];
}

export interface Hint {
  id: string;
  text: string;
  cost: number;
  unlockCondition?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  description?: string;
  external?: boolean;
}

export type ResourceType = 
  | 'documentation' 
  | 'video' 
  | 'article' 
  | 'tutorial' 
  | 'example' 
  | 'tool' 
  | 'reference';

export interface StepNavigation {
  allowSkip: boolean;
  allowBack: boolean;
  autoAdvance: boolean;
  showProgress: boolean;
}

export interface Assessment {
  enabled: boolean;
  type: AssessmentType;
  questions: QuizQuestion[];
  passingScore: number;
  attempts: number;
  timeLimit?: number;
  certificate: boolean;
}

export type AssessmentType = 'quiz' | 'project' | 'peer-review' | 'instructor-review';

export interface TutorialMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  status: TutorialStatus;
  ratings: Rating[];
  reviews: Review[];
  completions: number;
  averageTime: number;
  successRate: number;
}

export type TutorialStatus = 'draft' | 'published' | 'archived' | 'deprecated';

export interface Rating {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  title: string;
  content: string;
  rating: number;
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TutorialFeatures {
  enableProgress: boolean;
  enableBookmarks: boolean;
  enableNotes: boolean;
  enableComments: boolean;
  enableRatings: boolean;
  enableCertificates: boolean;
  enableOfflineMode: boolean;
  enableSocialSharing: boolean;
  enablePeerReview: boolean;
  enableInstructorFeedback: boolean;
}

export interface AssessmentConfig {
  enabled: boolean;
  types: AssessmentType[];
  defaultPassingScore: number;
  maxAttempts: number;
  timeLimit: number;
  enableProctorin: boolean;
  enablePlagiarismDetection: boolean;
}

export interface ProgressConfig {
  trackingEnabled: boolean;
  saveInterval: number;
  syncToCloud: boolean;
  enableAnalytics: boolean;
  exportFormats: string[];
  retentionDays: number;
}

export interface CertificateConfig {
  enabled: boolean;
  template: string;
  signatories: Signatory[];
  verification: VerificationConfig;
  blockchain: BlockchainConfig;
}

export interface Signatory {
  name: string;
  title: string;
  signature: string;
  publicKey?: string;
}

export interface VerificationConfig {
  enabled: boolean;
  method: 'qr' | 'url' | 'blockchain' | 'digital-signature';
  endpoint?: string;
  publicKey?: string;
}

export interface BlockchainConfig {
  enabled: boolean;
  network: string;
  contractAddress: string;
  privateKey: string;
}

export interface ExampleConfig {
  enabled: boolean;
  categories: ExampleCategory[];
  features: ExampleFeatures;
  templates: ExampleTemplate[];
  showcase: ShowcaseConfig;
}

export interface ExampleCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  examples: Example[];
}

export interface Example {
  id: string;
  title: string;
  description: string;
  category: string;
  framework: string;
  difficulty: TutorialDifficulty;
  tags: string[];
  files: ExampleFile[];
  preview: ExamplePreview;
  documentation: string;
  metadata: ExampleMetadata;
}

export interface ExampleFile {
  path: string;
  content: string;
  language: string;
  highlighted: boolean;
  description?: string;
}

export interface ExamplePreview {
  enabled: boolean;
  type: 'iframe' | 'image' | 'video' | 'interactive';
  src: string;
  width?: number;
  height?: number;
  responsive: boolean;
}

export interface ExampleMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  downloads: number;
  views: number;
  likes: number;
  bookmarks: number;
}

export interface ExampleFeatures {
  enableDownload: boolean;
  enableFork: boolean;
  enableRun: boolean;
  enableShare: boolean;
  enableComments: boolean;
  enableRatings: boolean;
  enableBookmarks: boolean;
  enableVersions: boolean;
}

export interface ExampleTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  baseFiles: string[];
  configuration: Record<string, any>;
}

export interface ShowcaseConfig {
  enabled: boolean;
  featured: string[];
  categories: string[];
  filters: ShowcaseFilter[];
  sorting: ShowcaseSorting[];
}

export interface ShowcaseFilter {
  id: string;
  name: string;
  type: 'category' | 'framework' | 'difficulty' | 'tag';
  options: string[];
}

export interface ShowcaseSorting {
  id: string;
  name: string;
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchConfig {
  enabled: boolean;
  provider: SearchProvider;
  features: SearchFeatures;
  indexing: IndexingConfig;
  ui: SearchUIConfig;
}

export interface SearchProvider {
  name: 'algolia' | 'elasticsearch' | 'solr' | 'local' | 'custom';
  config: Record<string, any>;
  apiKey?: string;
  endpoint?: string;
}

export interface SearchFeatures {
  enableAutocomplete: boolean;
  enableFilters: boolean;
  enableFacets: boolean;
  enableTypo: boolean;
  enableHighlight: boolean;
  enableSnippets: boolean;
  enableHistory: boolean;
  enableSuggestions: boolean;
  enableVoiceSearch: boolean;
  enableImageSearch: boolean;
}

export interface IndexingConfig {
  autoIndex: boolean;
  indexInterval: number;
  includeContent: boolean;
  includeCode: boolean;
  includeComments: boolean;
  excludePatterns: string[];
  customFields: string[];
}

export interface SearchUIConfig {
  position: 'header' | 'sidebar' | 'modal' | 'dedicated';
  placeholder: string;
  shortcuts: string[];
  resultLimit: number;
  groupResults: boolean;
  showCategories: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  providers: AnalyticsProvider[];
  features: AnalyticsFeatures;
  privacy: PrivacyConfig;
  reporting: ReportingConfig;
}

export interface AnalyticsProvider {
  name: string;
  type: 'google' | 'mixpanel' | 'segment' | 'custom';
  config: Record<string, any>;
  trackingId?: string;
}

export interface AnalyticsFeatures {
  trackPageViews: boolean;
  trackEvents: boolean;
  trackUsers: boolean;
  trackSessions: boolean;
  trackPerformance: boolean;
  trackErrors: boolean;
  trackSearches: boolean;
  trackDownloads: boolean;
  trackShares: boolean;
  trackFeedback: boolean;
}

export interface PrivacyConfig {
  enableGDPR: boolean;
  enableCCPA: boolean;
  cookieConsent: boolean;
  anonymizeIPs: boolean;
  dataRetention: number;
  optOut: boolean;
}

export interface ReportingConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  dashboards: string[];
  customMetrics: string[];
}

export interface CollaborationConfig {
  enabled: boolean;
  features: CollaborationFeatures;
  moderation: ModerationConfig;
  permissions: PermissionConfig;
}

export interface CollaborationFeatures {
  enableComments: boolean;
  enableSuggestions: boolean;
  enableEditing: boolean;
  enableReviews: boolean;
  enableDiscussions: boolean;
  enableChat: boolean;
  enableNotifications: boolean;
  enableMentions: boolean;
}

export interface ModerationConfig {
  enabled: boolean;
  autoModeration: boolean;
  profanityFilter: boolean;
  spamDetection: boolean;
  moderators: string[];
  reportingEnabled: boolean;
}

export interface PermissionConfig {
  roles: Role[];
  defaultRole: string;
  inheritance: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface DeploymentConfig {
  provider: DeploymentProvider;
  features: DeploymentFeatures;
  environments: Environment[];
  automation: AutomationConfig;
}

export interface DeploymentProvider {
  name: string;
  type: 'static' | 'serverless' | 'container' | 'vm';
  config: Record<string, any>;
  endpoint?: string;
  credentials?: Record<string, string>;
}

export interface DeploymentFeatures {
  enablePreview: boolean;
  enableStaging: boolean;
  enableCDN: boolean;
  enableSSL: boolean;
  enableCustomDomain: boolean;
  enableRedirects: boolean;
  enableHeaders: boolean;
  enableCache: boolean;
}

export interface Environment {
  name: string;
  url: string;
  branch: string;
  variables: Record<string, string>;
  secrets: Record<string, string>;
}

export interface AutomationConfig {
  enabled: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  workflows: Workflow[];
}

export interface AutomationTrigger {
  type: 'push' | 'pr' | 'schedule' | 'manual' | 'webhook';
  config: Record<string, any>;
}

export interface AutomationAction {
  type: 'build' | 'test' | 'deploy' | 'notify' | 'custom';
  config: Record<string, any>;
}

export interface Workflow {
  name: string;
  triggers: AutomationTrigger[];
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  name: string;
  action: AutomationAction;
  condition?: string;
  parallel?: boolean;
}

export interface Integration {
  name: string;
  type: IntegrationType;
  enabled: boolean;
  config: Record<string, any>;
}

export type IntegrationType = 
  | 'git' 
  | 'cms' 
  | 'auth' 
  | 'storage' 
  | 'cdn' 
  | 'analytics' 
  | 'search' 
  | 'ai' 
  | 'custom';

export interface DocsPlugin {
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
  hooks: PluginHook[];
}

export interface PluginHook {
  event: string;
  handler: string;
  priority: number;
}

export interface CustomizationConfig {
  css: CSSCustomization;
  javascript: JSCustomization;
  html: HTMLCustomization;
  components: ComponentCustomization;
  layouts: LayoutCustomization;
}

export interface CSSCustomization {
  enabled: boolean;
  customCSS: string;
  variables: Record<string, string>;
  imports: string[];
}

export interface JSCustomization {
  enabled: boolean;
  customJS: string;
  modules: string[];
  events: string[];
}

export interface HTMLCustomization {
  enabled: boolean;
  head: string;
  body: string;
  footer: string;
}

export interface ComponentCustomization {
  overrides: Record<string, string>;
  extensions: Record<string, string>;
  templates: Record<string, string>;
}

export interface LayoutCustomization {
  templates: Record<string, string>;
  partials: Record<string, string>;
  variables: Record<string, any>;
}

// Documentation generation and management
export interface DocumentationPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  format: ContentFormat;
  metadata: PageMetadata;
  frontmatter: Record<string, any>;
  toc: TableOfContents;
  links: PageLink[];
  resources: Resource[];
  lastModified: Date;
  version: string;
  translations: Translation[];
}

export type ContentFormat = 'markdown' | 'mdx' | 'html' | 'jsx' | 'vue' | 'svelte';

export interface PageMetadata {
  author: string;
  description: string;
  keywords: string[];
  category: string;
  tags: string[];
  difficulty: TutorialDifficulty;
  estimatedTime: number;
  prerequisites: string[];
  objectives: string[];
  audience: string[];
  lastReviewed: Date;
  reviewedBy: string;
  status: PageStatus;
}

export type PageStatus = 'draft' | 'review' | 'published' | 'archived' | 'deprecated';

export interface TableOfContents {
  enabled: boolean;
  depth: number;
  items: TocItem[];
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
  anchor: string;
  children: TocItem[];
}

export interface PageLink {
  type: LinkType;
  href: string;
  text: string;
  external: boolean;
  broken: boolean;
}

export type LinkType = 'internal' | 'external' | 'anchor' | 'download' | 'email' | 'tel';

export interface Translation {
  language: string;
  title: string;
  content: string;
  status: TranslationStatus;
  translator: string;
  lastUpdated: Date;
}

export type TranslationStatus = 'pending' | 'in-progress' | 'completed' | 'needs-update';

// Live playground interfaces
export interface PlaygroundSession {
  id: string;
  userId?: string;
  template: PlaygroundTemplate;
  files: Map<string, PlaygroundFile>;
  status: PlaygroundStatus;
  runtime: RuntimeInfo;
  output: OutputInfo;
  errors: PlaygroundError[];
  console: ConsoleEntry[];
  performance: PerformanceInfo;
  sharing: SharingInfo;
  collaboration: CollaborationInfo;
  createdAt: Date;
  lastModified: Date;
}

export type PlaygroundStatus = 'idle' | 'loading' | 'running' | 'error' | 'stopped';

export interface RuntimeInfo {
  framework: string;
  version: string;
  bundler: string;
  status: RuntimeStatus;
  startTime?: Date;
  buildTime?: number;
  memoryUsage?: number;
  processes: ProcessInfo[];
}

export type RuntimeStatus = 'starting' | 'ready' | 'building' | 'error' | 'stopped';

export interface ProcessInfo {
  id: string;
  name: string;
  status: ProcessStatus;
  pid?: number;
  cpu?: number;
  memory?: number;
  uptime?: number;
}

export type ProcessStatus = 'starting' | 'running' | 'stopped' | 'error';

export interface OutputInfo {
  type: OutputType;
  content: string;
  timestamp: Date;
  source: string;
}

export type OutputType = 'stdout' | 'stderr' | 'build' | 'runtime' | 'test' | 'custom';

export interface PlaygroundError {
  id: string;
  type: ErrorType;
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  severity: ErrorSeverity;
  timestamp: Date;
  resolved: boolean;
}

export type ErrorType = 'syntax' | 'runtime' | 'build' | 'dependency' | 'network' | 'security';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface ConsoleEntry {
  id: string;
  type: ConsoleType;
  message: string;
  data?: any;
  timestamp: Date;
  source: string;
}

export type ConsoleType = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'clear';

export interface PerformanceInfo {
  buildTime: number;
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
}

export interface SharingInfo {
  enabled: boolean;
  shareUrl?: string;
  embedCode?: string;
  publicGallery: boolean;
  allowForks: boolean;
  viewCount: number;
  likeCount: number;
  forkCount: number;
}

export interface CollaborationInfo {
  enabled: boolean;
  participants: Participant[];
  permissions: CollaborationPermission[];
  cursors: CursorInfo[];
  comments: Comment[];
  activeEditors: string[];
}

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joinedAt: Date;
  lastActive: Date;
}

export type ParticipantRole = 'owner' | 'editor' | 'viewer' | 'commenter';
export type ParticipantStatus = 'online' | 'away' | 'offline';

export interface CollaborationPermission {
  userId: string;
  permissions: string[];
  grantedBy: string;
  grantedAt: Date;
}

export interface CursorInfo {
  userId: string;
  file: string;
  line: number;
  column: number;
  selection?: Selection;
  timestamp: Date;
}

export interface Selection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface Comment {
  id: string;
  userId: string;
  file: string;
  line: number;
  column: number;
  content: string;
  resolved: boolean;
  replies: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interactive Documentation System
 * 
 * Comprehensive documentation system with live examples, tutorials,
 * and interactive learning experiences.
 */
export class InteractiveDocumentationSystem extends EventEmitter {
  private config: InteractiveDocsConfig;
  private pages: Map<string, DocumentationPage> = new Map();
  private tutorials: Map<string, Tutorial> = new Map();
  private examples: Map<string, Example> = new Map();
  private playgroundSessions: Map<string, PlaygroundSession> = new Map();
  private searchIndex: any;
  private isInitialized = false;

  constructor(config: InteractiveDocsConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize documentation system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.emit('docs:initializing');

    try {
      // Initialize search index
      if (this.config.search.enabled) {
        await this.initializeSearch();
      }

      // Load existing documentation
      await this.loadDocumentation();

      // Initialize playground if enabled
      if (this.config.playground.enabled) {
        await this.initializePlayground();
      }

      // Initialize tutorials if enabled
      if (this.config.tutorials.enabled) {
        await this.initializeTutorials();
      }

      // Initialize examples if enabled
      if (this.config.examples.enabled) {
        await this.initializeExamples();
      }

      // Setup analytics if enabled
      if (this.config.analytics.enabled) {
        await this.initializeAnalytics();
      }

      this.isInitialized = true;
      this.emit('docs:initialized');
    } catch (error) {
      this.emit('docs:error', error);
      throw error;
    }
  }

  /**
   * Generate documentation from templates and modules
   */
  public async generateDocumentation(options: GenerationOptions = {}): Promise<GenerationResult> {
    this.emit('docs:generating', options);

    const result: GenerationResult = {
      success: false,
      pages: [],
      tutorials: [],
      examples: [],
      errors: [],
      metrics: {
        totalFiles: 0,
        processedFiles: 0,
        generatedPages: 0,
        generatedTutorials: 0,
        generatedExamples: 0,
        duration: 0
      }
    };

    const startTime = Date.now();

    try {
      // Scan source files
      const sourceFiles = await this.scanSourceFiles(options.sourceDir || this.config.sourceDir);
      result.metrics.totalFiles = sourceFiles.length;

      // Generate pages from source files
      for (const file of sourceFiles) {
        try {
          const page = await this.generatePageFromFile(file, options);
          if (page) {
            this.pages.set(page.id, page);
            result.pages.push(page.id);
            result.metrics.generatedPages++;
          }
          result.metrics.processedFiles++;
        } catch (error) {
          result.errors.push({
            file: file.path,
            error: error.message,
            type: 'page-generation'
          });
        }
      }

      // Generate tutorials if enabled
      if (this.config.tutorials.enabled && options.generateTutorials !== false) {
        const tutorials = await this.generateTutorials(options);
        result.tutorials = tutorials;
        result.metrics.generatedTutorials = tutorials.length;
      }

      // Generate examples if enabled
      if (this.config.examples.enabled && options.generateExamples !== false) {
        const examples = await this.generateExamples(options);
        result.examples = examples;
        result.metrics.generatedExamples = examples.length;
      }

      // Build search index
      if (this.config.search.enabled) {
        await this.buildSearchIndex();
      }

      // Generate static files
      await this.generateStaticFiles(options);

      result.success = true;
      result.metrics.duration = Date.now() - startTime;

      this.emit('docs:generated', result);
      return result;
    } catch (error) {
      result.errors.push({
        error: error.message,
        type: 'generation'
      });
      result.metrics.duration = Date.now() - startTime;

      this.emit('docs:generation-error', { error, result });
      return result;
    }
  }

  /**
   * Create playground session
   */
  public async createPlaygroundSession(
    templateId: string, 
    options: PlaygroundOptions = {}
  ): Promise<PlaygroundSession> {
    const template = this.config.playground.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const sessionId = this.generateSessionId();
    const session: PlaygroundSession = {
      id: sessionId,
      userId: options.userId,
      template,
      files: new Map(),
      status: 'idle',
      runtime: {
        framework: template.framework,
        version: '1.0.0',
        bundler: 'vite',
        status: 'starting',
        processes: []
      },
      output: {
        type: 'stdout',
        content: '',
        timestamp: new Date(),
        source: 'system'
      },
      errors: [],
      console: [],
      performance: {
        buildTime: 0,
        bundleSize: 0,
        loadTime: 0,
        renderTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        networkRequests: 0
      },
      sharing: {
        enabled: options.enableSharing || false,
        publicGallery: false,
        allowForks: true,
        viewCount: 0,
        likeCount: 0,
        forkCount: 0
      },
      collaboration: {
        enabled: options.enableCollaboration || false,
        participants: [],
        permissions: [],
        cursors: [],
        comments: [],
        activeEditors: []
      },
      createdAt: new Date(),
      lastModified: new Date()
    };

    // Initialize files from template
    for (const file of template.files) {
      session.files.set(file.path, { ...file });
    }

    this.playgroundSessions.set(sessionId, session);
    this.emit('playground:session-created', session);

    return session;
  }

  /**
   * Run playground code
   */
  public async runPlaygroundCode(sessionId: string): Promise<PlaygroundResult> {
    const session = this.playgroundSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    this.emit('playground:running', { sessionId });

    const startTime = Date.now();
    session.status = 'running';
    session.runtime.status = 'building';

    try {
      // Build and execute code
      const buildResult = await this.buildPlaygroundCode(session);
      if (!buildResult.success) {
        throw new Error(buildResult.error);
      }

      const executeResult = await this.executePlaygroundCode(session, buildResult);
      
      session.performance.buildTime = Date.now() - startTime;
      session.status = 'idle';
      session.runtime.status = 'ready';

      const result: PlaygroundResult = {
        success: true,
        output: executeResult.output,
        errors: executeResult.errors,
        console: executeResult.console,
        performance: session.performance
      };

      this.emit('playground:completed', { sessionId, result });
      return result;
    } catch (error) {
      session.status = 'error';
      session.runtime.status = 'error';
      session.errors.push({
        id: this.generateErrorId(),
        type: 'runtime',
        message: error.message,
        severity: 'error',
        timestamp: new Date(),
        resolved: false
      });

      const result: PlaygroundResult = {
        success: false,
        error: error.message,
        errors: session.errors,
        console: session.console,
        performance: session.performance
      };

      this.emit('playground:error', { sessionId, error, result });
      return result;
    }
  }

  /**
   * Get tutorial progress
   */
  public async getTutorialProgress(
    tutorialId: string, 
    userId: string
  ): Promise<TutorialProgress> {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      throw new Error('Tutorial not found');
    }

    // Load progress from storage (implementation would vary)
    const progress = await this.loadTutorialProgress(tutorialId, userId);
    
    return progress;
  }

  /**
   * Update tutorial progress
   */
  public async updateTutorialProgress(
    tutorialId: string,
    userId: string,
    stepId: string,
    completed: boolean,
    data?: any
  ): Promise<void> {
    const progress = await this.getTutorialProgress(tutorialId, userId);
    
    const stepProgress = progress.steps.find(s => s.stepId === stepId);
    if (stepProgress) {
      stepProgress.completed = completed;
      stepProgress.completedAt = completed ? new Date() : undefined;
      stepProgress.data = data;
    } else {
      progress.steps.push({
        stepId,
        completed,
        completedAt: completed ? new Date() : undefined,
        attempts: 1,
        score: 0,
        timeSpent: 0,
        data
      });
    }

    // Recalculate overall progress
    const completedSteps = progress.steps.filter(s => s.completed).length;
    const totalSteps = this.tutorials.get(tutorialId)?.steps.length || 0;
    progress.completionPercentage = (completedSteps / totalSteps) * 100;
    progress.currentStep = completed ? this.getNextStep(tutorialId, stepId) : stepId;

    await this.saveTutorialProgress(tutorialId, userId, progress);
    
    this.emit('tutorial:progress-updated', {
      tutorialId,
      userId,
      stepId,
      progress
    });
  }

  /**
   * Search documentation
   */
  public async searchDocumentation(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!this.config.search.enabled || !this.searchIndex) {
      throw new Error('Search is not enabled');
    }

    const results = await this.performSearch(query, options);
    
    this.emit('docs:search', { query, options, results: results.length });
    
    return results;
  }

  /**
   * Get documentation analytics
   */
  public async getAnalytics(
    timeRange: TimeRange,
    metrics: string[] = []
  ): Promise<AnalyticsData> {
    if (!this.config.analytics.enabled) {
      throw new Error('Analytics is not enabled');
    }

    const analytics = await this.fetchAnalytics(timeRange, metrics);
    
    return analytics;
  }

  // Private implementation methods...

  private async initializeSearch(): Promise<void> {
    // Initialize search provider based on configuration
    switch (this.config.search.provider.name) {
      case 'algolia':
        this.searchIndex = await this.initializeAlgolia();
        break;
      case 'elasticsearch':
        this.searchIndex = await this.initializeElasticsearch();
        break;
      case 'local':
        this.searchIndex = await this.initializeLocalSearch();
        break;
      default:
        throw new Error(`Unsupported search provider: ${this.config.search.provider.name}`);
    }
  }

  private async loadDocumentation(): Promise<void> {
    // Load existing documentation from source directory
    const sourceDir = this.config.sourceDir;
    if (await this.directoryExists(sourceDir)) {
      const files = await this.getMarkdownFiles(sourceDir);
      for (const file of files) {
        const page = await this.loadDocumentationPage(file);
        if (page) {
          this.pages.set(page.id, page);
        }
      }
    }
  }

  private async initializePlayground(): Promise<void> {
    // Initialize playground runtime and sandbox providers
    for (const sandbox of this.config.playground.sandboxes) {
      await this.initializeSandboxProvider(sandbox);
    }
  }

  private async initializeTutorials(): Promise<void> {
    // Load tutorials from configuration and source files
    for (const category of this.config.tutorials.categories) {
      for (const tutorial of category.tutorials) {
        this.tutorials.set(tutorial.id, tutorial);
      }
    }
  }

  private async initializeExamples(): Promise<void> {
    // Load examples from configuration and source files
    for (const category of this.config.examples.categories) {
      for (const example of category.examples) {
        this.examples.set(example.id, example);
      }
    }
  }

  private async initializeAnalytics(): Promise<void> {
    // Initialize analytics providers
    for (const provider of this.config.analytics.providers) {
      await this.initializeAnalyticsProvider(provider);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Additional helper methods would be implemented here...
  // This includes file scanning, page generation, tutorial management,
  // playground execution, search implementation, analytics tracking, etc.

  private async scanSourceFiles(sourceDir: string): Promise<SourceFile[]> {
    // Implementation for scanning source files
    return [];
  }

  private async generatePageFromFile(file: SourceFile, options: GenerationOptions): Promise<DocumentationPage | null> {
    // Implementation for generating documentation pages from source files
    return null;
  }

  private async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private async getMarkdownFiles(dir: string): Promise<string[]> {
    // Implementation for getting markdown files recursively
    return [];
  }

  private async loadDocumentationPage(filePath: string): Promise<DocumentationPage | null> {
    // Implementation for loading documentation page from file
    return null;
  }
}

// Additional interfaces and types...

interface GenerationOptions {
  sourceDir?: string;
  outputDir?: string;
  generateTutorials?: boolean;
  generateExamples?: boolean;
  force?: boolean;
  verbose?: boolean;
}

interface GenerationResult {
  success: boolean;
  pages: string[];
  tutorials: string[];
  examples: string[];
  errors: GenerationError[];
  metrics: GenerationMetrics;
}

interface GenerationError {
  file?: string;
  error: string;
  type: string;
}

interface GenerationMetrics {
  totalFiles: number;
  processedFiles: number;
  generatedPages: number;
  generatedTutorials: number;
  generatedExamples: number;
  duration: number;
}

interface PlaygroundOptions {
  userId?: string;
  enableSharing?: boolean;
  enableCollaboration?: boolean;
  template?: Partial<PlaygroundTemplate>;
}

interface PlaygroundResult {
  success: boolean;
  output?: string;
  error?: string;
  errors: PlaygroundError[];
  console: ConsoleEntry[];
  performance: PerformanceInfo;
}

interface TutorialProgress {
  tutorialId: string;
  userId: string;
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  completionPercentage: number;
  currentStep: string;
  totalTimeSpent: number;
  steps: StepProgress[];
  certificates: string[];
}

interface StepProgress {
  stepId: string;
  completed: boolean;
  completedAt?: Date;
  attempts: number;
  score: number;
  timeSpent: number;
  data?: any;
}

interface SearchOptions {
  filters?: Record<string, any>;
  facets?: string[];
  limit?: number;
  offset?: number;
  highlight?: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  type: string;
  category: string;
  score: number;
  highlights?: string[];
  metadata?: Record<string, any>;
}

interface TimeRange {
  start: Date;
  end: Date;
}

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  averageSessionDuration: number;
  topPages: PageAnalytics[];
  searchQueries: SearchAnalytics[];
  tutorialCompletions: TutorialAnalytics[];
  playgroundUsage: PlaygroundAnalytics[];
}

interface PageAnalytics {
  path: string;
  title: string;
  views: number;
  uniqueViews: number;
  averageTimeOnPage: number;
  bounceRate: number;
}

interface SearchAnalytics {
  query: string;
  count: number;
  clickThroughRate: number;
  averagePosition: number;
}

interface TutorialAnalytics {
  tutorialId: string;
  title: string;
  completions: number;
  averageCompletionTime: number;
  dropoffRate: number;
  rating: number;
}

interface PlaygroundAnalytics {
  templateId: string;
  name: string;
  sessions: number;
  averageSessionDuration: number;
  successRate: number;
  popularFeatures: string[];
}

interface SourceFile {
  path: string;
  content: string;
  type: string;
  lastModified: Date;
}

/**
 * Default interactive documentation configuration
 */
export const defaultInteractiveDocsConfig: Partial<InteractiveDocsConfig> = {
  theme: {
    name: 'default',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    backgroundColor: '#ffffff',
    textColor: '#212529',
    codeBackgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    codeFontFamily: '"JetBrains Mono", "Fira Code", "Monaco", monospace',
    layout: {
      header: {
        enabled: true,
        height: 64,
        logo: {
          src: '/logo.svg',
          alt: 'Logo',
          width: 120,
          height: 32,
          link: '/'
        },
        navigation: [],
        search: true,
        darkModeToggle: true,
        languageSelector: false,
        userMenu: false
      },
      sidebar: {
        enabled: true,
        width: 280,
        collapsible: true,
        autoCollapse: false,
        position: 'left',
        categories: []
      },
      footer: {
        enabled: true,
        content: '',
        links: [],
        social: [],
        copyright: '© 2024 DNA Templates. All rights reserved.'
      },
      content: {
        maxWidth: 1200,
        padding: 24,
        enableToc: true,
        tocPosition: 'right',
        enableBreadcrumbs: true,
        enableEditButton: true,
        enableFeedback: true
      },
      navigation: {
        enablePrevNext: true,
        enableBackToTop: true,
        stickyNavigation: true,
        showProgress: true
      }
    },
    components: {
      codeBlock: {
        theme: 'github-light',
        showLineNumbers: true,
        showCopyButton: true,
        highlightLines: true,
        wrapLines: false,
        fontSize: 14,
        borderRadius: 6
      },
      callout: {
        variants: {
          info: {
            backgroundColor: '#e7f3ff',
            borderColor: '#007bff',
            textColor: '#004085',
            icon: 'info'
          },
          warning: {
            backgroundColor: '#fff3cd',
            borderColor: '#ffc107',
            textColor: '#856404',
            icon: 'warning'
          },
          error: {
            backgroundColor: '#f8d7da',
            borderColor: '#dc3545',
            textColor: '#721c24',
            icon: 'error'
          },
          success: {
            backgroundColor: '#d1f2eb',
            borderColor: '#28a745',
            textColor: '#155724',
            icon: 'success'
          }
        }
      },
      tabs: {
        borderColor: '#dee2e6',
        activeColor: '#007bff',
        hoverColor: '#e9ecef',
        backgroundColor: '#f8f9fa'
      },
      accordion: {
        borderColor: '#dee2e6',
        backgroundColor: '#ffffff',
        hoverColor: '#f8f9fa',
        iconColor: '#6c757d'
      },
      table: {
        borderColor: '#dee2e6',
        headerBackgroundColor: '#f8f9fa',
        stripedBackgroundColor: '#f8f9fa',
        hoverColor: '#e9ecef'
      },
      button: {
        variants: {
          primary: {
            backgroundColor: '#007bff',
            textColor: '#ffffff',
            borderColor: '#007bff',
            hoverBackgroundColor: '#0056b3',
            hoverTextColor: '#ffffff'
          },
          secondary: {
            backgroundColor: '#6c757d',
            textColor: '#ffffff',
            borderColor: '#6c757d',
            hoverBackgroundColor: '#545b62',
            hoverTextColor: '#ffffff'
          }
        }
      },
      card: {
        backgroundColor: '#ffffff',
        borderColor: '#dee2e6',
        shadowColor: 'rgba(0, 0, 0, 0.125)',
        borderRadius: 8
      }
    },
    responsive: {
      breakpoints: {
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400
      },
      mobileNavigation: true,
      collapseSidebar: true,
      stackLayout: true
    },
    darkMode: {
      enabled: true,
      defaultMode: 'system',
      storageKey: 'docs-theme',
      togglePosition: 'header'
    },
    animations: {
      enabled: true,
      duration: 200,
      easing: 'ease-in-out',
      pageTransitions: true,
      hoverEffects: true,
      scrollAnimations: true
    }
  },
  features: {
    enablePlayground: true,
    enableTutorials: true,
    enableExamples: true,
    enableVersioning: false,
    enableTranslations: false,
    enableComments: false,
    enableRatings: false,
    enableBookmarks: true,
    enableSharing: true,
    enablePrint: true,
    enableOffline: false,
    enablePWA: false,
    enableAnalytics: false,
    enableSearch: true,
    enableAI: false
  },
  search: {
    enabled: true,
    provider: {
      name: 'local',
      config: {}
    },
    features: {
      enableAutocomplete: true,
      enableFilters: true,
      enableFacets: false,
      enableTypo: true,
      enableHighlight: true,
      enableSnippets: true,
      enableHistory: true,
      enableSuggestions: true,
      enableVoiceSearch: false,
      enableImageSearch: false
    },
    indexing: {
      autoIndex: true,
      indexInterval: 3600000, // 1 hour
      includeContent: true,
      includeCode: true,
      includeComments: false,
      excludePatterns: ['node_modules/**', '.git/**'],
      customFields: []
    },
    ui: {
      position: 'header',
      placeholder: 'Search documentation...',
      shortcuts: ['/', 'ctrl+k'],
      resultLimit: 10,
      groupResults: true,
      showCategories: true
    }
  }
};

/**
 * Create interactive documentation system with framework-specific configuration
 */
export function createInteractiveDocumentationSystem(
  framework: string,
  config?: Partial<InteractiveDocsConfig>
): InteractiveDocumentationSystem {
  const frameworkConfig = {
    ...defaultInteractiveDocsConfig,
    framework,
    projectName: config?.projectName || 'dna-docs',
    baseUrl: config?.baseUrl || 'http://localhost:3000',
    outputDir: config?.outputDir || './docs/dist',
    sourceDir: config?.sourceDir || './docs/src',
    ...config
  } as InteractiveDocsConfig;

  return new InteractiveDocumentationSystem(frameworkConfig);
}