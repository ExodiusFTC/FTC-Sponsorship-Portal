'use server'

import { createClient } from '@/lib/supabase/server'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { achievementSchema, type AchievementInput } from '@/lib/schemas/achievement'
import { validateFTCTeam, type FTCTeam } from '@/lib/ftc-roster'
import { redirect } from 'next/navigation'

export async function lookupFTCTeam(
  teamNumber: number
): Promise<{ team: FTCTeam; error?: never } | { team?: never; error: string }> {
  if (!teamNumber || teamNumber <= 0) {
    return { error: 'Invalid team number' }
  }
  const team = await validateFTCTeam(teamNumber)
  if (!team) {
    return { error: `FTC Team #${teamNumber} could not be found in the FIRST registry.` }
  }
  return { team }
}

export async function createTeam(data: TeamOnboardingInput) {
  const result = teamOnboardingSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided', details: result.error.format() }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const {
    status,
    ftcTeamNumber,
    teamName,
    organization,
    city,
    state,
    missionStatement,
    taxStatus,
    communityInterestText,
    seedFundingGoalsCents,
    technicalSummary,
    outreachSummary,
    mediaUrls,
    youtubeUrl,
    budgetItems,
    financialAskCents,
  } = result.data

  if (status === 'existing' && ftcTeamNumber) {
    const ftcData = await validateFTCTeam(ftcTeamNumber)
    if (!ftcData) {
      return { error: `FTC Team #${ftcTeamNumber} could not be found in the FIRST registry.` }
    }
  }

  const { error } = await supabase
    .from('teams')
    .insert({
      owner_id: user.id,
      status,
      ftc_team_number: ftcTeamNumber,
      team_name: teamName,
      organization,
      city,
      state,
      mission_statement: missionStatement,
      tax_status: taxStatus as any,
      community_interest_text: communityInterestText ?? null,
      seed_funding_goals_cents: seedFundingGoalsCents ?? 0,
      technical_summary: technicalSummary,
      outreach_summary: outreachSummary,
      media_urls: mediaUrls || [],
      youtube_url: youtubeUrl,
      budget_items: (budgetItems || []).map(item => ({
        label: item.label,
        qty: item.qty,
        unit_cost_cents: item.unitCostCents,
        total_cents: item.totalCents
      })),
      financial_ask_cents: financialAskCents ?? 0,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function uploadTeamLogo(teamId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return { error: 'Logo must be a JPG, PNG, or WebP image' }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'Logo must be under 2 MB' }
  }

  const filePath = `${user.id}/${teamId}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('team-logos')
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from('team-logos').getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from('teams')
    .update({ logo_url: urlData.publicUrl })
    .eq('id', teamId)
    .eq('owner_id', user.id)

  if (updateError) return { error: updateError.message }

  return { success: true, url: urlData.publicUrl }
}

export async function updateTeam(id: string, data: Partial<TeamOnboardingInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('teams')
    .update({
      team_name: data.teamName,
      organization: data.organization,
      city: data.city,
      state: data.state,
      mission_statement: data.missionStatement,
      tax_status: data.taxStatus as any,
      technical_summary: data.technicalSummary,
      outreach_summary: data.outreachSummary,
      media_urls: data.mediaUrls,
      youtube_url: data.youtubeUrl,
      budget_items: (data.budgetItems || []).map(item => ({
        label: item.label,
        qty: item.qty,
        unit_cost_cents: item.unitCostCents,
        total_cents: item.totalCents
      })),
      financial_ask_cents: data.financialAskCents,
    })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function addAchievement(teamId: string, data: AchievementInput) {
  const result = achievementSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('owner_id', user.id)
    .single()

  if (!team) {
    return { error: 'Team not found or not owned by you' }
  }

  const { error } = await supabase
    .from('team_achievements')
    .insert({
      team_id: teamId,
      season: result.data.season,
      event_name: result.data.eventName,
      award: result.data.award,
      description: result.data.description,
    })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
