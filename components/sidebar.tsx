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
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Role = 'coach' | 'admin' | null

type NavDef = { icon: LucideIcon; label: string; href: string; kbd?: string; showBadge?: boolean }

const coachNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: 'Overview',      href: '/dashboard',                    kbd: 'Shift+D' },
  { icon: BookOpen,        label: 'Portfolio',     href: '/dashboard?tab=portfolio',      kbd: 'Shift+P' },
  { icon: Target,          label: 'Find Sponsors', href: '/dashboard?tab=find-sponsors',  kbd: 'Shift+S' },
  { icon: FileText,        label: 'Submissions',   href: '/dashboard?tab=submissions',    kbd: 'Shift+H' },
  { icon: Inbox,           label: 'Inbox',         href: '/dashboard?tab=inbox',          kbd: 'Shift+N', showBadge: true },
  { icon: BarChart2,       label: 'Insights',      href: '/dashboard?tab=insights',       kbd: 'Shift+I' },
  { icon: Wallet,          label: 'Ledger',        href: '/dashboard?tab=ledger',         kbd: 'Shift+L' },
  { icon: Settings,        label: 'Settings',      href: '/dashboard?tab=settings',       kbd: 'Shift+,' },
]

const adminNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', kbd: 'Shift+D' },
  { icon: Inbox, label: 'Inbox', href: '/moderation', showBadge: true, kbd: 'Shift+M' },
  { icon: Building2, label: 'Sponsors', href: '/sponsors', kbd: 'Shift+S' },
  { icon: Users, label: 'Teams', href: '/coaches', kbd: 'Shift+T' },
  { icon: BarChart2, label: 'Analytics', href: '/analytics', kbd: 'Shift+A' },
  { icon: Settings, label: 'Settings', href: '/settings', kbd: 'Shift+,' },
]

function NavItem({ item, isActive, badge }: { item: NavDef; isActive: boolean; badge?: number }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
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
      {typeof badge === 'number' && badge > 0 && <Badge count={badge} />}
      {item.kbd && typeof badge !== 'number' && (
        <kbd className="relative font-mono text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground inline-flex items-center gap-0.5 transition-colors">
          {item.kbd}
        </kbd>
      )}
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
          {role === 'admin' ? 'Matchmaker · Admin' : 'Matchmaker · Team'}
        </div>
      </div>
      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
    </button>
  )
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function UserRow({ name, email, role, onSignOut }: { name: string; email: string; role: Role; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground ring-1 ring-border">
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-xs font-medium text-foreground">{name}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {role === 'admin' ? 'Admin' : role === 'coach' ? 'Coach' : 'Member'}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-popover p-1.5 shadow-xl backdrop-blur z-50"
          >
            <div className="px-2 py-1.5">
              <div className="truncate text-xs font-medium text-foreground">{name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{email}</div>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              Settings
            </Link>
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [theme, setTheme] = useState('dark')

  // Load persisted theme on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
      setTheme('light')
    }
    
    // Sync if changed externally
    const handleStorage = () => {
      const current = document.documentElement.getAttribute('data-theme') ?? 'dark'
      setTheme(current)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    if (next === 'dark') {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
    localStorage.setItem('theme', next)
    setTheme(next)
    // Dispatch storage event for other components in same tab
    window.dispatchEvent(new Event('storage'))
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      if (!e.shiftKey) return
      
      const key = e.key.toUpperCase()
      const routes: Record<string, string> = {
        'O': '/dashboard',
        'P': '/dashboard?tab=portfolio',
        'S': '/dashboard?tab=find-sponsors',
        'H': '/dashboard?tab=submissions',
        'N': '/dashboard?tab=inbox',
        'I': '/dashboard?tab=insights',
        'L': '/dashboard?tab=ledger',
        ',': '/dashboard?tab=settings',
      }

      if (routes[key]) {
        e.preventDefault()
        router.push(routes[key])
      } else if (key === 'M') {
        e.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [router, theme])

  const { data: queueData } = useSWR<{ count: number }>(
    role === 'admin' ? '/api/admin/queue/count' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 30000 }
  )
  const queueCount = queueData?.count ?? 0

  const { data: inboxData } = useSWR<{ count: number }>(
    role === 'coach' ? '/api/coach/notifications/unread' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 30000 }
  )
  const coachUnreadCount = inboxData?.count ?? 0

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserEmail(user.email ?? '')
      supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setRole((data?.role as Role) ?? null)
          setUserName(data?.full_name ?? user.email ?? 'User')
        })
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = role === 'admin' ? adminNavItems : role === 'coach' ? coachNavItems : []

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col justify-between border-r border-border bg-card p-3">
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
            {role === 'admin' ? 'Admin' : 'Coach'}
          </div>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const activeTab = searchParams ? (searchParams.get('tab') ?? '') : ''
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard' && !activeTab
                : pathname + (activeTab ? `?tab=${activeTab}` : '') === item.href
              
              // for admin items
              const isAdminActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const finalIsActive = role === 'admin' ? isAdminActive : isActive

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
        {/* Global shortcut hints */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2.5 py-1 border-b border-border mb-1 pb-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Shift+O overview</span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Shift+P portfolio</span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Shift+S sponsors</span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Shift+M theme</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex-1 min-w-0">
            <UserRow name={userName} email={userEmail} role={role} onSignOut={handleSignOut} />
          </div>
          <button
            onClick={toggleTheme}
            className="flex-shrink-0 p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-md transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" strokeWidth={1.5} /> : <Sun className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
