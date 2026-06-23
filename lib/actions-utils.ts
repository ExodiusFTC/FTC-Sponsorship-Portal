import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function getClientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

// Resolves the Clerk session to the caller's profile row.
//
// `user` is the profiles row, so `user.id` is the internal profile uuid —
// source-compatible with all existing callers that compared `user.id` against
// owner_id / recipient_id / reviewed_by. `clerkUserId` is the Clerk id, needed
// for storage paths (files partition by Clerk id).
export async function requireAuth(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: Profile
  clerkUserId: string
}> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()

  // Profile may not exist yet immediately after Clerk signup (webhook/profile
  // creation race) — treat as unauthorized so callers fall back to onboarding.
  if (!user) {
    throw new Error('Unauthorized')
  }

  return { supabase, user, clerkUserId }
}

// Non-throwing variant for Server Components / route handlers that want to
// redirect or branch instead of throwing. Returns null when unauthenticated or
// when no profile row exists yet. `user` is the profiles row (so `user.id` is
// the profile uuid — drop-in for the old `supabase.auth.getUser()` whose
// `user.id` equalled profiles.id).
export async function getAuthedProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: Profile
  clerkUserId: string
} | null> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const supabase = await createClient()
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) return null
  return { supabase, user, clerkUserId }
}

export async function requireAdmin() {
  const { supabase, user, clerkUserId } = await requireAuth()
  if (user.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return { supabase, user, clerkUserId, adminClient: createAdminClient() }
}

export async function requireSponsor() {
  const { supabase, user, clerkUserId } = await requireAuth()
  if (user.role !== 'sponsor' || !user.sponsor_id) {
    throw new Error('Forbidden')
  }
  return {
    supabase,
    user,
    clerkUserId,
    sponsorId: user.sponsor_id,
    adminClient: createAdminClient(),
  }
}

export async function requireVerifiedCoach() {
  const { supabase, user, clerkUserId } = await requireAuth()
  if (user.role !== 'coach') throw new Error('Forbidden')
  if (!user.coach_verified) {
    const e: Error & { code?: string } = new Error('Awaiting credential verification')
    e.code = 'NEEDS_VERIFICATION'
    throw e
  }
  return { supabase, user, clerkUserId }
}
