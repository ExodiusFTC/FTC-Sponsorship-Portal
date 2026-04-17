'use server'

import { createClient } from '@/lib/supabase/server'
import { teamOnboardingSchema, type TeamOnboardingInput } from '@/lib/schemas/team'
import { achievementSchema, type AchievementInput } from '@/lib/schemas/achievement'
import { validateFTCTeam } from '@/lib/ftc-roster'
import { redirect } from 'next/navigation'

export async function createTeam(data: TeamOnboardingInput) {
  const result = teamOnboardingSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid data provided' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { status, ftcTeamNumber, teamName, organization, city, state, missionStatement, is501c3 } = result.data

  // Extra validation for existing teams
  if (status === 'existing' && ftcTeamNumber) {
    const ftcData = await validateFTCTeam(ftcTeamNumber)
    if (!ftcData) {
      return { error: `FTC Team #${ftcTeamNumber} could not be found in the FIRST registry.` }
    }
  }

  const { data: team, error } = await supabase
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
      is_501c3: is501c3,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
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
      is_501c3: data.is501c3,
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

  // Verify ownership of the team
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
