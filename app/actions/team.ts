'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    tagline,
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
    drivetrain,
    buildSystem,
    programming,
    cadSoftware,
    controlSystem,
    sensors,
    githubLink,
    autonomousDescription,
    proudestMechanismName,
    proudestMechanismProblem,
    proudestMechanismSolution,
    subteamBreakdown,
    manufacturingCapabilities,
    visualPitchItems,
  } = result.data

  if (status === 'existing' && ftcTeamNumber) {
    const ftcData = await validateFTCTeam(ftcTeamNumber)
    if (!ftcData) {
      return { error: `FTC Team #${ftcTeamNumber} could not be found in the FIRST registry.` }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: any = {
    owner_id: user.id,
    status,
    ftc_team_number: ftcTeamNumber,
    team_name: teamName,
    organization,
    city,
    state,
    tagline: tagline ?? null,
    mission_statement: missionStatement,
    tax_status: taxStatus,
    community_interest_text: communityInterestText ?? null,
    seed_funding_goals_cents: seedFundingGoalsCents ?? 0,
    technical_summary: technicalSummary,
    outreach_summary: outreachSummary,
    drivetrain: drivetrain ?? null,
    build_system: buildSystem ?? null,
    programming: programming ?? null,
    media_urls: mediaUrls || [],
    youtube_url: youtubeUrl,
    budget_items: (budgetItems || []).map(item => ({
      label: item.label,
      qty: item.qty,
      unit_cost_cents: item.unitCostCents,
      total_cents: item.totalCents
    })),
    financial_ask_cents: financialAskCents ?? 0,
    cad_software: cadSoftware ?? null,
    control_system: controlSystem ?? null,
    sensors: sensors ?? [],
    github_link: githubLink ?? null,
    autonomous_description: autonomousDescription ?? null,
    proudest_mechanism_name: proudestMechanismName ?? null,
    proudest_mechanism_problem: proudestMechanismProblem ?? null,
    proudest_mechanism_solution: proudestMechanismSolution ?? null,
    subteam_breakdown: subteamBreakdown ?? null,
    manufacturing_capabilities: manufacturingCapabilities ?? [],
    visual_pitch_items: visualPitchItems ?? [],
  }

  const { data: team, error } = await supabase
    .from('teams')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Audit log — coach create is a material event admins should see
  const admin = createAdminClient()
  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'create_team',
    entity_type: 'teams',
    entity_id: team.id,
    metadata: { team_name: teamName, status },
  })

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = {
    team_name: data.teamName,
    organization: data.organization,
    city: data.city,
    state: data.state,
    tagline: data.tagline ?? null,
    mission_statement: data.missionStatement,
    tax_status: data.taxStatus,
    technical_summary: data.technicalSummary,
    outreach_summary: data.outreachSummary,
    drivetrain: data.drivetrain ?? null,
    build_system: data.buildSystem ?? null,
    programming: data.programming ?? null,
    media_urls: data.mediaUrls,
    youtube_url: data.youtubeUrl,
    budget_items: (data.budgetItems || []).map(item => ({
      label: item.label,
      qty: item.qty,
      unit_cost_cents: item.unitCostCents,
      total_cents: item.totalCents
    })),
    financial_ask_cents: data.financialAskCents,
    cad_software: data.cadSoftware,
    control_system: data.controlSystem,
    sensors: typeof data.sensors === 'string'
      ? data.sensors.split(',').map(s => s.trim()).filter(Boolean)
      : (data.sensors ?? []),
    github_link: data.githubLink,
    autonomous_description: data.autonomousDescription,
    proudest_mechanism_name: data.proudestMechanismName,
    proudest_mechanism_problem: data.proudestMechanismProblem,
    proudest_mechanism_solution: data.proudestMechanismSolution,
    subteam_breakdown: data.subteamBreakdown,
    manufacturing_capabilities: typeof data.manufacturingCapabilities === 'string'
      ? data.manufacturingCapabilities.split(',').map(s => s.trim()).filter(Boolean)
      : (data.manufacturingCapabilities ?? []),
    visual_pitch_items: data.visualPitchItems,
  }

  const { error } = await supabase
    .from('teams')
    .update(updatePayload)
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Handle achievements sync
  if (data.achievements) {
    // Simple sync: delete existing and insert new
    await supabase.from('team_achievements').delete().eq('team_id', id)
    if (data.achievements.length > 0) {
      const { error: achError } = await supabase.from('team_achievements').insert(
        data.achievements.map(a => ({
          team_id: id,
          season: a.season,
          event_name: a.eventName,
          award: a.award,
          description: a.description
        }))
      )
      if (achError) {
        console.error('Failed to sync achievements:', achError)
        // We don't return error here because the main team update succeeded
      }
    }
  }

  // Audit log — profile edits after submission are material
  const admin = createAdminClient()
  await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'update_team',
    entity_type: 'teams',
    entity_id: id,
    metadata: { fields_updated: Object.keys(data) },
  })

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
