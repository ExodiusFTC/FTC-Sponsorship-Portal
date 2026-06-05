'use client'

import { useMemo, useState } from 'react'
import { FileText, Search, Filter, ArrowUpRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'dispatched', label: 'New Request' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'expired', label: 'Expired' },
] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SponsorSubmissionsList({ submissions }: { submissions: any[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return submissions.filter((s) => {
      const matchesStatus = status === 'all' || s.status === status
      const name = String(s.teams?.team_name ?? '').toLowerCase()
      const num = String(s.teams?.ftc_team_number ?? '')
      const matchesQuery = q === '' || name.includes(q) || num.includes(q)
      return matchesStatus && matchesQuery
    })
  }, [submissions, query, status])

  const activeLabel = STATUS_FILTERS.find((f) => f.value === status)?.label ?? 'All statuses'

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams..."
            className="w-full bg-card border border-border rounded-md pl-9 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {activeLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUS_FILTERS.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => setStatus(f.value)} className="gap-2">
                <Check className={cn('h-3.5 w-3.5', status === f.value ? 'opacity-100' : 'opacity-0')} />
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4">
        {filtered.map((s) => (
          <SubmissionRow key={s.id} submission={s} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {submissions.length === 0
                ? 'No sponsorship requests found.'
                : 'No requests match your search or filter.'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SubmissionRow({ submission }: { submission: any }) {
  const statusColors: Record<string, string> = {
    pending: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    dispatched: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    declined: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    changes_requested: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  }

  const statusLabel =
    submission.status === 'dispatched' ? 'New Request' : String(submission.status).replace('_', ' ')

  return (
    <Link href={`/sponsor/submissions/${submission.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardContent className="p-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center font-bold text-sm">
              {submission.teams?.ftc_team_number || '??'}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{submission.teams?.team_name || 'Unknown Team'}</div>
              <div className="text-xs text-muted-foreground">
                {submission.teams?.city || 'Unknown'}, {submission.teams?.state || 'Unknown'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                statusColors[submission.status] || 'text-muted-foreground bg-muted/10 border-muted-foreground/20',
              )}
            >
              {statusLabel}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {new Date(submission.created_at).toLocaleDateString()}
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
