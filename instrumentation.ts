export async function register() {
  // Sentry initialization — enabled once SENTRY_DSN is set in .env.local
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const { init } = await import("@sentry/nextjs")
    init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
    })
  }
}
