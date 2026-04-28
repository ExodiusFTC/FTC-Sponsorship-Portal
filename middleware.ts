import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { globalLimiter } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  // Global IP rate limit — fail-closed if Redis unreachable in prod.
  if (process.env.NODE_ENV === 'production') {
    if (!globalLimiter) {
      return new NextResponse('Service unavailable', { status: 503 })
    }
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const { success } = await globalLimiter.limit(ip)
    if (!success) return new NextResponse('Too Many Requests', { status: 429 })
  }
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
