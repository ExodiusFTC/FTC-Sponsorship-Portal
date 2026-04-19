import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Search, Filter, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function SponsorSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('sponsor_id')
    .eq('id', user.id)
    .single()

  if (!profile?.sponsor_id) redirect('/dashboard')

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, teams(team_name, ftc_team_number, city, state)')
    .eq('sponsor_id', profile.sponsor_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sponsorship Requests</h1>
          <p className="text-muted-foreground mt-1">Review and manage all incoming team pitches.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Search teams..." 
            className="w-full bg-card border border-border rounded-md pl-9 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="grid gap-4">
        {submissions?.map((s) => (
          <SubmissionRow key={s.id} submission={s} />
        ))}
        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No sponsorship requests found.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SubmissionRow({ submission }: { submission: any }) {
  const statusColors: Record<string, string> = {
    pending: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    dispatched: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    declined: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    changes_requested: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  }

  const statusLabel = submission.status === 'dispatched' ? 'New Request' : submission.status.replace('_', ' ')

  return (
    <Link href={`/sponsor/submissions/${submission.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardContent className="p-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center font-bold text-sm">
              {submission.teams.ftc_team_number || '??'}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{submission.teams.team_name}</div>
              <div className="text-xs text-muted-foreground">{submission.teams.city}, {submission.teams.state}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              statusColors[submission.status] || 'text-muted-foreground bg-muted/10 border-muted-foreground/20'
            )}>
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
