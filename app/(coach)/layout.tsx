import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { CoachTour } from '@/components/coach/coach-tour'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, coach_verified')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')
  if (profile?.role === 'sponsor') redirect('/sponsor/dashboard')
  if (profile?.role === 'coach' && !profile.coach_verified) {
    redirect('/awaiting-verification')
  }

  return (
    <AppLayout>
      {children}
      <CoachTour />
    </AppLayout>
  )
}
