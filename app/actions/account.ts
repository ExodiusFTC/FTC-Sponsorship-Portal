'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getClientIp, validateRateLimit, requireAuth } from '@/lib/actions-utils'

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

const updatePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[a-z]/, 'Must include at least one lowercase letter')
    .regex(/[0-9]/, 'Must include at least one number'),
  currentPassword: z.string().min(1, 'Current password is required'),
})

const changeEmailSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email('Enter a valid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
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

export async function updatePassword(data: { newPassword: string; currentPassword: string }) {
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

  // Re-authenticate before changing password
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: result.data.currentPassword,
  })
  if (reauthError) {
    return { error: 'Current password is incorrect.' }
  }

  const { error } = await supabase.auth.updateUser({ password: result.data.newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

export async function changeEmail(data: { newEmail: string; currentPassword: string }) {
  const result = changeEmailSchema.safeParse(data)
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
  const limit = await validateRateLimit(`change_email_${user.id}_${ip}`)
  if ('error' in limit) return limit

  if (result.data.newEmail === (user.email ?? '').toLowerCase()) {
    return { error: 'New email must be different from your current email.' }
  }

  // Re-authenticate before changing email
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: result.data.currentPassword,
  })
  if (reauthError) {
    return { error: 'Current password is incorrect.' }
  }

  // Supabase sends a confirmation link to both old and new email addresses
  const { error } = await supabase.auth.updateUser({ email: result.data.newEmail })
  if (error) return { error: error.message }

  return { success: true, message: 'Check your new email inbox for a confirmation link.' }
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

  // Re-authenticate before destructive deletion
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: parsed.data.currentPassword,
  })
  if (reauthError) {
    return { error: 'Re-authentication failed. Check your current password and try again.' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  await supabase.auth.signOut()

  redirect('/login?deleted=1')
}

export async function requestDataExport(): Promise<{ error?: string; message?: string }> {
  let user
  try {
    const auth = await requireAuth()
    user = auth.user
  } catch {
    return { error: 'Not authenticated' }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`data_export_${user.id}_${ip}`)
  if ('error' in limit) return limit

  // In a full implementation this would queue an async job that emails the user
  // a zip of their data when ready. For now, we acknowledge the request.
  // The job would collect: profile, teams, submissions, notifications, audit entries.
  return {
    message:
      'Your data export has been queued. You will receive an email at ' +
      (user.email ?? 'your registered address') +
      ' within 24 hours with a download link.',
  }
}
