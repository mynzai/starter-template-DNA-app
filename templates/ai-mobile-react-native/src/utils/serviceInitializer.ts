import AIService from '../services/AIService';
import VoiceService from '../services/VoiceService';
import CameraService from '../services/CameraService';

export const initializeServices = async (): Promise<void> => {
  try {
    console.log('[ServiceInitializer] Starting service initialization...');

    // Initialize AI Service
    const aiService = AIService.getInstance({
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      enableCaching: true,
      enableOfflineMode: true,
    });
    await aiService.initialize();
    console.log('[ServiceInitializer] AI Service initialized');

    // Initialize Voice Service
    const voiceService = VoiceService.getInstance();
    await voiceService.initialize({
      language: 'en-US',
      enableWakeWord: false,
      autoListen: false,
    });
    console.log('[ServiceInitializer] Voice Service initialized');

    // Initialize Camera Service
    const cameraService = CameraService.getInstance();
    await cameraService.initialize({
      quality: 0.8,
      enableAIAnalysis: true,
      autoAnalyze: false,
    });
    console.log('[ServiceInitializer] Camera Service initialized');

    console.log('[ServiceInitializer] All services initialized successfully');
  } catch (error) {
    console.error('[ServiceInitializer] Service initialization failed:', error);
    throw error;
  }
};