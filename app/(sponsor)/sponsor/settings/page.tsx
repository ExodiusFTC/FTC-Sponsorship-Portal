import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountSettings } from '@/components/account/account-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'


export default async function SponsorSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
