'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pitchSchema, type PitchInput } from '@/lib/schemas/pitch'
import { savePitch, autoSavePitchDraft, uploadPitchMedia, removePitchMedia } from '@/app/actions/pitch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Pitch } from '@/lib/supabase/types'
import { RateLimitNotice } from '@/components/ui/rate-limit-notice'

const AUTOSAVE_DELAY_MS = 2000

type Sponsor = { id: string; company_name: string; status: string; funding_cap_cents: number; funding_used_cents: number }

type Props = {
  initialPitch?: Pick<
    Pitch,
    'id' | 'title' | 'summary' | 'cost_explanation' | 'line_items' | 'financial_ask_cents' | 'media_urls' | 'status'
  >
  sponsors?: Sponsor[]
  preselectedSponsorId?: string
}

export function PitchForm({ initialPitch, sponsors = [], preselectedSponsorId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [rateLimitData, setRateLimitData] = useState<{ retryAfterSeconds: number; limit: number } | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [pitchId, setPitchId] = useState<string | undefined>(initialPitch?.id)
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialPitch?.media_urls ?? [])
  const [mediaUploading, setMediaUploading] = useState(false)
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<Set<string>>(
    preselectedSponsorId ? new Set([preselectedSponsorId]) : new Set()
  )
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerialized = useRef<string>('')

  const readOnly = initialPitch
    ? !['draft', 'changes_requested'].includes(initialPitch.status)
    : false

  const form = useForm<PitchInput>({
    resolver: zodResolver(pitchSchema),
    defaultValues: {
      title: initialPitch?.title ?? '',
      summary: initialPitch?.summary ?? '',
      costExplanation: initialPitch?.cost_explanation ?? '',
      lineItems:
        initialPitch?.line_items && initialPitch.line_items.length > 0
          ? initialPitch.line_items.map((i) => ({
              label: i.label,
              qty: i.qty,
              unitCostCents: i.unit_cost_cents,
              totalCents: i.total_cents,
            }))
          : [{ label: '', qty: 1, unitCostCents: 0, totalCents: 0 }],
      financialAskCents: initialPitch?.financial_ask_cents ?? 0,
      mediaUrls: initialPitch?.media_urls ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: 'lineItems',
    control: form.control,
  })

  const calculateTotal = (items: PitchInput['lineItems']) =>
    items.reduce((acc, item) => acc + item.qty * item.unitCostCents, 0)

  const handleLineItemChange = (index: number, field: 'qty' | 'unitCostCents', value: number) => {
    form.setValue(`lineItems.${index}.${field}`, value)
    const item = form.getValues(`lineItems.${index}`)
    form.setValue(`lineItems.${index}.totalCents`, item.qty * item.unitCostCents)
    form.setValue('financialAskCents', calculateTotal(form.getValues('lineItems')))
  }

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
        const result = await autoSavePitchDraft({ ...current, mediaUrls }, pitchId)
        if (result.error) {
          setAutosaveState('error')
        } else {
          if (result.id && !pitchId) setPitchId(result.id)
          setAutosaveState('saved')
        }
      }, AUTOSAVE_DELAY_MS)
    })
    return () => {
      subscription.unsubscribe()
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [form, pitchId, mediaUrls, readOnly])

  async function onSubmit(values: PitchInput, status: 'draft' | 'submitted') {
    setIsPending(true)
    setError(null)
    setRateLimitData(null)
    const sponsorIds = status === 'submitted' ? Array.from(selectedSponsorIds) : undefined
    const result = await savePitch({ ...values, mediaUrls }, status, pitchId, sponsorIds)
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

  function toggleSponsor(sponsorId: string) {
    const newSet = new Set(selectedSponsorIds)
    if (newSet.has(sponsorId)) {
      newSet.delete(sponsorId)
    } else {
      newSet.add(sponsorId)
    }
    setSelectedSponsorIds(newSet)
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setRateLimitData(null)

    // Ensure we have a pitch id to attach media to.
    let id = pitchId
    if (!id) {
      const draft = await autoSavePitchDraft({ ...form.getValues(), mediaUrls }, undefined)
      if (draft.error || !draft.id) {
        setError(draft.error ?? 'Could not create draft for media upload')
        return
      }
      id = draft.id
      setPitchId(id)
    }

    setMediaUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPitchMedia(id, fd)
    setMediaUploading(false)
    e.target.value = ''
    if (result.error) {
      setError(result.error)
    } else if (result.mediaUrls) {
      setMediaUrls(result.mediaUrls)
      form.setValue('mediaUrls', result.mediaUrls)
    }
  }

  async function handleRemoveMedia(url: string) {
    if (!pitchId) return
    const result = await removePitchMedia(pitchId, url)
    if (result.error) {
      setError(result.error)
    } else if (result.mediaUrls) {
      setMediaUrls(result.mediaUrls)
      form.setValue('mediaUrls', result.mediaUrls)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{initialPitch ? 'Edit Pitch' : 'Create Pitch'}</CardTitle>
            <CardDescription>
              Build a comprehensive sponsorship pitch to send to targeted companies.
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
              This pitch is {initialPitch?.status} and can no longer be edited.
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
              <h3 className="text-lg font-medium">1. Overview</h3>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pitch Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2024 World Championship Fund" {...field} disabled={readOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Executive Summary</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Briefly describe what you are raising money for and the impact it will have."
                        className="min-h-[100px]"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">2. Financial Ask</h3>

              <FormField
                control={form.control}
                name="costExplanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Explanation</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you need these specific items and how they support your team's goals."
                        className="min-h-[100px]"
                        disabled={readOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Budget Line Items</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={readOnly}
                    onClick={() => append({ label: '', qty: 1, unitCostCents: 0, totalCents: 0 })}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </div>

                <div className="border rounded-md divide-y">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-medium text-sm">
                    <div className="col-span-5">Item / Service</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Cost ($)</div>
                    <div className="col-span-2 text-right">Total ($)</div>
                    <div className="col-span-1"></div>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.label`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="e.g., Robot Parts Kit" disabled={readOnly} {...inputField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.qty`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  className="text-center"
                                  disabled={readOnly}
                                  value={inputField.value}
                                  onChange={(e) =>
                                    handleLineItemChange(index, 'qty', parseInt(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitCostCents`}
                          render={({ field: inputField }) => (
                            <FormItem>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-muted-foreground text-sm">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="pl-6 text-right"
                                    disabled={readOnly}
                                    value={inputField.value ? inputField.value / 100 : ''}
                                    onChange={(e) => {
                                      const cents = Math.round(parseFloat(e.target.value) * 100) || 0
                                      handleLineItemChange(index, 'unitCostCents', cents)
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        ${(form.watch(`lineItems.${index}.totalCents`) / 100).toFixed(2)}
                      </div>
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            remove(index)
                            setTimeout(() => {
                              form.setValue(
                                'financialAskCents',
                                calculateTotal(form.getValues('lineItems'))
                              )
                            }, 0)
                          }}
                          disabled={readOnly || fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end p-4 bg-muted/30 rounded-md">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Total Financial Ask</p>
                    <p className="text-2xl font-bold">${(form.watch('financialAskCents') / 100).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">3. Media</h3>
              <p className="text-sm text-muted-foreground">
                Add team photos or project images to include in the sponsor email (up to 5 MB each).
              </p>

              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {mediaUrls.map((url) => (
                    <div key={url} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Pitch media" className="w-full h-32 object-cover rounded border" />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(url)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                          aria-label="Remove media"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!readOnly && (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleMediaUpload}
                    disabled={mediaUploading}
                  />
                  {mediaUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                </div>
              )}
            </div>

            {!readOnly && sponsors.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">4. Target Sponsors</h3>
                <p className="text-sm text-muted-foreground">
                  Select companies to send this pitch to. You can always change this later.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sponsors.map((sponsor) => {
                    const remaining = sponsor.funding_cap_cents - sponsor.funding_used_cents
                    const isSelected = selectedSponsorIds.has(sponsor.id)
                    return (
                      <button
                        key={sponsor.id}
                        type="button"
                        onClick={() => toggleSponsor(sponsor.id)}
                        className={cn(
                          'p-3 border rounded-md text-left transition',
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-muted-foreground/30 hover:border-muted-foreground'
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{sponsor.company_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ${(remaining / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })} remaining
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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
                  onClick={form.handleSubmit((v) => onSubmit(v, 'submitted'))}
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
