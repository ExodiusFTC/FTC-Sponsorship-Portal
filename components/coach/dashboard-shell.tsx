'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Plus, ArrowUpRight, Sparkles, Building2 } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CopyInput } from '@/components/ui/copy-input'
import { FadeUp } from '@/components/motion/fade-up'
import { cn } from '@/lib/utils'

type Submission = {
  id: string
  company_name: string
  status: string
  updated_at: string
}

type Sponsor = {
  id: string
  name: string
  tag: string
  cap: string
  focus: string
}

const DEMO_SPONSORS: Sponsor[] = [
  { id: '1', name: 'Acme Robotics', tag: 'Hardware', cap: '$10,000', focus: 'Robotics & automation' },
  { id: '2', name: 'Beacon Foundation', tag: 'Education', cap: '$5,000', focus: 'STEM outreach' },
  { id: '3', name: 'Quantum Labs', tag: 'R&D', cap: '$12,500', focus: 'Applied research' },
  { id: '4', name: 'Hertz Technical', tag: 'Engineering', cap: '$7,500', focus: 'Mechanical engineering' },
  { id: '5', name: 'NorthStar Aero', tag: 'Aerospace', cap: '$15,000', focus: 'Flight systems' },
  { id: '6', name: 'Meridian Group', tag: 'Local', cap: '$2,500', focus: 'Community grants' },
]

const TABS = ['Overview', 'Submissions', 'Pitches', 'Insights'] as const
type Tab = typeof TABS[number]

