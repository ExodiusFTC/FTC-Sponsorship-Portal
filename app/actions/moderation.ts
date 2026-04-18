'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchApprovedPitch } from '@/lib/dispatch'
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

  // 1. Update submission status
  const { error: subError } = await supabase
    .from('submissions')
    .update({ 
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (subError) return { error: subError.message }

  // 2. Audit Log
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'approve_submission',
    entity_type: 'submissions',
    entity_id: submissionId,
  })

  // 3. Notify coach + dispatch to sponsor
  await Promise.all([
    sendSubmissionDecisionEmail(submissionId, 'approved'),
    dispatchApprovedSubmission(submissionId),
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
