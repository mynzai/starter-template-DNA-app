/**
 * @fileoverview Biometric Authentication DNA Module - Epic 5 Story 2 AC4
 * Provides biometric authentication for mobile with fallback options
 */

import { EventEmitter } from 'events';
import { BaseDNAModule } from '../../core/src/lib/dna-module';
import {
  DNAModuleMetadata,
  DNAModuleFile,
  DNAModuleContext,
  SupportedFramework,
  DNAModuleCategory,
  FrameworkSupport
} from '../../core/src/lib/types';

/**
 * Supported biometric types
 */
export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE_ID = 'faceId',
  FACE_RECOGNITION = 'faceRecognition',
  VOICE_RECOGNITION = 'voiceRecognition',
  IRIS_SCAN = 'irisScan',
  TOUCH_ID = 'touchId'
}

/**
 * Biometric availability status
 */
export enum BiometricStatus {
  AVAILABLE = 'available',
  NOT_AVAILABLE = 'notAvailable',
  NOT_ENROLLED = 'notEnrolled',
  PERMISSION_DENIED = 'permissionDenied',
  HARDWARE_UNAVAILABLE = 'hardwareUnavailable',
  SECURITY_UPDATE_REQUIRED = 'securityUpdateRequired'
}

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  success: boolean;
  biometricType?: BiometricType;
  fallbackUsed?: boolean;
  fallbackMethod?: string;
  error?: {
    code: string;
    message: string;
    userCancel?: boolean;
    systemCancel?: boolean;
    lockout?: boolean;
    permanent?: boolean;
  };
  metadata?: {
    timestamp: number;
    attempts: number;
    deviceInfo?: string;
  };
}

/**
 * Biometric availability check result
 */
export interface BiometricAvailability {
  available: boolean;
  biometricTypes: BiometricType[];
  status: BiometricStatus;
  enrolled: boolean;
  strongBiometrics: boolean; // Class 3 biometrics
  weakBiometrics: boolean;   // Class 2 biometrics
  hardwareDetected: boolean;
  permissionGranted: boolean;
  securityLevel: 'none' | 'weak' | 'strong';
}

/**
 * Biometric configuration
 */
export interface BiometricConfig {
  // Primary authentication settings
  allowedBiometrics: BiometricType[];
  requireStrongBiometrics: boolean;
  maxAttempts: number;
  lockoutDuration: number; // in seconds
  
  // Fallback settings
  enableFallback: boolean;
  fallbackMethods: FallbackMethod[];
  fallbackAfterAttempts: number;
  
  // Security settings
  requireDeviceCredential: boolean;
  allowDeviceCredentialFallback: boolean;
  invalidateOnBiometricChange: boolean;
  
  // UI customization
  promptConfig: {
    title: string;
    subtitle?: string;
    description?: string;
    negativeButtonText?: string;
    cancelButtonText?: string;
    fallbackButtonText?: string;
  };
  
  // Platform-specific settings
  android?: {
    allowBackup: boolean;
    confirmationRequired: boolean;
    deviceCredentialAllowed: boolean;
  };
  ios?: {
    fallbackTitle?: string;
    localizedFallbackTitle?: string;
    touchIDAuthenticationAllowableReuseDuration?: number;
  };
}

/**
 * Fallback authentication methods
 */
export enum FallbackMethod {
  PIN = 'pin',
  PASSWORD = 'password',
  PATTERN = 'pattern',
  DEVICE_CREDENTIAL = 'deviceCredential',
  SECURITY_QUESTIONS = 'securityQuestions',
  SMS_CODE = 'smsCode',
  EMAIL_CODE = 'emailCode'
}

/**
 * Fallback authentication result
 */
export interface FallbackAuthResult {
  success: boolean;
  method: FallbackMethod;
  attempts: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Platform detection interface
 */
export interface IPlatformDetector {
  getPlatform(): 'ios' | 'android' | 'web' | 'desktop' | 'unknown';
  getVersion(): string;
  isSimulator(): boolean;
  hasSecureHardware(): boolean;
  getSupportedBiometrics(): Promise<BiometricType[]>;
}

/**
 * Biometric provider interface for different platforms
 */
export interface IBiometricProvider {
  readonly platform: string;
  checkAvailability(): Promise<BiometricAvailability>;
  authenticate(config: BiometricConfig): Promise<BiometricAuthResult>;
  enrollBiometric?(type: BiometricType): Promise<boolean>;
  removeBiometric?(type: BiometricType): Promise<boolean>;
  getBiometricSettings?(): Promise<any>;
}

/**
 * React Native biometric provider implementation
 */
class ReactNativeBiometricProvider implements IBiometricProvider {
  readonly platform = 'react-native';

  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      // This would use react-native-biometrics or similar library
      // Simulated implementation
      const biometrics = await this.getAvailableBiometrics();
      
      return {
        available: biometrics.length > 0,
        biometricTypes: biometrics,
        status: biometrics.length > 0 ? BiometricStatus.AVAILABLE : BiometricStatus.NOT_AVAILABLE,
        enrolled: biometrics.length > 0,
        strongBiometrics: biometrics.some(b => 
          [BiometricType.FACE_ID, BiometricType.FINGERPRINT, BiometricType.IRIS_SCAN].includes(b)
        ),
        weakBiometrics: biometrics.some(b => 
          [BiometricType.FACE_RECOGNITION, BiometricType.VOICE_RECOGNITION].includes(b)
        ),
        hardwareDetected: true, // Would check actual hardware
        permissionGranted: true, // Would check permissions
        securityLevel: biometrics.length > 0 ? 'strong' : 'none'
      };
    } catch (error) {
      return {
        available: false,
        biometricTypes: [],
        status: BiometricStatus.NOT_AVAILABLE,
        enrolled: false,
        strongBiometrics: false,
        weakBiometrics: false,
        hardwareDetected: false,
        permissionGranted: false,
        securityLevel: 'none'
      };
    }
  }

  async authenticate(config: BiometricConfig): Promise<BiometricAuthResult> {
    try {
      // Simulated biometric authentication
      const availability = await this.checkAvailability();
      
      if (!availability.available) {
        return {
          success: false,
          error: {
            code: 'biometric_not_available',
            message: 'Biometric authentication not available'
          }
        };
      }

      // Simulate authentication process
      const authSuccess = Math.random() > 0.1; // 90% success rate for simulation
      
      if (authSuccess) {
        const usedBiometric = availability.biometricTypes[0];
        return {
          success: true,
          biometricType: usedBiometric,
          metadata: {
            timestamp: Date.now(),
            attempts: 1,
            deviceInfo: 'React Native Device'
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'authentication_failed',
            message: 'Biometric authentication failed',
            userCancel: false,
            systemCancel: false,
            lockout: false
          },
          metadata: {
            timestamp: Date.now(),
            attempts: 1
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'authentication_error',
          message: error instanceof Error ? error.message : 'Authentication error'
        }
      };
    }
  }

  private async getAvailableBiometrics(): Promise<BiometricType[]> {
    // Simulated platform-specific biometric detection
    const platform = this.detectPlatform();
    
    if (platform === 'ios') {
      return [BiometricType.FACE_ID, BiometricType.TOUCH_ID];
    } else if (platform === 'android') {
      return [BiometricType.FINGERPRINT, BiometricType.FACE_RECOGNITION];
    }
    
    return [];
  }

  private detectPlatform(): string {
    // Platform detection logic would go here
    return 'android'; // Simulated
  }
}

