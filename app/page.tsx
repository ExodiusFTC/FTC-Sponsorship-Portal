import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/landing/top-nav'
import { Hero } from '@/components/landing/hero'
import { StatsStrip } from '@/components/landing/stats-strip'
import { FeatureGrid } from '@/components/landing/feature-grid'
import { ProductShowcase, PortfolioMock, ModerationMock } from '@/components/landing/product-showcase'
import { HowItWorks } from '@/components/landing/how-it-works'
import { FAQ } from '@/components/landing/faq'
import { LandingFooter } from '@/components/landing/footer'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') redirect('/admin')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 antialiased [color-scheme:dark]">
      <TopNav />
      <main>
        <Hero />
        <StatsStrip />
        <FeatureGrid />
        <ProductShowcase
          title="Build your team story once. Fork it a hundred times."
          body="Your Portfolio is the canonical source — story, budget bands, achievements, links. Every submission forks from it, keeping the asks custom without rewriting the fundamentals."
          bullets={[
            'One portfolio, zero duplicated maintenance',
            'Budget line-items with live totals',
            'Imports from The Blue Alliance',
          ]}
          visual={<PortfolioMock />}
        />
        <ProductShowcase
          flipped
          title="Nothing ships without a human read."
          body="Every outbound sponsor email queues for admin review. Approve, send changes back, or block — the submission thread stays tied to the audit log."
          bullets={[
            'Median review time under 6 hours',
            'Inline redlines, not rejection emails',
            'Immutable audit trail per decision',
          ]}
          visual={<ModerationMock />}
        />
        <HowItWorks />
        <FAQ />
      </main>
      <LandingFooter />
    </div>
  )
}
