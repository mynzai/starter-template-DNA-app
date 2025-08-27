# Modern Electron Desktop Application

A production-ready Electron template with **security-first architecture**, **Playwright testing**, **auto-updater with rollback**, **native system integration**, and **cross-platform code signing** for Windows, macOS, and Linux.

## 🚀 Features

### ✅ **AC1: Security-First Configuration**
- **Sandboxed renderer processes** with context isolation
- **Disabled Node.js integration** in renderer
- **Content Security Policy** enforcement
- **Secure IPC communication** with validated channels
- **Input sanitization** and path validation
- **Process isolation** and secure preload scripts

### ✅ **AC2: Modern Playwright Testing**
- **Replaces deprecated Spectron** with Playwright
- **E2E testing** with multi-platform support
- **Performance testing** for startup, memory, and IPC
- **Security testing** for CSP, XSS, and code injection
- **Automated test reporting** with artifacts

### ✅ **AC3: Auto-Updater with Rollback**
- **Delta updates** for faster downloads
- **Rollback capability** to previous versions
- **Update notifications** with user control
- **Automatic and manual update modes**
- **Progress tracking** and error handling

### ✅ **AC4: Native System Integration**
- **Rich notifications** with actions and replies
- **System tray** with context menu
- **File system access** with security validation
- **Deep linking** support
- **Native menus** and keyboard shortcuts
- **Platform-specific features** (macOS, Windows, Linux)

### ✅ **AC5: Code Signing & Distribution**
- **Windows**: EV certificate signing with timestamping
- **macOS**: Developer ID signing with notarization
- **Linux**: GPG signing with checksums
- **GitHub Actions CI/CD** for automated builds
- **Multi-platform releases** with verification

## 📦 Project Structure

```
├── src/
│   ├── main/                   # Main process (Node.js)
│   │   ├── main.ts            # Application entry point
│   │   ├── security.ts        # Security hardening utilities
│   │   ├── preload.ts         # Secure context bridge
│   │   ├── updater.ts         # Auto-updater with rollback
│   │   ├── notifications.ts   # Native notification manager
│   │   ├── file-manager.ts    # Secure file operations
│   │   └── ipc.ts            # IPC handlers
│   └── renderer/              # Renderer process (React)
│       ├── components/        # React components
│       ├── hooks/            # Custom React hooks
│       ├── store/            # State management
│       └── styles/           # Styling
├── tests/
│   ├── e2e/                  # End-to-end tests
│   ├── performance/          # Performance benchmarks
│   ├── security/             # Security audits
│   └── setup/               # Test configuration
├── build/                    # Build configuration
│   └── entitlements.mac.plist # macOS entitlements
├── scripts/                  # Build and deployment scripts
│   ├── notarize.js          # macOS notarization
│   └── sign.js              # Cross-platform signing
└── .github/workflows/       # CI/CD pipelines
    └── build-and-release.yml
```

## 🛠 Technology Stack

### **Core Framework**
- **Electron 27+** - Modern desktop application framework
- **React 18+** - UI library with hooks and context
- **TypeScript 5+** - Type safety and developer experience

### **Security**
- **Context isolation** and sandboxed renderers
- **Content Security Policy** enforcement
- **Input validation** and path sanitization
- **Secure IPC** with channel validation

### **Testing**
- **Playwright** - Modern E2E testing framework
- **Jest** - Unit testing framework
- **Coverage reporting** with threshold enforcement
- **Performance benchmarking** and metrics

### **Build & Distribution**
- **electron-builder** - Multi-platform packaging
- **GitHub Actions** - Automated CI/CD
- **Code signing** for all platforms
- **Auto-updater** with delta compression

### **Development**
- **Hot reload** with webpack-dev-server
- **ESLint** and **Prettier** for code quality
- **TypeScript** strict mode
- **Source maps** for debugging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd electron-modern

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev              # Start development with hot reload
npm run dev:main         # Start main process development
npm run dev:renderer     # Start renderer process development

# Building
npm run build            # Build for production
npm run build:main       # Build main process only
npm run build:renderer   # Build renderer process only

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run E2E tests with Playwright
npm run test:coverage    # Run tests with coverage report

# Distribution
npm run dist             # Build distributables for current platform
npm run dist:win         # Build for Windows
npm run dist:mac         # Build for macOS
npm run dist:linux       # Build for Linux

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier
```

## 🔧 Configuration

### Environment Variables

Create `.env` files for different environments:

```bash
# .env.development
NODE_ENV=development
ELECTRON_ENABLE_LOGGING=1
ELECTRON_DISABLE_SECURITY_WARNINGS=1

