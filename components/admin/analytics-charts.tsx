'use client'

import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter,
} from 'recharts'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AnalyticsCharts() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [{ data: subs }, { data: sponsors }] = await Promise.all([
        supabase.from('submissions').select('*'),
        supabase.from('sponsors').select('*'),
      ])

      if (!subs || !sponsors) return

      // Timeline: submissions over time
      const timeline: Record<string, { date: string; submitted: number; approved: number }> = {}
      subs.forEach((s: any) => {
        const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!timeline[date]) timeline[date] = { date, submitted: 0, approved: 0 }
        timeline[date].submitted++
        if (s.status === 'approved') timeline[date].approved++
      })
      const timelineData = Object.values(timeline).slice(-30)

      // Sponsor funding utilization
      const sponsorData = sponsors.map((s: any) => ({
        name: s.company_name,
        used: s.funding_used_cents / 100,
        cap: s.funding_cap_cents / 100,
        utilization: Math.round((s.funding_used_cents / s.funding_cap_cents) * 100),
      })).sort((a: any, b: any) => b.utilization - a.utilization).slice(0, 10)

      // Status breakdown
      const statusCounts = {
        approved: subs.filter((s: any) => s.status === 'approved').length,
        declined: subs.filter((s: any) => s.status === 'declined').length,
        pending: subs.filter((s: any) => s.status === 'pending').length,
        draft: subs.filter((s: any) => s.status === 'draft').length,
      }
      const statusData = [
        { name: 'Approved', value: statusCounts.approved, color: '#10b981' },
        { name: 'Declined', value: statusCounts.declined, color: '#ef4444' },
        { name: 'Pending', value: statusCounts.pending, color: '#f59e0b' },
        { name: 'Draft', value: statusCounts.draft, color: '#6b7280' },
      ].filter(s => s.value > 0)

      // Ask size distribution
      const askBuckets: Record<string, number> = {}
      subs.forEach((s: any) => {
        const ask = (s.financial_ask_cents || 0) / 100
        const bucket = ask < 500 ? '<$500' : ask < 1000 ? '$500–$1k' : ask < 3000 ? '$1k–$3k' : ask < 5000 ? '$3k–$5k' : '$5k+'
        askBuckets[bucket] = (askBuckets[bucket] || 0) + 1
      })
      const askData = ['<$500', '$500–$1k', '$1k–$3k', '$3k–$5k', '$5k+'].map(range => ({
        range,
        count: askBuckets[range] || 0,
      }))

      // Average response time (days to decision)
      const responseTimes: number[] = []
      subs.forEach((s: any) => {
        if (s.reviewed_at && s.created_at) {
          const days = Math.round(
            (new Date(s.reviewed_at).getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )
          if (days >= 0 && days <= 365) responseTimes.push(days)
        }
      })
      const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0

      setData({
        timelineData,
        sponsorData,
        statusData,
        askData,
        avgResponseTime,
        totalSubmissions: subs.length,
        approvalRate: subs.length > 0 ? Math.round((statusCounts.approved / subs.length) * 100) : 0,
      })
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <div className="text-muted-foreground text-sm py-8">Loading charts...</div>

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl text-xs">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.color || p.fill }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-mono text-foreground font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground">Total Submissions</div>
          <div className="mt-2 text-2xl font-bold">{data?.totalSubmissions}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground">Approval Rate</div>
          <div className="mt-2 text-2xl font-bold text-emerald-500">{data?.approvalRate}%</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground">Avg Response Time</div>
          <div className="mt-2 text-2xl font-bold">{data?.avgResponseTime}d</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground">Active Sponsors</div>
          <div className="mt-2 text-2xl font-bold">{data?.sponsorData?.length || 0}</div>
        </div>
      </div>

      {/* Row 1: Timeline + Status */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Submissions Over Time</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 30 days</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timelineData || []}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" fill="url(#grad1)" />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#10b981" fill="url(#grad2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">All submissions</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.statusData || []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                  {(data?.statusData || []).map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Ask Size + Sponsor Utilization */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Funding Ask Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">By request amount</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.askData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="range" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Top Sponsors by Utilization</h3>
          <p className="text-xs text-muted-foreground mb-4">Funding cap usage</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.sponsorData?.slice(0, 8) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#71717a', fontSize: 10 }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="utilization" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Detailed Sponsor Table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Sponsor Funding Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Sponsor</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Cap</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Used</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Remaining</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.sponsorData || []).slice(0, 10).map((s: any, i: number) => (
                <tr key={i} className="hover:bg-accent/50">
                  <td className="py-2 px-3 text-foreground">{s.name}</td>
                  <td className="text-right py-2 px-3 font-mono text-foreground">${s.cap.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 font-mono text-foreground">${s.used.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 font-mono text-muted-foreground">${(s.cap - s.used).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-accent rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(s.utilization, 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-10 text-right">{s.utilization}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
