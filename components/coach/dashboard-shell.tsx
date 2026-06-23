'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Search, Plus, ArrowUpRight, Sparkles, Building2, AlertCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { FadeUp } from '@/components/motion/fade-up'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatCard } from '@/components/ui/stat-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { PortfolioTab } from './portfolio-tab'
import { InboxTab } from './inbox-tab'
import { AccountSettings } from '@/components/account/account-settings'
import { updateTeam } from '@/app/actions/team'
import { toast } from 'sonner'
import type { Team, Notification, Submission, Sponsor, TeamAchievement, SubmissionSummary } from '@/lib/supabase/types'

/* Three primary destinations + two reachable-but-hidden views (Inbox via the
   top-bar bell, Settings via the account menu). Legacy tab names are aliased
   so old links and keyboard shortcuts keep working. */
const TABS = [
  { id: 'overview', label: 'Home' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'settings', label: 'Settings' },
]

const TAB_ALIASES: Record<string, string> = {
  'find-sponsors': 'sponsors',
  'submissions': 'sponsors',
  'drafts': 'sponsors',
  'ledger': 'portfolio',
  'insights': 'overview',
}

export function DashboardShell({
  team,
  profile,
  sponsors,
  notifications,
  unreadCount,
  submissions,
  achievements,
}: {
  team: Team
  profile: any
  sponsors: Sponsor[]
  notifications: Notification[]
  unreadCount: number
  submissions: SubmissionSummary[]
  achievements: TeamAchievement[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reduce = useReducedMotion()

  const rawTab = searchParams.get('tab') ?? 'overview'
  const canonical = TAB_ALIASES[rawTab] ?? rawTab
  const tab = TABS.some(t => t.id === canonical) ? canonical : 'overview'
  // When arriving from a legacy "submissions"/"drafts" link, open the pitches view.
  const initialSponsorsView: 'find' | 'pitches' = (rawTab === 'submissions' || rawTab === 'drafts') ? 'pitches' : 'find'

  const setTab = (newTab: string) => {
    const sp = new URLSearchParams(searchParams)
    if (newTab === 'overview') sp.delete('tab')
    else sp.set('tab', newTab)
    router.replace(`${pathname}${sp.size ? `?${sp}` : ''}`, { scroll: false })
  }

  const activePitches = submissions.filter(s => s.status === 'pending' || s.status === 'dispatched' || s.status === 'approved').length
  const totalFunded = submissions.filter(s => s.status === 'approved').length

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {team.status === 'existing' ? `FTC · ${team.ftc_team_number}` : 'Incubator'}
            {(team.city || team.state) && (
              <> · {team.city}{team.city && team.state && ', '}{team.state}</>
            )}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">{team.team_name}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{team.organization ?? 'Independent'}</p>
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
              team={team}
              switchTab={setTab}
              activePitches={activePitches}
              submissionsCount={submissions.length}
              totalFunded={totalFunded}
              portfolioAsk={team.financial_ask_cents || 0}
              submissions={submissions}
            />
          )}
          {tab === 'portfolio' && <PortfolioTab team={team} achievements={achievements} />}
          {tab === 'sponsors' && <SponsorsTab sponsors={sponsors} submissions={submissions} initialView={initialSponsorsView} />}
          {tab === 'inbox' && <InboxTab notifications={notifications} switchTab={setTab} />}
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

function StatusChip({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    approved: { bg: 'var(--badge-success-bg)', text: 'var(--badge-success-text)', border: 'var(--badge-success-text)' },
    dispatched: { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)', border: 'var(--badge-warning-text)' },
    pending: { bg: 'var(--badge-pending-bg)', text: 'var(--badge-pending-text)', border: 'var(--badge-pending-text)' },
    changes_requested: { bg: 'var(--badge-warning-bg)', text: 'var(--badge-warning-text)', border: 'var(--badge-warning-text)' },
    declined: { bg: 'var(--badge-rejected-bg)', text: 'var(--badge-rejected-text)', border: 'var(--badge-rejected-text)' },
    draft: { bg: 'var(--badge-pending-bg)', text: 'var(--badge-pending-text)', border: 'var(--badge-pending-text)' },
  }
  const config = statusConfig[status] ?? statusConfig.draft
  const label = status === 'dispatched' ? 'Sent to Sponsor' : status.replace(/_/g, ' ')
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border,
      }}
    >
      {label}
    </span>
  )
}

/* ── Overview tab ───────────────────────────────────────────────────────────── */

