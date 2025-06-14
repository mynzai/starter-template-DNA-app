import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface CredentialConfig {
  provider: string;
  apiKey: string;
  baseURL?: string;
  region?: string;
  organizationId?: string;
  metadata?: Record<string, string>;
  expiresAt?: number;
  rotationPeriod?: number; // in milliseconds
}

export interface EncryptedCredential {
  provider: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
  expiresAt?: number;
  version: number;
}

export interface CredentialRotationConfig {
  enabled: boolean;
  rotationPeriod: number; // milliseconds
  gracePeriod: number; // milliseconds
  notificationThresholds: number[]; // percentages of rotation period
}

export interface CredentialValidationResult {
  isValid: boolean;
  provider: string;
  expiresAt?: number;
  rotationDue?: boolean;
  errors: string[];
}

export class CredentialManager extends EventEmitter {
  private credentials = new Map<string, EncryptedCredential>();
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';
  private keyDerivationIterations = 100000;
  private credentialPath: string;
  private rotationConfigs = new Map<string, CredentialRotationConfig>();
  private rotationTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    masterPassword: string,
    credentialPath?: string
  ) {
    super();
    
    this.credentialPath = credentialPath || path.join(process.cwd(), '.ai-credentials.enc');
    this.encryptionKey = this.deriveKey(masterPassword);
    
    this.loadCredentials();
    this.startRotationMonitoring();
  }

  public async storeCredential(config: CredentialConfig): Promise<void> {
    try {
      // Validate credential first
      const validation = await this.validateCredential(config);
      if (!validation.isValid) {
        throw new Error(`Invalid credential: ${validation.errors.join(', ')}`);
      }

      // Encrypt the credential
      const encrypted = this.encryptCredential(config);
      
      // Store in memory
      this.credentials.set(config.provider, encrypted);
      
      // Persist to disk
      await this.saveCredentials();
      
      // Setup rotation if configured
      if (config.rotationPeriod) {
        this.setupRotation(config.provider, {
          enabled: true,
          rotationPeriod: config.rotationPeriod,
          gracePeriod: config.rotationPeriod * 0.1, // 10% grace period
          notificationThresholds: [90, 75, 50] // notify at 90%, 75%, 50% of rotation period
        });
      }

      this.emit('credential:stored', {
        provider: config.provider,
        expiresAt: config.expiresAt,
        rotationEnabled: !!config.rotationPeriod
      });

    } catch (error) {
      this.emit('credential:error', {
        provider: config.provider,
        operation: 'store',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public async getCredential(provider: string): Promise<CredentialConfig | null> {
    try {
      const encrypted = this.credentials.get(provider);
      if (!encrypted) {
        return null;
      }

      // Check if expired
      if (encrypted.expiresAt && Date.now() > encrypted.expiresAt) {
        this.emit('credential:expired', { provider });
        await this.removeCredential(provider);
        return null;
      }

      // Decrypt and return
      const decrypted = this.decryptCredential(encrypted);
      
      this.emit('credential:accessed', {
        provider,
        timestamp: Date.now()
      });

      return decrypted;

    } catch (error) {
      this.emit('credential:error', {
        provider,
        operation: 'get',
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  public async removeCredential(provider: string): Promise<boolean> {
    try {
      const existed = this.credentials.has(provider);
      
      if (existed) {
        this.credentials.delete(provider);
        await this.saveCredentials();
        
        // Clear rotation timer
        const timer = this.rotationTimers.get(provider);
        if (timer) {
          clearTimeout(timer);
          this.rotationTimers.delete(provider);
        }
        this.rotationConfigs.delete(provider);

        this.emit('credential:removed', { provider });
      }

      return existed;

    } catch (error) {
      this.emit('credential:error', {
        provider,
        operation: 'remove',
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  public async rotateCredential(
    provider: string,
    newConfig: CredentialConfig
  ): Promise<void> {
    try {
      const oldCredential = await this.getCredential(provider);
      if (!oldCredential) {
        throw new Error(`No existing credential found for provider: ${provider}`);
      }

      // Store new credential
      await this.storeCredential(newConfig);
      
      // Keep old credential during grace period
      const rotationConfig = this.rotationConfigs.get(provider);
      if (rotationConfig && rotationConfig.gracePeriod > 0) {
        setTimeout(() => {
          this.emit('credential:rotation_complete', {
            provider,
            oldCredential: { ...oldCredential, apiKey: '***' }, // Don't log actual key
            newCredential: { ...newConfig, apiKey: '***' }
          });
        }, rotationConfig.gracePeriod);
      }

      this.emit('credential:rotated', {
        provider,
        rotatedAt: Date.now()
      });

    } catch (error) {
      this.emit('credential:error', {
        provider,
        operation: 'rotate',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public listProviders(): string[] {
    return Array.from(this.credentials.keys());
  }

  public async validateAllCredentials(): Promise<Record<string, CredentialValidationResult>> {
    const results: Record<string, CredentialValidationResult> = {};
    
    for (const provider of this.credentials.keys()) {
      const credential = await this.getCredential(provider);
      if (credential) {
        results[provider] = await this.validateCredential(credential);
      } else {
        results[provider] = {
          isValid: false,
          provider,
          errors: ['Failed to decrypt credential']
        };
      }
    }
    
    return results;
  }

  public setupRotation(provider: string, config: CredentialRotationConfig): void {
    this.rotationConfigs.set(provider, config);
    
    if (config.enabled) {
      // Clear existing timer
      const existingTimer = this.rotationTimers.get(provider);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Setup notification timers
      for (const threshold of config.notificationThresholds) {
        const notificationTime = config.rotationPeriod * (1 - threshold / 100);
        
        setTimeout(() => {
          this.emit('credential:rotation_warning', {
            provider,
            threshold,
            timeRemaining: config.rotationPeriod - notificationTime
          });
        }, notificationTime);
      }

      // Setup rotation timer
      const rotationTimer = setTimeout(() => {
        this.emit('credential:rotation_due', { provider });
      }, config.rotationPeriod);
      
      this.rotationTimers.set(provider, rotationTimer);
    }
  }

  private deriveKey(password: string): Buffer {
    const salt = Buffer.from('ai-credential-salt-v1', 'utf8'); // In production, use random salt
    return crypto.pbkdf2Sync(password, salt, this.keyDerivationIterations, 32, 'sha256');
  }

  private encryptCredential(config: CredentialConfig): EncryptedCredential {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    const data = JSON.stringify({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      region: config.region,
      organizationId: config.organizationId,
      metadata: config.metadata
    });

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return {
      provider: config.provider,
      encryptedData: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex'),
      createdAt: Date.now(),
      expiresAt: config.expiresAt,
      version: 1
    };
  }

  private decryptCredential(encrypted: EncryptedCredential): CredentialConfig {
    const [encryptedData, authTagHex] = encrypted.encryptedData.split(':');
    const authTag = Buffer.from(authTagHex, 'hex');
    const iv = Buffer.from(encrypted.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted);
    
    return {
      provider: encrypted.provider,
      apiKey: data.apiKey,
      baseURL: data.baseURL,
      region: data.region,
      organizationId: data.organizationId,
      metadata: data.metadata,
      expiresAt: encrypted.expiresAt
    };
  }

  private async validateCredential(config: CredentialConfig): Promise<CredentialValidationResult> {
    const errors: string[] = [];
    
    // Basic validation
    if (!config.provider) {
      errors.push('Provider is required');
    }
    
    if (!config.apiKey && config.provider.toLowerCase() !== 'ollama') {
      errors.push('API key is required');
    }
    
    // Provider-specific validation (always run for all providers)
    switch (config.provider.toLowerCase()) {
        case 'openai':
          if (config.apiKey && !config.apiKey.startsWith('sk-')) {
            errors.push('OpenAI API keys should start with "sk-"');
          }
          break;
        
        case 'anthropic':
          if (config.apiKey && !config.apiKey.startsWith('sk-ant-')) {
            errors.push('Anthropic API keys should start with "sk-ant-"');
          }
          break;
        
        case 'ollama':
          // Ollama typically doesn't require API keys but needs baseURL
          if (!config.baseURL) {
            errors.push('Ollama requires baseURL configuration');
          }
          // API key is optional for Ollama
          break;
      }
    
    // Check expiration
    const rotationDue = config.expiresAt ? Date.now() > config.expiresAt : false;
    if (rotationDue) {
      errors.push('Credential has expired');
    }

    return {
      isValid: errors.length === 0,
      provider: config.provider,
      expiresAt: config.expiresAt,
      rotationDue,
      errors
    };
  }

  private async loadCredentials(): Promise<void> {
    try {
      if (await fs.pathExists(this.credentialPath)) {
        const data = await fs.readFile(this.credentialPath, 'utf8');
        const credentials: EncryptedCredential[] = JSON.parse(data);
        
        for (const credential of credentials) {
          this.credentials.set(credential.provider, credential);
        }

        this.emit('credentials:loaded', {
          count: credentials.length,
          providers: credentials.map(c => c.provider)
        });
      }
    } catch (error) {
      this.emit('credentials:load_error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async saveCredentials(): Promise<void> {
    try {
      const credentials = Array.from(this.credentials.values());
      const data = JSON.stringify(credentials, null, 2);
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.credentialPath));
      
      // Write with proper permissions (600 - owner only)
      await fs.writeFile(this.credentialPath, data, { mode: 0o600 });
      
      this.emit('credentials:saved', {
        count: credentials.length,
        path: this.credentialPath
      });

    } catch (error) {
      this.emit('credentials:save_error', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private startRotationMonitoring(): void {
    // Check for rotation opportunities every hour
    setInterval(() => {
      this.checkRotationStatus();
    }, 60 * 60 * 1000);
  }

  private checkRotationStatus(): void {
    for (const [provider, config] of this.rotationConfigs) {
      if (config.enabled) {
        const credential = this.credentials.get(provider);
        if (credential && credential.expiresAt) {
          const timeUntilExpiry = credential.expiresAt - Date.now();
          const rotationPeriod = config.rotationPeriod;
          
          if (timeUntilExpiry <= rotationPeriod * 0.1) { // 10% of rotation period
            this.emit('credential:rotation_urgent', {
              provider,
              timeUntilExpiry,
              rotationPeriod
            });
          }
        }
      }
    }
  }

  public destroy(): void {
    // Clear all timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
    
    // Clear sensitive data
    this.credentials.clear();
    this.encryptionKey.fill(0);
  }
}