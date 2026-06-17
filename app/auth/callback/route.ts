import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNext(searchParams.get('next'))

  const supabase = await createClient()

  if (token_hash && type) {
    // Token-hash OTP flow — not consumed by email scanners since it requires
    // the browser session to call verifyOtp. Preferred for signup confirmation.
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(buildRedirect(origin, request, next))
    }
  }

  if (code) {
    // PKCE code-exchange flow — fallback for magic links / OAuth
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(buildRedirect(origin, request, next))
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

// Only allow same-origin relative paths as the post-auth destination. Rejects
// absolute URLs, protocol-relative (`//host`), backslash tricks, and userinfo
// injection (`@evil.com` would turn `https://host` + next into `https://host@evil.com`).
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/'
  }
  return next
}

function buildRedirect(origin: string, request: Request, next: string) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (process.env.NODE_ENV === 'development' || !forwardedHost) {
    return `${origin}${next}`
  }
  return `https://${forwardedHost}${next}`
}
