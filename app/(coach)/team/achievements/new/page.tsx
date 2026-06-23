import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { AchievementForm } from '@/components/team/achievement-form'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function NewAchievementPage() {
  const authed = await getAuthedProfile()

  if (!authed) redirect('/login')
  const { supabase, user } = authed

  const { data: team } = await supabase
    .from('teams')
    .select('id, team_name')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!team) redirect('/awaiting-verification')

  return (
    <div className="container mx-auto max-w-xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Add Achievement</h1>
          <p className="text-muted-foreground">{team.team_name}</p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          ← Back
        </Link>
      </div>
      <AchievementForm teamId={team.id} />
    </div>
  )
}
