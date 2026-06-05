import { Sidebar } from './sidebar'
import { Suspense } from 'react'
import { CommandPaletteProvider } from './command-palette-provider'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto ml-60">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-12 py-10">
          {children}
        </div>
      </main>
      <CommandPaletteProvider />
    </div>
  )
}
