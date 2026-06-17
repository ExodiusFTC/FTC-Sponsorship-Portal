import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { globalLimiter } from '@/lib/rate-limit'

export async function GET(req: Request) {
  // Rate limiting
  if (globalLimiter) {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await globalLimiter.limit(`admin_queue_${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ count: 0 }, { status: 403 })
  }

  const { count, error } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    return NextResponse.json({ count: 0, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
