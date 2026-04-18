import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function AwaitingVerificationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('coach_verified, coach_credentials_url')
    .eq('id', user.id)
    .single()

  // If already verified, push them forward
  if (profile?.coach_verified) redirect('/dashboard')

  return (
    <div className="container mx-auto max-w-md py-20">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-10 text-3xl">
            ⏱︎
          </div>
          <CardTitle>Application under review</CardTitle>
          <CardDescription className="text-base">
            We received your credentials. A platform admin will verify your account — typically
            within one business day. You&apos;ll be able to build pitches once approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Questions? Contact us at{' '}
            <a href="mailto:support@ftcportal.dev" className="underline">
              support@ftcportal.dev
            </a>
            .
          </p>
          {!profile?.coach_credentials_url && (
            <Link
              href="/upload-credentials"
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            >
              Upload credentials
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
