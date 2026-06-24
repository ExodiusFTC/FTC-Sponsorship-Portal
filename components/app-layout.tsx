import { TopNav } from './top-nav'
import { Suspense } from 'react'
import { CommandPaletteProvider } from './command-palette-provider'

export function AppLayout({
  children,
  role,
}: {
  children: React.ReactNode
  role?: 'coach' | 'admin' | 'sponsor'
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Suspense fallback={<div className="h-14 border-b border-border bg-card" />}>
        <TopNav role={role} />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-6 py-8 sm:px-8 lg:px-12">
          {children}
        </div>
      </main>
      <CommandPaletteProvider />
    </div>
  )
}
