'use server'

import { revalidatePath } from 'next/cache'
import { createInAppNotification, sendCoachVerificationEmail } from '@/lib/notify'
import { getClientIp, validateRateLimit, requireAdmin } from '@/lib/actions-utils'
import { z } from 'zod'

const verifyCoachSchema = z.object({
  coachId: z.string().uuid(),
  verified: z.boolean(),
})

const applicationActionSchema = z.object({
  applicationId: z.string().uuid(),
})

export async function verifyCoach(coachId: string, verified: boolean) {
  const parsed = verifyCoachSchema.safeParse({ coachId, verified })
  if (!parsed.success) return { error: 'Invalid data' }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_verify_coach_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { error } = await adminClient
    .from('profiles')
    .update({ coach_verified: verified })
    .eq('id', coachId)

  if (error) return { error: error.message }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: verified ? 'verify_coach' : 'unverify_coach',
    entity_type: 'profiles',
    entity_id: coachId,
  })

  if (verified) {
    // Fetch coach profile for name
    const { data: coachProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', coachId)
      .single()

    const coachName = coachProfile?.full_name ?? 'Coach'

    await Promise.all([
      createInAppNotification({
        recipientId: coachId,
        type: 'coach_verified',
        title: 'Your account has been verified!',
        body: 'You can now create your team portfolio and submit sponsorship applications.',
      }),
      sendCoachVerificationEmail(coachId, coachName),
    ])
  }

  revalidatePath('/coaches')
  revalidatePath('/analytics')
  revalidatePath('/admin')
  return { success: true }
}

export async function approveSponsorApplication(applicationId: string) {
  const parsed = applicationActionSchema.safeParse({ applicationId })
  if (!parsed.success) return { error: 'Invalid application ID' }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_approve_app_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { data: app, error: fetchError } = await adminClient
    .from('sponsor_applications')
    .select('company_name, contact_name, contact_email, proposed_cap_cents, message')
    .eq('id', applicationId)
    .single()

  if (fetchError || !app) return { error: 'Application not found' }

  // Create the sponsor record
  const { error: insertError } = await adminClient.from('sponsors').insert({
    company_name: app.company_name,
    contact_name: app.contact_name,
    contact_email: app.contact_email,
    funding_cap_cents: app.proposed_cap_cents ?? 0,
    status: 'active',
    source: 'public_optin' as const,
    notes: app.message ?? null,
  })

  if (insertError) return { error: insertError.message }

  // Mark application as approved
  await adminClient
    .from('sponsor_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: 'approve_sponsor_application',
    entity_type: 'sponsor_applications',
    entity_id: applicationId,
  })

  revalidatePath('/applications')
  revalidatePath('/sponsors')
  return { success: true }
}

export async function rejectSponsorApplication(applicationId: string) {
  const parsed = applicationActionSchema.safeParse({ applicationId })
  if (!parsed.success) return { error: 'Invalid application ID' }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_reject_app_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { error } = await adminClient
    .from('sponsor_applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId)

  if (error) return { error: error.message }

  await adminClient.from('audit_log').insert({
    actor_id: user.id,
    action: 'reject_sponsor_application',
    entity_type: 'sponsor_applications',
    entity_id: applicationId,
  })

  revalidatePath('/applications')
  return { success: true }
}

