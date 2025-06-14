/**
 * @fileoverview CLI Test Harness for command execution testing
 */

import { Command } from 'commander';
import { jest } from '@jest/globals';
import { PassThrough } from 'stream';

export interface CLITestResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export interface CLITestOptions {
  args: string[];
  stdin?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export class CLITestHarness {
  private program: Command;
  private stdout: PassThrough;
  private stderr: PassThrough;
  private originalProcessExit: typeof process.exit;
  private originalConsoleLog: typeof console.log;
  private originalConsoleError: typeof console.error;
  private exitCode: number | null = null;

  constructor(program: Command) {
    this.program = program;
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.originalProcessExit = process.exit;
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
  }

  async execute(options: CLITestOptions): Promise<CLITestResult> {
    const { args, stdin, timeout = 10000, env = {} } = options;
    
    // Setup test environment
    this.setupTestEnvironment(env);
    
    // Capture outputs
    const stdoutData: string[] = [];
    const stderrData: string[] = [];
    
    this.stdout.on('data', (chunk) => stdoutData.push(chunk.toString()));
    this.stderr.on('data', (chunk) => stderrData.push(chunk.toString()));

    // Mock console methods to capture output
    console.log = (...args: any[]) => {
      this.stdout.write(args.join(' ') + '\n');
    };
    
    console.error = (...args: any[]) => {
      this.stderr.write(args.join(' ') + '\n');
    };

    // Mock process.exit to capture exit codes
    process.exit = ((code?: number) => {
      this.exitCode = code || 0;
      throw new ProcessExitError(code || 0);
    }) as any;

    let error: Error | undefined;
    
    try {
      // Prepare arguments (skip 'node', 'script-name')
      const processArgs = ['node', 'dna-cli', ...args];
      
      // Handle stdin if provided
      if (stdin) {
        // Mock inquirer responses would go here
        this.mockInquirerInputs(stdin);
      }
      
      // Execute command with timeout
      await Promise.race([
        this.program.parseAsync(processArgs),
        this.createTimeout(timeout)
      ]);
      
    } catch (err) {
      if (err instanceof ProcessExitError) {
        this.exitCode = err.code;
      } else {
        error = err as Error;
        this.exitCode = 1;
      }
    } finally {
      this.restoreEnvironment();
    }

    return {
      exitCode: this.exitCode,
      stdout: stdoutData.join(''),
      stderr: stderrData.join(''),
      error
    };
  }

  private setupTestEnvironment(env: Record<string, string>): void {
    // Set environment variables
    Object.keys(env).forEach(key => {
      process.env[key] = env[key];
    });
    
    // Set test-specific defaults
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.NO_UPDATE_CHECK = 'true';
  }

  private restoreEnvironment(): void {
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
    process.exit = this.originalProcessExit;
    this.exitCode = null;
  }

  private mockInquirerInputs(input: string): void {
    // This would be used with the inquirer mock
    // Implementation depends on how inquirer is mocked in the tests
  }

  private createTimeout(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  // Helper methods for common test scenarios
  static async runCommand(program: Command, args: string[]): Promise<CLITestResult> {
    const harness = new CLITestHarness(program);
    return harness.execute({ args });
  }

  static async runCommandWithInput(
    program: Command, 
    args: string[], 
    stdin: string
  ): Promise<CLITestResult> {
    const harness = new CLITestHarness(program);
    return harness.execute({ args, stdin });
  }

  static expectSuccess(result: CLITestResult): void {
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  }

  static expectFailure(result: CLITestResult, expectedCode?: number): void {
    if (expectedCode !== undefined) {
      expect(result.exitCode).toBe(expectedCode);
    } else {
      expect(result.exitCode).not.toBe(0);
    }
  }

  static expectOutput(result: CLITestResult, pattern: string | RegExp): void {
    if (typeof pattern === 'string') {
      expect(result.stdout).toContain(pattern);
    } else {
      expect(result.stdout).toMatch(pattern);
    }
  }

  static expectErrorOutput(result: CLITestResult, pattern: string | RegExp): void {
    if (typeof pattern === 'string') {
      expect(result.stderr).toContain(pattern);
    } else {
      expect(result.stderr).toMatch(pattern);
    }
  }
}

class ProcessExitError extends Error {
  constructor(public code: number) {
    super(`Process exited with code ${code}`);
    this.name = 'ProcessExitError';
  }
}

// Mock command factory for testing
export function createMockCommand(): Command {
  const program = new Command();
  
  // Disable help and version to prevent process exits during tests
  program.exitOverride();
  
  return program;
}

// Test environment helpers
export function createTestEnvironment(): Record<string, string> {
  return {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    NO_UPDATE_CHECK: 'true',
    NO_ANALYTICS: 'true',
    CI: 'true'
  };
}

export function createDebugEnvironment(): Record<string, string> {
  return {
    ...createTestEnvironment(),
    LOG_LEVEL: 'debug',
    DEBUG: 'true'
  };
}