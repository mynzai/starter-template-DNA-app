/**
 * @fileoverview End-to-end integration tests for complete template generation workflows
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { Command } from 'commander';
import { createCommand } from '../commands/create';
import { listCommand } from '../commands/list';
import { validateCommand } from '../commands/validate';
import {
  CLITestHarness,
  createMockCommand
} from '../test-utils/cli-test-harness';
import {
  FileSystemMock,
  createBasicProjectStructure
} from '../test-utils/file-system-mock';
import {
  ProcessMock,
  createSuccessfulProcessMock
} from '../test-utils/process-mock';
import {
  InquirerMock,
  setupInquirerMock,
  teardownInquirerMock,
  ResponseSequences
} from '../test-utils/inquirer-mock';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestPath
} from '../test-utils/test-helpers';

// Mock the core dependencies
jest.mock('@dna/core', () => ({
  TemplateInstantiationEngine: jest.fn().mockImplementation(() => ({
    instantiateTemplate: jest.fn().mockResolvedValue({
      success: true,
      outputPath: '/test/output',
      errors: [],
      warnings: [],
      generatedFiles: [
        'package.json',
        'tsconfig.json',
        'src/index.ts',
        'README.md',
        '.gitignore'
      ],
      metrics: {
        executionTime: 1000,
        filesGenerated: 5,
        linesOfCode: 100,
        testCoverage: 80
      }
    })
  })),
  SupportedFramework: {
    NEXTJS: 'nextjs',
    FLUTTER: 'flutter',
    REACT_NATIVE: 'react-native',
    TYPESCRIPT: 'typescript'
  },
  TemplateType: {
    AI_SAAS: 'ai-saas',
    FOUNDATION: 'foundation',
    FLUTTER_UNIVERSAL: 'flutter-universal',
    REACT_NATIVE_HYBRID: 'react-native-hybrid'
  }
}));

describe('End-to-End Template Generation Workflows', () => {
  let program: Command;
  let fsMock: FileSystemMock;
  let processMock: ProcessMock;
  let inquirerMock: InquirerMock;

  beforeEach(() => {
    setupTestEnvironment();
    
    // Setup comprehensive mocks
    fsMock = createBasicProjectStructure();
    fsMock.setup();
    
    processMock = createSuccessfulProcessMock();
    inquirerMock = setupInquirerMock();
    
    // Create program with all commands
    program = createMockCommand();
    program.addCommand(createCommand);
    program.addCommand(listCommand);
    program.addCommand(validateCommand);
  });

  afterEach(() => {
    teardownTestEnvironment();
    fsMock.teardown();
    processMock.teardown();
    teardownInquirerMock();
    jest.clearAllMocks();
  });

  describe('Complete TypeScript project workflow', () => {
    it('should complete full workflow: list → create → validate', async () => {
      // Step 1: List available templates
      const listResult = await CLITestHarness.runCommand(program, ['list']);
      CLITestHarness.expectSuccess(listResult);
      CLITestHarness.expectOutput(listResult, 'Basic TypeScript Project');

      // Step 2: Create project with template
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'e2e-typescript-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);
      CLITestHarness.expectSuccess(createResult);
      CLITestHarness.expectOutput(createResult, 'Project created successfully');

      // Step 3: Mock the created project files
      const projectPath = '/e2e-typescript-project';
      fsMock.addDirectory(projectPath);
      fsMock.addFile(`${projectPath}/package.json`, JSON.stringify({
        name: 'e2e-typescript-project',
        version: '1.0.0',
        description: 'E2E test project',
        scripts: {
          dev: 'ts-node src/index.ts',
          build: 'tsc',
          test: 'jest',
          lint: 'eslint .'
        },
        dependencies: {
          'typescript': '^5.0.0'
        }
      }, null, 2));
      
      fsMock.addFile(`${projectPath}/dna.config.json`, JSON.stringify({
        template: 'basic-typescript',
        framework: 'typescript',
        modules: [],
        generated: new Date().toISOString(),
        version: '1.0.0'
      }, null, 2));
      
      fsMock.addFile(`${projectPath}/README.md`, '# E2E TypeScript Project');
      fsMock.addFile(`${projectPath}/.gitignore`, 'node_modules/\n.env\ndist/');
      fsMock.addFile(`${projectPath}/tsconfig.json`, '{"compilerOptions": {}}');
      fsMock.addDirectory(`${projectPath}/src`);
      fsMock.addFile(`${projectPath}/src/index.ts`, 'console.log("Hello World");');

      // Step 4: Validate the created project
      const validateResult = await CLITestHarness.runCommand(program, [
        'validate',
        projectPath
      ]);
      CLITestHarness.expectSuccess(validateResult);
      CLITestHarness.expectOutput(validateResult, '✅ Validation passed!');
    });

    it('should handle interactive workflow with template selection', async () => {
      // Setup interactive responses
      inquirerMock.setResponses([
        { name: 'interactive-project' },
        { templateId: 'basic-typescript' },
        { dnaModules: [] }
      ]);

      // Step 1: Interactive project creation
      const createResult = await CLITestHarness.runCommand(program, ['create']);
      CLITestHarness.expectSuccess(createResult);
      CLITestHarness.expectOutput(createResult, 'Project created successfully');

      // Verify interactive prompts were used
      expect(require('inquirer').prompt).toHaveBeenCalledTimes(3);
    });
  });

  describe('AI SaaS project workflow with DNA modules', () => {
    it('should complete AI SaaS workflow with multiple DNA modules', async () => {
      // Step 1: List AI templates
      const listResult = await CLITestHarness.runCommand(program, [
        'list',
        '--type',
        'ai-saas'
      ]);
      CLITestHarness.expectSuccess(listResult);
      CLITestHarness.expectOutput(listResult, 'AI SaaS Application');

      // Step 2: Create AI SaaS project with DNA modules
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'e2e-ai-saas-project',
        '--template',
        'ai-saas',
        '--dna',
        'auth-jwt,payment-stripe,ai-openai',
        '--yes'
      ]);
      CLITestHarness.expectSuccess(createResult);

      // Verify DNA modules were included
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai']
        }),
        expect.any(Object)
      );

      // Step 3: Mock complex project structure
      const projectPath = '/e2e-ai-saas-project';
      fsMock.addDirectory(projectPath);
      fsMock.addFile(`${projectPath}/package.json`, JSON.stringify({
        name: 'e2e-ai-saas-project',
        version: '1.0.0',
        description: 'AI SaaS application',
        scripts: {
          dev: 'next dev',
          build: 'next build',
          test: 'jest',
          lint: 'eslint .'
        },
        dependencies: {
          'next': '^14.0.0',
          'react': '^18.0.0',
          'openai': '^4.0.0',
          'stripe': '^14.0.0',
          'jsonwebtoken': '^9.0.0'
        }
      }, null, 2));

      fsMock.addFile(`${projectPath}/dna.config.json`, JSON.stringify({
        template: 'ai-saas',
        framework: 'nextjs',
        modules: ['auth-jwt', 'payment-stripe', 'ai-openai'],
        generated: new Date().toISOString(),
        version: '1.0.0'
      }, null, 2));

      // Add project files
      fsMock.addFile(`${projectPath}/README.md`, '# AI SaaS Project');
      fsMock.addFile(`${projectPath}/.gitignore`, 'node_modules/\n.env\n.next/');
      fsMock.addFile(`${projectPath}/tsconfig.json`, '{"compilerOptions": {}}');
      fsMock.addDirectory(`${projectPath}/src`);
      fsMock.addDirectory(`${projectPath}/src/pages`);
      fsMock.addDirectory(`${projectPath}/src/components`);
      fsMock.addDirectory(`${projectPath}/src/lib`);
      fsMock.addDirectory(`${projectPath}/node_modules`);
      fsMock.addFile(`${projectPath}/.eslintrc.json`, '{}');
      fsMock.addFile(`${projectPath}/.prettierrc`, '{}');
      fsMock.addDirectory(`${projectPath}/__tests__`);

      // Step 4: Validate the AI SaaS project
      const validateResult = await CLITestHarness.runCommand(program, [
        'validate',
        projectPath
      ]);
      CLITestHarness.expectSuccess(validateResult);
      CLITestHarness.expectOutput(validateResult, '✅ Validation passed!');
    });

    it('should handle interactive AI SaaS creation with template variables', async () => {
      inquirerMock.setResponses([
        { name: 'interactive-ai-saas' },
        { templateId: 'ai-saas' },
        { dnaModules: ['auth-jwt', 'ai-openai'] },
        {
          projectName: 'Interactive AI SaaS',
          description: 'An AI-powered SaaS platform',
          databaseType: 'postgresql',
          enableAnalytics: true,
          aiProvider: 'openai'
        }
      ]);

      const createResult = await CLITestHarness.runCommand(program, ['create']);
      CLITestHarness.expectSuccess(createResult);

      // Verify template variables were collected and passed
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            projectName: 'Interactive AI SaaS',
            databaseType: 'postgresql',
            enableAnalytics: true
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('Flutter cross-platform workflow', () => {
    it('should complete Flutter project workflow', async () => {
      // Add Flutter template to mock
      fsMock.addFile('templates/cross-platform/flutter-universal/template.json', JSON.stringify({
        id: 'flutter-universal',
        name: 'Flutter Universal App',
        description: 'Cross-platform Flutter application',
        type: 'flutter-universal',
        framework: 'flutter',
        version: '1.0.0',
        author: 'DNA Templates',
        tags: ['flutter', 'cross-platform'],
        dnaModules: ['auth-firebase'],
        requirements: {},
        features: ['Cross-platform', 'Material Design'],
        complexity: 'intermediate',
        estimatedSetupTime: 15
      }));

      // Step 1: List Flutter templates
      const listResult = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'flutter'
      ]);
      CLITestHarness.expectSuccess(listResult);
      CLITestHarness.expectOutput(listResult, 'Flutter Universal App');

      // Step 2: Create Flutter project
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'e2e-flutter-project',
        '--template',
        'flutter-universal',
        '--dna',
        'auth-firebase',
        '--yes'
      ]);
      CLITestHarness.expectSuccess(createResult);

      // Step 3: Mock Flutter project structure
      const projectPath = '/e2e-flutter-project';
      fsMock.addDirectory(projectPath);
      fsMock.addFile(`${projectPath}/pubspec.yaml`, `
name: e2e_flutter_project
description: E2E Flutter test project
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  firebase_auth: ^4.0.0
`);

      fsMock.addFile(`${projectPath}/dna.config.json`, JSON.stringify({
        template: 'flutter-universal',
        framework: 'flutter',
        modules: ['auth-firebase'],
        generated: new Date().toISOString(),
        version: '1.0.0'
      }, null, 2));

      fsMock.addFile(`${projectPath}/README.md`, '# Flutter Universal App');
      fsMock.addFile(`${projectPath}/.gitignore`, '.dart_tool/\nbuild/');
      fsMock.addDirectory(`${projectPath}/lib`);
      fsMock.addFile(`${projectPath}/lib/main.dart`, 'void main() {}');
      fsMock.addDirectory(`${projectPath}/test`);

      // Step 4: Validate Flutter project (as template)
      const validateResult = await CLITestHarness.runCommand(program, [
        'validate',
        'templates/cross-platform/flutter-universal',
        '--template'
      ]);
      CLITestHarness.expectSuccess(validateResult);
      CLITestHarness.expectOutput(validateResult, '✅ Validation passed!');
    });
  });

  describe('Error handling and recovery workflows', () => {
    it('should handle template generation failure with rollback', async () => {
      // Mock template engine to fail
      const { TemplateInstantiationEngine } = require('@dna/core');
      TemplateInstantiationEngine.mockImplementation(() => ({
        instantiateTemplate: jest.fn().mockResolvedValue({
          success: false,
          outputPath: '/test/output',
          errors: ['Template generation failed: Missing template files'],
          warnings: [],
          generatedFiles: [],
          metrics: {
            executionTime: 500,
            filesGenerated: 0,
            linesOfCode: 0,
            testCoverage: 0
          }
        })
      }));

      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'failed-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectFailure(createResult);
      CLITestHarness.expectErrorOutput(createResult, 'Template generation failed');

      // Verify rollback was attempted
      expect(fsMock.mockFs.remove).toHaveBeenCalled();
    });

    it('should handle dependency installation failure with helpful message', async () => {
      // Mock successful generation but failed installation
      processMock.teardown();
      processMock = new ProcessMock();
      processMock.setup();
      processMock.createNetworkErrorScenario();

      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'network-fail-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectFailure(createResult);
      CLITestHarness.expectErrorOutput(createResult, 'Network error');
      CLITestHarness.expectOutput(createResult, 'npm install'); // Should suggest manual installation
    });

    it('should handle validation failures with fix suggestions', async () => {
      // Create incomplete project
      const projectPath = '/incomplete-project';
      fsMock.addDirectory(projectPath);
      fsMock.addFile(`${projectPath}/package.json`, JSON.stringify({
        name: 'incomplete-project'
        // Missing required fields
      }));

      const validateResult = await CLITestHarness.runCommand(program, [
        'validate',
        projectPath
      ]);

      CLITestHarness.expectFailure(validateResult);
      CLITestHarness.expectOutput(validateResult, 'Missing required field');

      // Test fix functionality
      const fixResult = await CLITestHarness.runCommand(program, [
        'validate',
        projectPath,
        '--fix'
      ]);

      CLITestHarness.expectSuccess(fixResult);
      CLITestHarness.expectOutput(fixResult, 'Fixed');
    });
  });

  describe('Complex multi-step workflows', () => {
    it('should handle project creation with multiple package managers', async () => {
      // Test with different package managers
      const packageManagers = ['npm', 'yarn', 'pnpm'];

      for (const pm of packageManagers) {
        const createResult = await CLITestHarness.runCommand(program, [
          'create',
          `${pm}-project`,
          '--template',
          'basic-typescript',
          '--package-manager',
          pm,
          '--yes'
        ]);

        CLITestHarness.expectSuccess(createResult);
        expect(require('child_process').spawn).toHaveBeenCalledWith(
          pm,
          ['install'],
          expect.any(Object)
        );
      }
    });

    it('should handle dry run workflow without side effects', async () => {
      const originalWriteFile = fsMock.mockFs.writeFile;
      const originalSpawn = require('child_process').spawn;

      const dryRunResult = await CLITestHarness.runCommand(program, [
        'create',
        'dry-run-project',
        '--template',
        'ai-saas',
        '--dna',
        'auth-jwt,payment-stripe',
        '--dry-run',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(dryRunResult);
      CLITestHarness.expectOutput(dryRunResult, '[DRY RUN]');

      // Verify no actual files were created or commands executed
      expect(originalWriteFile).not.toHaveBeenCalled();
      expect(originalSpawn).not.toHaveBeenCalled();
    });

    it('should handle template filtering and selection workflow', async () => {
      // Step 1: List all templates
      const allTemplatesResult = await CLITestHarness.runCommand(program, ['list']);
      CLITestHarness.expectSuccess(allTemplatesResult);

      // Step 2: Filter by framework
      const nextjsTemplatesResult = await CLITestHarness.runCommand(program, [
        'list',
        '--framework',
        'nextjs',
        '--detailed'
      ]);
      CLITestHarness.expectSuccess(nextjsTemplatesResult);
      CLITestHarness.expectOutput(nextjsTemplatesResult, 'AI SaaS Application');

      // Step 3: Filter by complexity
      const beginnerTemplatesResult = await CLITestHarness.runCommand(program, [
        'list',
        '--complexity',
        'beginner',
        '--categories'
      ]);
      CLITestHarness.expectSuccess(beginnerTemplatesResult);
      CLITestHarness.expectOutput(beginnerTemplatesResult, 'Basic TypeScript Project');

      // Step 4: Search templates
      const searchResult = await CLITestHarness.runCommand(program, [
        'list',
        '--query',
        'AI',
        '--json'
      ]);
      CLITestHarness.expectSuccess(searchResult);

      const templates = JSON.parse(searchResult.stdout);
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.some((t: any) => t.name.includes('AI'))).toBe(true);
    });
  });

  describe('Performance and stress testing', () => {
    it('should handle large project creation efficiently', async () => {
      // Mock large number of files being generated
      const { TemplateInstantiationEngine } = require('@dna/core');
      const largeFileList = Array.from({ length: 1000 }, (_, i) => `src/generated/file${i}.ts`);
      
      TemplateInstantiationEngine.mockImplementation(() => ({
        instantiateTemplate: jest.fn().mockResolvedValue({
          success: true,
          outputPath: '/test/output',
          errors: [],
          warnings: [],
          generatedFiles: largeFileList,
          metrics: {
            executionTime: 5000,
            filesGenerated: largeFileList.length,
            linesOfCode: largeFileList.length * 50,
            testCoverage: 75
          }
        })
      }));

      const startTime = performance.now();
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'large-project',
        '--template',
        'ai-saas',
        '--yes'
      ]);
      const endTime = performance.now();

      CLITestHarness.expectSuccess(createResult);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent operations gracefully', async () => {
      // Simulate multiple concurrent operations
      const promises = Array.from({ length: 5 }, (_, i) =>
        CLITestHarness.runCommand(program, [
          'list',
          '--framework',
          'typescript'
        ])
      );

      const results = await Promise.all(promises);
      results.forEach(result => {
        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Basic TypeScript Project');
      });
    });
  });

  describe('User experience workflows', () => {
    it('should provide helpful guidance for new users', async () => {
      // Empty template registry scenario
      fsMock.reset();
      fsMock.addDirectory('templates');

      const listResult = await CLITestHarness.runCommand(program, ['list']);
      CLITestHarness.expectSuccess(listResult);
      CLITestHarness.expectOutput(listResult, 'No templates found');

      // Invalid template scenario
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'test-project',
        '--template',
        'nonexistent-template',
        '--yes'
      ]);
      CLITestHarness.expectFailure(createResult);
      CLITestHarness.expectErrorOutput(createResult, 'TEMPLATE_NOT_FOUND');
    });

    it('should handle cancellation gracefully', async () => {
      inquirerMock.setResponses([
        { cancelled: true } // Simulate user cancellation
      ]);

      const createResult = await CLITestHarness.runCommand(program, ['create']);
      CLITestHarness.expectFailure(createResult);
      CLITestHarness.expectErrorOutput(createResult, 'cancelled');
    });

    it('should provide appropriate next steps after creation', async () => {
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'guidance-project',
        '--template',
        'basic-typescript',
        '--skip-install',
        '--skip-git',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(createResult);
      CLITestHarness.expectOutput(createResult, 'Next steps:');
      CLITestHarness.expectOutput(createResult, 'npm install');
      CLITestHarness.expectOutput(createResult, 'git init');
      CLITestHarness.expectOutput(createResult, 'npm run dev');
    });
  });

  describe('Cross-platform compatibility workflows', () => {
    it('should handle Windows-style paths', async () => {
      const windowsPath = 'C:\\Users\\Developer\\Projects\\windows-project';
      
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'windows-project',
        '--template',
        'basic-typescript',
        '--output',
        windowsPath,
        '--yes'
      ]);

      CLITestHarness.expectSuccess(createResult);
      expect(fsMock.mockFs.ensureDir).toHaveBeenCalled();
    });

    it('should handle projects with spaces in paths', async () => {
      const spacePath = '/Users/Developer/My Projects/space project';
      
      const createResult = await CLITestHarness.runCommand(program, [
        'create',
        'space-project',
        '--template',
        'basic-typescript',
        '--output',
        spacePath,
        '--yes'
      ]);

      CLITestHarness.expectSuccess(createResult);
      expect(fsMock.mockFs.ensureDir).toHaveBeenCalled();
    });
  });
});