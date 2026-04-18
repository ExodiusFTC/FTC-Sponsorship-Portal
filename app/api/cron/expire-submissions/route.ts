import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel cron: runs daily at 02:00 UTC (configure in vercel.json)
// Flips approved submissions whose sponsor has not responded within 14 days → 'expired'.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: expired, error } = await supabase
    .from('submissions')
    .update({ status: 'expired' as never })
    .eq('status', 'approved')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('[cron] expire-submissions error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron] Expired ${expired?.length ?? 0} submissions`)
  return NextResponse.json({ expired: expired?.length ?? 0 })
}
