/**
 * @fileoverview Test Runner utility for orchestrating test execution
 */

import { TestingFramework } from '../core/testing-framework';
import { FlutterTestAdapter } from '../adapters/flutter-adapter';
import { ReactNativeTestAdapter } from '../adapters/react-native-adapter';
import { NextjsTestAdapter } from '../adapters/nextjs-adapter';
import { TauriTestAdapter } from '../adapters/tauri-adapter';
import {
  Framework,
  TestConfig,
  TestReport,
  TestResult,
  QualityGateResult,
} from '../types';
import { createDefaultTestConfig } from './config-factory';
import { ProgressTracker } from './progress-tracker';

export interface TestRunnerOptions {
  frameworks: Framework[];
  projectPath: string;
  configOverrides?: Partial<Record<Framework, Partial<TestConfig>>>;
  parallel?: boolean;
  generateReports?: boolean;
  reportFormats?: ('json' | 'html' | 'markdown')[];
  outputDir?: string;
  progressCallback?: (progress: TestRunnerProgress) => void;
}

export interface TestRunnerProgress {
  framework: Framework;
  stage: 'setup' | 'running' | 'reporting' | 'complete' | 'error';
  completed: number;
  total: number;
  currentTest?: string;
  error?: string;
}

export interface TestRunnerResult {
  success: boolean;
  reports: TestReport[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    totalFrameworks: number;
    passedFrameworks: number;
    failedFrameworks: number;
    overallCoverage: number;
    qualityGatesPassed: number;
  };
  errors: string[];
}

export class TestRunner {
  private framework: TestingFramework;
  private progressTracker: ProgressTracker;

  constructor() {
    this.framework = new TestingFramework();
    this.progressTracker = new ProgressTracker();
    this.setupAdapters();
  }

