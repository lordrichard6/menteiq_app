/**
 * Structured logger for MenteIQ.
 *
 * - Development:  logs to console as-is.
 * - Production:   logs to console AND sends errors/warnings to Sentry
 *                 so they appear in the Sentry dashboard without needing
 *                 to manually hunt server logs.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.error('Failed to fetch contacts', { error, userId })
 *   logger.warn('Rate limit approaching', { remaining })
 *   logger.info('Invoice generated', { invoiceId })
 *   logger.debug('Query result', { rows: data.length })  // silenced in production
 */

import * as Sentry from '@sentry/nextjs'

const isProd = process.env.NODE_ENV === 'production'

function captureIfProd(level: 'error' | 'warning', message: string, extra?: Record<string, unknown>) {
  if (!isProd) return
  Sentry.withScope(scope => {
    scope.setLevel(level)
    if (extra) scope.setExtras(extra)
    Sentry.captureMessage(message)
  })
}

export const logger = {
  /**
   * Errors — always logged to console + sent to Sentry in production.
   * Use for unrecoverable failures, API errors, and unexpected states.
   */
  error(message: string, extra?: Record<string, unknown> | unknown): void {
    console.error(`[ERROR] ${message}`, extra ?? '')
    captureIfProd('error', message, extra && typeof extra === 'object' ? (extra as Record<string, unknown>) : { raw: String(extra) })
  },

  /**
   * Warnings — logged to console + sent to Sentry in production.
   * Use for degraded states or expected failures (rate limits, validation).
   */
  warn(message: string, extra?: Record<string, unknown> | unknown): void {
    console.warn(`[WARN] ${message}`, extra ?? '')
    captureIfProd('warning', message, extra && typeof extra === 'object' ? (extra as Record<string, unknown>) : { raw: String(extra) })
  },

  /**
   * Informational — logged to console only. Not sent to Sentry.
   * Use for significant lifecycle events (startup, auth, billing).
   */
  info(message: string, extra?: Record<string, unknown> | unknown): void {
    console.info(`[INFO] ${message}`, extra ?? '')
  },

  /**
   * Debug — only active in development. Silent in production.
   * Use liberally during development without worrying about prod noise.
   */
  debug(message: string, extra?: Record<string, unknown> | unknown): void {
    if (isProd) return
    console.log(`[DEBUG] ${message}`, extra ?? '')
  },
}
