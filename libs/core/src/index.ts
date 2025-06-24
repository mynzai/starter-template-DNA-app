/**
 * @fileoverview Core DNA Template Engine Library
 * Entry point for the DNA template generation system
 */

// Core components
export * from './lib/template-engine';
export * from './lib/template-instantiation-engine';
export * from './lib/dna-module';
export * from './lib/types';
export * from './lib/utils';

// Enhanced DNA system
export * from './lib/dna-registry';
export * from './lib/dna-composer';
export * from './lib/dna-migration';
export * from './lib/framework-modules';
export * from './lib/template-generation-pipeline';

// Epic 5 Story 1: DNA Engine Foundation
export * from './lib/dna-engine';
export * from './lib/dependency-resolver';
export * from './lib/hot-reload-system';
export * from './lib/module-lifecycle-manager';

// Epic 6 Story 4: Automated Quality Validation
export * from './lib/quality-validation/quality-validation-engine';
export * from './lib/quality-validation/automated-quality-orchestrator';

// Epic 2 Story 1: AI Integration Framework
export * from './lib/ai';

// Epic 2 Story 4: AI Development Tools
export * from './lib/ai-dev-tools';

// Re-export framework-specific base classes for convenience
export {
  FlutterDNAModule,
  ReactNativeDNAModule,
  NextJSDNAModule,
  TauriDNAModule,
  SvelteKitDNAModule
} from './lib/framework-modules';

// Version information
export const VERSION = '1.0.0';
export const CORE_NAME = 'DNA Template Engine Core';