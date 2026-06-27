'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import useSWR from 'swr'
import {
  LayoutDashboard,
  Inbox,
  Building2,
  Users,
  BarChart2,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true'

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/admin',        icon: LayoutDashboard, exact: true,  badge: false },
  { label: 'Review',       href: '/moderation',   icon: Inbox,           exact: false, badge: true  },
  { label: 'Applications', href: '/applications', icon: Shield,          exact: false, badge: false },
  { label: 'Sponsors',     href: '/sponsors',     icon: Building2,       exact: false, badge: false },
  { label: 'Teams',        href: '/coaches',      icon: Users,           exact: false, badge: false },
  { label: 'Analytics',    href: '/analytics',    icon: BarChart2,       exact: false, badge: false },
] as const

export function AdminSidebar({
  userName,
  userEmail,
}: {
  userName: string
  userEmail: string
}) {
  const pathname = usePathname()
  const { signOut } = useClerk()

  const { data: queueData } = useSWR<{ count: number }>(
    '/api/admin/queue/count',
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60_000, revalidateOnFocus: false },
  )
  const queueCount = queueData?.count ?? 0

  const settingsActive = pathname.startsWith('/settings')

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card h-screen sticky top-0">
      {/* Brand */}
      <Link
        href="/"
        className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4 transition-colors hover:bg-accent/60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-foreground">
          <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </svg>
        <span className="text-sm font-semibold tracking-tight text-foreground">FTC Matchmaker</span>
      </Link>

      {/* Portal label */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <span className="truncate text-[13px] font-medium text-foreground">Admin</span>
        </div>
        <div className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Control Panel
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const badgeCount = item.badge ? queueCount : 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
                strokeWidth={1.5}
              />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-primary-foreground">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: settings, sign out, user chip */}
      <div className="shrink-0 space-y-0.5 border-t border-border px-2 py-3">
        <Link
          href="/settings"
          className={cn(
            'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            settingsActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
          )}
        >
          <Settings
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              settingsActive
                ? 'text-primary'
                : 'text-muted-foreground group-hover:text-foreground',
            )}
            strokeWidth={1.5}
          />
          Settings
        </Link>

        <button
          onClick={() => {
            if (!DEV_AUTH_BYPASS) signOut({ redirectUrl: '/login' })
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          Sign out
        </button>

        {/* User chip */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground ring-1 ring-border">
            {getInitials(userName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-foreground">{userName}</div>
            <div className="truncate text-[10px] text-muted-foreground">{userEmail}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
