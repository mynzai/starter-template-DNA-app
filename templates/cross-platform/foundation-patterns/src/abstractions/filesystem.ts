/**
 * Cross-Platform File System Abstraction
 * Provides unified file operations across Flutter, React Native, Next.js, Tauri, and SvelteKit
 */

export interface FileSystemOptions {
  encoding?: 'utf8' | 'base64' | 'binary';
  createDirs?: boolean;
  overwrite?: boolean;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  mimeType?: string;
}

export interface DirectoryListing {
  files: FileInfo[];
  directories: FileInfo[];
  totalCount: number;
}

/**
 * Platform-agnostic file system interface
 */
export abstract class FileSystemAdapter {
  abstract platform: 'flutter' | 'react-native' | 'nextjs' | 'tauri' | 'sveltekit' | 'web';
  
  // File operations
  abstract readFile(path: string, options?: FileSystemOptions): Promise<string | Uint8Array>;
  abstract writeFile(path: string, content: string | Uint8Array, options?: FileSystemOptions): Promise<void>;
  abstract deleteFile(path: string): Promise<void>;
  abstract copyFile(sourcePath: string, destPath: string): Promise<void>;
  abstract moveFile(sourcePath: string, destPath: string): Promise<void>;
  
  // Directory operations
  abstract createDirectory(path: string, recursive?: boolean): Promise<void>;
  abstract deleteDirectory(path: string, recursive?: boolean): Promise<void>;
  abstract listDirectory(path: string): Promise<DirectoryListing>;
  
  // Path operations
  abstract joinPath(...segments: string[]): string;
  abstract dirname(path: string): string;
  abstract basename(path: string): string;
  abstract extname(path: string): string;
  abstract exists(path: string): Promise<boolean>;
  
  // File info
  abstract getFileInfo(path: string): Promise<FileInfo>;
  abstract getAppDataPath(): Promise<string>;
  abstract getTempPath(): Promise<string>;
  abstract getDocumentsPath(): Promise<string>;
  
  // Permissions
  abstract checkPermissions(path: string): Promise<{ read: boolean; write: boolean; execute: boolean }>;
  
  // Watch operations
  abstract watchFile(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void>;
  abstract watchDirectory(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void>;
}

/**
 * Tauri File System Implementation
 */
export class TauriFileSystemAdapter extends FileSystemAdapter {
  platform = 'tauri' as const;
  
  async readFile(path: string, options?: FileSystemOptions): Promise<string | Uint8Array> {
    const { readTextFile, readBinaryFile } = await import('@tauri-apps/api/fs');
    
    if (options?.encoding === 'binary') {
      return await readBinaryFile(path);
    }
    return await readTextFile(path);
  }
  
  async writeFile(path: string, content: string | Uint8Array, options?: FileSystemOptions): Promise<void> {
    const { writeTextFile, writeBinaryFile, createDir } = await import('@tauri-apps/api/fs');
    const { dirname } = await import('@tauri-apps/api/path');
    
    if (options?.createDirs) {
      const dir = await dirname(path);
      await createDir(dir, { recursive: true });
    }
    
    if (content instanceof Uint8Array) {
      await writeBinaryFile(path, content);
    } else {
      await writeTextFile(path, content);
    }
  }
  
  async deleteFile(path: string): Promise<void> {
    const { removeFile } = await import('@tauri-apps/api/fs');
    await removeFile(path);
  }
  
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const { copyFile } = await import('@tauri-apps/api/fs');
    await copyFile(sourcePath, destPath);
  }
  
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    await this.copyFile(sourcePath, destPath);
    await this.deleteFile(sourcePath);
  }
  
  async createDirectory(path: string, recursive?: boolean): Promise<void> {
    const { createDir } = await import('@tauri-apps/api/fs');
    await createDir(path, { recursive });
  }
  
