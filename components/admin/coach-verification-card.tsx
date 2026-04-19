'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { verifyCoach, denyCoach } from '@/app/actions/admin'
import { CheckCircle, ExternalLink, XCircle, AlertTriangle, Building, MapPin, Phone, Calendar, Target, ShieldCheck } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type CoachData = {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
  coach_verified: boolean
  coach_credentials_url: string | null
  date_of_birth: string | null
  phone_number: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  referral_source: string | null
  coppa_acknowledged: boolean
  tos_accepted: boolean
  pending_team_data: any | null
  signedUrl: string | null
  team: { team_name: string; ftc_team_number: number | null; city: string | null; state: string | null } | null
}

export function CoachVerificationCard({ coach }: { coach: CoachData }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isDenyModalOpen, setIsDenyModalOpen] = useState(false)
  const [denyReason, setDenyReason] = useState('')

  if (dismissed) return null

  function handleVerify(verified: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await verifyCoach(coach.id, verified)
      if (result?.error) {
        setError(result.error)
      } else {
        if (verified) setDismissed(true)
      }
    })
  }

  function handleDeny() {
    if (!denyReason.trim()) {
      setError('Please provide a reason for denial.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await denyCoach(coach.id, denyReason)
      if (result?.error) {
        setError(result.error)
      } else {
        setIsDenyModalOpen(false)
        setDismissed(true)
      }
    })
  }

  const pd = coach.pending_team_data || {}
  const hasPendingData = !!coach.pending_team_data

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 flex flex-col md:flex-row md:items-start gap-5 transition-colors hover:border-zinc-700">
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-300">
        {(coach.full_name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>

      {/* Info summary */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
          {coach.full_name ?? '(no name)'}
          {coach.coppa_acknowledged && coach.tos_accepted && (
            <span title="Policies Accepted"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /></span>
          )}
        </div>
        <div className="text-xs text-zinc-400">{coach.email}</div>
        {coach.team ? (
          <div className="text-xs text-zinc-500">
            {coach.team.team_name}
            {coach.team.ftc_team_number ? ` · #${coach.team.ftc_team_number}` : ''}
            {coach.team.city ? ` · ${coach.team.city}, ${coach.team.state}` : ''}
          </div>
        ) : hasPendingData ? (
          <div className="text-xs text-blue-400/80">
            Pending Team: {pd.teamName || 'Unknown'} {pd.ftcTeamNumber ? `(#${pd.ftcTeamNumber})` : '(Incubator)'}
          </div>
        ) : (
          <div className="text-xs text-zinc-600 italic">No team data</div>
        )}
        <div className="text-[10px] font-mono text-zinc-600" suppressHydrationWarning>
          Joined {new Date(coach.created_at).toLocaleDateString()}
        </div>
        
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {coach.coach_verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-900/50 text-emerald-400 text-[10px] font-medium px-2 py-0.5">
              <CheckCircle className="h-3 w-3" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-900/60 text-amber-400 text-[10px] font-medium px-2 py-0.5">
              {coach.coach_credentials_url ? 'Credentials uploaded' : 'No credentials'}
            </span>
          )}
          {!coach.coach_verified && hasPendingData && (
             <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-900/60 text-blue-400 text-[10px] font-medium px-2 py-0.5">
               Data Pending Review
             </span>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!coach.coach_verified && coach.coach_credentials_url ? (
          <Dialog>
            <DialogTrigger render={<Button size="sm" className="bg-primary text-primary-foreground" />}>
              Review Application
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[90vw] h-[85vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800">
              <DialogHeader className="p-6 pb-2 border-b border-zinc-800 bg-zinc-900/50">
                <DialogTitle className="flex justify-between items-center text-xl">
                  <span>Application Review: {coach.full_name}</span>
                  <span className="text-sm font-normal text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700/50">
                    Joined {new Date(coach.created_at).toLocaleDateString()}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
                {/* Left Side: Data Tabs */}
                <div className="overflow-y-auto border-r border-zinc-800 p-6">
                  <Tabs defaultValue="identity" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-6 bg-zinc-900">
                      <TabsTrigger value="identity">Coach Identity</TabsTrigger>
                      <TabsTrigger value="team">Pending Team Data</TabsTrigger>
                    </TabsList>

                    <TabsContent value="identity" className="space-y-6 mt-0">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Personal Details</h3>
                          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Date of Birth</dt>
                              <dd className="mt-1 text-sm text-zinc-200">{coach.date_of_birth || 'Not provided'}</dd>
                            </div>
                            <div className="sm:col-span-1">
                              <dt className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone Number</dt>
                              <dd className="mt-1 text-sm text-zinc-200">{coach.phone_number || 'Not provided'}</dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Home Address</dt>
                              <dd className="mt-1 text-sm text-zinc-200">
                                {coach.address_line1}<br/>
                                {coach.city}, {coach.state} {coach.zip_code}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="border-t border-zinc-800 pt-4">
                          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Compliance & Referral</h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900/50 border border-zinc-800/80">
                              <span className="text-sm text-zinc-300">COPPA Responsibility Acknowledged</span>
                              {coach.coppa_acknowledged ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900/50 border border-zinc-800/80">
                              <span className="text-sm text-zinc-300">Terms of Service Accepted</span>
                              {coach.tos_accepted ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                            </div>
                            {coach.referral_source && (
                              <div className="p-3 rounded-md bg-zinc-900/50 border border-zinc-800/80">
                                <span className="text-xs text-zinc-500 block mb-1">Referral Source</span>
                                <span className="text-sm text-zinc-300 italic">"{coach.referral_source}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="team" className="space-y-6 mt-0">
                      {hasPendingData ? (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Team Basics</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                              <div className="sm:col-span-1">
                                <dt className="text-xs font-medium text-zinc-500">Status</dt>
                                <dd className="mt-1 text-sm text-zinc-200 capitalize">{pd.status}</dd>
                              </div>
                              <div className="sm:col-span-1">
                                <dt className="text-xs font-medium text-zinc-500">FTC Number</dt>
                                <dd className="mt-1 text-sm font-mono text-zinc-200">{pd.ftcTeamNumber || 'N/A'}</dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Building className="h-3 w-3" /> Team Name</dt>
                                <dd className="mt-1 text-sm text-zinc-200 font-semibold">{pd.teamName}</dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-zinc-500">Organization</dt>
                                <dd className="mt-1 text-sm text-zinc-200">{pd.organization || 'None'}</dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location</dt>
                                <dd className="mt-1 text-sm text-zinc-200">{pd.city}, {pd.state}</dd>
                              </div>
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium text-zinc-500">Tax Status</dt>
                                <dd className="mt-1 text-sm text-zinc-200">{pd.taxStatus}</dd>
                              </div>
                            </dl>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Financial Request</h3>
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 flex items-center justify-between">
                              <span className="text-sm font-medium text-primary flex items-center gap-2"><Target className="h-4 w-4" /> Total Ask</span>
                              <span className="text-lg font-bold text-primary">${((pd.financialAskCents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {pd.budgetItems && pd.budgetItems.length > 0 && (
                              <div className="space-y-2">
                                <dt className="text-xs font-medium text-zinc-500 mb-2">Budget Line Items</dt>
                                <ul className="text-sm divide-y divide-zinc-800/50 border border-zinc-800/50 rounded-md">
                                  {pd.budgetItems.map((item: any, i: number) => (
                                    <li key={i} className="flex justify-between py-2 px-3 bg-zinc-900/20">
                                      <span className="text-zinc-300">{item.qty}x {item.label}</span>
                                      <span className="text-zinc-400 font-mono">${((item.totalCents || 0) / 100).toFixed(2)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Narrative</h3>
                            <div className="space-y-4">
                              <div>
                                <dt className="text-xs font-medium text-zinc-500 mb-1">Mission Statement</dt>
                                <dd className="text-sm text-zinc-300 bg-zinc-900/40 p-3 rounded border border-zinc-800/50 italic">"{pd.missionStatement}"</dd>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                          <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                          <p>No team data was submitted with this application.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right Side: PDF/Image Viewer */}
                <div className="bg-zinc-950 flex flex-col relative group">
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-zinc-950/80 to-transparent p-4 z-10 flex justify-between items-start pointer-events-none">
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-widest drop-shadow-md">Photo ID Document</span>
                    <a href={coach.signedUrl!} target="_blank" rel="noreferrer" className="pointer-events-auto bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs px-3 py-1.5 rounded-full backdrop-blur flex items-center gap-1.5 transition-colors border border-zinc-700/50">
                      Open Externally <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {coach.signedUrl ? (
                    <iframe
                      src={coach.signedUrl}
                      className="w-full h-full bg-zinc-900"
                      title={`Credentials for ${coach.full_name}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      Failed to load signed URL.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between sm:justify-between">
                <div className="text-sm text-zinc-500 hidden sm:block">
                  Review the ID against the provided details to ensure COPPA compliance.
                </div>
                <div className="flex gap-3">
                  <Dialog open={isDenyModalOpen} onOpenChange={setIsDenyModalOpen}>
                    <DialogTrigger render={<Button variant="destructive" className="bg-red-950/40 text-red-500 border border-red-900/50 hover:bg-red-950 hover:text-red-400" />}>
                      Deny Application
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md border-red-900/30 bg-zinc-950">
                      <DialogHeader>
                        <DialogTitle className="text-red-500">Deny Application</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <p className="text-sm text-zinc-400">
                          This will clear their pending team data and uploaded credentials. An email will be sent to the coach with your reason, allowing them to correct the issue and re-apply.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="denyReason" className="text-zinc-300">Reason for Denial</Label>
                          <Textarea 
                            id="denyReason" 
                            placeholder="e.g., The provided ID is expired. Please upload a valid ID." 
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                            className="h-24 bg-zinc-900/50 border-zinc-800 resize-none"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDenyModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeny} disabled={isPending || !denyReason.trim()}>
                          {isPending ? 'Processing...' : 'Confirm Denial & Notify Coach'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    onClick={() => handleVerify(true)} 
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px]"
                  >
                    {isPending ? 'Saving...' : 'Approve & Provision Team'}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : coach.coach_verified ? (
           <Button size="sm" variant="outline" onClick={() => handleVerify(false)} disabled={isPending} className="text-zinc-400 hover:text-zinc-100">
            {isPending ? 'Saving…' : 'Revoke Verification'}
          </Button>
        ) : (
           <Button size="sm" disabled className="bg-zinc-800 text-zinc-500">Awaiting Upload</Button>
        )}
      </div>
    </div>
  )
}
