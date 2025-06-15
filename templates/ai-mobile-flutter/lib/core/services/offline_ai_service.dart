import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:tflite_flutter/tflite_flutter.dart';
import 'package:tflite_flutter_helper/tflite_flutter_helper.dart';
import 'package:path_provider/path_provider.dart';

import '../models/ai_response.dart';
import '../models/ai_message.dart';
import '../models/image_analysis.dart';
import 'storage_service.dart';

class OfflineAIService {
  Interpreter? _textModel;
  Interpreter? _imageModel;
  Map<String, dynamic>? _textTokenizer;
  Map<String, dynamic>? _imageLabels;
  
  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  final List<String> _predefinedResponses = [
    "I understand your question. While I'm working offline with limited capabilities, I can help with basic tasks.",
    "That's an interesting point. In offline mode, I can provide general guidance and simple responses.",
    "I'm here to help! Though my offline capabilities are limited, I'll do my best to assist you.",
    "Thank you for your question. Operating offline, I can offer basic support and information.",
    "I appreciate your patience. In offline mode, I can handle simple conversations and basic analysis.",
  ];

  /// Initialize offline AI service
  Future<void> init() async {
    if (_isInitialized) return;

    try {
      // Initialize text model for basic text processing
      await _initializeTextModel();
      
      // Initialize image model for basic image classification
      await _initializeImageModel();
      
      _isInitialized = true;
      debugPrint('Offline AI Service initialized successfully');
    } catch (e) {
      debugPrint('Offline AI Service initialization error: $e');
      // Continue without offline AI - provide fallback responses
    }
  }

  /// Initialize text processing model
  Future<void> _initializeTextModel() async {
    try {
      // Check if model exists in assets
      final modelPath = await _getModelPath('text_model.tflite');
      if (await File(modelPath).exists()) {
        _textModel = await Interpreter.fromFile(File(modelPath));
        
        // Load tokenizer if available
        final tokenizerPath = await _getModelPath('tokenizer.json');
        if (await File(tokenizerPath).exists()) {
          final tokenizerData = await File(tokenizerPath).readAsString();
          _textTokenizer = jsonDecode(tokenizerData);
        }
      }
    } catch (e) {
      debugPrint('Text model initialization error: $e');
    }
  }

  /// Initialize image classification model
  Future<void> _initializeImageModel() async {
    try {
      // Check if model exists in assets
      final modelPath = await _getModelPath('image_model.tflite');
      if (await File(modelPath).exists()) {
        _imageModel = await Interpreter.fromFile(File(modelPath));
        
        // Load labels if available
        final labelsPath = await _getModelPath('image_labels.json');
        if (await File(labelsPath).exists()) {
          final labelsData = await File(labelsPath).readAsString();
          _imageLabels = jsonDecode(labelsData);
        }
      }
    } catch (e) {
      debugPrint('Image model initialization error: $e');
    }
  }

  /// Get model file path
  Future<String> _getModelPath(String modelName) async {
    final directory = await getApplicationDocumentsDirectory();
    final modelDir = Directory('${directory.path}/models');
    
    if (!await modelDir.exists()) {
      await modelDir.create(recursive: true);
    }
    
    final modelPath = '${modelDir.path}/$modelName';
    
    // Copy from assets if not exists
    if (!await File(modelPath).exists()) {
      try {
        final data = await rootBundle.load('assets/models/$modelName');
        await File(modelPath).writeAsBytes(data.buffer.asUint8List());
      } catch (e) {
        debugPrint('Model asset not found: $modelName');
      }
    }
    
    return modelPath;
  }

  /// Generate response using offline capabilities
  Future<AIResponse> generateResponse({
    required String message,
    Map<String, dynamic>? context,
  }) async {
    try {
      String responseText;
      
      if (_textModel != null && _textTokenizer != null) {
        // Use actual AI model
        responseText = await _generateWithModel(message, context);
      } else {
        // Use rule-based fallback
        responseText = _generateFallbackResponse(message, context);
      }
      
      return AIResponse(
        id: 'offline_${DateTime.now().millisecondsSinceEpoch}',
        content: responseText,
        timestamp: DateTime.now(),
        provider: 'offline',
        model: 'offline-text-model',
        tokens: responseText.split(' ').length,
        isOffline: true,
      );
    } catch (e) {
      debugPrint('Offline response generation error: $e');
      return AIResponse(
        id: 'offline_error_${DateTime.now().millisecondsSinceEpoch}',
        content: 'I apologize, but I\'m having difficulty processing your request in offline mode. Please try again when you have an internet connection.',
        timestamp: DateTime.now(),
        provider: 'offline',
        model: 'fallback',
        tokens: 0,
        isOffline: true,
      );
    }
  }

