'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
  LineChart, Line, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'
import { 
  TrendingUp, CheckCircle2, Clock, DollarSign, 
  Percent, Activity, Send, Calendar, Target, 
  BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Submission, Sponsor, Team, SubmissionSummary } from '@/lib/supabase/types'

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
      className={cn(
        "relative rounded-xl border p-5 overflow-hidden transition-all hover:shadow-md group",
        accent ? "border-primary/20 bg-primary/5" : "border-border bg-card shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
          <div className={cn(
            "text-2xl font-bold tracking-tight tabular-nums",
            accent ? "text-primary" : "text-foreground"
          )}>
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
          accent ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
        )}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
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
  draft: '#71717a',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card/95 px-3 py-2.5 shadow-2xl text-xs backdrop-blur-md">
      {label && <div className="text-muted-foreground font-medium mb-1.5 border-b border-border pb-1">{label}</div>}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.color || p.fill }} />
              <span className="text-muted-foreground">{p.name}:</span>
            </div>
            <span className="font-mono text-foreground font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InsightsTab({ 
  submissions, 
  team 
}: { 
  submissions: SubmissionSummary[], 
  sponsors: Sponsor[],
  team: Team
}) {
  const [currentSeason, setCurrentSeason] = useState<string>('2024-25')

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => s.season === currentSeason || !s.season)
  }, [submissions, currentSeason])

  // ── Core Stats ─────────────────────────────────────────────────────────────
  const totalFunded = filteredSubmissions.filter(s => s.status === 'approved').reduce((a, s) => a + (team.financial_ask_cents || 0), 0)
  const approvedCount = filteredSubmissions.filter(s => s.status === 'approved').length
  const declinedCount = filteredSubmissions.filter(s => s.status === 'declined').length
  const pendingCount = filteredSubmissions.filter(s => s.status === 'pending').length
  const changesCount = filteredSubmissions.filter(s => s.status === 'changes_requested').length
  const draftCount = filteredSubmissions.filter(s => s.status === 'draft').length
  const decidedCount = approvedCount + declinedCount
  const acceptanceRate = decidedCount === 0 ? 0 : Math.round((approvedCount / decidedCount) * 100)
  const avgAsk = filteredSubmissions.length > 0
    ? team.financial_ask_cents
    : 0

  // ── 1. Ask Size Distribution (BarChart) ────────────────────────────────────
  const askDistData = useMemo(() => {
    const buckets: Record<string, number> = { '<$500': 0, '$500–$1k': 0, '$1k–$3k': 0, '$3k–$5k': 0, '$5k+': 0 }
    filteredSubmissions.forEach(s => {
      const k = (team.financial_ask_cents || 0) / 100
      if (k < 500) buckets['<$500']++
      else if (k < 1000) buckets['$500–$1k']++
      else if (k < 3000) buckets['$1k–$3k']++
      else if (k < 5000) buckets['$3k–$5k']++
      else buckets['$5k+']++
    })
    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  }, [filteredSubmissions, team.financial_ask_cents])

  // ── 2. Submission Funnel (Horizontal Bar) ──────────────────────────────────
  const funnelData = [
    { stage: 'Drafts', count: draftCount + pendingCount + approvedCount + declinedCount + changesCount },
    { stage: 'Submitted', count: pendingCount + approvedCount + declinedCount + changesCount },
    { stage: 'Reviewed', count: approvedCount + declinedCount + changesCount },
    { stage: 'Approved', count: approvedCount },
  ]

  // ── 3. Cumulative Funding (per season) ─────────────────────────────────────
  const cumulativeData = useMemo(() => {
    let total = 0
    const sortedApproved = filteredSubmissions
      .filter(s => s.status === 'approved')
      .sort((a, b) => new Date((a.updated_at || a.created_at) ?? 0).getTime() - new Date((b.updated_at || b.created_at) ?? 0).getTime())
    
    return sortedApproved.map(s => {
      total += (team.financial_ask_cents || 0) / 100
      return {
        date: new Date((s.updated_at || s.created_at) ?? 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amount: total
      }
    })
  }, [filteredSubmissions])

  // ── 4. Funding Progress (Radial Bar) ───────────────────────────────────────
  const goalCents = team.seed_funding_goals_cents || 1000000 
  const progressPercent = Math.min(100, Math.round((totalFunded / goalCents) * 100))
  // Recharts RadialBarChart fix: Use a single data point with [0, 100] domain
  const progressData = [{ value: progressPercent }]

  // ── 5. Status Composition (PieChart) ───────────────────────────────────────
  const statusData = useMemo(() => [
    { name: 'Approved', value: approvedCount, color: STATUS_COLORS.approved },
    { name: 'Pending', value: pendingCount, color: STATUS_COLORS.pending },
    { name: 'Changes', value: changesCount, color: STATUS_COLORS.changes_requested },
    { name: 'Declined', value: declinedCount, color: STATUS_COLORS.declined },
    { name: 'Draft', value: draftCount, color: STATUS_COLORS.draft },
  ].filter(d => d.value > 0), [approvedCount, pendingCount, changesCount, declinedCount, draftCount])

  const axisStyle = { fill: '#71717a', fontSize: 10, fontWeight: 500 }
  const gridStyle = { stroke: '#27272a', strokeDasharray: '4 4' }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Season Selector */}
      <div className="flex items-center justify-between bg-card/50 p-4 rounded-2xl border border-border backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Season Insights</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Performance tracking for {currentSeason}</p>
          </div>
        </div>
        
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 bg-accent border-none rounded-lg text-sm font-medium px-3 py-2 outline-none cursor-pointer hover:bg-accent/80 transition-colors">
            <span>{currentSeason} Season</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setCurrentSeason('2024-25')}>
            2024-25 Season
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCurrentSeason('2023-24')}>
            2023-24 Season
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Secured" value={`$${(totalFunded / 100).toLocaleString()}`} icon={DollarSign} hint="Current season" accent />
        <StatCard label="Approval Rate" value={`${acceptanceRate}%`} icon={Percent} hint={`${approvedCount} approved`} />
        <StatCard label="Avg Ask Size" value={avgAsk > 0 ? `$${(avgAsk / 100).toLocaleString()}` : '—'} icon={TrendingUp} hint="Per submission" />
        <StatCard label="Active Drafts" value={draftCount} icon={Activity} hint="Ready to send" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ask Size Distribution */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col h-[340px]">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-foreground">Ask Size Distribution</h3>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={askDistData}>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="range" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" name="Submissions" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Funding */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col h-[340px]">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Cumulative Funding</h3>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="amount" name="Total ($)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Submission Funnel */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col h-[320px]">
          <h3 className="text-sm font-semibold text-foreground mb-6">Submission Funnel</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={funnelData} margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="stage" type="category" tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Composition */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col h-[320px]">
          <h3 className="text-sm font-semibold text-foreground mb-6">Status Composition</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funding Progress - FIXED RADIAL BAR */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col h-[320px]">
          <h3 className="text-sm font-semibold text-foreground mb-6">Goal Progress</h3>
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                innerRadius="70%" 
                outerRadius="100%" 
                data={progressData} 
                startAngle={90} 
                endAngle={90 - (360 * (progressPercent / 100))}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: '#27272a' }}
                  dataKey="value"
                  cornerRadius={10}
                  fill="#10b981"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">{progressPercent}%</span>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest mt-1">Funded</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              ${(totalFunded / 100).toLocaleString()} of ${(goalCents / 100).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
