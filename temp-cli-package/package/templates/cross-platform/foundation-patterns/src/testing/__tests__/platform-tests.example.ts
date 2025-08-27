/**
 * Example Cross-Platform Tests
 * Demonstrates how to write tests that work across all supported platforms
 */

import {
  createTestSuite,
  createTestRunner,
  assert,
  PlatformTestUtils,
  VisualRegressionTester,
  PerformanceTester,
  TestConfig,
} from '../cross-platform-testing.js';
import { platformDetector } from '../../abstractions/platform.js';
import { fileSystem } from '../../abstractions/filesystem.js';
import { notificationManager } from '../../abstractions/notifications.js';
import { navigationManager } from '../../abstractions/navigation.js';
import { sharedStore } from '../../state/shared-store.js';
import { createAdaptiveComponent } from '../../components/adaptive-ui.js';

/**
 * Shared Core Functionality Tests
 */
const coreTests = createTestSuite(
  'Core Functionality',
  'Tests for shared platform abstractions and core functionality'
)
  .beforeAll(async () => {
    // Global setup
    console.log('Setting up core tests...');
  })
  .afterAll(async () => {
    // Global teardown
    console.log('Tearing down core tests...');
  })
  .test('Platform Detection', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    const platform = platformDetector.detectPlatform();
    assert.assertTrue(['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'].includes(platform));
    
    const deviceInfo = platformDetector.getDeviceInfo();
    assert.assertTrue(deviceInfo.platform === platform);
    assert.assertTrue(typeof deviceInfo.isDevelopment === 'boolean');
  })
  .test('Capability Detection', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    const capabilities = platformDetector.getCapabilities();
    
    // All platforms should have basic UI capabilities
    assert.assertTrue(capabilities.ui.animations);
    assert.assertTrue(capabilities.ui.themes);
    assert.assertTrue(capabilities.ui.responsive);
    
    // Check platform-specific capabilities
    if (platformDetector.isNative()) {
      assert.assertTrue(capabilities.fileSystem.read);
      assert.assertTrue(capabilities.fileSystem.write);
    }
    
    if (platformDetector.isMobile()) {
      assert.assertTrue(capabilities.device.camera);
      assert.assertTrue(capabilities.notifications.show);
    }
  })
  .test('File System Abstraction', ['react-native', 'flutter', 'tauri'], async () => {
    // Skip if platform doesn't support file system operations
    if (!platformDetector.isSupported('fileSystem.write')) {
      return;
    }
    
    const testPath = await fileSystem.joinPath(await fileSystem.getTempPath(), 'test.txt');
    const testContent = 'Hello, Cross-Platform World!';
    
    // Write file
    await fileSystem.writeFile(testPath, testContent);
    
    // Verify file exists
    assert.assertTrue(await fileSystem.exists(testPath));
    
    // Read file
    const readContent = await fileSystem.readFile(testPath);
    assert.assertEqual(readContent, testContent);
    
    // Get file info
    const fileInfo = await fileSystem.getFileInfo(testPath);
    assert.assertEqual(fileInfo.name, 'test.txt');
    assert.assertTrue(fileInfo.size > 0);
    
    // Clean up
    await fileSystem.deleteFile(testPath);
    assert.assertFalse(await fileSystem.exists(testPath));
  })
  .test('Notification System', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    const capabilities = notificationManager.capabilities;
    
    if (capabilities.show) {
      // Check permission status
      const permission = await notificationManager.checkPermission();
      assert.assertTrue(typeof permission.granted === 'boolean');
      
      if (permission.granted || permission.canRequest) {
        // Show a test notification
        const notificationId = await notificationManager.showNotification({
          title: 'Test Notification',
          body: 'This is a cross-platform test notification',
        });
        
        assert.assertTrue(typeof notificationId === 'string');
        assert.assertTrue(notificationId.length > 0);
        
        // Hide the notification
        await notificationManager.hideNotification(notificationId);
      }
    }
  })
  .test('Navigation System', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    const currentState = navigationManager.getCurrentState();
    assert.assertTrue(typeof currentState.pathname === 'string');
    assert.assertTrue(typeof currentState.canGoBack === 'boolean');
    
    // Test URL building
    const url = navigationManager.buildUrl('/test', { id: '123' }, { filter: 'active' });
    assert.assertTrue(url.includes('/test'));
    
    // Test URL parsing
    const parsed = navigationManager.parseUrl('/test/123?filter=active');
    assert.assertEqual(parsed.route, '/test/123');
    assert.assertEqual(parsed.query.filter, 'active');
    
    // Test route management
    navigationManager.addRoute({
      name: 'test-route',
      path: '/test/:id',
    });
    
    const route = navigationManager.getRoute('test-route');
    assert.assertTrue(route !== undefined);
    assert.assertEqual(route?.name, 'test-route');
  })
  .test('Shared State Management', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    const testKey = 'test-state-key';
    const testValue = { message: 'Hello, State!' };
    
    // Set state
    await sharedStore.set(testKey, testValue);
    
    // Get state
    const retrievedValue = sharedStore.get(testKey);
    assert.assertObjectEqual(retrievedValue, testValue);
    
    // Test batch operations
    const batchData = {
      'batch-key-1': 'value1',
      'batch-key-2': 'value2',
      'batch-key-3': 'value3',
    };
    
    await sharedStore.setBatch(batchData);
    
    const batchResult = sharedStore.getBatch(['batch-key-1', 'batch-key-2', 'batch-key-3']);
    assert.assertObjectEqual(batchResult, batchData);
    
    // Test subscriptions
    let changeCount = 0;
    const unsubscribe = sharedStore.subscribe(testKey, () => {
      changeCount++;
    });
    
    await sharedStore.set(testKey, { message: 'Updated!' });
    assert.assertEqual(changeCount, 1);
    
    unsubscribe();
    
    // Clean up
    await sharedStore.delete(testKey);
    await sharedStore.delete('batch-key-1');
    await sharedStore.delete('batch-key-2');
    await sharedStore.delete('batch-key-3');
  })
  .test('Adaptive UI Components', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    // Test button component creation
    const button = createAdaptiveComponent('button', {
      title: 'Test Button',
      variant: 'primary',
      size: 'md',
    });
    
    assert.assertTrue(button.component !== undefined);
    assert.assertTrue(button.props !== undefined);
    
    // Test input component creation
    const input = createAdaptiveComponent('input', {
      placeholder: 'Test Input',
      value: 'test value',
    });
    
    assert.assertTrue(input.component !== undefined);
    assert.assertTrue(input.props !== undefined);
    
    // Test card component creation
    const card = createAdaptiveComponent('card', {
      elevation: 2,
      padding: 'md',
    });
    
    assert.assertTrue(card.component !== undefined);
    assert.assertTrue(card.props !== undefined);
  })
  .build();

