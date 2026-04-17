'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { dispatchApprovedPitch } from '@/lib/dispatch'
import { sendPitchDecisionEmail } from '@/lib/notify'

export async function approvePitch(pitchId: string) {
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

  // 1. Update pitch status
  const { error: pitchError } = await supabase
    .from('pitches')
    .update({ 
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', pitchId)

  if (pitchError) return { error: pitchError.message }

  // 2. Audit Log
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'approve_pitch',
    entity_type: 'pitches',
    entity_id: pitchId,
  })

  // 3. Notify coach + dispatch to sponsors
  await Promise.all([
    sendPitchDecisionEmail(pitchId, 'approved'),
    dispatchApprovedPitch(pitchId),
  ])

  return { success: true }
}

export async function rejectPitch(pitchId: string, feedback: string) {
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
    .from('pitches')
    .update({ 
      status: 'rejected',
      admin_feedback: feedback,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', pitchId)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'reject_pitch',
    entity_type: 'pitches',
    entity_id: pitchId,
    metadata: { feedback },
  })

  await sendPitchDecisionEmail(pitchId, 'rejected', feedback)

  return { success: true }
}

export async function requestEdit(pitchId: string, feedback: string) {
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
    .from('pitches')
    .update({ 
      status: 'changes_requested',
      admin_feedback: feedback,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', pitchId)

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'request_edit_pitch',
    entity_type: 'pitches',
    entity_id: pitchId,
    metadata: { feedback },
  })

  await sendPitchDecisionEmail(pitchId, 'changes_requested', feedback)

  return { success: true }
}
