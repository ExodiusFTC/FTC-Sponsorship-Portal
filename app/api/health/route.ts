import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw error
    return NextResponse.json({ ok: true, db: 'ok' })
  } catch (err) {
    return NextResponse.json({ ok: false, db: 'error', error: String(err) }, { status: 503 })
  }
}
