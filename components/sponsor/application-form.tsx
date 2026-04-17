'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sponsorApplicationSchema, type SponsorApplicationInput } from '@/lib/schemas/sponsor'
import { submitSponsorApplication } from '@/app/actions/sponsor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2 } from 'lucide-react'

export function ApplicationForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<SponsorApplicationInput>({
    resolver: zodResolver(sponsorApplicationSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      contactEmail: '',
      proposedCapCents: 0,
      message: '',
    },
  })

  async function onSubmit(values: SponsorApplicationInput) {
    setIsPending(true)
    setError(null)
    const result = await submitSponsorApplication(values)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else {
      setIsSuccess(true)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-lg mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <CardTitle>Application Received</CardTitle>
          <CardDescription>
            Thank you for your interest in sponsoring FTC teams. Our team will review your application and get back to you shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Become a Sponsor</CardTitle>
        <CardDescription>
          Support the next generation of engineers and innovators by becoming a verified sponsor on the FTC Sponsorship Portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tech Giant Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="proposedCapCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Annual Funding Cap ($)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-muted-foreground text-sm">$</span>
                      <Input 
                        type="number" 
                        min="0"
                        className="pl-6"
                        value={field.value ? field.value / 100 : ''}
                        onChange={(e) => {
                          const cents = Math.round(parseFloat(e.target.value) * 100) || 0
                          field.onChange(cents)
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us a bit about why you want to support FTC robotics..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
