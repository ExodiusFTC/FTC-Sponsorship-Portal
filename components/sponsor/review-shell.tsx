'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  MapPin, 
  Target, 
  Award, 
  Wallet, 
  FileText, 
  ChevronLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
  History
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FadeUp } from '@/components/motion/fade-up'
import { sponsorUpdateSubmissionStatus } from '@/app/actions/sponsor-decision'
import { toast } from 'sonner'

export function SponsorReviewShell({ submission, team }: { submission: any; team: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState('')
  const [fundingAmount, setFundingAmount] = useState(team.financial_ask_cents / 100)
  const [showConfirm, setShowConfirm] = useState<'approved' | 'declined' | 'changes_requested' | null>(null)

  const handleDecision = (status: 'approved' | 'declined' | 'changes_requested') => {
    startTransition(async () => {
      const result = await sponsorUpdateSubmissionStatus(
        submission.id,
        status,
        feedback,
        status === 'approved' ? Math.round(fundingAmount * 100) : undefined
      )

      if (result.success) {
        toast.success(`Submission ${status} successfully.`)
        router.push('/sponsor/dashboard')
      } else {
        toast.error(result.error || 'Failed to update submission.')
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Back Link */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <div className="grid lg:grid-cols-[1fr,400px] gap-8">
        {/* Left Column: Team Portfolio */}
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                {team.ftc_team_number || '??'}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{team.team_name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {team.city}, {team.state}
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {team.organization || 'Independent'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Custom Pitch Section */}
          <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <MessageSquare className="h-12 w-12" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                The Pitch to {submission.company_name}
              </CardTitle>
              <CardDescription>Specifically tailored alignment and needs for your company.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Why us?</Label>
                <p className="text-foreground leading-relaxed italic border-l-2 border-primary/30 pl-4">
                  "{submission.custom_pitch_alignment || 'No specific alignment provided.'}"
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Specific Needs</Label>
                <p className="text-foreground leading-relaxed">
                  {submission.specific_needs_statement || 'General sponsorship request.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Team Portfolio Tabs/Sections */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold border-b border-border pb-2">Team Portfolio</h2>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Mission Statement</Label>
                <p className="text-sm leading-relaxed">{team.mission_statement || 'No mission statement provided.'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Technical Capabilities</Label>
                <div className="flex flex-wrap gap-2">
                  {team.manufacturing_capabilities?.map((cap: string) => (
                    <span key={cap} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-[10px] font-medium uppercase tracking-wider">
                      {cap}
                    </span>
                  )) || <span className="text-sm text-muted-foreground italic">None listed</span>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground">Recent Achievements</Label>
              <div className="grid gap-3">
                {team.team_achievements?.map((ach: any) => (
                  <div key={ach.id} className="p-3 rounded-lg border border-border bg-card/50 flex items-start gap-3">
                    <Award className="h-4 w-4 text-amber-500 mt-1 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">{ach.award || ach.event_name}</div>
                      <div className="text-xs text-muted-foreground">{ach.season} • {ach.description}</div>
                    </div>
                  </div>
                )) || <div className="text-sm text-muted-foreground italic">No achievements listed.</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-6">
          <div className="sticky top-8 space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Decision Console</CardTitle>
                <CardDescription>Review and respond to this request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Internal/External Feedback</Label>
                    <Textarea 
                      id="feedback"
                      placeholder="Add a message for the team or internal notes..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="min-h-[120px] bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Funding Offer ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input 
                        id="amount"
                        type="number"
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(parseFloat(e.target.value))}
                        className="pl-7 bg-background/50"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Team is asking for ${(team.financial_ask_cents / 100).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-4 border-t border-border">
                  <Button 
                    variant="default" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isPending}
                    onClick={() => setShowConfirm('approved')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve Sponsorship
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                      disabled={isPending}
                      onClick={() => setShowConfirm('changes_requested')}
                    >
                      <History className="mr-2 h-4 w-4" />
                      More Info
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                      disabled={isPending}
                      onClick={() => setShowConfirm('declined')}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confirmation Dialog (Simple Inline Overlay) */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-4 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-md space-y-4 shadow-xl shadow-primary/10"
                >
                  <p className="text-sm font-medium text-center">
                    Are you sure you want to <span className="font-bold uppercase">{showConfirm}</span> this submission?
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setShowConfirm(null)}>Cancel</Button>
                    <Button 
                      variant="default" 
                      className={cn(
                        "flex-1",
                        showConfirm === 'approved' ? 'bg-emerald-600' : showConfirm === 'declined' ? 'bg-rose-600' : 'bg-amber-600'
                      )}
                      onClick={() => handleDecision(showConfirm)}
                      disabled={isPending}
                    >
                      {isPending ? 'Processing...' : 'Confirm'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center">
              <Button variant="link" size="sm" className="text-muted-foreground gap-1.5" asChild>
                <a href={team.website || '#'} target="_blank">
                  <ExternalLink className="h-3 w-3" />
                  View Team Website
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
