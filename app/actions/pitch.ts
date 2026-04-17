'use server'

import { createClient } from '@/lib/supabase/server'
import { pitchSchema, type PitchInput } from '@/lib/schemas/pitch'
import { redirect } from 'next/navigation'
import type { PitchLineItem } from '@/lib/supabase/types'

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

function toDbLineItems(items: PitchInput['lineItems']): PitchLineItem[] {
  return items.map((item) => ({
    label: item.label,
    qty: item.qty,
    unit_cost_cents: item.unitCostCents,
    total_cents: item.totalCents,
  }))
}

export async function savePitch(
  data: PitchInput,
  status: 'draft' | 'submitted' = 'draft',
  pitchId?: string
) {
  // For drafts, allow partial data; for submissions, enforce full validation.
  if (status === 'submitted') {
    const result = pitchSchema.safeParse(data)
    if (!result.success) return { error: 'Please complete all required fields before submitting' }
  }

  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, teamId } = ctx

  const payload = {
    team_id: teamId,
    title: data.title || 'Untitled Pitch',
    summary: data.summary ?? null,
    cost_explanation: data.costExplanation ?? null,
    line_items: toDbLineItems(data.lineItems ?? []),
    financial_ask_cents: data.financialAskCents ?? 0,
    media_urls: data.mediaUrls ?? [],
    status,
  }

  if (pitchId) {
    // Block edits once moved past draft/changes_requested
    const { data: existing } = await supabase
      .from('pitches')
      .select('id, status, team_id')
      .eq('id', pitchId)
      .eq('team_id', teamId)
      .single()

    if (!existing) return { error: 'Pitch not found' }
    if (!['draft', 'changes_requested'].includes(existing.status)) {
      return { error: 'This pitch can no longer be edited.' }
    }

    const { error } = await supabase
      .from('pitches')
      .update(payload)
      .eq('id', pitchId)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('pitches')
      .insert(payload)
      .select('id')
      .single()

    if (error) return { error: error.message }
  }

  if (status === 'submitted') redirect('/dashboard')
  return { success: true }
}

export async function autoSavePitchDraft(
  data: PitchInput,
  pitchId?: string
): Promise<{ id?: string; error?: string }> {
  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, teamId } = ctx

  const payload = {
    team_id: teamId,
    title: data.title || 'Untitled Pitch',
    summary: data.summary ?? null,
    cost_explanation: data.costExplanation ?? null,
    line_items: toDbLineItems(data.lineItems ?? []),
    financial_ask_cents: data.financialAskCents ?? 0,
    media_urls: data.mediaUrls ?? [],
    status: 'draft' as const,
  }

  if (pitchId) {
    const { data: existing } = await supabase
      .from('pitches')
      .select('status, team_id')
      .eq('id', pitchId)
      .eq('team_id', teamId)
      .single()

    if (!existing) return { error: 'Pitch not found' }
    if (!['draft', 'changes_requested'].includes(existing.status)) {
      return { error: 'Cannot auto-save a non-draft pitch' }
    }

    const { error } = await supabase.from('pitches').update(payload).eq('id', pitchId)
    if (error) return { error: error.message }
    return { id: pitchId }
  }

  const { data: inserted, error } = await supabase
    .from('pitches')
    .insert(payload)
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: inserted.id }
}

export async function uploadPitchMedia(pitchId: string, formData: FormData) {
  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, user, teamId } = ctx

  const { data: existing } = await supabase
    .from('pitches')
    .select('id, media_urls, status, team_id')
    .eq('id', pitchId)
    .eq('team_id', teamId)
    .single()

  if (!existing) return { error: 'Pitch not found' }
  if (!['draft', 'changes_requested'].includes(existing.status)) {
    return { error: 'Cannot modify media on a submitted pitch' }
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return { error: 'Media must be an image (JPG, PNG, WebP, GIF)' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Media must be under 5 MB' }
  }

  const filePath = `${user.id}/${pitchId}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('pitch-media')
    .upload(filePath, file, { contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from('pitch-media').getPublicUrl(filePath)
  const newUrls = [...(existing.media_urls ?? []), urlData.publicUrl]

  const { error: updateError } = await supabase
    .from('pitches')
    .update({ media_urls: newUrls })
    .eq('id', pitchId)

  if (updateError) return { error: updateError.message }
  return { success: true, url: urlData.publicUrl, mediaUrls: newUrls }
}

export async function removePitchMedia(pitchId: string, url: string) {
  const ctx = await getCoachTeamId()
  if ('error' in ctx) return { error: ctx.error }
  const { supabase, teamId } = ctx

  const { data: existing } = await supabase
    .from('pitches')
    .select('id, media_urls, status, team_id')
    .eq('id', pitchId)
    .eq('team_id', teamId)
    .single()

  if (!existing) return { error: 'Pitch not found' }
  if (!['draft', 'changes_requested'].includes(existing.status)) {
    return { error: 'Cannot modify media on a submitted pitch' }
  }

  const newUrls = (existing.media_urls ?? []).filter((u: string) => u !== url)
  const { error } = await supabase
    .from('pitches')
    .update({ media_urls: newUrls })
    .eq('id', pitchId)

  if (error) return { error: error.message }
  return { success: true, mediaUrls: newUrls }
}
