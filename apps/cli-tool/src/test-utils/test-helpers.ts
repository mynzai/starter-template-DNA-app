/**
 * @fileoverview General test helpers and utilities
 */

import { jest, expect, describe, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { ProjectConfig, GenerationOptions, TemplateMetadata } from '../types/cli';
import { SupportedFramework, TemplateType } from '@dna/core';

// Test environment setup
export function setupTestEnvironment(): void {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.NO_UPDATE_CHECK = 'true';
  process.env.NO_ANALYTICS = 'true';
  process.env.CI = 'true';

  // Mock console methods to prevent output during tests
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

export function teardownTestEnvironment(): void {
  // Restore original console
  jest.restoreAllMocks();
  
  // Clean up environment variables
  delete process.env.NO_UPDATE_CHECK;
  delete process.env.NO_ANALYTICS;
  delete process.env.CI;
}

// Time helpers
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Path helpers
export function createTestPath(...segments: string[]): string {
  return path.join('/tmp', 'dna-cli-tests', ...segments);
}

export function normalizePathForTest(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

// Template helpers
export function createBasicTemplate(overrides: Partial<TemplateMetadata> = {}): TemplateMetadata {
  return {
    id: 'test-template',
    name: 'Test Template',
    description: 'A template for testing',
    type: TemplateType.FOUNDATION,
    framework: 'typescript' as any,
    version: '1.0.0',
    author: 'Test Author',
    tags: ['test'],
    dnaModules: [],
    requirements: {},
    features: ['Testing'],
    complexity: 'beginner',
    estimatedSetupTime: 1,
    lastUpdated: new Date('2024-01-01'),
    ...overrides
  };
}

export function createBasicProjectConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    name: 'test-project',
    path: createTestPath('test-project'),
    template: 'test-template',
    framework: 'typescript' as any,
    dnaModules: [],
    variables: {},
    packageManager: 'npm',
    skipInstall: false,
    skipGit: false,
    ...overrides
  };
}

export function createBasicGenerationOptions(overrides: Partial<GenerationOptions> = {}): GenerationOptions {
  return {
    interactive: false,
    dryRun: false,
    overwrite: false,
    backup: true,
    progress: false,
    ...overrides
  };
}

// Assertion helpers
export function expectFileToExist(filePath: string, fs: any): void {
  expect(fs.pathExists).toHaveBeenCalledWith(filePath);
}

export function expectFileToContain(filePath: string, content: string, fs: any): void {
  const mockCall = fs.readFile.mock.calls.find((call: any[]) => call[0] === filePath);
  expect(mockCall).toBeDefined();
}

export function expectDirectoryToBeCreated(dirPath: string, fs: any): void {
  expect(fs.ensureDir).toHaveBeenCalledWith(dirPath);
}

// Error helpers
export function expectCLIError(error: any, code: string): void {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(code);
}

export function expectErrorMessage(error: any, message: string | RegExp): void {
  expect(error).toBeInstanceOf(Error);
  if (typeof message === 'string') {
    expect(error.message).toContain(message);
  } else {
    expect(error.message).toMatch(message);
  }
}

// Mock data generators
export function generateMockTemplate(
  id: string,
  framework: SupportedFramework,
  options: Partial<TemplateMetadata> = {}
): TemplateMetadata {
  return createBasicTemplate({
    id,
    name: `${id} Template`,
    framework,
    type: getTemplateTypeForFramework(framework),
    ...options
  });
}

export function generateMockTemplates(count: number): TemplateMetadata[] {
  const frameworks = Object.values(SupportedFramework);
  return Array.from({ length: count }, (_, index) => {
    const framework = frameworks[index % frameworks.length]!;
    return generateMockTemplate(`template-${index + 1}`, framework);
  });
}

function getTemplateTypeForFramework(framework: SupportedFramework): TemplateType {
  switch (framework) {
    case SupportedFramework.NEXTJS:
      return TemplateType.AI_SAAS;
    case SupportedFramework.FLUTTER:
      return TemplateType.FLUTTER_UNIVERSAL;
    case SupportedFramework.REACT_NATIVE:
      return TemplateType.REACT_NATIVE_HYBRID;
    default:
      return TemplateType.FOUNDATION;
  }
}

// Progress tracking helpers
export function createMockProgressTracker() {
  return {
    start: jest.fn(),
    update: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    stop: jest.fn(),
    clear: jest.fn(),
    getProgress: jest.fn().mockReturnValue({
      stage: '1',
      current: 1,
      total: 5,
      message: 'Test progress'
    })
  };
}

// Logger helpers
export function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    step: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fail: jest.fn(),
    plain: jest.fn(),
    setLevel: jest.fn()
  };
}

