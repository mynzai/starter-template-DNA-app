/**
 * Cross-Platform Detection and Capability System
 * Provides runtime platform detection and capability checking across all supported platforms
 */

export type Platform = 'flutter' | 'react-native' | 'nextjs' | 'tauri' | 'sveltekit' | 'web';

export type OperatingSystem = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';

export interface DeviceInfo {
  platform: Platform;
  os: OperatingSystem;
  osVersion?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown';
  screenSize: {
    width: number;
    height: number;
    density?: number;
  };
  userAgent?: string;
  isEmulator?: boolean;
  isDevelopment: boolean;
}

export interface PlatformCapabilities {
  // File system
  fileSystem: {
    read: boolean;
    write: boolean;
    watch: boolean;
    permissions: boolean;
  };
  
  // Notifications
  notifications: {
    show: boolean;
    schedule: boolean;
    actions: boolean;
    sounds: boolean;
    badges: boolean;
  };
  
  // Navigation
  navigation: {
    history: boolean;
    deepLinks: boolean;
    tabs: boolean;
    drawer: boolean;
    modal: boolean;
    nested: boolean;
  };
  
  // Device features
  device: {
    camera: boolean;
    microphone: boolean;
    location: boolean;
    sensors: boolean;
    biometric: boolean;
    vibration: boolean;
  };
  
  // Network
  network: {
    online: boolean;
    offline: boolean;
    background: boolean;
    upload: boolean;
    download: boolean;
  };
  
  // Storage
  storage: {
    localStorage: boolean;
    sessionStorage: boolean;
    secureStorage: boolean;
    database: boolean;
    cache: boolean;
  };
  
  // UI features
  ui: {
    animations: boolean;
    gestures: boolean;
    themes: boolean;
    responsive: boolean;
    accessibility: boolean;
  };
  
  // Performance
  performance: {
    webGL: boolean;
    webAssembly: boolean;
    webWorkers: boolean;
    nativeModules: boolean;
    multithreading: boolean;
  };
}

/**
 * Platform detection utility
 */
export class PlatformDetector {
  private static _instance: PlatformDetector;
  private _deviceInfo: DeviceInfo | null = null;
  private _capabilities: PlatformCapabilities | null = null;
  
  static getInstance(): PlatformDetector {
    if (!PlatformDetector._instance) {
      PlatformDetector._instance = new PlatformDetector();
    }
    return PlatformDetector._instance;
  }
  
  /**
   * Detect the current platform
   */
  detectPlatform(): Platform {
    // Browser environment
    if (typeof window !== 'undefined') {
      // Check for Tauri
      if ('__TAURI__' in window) {
        return 'tauri';
      }
      
      // Check for Next.js
      if ('__NEXT_DATA__' in window) {
        return 'nextjs';
      }
      
      // Check for SvelteKit
      if ('__SVELTEKIT__' in window) {
        return 'sveltekit';
      }
      
      // Default web
      return 'web';
    }
    
    // React Native environment
    if (typeof global !== 'undefined' && 'navigator' in global) {
      const navigator = (global as any).navigator;
      if (navigator?.product === 'ReactNative') {
        return 'react-native';
      }
    }
    
    // Flutter environment (Dart/JS interop)
    if (typeof window !== 'undefined' && 'flutter' in window) {
      return 'flutter';
    }
    
    // Node.js environment - assume Next.js for SSR
    if (typeof process !== 'undefined' && process.versions?.node) {
      return 'nextjs';
    }
    
    return 'web';
  }
  
  /**
   * Detect the operating system
   */
  detectOperatingSystem(): OperatingSystem {
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const platform = window.navigator.platform.toLowerCase();
      
      if (/iphone|ipad|ipod/.test(userAgent)) {
        return 'ios';
      }
      
      if (/android/.test(userAgent)) {
        return 'android';
      }
      
      if (/win/.test(platform)) {
        return 'windows';
      }
      
      if (/mac/.test(platform) && !/iphone|ipad|ipod/.test(userAgent)) {
        return 'macos';
      }
      
      if (/linux/.test(platform)) {
        return 'linux';
      }
    }
    
    // React Native environment
    if (typeof global !== 'undefined') {
      const Platform = this.getReactNativePlatform();
      if (Platform) {
        return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';
      }
    }
    
