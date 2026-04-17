'use client'

import { useState } from 'react'
import { uploadCredentials } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function UploadCredentialsForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await uploadCredentials(formData)

    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Adult Verification</CardTitle>
        <CardDescription>
          To comply with COPPA, we must verify that you are an adult coach or advisor. Please upload a copy of your school ID, FIRST certification, or other proof of status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="file">Verification Document (PDF, JPG, PNG)</Label>
            <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Uploading...' : 'Upload & Continue'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-muted-foreground text-center">
        Your data is stored securely and used only for verification purposes.
      </CardFooter>
    </Card>
  )
}
