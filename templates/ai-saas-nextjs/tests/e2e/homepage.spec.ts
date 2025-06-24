import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load and display main sections', async ({ page }) => {
    await page.goto('/')
    
    // Check page title
    await expect(page).toHaveTitle(/AI SaaS Platform/)
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Transform Your Business')
    
    // Check call-to-action buttons are present
    await expect(page.getByRole('link', { name: /start free trial/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /watch demo/i })).toBeVisible()
    
    // Check main sections are present
    await expect(page.locator('text=Powerful AI Features')).toBeVisible()
    await expect(page.locator('text=Simple, Transparent Pricing')).toBeVisible()
    await expect(page.locator('text=Ready to Transform Your Business?')).toBeVisible()
  })
  
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check that content is properly displayed on mobile
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('link', { name: /start free trial/i })).toBeVisible()
  })
  
  test('should navigate to signup when CTA clicked', async ({ page }) => {
    await page.goto('/')
    
    // Click on the main CTA button
    await page.getByRole('link', { name: /start free trial/i }).first().click()
    
    // Should navigate to signup page
    await expect(page).toHaveURL(/\/auth\/signup/)
  })
  
  test('should have proper SEO meta tags', async ({ page }) => {
    await page.goto('/')
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /AI-powered SaaS platform/)
    
    // Check keywords
    const metaKeywords = page.locator('meta[name="keywords"]')
    await expect(metaKeywords).toHaveAttribute('content', /AI/)
    
    // Check OpenGraph tags
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /AI SaaS Platform/)
  })
  
  test('should load without accessibility violations', async ({ page }) => {
    await page.goto('/')
    
    // Basic accessibility checks
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[role="button"], button')).toHaveCount(4) // Should have proper button roles
    
    // Check for alt text on important images
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i)
      const alt = await image.getAttribute('alt')
      if (alt !== null) {
        expect(alt.length).toBeGreaterThan(0)
      }
    }
  })
  
  test('should handle dark mode toggle', async ({ page }) => {
    await page.goto('/')
    
    // Check if dark mode toggle exists and works
    const darkModeToggle = page.locator('[data-testid="theme-toggle"]')
    
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click()
      
      // Check if dark class is applied
      const html = page.locator('html')
      await expect(html).toHaveClass(/dark/)
      
      // Toggle back to light mode
      await darkModeToggle.click()
      await expect(html).not.toHaveClass(/dark/)
    }
  })
  
  test('should display pricing plans correctly', async ({ page }) => {
    await page.goto('/')
    
    // Scroll to pricing section
    await page.locator('text=Simple, Transparent Pricing').scrollIntoViewIfNeeded()
    
    // Check that all pricing plans are displayed
    await expect(page.locator('text=Starter')).toBeVisible()
    await expect(page.locator('text=Professional')).toBeVisible()
    await expect(page.locator('text=Enterprise')).toBeVisible()
    
    // Check pricing display
    await expect(page.locator('text=$29')).toBeVisible()
    await expect(page.locator('text=$99')).toBeVisible()
    await expect(page.locator('text=$299')).toBeVisible()
  })
  
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })
})