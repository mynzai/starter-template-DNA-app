/**
 * @fileoverview Flutter Framework Adapter Implementation
 * AC2: Framework-specific adapter for Flutter implementation
 */

import { BaseFrameworkAdapter } from './base-framework-adapter';
import {
  FlutterDNAAdapter,
  DNAContext,
  ConfigFile,
  SourceFile,
  TestFile,
  PackageDependency,
  FrameworkCapabilities,
  WidgetFile,
  FlutterConfig,
  FlutterDependency,
  FlutterFlavor,
  AssetDefinition
} from '../dna-interfaces';
import { SupportedFramework } from '../types';

/**
 * Flutter-specific DNA adapter implementation
 */
export class FlutterAdapter extends BaseFrameworkAdapter implements FlutterDNAAdapter {
  public readonly framework = SupportedFramework.FLUTTER;
  public readonly version = '3.19.0';
  
  public readonly capabilities: FrameworkCapabilities = {
    hasHotReload: true,
    hasTypeScript: false, // Dart instead
    hasTestingFramework: true,
    hasStateManagement: true,
    hasRouting: true,
    hasAPISupport: true,
    hasWebSupport: true,
    hasMobileSupport: true,
    hasDesktopSupport: true
  };

  /**
   * Generate Flutter-specific configuration files
   */
  public async generateConfigFiles(context: DNAContext): Promise<ConfigFile[]> {
    const files: ConfigFile[] = [];
    
    // Generate pubspec.yaml
    const pubspecContent = this.generatePubspecContent(context);
    files.push(this.createConfigFile('pubspec.yaml', pubspecContent, 'yaml'));
    
    // Generate analysis_options.yaml
    const analysisOptions = await this.generateAnalysisOptions(context);
    files.push(analysisOptions);
    
    // Generate flutter-specific config files
    files.push(...await this.generateAndroidConfig(context));
    files.push(...await this.generateIOSConfig(context));
    files.push(...await this.generateWebConfig(context));
    
    return files;
  }

  /**
   * Generate Flutter source files
   */
  public async generateSourceFiles(context: DNAContext, config: FlutterConfig): Promise<SourceFile[]> {
    const files: SourceFile[] = [];
    
    // Generate main.dart
    const mainContent = this.generateMainDartContent(context, config);
    files.push(this.createSourceFile('lib/main.dart', mainContent, 'dart'));
    
    // Generate app.dart
    const appContent = this.generateAppDartContent(context, config);
    files.push(this.createSourceFile('lib/app.dart', appContent, 'dart'));
    
    // Generate widgets if specified
    if (config) {
      const widgetFiles = await this.generateWidgets(context, config);
      files.push(...widgetFiles);
    }
    
    return files;
  }

  /**
   * Generate Flutter test files
   */
  public async generateTestFiles(context: DNAContext, config: any): Promise<TestFile[]> {
    const files: TestFile[] = [];
    
    // Generate widget test
    const widgetTestContent = this.generateWidgetTestContent(context);
    files.push(this.createTestFile('test/widget_test.dart', widgetTestContent, 'flutter_test', 'unit'));
    
    // Generate integration test
    const integrationTestContent = this.generateIntegrationTestContent(context);
    files.push(this.createTestFile('integration_test/app_test.dart', integrationTestContent, 'integration_test', 'integration'));
    
    return files;
  }

  /**
   * Get Flutter runtime dependencies
   */
  public getDependencies(config: FlutterConfig): PackageDependency[] {
    const deps: PackageDependency[] = [
      this.createDependency('flutter', 'sdk', 'dependency'),
      this.createDependency('cupertino_icons', '^1.0.2', 'dependency')
    ];
    
    if (config?.dependencies) {
      config.dependencies.forEach(dep => {
        deps.push(this.createDependency(dep.name, dep.version || 'latest', 'dependency'));
      });
    }
    
    return deps;
  }

  /**
   * Get Flutter development dependencies
   */
  public getDevDependencies(config: any): PackageDependency[] {
    return [
      this.createDependency('flutter_test', 'sdk', 'devDependency'),
      this.createDependency('flutter_lints', '^3.0.0', 'devDependency'),
      this.createDependency('integration_test', 'sdk', 'devDependency')
    ];
  }

