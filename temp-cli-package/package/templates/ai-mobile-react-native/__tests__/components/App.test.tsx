import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../../src/App';

// Mock services
jest.mock('../../src/utils/serviceInitializer', () => ({
  initializeServices: jest.fn(() => Promise.resolve()),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

describe('App Component', () => {
  it('should render without crashing', () => {
    const { getByText } = render(<App />);
    
    // Should show loading screen initially
    expect(getByText('Loading AI Assistant...')).toBeTruthy();
  });

  it('should initialize services on mount', () => {
    const { initializeServices } = require('../../src/utils/serviceInitializer');
    
    render(<App />);
    
    expect(initializeServices).toHaveBeenCalled();
  });

  it('should wrap components with providers', () => {
    const { UNSAFE_getByType } = render(<App />);
    
    // Should have Redux Provider
    expect(() => UNSAFE_getByType(require('react-redux').Provider)).not.toThrow();
  });
});