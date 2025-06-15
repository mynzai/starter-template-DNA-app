import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import CameraScreen from '../screens/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConversationListScreen from '../screens/ConversationListScreen';
import ConversationScreen from '../screens/ConversationScreen';
import VoiceScreen from '../screens/VoiceScreen';
import ImageAnalysisScreen from '../screens/ImageAnalysisScreen';

// Types
import { RootState } from '../store';

export type RootStackParamList = {
  Main: undefined;
  Conversation: { conversationId: string };
  ImageAnalysis: { imageUri: string; analysisResult?: any };
};

export type TabParamList = {
  Home: undefined;
  Chat: undefined;
  Camera: undefined;
  Voice: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  const theme = useSelector((state: RootState) => state.settings.app.theme);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Chat':
              iconName = 'chat';
              break;
            case 'Camera':
              iconName = 'camera-alt';
              break;
            case 'Voice':
              iconName = 'mic';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
        },
        headerTintColor: theme === 'dark' ? '#ffffff' : '#000000',
        tabBarStyle: {
          backgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'AI Assistant' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ConversationListScreen}
        options={{ title: 'Conversations' }}
      />
      <Tab.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{ title: 'Camera' }}
      />
      <Tab.Screen 
        name="Voice" 
        component={VoiceScreen}
        options={{ title: 'Voice' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const theme = useSelector((state: RootState) => state.settings.app.theme);
  
  return (
    <NavigationContainer
      theme={{
        dark: theme === 'dark',
        colors: {
          primary: '#2196F3',
          background: theme === 'dark' ? '#121212' : '#ffffff',
          card: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          text: theme === 'dark' ? '#ffffff' : '#000000',
          border: theme === 'dark' ? '#272727' : '#e0e0e0',
          notification: '#ff4444',
        },
      }}
    >
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Conversation" 
          component={ConversationScreen}
          options={{ 
            title: 'AI Chat',
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen 
          name="ImageAnalysis" 
          component={ImageAnalysisScreen}
          options={{ 
            title: 'Image Analysis',
            headerBackTitleVisible: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;