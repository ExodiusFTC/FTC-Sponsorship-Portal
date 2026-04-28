'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, ShieldCheck, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnrollData {
  factorId: string
  qrCode: string   // data: URI from Supabase
  secret: string
}

export function MfaSetupPanel({
  isEnrolled,
  factorId,
  currentAal,
  autoStartSetup,
}: {
  isEnrolled: boolean
  factorId: string | null
  currentAal: string
  autoStartSetup: boolean
}) {
  const router = useRouter()
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showUnenroll, setShowUnenroll] = useState(false)

  useEffect(() => {
    if (autoStartSetup && !isEnrolled) startEnroll()
  }, [autoStartSetup, isEnrolled])

  function startEnroll() {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (err || !data) {
        setError(err?.message ?? 'Could not start enrollment.')
        return
      }
      setEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      })
    })
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollData || code.replace(/\s/g, '').length !== 6) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: enrollData.factorId,
      })
      if (challengeErr || !challenge) {
        setError(challengeErr?.message ?? 'Challenge failed.')
        return
      }
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: challenge.id,
        code: code.replace(/\s/g, ''),
      })
      if (verifyErr) {
        setError('Incorrect code. Double-check your authenticator app and try again.')
        setCode('')
        return
      }
      setSuccess('Two-factor authentication is now active on your account.')
      setEnrollData(null)
      setCode('')
      router.refresh()
    })
  }

  function handleUnenroll() {
    if (!factorId) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId })
      if (err) {
        setError(err.message)
        return
      }
      setShowUnenroll(false)
      setSuccess('Two-factor authentication has been removed from your account.')
      router.refresh()
    })
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Status card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {isEnrolled
              ? <ShieldCheck className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
              : <ShieldOff className="h-5 w-5 text-amber-500" strokeWidth={1.5} />}
            <CardTitle className="text-base">
              {isEnrolled ? '2FA is active' : '2FA is not configured'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isEnrolled
              ? currentAal === 'aal2'
                ? 'Your current session is fully authenticated with a second factor.'
                : 'Enrolled but your current session has not completed the MFA challenge. Re-login to elevate to aal2.'
              : 'Admins are required to enable TOTP-based two-factor authentication. Set it up now using any authenticator app (Google Authenticator, Authy, 1Password, etc.).'}
          </p>

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {success}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}

          {!isEnrolled && !enrollData && (
            <Button onClick={startEnroll} disabled={isPending} loading={isPending}>
              Set up authenticator app
            </Button>
          )}

          {isEnrolled && !showUnenroll && (
            <Button
              variant="outline"
              onClick={() => setShowUnenroll(true)}
              className="text-muted-foreground"
            >
              Remove 2FA
            </Button>
          )}

          {isEnrolled && showUnenroll && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-destructive font-medium">
                Removing 2FA will leave your admin account with only password protection.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleUnenroll} disabled={isPending} loading={isPending} size="sm">
                  Confirm removal
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowUnenroll(false)} disabled={isPending}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment flow */}
      {enrollData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scan QR code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Open your authenticator app and scan the QR code below. Then enter the 6-digit code to confirm.
            </p>

            <div className="flex flex-col items-center gap-4">
              {/* QR code — data: URI rendered as an <img> */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollData.qrCode}
                alt="TOTP QR code"
                className="h-48 w-48 rounded-lg border border-border bg-white p-2"
              />
              <div className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-center">
                <p className="mb-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Manual entry key</p>
                <p className="font-mono text-sm text-foreground select-all">{enrollData.secret}</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totp-code">Verification code</Label>
                <Input
                  id="totp-code"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/[^0-9\s]/g, ''))}
                  placeholder="000 000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  className={cn('font-mono text-center text-lg tracking-[0.4em]', error && 'border-destructive')}
                />
              </div>
              <Button
                type="submit"
                disabled={code.replace(/\s/g, '').length !== 6 || isPending}
                loading={isPending}
                className="w-full"
              >
                Verify & activate 2FA
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
