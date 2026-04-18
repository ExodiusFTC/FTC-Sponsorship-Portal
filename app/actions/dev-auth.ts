'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DEV_CREDENTIALS = {
  coach: { email: 'noreply+coach-1776482921139@exodiusftc.com', password: 'devpassword123!', name: 'Smoke Coach' },
  admin: { email: 'anish.yarrakonda456@gmail.com', password: 'devpassword123!', name: 'Dev Admin' },
} as const

type Role = 'coach' | 'admin'

export async function devSignIn(role: Role) {
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'Dev login is only available in development mode.' }
  }

  const { email, password, name } = DEV_CREDENTIALS[role]
  const admin = createAdminClient()

  // Check if user already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === email)

  if (!existing) {
    // Create user with email pre-confirmed
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (createErr || !created?.user) {
      return { error: createErr?.message ?? 'Failed to create dev user' }
    }

    // For admin role, update profile role (trigger creates the profile)
    if (role === 'admin') {
      // Brief wait for profile trigger to fire
      await new Promise(r => setTimeout(r, 500))
      await admin
        .from('profiles')
        .update({ role: 'admin', coach_verified: true })
        .eq('id', created.user.id)
    }
  } else if (role === 'admin') {
    // Ensure existing dev admin has correct role
    const updateRes = await admin
      .from('profiles')
      .update({ role: 'admin', coach_verified: true })
      .eq('id', existing.id)
    if (updateRes.error) console.error("Admin update error:", updateRes.error)
  }

  // Sign in via normal password auth
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    return { error: signInError.message }
  }

  redirect(role === 'admin' ? '/admin' : '/dashboard')
}