  /// Stream response for real-time chat
  Stream<AIMessage> streamResponse({
    required String message,
    Map<String, dynamic>? context,
  }) async* {
    try {
      final response = await generateResponse(message: message, context: context);
      
      // Simulate streaming by yielding chunks
      final words = response.content.split(' ');
      String currentContent = '';
      
      for (int i = 0; i < words.length; i++) {
        currentContent += (i > 0 ? ' ' : '') + words[i];
        
        yield AIMessage(
          id: '${response.id}_chunk_$i',
          role: MessageRole.assistant,
          content: currentContent,
          timestamp: DateTime.now(),
          isPartial: i < words.length - 1,
          isOffline: true,
        );
        
        // Add delay to simulate streaming
        await Future.delayed(const Duration(milliseconds: 100));
      }
    } catch (e) {
      debugPrint('Offline streaming error: $e');
      yield AIMessage(
        id: 'offline_error_${DateTime.now().millisecondsSinceEpoch}',
        role: MessageRole.assistant,
        content: 'Sorry, I encountered an error while processing your message offline.',
        timestamp: DateTime.now(),
        isOffline: true,
      );
    }
  }

  /// Analyze image offline
  Future<ImageAnalysis> analyzeImageOffline({
    required Uint8List imageBytes,
    String? prompt,
  }) async {
    try {
      if (_imageModel != null && _imageLabels != null) {
        return await _analyzeWithImageModel(imageBytes, prompt);
      } else {
        return _generateFallbackImageAnalysis(imageBytes, prompt);
      }
    } catch (e) {
      debugPrint('Offline image analysis error: $e');
      return ImageAnalysis(
        id: 'offline_image_${DateTime.now().millisecondsSinceEpoch}',
        description: 'Unable to analyze image in offline mode. Basic image processing is not available.',
        confidence: 0.0,
        tags: [],
        objects: [],
        timestamp: DateTime.now(),
        isOffline: true,
      );
    }
  }

  /// Generate response using AI model
  Future<String> _generateWithModel(String message, Map<String, dynamic>? context) async {
    try {
      // Tokenize input
      final tokens = _tokenizeText(message);
      if (tokens.isEmpty) throw Exception('Tokenization failed');
      
      // Prepare input tensor
      final inputShape = _textModel!.getInputTensor(0).shape;
      final input = _prepareTextInput(tokens, inputShape);
      
      // Run inference
      final outputShape = _textModel!.getOutputTensor(0).shape;
      final output = List.generate(outputShape[0], (i) => List.filled(outputShape[1], 0.0));
      
      _textModel!.run(input, output);
      
      // Decode output to text
      final responseTokens = _decodeOutput(output[0]);
      return _detokenizeText(responseTokens);
    } catch (e) {
      debugPrint('Model inference error: $e');
      return _generateFallbackResponse(message, context);
    }
  }

  /// Generate fallback response using rules
  String _generateFallbackResponse(String message, Map<String, dynamic>? context) {
    final lowerMessage = message.toLowerCase();
    
    // Simple keyword-based responses
    if (lowerMessage.contains('hello') || lowerMessage.contains('hi')) {
      return 'Hello! I\'m operating in offline mode, so my capabilities are limited, but I\'m here to help!';
    }
    
    if (lowerMessage.contains('help')) {
      return 'I can help with basic conversations while offline. For advanced AI features, please connect to the internet.';
    }
    
    if (lowerMessage.contains('weather')) {
      return 'I can\'t check current weather data while offline. Please connect to the internet for real-time weather information.';
    }
    
    if (lowerMessage.contains('time') || lowerMessage.contains('date')) {
      final now = DateTime.now();
      return 'The current time is ${now.hour}:${now.minute.toString().padLeft(2, '0')} and today is ${now.day}/${now.month}/${now.year}.';
    }
    
    if (lowerMessage.contains('?')) {
      return 'That\'s a great question! While I\'m offline, my ability to provide detailed answers is limited. I\'d be happy to help more when you\'re connected to the internet.';
    }
    
    // Return a random predefined response
    final index = DateTime.now().millisecond % _predefinedResponses.length;
    return _predefinedResponses[index];
  }

