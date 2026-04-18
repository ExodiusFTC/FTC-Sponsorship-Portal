'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Role = 'coach' | 'admin' | null

type NavDef = { icon: LucideIcon; label: string; href: string; kbd?: string; showBadge?: boolean }

const coachNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', kbd: 'G D' },
  { icon: FileText, label: 'My Application', href: '/submissions/new', kbd: 'G A' },
  { icon: Target, label: 'Find Sponsors', href: '/sponsors/browse', kbd: 'G S' },
  { icon: Clock, label: 'Pitch History', href: '/submissions/new', kbd: 'G H' },
  { icon: Settings, label: 'Settings', href: '/team/edit', kbd: 'G ,' },
]

const adminNavItems: NavDef[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/analytics', kbd: 'G D' },
  { icon: Inbox, label: 'Inbox', href: '/moderation', showBadge: true, kbd: 'G M' },
  { icon: Building2, label: 'Sponsors', href: '/sponsors', kbd: 'G S' },
  { icon: Users, label: 'Teams', href: '/coaches', kbd: 'G T' },
  { icon: BarChart2, label: 'Analytics', href: '/analytics', kbd: 'G A' },
]

function NavItem({ item, isActive, badge }: { item: NavDef; isActive: boolean; badge?: number }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
        isActive ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
      )}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-md bg-zinc-900 ring-1 ring-zinc-800"
          transition={{ type: 'spring', stiffness: 450, damping: 36 }}
        />
      )}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-zinc-200" />
      )}
      <Icon
        className={cn('relative h-4 w-4 transition-colors', isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-200')}
        strokeWidth={1.5}
      />
      <span className="relative flex-1 truncate">{item.label}</span>
      {typeof badge === 'number' && badge > 0 && <Badge count={badge} />}
      {item.kbd && typeof badge !== 'number' && (
        <kbd className="relative hidden font-mono text-[10px] text-zinc-600 group-hover:inline-flex">
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
      className="relative inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300"
    >
      {count}
    </motion.span>
  )
}

function WorkspacePill({ role }: { role: Role }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-indigo-600 text-[10px] font-bold text-zinc-950">
        M
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Workspace</div>
        <div className="text-xs font-medium text-zinc-100 truncate">
          {role === 'admin' ? 'Matchmaker · Admin' : 'Matchmaker · Team'}
        </div>
      </div>
      <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
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
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-900/70"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-zinc-200 ring-1 ring-zinc-800">
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-xs font-medium text-zinc-100">{name}</div>
          <div className="truncate text-[10px] text-zinc-500">
            {role === 'admin' ? 'Admin' : role === 'coach' ? 'Coach' : 'Member'}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-xl backdrop-blur z-50"
          >
            <div className="px-2 py-1.5">
              <div className="truncate text-xs font-medium text-zinc-100">{name}</div>
              <div className="truncate text-[10px] text-zinc-500">{email}</div>
            </div>
            <div className="my-1 h-px bg-zinc-900" />
            <Link
              href="/team/edit"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              Settings
            </Link>
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
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
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')

  const { data: queueData } = useSWR<{ count: number }>(
    role === 'admin' ? '/api/admin/queue/count' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 30000 }
  )
  const queueCount = queueData?.count ?? 0

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
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col justify-between border-r border-zinc-900 bg-zinc-950 p-3">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-1 pt-1">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-zinc-100">
              <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">Matchmaker</span>
          </Link>
        </div>

        <WorkspacePill role={role} />

        <div>
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
            {role === 'admin' ? 'Admin' : 'Coach'}
          </div>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <NavItem
                  key={item.href + item.label}
                  item={item}
                  isActive={isActive}
                  badge={item.showBadge ? queueCount : undefined}
                />
              )
            })}
          </nav>
        </div>
      </div>

      <div className="border-t border-zinc-900 pt-2">
        <UserRow name={userName} email={userEmail} role={role} onSignOut={handleSignOut} />
      </div>
    </aside>
  )
}
