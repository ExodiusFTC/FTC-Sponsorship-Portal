'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getClientIp, validateRateLimit, requireAuth } from '@/lib/actions-utils'
import { env } from '@/lib/env'

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

  if (!user.email) {
    return { error: 'No email address is associated with your account.' }
  }

  // Collect every record we hold for this user. (COPPA: the schema contains zero
  // student PII, so this is the user's own coach/sponsor data only.)
  const admin = createAdminClient()
  const [profileRes, teamsRes, notificationsRes, auditRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    admin.from('teams').select('*').eq('owner_id', user.id),
    admin.from('notifications').select('*').eq('recipient_id', user.id),
    admin.from('audit_log').select('*').eq('actor_id', user.id),
  ])

  const teamIds = (teamsRes.data ?? []).map((t) => t.id)
  let submissions: unknown[] = []
  if (teamIds.length > 0) {
    const subRes = await admin.from('submissions').select('*').in('team_id', teamIds)
    submissions = subRes.data ?? []
  }

  const exportPayload = {
    generated_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profileRes.data ?? null,
    teams: teamsRes.data ?? [],
    submissions,
    notifications: notificationsRes.data ?? [],
    audit_log: auditRes.data ?? [],
  }
  const json = JSON.stringify(exportPayload, null, 2)

  // Email the export to the requester's own verified address. This is a self-service
  // transactional email (not sponsor-facing), so it is not subject to the admin dispatch gate.
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(env.RESEND_API_KEY)
    const { error: sendError } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: 'Your FTC Sponsorship Portal data export',
      text:
        'Attached is a JSON export of the data we hold for your account, including your ' +
        'profile, team portfolio, submissions, notifications, and activity log. ' +
        'If you did not request this export, please contact support.',
      attachments: [
        {
          filename: `ftc-portal-data-export-${new Date().toISOString().slice(0, 10)}.json`,
          content: Buffer.from(json).toString('base64'),
        },
      ],
    })
    if (sendError) {
      console.error('[data-export] Resend returned an error', sendError)
      return { error: 'We could not send your export right now. Please try again later.' }
    }
  } catch (e) {
    console.error('[data-export] send failed', e)
    return { error: 'We could not send your export right now. Please try again later.' }
  }

  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'data_export',
    entity_type: 'profiles',
    entity_id: user.id,
    metadata: { delivered_to: user.email },
  })

  return { message: `Your data export has been emailed to ${user.email}.` }
}
