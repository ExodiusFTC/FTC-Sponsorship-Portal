'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createInAppNotification } from '@/lib/notify'

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

  // Verify this submission belongs to this sponsor
  const { data: submission } = await supabase
    .from('submissions')
    .select('sponsor_id, team_id, teams(owner_id)')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.sponsor_id !== profile.sponsor_id) {
    return { error: 'Submission not found or unauthorized' }
  }

  const adminClient = createAdminClient()

  // Update submission status
  const { error: updateError } = await adminClient
    .from('submissions')
    .update({ 
      status, 
      admin_feedback: feedback || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id
    })
    .eq('id', submissionId)

  if (updateError) return { error: updateError.message }

  // If approved, log the transaction and update funding_used_cents
  if (status === 'approved' && fundingAmountCents) {
    await adminClient.from('transaction_ledger').insert({
      sponsor_id: profile.sponsor_id,
      team_id: submission.team_id,
      submission_id: submissionId,
      amount_cents: fundingAmountCents,
      decision_type: 'full',
      actor_type: 'sponsor'
    })

    // Increment sponsor's used budget
    await adminClient.rpc('increment_sponsor_funding', {
      sponsor_uuid: profile.sponsor_id,
      amount: fundingAmountCents
    })
  }

  // Notify the coach
  const recipientId = (submission.teams as any).owner_id
  if (recipientId) {
    await createInAppNotification({
      recipient_id: recipientId,
      type: status === 'approved' ? 'submission_approved' : status === 'declined' ? 'submission_declined' : 'submission_changes_requested',
      title: status === 'approved' ? 'Submission Approved!' : 'Update on your Submission',
      body: feedback || `Your submission has been ${status}.`,
      submission_id: submissionId
    })
  }

  revalidatePath('/sponsor/dashboard')
  revalidatePath(`/sponsor/submissions/${submissionId}`)
  revalidatePath('/dashboard') // Revalidate coach dashboard too
  
  return { success: true }
}
