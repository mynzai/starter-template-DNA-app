/**
 * @fileoverview Main entry point for the comprehensive testing framework
 */

// Core framework
export { TestingFramework } from './lib/core/testing-framework';
export { QualityGateEngine } from './lib/core/quality-gates';
export { TestGenerationEngine } from './lib/core/test-generation-engine';
export { TestReportGenerator, ReportFormat } from './lib/core/test-report-generator';

// Adapters
export { FlutterTestAdapter } from './lib/adapters/flutter-adapter';
export { ReactNativeTestAdapter } from './lib/adapters/react-native-adapter';
export { NextjsTestAdapter } from './lib/adapters/nextjs-adapter';
export { TauriTestAdapter } from './lib/adapters/tauri-adapter';

// Types
export * from './lib/types';

// Utility functions
export { createDefaultTestConfig, createDefaultQualityGateConfig } from './lib/utils/config-factory';
export { TestRunner } from './lib/utils/test-runner';
export { ProgressTracker } from './lib/utils/progress-tracker';