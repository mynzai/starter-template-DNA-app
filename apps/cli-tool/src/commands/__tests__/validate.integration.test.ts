/**
 * @fileoverview Integration tests for validate command
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { Command } from 'commander';
import { validateCommand } from '../validate';
import {
  CLITestHarness,
  createMockCommand
} from '../../test-utils/cli-test-harness';
import {
  FileSystemMock,
  createEmptyFileSystem
} from '../../test-utils/file-system-mock';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestPath
} from '../../test-utils/test-helpers';

describe('Validate Command Integration Tests', () => {
  let program: Command;
  let fsMock: FileSystemMock;

  beforeEach(() => {
    setupTestEnvironment();
    
    fsMock = createEmptyFileSystem();
    fsMock.setup();
    
    // Create command instance
    program = createMockCommand();
    program.addCommand(validateCommand);
  });

  afterEach(() => {
    teardownTestEnvironment();
    fsMock.teardown();
    jest.clearAllMocks();
  });

  describe('Project validation', () => {
    describe('Valid project validation', () => {
      beforeEach(() => {
        // Setup a valid project structure
        fsMock.addDirectory('/test-project');
        fsMock.addFile('/test-project/package.json', JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          description: 'Test project description',
          author: 'Test Author',
          license: 'MIT',
          scripts: {
            dev: 'npm run start',
            build: 'npm run compile',
            test: 'jest',
            lint: 'eslint .'
          },
          dependencies: {
            'react': '^18.0.0'
          }
        }, null, 2));
        
        fsMock.addFile('/test-project/dna.config.json', JSON.stringify({
          template: 'test-template',
          framework: 'nextjs',
          modules: ['auth-jwt', 'database-postgres'],
          generated: new Date().toISOString(),
          version: '1.0.0'
        }, null, 2));
        
        fsMock.addFile('/test-project/README.md', '# Test Project\n\nDescription');
        fsMock.addFile('/test-project/.gitignore', 'node_modules/\n.env\n');
        fsMock.addFile('/test-project/tsconfig.json', '{"compilerOptions": {}}');
        fsMock.addDirectory('/test-project/src');
        fsMock.addDirectory('/test-project/node_modules');
        fsMock.addFile('/test-project/package-lock.json', '{}');
        fsMock.addFile('/test-project/.eslintrc.json', '{}');
        fsMock.addFile('/test-project/.prettierrc', '{}');
        fsMock.addDirectory('/test-project/__tests__');
      });

      it('should pass validation for valid project', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/test-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, '✅ Validation passed!');
        expect(result.stderr).toBe('');
      });

      it('should validate current directory by default', async () => {
        // Mock current working directory
        const originalCwd = process.cwd;
        process.cwd = jest.fn().mockReturnValue('/test-project');

        const result = await CLITestHarness.runCommand(program, ['validate']);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, '✅ Validation passed!');

        process.cwd = originalCwd;
      });
    });

    describe('Missing project directory', () => {
      it('should fail when project directory does not exist', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/nonexistent-project'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, '❌ Validation failed!');
        CLITestHarness.expectOutput(result, 'Project directory does not exist');
      });
    });

    describe('Package.json validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/incomplete-project');
      });

      it('should fail when package.json is missing', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/incomplete-project'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'package.json not found');
      });

      it('should fail when package.json is invalid JSON', async () => {
        fsMock.addFile('/incomplete-project/package.json', '{ invalid json }');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/incomplete-project'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'Invalid package.json format');
      });

      it('should fail when required fields are missing', async () => {
        fsMock.addFile('/incomplete-project/package.json', JSON.stringify({
          // Missing name, version, description
          scripts: {}
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/incomplete-project'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'Missing required field in package.json: name');
        CLITestHarness.expectOutput(result, 'Missing required field in package.json: version');
        CLITestHarness.expectOutput(result, 'Missing required field in package.json: description');
      });

      it('should warn about missing recommended fields', async () => {
        fsMock.addFile('/incomplete-project/package.json', JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          description: 'Test description'
          // Missing author, license, repository
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/incomplete-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Missing recommended field in package.json: author');
        CLITestHarness.expectOutput(result, 'Missing recommended field in package.json: license');
        CLITestHarness.expectOutput(result, 'Missing recommended field in package.json: repository');
      });

      it('should suggest missing scripts', async () => {
        fsMock.addFile('/incomplete-project/package.json', JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          description: 'Test description',
          scripts: {
            // Missing dev, build, test, lint
          }
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/incomplete-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Consider adding "dev" script');
        CLITestHarness.expectOutput(result, 'Consider adding "build" script');
        CLITestHarness.expectOutput(result, 'Consider adding "test" script');
        CLITestHarness.expectOutput(result, 'Consider adding "lint" script');
      });

      it('should warn about loose version constraints in strict mode', async () => {
        fsMock.addFile('/incomplete-project/package.json', JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          description: 'Test description',
          dependencies: {
            'react': '^18.0.0',
            'lodash': '~4.17.0'
          }
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/incomplete-project',
          '--strict'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Loose version constraint for react: ^18.0.0');
        CLITestHarness.expectOutput(result, 'Loose version constraint for lodash: ~4.17.0');
      });
    });

    describe('DNA configuration validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/dna-project');
        fsMock.addFile('/dna-project/package.json', JSON.stringify({
          name: 'dna-project',
          version: '1.0.0',
          description: 'DNA project'
        }));
      });

      it('should suggest adding DNA configuration when missing', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/dna-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Consider adding dna.config.json for DNA module configuration');
      });

      it('should warn about empty DNA modules', async () => {
        fsMock.addFile('/dna-project/dna.config.json', JSON.stringify({
          template: 'test-template',
          framework: 'nextjs',
          modules: [],
          version: '1.0.0'
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/dna-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'No DNA modules configured');
      });

      it('should warn about missing framework in DNA config', async () => {
        fsMock.addFile('/dna-project/dna.config.json', JSON.stringify({
          template: 'test-template',
          modules: ['auth-jwt'],
          version: '1.0.0'
          // Missing framework
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/dna-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Framework not specified in DNA configuration');
      });

      it('should fail on invalid DNA configuration', async () => {
        fsMock.addFile('/dna-project/dna.config.json', '{ invalid json }');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/dna-project'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'Invalid dna.config.json format');
      });
    });

    describe('Required files validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/minimal-project');
        fsMock.addFile('/minimal-project/package.json', JSON.stringify({
          name: 'minimal-project',
          version: '1.0.0',
          description: 'Minimal project'
        }));
      });

      it('should warn about missing recommended files', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/minimal-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Missing recommended file: README.md');
        CLITestHarness.expectOutput(result, 'Missing recommended file: .gitignore');
        CLITestHarness.expectOutput(result, 'Missing recommended file: tsconfig.json');
      });

      it('should suggest creating src directory', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/minimal-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Consider organizing code in a "src" directory');
      });
    });

    describe('Dependencies validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/deps-project');
        fsMock.addFile('/deps-project/package.json', JSON.stringify({
          name: 'deps-project',
          version: '1.0.0',
          description: 'Dependencies project'
        }));
      });

      it('should warn about missing node_modules', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/deps-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Dependencies not installed (node_modules missing)');
        CLITestHarness.expectOutput(result, 'Run "npm install" to install dependencies');
      });

      it('should suggest committing package-lock.json', async () => {
        fsMock.addDirectory('/deps-project/node_modules');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/deps-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Consider committing package-lock.json for reproducible builds');
      });
    });

    describe('Code quality validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/quality-project');
        fsMock.addFile('/quality-project/package.json', JSON.stringify({
          name: 'quality-project',
          version: '1.0.0',
          description: 'Code quality project'
        }));
      });

      it('should suggest adding ESLint configuration', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/quality-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Consider adding ESLint configuration for code quality');
      });

      it('should suggest adding Prettier configuration', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/quality-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Consider adding Prettier configuration for code formatting');
      });

      it('should warn about missing test directory', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/quality-project'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'No test directory found');
        CLITestHarness.expectOutput(result, 'Consider adding tests for better code quality');
      });

      it('should recognize different ESLint config files', async () => {
        fsMock.addFile('/quality-project/.eslintrc.js', 'module.exports = {}');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/quality-project'
        ]);

        CLITestHarness.expectSuccess(result);
        expect(result.stdout).not.toContain('Consider adding ESLint configuration');
      });

      it('should recognize different test directories', async () => {
        fsMock.addDirectory('/quality-project/test');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/quality-project'
        ]);

        CLITestHarness.expectSuccess(result);
        expect(result.stdout).not.toContain('No test directory found');
      });
    });
  });

  describe('Template validation', () => {
    describe('Valid template validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/valid-template');
        fsMock.addFile('/valid-template/template.json', JSON.stringify({
          name: 'Valid Template',
          description: 'A valid template for testing',
          type: 'foundation',
          framework: 'nextjs',
          version: '1.0.0',
          author: 'Test Author',
          dnaModules: ['auth-jwt'],
          features: ['Authentication', 'Testing']
        }));
        fsMock.addDirectory('/valid-template/src');
        fsMock.addDirectory('/valid-template/template');
        fsMock.addFile('/valid-template/template/package.json.hbs', '{}');
      });

      it('should pass validation for valid template', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/valid-template',
          '--template'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, '✅ Validation passed!');
      });
    });

    describe('Template metadata validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/template-test');
      });

      it('should fail when template.json is missing', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/template-test',
          '--template'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'template.json not found');
      });

      it('should fail when template.json is invalid JSON', async () => {
        fsMock.addFile('/template-test/template.json', '{ invalid json }');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/template-test',
          '--template'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'Invalid template.json format');
      });

      it('should fail when required fields are missing', async () => {
        fsMock.addFile('/template-test/template.json', JSON.stringify({
          // Missing name, description, type, framework, version
          author: 'Test Author'
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/template-test',
          '--template'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'Missing required field in template.json: name');
        CLITestHarness.expectOutput(result, 'Missing required field in template.json: description');
        CLITestHarness.expectOutput(result, 'Missing required field in template.json: type');
        CLITestHarness.expectOutput(result, 'Missing required field in template.json: framework');
        CLITestHarness.expectOutput(result, 'Missing required field in template.json: version');
      });

      it('should fail when DNA modules is not an array', async () => {
        fsMock.addFile('/template-test/template.json', JSON.stringify({
          name: 'Test Template',
          description: 'Test description',
          type: 'foundation',
          framework: 'nextjs',
          version: '1.0.0',
          dnaModules: 'not-an-array'
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/template-test',
          '--template'
        ]);

        CLITestHarness.expectFailure(result, 1);
        CLITestHarness.expectOutput(result, 'DNA modules must be an array');
      });

      it('should warn when features is not an array', async () => {
        fsMock.addFile('/template-test/template.json', JSON.stringify({
          name: 'Test Template',
          description: 'Test description',
          type: 'foundation',
          framework: 'nextjs',
          version: '1.0.0',
          features: 'not-an-array'
        }));

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/template-test',
          '--template'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Features should be an array');
      });
    });

    describe('Template structure validation', () => {
      beforeEach(() => {
        fsMock.addDirectory('/structure-template');
        fsMock.addFile('/structure-template/template.json', JSON.stringify({
          name: 'Structure Template',
          description: 'Template for structure testing',
          type: 'foundation',
          framework: 'nextjs',
          version: '1.0.0'
        }));
      });

      it('should warn about missing recommended directories', async () => {
        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/structure-template',
          '--template'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'Missing recommended directory: src');
        CLITestHarness.expectOutput(result, 'Missing recommended directory: template');
      });

      it('should warn about missing package.json template', async () => {
        fsMock.addDirectory('/structure-template/template');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/structure-template',
          '--template'
        ]);

        CLITestHarness.expectSuccess(result);
        CLITestHarness.expectOutput(result, 'No package.json template found');
      });

      it('should pass when all structure requirements are met', async () => {
        fsMock.addDirectory('/structure-template/src');
        fsMock.addDirectory('/structure-template/template');
        fsMock.addFile('/structure-template/template/package.json.hbs', '{}');

        const result = await CLITestHarness.runCommand(program, [
          'validate',
          '/structure-template',
          '--template'
        ]);

        CLITestHarness.expectSuccess(result);
        expect(result.stdout).not.toContain('Missing recommended directory');
        expect(result.stdout).not.toContain('No package.json template found');
      });
    });
  });

  describe('Fix functionality', () => {
    beforeEach(() => {
      fsMock.addDirectory('/fix-project');
      fsMock.addFile('/fix-project/package.json', JSON.stringify({
        name: 'fix-project',
        version: '1.0.0',
        description: 'Project needing fixes'
      }));
    });

    it('should create missing files when --fix is used', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/fix-project',
        '--fix'
      ]);

      CLITestHarness.expectSuccess(result);
      
      // Verify files were created
      expect(fsMock.mockFs.writeFile).toHaveBeenCalledWith(
        '/fix-project/.gitignore',
        'node_modules/\n.env\ndist/\n'
      );
      expect(fsMock.mockFs.writeFile).toHaveBeenCalledWith(
        '/fix-project/README.md',
        '# fix-project\n\nGenerated with DNA CLI\n'
      );
      
      CLITestHarness.expectOutput(result, 'Created .gitignore');
      CLITestHarness.expectOutput(result, 'Created README.md');
      CLITestHarness.expectOutput(result, 'Fixed 2 issue');
    });

    it('should not overwrite existing files when fixing', async () => {
      fsMock.addFile('/fix-project/.gitignore', 'existing-content');

      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/fix-project',
        '--fix'
      ]);

      CLITestHarness.expectSuccess(result);
      
      // Should only create README.md, not overwrite .gitignore
      expect(fsMock.mockFs.writeFile).toHaveBeenCalledWith(
        '/fix-project/README.md',
        '# fix-project\n\nGenerated with DNA CLI\n'
      );
      expect(fsMock.mockFs.writeFile).not.toHaveBeenCalledWith(
        '/fix-project/.gitignore',
        expect.any(String)
      );
      
      CLITestHarness.expectOutput(result, 'Created README.md');
      CLITestHarness.expectOutput(result, 'Fixed 1 issue');
    });

    it('should handle file creation errors gracefully', async () => {
      fsMock.mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/fix-project',
        '--fix'
      ]);

      CLITestHarness.expectSuccess(result); // Should not fail completely
      CLITestHarness.expectOutput(result, 'Failed to create');
    });
  });

  describe('Output formatting', () => {
    beforeEach(() => {
      fsMock.addDirectory('/format-project');
      fsMock.addFile('/format-project/package.json', JSON.stringify({
        name: 'format-project',
        version: '1.0.0'
        // Missing description (error), author (warning)
      }));
    });

    it('should display errors, warnings, and suggestions clearly', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/format-project'
      ]);

      CLITestHarness.expectFailure(result, 1);
      
      // Check for proper formatting
      CLITestHarness.expectOutput(result, '❌ Validation failed!');
      CLITestHarness.expectOutput(result, 'Errors:');
      CLITestHarness.expectOutput(result, '✗');
      CLITestHarness.expectOutput(result, 'Warnings:');
      CLITestHarness.expectOutput(result, '⚠');
      CLITestHarness.expectOutput(result, 'Suggestions:');
      CLITestHarness.expectOutput(result, '💡');
    });

    it('should show validation progress', async () => {
      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/format-project'
      ]);

      CLITestHarness.expectOutput(result, 'Validating project at');
      CLITestHarness.expectOutput(result, '/format-project');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle file system errors gracefully', async () => {
      fsMock.mockFs.pathExists.mockRejectedValue(new Error('File system error'));

      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/error-project'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'VALIDATION_FAILED');
    });

    it('should handle very deeply nested project paths', async () => {
      const deepPath = createTestPath('very', 'deep', 'nested', 'project', 'structure');
      fsMock.addDirectory(deepPath);
      fsMock.addFile(`${deepPath}/package.json`, JSON.stringify({
        name: 'deep-project',
        version: '1.0.0',
        description: 'Deep project'
      }));

      const result = await CLITestHarness.runCommand(program, [
        'validate',
        deepPath
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, deepPath);
    });

    it('should handle projects with special characters in paths', async () => {
      const specialPath = '/test-project with spaces & symbols @#$';
      fsMock.addDirectory(specialPath);
      fsMock.addFile(`${specialPath}/package.json`, JSON.stringify({
        name: 'special-project',
        version: '1.0.0',
        description: 'Project with special path'
      }));

      const result = await CLITestHarness.runCommand(program, [
        'validate',
        specialPath
      ]);

      CLITestHarness.expectSuccess(result);
      CLITestHarness.expectOutput(result, specialPath);
    });

    it('should handle circular symlinks gracefully', async () => {
      // Mock fs to simulate circular symlink detection
      fsMock.mockFs.pathExists.mockImplementation((path: string) => {
        if (path.includes('circular')) {
          throw new Error('ELOOP: too many symbolic links encountered');
        }
        return Promise.resolve(false);
      });

      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/circular-project'
      ]);

      CLITestHarness.expectFailure(result);
      CLITestHarness.expectErrorOutput(result, 'VALIDATION_FAILED');
    });
  });

  describe('Performance', () => {
    it('should validate large projects efficiently', async () => {
      // Create a project with many files
      fsMock.addDirectory('/large-project');
      fsMock.addFile('/large-project/package.json', JSON.stringify({
        name: 'large-project',
        version: '1.0.0',
        description: 'Large project for performance testing'
      }));

      // Add many files to simulate large project
      for (let i = 0; i < 100; i++) {
        fsMock.addFile(`/large-project/file${i}.js`, `// File ${i}`);
      }

      const startTime = performance.now();
      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/large-project'
      ]);
      const endTime = performance.now();

      CLITestHarness.expectSuccess(result);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle validation with many warnings efficiently', async () => {
      // Create project that will generate many warnings
      fsMock.addDirectory('/warning-project');
      fsMock.addFile('/warning-project/package.json', JSON.stringify({
        name: 'warning-project',
        version: '1.0.0',
        description: 'Project with many warnings',
        dependencies: {}
        // Missing many recommended fields and configurations
      }));

      const startTime = performance.now();
      const result = await CLITestHarness.runCommand(program, [
        'validate',
        '/warning-project'
      ]);
      const endTime = performance.now();

      CLITestHarness.expectSuccess(result);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Validation modes', () => {
    it('should differentiate between project and template validation', async () => {
      fsMock.addDirectory('/dual-test');
      
      // Test as project (should fail - no package.json)
      const projectResult = await CLITestHarness.runCommand(program, [
        'validate',
        '/dual-test'
      ]);
      CLITestHarness.expectFailure(projectResult, 1);
      CLITestHarness.expectOutput(projectResult, 'package.json not found');
      
      // Test as template (should fail - no template.json)
      const templateResult = await CLITestHarness.runCommand(program, [
        'validate',
        '/dual-test',
        '--template'
      ]);
      CLITestHarness.expectFailure(templateResult, 1);
      CLITestHarness.expectOutput(templateResult, 'template.json not found');
    });

    it('should apply strict validation rules when --strict is used', async () => {
      fsMock.addDirectory('/strict-project');
      fsMock.addFile('/strict-project/package.json', JSON.stringify({
        name: 'strict-project',
        version: '1.0.0',
        description: 'Strict validation test',
        dependencies: {
          'react': '^18.0.0' // Loose version constraint
        }
      }));

      // Normal validation
      const normalResult = await CLITestHarness.runCommand(program, [
        'validate',
        '/strict-project'
      ]);
      CLITestHarness.expectSuccess(normalResult);
      expect(normalResult.stdout).not.toContain('Loose version constraint');

      // Strict validation
      const strictResult = await CLITestHarness.runCommand(program, [
        'validate',
        '/strict-project',
        '--strict'
      ]);
      CLITestHarness.expectSuccess(strictResult);
      CLITestHarness.expectOutput(strictResult, 'Loose version constraint for react: ^18.0.0');
    });
  });
});