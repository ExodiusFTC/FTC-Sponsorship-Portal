import { z } from 'zod'

const envSchema = z.object({
  // Supabase (public)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Supabase (server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Resend
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  // Upstash — optional until rate-limiting is wired up (no format check so placeholders are OK)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  // Sentry (optional — only required in production)
  SENTRY_DSN: z.string().url().optional(),
})

// In development, missing vars warn instead of crashing.
// In production (VERCEL=1), missing vars throw at startup.
function parseEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ')
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing}`)
    }
    console.warn(`[env] Missing variables (OK in dev): ${missing}`)
    // Return partial object for dev — individual fields will be undefined
    return process.env as unknown as z.infer<typeof envSchema>
  }
  return result.data
}

export const env = parseEnv()
