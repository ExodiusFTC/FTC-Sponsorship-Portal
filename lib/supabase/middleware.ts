import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/mfa')

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/sponsors/apply') ||
    pathname.startsWith('/sponsor-view/') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/')

  // API routes for admin must reject unauthenticated callers at the edge
  // (the route handlers re-check, but the edge layer should not let them in).
  const isAdminApi = pathname.startsWith('/api/admin')
  if (isAdminApi && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // API routes authenticate themselves in their handlers (webhooks via Svix,
  // cron via CRON_SECRET, /api/health is public, the rest return JSON 401/403).
  // They must never be bounced to the HTML /login page — doing so silently
  // breaks the Resend webhook and the Vercel cron, which call with no session.
  const isApiRoute = pathname.startsWith('/api')

  if (!user && !isAuthPage && !isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage && !pathname.startsWith('/mfa')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin routes require aal2 (TOTP verified). The gate is ROLE-AWARE so it can FORCE
  // enrollment for an admin who never set up a factor (previously such admins bypassed MFA
  // entirely, since the old gate only fired when a factor already existed). /sponsors/browse
  // is a coach route sharing the /sponsors prefix; /sponsors/apply is public; /admin/security
  // is the enrollment page and must stay reachable.
  const isAdminRoute =
    (pathname.startsWith('/admin') || pathname.startsWith('/moderation') ||
     pathname.startsWith('/coaches') || pathname.startsWith('/sponsors') ||
     pathname.startsWith('/analytics') || pathname.startsWith('/applications') ||
     pathname.startsWith('/settings')) &&
    !pathname.startsWith('/sponsors/apply') &&
    !pathname.startsWith('/sponsors/browse')

  if (user && isAdminRoute && !pathname.startsWith('/admin/security')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel !== 'aal2') {
        if (!aal?.nextLevel || aal.nextLevel === 'aal1') {
          // No verified TOTP factor yet — force enrollment before any admin access.
          return NextResponse.redirect(new URL('/admin/security?setup=1', request.url))
        }
        // Factor exists but the session is only aal1 — force the challenge.
        const next = encodeURIComponent(pathname)
        return NextResponse.redirect(new URL(`/mfa?next=${next}`, request.url))
      }
    }
  }

  // Don't let intermediaries cache authenticated HTML responses.
  supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0')

  return supabaseResponse
}
