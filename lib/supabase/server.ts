import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from './types'

// Server-side Supabase client that respects RLS as the CURRENT Clerk user.
//
// Auth is provided by Clerk via Supabase's native third-party-auth integration:
// the `accessToken` callback hands Supabase the Clerk session token, so RLS
// policies see the Clerk user id as `auth.jwt()->>'sub'`. No Supabase Auth
// cookies are involved — Clerk owns the session.
//
// Kept `async` for source-compatibility with existing `await createClient()` callers.
export async function createClient() {
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
