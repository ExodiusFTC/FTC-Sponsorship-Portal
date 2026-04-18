import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { SubmissionRejectionSummary } from '@/components/coach/submission-rejection-summary'
import { PageHeader } from '@/components/page-header'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submissions } = await (supabase as any)
    .from('v_submission_summary')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissionsWithFeedback = (submissions as any)?.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.status === 'declined' || s.status === 'changes_requested'
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activePitches = (submissions as any)?.filter((s: any) => s.status === 'pending' || s.status === 'approved').length ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalFunded = (submissions as any)?.filter((s: any) => s.status === 'approved').length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title={team.team_name}
        subtitle={team.status === 'existing' ? `FTC Team #${team.ftc_team_number}` : 'Incubator Team'}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/submissions/new" className={buttonVariants({ variant: 'default' })}>
              Submit Portfolio
            </Link>
            <Link href="/team/edit" className={buttonVariants({ variant: 'outline' })}>
              Edit Portfolio
            </Link>
          </div>
        }
      />

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <Card>
          <CardContent style={{ paddingTop: '0' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Active Pitches</p>
            <p style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)', marginTop: '4px' }}>{activePitches}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ paddingTop: '0' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Submissions</p>
            <p style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)', marginTop: '4px' }}>{submissions?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent style={{ paddingTop: '0' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Funded</p>
            <p style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)', marginTop: '4px' }}>{totalFunded}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Mission Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>{team.mission_statement}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Achievements</CardTitle>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Season highlights and awards.</p>
              </div>
              <Link href="/team/achievements/new" className={buttonVariants({ size: 'sm' })}>
                Add Achievement
              </Link>
            </CardHeader>
            <CardContent>
              {achievements && achievements.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {achievements.map((a) => (
                    <div key={a.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.event_name}</h3>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{a.season}</p>
                        </div>
                        {a.award && (
                          <span style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}>
                            {a.award}
                          </span>
                        )}
                      </div>
                      <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>{a.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
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
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Location</p>
                <p style={{ color: 'var(--text-primary)' }}>{team.city}, {team.state}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Organization</p>
                <p style={{ color: 'var(--text-primary)' }}>{team.organization || 'Independent'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Tax Status</p>
                <p style={{ color: 'var(--text-primary)' }}>{team.tax_status === '501c3' ? '501(c)(3) Non-profit' : team.tax_status}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Portfolio Ask</p>
                <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '14px' }} suppressHydrationWarning>
                  ${((team.financial_ask_cents || 0) / 100).toLocaleString('en-US')}
                </p>
              </div>
            </CardContent>
          </Card>

          {submissionsWithFeedback && submissionsWithFeedback.length > 0 && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {submissionsWithFeedback.map((s: any) => (
                <SubmissionRejectionSummary key={s.id} submission={{...s, sponsor_name: s.company_name}} />
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Submissions</CardTitle>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Status of your portfolios sent to sponsors.</p>
              </div>
            </CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {submissions && submissions.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                submissions.map((s: any) => {
                  const statusMap: Record<string, { bg: string; text: string }> = {
                    approved: { bg: 'var(--badge-success-bg)', text: 'var(--badge-success-text)' },
                    pending: { bg: 'var(--badge-pending-bg)', text: 'var(--badge-pending-text)' },
                    changes_requested: { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)' },
                    declined: { bg: 'var(--badge-rejected-bg)', text: 'var(--badge-rejected-text)' },
                  }
                  const statusStyle = statusMap[s.status] ?? { bg: 'var(--bg-elevated)', text: 'var(--text-muted)' }
                  return (
                    <Link
                      key={s.id}
                      href={`/submissions/${s.id}/edit`}
                      style={{
                        display: 'block',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        padding: '12px',
                        textDecoration: 'none',
                        transition: 'background 100ms ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.company_name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }} suppressHydrationWarning>
                            {new Date(s.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontWeight: 500,
                          flexShrink: 0,
                          background: statusStyle.bg,
                          color: statusStyle.text,
                        }}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
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