/**
 * Platform-Specific Tests
 */
const platformSpecificTests = createTestSuite(
  'Platform-Specific Features',
  'Tests for platform-specific functionality and optimizations'
)
  .testPlatform('React Native Device Features', 'react-native', async () => {
    const testEnv = await PlatformTestUtils.createTestEnvironment('react-native');
    
    if (testEnv.error) {
      console.warn('React Native test environment not available:', testEnv.error);
      return;
    }
    
    assert.assertEqual(testEnv.platform, 'react-native');
    assert.assertTrue(testEnv.render !== undefined);
    assert.assertTrue(testEnv.fireEvent !== undefined);
  })
  .testPlatform('Flutter Widget Testing', 'flutter', async () => {
    const testEnv = await PlatformTestUtils.createTestEnvironment('flutter');
    
    assert.assertEqual(testEnv.platform, 'flutter');
    assert.assertTrue(testEnv.testWidgets !== undefined);
    assert.assertTrue(testEnv.find !== undefined);
  })
  .testPlatform('Tauri Desktop Features', 'tauri', async () => {
    const testEnv = await PlatformTestUtils.createTestEnvironment('tauri');
    
    if (testEnv.error) {
      console.warn('Tauri test environment not available:', testEnv.error);
      return;
    }
    
    assert.assertEqual(testEnv.platform, 'tauri');
    assert.assertTrue(testEnv.mockTauri !== undefined);
  })
  .testPlatform('Next.js SSR Features', 'nextjs', async () => {
    const testEnv = await PlatformTestUtils.createTestEnvironment('nextjs');
    
    if (testEnv.error) {
      console.warn('Next.js test environment not available:', testEnv.error);
      return;
    }
    
    assert.assertEqual(testEnv.platform, 'nextjs');
    assert.assertTrue(testEnv.render !== undefined);
    assert.assertTrue(testEnv.router !== undefined);
  })
  .testPlatform('SvelteKit Features', 'sveltekit', async () => {
    const testEnv = await PlatformTestUtils.createTestEnvironment('sveltekit');
    
    if (testEnv.error) {
      console.warn('SvelteKit test environment not available:', testEnv.error);
      return;
    }
    
    assert.assertEqual(testEnv.platform, 'sveltekit');
    assert.assertTrue(testEnv.render !== undefined);
  })
  .build();

/**
 * Performance Tests
 */
