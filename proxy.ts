import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { globalLimiter } from '@/lib/rate-limit'

// Next.js 16 renamed the `middleware` convention to `proxy`. Same behavior.
export async function proxy(request: NextRequest) {
  // Global IP rate limit — fail-open if Redis unreachable in prod (graceful degradation).
  if (process.env.NODE_ENV === 'production') {
    if (!globalLimiter) {
      console.warn('[proxy] globalLimiter unavailable — passing through (graceful degradation)')
    } else {
      try {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
        const { success } = await globalLimiter.limit(ip)
        if (!success) return new NextResponse('Too Many Requests', { status: 429 })
      } catch (err) {
        console.error('[proxy] globalLimiter request failed — passing through (graceful degradation):', err)
      }
    }
  }
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
