import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { globalLimiter } from '@/lib/rate-limit'

export async function proxy(request: NextRequest) {
  // Avoid external limiter latency during local development.
  if (process.env.NODE_ENV === 'production' && globalLimiter) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const { success } = await globalLimiter.limit(ip)

    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
