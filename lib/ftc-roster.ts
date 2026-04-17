import { createAdminClient } from './supabase/admin'

export interface FTCTeam {
  team_number: number
  team_name: string
  city: string | null
  state: string | null
  country: string | null
}

export async function validateFTCTeam(teamNumber: number): Promise<FTCTeam | null> {
  const supabase = createAdminClient()

  // 1. Check cache first
  const { data: cachedTeam } = await supabase
    .from('ftc_teams_cache')
    .select('*')
    .eq('team_number', teamNumber)
    .single()

  if (cachedTeam) {
    return cachedTeam
  }

  // 2. If not in cache, simulate fetch from FIRST (replace with real API call later)
  // For now, we'll "fetch" some mock data if it matches certain patterns, or just return null
  // In a real app, this would be a fetch() to FIRST's API or a scrape of their search page.
  
  // MOCK FETCH
  if (teamNumber > 0 && teamNumber < 100000) {
    const mockTeam: FTCTeam = {
      team_number: teamNumber,
      team_name: `Team ${teamNumber}`,
      city: 'Sample City',
      state: 'ST',
      country: 'USA',
    }

    // Update cache
    await supabase.from('ftc_teams_cache').upsert({
      ...mockTeam,
      last_synced: new Date().toISOString(),
    })

    return mockTeam
  }

  return null
}
