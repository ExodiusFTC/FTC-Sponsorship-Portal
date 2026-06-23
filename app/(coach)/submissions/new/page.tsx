import { PortfolioForm } from '@/components/portfolio-builder/portfolio-form'
import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'

export default async function NewSubmissionPage({ searchParams }: { searchParams: Promise<{ sponsor?: string, reuse?: string }> }) {
  const params = await searchParams
  const authed = await getAuthedProfile()

  if (!authed) {
    redirect('/login')
  }
  const { supabase, user } = authed

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!team) {
    redirect('/awaiting-verification')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allSponsors } = await (supabase as any)
    .from('v_sponsors_public')
    .select('id, company_name, status, funding_cap_cents, funding_used_cents')
    .eq('status', 'active')

  // Filter sponsors with remaining capacity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sponsors = allSponsors?.filter((s: any) => s.funding_cap_cents > s.funding_used_cents) ?? []

  const preselectedSponsorId = params.sponsor
  
  let initialValues = undefined
  if (params.reuse) {
    const { data: sourceSub } = await supabase
      .from('submissions')
      .select('custom_pitch_alignment, specific_needs_statement, local_connection_notes')
      .eq('id', params.reuse)
      .eq('team_id', team.id)
      .single()
      
    if (sourceSub) {
      initialValues = {
        customPitchAlignment: sourceSub.custom_pitch_alignment ?? undefined,
        specificNeedsStatement: sourceSub.specific_needs_statement ?? undefined,
        localConnectionNotes: sourceSub.local_connection_notes ?? undefined,
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <PortfolioForm
        sponsors={sponsors ?? []}
        preselectedSponsorId={preselectedSponsorId}
        initialValues={initialValues}
      />
    </div>
  )
}
