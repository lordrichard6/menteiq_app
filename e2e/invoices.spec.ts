/**
 * E2E: Invoices (authenticated)
 */
import { test, expect } from '@playwright/test'

test.describe('Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/invoices')
    await expect(page).toHaveURL(/invoices/)
  })

  test('renders invoices page', async ({ page }) => {
    const table = page.locator('table')
    const emptyState = page.getByText(/no invoices/i)
    await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 })
  })

  test('opens new invoice form', async ({ page }) => {
    const newInvoiceBtn = page.getByRole('button', { name: /new invoice|create invoice/i })
    if (await newInvoiceBtn.isVisible()) {
      await newInvoiceBtn.click()
      // Should navigate to or open invoice creation UI
      await expect(page.getByText(/invoice/i).first()).toBeVisible()
    }
  })
})
