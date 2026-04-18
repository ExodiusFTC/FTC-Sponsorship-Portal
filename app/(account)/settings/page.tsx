import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { AccountSettings } from '@/components/account/account-settings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader title="Account Settings" subtitle="Manage your profile, password, and account." />
      <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <AccountSettings
          currentName={profile?.full_name ?? ''}
          email={user.email ?? ''}
          role={profile?.role ?? 'coach'}
        />
      </div>
    </div>
  )
}
