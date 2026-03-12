/**
 * E2E: Public authentication pages (no auth required)
 */
import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('renders login form with correct metadata', async ({ page }) => {
    await page.goto('/login')

    // Page title
    await expect(page).toHaveTitle(/Sign In.*MenteIQ/)

    // Form elements
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Google sign-in button
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()

    // Link to signup
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('notexist@example.com')
    await page.getByLabel('Password').fill('wrongpassword123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should stay on login page and show an error
    await expect(page).toHaveURL(/login/)
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10_000 })
  })

  test('is indexable by search engines', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.status()).toBe(200)

    // Check that robots meta tag is NOT noindex
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content')
    if (robotsMeta) {
      expect(robotsMeta).not.toContain('noindex')
    }
  })
})

test.describe('Signup page', () => {
  test('renders signup form', async ({ page }) => {
    await page.goto('/signup')

    await expect(page).toHaveTitle(/Sign Up.*MenteIQ/)
    await expect(page.getByLabel('Full Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('shows password minimum length validation', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('Full Name').fill('Test User')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('short')
    await page.getByRole('button', { name: /create account/i }).click()
    // HTML5 minLength validation prevents submit
    await expect(page).toHaveURL(/signup/)
  })
})
