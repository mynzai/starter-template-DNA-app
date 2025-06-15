import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

import '../models/ai_notification.dart';
import 'storage_service.dart';
import 'ai_service.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  static NotificationService get instance => _instance;
  NotificationService._internal();

  late FirebaseMessaging _firebaseMessaging;
  late FlutterLocalNotificationsPlugin _localNotifications;
  
  final StreamController<AINotification> _notificationController = 
      StreamController<AINotification>.broadcast();
      
  bool _isInitialized = false;
  String? _fcmToken;
  
  // Notification settings
  bool _aiInsightsEnabled = true;
  bool _conversationUpdatesEnabled = true;
  bool _systemNotificationsEnabled = true;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  
  // Getters
  bool get isInitialized => _isInitialized;
  String? get fcmToken => _fcmToken;
  Stream<AINotification> get notificationStream => _notificationController.stream;

  /// Initialize notification service
  Future<void> init() async {
    if (_isInitialized) return;

    try {
      // Initialize Firebase Messaging
      _firebaseMessaging = FirebaseMessaging.instance;
      
      // Initialize Local Notifications
      _localNotifications = FlutterLocalNotificationsPlugin();
      
      // Setup local notifications
      await _setupLocalNotifications();
      
      // Request permissions
      await _requestNotificationPermissions();
      
      // Get FCM token
      await _getFCMToken();
      
      // Setup message handlers
      _setupMessageHandlers();
      
      // Load saved settings
      await _loadNotificationSettings();
      
      // Schedule periodic AI insights
      _schedulePeriodicInsights();
      
      _isInitialized = true;
      debugPrint('Notification Service initialized successfully');
    } catch (e) {
      debugPrint('Notification Service initialization error: $e');
      rethrow;
    }
  }

  /// Setup local notifications
  Future<void> _setupLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels for Android
    if (Platform.isAndroid) {
      await _createNotificationChannels();
    }
  }

  /// Create notification channels for Android
  Future<void> _createNotificationChannels() async {
    const aiInsightsChannel = AndroidNotificationChannel(
      'ai_insights',
      'AI Insights',
      description: 'Notifications for AI-generated insights and recommendations',
      importance: Importance.defaultImportance,
      sound: RawResourceAndroidNotificationSound('notification_sound'),
    );

    const conversationChannel = AndroidNotificationChannel(
      'conversations',
      'Conversations',
      description: 'Updates about your conversations and messages',
      importance: Importance.high,
    );

    const systemChannel = AndroidNotificationChannel(
      'system',
      'System',
      description: 'Important system notifications and updates',
      importance: Importance.max,
    );

    final plugin = _localNotifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    
    if (plugin != null) {
      await plugin.createNotificationChannel(aiInsightsChannel);
      await plugin.createNotificationChannel(conversationChannel);
      await plugin.createNotificationChannel(systemChannel);
    }
  }

  /// Request notification permissions
  Future<bool> _requestNotificationPermissions() async {
    try {
      // Request Firebase Messaging permissions
      final settings = await _firebaseMessaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      // Request local notification permissions
      if (Platform.isAndroid) {
        final status = await Permission.notification.request();
        return status.isGranted && settings.authorizationStatus == AuthorizationStatus.authorized;
      } else {
        return settings.authorizationStatus == AuthorizationStatus.authorized;
      }
    } catch (e) {
      debugPrint('Permission request error: $e');
      return false;
    }
  }

  /// Get FCM token
  Future<void> _getFCMToken() async {
    try {
      _fcmToken = await _firebaseMessaging.getToken();
      debugPrint('FCM Token: $_fcmToken');
      
      // Save token to storage for server communication
      if (_fcmToken != null) {
        await StorageService.instance.saveFCMToken(_fcmToken!);
      }
      
      // Listen for token refresh
      _firebaseMessaging.onTokenRefresh.listen((token) async {
        _fcmToken = token;
        await StorageService.instance.saveFCMToken(token);
      });
    } catch (e) {
      debugPrint('FCM token error: $e');
    }
  }

  /// Setup message handlers
  void _setupMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    
    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
    
    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
    
    // Handle notification tap when app was terminated
    _firebaseMessaging.getInitialMessage().then((message) {
      if (message != null) {
        _handleNotificationTap(message);
      }
    });
  }

  /// Handle foreground messages
  void _handleForegroundMessage(RemoteMessage message) async {
    debugPrint('Foreground message: ${message.messageId}');
    
    final notification = AINotification.fromRemoteMessage(message);
    _notificationController.add(notification);
    
    // Show local notification
    await _showLocalNotification(notification);
    
    // Save to storage
    await StorageService.instance.saveNotification(notification);
  }

  /// Handle notification tap
  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('Notification tapped: ${message.messageId}');
    
    final notification = AINotification.fromRemoteMessage(message);
    _processNotificationAction(notification);
  }

  /// Handle local notification tap
  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('Local notification tapped: ${response.id}');
    
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!);
        final notification = AINotification.fromJson(data);
        _processNotificationAction(notification);
      } catch (e) {
        debugPrint('Error processing notification payload: $e');
      }
    }
  }

  /// Show local notification
  Future<void> _showLocalNotification(AINotification notification) async {
    if (!_shouldShowNotification(notification)) return;

    try {
      const androidDetails = AndroidNotificationDetails(
        'ai_insights',
        'AI Insights',
        channelDescription: 'AI-generated insights and recommendations',
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
        icon: '@mipmap/ic_launcher',
        color: Color(0xFF2196F3),
        enableVibration: true,
        playSound: true,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        sound: 'default',
      );

      const details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _localNotifications.show(
        notification.id.hashCode,
        notification.title,
        notification.body,
        details,
        payload: jsonEncode(notification.toJson()),
      );
    } catch (e) {
      debugPrint('Show local notification error: $e');
    }
  }

  /// Check if notification should be shown
  bool _shouldShowNotification(AINotification notification) {
    switch (notification.type) {
      case AINotificationType.insight:
        return _aiInsightsEnabled;
      case AINotificationType.conversation:
        return _conversationUpdatesEnabled;
      case AINotificationType.system:
        return _systemNotificationsEnabled;
      default:
        return true;
    }
  }

  /// Process notification action
  void _processNotificationAction(AINotification notification) {
    // Handle different notification actions based on type and data
    switch (notification.action) {
      case 'open_chat':
        // Navigate to chat screen
        break;
      case 'open_camera':
        // Navigate to camera screen
        break;
      case 'view_insight':
        // Navigate to insights screen
        break;
      default:
        // Default action - open main screen
        break;
    }
  }

  /// Send AI insight notification
  Future<void> sendAIInsightNotification({
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    if (!_aiInsightsEnabled) return;

    final notification = AINotification(
      id: 'ai_insight_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      body: body,
      type: AINotificationType.insight,
      timestamp: DateTime.now(),
      data: data ?? {},
    );

    await _showLocalNotification(notification);
    await StorageService.instance.saveNotification(notification);
    _notificationController.add(notification);
  }

  /// Send conversation update notification
  Future<void> sendConversationNotification({
    required String conversationId,
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    if (!_conversationUpdatesEnabled) return;

    final notification = AINotification(
      id: 'conversation_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      body: body,
      type: AINotificationType.conversation,
      timestamp: DateTime.now(),
      data: {
        'conversation_id': conversationId,
        ...data ?? {},
      },
      action: 'open_chat',
    );

    await _showLocalNotification(notification);
    await StorageService.instance.saveNotification(notification);
    _notificationController.add(notification);
  }

  /// Schedule periodic AI insights
  void _schedulePeriodicInsights() {
    Timer.periodic(const Duration(hours: 6), (timer) async {
      try {
        if (!_aiInsightsEnabled) return;
        
        // Generate AI insight based on recent activity
        final insight = await _generatePeriodicInsight();
        if (insight != null) {
          await sendAIInsightNotification(
            title: insight['title'],
            body: insight['body'],
            data: insight['data'],
          );
        }
      } catch (e) {
        debugPrint('Periodic insight error: $e');
      }
    });
  }

  /// Generate periodic AI insight
  Future<Map<String, dynamic>?> _generatePeriodicInsight() async {
    try {
      // Get recent activity data
      final recentConversations = await StorageService.instance.getRecentConversations(limit: 10);
      final recentImages = await StorageService.instance.getCameraCaptures(limit: 5);
      
      if (recentConversations.isEmpty && recentImages.isEmpty) {
        return null;
      }
      
      // Generate insight using AI
      final prompt = '''
      Based on recent user activity, generate a helpful insight or tip:
      - ${recentConversations.length} recent conversations
      - ${recentImages.length} recent images analyzed
      
      Provide a brief, actionable insight that would be valuable to the user.
      Format as JSON: {"title": "...", "body": "...", "type": "tip|reminder|suggestion"}
      ''';
      
      final response = await AIService.instance.sendMessage(
        message: prompt,
        context: {
          'type': 'insight_generation',
          'activity_summary': {
            'conversations': recentConversations.length,
            'images': recentImages.length,
          },
        },
      );
      
      final insight = jsonDecode(response.content);
      return {
        'title': insight['title'] ?? 'AI Insight',
        'body': insight['body'] ?? 'Check out your recent activity!',
        'data': {
          'type': insight['type'] ?? 'tip',
          'generated_at': DateTime.now().toIso8601String(),
        },
      };
    } catch (e) {
      debugPrint('Generate insight error: $e');
      return null;
    }
  }

  /// Update notification settings
  Future<void> updateNotificationSettings({
    bool? aiInsightsEnabled,
    bool? conversationUpdatesEnabled,
    bool? systemNotificationsEnabled,
    bool? soundEnabled,
    bool? vibrationEnabled,
  }) async {
    if (aiInsightsEnabled != null) _aiInsightsEnabled = aiInsightsEnabled;
    if (conversationUpdatesEnabled != null) _conversationUpdatesEnabled = conversationUpdatesEnabled;
    if (systemNotificationsEnabled != null) _systemNotificationsEnabled = systemNotificationsEnabled;
    if (soundEnabled != null) _soundEnabled = soundEnabled;
    if (vibrationEnabled != null) _vibrationEnabled = vibrationEnabled;

    await _saveNotificationSettings();
  }

  /// Get notification settings
  Map<String, bool> getNotificationSettings() {
    return {
      'ai_insights_enabled': _aiInsightsEnabled,
      'conversation_updates_enabled': _conversationUpdatesEnabled,
      'system_notifications_enabled': _systemNotificationsEnabled,
      'sound_enabled': _soundEnabled,
      'vibration_enabled': _vibrationEnabled,
    };
  }

  /// Get notification history
  Future<List<AINotification>> getNotificationHistory({int limit = 50}) async {
    try {
      return await StorageService.instance.getNotifications(limit: limit);
    } catch (e) {
      debugPrint('Get notification history error: $e');
      return [];
    }
  }

  /// Mark notification as read
  Future<void> markNotificationAsRead(String notificationId) async {
    try {
      await StorageService.instance.markNotificationAsRead(notificationId);
    } catch (e) {
      debugPrint('Mark notification as read error: $e');
    }
  }

  /// Clear all notifications
  Future<void> clearAllNotifications() async {
    try {
      await _localNotifications.cancelAll();
      await StorageService.instance.clearNotifications();
    } catch (e) {
      debugPrint('Clear notifications error: $e');
    }
  }

  /// Load notification settings
  Future<void> _loadNotificationSettings() async {
    try {
      final settings = await StorageService.instance.getNotificationSettings();
      
      _aiInsightsEnabled = settings['ai_insights_enabled'] ?? true;
      _conversationUpdatesEnabled = settings['conversation_updates_enabled'] ?? true;
      _systemNotificationsEnabled = settings['system_notifications_enabled'] ?? true;
      _soundEnabled = settings['sound_enabled'] ?? true;
      _vibrationEnabled = settings['vibration_enabled'] ?? true;
    } catch (e) {
      debugPrint('Load notification settings error: $e');
    }
  }

  /// Save notification settings
  Future<void> _saveNotificationSettings() async {
    try {
      await StorageService.instance.saveNotificationSettings({
        'ai_insights_enabled': _aiInsightsEnabled,
        'conversation_updates_enabled': _conversationUpdatesEnabled,
        'system_notifications_enabled': _systemNotificationsEnabled,
        'sound_enabled': _soundEnabled,
        'vibration_enabled': _vibrationEnabled,
      });
    } catch (e) {
      debugPrint('Save notification settings error: $e');
    }
  }

  /// Cleanup resources
  void dispose() {
    _notificationController.close();
  }
}

/// Background message handler
@pragma('vm:entry-point')
Future<void> _handleBackgroundMessage(RemoteMessage message) async {
  debugPrint('Background message: ${message.messageId}');
  
  // Save notification to storage for when app opens
  final notification = AINotification.fromRemoteMessage(message);
  await StorageService.instance.saveNotification(notification);
}