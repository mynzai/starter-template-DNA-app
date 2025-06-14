/**
 * @fileoverview Quality Gates Engine for enforcing quality standards
 */

import {
  QualityGateConfig,
  QualityGateResult,
  QualityGateFailure,
  TestResult,
  CoverageMetrics,
  PerformanceMetrics,
  SecurityMetrics,
  AccessibilityMetrics,
  TechnicalDebtMetrics,
} from '../types';

export class QualityGateEngine {
  private defaultConfig: QualityGateConfig = {
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
      maxBundleSize: 2 * 1024 * 1024, // 2MB
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

  /**
   * Validate quality gates against test results
   */
  async validateQualityGates(
    results: TestResult[],
    config: QualityGateConfig = this.defaultConfig
  ): Promise<QualityGateResult> {
    const failures: QualityGateFailure[] = [];
    const recommendations: string[] = [];

    // Aggregate metrics from all test results
    const metrics = this.aggregateMetrics(results);

    // Validate coverage
    const coverageResult = this.validateCoverage(metrics.coverage, config.coverage);
    if (!coverageResult.passed) {
      failures.push(...coverageResult.failures);
      recommendations.push(...coverageResult.recommendations);
    }

    // Validate security
    const securityResult = this.validateSecurity(metrics.security, config.security);
    if (!securityResult.passed) {
      failures.push(...securityResult.failures);
      recommendations.push(...securityResult.recommendations);
    }

    // Validate performance
    const performanceResult = this.validatePerformance(metrics.performance, config.performance);
    if (!performanceResult.passed) {
      failures.push(...performanceResult.failures);
      recommendations.push(...performanceResult.recommendations);
    }

    // Validate accessibility
    const accessibilityResult = this.validateAccessibility(metrics.accessibility, config.accessibility);
    if (!accessibilityResult.passed) {
      failures.push(...accessibilityResult.failures);
      recommendations.push(...accessibilityResult.recommendations);
    }

    // Validate technical debt
    const technicalDebtResult = this.validateTechnicalDebt(metrics.technicalDebt, config.technicalDebt);
    if (!technicalDebtResult.passed) {
      failures.push(...technicalDebtResult.failures);
      recommendations.push(...technicalDebtResult.recommendations);
    }

    // Calculate overall score
    const totalGates = 5;
    const passedGates = [
      coverageResult.passed,
      securityResult.passed,
      performanceResult.passed,
      accessibilityResult.passed,
      technicalDebtResult.passed,
    ].filter(Boolean).length;

    const score = (passedGates / totalGates) * 100;
    const passed = failures.length === 0;

    return {
      passed,
      score,
      results: {
        coverage: coverageResult.passed,
        security: securityResult.passed,
        performance: performanceResult.passed,
        accessibility: accessibilityResult.passed,
        technicalDebt: technicalDebtResult.passed,
      },
      failures,
      recommendations,
    };
  }

  private aggregateMetrics(results: TestResult[]) {
    const coverage: CoverageMetrics = {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0,
    };

    const performance: PerformanceMetrics = {
      executionTime: 0,
      memoryUsage: 0,
      bundleSize: 0,
      renderTime: 0,
      timeToInteractive: 0,
    };

    const security: SecurityMetrics = {
      vulnerabilities: [],
      codeSmells: [],
      technicalDebt: {
        debtRatio: 0,
        maintainabilityIndex: 100,
        cyclomaticComplexity: 0,
        duplicatedLines: 0,
        codeSmellsCount: 0,
      },
    };

    const accessibility: AccessibilityMetrics = {
      score: 100,
      violations: [],
      wcagLevel: 'AAA',
    };

    // Aggregate coverage metrics (average)
    const coverageResults = results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      coverage.lines = coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length;
      coverage.functions = coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length;
      coverage.branches = coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length;
      coverage.statements = coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length;
    }

    // Aggregate performance metrics (worst case)
    const performanceResults = results.filter(r => r.performanceMetrics);
    if (performanceResults.length > 0) {
      performance.executionTime = Math.max(...performanceResults.map(r => r.performanceMetrics?.executionTime || 0));
      performance.memoryUsage = Math.max(...performanceResults.map(r => r.performanceMetrics?.memoryUsage || 0));
      performance.bundleSize = Math.max(...performanceResults.map(r => r.performanceMetrics?.bundleSize || 0));
      performance.renderTime = Math.max(...performanceResults.map(r => r.performanceMetrics?.renderTime || 0));
      performance.timeToInteractive = Math.max(...performanceResults.map(r => r.performanceMetrics?.timeToInteractive || 0));
    }

    return {
      coverage,
      performance,
      security,
      accessibility,
      technicalDebt: security.technicalDebt,
    };
  }

