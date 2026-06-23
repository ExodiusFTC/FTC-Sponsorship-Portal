import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'

// Next.js 16 renamed the `middleware` convention to `proxy`; this is the active
// edge entrypoint. Clerk's middleware runs here so `auth()` works in Server
// Components / Server Actions / route handlers.

// Routes reachable without an authenticated session. Mirrors the previous
// public-routes list, plus public team pages and secret-authenticated
// webhooks/cron (those verify their own signatures).
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/verify-email(.*)',
  '/legal(.*)',
  '/sponsors/apply(.*)',
  '/sponsor-view(.*)',
  '/teams(.*)', // public team portfolio pages
  '/api/webhooks(.*)', // Clerk + Resend webhooks
  '/api/cron(.*)', // CRON_SECRET-authenticated
])

const isApiRoute = createRouteMatcher(['/api(.*)'])

const handler = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId } = await auth()
  if (userId) return

  // Unauthenticated, non-public request.
  // API routes return JSON 401 (never redirected); pages bounce to /login.
  if (isApiRoute(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('redirect_url', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
})

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return handler(request, event)
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals and static assets...
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|otf|map)).*)',
    // ...and always on API routes.
    '/(api|trpc)(.*)',
  ],
}
