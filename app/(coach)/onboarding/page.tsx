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
    .select('coach_verified')
    .eq('id', user.id)
    .single()

  return (
    <div className="container mx-auto py-12">
      <OnboardingForm isVerified={profile.coach_verified} />
    </div>
  )
}
