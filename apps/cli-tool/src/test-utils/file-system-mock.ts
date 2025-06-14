/**
 * @fileoverview File system mocking utilities for testing
 */

import { jest } from '@jest/globals';
import path from 'path';

export interface MockFileSystem {
  [path: string]: string | MockFileSystem | null;
}

export interface FileSystemMockOptions {
  initialFiles?: MockFileSystem;
  allowWrites?: boolean;
  throwOnMissingFiles?: boolean;
}

export class FileSystemMock {
  private files: MockFileSystem = {};
  private options: FileSystemMockOptions;
  public mockFs: any;

  constructor(options: FileSystemMockOptions = {}) {
    this.options = {
      allowWrites: true,
      throwOnMissingFiles: false,
      ...options
    };
    
    if (options.initialFiles) {
      this.files = { ...options.initialFiles };
    }
  }

  setup(): void {
    // Mock fs-extra methods
    this.mockFs = {
      pathExists: jest.fn().mockImplementation((...args: any[]) => this.pathExists(args[0])),
      readFile: jest.fn().mockImplementation((...args: any[]) => this.readFile(args[0], args[1])),
      readdir: jest.fn().mockImplementation((...args: any[]) => this.readdir(args[0])),
      writeFile: jest.fn().mockImplementation((...args: any[]) => this.writeFile(args[0], args[1])),
      writeJSON: jest.fn().mockImplementation((...args: any[]) => this.writeJSON(args[0], args[1], args[2])),
      readJSON: jest.fn().mockImplementation((...args: any[]) => this.readJSON(args[0])),
      ensureDir: jest.fn().mockImplementation((...args: any[]) => this.ensureDir(args[0])),
      copy: jest.fn().mockImplementation((...args: any[]) => this.copy(args[0], args[1])),
      remove: jest.fn().mockImplementation((...args: any[]) => this.remove(args[0])),
      move: jest.fn().mockImplementation((...args: any[]) => this.move(args[0], args[1])),
      stat: jest.fn().mockImplementation((...args: any[]) => this.stat(args[0])),
      chmod: jest.fn().mockImplementation((...args: any[]) => this.chmod(args[0], args[1])),
    };

    // Apply mocks
    jest.doMock('fs-extra', () => this.mockFs);
  }

  teardown(): void {
    jest.restoreAllMocks();
  }

  // File system operations
  private async pathExists(filePath: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(filePath);
    return this.hasFile(normalizedPath);
  }

  private async readFile(filePath: string, encoding?: string): Promise<string | Buffer> {
    const normalizedPath = this.normalizePath(filePath);
    const content = this.getFile(normalizedPath);
    
    if (content === null || typeof content === 'object') {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    
    return encoding === 'utf8' || encoding === 'utf-8' ? content : Buffer.from(content);
  }

  private async readdir(dirPath: string): Promise<string[]> {
    const normalizedPath = this.normalizePath(dirPath);
    const dir = this.getFile(normalizedPath);
    
    if (dir === null) {
      throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
    }
    
    if (typeof dir === 'string') {
      throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
    }
    
    return Object.keys(dir);
  }

  private async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    if (!this.options.allowWrites) {
      throw new Error('File system writes are disabled in this test');
    }
    
    const normalizedPath = this.normalizePath(filePath);
    const stringContent = content instanceof Buffer ? content.toString() : content;
    this.setFile(normalizedPath, stringContent);
  }

  private async writeJSON(filePath: string, data: any, options?: any): Promise<void> {
    const content = JSON.stringify(data, null, options?.spaces || 2);
    await this.writeFile(filePath, content);
  }

  private async readJSON(filePath: string): Promise<any> {
    const content = await this.readFile(filePath, 'utf8') as string;
    return JSON.parse(content);
  }

  private async ensureDir(dirPath: string): Promise<void> {
    if (!this.options.allowWrites) {
      throw new Error('File system writes are disabled in this test');
    }
    
    const normalizedPath = this.normalizePath(dirPath);
    this.setFile(normalizedPath, {});
  }

  private async copy(src: string, dest: string): Promise<void> {
    if (!this.options.allowWrites) {
      throw new Error('File system writes are disabled in this test');
    }
    
    const normalizedSrc = this.normalizePath(src);
    const normalizedDest = this.normalizePath(dest);
    const content = this.getFile(normalizedSrc);
    
    if (content === null) {
      throw new Error(`ENOENT: no such file or directory, open '${src}'`);
    }
    
    this.setFile(normalizedDest, content);
  }

  private async remove(filePath: string): Promise<void> {
    if (!this.options.allowWrites) {
      throw new Error('File system writes are disabled in this test');
    }
    
    const normalizedPath = this.normalizePath(filePath);
    this.removeFile(normalizedPath);
  }

  private async move(src: string, dest: string): Promise<void> {
    if (!this.options.allowWrites) {
      throw new Error('File system writes are disabled in this test');
    }
    
    await this.copy(src, dest);
    await this.remove(src);
  }

