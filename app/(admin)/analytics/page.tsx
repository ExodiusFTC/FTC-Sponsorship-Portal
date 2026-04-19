import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import dynamic from 'next/dynamic'

const AnalyticsCharts = dynamic(() => import('@/components/admin/analytics-charts'), { ssr: false })

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  draft:             { label: 'Draft',           bg: 'var(--badge-pending-bg)',  text: 'var(--badge-pending-text)' },
  pending:           { label: 'Pending Review',  bg: 'var(--badge-warning-bg)',  text: 'var(--badge-warning-text)' },
  approved:          { label: 'Approved & Sent', bg: 'var(--badge-success-bg)',  text: 'var(--badge-success-text)' },
  declined:          { label: 'Declined',        bg: 'var(--badge-rejected-bg)', text: 'var(--badge-rejected-text)' },
  changes_requested: { label: 'Changes Req.',   bg: 'var(--badge-warning-bg)',  text: 'var(--badge-warning-text)' },
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // ── Queries ─────────────────────────────────────────────────────────────────
  const [
    { data: ledger },
    { count: activeSponsors },
    { count: activeTeams },
    { count: verifiedThisMonth },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { data: submissionSummary },
    { data: statusRows },
  ] = await Promise.all([
    (supabase as any).from('transactions_ledger').select('amount_cents'),
    supabase.from('sponsors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('coach_verified', true)
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    (supabase as any).from('v_submission_summary').select('*'),
    supabase.from('submissions').select('status').in('status', ['approved', 'declined']),
  ])

  const totalFundsDistributedCents: number =
    (ledger ?? []).reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0)

  const approvedCount = statusRows?.filter((s: any) => s.status === 'approved').length ?? 0
  const declinedCount = statusRows?.filter((s: any) => s.status === 'declined').length ?? 0
  const conversionRate =
    approvedCount + declinedCount > 0
      ? Math.round((approvedCount / (approvedCount + declinedCount)) * 100)
      : 0

  const statusCounts: Record<string, number> = {}
  for (const s of submissionSummary ?? []) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
  }
  const totalSubmissions = submissionSummary?.length ?? 0

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Analytics"
        subtitle="Platform-wide metrics, pipeline health, and conversion outcomes."
      />

      {/* ── Section 1: Marketing KPIs ── */}
      <section>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-4">
          Platform KPIs
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Total Funds Distributed"
            value={`$${(totalFundsDistributedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            hint="All-time via transactions ledger"
          />
          <KpiCard
            label="Active Sponsors"
            value={String(activeSponsors ?? 0)}
            hint="Currently accepting pitches"
          />
          <KpiCard
            label="Registered Teams"
            value={String(activeTeams ?? 0)}
            hint="All teams with a portfolio"
          />
        </div>
      </section>

      {/* ── Section 2: Platform Health ── */}
      <section>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-4">
          Platform Health
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HealthCard
            label="Overall Conversion Rate"
            value={conversionRate > 0 ? `${conversionRate}%` : '—'}
            hint={`${approvedCount} approved out of ${approvedCount + declinedCount} reviewed`}
            accent="emerald"
          />
          <HealthCard
            label="Coaches Verified (30d)"
            value={String(verifiedThisMonth ?? 0)}
            hint="New verified coaches in the last 30 days"
            accent="indigo"
          />
        </div>
      </section>

      {/* ── Enhanced Charts Section ── */}
      <AnalyticsCharts />

      {/* ── Section 3: Submission Pipeline ── */}
      <section>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-4">
          Submission Pipeline
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          {totalSubmissions > 0 ? (
            <div className="flex flex-col gap-4">
              {Object.entries(STATUS_LABELS).map(([key, { label, bg, text }]) => {
                const count = statusCounts[key] ?? 0
                const pct = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0
                return (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-36 flex-shrink-0 text-right text-[11px] text-muted-foreground">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-elevated overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct > 0 ? 'var(--text-primary)' : 'transparent', opacity: 0.75 }}
                      />
                    </div>
                    <span className="w-20 text-right text-[11px] font-mono text-secondary">
                      {count} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No submissions yet.</p>
          )}
        </div>
      </section>

      {/* ── Recent Activity Table ── */}
      <section>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-4">
          Recent Activity
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-elevated/50 border-b border-border">
                <tr>
                  {['Team', 'Sponsor', 'Ask', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {totalSubmissions > 0 ? (
                  (submissionSummary as any[])!
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 12)
                    .map(sub => {
                      const meta = STATUS_LABELS[sub.status] ?? { label: sub.status, bg: 'var(--bg-elevated)', text: 'var(--text-muted)' }
                      return (
                        <tr key={sub.id} className="hover:bg-hover transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{sub.team_name}</td>
                          <td className="px-4 py-3 text-secondary max-w-[180px] truncate">{sub.company_name}</td>
                          <td className="px-4 py-3 text-secondary font-mono text-xs" suppressHydrationWarning>
                            ${(sub.financial_ask_cents / 100).toLocaleString('en-US')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ background: meta.bg, color: meta.text }}>
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">
                      No activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border-hover">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums" suppressHydrationWarning>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

function HealthCard({
  label, value, hint, accent,
}: {
  label: string; value: string; hint: string; accent: 'emerald' | 'indigo'
}) {
  const accentClass = accent === 'emerald'
    ? 'text-[var(--badge-success-text)] bg-[var(--badge-success-bg)]/20 border-[var(--badge-success-text)]/40'
    : 'text-[var(--text-primary)] bg-[var(--bg-elevated)] border-[var(--border-default)]'

  return (
    <div className={`rounded-xl border p-6 flex flex-col gap-2 ${accentClass}`}>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="text-4xl font-bold tracking-tight tabular-nums" suppressHydrationWarning>
        {value}
      </div>
      <div className="text-xs opacity-60">{hint}</div>
    </div>
  )
}
