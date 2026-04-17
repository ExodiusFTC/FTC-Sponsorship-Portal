'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { createTeam } from '@/app/actions/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function OnboardingForm({ isVerified }: { isVerified: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<TeamOnboardingInput>({
    resolver: zodResolver(teamOnboardingSchema),
    defaultValues: {
      status: 'existing',
      teamName: '',
      organization: '',
      city: '',
      state: '',
      missionStatement: '',
      is501c3: false,
    },
  })

  const status = form.watch('status')

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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Team Onboarding</CardTitle>
        <CardDescription>
          Tell us about your FTC team or your plans for a new one.
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Team Status</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          {...field}
                          value="existing"
                          checked={field.value === 'existing'}
                          className="w-4 h-4"
                        />
                        <span>Existing FTC Team</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          {...field}
                          value="incubator"
                          checked={field.value === 'incubator'}
                          className="w-4 h-4"
                        />
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
                control={form.control}
                name="ftcTeamNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FTC Team Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 12345"
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const num = parseInt(e.target.value)
                          field.onChange(isNaN(num) ? undefined : num)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="teamName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. The RoboKnights" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School / Organization (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Central High School" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Austin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. TX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="missionStatement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mission Statement</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What is your team's goal? How do you impact your community?" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is501c3"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      My organization has 501(c)(3) non-profit status
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This allows sponsors to make tax-deductible donations.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending || !isVerified}>
              {isPending ? 'Creating Team...' : 'Create Team'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
