import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */

// Security headers — enforced CSP (was report-only). unsafe-eval stripped in production.
// Source of truth: projects/shared/security-headers.ts — mirrored here for .mjs compatibility.
const isDev = process.env.NODE_ENV === 'development';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },          // allows portal iframes same-domain
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',   // promoted from report-only
    value: [
      "default-src 'self'",
      // unsafe-eval only in dev (Next.js HMR); removed in production builds
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://fonts.googleapis.com`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.resend.com https://api.stripe.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
      "frame-src https://js.stripe.com",   // Stripe Checkout + Elements
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactCompiler: true,
  // pdf-parse v1 tries to read a test file at module load time; exclude from bundling
  // so Node.js resolves it natively (where the test file check is skipped in production)
  serverExternalPackages: ['pdf-parse'],
  experimental: {
    // Chat file uploads: up to 3 × 5 MB files → ~20 MB base64-encoded body
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation + project (set in env or here)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? 'menteiq',

  // Suppress Sentry build output
  silent: !process.env.CI,

  // Upload source maps in production builds only
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },

  // Disable Sentry SDK tree-shaking opt-in features we don't use
  disableLogger: true,
});
