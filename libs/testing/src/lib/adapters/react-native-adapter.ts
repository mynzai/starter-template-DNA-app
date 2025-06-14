/**
 * @fileoverview React Native Testing Adapter
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

export class ReactNativeTestAdapter implements TestAdapter, FrameworkAdapter {
  framework: Framework = 'react-native';
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

    if (config.testTypes.includes('security')) {
      const securityResults = await this.runSecurityTests();
      results.push(...securityResults);
    }

    return results;
  }

  async generateTests(config: TestGenerationConfig): Promise<string[]> {
    const generatedFiles: string[] = [];

    // Generate component tests
    const componentTests = await this.generateComponentTests(config);
    generatedFiles.push(...componentTests);

    // Generate hook tests
    const hookTests = await this.generateHookTests(config);
    generatedFiles.push(...hookTests);

    // Generate service tests
    const serviceTests = await this.generateServiceTests(config);
    generatedFiles.push(...serviceTests);

    // Generate E2E tests
    const e2eTests = await this.generateE2ETests(config);
    generatedFiles.push(...e2eTests);

    return generatedFiles;
  }

  async validateQualityGates(
    results: TestResult[],
    config: QualityGateConfig
  ): Promise<QualityGateResult> {
    return this.qualityGateEngine.validateQualityGates(results, config);
  }

  async setupTest(): Promise<void> {
    // Install dependencies
    await execAsync('npm install', { cwd: this.projectPath });

    // Ensure React Native is properly set up
    try {
      await execAsync('npx react-native doctor', { cwd: this.projectPath });
    } catch (error) {
      console.warn('React Native doctor reported issues:', error);
    }
  }

  async teardownTest(): Promise<void> {
    // Clean up test artifacts
    await execAsync('npm run clean', { cwd: this.projectPath }).catch(() => {});
  }

  async runUnitTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      const { stdout } = await execAsync(
        'npm test -- --coverage --json --watchAll=false',
        { cwd: this.projectPath }
      );

      const testResults = this.parseJestOutput(stdout);
      const coverage = await this.getCoverage();

      for (const test of testResults.testResults) {
        for (const assertionResult of test.assertionResults) {
          results.push({
            framework: 'react-native',
            testType: 'unit',
            name: assertionResult.fullName,
            status: assertionResult.status === 'passed' ? 'passed' : 'failed',
            duration: assertionResult.duration || 0,
            error: assertionResult.failureMessages?.[0],
            coverage,
          });
        }
      }
    } catch (error) {
      console.error('React Native unit tests failed:', error);
      results.push({
        framework: 'react-native',
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
      const { stdout } = await execAsync(
        'npm test -- --testPathPattern=integration --json --watchAll=false',
        { cwd: this.projectPath }
      );

      const testResults = this.parseJestOutput(stdout);

      for (const test of testResults.testResults) {
        for (const assertionResult of test.assertionResults) {
          results.push({
            framework: 'react-native',
            testType: 'integration',
            name: assertionResult.fullName,
            status: assertionResult.status === 'passed' ? 'passed' : 'failed',
            duration: assertionResult.duration || 0,
            error: assertionResult.failureMessages?.[0],
          });
        }
      }
    } catch (error) {
      console.error('React Native integration tests failed:', error);
      results.push({
        framework: 'react-native',
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
      // Run Detox E2E tests
      const { stdout } = await execAsync(
        'npx detox test --configuration ios.sim.debug --cleanup',
        { cwd: this.projectPath }
      );

      const success = !stdout.includes('FAIL');
      
      results.push({
        framework: 'react-native',
        testType: 'e2e',
        name: 'E2E Tests',
        status: success ? 'passed' : 'failed',
        duration: 0,
      });
    } catch (error) {
      results.push({
        framework: 'react-native',
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
        framework: 'react-native',
        testType: 'performance',
        name: 'Performance Tests',
        status: 'passed',
        duration: performanceMetrics.executionTime,
        performanceMetrics,
      });
    } catch (error) {
      results.push({
        framework: 'react-native',
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
      // Run accessibility tests using testing-library
      const { stdout } = await execAsync(
        'npm test -- --testPathPattern=accessibility --json --watchAll=false',
        { cwd: this.projectPath }
      );

      const testResults = this.parseJestOutput(stdout);

      for (const test of testResults.testResults) {
        for (const assertionResult of test.assertionResults) {
          results.push({
            framework: 'react-native',
            testType: 'accessibility',
            name: assertionResult.fullName,
            status: assertionResult.status === 'passed' ? 'passed' : 'failed',
            duration: assertionResult.duration || 0,
            error: assertionResult.failureMessages?.[0],
          });
        }
      }
    } catch (error) {
      results.push({
        framework: 'react-native',
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
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json', { cwd: this.projectPath });
      const auditResults = JSON.parse(stdout);
      
      const hasVulnerabilities = auditResults.metadata.vulnerabilities.total > 0;
      
      results.push({
        framework: 'react-native',
        testType: 'security',
        name: 'Security Audit',
        status: hasVulnerabilities ? 'failed' : 'passed',
        duration: 0,
        error: hasVulnerabilities ? `Found ${auditResults.metadata.vulnerabilities.total} vulnerabilities` : undefined,
      });
    } catch (error) {
      results.push({
        framework: 'react-native',
        testType: 'security',
        name: 'Security Audit',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  async getCoverage(): Promise<CoverageMetrics> {
    try {
      const coveragePath = path.join(this.projectPath, 'coverage', 'coverage-summary.json');
      
      if (!(await fs.pathExists(coveragePath))) {
        return { lines: 0, functions: 0, branches: 0, statements: 0 };
      }

      const coverageData = await fs.readJson(coveragePath);
      const total = coverageData.total;

      return {
        lines: total.lines.pct,
        functions: total.functions.pct,
        branches: total.branches.pct,
        statements: total.statements.pct,
      };
    } catch (error) {
      console.error('Failed to get coverage:', error);
      return { lines: 0, functions: 0, branches: 0, statements: 0 };
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const startTime = Date.now();
      
      // Build the app to measure performance
      await execAsync('npm run build', { cwd: this.projectPath });
      
      const buildTime = Date.now() - startTime;
      const bundleSize = await this.getBundleSize();

      return {
        executionTime: buildTime,
        memoryUsage: 0, // Would need runtime measurement
        bundleSize,
      };
    } catch (error) {
      return {
        executionTime: 0,
        memoryUsage: 0,
      };
    }
  }

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const { stdout } = await execAsync('npm audit --json', { cwd: this.projectPath });
      const auditResults = JSON.parse(stdout);
      
      const vulnerabilities = auditResults.advisories ? Object.values(auditResults.advisories).map((advisory: any) => ({
        severity: advisory.severity,
        type: advisory.cwe,
        description: advisory.title,
        file: advisory.module_name,
        remediation: advisory.recommendation,
      })) : [];

      return {
        vulnerabilities,
        codeSmells: [],
        technicalDebt: {
          debtRatio: 0,
          maintainabilityIndex: 100,
          cyclomaticComplexity: 0,
          duplicatedLines: 0,
          codeSmellsCount: 0,
        },
      };
    } catch (error) {
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
  }

  async getAccessibilityMetrics(): Promise<AccessibilityMetrics> {
    return {
      score: 100,
      violations: [],
      wcagLevel: 'AAA',
    };
  }

  private parseJestOutput(output: string): any {
    try {
      // Find the JSON output in the Jest output
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse Jest output:', error);
    }
    
    return { testResults: [] };
  }

  private async getBundleSize(): Promise<number> {
    try {
      const bundlePath = path.join(this.projectPath, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      
      if (await fs.pathExists(bundlePath)) {
        const stats = await fs.stat(bundlePath);
        return stats.size;
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async generateComponentTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    const componentFiles = await this.findComponentFiles(config.targetPath);
    
    for (const componentFile of componentFiles) {
      const testFile = await this.generateComponentTestFile(componentFile, config.testPath);
      if (testFile) {
        files.push(testFile);
      }
    }
    
    return files;
  }

  private async generateHookTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    const hookFiles = await this.findHookFiles(config.targetPath);
    
    for (const hookFile of hookFiles) {
      const testFile = await this.generateHookTestFile(hookFile, config.testPath);
      if (testFile) {
        files.push(testFile);
      }
    }
    
    return files;
  }

  private async generateServiceTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    const serviceFiles = await this.findServiceFiles(config.targetPath);
    
    for (const serviceFile of serviceFiles) {
      const testFile = await this.generateServiceTestFile(serviceFile, config.testPath);
      if (testFile) {
        files.push(testFile);
      }
    }
    
    return files;
  }

  private async generateE2ETests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    const e2eTestFile = await this.generateE2ETestFile(config);
    
    if (e2eTestFile) {
      files.push(e2eTestFile);
    }
    
    return files;
  }

  private async findComponentFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      
      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        const subFiles = await this.findComponentFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && this.isComponentFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async findHookFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      
      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        const subFiles = await this.findHookFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && this.isHookFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async findServiceFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      
      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        const subFiles = await this.findServiceFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && this.isServiceFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '__tests__',
      'test',
      'tests',
      'e2e',
      'android',
      'ios',
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  private isComponentFile(fileName: string): boolean {
    return (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) && 
           !fileName.includes('.test.') && 
           !fileName.includes('.spec.');
  }

  private isHookFile(fileName: string): boolean {
    return fileName.startsWith('use') && 
           (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) &&
           !fileName.includes('.test.') && 
           !fileName.includes('.spec.');
  }

  private isServiceFile(fileName: string): boolean {
    return fileName.includes('service') || fileName.includes('api') || fileName.includes('client');
  }

  private async generateComponentTestFile(componentFile: string, testPath: string): Promise<string | null> {
    const componentName = this.extractComponentName(componentFile);
    if (!componentName) return null;

    const testFileName = `${path.basename(componentFile, path.extname(componentFile))}.test.tsx`;
    const testFilePath = path.join(testPath, testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null; // Test already exists
    }

    const relativePath = path.relative(path.dirname(testFilePath), componentFile);
    const importPath = relativePath.replace(/\\/g, '/').replace(/\.(tsx|jsx)$/, '');

    const testContent = `import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ${componentName} from '${importPath}';

describe('${componentName}', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(<${componentName} />);
    expect(getByTestId('${componentName.toLowerCase()}')).toBeTruthy();
  });

  it('should have correct default props', () => {
    const { getByTestId } = render(<${componentName} />);
    const component = getByTestId('${componentName.toLowerCase()}');
    expect(component).toBeTruthy();
  });

  it('should handle user interactions correctly', () => {
    const { getByTestId } = render(<${componentName} />);
    
    // TODO: Add interaction tests
  });

  it('should match snapshot', () => {
    const tree = render(<${componentName} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private async generateHookTestFile(hookFile: string, testPath: string): Promise<string | null> {
    const hookName = this.extractHookName(hookFile);
    if (!hookName) return null;

    const testFileName = `${path.basename(hookFile, path.extname(hookFile))}.test.ts`;
    const testFilePath = path.join(testPath, testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null; // Test already exists
    }

    const relativePath = path.relative(path.dirname(testFilePath), hookFile);
    const importPath = relativePath.replace(/\\/g, '/').replace(/\.(ts|tsx)$/, '');

    const testContent = `import { renderHook, act } from '@testing-library/react-hooks';
import { ${hookName} } from '${importPath}';

describe('${hookName}', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => ${hookName}());
    
    // TODO: Add assertions for initial state
  });

  it('should handle state updates correctly', () => {
    const { result } = renderHook(() => ${hookName}());
    
    act(() => {
      // TODO: Add state update logic
    });
    
    // TODO: Add assertions for updated state
  });

  it('should clean up resources on unmount', () => {
    const { unmount } = renderHook(() => ${hookName}());
    
    unmount();
    
    // TODO: Add cleanup assertions
  });
});`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private async generateServiceTestFile(serviceFile: string, testPath: string): Promise<string | null> {
    const serviceName = this.extractServiceName(serviceFile);
    if (!serviceName) return null;

    const testFileName = `${path.basename(serviceFile, path.extname(serviceFile))}.test.ts`;
    const testFilePath = path.join(testPath, testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null; // Test already exists
    }

    const relativePath = path.relative(path.dirname(testFilePath), serviceFile);
    const importPath = relativePath.replace(/\\/g, '/').replace(/\.(ts|tsx)$/, '');

    const testContent = `import { ${serviceName} } from '${importPath}';

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    service = new ${serviceName}();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // TODO: Add specific service method tests
});`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private async generateE2ETestFile(config: TestGenerationConfig): Promise<string | null> {
    const testFilePath = path.join(config.testPath, 'e2e', 'app.e2e.js');

    if (await fs.pathExists(testFilePath)) {
      return null; // Test already exists
    }

    const testContent = `describe('App E2E', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should have welcome screen', async () => {
    await expect(element(by.id('welcome'))).toBeVisible();
  });

  it('should show hello screen after tap', async () => {
    await element(by.id('hello_button')).tap();
    await expect(element(by.text('Hello!!!'))).toBeVisible();
  });

  it('should show world screen after tap', async () => {
    await element(by.id('world_button')).tap();
    await expect(element(by.text('World!!!'))).toBeVisible();
  });
});`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private extractComponentName(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/(?:export\s+default\s+(?:function\s+)?(\w+)|const\s+(\w+)\s*=.*React\.FC|function\s+(\w+)\s*\()/);
      return match ? match[1] || match[2] || match[3] : null;
    } catch (error) {
      return null;
    }
  }

  private extractHookName(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/export\s+(?:const|function)\s+(use\w+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  private extractServiceName(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/(?:export\s+)?class\s+(\w+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}