  /// Analyze image using AI model
  Future<ImageAnalysis> _analyzeWithImageModel(Uint8List imageBytes, String? prompt) async {
    try {
      // Preprocess image
      final preprocessedImage = await _preprocessImage(imageBytes);
      
      // Run inference
      final inputShape = _imageModel!.getInputTensor(0).shape;
      final outputShape = _imageModel!.getOutputTensor(0).shape;
      
      final input = [preprocessedImage];
      final output = List.generate(outputShape[0], (i) => List.filled(outputShape[1], 0.0));
      
      _imageModel!.run(input, output);
      
      // Process results
      final predictions = output[0];
      final labels = _imageLabels!['labels'] as List<dynamic>;
      
      final results = <Map<String, dynamic>>[];
      for (int i = 0; i < predictions.length && i < labels.length; i++) {
        if (predictions[i] > 0.1) { // Confidence threshold
          results.add({
            'label': labels[i],
            'confidence': predictions[i],
          });
        }
      }
      
      // Sort by confidence
      results.sort((a, b) => (b['confidence'] as double).compareTo(a['confidence'] as double));
      
      final topResult = results.isNotEmpty ? results.first : null;
      
      return ImageAnalysis(
        id: 'offline_image_${DateTime.now().millisecondsSinceEpoch}',
        description: topResult != null 
            ? 'I can see what appears to be ${topResult['label']} in this image.'
            : 'I can see an image, but I\'m not confident about the specific contents while offline.',
        confidence: topResult?['confidence']?.toDouble() ?? 0.0,
        tags: results.take(5).map((r) => r['label'].toString()).toList(),
        objects: results.take(3).map((r) => {
          'name': r['label'],
          'confidence': r['confidence'],
          'bbox': [0.0, 0.0, 1.0, 1.0], // Placeholder bbox
        }).toList(),
        timestamp: DateTime.now(),
        isOffline: true,
      );
    } catch (e) {
      debugPrint('Model image analysis error: $e');
      return _generateFallbackImageAnalysis(imageBytes, prompt);
    }
  }

  /// Generate fallback image analysis
  ImageAnalysis _generateFallbackImageAnalysis(Uint8List imageBytes, String? prompt) {
    // Basic image properties
    final imageSize = imageBytes.length;
    final sizeDescription = imageSize > 1000000 ? 'high resolution' : 
                           imageSize > 100000 ? 'medium resolution' : 'low resolution';
    
    return ImageAnalysis(
      id: 'offline_basic_${DateTime.now().millisecondsSinceEpoch}',
      description: 'I can see a $sizeDescription image. For detailed analysis, please connect to the internet to use advanced AI vision capabilities.',
      confidence: 0.5,
      tags: ['image', sizeDescription],
      objects: [],
      timestamp: DateTime.now(),
      isOffline: true,
      metadata: {
        'file_size': imageSize,
        'format': 'image',
      },
    );
  }

  /// Preprocess image for model input
  Future<List<List<List<double>>>> _preprocessImage(Uint8List imageBytes) async {
    // This is a simplified preprocessing - in production, use proper image preprocessing
    // that matches your model's requirements (resize, normalize, etc.)
    
    // For now, return a placeholder tensor
    const imageSize = 224; // Common input size
    const channels = 3;
    
    return List.generate(
      imageSize,
      (i) => List.generate(
        imageSize,
        (j) => List.generate(channels, (k) => 0.0),
      ),
    );
  }

  /// Tokenize text for model input
  List<int> _tokenizeText(String text) {
    if (_textTokenizer == null) return [];
    
    // Simplified tokenization - implement based on your tokenizer
    final words = text.toLowerCase().split(' ');
    final vocab = _textTokenizer!['vocab'] as Map<String, dynamic>?;
    
    if (vocab == null) return [];
    
    return words.map((word) => vocab[word] as int? ?? 0).toList();
  }

  /// Prepare text input tensor
  List<List<int>> _prepareTextInput(List<int> tokens, List<int> shape) {
    final maxLength = shape[1];
    final paddedTokens = List<int>.filled(maxLength, 0);
    
    for (int i = 0; i < tokens.length && i < maxLength; i++) {
      paddedTokens[i] = tokens[i];
    }
    
    return [paddedTokens];
  }

  /// Decode model output
  List<int> _decodeOutput(List<double> output) {
    // Simple argmax decoding
    return output.map((logit) => logit > 0.5 ? 1 : 0).toList();
  }

  /// Detokenize to text
  String _detokenizeText(List<int> tokens) {
    if (_textTokenizer == null) return _predefinedResponses.first;
    
    final reverseVocab = <int, String>{};
    final vocab = _textTokenizer!['vocab'] as Map<String, dynamic>?;
    
    if (vocab != null) {
      for (final entry in vocab.entries) {
        reverseVocab[entry.value as int] = entry.key;
      }
    }
    
    final words = tokens.map((token) => reverseVocab[token] ?? '').where((word) => word.isNotEmpty).toList();
    
    return words.isEmpty ? _predefinedResponses.first : words.join(' ');
  }

  /// Check if models are available
  bool hasTextModel() => _textModel != null;
  bool hasImageModel() => _imageModel != null;

  /// Download and cache models for offline use
  Future<void> downloadModels() async {
    // Implementation for downloading and caching AI models
    // This would download models from a server and store them locally
    debugPrint('Model download feature not implemented yet');
  }

  /// Get model information
  Map<String, dynamic> getModelInfo() {
    return {
      'text_model_available': hasTextModel(),
      'image_model_available': hasImageModel(),
      'offline_mode': true,
      'capabilities': [
        'basic_conversation',
        'simple_image_classification',
        'rule_based_responses',
      ],
    };
  }

  /// Cleanup resources
  void dispose() {
    _textModel?.close();
    _imageModel?.close();
  }
}