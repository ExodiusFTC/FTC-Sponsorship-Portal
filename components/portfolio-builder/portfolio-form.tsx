'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { submissionSchema, type SubmissionInput } from '@/lib/schemas/submission'
import { saveSubmission, autoSaveSubmissionDraft } from '@/app/actions/submission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RateLimitNotice } from '@/components/ui/rate-limit-notice'
import type { Submission } from '@/lib/supabase/types'

const AUTOSAVE_DELAY_MS = 2000

type Sponsor = { id: string; company_name: string; status: string; funding_cap_cents: number; funding_used_cents: number }

type Props = {
  initialSubmission?: Pick<
    Submission,
    'id' | 'sponsor_id' | 'custom_pitch_alignment' | 'specific_needs_statement' | 'local_connection_notes' | 'status'
  >
  sponsors?: Sponsor[]
  preselectedSponsorId?: string
}

export function PortfolioForm({ initialSubmission, sponsors = [], preselectedSponsorId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [rateLimitData, setRateLimitData] = useState<{ retryAfterSeconds: number; limit: number } | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | undefined>(initialSubmission?.id)
  
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerialized = useRef<string>('')

  const editableStatuses = ['draft', 'declined', 'changes_requested'] as const
  const readOnly = initialSubmission
    ? !editableStatuses.includes(initialSubmission.status as typeof editableStatuses[number])
    : false

  const form = useForm<SubmissionInput>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      sponsorId: initialSubmission?.sponsor_id ?? preselectedSponsorId ?? '',
      customPitchAlignment: initialSubmission?.custom_pitch_alignment ?? '',
      specificNeedsStatement: initialSubmission?.specific_needs_statement ?? '',
      localConnectionNotes: initialSubmission?.local_connection_notes ?? '',
    },
  })

  // Debounced autosave on form changes
  useEffect(() => {
    if (readOnly) return
    const subscription = form.watch((values) => {
      const serialized = JSON.stringify(values)
      if (serialized === lastSerialized.current) return
      lastSerialized.current = serialized

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(async () => {
        setAutosaveState('saving')
        const current = form.getValues()
        if (!current.sponsorId) {
            setAutosaveState('idle')
            return
        }
        const result = await autoSaveSubmissionDraft(current, submissionId)
        if (result.error) {
          setAutosaveState('error')
        } else {
          if (result.id && !submissionId) setSubmissionId(result.id)
          setAutosaveState('saved')
        }
      }, AUTOSAVE_DELAY_MS)
    })
    return () => {
      subscription.unsubscribe()
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [form, submissionId, readOnly])

  async function onSubmit(values: SubmissionInput, status: 'draft' | 'pending') {
    setIsPending(true)
    setError(null)
    setRateLimitData(null)
    const result = await saveSubmission(values, status, submissionId)
    if (result?.error === 'rate_limited' && 'retryAfterSeconds' in result) {
      setRateLimitData({ retryAfterSeconds: result.retryAfterSeconds as number, limit: (result as { limit?: number }).limit || 0 })
      setIsPending(false)
      return
    }
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    if (status === 'draft') {
      setIsPending(false)
      setAutosaveState('saved')
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{initialSubmission ? 'Edit Submission' : 'Create Submission'}</CardTitle>
            <CardDescription>
              Draft your sponsor-specific submission.
            </CardDescription>
          </div>
          {!readOnly && (
            <p className="text-sm text-muted-foreground">
              {autosaveState === 'saving' && 'Saving draft...'}
              {autosaveState === 'saved' && 'Draft saved'}
              {autosaveState === 'error' && <span className="text-destructive">Autosave failed</span>}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {readOnly && (
          <Alert className="mb-6">
            <AlertDescription>
              This submission is {initialSubmission?.status} and can no longer be edited.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {rateLimitData && (
              <RateLimitNotice retryAfterSeconds={rateLimitData.retryAfterSeconds} />
            )}

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="sponsorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Sponsor</FormLabel>
                    <FormControl>
                      <select 
                        disabled={readOnly || !!initialSubmission} 
                        {...field} 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="" disabled>Select a sponsor</option>
                        {sponsors.map(s => (
                          <option key={s.id} value={s.id}>{s.company_name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customPitchAlignment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Pitch Alignment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why your team aligns with this company..."
                        className="min-h-[100px]"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specificNeedsStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Needs Statement</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detail your specific financial or material needs..."
                        className="min-h-[100px]"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localConnectionNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local Connection Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any local connections to this sponsor?"
                        className="min-h-[80px]"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!readOnly && (
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.handleSubmit((v) => onSubmit(v, 'draft'))}
                  disabled={isPending}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={form.handleSubmit((v) => onSubmit(v, 'pending'))}
                  disabled={isPending}
                >
                  {isPending ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
