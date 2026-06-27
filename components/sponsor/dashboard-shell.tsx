'use client'

import Link from 'next/link'
import {
  Building2,
  Users,
  FileText,
  Inbox,
  Wallet,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Search
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FadeUp } from '@/components/motion/fade-up'
import { StatCard } from '@/components/ui/stat-card'

type Sponsor = {
  id: string
  company_name: string
  funding_used_cents: number
}

type Submission = {
  id: string
  team_id: string
  sponsor_id: string
  status: string
  custom_pitch_alignment: string | null
  specific_needs_statement: string | null
  local_connection_notes: string | null
  created_at: string
  teams: {
    team_name: string
    ftc_team_number: number | null
    city: string | null
    state: string | null
    organization: string | null
  }
}

export function SponsorDashboardShell({
  sponsor,
  submissions,
  notifications: _notifications
}: {
  sponsor: Sponsor | null
  submissions: Submission[]
  notifications: any[]
}) {
  const pendingCount = submissions?.filter(s => s.status === 'pending').length ?? 0
  const approvedCount = submissions?.filter(s => s.status === 'approved').length ?? 0
  
  // Guard against null sponsor
  if (!sponsor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">No Sponsor Linked</h2>
        <p className="text-muted-foreground text-center max-w-sm mt-2">
          Your account is registered as a sponsor, but no company record was found. 
          Please contact an administrator.
        </p>
      </div>
    )
  }


  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <Building2 className="h-3 w-3" />
            Sponsor Portal
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {sponsor.company_name}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Managing <span className="text-foreground font-medium">{submissions.length}</span> total sponsorship requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/sponsor/funding" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 border-border bg-card shadow-sm')}>
            <Wallet className="h-4 w-4" />
            Funding
          </Link>
          <Link href="/sponsor/submissions" className={cn(buttonVariants(), 'gap-2 shadow-sm')}>
            <Inbox className="h-4 w-4" />
            Review Queue ({pendingCount})
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <FadeUp className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Requests"
          value={pendingCount}
          icon={Clock}
          description="Awaiting your review"
          iconContainerClassName={pendingCount > 0 ? "bg-amber-500/10 text-amber-600" : ""}
        />
        <StatCard
          label="Active Sponsorships"
          value={approvedCount}
          icon={CheckCircle2}
          description="Teams you're supporting"
        />
        <StatCard
          label="$ In Support"
          value={`$${(sponsor.funding_used_cents / 100).toLocaleString()}`}
          icon={Wallet}
          description="Total approved to date"
        />
        <StatCard
          label="Total Outreach"
          value={submissions.length}
          icon={Users}
          description="Unique team pitches"
        />
      </FadeUp>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr,350px]">
        {/* Requests List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent Requests</h2>
            <Link href="/sponsor/submissions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground')}>
              View All <ArrowUpRight className="ml-2 h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-4">
            {submissions.slice(0, 5).map((submission, i) => (
              <SubmissionCard key={submission.id} submission={submission} index={i} />
            ))}
            {submissions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/50">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No sponsorship requests yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Team Search</CardTitle>
              <CardDescription>Find a specific team's pitch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input 
                  placeholder="Team # or Name"
                  className="w-full bg-background border border-border rounded-md pl-9 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
                />
              </div>
              <Button variant="secondary" className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-sm">
                Search Submissions
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm overflow-hidden relative group">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Funding Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="space-y-1">
                   <div className="text-xs font-mono text-muted-foreground uppercase">In Support</div>
                   <div className="text-2xl font-semibold tracking-tight">${(sponsor.funding_used_cents / 100).toLocaleString()}</div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                   <div className="p-3 rounded-lg bg-background border border-border/50 text-center">
                     <div className="text-lg font-medium tracking-tight text-foreground">{approvedCount}</div>
                     <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Approved</div>
                   </div>
                   <div className="p-3 rounded-lg bg-background border border-border/50 text-center">
                     <div className="text-lg font-medium tracking-tight text-foreground">{pendingCount}</div>
                     <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Pending</div>
                   </div>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SubmissionCard({ submission, index }: { submission: Submission; index: number }) {
  const statusColors: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    approved: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    declined: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
  }

  return (
    <FadeUp delay={index * 0.05}>
      <Link
        href={`/sponsor/submissions/${submission.id}`}
        className="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 border border-primary/10 text-primary font-medium tabular-nums shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {submission.teams?.ftc_team_number || '??'}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-medium transition-colors group-hover:text-primary text-foreground">
              {submission.teams?.team_name || 'Unknown Team'}
            </h3>
            <div className="flex items-center gap-1.5 truncate text-[13px] text-muted-foreground mt-0.5">
              <span className="truncate">{submission.teams?.organization || 'Independent'}</span>
              <span aria-hidden="true">•</span>
              <span className="truncate">{submission.teams?.city || 'Unknown'}, {submission.teams?.state || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className={cn(
            'rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
            statusColors[submission.status] || 'border-muted/20 bg-muted/10 text-muted-foreground'
          )}>
            {submission.status}
          </span>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>
    </FadeUp>
  )
}
