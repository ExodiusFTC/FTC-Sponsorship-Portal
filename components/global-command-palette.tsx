'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from 'cmdk'
import { LayoutDashboard, BookOpen, Target, FileText, Inbox, BarChart2, Wallet, Settings, LogOut, Building2, Users, Search } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'

interface PaletteAction {
  label: string
  group: string
  icon: React.ReactNode
  run: (router: ReturnType<typeof useRouter>) => void
}

const coachActions: PaletteAction[] = [
  { label: 'Overview',       group: 'Navigate', icon: <LayoutDashboard className="h-4 w-4" />, run: r => r.push('/dashboard') },
  { label: 'Portfolio',      group: 'Navigate', icon: <BookOpen className="h-4 w-4" />,        run: r => r.push('/dashboard?tab=portfolio') },
  { label: 'Find Sponsors',  group: 'Navigate', icon: <Target className="h-4 w-4" />,          run: r => r.push('/dashboard?tab=find-sponsors') },
  { label: 'Submissions',    group: 'Navigate', icon: <FileText className="h-4 w-4" />,        run: r => r.push('/dashboard?tab=submissions') },
  { label: 'Inbox',          group: 'Navigate', icon: <Inbox className="h-4 w-4" />,           run: r => r.push('/dashboard?tab=inbox') },
  { label: 'Insights',       group: 'Navigate', icon: <BarChart2 className="h-4 w-4" />,       run: r => r.push('/dashboard?tab=insights') },
  { label: 'Ledger',         group: 'Navigate', icon: <Wallet className="h-4 w-4" />,          run: r => r.push('/dashboard?tab=ledger') },
  { label: 'Settings',       group: 'Navigate', icon: <Settings className="h-4 w-4" />,        run: r => r.push('/dashboard?tab=settings') },
]

const adminActions: PaletteAction[] = [
  { label: 'Admin Dashboard', group: 'Navigate', icon: <LayoutDashboard className="h-4 w-4" />, run: r => r.push('/admin') },
  { label: 'Moderation Queue',group: 'Navigate', icon: <Inbox className="h-4 w-4" />,           run: r => r.push('/moderation') },
  { label: 'Sponsors',        group: 'Navigate', icon: <Building2 className="h-4 w-4" />,       run: r => r.push('/sponsors') },
  { label: 'Teams',           group: 'Navigate', icon: <Users className="h-4 w-4" />,           run: r => r.push('/coaches') },
  { label: 'Analytics',       group: 'Navigate', icon: <BarChart2 className="h-4 w-4" />,       run: r => r.push('/analytics') },
  { label: 'Audit Log',       group: 'Navigate', icon: <FileText className="h-4 w-4" />,        run: r => r.push('/admin/audit') },
]

const accountActions: PaletteAction[] = [
  { label: 'Sign Out', group: 'Account', icon: <LogOut className="h-4 w-4" />, run: () => signOut() },
]

interface Props {
  role?: 'coach' | 'admin' | 'sponsor' | null
}

export function GlobalCommandPalette({ role }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const navActions = role === 'admin' ? adminActions : coachActions
  const allActions = [...navActions, ...accountActions]

  const handleSelect = useCallback((action: PaletteAction) => {
    setOpen(false)
    action.run(router)
  }, [router])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" aria-hidden />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col" shouldFilter>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder="Search actions…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>

          <CommandList className="max-h-80 overflow-y-auto py-2">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </CommandEmpty>

            {(['Navigate', 'Account'] as const).map((group) => {
              const items = allActions.filter((a) => a.group === group)
              if (items.length === 0) return null
              return (
                <CommandGroup key={group} heading={group} className="px-2">
                  <span className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                    {group}
                  </span>
                  {items.map((action) => (
                    <CommandItem
                      key={action.label}
                      value={action.label}
                      onSelect={() => handleSelect(action)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground',
                        'aria-selected:bg-accent aria-selected:text-foreground',
                        'data-[selected=true]:bg-accent data-[selected=true]:text-foreground',
                      )}
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      {action.label}
                    </CommandItem>
                  ))}
                  {group !== 'Account' && <CommandSeparator className="my-1 border-t border-border" />}
                </CommandGroup>
              )
            })}
          </CommandList>

          <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
