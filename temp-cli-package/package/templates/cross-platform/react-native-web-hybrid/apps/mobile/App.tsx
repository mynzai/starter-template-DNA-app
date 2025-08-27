import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from '@hybrid/shared-components';
import { NavigationProvider } from '@hybrid/shared-navigation';
import { store, persistor } from './src/store/store';
import { linking } from './src/config/linking';
import { routes } from './src/config/routes';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingSpinner from './src/components/LoadingSpinner';
import { navigationRef } from './src/navigation/RootNavigation';
import { setupAnalytics } from './src/services/analytics';
import { setupCrashReporting } from './src/services/crashReporting';
import { setupNotifications } from './src/services/notifications';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Navigation stacks
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main App Stack
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
    </Stack.Navigator>
  );
}

function App(): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    // Initialize services
    const initializeApp = async () => {
      try {
        // Setup analytics
        await setupAnalytics();
        
        // Setup crash reporting
        await setupCrashReporting();
        
        // Setup notifications
        await setupNotifications();
        
        // App is ready
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsReady(true); // Continue anyway
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // Refresh auth token, sync data, etc.
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  if (!isReady) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
            <ThemeProvider>
              <NavigationProvider routes={routes}>
                <StatusBar
                  barStyle="dark-content"
                  backgroundColor="transparent"
                  translucent
                />
                
                <NavigationContainer
                  ref={navigationRef}
                  linking={linking}
                  onReady={() => {
                    // Navigation is ready
                    console.log('Navigation ready');
                  }}
                  onStateChange={(state) => {
                    // Track navigation changes for analytics
                    const currentRoute = state?.routes[state.index];
                    if (currentRoute) {
                      // Log screen view to analytics
                      console.log('Screen view:', currentRoute.name);
                    }
                  }}
                >
                  <AppStack />
                </NavigationContainer>
              </NavigationProvider>
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;