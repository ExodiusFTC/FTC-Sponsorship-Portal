'use client'

import { useState, useTransition } from 'react'
import { 
  Building2, 
  Users, 
  FileText, 
  Inbox, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowUpRight,
  Search,
  Filter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FadeUp } from '@/components/motion/fade-up'

type Sponsor = {
  id: string
  company_name: string
  funding_cap_cents: number
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
  profile,
  submissions,
  notifications
}: {
  sponsor: Sponsor
  profile: any
  submissions: Submission[]
  notifications: any[]
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'inbox' | 'funding'>('overview')

  const pendingCount = submissions?.filter(s => s.status === 'pending').length ?? 0
  const approvedCount = submissions?.filter(s => s.status === 'approved').length ?? 0
  
  // Guard against null sponsor
  if (!sponsor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/30">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">No Sponsor Linked</h2>
        <p className="text-muted-foreground text-center max-w-sm mt-2">
          Your account is registered as a sponsor, but no company record was found. 
          Please contact an administrator.
        </p>
      </div>
    )
  }

  const fundingRemaining = sponsor.funding_cap_cents - sponsor.funding_used_cents

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <Building2 className="h-3 w-3" />
            Sponsor Portal
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
            {sponsor.company_name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Managing <span className="text-foreground font-medium">{submissions.length}</span> total requests for the current season.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-border/50 bg-card/50 backdrop-blur-sm">
            <Wallet className="h-4 w-4" />
            ${(fundingRemaining / 100).toLocaleString()} Remaining
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Inbox className="h-4 w-4" />
            Review Queue ({pendingCount})
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <FadeUp className="grid gap-4 md:grid-cols-4">
        <KpiCard 
          label="Pending Requests" 
          value={pendingCount} 
          icon={Clock}
          description="Awaiting your review"
          trend={pendingCount > 0 ? 'attention' : 'neutral'}
        />
        <KpiCard 
          label="Active Sponsorships" 
          value={approvedCount} 
          icon={CheckCircle2}
          description="Teams you're supporting"
          trend="positive"
        />
        <KpiCard 
          label="Budget Utilized" 
          value={`${Math.round((sponsor.funding_used_cents / sponsor.funding_cap_cents) * 100)}%`} 
          icon={Wallet}
          description={`$${(sponsor.funding_used_cents / 100).toLocaleString()} spent`}
          trend="neutral"
        />
        <KpiCard 
          label="Total Outreach" 
          value={submissions.length} 
          icon={Users}
          description="Unique team pitches"
          trend="neutral"
        />
      </FadeUp>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr,350px]">
        {/* Requests List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent Requests</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              View All <ArrowUpRight className="ml-2 h-3 w-3" />
            </Button>
          </div>

          <div className="grid gap-4">
            {submissions.slice(0, 5).map((submission, i) => (
              <SubmissionCard key={submission.id} submission={submission} index={i} />
            ))}
            {submissions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/30">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No sponsorship requests yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
          <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Team Search</CardTitle>
              <CardDescription>Find a specific team's pitch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input 
                  placeholder="Team # or Name"
                  className="w-full bg-background/50 border border-border rounded-md pl-9 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <Button variant="secondary" className="w-full">Search Submissions</Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Funding Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <div className="flex justify-between text-xs font-mono">
                     <span className="text-muted-foreground">UTILIZED</span>
                     <span>${(sponsor.funding_used_cents / 100).toLocaleString()}</span>
                   </div>
                   <div className="h-2 w-full bg-border/30 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${(sponsor.funding_used_cents / sponsor.funding_cap_cents) * 100}%` }}
                       className="h-full bg-primary"
                     />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                   <div className="p-3 rounded-lg bg-background/40 border border-border/50 text-center">
                     <div className="text-lg font-bold">Approved</div>
                     <div className="text-[10px] text-muted-foreground uppercase">{approvedCount} TEAMS</div>
                   </div>
                   <div className="p-3 rounded-lg bg-background/40 border border-border/50 text-center">
                     <div className="text-lg font-bold">Pending</div>
                     <div className="text-[10px] text-muted-foreground uppercase">{pendingCount} TEAMS</div>
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

function KpiCard({ 
  label, 
  value, 
  icon: Icon, 
  description,
  trend 
}: { 
  label: string
  value: string | number
  icon: any
  description: string
  trend: 'positive' | 'attention' | 'neutral'
}) {
  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {trend === 'attention' && (
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </div>
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="text-[10px] text-muted-foreground">{description}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function SubmissionCard({ submission, index }: { submission: Submission; index: number }) {
  const statusColors: Record<string, string> = {
    pending: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    declined: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  }

  return (
    <FadeUp delay={index * 0.05}>
      <Card className="border-border/50 bg-card/40 backdrop-blur-md hover:bg-accent/50 transition-all group cursor-pointer overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-inner">
              {submission.teams.ftc_team_number || '??'}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {submission.teams.team_name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{submission.teams.organization || 'Independent'}</span>
                <span>•</span>
                <span>{submission.teams.city}, {submission.teams.state}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              statusColors[submission.status] || 'text-muted-foreground bg-muted/10 border-muted/20'
            )}>
              {submission.status}
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </FadeUp>
  )
}
