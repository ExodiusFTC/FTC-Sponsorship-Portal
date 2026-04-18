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

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!team) {
    redirect('/onboarding')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('id, company_name, industry, funding_cap_cents, funding_used_cents, website')
    .eq('status', 'active')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submissions } = await (supabase as any)
    .from('v_submission_summary')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <DashboardShell
      team={team as any}
      profile={profile as any}
      sponsors={sponsors as any ?? []}
      notifications={notifications as any ?? []}
      unreadCount={unreadCount ?? 0}
      submissions={submissions as any ?? []}
      initialTab={initialTab}
    />
  )
}
