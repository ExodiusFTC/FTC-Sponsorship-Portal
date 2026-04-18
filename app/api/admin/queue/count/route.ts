import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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

  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ count: count ?? 0 })
}
