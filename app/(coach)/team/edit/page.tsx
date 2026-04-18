import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamEditForm } from '@/components/team/edit-form'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function TeamEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!team) redirect('/onboarding')

  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Team Profile</h1>
          <p className="text-muted-foreground">{team.team_name}</p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          ← Back
        </Link>
      </div>
      <TeamEditForm team={team} />
    </div>
  )
}
