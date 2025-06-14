import { EnvironmentConfigManager, EnvironmentConfig } from './environment-config';
import { CredentialManager, CredentialConfig } from './credential-manager';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Configuration Validation and Testing', () => {
  const tempDir = path.join(__dirname, '.temp-test');
  const testConfigPath = path.join(tempDir, 'test-config.json');
  const testCredentialPath = path.join(tempDir, 'test-credentials.enc');
  
  beforeAll(async () => {
    await fs.ensureDir(tempDir);
  });
  
  afterAll(async () => {
    await fs.remove(tempDir);
  });
  
  afterEach(async () => {
    // Clean up test files
    if (await fs.pathExists(testConfigPath)) {
      await fs.remove(testConfigPath);
    }
    if (await fs.pathExists(testCredentialPath)) {
      await fs.remove(testCredentialPath);
    }
  });

  describe('EnvironmentConfigManager', () => {
    let configManager: EnvironmentConfigManager;
    
    beforeEach(() => {
      configManager = new EnvironmentConfigManager('test', testConfigPath);
    });
    
    afterEach(() => {
      configManager.destroy();
    });

    test('should create valid default configuration', () => {
      const config = configManager.getConfig();
      
      expect(config.environment).toBe('test');
      expect(config.globalSettings).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.monitoring).toBeDefined();
      
      expect(configManager.validateConfig()).toBe(true);
    });

    test('should validate provider configurations', async () => {
      const validConfig: Partial<EnvironmentConfig> = {
        providers: {
          openai: {
            name: 'openai',
            apiKey: 'sk-test123',
            defaultModel: 'gpt-4',
            rateLimits: {
              requestsPerMinute: 100,
              tokensPerMinute: 50000
            },
            costLimits: {
              dailyBudget: 10,
              monthlyBudget: 300
            }
          }
        }
      };

      await configManager.updateConfig(validConfig);
      expect(configManager.validateConfig()).toBe(true);
    });

    test('should reject invalid provider configurations', async () => {
      const invalidConfig: Partial<EnvironmentConfig> = {
        providers: {
          openai: {
            name: 'openai',
            apiKey: 'sk-test123',
            defaultModel: 'gpt-4',
            rateLimits: {
              requestsPerMinute: -10, // Invalid: negative
              tokensPerMinute: 50000
            },
            costLimits: {
              dailyBudget: 100, // Invalid: exceeds monthly
              monthlyBudget: 50
            }
          }
        }
      };

      await expect(configManager.updateConfig(invalidConfig)).rejects.toThrow();
    });

    test('should handle environment variable overrides', async () => {
      // Set test environment variables
      process.env.AI_LOG_LEVEL = 'error';
      process.env.AI_ENABLE_LOGGING = 'false';
      process.env.AI_MAX_CONCURRENT = '15';
      
      const manager = new EnvironmentConfigManager('test', testConfigPath);
      await manager.loadConfig(); // Explicit load to ensure env vars are applied
      
      const config = manager.getConfig();
      expect(config.globalSettings.logLevel).toBe('error');
      expect(config.globalSettings.enableLogging).toBe(false);
      expect(config.performance.maxConcurrentRequests).toBe(15);
      
      // Cleanup
      delete process.env.AI_LOG_LEVEL;
      delete process.env.AI_ENABLE_LOGGING;
      delete process.env.AI_MAX_CONCURRENT;
      manager.destroy();
    });

    test('should handle runtime configuration overrides', () => {
      configManager.setOverride('globalSettings.logLevel', 'debug', 'Test override');
      
      const config = configManager.getConfig();
      expect(config.globalSettings.logLevel).toBe('debug');
      
      const overrides = configManager.getOverrides();
      expect(overrides).toHaveLength(1);
      expect(overrides[0].path).toBe('globalSettings.logLevel');
      expect(overrides[0].reason).toBe('Test override');
    });

    test('should remove overrides correctly', () => {
      configManager.setOverride('performance.maxConcurrentRequests', 25);
      expect(configManager.getOverrides()).toHaveLength(1);
      
      const removed = configManager.removeOverride('performance.maxConcurrentRequests');
      expect(removed).toBe(true);
      expect(configManager.getOverrides()).toHaveLength(0);
    });

    test('should validate business rules', () => {
      const config = configManager.getConfig();
      
      // Add invalid provider with daily > monthly budget
      config.providers.invalid = {
        name: 'invalid',
        apiKey: 'test',
        defaultModel: 'test',
        rateLimits: {
          requestsPerMinute: 100,
          tokensPerMinute: 50000
        },
        costLimits: {
          dailyBudget: 500,
          monthlyBudget: 100
        }
      };
      
      // Force validation without going through updateConfig
      const isValid = configManager.validateConfig();
      expect(isValid).toBe(false);
      
      const errors = configManager.getValidationErrors();
      expect(errors.some(e => e.includes('Daily budget cannot exceed monthly budget'))).toBe(true);
    });

    test('should handle configuration file persistence', async () => {
      const testConfig: Partial<EnvironmentConfig> = {
        globalSettings: {
          enableLogging: false,
          logLevel: 'error',
          enableMetrics: true,
          enableCaching: false,
          defaultTimeout: 15000,
          retryAttempts: 2
        }
      };

      await configManager.updateConfig(testConfig);
      
      // Wait a bit for file to be fully written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify environment-specific file was created  
      const configDir = path.dirname(testConfigPath);
      const envConfigPath = path.join(configDir, 'ai.test.json');
      expect(await fs.pathExists(envConfigPath)).toBe(true);
      
      // Create new manager and verify it loads the saved config
      const newManager = new EnvironmentConfigManager('test', testConfigPath);
      await newManager.loadConfig();
      
      const loadedConfig = newManager.getConfig();
      expect(loadedConfig.globalSettings.enableLogging).toBe(false);
      expect(loadedConfig.globalSettings.logLevel).toBe('error');
      
      newManager.destroy();
    });

    test('should emit configuration events', async () => {
      const events: any[] = [];
      
      configManager.on('config:updated', (data) => {
        events.push({ type: 'updated', data });
      });
      
      configManager.on('config:override', (data) => {
        events.push({ type: 'override', data });
      });
      
      await configManager.updateConfig({
        globalSettings: {
          enableLogging: true,
          logLevel: 'info',
          enableMetrics: true,
          enableCaching: true,
          defaultTimeout: 30000,
          retryAttempts: 3
        }
      });
      
      // Wait for file operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      configManager.setOverride('globalSettings.enableMetrics', false);
      
      // Give events time to fire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('updated');
      expect(events[1].type).toBe('override');
      expect(events[1].data.path).toBe('globalSettings.enableMetrics');
    });
  });

  describe('CredentialManager', () => {
    let credentialManager: CredentialManager;
    const testPassword = 'test-master-password-123';
    
    beforeEach(() => {
      credentialManager = new CredentialManager(testPassword, testCredentialPath);
    });
    
    afterEach(() => {
      credentialManager.destroy();
    });

    test('should store and retrieve credentials securely', async () => {
      const testCredential: CredentialConfig = {
        provider: 'openai',
        apiKey: 'sk-test123456789',
        baseURL: 'https://api.openai.com/v1',
        organizationId: 'org-test123'
      };

      await credentialManager.storeCredential(testCredential);
      
      const retrieved = await credentialManager.getCredential('openai');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.apiKey).toBe(testCredential.apiKey);
      expect(retrieved!.baseURL).toBe(testCredential.baseURL);
      expect(retrieved!.organizationId).toBe(testCredential.organizationId);
    });

    test('should validate OpenAI credentials', async () => {
      const validOpenAI: CredentialConfig = {
        provider: 'openai',
        apiKey: 'sk-test123456789'
      };

      await expect(credentialManager.storeCredential(validOpenAI)).resolves.not.toThrow();

      const invalidOpenAI: CredentialConfig = {
        provider: 'openai',
        apiKey: 'invalid-key-format'
      };

      await expect(credentialManager.storeCredential(invalidOpenAI)).rejects.toThrow('OpenAI API keys should start with "sk-"');
    });

    test('should validate Anthropic credentials', async () => {
      const validAnthropic: CredentialConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123456789'
      };

      await expect(credentialManager.storeCredential(validAnthropic)).resolves.not.toThrow();

      const invalidAnthropic: CredentialConfig = {
        provider: 'anthropic',
        apiKey: 'sk-wrong-prefix'
      };

      await expect(credentialManager.storeCredential(invalidAnthropic)).rejects.toThrow('Anthropic API keys should start with "sk-ant-"');
    });

    test('should validate Ollama credentials', async () => {
      const validOllama: CredentialConfig = {
        provider: 'ollama',
        apiKey: '', // Ollama accepts empty API key
        baseURL: 'http://localhost:11434'
      };

      await expect(credentialManager.storeCredential(validOllama)).resolves.not.toThrow();

      const invalidOllama: CredentialConfig = {
        provider: 'ollama',
        apiKey: '' // Ollama accepts empty API key
        // Missing required baseURL
      };

      await expect(credentialManager.storeCredential(invalidOllama)).rejects.toThrow('Ollama requires baseURL configuration');
    });

    test('should handle credential expiration', async () => {
      const futureCredential: CredentialConfig = {
        provider: 'test-provider-future',
        apiKey: 'test-key-future',
        expiresAt: Date.now() + 60000 // Expires in 1 minute
      };

      await credentialManager.storeCredential(futureCredential);
      
      // Should successfully retrieve non-expired credential
      const retrieved = await credentialManager.getCredential('test-provider-future');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.apiKey).toBe('test-key-future');
      
      // Now test with expired credential by setting past expiration
      const expiredCredential: CredentialConfig = {
        provider: 'test-provider-expired',
        apiKey: 'test-key-expired',
        expiresAt: Date.now() - 1000 // Expired 1 second ago
      };

      // Should fail to store expired credential
      await expect(credentialManager.storeCredential(expiredCredential)).rejects.toThrow('Credential has expired');
    });

    test('should persist credentials to encrypted file', async () => {
      const credential: CredentialConfig = {
        provider: 'test-provider',
        apiKey: 'secret-key-12345',
        metadata: { region: 'us-east-1' }
      };

      await credentialManager.storeCredential(credential);
      
      // Verify file exists
      expect(await fs.pathExists(testCredentialPath)).toBe(true);
      
      // Create new manager with same password and verify it can decrypt
      const newManager = new CredentialManager(testPassword, testCredentialPath);
      
      // Wait a bit for async loading to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retrieved = await newManager.getCredential('test-provider');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.apiKey).toBe(credential.apiKey);
      expect(retrieved!.metadata).toEqual(credential.metadata);
      
      newManager.destroy();
    });

    test('should fail with wrong password', async () => {
      const credential: CredentialConfig = {
        provider: 'test-provider',
        apiKey: 'secret-key-12345'
      };

      await credentialManager.storeCredential(credential);
      
      // Try to access with wrong password
      const wrongManager = new CredentialManager('wrong-password', testCredentialPath);
      const retrieved = await wrongManager.getCredential('test-provider');
      
      // Should return null due to decryption failure
      expect(retrieved).toBeNull();
      
      wrongManager.destroy();
    });

    test('should handle credential rotation', async () => {
      const originalCredential: CredentialConfig = {
        provider: 'rotation-test',
        apiKey: 'old-key-123',
        rotationPeriod: 86400000 // 24 hours
      };

      await credentialManager.storeCredential(originalCredential);
      
      const newCredential: CredentialConfig = {
        provider: 'rotation-test',
        apiKey: 'new-key-456',
        rotationPeriod: 86400000
      };

      await credentialManager.rotateCredential('rotation-test', newCredential);
      
      const retrieved = await credentialManager.getCredential('rotation-test');
      expect(retrieved!.apiKey).toBe('new-key-456');
    });

    test('should validate all stored credentials', async () => {
      const credentials: CredentialConfig[] = [
        {
          provider: 'openai',
          apiKey: 'sk-valid123'
        },
        {
          provider: 'anthropic',
          apiKey: 'sk-ant-valid456'
        }
      ];

      for (const cred of credentials) {
        await credentialManager.storeCredential(cred);
      }

      const results = await credentialManager.validateAllCredentials();
      
      expect(results.openai.isValid).toBe(true);
      expect(results.anthropic.isValid).toBe(true);
      expect(Object.keys(results)).toHaveLength(2); // Only valid credentials stored
    });

    test('should emit credential events', async () => {
      const events: any[] = [];
      
      credentialManager.on('credential:stored', (data) => {
        events.push({ type: 'stored', data });
      });
      
      credentialManager.on('credential:accessed', (data) => {
        events.push({ type: 'accessed', data });
      });
      
      const testCredential: CredentialConfig = {
        provider: 'event-test',
        apiKey: 'sk-test123'
      };
      
      await credentialManager.storeCredential(testCredential);
      await credentialManager.getCredential('event-test');
      
      // Give events time to fire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('stored');
      expect(events[0].data.provider).toBe('event-test');
      expect(events[1].type).toBe('accessed');
      expect(events[1].data.provider).toBe('event-test');
    });
  });

  describe('Integration Tests', () => {
    test('should work together for complete configuration setup', async () => {
      const configManager = new EnvironmentConfigManager('test', testConfigPath);
      const credentialManager = new CredentialManager('integration-test', testCredentialPath);
      
      try {
        // Store credentials
        await credentialManager.storeCredential({
          provider: 'openai',
          apiKey: 'sk-integration-test-123'
        });
        
        await credentialManager.storeCredential({
          provider: 'anthropic',
          apiKey: 'sk-ant-integration-test-456'
        });
        
        // Configure the environment with provider configs
        await configManager.updateConfig({
          providers: {
            openai: {
              name: 'openai',
              apiKey: 'sk-integration-test-123',
              defaultModel: 'gpt-4',
              rateLimits: {
                requestsPerMinute: 60,
                tokensPerMinute: 90000
              },
              costLimits: {
                dailyBudget: 25,
                monthlyBudget: 750
              }
            },
            anthropic: {
              name: 'anthropic',
              apiKey: 'sk-ant-integration-test-456',
              defaultModel: 'claude-3-sonnet-20240229',
              rateLimits: {
                requestsPerMinute: 50,
                tokensPerMinute: 80000
              },
              costLimits: {
                dailyBudget: 20,
                monthlyBudget: 600
              }
            }
          }
        });
        
        // Validate everything works together
        expect(configManager.validateConfig()).toBe(true);
        
        const openaiCred = await credentialManager.getCredential('openai');
        const anthropicCred = await credentialManager.getCredential('anthropic');
        
        expect(openaiCred).not.toBeNull();
        expect(anthropicCred).not.toBeNull();
        
        const config = configManager.getConfig();
        expect(config.providers.openai).toBeDefined();
        expect(config.providers.anthropic).toBeDefined();
        
        // Verify credential validation
        const validationResults = await credentialManager.validateAllCredentials();
        expect(validationResults.openai.isValid).toBe(true);
        expect(validationResults.anthropic.isValid).toBe(true);
        
      } finally {
        configManager.destroy();
        credentialManager.destroy();
      }
    });
  });
});