export function DashboardShell({
  teamName,
  teamNumber,
  city,
  state,
  organization,
  portfolioAsk,
  submissions,
  activePitches,
  totalFunded,
  children,
}: {
  teamName: string
  teamNumber: string | number | null
  city: string
  state: string
  organization: string | null
  portfolioAsk: number
  submissions: Submission[]
  activePitches: number
  totalFunded: number
  children?: React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>('Overview')
  const reduce = useReducedMotion()

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
            {teamNumber ? `FTC · ${teamNumber}` : 'Incubator team'} · {city}, {state}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{teamName}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {organization ?? 'Independent'} · season dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/team/edit"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-3.5 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
          >
            Edit portfolio
          </Link>
          <Link
            href="/submissions/new"
            className="group inline-flex items-center gap-2 rounded-md bg-zinc-100 px-3.5 py-1.5 text-sm font-medium text-zinc-950 hover:bg-white transition-colors active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            New submission
            <kbd className="ml-1 inline-flex items-center rounded bg-zinc-900/30 px-1.5 text-[10px] font-mono text-zinc-700 border border-zinc-900/20">N</kbd>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-1 border-b border-zinc-900">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-3.5 py-2 text-sm transition-colors',
              tab === t ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t}
            {tab === t && (
              <motion.span
                layoutId="tab-underline"
                className="absolute left-0 right-0 -bottom-px h-px bg-zinc-100"
                transition={{ type: 'spring', stiffness: 450, damping: 36 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === 'Overview' && (
            <OverviewTab
              activePitches={activePitches}
              submissionsCount={submissions.length}
              totalFunded={totalFunded}
              portfolioAsk={portfolioAsk}
              submissions={submissions}
            />
          )}
          {tab === 'Submissions' && <SubmissionsTab submissions={submissions} />}
          {tab === 'Pitches' && <PitchesTab />}
          {tab === 'Insights' && <InsightsTab>{children}</InsightsTab>}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5 transition-colors hover:border-zinc-700">
      <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  )
}

function OverviewTab({
  activePitches,
  submissionsCount,
  totalFunded,
  portfolioAsk,
  submissions,
}: {
  activePitches: number
  submissionsCount: number
  totalFunded: number
  portfolioAsk: number
  submissions: Submission[]
}) {
  return (
    <div className="space-y-8">
      <FadeUp className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active pitches" value={activePitches} hint="Currently in review or approved" />
        <KpiCard label="Submissions" value={submissionsCount} hint="All-time sponsor outreach" />
        <KpiCard label="Funded" value={totalFunded} hint="Approved by sponsors" />
        <KpiCard label="Portfolio ask" value={`$${(portfolioAsk / 100).toLocaleString('en-US')}`} hint="Season target" />
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center justify-between border-b border-zinc-900 px-5 py-3">
            <div>
              <div className="text-sm font-medium text-zinc-100">Your trackable submission URLs</div>
              <div className="text-xs text-zinc-500 mt-0.5">Signed links sent to sponsors. Share with care.</div>
            </div>
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
              {submissions.length} total
            </span>
          </div>
          <div className="divide-y divide-zinc-900">
            {(submissions.length > 0 ? submissions : DEMO_SUBMISSIONS).slice(0, 5).map((s, i) => (
              <div key={s.id ?? i} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/60">
                    <Building2 className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-100">{s.company_name}</div>
                    <div className="text-xs text-zinc-500">
                      <StatusChip status={s.status} />
                    </div>
                  </div>
                </div>
                <CopyInput
                  value={`https://matchmaker.app/s/${s.id ?? 'demo'}`}
                  className="w-[320px] max-w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </FadeUp>

      <FindSponsors />
    </div>
  )
}

const DEMO_SUBMISSIONS: Submission[] = [
  { id: 'demo-1', company_name: 'Acme Robotics', status: 'pending', updated_at: new Date().toISOString() },
  { id: 'demo-2', company_name: 'Beacon Foundation', status: 'approved', updated_at: new Date().toISOString() },
  { id: 'demo-3', company_name: 'Quantum Labs', status: 'changes_requested', updated_at: new Date().toISOString() },
]

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'border-emerald-900/60 bg-emerald-500/5 text-emerald-300',
    pending: 'border-amber-900/60 bg-amber-500/5 text-amber-300',
    changes_requested: 'border-rose-900/60 bg-rose-500/5 text-rose-300',
    declined: 'border-zinc-800 bg-zinc-900 text-zinc-400',
  }
  const cls = map[status] ?? 'border-zinc-800 bg-zinc-900 text-zinc-400'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium mt-1', cls)}>
      {status.replace('_', ' ')}
    </span>
  )
}

function FindSponsors() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const tags = useMemo(() => ['all', ...Array.from(new Set(DEMO_SPONSORS.map((s) => s.tag)))], [])
  const results = useMemo(() => {
    return DEMO_SPONSORS.filter((s) => {
      const q = query.trim().toLowerCase()
      const matchesQ = !q || s.name.toLowerCase().includes(q) || s.focus.toLowerCase().includes(q)
      const matchesT = filter === 'all' || s.tag === filter
      return matchesQ && matchesT
    })
  }, [query, filter])

  return (
    <FadeUp delay={0.1}>
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-300" strokeWidth={1.5} />
            <div className="text-sm font-medium text-zinc-100">Find sponsors for your next pitch</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies, focus areas..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-950/80 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors capitalize',
                  filter === t
                    ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="group flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-[10px] font-semibold text-zinc-300">
                  {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-100 truncate">{s.name}</div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-zinc-100" strokeWidth={1.5} />
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 truncate">{s.focus}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-zinc-400">{s.tag}</span>
                    <span className="font-mono text-zinc-500">cap {s.cap}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {results.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
              No sponsors match that query.
            </div>
          )}
        </div>
      </div>
    </FadeUp>
  )
}

function SubmissionsTab({ submissions }: { submissions: Submission[] }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60">
      <div className="flex items-center justify-between border-b border-zinc-900 px-5 py-3">
        <div className="text-sm font-medium text-zinc-100">All submissions</div>
        <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
          {submissions.length}
        </span>
      </div>
      <div className="divide-y divide-zinc-900">
        {(submissions.length > 0 ? submissions : DEMO_SUBMISSIONS).map((s) => (
          <Link
            key={s.id}
            href={`/submissions/${s.id}/edit`}
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-900/40"
          >
            <div>
              <div className="text-sm font-medium text-zinc-100">{s.company_name}</div>
              <div className="text-xs text-zinc-500 mt-1" suppressHydrationWarning>
                Updated {new Date(s.updated_at).toLocaleDateString()}
              </div>
            </div>
            <StatusChip status={s.status} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function PitchesTab() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-16 text-center">
      <Sparkles className="mx-auto h-6 w-6 text-zinc-600" strokeWidth={1.5} />
      <div className="mt-4 text-sm font-medium text-zinc-200">Pitches live here soon.</div>
      <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
        Draft sponsor-specific pitches from your Portfolio. Shipping next season.
      </p>
    </div>
  )
}

function InsightsTab({ children }: { children?: React.ReactNode }) {
  return <div>{children ?? (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-16 text-center text-sm text-zinc-500">
      Insights coming soon — open rates, reply latency, sponsor funnel.
    </div>
  )}</div>
}
