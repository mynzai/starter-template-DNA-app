import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../models/voice_command.dart';
import '../models/speech_result.dart';
import 'storage_service.dart';

enum VoiceServiceState {
  idle,
  listening,
  processing,
  speaking,
  error,
}

class VoiceService {
  static final VoiceService _instance = VoiceService._internal();
  static VoiceService get instance => _instance;
  VoiceService._internal();

  late SpeechToText _speechToText;
  late FlutterTts _flutterTts;
  late AudioRecorder _audioRecorder;

  final StreamController<VoiceServiceState> _stateController = 
      StreamController<VoiceServiceState>.broadcast();
  final StreamController<SpeechResult> _speechResultController = 
      StreamController<SpeechResult>.broadcast();
  final StreamController<double> _confidenceController = 
      StreamController<double>.broadcast();

  VoiceServiceState _currentState = VoiceServiceState.idle;
  bool _isInitialized = false;
  bool _isListening = false;
  Timer? _listeningTimer;
  Timer? _wakeWordTimer;
  
  // Voice commands registry
  final Map<String, VoiceCommand> _voiceCommands = {};
  
  // TTS settings
  double _speechRate = 0.5;
  double _speechVolume = 1.0;
  double _speechPitch = 1.0;
  String _language = 'en-US';
  String _voice = '';

  // Getters
  VoiceServiceState get currentState => _currentState;
  bool get isInitialized => _isInitialized;
  bool get isListening => _isListening;
  Stream<VoiceServiceState> get stateStream => _stateController.stream;
  Stream<SpeechResult> get speechResultStream => _speechResultController.stream;
  Stream<double> get confidenceStream => _confidenceController.stream;

  Future<void> init() async {
    if (_isInitialized) return;

    try {
      // Initialize Speech-to-Text
      _speechToText = SpeechToText();
      
      // Initialize Text-to-Speech
      _flutterTts = FlutterTts();
      
      // Initialize Audio Recorder
      _audioRecorder = AudioRecorder();

      // Setup TTS callbacks
      await _setupTtsCallbacks();
      
      // Load saved settings
      await _loadSettings();
      
      // Register default voice commands
      _registerDefaultVoiceCommands();

      _isInitialized = true;
      _updateState(VoiceServiceState.idle);
      
      debugPrint('Voice Service initialized successfully');
    } catch (e) {
      debugPrint('Voice Service initialization error: $e');
      _updateState(VoiceServiceState.error);
      rethrow;
    }
  }

  /// Request necessary permissions
  Future<bool> requestPermissions() async {
    try {
      final microphoneStatus = await Permission.microphone.request();
      final speechStatus = await Permission.speech.request();
      
      return microphoneStatus.isGranted && speechStatus.isGranted;
    } catch (e) {
      debugPrint('Permission request error: $e');
      return false;
    }
  }

