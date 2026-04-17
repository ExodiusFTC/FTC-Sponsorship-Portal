'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[app/error] Unhandled error:', error)
  }, [error])

  const showDetails = process.env.NODE_ENV !== 'production'

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We hit an unexpected error while loading this page. You can try again or head back home.
          </CardDescription>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <pre className="whitespace-pre-wrap break-words rounded bg-muted p-3 font-mono text-xs text-muted-foreground">
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ''}
            </pre>
          </CardContent>
        )}
        <CardFooter className="flex gap-2">
          <Button onClick={() => unstable_retry()}>Try again</Button>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
            Go home
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
