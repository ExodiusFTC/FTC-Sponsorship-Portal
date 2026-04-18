import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

export default async function SponsorBrowserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('company_name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="Find Sponsors"
        subtitle="Browse verified companies actively looking to sponsor FTC teams."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sponsors?.map((sponsor) => {
          const isHighCapacity = sponsor.funding_cap_cents - sponsor.funding_used_cents > 500000

          return (
            <Card key={sponsor.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <CardTitle>{sponsor.company_name}</CardTitle>
                  {sponsor.industry && (
                    <span style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}>
                      {sponsor.industry}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>Verified Sponsor</p>
              </CardHeader>
              <CardContent style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sponsor.website && (
                    <a
                      href={sponsor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--text-primary)', textDecoration: 'underline' }}
                    >
                      <Globe size={14} />
                      {new URL(sponsor.website).hostname.replace('www.', '')}
                    </a>
                  )}
                  <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Sponsorship Capacity</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {isHighCapacity ? 'High capacity remaining' : 'Limited capacity remaining'}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <a
                  href={`/pitches/new?sponsor=${sponsor.id}`}
                  className={buttonVariants({ variant: 'secondary' })}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Target in Pitch
                </a>
              </CardFooter>
            </Card>
          )
        })}

        {sponsors?.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>No sponsors available</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              There are currently no active sponsors with remaining funding capacity. Please check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