  /// Start listening for speech
  Future<bool> startListening({
    Duration? timeout,
    bool enableWakeWord = false,
  }) async {
    if (!_isInitialized || _isListening) return false;

    try {
      // Check permissions
      final hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        throw Exception('Microphone permission not granted');
      }

      // Check if speech recognition is available
      final available = await _speechToText.initialize(
        onStatus: _onSpeechStatus,
        onError: _onSpeechError,
      );

      if (!available) {
        throw Exception('Speech recognition not available');
      }

      // Start listening
      await _speechToText.listen(
        onResult: _onSpeechResult,
        listenFor: timeout ?? const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        localeId: _language,
        cancelOnError: true,
        listenMode: ListenMode.confirmation,
      );

      _isListening = true;
      _updateState(VoiceServiceState.listening);

      // Set timeout
      _listeningTimer = Timer(timeout ?? const Duration(seconds: 30), () {
        stopListening();
      });

      // Enable wake word detection if requested
      if (enableWakeWord) {
        _startWakeWordDetection();
      }

      return true;
    } catch (e) {
      debugPrint('Start listening error: $e');
      _updateState(VoiceServiceState.error);
      return false;
    }
  }

  /// Stop listening for speech
  Future<void> stopListening() async {
    if (!_isListening) return;

    try {
      await _speechToText.stop();
      _isListening = false;
      _listeningTimer?.cancel();
      _updateState(VoiceServiceState.idle);
    } catch (e) {
      debugPrint('Stop listening error: $e');
    }
  }

  /// Speak text using TTS
  Future<void> speak(String text, {
    double? rate,
    double? volume,
    double? pitch,
    String? voice,
  }) async {
    if (!_isInitialized || text.isEmpty) return;

    try {
      _updateState(VoiceServiceState.speaking);

      // Set TTS parameters
      await _flutterTts.setSpeechRate(rate ?? _speechRate);
      await _flutterTts.setVolume(volume ?? _speechVolume);
      await _flutterTts.setPitch(pitch ?? _speechPitch);
      await _flutterTts.setLanguage(_language);
      
      if (voice != null && voice.isNotEmpty) {
        await _flutterTts.setVoice({'name': voice, 'locale': _language});
      } else if (_voice.isNotEmpty) {
        await _flutterTts.setVoice({'name': _voice, 'locale': _language});
      }

      // Speak the text
      await _flutterTts.speak(text);
    } catch (e) {
      debugPrint('Speak error: $e');
      _updateState(VoiceServiceState.error);
    }
  }

  /// Stop speaking
  Future<void> stopSpeaking() async {
    try {
      await _flutterTts.stop();
      _updateState(VoiceServiceState.idle);
    } catch (e) {
      debugPrint('Stop speaking error: $e');
    }
  }

  /// Register a voice command
  void registerVoiceCommand(VoiceCommand command) {
    _voiceCommands[command.trigger.toLowerCase()] = command;
  }

  /// Unregister a voice command
  void unregisterVoiceCommand(String trigger) {
    _voiceCommands.remove(trigger.toLowerCase());
  }

  /// Get available voices
  Future<List<Map<String, String>>> getAvailableVoices() async {
    try {
      final voices = await _flutterTts.getVoices;
      if (voices != null) {
        return List<Map<String, String>>.from(voices);
      }
      return [];
    } catch (e) {
      debugPrint('Get voices error: $e');
      return [];
    }
  }

  /// Get available languages
  Future<List<String>> getAvailableLanguages() async {
    try {
      final languages = await _flutterTts.getLanguages;
      if (languages != null) {
        return List<String>.from(languages);
      }
      return ['en-US'];
    } catch (e) {
      debugPrint('Get languages error: $e');
      return ['en-US'];
    }
  }

  /// Update TTS settings
  Future<void> updateTtsSettings({
    double? speechRate,
    double? speechVolume,
    double? speechPitch,
    String? language,
    String? voice,
  }) async {
    if (speechRate != null) _speechRate = speechRate;
    if (speechVolume != null) _speechVolume = speechVolume;
    if (speechPitch != null) _speechPitch = speechPitch;
    if (language != null) _language = language;
    if (voice != null) _voice = voice;

    await _saveSettings();
  }

  /// Process voice command
  void _processVoiceCommand(String text) {
    final normalizedText = text.toLowerCase().trim();
    
    for (final command in _voiceCommands.values) {
      if (command.matches(normalizedText)) {
        command.execute(normalizedText);
        return;
      }
    }
  }

  /// Setup TTS callbacks
  Future<void> _setupTtsCallbacks() async {
    await _flutterTts.setStartHandler(() {
      _updateState(VoiceServiceState.speaking);
    });

    await _flutterTts.setCompletionHandler(() {
      _updateState(VoiceServiceState.idle);
    });

    await _flutterTts.setErrorHandler((msg) {
      debugPrint('TTS Error: $msg');
      _updateState(VoiceServiceState.error);
    });

    await _flutterTts.setCancelHandler(() {
      _updateState(VoiceServiceState.idle);
    });

    await _flutterTts.setPauseHandler(() {
      _updateState(VoiceServiceState.idle);
    });

    await _flutterTts.setContinueHandler(() {
      _updateState(VoiceServiceState.speaking);
    });
  }

  /// Register default voice commands
  void _registerDefaultVoiceCommands() {
    // Wake word command
    registerVoiceCommand(VoiceCommand(
      trigger: 'hey assistant',
      description: 'Wake up the assistant',
      action: (text) {
        debugPrint('Wake word detected: $text');
        startListening();
      },
    ));

    // Stop command
    registerVoiceCommand(VoiceCommand(
      trigger: 'stop',
      description: 'Stop current action',
      action: (text) {
        stopListening();
        stopSpeaking();
      },
    ));

    // Repeat command
    registerVoiceCommand(VoiceCommand(
      trigger: 'repeat',
      description: 'Repeat last response',
      action: (text) async {
        final lastResponse = await StorageService.instance.getLastAIResponse();
        if (lastResponse != null) {
          speak(lastResponse);
        }
      },
    ));
  }

  /// Start wake word detection
  void _startWakeWordDetection() {
    _wakeWordTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (!_isListening && _currentState == VoiceServiceState.idle) {
        startListening(
          timeout: const Duration(seconds: 5),
          enableWakeWord: false,
        );
      }
    });
  }

  /// Stop wake word detection
  void _stopWakeWordDetection() {
    _wakeWordTimer?.cancel();
    _wakeWordTimer = null;
  }

  /// Handle speech status changes
  void _onSpeechStatus(String status) {
    debugPrint('Speech status: $status');
    
    switch (status) {
      case 'listening':
        _updateState(VoiceServiceState.listening);
        break;
      case 'notListening':
        _isListening = false;
        _updateState(VoiceServiceState.idle);
        break;
      case 'done':
        _isListening = false;
        _updateState(VoiceServiceState.processing);
        break;
    }
  }

  /// Handle speech errors
  void _onSpeechError(dynamic error) {
    debugPrint('Speech error: $error');
    _isListening = false;
    _updateState(VoiceServiceState.error);
  }

  /// Handle speech results
  void _onSpeechResult(dynamic result) {
    if (result == null) return;

    final speechResult = SpeechResult(
      recognizedWords: result.recognizedWords ?? '',
      confidence: result.confidence ?? 0.0,
      isFinal: result.finalResult ?? false,
      alternates: result.alternates?.map<String>((alt) => alt.recognizedWords ?? '').toList() ?? [],
    );

    _speechResultController.add(speechResult);
    _confidenceController.add(speechResult.confidence);

    if (speechResult.isFinal && speechResult.recognizedWords.isNotEmpty) {
      // Process voice commands first
      _processVoiceCommand(speechResult.recognizedWords);
      
      // Update state
      _updateState(VoiceServiceState.processing);
      
      // Stop listening after final result
      Timer(const Duration(milliseconds: 500), () {
        stopListening();
      });
    }
  }

  /// Update current state
  void _updateState(VoiceServiceState newState) {
    if (_currentState != newState) {
      _currentState = newState;
      _stateController.add(newState);
    }
  }

  /// Load saved settings
  Future<void> _loadSettings() async {
    try {
      final settings = await StorageService.instance.getVoiceSettings();
      
      _speechRate = settings['speechRate']?.toDouble() ?? 0.5;
      _speechVolume = settings['speechVolume']?.toDouble() ?? 1.0;
      _speechPitch = settings['speechPitch']?.toDouble() ?? 1.0;
      _language = settings['language'] ?? 'en-US';
      _voice = settings['voice'] ?? '';
    } catch (e) {
      debugPrint('Load voice settings error: $e');
    }
  }

  /// Save current settings
  Future<void> _saveSettings() async {
    try {
      await StorageService.instance.saveVoiceSettings({
        'speechRate': _speechRate,
        'speechVolume': _speechVolume,
        'speechPitch': _speechPitch,
        'language': _language,
        'voice': _voice,
      });
    } catch (e) {
      debugPrint('Save voice settings error: $e');
    }
  }

  /// Cleanup resources
  void dispose() {
    _listeningTimer?.cancel();
    _wakeWordTimer?.cancel();
    _stateController.close();
    _speechResultController.close();
    _confidenceController.close();
    stopListening();
    stopSpeaking();
  }
}