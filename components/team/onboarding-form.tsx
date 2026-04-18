'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { createTeam, lookupFTCTeam } from '@/app/actions/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2 } from 'lucide-react'

export function OnboardingForm({ isVerified }: { isVerified: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupSuccess, setLookupSuccess] = useState(false)

  const form = useForm<TeamOnboardingInput>({
    resolver: zodResolver(teamOnboardingSchema) as any,
    defaultValues: {
      status: 'existing',
      teamName: '',
      organization: '',
      city: '',
      state: '',
      missionStatement: '',
      taxStatus: "None",
      communityInterestText: '',
      seedFundingGoalsCents: 0,
      technicalSummary: '',
      outreachSummary: '',
      mediaUrls: [],
      youtubeUrl: '',
      budgetItems: [],
      financialAskCents: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'budgetItems'
  })

  const status = form.watch('status')

  async function handleLookup() {
    const teamNumber = form.getValues('ftcTeamNumber')
    if (!teamNumber) {
      form.setError('ftcTeamNumber', { message: 'Enter a team number first' })
      return
    }
    setIsLookingUp(true)
    setLookupSuccess(false)
    const result = await lookupFTCTeam(teamNumber)
    setIsLookingUp(false)
    if (result.error || !result.team) {
      form.setError('ftcTeamNumber', { message: result.error ?? 'Team not found in FIRST registry' })
      return
    }
    form.setValue('teamName', result.team.team_name, { shouldValidate: true })
    if (result.team.city) form.setValue('city', result.team.city, { shouldValidate: true })
    if (result.team.state) form.setValue('state', result.team.state, { shouldValidate: true })
    form.clearErrors('ftcTeamNumber')
    setLookupSuccess(true)
  }

  async function onSubmit(values: TeamOnboardingInput) {
    if (!isVerified) {
      setError('Your coach account must be verified by an admin before you can create a team.')
      return
    }
    setIsPending(true)
    setError(null)
    const result = await createTeam(values)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  const calculateTotal = () => {
    const items = form.getValues('budgetItems') || []
    const total = items.reduce((sum, item) => sum + (item.totalCents || 0), 0)
    form.setValue('financialAskCents', total)
    return total
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Master Portfolio Onboarding</CardTitle>
        <CardDescription>
          Build your team&apos;s professional portfolio. This acts as your &ldquo;Master Resume&rdquo; for all sponsorship applications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isVerified && (
          <Alert className="mb-6">
            <AlertDescription>
              Your account is currently pending verification. You can fill out this form, but you won&apos;t be able to submit it until an admin approves your credentials.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Basic Identity</h3>
              <FormField
                control={form.control as any}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Team Status</FormLabel>
                    <FormControl>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" {...field} value="existing" checked={field.value === 'existing'} onChange={() => { field.onChange('existing'); setLookupSuccess(false); }} className="w-4 h-4" />
                          <span>Existing FTC Team</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" {...field} value="incubator" checked={field.value === 'incubator'} onChange={() => { field.onChange('incubator'); setLookupSuccess(false); }} className="w-4 h-4" />
                          <span>Incubator (New Team)</span>
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {status === 'existing' && (
                <FormField
                  control={form.control as any}
                  name="ftcTeamNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FTC Team Number</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input placeholder="e.g. 12345" type="number" value={field.value ?? ''} onChange={(e) => { const num = parseInt(e.target.value); field.onChange(isNaN(num) ? undefined : num); setLookupSuccess(false); }} />
                          <Button type="button" variant="outline" onClick={handleLookup} disabled={isLookingUp} className="shrink-0">
                            {isLookingUp ? 'Looking up...' : 'Lookup'}
                          </Button>
                        </div>
                      </FormControl>
                      {lookupSuccess && <p className="text-sm text-green-600">Team found in FIRST registry.</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control as any}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl><Input placeholder="e.g. The RoboKnights" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g. Austin" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control as any} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="e.g. TX" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField
                control={form.control as any}
                name="taxStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Status</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="None">Standard / No tax-exempt status</option>
                        <option value="501c3">501(c)(3) Non-profit</option>
                        <option value="School">School / Educational Institution</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Narrative & Portfolio</h3>
              <FormField
                control={form.control as any}
                name="missionStatement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Statement</FormLabel>
                    <FormControl><Textarea placeholder="What is your team's goal?" className="min-h-[100px]" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Describe your build system, programming environment, and proudest engineering feat." className="min-h-[100px]" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="How do you spread STEM in your community?" className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-semibold">Budget & Financials</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ label: '', qty: 1, unitCostCents: 0, totalCents: 0 })}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md">
                    <div className="col-span-5">
                      <FormLabel className="text-xs">Item Label</FormLabel>
                      <Input {...form.register(`budgetItems.${index}.label`)} placeholder="e.g. REV Control Hub" />
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
            </div>

            <Button type="submit" className="w-full text-lg h-12" disabled={isPending || !isVerified}>
              {isPending ? 'Creating Portfolio...' : 'Launch Master Portfolio'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
