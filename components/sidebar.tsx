'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Target,
  Clock,
  Settings,
  Inbox,
  Building2,
  Users,
  BarChart2,
  BookOpen,
  Wallet,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Role = 'coach' | 'admin' | 'sponsor' | null

type NavDef = { icon: LucideIcon; label: string; href: string; kbd?: string; showBadge?: boolean }

const coachNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', kbd: 'Shift+O' },
  { icon: BookOpen, label: 'Portfolio', href: '/dashboard?tab=portfolio', kbd: 'Shift+P' },
  { icon: Target, label: 'Find Sponsors', href: '/dashboard?tab=find-sponsors', kbd: 'Shift+S' },
  { icon: FileText, label: 'Submissions', href: '/dashboard?tab=submissions', kbd: 'Shift+H' },
  { icon: Inbox, label: 'Inbox', href: '/dashboard?tab=inbox', kbd: 'Shift+N', showBadge: true },
  { icon: BarChart2, label: 'Insights', href: '/dashboard?tab=insights', kbd: 'Shift+I' },
  { icon: Wallet, label: 'Ledger', href: '/dashboard?tab=ledger', kbd: 'Shift+L' },
  { icon: Settings, label: 'Settings', href: '/dashboard?tab=settings', kbd: 'Shift+,' },
]

const adminNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', kbd: 'Shift+D' },
  { icon: Inbox, label: 'Inbox', href: '/moderation', showBadge: true, kbd: 'Shift+Q' },
  { icon: Building2, label: 'Sponsors', href: '/sponsors', kbd: 'Shift+S' },
  { icon: Users, label: 'Teams', href: '/coaches', kbd: 'Shift+T' },
  { icon: BarChart2, label: 'Analytics', href: '/analytics', kbd: 'Shift+A' },
  { icon: BookOpen, label: 'Audit Log', href: '/admin/audit', kbd: 'Shift+U' },
  { icon: ShieldCheck, label: 'Security', href: '/admin/security', kbd: 'Shift+2' },
  { icon: Settings, label: 'Settings', href: '/settings', kbd: 'Shift+,' },
]

const sponsorNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/sponsor/dashboard', kbd: 'Shift+O' },
  { icon: FileText, label: 'Requests', href: '/sponsor/submissions', kbd: 'Shift+R' },
  { icon: Inbox, label: 'Inbox', href: '/sponsor/inbox', kbd: 'Shift+N', showBadge: true },
  { icon: Wallet, label: 'Funding', href: '/sponsor/funding', kbd: 'Shift+F' },
  { icon: Settings, label: 'Settings', href: '/sponsor/settings', kbd: 'Shift+,' },
]

function NavItem({ item, isActive, badge }: { item: NavDef; isActive: boolean; badge?: number }) {
  const Icon = item.icon

  const content = (
    <>
      {isActive && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-md bg-accent ring-1 ring-border"
          transition={{ type: 'spring', stiffness: 450, damping: 36 }}
        />
      )}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <Icon
        className={cn('relative h-4 w-4 transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}
        strokeWidth={1.5}
      />
      <span className="relative flex-1 truncate">{item.label}</span>
      {item.kbd && (
        <kbd className="relative font-mono text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground inline-flex items-center gap-0.5 transition-colors">
          {item.kbd}
        </kbd>
      )}
      {typeof badge === 'number' && badge > 0 && <Badge count={badge} />}
    </>
  )

  const className = cn(
    'group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors text-left',
    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
    `tour-${item.label.toLowerCase().replace(/\\s+/g, '-')}`
  )

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  )
}

function Badge({ count }: { count: number }) {
  const prev = useRef(count)
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    if (prev.current !== count) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 300)
      prev.current = count
      return () => clearTimeout(t)
    }
  }, [count])
  return (
    <motion.span
      animate={pulse ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative inline-flex items-center rounded-full border border-border bg-accent px-1.5 py-0.5 font-mono text-[10px] text-foreground"
    >
      {count}
    </motion.span>
  )
}

