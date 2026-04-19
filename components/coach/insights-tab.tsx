'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, CheckCircle2, Clock, AlertCircle, DollarSign, Percent, Activity, Send } from 'lucide-react'

type Submission = {
  id: string
  status: string
  financial_ask_cents?: number
  created_at?: string
  updated_at?: string
}

function StatCard({
  label, value, icon: Icon, hint, accent = false,
}: {
  label: string
  value: string | number
  icon: any
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={`relative rounded-xl border p-5 overflow-hidden transition-colors hover:border-border/80 ${
        accent
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
          accent ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'
        }`}>
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#10b981',
  pending: '#6366f1',
  changes_requested: '#f59e0b',
  declined: '#ef4444',
  draft: '#52525b',
}
const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  pending: 'Pending',
  changes_requested: 'Changes Req.',
  declined: 'Declined',
  draft: 'Draft',
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl text-xs">
      {label && <div className="text-muted-foreground mb-1">{label}</div>}
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

export function InsightsTab({ submissions }: { submissions: Submission[] }) {
  // ── Core stats ──────────────────────────────────────────────────────────────
  const totalFunded        = submissions.filter(s => s.status === 'approved').reduce((a, s) => a + (s.financial_ask_cents || 0), 0)
  const approvedCount      = submissions.filter(s => s.status === 'approved').length
  const declinedCount      = submissions.filter(s => s.status === 'declined').length
  const pendingCount       = submissions.filter(s => s.status === 'pending').length
  const changesCount       = submissions.filter(s => s.status === 'changes_requested').length
  const draftCount         = submissions.filter(s => s.status === 'draft').length
  const decidedCount       = approvedCount + declinedCount
  const acceptanceRate     = decidedCount === 0 ? 0 : Math.round((approvedCount / decidedCount) * 100)
  const avgAsk             = submissions.length > 0
    ? Math.round(submissions.reduce((a, s) => a + (s.financial_ask_cents || 0), 0) / submissions.length)
    : 0

  // ── Monthly submission volume over time (area chart) ─────────────────────
  const monthOrder: string[] = []
  const monthMap: Record<string, { submitted: number; approved: number }> = {}
  const sorted = [...submissions].filter(s => s.created_at).sort(
    (a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
  )
  sorted.forEach(s => {
    const key = getMonthKey(s.created_at!)
    if (!monthMap[key]) { monthMap[key] = { submitted: 0, approved: 0 }; monthOrder.push(key) }
    monthMap[key].submitted++
    if (s.status === 'approved') monthMap[key].approved++
  })
  const trendData = monthOrder.map(k => ({ month: k, ...monthMap[k] }))

  // ── Status donut data ─────────────────────────────────────────────────────
  const statusData = Object.entries({
    approved: approvedCount,
    pending: pendingCount,
    changes_requested: changesCount,
    declined: declinedCount,
    draft: draftCount,
  }).filter(([, v]) => v > 0).map(([name, value]) => ({
    name: STATUS_LABELS[name] ?? name,
    value,
    color: STATUS_COLORS[name],
  }))

  // ── Ask size distribution (bar chart) ────────────────────────────────────
  const askBuckets: Record<string, number> = { '<$500': 0, '$500–$1k': 0, '$1k–$3k': 0, '$3k–$5k': 0, '$5k+': 0 }
  submissions.forEach(s => {
    const k = (s.financial_ask_cents || 0) / 100
    if (k < 500) askBuckets['<$500']++
    else if (k < 1000) askBuckets['$500–$1k']++
    else if (k < 3000) askBuckets['$1k–$3k']++
    else if (k < 5000) askBuckets['$3k–$5k']++
    else askBuckets['$5k+']++
  })
  const askDistData = Object.entries(askBuckets).map(([range, count]) => ({ range, count }))

  const axisStyle = { fill: '#71717a', fontSize: 11 }
  const gridStyle = { stroke: '#27272a', strokeDasharray: '3 3' }

  return (
    <div className="space-y-6">
      {/* Row 1 — 4 KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Secured"
          value={`$${(totalFunded / 100).toLocaleString()}`}
          icon={DollarSign}
          hint="Across approved pitches"
          accent
        />
        <StatCard
          label="Approval Rate"
          value={`${acceptanceRate}%`}
          icon={Percent}
          hint={`${approvedCount} of ${decidedCount} decided`}
        />
        <StatCard
          label="Avg Ask Size"
          value={avgAsk > 0 ? `$${(avgAsk / 100).toLocaleString()}` : '—'}
          icon={TrendingUp}
          hint="Per submission"
        />
        <StatCard
          label="Pending Review"
          value={pendingCount}
          icon={Clock}
          hint={`${changesCount} changes requested`}
        />
      </div>

      {/* Row 2 — more stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Submissions" value={submissions.length} icon={Send} hint="All time" />
        <StatCard label="Approved" value={approvedCount} icon={CheckCircle2} hint="By sponsors" />
        <StatCard label="Declined" value={declinedCount} icon={AlertCircle} hint="Admin decision" />
        <StatCard label="Active Drafts" value={draftCount} icon={Activity} hint="Awaiting submission" />
      </div>

      {/* Row 3 — Trend + Donut */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Submission trend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-foreground mb-1">Submission Trend</h3>
          <p className="text-xs text-muted-foreground mb-5">Monthly volume — submitted vs. approved</p>
          <div className="h-[240px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-submitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-approved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="submitted" name="Submitted"
                    stroke="#6366f1" strokeWidth={2} fill="url(#grad-submitted)"
                  />
                  <Area
                    type="monotone" dataKey="approved" name="Approved"
                    stroke="#10b981" strokeWidth={2} fill="url(#grad-approved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                No submission data yet
              </div>
            )}
          </div>
        </div>

        {/* Status donut */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-foreground mb-1">Outcome Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution by status</p>
          <div className="h-[200px]">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%" cy="50%"
                    innerRadius={58} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(v) => <span style={{ color: '#a1a1aa', fontSize: 11 }}>{v}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4 — Ask size distribution */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-1">Ask Size Distribution</h3>
        <p className="text-xs text-muted-foreground mb-5">How your pitches break down by funding requested</p>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={askDistData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="range" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Submissions" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={52} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
