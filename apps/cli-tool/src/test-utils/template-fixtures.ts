/**
 * @fileoverview Template fixtures for testing
 */

import { TemplateMetadata, TemplateVariable } from '../types/cli';
import { TemplateType, SupportedFramework } from '@dna/core';

export const mockTemplateVariables: TemplateVariable[] = [
  {
    name: 'projectName',
    description: 'Name of the project',
    required: true,
    type: 'string'
  },
  {
    name: 'description',
    description: 'Project description',
    required: false,
    default: 'A DNA-generated project',
    type: 'string'
  },
  {
    name: 'author',
    description: 'Project author',
    required: false,
    default: 'Developer',
    type: 'string'
  },
  {
    name: 'databaseType',
    description: 'Database type to use',
    required: true,
    type: 'select',
    options: ['postgresql', 'mysql', 'sqlite', 'mongodb']
  },
  {
    name: 'apiKey',
    description: 'API key for external service',
    required: false,
    sensitive: true,
    type: 'string'
  },
  {
    name: 'enableAnalytics',
    description: 'Enable analytics tracking',
    required: false,
    default: 'false',
    type: 'boolean'
  }
];

export const mockAISaasTemplate: TemplateMetadata = {
  id: 'ai-saas',
  name: 'AI SaaS Application',
  description: 'Complete AI-powered SaaS application with authentication, payments, and AI integration',
  type: TemplateType.AI_SAAS,
  framework: SupportedFramework.NEXTJS,
  version: '1.2.0',
  author: 'DNA Templates Team',
  tags: ['ai', 'saas', 'nextjs', 'typescript', 'stripe', 'auth'],
  dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai', 'database-postgres'],
  requirements: {
    node: '>=18.0.0',
    npm: '>=8.0.0',
    frameworks: ['nextjs']
  },
  features: [
    'JWT Authentication',
    'Stripe Payments',
    'OpenAI Integration',
    'PostgreSQL Database',
    'Responsive UI',
    'API Routes',
    'Middleware',
    'Error Handling'
  ],
  complexity: 'intermediate',
  estimatedSetupTime: 8,
  lastUpdated: new Date('2024-01-15'),
  downloadCount: 1500,
  rating: 4.7,
  variables: mockTemplateVariables
};

export const mockFlutterTemplate: TemplateMetadata = {
  id: 'flutter-universal',
  name: 'Flutter Universal App',
  description: 'Cross-platform Flutter application for mobile, web, and desktop',
  type: TemplateType.FLUTTER_UNIVERSAL,
  framework: SupportedFramework.FLUTTER,
  version: '2.0.1',
  author: 'DNA Templates Team',
  tags: ['flutter', 'cross-platform', 'mobile', 'web', 'desktop'],
  dnaModules: ['auth-firebase', 'state-riverpod', 'storage-hive'],
  requirements: {
    frameworks: ['flutter']
  },
  features: [
    'Cross-platform compatibility',
    'Firebase Authentication',
    'Riverpod State Management',
    'Hive Local Storage',
    'Material Design 3',
    'Responsive Layout',
    'Platform-specific features'
  ],
  complexity: 'advanced',
  estimatedSetupTime: 12,
  lastUpdated: new Date('2024-01-10'),
  downloadCount: 850,
  rating: 4.5,
  variables: [
    {
      name: 'projectName',
      description: 'Flutter project name',
      required: true,
      type: 'string'
    },
    {
      name: 'organizationName',
      description: 'Organization identifier (e.g., com.example)',
      required: true,
      type: 'string'
    },
    {
      name: 'platforms',
      description: 'Target platforms',
      required: true,
      type: 'select',
      options: ['all', 'mobile-only', 'web-only', 'desktop-only']
    }
  ]
};

export const mockReactNativeTemplate: TemplateMetadata = {
  id: 'react-native-business',
  name: 'React Native Business App',
  description: 'Enterprise-ready React Native application with advanced features',
  type: TemplateType.BUSINESS_APPS,
  framework: SupportedFramework.REACT_NATIVE,
  version: '1.0.5',
  author: 'DNA Templates Team',
  tags: ['react-native', 'business', 'enterprise', 'typescript'],
  dnaModules: ['auth-oauth', 'navigation-stack', 'testing-detox'],
  requirements: {
    node: '>=18.0.0',
    frameworks: ['react-native']
  },
  features: [
    'OAuth Authentication',
    'Stack Navigation',
    'Detox E2E Testing',
    'TypeScript',
    'Code Push',
    'Crash Analytics',
    'Push Notifications'
  ],
  complexity: 'intermediate',
  estimatedSetupTime: 10,
  lastUpdated: new Date('2024-01-12'),
  downloadCount: 650,
  rating: 4.3,
  variables: [
    {
      name: 'projectName',
      description: 'React Native project name',
      required: true,
      type: 'string'
    },
    {
      name: 'bundleId',
      description: 'iOS bundle identifier',
      required: true,
      type: 'string'
    },
    {
      name: 'packageName',
      description: 'Android package name',
      required: true,
      type: 'string'
    }
  ]
};

export const mockBasicTypescriptTemplate: TemplateMetadata = {
  id: 'basic-typescript',
  name: 'Basic TypeScript Project',
  description: 'Simple TypeScript project with essential tooling',
  type: TemplateType.FOUNDATION,
  framework: 'typescript' as any,
  version: '1.1.0',
  author: 'DNA Templates Team',
  tags: ['typescript', 'basic', 'foundation'],
  dnaModules: ['testing-jest', 'linting-eslint'],
  requirements: {
    node: '>=16.0.0'
  },
  features: [
    'TypeScript Configuration',
    'Jest Testing',
    'ESLint + Prettier',
    'GitHub Actions CI',
    'Package.json Scripts'
  ],
  complexity: 'beginner',
  estimatedSetupTime: 3,
  lastUpdated: new Date('2024-01-08'),
  downloadCount: 2200,
  rating: 4.2,
  variables: [
    {
      name: 'projectName',
      description: 'Project name',
      required: true,
      type: 'string'
    },
    {
      name: 'includeCI',
      description: 'Include GitHub Actions CI/CD',
      required: false,
      default: 'true',
      type: 'boolean'
    }
  ]
};

