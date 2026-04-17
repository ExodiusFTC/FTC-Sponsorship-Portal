import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Globe } from 'lucide-react'

export default async function SponsorBrowserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // RLS will automatically filter to only active sponsors where funding_used_cents < funding_cap_cents
  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('company_name')

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Sponsor Directory</h1>
        <p className="text-muted-foreground">
          Browse verified companies actively looking to sponsor FTC teams.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sponsors?.map((sponsor) => {
          // Calculate remaining capacity for display context, though specific dollar amounts might be hidden
          const isHighCapacity = sponsor.funding_cap_cents - sponsor.funding_used_cents > 500000 // > $5000 remaining
          
          return (
            <Card key={sponsor.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{sponsor.company_name}</CardTitle>
                  {sponsor.industry && (
                    <Badge variant="secondary">{sponsor.industry}</Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Building2 className="w-4 h-4" /> 
                  <span>Verified Sponsor</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  {sponsor.website && (
                    <a 
                      href={sponsor.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-primary hover:underline gap-1"
                    >
                      <Globe className="w-4 h-4" />
                      {new URL(sponsor.website).hostname.replace('www.', '')}
                    </a>
                  )}
                  
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm font-medium">Sponsorship Capacity</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isHighCapacity ? 'High capacity remaining' : 'Limited capacity remaining'}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" asChild>
                  <a href={`/pitches/new?sponsor=${sponsor.id}`}>Target in Pitch</a>
                </Button>
              </CardFooter>
            </Card>
          )
        })}

        {sponsors?.length === 0 && (
          <div className="col-span-full text-center py-12 bg-muted/30 rounded-lg border border-dashed">
            <h3 className="text-lg font-medium">No sponsors available</h3>
            <p className="text-muted-foreground mt-1">
              There are currently no active sponsors with remaining funding capacity. Please check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
