/**
 * @fileoverview Integration tests for create command
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { Command } from 'commander';
import { createCommand } from '../create';
import {
  CLITestHarness,
  CLITestResult,
  createMockCommand
} from '../../test-utils/cli-test-harness';
import {
  FileSystemMock,
  createBasicProjectStructure
} from '../../test-utils/file-system-mock';
import {
  ProcessMock,
  createSuccessfulProcessMock,
  createFailingProcessMock
} from '../../test-utils/process-mock';
import {
  InquirerMock,
  setupInquirerMock,
  teardownInquirerMock,
  ResponseSequences
} from '../../test-utils/inquirer-mock';
import {
  allMockTemplates,
  mockAISaasTemplate,
  mockBasicTypescriptTemplate,
  mockProjectConfigs
} from '../../test-utils/template-fixtures';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestPath
} from '../../test-utils/test-helpers';
import { SupportedFramework } from '@dna/core';

// Mock the core dependencies
jest.mock('@dna/core', () => ({
  TemplateInstantiationEngine: jest.fn().mockImplementation(() => ({
    instantiateTemplate: jest.fn().mockResolvedValue({
      success: true,
      errors: []
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

describe('Create Command Integration Tests', () => {
  let program: Command;
  let fsMock: FileSystemMock;
  let processMock: ProcessMock;
  let inquirerMock: InquirerMock;

  beforeEach(() => {
    setupTestEnvironment();
    
    // Setup mocks
    fsMock = createBasicProjectStructure();
    fsMock.setup();
    
    processMock = createSuccessfulProcessMock();
    inquirerMock = setupInquirerMock();
    
    // Create command instance
    program = createMockCommand();
    program.addCommand(createCommand);
  });

  afterEach(() => {
    teardownTestEnvironment();
    fsMock.teardown();
    processMock.teardown();
    teardownInquirerMock();
    jest.clearAllMocks();
  });

  describe('Basic project creation', () => {
    it('should create a basic TypeScript project successfully', async () => {
      inquirerMock.setResponses([
        { name: 'my-basic-project' },
        { templateId: 'basic-typescript' },
        { dnaModules: [] }
      ]);

      const result = await CLITestHarness.runCommand(program, [
        'create'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Project created successfully');
      
      // Verify file system operations
      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('my-basic-project')
      );
      expect(fsMock.mockFs.writeJSON).toHaveBeenCalledWith(
        expect.stringContaining('dna.config.json'),
        expect.objectContaining({
          template: 'basic-typescript',
          framework: 'typescript'
        }),
        expect.any(Object)
      );
    });

    it('should create project with specified name and template', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'awesome-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'awesome-project');
      
      // Verify no interactive prompts were used
      expect(require('inquirer').prompt).not.toHaveBeenCalled();
    });

    it('should create AI SaaS project with DNA modules', async () => {
      inquirerMock.setResponses([
        { name: 'ai-saas-app' },
        { templateId: 'ai-saas' },
        { dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai'] },
        {
          projectName: 'ai-saas-app',
          description: 'AI-powered SaaS application',
          databaseType: 'postgresql',
          enableAnalytics: true
        }
      ]);

      const result = await CLITestHarness.runCommand(program, [
        'create'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Project created successfully');
      
      // Verify DNA modules were included
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai']
        }),
        expect.any(Object)
      );
    });
  });

  describe('Package manager selection', () => {
    it('should use specified package manager', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'npm-project',
        '--template',
        'basic-typescript',
        '--package-manager',
        'npm',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(require('child_process').spawn).toHaveBeenCalledWith(
        'npm',
        ['install'],
        expect.any(Object)
      );
    });

    it('should support yarn package manager', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'yarn-project',
        '--template',
        'basic-typescript',
        '--package-manager',
        'yarn',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(require('child_process').spawn).toHaveBeenCalledWith(
        'yarn',
        ['install'],
        expect.any(Object)
      );
    });

    it('should support pnpm package manager', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'pnpm-project',
        '--template',
        'basic-typescript',
        '--package-manager',
        'pnpm',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(require('child_process').spawn).toHaveBeenCalledWith(
        'pnpm',
        ['install'],
        expect.any(Object)
      );
    });
  });

  describe('Skip options', () => {
    it('should skip dependency installation', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'no-deps-project',
        '--template',
        'basic-typescript',
        '--skip-install',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(require('child_process').spawn).not.toHaveBeenCalled();
      CLITestHarness.expectOutput(result, 'npm install');
    });

    it('should skip git initialization', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'no-git-project',
        '--template',
        'basic-typescript',
        '--skip-git',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      
      // Verify git commands were not called
      const spawnCalls = require('child_process').spawn.mock.calls;
      const gitCalls = spawnCalls.filter((call: any[]) => call[0] === 'git');
      expect(gitCalls).toHaveLength(0);
      
      CLITestHarness.expectOutput(result, 'git init');
    });

    it('should skip both installation and git', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'minimal-project',
        '--template',
        'basic-typescript',
        '--skip-install',
        '--skip-git',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(require('child_process').spawn).not.toHaveBeenCalled();
      CLITestHarness.expectOutput(result, 'npm install');
      CLITestHarness.expectOutput(result, 'git init');
    });
  });

  describe('Output directory options', () => {
    it('should create project in specified output directory', async () => {
      const outputPath = createTestPath('custom-output');
      
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'custom-project',
        '--template',
        'basic-typescript',
        '--output',
        outputPath,
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('custom-output')
      );
    });

    it('should handle relative output paths', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'relative-project',
        '--template',
        'basic-typescript',
        '--output',
        './projects',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(fsMock.mockFs.ensureDir).toHaveBeenCalled();
    });
  });

  describe('Dry run mode', () => {
    it('should perform dry run without creating files', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'dry-run-project',
        '--template',
        'basic-typescript',
        '--dry-run',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      
      // Should not create actual files in dry run
      expect(fsMock.mockFs.writeFile).not.toHaveBeenCalled();
      expect(fsMock.mockFs.writeJSON).not.toHaveBeenCalled();
      expect(require('child_process').spawn).not.toHaveBeenCalled();
    });

    it('should show what would be created in dry run', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'preview-project',
        '--template',
        'basic-typescript',
        '--dry-run',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, '[DRY RUN]');
    });
  });

  describe('Interactive template selection', () => {
    it('should handle interactive template selection', async () => {
      inquirerMock.setResponses(ResponseSequences.basicProjectCreation);

      const result = await CLITestHarness.runCommand(program, ['create']);

      CLITestHarness.expectSuccess(result);
      expect(require('inquirer').prompt).toHaveBeenCalledTimes(
        ResponseSequences.basicProjectCreation.length
      );
    });

    it('should handle cancellation during template selection', async () => {
      inquirerMock.setResponses(ResponseSequences.cancellation);

      const result = await CLITestHarness.runCommand(program, ['create']);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'cancelled');
    });

    it('should handle AI SaaS template selection with variables', async () => {
      inquirerMock.setResponses(ResponseSequences.aiSaasProjectCreation);

      const result = await CLITestHarness.runCommand(program, ['create']);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'ai-saas-app');
    });
  });

  describe('Overwrite behavior', () => {
    it('should prompt for overwrite when directory exists', async () => {
      // Mock existing directory
      fsMock.addDirectory('/existing-project');
      fsMock.addFile('/existing-project/package.json', '{}');

      inquirerMock.setResponses(ResponseSequences.conflictResolution);

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'existing-project',
        '--template',
        'basic-typescript'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(require('inquirer').prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'shouldOverwrite',
            type: 'confirm'
          })
        ])
      );
    });

    it('should fail when directory exists and overwrite is declined', async () => {
      fsMock.addDirectory('/existing-project');
      
      inquirerMock.setResponses([
        { shouldOverwrite: false }
      ]);

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'existing-project',
        '--template',
        'basic-typescript'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'cancelled');
    });

    it('should overwrite when --overwrite flag is used', async () => {
      fsMock.addDirectory('/overwrite-project');
      
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'overwrite-project',
        '--template',
        'basic-typescript',
        '--overwrite',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(fsMock.mockFs.remove).toHaveBeenCalledWith(
        expect.stringContaining('overwrite-project')
      );
    });

    it('should create backup when overwriting', async () => {
      fsMock.addDirectory('/backup-project');
      fsMock.addFile('/backup-project/important.txt', 'important data');

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'backup-project',
        '--template',
        'basic-typescript',
        '--overwrite',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(fsMock.mockFs.copy).toHaveBeenCalledWith(
        expect.stringContaining('backup-project'),
        expect.stringMatching(/backup-project\.backup\.\d+$/)
      );
    });
  });

  describe('Error handling', () => {
    it('should handle invalid project names', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        '123invalid',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'INVALID_PROJECT_NAME');
    });

    it('should handle non-existent templates', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'test-project',
        '--template',
        'nonexistent-template',
        '--yes'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'TEMPLATE_NOT_FOUND');
    });

    it('should handle dependency installation failures', async () => {
      processMock.teardown();
      processMock = createFailingProcessMock();

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'install-fail-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'Command failed');
    });

    it('should rollback on template generation failure', async () => {
      // Mock template engine to fail
      const { TemplateInstantiationEngine } = require('@dna/core');
      TemplateInstantiationEngine.mockImplementation(() => ({
        instantiateTemplate: jest.fn().mockResolvedValue({
          success: false,
          errors: ['Template generation failed']
        })
      }));

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'failed-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'Template generation failed');
    });

    it('should handle file system permission errors', async () => {
      fsMock.mockFs.ensureDir.mockRejectedValue(new Error('Permission denied'));

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'permission-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'Permission denied');
    });

    it('should handle network errors during dependency installation', async () => {
      processMock.teardown();
      processMock = new ProcessMock();
      processMock.setup();
      processMock.createNetworkErrorScenario();

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'network-fail-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'Network error');
    });
  });

  describe('Progress tracking', () => {
    it('should show progress during project creation', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'progress-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Creating project');
    });

    it('should disable progress when --no-progress is used', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'no-progress-project',
        '--template',
        'basic-typescript',
        '--no-progress',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      // Progress tracker should be created with progress disabled
      expect(result.stdout).not.toContain('Creating project');
    });
  });

  describe('Template variables and configuration', () => {
    it('should collect template variables interactively', async () => {
      inquirerMock.setResponses([
        { name: 'configured-project' },
        { templateId: 'ai-saas' },
        { dnaModules: ['auth-jwt'] },
        {
          projectName: 'configured-project',
          description: 'A well-configured project',
          author: 'Test Developer',
          databaseType: 'postgresql',
          enableAnalytics: true
        }
      ]);

      const result = await CLITestHarness.runCommand(program, ['create']);

      CLITestHarness.expectSuccess(result);
      
      // Verify template variables were passed to engine
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            projectName: 'configured-project',
            description: 'A well-configured project',
            databaseType: 'postgresql'
          })
        }),
        expect.any(Object)
      );
    });

    it('should skip variable collection in non-interactive mode', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'non-interactive-project',
        '--template',
        'ai-saas',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      
      // Should not prompt for template variables
      expect(require('inquirer').prompt).not.toHaveBeenCalled();
    });
  });

  describe('DNA module selection', () => {
    it('should allow DNA module selection for compatible templates', async () => {
      inquirerMock.setResponses([
        { name: 'modular-project' },
        { templateId: 'ai-saas' },
        { dnaModules: ['auth-jwt', 'payment-stripe'] }
      ]);

      const result = await CLITestHarness.runCommand(program, ['create']);

      CLITestHarness.expectSuccess(result);
      
      // Verify DNA modules selection prompt
      expect(require('inquirer').prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'dnaModules',
            type: 'checkbox'
          })
        ])
      );
    });

    it('should use specified DNA modules from command line', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'dna-project',
        '--template',
        'ai-saas',
        '--dna',
        'auth-jwt,payment-stripe,ai-openai',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      
      // Verify DNA modules were passed correctly
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai']
        }),
        expect.any(Object)
      );
    });

    it('should handle whitespace in DNA module lists', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'whitespace-project',
        '--template',
        'ai-saas',
        '--dna',
        ' auth-jwt , payment-stripe , ai-openai ',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai']
        }),
        expect.any(Object)
      );
    });
  });

  describe('Framework-specific behavior', () => {
    it('should handle Next.js template creation', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'nextjs-project',
        '--template',
        'ai-saas',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: SupportedFramework.NEXTJS
        }),
        expect.any(Object)
      );
    });

    it('should handle Flutter template creation', async () => {
      // Mock Flutter template
      fsMock.addFile('templates/cross-platform/flutter-universal/template.json', JSON.stringify({
        id: 'flutter-universal',
        name: 'Flutter Universal App',
        description: 'Cross-platform Flutter application',
        type: 'flutter-universal',
        framework: 'flutter',
        version: '1.0.0',
        author: 'DNA Templates',
        tags: ['flutter'],
        dnaModules: [],
        requirements: {},
        features: [],
        complexity: 'intermediate',
        estimatedSetupTime: 10
      }));

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'flutter-project',
        '--template',
        'flutter-universal',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      
      const { TemplateInstantiationEngine } = require('@dna/core');
      const mockEngine = TemplateInstantiationEngine.mock.results[0]?.value;
      expect(mockEngine.instantiateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: SupportedFramework.FLUTTER
        }),
        expect.any(Object)
      );
    });
  });

  describe('Output formatting and user experience', () => {
    it('should show next steps after successful creation', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'help-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Next steps:');
      CLITestHarness.expectOutput(result, 'npm run dev');
      CLITestHarness.expectOutput(result, 'npm run build');
      CLITestHarness.expectOutput(result, 'npm test');
    });

    it('should show appropriate commands for skipped steps', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'skip-help-project',
        '--template',
        'basic-typescript',
        '--skip-install',
        '--skip-git',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'npm install');
      CLITestHarness.expectOutput(result, 'git init');
      CLITestHarness.expectOutput(result, 'git add .');
      CLITestHarness.expectOutput(result, 'git commit');
    });

    it('should show project location', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'location-project',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'Project location:');
      CLITestHarness.expectOutput(result, 'location-project');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large template variables efficiently', async () => {
      const largeVariables = Array.from({ length: 100 }, (_, i) => ({
        [`variable${i}`]: `value${i}`
      })).reduce((acc, cur) => ({ ...acc, ...cur }), {});

      inquirerMock.setResponses([
        { name: 'large-vars-project' },
        { templateId: 'basic-typescript' },
        largeVariables
      ]);

      const startTime = performance.now();
      const result = await CLITestHarness.runCommand(program, ['create']);
      const endTime = performance.now();

      CLITestHarness.expectSuccess(result);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle special characters in project names', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'create',
        'special-chars_123',
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, 'special-chars_123');
    });

    it('should handle very long project names', async () => {
      const longName = 'a'.repeat(50); // Maximum allowed length

      const result = await CLITestHarness.runCommand(program, [
        'create',
        longName,
        '--template',
        'basic-typescript',
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
    });

    it('should handle project creation in deep directory structures', async () => {
      const deepPath = createTestPath('level1', 'level2', 'level3', 'level4', 'level5');

      const result = await CLITestHarness.runCommand(program, [
        'create',
        'deep-project',
        '--template',
        'basic-typescript',
        '--output',
        deepPath,
        '--yes'
      ]);

      CLITestHarness.expectSuccess(result);
      expect(fsMock.mockFs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('level5')
      );
    });
  });
});