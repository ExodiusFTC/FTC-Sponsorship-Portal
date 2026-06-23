import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { AccountSettings } from '@/components/account/account-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'


export default async function SponsorSettingsPage() {
  const authed = await getAuthedProfile()
  if (!authed) redirect('/login')
  const { supabase, user } = authed

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and company profile.</p>
      </div>

      <AccountSettings 
        currentName={profile?.full_name ?? ''} 
        email={profile?.email ?? ''} 
        role={profile?.role ?? 'sponsor'} 
      />

    </div>
  )
}