  private async stat(filePath: string): Promise<any> {
    const normalizedPath = this.normalizePath(filePath);
    const exists = this.hasFile(normalizedPath);
    
    if (!exists) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }
    
    const content = this.getFile(normalizedPath);
    const isDirectory = typeof content === 'object' && content !== null;
    
    return {
      isDirectory: () => isDirectory,
      isFile: () => !isDirectory,
      size: isDirectory ? 0 : (content as string).length,
      mtime: new Date(),
      ctime: new Date(),
    };
  }

  private async chmod(filePath: string, mode: number): Promise<void> {
    // Mock implementation - just verify file exists
    const normalizedPath = this.normalizePath(filePath);
    if (!this.hasFile(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, chmod '${filePath}'`);
    }
  }

  // Helper methods
  private normalizePath(filePath: string): string {
    return path.posix.normalize(filePath.replace(/\\/g, '/'));
  }

  private hasFile(normalizedPath: string): boolean {
    const parts = normalizedPath.split('/').filter(Boolean);
    let current = this.files;
    
    for (const part of parts) {
      if (typeof current !== 'object' || current === null || !(part in current)) {
        return false;
      }
      current = current[part] as MockFileSystem;
    }
    
    return true;
  }

  private getFile(normalizedPath: string): string | MockFileSystem | null {
    const parts = normalizedPath.split('/').filter(Boolean);
    let current: string | MockFileSystem | null = this.files;
    
    for (const part of parts) {
      if (typeof current !== 'object' || current === null || !(part in current)) {
        return null;
      }
      current = current[part] ?? null;
    }
    
    return current;
  }

  private setFile(normalizedPath: string, content: string | MockFileSystem): void {
    const parts = normalizedPath.split('/').filter(Boolean);
    let current = this.files;
    
    // Create intermediate directories
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as MockFileSystem;
    }
    
    // Set the final file/directory
    const fileName = parts[parts.length - 1]!;
    current[fileName] = content;
  }

  private removeFile(normalizedPath: string): void {
    const parts = normalizedPath.split('/').filter(Boolean);
    let current = this.files;
    
    // Navigate to parent directory
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current)) {
        return; // File doesn't exist
      }
      current = current[part] as MockFileSystem;
    }
    
    // Remove the file
    const fileName = parts[parts.length - 1]!;
    delete current[fileName];
  }

  // Public methods for test setup
  addFile(filePath: string, content: string): void {
    const normalizedPath = this.normalizePath(filePath);
    this.setFile(normalizedPath, content);
  }

  addDirectory(dirPath: string): void {
    const normalizedPath = this.normalizePath(dirPath);
    this.setFile(normalizedPath, {});
  }

  getFileContent(filePath: string): string | null {
    const normalizedPath = this.normalizePath(filePath);
    const content = this.getFile(normalizedPath);
    return typeof content === 'string' ? content : null;
  }

  fileExists(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    return this.hasFile(normalizedPath);
  }

  reset(): void {
    this.files = {};
  }
}

// Factory functions for common test scenarios
export function createEmptyFileSystem(): FileSystemMock {
  return new FileSystemMock();
}

export function createBasicProjectStructure(): FileSystemMock {
  const fs = new FileSystemMock({
    initialFiles: {
      'templates': {
        'ai-native': {
          'ai-saas': {
            'template.json': JSON.stringify({
              id: 'ai-saas',
              name: 'AI SaaS Application',
              description: 'AI-powered SaaS application template',
              type: 'ai-saas',
              framework: 'nextjs',
              version: '1.0.0',
              author: 'DNA Templates',
              tags: ['ai', 'saas', 'nextjs'],
              dnaModules: ['auth-jwt', 'ai-openai'],
              requirements: {
                node: '>=18.0.0'
              },
              features: ['Authentication', 'AI Integration', 'Database'],
              complexity: 'intermediate',
              estimatedSetupTime: 8
            }, null, 2),
            'package.json.hbs': JSON.stringify({
              name: '{{projectName}}',
              version: '0.1.0',
              description: '{{description}}'
            }, null, 2),
            'README.md.hbs': '# {{projectName}}\n\n{{description}}'
          }
        },
        'foundation': {
          'basic-typescript': {
            'template.json': JSON.stringify({
              id: 'basic-typescript',
              name: 'Basic TypeScript Project',
              description: 'Simple TypeScript project template',
              type: 'foundation',
              framework: 'typescript',
              version: '1.0.0',
              author: 'DNA Templates',
              tags: ['typescript', 'basic'],
              dnaModules: [],
              requirements: {
                node: '>=18.0.0'
              },
              features: ['TypeScript', 'ESLint', 'Prettier'],
              complexity: 'beginner',
              estimatedSetupTime: 3
            }, null, 2)
          }
        }
      }
    }
  });
  
  return fs;
}

export function createProjectWithConflicts(): FileSystemMock {
  const fs = createBasicProjectStructure();
  
  // Add existing project directory
  fs.addDirectory('/test-project');
  fs.addFile('/test-project/package.json', '{"name": "existing-project"}');
  
  return fs;
}