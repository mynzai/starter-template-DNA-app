import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type ViewType = 'dashboard' | 'files' | 'security' | 'plugins';

interface AppState {
  // UI State
  currentView: ViewType;
  isInitialized: boolean;
  isSidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'auto';
  
  // Performance metrics
  performanceMetrics: {
    appStartTime: number;
    lastUpdateTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  
  // Settings
  settings: {
    autoSave: boolean;
    notifications: boolean;
    securityMode: 'strict' | 'moderate' | 'relaxed';
    updateInterval: number;
  };
  
  // Recent activity
  recentFiles: string[];
  recentActions: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: number;
  }>;
  
  // Actions
  setCurrentView: (view: ViewType) => void;
  setInitialized: (initialized: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  updatePerformanceMetrics: (metrics: Partial<AppState['performanceMetrics']>) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  addRecentFile: (file: string) => void;
  addRecentAction: (action: Omit<AppState['recentActions'][0], 'id' | 'timestamp'>) => void;
  clearRecentFiles: () => void;
  clearRecentActions: () => void;
}

export const useAppStore = create<AppState>()()
  (devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentView: 'dashboard',
        isInitialized: false,
        isSidebarCollapsed: false,
        theme: 'auto',
        
        performanceMetrics: {
          appStartTime: Date.now(),
          lastUpdateTime: Date.now(),
          memoryUsage: 0,
          cpuUsage: 0,
        },
        
        settings: {
          autoSave: true,
          notifications: true,
          securityMode: 'moderate',
          updateInterval: 5000,
        },
        
        recentFiles: [],
        recentActions: [],
        
        // Actions
        setCurrentView: (view) => {
          set(
            (state) => ({ 
              currentView: view,
              performanceMetrics: {
                ...state.performanceMetrics,
                lastUpdateTime: Date.now(),
              }
            }),
            false,
            'setCurrentView'
          );
        },
        
        setInitialized: (initialized) => {
          set(
            { isInitialized: initialized },
            false,
            'setInitialized'
          );
        },
        
        toggleSidebar: () => {
          set(
            (state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }),
            false,
            'toggleSidebar'
          );
        },
        
        setTheme: (theme) => {
          set(
            { theme },
            false,
            'setTheme'
          );
          
          // Apply theme to document
          const root = document.documentElement;
          if (theme === 'dark') {
            root.classList.add('dark');
          } else if (theme === 'light') {
            root.classList.remove('dark');
          } else {
            // Auto theme - check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
        },
        
        updatePerformanceMetrics: (metrics) => {
          set(
            (state) => ({
              performanceMetrics: {
                ...state.performanceMetrics,
                ...metrics,
                lastUpdateTime: Date.now(),
              }
            }),
            false,
            'updatePerformanceMetrics'
          );
        },
        
        updateSettings: (newSettings) => {
          set(
            (state) => ({
              settings: {
                ...state.settings,
                ...newSettings,
              }
            }),
            false,
            'updateSettings'
          );
        },
        
        addRecentFile: (file) => {
          set(
            (state) => {
              const newRecentFiles = [file, ...state.recentFiles.filter(f => f !== file)].slice(0, 10);
              return { recentFiles: newRecentFiles };
            },
            false,
            'addRecentFile'
          );
        },
        
        addRecentAction: (action) => {
          set(
            (state) => {
              const newAction = {
                ...action,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
              };
              
              const newRecentActions = [newAction, ...state.recentActions].slice(0, 50);
              return { recentActions: newRecentActions };
            },
            false,
            'addRecentAction'
          );
        },
        
        clearRecentFiles: () => {
          set(
            { recentFiles: [] },
            false,
            'clearRecentFiles'
          );
        },
        
        clearRecentActions: () => {
          set(
            { recentActions: [] },
            false,
            'clearRecentActions'
          );
        },
      }),
      {
        name: 'tauri-native-app-store',
        partialize: (state) => ({
          theme: state.theme,
          isSidebarCollapsed: state.isSidebarCollapsed,
          settings: state.settings,
          recentFiles: state.recentFiles,
          recentActions: state.recentActions.slice(0, 10), // Only persist recent actions
        }),
      }
    ),
    {
      name: 'tauri-native-app',
    }
  ));

// Utility hooks
export const useCurrentView = () => useAppStore((state) => state.currentView);
export const useIsInitialized = () => useAppStore((state) => state.isInitialized);
export const useTheme = () => useAppStore((state) => state.theme);
export const useSettings = () => useAppStore((state) => state.settings);
export const usePerformanceMetrics = () => useAppStore((state) => state.performanceMetrics);
export const useRecentFiles = () => useAppStore((state) => state.recentFiles);
export const useRecentActions = () => useAppStore((state) => state.recentActions);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const store = useAppStore.getState();
  store.setTheme(store.theme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = useAppStore.getState().theme;
    if (currentTheme === 'auto') {
      useAppStore.getState().setTheme('auto'); // This will trigger the theme update
    }
  });
}
