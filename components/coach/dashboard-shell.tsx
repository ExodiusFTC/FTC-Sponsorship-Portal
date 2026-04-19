'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, ArrowUpRight, Sparkles, Building2, AlertCircle,
  Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CopyInput } from '@/components/ui/copy-input'
import { FadeUp } from '@/components/motion/fade-up'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PortfolioTab } from './portfolio-tab'
import { InboxTab } from './inbox-tab'
import { InsightsTab } from './insights-tab'
import { AccountSettings } from '@/components/account/account-settings'
import { updateTeam } from '@/app/actions/team'
import { toast } from 'sonner'
import type { Team, Notification } from '@/lib/supabase/types'

type Submission = {
  id: string
  company_name: string
  status: string
  updated_at: string
  admin_feedback?: string | null
  financial_ask_cents?: number
  created_at?: string
}

type Sponsor = {
  id: string
  company_name: string
  industry: string | null
  funding_cap_cents: number
  funding_used_cents: number
  website: string | null
  logo_url?: string | null
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'find-sponsors', label: 'Find Sponsors' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'insights', label: 'Insights' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'settings', label: 'Settings' },
]

export function DashboardShell({
  team,
  profile,
  sponsors,
  notifications,
  unreadCount,
  submissions,
  achievements,
  initialTab,
}: {
  team: Team
  profile: any
  sponsors: Sponsor[]
  notifications: Notification[]
  unreadCount: number
  submissions: Submission[]
  achievements: TeamAchievement[]
  initialTab?: string
}) {
  const router = useRouter()
  const reduce = useReducedMotion()

  const validTabs = useState(() => TABS.map(t => t.id))[0]
  const defaultTab = validTabs.includes(initialTab || '') ? initialTab! : 'overview'

  const [tab, setTabState] = useState(defaultTab)

  // Listen for tab changes from external components (like Sidebar)
  useEffect(() => {
    const handleTabChange = (e: any) => {
      const newTab = e.detail?.tab
      if (newTab && TABS.some(t => t.id === newTab)) {
        setTabState(newTab)
      }
    }
    window.addEventListener('dashboard-tab-change', handleTabChange)
    return () => window.removeEventListener('dashboard-tab-change', handleTabChange)
  }, [])

  // Also listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('tab') || 'overview'
      if (TABS.some(t_ => t_.id === t)) {
        setTabState(t)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const setTab = (newTab: string) => {
    if (newTab === tab) return
    setTabState(newTab)
    const url = newTab === 'overview' ? '/dashboard' : `/dashboard?tab=${newTab}`
    // Use replaceState to update URL without triggering a Next.js server-side refresh
    window.history.replaceState({ ...window.history.state, as: url, url }, '', url)
  }

  const activePitches = submissions.filter(s => s.status === 'pending' || s.status === 'approved').length
  const totalFunded = submissions.filter(s => s.status === 'approved').length

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {team.status === 'existing' ? `FTC · ${team.ftc_team_number}` : 'Incubator'} · {team.city ?? ''}, {team.state ?? ''}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{team.team_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{team.organization ?? 'Independent'}</p>
        </div>
      </div>

      {/* Tab content — no visible tab bar; navigation is sidebar-only */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={tab}
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.99, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
          transition={{ duration: 0.08, ease: 'easeOut' }}
          className="w-full"
        >
          {tab === 'overview' && (
            <OverviewTab
              switchTab={setTab}
              activePitches={activePitches}
              submissionsCount={submissions.length}
              totalFunded={totalFunded}
              portfolioAsk={team.financial_ask_cents || 0}
              submissions={submissions}
            />
          )}
          {tab === 'portfolio' && <PortfolioTab team={team} achievements={achievements} />}
          {tab === 'find-sponsors' && <FindSponsorsTab sponsors={sponsors} />}
          {tab === 'submissions' && <SubmissionsTab submissions={submissions} />}
          {tab === 'inbox' && <InboxTab notifications={notifications} switchTab={setTab} />}
          {tab === 'insights' && <InsightsTab submissions={submissions} />}
          {tab === 'ledger' && <LedgerTab team={team} />}
          {tab === 'settings' && (
            <div className="max-w-[600px] mx-auto">
              <AccountSettings currentName={profile?.full_name} email={profile?.email} role={profile?.role} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── Shared components ──────────────────────────────────────────────────────── */

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    approved: { bg: 'var(--badge-success-bg)', text: 'var(--badge-success-text)', border: 'var(--badge-success-text)' },
    pending: { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)', border: 'var(--badge-warning-text)' },
    changes_requested: { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)', border: 'var(--badge-warning-text)' },
    declined: { bg: 'var(--badge-rejected-bg)', text: 'var(--badge-rejected-text)', border: 'var(--badge-rejected-text)' },
    draft: { bg: 'var(--badge-pending-bg)', text: 'var(--badge-pending-text)', border: 'var(--badge-pending-text)' },
  }
  const config = statusConfig[status] ?? statusConfig.draft
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border,
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

/* ── Overview tab ───────────────────────────────────────────────────────────── */

function OverviewTab({
  switchTab, activePitches, submissionsCount, totalFunded, portfolioAsk, submissions,
}: {
  switchTab: (t: string) => void
  activePitches: number
  submissionsCount: number
  totalFunded: number
  portfolioAsk: number
  submissions: Submission[]
}) {
  const needsAttention = submissions.filter(s => s.status === 'declined' || s.status === 'changes_requested')

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => switchTab('portfolio')}
        >
          Edit Portfolio
        </Button>
      </div>

      {needsAttention.length > 0 && (
        <FadeUp>
          <div className="space-y-3">
            {needsAttention.map(s => (
              <div key={s.id} className="rounded-xl border border-border bg-destructive/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[var(--accent-error)]" />
                    <h4 className="text-sm font-medium text-[var(--accent-error)]">
                      {s.status === 'declined' ? 'Submission Declined' : 'Changes Requested'}
                    </h4>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{s.company_name}</span>: {s.admin_feedback || 'Needs your attention.'}
                  </p>
                </div>
                <Link
                  href={`/submissions/${s.id}/edit`}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-[6px] bg-[var(--accent-error)] text-white px-3 h-9 shrink-0 text-sm font-medium transition-all hover:brightness-105 active:scale-95 shadow-[0_0_12px_rgba(229,32,32,0.18)]"
                >
                  Review Submission
                </Link>
              </div>
            ))}
          </div>
        </FadeUp>
      )}

      <FadeUp className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active pitches" value={activePitches} hint="In review or approved" />
        <KpiCard label="Submissions" value={submissionsCount} hint="All-time sponsor outreach" />
        <KpiCard label="Funded" value={totalFunded} hint="Approved by sponsors" />
        <KpiCard label="Portfolio ask" value={`$${(portfolioAsk / 100).toLocaleString('en-US')}`} hint="Season target" />
      </FadeUp>

      {/* Trackable URLs panel — centered */}
      <FadeUp delay={0.05} className="max-w-[800px] mx-auto w-full">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div>
              <div className="text-sm font-medium text-foreground">Your trackable submission URLs</div>
              <div className="text-xs text-muted-foreground mt-0.5">Signed links sent to sponsors. Share with care.</div>
            </div>
            <span className="rounded-md border border-border bg-accent px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              {submissions.length} total
            </span>
          </div>
          <div className="divide-y divide-border">
            {submissions.slice(0, 5).map(s => (
              <div key={s.id} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border bg-accent">
                    <Building2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{s.company_name}</div>
                    <div className="mt-0.5"><StatusChip status={s.status} /></div>
                  </div>
                </div>
                <CopyInput value={`https://matchmaker.app/s/${s.id}`} className="w-[280px] max-w-full" />
              </div>
            ))}
            {submissions.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">No submissions yet.</div>
            )}
          </div>
        </div>
      </FadeUp>
    </div>
  )
}

/* ── Find Sponsors tab ──────────────────────────────────────────────────────── */

const FUNDING_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Under $1k', min: 0, max: 100_000 },
  { label: '$1k – $5k', min: 100_000, max: 500_000 },
  { label: '$5k+', min: 500_000, max: Infinity },
]

function SponsorInitials({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className="h-full w-full object-cover rounded-lg" />
    )
  }
  return (
    <span className="text-sm font-semibold text-zinc-300">{initials}</span>
  )
}

