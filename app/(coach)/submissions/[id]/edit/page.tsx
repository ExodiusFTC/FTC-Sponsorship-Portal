import { PortfolioForm } from '@/components/portfolio-builder/portfolio-form'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { InfoIcon, AlertTriangle } from 'lucide-react'

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
    .single()

  if (!team) {
    redirect('/onboarding')
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

  const { data: allSponsors } = await supabase
    .from('sponsors')
    .select('id, company_name, status, funding_cap_cents, funding_used_cents')
    .eq('status', 'active')

  const sponsors = allSponsors?.filter((s) => s.funding_cap_cents > s.funding_used_cents || s.id === submission.sponsor_id) ?? []

  return (
    <div className="container py-8 space-y-6">
      <PortfolioForm initialSubmission={submission} sponsors={sponsors} />
    </div>
  )
}
