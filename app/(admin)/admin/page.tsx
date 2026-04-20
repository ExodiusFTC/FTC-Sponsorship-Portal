import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Inbox, Users, Building2, AlertCircle, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: pendingSubmissions, count: pendingCount },
    { data: pendingCoaches, count: pendingCoachesCount },
    { count: submissionsTodayCount },
    { count: approvedWeekCount },
    { count: declinedWeekCount },
    { data: recentActivity },
    { data: sponsorsNearCap },
  ] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, updated_at, team_id, sponsor_id, teams:team_id(team_name), sponsors:sponsor_id(company_name)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at', { count: 'exact' })
      .eq('role', 'coach')
      .eq('coach_verified', false)
      .not('coach_credentials_url', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfToday),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('updated_at', sevenDaysAgo),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'declined')
      .gte('updated_at', sevenDaysAgo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('v_submission_summary')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('v_sponsor_capacity')
      .select('id, company_name, utilization_pct, funding_cap_cents, funding_used_cents')
      .eq('status', 'active')
      .gte('utilization_pct', 80)
      .order('utilization_pct', { ascending: false })
      .limit(5),
  ])

  const needsAttention = (pendingCount ?? 0) + (pendingCoachesCount ?? 0) + (sponsorsNearCap?.length ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Operational overview — queue health, pending actions, and today's activity."
      />

      {/* Attention row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <ActionCard
          icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />}
          label="Needs Attention"
          value={String(needsAttention)}
          sub={needsAttention > 0 ? 'Items waiting on admin' : 'All clear'}
          highlight={needsAttention > 0}
        />
        <ActionCard
          icon={<Inbox className="h-4 w-4" strokeWidth={1.5} />}
          label="Pending Review"
          value={String(pendingCount ?? 0)}
          sub="Submissions awaiting moderation"
          href="/moderation"
        />
        <ActionCard
          icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
          label="Coach Verifications"
          value={String(pendingCoachesCount ?? 0)}
          sub="Credentials uploaded"
          href="/coaches"
        />
        <ActionCard
          icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
          label="Submitted Today"
          value={String(submissionsTodayCount ?? 0)}
          sub="New submissions in last 24h"
        />
      </div>

      {/* Two-column ops view */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Pending moderation queue */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle>Moderation Queue</CardTitle>
              <Link
                href="/moderation"
                className={cn(buttonVariants({ size: 'sm', variant: 'default' }))}
              >
                Open queue
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingSubmissions && pendingSubmissions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingSubmissions.map((s) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const team = (s.teams as any)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const sponsor = (s.sponsors as any)
                  return (
                    <div key={s.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {team?.team_name ?? 'Unknown team'} → {sponsor?.company_name ?? 'Unknown sponsor'}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                          Submitted {new Date(s.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href="/moderation"
                        className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }))}
                      >
                        Review <ArrowUpRight className="ml-1 h-3 w-3" strokeWidth={1.5} />
                      </Link>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState text="Queue is empty. Nothing to review right now." />
            )}
          </CardContent>
        </Card>

        {/* Coaches awaiting verification */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle>Coaches Awaiting Verification</CardTitle>
              <Link
                href="/coaches"
                className={cn(buttonVariants({ size: 'sm', variant: 'default' }))}
              >
                Manage coaches
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingCoaches && pendingCoaches.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingCoaches.map((c) => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{c.full_name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</p>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No coaches waiting for verification." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Week-at-a-glance + sponsors near capacity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <WeekStat
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />}
                label="Approved"
                value={approvedWeekCount ?? 0}
              />
              <WeekStat
                icon={<AlertCircle className="h-4 w-4 text-rose-400" strokeWidth={1.5} />}
                label="Declined"
                value={declinedWeekCount ?? 0}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Rolling 7-day window. See Analytics for deeper trends.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sponsors Near Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            {sponsorsNearCap && sponsorsNearCap.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sponsorsNearCap.map((s) => {
                  const pct = Math.min(Number(s.utilization_pct ?? 0), 100)
                  return (
                    <div key={s.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.company_name}</span>
                        <span style={{ color: pct >= 95 ? 'var(--accent-error)' : 'var(--badge-warning-text)' }}>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: '3px', height: '4px' }}>
                        <div style={{
                          width: `${pct}%`, height: '4px', borderRadius: '3px',
                          background: pct >= 95 ? 'var(--accent-error)' : 'var(--badge-warning-text)',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState text="No sponsors are near their funding cap." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(recentActivity as any[]).map((a, idx) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: idx < recentActivity.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusDot status={a.status} />
                    <div>
                      <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        <span style={{ fontWeight: 500 }}>{a.team_name}</span>
                        {' → '}
                        <span style={{ color: 'var(--text-secondary)' }}>{a.company_name}</span>
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {humanizeStatus(a.status)}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                    {new Date(a.updated_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No activity yet." />
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <QuickLink href="/sponsors/new" icon={<Building2 className="h-4 w-4" strokeWidth={1.5} />} label="Add Sponsor" sub="Register a new funding partner" />
        <QuickLink href="/applications" icon={<Inbox className="h-4 w-4" strokeWidth={1.5} />} label="Sponsor Applications" sub="Incoming interest from companies" />
        <QuickLink href="/analytics" icon={<ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />} label="Open Analytics" sub="Platform-wide trends and charts" />
      </div>
    </div>
  )
}

function ActionCard({
  icon, label, value, sub, highlight, href,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean; href?: string }) {
  const inner = (
    <Card style={{ height: '100%' }}>
      <CardContent style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          {icon}
          <p style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</p>
        </div>
        <p style={{
          fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px',
          color: highlight ? 'var(--badge-warning-text)' : 'var(--text-primary)',
          marginTop: '4px',
        }} suppressHydrationWarning>
          {value}
        </p>
        {sub && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</p>}
      </CardContent>
    </Card>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function WeekStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
        {icon}
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }} suppressHydrationWarning>
        {value}
      </p>
    </div>
  )
}

function QuickLink({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px',
        textDecoration: 'none', transition: 'background 0.15s',
      }}
      className="hover:bg-zinc-900/40"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
        {icon}
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</p>
    </Link>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>{text}</p>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: '#34d399',
    pending: '#fbbf24',
    declined: '#f87171',
    changes_requested: '#fb923c',
    draft: '#9ca3af',
  }
  return (
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: colors[status] ?? '#9ca3af', flexShrink: 0,
    }} />
  )
}

function humanizeStatus(status: string) {
  const map: Record<string, string> = {
    approved: 'Approved & sent',
    pending: 'Pending review',
    declined: 'Declined',
    changes_requested: 'Changes requested',
    draft: 'Saved as draft',
  }
  return map[status] ?? status
}
