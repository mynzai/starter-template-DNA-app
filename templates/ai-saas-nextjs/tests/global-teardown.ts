import fs from 'fs'
import path from 'path'

async function globalTeardown() {
  console.log('🧹 Starting test cleanup...')
  
  // Clean up test files
  const authStatePath = path.join(__dirname, 'auth-state.json')
  if (fs.existsSync(authStatePath)) {
    fs.unlinkSync(authStatePath)
    console.log('🗑️ Removed authentication state file')
  }
  
  // Clean up test database if needed
  if (process.env.NODE_ENV === 'test') {
    console.log('🗄️ Cleaning up test database...')
    // Add database cleanup logic here
  }
  
  // Clean up any uploaded test files
  const testUploadsPath = path.join(__dirname, '../public/test-uploads')
  if (fs.existsSync(testUploadsPath)) {
    fs.rmSync(testUploadsPath, { recursive: true, force: true })
    console.log('📁 Cleaned up test uploads')
  }
  
  console.log('✅ Global teardown complete')
}

export default globalTeardown