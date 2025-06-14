/**
 * @fileoverview Configuration factory utilities for testing framework
 */

import {
  Framework,
  TestConfig,
  QualityGateConfig,
  TestType,
  TestGenerationConfig,
} from '../types';

/**
 * Create default test configuration for a framework
 */
export function createDefaultTestConfig(framework: Framework): TestConfig {
  const baseConfig: TestConfig = {
    framework,
    testTypes: ['unit', 'integration', 'e2e', 'performance', 'accessibility', 'security'],
    coverage: {
      enabled: true,
      threshold: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reportPath: './coverage',
    },
    performance: {
      enabled: true,
      benchmarks: [
        {
          name: 'Build Time',
          metric: 'executionTime',
          threshold: 30000, // 30 seconds
          tolerance: 10, // 10% tolerance
        },
        {
          name: 'Memory Usage',
          metric: 'memoryUsage',
          threshold: 200 * 1024 * 1024, // 200MB
          tolerance: 15,
        },
      ],
    },
    security: {
      enabled: true,
      scanners: [
        {
          name: 'npm-audit',
          command: 'npm',
          args: ['audit', '--json'],
          outputFormat: 'json',
        },
      ],
    },
    accessibility: {
      enabled: true,
      wcagLevel: 'AA',
    },
    qualityGates: createDefaultQualityGateConfig(),
  };

  // Framework-specific configurations
  switch (framework) {
    case 'flutter':
      return {
        ...baseConfig,
        testTypes: ['unit', 'integration', 'e2e', 'performance'],
        coverage: {
          ...baseConfig.coverage,
          threshold: {
            lines: 85,
            functions: 85,
            branches: 85,
            statements: 85,
          },
        },
        performance: {
          ...baseConfig.performance,
          benchmarks: [
            ...baseConfig.performance.benchmarks,
            {
              name: 'APK Size',
              metric: 'bundleSize',
              threshold: 20 * 1024 * 1024, // 20MB
              tolerance: 5,
            },
            {
              name: 'Widget Render Time',
              metric: 'renderTime',
              threshold: 16, // 60fps = 16ms per frame
              tolerance: 20,
            },
          ],
        },
      };

    case 'react-native':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          benchmarks: [
            ...baseConfig.performance.benchmarks,
            {
              name: 'Bundle Size',
              metric: 'bundleSize',
              threshold: 15 * 1024 * 1024, // 15MB
              tolerance: 10,
            },
            {
              name: 'Component Render Time',
              metric: 'renderTime',
              threshold: 100, // 100ms
              tolerance: 15,
            },
          ],
        },
        security: {
          ...baseConfig.security,
          scanners: [
            ...baseConfig.security.scanners,
            {
              name: 'react-native-audit',
              command: 'npx',
              args: ['react-native-community/cli', 'doctor'],
              outputFormat: 'json',
            },
          ],
        },
      };

    case 'nextjs':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          benchmarks: [
            ...baseConfig.performance.benchmarks,
            {
              name: 'Bundle Size',
              metric: 'bundleSize',
              threshold: 2 * 1024 * 1024, // 2MB
              tolerance: 10,
            },
            {
              name: 'Time to Interactive',
              metric: 'timeToInteractive',
              threshold: 3000, // 3 seconds
              tolerance: 15,
            },
            {
              name: 'First Contentful Paint',
              metric: 'renderTime',
              threshold: 1500, // 1.5 seconds
              tolerance: 10,
            },
          ],
        },
        accessibility: {
          ...baseConfig.accessibility,
          axeConfig: {
            rules: {
              'color-contrast': { enabled: true },
              'keyboard-navigation': { enabled: true },
              'aria-labels': { enabled: true },
            },
          },
        },
      };

    case 'tauri':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          benchmarks: [
            ...baseConfig.performance.benchmarks,
            {
              name: 'Binary Size',
              metric: 'bundleSize',
              threshold: 10 * 1024 * 1024, // 10MB
              tolerance: 15,
            },
            {
              name: 'Startup Time',
              metric: 'renderTime',
              threshold: 2000, // 2 seconds
              tolerance: 20,
            },
          ],
        },
        security: {
          ...baseConfig.security,
          scanners: [
            ...baseConfig.security.scanners,
            {
              name: 'cargo-audit',
              command: 'cargo',
              args: ['audit', '--json'],
              outputFormat: 'json',
            },
          ],
        },
      };

    case 'sveltekit':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          benchmarks: [
            ...baseConfig.performance.benchmarks,
            {
              name: 'Bundle Size',
              metric: 'bundleSize',
              threshold: 1 * 1024 * 1024, // 1MB
              tolerance: 10,
            },
            {
              name: 'Hydration Time',
              metric: 'renderTime',
              threshold: 500, // 500ms
              tolerance: 15,
            },
          ],
        },
      };

    default:
      return baseConfig;
  }
}

/**
 * Create default quality gate configuration
 */
