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
 * Keep-alive ping for Upstash Redis.
 *
 * Upstash archives free-tier databases after 14 consecutive days with zero
 * requests. Organic traffic touches Redis via the rate limiters above, but a
 * quiet stretch (e.g. sponsorship off-season) could exceed that window. The
 * daily cron calls this to guarantee at least one request per day.
 *
 * Writes a single self-expiring key — negligible storage, no growth.
 * Returns false when Upstash isn't configured (e.g. local dev without keys).
 */
export async function touchRedisKeepAlive(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.set('ftc:keepalive', new Date().toISOString(), {
      ex: 60 * 60 * 24 * 30, // 30-day TTL — refreshed daily, self-cleaning
    });
    return true;
  } catch (err) {
    console.error('[rate-limit] keep-alive ping failed:', err);
    return false;
  }
}

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
 * Fallback when a limiter is unavailable (Upstash not configured) or a
 * `.limit()` call throws.
 *
 * ⚠️ This fails OPEN — it passes the request through in ALL environments,
 * including production. This is a deliberate availability tradeoff ("graceful
 * degradation") so a Redis outage doesn't take down auth/actions. The cost is
 * that rate limits — including auth brute-force protection — are NOT enforced
 * while Upstash is unavailable. If a security-sensitive limiter should instead
 * fail CLOSED, return `{ ok: false, retryAfterSeconds: 60, limit: 0 }` here for
 * production.
 */
function degradeOpen(label: string): RateLimitResult {
  const context = process.env.NODE_ENV === 'production' ? 'graceful degradation' : 'dev only';
  console.warn(`[rate-limit] ${label} unavailable or failed — passing through (${context})`);
  return { ok: true };
}

export async function checkActionLimit(identifier: string = 'anonymous'): Promise<RateLimitResult> {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true };
  }
  if (!actionLimiter) return degradeOpen('actionLimiter');
  try {
    const res = await actionLimiter.limit(identifier);
    if (res.success) {
      return { ok: true };
    }
    const retryAfterSeconds = Math.ceil((res.reset - Date.now()) / 1000);
    return { ok: false, retryAfterSeconds: Math.max(0, retryAfterSeconds), limit: res.limit };
  } catch (err) {
    console.error('[rate-limit] actionLimiter request failed:', err);
    return degradeOpen('actionLimiter');
  }
}

/**
 * Stricter check for authentication endpoints (sign-in, sign-up).
 * Keys off email+IP to resist both single-origin and distributed stuffing.
 */
export async function checkAuthLimit(identifier: string): Promise<RateLimitResult> {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true };
  }
  if (!authLimiter) return degradeOpen('authLimiter');
  try {
    const res = await authLimiter.limit(identifier);
    if (res.success) {
      return { ok: true };
    }
    const retryAfterSeconds = Math.ceil((res.reset - Date.now()) / 1000);
    return { ok: false, retryAfterSeconds: Math.max(0, retryAfterSeconds), limit: res.limit };
  } catch (err) {
    console.error('[rate-limit] authLimiter request failed:', err);
    return degradeOpen('authLimiter');
  }
}
