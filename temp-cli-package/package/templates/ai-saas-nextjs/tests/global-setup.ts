import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Start with environment setup
  console.log('🚀 Setting up test environment...')
  
  // Initialize test database if needed
  if (process.env.NODE_ENV === 'test') {
    console.log('📦 Initializing test database...')
    // Add database setup logic here
  }
  
  // Pre-authenticate users for tests that need authentication
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Create authenticated session for tests
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000')
    
    // Store authentication state for reuse in tests
    await page.context().storageState({ path: 'tests/auth-state.json' })
    
    console.log('✅ Test authentication state saved')
  } catch (error) {
    console.warn('⚠️ Could not set up authentication state:', error)
  } finally {
    await browser.close()
  }
  
  console.log('✅ Global setup complete')
}

export default globalSetup