  private validateCoverage(metrics: CoverageMetrics, config: QualityGateConfig['coverage']) {
    const failures: QualityGateFailure[] = [];
    const recommendations: string[] = [];

    if (metrics.lines < config.lines) {
      failures.push({
        gate: 'coverage',
        metric: 'lines',
        expected: config.lines,
        actual: metrics.lines,
        impact: 'major',
        remediation: `Increase line coverage to at least ${config.lines}%`,
      });
      recommendations.push('Add more unit tests to increase line coverage');
    }

    if (metrics.functions < config.functions) {
      failures.push({
        gate: 'coverage',
        metric: 'functions',
        expected: config.functions,
        actual: metrics.functions,
        impact: 'major',
        remediation: `Increase function coverage to at least ${config.functions}%`,
      });
      recommendations.push('Test all public functions and methods');
    }

    if (metrics.branches < config.branches) {
      failures.push({
        gate: 'coverage',
        metric: 'branches',
        expected: config.branches,
        actual: metrics.branches,
        impact: 'major',
        remediation: `Increase branch coverage to at least ${config.branches}%`,
      });
      recommendations.push('Add tests for all conditional branches and error paths');
    }

    if (metrics.statements < config.statements) {
      failures.push({
        gate: 'coverage',
        metric: 'statements',
        expected: config.statements,
        actual: metrics.statements,
        impact: 'major',
        remediation: `Increase statement coverage to at least ${config.statements}%`,
      });
      recommendations.push('Ensure all statements are executed in tests');
    }

    return {
      passed: failures.length === 0,
      failures,
      recommendations,
    };
  }

  private validateSecurity(metrics: SecurityMetrics, config: QualityGateConfig['security']) {
    const failures: QualityGateFailure[] = [];
    const recommendations: string[] = [];

    const criticalVulns = metrics.vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = metrics.vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulns = metrics.vulnerabilities.filter(v => v.severity === 'medium').length;

    if (criticalVulns > config.maxCritical) {
      failures.push({
        gate: 'security',
        metric: 'critical-vulnerabilities',
        expected: config.maxCritical,
        actual: criticalVulns,
        impact: 'critical',
        remediation: 'Fix all critical security vulnerabilities immediately',
      });
      recommendations.push('Update dependencies and apply security patches');
    }

    if (highVulns > config.maxHigh) {
      failures.push({
        gate: 'security',
        metric: 'high-vulnerabilities',
        expected: config.maxHigh,
        actual: highVulns,
        impact: 'major',
        remediation: 'Fix all high-severity security vulnerabilities',
      });
      recommendations.push('Review and update security policies');
    }

    if (mediumVulns > config.maxMedium) {
      failures.push({
        gate: 'security',
        metric: 'medium-vulnerabilities',
        expected: config.maxMedium,
        actual: mediumVulns,
        impact: 'minor',
        remediation: `Reduce medium vulnerabilities to ${config.maxMedium} or fewer`,
      });
      recommendations.push('Plan security improvements for medium-severity issues');
    }

    return {
      passed: failures.length === 0,
      failures,
      recommendations,
    };
  }