function WorkspacePill({ role }: { role: Role }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-left transition-colors hover:border-border hover:bg-accent/50"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-indigo-600 text-[10px] font-bold text-white">
        M
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Workspace</div>
        <div className="text-xs font-medium text-foreground truncate">
          {role === 'admin' ? 'Matchmaker · Admin' : role === 'sponsor' ? 'Matchmaker · Sponsor' : 'Matchmaker · Team'}
        </div>
      </div>
      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
    </button>
  )
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

import { Theme } from '@/components/ui/theme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function UserRow({ name, email, role }: { name: string; email: string; role: Role }) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 outline-none">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground ring-1 ring-border">
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="truncate text-xs font-medium text-foreground">{name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          {role === 'admin' ? 'Admin' : role === 'coach' ? 'Coach' : role === 'sponsor' ? 'Sponsor' : 'Member'}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')

  // Global keyboard shortcuts
  const { data: queueData } = useSWR<{ count: number }>(
    role === 'admin' ? '/api/admin/queue/count' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60000, revalidateOnFocus: false }
  )
  const queueCount = queueData?.count ?? 0

  const { data: inboxData, mutate: mutateInbox } = useSWR<{ count: number }>(
    role === 'coach' ? '/api/coach/notifications/unread' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 60000, revalidateOnFocus: false }
  )
  const coachUnreadCount = inboxData?.count ?? 0

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()
    // Must be declared here so the cleanup closure can always reach it,
    // even though it's assigned asynchronously inside the promise chain.
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isMounted) return
      setUserEmail(user.email ?? '')
      supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (!isMounted) return
          setRole((data?.role as Role) ?? null)
          setUserName(data?.full_name ?? user.email ?? 'User')

          if (data?.role === 'coach') {
            // Build the channel first, subscribe second — never chain them,
            // because subscribe() seals the channel against further .on() calls.
            channel = supabase.channel(`notif-badge:${user.id}`)
            channel.on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${user.id}`,
            }, () => mutateInbox())
            channel.subscribe()
          }
        })
    })

    // This cleanup runs on unmount AND before every re-run (e.g. Strict Mode).
    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [mutateInbox])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = role === 'admin' ? adminNavItems : role === 'coach' ? coachNavItems : role === 'sponsor' ? sponsorNavItems : []

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col justify-between border-r border-border bg-card p-3">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-1 pt-1">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-foreground">
              <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-foreground">Matchmaker</span>
          </Link>
        </div>

        <WorkspacePill role={role} />

        <div>
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {role === 'admin' ? 'Admin' : role === 'coach' ? 'Coach' : 'Sponsor'}
          </div>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const activeTab = searchParams?.get('tab') ?? ''
              const currentHref = pathname + (activeTab ? `?tab=${activeTab}` : '')
              const isCoachActive = item.href === '/dashboard'
                ? pathname === '/dashboard' && !activeTab
                : currentHref === item.href
              const isAdminActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const finalIsActive = (role === 'admin' || role === 'sponsor') ? isAdminActive : isCoachActive

              return (
                <NavItem
                  key={item.href + item.label}
                  item={item}
                  isActive={finalIsActive}
                  badge={item.showBadge ? (role === 'admin' ? queueCount : coachUnreadCount) : undefined}
                />
              )
            })}
          </nav>
        </div>
      </div>

      <div className="border-t border-border pt-2 space-y-1">
        {/* Cmd+K hint */}
        <button
          type="button"
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="flex-1 text-left">Search actions</span>
          <kbd className="font-mono text-[10px] opacity-60">⌘K</kbd>
        </button>

        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <UserRow name={userName} email={userEmail} role={role} />
          </div>
          <button onClick={handleSignOut} className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
          <Theme variant="button" size="sm" themes={['light', 'dark']} />
        </div>
      </div>
    </aside>
  )
}
