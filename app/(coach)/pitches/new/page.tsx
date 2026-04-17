import { PitchForm } from '@/components/pitch-builder/pitch-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NewPitchPage() {
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

  return (
    <div className="container py-8">
      <PitchForm />
    </div>
  )
}
