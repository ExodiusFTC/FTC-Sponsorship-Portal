'use client'

import { useClerk } from '@clerk/nextjs'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SignOutButton() {
  const { signOut } = useClerk()

  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: '/login' })}
      className={cn(buttonVariants({ variant: 'ghost' }), 'w-full text-muted-foreground')}
    >
      Sign out
    </button>
  )
}
