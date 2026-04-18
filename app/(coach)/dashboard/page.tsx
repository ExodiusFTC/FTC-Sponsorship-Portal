import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { SubmissionRejectionSummary } from '@/components/coach/submission-rejection-summary'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null // Handled by layout

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!team) {
    redirect('/onboarding')
  }

  const { data: achievements } = await supabase
    .from('team_achievements')
    .select('*')
    .eq('team_id', team.id)

  const { data: submissions } = await (supabase as any)
    .from('v_submission_summary')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const submissionsWithFeedback = (submissions as any)?.filter(
    (s: any) => s.status === 'declined' || s.status === 'changes_requested'
  )

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{team.team_name}</h1>
          <p className="text-muted-foreground">
            {team.status === 'existing' ? `FTC Team #${team.ftc_team_number}` : 'Incubator Team'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/submissions/new" className={buttonVariants({ variant: 'default' })}>
            Submit Portfolio
          </Link>
          <Link href="/team/edit" className={buttonVariants({ variant: 'outline' })}>
            Edit Portfolio
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Mission Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{team.mission_statement}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>Season highlights and awards.</CardDescription>
              </div>
              <Link href="/team/achievements/new" className={buttonVariants({ size: 'sm' })}>
                Add Achievement
              </Link>
            </CardHeader>
            <CardContent>
              {achievements && achievements.length > 0 ? (
                <div className="space-y-4">
                  {achievements.map((a) => (
                    <div key={a.id} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{a.event_name}</h3>
                          <p className="text-sm text-muted-foreground">{a.season}</p>
                        </div>
                        {a.award && <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">{a.award}</span>}
                      </div>
                      <p className="mt-2 text-sm">{a.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No achievements added yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p>{team.city}, {team.state}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organization</p>
                <p>{team.organization || 'Independent'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tax Status</p>
                <p>{team.tax_status === '501c3' ? '501(c)(3) Non-profit' : team.tax_status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Portfolio Ask</p>
                <p>${((team.financial_ask_cents || 0) / 100).toLocaleString('en-US')}</p>
              </div>
            </CardContent>
          </Card>

          {submissionsWithFeedback && submissionsWithFeedback.length > 0 && (
            <div className="space-y-4">
              {submissionsWithFeedback.map((s: any) => (
                <SubmissionRejectionSummary key={s.id} submission={{...s, sponsor_name: s.company_name}} />
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Submissions</CardTitle>
                <CardDescription>Status of your portfolios sent to sponsors.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {submissions && submissions.length > 0 ? (
                submissions.map((s: any) => {
                  const editable = s.status === 'draft' || s.status === 'changes_requested'
                  return (
                    <Link
                      key={s.id}
                      href={`/submissions/${s.id}/edit`}
                      className="block rounded border p-3 hover:bg-muted/50 transition"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{s.company_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(s.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={cn(
                          'text-xs px-2 py-1 rounded font-medium shrink-0',
                          s.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          editable ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'
                        )}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No submissions yet. Choose a sponsor to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
