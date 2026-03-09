import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Replay configuration for Session Replay
  integrations: [
    Sentry.replayIntegration({
      // Block all text and media from being captured in replays (GDPR)
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture Replays only in production (sampling)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  environment: process.env.NODE_ENV,
})
