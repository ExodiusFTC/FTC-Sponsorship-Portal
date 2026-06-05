import * as Sentry from '@sentry/nextjs'

// Client-side error + performance capture. Uses a PUBLIC DSN (NEXT_PUBLIC_SENTRY_DSN) since
// this runs in the browser. Without this, client-side runtime errors were never reported.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
}

// Instruments client-side navigations so router transitions are traced.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
