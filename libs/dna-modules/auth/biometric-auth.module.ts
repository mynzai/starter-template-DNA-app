/**
 * @fileoverview Biometric Authentication DNA Module
 */

import { z } from 'zod';
import {
  BaseDNAModule,
  FlutterDNAModule,
  ReactNativeDNAModule,
  NextJSDNAModule,
  TauriDNAModule,
  SvelteKitDNAModule
} from '@dna/core';
import {
  DNAModuleMetadata,
  DNAModuleDependency,
  DNAModuleConflict,
  DNAModuleConfig,
  FrameworkImplementation,
  DNAModuleContext,
  DNAModuleFile,
  SupportedFramework,
  CompatibilityLevel,
  DNAModuleCategory
} from '@dna/core';

/**
 * Biometric Authentication configuration schema
 */
const BiometricAuthConfigSchema = z.object({
  // Biometric types configuration
  enabledBiometrics: z.array(z.enum([
    'fingerprint',
    'faceId',
    'touchId',
    'voiceId',
    'irisId',
    'palmPrint'
  ])).default(['fingerprint', 'faceId']),
  
  // Mobile biometric configuration
  mobileConfig: z.object({
    enableFingerprint: z.boolean().default(true),
    enableFaceId: z.boolean().default(true),
    enableTouchId: z.boolean().default(true),
    fallbackToPasscode: z.boolean().default(true),
    promptMessage: z.string().default('Please authenticate using biometrics'),
    cancelButtonText: z.string().default('Cancel'),
    fallbackButtonText: z.string().default('Use Passcode'),
    maxRetryAttempts: z.number().min(1).max(5).default(3)
  }).default({}),
  
  // Web biometric configuration (WebAuthn)
  webAuthnConfig: z.object({
    enableWebAuthn: z.boolean().default(true),
    relyingPartyName: z.string().default('Your App'),
    relyingPartyId: z.string().optional(),
    requireResidentKey: z.boolean().default(false),
    userVerification: z.enum(['required', 'preferred', 'discouraged']).default('preferred'),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
    attestation: z.enum(['none', 'indirect', 'direct']).default('none'),
    timeout: z.number().default(60000),
    enablePasswordlessLogin: z.boolean().default(true),
    allowCredentials: z.boolean().default(true)
  }).default({}),
  
  // Security configuration
  securityConfig: z.object({
    enableSecureEnclave: z.boolean().default(true),
    enableBiometricBinding: z.boolean().default(true),
    enableLivenessDetection: z.boolean().default(false),
    enableAntiSpoofing: z.boolean().default(true),
    biometricHashingAlgorithm: z.enum(['SHA256', 'SHA512', 'PBKDF2']).default('SHA256'),
    enableTemplatePeriodRenewal: z.boolean().default(true),
    templateValidityPeriod: z.string().default('90d')
  }).default({}),
  
  // Fallback authentication
  fallbackConfig: z.object({
    enablePinFallback: z.boolean().default(true),
    enablePasswordFallback: z.boolean().default(true),
    enablePatternFallback: z.boolean().default(false),
    pinLength: z.number().min(4).max(8).default(6),
    maxFailedAttempts: z.number().min(3).max(10).default(5),
    lockoutDuration: z.string().default('15m')
  }).default({}),
  
  // Storage configuration
  storageConfig: z.object({
    storeBiometricTemplates: z.boolean().default(false),
    enableCloudSync: z.boolean().default(false),
    encryptionKey: z.string().optional(),
    storageBackend: z.enum(['secure-enclave', 'keychain', 'encrypted-storage']).default('secure-enclave')
  }).default({}),
  
  // Privacy and compliance
  privacyConfig: z.object({
    enableDataMinimization: z.boolean().default(true),
    enableConsentManagement: z.boolean().default(true),
    biometricDataRetention: z.string().default('30d'),
    enableGDPRCompliance: z.boolean().default(true),
    enableCCPACompliance: z.boolean().default(true),
    allowBiometricDataExport: z.boolean().default(false)
  }).default({}),
  
  // Advanced features
  advancedConfig: z.object({
    enableContinuousAuth: z.boolean().default(false),
    enableBehavioralBiometrics: z.boolean().default(false),
    enableMultiModalBiometrics: z.boolean().default(false),
    enableBiometricFusion: z.boolean().default(false),
    confidenceThreshold: z.number().min(0).max(1).default(0.85),
    enableAdaptiveSecurity: z.boolean().default(false)
  }).default({}),
  
  // Integration settings
  integrationConfig: z.object({
    requirePrimaryAuth: z.boolean().default(true),
    enableBiometricOnlyMode: z.boolean().default(false),
    integrationMode: z.enum(['supplementary', 'replacement', 'hybrid']).default('supplementary'),
    enableSessionExtension: z.boolean().default(true),
    sessionExtensionDuration: z.string().default('15m')
  }).default({})
});

