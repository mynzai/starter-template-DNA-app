import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Platform } from '@hybrid/shared-components';
import type { NavigationState, NavigationAction, Route } from './types';

interface NavigationContextValue {
  currentRoute: Route;
  canGoBack: boolean;
  navigate: (route: string, params?: Record<string, any>) => void;
  goBack: () => void;
  replace: (route: string, params?: Record<string, any>) => void;
  reset: (routes: Route[]) => void;
  getState: () => NavigationState;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

interface NavigationProviderProps {
  children: React.ReactNode;
  initialRoute?: string;
  routes: Record<string, Route>;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  initialRoute = '/',
  routes,
}) => {
  // Platform-specific navigation implementation
  const createPlatformNavigation = () => {
    if (Platform.isWeb) {
      // Next.js Router implementation
      return createWebNavigation();
    } else {
      // React Navigation implementation
      return createNativeNavigation();
    }
  };
  
  const createWebNavigation = () => {
    const { useRouter } = require('next/router');
    const router = useRouter();
    
    return {
      currentRoute: {
        name: router.pathname,
        path: router.asPath,
        params: router.query,
      },
      canGoBack: typeof window !== 'undefined' && window.history.length > 1,
      navigate: (route: string, params?: Record<string, any>) => {
        const url = params 
          ? `${route}?${new URLSearchParams(params).toString()}`
          : route;
        router.push(url);
      },
      goBack: () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        }
      },
      replace: (route: string, params?: Record<string, any>) => {
        const url = params 
          ? `${route}?${new URLSearchParams(params).toString()}`
          : route;
        router.replace(url);
      },
      reset: (newRoutes: Route[]) => {
        if (newRoutes.length > 0) {
          const lastRoute = newRoutes[newRoutes.length - 1];
          router.replace(lastRoute.path);
        }
      },
      getState: () => ({
        index: 0,
        routes: [{
          name: router.pathname,
          path: router.asPath,
          params: router.query,
        }],
      }),
    };
  };
  
  const createNativeNavigation = () => {
    const { useNavigation, useRoute, useFocusEffect } = require('@react-navigation/native');
    const navigation = useNavigation();
    const route = useRoute();
    
    return {
      currentRoute: {
        name: route.name,
        path: route.name,
        params: route.params || {},
      },
      canGoBack: navigation.canGoBack(),
      navigate: (routeName: string, params?: Record<string, any>) => {
        navigation.navigate(routeName, params);
      },
      goBack: () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      },
      replace: (routeName: string, params?: Record<string, any>) => {
        navigation.replace(routeName, params);
      },
      reset: (newRoutes: Route[]) => {
        navigation.reset({
          index: newRoutes.length - 1,
          routes: newRoutes.map(r => ({ name: r.name, params: r.params })),
        });
      },
      getState: () => navigation.getState(),
    };
  };
  
  const platformNavigation = createPlatformNavigation();
  
  const contextValue: NavigationContextValue = {
    ...platformNavigation,
  };
  
  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// Unified navigation hook that works across platforms
export const useUnifiedNavigation = () => {
  const navigation = useNavigation();
  
  const navigateToScreen = useCallback((screenName: string, params?: any) => {
    if (Platform.isWeb) {
      // Handle web routing with Next.js patterns
      const route = screenName.startsWith('/') ? screenName : `/${screenName}`;
      navigation.navigate(route, params);
    } else {
      // Handle React Navigation
      navigation.navigate(screenName, params);
    }
  }, [navigation]);
  
  const navigateToTab = useCallback((tabName: string) => {
    if (Platform.isWeb) {
      navigation.navigate(`/${tabName}`);
    } else {
      navigation.navigate(tabName);
    }
  }, [navigation]);
  
  const openModal = useCallback((modalName: string, params?: any) => {
    if (Platform.isWeb) {
      // Web modal handling - could use query params or separate modal state
      navigation.navigate(`/modal/${modalName}`, params);
    } else {
      // React Navigation modal
      navigation.navigate(modalName, params);
    }
  }, [navigation]);
  
  const showActionSheet = useCallback((options: any) => {
    if (Platform.isWeb) {
      // Web implementation using custom action sheet or browser dialog
      return new Promise((resolve) => {
        // Custom action sheet implementation
        resolve(null);
      });
    } else {
      // React Native ActionSheetIOS or custom implementation
      const ActionSheetIOS = require('react-native').ActionSheetIOS;
      return new Promise((resolve) => {
        ActionSheetIOS.showActionSheetWithOptions(options, resolve);
      });
    }
  }, []);
  
  return {
    ...navigation,
    navigateToScreen,
    navigateToTab,
    openModal,
    showActionSheet,
  };
};

// Deep linking support
export const useLinking = () => {
  const navigation = useNavigation();
  
  const handleDeepLink = useCallback((url: string) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const searchParams = Object.fromEntries(urlObj.searchParams);
      
      navigation.navigate(pathname, searchParams);
    } catch (error) {
      console.warn('Failed to handle deep link:', url, error);
    }
  }, [navigation]);
  
  const generateDeepLink = useCallback((route: string, params?: Record<string, any>) => {
    const baseUrl = Platform.isWeb 
      ? typeof window !== 'undefined' ? window.location.origin : ''
      : 'myapp://';
    
    const url = new URL(route, baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }
    
    return url.toString();
  }, []);
  
  return {
    handleDeepLink,
    generateDeepLink,
  };
};