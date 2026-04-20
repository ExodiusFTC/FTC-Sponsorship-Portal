'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { submissionSchema, type SubmissionInput } from '@/lib/schemas/submission'
import { redirect } from 'next/navigation'
import { getClientIp, validateRateLimit, requireAuth } from '@/lib/actions-utils'

const EDITABLE_SUBMISSION_STATUSES = ['draft', 'declined', 'changes_requested'] as const

function getCurrentSeasonLabel(now = new Date()) {
  const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0')
  return `${startYear}-${endYearShort}`
}

async function getCoachTeamId() {
  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
    return { error: 'Not authenticated' as const }
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!team) return { error: 'Team not found. Complete onboarding first.' as const }
  return { supabase, user, teamId: team.id }
}

export async function saveSubmission(
  data: SubmissionInput,
  status: 'draft' | 'pending' = 'draft',
  submissionId?: string,
  variantLabel = 'default'
) {
  if (status === 'pending') {
    const result = submissionSchema.safeParse(data)
    if (!result.success) return { error: 'Please complete all required fields before submitting' }
  }

  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, user, teamId } = ctx

  const ip = await getClientIp()
  const limit = await validateRateLimit(`save_sub_${user.id}_${ip}`)
  if ('error' in limit) return limit

  // Spec: max 3 pending submissions per rolling 7-day window
  if (status === 'pending') {
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if ((count ?? 0) >= 3) {
      return { error: 'rate_limited', message: 'You may submit at most 3 proposals per 7-day window. Please wait for existing submissions to be reviewed.' }
    }
  }

  const season = getCurrentSeasonLabel()
  const financialAsk = (await supabase.from('teams').select('financial_ask_cents').eq('id', teamId).single()).data?.financial_ask_cents ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    team_id: teamId,
    sponsor_id: data.sponsorId,
    custom_pitch_alignment: data.customPitchAlignment ?? null,
    specific_needs_statement: data.specificNeedsStatement ?? null,
    local_connection_notes: data.localConnectionNotes ?? null,
    status,
    variant_label: variantLabel,
    season,
    submitted_at: status === 'pending' ? new Date().toISOString() : null,
    requested_amount_cents: financialAsk
  }

  if (submissionId) {
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, status, team_id')
      .eq('id', submissionId)
      .eq('team_id', teamId)
      .single()

    if (!existing) return { error: 'Submission not found' }
    if (!EDITABLE_SUBMISSION_STATUSES.includes(existing.status as typeof EDITABLE_SUBMISSION_STATUSES[number])) {
      return { error: 'This submission can no longer be edited.' }
    }

    const { error } = await supabase
      .from('submissions')
      .update(payload)
      .eq('id', submissionId)

    if (error) return { error: error.message }
  } else {
    // Check if an active submission already exists for this team/sponsor combo
    const { data: existingTarget } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('sponsor_id', data.sponsorId)
      .eq('season', season)
      .not('status', 'in', '("declined","expired","bounced")')
      .maybeSingle()

    if (existingTarget) {
      return { error: 'An active submission for this sponsor already exists in the current season.' }
    }

    const { data: inserted, error } = await supabase
      .from('submissions')
      .insert(payload)
      .select('id')
      .single()

    if (error) return { error: error.message }
    submissionId = inserted.id
  }

  // Audit log for draft→pending transition (material state change)
  if (status === 'pending') {
    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      actor_id: user.id,
      action: 'submit_submission',
      entity_type: 'submissions',
      entity_id: submissionId ?? null,
      metadata: { sponsor_id: data.sponsorId },
    })
    redirect('/dashboard')
  }
  return { success: true }
}

export async function autoSaveSubmissionDraft(
  data: Partial<SubmissionInput>,
  submissionId?: string
): Promise<{ id?: string; error?: string }> {
  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, user, teamId } = ctx

  const ip = await getClientIp()
  const limit = await validateRateLimit(`autosave_sub_${user.id}_${ip}`)
  if ('error' in limit) return limit

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
    season: getCurrentSeasonLabel(),
    requested_amount_cents: (await supabase.from('teams').select('financial_ask_cents').eq('id', teamId).single()).data?.financial_ask_cents ?? 0
  }

  if (submissionId) {
    const { data: existing } = await supabase
      .from('submissions')
      .select('status, team_id')
      .eq('id', submissionId)
      .eq('team_id', teamId)
      .single()

    if (!existing) return { error: 'Submission not found' }
    if (!EDITABLE_SUBMISSION_STATUSES.includes(existing.status as typeof EDITABLE_SUBMISSION_STATUSES[number])) {
      return { error: 'Cannot auto-save a non-draft submission' }
    }

    const { error } = await supabase.from('submissions').update(payload).eq('id', submissionId)
    if (error) return { error: error.message }
    return { id: submissionId }
  }

  // Attempt to update by team_id and sponsor_id if no ID is passed, to avoid duplicates
  const { data: existingTarget } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('team_id', teamId)
    .eq('sponsor_id', data.sponsorId)
    .eq('season', payload.season)
    .not('status', 'in', '("declined","expired","bounced")')
    .maybeSingle()

  if (existingTarget) {
    // If it's not a draft, we shouldn't overwrite it with auto-save
    if (!EDITABLE_SUBMISSION_STATUSES.includes(existingTarget.status as any)) {
      return { error: 'An active submission for this sponsor is already in progress and locked.' }
    }
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

/** Clone an existing draft to a new variant label (Application V2 versioning). */
export async function cloneSubmission(
  submissionId: string,
  newVariantLabel: string
): Promise<{ id?: string; error?: string }> {
  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, user, teamId } = ctx

  const ip = await getClientIp()
  const limit = await validateRateLimit(`clone_sub_${user.id}_${ip}`)
  if ('error' in limit) return limit

  const { data: source } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('team_id', teamId)
    .single()

  if (!source) return { error: 'Submission not found' }
  if (source.status !== 'draft') return { error: 'Only draft submissions can be cloned' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clonePayload: any = {
    team_id: teamId,
    sponsor_id: source.sponsor_id,
    custom_pitch_alignment: source.custom_pitch_alignment,
    specific_needs_statement: source.specific_needs_statement,
    local_connection_notes: source.local_connection_notes,
    status: 'draft',
    variant_label: newVariantLabel,
    season: source.season || getCurrentSeasonLabel(),
    requested_amount_cents: source.requested_amount_cents || (await supabase.from('teams').select('financial_ask_cents').eq('id', teamId).single()).data?.financial_ask_cents || 0
  }

  const { data: inserted, error } = await supabase
    .from('submissions')
    .insert(clonePayload)
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: inserted.id }
}

