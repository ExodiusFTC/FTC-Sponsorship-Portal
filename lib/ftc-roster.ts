import { createAdminClient } from './supabase/admin'

export interface FTCTeam {
  team_number: number
  team_name: string
  city: string | null
  state: string | null
  country: string | null
}

const FTCSCOUT_URL = 'https://api.ftcscout.org/graphql'

async function fetchFromFTCScout(teamNumber: number): Promise<FTCTeam | null> {
  const query = `
    query {
      teamByNumber(number: ${teamNumber}) {
        number
        name
        city
        stateProv
        country
      }
    }
  `

  try {
    const res = await fetch(FTCSCOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const json = await res.json()
    const team = json?.data?.teamByNumber
    if (!team) return null

    return {
      team_number: team.number,
      team_name: team.name,
      city: team.city ?? null,
      state: team.stateProv ?? null,
      country: team.country ?? null,
    }
  } catch {
    return null
  }
}

export async function validateFTCTeam(teamNumber: number): Promise<FTCTeam | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: cachedTeam } = await supabase
    .from('ftc_teams_cache')
    .select('*')
    .eq('team_number', teamNumber)
    .single()

  if (cachedTeam) {
    return cachedTeam as FTCTeam
  }

  const team = await fetchFromFTCScout(teamNumber)
  if (!team) return null

  await supabase.from('ftc_teams_cache').upsert({
    ...team,
    last_synced: new Date().toISOString(),
  })

  return team
}
