import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../models/ai_message.dart';
import '../models/ai_response.dart';
import '../models/image_analysis.dart';
import '../constants/api_constants.dart';
import 'storage_service.dart';
import 'offline_ai_service.dart';

class AIService {
  static final AIService _instance = AIService._internal();
  static AIService get instance => _instance;
  AIService._internal();

  late Dio _dio;
  final StreamController<AIMessage> _messageController = StreamController<AIMessage>.broadcast();
  final OfflineAIService _offlineService = OfflineAIService();
  
  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;
  
  Stream<AIMessage> get messageStream => _messageController.stream;
  
  Future<void> init() async {
    if (_isInitialized) return;
    
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      headers: {
        'Content-Type': 'application/json',
      },
    ));
    
    // Add interceptors
    _dio.interceptors.add(LogInterceptor(
      requestBody: kDebugMode,
      responseBody: kDebugMode,
    ));
    
    // Initialize offline AI service
    await _offlineService.init();
    
    _isInitialized = true;
  }

  /// Send a text message to AI and get response
  Future<AIResponse> sendMessage({
    required String message,
    String? conversationId,
    Map<String, dynamic>? context,
  }) async {
    try {
      // Check connectivity
      final connectivity = await Connectivity().checkConnectivity();
      final isOnline = connectivity != ConnectivityResult.none;
      
      if (!isOnline) {
        // Use offline AI service
        return await _offlineService.generateResponse(
          message: message,
          context: context,
        );
      }
      
      final response = await _dio.post(
        '/chat/completions',
        data: {
          'message': message,
          'conversation_id': conversationId,
          'context': context,
          'stream': false,
        },
      );
      
      final aiResponse = AIResponse.fromJson(response.data);
      
      // Cache response for offline use
      await _cacheResponse(message, aiResponse);
      
      return aiResponse;
    } catch (e) {
      debugPrint('AI Service Error: $e');
      
      // Fallback to offline service
      return await _offlineService.generateResponse(
        message: message,
        context: context,
      );
    }
  }

  /// Stream chat messages with real-time responses
  Stream<AIMessage> streamChat({
    required String message,
    String? conversationId,
    Map<String, dynamic>? context,
  }) async* {
    try {
      // Check connectivity
      final connectivity = await Connectivity().checkConnectivity();
      final isOnline = connectivity != ConnectivityResult.none;
      
      if (!isOnline) {
        // Use offline streaming
        yield* _offlineService.streamResponse(
          message: message,
          context: context,
        );
        return;
      }
      
      final response = await _dio.post(
        '/chat/stream',
        data: {
          'message': message,
          'conversation_id': conversationId,
          'context': context,
        },
        options: Options(
          responseType: ResponseType.stream,
        ),
      );
      
      await for (final chunk in response.data.stream) {
        final lines = utf8.decode(chunk).split('\n');
        
        for (final line in lines) {
          if (line.startsWith('data: ')) {
            final data = line.substring(6);
            if (data == '[DONE]') break;
            
            try {
              final json = jsonDecode(data);
              final message = AIMessage.fromJson(json);
              yield message;
            } catch (e) {
              debugPrint('Error parsing stream data: $e');
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Stream Error: $e');
      
      // Fallback to offline streaming
      yield* _offlineService.streamResponse(
        message: message,
        context: context,
      );
    }
  }

  /// Analyze image with AI
  Future<ImageAnalysis> analyzeImage({
    required Uint8List imageBytes,
    String? prompt,
    Map<String, dynamic>? context,
  }) async {
    try {
      // Check connectivity
      final connectivity = await Connectivity().checkConnectivity();
      final isOnline = connectivity != ConnectivityResult.none;
      
      if (!isOnline) {
        // Use offline image analysis
        return await _offlineService.analyzeImageOffline(
          imageBytes: imageBytes,
          prompt: prompt,
        );
      }
      
      final formData = FormData.fromMap({
        'image': MultipartFile.fromBytes(
          imageBytes,
          filename: 'image.jpg',
        ),
        'prompt': prompt ?? 'Analyze this image',
        'context': jsonEncode(context ?? {}),
      });
      
      final response = await _dio.post(
        '/vision/analyze',
        data: formData,
      );
      
      final analysis = ImageAnalysis.fromJson(response.data);
      
      // Cache analysis for offline use
      await _cacheImageAnalysis(imageBytes, analysis);
      
      return analysis;
    } catch (e) {
      debugPrint('Image Analysis Error: $e');
      
      // Fallback to offline analysis
      return await _offlineService.analyzeImageOffline(
        imageBytes: imageBytes,
        prompt: prompt,
      );
    }
  }

  /// Get conversation history
  Future<List<AIMessage>> getConversationHistory(String conversationId) async {
    try {
      final response = await _dio.get('/conversations/$conversationId/messages');
      
      final List<dynamic> data = response.data['messages'];
      return data.map((json) => AIMessage.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error getting conversation history: $e');
      
      // Return cached history
      return await StorageService.instance.getConversationHistory(conversationId);
    }
  }

  /// Create new conversation
  Future<String> createConversation({
    String? title,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final response = await _dio.post('/conversations', data: {
        'title': title,
        'metadata': metadata,
      });
      
      return response.data['conversation_id'];
    } catch (e) {
      debugPrint('Error creating conversation: $e');
      
      // Generate local conversation ID
      return 'local_${DateTime.now().millisecondsSinceEpoch}';
    }
  }

  /// Update conversation metadata
  Future<void> updateConversation({
    required String conversationId,
    String? title,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _dio.patch('/conversations/$conversationId', data: {
        'title': title,
        'metadata': metadata,
      });
    } catch (e) {
      debugPrint('Error updating conversation: $e');
    }
  }

  /// Delete conversation
  Future<void> deleteConversation(String conversationId) async {
    try {
      await _dio.delete('/conversations/$conversationId');
      
      // Also delete local cache
      await StorageService.instance.deleteConversation(conversationId);
    } catch (e) {
      debugPrint('Error deleting conversation: $e');
      
      // Delete local cache anyway
      await StorageService.instance.deleteConversation(conversationId);
    }
  }

  /// Get available AI models
  Future<List<Map<String, dynamic>>> getAvailableModels() async {
    try {
      final response = await _dio.get('/models');
      return List<Map<String, dynamic>>.from(response.data['models']);
    } catch (e) {
      debugPrint('Error getting models: $e');
      return [
        {
          'id': 'offline-model',
          'name': 'Offline AI Model',
          'description': 'Local AI model for offline use',
          'capabilities': ['text', 'basic-vision'],
        }
      ];
    }
  }

  /// Cache response for offline use
  Future<void> _cacheResponse(String message, AIResponse response) async {
    try {
      await StorageService.instance.cacheAIResponse(message, response);
    } catch (e) {
      debugPrint('Error caching response: $e');
    }
  }

  /// Cache image analysis for offline use
  Future<void> _cacheImageAnalysis(Uint8List imageBytes, ImageAnalysis analysis) async {
    try {
      await StorageService.instance.cacheImageAnalysis(imageBytes, analysis);
    } catch (e) {
      debugPrint('Error caching image analysis: $e');
    }
  }

  /// Sync offline data when online
  Future<void> syncOfflineData() async {
    try {
      final connectivity = await Connectivity().checkConnectivity();
      if (connectivity == ConnectivityResult.none) return;
      
      // Get pending offline data
      final pendingMessages = await StorageService.instance.getPendingMessages();
      
      for (final message in pendingMessages) {
        try {
          await sendMessage(
            message: message['content'],
            conversationId: message['conversation_id'],
          );
          
          // Mark as synced
          await StorageService.instance.markMessageSynced(message['id']);
        } catch (e) {
          debugPrint('Error syncing message: $e');
        }
      }
    } catch (e) {
      debugPrint('Error syncing offline data: $e');
    }
  }

  /// Cleanup resources
  void dispose() {
    _messageController.close();
    _offlineService.dispose();
  }
}