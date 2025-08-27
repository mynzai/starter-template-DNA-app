import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

// Slice imports
import aiSlice from './slices/aiSlice';
import voiceSlice from './slices/voiceSlice';
import cameraSlice from './slices/cameraSlice';
import notificationSlice from './slices/notificationSlice';
import settingsSlice from './slices/settingsSlice';
import conversationSlice from './slices/conversationSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['settings', 'conversations', 'ai'], // Only persist these slices
  blacklist: ['voice', 'camera', 'notifications'], // Don't persist these
};

// Root reducer
const rootReducer = combineReducers({
  ai: aiSlice.reducer,
  voice: voiceSlice.reducer,
  camera: cameraSlice.reducer,
  notifications: notificationSlice.reducer,
  settings: settingsSlice.reducer,
  conversations: conversationSlice.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    }),
  devTools: __DEV__,
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export action creators
export { default as aiActions } from './slices/aiSlice';
export { default as voiceActions } from './slices/voiceSlice';
export { default as cameraActions } from './slices/cameraSlice';
export { default as notificationActions } from './slices/notificationSlice';
export { default as settingsActions } from './slices/settingsSlice';
export { default as conversationActions } from './slices/conversationSlice';

export default store;