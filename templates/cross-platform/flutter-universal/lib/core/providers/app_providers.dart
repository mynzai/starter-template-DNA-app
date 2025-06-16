import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';

import '../platform/platform_detector.dart';
import '../services/analytics_service.dart';
import '../services/notification_service.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/theme_service.dart';
import '../repositories/user_repository.dart';
import '../repositories/settings_repository.dart';

part 'app_providers.g.dart';

// Core Platform Provider
@riverpod
AppPlatform currentPlatform(CurrentPlatformRef ref) {
  return PlatformDetector.current;
}

@riverpod
PlatformCapabilities platformCapabilities(PlatformCapabilitiesRef ref) {
  return PlatformDetector.capabilities;
}

@riverpod
Future<DeviceInfo> deviceInfo(DeviceInfoRef ref) async {
  return await PlatformDetector.getDeviceInfo();
}

// Storage Providers
@riverpod
Future<SharedPreferences> sharedPreferences(SharedPreferencesRef ref) async {
  return await SharedPreferences.getInstance();
}

@riverpod
StorageService storageService(StorageServiceRef ref) {
  final sharedPrefs = ref.watch(sharedPreferencesProvider);
  return StorageService(sharedPrefs.value!);
}

// Network Providers
@riverpod
Dio dio(DioRef ref) {
  final dio = Dio();
  
  // Add interceptors
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        // Add authorization header if available
        final authService = ref.read(authServiceProvider);
        final token = authService.currentToken;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        // Handle global errors
        if (error.response?.statusCode == 401) {
          // Token expired, refresh or logout
          ref.read(authServiceProvider).logout();
        }
        handler.next(error);
      },
    ),
  );
  
  return dio;
}

@riverpod
ApiService apiService(ApiServiceRef ref) {
  final dio = ref.watch(dioProvider);
  return ApiService(dio);
}

// Core Services
@riverpod
AnalyticsService analyticsService(AnalyticsServiceRef ref) {
  return AnalyticsService();
}

@riverpod
NotificationService notificationService(NotificationServiceRef ref) {
  return NotificationService();
}

@riverpod
ThemeService themeService(ThemeServiceRef ref) {
  final storage = ref.watch(storageServiceProvider);
  return ThemeService(storage.value!);
}

@riverpod
AuthService authService(AuthServiceRef ref) {
  final api = ref.watch(apiServiceProvider);
  final storage = ref.watch(storageServiceProvider);
  final analytics = ref.watch(analyticsServiceProvider);
  
  return AuthService(
    apiService: api,
    storageService: storage.value!,
    analyticsService: analytics,
  );
}

// Repository Providers
@riverpod
UserRepository userRepository(UserRepositoryRef ref) {
  final api = ref.watch(apiServiceProvider);
  final storage = ref.watch(storageServiceProvider);
  
  return UserRepository(
    apiService: api,
    storageService: storage.value!,
  );
}

@riverpod
SettingsRepository settingsRepository(SettingsRepositoryRef ref) {
  final storage = ref.watch(storageServiceProvider);
  
  return SettingsRepository(
    storageService: storage.value!,
  );
}

// App State Providers
@riverpod
class AppState extends _$AppState {
  @override
  AppStateData build() {
    return const AppStateData();
  }
  
  void setLoading(bool loading) {
    state = state.copyWith(isLoading: loading);
  }
  
  void setError(String? error) {
    state = state.copyWith(error: error);
  }
  
  void clearError() {
    state = state.copyWith(error: null);
  }
}

class AppStateData {
  final bool isLoading;
  final String? error;
  final bool isOnline;
  
  const AppStateData({
    this.isLoading = false,
    this.error,
    this.isOnline = true,
  });
  
  AppStateData copyWith({
    bool? isLoading,
    String? error,
    bool? isOnline,
  }) {
    return AppStateData(
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      isOnline: isOnline ?? this.isOnline,
    );
  }
}

// User Authentication State
@riverpod
class AuthState extends _$AuthState {
  @override
  AuthStateData build() {
    // Initialize with stored auth state
    _initializeAuthState();
    return const AuthStateData();
  }
  
  void _initializeAuthState() async {
    final authService = ref.read(authServiceProvider);
    final isAuthenticated = await authService.isAuthenticated();
    
    if (isAuthenticated) {
      final user = await authService.getCurrentUser();
      state = AuthStateData(
        isAuthenticated: true,
        user: user,
      );
    }
  }
  
  void setAuthenticated(User user) {
    state = AuthStateData(
      isAuthenticated: true,
      user: user,
    );
  }
  
  void setUnauthenticated() {
    state = const AuthStateData(
      isAuthenticated: false,
      user: null,
    );
  }
}

