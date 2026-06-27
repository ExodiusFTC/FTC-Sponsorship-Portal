import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { SponsorToggleButton } from '@/components/admin/sponsor-toggle-button'

export default async function AdminSponsorsPage() {
  const supabase = await createClient()

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Sponsors"
        subtitle="View and manage the corporate sponsor directory and their funding caps."
        action={
          <Link href="/sponsors/new">
            <Button>+ Add Sponsor</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3">
        {sponsors?.map((sponsor) => (
          <div key={sponsor.id} className="rounded-xl border bg-card p-5 flex flex-col md:flex-row md:items-start gap-5 transition-colors hover:border-accent shadow-sm">
            
            {/* Avatar Placeholder */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted border text-sm font-semibold text-muted-foreground">
              {(sponsor.company_name ?? 'S').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            
            {/* Info summary */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Link
                  href={`/sponsors/${sponsor.id}/edit`}
                  className="hover:underline"
                >
                  {sponsor.company_name}
                </Link>
              </div>
              <div className="text-xs text-muted-foreground">{sponsor.industry || 'No Industry Specified'}</div>
              
              <div className="text-xs text-muted-foreground mt-2 pt-1">
                <span className="text-foreground">{sponsor.contact_name}</span> · {sponsor.contact_email}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className={`inline-flex items-center gap-1 rounded-full border text-[10px] font-medium px-2 py-0.5 ${sponsor.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}>
                  {sponsor.status}
                </span>
              </div>
            </div>

            {/* Financials & Actions */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="font-mono text-sm">
                  <span className="text-muted-foreground text-xs">Used: </span>
                  ${(sponsor.funding_used_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="font-mono text-sm">
                  <span className="text-muted-foreground text-xs">Cap: </span>
                  ${(sponsor.funding_cap_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="font-mono text-sm font-semibold mt-1 bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                  <span className="text-muted-foreground font-normal text-xs">Remaining: </span>
                  ${((sponsor.funding_cap_cents - sponsor.funding_used_cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <SponsorToggleButton sponsorId={sponsor.id} currentStatus={sponsor.status} />
            </div>
          </div>
        ))}
        {(!sponsors || sponsors.length === 0) && (
          <p className="text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl text-center">
            No sponsors found in the database.
          </p>
        )}
      </div>
    </div>
  )
}
