import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SponsorDashboardShell } from '@/components/sponsor/dashboard-shell'

export default async function SponsorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, sponsors(*)')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'sponsor' || !profile.sponsor_id) {
    redirect('/dashboard')
  }

  // Fetch submissions for this sponsor
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, teams(team_name, ftc_team_number, city, state, organization)')
    .eq('sponsor_id', profile.sponsor_id)
    .order('created_at', { ascending: false })

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <SponsorDashboardShell
      sponsor={profile.sponsors}
      profile={profile}
      submissions={submissions || []}
      notifications={notifications || []}
    />
  )
}
