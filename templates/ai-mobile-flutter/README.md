# AI Mobile Assistant - Flutter Template

A comprehensive Flutter-based AI assistant template with voice, image recognition, and offline capabilities.

## Features

### 🎯 Core AI Integration
- **Smart Chat Interface**: Real-time AI conversations with streaming responses
- **Multi-Provider Support**: OpenAI, Anthropic, and local AI models
- **Context-Aware Conversations**: Maintains conversation history and context
- **Offline AI Capabilities**: Local AI models for offline functionality

### 🎤 Voice Interaction
- **Speech-to-Text**: Advanced voice recognition with multiple languages
- **Text-to-Speech**: Natural voice synthesis with customizable settings
- **Voice Commands**: Custom wake words and command processing
- **Hands-Free Operation**: Complete voice-controlled AI interaction

### 📸 Image Analysis
- **Camera Integration**: Native camera access with real-time preview
- **AI Vision**: Advanced image analysis and object detection
- **Gallery Support**: Analyze images from device gallery
- **Offline Processing**: Basic image analysis without internet

### 🔄 Cross-Platform UI
- **Material Design**: Android-native interface components
- **Cupertino Widgets**: iOS-native interface components
- **Adaptive Layouts**: Responsive design for all screen sizes
- **Dark/Light Themes**: Automatic theme switching support

### 📱 Push Notifications
- **AI Insights**: Proactive AI-generated recommendations
- **Smart Scheduling**: Context-aware notification timing
- **Rich Notifications**: Interactive notification actions
- **Background Processing**: Continues AI analysis in background

### 🌐 Offline Capabilities
- **Local AI Models**: TensorFlow Lite model integration
- **Smart Caching**: Intelligent response and model caching
- **Sync Management**: Automatic online/offline data synchronization
- **Progressive Enhancement**: Graceful feature degradation offline

## Getting Started

### Prerequisites

- Flutter SDK 3.16.0 or higher
- Dart SDK 3.2.0 or higher
- Android Studio / Xcode for platform development
- Firebase project for push notifications

### Installation

1. **Clone and setup the project:**
   ```bash
   flutter create ai_mobile_assistant
   cd ai_mobile_assistant
   cp -r path/to/template/* .
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Configure Firebase:**
   ```bash
   # Follow Firebase setup instructions
   flutterfire configure
   ```

4. **Platform-specific setup:**

   **Android:**
   - Update `android/app/build.gradle` with required permissions
   - Add internet and microphone permissions to `AndroidManifest.xml`

   **iOS:**
   - Update `ios/Runner/Info.plist` with camera and microphone usage descriptions
   - Configure background modes for audio processing

### Configuration

1. **AI Service Configuration:**
   ```dart
   // lib/core/constants/api_constants.dart
   class ApiConstants {
     static const String baseUrl = 'YOUR_AI_API_ENDPOINT';
     static const String openaiApiKey = 'YOUR_OPENAI_KEY';
     static const String anthropicApiKey = 'YOUR_ANTHROPIC_KEY';
   }
   ```

2. **Firebase Setup:**
   - Place `google-services.json` (Android) in `android/app/`
   - Place `GoogleService-Info.plist` (iOS) in `ios/Runner/`

3. **Offline AI Models:**
   ```bash
   # Place TensorFlow Lite models in assets/models/
   mkdir assets/models
   # Add your .tflite model files
   ```

### Running the App

```bash
# Debug mode
flutter run

# Release mode
flutter run --release

