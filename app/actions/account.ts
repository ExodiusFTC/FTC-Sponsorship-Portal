'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getClientIp, validateRateLimit, requireAuth } from '@/lib/actions-utils'

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter')
    .regex(/[0-9]/, 'Password must include at least one number'),
})

const deleteAccountSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase().email('Enter a valid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
})

export async function updateProfile(data: { fullName: string }) {
  const result = updateProfileSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
    return { error: 'Not authenticated' }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`update_profile_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: result.data.fullName },
  })
  if (authError) return { error: authError.message }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: result.data.fullName })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  return { success: true }
}

export async function updatePassword(data: { password: string }) {
  const result = updatePasswordSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
    return { error: 'Not authenticated' }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`update_password_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { error } = await supabase.auth.updateUser({ password: result.data.password })
  if (error) return { error: error.message }

  return { success: true }
}

export async function deleteAccount(data: { confirmEmail: string; currentPassword: string }) {
  const parsed = deleteAccountSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid account deletion request' }
  }

  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
    return { error: 'Not authenticated' }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`delete_account_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const userEmail = (user.email ?? '').toLowerCase()
  if (!userEmail || parsed.data.confirmEmail !== userEmail) {
    return { error: 'Confirmation email does not match your account email.' }
  }

  // Re-authenticate before destructive account deletion.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: parsed.data.currentPassword,
  })
  if (reauthError) {
    return { error: 'Re-authentication failed. Check your current password and try again.' }
  }

  const adminClient = createAdminClient()

  // Delete auth user (cascades to profile via DB trigger/FK)
  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  // Sign out local session
  await supabase.auth.signOut()

  redirect('/login?deleted=1')
}

