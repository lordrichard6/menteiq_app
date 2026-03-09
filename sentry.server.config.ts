import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Tracing — lower sample rate on server to control costs
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  environment: process.env.NODE_ENV,

  // Do not send PII to Sentry
  beforeSend(event) {
    // Strip user IP and email from error events
    if (event.user) {
      delete event.user.ip_address
      delete event.user.email
    }
    return event
  },
})
