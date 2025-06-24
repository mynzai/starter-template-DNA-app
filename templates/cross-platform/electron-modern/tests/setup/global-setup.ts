import { FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

let electronProcess: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Electron test setup...');
  
  // Clean up previous test artifacts
  await cleanupTestArtifacts();
  
  // Build the application for testing
  await buildApplication();
  
  // Start Electron in test mode
  await startElectronForTesting();
  
  console.log('✅ Electron test setup completed');
  
  return async () => {
    console.log('🧹 Cleaning up Electron test environment...');
    await stopElectronProcess();
    console.log('✅ Cleanup completed');
  };
}

async function cleanupTestArtifacts(): Promise<void> {
  const testResultsDir = path.join(__dirname, '../../test-results');
  
  try {
    await fs.rm(testResultsDir, { recursive: true, force: true });
    await fs.mkdir(testResultsDir, { recursive: true });
    console.log('🧹 Cleaned up previous test artifacts');
  } catch (error) {
    console.warn('⚠️ Could not clean up test artifacts:', error.message);
  }
}

async function buildApplication(): Promise<void> {
  console.log('🔨 Building application for testing...');
  
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe'
    });
    
    let buildOutput = '';
    let buildError = '';
    
    buildProcess.stdout?.on('data', (data) => {
      buildOutput += data.toString();
    });
    
    buildProcess.stderr?.on('data', (data) => {
      buildError += data.toString();
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Application built successfully');
        resolve();
      } else {
        console.error('❌ Build failed:');
        console.error(buildError);
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    
    // Timeout after 2 minutes
    setTimeout(() => {
      buildProcess.kill();
      reject(new Error('Build timeout after 2 minutes'));
    }, 120000);
  });
}

async function startElectronForTesting(): Promise<void> {
  console.log('🚀 Starting Electron process for testing...');
  
  const electronPath = require('electron') as string;
  const mainPath = path.join(__dirname, '../../dist/main/main.js');
  
  // Check if main.js exists
  try {
    await fs.access(mainPath);
  } catch (error) {
    throw new Error(`Main process file not found: ${mainPath}`);
  }
  
  return new Promise((resolve, reject) => {
    electronProcess = spawn(electronPath, [
      mainPath,
      '--test-mode',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-insecure-localhost'
    ], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: '1',
        ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
      }
    });
    
    let startupOutput = '';
    let startupError = '';
    
    electronProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      
      // Check for successful startup
      if (output.includes('App is ready') || output.includes('Navigation ready')) {
        console.log('✅ Electron process started successfully');
        resolve();
      }
    });
    
    electronProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      startupError += error;
      
      // Log warnings but don't fail on them
      if (!error.includes('Warning:') && !error.includes('deprecated')) {
        console.error('Electron stderr:', error);
      }
    });
    
    electronProcess.on('error', (error) => {
      console.error('❌ Failed to start Electron process:', error);
      reject(error);
    });
    
    electronProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.error(`❌ Electron process exited with code ${code}`);
        console.error('Startup output:', startupOutput);
        console.error('Startup error:', startupError);
        reject(new Error(`Electron process exited with code ${code}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (electronProcess && !electronProcess.killed) {
        electronProcess.kill();
        reject(new Error('Electron startup timeout after 30 seconds'));
      }
    }, 30000);
  });
}

async function stopElectronProcess(): Promise<void> {
  if (electronProcess && !electronProcess.killed) {
    console.log('🛑 Stopping Electron process...');
    
    return new Promise((resolve) => {
      electronProcess!.on('exit', () => {
        console.log('✅ Electron process stopped');
        resolve();
      });
      
      // Try graceful shutdown first
      electronProcess!.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (electronProcess && !electronProcess.killed) {
          electronProcess.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    });
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await stopElectronProcess();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopElectronProcess();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception in global setup:', error);
  await stopElectronProcess();
  process.exit(1);
});

export default globalSetup;