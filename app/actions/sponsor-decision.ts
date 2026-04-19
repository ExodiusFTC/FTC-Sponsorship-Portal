'use server'

import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createInAppNotification, sendHandshakeEmail, sendSubmissionDecisionEmail } from '@/lib/notify'

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

function normalizeFeedback(feedback?: string) {
  const trimmed = feedback?.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, 2000)
}

export async function sponsorUpdateSubmissionStatus(
  submissionId: string,
  status: 'approved' | 'declined' | 'changes_requested',
  feedback?: string,
  fundingAmountCents?: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, sponsor_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'sponsor' || !profile.sponsor_id) {
    return { error: 'Forbidden: Sponsor access required' }
  }

  const normalizedFeedback = normalizeFeedback(feedback)
  const amountCents = status === 'approved' ? Math.max(0, Math.floor(fundingAmountCents ?? 0)) : 0

  const adminClient = createAdminClient()
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

  if (submissionId && decision !== 'decline') {
    const approvedAmount = result.amount_cents ?? partialAmount
    await Promise.all([
      sendHandshakeEmail(submissionId, approvedAmount),
      sendSubmissionDecisionEmail(submissionId, 'approved'),
    ])
  } else if (submissionId) {
    await sendSubmissionDecisionEmail(submissionId, 'declined')
  }

  revalidatePath('/dashboard')
  revalidatePath('/sponsor/inbox')
  return { ok: true }
}
