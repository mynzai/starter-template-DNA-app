#!/usr/bin/env node

/**
 * DNA CLI MCP Server
 * Provides Model Context Protocol integration for DNA Template CLI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface DNACreateArgs {
  projectName: string;
  template?: string;
  framework?: string;
  modules?: string;
  output?: string;
  packageManager?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
  dryRun?: boolean;
}

interface DNAListArgs {
  category?: string;
  framework?: string;
  modules?: boolean;
  complexity?: string;
  rating?: string;
}

interface DNAAddArgs {
  modules: string;
  projectPath?: string;
  resolveConflicts?: boolean;
  configure?: boolean;
}

interface DNATrackArgs {
  action: 'start' | 'progress' | 'end' | 'status' | 'report';
  epic?: string;
  story?: string;
  type?: string;
  notes?: string;
  filesModified?: number;
  testsAdded?: number;
  coverage?: number;
  status?: string;
  qualityGatesStatus?: string;
  format?: string;
}

interface DNAQualityArgs {
  action: 'check' | 'score' | 'benchmark';
  projectPath?: string;
  framework?: string;
  threshold?: number;
  detailed?: boolean;
  output?: string;
}

interface DNAGitArgs {
  action: 'config' | 'commit' | 'branch' | 'status' | 'rollback';
  message?: string;
  type?: string;
  epic?: string;
  story?: string;
  autoCommit?: boolean;
  conventionalCommits?: boolean;
  pushRemote?: boolean;
  requireTests?: boolean;
}

const server = new Server(
  {
    name: 'dna-cli-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to build command strings
function buildCommand(base: string, args: Record<string, any>): string {
  let cmd = base;
  
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value === 'boolean') {
      if (value) {
        cmd += ` --${key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`;
      }
    } else {
      const flag = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      cmd += ` --${flag}="${value}"`;
    }
  }
  
  return cmd;
}

// Main tool handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ==================== CREATE ====================
      case 'dna_create': {
        const createArgs = args as DNACreateArgs;
        const { projectName, ...options } = createArgs;
        
        const cmd = buildCommand(`dna-cli create ${projectName}`, options);
        console.error(`Executing: ${cmd}`);
        
        const { stdout, stderr } = await execAsync(cmd, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Project created successfully!

Command: ${cmd}

Output:
${stdout}${stderr ? `\n⚠️ Warnings:\n${stderr}` : ''}

Next steps:
1. Navigate to the project: cd ${projectName}
2. Install dependencies (if skipped): npm install
3. Start development: npm run dev`
            }
          ]
        };
      }

      // ==================== LIST ====================
      case 'dna_list': {
        const listArgs = args as DNAListArgs;
        const cmd = buildCommand('dna-cli list', listArgs);
        console.error(`Executing: ${cmd}`);
        
        const { stdout, stderr } = await execAsync(cmd);
        
        return {
          content: [
            {
              type: 'text',
              text: `📋 Available Templates and Modules:

${stdout}${stderr ? `\n⚠️ Warnings:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== ADD ====================
      case 'dna_add': {
        const addArgs = args as DNAAddArgs;
        const { modules, projectPath = '.', ...options } = addArgs;
        
        const cwd = path.resolve(projectPath);
        const cmd = buildCommand(`dna-cli add ${modules}`, options);
        console.error(`Executing: ${cmd} in ${cwd}`);
        
        const { stdout, stderr } = await execAsync(cmd, { cwd });
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ DNA Modules added successfully!

Modules: ${modules}
Project: ${cwd}

${stdout}${stderr ? `\n⚠️ Warnings:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== VALIDATE ====================
      case 'dna_validate': {
        const { projectPath = '.', strict = false, rules } = args as any;
        
        let cmd = `dna-cli validate ${projectPath}`;
        if (strict) cmd += ' --strict';
        if (rules) cmd += ` --rules=${rules}`;
        
        console.error(`Executing: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd);
        
        return {
          content: [
            {
              type: 'text',
              text: `🔍 Validation Results:

${stdout}${stderr ? `\n⚠️ Issues Found:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== TEST ====================
      case 'dna_test': {
        const { framework, coverage, qualityGates, stress, load } = args as any;
        
        let cmd = 'dna-cli test';
        if (framework) cmd += ` --framework=${framework}`;
        if (coverage) cmd += ` --coverage=${coverage}`;
        if (qualityGates) cmd += ' --quality-gates';
        if (stress) cmd += ' --stress';
        if (load) cmd += ' --load';
        
        console.error(`Executing: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd, {
          maxBuffer: 20 * 1024 * 1024, // 20MB for test outputs
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `🧪 Test Results:

${stdout}${stderr ? `\n⚠️ Test Warnings:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== TRACK ====================
      case 'dna_track': {
        const trackArgs = args as DNATrackArgs;
        const { action, ...options } = trackArgs;
        
        let cmd = `dna-cli track ${action}`;
        
        // Build command based on action
        if (action === 'start') {
          if (options.epic) cmd += ` --epic=${options.epic}`;
          if (options.story) cmd += ` --story=${options.story}`;
          if (options.type) cmd += ` --type=${options.type}`;
          if (options.notes) cmd += ` --notes="${options.notes}"`;
        } else if (action === 'progress') {
          if (options.filesModified) cmd += ` --files-modified=${options.filesModified}`;
          if (options.testsAdded) cmd += ` --tests-added=${options.testsAdded}`;
          if (options.coverage) cmd += ` --coverage=${options.coverage}`;
          if (options.notes) cmd += ` --notes="${options.notes}"`;
        } else if (action === 'end') {
          if (options.status) cmd += ` --status=${options.status}`;
          if (options.qualityGatesStatus) cmd += ` --quality-gates-status=${options.qualityGatesStatus}`;
          if (options.notes) cmd += ` --notes="${options.notes}"`;
        } else if (action === 'report') {
          if (options.format) cmd += ` --format=${options.format}`;
        }
        
        console.error(`Executing: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd);
        
        return {
          content: [
            {
              type: 'text',
              text: `📊 Tracking ${action}:

${stdout}${stderr ? `\n⚠️ Warnings:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== QUALITY ====================
      case 'dna_quality': {
        const qualityArgs = args as DNAQualityArgs;
        const { action, projectPath = '.', ...options } = qualityArgs;
        
        let cmd = `dna-cli quality ${action}`;
        if (projectPath && projectPath !== '.') cmd += ` --path=${projectPath}`;
        
        cmd = buildCommand(cmd, options);
        console.error(`Executing: ${cmd}`);
        
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: path.resolve(projectPath),
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `✨ Quality ${action}:

${stdout}${stderr ? `\n⚠️ Quality Issues:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== GIT ====================
      case 'dna_git': {
        const gitArgs = args as DNAGitArgs;
        const { action, ...options } = gitArgs;
        
        let cmd = `dna-cli git ${action}`;
        
        if (action === 'config') {
          if (options.autoCommit) cmd += ' --auto-commit';
          if (options.conventionalCommits) cmd += ' --conventional-commits';
          if (options.pushRemote) cmd += ' --push-remote';
          if (options.requireTests) cmd += ' --require-tests';
        } else if (action === 'commit') {
          if (options.type) cmd += ` --type=${options.type}`;
          if (options.message) cmd += ` --message="${options.message}"`;
        } else if (action === 'branch') {
          if (options.epic) cmd += ` --epic=${options.epic}`;
          if (options.story) cmd += ` --story=${options.story}`;
        }
        
        console.error(`Executing: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd);
        
        return {
          content: [
            {
              type: 'text',
              text: `🔄 Git ${action}:

${stdout}${stderr ? `\n⚠️ Git Warnings:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== COMPATIBILITY ====================
      case 'dna_compatibility': {
        const { modules, framework } = args as any;
        
        let cmd = 'dna-cli compatibility check';
        if (modules) cmd += ` --modules=${modules}`;
        if (framework) cmd += ` --framework=${framework}`;
        
        console.error(`Executing: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd);
        
        return {
          content: [
            {
              type: 'text',
              text: `🔗 Compatibility Check:

${stdout}${stderr ? `\n⚠️ Compatibility Issues:\n${stderr}` : ''}`
            }
          ]
        };
      }

      // ==================== UPDATE ====================
      case 'dna_update': {
        const { check = false } = args as any;
        
        const cmd = check ? 'dna-cli update --check' : 'dna-cli update';
        console.error(`Executing: ${cmd}`);
        
        const { stdout, stderr } = await execAsync(cmd);
        
        return {
          content: [
            {
              type: 'text',
              text: `🔄 Update Status:

${stdout}${stderr ? `\n⚠️ Update Warnings:\n${stderr}` : ''}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error executing DNA CLI command:

${error.message}

${error.stdout ? `Output:\n${error.stdout}` : ''}
${error.stderr ? `Error details:\n${error.stderr}` : ''}

Troubleshooting:
1. Ensure dna-cli is installed: npm install -g dna-template-cli
2. Check if the command syntax is correct
3. Verify you have necessary permissions`
        }
      ]
    };
  }
});

// Register available tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'dna_create',
      description: 'Create a new project using DNA CLI templates',
      inputSchema: {
        type: 'object',
        properties: {
          projectName: { 
            type: 'string', 
            description: 'Name of the project to create' 
          },
          template: { 
            type: 'string', 
            description: 'Template to use (e.g., ai-saas-nextjs, flutter-universal)' 
          },
          framework: { 
            type: 'string', 
            description: 'Target framework (nextjs, flutter, react-native, tauri, etc.)' 
          },
          modules: { 
            type: 'string', 
            description: 'DNA modules to include (comma-separated, e.g., auth-jwt,payments-stripe)' 
          },
          output: { 
            type: 'string', 
            description: 'Output directory path' 
          },
          packageManager: { 
            type: 'string', 
            enum: ['npm', 'yarn', 'pnpm', 'bun'],
            description: 'Package manager to use' 
          },
          skipInstall: { 
            type: 'boolean', 
            description: 'Skip dependency installation' 
          },
          skipGit: { 
            type: 'boolean', 
            description: 'Skip git repository initialization' 
          },
          dryRun: { 
            type: 'boolean', 
            description: 'Preview changes without creating files' 
          }
        },
        required: ['projectName']
      }
    },
    {
      name: 'dna_list',
      description: 'List available templates and DNA modules',
      inputSchema: {
        type: 'object',
        properties: {
          category: { 
            type: 'string',
            enum: ['ai-native', 'performance', 'cross-platform', 'foundation'],
            description: 'Filter by template category' 
          },
          framework: { 
            type: 'string', 
            description: 'Filter by framework' 
          },
          modules: { 
            type: 'boolean', 
            description: 'Show DNA modules instead of templates' 
          },
          complexity: { 
            type: 'string',
            enum: ['basic', 'intermediate', 'advanced'],
            description: 'Filter by complexity level' 
          },
          rating: { 
            type: 'string', 
            description: 'Minimum rating (e.g., "4+")' 
          }
        }
      }
    },
    {
      name: 'dna_add',
      description: 'Add DNA modules to an existing project',
      inputSchema: {
        type: 'object',
        properties: {
          modules: { 
            type: 'string', 
            description: 'DNA modules to add (comma-separated)' 
          },
          projectPath: { 
            type: 'string', 
            description: 'Path to the project (defaults to current directory)' 
          },
          resolveConflicts: { 
            type: 'boolean', 
            description: 'Automatically resolve module conflicts' 
          },
          configure: { 
            type: 'boolean', 
            description: 'Interactive configuration after adding' 
          }
        },
        required: ['modules']
      }
    },
    {
      name: 'dna_validate',
      description: 'Validate project structure and quality',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { 
            type: 'string', 
            description: 'Project path to validate (defaults to current directory)' 
          },
          strict: { 
            type: 'boolean', 
            description: 'Use strict validation rules' 
          },
          rules: { 
            type: 'string', 
            description: 'Specific rules to check (comma-separated: security,performance,accessibility)' 
          }
        }
      }
    },
    {
      name: 'dna_test',
      description: 'Run comprehensive tests with quality gates',
      inputSchema: {
        type: 'object',
        properties: {
          framework: { 
            type: 'string', 
            description: 'Target framework for testing' 
          },
          coverage: { 
            type: 'number', 
            description: 'Minimum coverage threshold' 
          },
          qualityGates: { 
            type: 'boolean', 
            description: 'Run with quality gate validation' 
          },
          stress: { 
            type: 'boolean', 
            description: 'Run stress tests' 
          },
          load: { 
            type: 'boolean', 
            description: 'Run load tests' 
          }
        }
      }
    },
    {
      name: 'dna_track',
      description: 'Track development session progress',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string',
            enum: ['start', 'progress', 'end', 'status', 'report'],
            description: 'Tracking action to perform' 
          },
          epic: { 
            type: 'string', 
            description: 'Epic identifier (for start action)' 
          },
          story: { 
            type: 'string', 
            description: 'Story identifier (for start action)' 
          },
          type: { 
            type: 'string',
            enum: ['feature', 'bugfix', 'refactor', 'testing', 'verification'],
            description: 'Session type (for start action)' 
          },
          notes: { 
            type: 'string', 
            description: 'Session notes' 
          },
          filesModified: { 
            type: 'number', 
            description: 'Number of files modified (for progress action)' 
          },
          testsAdded: { 
            type: 'number', 
            description: 'Number of tests added (for progress action)' 
          },
          coverage: { 
            type: 'number', 
            description: 'Current test coverage percentage (for progress action)' 
          },
          status: { 
            type: 'string',
            enum: ['completed', 'failed'],
            description: 'Session status (for end action)' 
          },
          qualityGatesStatus: { 
            type: 'string',
            enum: ['passed', 'failed', 'partial'],
            description: 'Quality gates status' 
          },
          format: { 
            type: 'string',
            enum: ['md', 'json', 'html'],
            description: 'Report format (for report action)' 
          }
        },
        required: ['action']
      }
    },
    {
      name: 'dna_quality',
      description: 'Run quality validation and scoring',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string',
            enum: ['check', 'score', 'benchmark'],
            description: 'Quality action to perform' 
          },
          projectPath: { 
            type: 'string', 
            description: 'Project path (defaults to current directory)' 
          },
          framework: { 
            type: 'string', 
            description: 'Target framework' 
          },
          threshold: { 
            type: 'number', 
            description: 'Minimum quality threshold' 
          },
          detailed: { 
            type: 'boolean', 
            description: 'Show detailed results' 
          },
          output: { 
            type: 'string', 
            description: 'Output file for results' 
          }
        },
        required: ['action']
      }
    },
    {
      name: 'dna_git',
      description: 'Git automation and workflow management',
      inputSchema: {
        type: 'object',
        properties: {
          action: { 
            type: 'string',
            enum: ['config', 'commit', 'branch', 'status', 'rollback'],
            description: 'Git action to perform' 
          },
          message: { 
            type: 'string', 
            description: 'Commit message (for commit action)' 
          },
          type: { 
            type: 'string',
            enum: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
            description: 'Commit type (for commit action)' 
          },
          epic: { 
            type: 'string', 
            description: 'Epic identifier (for branch action)' 
          },
          story: { 
            type: 'string', 
            description: 'Story identifier (for branch action)' 
          },
          autoCommit: { 
            type: 'boolean', 
            description: 'Enable auto-commit (for config action)' 
          },
          conventionalCommits: { 
            type: 'boolean', 
            description: 'Use conventional commits (for config action)' 
          },
          pushRemote: { 
            type: 'boolean', 
            description: 'Push to remote (for config action)' 
          },
          requireTests: { 
            type: 'boolean', 
            description: 'Require tests to pass (for config action)' 
          }
        },
        required: ['action']
      }
    },
    {
      name: 'dna_compatibility',
      description: 'Check DNA module compatibility',
      inputSchema: {
        type: 'object',
        properties: {
          modules: { 
            type: 'string', 
            description: 'Modules to check (comma-separated)' 
          },
          framework: { 
            type: 'string', 
            description: 'Target framework' 
          }
        }
      }
    },
    {
      name: 'dna_update',
      description: 'Update DNA CLI and check for updates',
      inputSchema: {
        type: 'object',
        properties: {
          check: { 
            type: 'boolean', 
            description: 'Only check for updates without installing' 
          }
        }
      }
    }
  ]
}));

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DNA CLI MCP Server started successfully');
}

main().catch((error) => {
  console.error('Fatal error starting DNA CLI MCP Server:', error);
  process.exit(1);
});