export function createDefaultQualityGateConfig(): QualityGateConfig {
  return {
    coverage: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    security: {
      maxCritical: 0,
      maxHigh: 0,
      maxMedium: 5,
    },
    performance: {
      maxExecutionTime: 30000, // 30 seconds
      maxMemoryUsage: 200 * 1024 * 1024, // 200MB
      maxBundleSize: 10 * 1024 * 1024, // 10MB
      maxRenderTime: 3000, // 3 seconds
    },
    accessibility: {
      minScore: 95,
      wcagLevel: 'AA',
      maxViolations: 0,
    },
    technicalDebt: {
      maxDebtRatio: 5,
      minMaintainabilityIndex: 60,
      maxComplexity: 10,
    },
  };
}

/**
 * Create test generation configuration
 */
export function createTestGenerationConfig(
  framework: Framework,
  targetPath: string,
  testPath: string
): TestGenerationConfig {
  return {
    targetPath,
    testPath,
    framework,
    patterns: getDefaultPatternsForFramework(framework),
    templates: getDefaultTemplatesForFramework(framework),
  };
}

/**
 * Get default test patterns for a framework
 */
function getDefaultPatternsForFramework(framework: Framework) {
  const commonPatterns = [
    {
      name: 'component',
      pattern: /(?:export\s+(?:default\s+)?(?:class|function|const)\s+\w+|React\.Component)/,
      testType: 'unit' as TestType,
      template: 'component-test',
      priority: 10,
    },
    {
      name: 'service',
      pattern: /(?:class\s+\w+Service|export\s+class\s+\w+Service)/,
      testType: 'unit' as TestType,
      template: 'service-test',
      priority: 9,
    },
    {
      name: 'util',
      pattern: /(?:export\s+(?:function|const)\s+\w+|function\s+\w+)/,
      testType: 'unit' as TestType,
      template: 'util-test',
      priority: 8,
    },
  ];

  switch (framework) {
    case 'flutter':
      return [
        ...commonPatterns,
        {
          name: 'widget',
          pattern: /class\s+\w+\s+extends\s+StatelessWidget|class\s+\w+\s+extends\s+StatefulWidget/,
          testType: 'unit' as TestType,
          template: 'widget-test',
          priority: 10,
        },
      ];

    case 'tauri':
      return [
        ...commonPatterns,
        {
          name: 'struct',
          pattern: /struct\s+\w+/,
          testType: 'unit' as TestType,
          template: 'struct-test',
          priority: 9,
        },
        {
          name: 'command',
          pattern: /#\[tauri::command\]/,
          testType: 'integration' as TestType,
          template: 'command-test',
          priority: 8,
        },
      ];

    default:
      return commonPatterns;
  }
}

/**
 * Get default test templates for a framework
 */
function getDefaultTemplatesForFramework(framework: Framework) {
  // This would typically load templates from files or a template registry
  // For now, returning empty array as templates are defined in the adapters
  return [];
}

/**
 * Create framework-specific quality gate configuration
 */
export function createFrameworkQualityGateConfig(framework: Framework): QualityGateConfig {
  const baseConfig = createDefaultQualityGateConfig();

  switch (framework) {
    case 'flutter':
      return {
        ...baseConfig,
        coverage: {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
        performance: {
          ...baseConfig.performance,
          maxBundleSize: 20 * 1024 * 1024, // 20MB for Flutter APK
          maxRenderTime: 16, // 60fps
        },
      };

    case 'nextjs':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          maxBundleSize: 2 * 1024 * 1024, // 2MB for web
          maxRenderTime: 1500, // 1.5s first contentful paint
        },
        accessibility: {
          ...baseConfig.accessibility,
          minScore: 98, // Higher accessibility requirements for web
        },
      };

    case 'tauri':
      return {
        ...baseConfig,
        performance: {
          ...baseConfig.performance,
          maxBundleSize: 10 * 1024 * 1024, // 10MB for desktop app
          maxRenderTime: 2000, // 2s startup time
        },
        security: {
          maxCritical: 0,
          maxHigh: 0,
          maxMedium: 0, // Stricter security for desktop apps
        },
      };

    default:
      return baseConfig;
  }
}

/**
 * Merge custom configuration with defaults
 */
export function mergeTestConfig(
  base: TestConfig,
  custom: Partial<TestConfig>
): TestConfig {
  return {
    ...base,
    ...custom,
    coverage: {
      ...base.coverage,
      ...custom.coverage,
      threshold: {
        ...base.coverage.threshold,
        ...custom.coverage?.threshold,
      },
    },
    performance: {
      ...base.performance,
      ...custom.performance,
      benchmarks: custom.performance?.benchmarks || base.performance.benchmarks,
    },
    security: {
      ...base.security,
      ...custom.security,
      scanners: custom.security?.scanners || base.security.scanners,
    },
    accessibility: {
      ...base.accessibility,
      ...custom.accessibility,
    },
    qualityGates: {
      ...base.qualityGates,
      ...custom.qualityGates,
      coverage: {
        ...base.qualityGates.coverage,
        ...custom.qualityGates?.coverage,
      },
      security: {
        ...base.qualityGates.security,
        ...custom.qualityGates?.security,
      },
      performance: {
        ...base.qualityGates.performance,
        ...custom.qualityGates?.performance,
      },
      accessibility: {
        ...base.qualityGates.accessibility,
        ...custom.qualityGates?.accessibility,
      },
      technicalDebt: {
        ...base.qualityGates.technicalDebt,
        ...custom.qualityGates?.technicalDebt,
      },
    },
  };
}