function FindSponsorsTab({ sponsors }: { sponsors: Sponsor[] }) {
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('all')
  const [fundingRange, setFundingRange] = useState(0) // index into FUNDING_RANGES

  const industries = ['all', ...Array.from(new Set(sponsors.map(s => s.industry).filter(Boolean) as string[]))]

  const { min, max } = FUNDING_RANGES[fundingRange]

  const results = sponsors.filter(s => {
    const q = query.trim().toLowerCase()
    const remaining = s.funding_cap_cents - s.funding_used_cents
    return (
      (!q || s.company_name.toLowerCase().includes(q)) &&
      (industry === 'all' || s.industry === industry) &&
      remaining >= min && remaining < max
    )
  })

  return (
    <FadeUp>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-zinc-100">Find sponsors for your next pitch</h2>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search companies…"
              className="w-full rounded-lg border border-border bg-card/80 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Industry pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {industries.map(t => (
              <button
                key={t}
                onClick={() => setIndustry(t)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors capitalize',
                  industry === t
                    ? 'border-indigo-600 bg-indigo-600/20 text-indigo-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Funding range pills */}
          <div className="flex gap-1.5 items-center">
            {FUNDING_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setFundingRange(i)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  fundingRange === i
                    ? 'border-emerald-600/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-border/80'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sponsor cards — larger, more visual */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map(s => {
              const remaining = s.funding_cap_cents - s.funding_used_cents
              const pct = s.funding_cap_cents > 0 ? Math.round((s.funding_used_cents / s.funding_cap_cents) * 100) : 0
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="group flex flex-col gap-0 rounded-xl border border-zinc-800/80 bg-zinc-950 overflow-hidden transition-colors hover:border-zinc-600"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-4 p-5 pb-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                      <SponsorInitials name={s.company_name} logoUrl={s.logo_url} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-zinc-100 truncate">{s.company_name}</div>
                      {s.industry && (
                        <span className="mt-1 inline-block rounded bg-indigo-900/40 border border-indigo-800/60 px-2 py-0.5 text-[10px] text-indigo-300 capitalize">
                          {s.industry}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funding bar */}
                  <div className="px-5 pb-4 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Remaining</span>
                      <span className="font-mono text-zinc-300">${(remaining / 100).toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${100 - pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-600">{100 - pct}% capacity available</div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto border-t border-zinc-900 grid grid-cols-2 divide-x divide-zinc-900">
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-3 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-colors"
                      >
                        Visit site <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <div />
                    )}
                    <Link
                      href={`/submissions/new?sponsor=${s.id}`}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors',
                        s.website
                          ? 'text-zinc-100 hover:bg-zinc-900/60'
                          : 'col-span-2 text-zinc-100 hover:bg-zinc-900/60',
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" /> Pitch this sponsor
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {results.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
              No sponsors match your filters.
            </div>
          )}
        </div>
      </div>
    </FadeUp>
  )
}

/* ── Submissions tab ────────────────────────────────────────────────────────── */

type SubmissionFilter = 'all' | 'approved' | 'declined' | 'pending' | 'draft'

const SUBMISSION_FILTERS: { id: SubmissionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Accepted' },
  { id: 'pending', label: 'Pending' },
  { id: 'declined', label: 'Rejected' },
  { id: 'draft', label: 'Drafts' },
]

function SubmissionsTab({ submissions }: { submissions: Submission[] }) {
  const [filter, setFilter] = useState<SubmissionFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = submissions.filter(s => {
    if (filter === 'all') return true
    if (filter === 'declined') return s.status === 'declined' || s.status === 'changes_requested'
    return s.status === filter
  })

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SUBMISSION_FILTERS.map(f => {
          const count = f.id === 'all'
            ? submissions.length
            : f.id === 'declined'
              ? submissions.filter(s => s.status === 'declined' || s.status === 'changes_requested').length
              : submissions.filter(s => s.status === f.id).length
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                filter === f.id
                  ? 'border-foreground bg-foreground text-background font-medium'
                  : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-border/80'
              )}
            >
              {f.label} <span className="ml-1 opacity-50">{count}</span>
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card/60 divide-y divide-border">
        {filtered.map(s => {
          const isEditable = ['draft', 'declined', 'changes_requested'].includes(s.status)
          const expanded = expandedId === s.id
          return (
            <div key={s.id} className="transition-colors hover:bg-zinc-900/20">
              <div
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : s.id)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/60">
                    <Building2 className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">{s.company_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusChip status={s.status} />
                      <span className="text-[10px] text-zinc-600" suppressHydrationWarning>
                        {new Date(s.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditable ? (
                    <Link
                      href={`/submissions/${s.id}/edit`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium transition-colors"
                    >
                      Edit
                    </Link>
                  ) : (
                    <Link
                      href={`/submissions/${s.id}/edit`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium transition-colors"
                    >
                      View
                    </Link>
                  )}
                  <span className="text-zinc-600">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3 border-t border-zinc-900 pt-4">
                      {s.admin_feedback && (
                        <div className="rounded-lg border border-amber-900/50 bg-amber-900/10 p-3 text-xs text-amber-200">
                          <span className="font-semibold text-amber-400">Admin feedback: </span>{s.admin_feedback}
                        </div>
                      )}
                      {s.financial_ask_cents !== undefined && (
                        <div className="text-xs text-zinc-500">
                          Ask: <span className="text-zinc-300 font-mono">${(s.financial_ask_cents / 100).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm">No submissions in this category.</div>
        )}
      </div>
    </div>
  )
}

/* ── Ledger tab — inline editing ────────────────────────────────────────────── */

type BudgetItem = { label: string; qty: number; unit_cost_cents: number; total_cents: number }

function LedgerTab({ team }: { team: Team }) {
  const [items, setItems] = useState<BudgetItem[]>(() =>
    (team.budget_items as BudgetItem[] | null) ?? []
  )
  const [isPending, startTransition] = useTransition()

  const runningTotal = items.reduce((acc, i) => acc + (i.total_cents || 0), 0)

  function updateItem(index: number, field: keyof BudgetItem, raw: string) {
    setItems(prev => {
      const next = [...prev]
      if (field === 'label') {
        next[index] = { ...next[index], label: raw }
      } else {
        const dollars = parseFloat(raw) || 0
        const cents = Math.round(dollars * 100)
        if (field === 'qty') {
          const qty = parseInt(raw) || 0
          const unit = next[index].unit_cost_cents
          next[index] = { ...next[index], qty, total_cents: qty * unit }
        } else if (field === 'unit_cost_cents') {
          next[index] = { ...next[index], unit_cost_cents: cents, total_cents: next[index].qty * cents }
        }
      }
      return next
    })
  }

  function addItem() {
    setItems(prev => [...prev, { label: '', qty: 1, unit_cost_cents: 0, total_cents: 0 }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function save() {
    startTransition(async () => {
      const budgetItems = items.map(i => ({
        label: i.label,
        qty: i.qty,
        unitCostCents: i.unit_cost_cents,
        totalCents: i.total_cents,
      }))
      const total = items.reduce((a, i) => a + i.total_cents, 0)
      const result = await updateTeam(team.id, { budgetItems, financialAskCents: total } as any)
      if (result?.error) toast.error('Failed to save: ' + result.error)
      else toast.success('Ledger saved!')
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-zinc-100">Team Ledger</h2>
          <p className="text-sm text-zinc-400 mt-1">Edit your budget items directly. Changes save to your portfolio.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 h-9 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Item
          </button>
          <button
            onClick={save}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md bg-foreground px-3.5 h-9 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save Ledger'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-mono">
            <tr>
              <th className="px-4 py-3 border-r border-zinc-800 w-[42%]">Item</th>
              <th className="px-4 py-3 border-r border-zinc-800 text-right w-[12%]">Qty</th>
              <th className="px-4 py-3 border-r border-zinc-800 text-right w-[18%]">Unit ($)</th>
              <th className="px-4 py-3 border-r border-zinc-800 text-right w-[18%]">Total</th>
              <th className="px-4 py-3 w-[10%]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-zinc-900/20 transition-colors group">
                <td className="px-3 py-2 border-r border-zinc-800">
                  <input
                    value={item.label}
                    onChange={e => updateItem(i, 'label', e.target.value)}
                    placeholder="Item name…"
                    className="w-full bg-transparent text-zinc-200 placeholder:text-zinc-700 outline-none focus:text-zinc-50"
                  />
                </td>
                <td className="px-3 py-2 border-r border-zinc-800">
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={e => updateItem(i, 'qty', e.target.value)}
                    className="w-full bg-transparent text-right text-zinc-400 outline-none focus:text-zinc-200 tabular-nums"
                  />
                </td>
                <td className="px-3 py-2 border-r border-zinc-800">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={(item.unit_cost_cents / 100).toFixed(2)}
                    onChange={e => updateItem(i, 'unit_cost_cents', e.target.value)}
                    className="w-full bg-transparent text-right text-zinc-400 outline-none focus:text-zinc-200 tabular-nums"
                  />
                </td>
                <td className="px-4 py-2 border-r border-zinc-800 text-right font-mono text-zinc-300 tabular-nums">
                  ${(item.total_cents / 100).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => removeItem(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 text-sm">
                  No items yet. Click "Add Item" to get started.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-zinc-900 border-t border-zinc-800">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-[11px] font-mono text-zinc-500 uppercase tracking-widest border-r border-zinc-800">
                Portfolio Total Ask
              </td>
              <td className="px-4 py-3 text-right text-base font-semibold text-emerald-400 tabular-nums border-r border-zinc-800">
                ${(runningTotal / 100).toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
