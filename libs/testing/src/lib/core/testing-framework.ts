/**
 * @fileoverview Core testing framework that orchestrates all testing activities
 */

import {
  Framework,
  TestConfig,
  TestResult,
  TestReport,
  QualityGateResult,
  TestAdapter,
  TestEvent,
  TestEventHandler,
  TestGenerationConfig,
} from '../types';
import { QualityGateEngine } from './quality-gates';
import { TestReportGenerator } from './test-report-generator';
import { TestGenerationEngine } from './test-generation-engine';

export class TestingFramework {
  private adapters: Map<Framework, TestAdapter> = new Map();
  private eventHandlers: TestEventHandler[] = [];
  private qualityGateEngine: QualityGateEngine;
  private reportGenerator: TestReportGenerator;
  private testGenerator: TestGenerationEngine;

  constructor() {
    this.qualityGateEngine = new QualityGateEngine();
    this.reportGenerator = new TestReportGenerator();
    this.testGenerator = new TestGenerationEngine();
  }

  /**
   * Register a framework adapter
   */
  registerAdapter(adapter: TestAdapter): void {
    this.adapters.set(adapter.framework, adapter);
    this.emitEvent({
      type: 'test-started',
      timestamp: new Date(),
      framework: adapter.framework,
      data: { action: 'adapter-registered' },
    });
  }

  /**
   * Register event handler for monitoring
   */
  onEvent(handler: TestEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Run comprehensive tests for a specific framework
   */
  async runTests(framework: Framework, config: TestConfig): Promise<TestReport> {
    const adapter = this.getAdapter(framework);
    const startTime = new Date();

    this.emitEvent({
      type: 'test-started',
      timestamp: startTime,
      framework,
      data: { config },
    });

    try {
      // Run all test types
      const results = await adapter.runTests(config);

      // Validate quality gates
      const qualityGateResult = await adapter.validateQualityGates(
        results,
        config.qualityGates
      );

      // Generate report
      const report = await this.reportGenerator.generateReport({
        framework,
        timestamp: startTime,
        duration: Date.now() - startTime.getTime(),
        results,
        qualityGate: qualityGateResult,
      });

      this.emitEvent({
        type: 'test-completed',
        timestamp: new Date(),
        framework,
        data: { report, success: qualityGateResult.passed },
      });

      if (!qualityGateResult.passed) {
        this.emitEvent({
          type: 'quality-gate-failed',
          timestamp: new Date(),
          framework,
          data: { failures: qualityGateResult.failures },
        });
      }

      return report;
    } catch (error) {
      this.emitEvent({
        type: 'test-failed',
        timestamp: new Date(),
        framework,
        data: { error },
      });
      throw error;
    }
  }

  /**
   * Run tests for all registered frameworks
   */
  async runAllTests(configs: Map<Framework, TestConfig>): Promise<TestReport[]> {
    const reports: TestReport[] = [];

    for (const [framework, config] of configs) {
      if (this.adapters.has(framework)) {
        try {
          const report = await this.runTests(framework, config);
          reports.push(report);
        } catch (error) {
          console.error(`Failed to run tests for ${framework}:`, error);
          // Continue with other frameworks
        }
      }
    }

    return reports;
  }

  /**
   * Generate tests automatically for a framework
   */
  async generateTests(
    framework: Framework,
    config: TestGenerationConfig
  ): Promise<string[]> {
    const adapter = this.getAdapter(framework);
    return adapter.generateTests(config);
  }

  /**
   * Validate quality gates for existing test results
   */
  async validateQualityGates(
    framework: Framework,
    results: TestResult[],
    config: TestConfig
  ): Promise<QualityGateResult> {
    const adapter = this.getAdapter(framework);
    return adapter.validateQualityGates(results, config.qualityGates);
  }

  /**
   * Get aggregated metrics across all frameworks
   */
  async getAggregatedMetrics(reports: TestReport[]): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    coverageAverage: number;
    qualityGatesPassed: number;
    frameworks: Framework[];
  }> {
    return {
      totalTests: reports.reduce((sum, r) => sum + r.summary.total, 0),
      passedTests: reports.reduce((sum, r) => sum + r.summary.passed, 0),
      failedTests: reports.reduce((sum, r) => sum + r.summary.failed, 0),
      coverageAverage: reports.reduce((sum, r) => sum + r.coverage.lines, 0) / reports.length,
      qualityGatesPassed: reports.filter(r => r.qualityGate.passed).length,
      frameworks: reports.map(r => r.framework),
    };
  }

  /**
   * Get available frameworks
   */
  getAvailableFrameworks(): Framework[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if framework is supported
   */
  isFrameworkSupported(framework: Framework): boolean {
    return this.adapters.has(framework);
  }

  private getAdapter(framework: Framework): TestAdapter {
    const adapter = this.adapters.get(framework);
    if (!adapter) {
      throw new Error(`No adapter registered for framework: ${framework}`);
    }
    return adapter;
  }

  private emitEvent(event: TestEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });
  }
}

export default TestingFramework;