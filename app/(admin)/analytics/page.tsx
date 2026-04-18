import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:             { label: 'Draft',             color: 'bg-muted text-muted-foreground' },
  pending:           { label: 'Pending Review',    color: 'bg-blue-100 text-blue-800' },
  approved:          { label: 'Approved & Sent',   color: 'bg-emerald-100 text-emerald-800' },
  declined:          { label: 'Declined',          color: 'bg-red-100 text-red-800' },
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: capacityData } = await supabase.from('v_sponsor_capacity').select('*')
  const { data: submissionSummary } = await (supabase as any).from('v_submission_summary').select('*')
  const { data: pendingCoaches } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('role', 'coach')
    .eq('coach_verified', false)
    .not('coach_credentials_url', 'is', null)
    .order('created_at', { ascending: true })

  // totalRequested is the sum of unique team financial asks for all teams with at least one submission
  const uniqueTeamAsks = new Map<string, number>()
  submissionSummary?.forEach((s: any) => {
    uniqueTeamAsks.set(s.team_name, s.financial_ask_cents)
  })
  const totalRequested = Array.from(uniqueTeamAsks.values()).reduce((sum, ask) => sum + ask, 0)
  
  const totalCapacity  = capacityData?.reduce((s, c) => s + (c.funding_cap_cents ?? 0), 0) ?? 0
  const totalUsed      = capacityData?.reduce((s, c) => s + (c.funding_used_cents ?? 0), 0) ?? 0
  const totalSent      = submissionSummary?.filter((s: any) => s.status === 'approved').length ?? 0
  const activeSponsors = capacityData?.filter(s => s.status === 'active').length ?? 0
  const pendingCount   = pendingCoaches?.length ?? 0

  const statusCounts: Record<string, number> = {}
  for (const s of submissionSummary ?? []) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
  }
  const totalSubmissions = submissionSummary?.length ?? 0

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide metrics and conversion funnel.</p>
      </div>

      {/* KPI row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Requested"
          value={`$${(totalRequested / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          label="Capacity Remaining"
          value={`$${((totalCapacity - totalUsed) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub={`of $${(totalCapacity / 100).toLocaleString('en-US')} limit`}
        />
        <StatCard label="Approved & Sent" value={String(totalSent)} />
        <StatCard label="Active Sponsors" value={String(activeSponsors)} />
        <StatCard
          label="Pending Verifications"
          value={String(pendingCount)}
          highlight={pendingCount > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sponsor Capacity Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            {capacityData && capacityData.filter(s => s.status === 'active').length > 0 ? (
              <div className="space-y-4">
                {capacityData
                  .filter(s => s.status === 'active')
                  .sort((a, b) => (b.utilization_pct ?? 0) - (a.utilization_pct ?? 0))
                  .slice(0, 8)
                  .map(sponsor => {
                    const pct = Math.min(Number(sponsor.utilization_pct ?? 0), 100)
                    return (
                      <div key={sponsor.id}>
                        <div className="flex justify-between items-center mb-1 text-sm">
                          <span className="font-medium truncate max-w-[180px]">{sponsor.company_name}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">{pct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-primary'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ${(((sponsor.funding_cap_cents ?? 0) - (sponsor.funding_used_cents ?? 0)) / 100).toLocaleString('en-US')} remaining
                        </p>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No active sponsors yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {totalSubmissions > 0 ? (
              <div className="space-y-3">
                {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
                  const count = statusCounts[key] ?? 0
                  const pct = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', color)}>
                          {label}
                        </span>
                        <span className="text-muted-foreground">
                          {count} submission{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary/60 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No submissions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent submission activity table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {totalSubmissions > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Team</th>
                    <th className="pb-2 pr-4 font-medium">Sponsor</th>
                    <th className="pb-2 pr-4 font-medium">Portfolio Ask</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(submissionSummary as any[])!
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 10)
                    .map(submission => {
                      const meta = STATUS_LABELS[submission.status] ?? { label: submission.status, color: 'bg-muted' }
                      return (
                        <tr key={submission.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{submission.team_name}</td>
                          <td className="py-2 pr-4 max-w-[180px] truncate text-muted-foreground">{submission.company_name}</td>
                          <td className="py-2 pr-4">${(submission.financial_ask_cents / 100).toLocaleString('en-US')}</td>
                          <td className="py-2">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', meta.color)}>
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
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Pending coach verifications */}
      {pendingCount > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Coaches Awaiting Verification
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{pendingCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These coaches uploaded credentials and are waiting for admin approval.
            </p>
            <div className="space-y-2">
              {pendingCoaches?.map(coach => (
                <div key={coach.id} className="flex justify-between items-center border rounded p-3">
                  <div>
                    <p className="font-medium text-sm">{coach.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{coach.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(coach.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`https://supabase.com/dashboard`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                  >
                    Open Supabase ↗
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground bg-muted rounded p-2 font-mono">
              UPDATE profiles SET coach_verified = true WHERE id = &apos;&lt;id above&gt;&apos;;
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
    <Card className={highlight ? 'border-amber-300' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', highlight && 'text-amber-600')}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
