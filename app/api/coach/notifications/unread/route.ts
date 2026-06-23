import { getAuthedProfile } from '@/lib/actions-utils'
import { NextResponse } from 'next/server'

export async function GET() {
  const authed = await getAuthedProfile()

  if (!authed) {
    return NextResponse.json({ count: 0 }, { status: 401 })
  }
  const { supabase, user } = authed

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ count: 0 }, { status: 403 })
  }
  
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)
    
  if (error) {
    return NextResponse.json({ count: 0, error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { count: count ?? 0 },
    {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      },
    }
  )
}
