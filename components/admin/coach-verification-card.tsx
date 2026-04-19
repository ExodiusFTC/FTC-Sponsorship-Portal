'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { verifyCoach } from '@/app/actions/admin'
import { CheckCircle, ExternalLink } from 'lucide-react'

type CoachData = {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
  coach_verified: boolean
  coach_credentials_url: string | null
  signedUrl: string | null
  team: { team_name: string; ftc_team_number: number | null; city: string | null; state: string | null } | null
}

export function CoachVerificationCard({ coach }: { coach: CoachData }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  function handleVerify(verified: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await verifyCoach(coach.id, verified)
      if (result?.error) {
        setError(result.error)
      } else {
        // Optimistic: hide card immediately after verify
        if (verified) setDismissed(true)
      }
    })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 flex flex-col md:flex-row md:items-start gap-5 transition-colors hover:border-zinc-700">
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-300">
        {(coach.full_name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-zinc-100 text-sm">{coach.full_name ?? '(no name)'}</div>
        <div className="text-xs text-zinc-400">{coach.email}</div>
        {coach.team ? (
          <div className="text-xs text-zinc-500">
            {coach.team.team_name}
            {coach.team.ftc_team_number ? ` · #${coach.team.ftc_team_number}` : ''}
            {coach.team.city ? ` · ${coach.team.city}, ${coach.team.state}` : ''}
          </div>
        ) : (
          <div className="text-xs text-zinc-600 italic">No team yet</div>
        )}
        <div className="text-[10px] font-mono text-zinc-600" suppressHydrationWarning>
          Joined {new Date(coach.created_at).toLocaleDateString()}
        </div>
        {/* Credentials status */}
        <div className="flex items-center gap-2 pt-1">
          {coach.coach_verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-900/50 text-emerald-400 text-[10px] font-medium px-2 py-0.5">
              <CheckCircle className="h-3 w-3" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-900/60 text-amber-400 text-[10px] font-medium px-2 py-0.5">
              {coach.coach_credentials_url ? 'Credentials uploaded' : 'No credentials'}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* View Credentials */}
        {coach.signedUrl && (
          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
              <ExternalLink className="h-3.5 w-3.5" /> Credentials
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Credentials — {coach.full_name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden rounded-lg border border-zinc-800">
                <iframe
                  src={coach.signedUrl}
                  className="w-full h-full"
                  title={`Credentials for ${coach.full_name}`}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Verify / Revoke */}
        {coach.coach_verified ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVerify(false)}
            disabled={isPending}
            className="text-zinc-400 hover:text-zinc-100"
          >
            {isPending ? 'Saving…' : 'Revoke'}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => handleVerify(true)}
            disabled={isPending || !coach.coach_credentials_url}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isPending ? 'Saving…' : 'Verify Coach'}
          </Button>
        )}
      </div>
    </div>
  )
}
