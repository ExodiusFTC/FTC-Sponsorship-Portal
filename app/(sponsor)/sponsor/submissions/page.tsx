import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SponsorSubmissionsList } from '@/components/sponsor/submissions-list'

export default async function SponsorSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('sponsor_id')
    .eq('id', user.id)
    .single()

  if (!profile?.sponsor_id) redirect('/dashboard')

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, teams(team_name, ftc_team_number, city, state)')
    .eq('sponsor_id', profile.sponsor_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sponsorship Requests</h1>
          <p className="text-muted-foreground mt-1">Review and manage all incoming team pitches.</p>
        </div>
      </div>

      <SponsorSubmissionsList submissions={submissions ?? []} />
    </div>
  )
}
