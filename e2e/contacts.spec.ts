/**
 * E2E: Contacts (authenticated)
 */
import { test, expect } from '@playwright/test'

test.describe('Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contacts')
    await expect(page).toHaveURL(/contacts/)
  })

  test('renders contacts page with table', async ({ page }) => {
    // Page should have a table or empty state
    const table = page.locator('table')
    const emptyState = page.getByText(/no contacts/i)
    await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 })
  })

  test('opens Add Contact dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add contact/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('closes Add Contact dialog on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /add contact/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Click cancel or close
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 })
  })

  test('can search contacts', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('test@example.com')
      // Table should update — just verify no crash
      await page.waitForTimeout(500)
      await expect(page.locator('table').or(page.getByText(/no contacts/i))).toBeVisible()
    }
  })
})
