import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env';

// Prevent throwing in development if Upstash isn't configured yet
const isUpstashConfigured = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

// Initialize a shared Redis instance only if credentials exist
const redis = isUpstashConfigured
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Global rate limiter: 100 requests per 10 seconds.
 * Intended for use in `proxy.ts` to protect the whole app.
 */
export const globalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '10 s'),
      analytics: true,
      prefix: 'ftc_global',
    })
  : null;

/**
 * Action rate limiter: 15 requests per 1 minute.
 * Intended for use inside sensitive server actions (e.g., submitPitch).
 */
export const actionLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, '1 m'),
      analytics: true,
      prefix: 'ftc_action',
    })
  : null;

/**
 * Auth rate limiter: 5 attempts per 15 minutes.
 * Stricter window applied specifically to sign-in and sign-up to resist credential stuffing.
 */
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ftc_auth',
    })
  : null;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; limit: number }

/**
 * Utility function to check limits inside server actions.
 * If Upstash isn't configured (e.g., local dev without keys), it bypasses the limit.
 */
function failClosedOrPass(label: string): RateLimitResult {
  if (process.env.NODE_ENV === 'production') {
    console.error(`[rate-limit] ${label} unavailable — rejecting (fail-closed)`);
    return { ok: false, retryAfterSeconds: 60, limit: 0 };
  }
  console.warn(`[rate-limit] ${label} unavailable — passing through (dev only)`);
  return { ok: true };
}

export async function checkActionLimit(identifier: string = 'anonymous'): Promise<RateLimitResult> {
  if (!actionLimiter) return failClosedOrPass('actionLimiter');
  const res = await actionLimiter.limit(identifier);
  if (res.success) {
    return { ok: true };
  }
  const retryAfterSeconds = Math.ceil((res.reset - Date.now()) / 1000);
  return { ok: false, retryAfterSeconds: Math.max(0, retryAfterSeconds), limit: res.limit };
}

/**
 * Stricter check for authentication endpoints (sign-in, sign-up).
 * Keys off email+IP to resist both single-origin and distributed stuffing.
 */
export async function checkAuthLimit(identifier: string): Promise<RateLimitResult> {
  if (!authLimiter) return failClosedOrPass('authLimiter');
  const res = await authLimiter.limit(identifier);
  if (res.success) {
    return { ok: true };
  }
  const retryAfterSeconds = Math.ceil((res.reset - Date.now()) / 1000);
  return { ok: false, retryAfterSeconds: Math.max(0, retryAfterSeconds), limit: res.limit };
}
