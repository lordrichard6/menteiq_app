import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration for MenteIQ.
 * Tests run against the local dev server (http://localhost:3000).
 * In CI, the server is started automatically by the webServer config below.
 *
 * Auth state: most tests require authentication.
 * The global setup creates a reusable auth state saved to .playwright/auth.json.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter */
  reporter: process.env.CI ? 'github' : 'html',
  /* Shared settings for all projects */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // --- Auth Setup ---
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // --- Authenticated tests (main suite) ---
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth.json',
      },
      dependencies: ['setup'],
    },
    // --- Public page tests (no auth) ---
    {
      name: 'public',
      testMatch: /.*public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the Next.js dev server automatically during E2E runs */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
