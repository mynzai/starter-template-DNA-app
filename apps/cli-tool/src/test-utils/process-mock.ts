/**
 * @fileoverview Process and child_process mocking utilities for testing
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

export interface MockChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  exitCode: number | null;
  killed: boolean;
  pid: number;
  kill: jest.Mock;
}

export interface SpawnMockOptions {
  exitCode?: number;
  stdout?: string[];
  stderr?: string[];
  error?: Error;
  delay?: number;
}

export class ProcessMock {
  private spawns: Map<string, SpawnMockOptions> = new Map();
  private defaultSpawnOptions: SpawnMockOptions = { exitCode: 0 };

  setup(): void {
    // Mock child_process.spawn
    jest.doMock('child_process', () => ({
      spawn: jest.fn().mockImplementation(this.mockSpawn.bind(this)),
      exec: jest.fn().mockImplementation(this.mockExec.bind(this)),
      execSync: jest.fn().mockImplementation(this.mockExecSync.bind(this))
    }));
  }

  teardown(): void {
    jest.restoreAllMocks();
    this.spawns.clear();
  }

  setSpawnMock(command: string, options: SpawnMockOptions): void {
    this.spawns.set(command, options);
  }

  setDefaultSpawn(options: SpawnMockOptions): void {
    this.defaultSpawnOptions = options;
  }

  private mockSpawn(command: string, args: string[] = [], options: any = {}): MockChildProcess {
    const fullCommand = `${command} ${args.join(' ')}`;
    const mockOptions = this.spawns.get(fullCommand) || this.spawns.get(command) || this.defaultSpawnOptions;

    const mockProcess = new EventEmitter() as MockChildProcess;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.exitCode = null;
    mockProcess.killed = false;
    mockProcess.pid = Math.floor(Math.random() * 10000);
    mockProcess.kill = jest.fn().mockImplementation(() => {
      mockProcess.killed = true;
      mockProcess.emit('close', 1);
      return true;
    });

    // Simulate async execution
    setTimeout(() => {
      if (mockOptions.error) {
        mockProcess.emit('error', mockOptions.error);
        return;
      }

      // Emit stdout data
      if (mockOptions.stdout) {
        mockOptions.stdout.forEach(line => {
          mockProcess.stdout!.emit('data', line + '\n');
        });
      }

      // Emit stderr data
      if (mockOptions.stderr) {
        mockOptions.stderr.forEach(line => {
          mockProcess.stderr!.emit('data', line + '\n');
        });
      }

      // Emit close event
      const exitCode = mockOptions.exitCode ?? 0;
      mockProcess.exitCode = exitCode;
      mockProcess.emit('close', exitCode);
    }, mockOptions.delay || 0);

    return mockProcess;
  }

  private mockExec(command: string, options: any, callback?: Function): any {
    const mockOptions = this.spawns.get(command) || this.defaultSpawnOptions;
    
    setTimeout(() => {
      if (callback) {
        const error = mockOptions.error || (mockOptions.exitCode !== 0 ? new Error(`Command failed: ${command}`) : null);
        const stdout = mockOptions.stdout?.join('\n') || '';
        const stderr = mockOptions.stderr?.join('\n') || '';
        callback(error, stdout, stderr);
      }
    }, mockOptions.delay || 0);

    return { kill: jest.fn() };
  }

  private mockExecSync(command: string, options: any = {}): string {
    const mockOptions = this.spawns.get(command) || this.defaultSpawnOptions;
    
    if (mockOptions.error) {
      throw mockOptions.error;
    }

    if (mockOptions.exitCode !== 0) {
      const error = new Error(`Command failed: ${command}`) as any;
      error.status = mockOptions.exitCode;
      throw error;
    }

    return mockOptions.stdout?.join('\n') || '';
  }

  // Preset command mocks
  mockNpmInstall(success: boolean = true, output: string[] = []): void {
    this.setSpawnMock('npm install', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Installing dependencies...', 'Dependencies installed successfully', ...output] : [],
      stderr: success ? [] : ['npm ERR! Failed to install dependencies', ...output],
      delay: 100
    });

    this.setSpawnMock('npm', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Installing dependencies...', 'Dependencies installed successfully', ...output] : [],
      stderr: success ? [] : ['npm ERR! Failed to install dependencies', ...output],
      delay: 100
    });
  }

  mockYarnInstall(success: boolean = true, output: string[] = []): void {
    this.setSpawnMock('yarn install', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Installing dependencies...', 'Done in 10.5s', ...output] : [],
      stderr: success ? [] : ['error Failed to install dependencies', ...output],
      delay: 100
    });

    this.setSpawnMock('yarn', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Installing dependencies...', 'Done in 10.5s', ...output] : [],
      stderr: success ? [] : ['error Failed to install dependencies', ...output],
      delay: 100
    });
  }

  mockGitInit(success: boolean = true): void {
    this.setSpawnMock('git init', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Initialized empty Git repository'] : [],
      stderr: success ? [] : ['fatal: not a git repository'],
      delay: 50
    });

    this.setSpawnMock('git add .', {
      exitCode: success ? 0 : 1,
      stdout: [],
      stderr: success ? [] : ['fatal: not a git repository'],
      delay: 50
    });

    this.setSpawnMock('git commit -m "Initial commit from DNA CLI"', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['[main (root-commit) abc123] Initial commit from DNA CLI'] : [],
      stderr: success ? [] : ['fatal: not a git repository'],
      delay: 50
    });
  }

  mockFlutterCommands(success: boolean = true): void {
    this.setSpawnMock('flutter --version', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Flutter 3.16.0 • channel stable'] : [],
      stderr: success ? [] : ['flutter: command not found'],
      delay: 50
    });

    this.setSpawnMock('flutter create', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Creating Flutter project...', 'Project created successfully'] : [],
      stderr: success ? [] : ['Error creating Flutter project'],
      delay: 200
    });

    this.setSpawnMock('flutter pub get', {
      exitCode: success ? 0 : 1,
      stdout: success ? ['Running "flutter pub get"', 'Got dependencies!'] : [],
      stderr: success ? [] : ['pub get failed'],
      delay: 150
    });
  }

  mockNetworkCommands(hasConnection: boolean = true): void {
    this.setSpawnMock('ping -c 1 google.com', {
      exitCode: hasConnection ? 0 : 1,
      stdout: hasConnection ? ['PING google.com', '1 packets transmitted, 1 received'] : [],
      stderr: hasConnection ? [] : ['ping: cannot resolve google.com'],
      delay: 100
    });
  }

  // Command builders for complex scenarios
  createPackageManagerFlow(manager: 'npm' | 'yarn' | 'pnpm' | 'bun', success: boolean = true): void {
    switch (manager) {
      case 'npm':
        this.mockNpmInstall(success);
        break;
      case 'yarn':
        this.mockYarnInstall(success);
        break;
      case 'pnpm':
        this.setSpawnMock('pnpm install', {
          exitCode: success ? 0 : 1,
          stdout: success ? ['Installing dependencies...', 'Dependencies installed'] : [],
          stderr: success ? [] : ['ERR_PNPM_INSTALLATION_FAILED'],
          delay: 100
        });
        break;
      case 'bun':
        this.setSpawnMock('bun install', {
          exitCode: success ? 0 : 1,
          stdout: success ? ['Installing dependencies...', 'Installed successfully'] : [],
          stderr: success ? [] : ['error: Failed to install'],
          delay: 80
        });
        break;
    }
  }

  createGitFlow(success: boolean = true): void {
    this.mockGitInit(success);
  }

  createFlutterFlow(success: boolean = true): void {
    this.mockFlutterCommands(success);
  }

  // Error scenarios
  createNetworkErrorScenario(): void {
    this.setDefaultSpawn({
      exitCode: 1,
      stderr: ['Network error: Unable to connect to registry'],
      error: new Error('ENOTFOUND registry.npmjs.org')
    });
  }

  createPermissionErrorScenario(): void {
    this.setDefaultSpawn({
      exitCode: 1,
      stderr: ['Permission denied: Unable to write to directory'],
      error: new Error('EACCES: permission denied')
    });
  }

  createTimeoutScenario(): void {
    this.setDefaultSpawn({
      delay: 30000, // Very long delay to simulate timeout
      exitCode: 1,
      stderr: ['Operation timed out']
    });
  }

  createDiskSpaceErrorScenario(): void {
    this.setDefaultSpawn({
      exitCode: 1,
      stderr: ['No space left on device'],
      error: new Error('ENOSPC: no space left on device')
    });
  }
}

// Factory functions for common scenarios
export function createProcessMock(): ProcessMock {
  const mock = new ProcessMock();
  mock.setup();
  return mock;
}

export function createSuccessfulProcessMock(): ProcessMock {
  const mock = createProcessMock();
  mock.mockNpmInstall(true);
  mock.mockGitInit(true);
  return mock;
}

export function createFailingProcessMock(): ProcessMock {
  const mock = createProcessMock();
  mock.mockNpmInstall(false, ['Error: Could not resolve dependencies']);
  mock.mockGitInit(false);
  return mock;
}

export function createNetworkFailureProcessMock(): ProcessMock {
  const mock = createProcessMock();
  mock.createNetworkErrorScenario();
  return mock;
}

export function createPermissionErrorProcessMock(): ProcessMock {
  const mock = createProcessMock();
  mock.createPermissionErrorScenario();
  return mock;
}

// Test helpers
export function expectCommandCalled(command: string, args?: string[]): void {
  const { spawn } = require('child_process');
  if (args) {
    expect(spawn).toHaveBeenCalledWith(command, args, expect.any(Object));
  } else {
    expect(spawn).toHaveBeenCalledWith(expect.stringContaining(command), expect.any(Array), expect.any(Object));
  }
}

export function expectNoCommandsCalled(): void {
  const { spawn } = require('child_process');
  expect(spawn).not.toHaveBeenCalled();
}

export function getSpawnCallCount(): number {
  const { spawn } = require('child_process');
  return spawn.mock.calls.length;
}