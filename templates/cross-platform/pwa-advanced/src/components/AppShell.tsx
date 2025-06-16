'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Navigation } from './Navigation';
import { usePWA } from '@/contexts/PWAContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isOnline, isServiceWorkerReady } = usePWA();
  const [isAppReady, setIsAppReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Simulate app initialization with progress tracking
    const initializeApp = async () => {
      const steps = [
        { name: 'Loading core modules', duration: 200 },
        { name: 'Initializing service worker', duration: 300 },
        { name: 'Setting up offline capabilities', duration: 400 },
        { name: 'Loading user preferences', duration: 200 },
        { name: 'Preparing UI components', duration: 300 }
      ];

      let progress = 0;
      const progressStep = 100 / steps.length;

      for (const step of steps) {
        console.log(step.name);
        await new Promise(resolve => setTimeout(resolve, step.duration));
        progress += progressStep;
        setLoadingProgress(Math.min(progress, 100));
      }

      // Wait for service worker to be ready
      if (isServiceWorkerReady) {
        setIsAppReady(true);
        
        // Mark app shell as loaded
        if ('performance' in window && 'mark' in performance) {
          performance.mark('app-shell-ready');
        }
      }
    };

    if (!isAppReady) {
      initializeApp();
    }
  }, [isServiceWorkerReady, isAppReady]);

  // Set service worker ready when available
  useEffect(() => {
    if (isServiceWorkerReady && loadingProgress >= 100) {
      setIsAppReady(true);
    }
  }, [isServiceWorkerReady, loadingProgress]);

  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-white">
        <LoadingSkeleton progress={loadingProgress} />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-white">
      {/* App Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <Navigation />
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Suspense fallback={<LoadingSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div
              key="app-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      {/* App Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              PWA Advanced Platform © 2024
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 text-sm ${
                isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {isOnline ? 'Online' : 'Offline'}
              </div>
              
              {isServiceWorkerReady && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  PWA Ready
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}