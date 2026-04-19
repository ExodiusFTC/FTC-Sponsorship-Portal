import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/coach/dashboard-shell'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: initialTab } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [
    { data: team },
    { data: profile },
    { data: sponsors },
    { count: unreadCount },
    { data: notifications },
    { data: submissions },
    { data: achievements }
  ] = await Promise.all([
    supabase.from('teams').select('*').eq('owner_id', user.id).single(),
    supabase.from('profiles').select('full_name, role, email').eq('id', user.id).single(),
    supabase.from('sponsors').select('id, company_name, industry, funding_cap_cents, funding_used_cents, website').eq('status', 'active'),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id).is('read_at', null),
    supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(50),
    (supabase as any).from('v_submission_summary').select('*').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('team_achievements').select('*').order('season', { ascending: false })
  ])

  if (profile?.role === 'sponsor') {
    redirect('/sponsor/dashboard')
  }

  if (!team) {
    redirect('/onboarding')
  }

  // Filter achievements by team_id just in case
  const teamAchievements = achievements?.filter(a => a.team_id === team.id) || []

  return (
    <DashboardShell
      team={team as any}
      profile={profile as any}
      sponsors={sponsors as any ?? []}
      notifications={notifications as any ?? []}
      unreadCount={unreadCount ?? 0}
      submissions={submissions as any ?? []}
      achievements={teamAchievements as any}
      initialTab={initialTab}
    />
  )
}
