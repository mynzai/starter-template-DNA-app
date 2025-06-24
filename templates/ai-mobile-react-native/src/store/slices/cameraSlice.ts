import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CameraSettings, CapturedImage, AIAnalysisResult, CameraPermissions } from '../../services/CameraService';

interface CameraState {
  isInitialized: boolean;
  permissions: CameraPermissions;
  isCapturing: boolean;
  isAnalyzing: boolean;
  lastCapturedImage: CapturedImage | null;
  lastAnalysisResult: AIAnalysisResult | null;
  recentImages: CapturedImage[];
  settings: CameraSettings;
  error: string | null;
}

const initialState: CameraState = {
  isInitialized: false,
  permissions: {
    camera: false,
    storage: false,
    location: false,
  },
  isCapturing: false,
  isAnalyzing: false,
  lastCapturedImage: null,
  lastAnalysisResult: null,
  recentImages: [],
  settings: {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
    compressionQuality: 0.8,
    includeBase64: false,
    enableAIAnalysis: true,
    autoAnalyze: false,
    saveToGallery: false,
    watermark: false,
  },
  error: null,
};

const cameraSlice = createSlice({
  name: 'camera',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setPermissions: (state, action: PayloadAction<CameraPermissions>) => {
      state.permissions = action.payload;
    },
    setCapturing: (state, action: PayloadAction<boolean>) => {
      state.isCapturing = action.payload;
    },
    setAnalyzing: (state, action: PayloadAction<boolean>) => {
      state.isAnalyzing = action.payload;
    },
    setCapturedImage: (state, action: PayloadAction<CapturedImage>) => {
      state.lastCapturedImage = action.payload;
      state.recentImages.unshift(action.payload);
      if (state.recentImages.length > 10) {
        state.recentImages = state.recentImages.slice(0, 10);
      }
    },
    setAnalysisResult: (state, action: PayloadAction<AIAnalysisResult>) => {
      state.lastAnalysisResult = action.payload;
    },
    clearRecentImages: (state) => {
      state.recentImages = [];
    },
    updateSettings: (state, action: PayloadAction<Partial<CameraSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setInitialized,
  setPermissions,
  setCapturing,
  setAnalyzing,
  setCapturedImage,
  setAnalysisResult,
  clearRecentImages,
  updateSettings,
  setError,
} = cameraSlice.actions;

export default cameraSlice;