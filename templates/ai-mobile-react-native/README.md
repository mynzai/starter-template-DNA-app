# AI Mobile Assistant - React Native Template

A comprehensive React Native AI assistant template with voice, camera, and multi-provider AI integration.

## Features

### 🎯 Core AI Integration
- **Multi-Provider Support**: OpenAI, Anthropic, and local AI models
- **Smart Chat Interface**: Real-time conversations with streaming responses
- **Context-Aware Conversations**: Maintains conversation history and context
- **Offline Capabilities**: Fallback functionality without internet connection

### 🎤 Voice Interaction
- **Speech-to-Text**: Advanced voice recognition with react-native-voice
- **Text-to-Speech**: Natural voice synthesis with react-native-tts
- **Voice Commands**: Custom wake words and command processing
- **Multi-Language Support**: 15+ languages supported

### 📸 Camera & Image Analysis
- **Camera Integration**: Native camera access with react-native-camera
- **AI Vision**: Advanced image analysis and object detection
- **Gallery Support**: Analyze images from device gallery
- **Image Processing**: Compression, resizing, and optimization

### 🔄 Cross-Platform UI
- **React Native Paper**: Material Design components
- **Platform Adaptive**: iOS and Android native patterns
- **Responsive Design**: Works on phones and tablets
- **Dark/Light Themes**: Automatic theme switching

### 📱 Push Notifications
- **Firebase Integration**: Cloud messaging support
- **AI Insights**: Proactive AI-generated recommendations
- **Deep Linking**: Navigate to specific conversations
- **Smart Scheduling**: Context-aware notification timing

### 🌐 State Management
- **Redux Toolkit**: Modern Redux with RTK
- **Redux Persist**: Automatic state persistence
- **Real-time Updates**: Live conversation synchronization
- **Performance Optimized**: Efficient state updates

## Getting Started

### Prerequisites

- React Native CLI or Expo CLI
- Node.js 18.0 or higher
- iOS: Xcode 12+ and iOS 11+
- Android: API level 21+ (Android 5.0+)
- Firebase project (for push notifications)

### Installation

1. **Create new React Native project:**
   ```bash
   npx react-native init AIAssistantApp --template=typescript
   cd AIAssistantApp
   ```

2. **Copy template files:**
   ```bash
   cp -r path/to/template/* .
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **iOS Setup:**
   ```bash
   cd ios && pod install && cd ..
   ```

5. **Android Setup:**
   - Update `android/app/build.gradle` with required permissions
   - Add internet and microphone permissions to `AndroidManifest.xml`

### Configuration

1. **AI Service Configuration:**
   Create `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

2. **Firebase Setup:**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Initialize Firebase
   firebase init
   ```

3. **Platform Permissions:**
   
   **iOS (`ios/AIAssistantApp/Info.plist`):**
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>This app needs camera access to analyze images with AI</string>
   <key>NSMicrophoneUsageDescription</key>
   <string>This app needs microphone access for voice interaction</string>
   <key>NSPhotoLibraryUsageDescription</key>
   <string>This app needs photo library access to analyze images</string>
   ```

   **Android (`android/app/src/main/AndroidManifest.xml`):**
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   ```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Architecture

### Project Structure
```
src/
├── components/           # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # Screen components
├── services/           # Core services
│   ├── AIService.ts   # AI provider integration
│   ├── VoiceService.ts # Speech recognition/synthesis
│   └── CameraService.ts # Camera and image processing
├── store/             # Redux store and slices
│   ├── slices/       # Redux Toolkit slices
│   └── index.ts      # Store configuration
├── types/            # TypeScript type definitions
├── utils/           # Utility functions
└── App.tsx         # Main app component
```

### Key Services

#### AIService
Manages all AI interactions with multiple providers:
```typescript
import AIService from './services/AIService';

const aiService = AIService.getInstance({
  openaiApiKey: 'your-key',
  anthropicApiKey: 'your-key',
});