    // Node.js environment
    if (typeof process !== 'undefined' && process.platform) {
      switch (process.platform) {
        case 'win32':
          return 'windows';
        case 'darwin':
          return 'macos';
        case 'linux':
          return 'linux';
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Get comprehensive device information
   */
  getDeviceInfo(): DeviceInfo {
    if (this._deviceInfo) {
      return this._deviceInfo;
    }
    
    const platform = this.detectPlatform();
    const os = this.detectOperatingSystem();
    
    const deviceInfo: DeviceInfo = {
      platform,
      os,
      osVersion: this.getOSVersion(),
      deviceType: this.detectDeviceType(),
      screenSize: this.getScreenSize(),
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
      isEmulator: this.isEmulator(),
      isDevelopment: this.isDevelopmentMode(),
    };
    
    this._deviceInfo = deviceInfo;
    return deviceInfo;
  }
  
  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    if (this._capabilities) {
      return this._capabilities;
    }
    
    const platform = this.detectPlatform();
    const deviceInfo = this.getDeviceInfo();
    
    this._capabilities = {
      fileSystem: this.getFileSystemCapabilities(platform),
      notifications: this.getNotificationCapabilities(platform),
      navigation: this.getNavigationCapabilities(platform),
      device: this.getDeviceCapabilities(platform, deviceInfo),
      network: this.getNetworkCapabilities(platform),
      storage: this.getStorageCapabilities(platform),
      ui: this.getUICapabilities(platform),
      performance: this.getPerformanceCapabilities(platform),
    };
    
    return this._capabilities;
  }
  
  /**
   * Check if a specific feature is supported
   */
  isSupported(feature: string): boolean {
    const capabilities = this.getCapabilities();
    const parts = feature.split('.');
    
    let current: any = capabilities;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }
    
    return Boolean(current);
  }
  
  /**
   * Check if we're in a mobile environment
   */
  isMobile(): boolean {
    const deviceInfo = this.getDeviceInfo();
    return deviceInfo.deviceType === 'mobile' || deviceInfo.os === 'ios' || deviceInfo.os === 'android';
  }
  
  /**
   * Check if we're in a desktop environment
   */
  isDesktop(): boolean {
    const deviceInfo = this.getDeviceInfo();
    return deviceInfo.deviceType === 'desktop' || ['windows', 'macos', 'linux'].includes(deviceInfo.os);
  }
  
  /**
   * Check if we're in a web environment
   */
  isWeb(): boolean {
    const platform = this.detectPlatform();
    return ['nextjs', 'sveltekit', 'web'].includes(platform);
  }
  
  /**
   * Check if we're in a native environment
   */
  isNative(): boolean {
    const platform = this.detectPlatform();
    return ['flutter', 'react-native', 'tauri'].includes(platform);
  }
  
  // Private helper methods
  
  private getOSVersion(): string | undefined {
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent;
      
      // iOS version
      const iosMatch = userAgent.match(/OS (\d+_\d+)/);
      if (iosMatch) {
        return iosMatch[1].replace('_', '.');
      }
      
      // Android version
      const androidMatch = userAgent.match(/Android (\d+\.?\d*)/);
      if (androidMatch) {
        return androidMatch[1];
      }
      
      // Windows version
      const windowsMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
      if (windowsMatch) {
        return windowsMatch[1];
      }
    }
    
