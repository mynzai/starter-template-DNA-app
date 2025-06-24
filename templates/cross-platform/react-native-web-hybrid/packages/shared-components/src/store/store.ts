import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '../api/api';
import { authSlice } from './slices/authSlice';
import { themeSlice } from './slices/themeSlice';
import { navigationSlice } from './slices/navigationSlice';
import { userSlice } from './slices/userSlice';
import { appSlice } from './slices/appSlice';
import { Platform } from '../utils/Platform';

// Platform-specific middleware
const getMiddleware = () => {
  const middleware = [api.middleware];
  
  // Add platform-specific middleware
  if (Platform.isDev) {
    // Add development middleware
    if (Platform.isWeb) {
      // Web-specific dev middleware
    } else {
      // React Native dev middleware
      if (typeof require !== 'undefined') {
        const createDebugger = require('redux-flipper').default;
        middleware.push(createDebugger());
      }
    }
  }
  
  return middleware;
};

export const store = configureStore({
  reducer: {
    // API slice
    [api.reducerPath]: api.reducer,
    
    // Feature slices
    auth: authSlice.reducer,
    theme: themeSlice.reducer,
    navigation: navigationSlice.reducer,
    user: userSlice.reducer,
    app: appSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore these action types
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
        ],
        ignoredPaths: [
          // Ignore these paths in the state
          'register',
          'rehydrate',
        ],
      },
      immutableCheck: {
        ignoredPaths: [
          // Ignore these paths for immutability checks
          'register',
          'rehydrate',
        ],
      },
    }).concat(getMiddleware()),
  devTools: Platform.isDev,
  preloadedState: undefined,
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store actions
export const { dispatch, getState, subscribe } = store;

// Hot reload for development
if (Platform.isDev && module.hot) {
  module.hot.accept('./slices/authSlice', () => {
    store.replaceReducer(require('./slices/authSlice').authSlice.reducer);
  });
  
  module.hot.accept('./slices/themeSlice', () => {
    store.replaceReducer(require('./slices/themeSlice').themeSlice.reducer);
  });
  
  module.hot.accept('./slices/navigationSlice', () => {
    store.replaceReducer(require('./slices/navigationSlice').navigationSlice.reducer);
  });
  
  module.hot.accept('./slices/userSlice', () => {
    store.replaceReducer(require('./slices/userSlice').userSlice.reducer);
  });
  
  module.hot.accept('./slices/appSlice', () => {
    store.replaceReducer(require('./slices/appSlice').appSlice.reducer);
  });
}