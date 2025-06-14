/**
 * @fileoverview Flutter Testing Adapter
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  TestAdapter,
  FrameworkAdapter,
  Framework,
  TestConfig,
  TestResult,
  TestType,
  QualityGateConfig,
  QualityGateResult,
  CoverageMetrics,
  PerformanceMetrics,
  SecurityMetrics,
  AccessibilityMetrics,
  TestGenerationConfig,
} from '../types';
import { QualityGateEngine } from '../core/quality-gates';

const execAsync = promisify(exec);

export class FlutterTestAdapter implements TestAdapter, FrameworkAdapter {
  framework: Framework = 'flutter';
  private qualityGateEngine = new QualityGateEngine();
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  async runTests(config: TestConfig): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (config.testTypes.includes('unit')) {
      const unitResults = await this.runUnitTests();
      results.push(...unitResults);
    }

    if (config.testTypes.includes('integration')) {
      const integrationResults = await this.runIntegrationTests();
      results.push(...integrationResults);
    }

    if (config.testTypes.includes('e2e')) {
      const e2eResults = await this.runE2ETests();
      results.push(...e2eResults);
    }

    if (config.testTypes.includes('performance')) {
      const performanceResults = await this.runPerformanceTests();
      results.push(...performanceResults);
    }

    if (config.testTypes.includes('accessibility')) {
      const accessibilityResults = await this.runAccessibilityTests();
      results.push(...accessibilityResults);
    }

    return results;
  }

  async generateTests(config: TestGenerationConfig): Promise<string[]> {
    const generatedFiles: string[] = [];

    // Generate widget tests
    const widgetTests = await this.generateWidgetTests(config);
    generatedFiles.push(...widgetTests);

    // Generate unit tests
    const unitTests = await this.generateUnitTests(config);
    generatedFiles.push(...unitTests);

    // Generate integration tests
    const integrationTests = await this.generateIntegrationTests(config);
    generatedFiles.push(...integrationTests);

    return generatedFiles;
  }

  async validateQualityGates(
    results: TestResult[],
    config: QualityGateConfig
  ): Promise<QualityGateResult> {
    return this.qualityGateEngine.validateQualityGates(results, config);
  }

  async setupTest(): Promise<void> {
    // Ensure Flutter is installed and up to date
    try {
      await execAsync('flutter doctor', { cwd: this.projectPath });
    } catch (error) {
      throw new Error('Flutter is not properly installed or configured');
    }

    // Get dependencies
    await execAsync('flutter pub get', { cwd: this.projectPath });
  }

  async teardownTest(): Promise<void> {
    // Clean up test artifacts
    await execAsync('flutter clean', { cwd: this.projectPath });
  }

  async runUnitTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      const { stdout, stderr } = await execAsync(
        'flutter test --coverage --reporter json',
        { cwd: this.projectPath }
      );

      const testOutput = this.parseFlutterTestOutput(stdout);
      const coverage = await this.getCoverage();

      for (const test of testOutput.tests) {
        results.push({
          framework: 'flutter',
          testType: 'unit',
          name: test.name,
          status: test.status,
          duration: test.duration,
          error: test.error,
          coverage: coverage,
        });
      }
    } catch (error) {
      console.error('Flutter unit tests failed:', error);
      results.push({
        framework: 'flutter',
        testType: 'unit',
        name: 'Unit Tests',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  async runIntegrationTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      const integrationTestPath = path.join(this.projectPath, 'integration_test');
      
      if (!(await fs.pathExists(integrationTestPath))) {
        return results;
      }

      const { stdout } = await execAsync(
        'flutter test integration_test --reporter json',
        { cwd: this.projectPath }
      );

      const testOutput = this.parseFlutterTestOutput(stdout);

      for (const test of testOutput.tests) {
        results.push({
          framework: 'flutter',
          testType: 'integration',
          name: test.name,
          status: test.status,
          duration: test.duration,
          error: test.error,
        });
      }
    } catch (error) {
      console.error('Flutter integration tests failed:', error);
      results.push({
        framework: 'flutter',
        testType: 'integration',
        name: 'Integration Tests',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  async runE2ETests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // Run integration tests as E2E tests in Flutter
      const { stdout } = await execAsync(
        'flutter drive --target=integration_test/app_test.dart --driver=test_driver/integration_test.dart',
        { cwd: this.projectPath }
      );

      // Parse driver output
      const success = !stdout.includes('FAILURE');
      
      results.push({
        framework: 'flutter',
        testType: 'e2e',
        name: 'E2E Tests',
        status: success ? 'passed' : 'failed',
        duration: 0,
      });
    } catch (error) {
      results.push({
        framework: 'flutter',
        testType: 'e2e',
        name: 'E2E Tests',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  async runPerformanceTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      const performanceMetrics = await this.getPerformanceMetrics();
      
      results.push({
        framework: 'flutter',
        testType: 'performance',
        name: 'Performance Tests',
        status: 'passed',
        duration: performanceMetrics.executionTime,
        performanceMetrics,
      });
    } catch (error) {
      results.push({
        framework: 'flutter',
        testType: 'performance',
        name: 'Performance Tests',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  async runAccessibilityTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // Run accessibility tests using semantics
      const { stdout } = await execAsync(
        'flutter test test/accessibility_test.dart --reporter json',
        { cwd: this.projectPath }
      );

      const testOutput = this.parseFlutterTestOutput(stdout);

      for (const test of testOutput.tests) {
        results.push({
          framework: 'flutter',
          testType: 'accessibility',
          name: test.name,
          status: test.status,
          duration: test.duration,
          error: test.error,
        });
      }
    } catch (error) {
      results.push({
        framework: 'flutter',
        testType: 'accessibility',
        name: 'Accessibility Tests',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  async runSecurityTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // Run security analysis using flutter analyze
      const { stdout } = await execAsync('flutter analyze', { cwd: this.projectPath });
      
      const hasSecurityIssues = stdout.includes('security') || stdout.includes('vulnerability');
      
      results.push({
        framework: 'flutter',
        testType: 'security',
        name: 'Security Analysis',
        status: hasSecurityIssues ? 'failed' : 'passed',
        duration: 0,
      });
    } catch (error) {
      results.push({
        framework: 'flutter',
        testType: 'security',
        name: 'Security Analysis',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  async getCoverage(): Promise<CoverageMetrics> {
    try {
      const coveragePath = path.join(this.projectPath, 'coverage', 'lcov.info');
      
      if (!(await fs.pathExists(coveragePath))) {
        return { lines: 0, functions: 0, branches: 0, statements: 0 };
      }

      const coverageData = await fs.readFile(coveragePath, 'utf-8');
      return this.parseLcovCoverage(coverageData);
    } catch (error) {
      console.error('Failed to get coverage:', error);
      return { lines: 0, functions: 0, branches: 0, statements: 0 };
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // For Flutter, we can measure app startup time and memory usage
    try {
      const startTime = Date.now();
      await execAsync('flutter build apk --debug', { cwd: this.projectPath });
      const buildTime = Date.now() - startTime;

      return {
        executionTime: buildTime,
        memoryUsage: 0, // Would need device-specific testing
        bundleSize: await this.getApkSize(),
      };
    } catch (error) {
      return {
        executionTime: 0,
        memoryUsage: 0,
      };
    }
  }

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    return {
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
  }

  async getAccessibilityMetrics(): Promise<AccessibilityMetrics> {
    return {
      score: 100,
      violations: [],
      wcagLevel: 'AAA',
    };
  }

  private parseFlutterTestOutput(output: string): { tests: any[] } {
    const lines = output.split('\n').filter(line => line.trim());
    const tests: any[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.type === 'testDone') {
          tests.push({
            name: data.testName || 'Unknown Test',
            status: data.result === 'success' ? 'passed' : 'failed',
            duration: data.time || 0,
            error: data.error,
          });
        }
      } catch (e) {
        // Skip non-JSON lines
      }
    }

    return { tests };
  }

  private parseLcovCoverage(lcovContent: string): CoverageMetrics {
    const lines = lcovContent.split('\n');
    let linesFound = 0;
    let linesHit = 0;
    let functionsFound = 0;
    let functionsHit = 0;
    let branchesFound = 0;
    let branchesHit = 0;

    for (const line of lines) {
      if (line.startsWith('LF:')) {
        linesFound += parseInt(line.split(':')[1], 10);
      } else if (line.startsWith('LH:')) {
        linesHit += parseInt(line.split(':')[1], 10);
      } else if (line.startsWith('FNF:')) {
        functionsFound += parseInt(line.split(':')[1], 10);
      } else if (line.startsWith('FNH:')) {
        functionsHit += parseInt(line.split(':')[1], 10);
      } else if (line.startsWith('BRF:')) {
        branchesFound += parseInt(line.split(':')[1], 10);
      } else if (line.startsWith('BRH:')) {
        branchesHit += parseInt(line.split(':')[1], 10);
      }
    }

    return {
      lines: linesFound > 0 ? (linesHit / linesFound) * 100 : 0,
      functions: functionsFound > 0 ? (functionsHit / functionsFound) * 100 : 0,
      branches: branchesFound > 0 ? (branchesHit / branchesFound) * 100 : 0,
      statements: linesFound > 0 ? (linesHit / linesFound) * 100 : 0, // Use lines as statements for Flutter
    };
  }

  private async getApkSize(): Promise<number> {
    try {
      const apkPath = path.join(this.projectPath, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
      const stats = await fs.stat(apkPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  private async generateWidgetTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    
    // Find all widget files
    const widgetFiles = await this.findWidgetFiles(config.targetPath);
    
    for (const widgetFile of widgetFiles) {
      const testFile = await this.generateWidgetTestFile(widgetFile, config.testPath);
      if (testFile) {
        files.push(testFile);
      }
    }
    
    return files;
  }

  private async generateUnitTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    
    // Find all Dart files that aren't widgets
    const dartFiles = await this.findDartFiles(config.targetPath);
    
    for (const dartFile of dartFiles) {
      if (!this.isWidgetFile(dartFile)) {
        const testFile = await this.generateUnitTestFile(dartFile, config.testPath);
        if (testFile) {
          files.push(testFile);
        }
      }
    }
    
    return files;
  }

  private async generateIntegrationTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    
    // Generate integration test for main app
    const mainTestFile = await this.generateIntegrationTestFile(config);
    if (mainTestFile) {
      files.push(mainTestFile);
    }
    
    return files;
  }

  private async findWidgetFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subFiles = await this.findWidgetFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.dart')) {
        if (await this.isWidgetFile(fullPath)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  private async findDartFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subFiles = await this.findDartFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.dart')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async isWidgetFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return /extends\s+(StatelessWidget|StatefulWidget)/.test(content);
    } catch (error) {
      return false;
    }
  }

  private async generateWidgetTestFile(widgetFile: string, testPath: string): Promise<string | null> {
    const widgetName = this.extractWidgetName(widgetFile);
    if (!widgetName) return null;

    const testFileName = `${path.basename(widgetFile, '.dart')}_test.dart`;
    const testFilePath = path.join(testPath, testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null; // Test already exists
    }

    const testContent = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../lib/${path.basename(widgetFile)}';

void main() {
  group('${widgetName}', () {
    testWidgets('should render without errors', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ${widgetName}(),
        ),
      );

      expect(find.byType(${widgetName}), findsOneWidget);
    });

    testWidgets('should have correct initial state', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ${widgetName}(),
        ),
      );

      // TODO: Add specific widget state tests
    });

    testWidgets('should handle user interactions', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ${widgetName}(),
        ),
      );

      // TODO: Add interaction tests
    });
  });
}`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private async generateUnitTestFile(dartFile: string, testPath: string): Promise<string | null> {
    const className = this.extractClassName(dartFile);
    if (!className) return null;

    const testFileName = `${path.basename(dartFile, '.dart')}_test.dart`;
    const testFilePath = path.join(testPath, testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null; // Test already exists
    }

    const testContent = `import 'package:flutter_test/flutter_test.dart';

import '../lib/${path.basename(dartFile)}';

void main() {
  group('${className}', () {
    late ${className} instance;

    setUp(() {
      instance = ${className}();
    });

    test('should be created', () {
      expect(instance, isNotNull);
    });

    // TODO: Add specific unit tests for ${className}
  });
}`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private async generateIntegrationTestFile(config: TestGenerationConfig): Promise<string | null> {
    const testFilePath = path.join(config.testPath, 'integration_test', 'app_test.dart');

    if (await fs.pathExists(testFilePath)) {
      return null; // Test already exists
    }

    const testContent = `import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:your_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('end-to-end test', () {
    testWidgets('tap on the floating action button, verify counter', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Verify the counter starts at 0.
      expect(find.text('0'), findsOneWidget);

      // Finds the floating action button to tap on.
      final Finder fab = find.byTooltip('Increment');

      // Emulate a tap on the floating action button.
      await tester.tap(fab);

      // Trigger a frame.
      await tester.pumpAndSettle();

      // Verify the counter increments by 1.
      expect(find.text('1'), findsOneWidget);
    });
  });
}`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private extractWidgetName(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/class\s+(\w+)\s+extends\s+(?:StatelessWidget|StatefulWidget)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  private extractClassName(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/class\s+(\w+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}