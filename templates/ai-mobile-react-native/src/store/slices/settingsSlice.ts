import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AIProvider } from '../../types/ai';

interface AppSettings {
  // AI Settings
  ai: {
    defaultProvider: AIProvider;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
    enableStreaming: boolean;
    enableCaching: boolean;
    autoSave: boolean;
  };
  
  // Voice Settings
  voice: {
    language: string;
    speechRate: number;
    speechPitch: number;
    enableWakeWord: boolean;
    wakeWord: string;
    timeoutDuration: number;
  };
  
  // Camera Settings
  camera: {
    quality: number;
    enableAIAnalysis: boolean;
    autoAnalyze: boolean;
    saveToGallery: boolean;
  };
  
  // App Settings
  app: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    enableHapticFeedback: boolean;
    enableSounds: boolean;
    autoLock: boolean;
    lockTimeout: number; // minutes
  };
  
  // Privacy Settings
  privacy: {
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
    dataRetentionDays: number;
    shareUsageData: boolean;
  };
  
  // Developer Settings
  developer: {
    enableDebugMode: boolean;
    showPerformanceMetrics: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

interface SettingsState extends AppSettings {
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

const initialState: SettingsState = {
  ai: {
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7,
    enableStreaming: true,
    enableCaching: true,
    autoSave: true,
  },
  voice: {
    language: 'en-US',
    speechRate: 0.5,
    speechPitch: 1.0,
    enableWakeWord: false,
    wakeWord: 'hey assistant',
    timeoutDuration: 5000,
  },
  camera: {
    quality: 0.8,
    enableAIAnalysis: true,
    autoAnalyze: false,
    saveToGallery: false,
  },
  app: {
    theme: 'auto',
    language: 'en',
    enableHapticFeedback: true,
    enableSounds: true,
    autoLock: true,
    lockTimeout: 5,
  },
  privacy: {
    analyticsEnabled: true,
    crashReportingEnabled: true,
    dataRetentionDays: 30,
    shareUsageData: false,
  },
  developer: {
    enableDebugMode: __DEV__,
    showPerformanceMetrics: false,
    logLevel: __DEV__ ? 'debug' : 'error',
  },
  isLoading: false,
  lastSaved: null,
  hasUnsavedChanges: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateAISettings: (state, action: PayloadAction<Partial<AppSettings['ai']>>) => {
      state.ai = { ...state.ai, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateVoiceSettings: (state, action: PayloadAction<Partial<AppSettings['voice']>>) => {
      state.voice = { ...state.voice, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateCameraSettings: (state, action: PayloadAction<Partial<AppSettings['camera']>>) => {
      state.camera = { ...state.camera, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateAppSettings: (state, action: PayloadAction<Partial<AppSettings['app']>>) => {
      state.app = { ...state.app, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updatePrivacySettings: (state, action: PayloadAction<Partial<AppSettings['privacy']>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    updateDeveloperSettings: (state, action: PayloadAction<Partial<AppSettings['developer']>>) => {
      state.developer = { ...state.developer, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    resetToDefaults: (state) => {
      const { isLoading, lastSaved } = state;
      Object.assign(state, initialState);
      state.isLoading = isLoading;
      state.lastSaved = lastSaved;
      state.hasUnsavedChanges = true;
    },
    resetAISettings: (state) => {
      state.ai = initialState.ai;
      state.hasUnsavedChanges = true;
    },
    resetVoiceSettings: (state) => {
      state.voice = initialState.voice;
      state.hasUnsavedChanges = true;
    },
    resetCameraSettings: (state) => {
      state.camera = initialState.camera;
      state.hasUnsavedChanges = true;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    markSaved: (state) => {
      state.lastSaved = new Date();
      state.hasUnsavedChanges = false;
    },
    importSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      const { ai, voice, camera, app, privacy, developer } = action.payload;
      if (ai) state.ai = { ...state.ai, ...ai };
      if (voice) state.voice = { ...state.voice, ...voice };
      if (camera) state.camera = { ...state.camera, ...camera };
      if (app) state.app = { ...state.app, ...app };
      if (privacy) state.privacy = { ...state.privacy, ...privacy };
      if (developer) state.developer = { ...state.developer, ...developer };
      state.hasUnsavedChanges = true;
    },
  },
});

export const {
  updateAISettings,
  updateVoiceSettings,
  updateCameraSettings,
  updateAppSettings,
  updatePrivacySettings,
  updateDeveloperSettings,
  resetToDefaults,
  resetAISettings,
  resetVoiceSettings,
  resetCameraSettings,
  setLoading,
  markSaved,
  importSettings,
} = settingsSlice.actions;

// Selectors
export const selectAISettings = (state: { settings: SettingsState }) => state.settings.ai;
export const selectVoiceSettings = (state: { settings: SettingsState }) => state.settings.voice;
export const selectCameraSettings = (state: { settings: SettingsState }) => state.settings.camera;
export const selectAppSettings = (state: { settings: SettingsState }) => state.settings.app;
export const selectPrivacySettings = (state: { settings: SettingsState }) => state.settings.privacy;
export const selectDeveloperSettings = (state: { settings: SettingsState }) => state.settings.developer;
export const selectHasUnsavedChanges = (state: { settings: SettingsState }) => state.settings.hasUnsavedChanges;
export const selectTheme = (state: { settings: SettingsState }) => state.settings.app.theme;

export default settingsSlice;