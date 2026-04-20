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
 * Action rate limiter: 5 requests per 1 minute.
 * Intended for use inside sensitive server actions (e.g., signup, login, submitPitch).
 */
export const actionLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, '1 m'),
      analytics: true,
      prefix: 'ftc_action',
    })
  : null;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; limit: number }

/**
 * Utility function to check limits inside server actions.
 * If Upstash isn't configured (e.g., local dev without keys), it bypasses the limit.
 */
export async function checkActionLimit(identifier: string = 'anonymous'): Promise<RateLimitResult> {
  if (!actionLimiter) return { ok: true };
  const res = await actionLimiter.limit(identifier);
  if (res.success) {
    return { ok: true };
  }
  const retryAfterSeconds = Math.ceil((res.reset - Date.now()) / 1000);
  return { ok: false, retryAfterSeconds: Math.max(0, retryAfterSeconds), limit: res.limit };
}
