import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { env } from '@/lib/env'
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
    const { data: expired, error } = await supabase
      .from('submissions')
      .update({ status: 'expired' as never })
      .eq('status', 'approved')
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      console.error('[cron] expire-submissions error', error)
      Sentry.captureException(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Clean up expired access tokens (H9)
    const { error: cleanupError } = await supabase
      .from('submission_access_tokens')
      .delete()
      .lt('expires_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      
    if (cleanupError) {
      console.error('[cron] cleanup-tokens error', cleanupError)
      Sentry.captureException(cleanupError)
    }

    console.log(`[cron] Expired ${expired?.length ?? 0} submissions`)
    return NextResponse.json({ expired: expired?.length ?? 0 })
  } catch (err) {
    console.error('[cron] unhandled error', err)
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