/**
 * Flutter biometric provider implementation
 */
class FlutterBiometricProvider implements IBiometricProvider {
  readonly platform = 'flutter';

  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      // This would use local_auth package or similar
      const availableBiometrics = await this.getAvailableBiometrics();
      
      return {
        available: availableBiometrics.length > 0,
        biometricTypes: availableBiometrics,
        status: availableBiometrics.length > 0 ? BiometricStatus.AVAILABLE : BiometricStatus.NOT_AVAILABLE,
        enrolled: true, // Would check actual enrollment
        strongBiometrics: availableBiometrics.some(b => 
          [BiometricType.FINGERPRINT, BiometricType.FACE_ID].includes(b)
        ),
        weakBiometrics: false,
        hardwareDetected: true,
        permissionGranted: true,
        securityLevel: 'strong'
      };
    } catch (error) {
      return {
        available: false,
        biometricTypes: [],
        status: BiometricStatus.HARDWARE_UNAVAILABLE,
        enrolled: false,
        strongBiometrics: false,
        weakBiometrics: false,
        hardwareDetected: false,
        permissionGranted: false,
        securityLevel: 'none'
      };
    }
  }

  async authenticate(config: BiometricConfig): Promise<BiometricAuthResult> {
    try {
      const availability = await this.checkAvailability();
      
      if (!availability.available) {
        return {
          success: false,
          error: {
            code: 'biometric_not_available',
            message: 'Biometric authentication not available'
          }
        };
      }

      // Simulate Flutter local_auth authentication
      const authSuccess = Math.random() > 0.05; // 95% success rate
      
      if (authSuccess) {
        return {
          success: true,
          biometricType: availability.biometricTypes[0],
          metadata: {
            timestamp: Date.now(),
            attempts: 1,
            deviceInfo: 'Flutter Device'
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'user_cancel',
            message: 'User cancelled biometric authentication',
            userCancel: true
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'platform_error',
          message: error instanceof Error ? error.message : 'Platform error'
        }
      };
    }
  }

  private async getAvailableBiometrics(): Promise<BiometricType[]> {
    // Simulated Flutter biometric detection
    return [BiometricType.FINGERPRINT, BiometricType.FACE_ID];
  }
}

/**
 * Web biometric provider implementation (WebAuthn)
 */
class WebBiometricProvider implements IBiometricProvider {
  readonly platform = 'web';

  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const available = this.isWebAuthnSupported() && this.isPlatformAuthenticatorAvailable();
      
      return {
        available,
        biometricTypes: available ? [BiometricType.FINGERPRINT, BiometricType.FACE_ID] : [],
        status: available ? BiometricStatus.AVAILABLE : BiometricStatus.NOT_AVAILABLE,
        enrolled: available, // WebAuthn handles enrollment
        strongBiometrics: available,
        weakBiometrics: false,
        hardwareDetected: available,
        permissionGranted: true,
        securityLevel: available ? 'strong' : 'none'
      };
    } catch (error) {
      return {
        available: false,
        biometricTypes: [],
        status: BiometricStatus.NOT_AVAILABLE,
        enrolled: false,
        strongBiometrics: false,
        weakBiometrics: false,
        hardwareDetected: false,
        permissionGranted: false,
        securityLevel: 'none'
      };
    }
  }

  async authenticate(config: BiometricConfig): Promise<BiometricAuthResult> {
    try {
      if (!this.isWebAuthnSupported()) {
        return {
          success: false,
          error: {
            code: 'webauthn_not_supported',
            message: 'WebAuthn not supported in this browser'
          }
        };
      }

      // Create WebAuthn authentication challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credentialOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        }
      };

      const credential = await navigator.credentials.get({
        publicKey: credentialOptions
      }) as PublicKeyCredential;

      if (credential) {
        return {
          success: true,
          biometricType: BiometricType.FINGERPRINT, // WebAuthn doesn't specify type
          metadata: {
            timestamp: Date.now(),
            attempts: 1,
            deviceInfo: navigator.userAgent
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: 'authentication_failed',
            message: 'WebAuthn authentication failed'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.name || 'authentication_error',
          message: error.message || 'Authentication error',
          userCancel: error.name === 'NotAllowedError'
        }
      };
    }
  }

  private isWebAuthnSupported(): boolean {
    return !!(navigator.credentials && navigator.credentials.create);
  }

  private isPlatformAuthenticatorAvailable(): boolean {
    return !!window.PublicKeyCredential && 
           PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== undefined;
  }
}

/**
 * Fallback authentication handler
 */
class FallbackAuthHandler {
  private config: BiometricConfig;
  private attempts = new Map<FallbackMethod, number>();

  constructor(config: BiometricConfig) {
    this.config = config;
  }

  async authenticate(method: FallbackMethod, payload?: any): Promise<FallbackAuthResult> {
    const currentAttempts = this.attempts.get(method) || 0;
    
    if (currentAttempts >= this.config.maxAttempts) {
      return {
        success: false,
        method,
        attempts: currentAttempts,
        error: {
          code: 'max_attempts_exceeded',
          message: `Maximum attempts exceeded for ${method}`
        }
      };
    }

    this.attempts.set(method, currentAttempts + 1);

    try {
      let success = false;

      switch (method) {
        case FallbackMethod.PIN:
          success = await this.validatePIN(payload?.pin);
          break;
        case FallbackMethod.PASSWORD:
          success = await this.validatePassword(payload?.password);
          break;
        case FallbackMethod.PATTERN:
          success = await this.validatePattern(payload?.pattern);
          break;
        case FallbackMethod.DEVICE_CREDENTIAL:
          success = await this.validateDeviceCredential();
          break;
        case FallbackMethod.SECURITY_QUESTIONS:
          success = await this.validateSecurityQuestions(payload?.answers);
          break;
        case FallbackMethod.SMS_CODE:
          success = await this.validateSMSCode(payload?.code);
          break;
        case FallbackMethod.EMAIL_CODE:
          success = await this.validateEmailCode(payload?.code);
          break;
        default:
          throw new Error(`Unsupported fallback method: ${method}`);
      }

      if (success) {
        this.attempts.delete(method); // Reset attempts on success
      }

      return {
        success,
        method,
        attempts: this.attempts.get(method) || 0,
        error: success ? undefined : {
          code: 'authentication_failed',
          message: `${method} authentication failed`
        }
      };
    } catch (error) {
      return {
        success: false,
        method,
        attempts: this.attempts.get(method) || 0,
        error: {
          code: 'authentication_error',
          message: error instanceof Error ? error.message : 'Authentication error'
        }
      };
    }
  }

  private async validatePIN(pin: string): Promise<boolean> {
    // Implement PIN validation logic
    return pin === '1234'; // Simplified
  }

  private async validatePassword(password: string): Promise<boolean> {
    // Implement password validation logic
    return password === 'password123'; // Simplified
  }

  private async validatePattern(pattern: string): Promise<boolean> {
    // Implement pattern validation logic
    return pattern === '123456789'; // Simplified
  }

  private async validateDeviceCredential(): Promise<boolean> {
    // Platform-specific device credential validation
    return true; // Simplified
  }

