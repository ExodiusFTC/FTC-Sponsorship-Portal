import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// IMPORTANT: Only use this in server-side code (Server Actions, Route Handlers).
// This client bypasses ALL Row Level Security policies.
// Required for: audit_log inserts, admin operations, email dispatch.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
