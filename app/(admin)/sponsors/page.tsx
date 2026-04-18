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

export default async function AdminSponsorsPage() {
  const supabase = await createClient()

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="Sponsors"
        subtitle="View and manage the corporate sponsor directory and their funding caps."
        action={
          <Link href="/sponsors/new">
            <Button>+ Add Sponsor</Button>
          </Link>
        }
      />

      <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Funding Cap</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsors?.map((sponsor) => (
              <TableRow key={sponsor.id}>
                <TableCell isFirst>
                  <Link href={`/sponsors/${sponsor.id}/edit`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}>
                    {sponsor.company_name}
                  </Link>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{sponsor.industry}</div>
                </TableCell>
                <TableCell>
                  <span style={{ color: 'var(--text-primary)' }}>{sponsor.contact_name}</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{sponsor.contact_email}</div>
                </TableCell>
                <TableCell>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: sponsor.status === 'active' ? 'var(--badge-success-bg)' : 'var(--badge-pending-bg)',
                    color: sponsor.status === 'active' ? 'var(--badge-success-text)' : 'var(--badge-pending-text)',
                  }}>
                    {sponsor.status}
                  </span>
                </TableCell>
                <TableCell style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  ${(sponsor.funding_cap_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  ${((sponsor.funding_cap_cents - sponsor.funding_used_cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
            {(!sponsors || sponsors.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
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
