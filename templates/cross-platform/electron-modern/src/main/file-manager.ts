import { dialog, BrowserWindow, shell } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import log from 'electron-log';
import { validateFilePath, sanitizeInput } from './security';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  content?: string;
  error?: string;
}

export interface SaveDialogOptions {
  defaultPath?: string;
  filters?: FileFilter[];
  title?: string;
  buttonLabel?: string;
}

export interface OpenDialogOptions {
  filters?: FileFilter[];
  title?: string;
  buttonLabel?: string;
  multiSelections?: boolean;
  openDirectory?: boolean;
}

export class FileManager {
  private mainWindow: BrowserWindow;
  private recentFiles: string[] = [];
  private maxRecentFiles = 10;

  // Allowed file extensions for security
  private allowedExtensions = [
    '.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts',
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
  ];

  // Maximum file size (10MB)
  private maxFileSize = 10 * 1024 * 1024;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.loadRecentFiles();
  }

  public async openFile(options: OpenDialogOptions = {}): Promise<FileOperationResult | null> {
    try {
      const dialogOptions: Electron.OpenDialogOptions = {
        title: options.title || 'Open File',
        buttonLabel: options.buttonLabel || 'Open',
        filters: options.filters || this.getDefaultFilters(),
        properties: []
      };

      // Set dialog properties
      if (options.multiSelections) {
        dialogOptions.properties?.push('multiSelections');
      }
      
      if (options.openDirectory) {
        dialogOptions.properties?.push('openDirectory');
      } else {
        dialogOptions.properties?.push('openFile');
      }

      // Show open dialog
      const result = await dialog.showOpenDialog(this.mainWindow, dialogOptions);

      if (result.canceled || !result.filePaths.length) {
        return null;
      }

      const filePath = result.filePaths[0];
      
      // Validate file path
      if (!this.validateFile(filePath)) {
        return {
          success: false,
          error: 'File type not allowed or file too large'
        };
      }

      // Read file content
      const content = await this.readFileContent(filePath);
      
      if (content !== null) {
        // Add to recent files
        this.addToRecentFiles(filePath);
        
        return {
          success: true,
          filePath,
          content
        };
      } else {
        return {
          success: false,
          error: 'Failed to read file content'
        };
      }
    } catch (error) {
      log.error('Error opening file:', error);
      return {
        success: false,
        error: `Failed to open file: ${error.message}`
      };
    }
  }

  public async saveFile(content: string, filePath?: string): Promise<FileOperationResult> {
    try {
      let targetPath = filePath;

      // If no file path provided, show save dialog
      if (!targetPath) {
        const saveResult = await this.showSaveDialog();
        if (!saveResult) {
          return {
            success: false,
            error: 'Save dialog was canceled'
          };
        }
        targetPath = saveResult;
      }

      // Validate file path
      if (!this.validateFile(targetPath)) {
        return {
          success: false,
          error: 'Invalid file path or file type not allowed'
        };
      }

      // Sanitize content
      const sanitizedContent = this.sanitizeFileContent(content);

      // Write file
      await fs.writeFile(targetPath, sanitizedContent, 'utf8');
      
      // Add to recent files
      this.addToRecentFiles(targetPath);
      
      log.info('File saved successfully:', targetPath);
      
      return {
        success: true,
        filePath: targetPath
      };
    } catch (error) {
      log.error('Error saving file:', error);
      return {
        success: false,
        error: `Failed to save file: ${error.message}`
      };
    }
  }

  public async showSaveDialog(options: SaveDialogOptions = {}): Promise<string | null> {
    try {
      const dialogOptions: Electron.SaveDialogOptions = {
        title: options.title || 'Save File',
        buttonLabel: options.buttonLabel || 'Save',
        defaultPath: options.defaultPath,
        filters: options.filters || this.getDefaultFilters()
      };

      const result = await dialog.showSaveDialog(this.mainWindow, dialogOptions);

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    } catch (error) {
      log.error('Error showing save dialog:', error);
      return null;
    }
  }

  public async readFileContent(filePath: string): Promise<string | null> {
    try {
      // Validate file path
      if (!validateFilePath(filePath)) {
        throw new Error('Invalid file path');
      }

      // Check file stats
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large. Maximum size: ${this.maxFileSize / (1024 * 1024)}MB`);
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      
      log.info('File read successfully:', filePath);
      return content;
    } catch (error) {
      log.error('Error reading file:', error);
      return null;
    }
  }

  public async deleteFile(filePath: string): Promise<boolean> {
    try {
      // Validate file path
      if (!validateFilePath(filePath)) {
        throw new Error('Invalid file path');
      }

      // Confirm deletion
      const result = await dialog.showMessageBox(this.mainWindow, {
        type: 'warning',
        title: 'Delete File',
        message: `Are you sure you want to delete "${path.basename(filePath)}"?`,
        detail: 'This action cannot be undone.',
        buttons: ['Delete', 'Cancel'],
        defaultId: 1,
        cancelId: 1
      });

      if (result.response === 0) {
        await fs.unlink(filePath);
        
        // Remove from recent files
        this.removeFromRecentFiles(filePath);
        
        log.info('File deleted successfully:', filePath);
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Error deleting file:', error);
      
      dialog.showErrorBox('Delete Error', 
        `Failed to delete file: ${error.message}`
      );
      
      return false;
    }
  }

  public async showItemInFolder(filePath: string): Promise<void> {
    try {
      if (!validateFilePath(filePath)) {
        throw new Error('Invalid file path');
      }

      shell.showItemInFolder(filePath);
      log.info('Showed item in folder:', filePath);
    } catch (error) {
      log.error('Error showing item in folder:', error);
    }
  }

  public async createDirectory(dirPath: string): Promise<boolean> {
    try {
      if (!validateFilePath(dirPath)) {
        throw new Error('Invalid directory path');
      }

      await fs.mkdir(dirPath, { recursive: true });
      log.info('Directory created successfully:', dirPath);
      return true;
    } catch (error) {
      log.error('Error creating directory:', error);
      return false;
    }
  }

  public async copyFile(sourcePath: string, targetPath: string): Promise<boolean> {
    try {
      if (!validateFilePath(sourcePath) || !validateFilePath(targetPath)) {
        throw new Error('Invalid file path');
      }

      await fs.copyFile(sourcePath, targetPath);
      log.info('File copied successfully:', sourcePath, '->', targetPath);
      return true;
    } catch (error) {
      log.error('Error copying file:', error);
      return false;
    }
  }

  public async moveFile(sourcePath: string, targetPath: string): Promise<boolean> {
    try {
      if (!validateFilePath(sourcePath) || !validateFilePath(targetPath)) {
        throw new Error('Invalid file path');
      }

      await fs.rename(sourcePath, targetPath);
      
      // Update recent files
      this.updateRecentFilePath(sourcePath, targetPath);
      
      log.info('File moved successfully:', sourcePath, '->', targetPath);
      return true;
    } catch (error) {
      log.error('Error moving file:', error);
      return false;
    }
  }

  public getRecentFiles(): string[] {
    return [...this.recentFiles];
  }

  public clearRecentFiles(): void {
    this.recentFiles = [];
    this.saveRecentFiles();
  }

  private validateFile(filePath: string): boolean {
    // Validate file path
    if (!validateFilePath(filePath)) {
      return false;
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      log.warn('File extension not allowed:', ext);
      return false;
    }

    return true;
  }

  private sanitizeFileContent(content: string): string {
    // Basic sanitization - you can extend this based on your needs
    return content.replace(/\r\n/g, '\n'); // Normalize line endings
  }

  private addToRecentFiles(filePath: string): void {
    // Remove if already exists
    const index = this.recentFiles.indexOf(filePath);
    if (index > -1) {
      this.recentFiles.splice(index, 1);
    }

    // Add to beginning
    this.recentFiles.unshift(filePath);

    // Limit to max recent files
    if (this.recentFiles.length > this.maxRecentFiles) {
      this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
    }

    this.saveRecentFiles();
  }

  private removeFromRecentFiles(filePath: string): void {
    const index = this.recentFiles.indexOf(filePath);
    if (index > -1) {
      this.recentFiles.splice(index, 1);
      this.saveRecentFiles();
    }
  }

  private updateRecentFilePath(oldPath: string, newPath: string): void {
    const index = this.recentFiles.indexOf(oldPath);
    if (index > -1) {
      this.recentFiles[index] = newPath;
      this.saveRecentFiles();
    }
  }

  private loadRecentFiles(): void {
    try {
      const store = require('electron-store');
      const electronStore = new store();
      this.recentFiles = electronStore.get('recentFiles', []);
    } catch (error) {
      log.error('Error loading recent files:', error);
      this.recentFiles = [];
    }
  }

  private saveRecentFiles(): void {
    try {
      const store = require('electron-store');
      const electronStore = new store();
      electronStore.set('recentFiles', this.recentFiles);
    } catch (error) {
      log.error('Error saving recent files:', error);
    }
  }

  private getDefaultFilters(): FileFilter[] {
    return [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'Data Files', extensions: ['json', 'csv', 'xml'] },
      { name: 'Web Files', extensions: ['html', 'css', 'js', 'ts'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'] },
      { name: 'All Files', extensions: ['*'] }
    ];
  }
}