'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function RateLimitNotice({
  retryAfterSeconds,
  message = 'Too many requests',
}: {
  retryAfterSeconds: number
  message?: string
}) {
  const [timeLeft, setTimeLeft] = useState(retryAfterSeconds)

  useEffect(() => {
    if (timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft])

  if (timeLeft <= 0) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>{message}</AlertTitle>
      <AlertDescription>
        Please try again in {timeLeft} second{timeLeft !== 1 ? 's' : ''}.
      </AlertDescription>
    </Alert>
  )
}
