'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Bell, LogOut, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { useUser, useClerk } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Role = 'coach' | 'admin' | 'sponsor' | null

type NavDef = { label: string; href: string; match: (ctx: MatchCtx) => boolean }
type MatchCtx = { pathname: string; tab: string }

/* Coach navigation collapses the old nine tabs into three destinations.
   Dashboard absorbs the overview/portfolio/ledger; Pitches is the submissions list;
   Sponsors is find-sponsors. */
const coachNav: NavDef[] = [
  { label: 'Dashboard', href: '/dashboard', match: ({ pathname, tab }) => pathname === '/dashboard' && ['', 'overview', 'portfolio', 'ledger', 'insights'].includes(tab) },
  { label: 'Pitches', href: '/dashboard?tab=submissions', match: ({ pathname, tab }) => pathname === '/dashboard' && ['submissions', 'drafts'].includes(tab) },
  { label: 'Sponsors', href: '/dashboard?tab=sponsors', match: ({ pathname, tab }) => pathname === '/dashboard' && ['sponsors', 'find-sponsors'].includes(tab) },
]

/* Admin surfaces both gatekeeping queues — Review (pitch moderation) and
   Applications (sponsor approvals) — plus sponsor management and coach/team
   verification. Analytics & audit are drill-downs reached from the dashboard. */
const adminNav: NavDef[] = [
  { label: 'Dashboard', href: '/admin', match: ({ pathname }) => pathname === '/admin' || pathname.startsWith('/admin/') },
  { label: 'Review', href: '/moderation', match: ({ pathname }) => pathname.startsWith('/moderation') },
  { label: 'Applications', href: '/applications', match: ({ pathname }) => pathname.startsWith('/applications') },
  { label: 'Sponsors', href: '/sponsors', match: ({ pathname }) => pathname.startsWith('/sponsors') },
  { label: 'Teams', href: '/coaches', match: ({ pathname }) => pathname.startsWith('/coaches') },
]

const sponsorNav: NavDef[] = [
  { label: 'Dashboard', href: '/sponsor/dashboard', match: ({ pathname }) => pathname === '/sponsor/dashboard' },
  { label: 'Requests', href: '/sponsor/submissions', match: ({ pathname }) => pathname.startsWith('/sponsor/submissions') },
  { label: 'Funding', href: '/sponsor/funding', match: ({ pathname }) => pathname.startsWith('/sponsor/funding') },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function NavLink({ item, isActive }: { item: NavDef; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      )}
    >
      {item.label}
      {isActive && (
        <motion.span
          layoutId="topnav-active"
          className="absolute inset-x-3 -bottom-[7px] h-0.5 rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 450, damping: 36 }}
        />
      )}
    </Link>
  )
}

// DEV-ONLY sponsor preview (see lib/dev-preview.ts). Inlined at build; off in prod.
const SPONSOR_PREVIEW =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_SPONSOR_PREVIEW === '1'

// DEV-ONLY admin bypass (see lib/dev-bypass.ts). Inlined at build; off in prod.
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true'

// DEV-ONLY coach preview (see lib/dev-coach-preview.ts). Inlined at build; off in prod.
const COACH_PREVIEW =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_COACH_PREVIEW === '1'

export function TopNav({ role: roleProp }: { role?: Role } = {}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { signOut } = useClerk()

  // Role is resolved server-side (authoritative `profiles.role`) and passed as a
  // prop. Fall back to the Clerk `publicMetadata` mirror only when no prop is
  // supplied. Dev preview flags still override everything below.
  const role: Role = DEV_AUTH_BYPASS
    ? 'admin'
    : SPONSOR_PREVIEW
      ? 'sponsor'
      : COACH_PREVIEW
        ? 'coach'
        : (roleProp ?? (user?.publicMetadata?.role as Role) ?? null)
  const userEmail = DEV_AUTH_BYPASS
    ? 'admin+clerk_test@example.com'
    : SPONSOR_PREVIEW
      ? 'sponsor@preview.local'
      : COACH_PREVIEW
        ? 'coach@preview.local'
        : (user?.primaryEmailAddress?.emailAddress ?? '')
  const userName = DEV_AUTH_BYPASS
    ? 'Dev Admin'
    : SPONSOR_PREVIEW
      ? 'Jordan Avery'
      : COACH_PREVIEW
        ? 'Dev Coach'
        : (user?.fullName ?? userEmail ?? 'User')

  const { data: queueData } = useSWR<{ count: number }>(
    role === 'admin' ? '/api/admin/queue/count' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60000, revalidateOnFocus: false }
  )
  const queueCount = queueData?.count ?? 0

  const { data: inboxData } = useSWR<{ count: number }>(
    role === 'coach' ? '/api/coach/notifications/unread' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60000, revalidateOnFocus: false }
  )
  const coachUnreadCount = inboxData?.count ?? 0

  async function handleSignOut() {
    if (SPONSOR_PREVIEW || DEV_AUTH_BYPASS || COACH_PREVIEW) return // no Clerk session to sign out of in preview
    await signOut({ redirectUrl: '/login' })
  }

  const navItems = role === 'admin' ? adminNav : role === 'coach' ? coachNav : role === 'sponsor' ? sponsorNav : []
  const tab = searchParams?.get('tab') ?? ''
  const matchCtx: MatchCtx = { pathname, tab }

  const inboxHref = role === 'admin' ? '/moderation' : role === 'sponsor' ? '/sponsor/inbox' : '/dashboard?tab=inbox'
  const settingsHref = role === 'admin' ? '/settings' : role === 'sponsor' ? '/sponsor/settings' : '/dashboard?tab=settings'
  const badge = role === 'admin' ? queueCount : role === 'coach' ? coachUnreadCount : 0
  const roleLabel = role === 'admin' ? 'Admin' : role === 'sponsor' ? 'Sponsor' : role === 'coach' ? 'Coach' : 'Member'

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:px-6">
      {/* Left: brand + nav */}
      <div className="flex items-center gap-1 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 pr-1">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-foreground">
            <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          </svg>
          <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">FTC Matchmaker</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={item.match(matchCtx)} />
          ))}
        </nav>
      </div>

      {/* Right: notifications + account */}
      <div className="flex items-center gap-1">
        {role && (
          <Link
            href={inboxHref}
            title="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell className="h-4 w-4" strokeWidth={1.5} />
            {badge > 0 && (
              <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-semibold text-primary-foreground">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-border">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground ring-1 ring-border">
              {getInitials(userName)}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="truncate text-sm font-medium text-foreground">{userName}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">{userEmail || roleLabel}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={settingsHref} className="flex w-full cursor-pointer items-center gap-2">
                <Settings className="h-4 w-4" strokeWidth={1.5} /> Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
