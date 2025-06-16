import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import log from 'electron-log';
import Store from 'electron-store';

export class AppUpdater {
  private mainWindow: BrowserWindow;
  private store: Store;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private rollbackVersion: string | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.store = new Store();
    
    // Configure electron-updater
    this.configureUpdater();
    this.setupEventHandlers();
    
    // Start periodic update checks
    this.startPeriodicChecks();
  }

  private configureUpdater(): void {
    // Configure auto-updater
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false; // Manual download control
    autoUpdater.autoInstallOnAppQuit = false; // Manual install control
    
    // Configure update server
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'your-github-username',
      repo: 'your-repo-name',
      private: false
    });

    // Enable delta updates for faster downloads
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;
    
    // Set update check interval (24 hours)
    autoUpdater.checkForUpdatesAndNotify();
  }

  private setupEventHandlers(): void {
    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.handleUpdateAvailable(info);
    });

    // Update not available
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
      this.handleUpdateNotAvailable(info);
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.handleUpdateDownloaded(info);
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      log.info(`Download progress: ${percent}%`);
      this.handleDownloadProgress(progressObj);
    });

    // Update error
    autoUpdater.on('error', (error) => {
      log.error('Update error:', error);
      this.handleUpdateError(error);
    });

    // Before quit for update
    autoUpdater.on('before-quit-for-update', () => {
      log.info('App will quit for update');
      this.handleBeforeQuitForUpdate();
    });
  }

  private handleUpdateAvailable(info: any): void {
    // Store current version for rollback
    this.rollbackVersion = autoUpdater.currentVersion;
    this.store.set('rollbackVersion', this.rollbackVersion);

    // Notify renderer process
    this.mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
      size: info.files?.[0]?.size
    });

    // Show update dialog
    this.showUpdateDialog(info);
  }

  private handleUpdateNotAvailable(info: any): void {
    // Only show dialog if user manually checked for updates
    if (this.store.get('manualUpdateCheck')) {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'No Updates',
        message: 'You are already running the latest version.',
        detail: `Current version: ${autoUpdater.currentVersion}`
      });
      this.store.delete('manualUpdateCheck');
    }
  }

  private handleUpdateDownloaded(info: any): void {
    // Calculate download time and size
    const downloadSize = info.files?.[0]?.size || 0;
    const downloadSizeMB = (downloadSize / (1024 * 1024)).toFixed(2);
    
    // Notify renderer process
    this.mainWindow.webContents.send('update-downloaded', {
      version: info.version,
      size: downloadSizeMB,
      releaseNotes: info.releaseNotes
    });

    // Show install dialog
    this.showInstallDialog(info);
  }

  private handleDownloadProgress(progressObj: any): void {
    const percent = Math.round(progressObj.percent);
    const speed = Math.round(progressObj.bytesPerSecond / 1024); // KB/s
    const transferred = Math.round(progressObj.transferred / (1024 * 1024)); // MB
    const total = Math.round(progressObj.total / (1024 * 1024)); // MB

    // Update progress in UI
    this.mainWindow.webContents.send('download-progress', {
      percent,
      speed,
      transferred,
      total
    });

    // Update window title with progress
    this.mainWindow.setTitle(`Downloading update... ${percent}%`);
  }

  private handleUpdateError(error: Error): void {
    log.error('Update error:', error);

    // Notify renderer process
    this.mainWindow.webContents.send('update-error', {
      message: error.message,
      stack: error.stack
    });

    // Show error dialog
    dialog.showErrorBox('Update Error', 
      `Failed to download update: ${error.message}\n\nPlease try again later or download manually from the website.`
    );

    // Reset window title
    this.mainWindow.setTitle('Modern Electron App');
  }

  private handleBeforeQuitForUpdate(): void {
    // Save current state before update
    this.store.set('updateInProgress', true);
    this.store.set('updateTimestamp', Date.now());
  }

  private async showUpdateDialog(info: any): Promise<void> {
    const downloadSizeMB = info.files?.[0]?.size 
      ? (info.files[0].size / (1024 * 1024)).toFixed(2) 
      : 'Unknown';

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: `Download size: ${downloadSizeMB} MB\n\nRelease notes:\n${info.releaseNotes || 'No release notes available.'}`,
      buttons: ['Download Now', 'Later', 'View Details'],
      defaultId: 0,
      cancelId: 1
    });

    switch (result.response) {
      case 0: // Download Now
        this.downloadUpdate();
        break;
      case 1: // Later
        this.scheduleNextCheck();
        break;
      case 2: // View Details
        this.openReleaseNotes(info);
        break;
    }
  }

  private async showInstallDialog(info: any): Promise<void> {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Update ${info.version} has been downloaded and is ready to install.`,
      detail: 'The application will restart to apply the update.',
      buttons: ['Install Now', 'Install on Next Startup'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      this.installUpdate();
    } else {
      this.store.set('installOnNextStartup', true);
    }
  }

  private openReleaseNotes(info: any): void {
    // Open release notes in external browser
    const releaseUrl = `https://github.com/your-github-username/your-repo-name/releases/tag/v${info.version}`;
    require('electron').shell.openExternal(releaseUrl);
  }

  private startPeriodicChecks(): void {
    // Check for updates every 24 hours
    const checkInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates(false);
    }, checkInterval);
  }

  private scheduleNextCheck(): void {
    // Schedule next check in 24 hours
    const nextCheck = Date.now() + (24 * 60 * 60 * 1000);
    this.store.set('nextUpdateCheck', nextCheck);
  }

  private createRollbackPoint(): void {
    // Create a rollback point before installing update
    const rollbackData = {
      version: autoUpdater.currentVersion,
      timestamp: Date.now(),
      userSettings: this.store.store
    };
    
    this.store.set('rollbackPoint', rollbackData);
    log.info('Created rollback point for version:', autoUpdater.currentVersion);
  }

  // Public methods
  public checkForUpdates(manual: boolean = true): void {
    if (manual) {
      this.store.set('manualUpdateCheck', true);
    }
    
    log.info('Checking for updates...');
    autoUpdater.checkForUpdates();
  }

  public downloadUpdate(): void {
    log.info('Starting update download...');
    
    // Show download progress
    this.mainWindow.webContents.send('download-started');
    
    // Start download
    autoUpdater.downloadUpdate();
  }

  public installUpdate(): void {
    log.info('Installing update...');
    
    // Create rollback point
    this.createRollbackPoint();
    
    // Install and restart
    autoUpdater.quitAndInstall(false, true);
  }

  public async rollbackUpdate(): Promise<boolean> {
    const rollbackPoint = this.store.get('rollbackPoint') as any;
    
    if (!rollbackPoint) {
      log.error('No rollback point available');
      return false;
    }

    try {
      // Restore previous settings
      this.store.clear();
      this.store.store = rollbackPoint.userSettings;
      
      // Notify user
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Rollback Complete',
        message: 'Application has been rolled back to previous version.',
        detail: `Rolled back to version: ${rollbackPoint.version}`
      });

      log.info('Rollback completed successfully');
      return true;
    } catch (error) {
      log.error('Rollback failed:', error);
      return false;
    }
  }

  public getUpdateStatus(): any {
    return {
      currentVersion: autoUpdater.currentVersion,
      isUpdateAvailable: autoUpdater.isUpdaterActive(),
      rollbackVersion: this.rollbackVersion,
      hasRollbackPoint: !!this.store.get('rollbackPoint'),
      nextUpdateCheck: this.store.get('nextUpdateCheck'),
      updateInProgress: this.store.get('updateInProgress', false)
    };
  }

  public pauseUpdateChecks(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  public resumeUpdateChecks(): void {
    if (!this.updateCheckInterval) {
      this.startPeriodicChecks();
    }
  }

  public cleanup(): void {
    this.pauseUpdateChecks();
    autoUpdater.removeAllListeners();
  }
}