  private async validateSecurityQuestions(answers: string[]): Promise<boolean> {
    // Implement security questions validation
    return answers && answers.length > 0; // Simplified
  }

  private async validateSMSCode(code: string): Promise<boolean> {
    // Implement SMS code validation
    return code === '123456'; // Simplified
  }

  private async validateEmailCode(code: string): Promise<boolean> {
    // Implement email code validation
    return code === '654321'; // Simplified
  }

  resetAttempts(method?: FallbackMethod): void {
    if (method) {
      this.attempts.delete(method);
    } else {
      this.attempts.clear();
    }
  }

  getAttempts(method: FallbackMethod): number {
    return this.attempts.get(method) || 0;
  }
}

/**
 * Biometric Authentication DNA Module
 */
export class BiometricAuthDNAModule extends BaseDNAModule {
  public readonly metadata: DNAModuleMetadata = {
    id: 'biometric-auth',
    name: 'Biometric Authentication',
    version: '1.0.0',
    description: 'Biometric authentication for mobile with fallback options',
    category: DNAModuleCategory.AUTHENTICATION,
    keywords: ['biometric', 'authentication', 'fingerprint', 'face-id', 'mobile', 'security'],
    author: 'DNA Team',
    license: 'MIT',
    deprecated: false,
    experimental: false
  };

  public readonly dependencies = [];
  public readonly conflicts = [];
  public readonly frameworks: FrameworkSupport[] = [
    { framework: SupportedFramework.NEXTJS, supported: false, version: 'N/A' },
    { framework: SupportedFramework.REACT_NATIVE, supported: true, version: '>=0.70.0' },
    { framework: SupportedFramework.FLUTTER, supported: true, version: '>=3.0.0' },
    { framework: SupportedFramework.TAURI, supported: false, version: 'N/A' },
    { framework: SupportedFramework.SVELTEKIT, supported: false, version: 'N/A' }
  ];

  public readonly config = {
    schema: {
      biometric: {
        type: 'object',
        properties: {
          allowedBiometrics: {
            type: 'array',
            items: { type: 'string', enum: Object.values(BiometricType) }
          },
          requireStrongBiometrics: { type: 'boolean' },
          maxAttempts: { type: 'number', minimum: 1, maximum: 10 },
          enableFallback: { type: 'boolean' },
          fallbackMethods: {
            type: 'array',
            items: { type: 'string', enum: Object.values(FallbackMethod) }
          }
        }
      }
    },
    defaults: {
      biometric: {
        allowedBiometrics: [BiometricType.FINGERPRINT, BiometricType.FACE_ID],
        requireStrongBiometrics: true,
        maxAttempts: 3,
        lockoutDuration: 300, // 5 minutes
        enableFallback: true,
        fallbackMethods: [FallbackMethod.PIN, FallbackMethod.DEVICE_CREDENTIAL],
        fallbackAfterAttempts: 2,
        requireDeviceCredential: false,
        allowDeviceCredentialFallback: true,
        invalidateOnBiometricChange: true,
        promptConfig: {
          title: 'Biometric Authentication',
          subtitle: 'Use your biometric to authenticate',
          description: 'Place your finger on the sensor or look at the camera',
          negativeButtonText: 'Cancel',
          fallbackButtonText: 'Use Alternative Method'
        }
      }
    },
    required: [],
    validation: {
      rules: {
        'biometric.maxAttempts': 'Should be between 1 and 10 for security',
        'biometric.lockoutDuration': 'Should be reasonable (recommended: 30-600 seconds)'
      }
    }
  };

  private biometricConfig: BiometricConfig;
  private biometricProvider: IBiometricProvider;
  private fallbackHandler: FallbackAuthHandler;
  private lockoutTimers = new Map<string, NodeJS.Timeout>();
  private authAttempts = new Map<string, number>();

  constructor(config?: Partial<BiometricConfig>) {
    super();
    
    this.biometricConfig = {
      allowedBiometrics: [BiometricType.FINGERPRINT, BiometricType.FACE_ID],
      requireStrongBiometrics: true,
      maxAttempts: 3,
      lockoutDuration: 300,
      enableFallback: true,
      fallbackMethods: [FallbackMethod.PIN, FallbackMethod.DEVICE_CREDENTIAL],
      fallbackAfterAttempts: 2,
      requireDeviceCredential: false,
      allowDeviceCredentialFallback: true,
      invalidateOnBiometricChange: true,
      promptConfig: {
        title: 'Biometric Authentication',
        subtitle: 'Use your biometric to authenticate',
        description: 'Place your finger on the sensor or look at the camera',
        negativeButtonText: 'Cancel',
        fallbackButtonText: 'Use Alternative Method'
      },
      ...config
    };

    this.biometricProvider = this.createBiometricProvider();
    this.fallbackHandler = new FallbackAuthHandler(this.biometricConfig);
  }

  /**
   * Configure biometric settings
   */
  public configure(config: Partial<BiometricConfig>): void {
    this.biometricConfig = { ...this.biometricConfig, ...config };
    this.fallbackHandler = new FallbackAuthHandler(this.biometricConfig);
    this.emit('biometric:configured', { config: this.biometricConfig });
  }

  /**
   * Check biometric availability
   */
  public async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const availability = await this.biometricProvider.checkAvailability();
      
      this.emit('biometric:availability_checked', {
        available: availability.available,
        types: availability.biometricTypes,
        status: availability.status
      });
      
