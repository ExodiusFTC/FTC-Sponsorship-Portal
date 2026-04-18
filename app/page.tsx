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
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 pt-24 pb-12 text-center">
        <h1 className="text-6xl font-extrabold tracking-tighter sm:text-7xl lg:text-9xl flex flex-col items-center bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 leading-[0.85]">
          <span>FTC</span>
          <span>Sponsorship</span>
          <span>Portal</span>
        </h1>
      </header>

      {/* Reserved space for 3D model */}
      <div className="w-full h-[50vh] min-h-[400px] flex items-center justify-center relative overflow-hidden">
        {/* The interactive 3D model will be injected here */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent to-background z-10" />
      </div>

      <main className="flex-grow">
        <section className="container mx-auto px-4 py-24 text-center max-w-3xl">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Connecting FTC teams with sponsors who believe in them.
          </h2>
          <p className="mt-8 text-xl text-muted-foreground leading-relaxed">
            A moderated, invite-only platform for FIRST Tech Challenge coaches to build
            structured pitches and reach verified corporate sponsors — without the spray-and-pray.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "lg", className: "px-8" }))}
            >
              Coaches — get started
            </Link>
            <Link
              href="/sponsors/apply"
              className={cn(buttonVariants({ size: "lg", variant: "outline", className: "px-8" }))}
            >
              Become a sponsor
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24 grid gap-8 md:grid-cols-3 max-w-5xl">
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
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-wrap justify-between gap-6 text-sm text-muted-foreground">
          <span suppressHydrationWarning>© {new Date().getFullYear()} FTC Sponsorship Portal</span>
          <div className="flex gap-6">
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/sponsors/apply" className="hover:text-foreground transition-colors">Sponsor application</Link>
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
