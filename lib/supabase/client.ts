import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { isDevAuthBypass, createMockSupabaseClient } from '@/lib/dev-bypass'
import { COACH_PREVIEW, createMockCoachClient } from '@/lib/dev-coach-preview'

// Browser Supabase client that respects RLS as the current Clerk user.
//
// The `accessToken` callback reads the live Clerk session token off `window.Clerk`,
// which Clerk attaches once `<ClerkProvider>` has loaded. The callback runs per
// request, so the token is fresh by the time any query fires. Returns null when no
// session (anon access for public reads).
export function createClient() {
  // Dev-only: serve canned data so the portal works with no session. No-op in prod.
  if (isDevAuthBypass()) return createMockSupabaseClient()
  if (COACH_PREVIEW) return createMockCoachClient()
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        if (typeof window === 'undefined') return null
        const clerk = (window as unknown as { Clerk?: { session?: { getToken(): Promise<string | null> } } }).Clerk
        return (await clerk?.session?.getToken()) ?? null
      },
    }
  )
}
