'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { approveSponsorApplication, rejectSponsorApplication } from '@/app/actions/admin'

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handle(action: 'approve' | 'reject') {
    setError(null)
    startTransition(async () => {
      const result =
        action === 'approve'
          ? await approveSponsorApplication(applicationId)
          : await rejectSponsorApplication(applicationId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-xs text-destructive mr-2">{error}</p>}
      <Button size="sm" variant="outline" onClick={() => handle('reject')} disabled={isPending}>
        Reject
      </Button>
      <Button size="sm" onClick={() => handle('approve')} disabled={isPending}>
        {isPending ? 'Processing…' : 'Approve & Add Sponsor'}
      </Button>
    </div>
  )
}