class AuthStateData {
  final bool isAuthenticated;
  final User? user;
  
  const AuthStateData({
    this.isAuthenticated = false,
    this.user,
  });
}

class User {
  final String id;
  final String email;
  final String name;
  final String? avatar;
  final DateTime createdAt;
  
  const User({
    required this.id,
    required this.email,
    required this.name,
    this.avatar,
    required this.createdAt,
  });
  
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      avatar: json['avatar'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatar': avatar,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

// Theme State
@riverpod
class ThemeState extends _$ThemeState {
  @override
  ThemeStateData build() {
    _initializeTheme();
    return const ThemeStateData();
  }
  
  void _initializeTheme() async {
    final themeService = ref.read(themeServiceProvider.future);
    final theme = await (await themeService).getCurrentTheme();
    state = ThemeStateData(
      themeMode: theme.mode,
      primaryColor: theme.primaryColor,
      useMaterial3: theme.useMaterial3,
    );
  }
  
  void setThemeMode(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
    ref.read(themeServiceProvider.future).then((service) {
      service.setThemeMode(mode);
    });
  }
  
  void setPrimaryColor(int color) {
    state = state.copyWith(primaryColor: color);
    ref.read(themeServiceProvider.future).then((service) {
      service.setPrimaryColor(color);
    });
  }
  
  void setMaterial3(bool useMaterial3) {
    state = state.copyWith(useMaterial3: useMaterial3);
    ref.read(themeServiceProvider.future).then((service) {
      service.setMaterial3(useMaterial3);
    });
  }
}

class ThemeStateData {
  final ThemeMode themeMode;
  final int primaryColor;
  final bool useMaterial3;
  
  const ThemeStateData({
    this.themeMode = ThemeMode.system,
    this.primaryColor = 0xFF2196F3,
    this.useMaterial3 = true,
  });
  
  ThemeStateData copyWith({
    ThemeMode? themeMode,
    int? primaryColor,
    bool? useMaterial3,
  }) {
    return ThemeStateData(
      themeMode: themeMode ?? this.themeMode,
      primaryColor: primaryColor ?? this.primaryColor,
      useMaterial3: useMaterial3 ?? this.useMaterial3,
    );
  }
}

// Settings State
@riverpod
class SettingsState extends _$SettingsState {
  @override
  SettingsStateData build() {
    _initializeSettings();
    return const SettingsStateData();
  }
  
  void _initializeSettings() async {
    final settingsRepo = ref.read(settingsRepositoryProvider.future);
    final settings = await (await settingsRepo).getSettings();
    state = settings;
  }
  
  void updateSettings(SettingsStateData settings) {
    state = settings;
    ref.read(settingsRepositoryProvider.future).then((repo) {
      repo.saveSettings(settings);
    });
  }
}

class SettingsStateData {
  final bool enableNotifications;
  final bool enableAnalytics;
  final bool enableCrashReporting;
  final String language;
  final bool autoBackup;
  final int dataRetentionDays;
  
  const SettingsStateData({
    this.enableNotifications = true,
    this.enableAnalytics = true,
    this.enableCrashReporting = true,
    this.language = 'en',
    this.autoBackup = true,
    this.dataRetentionDays = 30,
  });
  
  SettingsStateData copyWith({
    bool? enableNotifications,
    bool? enableAnalytics,
    bool? enableCrashReporting,
    String? language,
    bool? autoBackup,
    int? dataRetentionDays,
  }) {
    return SettingsStateData(
      enableNotifications: enableNotifications ?? this.enableNotifications,
      enableAnalytics: enableAnalytics ?? this.enableAnalytics,
      enableCrashReporting: enableCrashReporting ?? this.enableCrashReporting,
      language: language ?? this.language,
      autoBackup: autoBackup ?? this.autoBackup,
      dataRetentionDays: dataRetentionDays ?? this.dataRetentionDays,
    );
  }
  
  factory SettingsStateData.fromJson(Map<String, dynamic> json) {
    return SettingsStateData(
      enableNotifications: json['enable_notifications'] ?? true,
      enableAnalytics: json['enable_analytics'] ?? true,
      enableCrashReporting: json['enable_crash_reporting'] ?? true,
      language: json['language'] ?? 'en',
      autoBackup: json['auto_backup'] ?? true,
      dataRetentionDays: json['data_retention_days'] ?? 30,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'enable_notifications': enableNotifications,
      'enable_analytics': enableAnalytics,
      'enable_crash_reporting': enableCrashReporting,
      'language': language,
      'auto_backup': autoBackup,
      'data_retention_days': dataRetentionDays,
    };
  }
}