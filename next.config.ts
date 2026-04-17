import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // withSentryConfig wraps this once SENTRY_DSN is set in .env.local
  // See instrumentation.ts for initialization
};

export default nextConfig;
