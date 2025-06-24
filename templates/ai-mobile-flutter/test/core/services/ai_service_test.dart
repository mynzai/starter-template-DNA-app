import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:typed_data';

import 'package:ai_mobile_assistant/core/services/ai_service.dart';
import 'package:ai_mobile_assistant/core/services/storage_service.dart';
import 'package:ai_mobile_assistant/core/services/offline_ai_service.dart';
import 'package:ai_mobile_assistant/core/models/ai_response.dart';
import 'package:ai_mobile_assistant/core/models/ai_message.dart';
import 'package:ai_mobile_assistant/core/models/image_analysis.dart';

import 'ai_service_test.mocks.dart';

@GenerateMocks([Dio, Connectivity, StorageService, OfflineAIService])
void main() {
  group('AIService Tests', () {
    late AIService aiService;
    late MockDio mockDio;
    late MockConnectivity mockConnectivity;
    late MockStorageService mockStorageService;
    late MockOfflineAIService mockOfflineService;

    setUp(() {
      mockDio = MockDio();
      mockConnectivity = MockConnectivity();
      mockStorageService = MockStorageService();
      mockOfflineService = MockOfflineAIService();
      
      aiService = AIService.instance;
      // Inject mocks (would need dependency injection setup)
    });

    group('Initialization', () {
      test('should initialize successfully', () async {
        // Arrange
        when(mockOfflineService.init()).thenAnswer((_) async => {});
        
        // Act
        await aiService.init();
        
        // Assert
        expect(aiService.isInitialized, isTrue);
      });

      test('should handle initialization errors gracefully', () async {
        // Arrange
        when(mockOfflineService.init()).thenThrow(Exception('Init error'));
        
        // Act & Assert
        expect(() => aiService.init(), throwsException);
      });
    });

    group('Send Message', () {
      test('should send message successfully when online', () async {
        // Arrange
        const message = 'Hello AI';
        const conversationId = 'conv-123';
        
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.wifi);
        
        when(mockDio.post(any, data: anyNamed('data')))
            .thenAnswer((_) async => Response(
              data: {
                'id': 'response-123',
                'content': 'Hello! How can I help you?',
                'timestamp': DateTime.now().toIso8601String(),
                'provider': 'openai',
                'model': 'gpt-4',
                'tokens': 25,
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: '/chat/completions'),
            ));
        
        when(mockStorageService.cacheAIResponse(any, any))
            .thenAnswer((_) async => {});
        
        // Act
        final response = await aiService.sendMessage(
          message: message,
          conversationId: conversationId,
        );
        
        // Assert
        expect(response, isA<AIResponse>());
        expect(response.content, equals('Hello! How can I help you?'));
        expect(response.provider, equals('openai'));
        verify(mockDio.post('/chat/completions', data: anyNamed('data'))).called(1);
      });

      test('should use offline service when no connectivity', () async {
        // Arrange
        const message = 'Hello AI';
        
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.none);
        
        final offlineResponse = AIResponse(
          id: 'offline-123',
          content: 'Offline response',
          timestamp: DateTime.now(),
          provider: 'offline',
          model: 'offline-model',
          tokens: 0,
          isOffline: true,
        );
        
        when(mockOfflineService.generateResponse(
          message: anyNamed('message'),
          context: anyNamed('context'),
        )).thenAnswer((_) async => offlineResponse);
        
        // Act
        final response = await aiService.sendMessage(message: message);
        
        // Assert
        expect(response, isA<AIResponse>());
        expect(response.isOffline, isTrue);
        expect(response.provider, equals('offline'));
        verify(mockOfflineService.generateResponse(
          message: message,
          context: anyNamed('context'),
        )).called(1);
      });

      test('should fallback to offline service on network error', () async {
        // Arrange
        const message = 'Hello AI';
        
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.wifi);
        
        when(mockDio.post(any, data: anyNamed('data')))
            .thenThrow(DioException(
              requestOptions: RequestOptions(path: '/chat/completions'),
              message: 'Network error',
            ));
        
        final offlineResponse = AIResponse(
          id: 'offline-123',
          content: 'Fallback response',
          timestamp: DateTime.now(),
          provider: 'offline',
          model: 'offline-model',
          tokens: 0,
          isOffline: true,
        );
        
        when(mockOfflineService.generateResponse(
          message: anyNamed('message'),
          context: anyNamed('context'),
        )).thenAnswer((_) async => offlineResponse);
        
        // Act
        final response = await aiService.sendMessage(message: message);
        
        // Assert
        expect(response, isA<AIResponse>());
        expect(response.isOffline, isTrue);
        verify(mockOfflineService.generateResponse(
          message: message,
          context: anyNamed('context'),
        )).called(1);
      });
    });

    group('Stream Chat', () {
      test('should stream messages when online', () async {
        // Arrange
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.wifi);
        
        const mockStreamData = '''
data: {"id": "msg-1", "role": "assistant", "content": "Hello", "timestamp": "2023-01-01T00:00:00Z", "isPartial": true}

data: {"id": "msg-2", "role": "assistant", "content": "Hello there!", "timestamp": "2023-01-01T00:00:01Z", "isPartial": false}

data: [DONE]
''';
        
        when(mockDio.post(any, data: anyNamed('data'), options: anyNamed('options')))
            .thenAnswer((_) async => Response(
              data: Stream.fromIterable([mockStreamData.codeUnits]),
              statusCode: 200,
              requestOptions: RequestOptions(path: '/chat/stream'),
            ));
        
        // Act
        final stream = aiService.streamChat(message: 'Hello');
        final messages = await stream.toList();
        
        // Assert
        expect(messages, hasLength(2));
        expect(messages.first.content, equals('Hello'));
        expect(messages.first.isPartial, isTrue);
        expect(messages.last.content, equals('Hello there!'));
        expect(messages.last.isPartial, isFalse);
      });

      test('should use offline streaming when no connectivity', () async {
        // Arrange
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.none);
        
        final offlineMessages = [
          AIMessage(
            id: 'offline-1',
            role: MessageRole.assistant,
            content: 'Offline',
            timestamp: DateTime.now(),
            isPartial: true,
            isOffline: true,
          ),
          AIMessage(
            id: 'offline-2',
            role: MessageRole.assistant,
            content: 'Offline response',
            timestamp: DateTime.now(),
            isPartial: false,
            isOffline: true,
          ),
        ];
        
        when(mockOfflineService.streamResponse(
          message: anyNamed('message'),
          context: anyNamed('context'),
        )).thenAnswer((_) => Stream.fromIterable(offlineMessages));
        
        // Act
        final stream = aiService.streamChat(message: 'Hello');
        final messages = await stream.toList();
        
        // Assert
        expect(messages, hasLength(2));
        expect(messages.every((m) => m.isOffline == true), isTrue);
        verify(mockOfflineService.streamResponse(
          message: 'Hello',
          context: anyNamed('context'),
        )).called(1);
      });
    });

    group('Image Analysis', () {
      test('should analyze image successfully when online', () async {
        // Arrange
        final imageBytes = Uint8List.fromList([1, 2, 3, 4, 5]);
        const prompt = 'Analyze this image';
        
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.wifi);
        
        when(mockDio.post(any, data: anyNamed('data')))
            .thenAnswer((_) async => Response(
              data: {
                'id': 'analysis-123',
                'description': 'This is a test image',
                'confidence': 0.95,
                'tags': ['test', 'image'],
                'objects': [],
                'timestamp': DateTime.now().toIso8601String(),
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: '/vision/analyze'),
            ));
        
        when(mockStorageService.cacheImageAnalysis(any, any))
            .thenAnswer((_) async => {});
        
        // Act
        final analysis = await aiService.analyzeImage(
          imageBytes: imageBytes,
          prompt: prompt,
        );
        
        // Assert
        expect(analysis, isA<ImageAnalysis>());
        expect(analysis.description, equals('This is a test image'));
        expect(analysis.confidence, equals(0.95));
        expect(analysis.tags, contains('test'));
        verify(mockDio.post('/vision/analyze', data: anyNamed('data'))).called(1);
      });

      test('should use offline analysis when no connectivity', () async {
        // Arrange
        final imageBytes = Uint8List.fromList([1, 2, 3, 4, 5]);
        const prompt = 'Analyze this image';
        
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.none);
        
        final offlineAnalysis = ImageAnalysis(
          id: 'offline-analysis-123',
          description: 'Offline image analysis',
          confidence: 0.5,
          tags: ['offline'],
          objects: [],
          timestamp: DateTime.now(),
          isOffline: true,
        );
        
        when(mockOfflineService.analyzeImageOffline(
          imageBytes: anyNamed('imageBytes'),
          prompt: anyNamed('prompt'),
        )).thenAnswer((_) async => offlineAnalysis);
        
        // Act
        final analysis = await aiService.analyzeImage(
          imageBytes: imageBytes,
          prompt: prompt,
        );
        
        // Assert
        expect(analysis, isA<ImageAnalysis>());
        expect(analysis.isOffline, isTrue);
        expect(analysis.description, contains('Offline'));
        verify(mockOfflineService.analyzeImageOffline(
          imageBytes: imageBytes,
          prompt: prompt,
        )).called(1);
      });
    });

    group('Conversation Management', () {
      test('should get conversation history successfully', () async {
        // Arrange
        const conversationId = 'conv-123';
        final mockMessages = [
          {
            'id': 'msg-1',
            'role': 'user',
            'content': 'Hello',
            'timestamp': DateTime.now().toIso8601String(),
          },
          {
            'id': 'msg-2',
            'role': 'assistant',
            'content': 'Hi there!',
            'timestamp': DateTime.now().toIso8601String(),
          },
        ];
        
        when(mockDio.get('/conversations/$conversationId/messages'))
            .thenAnswer((_) async => Response(
              data: {'messages': mockMessages},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/conversations/$conversationId/messages'),
            ));
        
        // Act
        final history = await aiService.getConversationHistory(conversationId);
        
        // Assert
        expect(history, hasLength(2));
        expect(history.first.content, equals('Hello'));
        expect(history.last.content, equals('Hi there!'));
      });

      test('should create new conversation successfully', () async {
        // Arrange
        const title = 'Test Conversation';
        final metadata = {'type': 'chat'};
        
        when(mockDio.post('/conversations', data: anyNamed('data')))
            .thenAnswer((_) async => Response(
              data: {'conversation_id': 'conv-new-123'},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/conversations'),
            ));
        
        // Act
        final conversationId = await aiService.createConversation(
          title: title,
          metadata: metadata,
        );
        
        // Assert
        expect(conversationId, equals('conv-new-123'));
        verify(mockDio.post('/conversations', data: {
          'title': title,
          'metadata': metadata,
        })).called(1);
      });

      test('should generate local conversation ID on network error', () async {
        // Arrange
        when(mockDio.post('/conversations', data: anyNamed('data')))
            .thenThrow(DioException(
              requestOptions: RequestOptions(path: '/conversations'),
              message: 'Network error',
            ));
        
        // Act
        final conversationId = await aiService.createConversation();
        
        // Assert
        expect(conversationId, startsWith('local_'));
      });
    });

    group('Sync Operations', () {
      test('should sync offline data when online', () async {
        // Arrange
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.wifi);
        
        final pendingMessages = [
          {
            'id': 'pending-1',
            'content': 'Offline message',
            'conversation_id': 'conv-123',
          },
        ];
        
        when(mockStorageService.getPendingMessages())
            .thenAnswer((_) async => pendingMessages);
        
        when(mockDio.post(any, data: anyNamed('data')))
            .thenAnswer((_) async => Response(
              data: {
                'id': 'response-123',
                'content': 'Synced response',
                'timestamp': DateTime.now().toIso8601String(),
                'provider': 'openai',
                'model': 'gpt-4',
                'tokens': 25,
              },
              statusCode: 200,
              requestOptions: RequestOptions(path: '/chat/completions'),
            ));
        
        when(mockStorageService.markMessageSynced(any))
            .thenAnswer((_) async => {});
        
        when(mockStorageService.cacheAIResponse(any, any))
            .thenAnswer((_) async => {});
        
        // Act
        await aiService.syncOfflineData();
        
        // Assert
        verify(mockStorageService.getPendingMessages()).called(1);
        verify(mockStorageService.markMessageSynced('pending-1')).called(1);
      });

      test('should skip sync when offline', () async {
        // Arrange
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.none);
        
        // Act
        await aiService.syncOfflineData();
        
        // Assert
        verifyNever(mockStorageService.getPendingMessages());
      });
    });

    group('Error Handling', () {
      test('should handle network timeouts gracefully', () async {
        // Arrange
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.wifi);
        
        when(mockDio.post(any, data: anyNamed('data')))
            .thenThrow(DioException(
              requestOptions: RequestOptions(path: '/chat/completions'),
              type: DioExceptionType.connectionTimeout,
              message: 'Timeout',
            ));
        
        final offlineResponse = AIResponse(
          id: 'offline-123',
          content: 'Timeout fallback response',
          timestamp: DateTime.now(),
          provider: 'offline',
          model: 'offline-model',
          tokens: 0,
          isOffline: true,
        );
        
        when(mockOfflineService.generateResponse(
          message: anyNamed('message'),
          context: anyNamed('context'),
        )).thenAnswer((_) async => offlineResponse);
        
        // Act
        final response = await aiService.sendMessage(message: 'Test');
        
        // Assert
        expect(response.isOffline, isTrue);
        expect(response.content, contains('fallback'));
      });

      test('should handle malformed API responses', () async {
        // Arrange
        when(mockConnectivity.checkConnectivity())
            .thenAnswer((_) async => ConnectivityResult.wifi);
        
        when(mockDio.post(any, data: anyNamed('data')))
            .thenAnswer((_) async => Response(
              data: {'invalid': 'response'},
              statusCode: 200,
              requestOptions: RequestOptions(path: '/chat/completions'),
            ));
        
        // Act & Assert
        expect(
          () => aiService.sendMessage(message: 'Test'),
          throwsException,
        );
      });
    });
  });
}