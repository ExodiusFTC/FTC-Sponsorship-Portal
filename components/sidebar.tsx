'use client'

import React, { useEffect, useRef, useState } from 'react'
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
  Sun,
  Moon,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from './theme-provider'

type Role = 'coach' | 'admin' | null

interface NavItemProps {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
  isActive: boolean
}

function NavItem({ icon: Icon, label, href, badge, isActive }: NavItemProps) {
  const [popKey, setPopKey] = useState(0)

  function handleClick() {
    setPopKey((k) => k + 1)
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background 100ms ease',
        textDecoration: 'none',
        background: isActive ? 'var(--bg-hover)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <span
        key={popKey}
        style={{
          display: 'inline-flex',
          transition: 'transform 150ms ease-out',
          animation: popKey > 0 ? 'navPop 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        <Icon size={16} />
      </span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: isActive ? 500 : 400,
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          flex: 1,
        }}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <AdminBadge count={badge} />
      )}
    </Link>
  )
}

function AdminBadge({ count }: { count: number }) {
  const prevRef = useRef(count)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (prevRef.current !== count) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 300)
      prevRef.current = count
      return () => clearTimeout(t)
    }
  }, [count])

  return (
    <span
      style={{
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        fontSize: '11px',
        fontWeight: 600,
        padding: '1px 7px',
        borderRadius: '9999px',
        border: '1px solid var(--border-color)',
        marginLeft: 'auto',
        animation: pulse ? 'badgePulse 300ms ease-out' : 'none',
      }}
    >
      {count}
    </span>
  )
}

const coachNavItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  { icon: FileText, label: 'My Application', href: '/submissions/new' },
  { icon: Target, label: 'Find Sponsors', href: '/sponsors/browse' },
  { icon: Clock, label: 'Pitch History', href: '/submissions/new' },
  { icon: Settings, label: 'Settings', href: '/team/edit' },
]

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/analytics' },
  { icon: Inbox, label: 'Moderation Queue', href: '/moderation', showBadge: true },
  { icon: Building2, label: 'Sponsors', href: '/sponsors' },
  { icon: Users, label: 'Teams', href: '/coaches' },
  { icon: BarChart2, label: 'Analytics', href: '/analytics' },
]

function LogoBlock() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 10px',
        cursor: 'default',
        transition: 'transform 150ms ease-out',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: 'var(--text-primary)' }}>
        <path
          d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
      </svg>
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
        Matchmaker
      </span>
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const [iconKey, setIconKey] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleClick() {
    setIconKey((k) => k + 1)
    toggle()
  }

  if (!mounted) {
    return (
      <div style={{ width: '32px', height: '32px' }} />
    )
  }

  return (
    <button
      onClick={handleClick}
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        transition: 'background 100ms ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode (M)`}
    >
      <span
        key={iconKey}
        className="icon-enter"
        style={{
          display: 'inline-flex',
          opacity: 1,
          transform: 'rotate(0deg)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        }}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function UserRow({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '6px 10px',
          borderRadius: '6px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background 100ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          {getInitials(name)}
        </div>
        <span style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>
          {name}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: '4px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '4px',
            minWidth: '160px',
            zIndex: 100,
          }}
        >
          <button
            onClick={onSignOut}
            style={{
              display: 'block',
              width: '100%',
              padding: '7px 10px',
              textAlign: 'left',
              fontSize: '14px',
              color: 'var(--text-primary)',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background 100ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Sign Out
          </button>
          <Link
            href="/team/edit"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '7px 10px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              borderRadius: '4px',
              transition: 'background 100ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            Settings
          </Link>
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [userName, setUserName] = useState('User')

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
    <aside
      style={{
        width: '240px',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 12px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'var(--bg-app)',
        zIndex: 30,
      }}
    >
      <div>
        <div style={{ marginBottom: '24px' }}>
          <LogoBlock />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => (
            <NavItem
              key={item.href + item.label}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
              badge={'showBadge' in item && item.showBadge ? queueCount : undefined}
            />
          ))}
        </nav>
      </div>

      <div>
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <ThemeToggle />
          <UserRow name={userName} onSignOut={handleSignOut} />
        </div>
      </div>
    </aside>
  )
}