# .env.production
NODE_ENV=production
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=certificate_password
APPLE_ID=your.apple.id@example.com
APPLE_ID_PASSWORD=app_specific_password
APPLE_TEAM_ID=your_team_id
```

### Code Signing Setup

#### macOS
1. Obtain Apple Developer ID certificate
2. Set environment variables:
   - `CSC_LINK`: Path to .p12 certificate
   - `CSC_KEY_PASSWORD`: Certificate password
   - `APPLE_ID`: Apple ID email
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Team ID

#### Windows
1. Obtain code signing certificate
2. Set environment variables:
   - `CSC_LINK`: Path to .p12 certificate
   - `CSC_KEY_PASSWORD`: Certificate password

#### Linux
1. Set up GPG key for signing
2. Set environment variables:
   - `GPG_PRIVATE_KEY`: GPG private key
   - `GPG_PASSPHRASE`: GPG passphrase

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Specific test suites
npm run test:e2e          # E2E tests
npm run test:performance  # Performance tests
npm run test:security     # Security audits

# With UI
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:debug    # Debug mode
```

### Test Categories

1. **E2E Tests**: Application flow and user interactions
2. **Performance Tests**: Startup time, memory usage, IPC performance
3. **Security Tests**: CSP compliance, injection prevention, permission validation
4. **Unit Tests**: Individual component functionality

### Test Configuration

Tests are configured in `playwright.config.ts` with:
- Multi-platform execution
- Parallel test running
- Artifact collection (screenshots, videos, traces)
- Performance metrics
- Security validation

## 🔒 Security Features

### Renderer Process Security
- **No Node.js integration** in renderer
- **Context isolation** enabled
- **Sandbox mode** activated
- **CSP headers** enforced
- **Remote module disabled**

### IPC Security
- **Channel validation** with allowlists
- **Input sanitization** on all inputs
- **Type checking** for IPC parameters
- **Error boundaries** for exception handling

### File System Security
- **Path validation** to prevent traversal
- **File type restrictions** with allowlists
- **Size limits** to prevent DoS
- **Sandboxed file operations**

### Network Security
- **HTTPS enforcement** for external requests
- **URL validation** for link opening
- **Certificate validation** for secure connections

## 📱 Native Integration

### Notifications
```typescript
// Rich notifications with actions
await electronAPI.showNotification({
  title: 'Update Available',
  body: 'Version 2.0.0 is ready to install',
  actions: [
    { type: 'button', text: 'Install Now' },
    { type: 'button', text: 'Later' }
  ]
});
```

### File Operations
```typescript
// Secure file handling
const result = await electronAPI.openFile([
  { name: 'Text Files', extensions: ['txt', 'md'] }
]);

await electronAPI.saveFile(content, filePath);
```

### System Integration
```typescript
// System tray and menus
electronAPI.onMenuAction((action, data) => {
  switch (action) {
    case 'new':
      createNewDocument();
      break;
    case 'preferences':
      showPreferences();
      break;
  }
});
```

## 🔄 Auto-Updates

### Update Configuration
```typescript
// Enable auto-updates
const preferences = await electronAPI.preferences.get();
preferences.autoUpdate = true;
await electronAPI.preferences.set(preferences);

// Manual update check
electronAPI.updater.checkForUpdates();

// Listen for updates
const cleanup = electronAPI.updater.onUpdateAvailable((info) => {
  console.log('Update available:', info.version);
});
```

### Rollback Support
```typescript
// Automatic rollback on failure
// Manual rollback option in preferences
// Version history tracking
```

## 🚀 Deployment

### GitHub Actions
The repository includes automated CI/CD with:
- Multi-platform builds (Windows, macOS, Linux)
- Code signing for all platforms
- Security scanning
- Automated releases
- Performance testing

### Manual Release
```bash
# Create release build
npm run dist

# Sign binaries (if not using CI)
node scripts/sign.js releases/MyApp.exe

# Notarize macOS (if not using CI)
node scripts/notarize.js releases/MyApp.app
```

### Distribution Channels
- **GitHub Releases** - Primary distribution
- **Direct download** - Website integration
- **Auto-updater** - Seamless updates
- **App stores** - Optional store distribution

## 📊 Performance

### Benchmarks
- **Startup time**: <2 seconds optimal, <5 seconds maximum
- **Memory usage**: <200MB for basic functionality
- **IPC latency**: <10ms average, <50ms maximum
- **Bundle size**: <30MB total application size

### Optimization
- **Code splitting** for faster startup
- **Lazy loading** of non-critical components
- **Memory management** with cleanup
- **Efficient IPC** communication patterns

## 🛠 Development Guidelines

### Security Best Practices
1. Always validate user input
2. Use secure IPC channels only
3. Implement proper error handling
4. Regular security audits
5. Keep dependencies updated

### Performance Guidelines
1. Minimize IPC calls
2. Use async operations
3. Implement proper caching
4. Profile memory usage
5. Monitor startup time

### Testing Requirements
1. 80%+ code coverage
2. All security tests passing
3. Performance benchmarks met
4. Cross-platform validation
5. Automated regression testing

## 📚 Resources

### Documentation
- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [electron-builder](https://www.electron.build/)
- [Code Signing Guide](https://www.electron.build/code-signing)

### Tools
- [Electron Fiddle](https://www.electronjs.org/fiddle) - Prototyping
- [Electron DevTools](https://github.com/sindresorhus/electron-debug) - Debugging
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) - Analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run security and performance audits
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🤖 Generated with [Claude Code](https://claude.ai/code)**

**🛡️ Security-First • ⚡ Performance-Optimized • 🧪 Thoroughly Tested**