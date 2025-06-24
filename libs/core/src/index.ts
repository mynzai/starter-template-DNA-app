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

// Re-export framework-specific base classes for convenience
export {
  FlutterDNAModule,
  ReactNativeDNAModule,
  NextJSDNAModule,
  TauriDNAModule,
  SvelteKitDNAModule
} from './lib/framework-modules';

// AI Development Tools
export * from './lib/ai-dev-tools';

// Version information
export const VERSION = '1.0.0';
export const CORE_NAME = 'DNA Template Engine Core';
