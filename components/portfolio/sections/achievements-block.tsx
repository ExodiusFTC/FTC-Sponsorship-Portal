interface Achievement {
  id: string
  season: string | null
  award: string | null
  event_name: string
  description: string | null
}

interface Props {
  achievements: Achievement[]
}

export function AchievementsBlock({ achievements }: Props) {
  if (achievements.length === 0) return null

  const bySeason = achievements.reduce<Record<string, Achievement[]>>((acc, a) => {
    const key = a.season ?? 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const seasons = Object.keys(bySeason).sort().reverse()

  return (
    <section className="grid gap-x-12 gap-y-6 md:grid-cols-12">
      <div className="md:col-span-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Achievements</span>
      </div>
      <div className="md:col-span-8 md:col-start-5 space-y-6">
        {seasons.map((season) => (
          <div key={season}>
            <p className="mb-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{season}</p>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {bySeason[season].map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.award ?? a.event_name}</p>
                    {a.award && <p className="text-xs text-muted-foreground">{a.event_name}</p>}
                  </div>
                  {a.description && (
                    <span className="shrink-0 max-w-[40%] truncate font-mono text-xs text-muted-foreground">{a.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
