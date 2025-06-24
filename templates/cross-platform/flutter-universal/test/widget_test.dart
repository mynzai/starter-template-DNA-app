import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:golden_toolkit/golden_toolkit.dart';
import 'package:mocktail/mocktail.dart';

import 'package:flutter_universal_suite/core/app.dart';
import 'package:flutter_universal_suite/core/platform/platform_detector.dart';
import 'package:flutter_universal_suite/core/providers/app_providers.dart';

// Mock classes
class MockSharedPreferences extends Mock implements SharedPreferences {}
class MockDio extends Mock implements Dio {}

void main() {
  group('Universal Business App Widget Tests', () {
    late ProviderContainer container;
    
    setUp(() {
      // Setup test container with mocked dependencies
      container = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWith((ref) async => MockSharedPreferences()),
          dioProvider.overrideWith((ref) => MockDio()),
        ],
      );
    });
    
    tearDown(() {
      container.dispose();
    });
    
    group('Platform Detection Tests', () {
      testWidgets('should detect current platform correctly', (WidgetTester tester) async {
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            child: Consumer(
              builder: (context, ref, child) {
                final platform = ref.watch(currentPlatformProvider);
                return MaterialApp(
                  home: Scaffold(
                    body: Text('Platform: ${platform.name}'),
                  ),
                );
              },
            ),
          ),
        );
        
        expect(find.text('Platform: ${PlatformDetector.current.name}'), findsOneWidget);
      });
      
      testWidgets('should provide platform capabilities', (WidgetTester tester) async {
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            child: Consumer(
              builder: (context, ref, child) {
                final capabilities = ref.watch(platformCapabilitiesProvider);
                return MaterialApp(
                  home: Scaffold(
                    body: Column(
                      children: [
                        Text('Has Camera: ${capabilities.hasCamera}'),
                        Text('Has Notifications: ${capabilities.hasNotifications}'),
                        Text('Has File System: ${capabilities.hasFileSystem}'),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        );
        
        final capabilities = PlatformDetector.capabilities;
        expect(find.text('Has Camera: ${capabilities.hasCamera}'), findsOneWidget);
        expect(find.text('Has Notifications: ${capabilities.hasNotifications}'), findsOneWidget);
        expect(find.text('Has File System: ${capabilities.hasFileSystem}'), findsOneWidget);
      });
    });
    
    group('Theme Tests', () {
      testWidgets('should apply Material theme correctly', (WidgetTester tester) async {
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            child: const UniversalBusinessApp(),
          ),
        );
        
        await tester.pumpAndSettle();
        
        // Check if MaterialApp is created
        expect(find.byType(MaterialApp), findsOneWidget);
        
        // Verify theme is applied
        final materialApp = tester.widget<MaterialApp>(find.byType(MaterialApp));
        expect(materialApp.theme, isNotNull);
        expect(materialApp.darkTheme, isNotNull);
      });
      
      testWidgets('should switch between light and dark themes', (WidgetTester tester) async {
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            child: Consumer(
              builder: (context, ref, child) {
                return MaterialApp(
                  theme: ThemeData.light(),
                  darkTheme: ThemeData.dark(),
                  themeMode: ref.watch(themeStateProvider).themeMode,
                  home: Scaffold(
                    body: Column(
                      children: [
                        ElevatedButton(
                          onPressed: () {
                            ref.read(themeStateProvider.notifier).setThemeMode(ThemeMode.dark);
                          },
                          child: const Text('Dark Mode'),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            ref.read(themeStateProvider.notifier).setThemeMode(ThemeMode.light);
                          },
                          child: const Text('Light Mode'),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        );
        
        await tester.pumpAndSettle();
        
        // Test theme switching
        await tester.tap(find.text('Dark Mode'));
        await tester.pumpAndSettle();
        
        await tester.tap(find.text('Light Mode'));
        await tester.pumpAndSettle();
        
        expect(find.text('Dark Mode'), findsOneWidget);
        expect(find.text('Light Mode'), findsOneWidget);
      });
    });
    
    group('State Management Tests', () {
      testWidgets('should manage app state correctly', (WidgetTester tester) async {
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            child: Consumer(
              builder: (context, ref, child) {
                final appState = ref.watch(appStateProvider);
                return MaterialApp(
                  home: Scaffold(
                    body: Column(
                      children: [
                        Text('Loading: ${appState.isLoading}'),
                        Text('Error: ${appState.error ?? "None"}'),
                        ElevatedButton(
                          onPressed: () {
                            ref.read(appStateProvider.notifier).setLoading(true);
                          },
                          child: const Text('Start Loading'),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            ref.read(appStateProvider.notifier).setError('Test Error');
                          },
                          child: const Text('Set Error'),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        );
        
        await tester.pumpAndSettle();
        
        expect(find.text('Loading: false'), findsOneWidget);
        expect(find.text('Error: None'), findsOneWidget);
        
        // Test loading state
        await tester.tap(find.text('Start Loading'));
        await tester.pumpAndSettle();
        expect(find.text('Loading: true'), findsOneWidget);
        
        // Test error state
        await tester.tap(find.text('Set Error'));
        await tester.pumpAndSettle();
        expect(find.text('Error: Test Error'), findsOneWidget);
      });
      
      testWidgets('should manage auth state correctly', (WidgetTester tester) async {
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            child: Consumer(
              builder: (context, ref, child) {
                final authState = ref.watch(authStateProvider);
                return MaterialApp(
                  home: Scaffold(
                    body: Column(
                      children: [
                        Text('Authenticated: ${authState.isAuthenticated}'),
                        Text('User: ${authState.user?.name ?? "None"}'),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        );
        
        await tester.pumpAndSettle();
        
        expect(find.text('Authenticated: false'), findsOneWidget);
        expect(find.text('User: None'), findsOneWidget);
      });
    });
    
    group('Adaptive UI Tests', () {
      testWidgets('should render adaptive scaffold for mobile', (WidgetTester tester) async {
        // Override platform for testing
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            overrides: [
              currentPlatformProvider.overrideWith((ref) => AppPlatform.android),
            ],
            child: const MaterialApp(
              home: AdaptiveScaffold(
                child: Text('Mobile Layout'),
              ),
            ),
          ),
        );
        
        await tester.pumpAndSettle();
        
        expect(find.text('Mobile Layout'), findsOneWidget);
        expect(find.byType(Scaffold), findsOneWidget);
      });
      
      testWidgets('should render adaptive scaffold for desktop', (WidgetTester tester) async {
        // Override platform for testing
        await tester.pumpWidget(
          ProviderScope(
            parent: container,
            overrides: [
              currentPlatformProvider.overrideWith((ref) => AppPlatform.windows),
            ],
            child: const MaterialApp(
              home: AdaptiveScaffold(
                child: Text('Desktop Layout'),
              ),
            ),
          ),
        );
        
        await tester.pumpAndSettle();
        
        expect(find.text('Desktop Layout'), findsOneWidget);
        expect(find.byType(Row), findsOneWidget); // Desktop layout uses Row
      });
    });
    
    group('Error Handling Tests', () {
      testWidgets('should display error widget when error occurs', (WidgetTester tester) async {
        final errorDetails = FlutterErrorDetails(
          exception: Exception('Test exception'),
          stack: StackTrace.current,
        );
        
        await tester.pumpWidget(
          MaterialApp(
            home: AppErrorWidget(errorDetails: errorDetails),
          ),
        );
        
        expect(find.text('Application Error'), findsOneWidget);
        expect(find.text('An error occurred in the application:'), findsOneWidget);
        expect(find.text('Restart Application'), findsOneWidget);
      });
    });
  });
  
  group('Responsive Layout Tests', () {
    testWidgets('should adapt to different screen sizes', (WidgetTester tester) async {
      // Test tablet layout
      tester.view.physicalSize = const Size(768, 1024);
      tester.view.devicePixelRatio = 1.0;
      
      await tester.pumpWidget(
        ProviderScope(
          parent: container,
          overrides: [
            currentPlatformProvider.overrideWith((ref) => AppPlatform.web),
          ],
          child: const MaterialApp(
            home: AdaptiveScaffold(
              child: Text('Tablet Layout'),
            ),
          ),
        ),
      );
      
      await tester.pumpAndSettle();
      
      expect(find.text('Tablet Layout'), findsOneWidget);
      
      // Test mobile layout
      tester.view.physicalSize = const Size(375, 667);
      tester.view.devicePixelRatio = 2.0;
      
      await tester.pumpWidget(
        ProviderScope(
          parent: container,
          overrides: [
            currentPlatformProvider.overrideWith((ref) => AppPlatform.web),
          ],
          child: const MaterialApp(
            home: AdaptiveScaffold(
              child: Text('Mobile Layout'),
            ),
          ),
        ),
      );
      
      await tester.pumpAndSettle();
      
      expect(find.text('Mobile Layout'), findsOneWidget);
      
      // Reset view
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });
}