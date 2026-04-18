'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchApprovedSubmission } from '@/lib/dispatch'
import { sendSubmissionDecisionEmail } from '@/lib/notify'

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

  // Atomic RPC: locks sponsor row, debits budget, writes ledger + audit_log, mints access token.
  // Cast via unknown because the generated types don't include the new RPC yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcResult, error: rpcError } = await (supabase as unknown as any)
    .rpc('approve_submission_atomic', {
      p_submission_id: submissionId,
      p_admin_id: user.id,
      p_amount_cents: 0,
    })

  if (rpcError) return { error: rpcError.message }

  const result = (rpcResult as unknown) as { ok: boolean; error?: string; token?: string; amount_cents?: number }
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
  await supabase.from('submissions').update({ expires_at: expiresAt } as never).eq('id', submissionId)

  // Notify coach + dispatch to sponsor with their access token
  await Promise.all([
    sendSubmissionDecisionEmail(submissionId, 'approved'),
    dispatchApprovedSubmission(submissionId, result.token),
  ])

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

  return { success: true }
}
