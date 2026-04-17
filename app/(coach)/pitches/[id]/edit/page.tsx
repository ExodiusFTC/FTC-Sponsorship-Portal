import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PitchForm } from '@/components/pitch-builder/pitch-form'

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
    .select('id, title, summary, cost_explanation, line_items, financial_ask_cents, media_urls, status')
    .eq('id', id)
    .eq('team_id', team.id)
    .single()

  if (!pitch) notFound()

  return (
    <div className="container py-8">
      <PitchForm initialPitch={pitch} />
    </div>
  )
}
