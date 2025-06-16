const { notarize } = require('@electron/notarize');
const path = require('path');

async function notarizeApp(params) {
  // Only notarize the app on macOS and when running in CI
  if (process.platform !== 'darwin' || !process.env.CI) {
    console.log('Skipping notarization (not macOS or not in CI)');
    return;
  }

  // Check for required environment variables
  const requiredEnvVars = ['APPLE_ID', 'APPLE_ID_PASSWORD', 'APPLE_TEAM_ID'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Skipping notarization: Missing environment variables: ${missingVars.join(', ')}`);
    return;
  }

  console.log('Starting notarization process...');
  
  try {
    await notarize({
      tool: 'notarytool',
      appBundleId: params.appBundleId || 'com.example.modern-electron-app',
      appPath: params.appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    
    console.log('✅ Notarization completed successfully');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
}

// Export for use in electron-builder afterSign hook
module.exports = notarizeApp;

// Allow direct execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node notarize.js <app-path> [bundle-id]');
    process.exit(1);
  }
  
  const appPath = path.resolve(args[0]);
  const appBundleId = args[1] || 'com.example.modern-electron-app';
  
  notarizeApp({ appPath, appBundleId })
    .then(() => {
      console.log('Notarization script completed');
    })
    .catch((error) => {
      console.error('Notarization script failed:', error);
      process.exit(1);
    });
}