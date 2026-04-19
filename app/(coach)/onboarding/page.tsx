import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/team/onboarding-form'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, coach_verified')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'sponsor') {
    redirect('/sponsor/dashboard')
  }

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  if (!profile) {
    redirect('/login')
  }

  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingTeam?.id) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-12">
      <OnboardingForm isVerified={profile.coach_verified || false} />
    </div>
  )
}
