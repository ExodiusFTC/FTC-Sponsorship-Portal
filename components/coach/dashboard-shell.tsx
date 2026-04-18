'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, ArrowUpRight, Sparkles, Building2, LayoutDashboard, BookOpen, Target, FileText, Inbox, BarChart2, Wallet, Settings as SettingsIcon } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CopyInput } from '@/components/ui/copy-input'
import { FadeUp } from '@/components/motion/fade-up'
import { cn } from '@/lib/utils'
import { PortfolioTab } from './portfolio-tab'
import { InboxTab } from './inbox-tab'
import { InsightsTab } from './insights-tab'
import { AccountSettings } from '@/components/account/account-settings'
import type { Team, Notification } from '@/lib/supabase/types'
import { Checkbox } from '@/components/ui/checkbox'

type Submission = {
  id: string
  company_name: string
  status: string
  updated_at: string
  admin_feedback?: string | null
  financial_ask_cents?: number
}

type Sponsor = {
  id: string
  company_name: string
  industry: string | null
  funding_cap_cents: number
  funding_used_cents: number
  website: string | null
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
  initialTab
}: {
  team: Team
  profile: any
  sponsors: Sponsor[]
  notifications: Notification[]
  unreadCount: number
  submissions: Submission[]
  initialTab?: string
}) {
  const router = useRouter()
  const reduce = useReducedMotion()
  
  const validTabs = TABS.map(t => t.id)
  const defaultTab = validTabs.includes(initialTab || '') ? initialTab : 'overview'
  
  const [tab, setTabState] = useState(defaultTab)

  const setTab = (newTab: string) => {
    setTabState(newTab)
    const url = newTab === 'overview' ? '/dashboard' : `/dashboard?tab=${newTab}`
    router.replace(url, { scroll: false })
  }

  const activePitches = submissions.filter(s => s.status === 'pending' || s.status === 'approved').length
  const totalFunded = submissions.filter(s => s.status === 'approved').length

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
            {team.status === 'existing' ? `FTC · ${team.ftc_team_number}` : 'Incubator team'} · {team.city ?? ''}, {team.state ?? ''}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{team.team_name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {team.organization ?? 'Independent'} · season dashboard
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative flex flex-wrap gap-1 border-b border-zinc-900 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative px-3.5 py-2 text-sm transition-colors',
              tab === t.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t.label}
            {t.id === 'inbox' && unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
            {tab === t.id && (
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
          {tab === 'portfolio' && <PortfolioTab team={team} />}
          {tab === 'find-sponsors' && <FindSponsors sponsors={sponsors} />}
          {tab === 'submissions' && <SubmissionsTab submissions={submissions} />}
          {tab === 'inbox' && <InboxTab notifications={notifications} switchTab={setTab} />}
          {tab === 'insights' && <InsightsTab submissions={submissions} />}
          {tab === 'ledger' && <LedgerTab budgetItems={team.budget_items} switchTab={setTab} />}
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
  switchTab,
  activePitches,
  submissionsCount,
  totalFunded,
  portfolioAsk,
  submissions,
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
         <button onClick={() => switchTab('portfolio')} className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-3.5 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900 transition-colors">
            Edit Portfolio
         </button>
      </div>
      
      {needsAttention.length > 0 && (
        <FadeUp>
          <div className="space-y-3">
             {needsAttention.map((s) => (
                <div key={s.id} className="rounded-xl border border-amber-900/50 bg-amber-900/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div>
                     <div className="flex items-center gap-2">
                       <AlertCircle className="h-4 w-4 text-amber-500" />
                       <h4 className="text-sm font-medium text-amber-400">{s.status === 'declined' ? 'Submission Declined' : 'Changes Requested'}</h4>
                     </div>
                     <p className="mt-1 text-sm text-amber-200/70">
                       <span className="font-semibold text-amber-200">{s.company_name}</span>: {s.admin_feedback || 'Needs your attention.'}
                     </p>
                   </div>
                   <Link href={`/submissions/${s.id}/edit`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-amber-500 text-amber-950 px-3 flex-shrink-0 h-9 shrink-0 text-sm font-medium transition-colors hover:bg-amber-400">
                     Review Submission
                   </Link>
                </div>
             ))}
          </div>
        </FadeUp>
      )}

      <FadeUp className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active pitches" value={activePitches} hint="Currently in review or approved" />
        <KpiCard label="Submissions" value={submissionsCount} hint="All-time sponsor outreach" />
        <KpiCard label="Funded" value={totalFunded} hint="Approved by sponsors" />
        <KpiCard label="Portfolio ask" value={`$${(portfolioAsk / 100).toLocaleString('en-US')}`} hint="Season target" />
      </FadeUp>

      <FadeUp delay={0.05} className="max-w-[800px] mx-auto">
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
            {submissions.slice(0, 5).map((s) => (
              <div key={s.id} className="grid grid-cols-[1fr,auto] items-center gap-4 px-5 py-3">
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
                  value={`https://matchmaker.app/s/${s.id}`}
                  className="w-[320px] max-w-full"
                />
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

import { AlertCircle } from 'lucide-react'

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'border-emerald-900/60 bg-emerald-500/5 text-emerald-300',
    pending: 'border-amber-900/60 bg-amber-500/5 text-amber-300',
    changes_requested: 'border-rose-900/60 bg-rose-500/5 text-rose-300',
    declined: 'border-zinc-800 bg-zinc-900 text-zinc-400',
    draft: 'border-zinc-800 bg-zinc-950 text-zinc-500',
  }
  const cls = map[status] ?? 'border-zinc-800 bg-zinc-900 text-zinc-400'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium mt-1', cls)}>
      {status.replace('_', ' ')}
    </span>
  )
}

function FindSponsors({ sponsors }: { sponsors: Sponsor[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const tags = ['all', ...Array.from(new Set(sponsors.map(s => s.industry).filter(Boolean)))]

  const results = sponsors.filter(s => {
    const q = query.trim().toLowerCase()
    const matchesQ = !q || s.company_name.toLowerCase().includes(q)
    const matchesT = filter === 'all' || s.industry === filter
    return matchesQ && matchesT
  })

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
              placeholder="Search companies..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-950/80 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-600"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t as string)}
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
                className="group flex flex-col gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-[10px] font-semibold text-zinc-300">
                    {s.company_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-100 truncate">{s.company_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {s.industry && <span className="text-[10px] rounded bg-zinc-900 border border-zinc-800 px-1.5 text-zinc-400 capitalize">{s.industry}</span>}
                      <span className="text-[10px] font-mono text-zinc-500">Cap ${(s.funding_cap_cents / 100).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-2 grid grid-cols-2 gap-2 border-t border-zinc-900">
                   {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="text-xs text-center p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 rounded transition-colors group/link">Site <ArrowUpRight className="inline-block h-3 w-3 align-text-bottom opacity-50 group-hover/link:opacity-100" /></a>}
                   <Link href={`/submissions/new?sponsor=${s.id}`} className={cn("text-xs text-center p-1.5 transition-colors font-medium rounded", s.website ? '' : 'col-span-2', "bg-zinc-100 text-zinc-950 hover:bg-white")}>
                     Target
                   </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {results.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
               No sponsors found.
            </div>
          )}
        </div>
      </div>
    </FadeUp>
  )
}

function SubmissionsTab({ submissions }: { submissions: Submission[] }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-900 px-5 py-3">
        <div className="text-sm font-medium text-zinc-100">All submissions</div>
        <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
          {submissions.length}
        </span>
      </div>
      <div className="divide-y divide-zinc-900">
        {submissions.map((s) => {
           const isEditable = ['draft', 'declined', 'changes_requested'].includes(s.status)
           return (
             <div
               key={s.id}
               className="flex flex-col md:flex-row md:items-start justify-between gap-4 px-5 py-4 hover:bg-zinc-900/40 transition-colors group"
             >
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-3">
                   <div className="text-sm font-medium text-zinc-100 truncate">{s.company_name}</div>
                   <StatusChip status={s.status} />
                 </div>
                 {s.admin_feedback && <div className="text-xs text-amber-500 mt-2 bg-amber-500/10 p-2 rounded inline-block">Feedback: {s.admin_feedback}</div>}
                 <div className="text-[10px] text-zinc-500 mt-2 select-none" suppressHydrationWarning>
                   Updated {new Date(s.updated_at).toLocaleDateString()}
                 </div>
               </div>
               <div className="flex items-center gap-2 mt-2 md:mt-0">
                 <Link href={`/submissions/new?reuse=${s.id}`} className="text-xs px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-600 text-zinc-300">
                   Reuse Content
                 </Link>
                 {isEditable ? (
                   <Link href={`/submissions/${s.id}/edit`} className="text-xs px-3 py-1.5 bg-zinc-100 border border-zinc-100 rounded hover:bg-white text-zinc-900 font-medium">
                     Edit
                   </Link>
                 ) : (
                   <Link href={`/submissions/${s.id}/edit`} className="text-xs px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-600 text-zinc-300">
                     View
                   </Link>
                 )}
               </div>
             </div>
           )
        })}
        {submissions.length === 0 && (
           <div className="p-8 text-center text-zinc-500 text-sm">No submissions yet.</div>
        )}
      </div>
    </div>
  )
}

function LedgerTab({ budgetItems, switchTab }: { budgetItems: any[], switchTab: (t: string) => void }) {
  const items = budgetItems || []
  const runningTotal = items.reduce((acc, item) => acc + (item.total_cents || 0), 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-xl font-medium text-zinc-100">Team Ledger</h2>
           <p className="text-sm text-zinc-400 mt-1">Review your portfolio budget items.</p>
        </div>
        <button onClick={() => switchTab('portfolio')} className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-zinc-100 px-3.5 h-9 shrink-0 text-sm font-medium text-zinc-900 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 active:scale-[0.98]">
           Edit Items
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-mono">
            <tr>
              <th className="px-4 py-3 border-r border-zinc-800 w-[50%]">Item Label</th>
              <th className="px-4 py-3 border-r border-zinc-800 text-right w-[15%]">Qty</th>
              <th className="px-4 py-3 border-r border-zinc-800 text-right w-[15%]">Unit Cost</th>
              <th className="px-4 py-3 text-right text-zinc-100 w-[20%]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
             {items.map((item, i) => (
                <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-3 border-r border-zinc-800 font-medium text-zinc-200">{item.label}</td>
                  <td className="px-4 py-3 border-r border-zinc-800 text-right text-zinc-400">{item.qty}</td>
                  <td className="px-4 py-3 border-r border-zinc-800 text-right text-zinc-400">${((item.unit_cost_cents)/100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-zinc-300 font-mono">${((item.total_cents)/100).toFixed(2)}</td>
                </tr>
             ))}
             {items.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No budget items defined in your portfolio.</td>
                </tr>
             )}
          </tbody>
          <tfoot className="bg-zinc-900 border-t border-zinc-800">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-[11px] font-mono text-zinc-500 uppercase tracking-widest border-r border-zinc-800">Portfolio Total Ask</td>
              <td className="px-4 py-3 text-right text-base font-semibold text-emerald-400 tabular-nums">${(runningTotal/100).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
