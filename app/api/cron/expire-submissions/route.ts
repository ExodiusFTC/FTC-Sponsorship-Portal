import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { env } from '@/lib/env'
import { touchRedisKeepAlive } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'

// Vercel cron: runs daily at 02:00 UTC (configure in vercel.json)
// Flips approved submissions whose sponsor has not responded within 14 days → 'expired'.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const token = authHeader.split(' ')[1]
  const expectedToken = env.CRON_SECRET

  // Prevent timing attacks and empty expectedToken comparison
  try {
    if (
      !expectedToken ||
      token.length !== expectedToken.length ||
      !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    // Expire only the awaiting-sponsor states (dispatched/delivered/opened) and release
    // each reservation back to the sponsor's cap. Funded ('approved') rows are never
    // touched — the release RPC is guarded to live states only. (Fixes C-2.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: expireResult, error } = await (supabase as any).rpc('expire_overdue_submissions')

    if (error) {
      console.error('[cron] expire-submissions error', error)
      Sentry.captureException(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const expiredCount = (expireResult as { expired?: number } | null)?.expired ?? 0

    // Clean up long-expired access tokens (30-day grace).
    const { error: cleanupError } = await supabase
      .from('submission_access_tokens')
      .delete()
      .lt('expires_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (cleanupError) {
      console.error('[cron] cleanup-tokens error', cleanupError)
      Sentry.captureException(cleanupError)
    }

    // Keep Upstash Redis active — one daily request prevents 14-day inactivity
    // archival. Non-fatal: a failed ping must never fail the expiry job.
    const redisAlive = await touchRedisKeepAlive()

    console.log(`[cron] Expired ${expiredCount} submissions (redis keep-alive: ${redisAlive})`)
    return NextResponse.json({ expired: expiredCount, redisAlive })
  } catch (err) {
    console.error('[cron] unhandled error', err)
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
