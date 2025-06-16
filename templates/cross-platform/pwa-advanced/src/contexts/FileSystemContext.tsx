'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface FileSystemContextType {
  isSupported: boolean;
  openFile: (options?: OpenFileOptions) => Promise<FileHandle | null>;
  openMultipleFiles: (options?: OpenFileOptions) => Promise<FileHandle[]>;
  saveFile: (data: string | Uint8Array, options?: SaveFileOptions) => Promise<boolean>;
  createFile: (options?: SaveFileOptions) => Promise<FileHandle | null>;
  openDirectory: () => Promise<DirectoryHandle | null>;
  recentFiles: FileReference[];
  clearRecentFiles: () => void;
  hasPermission: (handle: FileHandle, mode?: 'read' | 'readwrite') => Promise<boolean>;
  requestPermission: (handle: FileHandle, mode?: 'read' | 'readwrite') => Promise<boolean>;
}

interface OpenFileOptions {
  types?: FileTypeFilter[];
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
}

interface SaveFileOptions {
  types?: FileTypeFilter[];
  suggestedName?: string;
}

interface FileTypeFilter {
  description?: string;
  accept: Record<string, string[]>;
}

interface FileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface DirectoryHandle {
  kind: 'directory';
  name: string;
  entries(): AsyncIterableIterator<[string, FileHandle | DirectoryHandle]>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileHandle | DirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  resolve(possibleDescendant: FileHandle | DirectoryHandle): Promise<string[] | null>;
  queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileReference {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  handle?: FileHandle;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export function FileSystemProvider({ children }: { children: React.ReactNode }) {
  const [recentFiles, setRecentFiles] = useState<FileReference[]>([]);
  
  // Check if File System Access API is supported
  const isSupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  // Load recent files from localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recent-files');
      if (saved) {
        try {
          setRecentFiles(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to parse recent files:', error);
        }
      }
    }
  }, []);

  // Save recent files to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recent-files', JSON.stringify(recentFiles));
    }
  }, [recentFiles]);

  // Add file to recent files
  const addToRecentFiles = useCallback((file: File, handle?: FileHandle) => {
    const fileRef: FileReference = {
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      handle
    };

    setRecentFiles(prev => {
      // Remove existing entry with same name
      const filtered = prev.filter(f => f.name !== file.name);
      // Add new entry at the beginning and limit to 10
      return [fileRef, ...filtered].slice(0, 10);
    });
  }, []);

  // Open single file
  const openFile = useCallback(async (options: OpenFileOptions = {}): Promise<FileHandle | null> => {
    if (!isSupported) {
      console.error('File System Access API not supported');
      return null;
    }

    try {
      const fileHandles = await (window as any).showOpenFilePicker({
        types: options.types || [
          {
            description: 'Text files',
            accept: {
              'text/plain': ['.txt'],
              'text/markdown': ['.md'],
              'application/json': ['.json']
            }
          },
          {
            description: 'Images',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
            }
          }
        ],
        multiple: false,
        excludeAcceptAllOption: options.excludeAcceptAllOption || false
      });

      if (fileHandles && fileHandles.length > 0) {
        const handle = fileHandles[0];
        const file = await handle.getFile();
        addToRecentFiles(file, handle);
        return handle;
      }

      return null;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to open file:', error);
      }
      return null;
    }
  }, [isSupported, addToRecentFiles]);

  // Open multiple files
  const openMultipleFiles = useCallback(async (options: OpenFileOptions = {}): Promise<FileHandle[]> => {
    if (!isSupported) {
      console.error('File System Access API not supported');
      return [];
    }

    try {
      const fileHandles = await (window as any).showOpenFilePicker({
        types: options.types || [
          {
            description: 'All files',
            accept: {
              '*/*': []
            }
          }
        ],
        multiple: true,
        excludeAcceptAllOption: options.excludeAcceptAllOption || false
      });

      // Add to recent files
      for (const handle of fileHandles) {
        try {
          const file = await handle.getFile();
          addToRecentFiles(file, handle);
        } catch (error) {
          console.error('Failed to add file to recent:', error);
        }
      }

      return fileHandles;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to open files:', error);
      }
      return [];
    }
  }, [isSupported, addToRecentFiles]);

  // Save file
  const saveFile = useCallback(async (
    data: string | Uint8Array, 
    options: SaveFileOptions = {}
  ): Promise<boolean> => {
    if (!isSupported) {
      // Fallback to download
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options.suggestedName || 'download.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }

    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        types: options.types || [
          {
            description: 'Text files',
            accept: {
              'text/plain': ['.txt']
            }
          }
        ],
        suggestedName: options.suggestedName || 'untitled.txt'
      });

      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();

      // Create a File object for recent files
      const file = new File([data], fileHandle.name, {
        type: 'text/plain',
        lastModified: Date.now()
      });
      addToRecentFiles(file, fileHandle);

      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to save file:', error);
      }
      return false;
    }
  }, [isSupported, addToRecentFiles]);

  // Create new file
  const createFile = useCallback(async (options: SaveFileOptions = {}): Promise<FileHandle | null> => {
    if (!isSupported) {
      console.error('File System Access API not supported');
      return null;
    }

    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        types: options.types || [
          {
            description: 'Text files',
            accept: {
              'text/plain': ['.txt']
            }
          }
        ],
        suggestedName: options.suggestedName || 'untitled.txt'
      });

      return fileHandle;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to create file:', error);
      }
      return null;
    }
  }, [isSupported]);

  // Open directory
  const openDirectory = useCallback(async (): Promise<DirectoryHandle | null> => {
    if (!isSupported || !('showDirectoryPicker' in window)) {
      console.error('Directory picker not supported');
      return null;
    }

    try {
      const directoryHandle = await (window as any).showDirectoryPicker();
      return directoryHandle;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to open directory:', error);
      }
      return null;
    }
  }, [isSupported]);

  // Check permission
  const hasPermission = useCallback(async (
    handle: FileHandle, 
    mode: 'read' | 'readwrite' = 'read'
  ): Promise<boolean> => {
    if (!handle.queryPermission) {
      return true; // Assume permission if API not available
    }

    try {
      const permission = await handle.queryPermission({ mode });
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async (
    handle: FileHandle, 
    mode: 'read' | 'readwrite' = 'read'
  ): Promise<boolean> => {
    if (!handle.requestPermission) {
      return true; // Assume permission if API not available
    }

    try {
      const permission = await handle.requestPermission({ mode });
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }, []);

  // Clear recent files
  const clearRecentFiles = useCallback(() => {
    setRecentFiles([]);
  }, []);

  const value: FileSystemContextType = {
    isSupported,
    openFile,
    openMultipleFiles,
    saveFile,
    createFile,
    openDirectory,
    recentFiles,
    clearRecentFiles,
    hasPermission,
    requestPermission
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
}