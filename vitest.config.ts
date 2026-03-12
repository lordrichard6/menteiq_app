import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      // Only measure coverage for pure utility modules that are actually unit-testable.
      // Zustand stores, Next.js pages, tRPC routers, Supabase clients, and PDF generators
      // all require server/browser infrastructure and are covered by E2E tests instead.
      include: [
        'src/lib/format-time.ts',
        'src/lib/rate-limit.ts',
        'src/lib/utils.ts',
        'src/lib/pricing/**/*.ts',
        'src/lib/invoices/tax-rates.ts',
        'src/lib/invoices/totals.ts',
        'src/lib/validation/validators.ts',
        'src/lib/validation/contact-import.ts',
        'src/lib/validation/contact.ts',
      ],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
