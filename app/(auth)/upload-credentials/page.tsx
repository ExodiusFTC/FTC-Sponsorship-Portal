'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UploadCloud, CheckCircle2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function UploadCredentialsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.size > 5 * 1024 * 1024) {
        toast.error('File too large (max 5MB)')
        return
      }
      setFile(selected)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/credentials.${fileExt}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('coach-credentials')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coach_credentials_url: filePath })
        .eq('id', user.id)

      if (updateError) throw updateError

      setIsSuccess(true)
      toast.success('Credentials uploaded successfully!')
      
      setTimeout(() => {
        router.push('/awaiting-verification')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload credentials. Please try again.')
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="container mx-auto max-w-md py-20">
        <Card className="text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <CardTitle>Upload Complete</CardTitle>
            <CardDescription>
              Your credentials have been uploaded and are ready for review.
              Redirecting you back...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md py-20">
      <Link 
        href="/awaiting-verification" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to status
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Upload Coach Credentials</CardTitle>
          <CardDescription>
            Please upload a photo of your school ID, faculty badge, or a signed letter from your administration to verify your role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div 
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl bg-background/50 hover:bg-accent transition-colors cursor-pointer" 
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground px-4 text-center">
                {file ? (
                  <span className="font-semibold text-foreground">{file.name}</span>
                ) : (
                  <span>Click to select or drag and drop<br />PDF, JPG, or PNG (Max 5MB)</span>
                )}
              </p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,image/jpeg,image/png" 
              onChange={handleFileChange} 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            disabled={!file || isUploading} 
            onClick={handleUpload}
          >
            {isUploading ? 'Uploading...' : 'Submit for review'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
