import { createClient } from '@/lib/supabase/server'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cap</TableHead>
              <TableHead className="text-right">Used / Remaining</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsors?.map((sponsor) => (
              <TableRow key={sponsor.id}>
                <TableCell isFirst>
                  <Link
                    href={`/sponsors/${sponsor.id}/edit`}
                    className="text-foreground hover:underline font-medium"
                  >
                    {sponsor.company_name}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">{sponsor.industry}</div>
                </TableCell>
                <TableCell>
                  <span className="text-foreground">{sponsor.contact_name}</span>
                  <div className="text-xs text-muted-foreground mt-0.5">{sponsor.contact_email}</div>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sponsor.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {sponsor.status}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  ${(sponsor.funding_cap_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  ${(sponsor.funding_used_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {' / '}
                  <span className="text-foreground">
                    ${((sponsor.funding_cap_cents - sponsor.funding_used_cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell>
                  <SponsorToggleButton sponsorId={sponsor.id} currentStatus={sponsor.status} />
                </TableCell>
              </TableRow>
            ))}
            {(!sponsors || sponsors.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No sponsors found in the database.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