function OverviewTab({
  team, switchTab, activePitches, submissionsCount, totalFunded, portfolioAsk, submissions,
}: {
  team: Team
  switchTab: (t: string) => void
  activePitches: number
  submissionsCount: number
  totalFunded: number
  portfolioAsk: number
  submissions: SubmissionSummary[]
}) {
  const needsAttention = submissions.filter(s => s.status === 'declined' || s.status === 'changes_requested')
  const [showGraduation, setShowGraduation] = useState(false)
  const [gradNumber, setGradNumber] = useState('')
  const [gradName, setGradName] = useState(team.team_name)
  const [isGraduating, startGraduation] = useTransition()

  const handleGraduate = () => {
    const num = parseInt(gradNumber)
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid FTC Team Number')
      return
    }
    startGraduation(async () => {
      const res = await updateTeam(team.id, {
        status: 'existing',
        ftcTeamNumber: num,
        teamName: gradName.trim() || team.team_name
      } as any)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Congratulations! You are now an official Existing Team.')
        window.location.reload()
      }
    })
  }

  return (
    <div className="space-y-8 pb-20">
      {team.status === 'incubator' && (
        <FadeUp>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-foreground">Ready to graduate?</h4>
                <p className="mt-1 text-[13px] text-muted-foreground max-w-md leading-relaxed">
                  If you have secured your seed funding and registered with FIRST, you can upgrade your account to unlock technical robot specs and award history.
                </p>
              </div>
            </div>

            <Dialog open={showGraduation} onOpenChange={setShowGraduation}>
              <DialogTrigger
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                I have a team now
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-xl font-medium tracking-tight flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Level Up Your Team
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-[13px]">
                    Enter your official registration details to graduate from an Incubator to an Existing Team.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">New FTC Team Number</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12345"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                      value={gradNumber}
                      onChange={(e) => setGradNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Official Team Name</Label>
                    <Input
                      placeholder="Enter official team name"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                      value={gradName}
                      onChange={(e) => setGradName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowGraduation(false)}
                    className="border-border text-foreground hover:bg-accent hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGraduate}
                    disabled={isGraduating || !gradNumber}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isGraduating ? 'Upgrading...' : 'Graduate Team'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </FadeUp>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => switchTab('portfolio')}
          className="shadow-sm border border-border/50"
        >
          Edit Portfolio
        </Button>
      </div>

      {needsAttention.length > 0 && (
        <FadeUp>
          <div className="space-y-3">
            {needsAttention.map(s => (
              <div key={s.id} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <h4 className="text-[14px] font-medium text-rose-600">
                      {s.status === 'declined' ? 'Submission Declined' : 'Changes Requested'}
                    </h4>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{s.company_name}</span>: {s.admin_feedback || 'Needs your attention.'}
                  </p>
                </div>
                <Link
                  href={`/submissions/${s.id}/edit`}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-[6px] bg-rose-600 text-white px-4 h-9 shrink-0 text-[13px] font-medium transition-all hover:bg-rose-700 active:scale-95 shadow-sm"
                >
                  Review Submission
                </Link>
              </div>
            ))}
          </div>
        </FadeUp>
      )}

      <FadeUp className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={AlertCircle} label="Active pitches" value={activePitches} description="In review or approved" />
        <StatCard icon={Search} label="Submissions" value={submissionsCount} description="All-time sponsor outreach" />
        <StatCard icon={Building2} label="Funded" value={totalFunded} description="Approved by sponsors" />
        <StatCard icon={Sparkles} label="Portfolio ask" value={`$${(portfolioAsk / 100).toLocaleString('en-US')}`} description="Season target" />
      </FadeUp>

    </div>
  )
}

/* ── Sponsors tab ───────────────────────────────────────────────────────────── */
/* Combines sponsor discovery and the pitch lifecycle (submissions + drafts) behind
   a single toggle, replacing the former Find Sponsors / Submissions / Drafts tabs. */

function SponsorsTab({
  sponsors, submissions, initialView,
}: {
  sponsors: Sponsor[]
  submissions: SubmissionSummary[]
  initialView: 'find' | 'pitches'
}) {
  const [view, setView] = useState<'find' | 'pitches'>(initialView)
  const pitchCount = submissions.length

  const VIEWS: { id: 'find' | 'pitches'; label: string }[] = [
    { id: 'find', label: 'Find sponsors' },
    { id: 'pitches', label: `My pitches${pitchCount ? ` · ${pitchCount}` : ''}` },
  ]

  return (
    <div className="space-y-6 pb-20">
      <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5 shadow-sm">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors',
              view === v.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'find'
        ? <FindSponsorsTab sponsors={sponsors} submissions={submissions} />
        : <SubmissionsTab submissions={submissions} onNewPitch={() => setView('find')} />}
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
    <span className="text-sm font-semibold">{initials}</span>
  )
}

