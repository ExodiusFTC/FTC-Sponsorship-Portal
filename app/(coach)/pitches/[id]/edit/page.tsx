import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PitchForm } from '@/components/pitch-builder/pitch-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default async function EditPitchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!team) redirect('/onboarding')

  const { data: pitch } = await supabase
    .from('pitches')
    .select('id, title, summary, cost_explanation, line_items, financial_ask_cents, media_urls, status, admin_feedback')
    .eq('id', id)
    .eq('team_id', team.id)
    .single()

  if (!pitch) notFound()

  const showFeedback =
    pitch.admin_feedback &&
    (pitch.status === 'changes_requested' || pitch.status === 'rejected')

  return (
    <div className="container py-8 space-y-4">
      {showFeedback && (
        <Alert variant={pitch.status === 'rejected' ? 'destructive' : 'default'}>
          <AlertTitle>
            {pitch.status === 'rejected' ? 'Pitch Rejected' : 'Changes Requested by Admin'}
          </AlertTitle>
          <AlertDescription className="mt-1 whitespace-pre-wrap">
            {pitch.admin_feedback}
          </AlertDescription>
        </Alert>
      )}
      <PitchForm initialPitch={pitch} />
    </div>
  )
}