await aiService.initialize();
const response = await aiService.sendMessage('Hello AI!');
```

#### VoiceService
Handles speech recognition and text-to-speech:
```typescript
import VoiceService from './services/VoiceService';

const voiceService = VoiceService.getInstance();
await voiceService.initialize();

// Start listening
await voiceService.startListening();

// Speak text
await voiceService.speak('Hello there!');
```

#### CameraService
Manages camera operations and AI image analysis:
```typescript
import CameraService from './services/CameraService';

const cameraService = CameraService.getInstance();
await cameraService.initialize();

// Capture and analyze
const image = await cameraService.capturePhoto({ analyzeWithAI: true });
```

### State Management

Uses Redux Toolkit with the following slices:
- **aiSlice**: AI service state and operations
- **voiceSlice**: Voice recognition/synthesis state
- **cameraSlice**: Camera and image analysis state
- **conversationSlice**: Chat conversations and messages
- **settingsSlice**: App configuration and preferences
- **notificationSlice**: Push notifications and alerts

## Customization

### Adding New AI Providers

1. **Implement Provider Interface:**
   ```typescript
   class CustomAIProvider implements LLMProvider {
     async generateResponse(request: AIRequest): Promise<AIResponse> {
       // Implementation
     }
   }
   ```

2. **Register Provider:**
   ```typescript
   const aiService = AIService.getInstance();
   aiService.registerProvider({
     provider: 'custom',
     apiKey: 'your-key',
     baseUrl: 'https://api.custom.com',
     models: ['custom-model'],
     rateLimit: { requestsPerMinute: 60, tokensPerMinute: 100000 },
   });
   ```

### Custom Voice Commands

```typescript
import VoiceService from './services/VoiceService';

const voiceService = VoiceService.getInstance();

voiceService.registerVoiceCommand({
  id: 'custom-command',
  trigger: 'start recording',
  description: 'Start voice recording',
  action: async (text) => {
    // Handle command
  },
  enabled: true,
});
```

### Theme Customization

```typescript
// src/theme/index.ts
export const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#your-primary-color',
    accent: '#your-accent-color',
  },
};
```

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (if configured)
npm run e2e:android
npm run e2e:ios
```

### Test Structure

- **Unit Tests**: `__tests__/services/` - Service layer testing
- **Component Tests**: `__tests__/components/` - UI component testing
- **Integration Tests**: `__tests__/integration/` - End-to-end testing

## Performance Optimization

### Memory Management
- Dispose services properly in component lifecycle
- Use image compression for camera captures
- Implement efficient conversation history management

### Network Optimization
- Request caching and deduplication
- HTTP/2 for better performance
- Compress API request/response data

### AI Request Optimization
- Batch similar requests
- Stream responses for better UX
- Implement intelligent caching

## Security

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
# Debug build
npm run android

# Release build
cd android && ./gradlew assembleRelease

# Generate signed APK
cd android && ./gradlew assembleRelease -PMYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore -PMYAPP_UPLOAD_KEY_ALIAS=my-key-alias -PMYAPP_UPLOAD_STORE_PASSWORD=**** -PMYAPP_UPLOAD_KEY_PASSWORD=****
```

### iOS
```bash
# Debug build
npm run ios

# Release build (Xcode required)
# Open ios/AIAssistantApp.xcworkspace in Xcode
# Product > Archive
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
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: npm run build:android
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS build errors:**
   ```bash
   cd ios && pod install && cd ..
   npx react-native run-ios
   ```

3. **Android build errors:**
   ```bash
   cd android && ./gradlew clean && cd ..
   npx react-native run-android
   ```

4. **Permission issues:**
   - Verify platform permissions in manifests
   - Test on physical devices for camera/microphone
   - Check Firebase configuration

### Debug Tips

- Use `npx react-native log-android` for Android logs
- Use `npx react-native log-ios` for iOS logs
- Enable verbose logging in services for debugging
- Test offline scenarios thoroughly

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

**Built with ❤️ using React Native and AI**