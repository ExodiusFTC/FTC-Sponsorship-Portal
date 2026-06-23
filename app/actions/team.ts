'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { achievementSchema, type AchievementInput } from '@/lib/schemas/achievement'
import { validateFTCTeam, type FTCTeam } from '@/lib/ftc-roster'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/actions-utils'

function parseList(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(v => v.trim()).filter(Boolean)
  return value.split(',').map(v => v.trim()).filter(Boolean)
}

function normalizeBudgetItems(
  items: TeamOnboardingInput['budgetItems'] | undefined
): { label: string; qty: number; unit_cost_cents: number; total_cents: number }[] {
  return (items || []).map(item => ({
    label: item.label.trim(),
    qty: item.qty,
    unit_cost_cents: item.unitCostCents,
    total_cents: item.totalCents,
  }))
}

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
    return { error: result.error.issues[0]?.message ?? 'Invalid data provided', details: result.error.format() }
  }

  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
    return { error: 'Not authenticated' }
  }

  const payloadData = result.data

  if (payloadData.status === 'existing' && payloadData.ftcTeamNumber) {
    const ftcData = await validateFTCTeam(payloadData.ftcTeamNumber)
    if (!ftcData) {
      return { error: `FTC Team #${payloadData.ftcTeamNumber} could not be found in the FIRST registry.` }
    }
  }

  const normalizedBudgetItems = normalizeBudgetItems(payloadData.budgetItems)
  const totalAsk = normalizedBudgetItems.reduce((sum, item) => sum + item.total_cents, 0)

  const teamPayload = {
    owner_id: user.id,
    status: payloadData.status,
    ftc_team_number: payloadData.ftcTeamNumber ?? null,
    team_name: payloadData.teamName.trim(),
    organization: payloadData.organization?.trim() || null,
    city: payloadData.city.trim(),
    state: payloadData.state.trim(),
    tagline: payloadData.tagline?.trim() || null,
    mission_statement: payloadData.missionStatement.trim(),
    tax_status: payloadData.taxStatus,
    community_interest_text: payloadData.communityInterestText?.trim() || null,
    student_interest_count: payloadData.studentInterestCount ?? 0,
    sustainability_plan: payloadData.sustainabilityPlan?.trim() || null,
    seed_funding_goals_cents: payloadData.seedFundingGoalsCents ?? 0,
    technical_summary: payloadData.technicalSummary?.trim() || null,
    outreach_summary: payloadData.outreachSummary?.trim() || null,
    drivetrain: payloadData.drivetrain?.trim() || null,
    build_system: payloadData.buildSystem?.trim() || null,
    programming: payloadData.programming?.trim() || null,
    media_urls: payloadData.mediaUrls || [],
    youtube_url: payloadData.youtubeUrl || null,
    budget_items: normalizedBudgetItems,
    financial_ask_cents: totalAsk,
    cad_software: payloadData.cadSoftware?.trim() || null,
    control_system: payloadData.controlSystem?.trim() || null,
    sensors: parseList(payloadData.sensors),
    github_link: payloadData.githubLink?.trim() || null,
    autonomous_description: payloadData.autonomousDescription?.trim() || null,
    subteam_breakdown: payloadData.subteamBreakdown?.trim() || null,
    manufacturing_capabilities: parseList(payloadData.manufacturingCapabilities),
    visual_pitch_items: payloadData.visualPitchItems ?? [],
    proudest_mechanism_name: payloadData.proudestMechanismName?.trim() || null,
    proudest_mechanism_problem: payloadData.proudestMechanismProblem?.trim() || null,
    proudest_mechanism_solution: payloadData.proudestMechanismSolution?.trim() || null,
    coach_photo_url: payloadData.coachPhotoUrl ?? null,
  }

  // Keep onboarding idempotent: one owner should map to one team profile.
  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let teamId: string | null = null

  if (existingTeam?.id) {
    const updatePayload = { ...teamPayload } as Record<string, unknown>
    delete updatePayload.owner_id
    const { data: updated, error: updateError } = await supabase
      .from('teams')
      .update(updatePayload as never)
      .eq('id', existingTeam.id)
      .eq('owner_id', user.id)
      .select('id')
      .single()

    if (updateError) {
      return { error: updateError.message }
    }
    teamId = updated.id
  } else {
    const { data: team, error } = await supabase
      .from('teams')
      .insert(teamPayload as never)
      .select('id')
      .single()

    if (error) {
      return { error: error.message }
    }
    teamId = team.id
  }

  // Audit log — coach create is a material event admins should see
  const admin = createAdminClient()
  const { error: createAuditError } = await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'create_team',
    entity_type: 'teams',
    entity_id: teamId,
    metadata: { team_name: payloadData.teamName, status: payloadData.status },
  })
  if (createAuditError) {
    console.error('Failed to write create_team audit log:', createAuditError.message)
  }

  redirect('/dashboard')
}