function FindSponsorsTab({ sponsors, submissions }: { sponsors: Sponsor[], submissions: SubmissionSummary[] }) {
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('all')
  const [fundingRange, setFundingRange] = useState(0) // index into FUNDING_RANGES

  const industries = ['all', ...Array.from(new Set(sponsors.map(s => s.industry).filter(Boolean) as string[]))]

  const { min, max } = FUNDING_RANGES[fundingRange]

  const results = sponsors.filter(s => {
    const q = query.trim().toLowerCase()
    const remaining = s.funding_cap_cents - s.funding_used_cents
    return (
      s.status === 'active' &&
      remaining > 0 &&
      (!q || s.company_name.toLowerCase().includes(q)) &&
      (industry === 'all' || s.industry === industry) &&
      remaining >= min && remaining < max
    )
  })

  return (
    <FadeUp>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Find sponsors for your next pitch</h2>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search companies…"
              className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-shadow shadow-sm"
            />
          </div>

          {/* Industry pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {industries.map(t => (
              <button
                key={t}
                onClick={() => setIndustry(t)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors capitalize shadow-sm',
                  industry === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-accent'
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
                  'rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors shadow-sm',
                  fundingRange === i
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-accent'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sponsor cards — larger, more visual */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {results.map(s => {
              const remaining = s.funding_cap_cents - s.funding_used_cents
              const pct = s.funding_cap_cents > 0 ? Math.round((s.funding_used_cents / s.funding_cap_cents) * 100) : 0

              // Check if there is an active submission (non-terminal)
              const activeSub = submissions.find(sub =>
                sub.sponsor_id === s.id &&
                !['declined', 'expired', 'bounced'].includes(sub.status ?? '')
              )

              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="group flex flex-col gap-0 rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-border/80"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-4 p-5 pb-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary overflow-hidden shadow-sm">
                      <SponsorInitials name={s.company_name} logoUrl={s.logo_url} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-medium text-foreground tracking-tight truncate">{s.company_name}</div>
                      {s.industry && (
                        <span className="mt-1 inline-block rounded-md bg-secondary border border-border/50 px-2 py-0.5 text-[10px] uppercase font-medium tracking-wider text-muted-foreground">
                          {s.industry}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funding bar */}
                  <div className="px-5 pb-5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                      <span>Remaining</span>
                      <span className="font-mono text-foreground">${(remaining / 100).toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${100 - pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{100 - pct}% capacity available</div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto border-t border-border grid grid-cols-2 divide-x divide-border">
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-3 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        Visit site <ArrowUpRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <div />
                    )}
                    {activeSub ? (
                      <Link
                        href={`/submissions/${activeSub.id}/edit`}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold transition-colors bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
                          !s.website && 'col-span-2',
                        )}
                      >
                        View active pitch
                      </Link>
                    ) : (
                      <Link
                        href={`/submissions/new?sponsor=${s.id}`}
                        className={cn(
                          'flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold transition-colors',
                          s.website
                            ? 'text-primary hover:bg-primary/5 hover:text-primary/90'
                            : 'col-span-2 text-primary hover:bg-primary/5 hover:text-primary/90',
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" /> Pitch this sponsor
                      </Link>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {results.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-[13px] text-muted-foreground">
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

function SubmissionsTab({ submissions, onNewPitch }: { submissions: SubmissionSummary[], onNewPitch: () => void }) {
  const [filter, setFilter] = useState<SubmissionFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = submissions.filter(s => {
    if (filter === 'all') return true
    if (filter === 'declined') return s.status === 'declined' || s.status === 'changes_requested'
    if (filter === 'pending') return s.status === 'pending' || s.status === 'dispatched'
    return s.status === filter
  })

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Filter tabs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                'rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors shadow-sm',
                filter === f.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-accent'
              )}
            >
              {f.label} <span className="ml-1 opacity-50">{count}</span>
            </button>
          )
        })}
        </div>
        <Button onClick={onNewPitch} className="gap-2 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4" /> New Pitch
        </Button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
        {filtered.map(s => {
          const isEditable = ['draft', 'declined', 'changes_requested'].includes(s.status ?? '')
          const expanded = expandedId === s.id
          return (
            <div key={s.id} className="transition-colors hover:bg-accent/40">
              <div
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : s.id)}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/5 shadow-sm text-primary">
                    <Building2 className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-foreground truncate">{s.company_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusChip status={s.status ?? 'draft'} />
                      <span className="text-[11px] text-muted-foreground font-mono" suppressHydrationWarning>
                        {new Date(s.updated_at ?? 0).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isEditable ? (
                    <Link
                      href={`/submissions/${s.id}/edit`}
                      onClick={e => e.stopPropagation()}
                      className="text-[11px] uppercase tracking-wider px-3 py-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground font-semibold transition-colors shadow-sm"
                    >
                      Edit
                    </Link>
                  ) : (
                    <Link
                      href={`/submissions/${s.id}/edit`}
                      onClick={e => e.stopPropagation()}
                      className="text-[11px] uppercase tracking-wider px-3 py-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground font-semibold transition-colors shadow-sm"
                    >
                      View
                    </Link>
                  )}
                  <span className="text-muted-foreground/50">
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
                    <div className="px-5 pb-5 space-y-3 border-t border-border pt-4 bg-accent/20">
                      {s.admin_feedback && (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[13px] text-amber-700">
                          <span className="font-semibold text-amber-700">Admin feedback: </span>{s.admin_feedback}
                        </div>
                      )}
                      {s.requested_amount_cents != null && (
                        <div className="text-[12px] text-muted-foreground">
                          Ask: <span className="text-foreground font-mono font-medium">${(s.requested_amount_cents / 100).toLocaleString()}</span>
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
          <div className="p-12 text-center text-muted-foreground text-[13px]">No submissions in this category.</div>
        )}
      </div>
    </div>
  )
}