      return availability;
    } catch (error) {
      this.emit('biometric:availability_check_failed', { error });
      throw error;
    }
  }

  /**
   * Authenticate using biometrics with fallback options
   */
  public async authenticate(userId?: string): Promise<BiometricAuthResult> {
    const userKey = userId || 'default';
    
    // Check if user is locked out
    if (this.isLockedOut(userKey)) {
      return {
        success: false,
        error: {
          code: 'user_locked_out',
          message: 'User is temporarily locked out due to too many failed attempts',
          lockout: true
        }
      };
    }

    try {
      this.emit('biometric:authentication_started', { userId });
      
      // Check availability first
      const availability = await this.checkAvailability();
      
      if (!availability.available) {
        if (this.biometricConfig.enableFallback) {
          return await this.handleFallbackAuthentication(userKey, 'biometric_not_available');
        } else {
          return {
            success: false,
            error: {
              code: 'biometric_not_available',
              message: 'Biometric authentication not available and fallback disabled'
            }
          };
        }
      }

      // Validate biometric requirements
      if (this.biometricConfig.requireStrongBiometrics && !availability.strongBiometrics) {
        return {
          success: false,
          error: {
            code: 'weak_biometrics_not_allowed',
            message: 'Strong biometrics required but not available'
          }
        };
      }

      // Attempt biometric authentication
      const result = await this.biometricProvider.authenticate(this.biometricConfig);
      
      if (result.success) {
        this.resetAuthAttempts(userKey);
        this.emit('biometric:authentication_succeeded', {
          userId,
          biometricType: result.biometricType,
          fallbackUsed: false
        });
        return result;
      } else {
        // Handle failed biometric authentication
        const attempts = this.incrementAuthAttempts(userKey);
        
        // Check if should trigger fallback
        if (this.biometricConfig.enableFallback && 
            attempts >= this.biometricConfig.fallbackAfterAttempts) {
          
          const fallbackResult = await this.handleFallbackAuthentication(userKey, 'biometric_failed');
          if (fallbackResult.success) {
            fallbackResult.fallbackUsed = true;
          }
          return fallbackResult;
        }
        
        // Check if should lock out user
        if (attempts >= this.biometricConfig.maxAttempts) {
          this.lockoutUser(userKey);
          result.error = {
            ...result.error,
            lockout: true,
            message: 'Too many failed attempts. User locked out.'
          };
        }
        
        this.emit('biometric:authentication_failed', {
          userId,
          attempts,
          error: result.error
        });
        
        return result;
      }
    } catch (error) {
      this.emit('biometric:authentication_error', { userId, error });
      
      if (this.biometricConfig.enableFallback) {
        return await this.handleFallbackAuthentication(userKey, 'authentication_error');
      }
      
      return {
        success: false,
        error: {
          code: 'authentication_error',
          message: error instanceof Error ? error.message : 'Authentication error'
        }
      };
    }
  }

  /**
   * Authenticate using fallback method
   */
  public async authenticateWithFallback(
    method: FallbackMethod,
    payload?: any,
    userId?: string
  ): Promise<BiometricAuthResult> {
    const userKey = userId || 'default';
    
    if (this.isLockedOut(userKey)) {
      return {
        success: false,
        error: {
          code: 'user_locked_out',
          message: 'User is temporarily locked out',
          lockout: true
        }
      };
    }

    try {
      this.emit('fallback:authentication_started', { userId, method });
      
      const result = await this.fallbackHandler.authenticate(method, payload);
      
      if (result.success) {
        this.resetAuthAttempts(userKey);
        this.fallbackHandler.resetAttempts(method);
        
        this.emit('fallback:authentication_succeeded', { userId, method });
        
        return {
          success: true,
          fallbackUsed: true,
          fallbackMethod: method,
          metadata: {
            timestamp: Date.now(),
            attempts: result.attempts
          }
        };
      } else {
        this.emit('fallback:authentication_failed', { userId, method, error: result.error });
        
        return {
          success: false,
          fallbackUsed: true,
          fallbackMethod: method,
          error: result.error
        };
      }
    } catch (error) {
      this.emit('fallback:authentication_error', { userId, method, error });
      
      return {
        success: false,
        fallbackUsed: true,
        fallbackMethod: method,
        error: {
          code: 'fallback_error',
          message: error instanceof Error ? error.message : 'Fallback authentication error'
        }
      };
    }
  }

  /**
   * Get available fallback methods
   */
  public getAvailableFallbackMethods(): FallbackMethod[] {
    return this.biometricConfig.fallbackMethods;
  }

  /**
   * Reset authentication attempts for user
   */
  public resetAuthAttempts(userId?: string): void {
    const userKey = userId || 'default';
    this.authAttempts.delete(userKey);
    
    // Clear lockout timer if exists
    const timer = this.lockoutTimers.get(userKey);
    if (timer) {
      clearTimeout(timer);
      this.lockoutTimers.delete(userKey);
    }
    
    this.emit('auth:attempts_reset', { userId });
  }

  /**
   * Check if user is currently locked out
   */
  public isLockedOut(userId?: string): boolean {
    const userKey = userId || 'default';
    return this.lockoutTimers.has(userKey);
  }

  /**
   * Get current authentication attempt count
   */
  public getAuthAttempts(userId?: string): number {
    const userKey = userId || 'default';
    return this.authAttempts.get(userKey) || 0;
  }

  /**
   * Handle fallback authentication flow
   */
  private async handleFallbackAuthentication(
    userKey: string,
    reason: string
  ): Promise<BiometricAuthResult> {
    this.emit('fallback:triggered', { userKey, reason });
    
    // For this implementation, we'll return a result indicating fallback is needed
    // In a real implementation, this would trigger UI for fallback method selection
    return {
      success: false,
      fallbackUsed: false,
      error: {
        code: 'fallback_required',
        message: `Biometric authentication failed: ${reason}. Please use fallback method.`
      }
    };
  }

  /**
   * Increment authentication attempts
   */
  private incrementAuthAttempts(userKey: string): number {
    const current = this.authAttempts.get(userKey) || 0;
    const newCount = current + 1;
    this.authAttempts.set(userKey, newCount);
    return newCount;
  }

  /**
   * Lock out user temporarily
   */
  private lockoutUser(userKey: string): void {
    const timer = setTimeout(() => {
      this.lockoutTimers.delete(userKey);
      this.authAttempts.delete(userKey);
      this.emit('auth:lockout_expired', { userKey });
    }, this.biometricConfig.lockoutDuration * 1000);
    
    this.lockoutTimers.set(userKey, timer);
    this.emit('auth:user_locked_out', {
      userKey,
      duration: this.biometricConfig.lockoutDuration
    });
  }

  /**
   * Create appropriate biometric provider based on platform
   */
  private createBiometricProvider(): IBiometricProvider {
    // Platform detection logic would determine which provider to use
    // For now, we'll use React Native as default
    return new ReactNativeBiometricProvider();
  }

  /**
   * Generate framework-specific biometric authentication files
   */
  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    switch (context.framework) {
      case SupportedFramework.REACT_NATIVE:
        files.push(...await this.generateReactNativeFiles(context));
        break;
      case SupportedFramework.FLUTTER:
        files.push(...await this.generateFlutterFiles(context));
        break;
    }

    return files;
  }

  private async generateReactNativeFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'src/services/auth/BiometricService.ts',
        content: this.generateReactNativeBiometricService(),
        type: 'typescript'
      },
      {
        path: 'src/components/auth/BiometricAuthScreen.tsx',
        content: this.generateReactNativeBiometricScreen(),
        type: 'typescript'
      },
      {
        path: 'src/components/auth/FallbackAuthModal.tsx',
        content: this.generateReactNativeFallbackModal(),
        type: 'typescript'
      }
    ];
  }

  private async generateFlutterFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    return [
      {
        path: 'lib/services/auth/biometric_service.dart',
        content: this.generateFlutterBiometricService(),
        type: 'dart'
      },
      {
        path: 'lib/screens/auth/biometric_auth_screen.dart',
        content: this.generateFlutterBiometricScreen(),
        type: 'dart'
      },
      {
        path: 'lib/widgets/auth/fallback_auth_dialog.dart',
        content: this.generateFlutterFallbackDialog(),
        type: 'dart'
      }
    ];
  }

  // Framework-specific code generation methods
  private generateReactNativeBiometricService(): string {
    return `// React Native Biometric Service - Generated by DNA Biometric Module
import TouchID from 'react-native-touch-id';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricAuthDNAModule, BiometricType, FallbackMethod } from '@dna/auth';

class BiometricService {
  private biometricModule = new BiometricAuthDNAModule({
    allowedBiometrics: [BiometricType.FINGERPRINT, BiometricType.FACE_ID, BiometricType.TOUCH_ID],
    requireStrongBiometrics: true,
    maxAttempts: 3,
    enableFallback: true,
    fallbackMethods: [FallbackMethod.PIN, FallbackMethod.DEVICE_CREDENTIAL],
    promptConfig: {
      title: 'Biometric Authentication',
      subtitle: 'Use your biometric to authenticate',
      description: 'Place your finger on the sensor or look at the camera',
      negativeButtonText: 'Cancel',
      fallbackButtonText: 'Use PIN'
    }
  });

  async isBiometricSupported(): Promise<boolean> {
    try {
      const biometryType = await TouchID.isSupported();
      return biometryType !== false;
    } catch (error) {
      return false;
    }
  }

  async getBiometricType(): Promise<string | null> {
    try {
      const biometryType = await TouchID.isSupported();
      if (biometryType === true) {
        return Platform.OS === 'ios' ? 'TouchID' : 'Fingerprint';
      }
      return biometryType;
    } catch (error) {
      return null;
    }
  }

  async authenticate(userId?: string): Promise<any> {
    try {
      const isSupported = await this.isBiometricSupported();
      
      if (!isSupported) {
        throw new Error('Biometric authentication not supported');
      }

      const optionalConfigObject = {
        title: 'Authentication Required',
        subtitle: 'Use your biometric to authenticate',
        description: 'This app uses biometric authentication to protect your data',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        unifiedErrors: false,
        passcodeFallback: true
      };

      await TouchID.authenticate('Please verify your identity', optionalConfigObject);
      
      // Store successful authentication
      await AsyncStorage.setItem('last_biometric_auth', Date.now().toString());
      
      return {
        success: true,
        method: 'biometric',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      // Handle specific error cases
      if (error.name === 'UserCancel') {
        return {
          success: false,
          error: 'User cancelled authentication',
          userCancel: true
        };
      } else if (error.name === 'UserFallback') {
        // User chose to use fallback method
        return this.handleFallbackAuthentication(userId);
      } else if (error.name === 'BiometryNotEnrolled') {
        Alert.alert(
          'Biometric Not Set Up',
          'Please set up biometric authentication in your device settings',
          [{ text: 'OK' }]
        );
        return {
          success: false,
          error: 'Biometric not enrolled'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  async handleFallbackAuthentication(userId?: string): Promise<any> {
    // This would typically show a PIN entry modal or other fallback UI
    return new Promise((resolve) => {
      Alert.prompt(
        'Enter PIN',
        'Please enter your PIN to authenticate',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({
              success: false,
              error: 'User cancelled PIN entry'
            })
          },
          {
            text: 'OK',
            onPress: async (pin) => {
              const result = await this.biometricModule.authenticateWithFallback(
                FallbackMethod.PIN,
                { pin },
                userId
              );
              resolve(result);
            }
          }
        ],
        'secure-text'
      );
    });
  }

  async checkLastAuthentication(): Promise<Date | null> {
    try {
      const lastAuth = await AsyncStorage.getItem('last_biometric_auth');
      return lastAuth ? new Date(parseInt(lastAuth)) : null;
    } catch (error) {
      return null;
    }
  }

  async clearAuthenticationData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('last_biometric_auth');
    } catch (error) {
      console.error('Failed to clear authentication data:', error);
    }
  }

  async isAuthenticationRequired(): Promise<boolean> {
    const lastAuth = await this.checkLastAuthentication();
    if (!lastAuth) return true;
    
    // Require re-authentication after 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastAuth < fiveMinutesAgo;
  }
}

export default new BiometricService();
`;
  }

  private generateReactNativeBiometricScreen(): string {
    return `// React Native Biometric Auth Screen - Generated by DNA Biometric Module
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import BiometricService from '../services/auth/BiometricService';
import FallbackAuthModal from './FallbackAuthModal';

interface BiometricAuthScreenProps {
  onAuthSuccess: (result: any) => void;
  onAuthFailure: (error: any) => void;
  onSkip?: () => void;
}

export function BiometricAuthScreen({
  onAuthSuccess,
  onAuthFailure,
  onSkip
}: BiometricAuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const supported = await BiometricService.isBiometricSupported();
      const type = await BiometricService.getBiometricType();
      
      setIsSupported(supported);
      setBiometricType(type);
      
      if (supported) {
        // Auto-trigger authentication
        await handleBiometricAuth();
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsSupported(false);
    }
  };

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await BiometricService.authenticate();
      
      if (result.success) {
        onAuthSuccess(result);
      } else if (result.userCancel) {
        setError('Authentication was cancelled');
      } else {
        setError(result.error || 'Authentication failed');
        
        // Show fallback option after failed biometric
        setTimeout(() => {
          setShowFallback(true);
        }, 1000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      onAuthFailure(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackSuccess = (result: any) => {
    setShowFallback(false);
    onAuthSuccess(result);
  };

  const handleFallbackFailure = (error: any) => {
    setShowFallback(false);
    onAuthFailure(error);
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'FaceID':
        return '👤'; // Face icon
      case 'TouchID':
      case 'Fingerprint':
        return '👆'; // Fingerprint icon
      default:
        return '🔒'; // Lock icon
    }
  };

  const getBiometricTitle = () => {
    switch (biometricType) {
      case 'FaceID':
        return 'Face ID Authentication';
      case 'TouchID':
        return 'Touch ID Authentication';
      case 'Fingerprint':
        return 'Fingerprint Authentication';
      default:
        return 'Biometric Authentication';
    }
  };

  const getBiometricInstructions = () => {
    switch (biometricType) {
      case 'FaceID':
        return 'Look at your device to authenticate';
      case 'TouchID':
        return 'Place your finger on the Touch ID sensor';
      case 'Fingerprint':
        return 'Place your finger on the fingerprint sensor';
      default:
        return 'Use your biometric to authenticate';
    }
  };

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Biometric Not Available</Text>
          <Text style={styles.subtitle}>
            Biometric authentication is not available on this device
          </Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowFallback(true)}
          >
            <Text style={styles.buttonText}>Use Alternative Method</Text>
          </TouchableOpacity>
          
          {onSkip && (
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={onSkip}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FallbackAuthModal
          visible={showFallback}
          onSuccess={handleFallbackSuccess}
          onFailure={handleFallbackFailure}
          onCancel={() => setShowFallback(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{getBiometricIcon()}</Text>
        <Text style={styles.title}>{getBiometricTitle()}</Text>
        <Text style={styles.subtitle}>{getBiometricInstructions()}</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleBiometricAuth}
          >
            <Text style={styles.buttonText}>Authenticate</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.fallbackButton}
          onPress={() => setShowFallback(true)}
        >
          <Text style={styles.fallbackButtonText}>Use Alternative Method</Text>
        </TouchableOpacity>
        
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FallbackAuthModal
        visible={showFallback}
        onSuccess={handleFallbackSuccess}
        onFailure={handleFallbackFailure}
        onCancel={() => setShowFallback(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  fallbackButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  fallbackButtonText: {
    color: '#007AFF',
    fontSize: 14,
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
  },
});
`;
  }

  private generateReactNativeFallbackModal(): string {
    return `// React Native Fallback Auth Modal - Generated by DNA Biometric Module
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import BiometricService from '../services/auth/BiometricService';

interface FallbackAuthModalProps {
  visible: boolean;
  onSuccess: (result: any) => void;
  onFailure: (error: any) => void;
  onCancel: () => void;
}

export default function FallbackAuthModal({
  visible,
  onSuccess,
  onFailure,
  onCancel
}: FallbackAuthModalProps) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await BiometricService.handleFallbackAuthentication();
      
      if (result.success) {
        setPin('');
        setAttempts(0);
        onSuccess(result);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setError('Too many failed attempts. Please try again later.');
          setTimeout(() => {
            onFailure(new Error('Max attempts exceeded'));
          }, 2000);
        } else {
          setError(\`Incorrect PIN. \${3 - newAttempts} attempts remaining.\`);
        }
        
        setPin('');
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
      onFailure(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPin('');
    setError(null);
    setAttempts(0);
    onCancel();
  };

  const handleDeviceCredential = async () => {
    try {
      // This would trigger device credential authentication
      Alert.alert(
        'Device Credential',
        'Use your device screen lock (pattern, PIN, or password) to authenticate',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Authenticate',
            onPress: () => {
              // Simulate device credential success
              onSuccess({
                success: true,
                method: 'device_credential',
                timestamp: Date.now()
              });
            }
          }
        ]
      );
    } catch (error) {
      onFailure(error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Alternative Authentication</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Please use an alternative method to authenticate
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <View style={styles.pinSection}>
            <Text style={styles.sectionTitle}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              placeholder="Enter your PIN"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
            
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handlePinSubmit}
              disabled={isLoading || pin.length < 4}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Authenticating...' : 'Submit PIN'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider}>
            <Text style={styles.dividerText}>OR</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.deviceCredentialButton]}
            onPress={handleDeviceCredential}
          >
            <Text style={styles.buttonText}>Use Device Screen Lock</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c33',
    textAlign: 'center',
    fontSize: 14,
  },
  pinSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceCredentialButton: {
    backgroundColor: '#34C759',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerText: {
    color: '#999',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    fontSize: 14,
  },
});
`;
  }

  private generateFlutterBiometricService(): string {
    return `// Flutter Biometric Service - Generated by DNA Biometric Module
import 'package:local_auth/local_auth.dart';
import 'package:local_auth_android/local_auth_android.dart';
import 'package:local_auth_ios/local_auth_ios.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BiometricService {
  static final LocalAuthentication _localAuth = LocalAuthentication();
  
  // Check if biometric authentication is available
  static Future<bool> isBiometricAvailable() async {
    try {
      final bool isAvailable = await _localAuth.canCheckBiometrics;
      final bool isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      print('Error checking biometric availability: \$e');
      return false;
    }
  }
  
  // Get available biometric types
  static Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      print('Error getting available biometrics: \$e');
      return [];
    }
  }
  
  // Authenticate using biometrics
  static Future<BiometricAuthResult> authenticate({
    String? userId,
    String localizedReason = 'Please authenticate to continue',
    bool useErrorDialogs = true,
    bool stickyAuth = true,
  }) async {
    try {
      // Check if biometric is available
      final bool isAvailable = await isBiometricAvailable();
      if (!isAvailable) {
        return BiometricAuthResult(
          success: false,
          error: BiometricError(
            code: 'biometric_not_available',
            message: 'Biometric authentication is not available',
          ),
        );
      }
      
      // Check for enrolled biometrics
      final List<BiometricType> availableBiometrics = await getAvailableBiometrics();
      if (availableBiometrics.isEmpty) {
        return BiometricAuthResult(
          success: false,
          error: BiometricError(
            code: 'no_biometrics_enrolled',
            message: 'No biometrics are enrolled on this device',
          ),
        );
      }
      
      // Perform authentication
      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason: localizedReason,
        authMessages: const [
          AndroidAuthMessages(
            signInTitle: 'Biometric Authentication',
            biometricHint: 'Touch the fingerprint sensor',
            biometricNotRecognized: 'Biometric not recognized, try again',
            biometricSuccess: 'Biometric authentication successful',
            cancelButton: 'Cancel',
            deviceCredentialsRequiredTitle: 'Device credentials required',
            deviceCredentialsSetupDescription: 'Please set up device credentials',
            goToSettingsButton: 'Go to Settings',
            goToSettingsDescription: 'Set up biometric authentication in Settings',
          ),
          IOSAuthMessages(
            cancelButton: 'Cancel',
            goToSettingsButton: 'Go to Settings',
            goToSettingsDescription: 'Set up biometric authentication in Settings',
            lockOut: 'Please re-enable biometric authentication',
          ),
        ],
        options: AuthenticationOptions(
          useErrorDialogs: useErrorDialogs,
          stickyAuth: stickyAuth,
          biometricOnly: false,
        ),
      );
      
      if (didAuthenticate) {
        // Store successful authentication
        await _storeLastAuthentication();
        
        return BiometricAuthResult(
          success: true,
          biometricType: availableBiometrics.first.toString(),
          timestamp: DateTime.now(),
        );
      } else {
        return BiometricAuthResult(
          success: false,
          error: BiometricError(
            code: 'authentication_failed',
            message: 'Biometric authentication failed',
            userCancel: true,
          ),
        );
      }
    } catch (e) {
      String errorCode = 'authentication_error';
      String errorMessage = 'Authentication error occurred';
      bool userCancel = false;
      
      // Handle specific platform exceptions
      if (e.toString().contains('UserCancel')) {
        errorCode = 'user_cancel';
        errorMessage = 'User cancelled authentication';
        userCancel = true;
      } else if (e.toString().contains('LockedOut')) {
        errorCode = 'locked_out';
        errorMessage = 'Too many failed attempts. Biometric authentication is temporarily disabled.';
      } else if (e.toString().contains('NotAvailable')) {
        errorCode = 'not_available';
        errorMessage = 'Biometric authentication is not available';
      } else if (e.toString().contains('NotEnrolled')) {
        errorCode = 'not_enrolled';
        errorMessage = 'No biometrics are enrolled on this device';
      }
      
      return BiometricAuthResult(
        success: false,
        error: BiometricError(
          code: errorCode,
          message: errorMessage,
          userCancel: userCancel,
        ),
      );
    }
  }
  
  // Authenticate with fallback options
  static Future<BiometricAuthResult> authenticateWithFallback({
    String? userId,
    String localizedReason = 'Please authenticate to continue',
    List<FallbackMethod> fallbackMethods = const [
      FallbackMethod.pin,
      FallbackMethod.deviceCredential,
    ],
  }) async {
    // First try biometric authentication
    final biometricResult = await authenticate(
      userId: userId,
      localizedReason: localizedReason,
    );
    
    if (biometricResult.success) {
      return biometricResult;
    }
    
    // If biometric fails and user didn't cancel, try fallback methods
    if (!biometricResult.error!.userCancel) {
      for (final method in fallbackMethods) {
        final fallbackResult = await _authenticateWithFallbackMethod(method, userId);
        if (fallbackResult.success) {
          return fallbackResult;
        }
      }
    }
    
    return biometricResult;
  }
  
  // Check if authentication is required (based on last auth time)
  static Future<bool> isAuthenticationRequired() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastAuth = prefs.getInt('last_biometric_auth');
      
      if (lastAuth == null) return true;
      
      // Require re-authentication after 5 minutes
      final lastAuthTime = DateTime.fromMillisecondsSinceEpoch(lastAuth);
      final fiveMinutesAgo = DateTime.now().subtract(const Duration(minutes: 5));
      
      return lastAuthTime.isBefore(fiveMinutesAgo);
    } catch (e) {
      return true;
    }
  }
  
  // Clear authentication data
  static Future<void> clearAuthenticationData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('last_biometric_auth');
    } catch (e) {
      print('Error clearing authentication data: \$e');
    }
  }
  
  // Get last authentication time
  static Future<DateTime?> getLastAuthenticationTime() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastAuth = prefs.getInt('last_biometric_auth');
      
      return lastAuth != null 
        ? DateTime.fromMillisecondsSinceEpoch(lastAuth)
        : null;
    } catch (e) {
      return null;
    }
  }
  
  // Store successful authentication timestamp
  static Future<void> _storeLastAuthentication() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('last_biometric_auth', DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      print('Error storing authentication timestamp: \$e');
    }
  }
  
  // Private method to handle fallback authentication
  static Future<BiometricAuthResult> _authenticateWithFallbackMethod(
    FallbackMethod method,
    String? userId,
  ) async {
    switch (method) {
      case FallbackMethod.pin:
        return await _authenticateWithPin(userId);
      case FallbackMethod.deviceCredential:
        return await _authenticateWithDeviceCredential();
      case FallbackMethod.password:
        return await _authenticateWithPassword(userId);
      default:
        return BiometricAuthResult(
          success: false,
          error: BiometricError(
            code: 'unsupported_fallback',
            message: 'Fallback method not supported: \$method',
          ),
        );
    }
  }
  
  static Future<BiometricAuthResult> _authenticateWithPin(String? userId) async {
    // This would typically show a PIN input dialog
    // For now, return a placeholder result
    return BiometricAuthResult(
      success: false,
      error: BiometricError(
        code: 'fallback_not_implemented',
        message: 'PIN fallback authentication not implemented',
      ),
    );
  }
  
  static Future<BiometricAuthResult> _authenticateWithDeviceCredential() async {
    try {
      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Please use your device credentials to authenticate',
        options: const AuthenticationOptions(
          useErrorDialogs: true,
          stickyAuth: true,
          biometricOnly: false,
        ),
      );
      
      if (didAuthenticate) {
        await _storeLastAuthentication();
        return BiometricAuthResult(
          success: true,
          fallbackUsed: true,
          fallbackMethod: 'device_credential',
          timestamp: DateTime.now(),
        );
      } else {
        return BiometricAuthResult(
          success: false,
          fallbackUsed: true,
          fallbackMethod: 'device_credential',
          error: BiometricError(
            code: 'device_credential_failed',
            message: 'Device credential authentication failed',
          ),
        );
      }
    } catch (e) {
      return BiometricAuthResult(
        success: false,
        fallbackUsed: true,
        fallbackMethod: 'device_credential',
        error: BiometricError(
          code: 'device_credential_error',
          message: 'Device credential authentication error: \$e',
        ),
      );
    }
  }
  
  static Future<BiometricAuthResult> _authenticateWithPassword(String? userId) async {
    // This would typically show a password input dialog
    // For now, return a placeholder result
    return BiometricAuthResult(
      success: false,
      error: BiometricError(
        code: 'fallback_not_implemented',
        message: 'Password fallback authentication not implemented',
      ),
    );
  }
}

// Data classes for results
class BiometricAuthResult {
  final bool success;
  final String? biometricType;
  final bool fallbackUsed;
  final String? fallbackMethod;
  final BiometricError? error;
  final DateTime? timestamp;
  
  BiometricAuthResult({
    required this.success,
    this.biometricType,
    this.fallbackUsed = false,
    this.fallbackMethod,
    this.error,
    this.timestamp,
  });
}

class BiometricError {
  final String code;
  final String message;
  final bool userCancel;
  final bool systemCancel;
  final bool lockout;
  
  BiometricError({
    required this.code,
    required this.message,
    this.userCancel = false,
    this.systemCancel = false,
    this.lockout = false,
  });
}

enum FallbackMethod {
  pin,
  password,
  pattern,
  deviceCredential,
  securityQuestions,
}
`;
  }

  private generateFlutterBiometricScreen(): string {
    return `// Flutter Biometric Auth Screen - Generated by DNA Biometric Module
import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import '../services/auth/biometric_service.dart';
import '../widgets/auth/fallback_auth_dialog.dart';

class BiometricAuthScreen extends StatefulWidget {
  final Function(BiometricAuthResult) onAuthSuccess;
  final Function(BiometricError) onAuthFailure;
  final VoidCallback? onSkip;
  
  const BiometricAuthScreen({
    Key? key,
    required this.onAuthSuccess,
    required this.onAuthFailure,
    this.onSkip,
  }) : super(key: key);
  
  @override
  State<BiometricAuthScreen> createState() => _BiometricAuthScreenState();
}

class _BiometricAuthScreenState extends State<BiometricAuthScreen>
    with TickerProviderStateMixin {
  bool _isLoading = false;
  bool _isSupported = false;
  List<BiometricType> _availableBiometrics = [];
  String? _error;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  
  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _checkBiometricSupport();
  }
  
  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }
  
  void _setupAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _pulseController.repeat(reverse: true);
  }
  
  Future<void> _checkBiometricSupport() async {
    try {
      final isSupported = await BiometricService.isBiometricAvailable();
      final availableBiometrics = await BiometricService.getAvailableBiometrics();
      
      setState(() {
        _isSupported = isSupported;
        _availableBiometrics = availableBiometrics;
      });
      
      if (isSupported && availableBiometrics.isNotEmpty) {
        // Auto-trigger authentication
        await _handleBiometricAuth();
      }
    } catch (e) {
      setState(() {
        _isSupported = false;
        _error = 'Error checking biometric support: \$e';
      });
    }
  }
  
  Future<void> _handleBiometricAuth() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final result = await BiometricService.authenticate(
        localizedReason: 'Please authenticate to access your account',
        useErrorDialogs: false,
      );
      
      if (result.success) {
        widget.onAuthSuccess(result);
      } else {
        setState(() {
          _error = result.error?.message ?? 'Authentication failed';
        });
        
        // Show fallback options after failed biometric
        if (!result.error!.userCancel) {
          await Future.delayed(const Duration(seconds: 1));
          _showFallbackDialog();
        }
      }
    } catch (e) {
      setState(() {
        _error = 'Authentication error: \$e';
      });
      widget.onAuthFailure(BiometricError(
        code: 'authentication_error',
        message: e.toString(),
      ));
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  void _showFallbackDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => FallbackAuthDialog(
        onSuccess: (result) {
          Navigator.of(context).pop();
          widget.onAuthSuccess(result);
        },
        onFailure: (error) {
          Navigator.of(context).pop();
          widget.onAuthFailure(error);
        },
        onCancel: () {
          Navigator.of(context).pop();
        },
      ),
    );
  }
  
  IconData _getBiometricIcon() {
    if (_availableBiometrics.contains(BiometricType.face)) {
      return Icons.face;
    } else if (_availableBiometrics.contains(BiometricType.fingerprint)) {
      return Icons.fingerprint;
    }
    return Icons.security;
  }
  
  String _getBiometricTitle() {
    if (_availableBiometrics.contains(BiometricType.face)) {
      return 'Face Authentication';
    } else if (_availableBiometrics.contains(BiometricType.fingerprint)) {
      return 'Fingerprint Authentication';
    }
    return 'Biometric Authentication';
  }
  
  String _getBiometricInstructions() {
    if (_availableBiometrics.contains(BiometricType.face)) {
      return 'Look at your device to authenticate';
    } else if (_availableBiometrics.contains(BiometricType.fingerprint)) {
      return 'Place your finger on the sensor';
    }
    return 'Use your biometric to authenticate';
  }
  
  @override
  Widget build(BuildContext context) {
    if (!_isSupported || _availableBiometrics.isEmpty) {
      return _buildUnsupportedView();
    }
    
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              
              // Animated biometric icon
              AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Theme.of(context).primaryColor.withOpacity(0.1),
                        border: Border.all(
                          color: Theme.of(context).primaryColor,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        _getBiometricIcon(),
                        size: 60,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                  );
                },
              ),
              
              const SizedBox(height: 32),
              
              // Title
              Text(
                _getBiometricTitle(),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 16),
              
              // Instructions
              Text(
                _getBiometricInstructions(),
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.black54,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 32),
              
              // Error message
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade600),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _error!,
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              
              // Loading indicator or authenticate button
              if (_isLoading)
                const CircularProgressIndicator()
              else
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _handleBiometricAuth,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Authenticate',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                ),
              
              const SizedBox(height: 16),
              
              // Fallback button
              TextButton(
                onPressed: _showFallbackDialog,
                child: const Text('Use Alternative Method'),
              ),
              
              const Spacer(),
              
              // Skip button (if provided)
              if (widget.onSkip != null)
                TextButton(
                  onPressed: widget.onSkip,
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                  ),
                  child: const Text('Skip for Now'),
                ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildUnsupportedView() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              
              Icon(
                Icons.warning_amber_rounded,
                size: 80,
                color: Colors.orange.shade600,
              ),
              
              const SizedBox(height: 24),
              
              const Text(
                'Biometric Not Available',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 16),
              
              const Text(
                'Biometric authentication is not available on this device or no biometrics are enrolled.',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.black54,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 32),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _showFallbackDialog,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Use Alternative Method',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ),
              
              const Spacer(),
              
              if (widget.onSkip != null)
                TextButton(
                  onPressed: widget.onSkip,
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                  ),
                  child: const Text('Skip for Now'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
`;
  }

  private generateFlutterFallbackDialog(): string {
    return `// Flutter Fallback Auth Dialog - Generated by DNA Biometric Module
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/auth/biometric_service.dart';

class FallbackAuthDialog extends StatefulWidget {
  final Function(BiometricAuthResult) onSuccess;
  final Function(BiometricError) onFailure;
  final VoidCallback onCancel;
  
  const FallbackAuthDialog({
    Key? key,
    required this.onSuccess,
    required this.onFailure,
    required this.onCancel,
  }) : super(key: key);
  
  @override
  State<FallbackAuthDialog> createState() => _FallbackAuthDialogState();
}

class _FallbackAuthDialogState extends State<FallbackAuthDialog>
    with TickerProviderStateMixin {
  final _pinController = TextEditingController();
  final _pinFocusNode = FocusNode();
  
  bool _isLoading = false;
  String? _error;
  int _attempts = 0;
  late TabController _tabController;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    
    // Auto-focus PIN input
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _pinFocusNode.requestFocus();
    });
  }
  
  @override
  void dispose() {
    _pinController.dispose();
    _pinFocusNode.dispose();
    _tabController.dispose();
    super.dispose();
  }
  
  Future<void> _handlePinSubmit() async {
    final pin = _pinController.text.trim();
    
    if (pin.length < 4) {
      setState(() {
        _error = 'PIN must be at least 4 digits';
      });
      return;
    }
    
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      // Simulate PIN validation (in real implementation, this would validate against stored PIN)
      await Future.delayed(const Duration(milliseconds: 500));
      
      final bool isValid = pin == '1234'; // Simplified validation
      
      if (isValid) {
        widget.onSuccess(BiometricAuthResult(
          success: true,
          fallbackUsed: true,
          fallbackMethod: 'pin',
          timestamp: DateTime.now(),
        ));
      } else {
        setState(() {
          _attempts++;
          
          if (_attempts >= 3) {
            _error = 'Too many failed attempts. Please try again later.';
            
            // Lock out after 3 attempts
            Future.delayed(const Duration(seconds: 2), () {
              widget.onFailure(BiometricError(
                code: 'max_attempts_exceeded',
                message: 'Maximum PIN attempts exceeded',
                lockout: true,
              ));
            });
          } else {
            _error = 'Incorrect PIN. \${3 - _attempts} attempts remaining.';
            _pinController.clear();
            _pinFocusNode.requestFocus();
          }
        });
      }
    } catch (e) {
      setState(() {
        _error = 'PIN validation failed. Please try again.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  Future<void> _handleDeviceCredential() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final result = await BiometricService._authenticateWithDeviceCredential();
      
      if (result.success) {
        widget.onSuccess(result);
      } else {
        setState(() {
          _error = result.error?.message ?? 'Device credential authentication failed';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Device credential authentication error: \$e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400, maxHeight: 500),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.security,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Alternative Authentication',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: widget.onCancel,
                    icon: const Icon(Icons.close),
                    splashRadius: 20,
                  ),
                ],
              ),
            ),
            
            // Tab bar
            TabBar(
              controller: _tabController,
              labelColor: Theme.of(context).primaryColor,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Theme.of(context).primaryColor,
              tabs: const [
                Tab(
                  icon: Icon(Icons.pin),
                  text: 'PIN',
                ),
                Tab(
                  icon: Icon(Icons.phone_android),
                  text: 'Device Lock',
                ),
              ],
            ),
            
            // Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildPinTab(),
                  _buildDeviceCredentialTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildPinTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Enter your PIN to authenticate',
            style: TextStyle(
              fontSize: 16,
              color: Colors.black54,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 24),
          
          // Error message
          if (_error != null) ..[
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, 
                       color: Colors.red.shade600, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          
          // PIN input
          TextField(
            controller: _pinController,
            focusNode: _pinFocusNode,
            obscureText: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              letterSpacing: 4,
            ),
            decoration: const InputDecoration(
              hintText: 'Enter PIN',
              border: OutlineInputBorder(),
              counterText: '',
            ),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
            ],
            onSubmitted: (_) => _handlePinSubmit(),
          ),
          
          const SizedBox(height: 20),
          
          // Submit button
          ElevatedButton(
            onPressed: _isLoading || _pinController.text.length < 4
                ? null
                : _handlePinSubmit,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Submit PIN'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildDeviceCredentialTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Use your device screen lock (pattern, PIN, or password) to authenticate',
            style: TextStyle(
              fontSize: 16,
              color: Colors.black54,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 32),
          
          // Device credential icon
          Icon(
            Icons.phone_android,
            size: 80,
            color: Theme.of(context).primaryColor.withOpacity(0.7),
          ),
          
          const SizedBox(height: 32),
          
          // Error message
          if (_error != null) ..[
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(
                _error!,
                style: TextStyle(
                  color: Colors.red.shade700,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
          
          // Authenticate button
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _handleDeviceCredential,
            icon: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.security),
            label: const Text('Authenticate with Device'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: Colors.green,
            ),
          ),
        ],
      ),
    );
  }
}
`;
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    // Clear all lockout timers
    for (const timer of this.lockoutTimers.values()) {
      clearTimeout(timer);
    }
    this.lockoutTimers.clear();
    this.authAttempts.clear();
    this.removeAllListeners();
  }
}

/**
 * Factory function to create Biometric DNA Module
 */
export function createBiometricModule(config?: Partial<BiometricConfig>): BiometricAuthDNAModule {
  return new BiometricAuthDNAModule(config);
}
