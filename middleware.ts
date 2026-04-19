import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { globalLimiter } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  // Apply Global Rate Limiting
  if (globalLimiter) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await globalLimiter.limit(ip)
    
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
