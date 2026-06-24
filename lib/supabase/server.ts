import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from './types'
import { isDevAuthBypass, createMockSupabaseClient } from '@/lib/dev-bypass'
import { COACH_PREVIEW, createMockCoachClient } from '@/lib/dev-coach-preview'

// Server-side Supabase client that respects RLS as the CURRENT Clerk user.
//
// Auth is provided by Clerk via Supabase's native third-party-auth integration:
// the `accessToken` callback hands Supabase the Clerk session token, so RLS
// policies see the Clerk user id as `auth.jwt()->>'sub'`. No Supabase Auth
// cookies are involved — Clerk owns the session.
//
// Kept `async` for source-compatibility with existing `await createClient()` callers.
export async function createClient() {
  // Dev-only: serve canned data so the portal works with no session. No-op in prod.
  if (isDevAuthBypass()) return createMockSupabaseClient()
  if (COACH_PREVIEW) return createMockCoachClient()
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    }
  )
}
