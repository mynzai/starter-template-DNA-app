import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';

import { CollaborationProvider } from './providers/CollaborationProvider';
import { PerformanceProvider } from './providers/PerformanceProvider';
import { EditorView } from './components/EditorView';
import { Sidebar } from './components/Sidebar';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { PresenceIndicators } from './components/PresenceIndicators';
import { ConnectionStatus } from './components/ConnectionStatus';
import { DocumentManager } from './components/DocumentManager';
import { SettingsPanel } from './components/SettingsPanel';

import { useCollaborationStore } from './stores/collaborationStore';
import { usePerformanceStore } from './stores/performanceStore';
import { useDocumentStore } from './stores/documentStore';

import type { CollaborationSession, Document, PerformanceMetrics } from './types';

import './App.css';

interface AppProps {
  initialSession?: CollaborationSession;
}

const App: React.FC<AppProps> = ({ initialSession }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'editor' | 'documents' | 'settings' | 'performance'>('editor');

  // Store hooks
  const {
    session,
    isConnected,
    connectionQuality,
    initializeSession,
    joinSession,
  } = useCollaborationStore();

  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  } = usePerformanceStore();

  const {
    currentDocument,
    documents,
    loadDocuments,
  } = useDocumentStore();

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load user documents
        await loadDocuments();

        // Initialize session if provided
        if (initialSession) {
          await initializeSession(initialSession);
        }

        // Start performance monitoring
        await startMonitoring();

        // Listen for application events
        await setupEventListeners();

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize application:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize application');
        setIsLoading(false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, [initialSession]);

  // Setup event listeners for Tauri events
  const setupEventListeners = async () => {
    // Listen for window close events to cleanup resources
    await listen('tauri://close-requested', async () => {
      try {
        // Cleanup collaboration session
        if (session) {
          await invoke('leave_session', {
            sessionId: session.id,
            userId: session.participants[0], // Current user
          });
        }

        // Stop performance monitoring
        await stopMonitoring();
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    });

    // Listen for performance alerts
    await listen('performance-alert', (event) => {
      console.warn('Performance alert:', event.payload);
      // Handle performance alerts (could show notifications, etc.)
    });

    // Listen for connection quality changes
    await listen('connection-quality-changed', (event) => {
      console.log('Connection quality changed:', event.payload);
    });
  };

  // Handle view navigation
  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
  };

  // Handle document selection
  const handleDocumentSelect = async (document: Document) => {
    try {
      // Create or join collaboration session for this document
      const newSession = await invoke<CollaborationSession>('create_session', {
        documentId: document.id,
      });

      await joinSession(newSession.id, 'current-user-id'); // Replace with actual user ID
    } catch (err) {
      console.error('Failed to open document:', err);
      setError('Failed to open document');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="app-loading">
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p>Initializing Real-time Collaboration Platform...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="app-error">
        <h2>Application Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <CollaborationProvider>
        <PerformanceProvider>
          {/* Header with connection status and performance info */}
          <header className="app-header">
            <div className="header-left">
              <h1>Real-time Collaboration</h1>
              <ConnectionStatus
                isConnected={isConnected}
                quality={connectionQuality}
                session={session}
              />
            </div>
            
            <div className="header-center">
              <PresenceIndicators />
            </div>

            <div className="header-right">
              <PerformanceMonitor
                metrics={metrics}
                isCompact={true}
              />
              
              <nav className="view-navigation">
                <button
                  className={currentView === 'editor' ? 'active' : ''}
                  onClick={() => handleViewChange('editor')}
                  disabled={!currentDocument}
                >
                  Editor
                </button>
                <button
                  className={currentView === 'documents' ? 'active' : ''}
                  onClick={() => handleViewChange('documents')}
                >
                  Documents
                </button>
                <button
                  className={currentView === 'performance' ? 'active' : ''}
                  onClick={() => handleViewChange('performance')}
                >
                  Performance
                </button>
                <button
                  className={currentView === 'settings' ? 'active' : ''}
                  onClick={() => handleViewChange('settings')}
                >
                  Settings
                </button>
              </nav>
            </div>
          </header>

          {/* Main content area */}
          <main className="app-main">
            {/* Sidebar */}
            <Sidebar
              currentView={currentView}
              onViewChange={handleViewChange}
              documents={documents}
              onDocumentSelect={handleDocumentSelect}
            />

            {/* Content area with view transitions */}
            <div className="content-area">
              <AnimatePresence mode="wait">
                {currentView === 'editor' && currentDocument && (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="view-container"
                  >
                    <EditorView
                      document={currentDocument}
                      session={session}
                    />
                  </motion.div>
                )}

                {currentView === 'documents' && (
                  <motion.div
                    key="documents"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="view-container"
                  >
                    <DocumentManager
                      documents={documents}
                      onDocumentSelect={handleDocumentSelect}
                      onDocumentCreate={loadDocuments}
                    />
                  </motion.div>
                )}

                {currentView === 'performance' && (
                  <motion.div
                    key="performance"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="view-container"
                  >
                    <PerformanceMonitor
                      metrics={metrics}
                      isCompact={false}
                      showRecommendations={true}
                    />
                  </motion.div>
                )}

                {currentView === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="view-container"
                  >
                    <SettingsPanel />
                  </motion.div>
                )}

                {currentView === 'editor' && !currentDocument && (
                  <motion.div
                    key="no-document"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="view-container no-document"
                  >
                    <div className="no-document-message">
                      <h2>No Document Selected</h2>
                      <p>Select a document from the sidebar or create a new one to start collaborating.</p>
                      <button onClick={() => handleViewChange('documents')}>
                        Browse Documents
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* Performance warning overlay */}
          {metrics && metrics.avg_operation_latency_ms > 150 && (
            <motion.div
              className="performance-warning"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
            >
              <div className="warning-content">
                <strong>⚠️ Performance Warning</strong>
                <p>
                  High latency detected ({metrics.avg_operation_latency_ms.toFixed(0)}ms). 
                  Check your connection or reduce concurrent operations.
                </p>
              </div>
            </motion.div>
          )}
        </PerformanceProvider>
      </CollaborationProvider>
    </div>
  );
};

export default App;