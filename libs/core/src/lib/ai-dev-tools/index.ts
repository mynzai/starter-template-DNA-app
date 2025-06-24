/**
 * @fileoverview AI Development Tools Platform
 * Main entry point for Epic 2 Story 4 - AI Development Tools Platform
 */

// Core Services
export { CodeGenerationService } from './code-generation/code-generation-service';
export { GitIntegrationService } from './git-integration/git-integration-service';
export { TestGenerationService } from './test-generation/test-generation-service';
export { DocumentationAIService } from './documentation/documentation-ai-service';
export { DevToolsPerformanceMonitor } from './monitoring/dev-tools-performance-monitor';
export { TeamCollaborationService } from './collaboration/team-collaboration-service';

// Code Generation Types
export type {
  CodeGenerationRequest,
  CodeGenerationResponse,
  LanguageTemplate,
  SyntaxHighlightConfig,
  FrameworkDetectionResult
} from './code-generation/types';

// Git Integration Types
export type {
  GitWebhookEvent,
  CodeReviewRequest,
  CodeAnalysisResult,
  PlatformConfig
} from './git-integration/types';

// Test Generation Types
export type {
  TestGenerationRequest,
  TestGenerationResponse,
  TestFrameworkConfig,
  CoverageAnalysisResult
} from './test-generation/types';

// Documentation Types
export type {
  DocumentationRequest,
  DocumentationResponse,
  APIDocumentationConfig,
  MarkdownOutputOptions
} from './documentation/types';

// Performance Monitoring Types
export type {
  DevToolsMetrics,
  CostTrackingData,
  OptimizationRecommendation,
  PerformanceAlert
} from './monitoring/types';

// Team Collaboration Types
export type {
  TeamTemplate,
  ReviewWorkflow,
  RolePermissions,
  CollaborationEvent
} from './collaboration/types';

// AI Development Tools Factory
export { AIDevToolsFactory } from './ai-dev-tools-factory';