const performanceTests = createTestSuite(
  'Performance Tests',
  'Tests to ensure performance requirements are met across platforms'
)
  .test('State Management Performance', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    const perfTester = new PerformanceTester();
    
    // Test state read performance
    await perfTester.measurePerformance('state-read', async () => {
      for (let i = 0; i < 1000; i++) {
        sharedStore.get(`test-key-${i}`);
      }
    });
    
    // Test state write performance
    await perfTester.measurePerformance('state-write', async () => {
      for (let i = 0; i < 1000; i++) {
        await sharedStore.set(`test-key-${i}`, `value-${i}`);
      }
    });
    
    // Assert performance requirements
    perfTester.assertPerformance('state-read', 100); // Max 100ms average for 1000 reads
    perfTester.assertPerformance('state-write', 1000); // Max 1000ms average for 1000 writes
    
    // Clean up
    for (let i = 0; i < 1000; i++) {
      await sharedStore.delete(`test-key-${i}`);
    }
  })
  .test('Component Creation Performance', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    const perfTester = new PerformanceTester();
    
    await perfTester.measurePerformance('component-creation', async () => {
      for (let i = 0; i < 100; i++) {
        createAdaptiveComponent('button', {
          title: `Button ${i}`,
          variant: 'primary',
        });
      }
    });
    
    // Assert component creation is fast
    perfTester.assertPerformance('component-creation', 50); // Max 50ms for 100 components
  })
  .timeout(30000) // Longer timeout for performance tests
  .build();

/**
 * Integration Tests
 */
const integrationTests = createTestSuite(
  'Integration Tests',
  'End-to-end tests that verify multiple systems working together'
)
  .test('Full Workflow Integration', ['react-native', 'flutter', 'tauri', 'nextjs', 'sveltekit', 'web'], async () => {
    // Test a complete workflow: state management + navigation + notifications
    
    // Set up initial state
    await sharedStore.set('user', { id: 1, name: 'Test User' });
    await sharedStore.set('isAuthenticated', true);
    
    // Test navigation with state
    const user = sharedStore.get('user');
    assert.assertTrue(user !== undefined);
    assert.assertEqual(user.name, 'Test User');
    
    // Test state-driven UI components
    const userButton = createAdaptiveComponent('button', {
      title: `Hello, ${user.name}`,
      variant: 'primary',
    });
    
    assert.assertTrue(userButton.children?.includes('Test User') || 
                     userButton.props?.children?.includes('Test User'));
    
    // Test notification based on state
    if (notificationManager.capabilities.show) {
      const permission = await notificationManager.checkPermission();
      if (permission.granted || permission.canRequest) {
        const notificationId = await notificationManager.showNotification({
          title: 'Welcome!',
          body: `Hello, ${user.name}!`,
        });
        
        assert.assertTrue(typeof notificationId === 'string');
        await notificationManager.hideNotification(notificationId);
      }
    }
    
    // Clean up
    await sharedStore.delete('user');
    await sharedStore.delete('isAuthenticated');
  })
  .timeout(10000)
  .build();

/**
 * Run Tests
 */
export async function runAllTests(): Promise<void> {
  const platform = platformDetector.detectPlatform();
  
  const config: TestConfig = {
    platform,
    environment: 'unit',
    timeout: 5000,
    parallel: false,
    coverage: true,
  };
  
  const runner = createTestRunner(config);
  
  // Register test suites
  runner.registerSuite(coreTests);
  runner.registerSuite(platformSpecificTests);
  runner.registerSuite(performanceTests);
  runner.registerSuite(integrationTests);
  
  // Run all tests
  console.log(`Running cross-platform tests on ${platform}...`);
  const reports = await runner.runAll();
  
  // Print results
  for (const report of reports) {
    console.log(`\n${report.suite} (${report.platform}):`);
    console.log(`  Duration: ${report.duration}ms`);
    console.log(`  Results: ${report.summary.passed}/${report.summary.total} passed`);
    
    if (report.summary.failed > 0) {
      console.log(`  Failed: ${report.summary.failed}`);
      
      // Show failed tests
      for (const result of report.results) {
        if (result.status === 'failed') {
          console.log(`    ❌ ${result.testId}: ${result.error?.message}`);
        }
      }
    }
    
    if (report.summary.skipped > 0) {
      console.log(`  Skipped: ${report.summary.skipped}`);
    }
  }
  
  // Calculate overall results
  const totalPassed = reports.reduce((sum, report) => sum + report.summary.passed, 0);
  const totalTests = reports.reduce((sum, report) => sum + report.summary.total, 0);
  const totalFailed = reports.reduce((sum, report) => sum + report.summary.failed, 0);
  
  console.log(`\nOverall Results:`);
  console.log(`  Total: ${totalTests}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  if (totalFailed > 0) {
    throw new Error(`${totalFailed} tests failed`);
  }
}

// Export for use in test runners
export {
  coreTests,
  platformSpecificTests,
  performanceTests,
  integrationTests,
};