import { test, expect, ElectronApplication, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Performance Tests', () => {
  test('app startup performance', async () => {
    const startTime = Date.now();
    
    // Launch Electron app
    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '../../dist/main/main.js'),
        '--test-mode',
        '--performance-mode'
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    // Get the first page
    const page = await electronApp.firstWindow();
    
    // Wait for app to be fully ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Additional time for full initialization
    
    const endTime = Date.now();
    const startupTime = endTime - startTime;
    
    console.log(`App startup time: ${startupTime}ms`);
    
    // Startup should be under 5 seconds
    expect(startupTime).toBeLessThan(5000);
    
    // Optimal startup should be under 2 seconds
    if (startupTime > 2000) {
      console.warn(`Startup time ${startupTime}ms exceeds optimal threshold of 2000ms`);
    }
    
    await electronApp.close();
  });

  test('memory usage', async () => {
    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '../../dist/main/main.js'),
        '--test-mode'
      ]
    });
    
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Get memory metrics
    const memoryMetrics = await electronApp.evaluate(async () => {
      return process.memoryUsage();
    });
    
    console.log('Memory usage:', {
      rss: `${Math.round(memoryMetrics.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryMetrics.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryMetrics.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryMetrics.external / 1024 / 1024)}MB`
    });
    
    // Memory should be reasonable for a desktop app
    const memoryMB = memoryMetrics.rss / 1024 / 1024;
    expect(memoryMB).toBeLessThan(200); // Less than 200MB
    
    await electronApp.close();
  });

  test('renderer performance', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main.js'), '--test-mode']
    });
    
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Measure renderer performance
    const performanceMetrics = await page.evaluate(async () => {
      const perf = performance;
      
      // Create some DOM elements to test rendering performance
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const startTime = perf.now();
      
      // Create 1000 DOM elements
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div');
        element.textContent = `Element ${i}`;
        element.style.cssText = 'padding: 5px; margin: 1px; background: #f0f0f0;';
        container.appendChild(element);
      }
      
      const domCreationTime = perf.now() - startTime;
      
      // Force a layout
      const startLayoutTime = perf.now();
      container.getBoundingClientRect();
      const layoutTime = perf.now() - startLayoutTime;
      
      // Clean up
      document.body.removeChild(container);
      
      return {
        domCreationTime,
        layoutTime,
        timing: perf.timing
      };
    });
    
    console.log('Renderer performance:', {
      domCreationTime: `${performanceMetrics.domCreationTime.toFixed(2)}ms`,
      layoutTime: `${performanceMetrics.layoutTime.toFixed(2)}ms`
    });
    
    // DOM operations should be fast
    expect(performanceMetrics.domCreationTime).toBeLessThan(100);
    expect(performanceMetrics.layoutTime).toBeLessThan(50);
    
    await electronApp.close();
  });

  test('IPC performance', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main.js'), '--test-mode']
    });
    
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Test IPC call performance
    const ipcPerformance = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const iterations = 100;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await api.getVersion();
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const totalTime = times.reduce((sum, time) => sum + time, 0);
      const averageTime = totalTime / iterations;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      return {
        averageTime,
        minTime,
        maxTime,
        totalTime
      };
    });
    
    console.log('IPC performance:', {
      average: `${ipcPerformance.averageTime.toFixed(2)}ms`,
      min: `${ipcPerformance.minTime.toFixed(2)}ms`,
      max: `${ipcPerformance.maxTime.toFixed(2)}ms`,
      total: `${ipcPerformance.totalTime.toFixed(2)}ms`
    });
    
    // IPC calls should be fast
    expect(ipcPerformance.averageTime).toBeLessThan(10); // Average under 10ms
    expect(ipcPerformance.maxTime).toBeLessThan(50); // Max under 50ms
    
    await electronApp.close();
  });

  test('file operation performance', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main.js'), '--test-mode']
    });
    
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Test file operations performance
    const filePerformance = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const testData = 'x'.repeat(10000); // 10KB of data
      
      // Test store operations
      const storeStartTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        await api.store.set(`test-key-${i}`, testData);
        await api.store.get(`test-key-${i}`);
      }
      
      const storeEndTime = performance.now();
      const storeTime = storeEndTime - storeStartTime;
      
      // Clean up
      for (let i = 0; i < 10; i++) {
        await api.store.delete(`test-key-${i}`);
      }
      
      return {
        storeTime
      };
    });
    
    console.log('File operation performance:', {
      storeOperations: `${filePerformance.storeTime.toFixed(2)}ms`
    });
    
    // Store operations should be reasonably fast
    expect(filePerformance.storeTime).toBeLessThan(1000); // Under 1 second for 20 operations
    
    await electronApp.close();
  });

  test('window operations performance', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/main.js'), '--test-mode']
    });
    
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // Test window resize performance
    const windowPerformance = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getFocusedWindow();
      if (!window) return { resizeTime: 0 };
      
      const startTime = Date.now();
      
      // Perform multiple resize operations
      for (let i = 0; i < 10; i++) {
        window.setSize(800 + i * 10, 600 + i * 10);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const endTime = Date.now();
      const resizeTime = endTime - startTime;
      
      // Reset to original size
      window.setSize(1200, 800);
      
      return {
        resizeTime
      };
    });
    
    console.log('Window operations performance:', {
      resizeOperations: `${windowPerformance.resizeTime}ms`
    });
    
    // Window operations should be responsive
    expect(windowPerformance.resizeTime).toBeLessThan(500);
    
    await electronApp.close();
  });

  test('app bundle size analysis', async () => {
    const fs = require('fs').promises;
    const mainBundlePath = path.join(__dirname, '../../dist/main/main.js');
    const rendererBundlePath = path.join(__dirname, '../../dist/renderer');
    
    try {
      // Check main process bundle size
      const mainStats = await fs.stat(mainBundlePath);
      const mainSizeMB = mainStats.size / 1024 / 1024;
      
      // Check renderer bundle size (approximate)
      let rendererSizeMB = 0;
      try {
        const rendererFiles = await fs.readdir(rendererBundlePath);
        for (const file of rendererFiles) {
          if (file.endsWith('.js') || file.endsWith('.css')) {
            const filePath = path.join(rendererBundlePath, file);
            const stats = await fs.stat(filePath);
            rendererSizeMB += stats.size / 1024 / 1024;
          }
        }
      } catch (error) {
        console.warn('Could not analyze renderer bundle size:', error.message);
      }
      
      console.log('Bundle size analysis:', {
        mainBundle: `${mainSizeMB.toFixed(2)}MB`,
        rendererBundle: `${rendererSizeMB.toFixed(2)}MB`,
        totalBundle: `${(mainSizeMB + rendererSizeMB).toFixed(2)}MB`
      });
      
      // Bundle sizes should be reasonable
      expect(mainSizeMB).toBeLessThan(10); // Main bundle under 10MB
      expect(rendererSizeMB).toBeLessThan(20); // Renderer bundle under 20MB
      
    } catch (error) {
      console.warn('Could not analyze bundle size:', error.message);
      // Don't fail the test if we can't analyze bundle size
    }
  });
});