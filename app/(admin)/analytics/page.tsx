import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:             { label: 'Draft',             color: 'bg-muted text-muted-foreground' },
  submitted:         { label: 'Submitted',         color: 'bg-blue-100 text-blue-800' },
  changes_requested: { label: 'Changes Requested', color: 'bg-amber-100 text-amber-800' },
  approved:          { label: 'Approved',          color: 'bg-emerald-100 text-emerald-800' },
  rejected:          { label: 'Rejected',          color: 'bg-red-100 text-red-800' },
  dispatched:        { label: 'Dispatched',        color: 'bg-purple-100 text-purple-800' },
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: capacityData } = await supabase.from('v_sponsor_capacity').select('*')
  const { data: pitchSummary } = await supabase.from('v_pitch_summary').select('*')
  const { data: pendingCoaches } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .eq('role', 'coach')
    .eq('coach_verified', false)
    .not('coach_credentials_url', 'is', null)
    .order('created_at', { ascending: true })

  const totalRequested = pitchSummary?.reduce((s, p) => s + p.financial_ask_cents, 0) ?? 0
  const totalCapacity  = capacityData?.reduce((s, c) => s + c.funding_cap_cents, 0) ?? 0
  const totalUsed      = capacityData?.reduce((s, c) => s + c.funding_used_cents, 0) ?? 0
  const totalSent      = pitchSummary?.reduce((s, p) => s + Number(p.sent_count), 0) ?? 0
  const activeSponsors = capacityData?.filter(s => s.status === 'active').length ?? 0
  const pendingCount   = pendingCoaches?.length ?? 0

  const statusCounts: Record<string, number> = {}
  for (const p of pitchSummary ?? []) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
  }
  const totalPitches = pitchSummary?.length ?? 0

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
        <StatCard label="Proposals Sent" value={String(totalSent)} />
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
                  .sort((a, b) => b.utilization_pct - a.utilization_pct)
                  .slice(0, 8)
                  .map(sponsor => {
                    const pct = Math.min(Number(sponsor.utilization_pct), 100)
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
                          ${((sponsor.funding_cap_cents - sponsor.funding_used_cents) / 100).toLocaleString('en-US')} remaining
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
            <CardTitle>Pitch Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {totalPitches > 0 ? (
              <div className="space-y-3">
                {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
                  const count = statusCounts[key] ?? 0
                  const pct = totalPitches > 0 ? Math.round((count / totalPitches) * 100) : 0
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', color)}>
                          {label}
                        </span>
                        <span className="text-muted-foreground">
                          {count} pitch{count !== 1 ? 'es' : ''}
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
              <p className="text-sm text-muted-foreground text-center py-8">No pitches yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent pitch activity table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Pitch Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {totalPitches > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Team</th>
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium">Ask</th>
                    <th className="pb-2 pr-4 font-medium text-center">Targets</th>
                    <th className="pb-2 pr-4 font-medium text-center">Sent</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pitchSummary!
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 10)
                    .map(pitch => {
                      const meta = STATUS_LABELS[pitch.status] ?? { label: pitch.status, color: 'bg-muted' }
                      return (
                        <tr key={pitch.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{pitch.team_name}</td>
                          <td className="py-2 pr-4 max-w-[180px] truncate text-muted-foreground">{pitch.title}</td>
                          <td className="py-2 pr-4">${(pitch.financial_ask_cents / 100).toLocaleString('en-US')}</td>
                          <td className="py-2 pr-4 text-center">{Number(pitch.target_count)}</td>
                          <td className="py-2 pr-4 text-center">{Number(pitch.sent_count)}</td>
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
            <p className="text-sm text-muted-foreground text-center py-8">No pitches yet.</p>
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
