import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

type NavLink = { href: string; label: string }

const coachLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/team/edit', label: 'Team' },
  { href: '/sponsors/browse', label: 'Sponsors' },
]

const adminLinks: NavLink[] = [
  { href: '/moderation', label: 'Moderation' },
  { href: '/coaches', label: 'Coaches' },
  { href: '/applications', label: 'Applications' },
  { href: '/sponsors', label: 'Sponsors' },
  { href: '/analytics', label: 'Analytics' },
]

export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: 'coach' | 'admin' | null = null
  let fullName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()
    role = (profile?.role as 'coach' | 'admin') ?? 'coach'
    fullName = profile?.full_name ?? user.email ?? null
  }

  const links = role === 'admin' ? adminLinks : role === 'coach' ? coachLinks : []

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            FTC Sponsorship Portal
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-muted-foreground hidden sm:inline">{fullName}</span>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