export async function uploadTeamLogo(teamId: string, formData: FormData) {
  let user, supabase, clerkUserId
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
    clerkUserId = auth.clerkUserId
  } catch {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return { error: 'Logo must be a JPG, PNG, or WebP image' }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'Logo must be under 2 MB' }
  }

  const filePath = `${clerkUserId}/${teamId}.${ext}`
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
  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
    return { error: 'Not authenticated' }
  }

  const updatePayload: Record<string, unknown> = {}

  if (typeof data.teamName === 'string') updatePayload.team_name = data.teamName.trim()
  if (typeof data.organization === 'string') updatePayload.organization = data.organization.trim() || null
  if (typeof data.city === 'string') updatePayload.city = data.city.trim()
  if (typeof data.state === 'string') updatePayload.state = data.state.trim()
  if (data.tagline !== undefined) updatePayload.tagline = data.tagline?.trim() || null
  if (typeof data.missionStatement === 'string') updatePayload.mission_statement = data.missionStatement.trim()
  if (data.taxStatus) updatePayload.tax_status = data.taxStatus
  if (data.communityInterestText !== undefined) updatePayload.community_interest_text = data.communityInterestText?.trim() || null
  if (data.studentInterestCount !== undefined) updatePayload.student_interest_count = data.studentInterestCount
  if (data.sustainabilityPlan !== undefined) updatePayload.sustainability_plan = data.sustainabilityPlan?.trim() || null
  if (data.seedFundingGoalsCents !== undefined) updatePayload.seed_funding_goals_cents = data.seedFundingGoalsCents
  if (data.technicalSummary !== undefined) updatePayload.technical_summary = data.technicalSummary?.trim() || null
  if (data.outreachSummary !== undefined) updatePayload.outreach_summary = data.outreachSummary?.trim() || null
  if (data.drivetrain !== undefined) updatePayload.drivetrain = data.drivetrain?.trim() || null
  if (data.buildSystem !== undefined) updatePayload.build_system = data.buildSystem?.trim() || null
  if (data.programming !== undefined) updatePayload.programming = data.programming?.trim() || null
  if (data.mediaUrls !== undefined) updatePayload.media_urls = data.mediaUrls
  if (data.youtubeUrl !== undefined) updatePayload.youtube_url = data.youtubeUrl || null

  if (data.budgetItems !== undefined) {
    const normalizedBudgetItems = normalizeBudgetItems(data.budgetItems as TeamOnboardingInput['budgetItems'])
    updatePayload.budget_items = normalizedBudgetItems
    updatePayload.financial_ask_cents = normalizedBudgetItems.reduce((sum, item) => sum + item.total_cents, 0)
  } else if (data.financialAskCents !== undefined) {
    updatePayload.financial_ask_cents = data.financialAskCents
  }

  if (data.cadSoftware !== undefined) updatePayload.cad_software = data.cadSoftware?.trim() || null
  if (data.controlSystem !== undefined) updatePayload.control_system = data.controlSystem?.trim() || null
  if (data.sensors !== undefined) updatePayload.sensors = parseList(data.sensors as string | string[] | undefined | null)
  if (data.githubLink !== undefined) updatePayload.github_link = data.githubLink?.trim() || null
  if (data.autonomousDescription !== undefined) updatePayload.autonomous_description = data.autonomousDescription?.trim() || null
  if (data.subteamBreakdown !== undefined) updatePayload.subteam_breakdown = data.subteamBreakdown?.trim() || null
  if (data.manufacturingCapabilities !== undefined) {
    updatePayload.manufacturing_capabilities = parseList(data.manufacturingCapabilities as string | string[] | undefined | null)
  }
  if (data.visualPitchItems !== undefined) updatePayload.visual_pitch_items = data.visualPitchItems
  if (data.proudestMechanismName !== undefined) updatePayload.proudest_mechanism_name = data.proudestMechanismName?.trim() || null
  if (data.proudestMechanismProblem !== undefined) updatePayload.proudest_mechanism_problem = data.proudestMechanismProblem?.trim() || null
  if (data.proudestMechanismSolution !== undefined) updatePayload.proudest_mechanism_solution = data.proudestMechanismSolution?.trim() || null
  if (data.coachPhotoUrl !== undefined) updatePayload.coach_photo_url = data.coachPhotoUrl || null

  if (Object.keys(updatePayload).length === 0) {
    return { success: true }
  }

  const { error } = await supabase
    .from('teams')
    .update(updatePayload as never)
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Handle achievements sync. Only rewrite when the content actually changed, so an
  // unchanged save doesn't churn achievement ids/created_at or spend two extra DB
  // round-trips deleting and re-inserting identical rows.
  if (data.achievements) {
    const incoming = data.achievements.map(a => ({
      team_id: id,
      season: a.season,
      event_name: a.eventName,
      award: a.award,
      description: a.description ?? null,
    }))

    const { data: existing } = await supabase
      .from('team_achievements')
      .select('season, event_name, award, description')
      .eq('team_id', id)

    const signature = (a: { season?: string | null; event_name?: string | null; award?: string | null; description?: string | null }) =>
      JSON.stringify([a.season ?? null, a.event_name ?? null, a.award ?? null, a.description ?? null])
    const existingSigs = (existing ?? []).map(signature).sort()
    const incomingSigs = incoming.map(signature).sort()
    const unchanged =
      existingSigs.length === incomingSigs.length &&
      existingSigs.every((s, i) => s === incomingSigs[i])

    if (!unchanged) {
      await supabase.from('team_achievements').delete().eq('team_id', id)
      if (incoming.length > 0) {
        const { error: achError } = await supabase.from('team_achievements').insert(incoming)
        if (achError) {
          console.error('Failed to sync achievements:', achError)
          // We don't return error here because the main team update succeeded
        }
      }
    }
  }

  // Audit log — profile edits after submission are material
  const admin = createAdminClient()
  const { error: updateAuditError } = await admin.from('audit_log').insert({
    actor_id: user.id,
    action: 'update_team',
    entity_type: 'teams',
    entity_id: id,
    metadata: { fields_updated: Object.keys(data) },
  })
  if (updateAuditError) {
    console.error('Failed to write update_team audit log:', updateAuditError.message)
  }

  return { success: true }
}

export async function addAchievement(teamId: string, data: AchievementInput) {
  const result = achievementSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
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