  async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    const { removeDir } = await import('@tauri-apps/api/fs');
    await removeDir(path, { recursive });
  }
  
  async listDirectory(path: string): Promise<DirectoryListing> {
    const { readDir } = await import('@tauri-apps/api/fs');
    const entries = await readDir(path);
    
    const files: FileInfo[] = [];
    const directories: FileInfo[] = [];
    
    for (const entry of entries) {
      const info: FileInfo = {
        name: entry.name || '',
        path: entry.path,
        size: 0, // Tauri doesn't provide size directly
        lastModified: new Date(),
        isDirectory: entry.children !== undefined,
      };
      
      if (info.isDirectory) {
        directories.push(info);
      } else {
        files.push(info);
      }
    }
    
    return {
      files,
      directories,
      totalCount: files.length + directories.length,
    };
  }
  
  joinPath(...segments: string[]): string {
    return segments.join('/').replace(/\/+/g, '/');
  }
  
  dirname(path: string): string {
    return path.substring(0, path.lastIndexOf('/')) || '/';
  }
  
  basename(path: string): string {
    return path.substring(path.lastIndexOf('/') + 1);
  }
  
  extname(path: string): string {
    const base = this.basename(path);
    const lastDot = base.lastIndexOf('.');
    return lastDot > 0 ? base.substring(lastDot) : '';
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      await this.getFileInfo(path);
      return true;
    } catch {
      return false;
    }
  }
  
  async getFileInfo(path: string): Promise<FileInfo> {
    const { metadata } = await import('@tauri-apps/api/fs');
    const meta = await metadata(path);
    
    return {
      name: this.basename(path),
      path,
      size: meta.size || 0,
      lastModified: meta.modifiedAt ? new Date(meta.modifiedAt) : new Date(),
      isDirectory: meta.isDir || false,
    };
  }
  
  async getAppDataPath(): Promise<string> {
    const { appDataDir } = await import('@tauri-apps/api/path');
    return await appDataDir();
  }
  
  async getTempPath(): Promise<string> {
    const { tempDir } = await import('@tauri-apps/api/path');
    return await tempDir();
  }
  
  async getDocumentsPath(): Promise<string> {
    const { documentDir } = await import('@tauri-apps/api/path');
    return await documentDir();
  }
  
  async checkPermissions(path: string): Promise<{ read: boolean; write: boolean; execute: boolean }> {
    // Tauri API doesn't expose permissions directly, so we try operations
    try {
      await this.getFileInfo(path);
      return { read: true, write: true, execute: false };
    } catch {
      return { read: false, write: false, execute: false };
    }
  }
  
  async watchFile(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void> {
    // Tauri doesn't have built-in file watching, implement polling or use external library
    let watching = true;
    let lastModified: Date | null = null;
    
    try {
      const info = await this.getFileInfo(path);
      lastModified = info.lastModified;
    } catch {
      // File doesn't exist
    }
    
    const interval = setInterval(async () => {
      if (!watching) return;
      
      try {
        const info = await this.getFileInfo(path);
        if (!lastModified || info.lastModified > lastModified) {
          lastModified = info.lastModified;
          callback('change', path);
        }
      } catch {
        if (lastModified) {
          lastModified = null;
          callback('delete', path);
        }
      }
    }, 1000);
    
    return () => {
      watching = false;
      clearInterval(interval);
    };
  }
  
  async watchDirectory(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void> {
    // Similar polling implementation for directories
    let watching = true;
    let lastListing: string[] = [];
    
    try {
      const listing = await this.listDirectory(path);
      lastListing = listing.files.concat(listing.directories).map(f => f.name);
    } catch {
      // Directory doesn't exist
    }
    
    const interval = setInterval(async () => {
      if (!watching) return;
      
      try {
        const listing = await this.listDirectory(path);
        const currentListing = listing.files.concat(listing.directories).map(f => f.name);
        
        // Check for changes
        const added = currentListing.filter(name => !lastListing.includes(name));
        const removed = lastListing.filter(name => !currentListing.includes(name));
        
        for (const name of added) {
          callback('change', this.joinPath(path, name));
        }
        
        for (const name of removed) {
          callback('delete', this.joinPath(path, name));
        }
        
        lastListing = currentListing;
      } catch {
        // Directory might have been deleted
        if (lastListing.length > 0) {
          lastListing = [];
          callback('delete', path);
        }
      }
    }, 1000);
    
    return () => {
      watching = false;
      clearInterval(interval);
    };
  }
}

/**
 * React Native File System Implementation
 */
export class ReactNativeFileSystemAdapter extends FileSystemAdapter {
  platform = 'react-native' as const;
  
  async readFile(path: string, options?: FileSystemOptions): Promise<string | Uint8Array> {
    const RNFS = await import('react-native-fs');
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    
    const content = await RNFS.default.readFile(path, encoding);
    
    if (options?.encoding === 'binary') {
      // Convert base64 to Uint8Array
      const binary = atob(content);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return array;
    }
    
    return content;
  }
  
  async writeFile(path: string, content: string | Uint8Array, options?: FileSystemOptions): Promise<void> {
    const RNFS = await import('react-native-fs');
    
    if (options?.createDirs) {
      const dir = this.dirname(path);
      await RNFS.default.mkdir(dir);
    }
    
    let writeContent: string;
    if (content instanceof Uint8Array) {
      // Convert Uint8Array to base64
      const binary = String.fromCharCode(...content);
      writeContent = btoa(binary);
      await RNFS.default.writeFile(path, writeContent, 'base64');
    } else {
      writeContent = content;
      await RNFS.default.writeFile(path, writeContent, 'utf8');
    }
  }
  
  async deleteFile(path: string): Promise<void> {
    const RNFS = await import('react-native-fs');
    await RNFS.default.unlink(path);
  }
  
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const RNFS = await import('react-native-fs');
    await RNFS.default.copyFile(sourcePath, destPath);
  }
  
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const RNFS = await import('react-native-fs');
    await RNFS.default.moveFile(sourcePath, destPath);
  }
  
  async createDirectory(path: string, recursive?: boolean): Promise<void> {
    const RNFS = await import('react-native-fs');
    await RNFS.default.mkdir(path);
  }
  
  async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    const RNFS = await import('react-native-fs');
    if (recursive) {
      const listing = await this.listDirectory(path);
      for (const file of listing.files) {
        await this.deleteFile(file.path);
      }
      for (const dir of listing.directories) {
        await this.deleteDirectory(dir.path, true);
      }
    }
    await RNFS.default.unlink(path);
  }
  
  async listDirectory(path: string): Promise<DirectoryListing> {
    const RNFS = await import('react-native-fs');
    const items = await RNFS.default.readDir(path);
    
    const files: FileInfo[] = [];
    const directories: FileInfo[] = [];
    
    for (const item of items) {
      const info: FileInfo = {
        name: item.name,
        path: item.path,
        size: item.size || 0,
        lastModified: item.mtime || new Date(),
        isDirectory: item.isDirectory(),
      };
      
      if (info.isDirectory) {
        directories.push(info);
      } else {
        files.push(info);
      }
    }
    
    return {
      files,
      directories,
      totalCount: files.length + directories.length,
    };
  }
  
  joinPath(...segments: string[]): string {
    return segments.join('/').replace(/\/+/g, '/');
  }
  
  dirname(path: string): string {
    return path.substring(0, path.lastIndexOf('/')) || '/';
  }
  
  basename(path: string): string {
    return path.substring(path.lastIndexOf('/') + 1);
  }
  
  extname(path: string): string {
    const base = this.basename(path);
    const lastDot = base.lastIndexOf('.');
    return lastDot > 0 ? base.substring(lastDot) : '';
  }
  
  async exists(path: string): Promise<boolean> {
    const RNFS = await import('react-native-fs');
    return await RNFS.default.exists(path);
  }
  
  async getFileInfo(path: string): Promise<FileInfo> {
    const RNFS = await import('react-native-fs');
    const stat = await RNFS.default.stat(path);
    
    return {
      name: this.basename(path),
      path,
      size: stat.size || 0,
      lastModified: stat.mtime || new Date(),
      isDirectory: stat.isDirectory(),
    };
  }
  
  async getAppDataPath(): Promise<string> {
    const RNFS = await import('react-native-fs');
    return RNFS.default.DocumentDirectoryPath;
  }
  
  async getTempPath(): Promise<string> {
    const RNFS = await import('react-native-fs');
    return RNFS.default.TemporaryDirectoryPath;
  }
  
  async getDocumentsPath(): Promise<string> {
    const RNFS = await import('react-native-fs');
    return RNFS.default.DocumentDirectoryPath;
  }
  
  async checkPermissions(path: string): Promise<{ read: boolean; write: boolean; execute: boolean }> {
    try {
      await this.getFileInfo(path);
      return { read: true, write: true, execute: false };
    } catch {
      return { read: false, write: false, execute: false };
    }
  }
  
  async watchFile(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void> {
    // React Native doesn't have native file watching, implement polling
    return this.pollForChanges(path, callback);
  }
  
  async watchDirectory(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void> {
    return this.pollForChanges(path, callback);
  }
  
  private async pollForChanges(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void> {
    let watching = true;
    let lastModified: Date | null = null;
    
    try {
      const info = await this.getFileInfo(path);
      lastModified = info.lastModified;
    } catch {
      // File doesn't exist
    }
    
    const interval = setInterval(async () => {
      if (!watching) return;
      
      try {
        const info = await this.getFileInfo(path);
        if (!lastModified || info.lastModified > lastModified) {
          lastModified = info.lastModified;
          callback('change', path);
        }
      } catch {
        if (lastModified) {
          lastModified = null;
          callback('delete', path);
        }
      }
    }, 1000);
    
    return () => {
      watching = false;
      clearInterval(interval);
    };
  }
}

/**
 * Web/Next.js File System Implementation (limited)
 */
export class WebFileSystemAdapter extends FileSystemAdapter {
  platform = 'nextjs' as const;
  
  private storage: Storage;
  
  constructor() {
    super();
    this.storage = typeof window !== 'undefined' ? window.localStorage : {} as Storage;
  }
  
  async readFile(path: string, options?: FileSystemOptions): Promise<string | Uint8Array> {
    const content = this.storage.getItem(path);
    if (!content) {
      throw new Error(`File not found: ${path}`);
    }
    
    if (options?.encoding === 'binary') {
      const binary = atob(content);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return array;
    }
    
    return content;
  }
  
  async writeFile(path: string, content: string | Uint8Array, options?: FileSystemOptions): Promise<void> {
    let writeContent: string;
    if (content instanceof Uint8Array) {
      const binary = String.fromCharCode(...content);
      writeContent = btoa(binary);
    } else {
      writeContent = content;
    }
    
    this.storage.setItem(path, writeContent);
  }
  
  async deleteFile(path: string): Promise<void> {
    this.storage.removeItem(path);
  }
  
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const content = await this.readFile(sourcePath);
    await this.writeFile(destPath, content);
  }
  
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    await this.copyFile(sourcePath, destPath);
    await this.deleteFile(sourcePath);
  }
  
  async createDirectory(path: string, recursive?: boolean): Promise<void> {
    // Directories are implicit in web storage
  }
  
  async deleteDirectory(path: string, recursive?: boolean): Promise<void> {
    // Remove all items with path prefix
    const keys = Object.keys(this.storage);
    for (const key of keys) {
      if (key.startsWith(path + '/')) {
        this.storage.removeItem(key);
      }
    }
  }
  
  async listDirectory(path: string): Promise<DirectoryListing> {
    const keys = Object.keys(this.storage);
    const pathPrefix = path.endsWith('/') ? path : path + '/';
    const items = keys.filter(key => key.startsWith(pathPrefix));
    
    const files: FileInfo[] = [];
    const directories: Set<string> = new Set();
    
    for (const key of items) {
      const relativePath = key.substring(pathPrefix.length);
      const segments = relativePath.split('/');
      
      if (segments.length === 1) {
        // Direct file
        files.push({
          name: segments[0],
          path: key,
          size: this.storage.getItem(key)?.length || 0,
          lastModified: new Date(),
          isDirectory: false,
        });
      } else {
        // Directory
        directories.add(segments[0]);
      }
    }
    
    const directoryList: FileInfo[] = Array.from(directories).map(name => ({
      name,
      path: pathPrefix + name,
      size: 0,
      lastModified: new Date(),
      isDirectory: true,
    }));
    
    return {
      files,
      directories: directoryList,
      totalCount: files.length + directoryList.length,
    };
  }
  
  joinPath(...segments: string[]): string {
    return segments.join('/').replace(/\/+/g, '/');
  }
  
  dirname(path: string): string {
    return path.substring(0, path.lastIndexOf('/')) || '/';
  }
  
  basename(path: string): string {
    return path.substring(path.lastIndexOf('/') + 1);
  }
  
  extname(path: string): string {
    const base = this.basename(path);
    const lastDot = base.lastIndexOf('.');
    return lastDot > 0 ? base.substring(lastDot) : '';
  }
  
  async exists(path: string): Promise<boolean> {
    return this.storage.getItem(path) !== null;
  }
  
  async getFileInfo(path: string): Promise<FileInfo> {
    const content = this.storage.getItem(path);
    if (!content) {
      throw new Error(`File not found: ${path}`);
    }
    
    return {
      name: this.basename(path),
      path,
      size: content.length,
      lastModified: new Date(),
      isDirectory: false,
    };
  }
  
  async getAppDataPath(): Promise<string> {
    return '/app-data';
  }
  
  async getTempPath(): Promise<string> {
    return '/temp';
  }
  
  async getDocumentsPath(): Promise<string> {
    return '/documents';
  }
  
  async checkPermissions(path: string): Promise<{ read: boolean; write: boolean; execute: boolean }> {
    return { read: true, write: true, execute: false };
  }
  
  async watchFile(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void> {
    // Web storage doesn't support watching, return no-op
    return () => {};
  }
  
  async watchDirectory(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void): Promise<() => void> {
    return () => {};
  }
}

/**
 * Platform Detection and Factory
 */
export function createFileSystemAdapter(): FileSystemAdapter {
  // Browser environment
  if (typeof window !== 'undefined') {
    // Check for Tauri
    if ('__TAURI__' in window) {
      return new TauriFileSystemAdapter();
    }
    return new WebFileSystemAdapter();
  }
  
  // React Native environment
  if (typeof global !== 'undefined' && 'navigator' in global && 'product' in (global as any).navigator) {
    return new ReactNativeFileSystemAdapter();
  }
  
  // Default to web for SSR environments
  return new WebFileSystemAdapter();
}

/**
 * Convenience wrapper for file system operations
 */
export class FileSystem {
  private adapter: FileSystemAdapter;
  
  constructor(adapter?: FileSystemAdapter) {
    this.adapter = adapter || createFileSystemAdapter();
  }
  
  get platform() {
    return this.adapter.platform;
  }
  
  // Delegate all methods to adapter
  readFile(path: string, options?: FileSystemOptions) {
    return this.adapter.readFile(path, options);
  }
  
  writeFile(path: string, content: string | Uint8Array, options?: FileSystemOptions) {
    return this.adapter.writeFile(path, content, options);
  }
  
  deleteFile(path: string) {
    return this.adapter.deleteFile(path);
  }
  
  copyFile(sourcePath: string, destPath: string) {
    return this.adapter.copyFile(sourcePath, destPath);
  }
  
  moveFile(sourcePath: string, destPath: string) {
    return this.adapter.moveFile(sourcePath, destPath);
  }
  
  createDirectory(path: string, recursive?: boolean) {
    return this.adapter.createDirectory(path, recursive);
  }
  
  deleteDirectory(path: string, recursive?: boolean) {
    return this.adapter.deleteDirectory(path, recursive);
  }
  
  listDirectory(path: string) {
    return this.adapter.listDirectory(path);
  }
  
  joinPath(...segments: string[]) {
    return this.adapter.joinPath(...segments);
  }
  
  dirname(path: string) {
    return this.adapter.dirname(path);
  }
  
  basename(path: string) {
    return this.adapter.basename(path);
  }
  
  extname(path: string) {
    return this.adapter.extname(path);
  }
  
  exists(path: string) {
    return this.adapter.exists(path);
  }
  
  getFileInfo(path: string) {
    return this.adapter.getFileInfo(path);
  }
  
  getAppDataPath() {
    return this.adapter.getAppDataPath();
  }
  
  getTempPath() {
    return this.adapter.getTempPath();
  }
  
  getDocumentsPath() {
    return this.adapter.getDocumentsPath();
  }
  
  checkPermissions(path: string) {
    return this.adapter.checkPermissions(path);
  }
  
  watchFile(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void) {
    return this.adapter.watchFile(path, callback);
  }
  
  watchDirectory(path: string, callback: (event: 'change' | 'rename' | 'delete', path: string) => void) {
    return this.adapter.watchDirectory(path, callback);
  }
}

// Export singleton instance
export const fileSystem = new FileSystem();