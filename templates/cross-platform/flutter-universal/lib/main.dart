import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:window_manager/window_manager.dart';

import 'core/app.dart';
import 'core/platform/platform_detector.dart';
import 'core/platform/platform_config.dart';
import 'core/services/analytics_service.dart';
import 'core/services/notification_service.dart';
import 'core/utils/logger.dart';

void main() async {
  await runZonedGuarded<Future<void>>(() async {
    WidgetsFlutterBinding.ensureInitialized();
    
    // Initialize platform-specific configurations
    await _initializePlatform();
    
    // Initialize Firebase
    await _initializeFirebase();
    
    // Initialize local storage
    await _initializeHive();
    
    // Initialize services
    await _initializeServices();
    
    // Set up crash reporting
    await _initializeCrashReporting();
    
    runApp(
      ProviderScope(
        child: UniversalBusinessApp(),
      ),
    );
  }, (error, stack) {
    AppLogger.error('Uncaught error: $error', stackTrace: stack);
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
  });
}

Future<void> _initializePlatform() async {
  final platform = PlatformDetector.current;
  AppLogger.info('Starting app on platform: ${platform.name}');
  
  // Platform-specific initialization
  switch (platform) {
    case AppPlatform.windows:
    case AppPlatform.macos:
    case AppPlatform.linux:
      await _initializeDesktop();
      break;
    case AppPlatform.android:
    case AppPlatform.ios:
      await _initializeMobile();
      break;
    case AppPlatform.web:
      await _initializeWeb();
      break;
  }
  
  // Set preferred orientations for mobile
  if (platform.isMobile) {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }
}

Future<void> _initializeDesktop() async {
  if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
    await windowManager.ensureInitialized();
    
    const windowOptions = WindowOptions(
      size: Size(1200, 800),
      minimumSize: Size(800, 600),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.normal,
      title: 'Universal Business Suite',
    );
    
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }
}

Future<void> _initializeMobile() async {
  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
}

Future<void> _initializeWeb() async {
  // Web-specific initialization
  AppLogger.info('Initializing web platform');
}

Future<void> _initializeFirebase() async {
  try {
    if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
      await Firebase.initializeApp();
      AppLogger.info('Firebase initialized successfully');
    }
  } catch (e) {
    AppLogger.error('Firebase initialization failed: $e');
  }
}

Future<void> _initializeHive() async {
  try {
    await Hive.initFlutter();
    
    // Register adapters here
    // Hive.registerAdapter(UserAdapter());
    
    AppLogger.info('Hive initialized successfully');
  } catch (e) {
    AppLogger.error('Hive initialization failed: $e');
  }
}

Future<void> _initializeServices() async {
  try {
    // Initialize analytics
    await AnalyticsService.initialize();
    
    // Initialize notifications
    await NotificationService.initialize();
    
    AppLogger.info('Services initialized successfully');
  } catch (e) {
    AppLogger.error('Services initialization failed: $e');
  }
}

Future<void> _initializeCrashReporting() async {
  if (!kDebugMode) {
    try {
      // Pass all uncaught "fatal" errors from the framework to Crashlytics
      FlutterError.onError = (errorDetails) {
        FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
      };
      
      // Pass all uncaught asynchronous errors that aren't handled by the Flutter framework to Crashlytics
      PlatformDispatcher.instance.onError = (error, stack) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
        return true;
      };
      
      AppLogger.info('Crash reporting initialized');
    } catch (e) {
      AppLogger.error('Crash reporting initialization failed: $e');
    }
  }
}

// Zone guarded wrapper for error handling
Future<void> runZonedGuarded<T>(Future<T> Function() body, Function(Object, StackTrace) onError) async {
  await runZonedGuarded(body, onError);
}