import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionRejectionSummary } from '@/components/coach/submission-rejection-summary'
import { DashboardShell } from '@/components/coach/dashboard-shell'

export default async function DashboardPage() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submissions } = await (supabase as any)
    .from('v_submission_summary')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissionsWithFeedback = (submissions as any)?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.status === 'declined' || s.status === 'changes_requested'
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activePitches = (submissions as any)?.filter((s: any) => s.status === 'pending' || s.status === 'approved').length ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalFunded = (submissions as any)?.filter((s: any) => s.status === 'approved').length ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalized = ((submissions as any) ?? []).map((s: any) => ({
    id: s.id,
    company_name: s.company_name,
    status: s.status,
    updated_at: s.updated_at,
  }))

  return (
    <DashboardShell
      teamName={team.team_name}
      teamNumber={team.status === 'existing' ? team.ftc_team_number : null}
      city={team.city ?? ''}
      state={team.state ?? ''}
      organization={team.organization}
      portfolioAsk={team.financial_ask_cents || 0}
      submissions={normalized}
      activePitches={activePitches}
      totalFunded={totalFunded}
    >
      {submissionsWithFeedback && submissionsWithFeedback.length > 0 ? (
        <div className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {submissionsWithFeedback.map((s: any) => (
            <SubmissionRejectionSummary key={s.id} submission={{ ...s, sponsor_name: s.company_name }} />
          ))}
        </div>
      ) : null}
    </DashboardShell>
  )
}
