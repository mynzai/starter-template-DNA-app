/**
 * @fileoverview Core utility functions for DNA Template Engine
 */

import { TemplateType, SupportedFramework } from './types';

/**
 * Validate template name format
 */
export function validateTemplateName(name: string): boolean {
  const nameRegex = /^[a-zA-Z][a-zA-Z0-9-_]*$/;
  return nameRegex.test(name) && name.length >= 3 && name.length <= 50;
}

/**
 * Sanitize output path
 */
export function sanitizeOutputPath(path: string): string {
  return path.replace(/[<>:"|?*]/g, '').replace(/\.\./g, '');
}

/**
 * Get recommended DNA modules for a template type
 */
export function getRecommendedModules(type: TemplateType): string[] {
  switch (type) {
    case TemplateType.AI_SAAS:
      return ['auth-jwt', 'ai-openai', 'payments-stripe', 'testing-comprehensive'];
    case TemplateType.DEVELOPMENT_TOOLS:
      return ['auth-oauth', 'ai-anthropic', 'testing-comprehensive'];
    case TemplateType.BUSINESS_APPS:
      return ['auth-jwt', 'payments-stripe', 'real-time-websocket', 'testing-comprehensive'];
    case TemplateType.MOBILE_ASSISTANTS:
      return ['auth-biometric', 'ai-openai', 'real-time-websocket', 'testing-comprehensive'];
    case TemplateType.REAL_TIME_COLLABORATION:
      return ['auth-jwt', 'real-time-webrtc', 'real-time-websocket', 'testing-comprehensive'];
    case TemplateType.HIGH_PERFORMANCE_APIS:
      return ['auth-jwt', 'security-rate-limiting', 'testing-comprehensive'];
    case TemplateType.DATA_VISUALIZATION:
      return ['auth-jwt', 'real-time-websocket', 'testing-comprehensive'];
    case TemplateType.FLUTTER_UNIVERSAL:
      return ['auth-biometric', 'testing-comprehensive'];
    case TemplateType.REACT_NATIVE_HYBRID:
      return ['auth-oauth', 'real-time-websocket', 'testing-comprehensive'];
    case TemplateType.MODERN_ELECTRON:
      return ['auth-jwt', 'security-auto-updater', 'testing-comprehensive'];
    default:
      return ['testing-comprehensive'];
  }
}

/**
 * Get compatible frameworks for a template type
 */
export function getCompatibleFrameworks(type: TemplateType): SupportedFramework[] {
  switch (type) {
    case TemplateType.AI_SAAS:
      return [SupportedFramework.NEXTJS, SupportedFramework.SVELTEKIT];
    case TemplateType.DEVELOPMENT_TOOLS:
      return [SupportedFramework.NEXTJS, SupportedFramework.TAURI];
    case TemplateType.BUSINESS_APPS:
      return [SupportedFramework.NEXTJS, SupportedFramework.FLUTTER];
    case TemplateType.MOBILE_ASSISTANTS:
      return [SupportedFramework.FLUTTER, SupportedFramework.REACT_NATIVE];
    case TemplateType.REAL_TIME_COLLABORATION:
      return [SupportedFramework.NEXTJS, SupportedFramework.SVELTEKIT];
    case TemplateType.HIGH_PERFORMANCE_APIS:
      return [SupportedFramework.NEXTJS]; // API-focused
    case TemplateType.DATA_VISUALIZATION:
      return [SupportedFramework.NEXTJS, SupportedFramework.SVELTEKIT];
    case TemplateType.FLUTTER_UNIVERSAL:
      return [SupportedFramework.FLUTTER];
    case TemplateType.REACT_NATIVE_HYBRID:
      return [SupportedFramework.REACT_NATIVE];
    case TemplateType.MODERN_ELECTRON:
      return [SupportedFramework.TAURI];
    default:
      return Object.values(SupportedFramework);
  }
}

/**
 * Calculate estimated setup time based on template complexity
 */
export function calculateEstimatedSetupTime(
  type: TemplateType,
  framework: SupportedFramework,
  dnaModules: string[]
): number {
  let baseTime = 3; // 3 minutes base time

  // Add time based on template complexity
  const complexityMultiplier = {
    [TemplateType.AI_SAAS]: 1.5,
    [TemplateType.DEVELOPMENT_TOOLS]: 1.3,
    [TemplateType.BUSINESS_APPS]: 1.4,
    [TemplateType.MOBILE_ASSISTANTS]: 1.6,
    [TemplateType.REAL_TIME_COLLABORATION]: 1.7,
    [TemplateType.HIGH_PERFORMANCE_APIS]: 1.2,
    [TemplateType.DATA_VISUALIZATION]: 1.3,
    [TemplateType.FLUTTER_UNIVERSAL]: 1.4,
    [TemplateType.REACT_NATIVE_HYBRID]: 1.3,
    [TemplateType.MODERN_ELECTRON]: 1.2,
    [TemplateType.FOUNDATION]: 0.8, // Foundation templates are simpler
  };

  baseTime *= complexityMultiplier[type] || 1.0;

  // Add time for each DNA module (30 seconds each)
  baseTime += dnaModules.length * 0.5;

  // Framework-specific adjustments
  const frameworkAdjustment = {
    [SupportedFramework.FLUTTER]: 1.2,
    [SupportedFramework.REACT_NATIVE]: 1.1,
    [SupportedFramework.NEXTJS]: 1.0,
    [SupportedFramework.TAURI]: 1.3,
    [SupportedFramework.SVELTEKIT]: 0.9,
  };

  baseTime *= frameworkAdjustment[framework] || 1.0;

  return Math.ceil(baseTime); // Round up to nearest minute
}

/**
 * Generate unique project identifier
 */
export function generateProjectId(
  name: string,
  type: TemplateType,
  framework: SupportedFramework
): string {
  const timestamp = Date.now().toString(36);
  const hash = hashCode(name + type + framework).toString(36);
  return `${name}-${hash}-${timestamp}`;
}

/**
 * Simple hash function for generating short identifiers
 */
function hashCode(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate DNA module compatibility
 */
export function validateModuleCompatibility(
  modules: string[],
  framework: SupportedFramework
): string[] {
  const incompatibleModules: string[] = [];

  // Framework-specific compatibility checks
  if (framework === SupportedFramework.FLUTTER) {
    const webOnlyModules = ['payments-stripe-web', 'auth-web-only'];
    modules.forEach(module => {
      if (webOnlyModules.includes(module)) {
        incompatibleModules.push(module);
      }
    });
  }

  return incompatibleModules;
}
