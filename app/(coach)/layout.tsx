import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const authed = await getAuthedProfile()
  if (!authed) redirect('/login')
  const { supabase, user } = authed

  const { data: profile } = await supabase.from('profiles').select('role, coach_verified').eq('id', user.id).single()
  if (profile?.role === 'admin') redirect('/admin')
  if (profile?.role === 'sponsor') redirect('/sponsor/dashboard')
  if (profile?.role === 'coach' && !profile.coach_verified) redirect('/awaiting-verification')

  return <AppLayout>{children}</AppLayout>
}
