# Flutter Universal Setup Guide

This guide will help you set up the Flutter Universal template for cross-platform development on web, mobile, and desktop.

## Prerequisites

- Git installed on your system
- A text editor or IDE (VS Code with Flutter extension recommended)
- Sufficient disk space (approximately 3-4 GB for full setup)

## Flutter SDK Installation

### macOS
```bash
# Using Homebrew (recommended)
brew install --cask flutter

# Or download directly from flutter.dev
curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.16.0-stable.zip
unzip flutter_macos_3.16.0-stable.zip
export PATH="$PATH:`pwd`/flutter/bin"
```

### Windows
1. Download Flutter SDK from [flutter.dev](https://docs.flutter.dev/get-started/install/windows)
2. Extract to `C:\src\flutter`
3. Add `C:\src\flutter\bin` to your PATH
4. Run `flutter doctor` to verify installation

### Linux
```bash
# Download and extract Flutter
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.16.0-stable.tar.xz
tar xf flutter_linux_3.16.0-stable.tar.xz
export PATH="$PATH:`pwd`/flutter/bin"
```

## Platform Setup

### Mobile Development (iOS & Android)

#### Android Setup
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK and build tools:
   - Open Android Studio
   - Go to SDK Manager
   - Install Android SDK Platform-Tools
   - Accept Android licenses: `flutter doctor --android-licenses`

3. Set up an Android emulator:
   - Open AVD Manager in Android Studio
   - Create a new virtual device
   - Choose a recent API level (API 30+)

#### iOS Setup (macOS only)
1. Install [Xcode](https://developer.apple.com/xcode/) from Mac App Store
2. Install Xcode command line tools:
```bash
sudo xcode-select --install
```
3. Install CocoaPods:
```bash
sudo gem install cocoapods
```
4. Set up iOS simulator:
   - Open Xcode
   - Go to Xcode → Preferences → Components
   - Install iOS simulators

### Web Development
No additional setup required. Flutter web support is included by default.

### Desktop Development

#### Windows
- Visual Studio 2019 or later with C++ desktop development workload
- Windows 10 SDK

#### macOS
- Xcode (already installed for iOS development)

#### Linux
```bash
# Install required libraries
sudo apt-get install clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev
```

## Verify Installation

Run Flutter doctor to check your setup:

```bash
flutter doctor
```

You should see checkmarks (✓) for the platforms you want to target. Common warnings:
- Android license not accepted → Run `flutter doctor --android-licenses`
- iOS development requires Xcode → Install from Mac App Store
- No devices connected → Start an emulator or connect a physical device

## Project Setup

1. Navigate to your template directory
2. Get Flutter dependencies:
```bash
flutter pub get
```

3. Generate necessary files:
```bash
flutter packages pub run build_runner build
```

## Platform Configuration

### Configure App Identity

Edit the following files with your app details:

#### Android (`android/app/build.gradle`):
```gradle
defaultConfig {
    applicationId "com.yourcompany.yourapp"
    minSdkVersion 21
    targetSdkVersion 34
    versionCode flutterVersionCode.toInteger()
    versionName flutterVersionName
}
```

#### iOS (`ios/Runner/Info.plist`):
```xml
<key>CFBundleIdentifier</key>
<string>com.yourcompany.yourapp</string>
<key>CFBundleName</key>
<string>Your App Name</string>
```

#### Web (`web/index.html`):
```html
<title>Your App Name</title>
<meta name="description" content="Your app description">
```

### Configure App Icons and Splash Screens

1. Install flutter_launcher_icons:
```bash
flutter pub add dev:flutter_launcher_icons
```

2. Place your app icon in `assets/icon/icon.png` (1024x1024 recommended)

3. Run icon generation:
```bash
flutter pub get
flutter pub run flutter_launcher_icons:main
```

## Running the App

### Mobile Development
```bash
# List available devices
flutter devices

# Run on Android
flutter run -d android

# Run on iOS (macOS only)
flutter run -d ios

# Run in release mode
flutter run --release
```

### Web Development
```bash
# Run web version
flutter run -d chrome

# Build for web deployment
flutter build web
```

### Desktop Development
```bash
# Run on current desktop platform
flutter run -d macos    # macOS
flutter run -d windows  # Windows
flutter run -d linux    # Linux

# Build desktop app
flutter build macos
flutter build windows
flutter build linux
```

## Development Workflow

### Hot Reload
While running `flutter run`, press:
- `r` for hot reload (fast refresh)
- `R` for hot restart (full restart)
- `q` to quit

### Recommended IDE Setup

#### VS Code
1. Install Flutter extension
2. Install Dart extension
3. Recommended settings (`.vscode/settings.json`):
```json
{
  "dart.flutterSdkPath": "/path/to/flutter",
  "dart.previewFlutterUiGuides": true,
  "dart.previewFlutterUiGuidesCustomTracking": true
}
```

#### Android Studio
1. Install Flutter and Dart plugins
2. Enable Flutter inspector
3. Use built-in device manager

## Testing

### Unit Tests
```bash
flutter test
```

### Widget Tests
```bash
flutter test test/widget_test.dart
```

### Integration Tests
```bash
# Run on device/emulator
flutter test integration_test/app_test.dart

# Run on web
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart -d web-server
```

### Golden Tests (UI Tests)
```bash
# Generate golden files
flutter test --update-goldens

# Run golden tests
flutter test test/golden_test.dart
```

## Performance Optimization

### Build Optimization
```bash
# Web with optimization
flutter build web --release --web-renderer canvaskit

# Mobile with optimization
flutter build apk --release --shrink
flutter build ipa --release
```

### Code Analysis
```bash
# Run static analysis
flutter analyze

# Format code
flutter format .
```

## Troubleshooting

### Common Issues

1. **"Could not resolve all dependencies"**
   - Run `flutter clean && flutter pub get`
   - Check internet connection
   - Verify Flutter SDK path

2. **iOS build errors**
   - Update Xcode to latest version
   - Run `pod repo update` in `ios/` directory
   - Clean and rebuild: `flutter clean && flutter build ios`

3. **Android license issues**
   - Run `flutter doctor --android-licenses`
   - Accept all licenses

4. **Desktop build fails**
   - Ensure platform-specific requirements are installed
   - Check `flutter config` to verify desktop support is enabled

5. **Web build issues**
   - Try different web renderers: `--web-renderer html` or `--web-renderer canvaskit`
   - Clear browser cache

### Platform-Specific Debugging

#### Enable desktop platforms:
```bash
flutter config --enable-windows-desktop
flutter config --enable-macos-desktop
flutter config --enable-linux-desktop
```

#### Check platform support:
```bash
flutter config
```

## Deployment

### Mobile App Stores

#### Android Play Store
1. Build signed APK: `flutter build apk --release`
2. Or build App Bundle: `flutter build appbundle --release`
3. Upload to Google Play Console

#### iOS App Store
1. Build iOS app: `flutter build ipa --release`
2. Open Runner.xcworkspace in Xcode
3. Archive and upload to App Store Connect

### Web Deployment
1. Build web app: `flutter build web --release`
2. Deploy `build/web/` directory to your hosting provider:
   - Firebase Hosting
   - GitHub Pages
   - Netlify
   - Vercel

### Desktop Distribution
1. Build platform executable:
```bash
flutter build windows --release
flutter build macos --release
flutter build linux --release
```
2. Package using platform-specific tools or CI/CD

## Estimated Setup Time

- **Flutter SDK**: 10-15 minutes
- **Platform setup**: 20-30 minutes per platform
- **Project configuration**: 10-15 minutes
- **First successful run**: 5-10 minutes

## Next Steps

After successful setup:

1. Explore the adaptive UI components
2. Test on multiple platforms
3. Customize themes and branding
4. Set up continuous integration
5. Add platform-specific features
6. Optimize for each platform's UX patterns

## Getting Help

- [Flutter Documentation](https://docs.flutter.dev/)
- [Flutter Community](https://flutter.dev/community)
- [Stack Overflow Flutter tag](https://stackoverflow.com/questions/tagged/flutter)
- [GitHub Issues](https://github.com/flutter/flutter/issues)

Happy cross-platform development! 📱💻🌐