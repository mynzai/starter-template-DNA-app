import { DNAModule } from '@starter-template-dna/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface PlaywrightMCPConfig {
  enabled: boolean;
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  browsers?: ('chromium' | 'firefox' | 'webkit')[];
  recordVideo?: boolean;
  recordScreenshots?: boolean;
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'screenshot' | 'wait' | 'evaluate';
  selector?: string;
  value?: string | number;
  url?: string;
  timeout?: number;
  script?: string;
}

export interface TestResult {
  success: boolean;
  screenshot?: string;
  error?: string;
  duration: number;
  metrics?: {
    loadTime: number;
    dom: number;
    resources: number;
  };
}

export class PlaywrightMCPModule extends DNAModule {
  public readonly id = 'playwright-mcp';
  public readonly name = 'Playwright MCP Integration';
  public readonly description = 'Provides browser automation and testing through MCP';
  public readonly version = '1.0.0';
  public readonly category = 'testing';
  
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(private config: PlaywrightMCPConfig) {
    super();
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Initialize MCP client for Playwright operations
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: [
          '-y',
          '@smithery/cli@latest',
          'run',
          '@cloudflare/playwright-mcp',
          '--key',
          'c89dbd54-0e5f-49a3-84ea-5d02b90591ed'
        ],
      });

      this.client = new Client(
        {
          name: 'dna-playwright-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      await this.client.connect(this.transport);
      
      this.emit('initialized', { module: this.id });
    } catch (error) {
      this.emit('error', { module: this.id, error });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async launchBrowser(options?: {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    viewport?: { width: number; height: number };
  }): Promise<string> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'launch_browser',
      arguments: {
        browser: options?.browser || 'chromium',
        headless: options?.headless ?? this.config.headless ?? true,
        viewport: options?.viewport || this.config.viewport || { width: 1280, height: 720 },
      },
    });

    return result.content[0]?.text || '';
  }

  async navigateToPage(browserId: string, url: string): Promise<void> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    await this.client.callTool({
      name: 'navigate',
      arguments: {
        browser_id: browserId,
        url: url,
      },
    });
  }

  async takeScreenshot(browserId: string, options?: {
    fullPage?: boolean;
    path?: string;
  }): Promise<string> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'screenshot',
      arguments: {
        browser_id: browserId,
        full_page: options?.fullPage ?? false,
        path: options?.path,
      },
    });

    return result.content[0]?.text || '';
  }

  async clickElement(browserId: string, selector: string): Promise<void> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    await this.client.callTool({
      name: 'click',
      arguments: {
        browser_id: browserId,
        selector: selector,
      },
    });
  }

  async fillInput(browserId: string, selector: string, value: string): Promise<void> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    await this.client.callTool({
      name: 'fill',
      arguments: {
        browser_id: browserId,
        selector: selector,
        value: value,
      },
    });
  }

  async waitForElement(browserId: string, selector: string, timeout?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    await this.client.callTool({
      name: 'wait_for_element',
      arguments: {
        browser_id: browserId,
        selector: selector,
        timeout: timeout || this.config.timeout || 30000,
      },
    });
  }

  async evaluateScript(browserId: string, script: string): Promise<any> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'evaluate',
      arguments: {
        browser_id: browserId,
        script: script,
      },
    });

    return JSON.parse(result.content[0]?.text || 'null');
  }

  async runTest(actions: BrowserAction[], options?: {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
  }): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const browserId = await this.launchBrowser(options);
      let screenshot = '';
      
      for (const action of actions) {
        switch (action.type) {
          case 'navigate':
            if (action.url) {
              await this.navigateToPage(browserId, action.url);
            }
            break;
          case 'click':
            if (action.selector) {
              await this.clickElement(browserId, action.selector);
            }
            break;
          case 'fill':
            if (action.selector && action.value) {
              await this.fillInput(browserId, action.selector, String(action.value));
            }
            break;
          case 'wait':
            if (action.selector) {
              await this.waitForElement(browserId, action.selector, action.timeout);
            }
            break;
          case 'screenshot':
            screenshot = await this.takeScreenshot(browserId, { fullPage: true });
            break;
          case 'evaluate':
            if (action.script) {
              await this.evaluateScript(browserId, action.script);
            }
            break;
        }
      }

      await this.closeBrowser(browserId);

      return {
        success: true,
        screenshot,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  async closeBrowser(browserId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Playwright MCP client not initialized');
    }

    await this.client.callTool({
      name: 'close_browser',
      arguments: {
        browser_id: browserId,
      },
    });
  }

  async generateE2ETest(actions: BrowserAction[], testName: string): Promise<string> {
    return this.generatePlaywrightTestCode(actions, testName);
  }

  getCompatibleFrameworks(): string[] {
    return ['nextjs', 'react-native', 'flutter', 'tauri'];
  }

  generateCode(framework: string): Record<string, string> {
    const baseConfig = {
      enabled: true,
      headless: this.config.headless ?? true,
      timeout: this.config.timeout || 30000,
      viewport: this.config.viewport || { width: 1280, height: 720 },
    };

    switch (framework) {
      case 'nextjs':
        return {
          'tests/e2e/playwright.config.ts': this.generatePlaywrightConfig(baseConfig),
          'tests/e2e/example.spec.ts': this.generateNextJSTest(baseConfig),
          'lib/testing/browser-automation.ts': this.generateNextJSAutomation(baseConfig),
        };
      case 'flutter':
        return {
          'test_driver/app.dart': this.generateFlutterDriver(),
          'test_driver/app_test.dart': this.generateFlutterE2E(baseConfig),
          'integration_test/app_test.dart': this.generateFlutterIntegrationTest(baseConfig),
        };
      case 'react-native':
        return {
          'e2e/jest.config.js': this.generateDetoxConfig(baseConfig),
          'e2e/firstTest.e2e.js': this.generateDetoxTest(baseConfig),
        };
      default:
        return {
          'tests/browser-automation.ts': this.generateGenericBrowserTest(baseConfig),
        };
    }
  }

  private generatePlaywrightConfig(config: any): string {
    return `
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: ${config.headless},
    viewport: ${JSON.stringify(config.viewport)},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
`;
  }

  private generateNextJSTest(config: any): string {
    return `
import { test, expect } from '@playwright/test';

test.describe('Application E2E Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Your App Name/);
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL('/about');
  });

  test('should submit contact form', async ({ page }) => {
    await page.goto('/contact');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'Test message');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('.mobile-menu')).toBeVisible();
  });
});
`;
  }

  private generateNextJSAutomation(config: any): string {
    return `
import { PlaywrightMCPModule, BrowserAction, TestResult } from '@starter-template-dna/dna-modules';

export class BrowserAutomation {
  private playwrightModule: PlaywrightMCPModule;

  constructor() {
    this.playwrightModule = new PlaywrightMCPModule(${JSON.stringify(config, null, 2)});
  }

  async initialize() {
    await this.playwrightModule.initialize();
  }

  async runUserJourney(actions: BrowserAction[]): Promise<TestResult> {
    return await this.playwrightModule.runTest(actions);
  }

  async testPageLoad(url: string): Promise<TestResult> {
    const actions: BrowserAction[] = [
      { type: 'navigate', url },
      { type: 'screenshot' },
    ];

    return await this.runUserJourney(actions);
  }

  async testFormSubmission(formData: {
    url: string;
    fields: Array<{ selector: string; value: string }>;
    submitSelector: string;
    successSelector: string;
  }): Promise<TestResult> {
    const actions: BrowserAction[] = [
      { type: 'navigate', url: formData.url },
      ...formData.fields.map((field): BrowserAction => ({
        type: 'fill',
        selector: field.selector,
        value: field.value,
      })),
      { type: 'click', selector: formData.submitSelector },
      { type: 'wait', selector: formData.successSelector },
      { type: 'screenshot' },
    ];

    return await this.runUserJourney(actions);
  }

  async testResponsiveDesign(url: string, viewports: Array<{ width: number; height: number }>): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const viewport of viewports) {
      const actions: BrowserAction[] = [
        { type: 'navigate', url },
        { type: 'screenshot' },
      ];

      const result = await this.playwrightModule.runTest(actions, {
        headless: true,
      });

      results.push(result);
    }

    return results;
  }

  async cleanup() {
    await this.playwrightModule.cleanup();
  }
}

export const browserAutomation = new BrowserAutomation();
`;
  }

  private generateFlutterDriver(): string {
    return `
import 'package:flutter_driver/driver_extension.dart';
import 'package:my_app/main.dart' as app;

void main() {
  enableFlutterDriverExtension();
  app.main();
}
`;
  }

  private generateFlutterE2E(config: any): string {
    return `
import 'package:flutter_driver/flutter_driver.dart';
import 'package:test/test.dart';

void main() {
  group('App E2E Tests', () {
    FlutterDriver? driver;

    setUpAll(() async {
      driver = await FlutterDriver.connect();
    });

    tearDownAll(() async {
      if (driver != null) {
        driver!.close();
      }
    });

    test('should display app title', () async {
      await driver!.waitFor(find.text('My App'));
    });

    test('should navigate between screens', () async {
      await driver!.tap(find.byValueKey('settings_button'));
      await driver!.waitFor(find.text('Settings'));
      
      await driver!.tap(find.byValueKey('back_button'));
      await driver!.waitFor(find.text('My App'));
    });

    test('should handle form input', () async {
      await driver!.tap(find.byValueKey('form_screen_button'));
      
      await driver!.tap(find.byValueKey('name_field'));
      await driver!.enterText('Test User');
      
      await driver!.tap(find.byValueKey('email_field'));
      await driver!.enterText('test@example.com');
      
      await driver!.tap(find.byValueKey('submit_button'));
      
      await driver!.waitFor(find.text('Form submitted successfully'));
    });
  });
}
`;
  }

  private generateFlutterIntegrationTest(config: any): string {
    return `
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('end-to-end test', () {
    testWidgets('tap on the floating action button, verify counter', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('counter_text')), findsOneWidget);

      await tester.tap(find.byKey(const Key('increment_button')));
      await tester.pumpAndSettle();

      expect(find.text('1'), findsOneWidget);
    });

    testWidgets('navigation test', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('settings_button')));
      await tester.pumpAndSettle();

      expect(find.text('Settings'), findsOneWidget);
    });
  });
}
`;
  }

  private generateDetoxConfig(config: any): string {
    return `
module.exports = {
  testTimeout: 120000,
  retries: 2,
  verbose: true,
  bail: false,
  
  configurations: {
    'ios.sim.debug': {
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/MyApp.app',
      build: 'xcodebuild -workspace ios/MyApp.xcworkspace -scheme MyApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
      type: 'ios.simulator',
      device: {
        type: 'iPhone 12',
      },
    },
    'android.emu.debug': {
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_3a_API_30_x86',
      },
    },
  },
};
`;
  }

  private generateDetoxTest(config: any): string {
    return `
describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

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
});
`;
  }

  private generateGenericBrowserTest(config: any): string {
    return `
import { PlaywrightMCPModule, BrowserAction } from '@starter-template-dna/dna-modules';

export class BrowserTesting {
  private playwrightModule: PlaywrightMCPModule;

  constructor() {
    this.playwrightModule = new PlaywrightMCPModule(${JSON.stringify(config, null, 2)});
  }

  async initialize() {
    await this.playwrightModule.initialize();
  }

  async runBasicTest(): Promise<void> {
    const actions: BrowserAction[] = [
      { type: 'navigate', url: 'http://localhost:3000' },
      { type: 'wait', selector: 'h1' },
      { type: 'screenshot' },
    ];

    const result = await this.playwrightModule.runTest(actions);
    
    if (result.success) {
      console.log('Test passed in', result.duration, 'ms');
    } else {
      console.error('Test failed:', result.error);
    }
  }

  async runFormTest(): Promise<void> {
    const actions: BrowserAction[] = [
      { type: 'navigate', url: 'http://localhost:3000/contact' },
      { type: 'fill', selector: 'input[name="name"]', value: 'Test User' },
      { type: 'fill', selector: 'input[name="email"]', value: 'test@example.com' },
      { type: 'fill', selector: 'textarea[name="message"]', value: 'Test message' },
      { type: 'click', selector: 'button[type="submit"]' },
      { type: 'wait', selector: '.success-message' },
      { type: 'screenshot' },
    ];

    const result = await this.playwrightModule.runTest(actions);
    
    if (result.success) {
      console.log('Form test passed');
    } else {
      console.error('Form test failed:', result.error);
    }
  }

  async cleanup() {
    await this.playwrightModule.cleanup();
  }
}
`;
  }

  private generatePlaywrightTestCode(actions: BrowserAction[], testName: string): string {
    const actionCode = actions.map(action => {
      switch (action.type) {
        case 'navigate':
          return `await page.goto('${action.url}');`;
        case 'click':
          return `await page.click('${action.selector}');`;
        case 'fill':
          return `await page.fill('${action.selector}', '${action.value}');`;
        case 'wait':
          return `await page.waitForSelector('${action.selector}');`;
        case 'screenshot':
          return `await page.screenshot({ path: 'screenshot.png' });`;
        case 'evaluate':
          return `await page.evaluate(() => { ${action.script} });`;
        default:
          return `// Unknown action: ${action.type}`;
      }
    }).join('\n  ');

    return `
import { test, expect } from '@playwright/test';

test('${testName}', async ({ page }) => {
  ${actionCode}
});
`;
  }
}