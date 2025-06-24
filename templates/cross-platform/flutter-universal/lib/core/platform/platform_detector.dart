import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';

enum AppPlatform {
  android,
  ios,
  web,
  windows,
  macos,
  linux;
  
  bool get isMobile => this == AppPlatform.android || this == AppPlatform.ios;
  bool get isDesktop => this == AppPlatform.windows || this == AppPlatform.macos || this == AppPlatform.linux;
  bool get isWeb => this == AppPlatform.web;
  bool get isApple => this == AppPlatform.ios || this == AppPlatform.macos;
  bool get isGoogle => this == AppPlatform.android;
  bool get isMicrosoft => this == AppPlatform.windows;
  bool get isLinux => this == AppPlatform.linux;
}

class PlatformCapabilities {
  final bool hasCamera;
  final bool hasNotifications;
  final bool hasFileSystem;
  final bool hasLocationServices;
  final bool hasBiometrics;
  final bool hasVibration;
  final bool hasAccelerometer;
  final bool hasGyroscope;
  final bool hasNFC;
  final bool hasBluetooth;
  final bool hasWiFi;
  final bool hasCellular;
  final bool hasGPS;
  final bool hasMultiWindow;
  final bool hasSystemTray;
  final bool hasMenuBar;
  final bool hasKeyboard;
  final bool hasMouse;
  final bool hasTouchScreen;
  
  const PlatformCapabilities({
    this.hasCamera = false,
    this.hasNotifications = false,
    this.hasFileSystem = false,
    this.hasLocationServices = false,
    this.hasBiometrics = false,
    this.hasVibration = false,
    this.hasAccelerometer = false,
    this.hasGyroscope = false,
    this.hasNFC = false,
    this.hasBluetooth = false,
    this.hasWiFi = false,
    this.hasCellular = false,
    this.hasGPS = false,
    this.hasMultiWindow = false,
    this.hasSystemTray = false,
    this.hasMenuBar = false,
    this.hasKeyboard = false,
    this.hasMouse = false,
    this.hasTouchScreen = false,
  });
}

class DeviceInfo {
  final String deviceModel;
  final String osVersion;
  final String appVersion;
  final bool isPhysicalDevice;
  final String deviceId;
  final double screenWidth;
  final double screenHeight;
  final double pixelRatio;
  final bool isDarkMode;
  final String locale;
  
  const DeviceInfo({
    required this.deviceModel,
    required this.osVersion,
    required this.appVersion,
    required this.isPhysicalDevice,
    required this.deviceId,
    required this.screenWidth,
    required this.screenHeight,
    required this.pixelRatio,
    required this.isDarkMode,
    required this.locale,
  });
}

class PlatformDetector {
  static AppPlatform get current {
    if (kIsWeb) {
      return AppPlatform.web;
    } else if (Platform.isAndroid) {
      return AppPlatform.android;
    } else if (Platform.isIOS) {
      return AppPlatform.ios;
    } else if (Platform.isWindows) {
      return AppPlatform.windows;
    } else if (Platform.isMacOS) {
      return AppPlatform.macos;
    } else if (Platform.isLinux) {
      return AppPlatform.linux;
    } else {
      throw UnsupportedError('Unsupported platform');
    }
  }
  
  static PlatformCapabilities get capabilities {
    final platform = current;
    
    switch (platform) {
      case AppPlatform.android:
        return const PlatformCapabilities(
          hasCamera: true,
          hasNotifications: true,
          hasFileSystem: true,
          hasLocationServices: true,
          hasBiometrics: true,
          hasVibration: true,
          hasAccelerometer: true,
          hasGyroscope: true,
          hasNFC: true,
          hasBluetooth: true,
          hasWiFi: true,
          hasCellular: true,
          hasGPS: true,
          hasMultiWindow: true,
          hasTouchScreen: true,
        );
        
      case AppPlatform.ios:
        return const PlatformCapabilities(
          hasCamera: true,
          hasNotifications: true,
          hasFileSystem: true,
          hasLocationServices: true,
          hasBiometrics: true,
          hasVibration: true,
          hasAccelerometer: true,
          hasGyroscope: true,
          hasNFC: true,
          hasBluetooth: true,
          hasWiFi: true,
          hasCellular: true,
          hasGPS: true,
          hasMultiWindow: true,
          hasTouchScreen: true,
        );
        
      case AppPlatform.web:
        return const PlatformCapabilities(
          hasCamera: true,
          hasNotifications: true,
          hasFileSystem: false,
          hasLocationServices: true,
          hasBiometrics: false,
          hasVibration: false,
          hasAccelerometer: false,
          hasGyroscope: false,
          hasNFC: false,
          hasBluetooth: false,
          hasWiFi: true,
          hasCellular: false,
          hasGPS: true,
          hasMultiWindow: true,
          hasKeyboard: true,
          hasMouse: true,
          hasTouchScreen: false,
        );
        
      case AppPlatform.windows:
        return const PlatformCapabilities(
          hasCamera: true,
          hasNotifications: true,
          hasFileSystem: true,
          hasLocationServices: false,
          hasBiometrics: true,
          hasVibration: false,
          hasAccelerometer: false,
          hasGyroscope: false,
          hasNFC: false,
          hasBluetooth: true,
          hasWiFi: true,
          hasCellular: false,
          hasGPS: false,
          hasMultiWindow: true,
          hasSystemTray: true,
          hasKeyboard: true,
          hasMouse: true,
          hasTouchScreen: true,
        );
        
      case AppPlatform.macos:
        return const PlatformCapabilities(
          hasCamera: true,
          hasNotifications: true,
          hasFileSystem: true,
          hasLocationServices: true,
          hasBiometrics: true,
          hasVibration: false,
          hasAccelerometer: false,
          hasGyroscope: false,
          hasNFC: false,
          hasBluetooth: true,
          hasWiFi: true,
          hasCellular: false,
          hasGPS: false,
          hasMultiWindow: true,
          hasMenuBar: true,
          hasKeyboard: true,
          hasMouse: true,
          hasTouchScreen: true,
        );
        
      case AppPlatform.linux:
        return const PlatformCapabilities(
          hasCamera: true,
          hasNotifications: true,
          hasFileSystem: true,
          hasLocationServices: false,
          hasBiometrics: false,
          hasVibration: false,
          hasAccelerometer: false,
          hasGyroscope: false,
          hasNFC: false,
          hasBluetooth: true,
          hasWiFi: true,
          hasCellular: false,
          hasGPS: false,
          hasMultiWindow: true,
          hasKeyboard: true,
          hasMouse: true,
          hasTouchScreen: false,
        );
    }
  }
  
