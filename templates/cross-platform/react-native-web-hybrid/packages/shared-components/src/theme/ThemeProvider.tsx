import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from './themes';
import { Platform } from '../utils/Platform';
import type { Theme, ThemeMode } from './types';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'system',
  storageKey = 'theme-mode',
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialTheme);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Determine the actual theme to use
  const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  };
  
  const actualTheme = resolveTheme(themeMode);
  const theme = actualTheme === 'dark' ? darkTheme : lightTheme;
  const isDark = actualTheme === 'dark';
  
  // Storage operations
  const getStorageAdapter = () => {
    if (Platform.isWeb) {
      return {
        getItem: (key: string) => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            // Ignore storage errors
          }
        },
      };
    } else {
      // React Native AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      return {
        getItem: async (key: string) => {
          try {
            return await AsyncStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            await AsyncStorage.setItem(key, value);
          } catch {
            // Ignore storage errors
          }
        },
      };
    }
  };
  
  const storage = getStorageAdapter();
  
  // Load theme from storage
  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const stored = await storage.getItem(storageKey);
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          setThemeModeState(stored as ThemeMode);
        }
      } catch (error) {
        console.warn('Failed to load theme from storage:', error);
      } finally {
        setIsHydrated(true);
      }
    };
    
    loadStoredTheme();
  }, [storageKey]);
  
  // Save theme to storage
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await storage.setItem(storageKey, mode);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  };
  
  const toggleTheme = () => {
    const newMode = actualTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
  };
  
  // Web-specific: Apply theme to document
  useEffect(() => {
    if (Platform.isWeb && isHydrated) {
      const root = document.documentElement;
      root.setAttribute('data-theme', actualTheme);
      
      // Apply CSS custom properties
      Object.entries(theme.colors).forEach(([key, value]) => {
        if (typeof value === 'string') {
          root.style.setProperty(`--color-${key}`, value);
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            root.style.setProperty(`--color-${key}-${subKey}`, subValue);
          });
        }
      });
      
      // Apply spacing
      Object.entries(theme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, `${value}px`);
      });
      
      // Apply typography
      Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, `${value}px`);
      });
      
      // Apply shadows
      Object.entries(theme.shadows).forEach(([key, value]) => {
        root.style.setProperty(`--shadow-${key}`, value);
      });
    }
  }, [theme, actualTheme, isHydrated]);
  
  // Wait for hydration on web to prevent SSR mismatches
  if (Platform.isWeb && !isHydrated) {
    return null;
  }
  
  const contextValue: ThemeContextValue = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    isDark,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={theme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

// Hook for accessing just the theme (most common use case)
export const useTheme = (): Theme => {
  const { theme } = useThemeContext();
  return theme;
};

// Hook for theme controls
export const useThemeControls = () => {
  const { themeMode, setThemeMode, toggleTheme, isDark } = useThemeContext();
  return { themeMode, setThemeMode, toggleTheme, isDark };
};