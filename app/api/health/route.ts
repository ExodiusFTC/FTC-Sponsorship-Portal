import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import crypto from 'crypto'

function isAuthorizedDeepProbe(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice('Bearer '.length)
  const expectedToken = env.CRON_SECRET
  if (!expectedToken || token.length !== expectedToken.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const deep = searchParams.get('deep') === 'db'

  if (!deep) {
    // Public liveness check only.
    return NextResponse.json({ ok: true, service: 'up' })
  }

  if (!isAuthorizedDeepProbe(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw error
    return NextResponse.json({ ok: true, service: 'up', db: 'ok' })
  } catch (error) {
    console.error('[health] deep probe failed', error)
    return NextResponse.json({ ok: false, service: 'up', db: 'error' }, { status: 503 })
  }
}