  /**
   * Get Flutter peer dependencies
   */
  public getPeerDependencies(config: any): PackageDependency[] {
    return []; // Flutter doesn't use peer dependencies like npm
  }

  /**
   * Update Flutter build configuration
   */
  public async updateBuildConfig(context: DNAContext, config: any): Promise<void> {
    // Update build.gradle files for Android
    await this.updateAndroidBuildConfig(context, config);
    
    // Update iOS build configuration
    await this.updateIOSBuildConfig(context, config);
  }

  /**
   * Generate Flutter widgets
   */
  public async generateWidgets(context: DNAContext, config: FlutterConfig): Promise<WidgetFile[]> {
    const widgets: WidgetFile[] = [];
    
    // Generate home page widget
    const homePageContent = this.generateHomePageWidget(context);
    widgets.push({
      ...this.createSourceFile('lib/pages/home_page.dart', homePageContent, 'dart'),
      widgetName: 'HomePage',
      stateful: true
    } as WidgetFile);
    
    // Generate settings page widget
    const settingsPageContent = this.generateSettingsPageWidget(context);
    widgets.push({
      ...this.createSourceFile('lib/pages/settings_page.dart', settingsPageContent, 'dart'),
      widgetName: 'SettingsPage',
      stateful: false
    } as WidgetFile);
    
    return widgets;
  }

  /**
   * Update pubspec.yaml with dependencies
   */
  public async updatePubspec(context: DNAContext, dependencies: FlutterDependency[]): Promise<void> {
    const pubspecPath = `${context.outputPath}/pubspec.yaml`;
    
    if (await context.fileSystem.exists(pubspecPath)) {
      let content = await context.fileSystem.read(pubspecPath);
      
      // Add dependencies to pubspec.yaml
      const dependencySection = '\ndependencies:\n';
      let insertIndex = content.indexOf(dependencySection);
      
      if (insertIndex === -1) {
        content += dependencySection;
        insertIndex = content.length;
      } else {
        insertIndex += dependencySection.length;
      }
      
      const newDeps = dependencies.map(dep => {
        if (dep.path) {
          return `  ${dep.name}:\n    path: ${dep.path}`;
        } else if (dep.git) {
          return `  ${dep.name}:\n    git: ${dep.git}`;
        } else {
          return `  ${dep.name}: ${dep.version || 'latest'}`;
        }
      }).join('\n');
      
      content = content.slice(0, insertIndex) + newDeps + '\n' + content.slice(insertIndex);
      
      await context.fileSystem.write(pubspecPath, content);
    }
  }

  /**
   * Generate analysis_options.yaml
   */
  public async generateAnalysisOptions(context: DNAContext): Promise<ConfigFile> {
    const content = `include: package:flutter_lints/flutter.yaml

# Additional lint rules for ${context.projectName}
linter:
  rules:
    prefer_single_quotes: true
    sort_child_properties_last: true
    use_key_in_widget_constructors: true
    sized_box_for_whitespace: true
    avoid_unnecessary_containers: true
    prefer_const_constructors: true
    prefer_const_literals_to_create_immutables: true

analyzer:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
  
  strong-mode:
    implicit-casts: false
    implicit-dynamic: false`;

    return this.createConfigFile('analysis_options.yaml', content, 'yaml');
  }

  /**
   * Setup Flutter flavors
   */
  public async setupFlavors(context: DNAContext, flavors: FlutterFlavor[]): Promise<void> {
    for (const flavor of flavors) {
      // Generate flavor-specific configuration
      const flavorConfig = this.generateFlavorConfig(flavor);
      
      // Write flavor configuration files
      await context.fileSystem.write(
        `${context.outputPath}/lib/flavors/${flavor.name}_config.dart`,
        flavorConfig
      );
    }
  }

  /**
   * Add assets to pubspec.yaml
   */
  public async addAssets(context: DNAContext, assets: AssetDefinition[]): Promise<void> {
    const pubspecPath = `${context.outputPath}/pubspec.yaml`;
    
    if (await context.fileSystem.exists(pubspecPath)) {
      let content = await context.fileSystem.read(pubspecPath);
      
      // Add flutter section if it doesn't exist
      if (!content.includes('flutter:')) {
        content += '\nflutter:\n';
      }
      
      // Add assets section
      let assetsSection = content.includes('  assets:') ? '' : '  assets:\n';
      assetsSection += assets.map(asset => `    - ${asset.path}`).join('\n');
      
      if (!content.includes('  assets:')) {
        content = content.replace('flutter:', `flutter:\n${assetsSection}`);
      }
      
      await context.fileSystem.write(pubspecPath, content);
    }
  }

