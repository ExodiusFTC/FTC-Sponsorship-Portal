import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions/auth'

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

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  // If already verified AND has a team, push them forward
  if (profile?.coach_verified && team) redirect('/dashboard')

  const isVerifiedWithoutTeam = profile?.coach_verified && !team

  return (
    <div className="container mx-auto max-w-md py-20">
      <Card className="text-center">
        <CardHeader>
          <div className={cn(
            "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl",
            isVerifiedWithoutTeam ? "bg-emerald-100/10" : "bg-amber-100/10"
          )}>
            {isVerifiedWithoutTeam ? '✓' : '⏱︎'}
          </div>
          <CardTitle>{isVerifiedWithoutTeam ? 'Account Verified!' : 'Application under review'}</CardTitle>
          <CardDescription className="text-base">
            {isVerifiedWithoutTeam 
              ? "Your account is verified. We are just finishing setting up your team portfolio. This should only take a moment."
              : "We received your credentials. A platform admin will verify your account — typically within one business day. You'll be able to build pitches once approved."
            }
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
          <div className="flex flex-col gap-2">
            {!profile?.coach_credentials_url && (
              <Link
                href="/upload-credentials"
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
              >
                Upload credentials
              </Link>
            )}
            <form action={signOut} className="w-full">
              <button
                type="submit"
                className={cn(buttonVariants({ variant: 'ghost' }), 'w-full text-zinc-500 hover:text-zinc-200')}
              >
                Sign out
              </button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
