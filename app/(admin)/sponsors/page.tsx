import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function AdminSponsorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard') // Or an access denied page
  }

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Sponsors</h1>
          <p className="text-muted-foreground">
            View and manage the corporate sponsor directory and their funding caps.
          </p>
        </div>
        <Link href="/sponsors/new">
          <Button>+ Add Sponsor</Button>
        </Link>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Funding Cap</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsors?.map((sponsor) => (
              <TableRow key={sponsor.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <Link href={`/sponsors/${sponsor.id}/edit`} className="hover:underline">
                    {sponsor.company_name}
                  </Link>
                  <div className="text-xs text-muted-foreground font-normal">{sponsor.industry}</div>
                </TableCell>
                <TableCell>
                  {sponsor.contact_name}
                  <div className="text-xs text-muted-foreground">{sponsor.contact_email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={sponsor.status === 'active' ? 'default' : 'secondary'}>
                    {sponsor.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  ${(sponsor.funding_cap_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  ${((sponsor.funding_cap_cents - sponsor.funding_used_cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
            {(!sponsors || sponsors.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
