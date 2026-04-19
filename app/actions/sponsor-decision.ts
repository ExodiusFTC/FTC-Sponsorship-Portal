'use server'

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createInAppNotification, sendHandshakeEmail, sendSubmissionDecisionEmail } from '@/lib/notify'
import { getClientIp, validateRateLimit, requireSponsor } from '@/lib/actions-utils'
import { z } from 'zod'

const sponsorUpdateSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(['approved', 'declined', 'changes_requested']),
  feedback: z.string().max(2000).optional(),
  fundingAmountCents: z.number().int().min(0).optional(),
})

const recordDecisionSchema = z.object({
  token: z.string().min(1),
  decision: z.enum(['decline', 'full', 'partial']),
  amountCents: z.number().int().min(0).optional(),
})

function mapDecisionError(code: string | undefined) {
  const messages: Record<string, string> = {
    invalid_token: 'Invalid or expired decision link.',
    token_expired: 'This decision link has expired.',
    token_used: 'A decision has already been recorded for this link.',
    insufficient_capacity: 'Not enough sponsor budget remains for this amount.',
    unauthorized: 'Unauthorized sponsor account.',
    submission_not_found: 'Submission not found.',
    invalid_status: 'This submission can no longer be updated.',
    amount_required: 'A valid funding amount is required.',
    already_decided: 'A sponsor decision has already been recorded for this submission.',
  }
  return messages[code ?? ''] ?? 'Unable to record decision.'
}

export async function sponsorUpdateSubmissionStatus(
  submissionId: string,
  status: 'approved' | 'declined' | 'changes_requested',
  feedback?: string,
  fundingAmountCents?: number
) {
  const parsed = sponsorUpdateSchema.safeParse({ submissionId, status, feedback, fundingAmountCents })
  if (!parsed.success) return { error: 'Invalid data provided' }

  let user, adminClient
  try {
    const auth = await requireSponsor()
    user = auth.user
    adminClient = auth.adminClient
  } catch (e: any) {
    return { error: e.message }
  }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`sponsor_update_sub_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const normalizedFeedback = feedback?.trim() || undefined
  const amountCents = status === 'approved' ? Math.max(0, Math.floor(fundingAmountCents ?? 0)) : 0

  const { data: rpcResult, error: rpcError } = await adminClient.rpc('sponsor_decide_submission_atomic', {
    p_submission_id: submissionId,
    p_sponsor_user_id: user.id,
    p_decision: status,
    p_feedback: normalizedFeedback,
    p_amount_cents: amountCents,
  })

  if (rpcError) return { error: rpcError.message }

  const result = rpcResult as { ok: boolean; error?: string; amount_cents?: number }
  if (!result?.ok) {
    return { error: mapDecisionError(result?.error) }
  }

  const { data: submission } = await adminClient
    .from('submissions')
    .select('id, teams:team_id(owner_id), sponsors:sponsor_id(company_name)')
    .eq('id', submissionId)
    .single()

  const recipientId = (submission?.teams as { owner_id?: string } | null)?.owner_id
  const sponsorName = (submission?.sponsors as { company_name?: string } | null)?.company_name ?? 'your sponsor'

  if (recipientId) {
    await createInAppNotification({
      recipientId,
      type: status === 'approved' ? 'submission_approved' : status === 'declined' ? 'submission_declined' : 'submission_changes_requested',
      title: status === 'approved' ? `${sponsorName} approved your submission` : status === 'declined' ? `${sponsorName} declined your submission` : `${sponsorName} requested changes`,
      body: normalizedFeedback,
      submissionId,
    })
  }

  try {
    if (status === 'approved') {
      const approvedAmount = result.amount_cents ?? amountCents
      await Promise.all([
        sendHandshakeEmail(submissionId, approvedAmount),
        sendSubmissionDecisionEmail(submissionId, 'approved', normalizedFeedback),
      ])
    } else if (status === 'declined') {
      await sendSubmissionDecisionEmail(submissionId, 'declined', normalizedFeedback)
    } else {
      await sendSubmissionDecisionEmail(submissionId, 'changes_requested', normalizedFeedback)
    }
  } catch (e) {
    console.error('Failed to send sponsor decision emails:', e)
  }

  revalidatePath('/sponsor/dashboard')
  revalidatePath(`/sponsor/submissions/${submissionId}`)
  revalidatePath('/sponsor/inbox')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function recordSponsorDecision(
  token: string,
  decision: 'decline' | 'full' | 'partial',
  amountCents?: number
) {
  const parsed = recordDecisionSchema.safeParse({ token, decision, amountCents })
  if (!parsed.success) return { ok: false, error: 'Invalid data provided' }

  const ip = await getClientIp()
  const limit = await validateRateLimit(`record_sponsor_decision_${ip}`)
  if ('error' in limit) return { ok: false, error: 'Too many requests. Please try again later.' }

  const adminClient = createAdminClient()
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: context } = await adminClient
    .from('submission_access_tokens')
    .select('submission_id, submissions:submission_id(id, teams:team_id(owner_id), sponsors:sponsor_id(company_name))')
    .eq('token_hash', tokenHash)
    .single()

  const partialAmount = decision === 'partial' ? Math.max(0, Math.floor(amountCents ?? 0)) : 0
  const { data: rpcResult, error } = await adminClient.rpc('record_sponsor_decision_atomic', {
    p_token_hash: tokenHash,
    p_decision: decision,
    p_partial_amount_cents: partialAmount,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const result = rpcResult as { ok: boolean; error?: string; amount_cents?: number }
  if (!result?.ok) {
    return { ok: false, error: mapDecisionError(result?.error) }
  }

  const submissionId = context?.submission_id
  const recipientId = (context?.submissions as { teams?: { owner_id?: string } } | null)?.teams?.owner_id
  const sponsorName = (context?.submissions as { sponsors?: { company_name?: string } } | null)?.sponsors?.company_name ?? 'your sponsor'

  if (recipientId && submissionId) {
    const statusType = decision === 'decline' ? 'submission_declined' : 'submission_approved'
    const statusTitle = decision === 'decline'
      ? `${sponsorName} declined your submission`
      : `${sponsorName} approved your submission`

    await createInAppNotification({
      recipientId,
      type: statusType,
      title: statusTitle,
      submissionId,
    })
  }

  try {
    if (submissionId && decision !== 'decline') {
      const approvedAmount = result.amount_cents ?? partialAmount
      await Promise.all([
        sendHandshakeEmail(submissionId, approvedAmount),
        sendSubmissionDecisionEmail(submissionId, 'approved'),
      ])
    } else if (submissionId) {
      await sendSubmissionDecisionEmail(submissionId, 'declined')
    }
  } catch (e) {
    console.error('Failed to send record decision emails:', e)
  }

  revalidatePath('/dashboard')
  revalidatePath('/sponsor/inbox')
  return { ok: true }
}

