'use server'

import { dispatchApprovedSubmission } from '@/lib/dispatch'
import { sendSubmissionDecisionEmail, createInAppNotification } from '@/lib/notify'
import { revalidatePath } from 'next/cache'
import { getClientIp, validateRateLimit, requireAdmin } from '@/lib/actions-utils'
import { z } from 'zod'

const moderationSchema = z.object({
  submissionId: z.string().uuid(),
  feedback: z.string().max(2000).optional(),
})

export async function approveSubmission(submissionId: string) {
  const parsed = moderationSchema.safeParse({ submissionId })
  if (!parsed.success) return { error: 'Invalid submission ID' }

  let user, adminClient
  try {
    const auth = await requireAdmin()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`admin_approve_sub_${user.id}_${ip}`)
  if ('error' in limit) return limit

  // Atomic RPC: locks sponsor row, debits budget, writes ledger + audit_log,
  // mints access token, and stamps sent_at / expires_at on the submission row.
  // No fallback: budget integrity must not be bypassed, so a failure surfaces
  // to the admin who can retry rather than silently overflowing capacity.
  const { data: rpcResult, error: rpcError } = await adminClient.rpc('approve_submission_atomic', {
    p_submission_id: submissionId,
    p_admin_id: user.id,
    p_amount_cents: 0,
  })

  if (rpcError) {
    console.error('approve_submission_atomic failed', rpcError)
    return { error: 'Could not approve submission right now. Please retry. If this keeps happening, contact engineering.' }
  }

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

  const finalToken = result.token

  // Notify coach + dispatch to sponsor with their access token
  try {
    await Promise.all([
      sendSubmissionDecisionEmail(submissionId, 'approved'),
      dispatchApprovedSubmission(submissionId, finalToken!),
    ])
  } catch (e) {
    console.error('Failed to send notifications/dispatch for approved submission:', e)
  }

  const { data: sub } = await adminClient
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
    const { data: sponsorProfiles } = await adminClient
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
  const parsed = moderationSchema.safeParse({ submissionId, feedback })
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
  const limit = await validateRateLimit(`admin_decline_sub_${user.id}_${ip}`)
  if ('error' in limit) return limit

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (adminClient as any).rpc('admin_terminal_decision_atomic', {
    p_submission_id: submissionId,
    p_admin_id: user.id,
    p_new_status: 'declined',
    p_feedback: feedback,
  })

  if (rpcError) return { error: (rpcError as { message: string }).message }

  const rpcResult = rpcData as { ok: boolean; error?: string }
  if (!rpcResult.ok) {
    const messages: Record<string, string> = {
      submission_not_found: 'Submission not found.',
      submission_not_pending: 'This submission is no longer pending review.',
    }
    return { error: messages[rpcResult.error ?? ''] ?? 'Could not decline submission.' }
  }

  try {
    await sendSubmissionDecisionEmail(submissionId, 'declined', feedback)
  } catch (e) {
    console.error('Failed to send decline email:', e)
  }

  const { data: sub } = await adminClient
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
  const parsed = moderationSchema.safeParse({ submissionId, feedback })
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
  const limit = await validateRateLimit(`admin_request_edit_${user.id}_${ip}`)
  if ('error' in limit) return limit

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (adminClient as any).rpc('admin_terminal_decision_atomic', {
    p_submission_id: submissionId,
    p_admin_id: user.id,
    p_new_status: 'changes_requested',
    p_feedback: feedback,
  })

  if (rpcError) return { error: (rpcError as { message: string }).message }

  const rpcResult = rpcData as { ok: boolean; error?: string }
  if (!rpcResult.ok) {
    const messages: Record<string, string> = {
      submission_not_found: 'Submission not found.',
      submission_not_pending: 'This submission is no longer pending review.',
    }
    return { error: messages[rpcResult.error ?? ''] ?? 'Could not request edits.' }
  }

  try {
    await sendSubmissionDecisionEmail(submissionId, 'changes_requested', feedback)
  } catch (e) {
    console.error('Failed to send request-edit email:', e)
  }

  const { data: sub } = await adminClient
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

