import { Sidebar } from './sidebar'
import { Suspense } from 'react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-200 [color-scheme:dark]">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: 240 }}>
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-12 py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
