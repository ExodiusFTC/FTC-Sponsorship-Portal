import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountSettings } from '@/components/account/account-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

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
        currentName={profile?.full_name} 
        email={profile?.email} 
        role={profile?.role} 
      />

      <Card className="opacity-50 pointer-events-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Profile
          </CardTitle>
          <CardDescription>Update your public sponsorship listing. (Coming soon)</CardDescription>
        </CardHeader>
        <CardContent className="h-20 bg-muted/20 rounded-md m-6 flex items-center justify-center italic text-muted-foreground">
          Editable company profile is under development.
        </CardContent>
      </Card>
    </div>
  )
}
