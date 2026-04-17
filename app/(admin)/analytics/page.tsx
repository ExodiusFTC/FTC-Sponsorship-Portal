import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch data for analytics views created in SQL
  const { data: capacityData } = await supabase
    .from('v_sponsor_capacity')
    .select('*')

  const { data: pitchSummary } = await supabase
    .from('v_pitch_summary')
    .select('*')

  // Aggregations
  const totalRequested = pitchSummary?.reduce((acc, curr) => acc + curr.financial_ask_cents, 0) || 0
  const totalCapacity = capacityData?.reduce((acc, curr) => acc + curr.funding_cap_cents, 0) || 0
  const totalUsed = capacityData?.reduce((acc, curr) => acc + curr.funding_used_cents, 0) || 0
  const totalSent = pitchSummary?.reduce((acc, curr) => acc + curr.sent_count, 0) || 0

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Platform-wide metrics and conversion funnels.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requested (All Pitches)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalRequested / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Capacity Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${((totalCapacity - totalUsed) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of ${(totalCapacity / 100).toLocaleString()} limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proposals Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sponsors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{capacityData?.filter(s => s.status === 'active').length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sponsor Capacity Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {capacityData?.filter(s => s.status === 'active').sort((a, b) => b.utilization_pct - a.utilization_pct).slice(0, 5).map(sponsor => (
                <div key={sponsor.id}>
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="font-medium">{sponsor.company_name}</span>
                    <span className="text-muted-foreground">{sponsor.utilization_pct}% Used</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: \`\${Math.min(sponsor.utilization_pct, 100)}%\` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Pitch Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pitchSummary?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5).map(pitch => (
                <div key={pitch.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{pitch.team_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{pitch.title}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-muted rounded text-xs capitalize">{pitch.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
