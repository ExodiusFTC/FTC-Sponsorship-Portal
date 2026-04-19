'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchApprovedSubmission } from '@/lib/dispatch'
import { sendSubmissionDecisionEmail, createInAppNotification } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

export async function approveSubmission(submissionId: string) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Forbidden' }
  }

  const supabase = createAdminClient()

  // Atomic RPC: locks sponsor row, debits budget, writes ledger + audit_log, minits access token.
  const { data: rpcResult, error: rpcError } = await supabase.rpc('approve_submission_atomic', {
    p_submission_id: submissionId,
    p_admin_id: user.id,
    p_amount_cents: 0,
  })

  if (rpcError) return { error: rpcError.message }

  const result = rpcResult as { ok: boolean; error?: string; token?: string; amount_cents?: number }
  if (!result.ok) {
    const messages: Record<string, string> = {
      submission_not_found: 'Submission not found.',
      submission_not_pending: 'This submission is no longer pending review.',
      sponsor_not_found: 'Sponsor not found.',
      insufficient_sponsor_capacity: 'Sponsor does not have enough remaining capacity for this request.',
    }
    return { error: messages[result.error ?? ''] ?? result.error }
  }

  // Set expires_at so the sponsor has a 14-day response window
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  await supabase.from('submissions').update({ 
    expires_at: expiresAt,
    sent_at: now
  }).eq('id', submissionId)

  // Notify coach + dispatch to sponsor with their access token
  await Promise.all([
    sendSubmissionDecisionEmail(submissionId, 'approved'),
    dispatchApprovedSubmission(submissionId, result.token),
  ])

  const { data: sub } = await supabase
    .from('submissions')
    .select('id, sponsor_id, team_id, teams:team_id(owner_id), sponsors:sponsor_id(company_name)')
    .eq('id', submissionId).single()

  const coachId = (sub?.teams as any)?.owner_id
  const sponsorName = (sub?.sponsors as any)?.company_name ?? 'a sponsor'

  if (coachId) {
    await createInAppNotification({
      recipientId: coachId,
      type: 'submission_approved',
      title: `Your application to ${sponsorName} was approved`,
      submissionId,
    })
  }

  if (sub?.sponsor_id) {
    const { data: sponsorProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'sponsor')
      .eq('sponsor_id', sub.sponsor_id)

    await Promise.all(
      (sponsorProfiles || []).map((p) =>
        createInAppNotification({
          recipientId: p.id,
          type: 'general',
          title: 'New submission is ready for your decision',
          body: 'A coach submission has been approved and sent to your inbox for review.',
          submissionId,
        })
      )
    )
  }

  revalidatePath('/moderation')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function declineSubmission(submissionId: string, feedback: string) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  const supabase = createAdminClient()

  const { data: subCheck } = await supabase
    .from('submissions')
    .select('status')
    .eq('id', submissionId)
    .single()

  if (!subCheck || subCheck.status !== 'pending') {
    return { error: 'Submission is not pending review' }
  }

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'declined',
      admin_feedback: feedback,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'decline_submission',
    entity_type: 'submissions',
    entity_id: submissionId,
    metadata: { feedback },
  })

  await sendSubmissionDecisionEmail(submissionId, 'declined', feedback)

  const { data: sub } = await supabase
    .from('submissions')
    .select('team_id, teams:team_id(owner_id), sponsors:sponsor_id(company_name)')
    .eq('id', submissionId).single()

  const coachId = (sub?.teams as any)?.owner_id
  const sponsorName = (sub?.sponsors as any)?.company_name ?? 'a sponsor'

  if (coachId) {
    await createInAppNotification({
      recipientId: coachId,
      type: 'submission_declined',
      title: `Your application to ${sponsorName} was declined`,
      body: feedback,
      submissionId,
    })
  }

  revalidatePath('/moderation')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function requestEdit(submissionId: string, feedback: string) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Forbidden' }

  const supabase = createAdminClient()

  const { data: subCheck } = await supabase
    .from('submissions')
    .select('status')
    .eq('id', submissionId)
    .single()

  if (!subCheck || subCheck.status !== 'pending') {
    return { error: 'Submission is not pending review' }
  }

  const { error } = await supabase
    .from('submissions')
    .update({
      status: 'changes_requested',
      admin_feedback: feedback,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'request_edit_submission',
    entity_type: 'submissions',
    entity_id: submissionId,
    metadata: { feedback },
  })

  await sendSubmissionDecisionEmail(submissionId, 'changes_requested', feedback)

  const { data: sub } = await supabase
    .from('submissions')
    .select('team_id, teams:team_id(owner_id), sponsors:sponsor_id(company_name)')
    .eq('id', submissionId).single()

  const coachId = (sub?.teams as any)?.owner_id
  const sponsorName = (sub?.sponsors as any)?.company_name ?? 'a sponsor'

  if (coachId) {
    await createInAppNotification({
      recipientId: coachId,
      type: 'submission_changes_requested',
      title: `Changes requested for your application to ${sponsorName}`,
      body: feedback,
      submissionId,
    })
  }

  revalidatePath('/moderation')
  revalidatePath('/dashboard')

  return { success: true }
}
