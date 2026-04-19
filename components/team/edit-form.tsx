'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { updateTeam, uploadTeamLogo } from '@/app/actions/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Team } from '@/lib/supabase/types'

export function TeamEditForm({ team }: { team: Team }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(team.logo_url)

  const form = useForm<TeamOnboardingInput>({
    resolver: zodResolver(teamOnboardingSchema) as any,
    defaultValues: {
      status: team.status,
      ftcTeamNumber: team.ftc_team_number ?? undefined,
      teamName: team.team_name,
      organization: team.organization ?? '',
      city: team.city ?? '',
      state: team.state ?? '',
      missionStatement: team.mission_statement ?? '',
      taxStatus: team.tax_status,
      communityInterestText: team.community_interest_text ?? '',
      seedFundingGoalsCents: team.seed_funding_goals_cents ?? 0,
      technicalSummary: team.technical_summary ?? '',
      outreachSummary: team.outreach_summary ?? '',
      mediaUrls: team.media_urls || [],
      youtubeUrl: team.youtube_url ?? '',
      budgetItems: team.budget_items || [],
      financialAskCents: team.financial_ask_cents ?? 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'budgetItems'
  })

  async function onSubmit(values: TeamOnboardingInput) {
    setIsPending(true)
    setError(null)
    setSuccess(false)
    const result = await updateTeam(team.id, values)
    setIsPending(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
  }

  const calculateTotal = () => {
    const items = form.getValues('budgetItems') || []
    const total = items.reduce((sum, item) => sum + (item.totalCents || 0), 0)
    form.setValue('financialAskCents', total)
    return total
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadTeamLogo(team.id, fd)
    setLogoUploading(false)
    if ('error' in result && result.error) {
      setLogoError(result.error)
    } else if ('url' in result && result.url) {
      setLogoUrl(result.url as string)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Edit Master Portfolio</h1>
        <p className="text-muted-foreground">Keep your team&apos;s professional identity up to date.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Team logo" className="w-24 h-24 object-contain rounded border" />
          )}
          {logoError && (
            <Alert variant="destructive">
              <AlertDescription>{logoError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="logo">
              {logoUrl ? 'Replace logo' : 'Upload logo'} (JPG, PNG, WebP — max 2 MB)
            </label>
            <Input
              id="logo"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleLogoUpload}
              disabled={logoUploading}
            />
            {logoUploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Core Identity</CardTitle>
              <CardDescription>Basic information about your team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-emerald-50 border-emerald-200">
                  <AlertDescription className="text-emerald-800">Portfolio updated successfully.</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control as any}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control as any} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField
                control={form.control as any}
                name="taxStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Status</FormLabel>
                    <FormControl>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-between font-normal">
                            {field.value === 'None' ? 'Standard / No tax-exempt status' : 
                             field.value === '501c3' ? '501(c)(3) Non-profit' : 
                             field.value === 'School' ? 'School / Educational Institution' : 'Select tax status'}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full min-w-[300px]">
                        <DropdownMenuItem onClick={() => field.onChange('None')}>
                          Standard / No tax-exempt status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => field.onChange('501c3')}>
                          501(c)(3) Non-profit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => field.onChange('School')}>
                          School / Educational Institution
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Narrative & Portfolio</CardTitle>
              <CardDescription>These summaries are sent to every sponsor you apply to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control as any}
                name="missionStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Statement</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="technicalSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engineering & Technical Portfolio</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="outreachSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community Outreach</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Budget & Financials</CardTitle>
                <CardDescription>Itemized list of your funding needs.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ label: '', qty: 1, unitCostCents: 0, totalCents: 0 })}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md">
                    <div className="col-span-5">
                      <FormLabel className="text-xs">Item Label</FormLabel>
                      <Input {...form.register(`budgetItems.${index}.label`)} />
                    </div>
                    <div className="col-span-2">
                      <FormLabel className="text-xs">Qty</FormLabel>
                      <Input type="number" {...form.register(`budgetItems.${index}.qty`, { valueAsNumber: true })} 
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 0
                          const unit = form.getValues(`budgetItems.${index}.unitCostCents`) || 0
                          form.setValue(`budgetItems.${index}.totalCents`, qty * unit)
                          calculateTotal()
                        }}
                      />
                    </div>
                    <div className="col-span-4">
                      <FormLabel className="text-xs">Unit Cost ($)</FormLabel>
                      <Input type="number" step="0.01" 
                        defaultValue={(form.getValues(`budgetItems.${index}.unitCostCents`) || 0) / 100}
                        onChange={(e) => {
                          const dollars = parseFloat(e.target.value) || 0
                          const unit = Math.round(dollars * 100)
                          const qty = form.getValues(`budgetItems.${index}.qty`) || 0
                          form.setValue(`budgetItems.${index}.unitCostCents`, unit)
                          form.setValue(`budgetItems.${index}.totalCents`, qty * unit)
                          calculateTotal()
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => { remove(index); calculateTotal(); }} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted p-4 rounded-md flex justify-between items-center font-bold">
                <span>Total Portfolio Ask:</span>
                <span className="text-xl">${(form.watch('financialAskCents') / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Portfolio Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
