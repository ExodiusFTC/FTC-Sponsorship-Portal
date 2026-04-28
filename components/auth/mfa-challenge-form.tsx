'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'

export function MfaChallengeForm({ next }: { next: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.replace(/\s/g, '').length !== 6) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()

      // Get the active MFA challenge
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.[0]
      if (!totpFactor) {
        setError('No TOTP factor found. Please set up 2FA first.')
        return
      }

      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })
      if (challengeErr || !challenge) {
        setError(challengeErr?.message ?? 'Could not start challenge.')
        return
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: code.replace(/\s/g, ''),
      })

      if (verifyErr) {
        setError('Incorrect code. Please try again.')
        setCode('')
        inputRef.current?.focus()
        return
      }

      router.replace(next)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Input
          ref={inputRef}
          value={code}
          onChange={e => setCode(e.target.value.replace(/[^0-9\s]/g, ''))}
          placeholder="000 000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          className="text-center font-mono text-xl tracking-[0.4em]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={code.replace(/\s/g, '').length !== 6 || isPending}
        loading={isPending}
        className="w-full"
      >
        Verify
      </Button>
    </form>
  )
}
