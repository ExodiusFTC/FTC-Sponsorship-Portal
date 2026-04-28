import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { MfaSetupPanel } from '@/components/admin/mfa-setup-panel'

export const dynamic = 'force-dynamic'

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const enrolledFactor = factors?.totp?.[0] ?? null

  const { setup } = await searchParams

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Security"
        subtitle="Manage two-factor authentication for your admin account."
      />
      <MfaSetupPanel
        isEnrolled={!!enrolledFactor}
        factorId={enrolledFactor?.id ?? null}
        currentAal={aal?.currentLevel ?? 'aal1'}
        autoStartSetup={setup === '1'}
      />
    </div>
  )
}
