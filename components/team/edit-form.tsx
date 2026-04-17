'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateTeam, uploadTeamLogo } from '@/app/actions/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Team } from '@/lib/supabase/types'

const editSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters'),
  organization: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  missionStatement: z.string().min(50, 'Mission statement should be at least 50 characters'),
  is501c3: z.boolean(),
})

type EditInput = z.infer<typeof editSchema>

export function TeamEditForm({ team }: { team: Team }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(team.logo_url)

  const form = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      teamName: team.team_name,
      organization: team.organization ?? '',
      city: team.city ?? '',
      state: team.state ?? '',
      missionStatement: team.mission_statement ?? '',
      is501c3: team.is_501c3,
    },
  })

  async function onSubmit(values: EditInput) {
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadTeamLogo(team.id, fd)
    setLogoUploading(false)
    if (result.error) {
      setLogoError(result.error)
    } else if (result.url) {
      setLogoUrl(result.url)
    }
  }

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert>
                  <AlertDescription>Team profile updated successfully.</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                      <Textarea className="min-h-[100px]" {...field} />
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
                      <FormLabel>My organization has 501(c)(3) non-profit status</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        This allows sponsors to make tax-deductible donations.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
