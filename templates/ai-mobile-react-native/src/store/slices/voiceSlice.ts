import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VoiceSettings, VoiceCommand, SpeechRecognitionResult } from '../../services/VoiceService';

interface VoiceState {
  isInitialized: boolean;
  hasPermissions: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentLanguage: string;
  availableVoices: any[];
  selectedVoice: string | null;
  lastRecognitionResult: SpeechRecognitionResult | null;
  voiceCommands: VoiceCommand[];
  settings: VoiceSettings;
  error: string | null;
}

const initialState: VoiceState = {
  isInitialized: false,
  hasPermissions: false,
  isListening: false,
  isSpeaking: false,
  currentLanguage: 'en-US',
  availableVoices: [],
  selectedVoice: null,
  lastRecognitionResult: null,
  voiceCommands: [],
  settings: {
    language: 'en-US',
    speechRate: 0.5,
    speechPitch: 1.0,
    voiceQuality: 'normal',
    enableWakeWord: false,
    wakeWord: 'hey assistant',
    autoListen: false,
    timeoutDuration: 5000,
    enableHapticFeedback: true,
  },
  error: null,
};

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setPermissions: (state, action: PayloadAction<boolean>) => {
      state.hasPermissions = action.payload;
    },
    setListening: (state, action: PayloadAction<boolean>) => {
      state.isListening = action.payload;
    },
    setSpeaking: (state, action: PayloadAction<boolean>) => {
      state.isSpeaking = action.payload;
    },
    setAvailableVoices: (state, action: PayloadAction<any[]>) => {
      state.availableVoices = action.payload;
    },
    setSelectedVoice: (state, action: PayloadAction<string>) => {
      state.selectedVoice = action.payload;
    },
    setRecognitionResult: (state, action: PayloadAction<SpeechRecognitionResult>) => {
      state.lastRecognitionResult = action.payload;
    },
    addVoiceCommand: (state, action: PayloadAction<VoiceCommand>) => {
      state.voiceCommands.push(action.payload);
    },
    removeVoiceCommand: (state, action: PayloadAction<string>) => {
      state.voiceCommands = state.voiceCommands.filter(cmd => cmd.id !== action.payload);
    },
    updateSettings: (state, action: PayloadAction<Partial<VoiceSettings>>) => {
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
  setListening,
  setSpeaking,
  setAvailableVoices,
  setSelectedVoice,
  setRecognitionResult,
  addVoiceCommand,
  removeVoiceCommand,
  updateSettings,
  setError,
} = voiceSlice.actions;

export default voiceSlice;