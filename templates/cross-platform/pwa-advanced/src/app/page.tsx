'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hero } from '@/components/Hero';
import { FeatureGrid } from '@/components/FeatureGrid';
import { PerformanceMetrics } from '@/components/PerformanceMetrics';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NotificationDemo } from '@/components/NotificationDemo';
import { FileSystemDemo } from '@/components/FileSystemDemo';
import { ShareDemo } from '@/components/ShareDemo';
import { OfflineDemo } from '@/components/OfflineDemo';
import { usePWA } from '@/contexts/PWAContext';
import { usePerformance } from '@/contexts/PerformanceContext';
import { useInstall } from '@/contexts/InstallContext';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5
};

export default function HomePage() {
  const { isOnline, isServiceWorkerReady } = usePWA();
  const { metrics } = usePerformance();
  const { canInstall, showInstallPrompt } = useInstall();

  useEffect(() => {
    // Track page view
    if (typeof window !== 'undefined') {
      console.log('Home page viewed');
      
      // Send page view analytics
      if ('gtag' in window) {
        (window as any).gtag('event', 'page_view', {
          page_title: 'Home',
          page_location: window.location.href
        });
      }

      // Mark navigation as complete for performance monitoring
      if ('performance' in window && 'mark' in performance) {
        performance.mark('home-page-loaded');
      }
    }
  }, []);

  // Handle shared content from share target
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('shared');
    
    if (sharedId) {
      handleSharedContent(sharedId);
    }
    
    const fileId = urlParams.get('file');
    if (fileId) {
      handleOpenedFile(fileId);
    }
  }, []);

  const handleSharedContent = async (shareId: string) => {
    try {
      const cache = await caches.open('shared-content');
      const response = await cache.match(`/shared/${shareId}`);
      
      if (response) {
        const shareData = await response.json();
        console.log('Shared content received:', shareData);
        
        // Process shared content
        // You would typically show a modal or navigate to a specific page
        
        // Clean up
        await cache.delete(`/shared/${shareId}`);
      }
    } catch (error) {
      console.error('Error handling shared content:', error);
    }
  };

  const handleOpenedFile = async (fileId: string) => {
    try {
      const cache = await caches.open('opened-files');
      const response = await cache.match(`/files/${fileId}`);
      
      if (response) {
        const fileData = await response.json();
        console.log('File opened:', fileData);
        
        // Process opened files
        // You would typically open the files in your app
        
        // Clean up
        await cache.delete(`/files/${fileId}`);
      }
    } catch (error) {
      console.error('Error handling opened file:', error);
    }
  };

  return (
    <motion.main
      initial=\"initial\"
      animate=\"in\"
      exit=\"out\"
      variants={pageVariants}
      transition={pageTransition}
      className=\"min-h-screen\"
    >
      {/* Hero Section */}
      <section className=\"relative overflow-hidden\">
        <Hero />
      </section>

      {/* Status Indicators */}
      <section className=\"bg-gray-50 py-4\">
        <div className=\"container mx-auto px-4\">
          <div className=\"flex flex-wrap items-center justify-center gap-4 text-sm\">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isServiceWorkerReady ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isServiceWorkerReady ? 'bg-blue-500' : 'bg-gray-500'
              }`} />
              Service Worker {isServiceWorkerReady ? 'Ready' : 'Loading'}
            </div>
            
            {canInstall && (
              <button
                onClick={showInstallPrompt}
                className=\"flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors\"
              >
                <div className=\"w-2 h-2 rounded-full bg-purple-500\" />
                Install App
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className=\"py-16\">
        <div className=\"container mx-auto px-4\">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className=\"text-3xl font-bold text-center mb-4\">
              Native-Like Features
            </h2>
            <p className=\"text-gray-600 text-center mb-12 max-w-2xl mx-auto\">
              Experience the power of modern web APIs with offline capabilities,
              push notifications, file system access, and more.
            </p>
            <FeatureGrid />
          </motion.div>
        </div>
      </section>

      {/* Demo Sections */}
      <section className=\"py-16 bg-gray-50\">
        <div className=\"container mx-auto px-4\">
          <div className=\"grid gap-12 md:gap-16\">
            {/* Notification Demo */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <NotificationDemo />
            </motion.div>

            {/* File System Demo */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <FileSystemDemo />
            </motion.div>

            {/* Share Demo */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <ShareDemo />
            </motion.div>

            {/* Offline Demo */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <OfflineDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Performance Metrics */}
      <section className=\"py-16\">
        <div className=\"container mx-auto px-4\">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className=\"text-3xl font-bold text-center mb-4\">
              Performance Metrics
            </h2>
            <p className=\"text-gray-600 text-center mb-12\">
              Real-time Core Web Vitals and performance monitoring
            </p>
            <PerformanceMetrics metrics={metrics} />
          </motion.div>
        </div>
      </section>

      {/* Install Prompt */}
      <InstallPrompt />
    </motion.main>
  );
}