export const mockInvalidTemplate: Partial<TemplateMetadata> = {
  id: 'invalid-template',
  name: 'Invalid Template',
  // Missing required fields like description, type, framework, version
  tags: ['invalid'],
  dnaModules: ['nonexistent-module'],
  features: [],
  complexity: 'beginner' as any,
  estimatedSetupTime: 1,
  lastUpdated: new Date()
};

export const allMockTemplates: TemplateMetadata[] = [
  mockAISaasTemplate,
  mockFlutterTemplate,
  mockReactNativeTemplate,
  mockBasicTypescriptTemplate
];

// Template registry fixtures
export const mockTemplateRegistry = {
  templates: allMockTemplates,
  lastUpdated: new Date('2024-01-15'),
  version: '1.0.0'
};

// Factory functions for creating test templates
export function createTestTemplate(overrides: Partial<TemplateMetadata> = {}): TemplateMetadata {
  return {
    id: 'test-template',
    name: 'Test Template',
    description: 'Template for testing purposes',
    type: TemplateType.FOUNDATION,
    framework: 'typescript' as any,
    version: '1.0.0',
    author: 'Test Author',
    tags: ['test'],
    dnaModules: [],
    requirements: {},
    features: ['Testing'],
    complexity: 'beginner',
    estimatedSetupTime: 1,
    lastUpdated: new Date(),
    ...overrides
  };
}

export function createTemplateWithDNAModules(modules: string[]): TemplateMetadata {
  return createTestTemplate({
    id: 'template-with-modules',
    name: 'Template with DNA Modules',
    dnaModules: modules,
    features: modules.map(m => `${m} integration`)
  });
}

export function createComplexTemplate(): TemplateMetadata {
  return createTestTemplate({
    id: 'complex-template',
    name: 'Complex Template',
    complexity: 'advanced',
    estimatedSetupTime: 15,
    dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai', 'database-postgres'],
    features: [
      'Advanced Authentication',
      'Payment Processing',
      'AI Integration',
      'Database Management',
      'Real-time Features',
      'Advanced Testing'
    ],
    variables: mockTemplateVariables
  });
}

// DNA Module fixtures
export const mockDNAModules = {
  'auth-jwt': {
    id: 'auth-jwt',
    name: 'JWT Authentication',
    description: 'JSON Web Token authentication system',
    version: '1.0.0',
    compatibility: ['nextjs', 'react-native', 'typescript'],
    dependencies: ['jsonwebtoken', '@types/jsonwebtoken'],
    files: ['src/auth/jwt.ts', 'src/middleware/auth.ts']
  },
  'payment-stripe': {
    id: 'payment-stripe',
    name: 'Stripe Payments',
    description: 'Stripe payment integration',
    version: '1.0.0',
    compatibility: ['nextjs', 'react-native'],
    dependencies: ['stripe', '@types/stripe'],
    files: ['src/payments/stripe.ts', 'src/api/payments.ts']
  },
  'ai-openai': {
    id: 'ai-openai',
    name: 'OpenAI Integration',
    description: 'OpenAI API integration for AI features',
    version: '1.0.0',
    compatibility: ['nextjs', 'typescript'],
    dependencies: ['openai'],
    files: ['src/ai/openai.ts', 'src/api/ai.ts']
  }
};

// Project configuration fixtures
export const mockProjectConfigs = {
  basic: {
    name: 'test-project',
    path: '/tmp/test-project',
    template: 'basic-typescript',
    framework: 'typescript' as any,
    dnaModules: [],
    variables: {
      projectName: 'test-project',
      author: 'Test Author'
    },
    packageManager: 'npm' as const,
    skipInstall: false,
    skipGit: false
  },
  aiSaas: {
    name: 'ai-saas-project',
    path: '/tmp/ai-saas-project',
    template: 'ai-saas',
    framework: SupportedFramework.NEXTJS,
    dnaModules: ['auth-jwt', 'payment-stripe', 'ai-openai'],
    variables: {
      projectName: 'ai-saas-project',
      description: 'AI-powered SaaS application',
      author: 'Test Author',
      databaseType: 'postgresql',
      enableAnalytics: 'true'
    },
    packageManager: 'npm' as const,
    skipInstall: false,
    skipGit: false
  },
  flutter: {
    name: 'flutter-app',
    path: '/tmp/flutter-app',
    template: 'flutter-universal',
    framework: SupportedFramework.FLUTTER,
    dnaModules: ['auth-firebase', 'state-riverpod'],
    variables: {
      projectName: 'flutter_app',
      organizationName: 'com.example',
      platforms: 'all'
    },
    packageManager: 'npm' as const,
    skipInstall: true,
    skipGit: false
  }
};

// Error scenarios for testing
export const errorScenarios = {
  templateNotFound: {
    templateId: 'nonexistent-template',
    expectedError: 'TEMPLATE_NOT_FOUND'
  },
  invalidProjectName: {
    projectName: '123invalid',
    expectedError: 'INVALID_PROJECT_NAME'
  },
  directoryExists: {
    path: '/existing/directory',
    expectedError: 'DIRECTORY_EXISTS'
  },
  incompatibleModules: {
    template: 'basic-typescript',
    modules: ['auth-firebase'], // Flutter-specific module
    expectedError: 'DNA_MODULE_CONFLICT'
  }
};