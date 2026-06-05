import * as Sentry from '@sentry/nextjs'

// Server + edge runtime initialization. Enabled once SENTRY_DSN is set.
export async function register() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      // 100% tracing was wasteful/expensive in production; sample down in prod, full in dev.
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    })
  }
}

// Captures errors thrown in Server Components, Route Handlers, and middleware (Next 15+).
// Previously these were invisible — only manually-caught server errors were reported.
export const onRequestError = Sentry.captureRequestError
