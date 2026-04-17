import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function AuthCodeErrorPage() {
  return (
    <div className="container mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-semibold">Authentication link expired</h1>
      <p className="mt-3 text-muted-foreground">
        This sign-in link is invalid or has already been used. Please request a new one.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/login" className={cn(buttonVariants())}>Back to sign in</Link>
        <Link href="/signup" className={cn(buttonVariants({ variant: 'outline' }))}>Create account</Link>
      </div>
    </div>
  )
}
