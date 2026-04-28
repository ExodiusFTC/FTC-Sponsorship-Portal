import { PortfolioForm } from '@/components/portfolio-builder/portfolio-form'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export default async function EditSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .eq('team_id', team.id)
    .single()

  if (!submission) notFound()

  // We should only show feedback if it exists (assuming we add feedback to submissions table, wait, submissions doesn't have feedback in 0008, only status).
  // Wait, let's just render the form.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allSponsors } = await (supabase as any)
    .from('v_sponsors_public')
    .select('id, company_name, status, funding_cap_cents, funding_used_cents')
    .eq('status', 'active')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sponsors = allSponsors?.filter((s: any) => s.funding_cap_cents > s.funding_used_cents || s.id === submission.sponsor_id) ?? []

  return (
    <div className="container mx-auto py-8 space-y-6">
      <PortfolioForm initialSubmission={submission} sponsors={sponsors} />
    </div>
  )
}
