/**
 * @fileoverview CLI Type Definitions
 */

import { SupportedFramework, TemplateType } from '@dna/core';

export interface CLIConfig {
  debug: boolean;
  verbose: boolean;
  quiet: boolean;
  outputPath?: string;
  configFile?: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  sensitive?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
}

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  framework: SupportedFramework;
  version: string;
  author: string;
  tags: string[];
  dnaModules: string[];
  requirements: {
    node?: string;
    npm?: string;
    frameworks?: string[];
  };
  features: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: number; // in minutes
  lastUpdated: Date;
  downloadCount?: number;
  rating?: number;
  variables?: TemplateVariable[];
}

export interface TemplateRegistry {
  templates: TemplateMetadata[];
  lastUpdated: Date;
  version: string;
}

export interface ProjectConfig {
  name: string;
  path: string;
  template: string;
  framework: SupportedFramework;
  dnaModules: string[];
  variables: Record<string, string>;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  skipInstall: boolean;
  skipGit: boolean;
}

export interface GenerationOptions {
  interactive: boolean;
  dryRun: boolean;
  overwrite: boolean;
  backup: boolean;
  progress: boolean;
}

export interface CLIError extends Error {
  code: string;
  suggestion?: string;
  recoverable: boolean;
}

export interface ProgressInfo {
  stage: string;
  current: number;
  total: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface TemplateFilterOptions {
  framework?: SupportedFramework;
  type?: TemplateType;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  dnaModules?: string[];
  tags?: string[];
  maxSetupTime?: number;
  minRating?: number;
  query?: string;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  breakingChanges: boolean;
}

export interface UsageAnalytics {
  templateId: string;
  framework: SupportedFramework;
  dnaModules: string[];
  success: boolean;
  duration: number;
  errorCode?: string;
  timestamp: Date;
}