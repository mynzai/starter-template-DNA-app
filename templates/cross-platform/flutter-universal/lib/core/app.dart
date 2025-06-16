import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'platform/platform_detector.dart';
import 'providers/app_providers.dart';
import 'theme/app_theme.dart';
import 'navigation/app_router.dart';
import 'widgets/adaptive_widgets.dart';
import '../features/splash/splash_screen.dart';
import '../features/home/home_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/settings/settings_screen.dart';

class UniversalBusinessApp extends ConsumerWidget {
  const UniversalBusinessApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    final themeState = ref.watch(themeStateProvider);
    final authState = ref.watch(authStateProvider);
    final router = ref.watch(appRouterProvider);
    
    // Choose appropriate app widget based on platform
    if (platform.isApple) {
      return _buildCupertinoApp(context, ref, router, themeState);
    } else {
      return _buildMaterialApp(context, ref, router, themeState);
    }
  }
  
  Widget _buildMaterialApp(
    BuildContext context,
    WidgetRef ref,
    GoRouter router,
    ThemeStateData themeState,
  ) {
    final appTheme = AppTheme(
      primaryColor: Color(themeState.primaryColor),
      useMaterial3: themeState.useMaterial3,
    );
    
    return MaterialApp.router(
      title: 'Universal Business Suite',
      debugShowCheckedModeBanner: false,
      
      // Theme configuration
      theme: appTheme.lightTheme,
      darkTheme: appTheme.darkTheme,
      themeMode: themeState.themeMode,
      
      // Routing
      routerConfig: router,
      
      // Localization
      supportedLocales: const [
        Locale('en', 'US'),
        Locale('es', 'ES'),
        Locale('fr', 'FR'),
        Locale('de', 'DE'),
        Locale('ja', 'JP'),
        Locale('zh', 'CN'),
      ],
      
      // Material 3 builder
      builder: (context, child) {
        return AdaptiveScaffold(
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
  
  Widget _buildCupertinoApp(
    BuildContext context,
    WidgetRef ref,
    GoRouter router,
    ThemeStateData themeState,
  ) {
    final appTheme = AppTheme(
      primaryColor: Color(themeState.primaryColor),
      useMaterial3: false, // Cupertino doesn't use Material 3
    );
    
    return CupertinoApp.router(
      title: 'Universal Business Suite',
      debugShowCheckedModeBanner: false,
      
      // Theme configuration
      theme: appTheme.cupertinoTheme,
      
      // Routing
      routerConfig: router,
      
      // Localization
      supportedLocales: const [
        Locale('en', 'US'),
        Locale('es', 'ES'),
        Locale('fr', 'FR'),
        Locale('de', 'DE'),
        Locale('ja', 'JP'),
        Locale('zh', 'CN'),
      ],
      
      // Builder for adaptive layouts
      builder: (context, child) {
        return AdaptiveScaffold(
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

// Adaptive scaffold that handles platform-specific navigation patterns
class AdaptiveScaffold extends ConsumerWidget {
  final Widget child;
  
  const AdaptiveScaffold({
    super.key,
    required this.child,
  });
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    final capabilities = ref.watch(platformCapabilitiesProvider);
    
    // Handle platform-specific layouts
    if (platform.isDesktop) {
      return _buildDesktopLayout(context, ref);
    } else if (platform.isMobile) {
      return _buildMobileLayout(context, ref);
    } else {
      return _buildWebLayout(context, ref);
    }
  }
  
  Widget _buildDesktopLayout(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Row(
        children: [
          // Sidebar navigation for desktop
          const AdaptiveNavigationRail(),
          
          // Main content area
          Expanded(
            child: Column(
              children: [
                // Top navigation bar
                const AdaptiveAppBar(),
                
                // Main content
                Expanded(child: child),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildMobileLayout(BuildContext context, WidgetRef ref) {
    final platform = ref.watch(currentPlatformProvider);
    
    if (platform.isApple) {
      return CupertinoTabScaffold(
        tabBar: const AdaptiveCupertinoTabBar(),
        tabBuilder: (context, index) => child,
      );
    } else {
      return Scaffold(
        body: child,
        bottomNavigationBar: const AdaptiveBottomNavigationBar(),
      );
    }
  }
  
  Widget _buildWebLayout(BuildContext context, WidgetRef ref) {
    final screenWidth = MediaQuery.of(context).size.width;
    
    // Responsive design for web
    if (screenWidth > 1024) {
      // Desktop-like layout for large screens
      return _buildDesktopLayout(context, ref);
    } else if (screenWidth > 768) {
      // Tablet layout
      return _buildTabletLayout(context, ref);
    } else {
      // Mobile layout for small screens
      return _buildMobileLayout(context, ref);
    }
  }
  
  Widget _buildTabletLayout(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Row(
        children: [
          // Collapsible sidebar
          const AdaptiveNavigationRail(extended: false),
          
          // Main content
          Expanded(child: child),
        ],
      ),
    );
  }
}

// Global error handler
class AppErrorWidget extends StatelessWidget {
  final FlutterErrorDetails errorDetails;
  
  const AppErrorWidget({
    super.key,
    required this.errorDetails,
  });
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Application Error'),
          backgroundColor: Colors.red,
          foregroundColor: Colors.white,
        ),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'An error occurred in the application:',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  errorDetails.exception.toString(),
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  // Restart the app or navigate to a safe screen
                },
                child: const Text('Restart Application'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}