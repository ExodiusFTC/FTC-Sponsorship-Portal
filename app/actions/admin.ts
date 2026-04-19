'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createInAppNotification, sendCoachVerificationEmail } from '@/lib/notify'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Forbidden' as const }
  return { user, adminClient: createAdminClient() }
}

export async function verifyCoach(coachId: string, verified: boolean) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }
  const { user, adminClient } = ctx

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
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }
  const { user, adminClient } = ctx

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
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }
  const { user, adminClient } = ctx

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