    return undefined;
  }
  
  private detectDeviceType(): DeviceInfo['deviceType'] {
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      
      if (/iphone|android.*mobile/.test(userAgent)) {
        return 'mobile';
      }
      
      if (/ipad|android(?!.*mobile)/.test(userAgent)) {
        return 'tablet';
      }
      
      if (/smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast\.tv/.test(userAgent)) {
        return 'tv';
      }
      
      return 'desktop';
    }
    
    // React Native
    const Platform = this.getReactNativePlatform();
    if (Platform) {
      return Platform.isPad ? 'tablet' : 'mobile';
    }
    
    return 'unknown';
  }
  
  private getScreenSize(): DeviceInfo['screenSize'] {
    if (typeof window !== 'undefined') {
      return {
        width: window.screen?.width || window.innerWidth || 0,
        height: window.screen?.height || window.innerHeight || 0,
        density: window.devicePixelRatio,
      };
    }
    
    // React Native
    const Dimensions = this.getReactNativeDimensions();
    if (Dimensions) {
      const screen = Dimensions.get('screen');
      return {
        width: screen.width,
        height: screen.height,
        density: screen.scale,
      };
    }
    
    return { width: 0, height: 0 };
  }
  
  private isEmulator(): boolean {
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /simulator|emulator/.test(userAgent);
    }
    
    return false;
  }
  
  private isDevelopmentMode(): boolean {
    // Browser environment
    if (typeof window !== 'undefined') {
      return window.location?.hostname === 'localhost' || 
             window.location?.hostname === '127.0.0.1' ||
             window.location?.protocol === 'file:';
    }
    
    // Node.js environment
    if (typeof process !== 'undefined') {
      return process.env.NODE_ENV === 'development' || 
             process.env.NODE_ENV !== 'production';
    }
    
    return false;
  }
  
  private getReactNativePlatform(): any {
    try {
      if (typeof require !== 'undefined') {
        const { Platform } = require('react-native');
        return Platform;
      }
    } catch {
      // Not in React Native environment
    }
    return null;
  }
  
  private getReactNativeDimensions(): any {
    try {
      if (typeof require !== 'undefined') {
        const { Dimensions } = require('react-native');
        return Dimensions;
      }
    } catch {
      // Not in React Native environment
    }
    return null;
  }
  
  private getFileSystemCapabilities(platform: Platform): PlatformCapabilities['fileSystem'] {
    switch (platform) {
      case 'tauri':
        return { read: true, write: true, watch: true, permissions: true };
      case 'react-native':
        return { read: true, write: true, watch: false, permissions: true };
      case 'flutter':
        return { read: true, write: true, watch: true, permissions: true };
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return { read: false, write: false, watch: false, permissions: false };
      default:
        return { read: false, write: false, watch: false, permissions: false };
    }
  }
  
  private getNotificationCapabilities(platform: Platform): PlatformCapabilities['notifications'] {
    switch (platform) {
      case 'tauri':
        return { show: true, schedule: true, actions: false, sounds: false, badges: false };
      case 'react-native':
        return { show: true, schedule: true, actions: true, sounds: true, badges: true };
      case 'flutter':
        return { show: true, schedule: true, actions: true, sounds: true, badges: true };
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return { show: true, schedule: true, actions: true, sounds: false, badges: true };
      default:
        return { show: false, schedule: false, actions: false, sounds: false, badges: false };
    }
  }
  
  private getNavigationCapabilities(platform: Platform): PlatformCapabilities['navigation'] {
    switch (platform) {
      case 'tauri':
        return { history: true, deepLinks: true, tabs: true, drawer: true, modal: true, nested: true };
      case 'react-native':
        return { history: true, deepLinks: true, tabs: true, drawer: true, modal: true, nested: true };
      case 'flutter':
        return { history: true, deepLinks: true, tabs: true, drawer: true, modal: true, nested: true };
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return { history: true, deepLinks: true, tabs: false, drawer: false, modal: true, nested: true };
      default:
        return { history: false, deepLinks: false, tabs: false, drawer: false, modal: false, nested: false };
    }
  }
  
  private getDeviceCapabilities(platform: Platform, deviceInfo: DeviceInfo): PlatformCapabilities['device'] {
    const isMobile = ['ios', 'android'].includes(deviceInfo.os);
    
    switch (platform) {
      case 'tauri':
        return { camera: false, microphone: true, location: false, sensors: false, biometric: false, vibration: false };
      case 'react-native':
        return { camera: true, microphone: true, location: true, sensors: isMobile, biometric: isMobile, vibration: isMobile };
      case 'flutter':
        return { camera: true, microphone: true, location: true, sensors: true, biometric: true, vibration: isMobile };
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return { camera: true, microphone: true, location: true, sensors: false, biometric: false, vibration: isMobile };
      default:
        return { camera: false, microphone: false, location: false, sensors: false, biometric: false, vibration: false };
    }
  }
  
  private getNetworkCapabilities(platform: Platform): PlatformCapabilities['network'] {
    return {
      online: true,
      offline: true,
      background: platform !== 'web',
      upload: true,
      download: true,
    };
  }
  
  private getStorageCapabilities(platform: Platform): PlatformCapabilities['storage'] {
    switch (platform) {
      case 'tauri':
        return { localStorage: true, sessionStorage: true, secureStorage: true, database: true, cache: true };
      case 'react-native':
        return { localStorage: true, sessionStorage: false, secureStorage: true, database: true, cache: true };
      case 'flutter':
        return { localStorage: true, sessionStorage: false, secureStorage: true, database: true, cache: true };
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return { localStorage: true, sessionStorage: true, secureStorage: false, database: true, cache: true };
      default:
        return { localStorage: false, sessionStorage: false, secureStorage: false, database: false, cache: false };
    }
  }
  
  private getUICapabilities(platform: Platform): PlatformCapabilities['ui'] {
    return {
      animations: true,
      gestures: true,
      themes: true,
      responsive: true,
      accessibility: true,
    };
  }
  
  private getPerformanceCapabilities(platform: Platform): PlatformCapabilities['performance'] {
    switch (platform) {
      case 'tauri':
        return { webGL: true, webAssembly: true, webWorkers: true, nativeModules: true, multithreading: true };
      case 'react-native':
        return { webGL: false, webAssembly: false, webWorkers: false, nativeModules: true, multithreading: true };
      case 'flutter':
        return { webGL: false, webAssembly: false, webWorkers: false, nativeModules: true, multithreading: true };
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return { webGL: true, webAssembly: true, webWorkers: true, nativeModules: false, multithreading: false };
      default:
        return { webGL: false, webAssembly: false, webWorkers: false, nativeModules: false, multithreading: false };
    }
  }
}

// Export singleton instance
export const platformDetector = PlatformDetector.getInstance();

// Convenience functions
export function getCurrentPlatform(): Platform {
  return platformDetector.detectPlatform();
}

export function getDeviceInfo(): DeviceInfo {
  return platformDetector.getDeviceInfo();
}

export function getCapabilities(): PlatformCapabilities {
  return platformDetector.getCapabilities();
}

export function isSupported(feature: string): boolean {
  return platformDetector.isSupported(feature);
}

export function isMobile(): boolean {
  return platformDetector.isMobile();
}

export function isDesktop(): boolean {
  return platformDetector.isDesktop();
}

export function isWeb(): boolean {
  return platformDetector.isWeb();
}

export function isNative(): boolean {
  return platformDetector.isNative();
}