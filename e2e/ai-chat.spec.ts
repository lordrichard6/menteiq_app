/**
 * E2E: AI Chat (authenticated)
 */
import { test, expect } from '@playwright/test'

test.describe('AI Chat', () => {
  test('renders chat interface', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/chat/)

    // Chat input should be present
    const chatInput = page.getByRole('textbox').first()
    await expect(chatInput).toBeVisible({ timeout: 15_000 })
  })

  test('can type a message', async ({ page }) => {
    await page.goto('/chat')
    const chatInput = page.getByRole('textbox').first()
    await chatInput.waitFor({ state: 'visible', timeout: 15_000 })
    await chatInput.fill('Hello MenteIQ')
    await expect(chatInput).toHaveValue('Hello MenteIQ')
  })
})