export type BiometricAuthConfig = z.infer<typeof BiometricAuthConfigSchema>;

/**
 * Biometric Authentication DNA Module Implementation
 */
export class BiometricAuthModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'auth-biometric',
    name: 'Biometric Authentication',
    description: 'Advanced biometric authentication with fingerprint, Face ID, WebAuthn, and secure enclave integration',
    version: '1.0.0',
    category: DNAModuleCategory.AUTHENTICATION,
    author: 'DNA Team',
    license: 'MIT',
    keywords: ['auth', 'biometric', 'fingerprint', 'faceid', 'webauthn', 'security', 'touchid'],
    deprecated: false,
    experimental: false
  };

  public readonly dependencies: DNAModuleDependency[] = [
    {
      moduleId: 'security-encryption',
      version: '^1.0.0',
      optional: false,
      reason: 'Required for secure biometric data handling and encryption'
    }
  ];

  public readonly conflicts: DNAModuleConflict[] = [];

  public readonly frameworks: FrameworkImplementation[] = [
    // Flutter implementation
    {
      framework: SupportedFramework.FLUTTER,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [
        'local_auth',
        'flutter_secure_storage',
        'crypto',
        'pointycastle',
        'device_info_plus'
      ],
      devDependencies: ['flutter_test', 'mockito'],
      peerDependencies: [],
      configFiles: [
        'pubspec.yaml',
        'android/app/src/main/AndroidManifest.xml',
        'ios/Runner/Info.plist'
      ],
      templates: ['lib/auth/', 'test/auth/'],
      postInstallSteps: [
        'flutter pub get',
        'flutter packages pub run build_runner build --delete-conflicting-outputs'
      ],
      limitations: ['Requires device biometric hardware support']
    },
    // React Native implementation
    {
      framework: SupportedFramework.REACT_NATIVE,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: [
        'react-native-biometrics',
        'react-native-touch-id',
        '@react-native-async-storage/async-storage',
        'react-native-keychain',
        'react-native-device-info'
      ],
      devDependencies: ['@types/react-native', 'jest', '@testing-library/react-native'],
      peerDependencies: ['react', 'react-native'],
      configFiles: [
        'metro.config.js',
        'android/app/src/main/AndroidManifest.xml',
        'ios/Runner/Info.plist'
      ],
      templates: ['src/auth/', '__tests__/auth/'],
      postInstallSteps: [
        'npx pod-install',
        'npx react-native link react-native-biometrics'
      ],
      limitations: ['Requires device biometric hardware support']
    },
    // Next.js implementation (WebAuthn only)
    {
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.PARTIAL,
      dependencies: [
        '@simplewebauthn/server',
        '@simplewebauthn/browser',
        'cbor',
        'base64url',
        'uuid'
      ],
      devDependencies: ['@types/uuid', 'jest'],
      peerDependencies: ['next', 'react'],
      configFiles: ['next.config.js'],
      templates: ['pages/api/auth/', 'src/auth/', '__tests__/auth/'],
      postInstallSteps: [],
      limitations: ['Limited to WebAuthn - no mobile biometrics']
    },
    // Tauri implementation
    {
      framework: SupportedFramework.TAURI,
      supported: true,
      compatibility: CompatibilityLevel.PARTIAL,
      dependencies: ['@tauri-apps/api', '@simplewebauthn/browser'],
      devDependencies: ['@tauri-apps/cli'],
      peerDependencies: [],
      configFiles: ['src-tauri/tauri.conf.json'],
      templates: ['src/auth/', 'src-tauri/src/auth/'],
      postInstallSteps: ['cargo check'],
      limitations: ['Platform-dependent biometric support']
    },
    // SvelteKit implementation (WebAuthn only)
    {
      framework: SupportedFramework.SVELTEKIT,
      supported: true,
      compatibility: CompatibilityLevel.PARTIAL,
      dependencies: [
        '@simplewebauthn/server',
        '@simplewebauthn/browser',
        'cbor',
        'base64url'
      ],
      devDependencies: ['vitest'],
      peerDependencies: ['svelte', '@sveltejs/kit'],
      configFiles: ['vite.config.ts'],
      templates: ['src/routes/auth/', 'src/lib/auth/', 'src/tests/auth/'],
      postInstallSteps: [],
      limitations: ['Limited to WebAuthn - no mobile biometrics']
    }
  ];

  public readonly config: DNAModuleConfig = {
    schema: BiometricAuthConfigSchema,
    defaults: {
      enabledBiometrics: ['fingerprint', 'faceId'],
      mobileConfig: {
        enableFingerprint: true,
        enableFaceId: true,
        enableTouchId: true,
        fallbackToPasscode: true,
        promptMessage: 'Please authenticate using biometrics',
        cancelButtonText: 'Cancel',
        fallbackButtonText: 'Use Passcode',
        maxRetryAttempts: 3
      },
      webAuthnConfig: {
        enableWebAuthn: true,
        relyingPartyName: 'Your App',
        requireResidentKey: false,
        userVerification: 'preferred',
        attestation: 'none',
        timeout: 60000,
        enablePasswordlessLogin: true,
        allowCredentials: true
      },
      securityConfig: {
        enableSecureEnclave: true,
        enableBiometricBinding: true,
        enableLivenessDetection: false,
        enableAntiSpoofing: true,
        biometricHashingAlgorithm: 'SHA256',
        enableTemplatePeriodRenewal: true,
        templateValidityPeriod: '90d'
      },
      fallbackConfig: {
        enablePinFallback: true,
        enablePasswordFallback: true,
        enablePatternFallback: false,
        pinLength: 6,
        maxFailedAttempts: 5,
        lockoutDuration: '15m'
      },
      storageConfig: {
        storeBiometricTemplates: false,
        enableCloudSync: false,
        storageBackend: 'secure-enclave'
      },
      privacyConfig: {
        enableDataMinimization: true,
        enableConsentManagement: true,
        biometricDataRetention: '30d',
        enableGDPRCompliance: true,
        enableCCPACompliance: true,
        allowBiometricDataExport: false
      },
      advancedConfig: {
        enableContinuousAuth: false,
        enableBehavioralBiometrics: false,
        enableMultiModalBiometrics: false,
        enableBiometricFusion: false,
        confidenceThreshold: 0.85,
        enableAdaptiveSecurity: false
      },
      integrationConfig: {
        requirePrimaryAuth: true,
        enableBiometricOnlyMode: false,
        integrationMode: 'supplementary',
        enableSessionExtension: true,
        sessionExtensionDuration: '15m'
      }
    },
    required: [],
    validation: {
      rules: {},
      custom: async (config: BiometricAuthConfig) => {
        const errors: string[] = [];
        
        if (config.enabledBiometrics.length === 0) {
          errors.push('At least one biometric type must be enabled');
        }

        if (config.advancedConfig.confidenceThreshold < 0 || config.advancedConfig.confidenceThreshold > 1) {
          errors.push('Confidence threshold must be between 0 and 1');
        }

        if (config.fallbackConfig.pinLength < 4 || config.fallbackConfig.pinLength > 8) {
          errors.push('PIN length must be between 4 and 8 digits');
        }

        if (config.integrationConfig.enableBiometricOnlyMode && config.integrationConfig.requirePrimaryAuth) {
          errors.push('Cannot require primary auth when biometric-only mode is enabled');
        }
        
        return errors;
      }
    }
  };

  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];
    const config = context.moduleConfig as BiometricAuthConfig;

    switch (context.framework) {
      case SupportedFramework.FLUTTER:
        files.push(...await this.generateFlutterFiles(config, context));
        break;
      case SupportedFramework.REACT_NATIVE:
        files.push(...await this.generateReactNativeFiles(config, context));
        break;
      case SupportedFramework.NEXTJS:
        files.push(...await this.generateNextJSFiles(config, context));
        break;
      case SupportedFramework.TAURI:
        files.push(...await this.generateTauriFiles(config, context));
        break;
      case SupportedFramework.SVELTEKIT:
        files.push(...await this.generateSvelteKitFiles(config, context));
        break;
    }

    return files;
  }

  private async generateFlutterFiles(config: BiometricAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Biometric service
    files.push({
      relativePath: 'lib/services/biometric_service.dart',
      content: this.generateFlutterBiometricService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Biometric types enum
    files.push({
      relativePath: 'lib/auth/biometric_types.dart',
      content: this.generateFlutterBiometricTypes(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Biometric provider
    files.push({
      relativePath: 'lib/providers/biometric_provider.dart',
      content: this.generateFlutterBiometricProvider(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    // Biometric widgets
    files.push({
      relativePath: 'lib/widgets/biometric_auth_widget.dart',
      content: this.generateFlutterBiometricWidget(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.FLUTTER }
    });

    return files;
  }

  private async generateReactNativeFiles(config: BiometricAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Biometric service
    files.push({
      relativePath: 'src/services/biometricService.ts',
      content: this.generateReactNativeBiometricService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // Biometric context
    files.push({
      relativePath: 'src/contexts/BiometricContext.tsx',
      content: this.generateReactNativeBiometricContext(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    // Biometric components
    files.push({
      relativePath: 'src/components/BiometricAuth.tsx',
      content: this.generateReactNativeBiometricComponent(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.REACT_NATIVE }
    });

    return files;
  }

  private async generateNextJSFiles(config: BiometricAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // WebAuthn API routes
    files.push({
      relativePath: 'pages/api/auth/webauthn/register-begin.ts',
      content: this.generateNextJSWebAuthnRegisterBegin(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    files.push({
      relativePath: 'pages/api/auth/webauthn/register-finish.ts',
      content: this.generateNextJSWebAuthnRegisterFinish(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    files.push({
      relativePath: 'pages/api/auth/webauthn/authenticate-begin.ts',
      content: this.generateNextJSWebAuthnAuthBegin(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    files.push({
      relativePath: 'pages/api/auth/webauthn/authenticate-finish.ts',
      content: this.generateNextJSWebAuthnAuthFinish(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS, isAPI: true }
    });

    // WebAuthn client service
    files.push({
      relativePath: 'src/lib/auth/webauthn.ts',
      content: this.generateNextJSWebAuthnClient(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.NEXTJS }
    });

    return files;
  }

  private async generateTauriFiles(config: BiometricAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Frontend biometric service
    files.push({
      relativePath: 'src/services/biometricService.ts',
      content: this.generateTauriBiometricService(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.TAURI, isFrontend: true }
    });

    return files;
  }

  private async generateSvelteKitFiles(config: BiometricAuthConfig, context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // WebAuthn service
    files.push({
      relativePath: 'src/lib/auth/webauthn.ts',
      content: this.generateSvelteKitWebAuthn(config),
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: { framework: SupportedFramework.SVELTEKIT }
    });

    return files;
  }

  // Code generation methods
  private generateFlutterBiometricService(config: BiometricAuthConfig): string {
    return `import 'dart:convert';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';

enum BiometricType {
  fingerprint,
  face,
  iris,
  none
}

class BiometricService {
  static const _storage = FlutterSecureStorage();
  static const String _biometricKeyPrefix = 'biometric_';
  static const String _deviceIdKey = 'device_id';
  
  final LocalAuthentication _localAuth = LocalAuthentication();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  Future<bool> isBiometricAvailable() async {
    try {
      final bool isAvailable = await _localAuth.canCheckBiometrics;
      final List<BiometricType> availableBiometrics = await _localAuth.getAvailableBiometrics();
      
      ${config.mobileConfig.enableFingerprint ? `
      if (availableBiometrics.contains(BiometricType.fingerprint)) {
        return true;
      }` : ''}
      
      ${config.mobileConfig.enableFaceId ? `
      if (availableBiometrics.contains(BiometricType.face)) {
        return true;
      }` : ''}
      
      return isAvailable && availableBiometrics.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      final List<BiometricType> availableBiometrics = await _localAuth.getAvailableBiometrics();
      return availableBiometrics.where((type) {
        switch (type) {
          case BiometricType.fingerprint:
            return ${config.mobileConfig.enableFingerprint};
          case BiometricType.face:
            return ${config.mobileConfig.enableFaceId};
          default:
            return false;
        }
      }).toList();
    } catch (e) {
      return [];
    }
  }

  Future<bool> authenticateWithBiometrics({
    String reason = '${config.mobileConfig.promptMessage}',
    bool fallbackToPasscode = ${config.mobileConfig.fallbackToPasscode},
  }) async {
    try {
      final bool isAvailable = await isBiometricAvailable();
      if (!isAvailable) return false;

      ${config.securityConfig.enableBiometricBinding ? `
      // Device binding check
      final deviceId = await getDeviceId();
      final storedDeviceId = await _storage.read(key: _deviceIdKey);
      
      if (storedDeviceId != null && storedDeviceId != deviceId) {
        throw Exception('Device binding validation failed');
      }` : ''}

      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          biometricOnly: !fallbackToPasscode,
          stickyAuth: true,
          ${config.mobileConfig.fallbackToPasscode ? 'useErrorDialogs: true,' : ''}
        ),
      );

      if (didAuthenticate) {
        ${config.securityConfig.enableBiometricBinding ? `
        // Store device binding
        await _storage.write(key: _deviceIdKey, value: deviceId);` : ''}
        
        ${config.integrationConfig.enableSessionExtension ? `
        // Extend session
        await extendSession();` : ''}
      }

      return didAuthenticate;
    } catch (e) {
      print('Biometric authentication failed: \$e');
      return false;
    }
  }

  ${config.securityConfig.enableBiometricBinding ? `
  Future<String> getDeviceId() async {
    try {
      final deviceInfo = await _deviceInfo.deviceInfo;
      final deviceMap = deviceInfo.data;
      final deviceString = deviceMap.toString();
      final bytes = utf8.encode(deviceString);
      final digest = sha256.convert(bytes);
      return digest.toString();
    } catch (e) {
      return 'unknown_device';
    }
  }` : ''}

  ${config.integrationConfig.enableSessionExtension ? `
  Future<void> extendSession() async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await _storage.write(key: 'biometric_auth_time', value: now.toString());
  }

  Future<bool> isSessionValid() async {
    try {
      final authTimeStr = await _storage.read(key: 'biometric_auth_time');
      if (authTimeStr == null) return false;
      
      final authTime = int.parse(authTimeStr);
      final now = DateTime.now().millisecondsSinceEpoch;
      final sessionDuration = ${this.parseDuration(config.integrationConfig.sessionExtensionDuration)} * 1000;
      
      return (now - authTime) < sessionDuration;
    } catch (e) {
      return false;
    }
  }` : ''}

  ${config.fallbackConfig.enablePinFallback ? `
  Future<bool> authenticateWithPin(String pin) async {
    try {
      final storedPinHash = await _storage.read(key: 'pin_hash');
      if (storedPinHash == null) return false;
      
      final pinBytes = utf8.encode(pin);
      final pinHash = sha256.convert(pinBytes).toString();
      
      return pinHash == storedPinHash;
    } catch (e) {
      return false;
    }
  }

  Future<void> setPinFallback(String pin) async {
    if (pin.length != ${config.fallbackConfig.pinLength}) {
      throw Exception('PIN must be ${config.fallbackConfig.pinLength} digits');
    }
    
    final pinBytes = utf8.encode(pin);
    final pinHash = sha256.convert(pinBytes).toString();
    await _storage.write(key: 'pin_hash', value: pinHash);
  }` : ''}

  Future<void> clearBiometricData() async {
    await _storage.deleteAll();
  }

  ${config.privacyConfig.enableConsentManagement ? `
  Future<bool> getBiometricConsent() async {
    final consent = await _storage.read(key: 'biometric_consent');
    return consent == 'true';
  }

  Future<void> setBiometricConsent(bool consent) async {
    await _storage.write(key: 'biometric_consent', value: consent.toString());
  }` : ''}
}`;
  }

  private generateNextJSWebAuthnRegisterBegin(config: BiometricAuthConfig): string {
    return `import { NextApiRequest, NextApiResponse } from 'next';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, username, displayName } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ error: 'userId and username are required' });
    }

    const user = {
      id: userId,
      name: username,
      displayName: displayName || username,
    };

    // Get existing credentials for this user
    const existingCredentials = await getUserCredentials(userId);

    const options = await generateRegistrationOptions({
      rpName: '${config.webAuthnConfig.relyingPartyName}',
      rpID: '${config.webAuthnConfig.relyingPartyId || 'localhost'}',
      userID: userId,
      userName: user.name,
      userDisplayName: user.displayName,
      timeout: ${config.webAuthnConfig.timeout},
      attestationType: '${config.webAuthnConfig.attestation}',
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports,
      })),
      authenticatorSelection: {
        ${config.webAuthnConfig.authenticatorAttachment ? `authenticatorAttachment: '${config.webAuthnConfig.authenticatorAttachment}',` : ''}
        userVerification: '${config.webAuthnConfig.userVerification}',
        ${config.webAuthnConfig.requireResidentKey ? 'requireResidentKey: true,' : ''}
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });

    // Store challenge in session or database
    req.session.challenge = options.challenge;
    req.session.userId = userId;

    res.status(200).json(options);
  } catch (error) {
    console.error('Registration options generation failed:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
}

async function getUserCredentials(userId: string) {
  // Implement your credential lookup logic
  return [];
}`;
  }

  private generateNextJSWebAuthnRegisterFinish(config: BiometricAuthConfig): string {
    return `import { NextApiRequest, NextApiResponse } from 'next';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { credential } = req.body;
    const expectedChallenge = req.session.challenge;
    const userId = req.session.userId;

    if (!expectedChallenge || !userId) {
      return res.status(400).json({ error: 'Invalid session state' });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
      expectedRPID: '${config.webAuthnConfig.relyingPartyId || 'localhost'}',
      ${config.webAuthnConfig.requireResidentKey ? 'requireUserVerification: true,' : ''}
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      // Store credential in database
      await storeUserCredential({
        userId,
        credentialID,
        credentialPublicKey,
        counter,
        transports: credential.response.transports || [],
      });

      // Clear session data
      delete req.session.challenge;
      delete req.session.userId;

      res.status(200).json({ verified: true });
    } else {
      res.status(400).json({ error: 'Registration verification failed' });
    }
  } catch (error) {
    console.error('Registration verification failed:', error);
    res.status(500).json({ error: 'Registration verification failed' });
  }
}

async function storeUserCredential(credential: any) {
  // Implement your credential storage logic
}`;
  }

  private generateNextJSWebAuthnAuthBegin(config: BiometricAuthConfig): string {
    return `import { NextApiRequest, NextApiResponse } from 'next';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    ${config.webAuthnConfig.enablePasswordlessLogin ? `
    // For passwordless login, userId might be optional
    let userCredentials = [];
    if (userId) {
      userCredentials = await getUserCredentials(userId);
    }` : `
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const userCredentials = await getUserCredentials(userId);`}

    const options = await generateAuthenticationOptions({
      timeout: ${config.webAuthnConfig.timeout},
      ${config.webAuthnConfig.allowCredentials ? `
      allowCredentials: userCredentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports,
      })),` : ''}
      userVerification: '${config.webAuthnConfig.userVerification}',
      rpID: '${config.webAuthnConfig.relyingPartyId || 'localhost'}',
    });

    // Store challenge in session
    req.session.challenge = options.challenge;
    if (userId) {
      req.session.userId = userId;
    }

    res.status(200).json(options);
  } catch (error) {
    console.error('Authentication options generation failed:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
}

async function getUserCredentials(userId: string) {
  // Implement your credential lookup logic
  return [];
}`;
  }

  private generateNextJSWebAuthnAuthFinish(config: BiometricAuthConfig): string {
    return `import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { credential } = req.body;
    const expectedChallenge = req.session.challenge;

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Invalid session state' });
    }

    // Get credential from database
    const dbCredential = await getCredentialById(credential.id);
    
    if (!dbCredential) {
      return res.status(400).json({ error: 'Credential not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
      expectedRPID: '${config.webAuthnConfig.relyingPartyId || 'localhost'}',
      authenticator: {
        credentialID: dbCredential.credentialID,
        credentialPublicKey: dbCredential.credentialPublicKey,
        counter: dbCredential.counter,
        transports: dbCredential.transports,
      },
      ${config.webAuthnConfig.userVerification === 'required' ? 'requireUserVerification: true,' : ''}
    });

    if (verification.verified) {
      // Update counter
      await updateCredentialCounter(credential.id, verification.authenticationInfo.newCounter);

      // Create session
      req.session.userId = dbCredential.userId;
      req.session.authenticatedAt = Date.now();
      req.session.authMethod = 'webauthn';

      // Clear challenge
      delete req.session.challenge;

      res.status(200).json({ 
        verified: true,
        user: await getUserById(dbCredential.userId)
      });
    } else {
      res.status(400).json({ error: 'Authentication verification failed' });
    }
  } catch (error) {
    console.error('Authentication verification failed:', error);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
}

async function getCredentialById(credentialId: string) {
  // Implement your credential lookup logic
  return null;
}

async function updateCredentialCounter(credentialId: string, newCounter: number) {
  // Implement your counter update logic
}

async function getUserById(userId: string) {
  // Implement your user lookup logic
  return null;
}`;
  }

  private generateNextJSWebAuthnClient(config: BiometricAuthConfig): string {
    return `import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export class WebAuthnService {
  static async isWebAuthnSupported(): Promise<boolean> {
    return !!(navigator.credentials && navigator.credentials.create);
  }

  static async registerCredential(userId: string, username: string, displayName?: string) {
    try {
      if (!await this.isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported');
      }

      // Get registration options from server
      const optionsResponse = await fetch('/api/auth/webauthn/register-begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, displayName }),
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsResponse.json();

      // Start registration
      const credential = await startRegistration(options);

      // Verify registration
      const verificationResponse = await fetch('/api/auth/webauthn/register-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!verificationResponse.ok) {
        throw new Error('Registration verification failed');
      }

      const verificationResult = await verificationResponse.json();
      return verificationResult.verified;
    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      throw error;
    }
  }

  static async authenticateWithCredential(userId?: string) {
    try {
      if (!await this.isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported');
      }

      // Get authentication options from server
      const optionsResponse = await fetch('/api/auth/webauthn/authenticate-begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options');
      }

      const options = await optionsResponse.json();

      // Start authentication
      const credential = await startAuthentication(options);

      // Verify authentication
      const verificationResponse = await fetch('/api/auth/webauthn/authenticate-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!verificationResponse.ok) {
        throw new Error('Authentication verification failed');
      }

      const verificationResult = await verificationResponse.json();
      return verificationResult;
    } catch (error) {
      console.error('WebAuthn authentication failed:', error);
      throw error;
    }
  }

  ${config.webAuthnConfig.enablePasswordlessLogin ? `
  static async authenticatePasswordless() {
    return this.authenticateWithCredential(); // No userId for passwordless
  }` : ''}
}`;
  }

  // Helper method
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([hmsdwy])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
      y: 31556952
    };

    return value * (multipliers[unit] || 60);
  }

  // Placeholder implementations for other methods
  private generateFlutterBiometricTypes(config: BiometricAuthConfig): string {
    return '// Flutter biometric types definitions';
  }

  private generateFlutterBiometricProvider(config: BiometricAuthConfig): string {
    return '// Flutter biometric provider implementation';
  }

  private generateFlutterBiometricWidget(config: BiometricAuthConfig): string {
    return '// Flutter biometric authentication widget';
  }

  private generateReactNativeBiometricService(config: BiometricAuthConfig): string {
    return '// React Native biometric service implementation';
  }

  private generateReactNativeBiometricContext(config: BiometricAuthConfig): string {
    return '// React Native biometric context implementation';
  }

  private generateReactNativeBiometricComponent(config: BiometricAuthConfig): string {
    return '// React Native biometric component implementation';
  }

  private generateTauriBiometricService(config: BiometricAuthConfig): string {
    return '// Tauri biometric service implementation';
  }

  private generateSvelteKitWebAuthn(config: BiometricAuthConfig): string {
    return '// SvelteKit WebAuthn implementation';
  }
}