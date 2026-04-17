'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { verifyCoach } from '@/app/actions/admin'

export function VerifyCoachButton({
  coachId,
  verified,
}: {
  coachId: string
  verified: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handle() {
    setError(null)
    startTransition(async () => {
      const result = await verifyCoach(coachId, !verified)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={verified ? 'outline' : 'default'}
        onClick={handle}
        disabled={isPending}
      >
        {isPending ? 'Saving…' : verified ? 'Revoke' : 'Verify'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