# Specific platform
flutter run -d android
flutter run -d ios
```

## Architecture

### Project Structure
```
lib/
├── core/                   # Core services and utilities
│   ├── app.dart           # Main app configuration
│   ├── models/            # Data models
│   ├── providers/         # Riverpod state providers
│   ├── services/          # Core services
│   │   ├── ai_service.dart
│   │   ├── voice_service.dart
│   │   ├── camera_service.dart
│   │   ├── notification_service.dart
│   │   └── offline_ai_service.dart
│   └── theme/             # App theming
├── features/              # Feature-based modules
│   ├── home/             # Home screen and widgets
│   ├── chat/             # Chat interface
│   ├── camera/           # Camera and image analysis
│   └── settings/         # App settings
└── main.dart             # App entry point
```

### Key Services

#### AIService
Manages all AI interactions with multiple providers and offline fallback:
```dart
final response = await AIService.instance.sendMessage(
  message: 'Hello AI',
  conversationId: 'conv-123',
);
```

#### VoiceService
Handles speech recognition and text-to-speech:
```dart
await VoiceService.instance.startListening();
await VoiceService.instance.speak('Hello there!');
```

#### CameraService
Manages camera operations and image analysis:
```dart
final capture = await CameraService.instance.capturePhoto(
  analyzeWithAI: true,
);
```

#### NotificationService
Manages push notifications and AI insights:
```dart
await NotificationService.instance.sendAIInsightNotification(
  title: 'AI Insight',
  body: 'Here\'s what I learned from your data...',
);
```

## Customization

### Adding New AI Providers

1. **Create provider implementation:**
   ```dart
   class CustomAIProvider implements LLMProvider {
     @override
     Future<AIResponse> generateResponse(AIRequest request) async {
       // Implementation
     }
   }
   ```

2. **Register with AIService:**
   ```dart
   AIService.instance.registerProvider(CustomAIProvider());
   ```

### Custom Voice Commands

```dart
final command = VoiceCommand(
  trigger: 'custom command',
  description: 'My custom voice command',
  action: (text) {
    // Handle command
  },
);

VoiceService.instance.registerVoiceCommand(command);
```

### Custom UI Themes

```dart
// lib/core/theme/custom_theme.dart
class CustomTheme {
  static ThemeData get lightTheme => ThemeData(
    // Custom light theme
  );
  
  static ThemeData get darkTheme => ThemeData(
    // Custom dark theme
  );
}
```

## Testing

### Running Tests

```bash
# Unit tests
flutter test

# Integration tests
flutter test integration_test/

# Widget tests
flutter test test/widget_test.dart

# Coverage report
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
```

### Test Structure

- **Unit Tests**: `test/core/services/` - Service layer testing
- **Widget Tests**: `test/widget_test.dart` - UI component testing
- **Integration Tests**: `integration_test/` - End-to-end testing

## Performance Optimization

### Offline AI Models
- Use quantized TensorFlow Lite models for better performance
- Implement model warming for faster inference
- Cache frequently used model outputs

### Memory Management
- Dispose services properly in widget lifecycle
- Use image compression for camera captures
- Implement efficient conversation history management

### Network Optimization
- Implement request caching and deduplication
- Use HTTP/2 for better performance
- Compress API request/response data

## Security Considerations

### API Keys
- Never commit API keys to version control
- Use environment variables or secure storage
- Implement API key rotation

### Data Privacy
- Encrypt sensitive data at rest
- Implement secure communication channels
- Follow platform privacy guidelines

### Permissions
- Request minimal required permissions
- Explain permission usage to users
- Implement graceful permission denial handling

## Deployment

### Android
```bash
# Build APK
flutter build apk --release

# Build App Bundle
flutter build appbundle --release
```

### iOS
```bash
# Build for iOS
flutter build ios --release

# Archive for App Store
flutter build ipa
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: flutter test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: flutter build appbundle
      - name: Upload to Play Store
        # Deploy configuration
```

## Troubleshooting

### Common Issues

1. **Flutter SDK Issues:**
   ```bash
   flutter doctor
   flutter clean
   flutter pub get
   ```

2. **Platform Build Errors:**
   ```bash
   # Android
   cd android && ./gradlew clean
   
   # iOS
   cd ios && rm -rf Pods/ && pod install
   ```

3. **Permission Issues:**
   - Verify platform permissions in manifests
   - Test on physical devices for camera/microphone
   - Check Firebase configuration

4. **AI Service Errors:**
   - Verify API keys and endpoints
   - Check network connectivity
   - Test offline fallback functionality

### Debug Tips

- Use `flutter logs` for real-time debugging
- Enable verbose logging in services
- Test offline scenarios thoroughly
- Verify AI model compatibility

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- 📧 Email: support@example.com
- 📝 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 Documentation: [Full Documentation](https://docs.example.com)

---

**Built with ❤️ using Flutter and AI**