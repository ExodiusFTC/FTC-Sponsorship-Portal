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
    pathname.startsWith('/mfa')

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/sponsors/apply') ||
    pathname.startsWith('/sponsor-view/') ||
    pathname.startsWith('/auth/')

  // API routes for admin must reject unauthenticated callers at the edge
  // (the route handlers re-check, but the edge layer should not let them in).
  const isAdminApi = pathname.startsWith('/api/admin')
  if (isAdminApi && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user && !isAuthPage && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage && !pathname.startsWith('/mfa')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin routes require aal2 (TOTP verified). If the session is only aal1,
  // redirect to the MFA challenge page which will redirect back after success.
  const isAdminRoute =
    (pathname.startsWith('/admin') || pathname.startsWith('/moderation') ||
     pathname.startsWith('/coaches') || pathname.startsWith('/sponsors') ||
     pathname.startsWith('/analytics') || pathname.startsWith('/settings')) &&
    !pathname.startsWith('/sponsors/apply')

  if (user && isAdminRoute && !pathname.startsWith('/admin/security')) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      const next = encodeURIComponent(pathname)
      return NextResponse.redirect(new URL(`/mfa?next=${next}`, request.url))
    }
  }

  // Don't let intermediaries cache authenticated HTML responses.
  supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0')

  return supabaseResponse
}
