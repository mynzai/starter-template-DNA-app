import { Platform, PermissionsAndroid } from 'react-native';
import Voice, { SpeechRecognizedEvent, SpeechResultsEvent, SpeechErrorEvent } from 'react-native-voice';
import Tts from 'react-native-tts';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export interface VoiceCommand {
  id: string;
  trigger: string;
  description: string;
  action: (text: string) => Promise<void>;
  patterns?: RegExp[];
  enabled: boolean;
}

export interface VoiceSettings {
  language: string;
  speechRate: number;
  speechPitch: number;
  voiceQuality: 'low' | 'normal' | 'high';
  enableWakeWord: boolean;
  wakeWord: string;
  autoListen: boolean;
  timeoutDuration: number;
  enableHapticFeedback: boolean;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  alternatives: string[];
  isFinal: boolean;
}

export interface VoiceRecognitionEvent {
  type: 'start' | 'end' | 'result' | 'error' | 'timeout';
  data?: any;
}

export class VoiceService {
  private static instance: VoiceService;
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private hasPermissions: boolean = false;
  private availableVoices: any[] = [];
  private selectedVoice: string | null = null;
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private listeningTimeout: NodeJS.Timeout | null = null;

  private settings: VoiceSettings = {
    language: 'en-US',
    speechRate: 0.5,
    speechPitch: 1.0,
    voiceQuality: 'normal',
    enableWakeWord: false,
    wakeWord: 'hey assistant',
    autoListen: false,
    timeoutDuration: 5000,
    enableHapticFeedback: true,
  };

  private constructor() {
    this.setupVoiceEvents();
    this.setupTtsEvents();
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  public async initialize(settings?: Partial<VoiceSettings>): Promise<void> {
    try {
      if (settings) {
        this.settings = { ...this.settings, ...settings };
      }

      // Request permissions
      await this.requestPermissions();

      // Initialize TTS
      await this.initializeTts();

      // Initialize Speech Recognition
      await this.initializeSpeechRecognition();

      // Load available voices
      await this.loadAvailableVoices();

      this.isInitialized = true;
      this.emit('initialized', { settings: this.settings });
      
      console.log('[VoiceService] Initialized successfully');
    } catch (error) {
      console.error('[VoiceService] Initialization failed:', error);
      throw error;
    }
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      let microphonePermission;

      if (Platform.OS === 'android') {
        microphonePermission = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
      } else {
        microphonePermission = await request(PERMISSIONS.IOS.MICROPHONE);
      }

      this.hasPermissions = microphonePermission === RESULTS.GRANTED;
      
      if (!this.hasPermissions) {
        console.warn('[VoiceService] Microphone permission denied');
      }

      return this.hasPermissions;
    } catch (error) {
      console.error('[VoiceService] Permission request failed:', error);
      return false;
    }
  }

  private async initializeTts(): Promise<void> {
    try {
      // Set TTS default settings
      await Tts.setDefaultLanguage(this.settings.language);
      await Tts.setDefaultRate(this.settings.speechRate);
      await Tts.setDefaultPitch(this.settings.speechPitch);

      console.log('[VoiceService] TTS initialized');
    } catch (error) {
      console.error('[VoiceService] TTS initialization failed:', error);
      throw error;
    }
  }

