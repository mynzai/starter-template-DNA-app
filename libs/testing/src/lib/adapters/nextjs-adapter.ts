/**
 * @fileoverview Next.js Testing Adapter
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

export class NextjsTestAdapter implements TestAdapter, FrameworkAdapter {
  framework: Framework = 'nextjs';
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

    // Generate page tests
    const pageTests = await this.generatePageTests(config);
    generatedFiles.push(...pageTests);

    // Generate component tests
    const componentTests = await this.generateComponentTests(config);
    generatedFiles.push(...componentTests);

    // Generate API tests
    const apiTests = await this.generateApiTests(config);
    generatedFiles.push(...apiTests);

    // Generate hook tests
    const hookTests = await this.generateHookTests(config);
    generatedFiles.push(...hookTests);

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

    // Check Next.js configuration
    const nextConfigPath = path.join(this.projectPath, 'next.config.js');
    if (!(await fs.pathExists(nextConfigPath))) {
      console.warn('next.config.js not found, using default configuration');
    }
  }

  async teardownTest(): Promise<void> {
    // Clean up test artifacts and build files
    await execAsync('npm run clean', { cwd: this.projectPath }).catch(() => {});
    await fs.remove(path.join(this.projectPath, '.next')).catch(() => {});
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
            framework: 'nextjs',
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
      console.error('Next.js unit tests failed:', error);
      results.push({
        framework: 'nextjs',
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
            framework: 'nextjs',
            testType: 'integration',
            name: assertionResult.fullName,
            status: assertionResult.status === 'passed' ? 'passed' : 'failed',
            duration: assertionResult.duration || 0,
            error: assertionResult.failureMessages?.[0],
          });
        }
      }
    } catch (error) {
      console.error('Next.js integration tests failed:', error);
      results.push({
        framework: 'nextjs',
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
      // Run Playwright E2E tests
      const { stdout } = await execAsync(
        'npx playwright test --reporter=json',
        { cwd: this.projectPath }
      );

      const testResults = JSON.parse(stdout);
      
      for (const suite of testResults.suites) {
        for (const test of suite.tests) {
          results.push({
            framework: 'nextjs',
            testType: 'e2e',
            name: test.title,
            status: test.outcome === 'passed' ? 'passed' : 'failed',
            duration: test.duration || 0,
            error: test.errors?.[0]?.message,
          });
        }
      }
    } catch (error) {
      results.push({
        framework: 'nextjs',
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
        framework: 'nextjs',
        testType: 'performance',
        name: 'Performance Tests',
        status: 'passed',
        duration: performanceMetrics.executionTime,
        performanceMetrics,
      });
    } catch (error) {
      results.push({
        framework: 'nextjs',
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
      // Run accessibility tests using axe
      const { stdout } = await execAsync(
        'npx playwright test --grep="accessibility" --reporter=json',
        { cwd: this.projectPath }
      );

      const testResults = JSON.parse(stdout);
      
      for (const suite of testResults.suites) {
        for (const test of suite.tests) {
          results.push({
            framework: 'nextjs',
            testType: 'accessibility',
            name: test.title,
            status: test.outcome === 'passed' ? 'passed' : 'failed',
            duration: test.duration || 0,
            error: test.errors?.[0]?.message,
          });
        }
      }
    } catch (error) {
      results.push({
        framework: 'nextjs',
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
        framework: 'nextjs',
        testType: 'security',
        name: 'Security Audit',
        status: hasVulnerabilities ? 'failed' : 'passed',
        duration: 0,
        error: hasVulnerabilities ? `Found ${auditResults.metadata.vulnerabilities.total} vulnerabilities` : undefined,
      });

      // Run ESLint security plugin
      try {
        await execAsync('npx eslint . --ext .js,.jsx,.ts,.tsx --config .eslintrc-security.js', { cwd: this.projectPath });
        results.push({
          framework: 'nextjs',
          testType: 'security',
          name: 'ESLint Security',
          status: 'passed',
          duration: 0,
        });
      } catch (eslintError) {
        results.push({
          framework: 'nextjs',
          testType: 'security',
          name: 'ESLint Security',
          status: 'failed',
          duration: 0,
          error: 'Security linting issues found',
        });
      }
    } catch (error) {
      results.push({
        framework: 'nextjs',
        testType: 'security',
        name: 'Security Tests',
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
      
      // Build the app
      await execAsync('npm run build', { cwd: this.projectPath });
      
      const buildTime = Date.now() - startTime;

      // Run Lighthouse audit
      const lighthouseResults = await this.runLighthouseAudit();

      return {
        executionTime: buildTime,
        memoryUsage: 0, // Would need runtime measurement
        bundleSize: await this.getBundleSize(),
        renderTime: lighthouseResults.renderTime,
        timeToInteractive: lighthouseResults.timeToInteractive,
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
    try {
      // Run axe accessibility testing
      const { stdout } = await execAsync(
        'npx @axe-core/cli http://localhost:3000 --show-errors',
        { cwd: this.projectPath }
      );

      const violations = this.parseAxeOutput(stdout);

      return {
        score: violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10),
        violations,
        wcagLevel: 'AA',
      };
    } catch (error) {
      return {
        score: 0,
        violations: [],
        wcagLevel: 'AA',
      };
    }
  }

  private parseJestOutput(output: string): any {
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse Jest output:', error);
    }
    
    return { testResults: [] };
  }

  private async runLighthouseAudit(): Promise<{ renderTime: number; timeToInteractive: number }> {
    try {
      // Start Next.js dev server
      const serverProcess = exec('npm run dev', { cwd: this.projectPath });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Run Lighthouse
      const { stdout } = await execAsync(
        'npx lighthouse http://localhost:3000 --output=json --quiet',
        { cwd: this.projectPath }
      );

      const results = JSON.parse(stdout);
      const metrics = results.lhr.audits;

      // Kill the server
      serverProcess.kill();

      return {
        renderTime: metrics['first-contentful-paint']?.numericValue || 0,
        timeToInteractive: metrics['interactive']?.numericValue || 0,
      };
    } catch (error) {
      return { renderTime: 0, timeToInteractive: 0 };
    }
  }

  private async getBundleSize(): Promise<number> {
    try {
      const buildPath = path.join(this.projectPath, '.next');
      
      if (!(await fs.pathExists(buildPath))) {
        return 0;
      }

      const stats = await this.getDirectorySize(buildPath);
      return stats;
    } catch (error) {
      return 0;
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += await this.getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  private parseAxeOutput(output: string): any[] {
    try {
      const violations = [];
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.includes('violations found')) {
          // Parse axe violations
          // This is a simplified parser - real implementation would be more robust
        }
      }
      
      return violations;
    } catch (error) {
      return [];
    }
  }

  private async generatePageTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    const pageFiles = await this.findPageFiles(config.targetPath);
    
    for (const pageFile of pageFiles) {
      const testFile = await this.generatePageTestFile(pageFile, config.testPath);
      if (testFile) {
        files.push(testFile);
      }
    }
    
    return files;
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

  private async generateApiTests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    const apiFiles = await this.findApiFiles(config.targetPath);
    
    for (const apiFile of apiFiles) {
      const testFile = await this.generateApiTestFile(apiFile, config.testPath);
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

  private async generateE2ETests(config: TestGenerationConfig): Promise<string[]> {
    const files: string[] = [];
    const e2eTestFile = await this.generateE2ETestFile(config);
    
    if (e2eTestFile) {
      files.push(e2eTestFile);
    }
    
    return files;
  }

  private async findPageFiles(targetPath: string): Promise<string[]> {
    const pagesPath = path.join(targetPath, 'pages');
    if (!(await fs.pathExists(pagesPath))) {
      return [];
    }
    
    return this.findFilesRecursively(pagesPath, '.tsx', '.jsx');
  }

  private async findComponentFiles(targetPath: string): Promise<string[]> {
    const componentsPath = path.join(targetPath, 'components');
    if (!(await fs.pathExists(componentsPath))) {
      return [];
    }
    
    return this.findFilesRecursively(componentsPath, '.tsx', '.jsx');
  }

  private async findApiFiles(targetPath: string): Promise<string[]> {
    const apiPath = path.join(targetPath, 'pages', 'api');
    if (!(await fs.pathExists(apiPath))) {
      return [];
    }
    
    return this.findFilesRecursively(apiPath, '.ts', '.js');
  }

  private async findHookFiles(targetPath: string): Promise<string[]> {
    const hooksPath = path.join(targetPath, 'hooks');
    if (!(await fs.pathExists(hooksPath))) {
      return [];
    }
    
    return this.findFilesRecursively(hooksPath, '.ts', '.tsx');
  }

  private async findFilesRecursively(dirPath: string, ...extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.findFilesRecursively(fullPath, ...extensions);
        files.push(...subFiles);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  private async generatePageTestFile(pageFile: string, testPath: string): Promise<string | null> {
    const pageName = this.extractPageName(pageFile);
    if (!pageName) return null;

    const testFileName = `${path.basename(pageFile, path.extname(pageFile))}.test.tsx`;
    const testFilePath = path.join(testPath, 'pages', testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null;
    }

    const testContent = `import { render, screen } from '@testing-library/react';
import { NextRouter } from 'next/router';
import { RouterContext } from 'next/dist/shared/lib/router-context';
import ${pageName} from '../../pages/${path.basename(pageFile, path.extname(pageFile))}';

// Mock router
const createMockRouter = (router: Partial<NextRouter>): NextRouter => ({
  basePath: '',
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  back: jest.fn(),
  beforePopState: jest.fn(),
  forward: jest.fn(),
  push: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
  isLocaleDomain: false,
  isReady: true,
  defaultLocale: 'en',
  domainLocales: [],
  isPreview: false,
  ...router,
});

describe('${pageName}', () => {
  it('should render without crashing', () => {
    const mockRouter = createMockRouter({});
    
    render(
      <RouterContext.Provider value={mockRouter}>
        <${pageName} />
      </RouterContext.Provider>
    );
    
    // TODO: Add specific assertions
  });

  it('should handle routing correctly', () => {
    const mockRouter = createMockRouter({
      push: jest.fn(),
    });
    
    render(
      <RouterContext.Provider value={mockRouter}>
        <${pageName} />
      </RouterContext.Provider>
    );
    
    // TODO: Add routing tests
  });

  it('should match snapshot', () => {
    const mockRouter = createMockRouter({});
    
    const tree = render(
      <RouterContext.Provider value={mockRouter}>
        <${pageName} />
      </RouterContext.Provider>
    );
    
    expect(tree.container.firstChild).toMatchSnapshot();
  });
});`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private async generateComponentTestFile(componentFile: string, testPath: string): Promise<string | null> {
    const componentName = this.extractComponentName(componentFile);
    if (!componentName) return null;

    const testFileName = `${path.basename(componentFile, path.extname(componentFile))}.test.tsx`;
    const testFilePath = path.join(testPath, 'components', testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null;
    }

    const relativePath = path.relative(path.dirname(testFilePath), componentFile);
    const importPath = relativePath.replace(/\\/g, '/').replace(/\.(tsx|jsx)$/, '');

    const testContent = `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ${componentName} from '${importPath}';

describe('${componentName}', () => {
  it('should render without crashing', () => {
    render(<${componentName} />);
    // TODO: Add specific assertions
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<${componentName} />);
    
    // TODO: Add interaction tests
  });

  it('should handle props correctly', () => {
    const props = {
      // TODO: Add test props
    };
    
    render(<${componentName} {...props} />);
    
    // TODO: Add prop tests
  });

  it('should match snapshot', () => {
    const tree = render(<${componentName} />);
    expect(tree.container.firstChild).toMatchSnapshot();
  });
});`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private async generateApiTestFile(apiFile: string, testPath: string): Promise<string | null> {
    const apiName = path.basename(apiFile, path.extname(apiFile));
    
    const testFileName = `${apiName}.test.ts`;
    const testFilePath = path.join(testPath, 'api', testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null;
    }

    const testContent = `import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/${apiName}';

describe('/api/${apiName}', () => {
  it('should handle GET requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // TODO: Add specific assertions for GET response
  });

  it('should handle POST requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        // TODO: Add test data
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // TODO: Add specific assertions for POST response
  });

  it('should handle invalid methods', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should handle errors gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      // TODO: Add conditions that cause errors
    });

    await handler(req, res);

    // TODO: Add error handling assertions
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
    const testFilePath = path.join(testPath, 'hooks', testFileName);

    if (await fs.pathExists(testFilePath)) {
      return null;
    }

    const relativePath = path.relative(path.dirname(testFilePath), hookFile);
    const importPath = relativePath.replace(/\\/g, '/').replace(/\.(ts|tsx)$/, '');

    const testContent = `import { renderHook, act } from '@testing-library/react';
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

  private async generateE2ETestFile(config: TestGenerationConfig): Promise<string | null> {
    const testFilePath = path.join(config.testPath, 'e2e', 'app.spec.ts');

    if (await fs.pathExists(testFilePath)) {
      return null;
    }

    const testContent = `import { test, expect } from '@playwright/test';

test.describe('App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Home/);
  });

  test('should navigate between pages', async ({ page }) => {
    // TODO: Add navigation tests
  });

  test('should handle form submissions', async ({ page }) => {
    // TODO: Add form interaction tests
  });

  test('should be accessible', async ({ page }) => {
    // TODO: Add accessibility tests using axe
  });

  test('should perform well', async ({ page }) => {
    // TODO: Add performance tests
  });
});`;

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private extractPageName(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/export\s+default\s+(?:function\s+)?(\w+)|const\s+(\w+)\s*=.*default/);
      return match ? match[1] || match[2] : null;
    } catch (error) {
      return null;
    }
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
}