import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  draft:    { label: 'Draft',           bg: 'var(--badge-pending-bg)',  text: 'var(--badge-pending-text)' },
  pending:  { label: 'Pending Review',  bg: 'var(--badge-warning-bg)',  text: 'var(--badge-warning-text)' },
  approved: { label: 'Approved & Sent', bg: 'var(--badge-success-bg)',  text: 'var(--badge-success-text)' },
  declined: { label: 'Declined',        bg: 'var(--badge-rejected-bg)', text: 'var(--badge-rejected-text)' },
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: capacityData } = await supabase.from('v_sponsor_capacity').select('*')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submissionSummary } = await (supabase as any).from('v_submission_summary').select('*')
  const { data: pendingCoaches } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('role', 'coach')
    .eq('coach_verified', false)
    .not('coach_credentials_url', 'is', null)
    .order('created_at', { ascending: true })

  const uniqueTeamAsks = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submissionSummary?.forEach((s: any) => {
    uniqueTeamAsks.set(s.team_name, s.financial_ask_cents)
  })
  const totalRequested = Array.from(uniqueTeamAsks.values()).reduce((sum, ask) => sum + ask, 0)

  const totalCapacity  = capacityData?.reduce((s, c) => s + (c.funding_cap_cents ?? 0), 0) ?? 0
  const totalUsed      = capacityData?.reduce((s, c) => s + (c.funding_used_cents ?? 0), 0) ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSent      = submissionSummary?.filter((s: any) => s.status === 'approved').length ?? 0
  const activeSponsors = capacityData?.filter(s => s.status === 'active').length ?? 0
  const pendingCount   = pendingCoaches?.length ?? 0

  const statusCounts: Record<string, number> = {}
  for (const s of submissionSummary ?? []) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
  }
  const totalSubmissions = submissionSummary?.length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader title="Dashboard" subtitle="Platform-wide metrics and conversion funnel." />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        <StatCard label="Total Requested" value={`$${(totalRequested / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
        <StatCard
          label="Capacity Remaining"
          value={`$${((totalCapacity - totalUsed) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub={`of $${(totalCapacity / 100).toLocaleString('en-US')} limit`}
        />
        <StatCard label="Approved & Sent" value={String(totalSent)} />
        <StatCard label="Active Sponsors" value={String(activeSponsors)} />
        <StatCard label="Pending Verifications" value={String(pendingCount)} highlight={pendingCount > 0} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card>
          <CardHeader>
            <CardTitle>Sponsor Capacity Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            {capacityData && capacityData.filter(s => s.status === 'active').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {capacityData
                  .filter(s => s.status === 'active')
                  .sort((a, b) => (b.utilization_pct ?? 0) - (a.utilization_pct ?? 0))
                  .slice(0, 8)
                  .map(sponsor => {
                    const pct = Math.min(Number(sponsor.utilization_pct ?? 0), 100)
                    const barColor = pct >= 90 ? 'var(--accent-error)' : pct >= 60 ? 'var(--badge-warning-text)' : 'var(--text-primary)'
                    return (
                      <div key={sponsor.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{sponsor.company_name}</span>
                          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '8px' }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: '3px', height: '6px' }}>
                          <div style={{ width: `${pct}%`, height: '6px', borderRadius: '3px', background: barColor }} />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }} suppressHydrationWarning>
                          ${(((sponsor.funding_cap_cents ?? 0) - (sponsor.funding_used_cents ?? 0)) / 100).toLocaleString('en-US')} remaining
                        </p>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No active sponsors yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {totalSubmissions > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(STATUS_LABELS).map(([key, { label, bg, text }]) => {
                  const count = statusCounts[key] ?? 0
                  const pct = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, background: bg, color: text }}>
                          {label}
                        </span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                          {count} submission{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: '3px', height: '4px' }}>
                        <div style={{ width: `${pct}%`, height: '4px', borderRadius: '3px', background: 'var(--text-primary)', opacity: 0.6 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No submissions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {totalSubmissions > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: '8px', paddingRight: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Team</th>
                    <th style={{ textAlign: 'left', paddingBottom: '8px', paddingRight: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Sponsor</th>
                    <th style={{ textAlign: 'left', paddingBottom: '8px', paddingRight: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Portfolio Ask</th>
                    <th style={{ textAlign: 'left', paddingBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(submissionSummary as any[])!
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 10)
                    .map(submission => {
                      const meta = STATUS_LABELS[submission.status] ?? { label: submission.status, bg: 'var(--bg-elevated)', text: 'var(--text-muted)' }
                      return (
                        <tr key={submission.id} style={{ borderBottom: '1px solid var(--border-color)', height: '44px' }}>
                          <td style={{ paddingRight: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>{submission.team_name}</td>
                          <td style={{ paddingRight: '16px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{submission.company_name}</td>
                          <td style={{ paddingRight: '16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }} suppressHydrationWarning>${(submission.financial_ask_cents / 100).toLocaleString('en-US')}</td>
                          <td>
                            <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500, background: meta.bg, color: meta.text }}>
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No activity yet.</p>
          )}
        </CardContent>
      </Card>

      {pendingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Coaches Awaiting Verification
              <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', fontSize: '12px', fontWeight: 600, padding: '1px 7px', borderRadius: '9999px' }}>{pendingCount}</span>
            </CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              These coaches uploaded credentials and are waiting for admin approval.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingCoaches?.map(coach => (
                <div key={coach.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>{coach.full_name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{coach.id}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                      Applied {new Date(coach.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }))}
                  >
                    Open Supabase ↗
                  </Link>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: '6px', padding: '8px', fontFamily: 'var(--font-mono)' }}>
              {'UPDATE profiles SET coach_verified = true WHERE id = \'<id above>\';'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <Card>
      <CardContent style={{ paddingTop: '0' }}>
        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</p>
        <p style={{
          fontSize: '28px',
          fontWeight: 600,
          letterSpacing: '-0.5px',
          color: highlight ? 'var(--badge-warning-text)' : 'var(--text-primary)',
          marginTop: '4px',
        }} suppressHydrationWarning>
          {value}
        </p>
        {sub && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</p>}
      </CardContent>
    </Card>
  )
}
