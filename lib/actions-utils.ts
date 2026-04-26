import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkActionLimit, checkAuthLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export async function getClientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  return { supabase, user }
}

export async function requireAdmin() {
  const { supabase, user } = await requireAuth()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Forbidden')
  }

  return { supabase, user, adminClient: createAdminClient() }
}

export async function requireSponsor() {
  const { supabase, user } = await requireAuth()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, sponsor_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'sponsor' || !profile.sponsor_id) {
    throw new Error('Forbidden')
  }

  return { supabase, user, sponsorId: profile.sponsor_id, adminClient: createAdminClient() }
}

export async function validateRateLimit(key: string) {
  const limit = await checkActionLimit(key)
  if (!limit.ok) {
    return {
      error: 'rate_limited' as const,
      retryAfterSeconds: limit.retryAfterSeconds,
      limit: limit.limit
    }
  }
  return { ok: true }
}

export async function validateAuthLimit(key: string) {
  const limit = await checkAuthLimit(key)
  if (!limit.ok) {
    return {
      error: 'rate_limited' as const,
      retryAfterSeconds: limit.retryAfterSeconds,
      limit: limit.limit,
    }
  }
  return { ok: true }
}