  /**
   * Run tests for specified frameworks
   */
  async runTests(options: TestRunnerOptions): Promise<TestRunnerResult> {
    const {
      frameworks,
      projectPath,
      configOverrides = {},
      parallel = true,
      generateReports = true,
      reportFormats = ['json', 'html'],
      outputDir = './test-reports',
      progressCallback,
    } = options;

    const reports: TestReport[] = [];
    const errors: string[] = [];
    let completedFrameworks = 0;

    // Start progress tracking
    const sessionId = await this.progressTracker.startSession({
      type: 'testing',
      frameworks,
      projectPath,
    });

    try {
      // Create test configurations
      const configs = new Map<Framework, TestConfig>();
      for (const framework of frameworks) {
        const defaultConfig = createDefaultTestConfig(framework);
        const customConfig = configOverrides[framework] || {};
        const mergedConfig = { ...defaultConfig, ...customConfig };
        configs.set(framework, mergedConfig);
      }

      // Run tests for each framework
      if (parallel) {
        const promises = frameworks.map(framework => 
          this.runFrameworkTests(
            framework,
            configs.get(framework)!,
            projectPath,
            generateReports,
            reportFormats,
            outputDir,
            (progress) => {
              if (progressCallback) {
                progressCallback({
                  ...progress,
                  completed: completedFrameworks,
                  total: frameworks.length,
                });
              }
            }
          )
        );

        const results = await Promise.allSettled(promises);
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'fulfilled') {
            reports.push(result.value);
            completedFrameworks++;
          } else {
            errors.push(`${frameworks[i]}: ${result.reason}`);
          }
        }
      } else {
        for (const framework of frameworks) {
          try {
            const report = await this.runFrameworkTests(
              framework,
              configs.get(framework)!,
              projectPath,
              generateReports,
              reportFormats,
              outputDir,
              (progress) => {
                if (progressCallback) {
                  progressCallback({
                    ...progress,
                    completed: completedFrameworks,
                    total: frameworks.length,
                  });
                }
              }
            );
            reports.push(report);
            completedFrameworks++;
          } catch (error) {
            errors.push(`${framework}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Calculate summary
      const summary = this.calculateSummary(reports, frameworks.length);
      
      // Update progress tracker
      await this.progressTracker.updateSession(sessionId, {
        testsRun: summary.totalTests,
        testsPassed: summary.passedTests,
        testsFailed: summary.failedTests,
        coverage: summary.overallCoverage,
        qualityGatesPassed: summary.qualityGatesPassed,
      });

      // End progress tracking
      await this.progressTracker.endSession(sessionId, {
        success: summary.passedFrameworks === summary.totalFrameworks,
        metrics: summary,
      });

      return {
        success: errors.length === 0 && summary.passedFrameworks === summary.totalFrameworks,
        reports,
        summary,
        errors,
      };
    } catch (error) {
      await this.progressTracker.endSession(sessionId, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  /**
   * Generate tests for specified frameworks
   */
  async generateTests(
    frameworks: Framework[],
    targetPath: string,
    testPath: string,
    options: { overwrite?: boolean } = {}
  ): Promise<{ framework: Framework; files: string[] }[]> {
    const results: { framework: Framework; files: string[] }[] = [];

    for (const framework of frameworks) {
      try {
        const generationConfig = {
          targetPath,
          testPath: `${testPath}/${framework}`,
          framework,
          patterns: [],
          templates: [],
        };

        const files = await this.framework.generateTests(framework, generationConfig);
        results.push({ framework, files });
      } catch (error) {
        console.error(`Failed to generate tests for ${framework}:`, error);
        results.push({ framework, files: [] });
      }
    }

    return results;
  }

  /**
   * Validate quality gates for existing test results
   */
  async validateQualityGates(
    framework: Framework,
    results: TestResult[],
    config?: TestConfig
  ): Promise<QualityGateResult> {
    const testConfig = config || createDefaultTestConfig(framework);
    return this.framework.validateQualityGates(framework, results, testConfig);
  }

  /**
   * Get available frameworks
   */
  getAvailableFrameworks(): Framework[] {
    return this.framework.getAvailableFrameworks();
  }

  /**
   * Check if framework is supported
   */
  isFrameworkSupported(framework: Framework): boolean {
    return this.framework.isFrameworkSupported(framework);
  }

  private setupAdapters(): void {
    // Register all framework adapters
    this.framework.registerAdapter(new FlutterTestAdapter());
    this.framework.registerAdapter(new ReactNativeTestAdapter());
    this.framework.registerAdapter(new NextjsTestAdapter());
    this.framework.registerAdapter(new TauriTestAdapter());
  }

  private async runFrameworkTests(
    framework: Framework,
    config: TestConfig,
    projectPath: string,
    generateReports: boolean,
    reportFormats: string[],
    outputDir: string,
    progressCallback: (progress: TestRunnerProgress) => void
  ): Promise<TestReport> {
    try {
      progressCallback({
        framework,
        stage: 'setup',
        completed: 0,
        total: 1,
      });

      // Update adapter with project path if needed
      const adapter = this.getAdapterForFramework(framework, projectPath);
      if (adapter !== this.framework.getAvailableFrameworks().find(f => f === framework)) {
        this.framework.registerAdapter(adapter as any);
      }

      progressCallback({
        framework,
        stage: 'running',
        completed: 0,
        total: 1,
      });

      // Run tests
      const report = await this.framework.runTests(framework, config);

      if (generateReports) {
        progressCallback({
          framework,
          stage: 'reporting',
          completed: 0,
          total: 1,
        });

        // Generate reports in specified formats
        // This would be handled by the TestReportGenerator
      }

      progressCallback({
        framework,
        stage: 'complete',
        completed: 1,
        total: 1,
      });

      return report;
    } catch (error) {
      progressCallback({
        framework,
        stage: 'error',
        completed: 0,
        total: 1,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private getAdapterForFramework(framework: Framework, projectPath: string) {
    switch (framework) {
      case 'flutter':
        return new FlutterTestAdapter(projectPath);
      case 'react-native':
        return new ReactNativeTestAdapter(projectPath);
      case 'nextjs':
        return new NextjsTestAdapter(projectPath);
      case 'tauri':
        return new TauriTestAdapter(projectPath);
      default:
        throw new Error(`No adapter available for framework: ${framework}`);
    }
  }

  private calculateSummary(reports: TestReport[], totalFrameworks: number) {
    const totalTests = reports.reduce((sum, r) => sum + r.summary.total, 0);
    const passedTests = reports.reduce((sum, r) => sum + r.summary.passed, 0);
    const failedTests = reports.reduce((sum, r) => sum + r.summary.failed, 0);
    const skippedTests = reports.reduce((sum, r) => sum + r.summary.skipped, 0);
    const passedFrameworks = reports.filter(r => r.qualityGate.passed).length;
    const failedFrameworks = reports.filter(r => !r.qualityGate.passed).length;
    const overallCoverage = reports.length > 0 
      ? reports.reduce((sum, r) => sum + r.coverage.lines, 0) / reports.length 
      : 0;
    const qualityGatesPassed = reports.filter(r => r.qualityGate.passed).length;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      totalFrameworks,
      passedFrameworks,
      failedFrameworks,
      overallCoverage,
      qualityGatesPassed,
    };
  }
}