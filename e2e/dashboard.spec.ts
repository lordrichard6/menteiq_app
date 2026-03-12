/**
 * E2E: Dashboard (authenticated)
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('redirects to login when unauthenticated', async ({ browser }) => {
    // Fresh context with no auth state
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
    await ctx.close()
  })

  test('loads dashboard for authenticated user', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/dashboard/)

    // Sidebar navigation should be visible
    await expect(page.locator('nav[aria-label="Main menu"]')).toBeVisible()
  })

  test('sidebar navigation links work', async ({ page }) => {
    await page.goto('/dashboard')

    // Navigate to contacts
    await page.getByRole('link', { name: /contacts/i }).first().click()
    await expect(page).toHaveURL(/contacts/, { timeout: 10_000 })
  })
})
