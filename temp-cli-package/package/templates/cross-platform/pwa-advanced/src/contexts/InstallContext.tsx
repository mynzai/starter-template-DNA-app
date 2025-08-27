'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface InstallContextType {
  canInstall: boolean;
  isInstalled: boolean;
  installPromptEvent: any;
  showInstallPrompt: () => Promise<void>;
  trackInstallEvent: (event: string) => void;
  getInstallInstructions: () => InstallInstructions;
}

interface InstallInstructions {
  browser: string;
  platform: string;
  instructions: string[];
  icon?: string;
}

const InstallContext = createContext<InstallContextType | undefined>(undefined);

export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  // Detect if app is already installed
  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone ||
                         document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);
    
    if (isStandalone) {
      console.log('App is running as installed PWA');
      trackInstallEvent('app_launched_installed');
    }
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      setInstallPromptEvent(e);
      setCanInstall(true);
      
      trackInstallEvent('install_prompt_available');
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPromptEvent(null);
      
      trackInstallEvent('app_installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Show install prompt
  const showInstallPrompt = useCallback(async () => {
    if (!installPromptEvent) {
      console.warn('No install prompt event available');
      return;
    }

    try {
      // Show the install prompt
      const result = await installPromptEvent.prompt();
      
      console.log('Install prompt result:', result);
      
      // Log the result
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        trackInstallEvent('install_accepted');
      } else {
        console.log('User dismissed the install prompt');
        trackInstallEvent('install_rejected');
      }

      // Clear the saved prompt since it can only be used once
      setInstallPromptEvent(null);
      setCanInstall(false);
      
    } catch (error) {
      console.error('Error showing install prompt:', error);
      trackInstallEvent('install_error');
    }
  }, [installPromptEvent]);

  // Track install events
  const trackInstallEvent = useCallback((event: string) => {
    console.log('Install event:', event);
    
    // Send to analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', event, {
        event_category: 'PWA Install',
        event_label: navigator.userAgent
      });
    }

    // Store in localStorage for debugging
    const events = JSON.parse(localStorage.getItem('install-events') || '[]');
    events.push({
      event,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    localStorage.setItem('install-events', JSON.stringify(events.slice(-10)));
  }, []);

  // Get browser-specific install instructions
  const getInstallInstructions = useCallback((): InstallInstructions => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    // Detect browser
    let browser = 'unknown';
    let instructions: string[] = [];
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      browser = 'chrome';
      if (platform.includes('mobile') || platform.includes('android')) {
        instructions = [
          'Tap the menu button (⋮) in the top-right corner',
          'Select "Add to Home screen" or "Install app"',
          'Tap "Add" to confirm installation',
          'The app will be added to your home screen'
        ];
      } else {
        instructions = [
          'Look for the install icon (⊕) in the address bar',
          'Click the install icon or use the menu',
          'Select "Install [App Name]"',
          'Click "Install" to confirm',
          'The app will open in its own window'
        ];
      }
    } else if (userAgent.includes('firefox')) {
      browser = 'firefox';
      instructions = [
        'Look for the install icon in the address bar',
        'Click the install icon',
        'Select "Install" from the popup',
        'The app will be added to your applications'
      ];
    } else if (userAgent.includes('safari')) {
      browser = 'safari';
      if (platform.includes('iphone') || platform.includes('ipad')) {
        instructions = [
          'Tap the Share button (□↗) at the bottom',
          'Scroll down and tap "Add to Home Screen"',
          'Edit the name if desired',
          'Tap "Add" in the top-right corner',
          'The app icon will appear on your home screen'
        ];
      } else {
        instructions = [
          'Safari on macOS has limited PWA support',
          'You can bookmark this page for quick access',
          'Use Chrome or Edge for full PWA features'
        ];
      }
    } else if (userAgent.includes('edg')) {
      browser = 'edge';
      instructions = [
        'Click the app icon in the address bar',
        'Select "Install this site as an app"',
        'Click "Install" to confirm',
        'The app will open in its own window'
      ];
    } else {
      instructions = [
        'Look for an install option in your browser menu',
        'Some browsers show an install icon in the address bar',
        'You can also bookmark this page for quick access'
      ];
    }

    return {
      browser,
      platform: platform.includes('mobile') ? 'mobile' : 'desktop',
      instructions
    };
  }, []);

  // Check for updates when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isInstalled) {
        // Check for app updates
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.update();
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInstalled]);

  // Detect installation method
  useEffect(() => {
    if (isInstalled) {
      const installSource = 
        (window.navigator as any).standalone ? 'ios_standalone' :
        window.matchMedia('(display-mode: standalone)').matches ? 'web_app_manifest' :
        document.referrer.includes('android-app://') ? 'android_intent' :
        'unknown';
      
      console.log('App installed via:', installSource);
      trackInstallEvent(`installed_via_${installSource}`);
    }
  }, [isInstalled, trackInstallEvent]);

  const value: InstallContextType = {
    canInstall,
    isInstalled,
    installPromptEvent,
    showInstallPrompt,
    trackInstallEvent,
    getInstallInstructions
  };

  return (
    <InstallContext.Provider value={value}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) {
    throw new Error('useInstall must be used within an InstallProvider');
  }
  return context;
}