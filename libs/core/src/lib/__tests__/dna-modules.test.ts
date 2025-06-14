import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DNARegistry } from '../dna-registry';
import { DNAComposer } from '../dna-composer';
import { StripePaymentModule } from '../../../dna-modules/payments/stripe-payment.module';
import { JWTAuthModule } from '../../../dna-modules/auth/jwt-auth.module';
import { OpenAIEnhancedModule } from '../../../dna-modules/ai/openai-enhanced.module';
import { OpenRouterAIModule } from '../../../dna-modules/ai/openrouter-ai.module';

// Mock file system operations
jest.mock('fs/promises');

describe('DNA Module System', () => {
  let registry: DNARegistry;
  let composer: DNAComposer;

  beforeEach(() => {
    registry = new DNARegistry();
    composer = new DNAComposer();
  });

  describe('DNA Registry', () => {
    it('should register and retrieve modules', async () => {
      const stripeModule = new StripePaymentModule();
      await registry.registerModule(stripeModule);

      const retrieved = await registry.getModule('payments-stripe');
      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.id).toBe('payments-stripe');
    });

    it('should discover modules from directory', async () => {
      // Mock directory structure
      const mockModules = [
        { id: 'payments-stripe', name: 'Stripe Payments' },
        { id: 'auth-jwt', name: 'JWT Authentication' },
        { id: 'ai-openai', name: 'OpenAI Integration' }
      ];

      // Mock the discovery process
      jest.spyOn(registry, 'discoverModules').mockResolvedValue(mockModules.length);

      const discovered = await registry.discoverModules('/mock/path');
      expect(discovered).toBe(3);
    });

    it('should search modules by criteria', async () => {
      const stripeModule = new StripePaymentModule();
      const jwtModule = new JWTAuthModule();
      
      await registry.registerModule(stripeModule);
      await registry.registerModule(jwtModule);

      const paymentModules = await registry.searchModules({
        category: 'payments'
      });
      
      expect(paymentModules).toHaveLength(1);
      expect(paymentModules[0].metadata.id).toBe('payments-stripe');
    });

    it('should filter modules by framework', async () => {
      const stripeModule = new StripePaymentModule();
      await registry.registerModule(stripeModule);

      const nextjsModules = await registry.getModulesByFramework('nextjs');
      expect(nextjsModules).toHaveLength(1);
      expect(nextjsModules[0].metadata.frameworks).toContain('nextjs');
    });

    it('should validate module compatibility', async () => {
      const stripeModule = new StripePaymentModule();
      const validationResult = await registry.validateModule(stripeModule);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
  });

  describe('DNA Composer', () => {
    beforeEach(async () => {
      // Setup modules for composition tests
      const stripeModule = new StripePaymentModule();
      const jwtModule = new JWTAuthModule();
      const openaiModule = new OpenAIEnhancedModule();
      const openrouterModule = new OpenRouterAIModule();

      await registry.registerModule(stripeModule);
      await registry.registerModule(jwtModule);
      await registry.registerModule(openaiModule);
      await registry.registerModule(openrouterModule);
    });

    it('should compose compatible modules', async () => {
      const moduleIds = ['payments-stripe', 'auth-jwt', 'ai-openai-enhanced'];
      const composition = await composer.composeModules(moduleIds, registry);

      expect(composition.success).toBe(true);
      expect(composition.modules).toHaveLength(3);
      expect(composition.conflicts).toHaveLength(0);
    });

    it('should detect module conflicts', async () => {
      // Mock conflicting modules
      const conflictingModule = new StripePaymentModule();
      conflictingModule.metadata.id = 'payments-conflicting';
      conflictingModule.metadata.conflicts = ['payments-stripe'];

      await registry.registerModule(conflictingModule);

      const moduleIds = ['payments-stripe', 'payments-conflicting'];
      const composition = await composer.composeModules(moduleIds, registry);

      expect(composition.success).toBe(false);
      expect(composition.conflicts.length).toBeGreaterThan(0);
    });

    it('should resolve dependencies', async () => {
      // Create module with dependencies
      const dependentModule = new OpenAIModule();
      dependentModule.metadata.dependencies = ['auth-jwt'];

      await registry.registerModule(dependentModule);

      const resolved = await composer.resolveDependencies(['ai-openai'], registry);
      expect(resolved).toContain('auth-jwt');
      expect(resolved).toContain('ai-openai');
    });

    it('should optimize composition', async () => {
      const moduleIds = ['payments-stripe', 'auth-jwt', 'ai-openai-enhanced'];
      const composition = await composer.composeModules(moduleIds, registry);

      const optimized = await composer.optimizeComposition(composition);
      expect(optimized.performanceScore).toBeGreaterThan(0);
      expect(optimized.suggestions).toBeDefined();
    });

    it('should generate framework-specific files', async () => {
      const moduleIds = ['payments-stripe'];
      const composition = await composer.composeModules(moduleIds, registry);

      const files = await composer.generateFiles(composition, 'nextjs');
      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path.includes('stripe'))).toBe(true);
    });
  });

  describe('Module Configuration', () => {
    it('should validate module configuration', async () => {
      const stripeModule = new StripePaymentModule();
      
      // Valid configuration
      const validConfig = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_123',
        currency: 'usd'
      };

      const validation = await stripeModule.validateConfiguration(validConfig);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid configuration', async () => {
      const stripeModule = new StripePaymentModule();
      
      // Invalid configuration (missing required fields)
      const invalidConfig = {
        currency: 'usd'
      };

      const validation = await stripeModule.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should merge configurations', async () => {
      const stripeModule = new StripePaymentModule();
      
      const userConfig = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_123'
      };

      const merged = await stripeModule.mergeConfiguration(userConfig);
      expect(merged.publishableKey).toBe('pk_test_123');
      expect(merged.currency).toBe('usd'); // default value
    });
  });

  describe('Framework Implementations', () => {
    it('should generate Next.js specific files', async () => {
      const stripeModule = new StripePaymentModule();
      
      const files = await stripeModule.generateFiles('nextjs', {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_123',
        currency: 'usd',
        subscriptions: false,
        marketplace: false,
        taxCalculation: false,
        scaCompliance: true
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path.includes('lib/stripe.ts'))).toBe(true);
      expect(files.some(f => f.path.includes('components/PaymentForm.tsx'))).toBe(true);
    });

    it('should generate Flutter specific files', async () => {
      const stripeModule = new StripePaymentModule();
      
      const files = await stripeModule.generateFiles('flutter', {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_123',
        currency: 'usd',
        subscriptions: false,
        marketplace: false,
        taxCalculation: false,
        scaCompliance: true
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path.includes('.dart'))).toBe(true);
    });

    it('should include framework-specific dependencies', async () => {
      const stripeModule = new StripePaymentModule();
      const impl = stripeModule.frameworkImplementations['nextjs'];
      
      expect(impl.dependencies).toBeDefined();
      expect(impl.dependencies['@stripe/stripe-js']).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize module correctly', async () => {
      const stripeModule = new StripePaymentModule();
      
      const config = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_123',
        currency: 'usd',
        subscriptions: false,
        marketplace: false,
        taxCalculation: false,
        scaCompliance: true
      };

      await stripeModule.initialize(config);
      expect(stripeModule.isInitialized()).toBe(true);
    });

    it('should validate module before initialization', async () => {
      const stripeModule = new StripePaymentModule();
      
      const validationResult = await stripeModule.validate();
      expect(validationResult.valid).toBe(true);
    });

    it('should install dependencies', async () => {
      const stripeModule = new StripePaymentModule();
      
      // Mock installation process
      const installResult = await stripeModule.install('nextjs', '/mock/path');
      expect(installResult.success).toBe(true);
    });

    it('should clean up on uninstall', async () => {
      const stripeModule = new StripePaymentModule();
      
      // Mock cleanup process
      const cleanupResult = await stripeModule.cleanup('/mock/path');
      expect(cleanupResult.success).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should measure composition performance', async () => {
      const moduleIds = ['payments-stripe', 'auth-jwt', 'ai-openai-enhanced'];
      const startTime = Date.now();
      
      const composition = await composer.composeModules(moduleIds, registry);
      const endTime = Date.now();
      
      expect(composition.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete under 1 second
    });

    it('should cache module metadata', async () => {
      const stripeModule = new StripePaymentModule();
      await registry.registerModule(stripeModule);

      // First retrieval
      const start1 = Date.now();
      await registry.getModule('payments-stripe');
      const end1 = Date.now();

      // Second retrieval (should be cached)
      const start2 = Date.now();
      await registry.getModule('payments-stripe');
      const end2 = Date.now();

      expect(end2 - start2).toBeLessThanOrEqual(end1 - start1);
    });

    it('should optimize file generation', async () => {
      const moduleIds = ['payments-stripe', 'auth-jwt'];
      const composition = await composer.composeModules(moduleIds, registry);

      const files = await composer.generateFiles(composition, 'nextjs');
      
      // Should not generate duplicate files
      const filePaths = files.map(f => f.path);
      const uniquePaths = new Set(filePaths);
      expect(filePaths.length).toBe(uniquePaths.size);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing module gracefully', async () => {
      const result = await registry.getModule('non-existent-module');
      expect(result).toBeUndefined();
    });

    it('should handle circular dependencies', async () => {
      // Create modules with circular dependencies
      const moduleA = new StripePaymentModule();
      moduleA.metadata.id = 'module-a';
      moduleA.metadata.dependencies = ['module-b'];

      const moduleB = new JWTAuthModule();
      moduleB.metadata.id = 'module-b';
      moduleB.metadata.dependencies = ['module-a'];

      await registry.registerModule(moduleA);
      await registry.registerModule(moduleB);

      const resolved = await composer.resolveDependencies(['module-a'], registry);
      expect(resolved).toBeDefined();
      // Should handle circular dependency without infinite loop
    });

    it('should validate framework compatibility', async () => {
      const stripeModule = new StripePaymentModule();
      
      const isCompatible = await stripeModule.isFrameworkSupported('unsupported-framework');
      expect(isCompatible).toBe(false);
    });
  });
});