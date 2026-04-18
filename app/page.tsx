import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    if (profile?.role === 'admin') redirect('/moderation')
    redirect('/dashboard')
  }

  return (
    <div>
      <section className="container mx-auto px-4 py-20 text-center max-w-3xl">
        <h1 className="text-5xl font-bold tracking-tight">
          Connecting FTC teams with sponsors who believe in them.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          A moderated, invite-only platform for FIRST Tech Challenge coaches to build
          structured pitches and reach verified corporate sponsors — without the spray-and-pray.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}
          >
            Coaches — get started
          </Link>
          <Link
            href="/sponsors/apply"
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}
          >
            Become a sponsor
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 grid gap-6 md:grid-cols-3 max-w-5xl">
        <Feature
          title="Structured pitches"
          body="Build a clear team story and itemized budget with our guided multi-step builder."
        />
        <Feature
          title="Admin-reviewed dispatch"
          body="Every outreach email is reviewed before it leaves the platform. No spam, no surprises."
        />
        <Feature
          title="COPPA-safe"
          body="Only verified adult coaches can register. We never collect student PII."
        />
      </section>

      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 flex flex-wrap justify-between gap-4 text-sm text-muted-foreground">
          <span suppressHydrationWarning>© {new Date().getFullYear()} FTC Sponsorship Portal</span>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/sponsors/apply" className="hover:text-foreground">Sponsor application</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