  /**
   * Generate Android configuration files
   */
  public async generateAndroidConfig(context: DNAContext): Promise<ConfigFile[]> {
    const files: ConfigFile[] = [];
    
    // Generate android/app/build.gradle
    const buildGradleContent = this.generateAndroidBuildGradle(context);
    files.push(this.createConfigFile('android/app/build.gradle', buildGradleContent, 'js'));
    
    // Generate android/app/src/main/AndroidManifest.xml
    const manifestContent = this.generateAndroidManifest(context);
    files.push(this.createConfigFile('android/app/src/main/AndroidManifest.xml', manifestContent, 'xml'));
    
    return files;
  }

  /**
   * Generate iOS configuration files
   */
  public async generateIOSConfig(context: DNAContext): Promise<ConfigFile[]> {
    const files: ConfigFile[] = [];
    
    // Generate ios/Runner/Info.plist
    const infoPlistContent = this.generateIOSInfoPlist(context);
    files.push(this.createConfigFile('ios/Runner/Info.plist', infoPlistContent, 'xml'));
    
    return files;
  }

  /**
   * Generate web configuration files
   */
  public async generateWebConfig(context: DNAContext): Promise<ConfigFile[]> {
    const files: ConfigFile[] = [];
    
    // Generate web/index.html
    const indexHtmlContent = this.generateWebIndexHtml(context);
    files.push(this.createConfigFile('web/index.html', indexHtmlContent, 'xml'));
    
    return files;
  }

  /**
   * Get required files for Flutter projects
   */
  protected getRequiredFiles(): string[] {
    return [
      'pubspec.yaml',
      'lib/main.dart',
      'analysis_options.yaml'
    ];
  }

  /**
   * Get Flutter framework complexity
   */
  protected getFrameworkComplexity(): number {
    return 2.5; // Flutter has moderate complexity
  }

  /**
   * Generate pubspec.yaml content
   */
  private generatePubspecContent(context: DNAContext): string {
    return `name: ${context.projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}
description: ${context.variables.description || 'A new Flutter project.'}
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  integration_test:
    sdk: flutter

flutter:
  uses-material-design: true`;
  }

  /**
   * Generate main.dart content
   */
  private generateMainDartContent(context: DNAContext, config: FlutterConfig): string {
    return `import 'package:flutter/material.dart';
import 'app.dart';

void main() {
  runApp(const ${context.projectName.replace(/[^a-zA-Z0-9]/g, '')}App());
}`;
  }

  /**
   * Generate app.dart content
   */
  private generateAppDartContent(context: DNAContext, config: FlutterConfig): string {
    const className = context.projectName.replace(/[^a-zA-Z0-9]/g, '');
    
    return `import 'package:flutter/material.dart';
import 'pages/home_page.dart';

class ${className}App extends StatelessWidget {
  const ${className}App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${context.projectName}',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomePage(title: '${context.projectName}'),
    );
  }
}`;
  }

  /**
   * Generate HomePage widget
   */
  private generateHomePageWidget(context: DNAContext): string {
    return `import 'package:flutter/material.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.title});

  final String title;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'You have pushed the button this many times:',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}`;
  }

  /**
   * Generate SettingsPage widget
   */
  private generateSettingsPageWidget(context: DNAContext): string {
    return `import 'package:flutter/material.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: const Center(
        child: Text(
          'Settings Page',
          style: TextStyle(fontSize: 24),
        ),
      ),
    );
  }
}`;
  }

  /**
   * Generate widget test content
   */
  private generateWidgetTestContent(context: DNAContext): string {
    const className = context.projectName.replace(/[^a-zA-Z0-9]/g, '');
    
    return `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:${context.projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}/app.dart';

void main() {
  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ${className}App());

    // Verify that our counter starts at 0.
    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    // Tap the '+' icon and trigger a frame.
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // Verify that our counter has incremented.
    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });
}`;
  }