  private validatePerformance(metrics: PerformanceMetrics, config: QualityGateConfig['performance']) {
    const failures: QualityGateFailure[] = [];
    const recommendations: string[] = [];

    if (metrics.executionTime > config.maxExecutionTime) {
      failures.push({
        gate: 'performance',
        metric: 'execution-time',
        expected: config.maxExecutionTime,
        actual: metrics.executionTime,
        impact: 'major',
        remediation: `Reduce execution time to under ${config.maxExecutionTime}ms`,
      });
      recommendations.push('Optimize algorithms and reduce computational complexity');
    }

    if (metrics.memoryUsage > config.maxMemoryUsage) {
      failures.push({
        gate: 'performance',
        metric: 'memory-usage',
        expected: config.maxMemoryUsage,
        actual: metrics.memoryUsage,
        impact: 'major',
        remediation: `Reduce memory usage to under ${config.maxMemoryUsage} bytes`,
      });
      recommendations.push('Implement memory optimization and garbage collection strategies');
    }

    if (config.maxBundleSize && metrics.bundleSize && metrics.bundleSize > config.maxBundleSize) {
      failures.push({
        gate: 'performance',
        metric: 'bundle-size',
        expected: config.maxBundleSize,
        actual: metrics.bundleSize,
        impact: 'minor',
        remediation: `Reduce bundle size to under ${config.maxBundleSize} bytes`,
      });
      recommendations.push('Implement code splitting and tree shaking');
    }

    return {
      passed: failures.length === 0,
      failures,
      recommendations,
    };
  }

  private validateAccessibility(metrics: AccessibilityMetrics, config: QualityGateConfig['accessibility']) {
    const failures: QualityGateFailure[] = [];
    const recommendations: string[] = [];

    if (metrics.score < config.minScore) {
      failures.push({
        gate: 'accessibility',
        metric: 'score',
        expected: config.minScore,
        actual: metrics.score,
        impact: 'major',
        remediation: `Improve accessibility score to at least ${config.minScore}`,
      });
      recommendations.push('Add ARIA labels, improve semantic HTML, and ensure keyboard navigation');
    }

    if (metrics.violations.length > config.maxViolations) {
      failures.push({
        gate: 'accessibility',
        metric: 'violations',
        expected: config.maxViolations,
        actual: metrics.violations.length,
        impact: 'major',
        remediation: `Fix all accessibility violations (${metrics.violations.length} found)`,
      });
      recommendations.push('Review and fix accessibility violations using automated tools');
    }

    return {
      passed: failures.length === 0,
      failures,
      recommendations,
    };
  }

  private validateTechnicalDebt(metrics: TechnicalDebtMetrics, config: QualityGateConfig['technicalDebt']) {
    const failures: QualityGateFailure[] = [];
    const recommendations: string[] = [];

    if (metrics.debtRatio > config.maxDebtRatio) {
      failures.push({
        gate: 'technical-debt',
        metric: 'debt-ratio',
        expected: config.maxDebtRatio,
        actual: metrics.debtRatio,
        impact: 'major',
        remediation: `Reduce technical debt ratio to under ${config.maxDebtRatio}%`,
      });
      recommendations.push('Refactor code to reduce technical debt and improve maintainability');
    }

    if (metrics.maintainabilityIndex < config.minMaintainabilityIndex) {
      failures.push({
        gate: 'technical-debt',
        metric: 'maintainability-index',
        expected: config.minMaintainabilityIndex,
        actual: metrics.maintainabilityIndex,
        impact: 'major',
        remediation: `Improve maintainability index to at least ${config.minMaintainabilityIndex}`,
      });
      recommendations.push('Simplify complex code and improve documentation');
    }

    if (metrics.cyclomaticComplexity > config.maxComplexity) {
      failures.push({
        gate: 'technical-debt',
        metric: 'cyclomatic-complexity',
        expected: config.maxComplexity,
        actual: metrics.cyclomaticComplexity,
        impact: 'major',
        remediation: `Reduce cyclomatic complexity to under ${config.maxComplexity}`,
      });
      recommendations.push('Break down complex functions into smaller, simpler ones');
    }

    return {
      passed: failures.length === 0,
      failures,
      recommendations,
    };
  }
}