import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ count: 0 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ count: 0 }, { status: 403 })
  }
  
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'planned', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)
    
  return NextResponse.json(
    { count: count ?? 0 },
    {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      },
    }
  )
}
