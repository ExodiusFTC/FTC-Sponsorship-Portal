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
    .select('coach_verified, coach_credentials_url')
    .eq('id', user.id)
    .single()

  if (!profile?.coach_credentials_url) {
    redirect('/upload-credentials')
  }

  return (
    <div className="container mx-auto py-12">
      <OnboardingForm isVerified={profile.coach_verified} />
    </div>
  )
}