  static Future<DeviceInfo> getDeviceInfo() async {
    final deviceInfoPlugin = DeviceInfoPlugin();
    final platform = current;
    
    // Get basic screen info
    final binding = WidgetsBinding.instance;
    final mediaQuery = MediaQueryData.fromView(binding.platformDispatcher.views.first);
    
    switch (platform) {
      case AppPlatform.android:
        final androidInfo = await deviceInfoPlugin.androidInfo;
        return DeviceInfo(
          deviceModel: '${androidInfo.manufacturer} ${androidInfo.model}',
          osVersion: 'Android ${androidInfo.version.release}',
          appVersion: '1.0.0', // This should come from package_info_plus
          isPhysicalDevice: androidInfo.isPhysicalDevice,
          deviceId: androidInfo.id,
          screenWidth: mediaQuery.size.width,
          screenHeight: mediaQuery.size.height,
          pixelRatio: mediaQuery.devicePixelRatio,
          isDarkMode: mediaQuery.platformBrightness == Brightness.dark,
          locale: Platform.localeName,
        );
        
      case AppPlatform.ios:
        final iosInfo = await deviceInfoPlugin.iosInfo;
        return DeviceInfo(
          deviceModel: '${iosInfo.name} ${iosInfo.model}',
          osVersion: '${iosInfo.systemName} ${iosInfo.systemVersion}',
          appVersion: '1.0.0',
          isPhysicalDevice: iosInfo.isPhysicalDevice,
          deviceId: iosInfo.identifierForVendor ?? 'unknown',
          screenWidth: mediaQuery.size.width,
          screenHeight: mediaQuery.size.height,
          pixelRatio: mediaQuery.devicePixelRatio,
          isDarkMode: mediaQuery.platformBrightness == Brightness.dark,
          locale: Platform.localeName,
        );
        
      case AppPlatform.web:
        final webInfo = await deviceInfoPlugin.webBrowserInfo;
        return DeviceInfo(
          deviceModel: '${webInfo.browserName} ${webInfo.platform}',
          osVersion: webInfo.userAgent ?? 'Unknown',
          appVersion: '1.0.0',
          isPhysicalDevice: true,
          deviceId: 'web-${webInfo.vendor}-${webInfo.userAgent?.hashCode}',
          screenWidth: mediaQuery.size.width,
          screenHeight: mediaQuery.size.height,
          pixelRatio: mediaQuery.devicePixelRatio,
          isDarkMode: mediaQuery.platformBrightness == Brightness.dark,
          locale: 'en_US', // Web doesn't have Platform.localeName
        );
        
      case AppPlatform.windows:
        final windowsInfo = await deviceInfoPlugin.windowsInfo;
        return DeviceInfo(
          deviceModel: windowsInfo.computerName,
          osVersion: 'Windows ${windowsInfo.majorVersion}.${windowsInfo.minorVersion}',
          appVersion: '1.0.0',
          isPhysicalDevice: true,
          deviceId: windowsInfo.computerName,
          screenWidth: mediaQuery.size.width,
          screenHeight: mediaQuery.size.height,
          pixelRatio: mediaQuery.devicePixelRatio,
          isDarkMode: mediaQuery.platformBrightness == Brightness.dark,
          locale: Platform.localeName,
        );
        
      case AppPlatform.macos:
        final macInfo = await deviceInfoPlugin.macOsInfo;
        return DeviceInfo(
          deviceModel: macInfo.model,
          osVersion: 'macOS ${macInfo.osRelease}',
          appVersion: '1.0.0',
          isPhysicalDevice: true,
          deviceId: macInfo.systemGUID ?? macInfo.computerName,
          screenWidth: mediaQuery.size.width,
          screenHeight: mediaQuery.size.height,
          pixelRatio: mediaQuery.devicePixelRatio,
          isDarkMode: mediaQuery.platformBrightness == Brightness.dark,
          locale: Platform.localeName,
        );
        
      case AppPlatform.linux:
        final linuxInfo = await deviceInfoPlugin.linuxInfo;
        return DeviceInfo(
          deviceModel: '${linuxInfo.name} ${linuxInfo.version}',
          osVersion: 'Linux ${linuxInfo.versionId}',
          appVersion: '1.0.0',
          isPhysicalDevice: true,
          deviceId: linuxInfo.machineId ?? 'linux-unknown',
          screenWidth: mediaQuery.size.width,
          screenHeight: mediaQuery.size.height,
          pixelRatio: mediaQuery.devicePixelRatio,
          isDarkMode: mediaQuery.platformBrightness == Brightness.dark,
          locale: Platform.localeName,
        );
    }
  }
  
  static bool get isDebugMode => kDebugMode;
  static bool get isReleaseMode => kReleaseMode;
  static bool get isProfileMode => kProfileMode;
}