  /**
   * Generate integration test content
   */
  private generateIntegrationTestContent(context: DNAContext): string {
    return `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:${context.projectName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('end-to-end test', () {
    testWidgets('tap on the floating action button, verify counter', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Verify the counter starts at 0.
      expect(find.text('0'), findsOneWidget);

      // Finds the floating action button to tap on.
      final Finder fab = find.byIcon(Icons.add);

      // Emulate a tap on the floating action button.
      await tester.tap(fab);

      // Trigger a frame.
      await tester.pumpAndSettle();

      // Verify the counter increments by 1.
      expect(find.text('1'), findsOneWidget);
    });
  });
}`;
  }

  /**
   * Generate Android build.gradle
   */
  private generateAndroidBuildGradle(context: DNAContext): string {
    return `def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localPropertiesFile.withReader('UTF-8') { reader ->
        localProperties.load(reader)
    }
}

def flutterRoot = localProperties.getProperty('flutter.sdk')
if (flutterRoot == null) {
    throw new GradleException("Flutter SDK not found. Define location with flutter.sdk in the local.properties file.")
}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {
    flutterVersionCode = '1'
}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {
    flutterVersionName = '1.0'
}

apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
apply from: "$flutterRoot/packages/flutter_tools/gradle/flutter.gradle"

android {
    compileSdkVersion flutter.compileSdkVersion
    ndkVersion flutter.ndkVersion

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }

    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }

    defaultConfig {
        applicationId "com.example.${context.projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}"
        minSdkVersion flutter.minSdkVersion
        targetSdkVersion flutter.targetSdkVersion
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug
        }
    }
}

flutter {
    source '../..'
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlin_version"
}`;
  }

  /**
   * Generate Android manifest
   */
  private generateAndroidManifest(context: DNAContext): string {
    return `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.${context.projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}">
   <application
        android:label="${context.projectName}"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>`;
  }

  /**
   * Generate iOS Info.plist
   */
  private generateIOSInfoPlist(context: DNAContext): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>${context.projectName}</string>
	<key>CFBundleExecutable</key>
	<string>Runner</string>
	<key>CFBundleIdentifier</key>
	<string>com.example.${context.projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${context.projectName}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleSignature</key>
	<string>????</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIMainStoryboardFile</key>
	<string>Main</string>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<false/>
	<key>CADisableMinimumFrameDurationOnPhone</key>
	<true/>
	<key>UIApplicationSupportsIndirectInputEvents</key>
	<true/>
</dict>
</plist>`;
  }

  /**
   * Generate web index.html
   */
  private generateWebIndexHtml(context: DNAContext): string {
    return `<!DOCTYPE html>
<html>
<head>
  <base href="$FLUTTER_BASE_HREF">
  <meta charset="UTF-8">
  <meta content="IE=Edge" http-equiv="X-UA-Compatible">
  <meta name="description" content="${context.variables.description || 'A new Flutter project.'}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="${context.projectName}">
  <link rel="apple-touch-icon" href="icons/Icon-192.png">
  <link rel="icon" type="image/png" href="favicon.png"/>
  <title>${context.projectName}</title>
  <link rel="manifest" href="manifest.json">
</head>
<body>
  <script>
    window.addEventListener('load', function(ev) {
      // Download main.dart.js
      _flutter.loader.loadEntrypoint({
        serviceWorker: {
          serviceWorkerVersion: serviceWorkerVersion,
        }
      }).then(function(engineInitializer) {
        return engineInitializer.initializeEngine();
      }).then(function(appRunner) {
        return appRunner.runApp();
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Generate flavor configuration
   */
  private generateFlavorConfig(flavor: FlutterFlavor): string {
    return `class ${flavor.name.charAt(0).toUpperCase() + flavor.name.slice(1)}Config {
  static const String appId = '${flavor.appId}';
  static const String displayName = '${flavor.displayName}';
  static const String flavor = '${flavor.name}';
}`;
  }

  /**
   * Update Android build configuration
   */
  private async updateAndroidBuildConfig(context: DNAContext, config: any): Promise<void> {
    // Implementation for updating Android build configuration
    context.logger.debug('Updating Android build configuration for Flutter');
  }

  /**
   * Update iOS build configuration
   */
  private async updateIOSBuildConfig(context: DNAContext, config: any): Promise<void> {
    // Implementation for updating iOS build configuration
    context.logger.debug('Updating iOS build configuration for Flutter');
  }
}