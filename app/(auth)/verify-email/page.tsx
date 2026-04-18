import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a verification link. Please check your inbox and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once verified, you&apos;ll be able to log in and start building your team profile.
          </p>
          <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            Return to Login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