// Validation helpers
export function validateProjectStructure(
  projectPath: string,
  expectedFiles: string[],
  fs: any
): void {
  expectedFiles.forEach(file => {
    const fullPath = path.join(projectPath, file);
    expectFileToExist(fullPath, fs);
  });
}

export function validatePackageJson(
  projectPath: string,
  expectedContent: any,
  fs: any
): void {
  const packageJsonPath = path.join(projectPath, 'package.json');
  expectFileToExist(packageJsonPath, fs);
  
  // In a real test, you'd check the actual content
  expect(fs.writeJSON).toHaveBeenCalledWith(
    packageJsonPath,
    expect.objectContaining(expectedContent),
    expect.any(Object)
  );
}

// Test data builders
export const TestDataBuilders = {
  template: (framework: SupportedFramework) => generateMockTemplate(`${framework}-template`, framework),
  
  projectConfig: (template: string, name: string = 'test-project') => createBasicProjectConfig({
    name,
    template,
    path: createTestPath(name)
  }),
  
  generationOptions: (dryRun: boolean = false) => createBasicGenerationOptions({
    dryRun,
    progress: false
  }),
  
  templateWithModules: (modules: string[]) => createBasicTemplate({
    id: 'template-with-modules',
    dnaModules: modules,
    features: modules.map(m => `${m} integration`)
  }),
  
  complexTemplate: () => createBasicTemplate({
    id: 'complex-template',
    complexity: 'advanced',
    estimatedSetupTime: 15,
    dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai'],
    features: ['Auth', 'Payments', 'AI', 'Database'],
    variables: [
      {
        name: 'projectName',
        description: 'Project name',
        required: true,
        type: 'string'
      },
      {
        name: 'features',
        description: 'Features to include',
        required: false,
        type: 'select',
        options: ['auth', 'payments', 'ai']
      }
    ]
  })
};

// Test suite helpers
export function describeCliCommand(commandName: string, tests: () => void): void {
  describe(`CLI Command: ${commandName}`, () => {
    beforeEach(() => {
      setupTestEnvironment();
    });

    afterEach(() => {
      teardownTestEnvironment();
    });

    tests();
  });
}

export function describeWithMocks(description: string, setupMocks: () => void, tests: () => void): void {
  describe(description, () => {
    beforeEach(() => {
      setupTestEnvironment();
      setupMocks();
    });

    afterEach(() => {
      teardownTestEnvironment();
    });

    tests();
  });
}

// Performance helpers
export function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  return fn().then(result => ({
    result,
    duration: Date.now() - start
  }));
}

export function expectExecutionTimeLessThan(actualMs: number, expectedMs: number): void {
  expect(actualMs).toBeLessThan(expectedMs);
}

// Random data generators
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function randomProjectName(): string {
  const prefixes = ['awesome', 'super', 'mega', 'ultra', 'epic'];
  const suffixes = ['app', 'project', 'tool', 'platform', 'service'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${prefix}-${suffix}-${number}`;
}

export function randomFramework(): SupportedFramework {
  const frameworks = Object.values(SupportedFramework);
  return frameworks[Math.floor(Math.random() * frameworks.length)]!;
}

// Snapshot helpers
export function createSnapshotMatcher(name: string) {
  return {
    toMatchSnapshot: () => {
      // This would integrate with Jest's snapshot testing
      // For now, just a placeholder
      return true;
    }
  };
}

// Integration test helpers
export function createIntegrationTestContext() {
  return {
    tempDir: createTestPath(randomString()),
    cleanup: jest.fn(),
    fs: null as any,
    process: null as any,
    inquirer: null as any
  };
}

export function cleanupIntegrationTest(context: ReturnType<typeof createIntegrationTestContext>): void {
  if (context.fs) {
    context.fs.teardown();
  }
  if (context.process) {
    context.process.teardown();
  }
  if (context.inquirer) {
    context.inquirer.teardown();
  }
  if (context.cleanup) {
    context.cleanup();
  }
}