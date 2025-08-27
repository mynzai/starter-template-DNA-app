import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SystemInfoProvider } from './contexts/SystemInfoContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { PluginProvider } from './contexts/PluginContext';
import { AppShell } from './components/AppShell';
import { SystemDashboard } from './components/SystemDashboard';
import { FileExplorer } from './components/FileExplorer';
import { SecurityPanel } from './components/SecurityPanel';
import { PluginManager } from './components/PluginManager';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { Toaster } from './components/ui/Toaster';
import { useAppStore } from './stores/appStore';

function App() {
  const { currentView, setCurrentView, isInitialized, setInitialized } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Tauri APIs and app state
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [setInitialized]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <SystemDashboard />;
      case 'files':
        return <FileExplorer />;
      case 'security':
        return <SecurityPanel />;
      case 'plugins':
        return <PluginManager />;
      default:
        return <SystemDashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">Initializing Tauri Native Platform...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <SystemInfoProvider>
      <SecurityProvider>
        <PluginProvider>
          <div className="h-screen w-full flex flex-col bg-gray-50">
            <AppShell>
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                  <motion.div
                    key={currentView}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    {renderContent()}
                  </motion.div>
                </main>
              </div>
              <StatusBar />
            </AppShell>
            <Toaster />
          </div>
        </PluginProvider>
      </SecurityProvider>
    </SystemInfoProvider>
  );
}

export default App;
