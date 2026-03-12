/**
 * Global Playwright setup: authenticate once and save state.
 * All subsequent tests reuse this state via storageState.
 *
 * Requires env vars:
 *   E2E_TEST_EMAIL    — a real test account email
 *   E2E_TEST_PASSWORD — the password for that account
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.playwright/auth.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD environment variables. ' +
      'Create a test account in Supabase and set these vars before running E2E tests.'
    )
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  await expect(page).toHaveURL(/dashboard/)

  // Save authenticated browser state
  await page.context().storageState({ path: authFile })
})
