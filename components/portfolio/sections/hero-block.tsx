import { Badge } from '@/components/ui/badge'

interface Props {
  teamName: string
  ftcTeamNumber: number | null
  organization: string | null
  city: string | null
  state: string | null
  taxStatus: string | null
  logoUrl: string | null
  financialAskCents: number
}

function taxBadge(status: string | null) {
  if (status === '501c3') return { label: 'IRS 501(c)(3) Tax-Exempt', color: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950' }
  if (status === 'School') return { label: 'Public School Program', color: 'text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950' }
  return null
}

export function HeroBlock({ teamName, ftcTeamNumber, organization, city, state, taxStatus, logoUrl, financialAskCents }: Props) {
  const tax = taxBadge(taxStatus)
  const location = [city, state].filter(Boolean).join(', ')

  return (
    <section className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
      {logoUrl && (
        <img
          src={logoUrl}
          alt={`${teamName} logo`}
          className="h-20 w-20 flex-shrink-0 rounded-xl object-contain border border-border bg-card p-1"
        />
      )}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {ftcTeamNumber && (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              FTC #{ftcTeamNumber}
            </span>
          )}
          {location && (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">· {location}</span>
          )}
          {tax && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${tax.color}`}>
              ✓ {tax.label}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{teamName}</h1>
        {organization && (
          <p className="text-sm text-muted-foreground">{organization}</p>
        )}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sponsorship ask</span>
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            ${(financialAskCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </section>
  )
}