  private async initializeSpeechRecognition(): Promise<void> {
    try {
      await Voice.destroy();
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);

      console.log('[VoiceService] Speech recognition initialized');
    } catch (error) {
      console.error('[VoiceService] Speech recognition initialization failed:', error);
      throw error;
    }
  }

  private async loadAvailableVoices(): Promise<void> {
    try {
      this.availableVoices = await Tts.voices();
      
      // Select default voice based on language
      const preferredVoice = this.availableVoices.find(
        voice => voice.language === this.settings.language && 
                 voice.quality === this.settings.voiceQuality
      );

      if (preferredVoice) {
        this.selectedVoice = preferredVoice.id;
      } else if (this.availableVoices.length > 0) {
        this.selectedVoice = this.availableVoices[0].id;
      }

      console.log(`[VoiceService] Loaded ${this.availableVoices.length} voices`);
    } catch (error) {
      console.error('[VoiceService] Failed to load voices:', error);
    }
  }

  public async startListening(options?: {
    language?: string;
    timeout?: number;
    partialResults?: boolean;
  }): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('VoiceService not initialized');
    }

    if (!this.hasPermissions) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Microphone permission required');
      }
    }

    if (this.isListening) {
      console.warn('[VoiceService] Already listening');
      return false;
    }

    try {
      const language = options?.language || this.settings.language;
      const timeout = options?.timeout || this.settings.timeoutDuration;

      await Voice.start(language, {
        REQUEST_PERMISSIONS_AUTO: true,
        RETURN_PARTIAL_RESULTS: options?.partialResults || true,
      });

      this.isListening = true;

      // Set timeout
      if (timeout > 0) {
        this.listeningTimeout = setTimeout(() => {
          this.stopListening();
          this.emit('timeout', { duration: timeout });
        }, timeout);
      }

      this.emit('start', { language, timeout });
      return true;
    } catch (error) {
      console.error('[VoiceService] Failed to start listening:', error);
      this.emit('error', { error, type: 'start_listening' });
      return false;
    }
  }

  public async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.stop();
      this.isListening = false;

      if (this.listeningTimeout) {
        clearTimeout(this.listeningTimeout);
        this.listeningTimeout = null;
      }

      this.emit('end', {});
    } catch (error) {
      console.error('[VoiceService] Failed to stop listening:', error);
      this.emit('error', { error, type: 'stop_listening' });
    }
  }

  public async speak(
    text: string,
    options?: {
      voice?: string;
      rate?: number;
      pitch?: number;
      queueMode?: 'flush' | 'add';
    }
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VoiceService not initialized');
    }

    try {
      // Set voice if specified
      if (options?.voice) {
        await Tts.setDefaultVoice(options.voice);
      } else if (this.selectedVoice) {
        await Tts.setDefaultVoice(this.selectedVoice);
      }

      // Set rate and pitch if specified
      if (options?.rate !== undefined) {
        await Tts.setDefaultRate(options.rate);
      }
      if (options?.pitch !== undefined) {
        await Tts.setDefaultPitch(options.pitch);
      }

      // Stop current speech if flush mode
      if (options?.queueMode === 'flush' && this.isSpeaking) {
        await this.stopSpeaking();
      }

      this.isSpeaking = true;
      await Tts.speak(text);

      this.emit('speechStart', { text, options });
    } catch (error) {
      console.error('[VoiceService] Failed to speak:', error);
      this.emit('error', { error, type: 'text_to_speech' });
      throw error;
    }
  }

  public async stopSpeaking(): Promise<void> {
    try {
      await Tts.stop();
      this.isSpeaking = false;
      this.emit('speechEnd', {});
    } catch (error) {
      console.error('[VoiceService] Failed to stop speaking:', error);
    }
  }

  public registerVoiceCommand(command: VoiceCommand): void {
    this.voiceCommands.set(command.id, command);
    console.log(`[VoiceService] Registered voice command: ${command.trigger}`);
  }

  public unregisterVoiceCommand(commandId: string): void {
    this.voiceCommands.delete(commandId);
    console.log(`[VoiceService] Unregistered voice command: ${commandId}`);
  }

  public getVoiceCommands(): VoiceCommand[] {
    return Array.from(this.voiceCommands.values());
  }

  private async processVoiceCommand(text: string): Promise<boolean> {
    const normalizedText = text.toLowerCase().trim();
    
    for (const command of this.voiceCommands.values()) {
      if (!command.enabled) continue;

      const trigger = command.trigger.toLowerCase();
      
      // Check exact match
      if (normalizedText === trigger) {
        await command.action(text);
        this.emit('commandExecuted', { command, text });
        return true;
      }

      // Check if text contains trigger
      if (normalizedText.includes(trigger)) {
        await command.action(text);
        this.emit('commandExecuted', { command, text });
        return true;
      }

      // Check patterns
      if (command.patterns) {
        for (const pattern of command.patterns) {
          if (pattern.test(normalizedText)) {
            await command.action(text);
            this.emit('commandExecuted', { command, text });
            return true;
          }
        }
      }
    }

    return false;
  }

  private checkWakeWord(text: string): boolean {
    if (!this.settings.enableWakeWord) return false;
    
    const normalizedText = text.toLowerCase().trim();
    const wakeWord = this.settings.wakeWord.toLowerCase();
    
    return normalizedText.includes(wakeWord);
  }

  // Voice event handlers
  private onSpeechStart(e: any): void {
    console.log('[VoiceService] Speech started');
    this.emit('speechRecognitionStart', e);
  }

  private onSpeechRecognized(e: SpeechRecognizedEvent): void {
    console.log('[VoiceService] Speech recognized');
    this.emit('speechRecognized', e);
  }

  private onSpeechEnd(e: any): void {
    console.log('[VoiceService] Speech ended');
    this.isListening = false;
    
    if (this.listeningTimeout) {
      clearTimeout(this.listeningTimeout);
      this.listeningTimeout = null;
    }

    this.emit('speechRecognitionEnd', e);
  }

  private onSpeechError(e: SpeechErrorEvent): void {
    console.error('[VoiceService] Speech error:', e.error);
    this.isListening = false;
    
    if (this.listeningTimeout) {
      clearTimeout(this.listeningTimeout);
      this.listeningTimeout = null;
    }

    this.emit('speechRecognitionError', e);
  }

  private async onSpeechResults(e: SpeechResultsEvent): void {
    if (!e.value || e.value.length === 0) return;

    const result: SpeechRecognitionResult = {
      text: e.value[0],
      confidence: 1.0, // React Native Voice doesn't provide confidence scores
      alternatives: e.value.slice(1),
      isFinal: true,
    };

    console.log('[VoiceService] Speech result:', result.text);

    // Check for wake word
    if (this.settings.enableWakeWord && this.checkWakeWord(result.text)) {
      this.emit('wakeWordDetected', { text: result.text });
      return;
    }

    // Try to process as voice command
    const commandExecuted = await this.processVoiceCommand(result.text);
    
    if (!commandExecuted) {
      this.emit('speechResult', result);
    }
  }

  private onSpeechPartialResults(e: SpeechResultsEvent): void {
    if (!e.value || e.value.length === 0) return;

    const result: SpeechRecognitionResult = {
      text: e.value[0],
      confidence: 0.5,
      alternatives: e.value.slice(1),
      isFinal: false,
    };

    this.emit('partialSpeechResult', result);
  }

  // TTS event handlers
  private setupTtsEvents(): void {
    Tts.addEventListener('tts-start', () => {
      this.isSpeaking = true;
      this.emit('speechStart', {});
    });

    Tts.addEventListener('tts-finish', () => {
      this.isSpeaking = false;
      this.emit('speechEnd', {});
    });

    Tts.addEventListener('tts-cancel', () => {
      this.isSpeaking = false;
      this.emit('speechCancelled', {});
    });
  }

  private setupVoiceEvents(): void {
    // Voice events are set up in initializeSpeechRecognition
  }

  // Event management
  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('[VoiceService] Event listener error:', error);
        }
      });
    }
  }

  // Public getters and setters
  public get initialized(): boolean {
    return this.isInitialized;
  }

  public get listening(): boolean {
    return this.isListening;
  }

  public get speaking(): boolean {
    return this.isSpeaking;
  }

  public get permissions(): boolean {
    return this.hasPermissions;
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public async updateSettings(newSettings: Partial<VoiceSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };

    // Apply TTS settings
    if (newSettings.language) {
      await Tts.setDefaultLanguage(newSettings.language);
    }
    if (newSettings.speechRate !== undefined) {
      await Tts.setDefaultRate(newSettings.speechRate);
    }
    if (newSettings.speechPitch !== undefined) {
      await Tts.setDefaultPitch(newSettings.speechPitch);
    }

    this.emit('settingsUpdated', { settings: this.settings });
  }

  public getAvailableVoices(): any[] {
    return [...this.availableVoices];
  }

  public async setVoice(voiceId: string): Promise<void> {
    const voice = this.availableVoices.find(v => v.id === voiceId);
    if (!voice) {
      throw new Error(`Voice not found: ${voiceId}`);
    }

    this.selectedVoice = voiceId;
    await Tts.setDefaultVoice(voiceId);
    this.emit('voiceChanged', { voice });
  }

  public async destroy(): Promise<void> {
    try {
      await this.stopListening();
      await this.stopSpeaking();
      await Voice.destroy();
      
      this.isInitialized = false;
      this.hasPermissions = false;
      this.voiceCommands.clear();
      this.eventListeners.clear();
      
      console.log('[VoiceService] Destroyed');
    } catch (error) {
      console.error('[VoiceService] Destroy failed:', error);
    }
  }
}

export default VoiceService;