import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MfaChallengeForm } from '@/components/auth/mfa-challenge-form'

export default async function MfaChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  // Already at aal2 — nothing to do
  if (aal?.currentLevel === 'aal2') {
    const { next } = await searchParams
    redirect(next ?? '/admin')
  }

  // Not enrolled yet (admin hasn't set up TOTP) — send to enroll
  if (!aal?.nextLevel || aal.nextLevel === 'aal1') {
    redirect('/admin/security?setup=1')
  }

  const { next } = await searchParams

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Two-factor authentication</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
        </div>
        <MfaChallengeForm next={next ?? '/admin'} />
      </div>
    </div>
  )
}
