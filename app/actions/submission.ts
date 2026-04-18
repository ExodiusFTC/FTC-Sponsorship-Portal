'use server'

import { createClient } from '@/lib/supabase/server'
import { submissionSchema, type SubmissionInput } from '@/lib/schemas/submission'
import { redirect } from 'next/navigation'
import { checkActionLimit } from '@/lib/rate-limit'

async function getCoachTeamId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!team) return { error: 'Team not found. Complete onboarding first.' as const }
  return { supabase, user, teamId: team.id }
}

export async function saveSubmission(
  data: SubmissionInput,
  status: 'draft' | 'pending' = 'draft',
  submissionId?: string
) {
  if (status === 'pending') {
    const limit = await checkActionLimit('submit_pitch')
    if (!limit.ok) return { error: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds, limit: limit.limit }

    const result = submissionSchema.safeParse(data)
    if (!result.success) return { error: 'Please complete all required fields before submitting' }
  }

  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, teamId } = ctx

  const payload = {
    team_id: teamId,
    sponsor_id: data.sponsorId,
    custom_pitch_alignment: data.customPitchAlignment ?? null,
    specific_needs_statement: data.specificNeedsStatement ?? null,
    local_connection_notes: data.localConnectionNotes ?? null,
    status,
  }

  if (submissionId) {
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, status, team_id')
      .eq('id', submissionId)
      .eq('team_id', teamId)
      .single()

    if (!existing) return { error: 'Submission not found' }
    if (!['draft', 'declined'].includes(existing.status)) {
      return { error: 'This submission can no longer be edited.' }
    }

    const { error } = await supabase
      .from('submissions')
      .update(payload)
      .eq('id', submissionId)

    if (error) return { error: error.message }
  } else {
    // Check if one already exists for this team/sponsor combo
    const { data: existingTarget } = await supabase
      .from('submissions')
      .select('id')
      .eq('team_id', teamId)
      .eq('sponsor_id', data.sponsorId)
      .single()

    if (existingTarget) {
      return { error: 'A submission for this sponsor already exists.' }
    }

    const { error } = await supabase
      .from('submissions')
      .insert(payload)

    if (error) return { error: error.message }
  }

  if (status === 'pending') redirect('/dashboard')
  return { success: true }
}

export async function autoSaveSubmissionDraft(
  data: Partial<SubmissionInput>,
  submissionId?: string
): Promise<{ id?: string; error?: string }> {
  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, teamId } = ctx

  if (!data.sponsorId) {
    return { error: 'Sponsor ID is required to autosave' }
  }

  const payload = {
    team_id: teamId,
    sponsor_id: data.sponsorId,
    custom_pitch_alignment: data.customPitchAlignment ?? null,
    specific_needs_statement: data.specificNeedsStatement ?? null,
    local_connection_notes: data.localConnectionNotes ?? null,
    status: 'draft' as const,
  }

  if (submissionId) {
    const { data: existing } = await supabase
      .from('submissions')
      .select('status, team_id')
      .eq('id', submissionId)
      .eq('team_id', teamId)
      .single()

    if (!existing) return { error: 'Submission not found' }
    if (!['draft', 'declined'].includes(existing.status)) {
      return { error: 'Cannot auto-save a non-draft submission' }
    }

    const { error } = await supabase.from('submissions').update(payload).eq('id', submissionId)
    if (error) return { error: error.message }
    return { id: submissionId }
  }

  // Attempt to update by team_id and sponsor_id if no ID is passed, to avoid duplicates
  const { data: existingTarget } = await supabase
    .from('submissions')
    .select('id')
    .eq('team_id', teamId)
    .eq('sponsor_id', data.sponsorId)
    .single()

  if (existingTarget) {
    const { error } = await supabase.from('submissions').update(payload).eq('id', existingTarget.id)
    if (error) return { error: error.message }
    return { id: existingTarget.id }
  }

  const { data: inserted, error } = await supabase
    .from('submissions')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: inserted.id }
}
