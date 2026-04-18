'use client'

import { Check } from 'lucide-react'
import { FadeUp } from '@/components/motion/fade-up'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function ProductShowcase({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  flipped = false,
}: {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  visual: ReactNode
  flipped?: boolean
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className={cn('grid gap-12 lg:grid-cols-2 lg:gap-16 items-center', flipped && 'lg:[&>*:first-child]:order-2')}>
        <FadeUp>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-indigo-300/80">{`/// ${eyebrow}`}</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50">{title}</h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">{body}</p>
          <ul className="mt-8 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3 text-sm text-zinc-300">
                <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                  <Check className="h-2.5 w-2.5 text-zinc-300" strokeWidth={2.5} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </FadeUp>

        <FadeUp delay={0.1}>{visual}</FadeUp>
      </div>
    </section>
  )
}

export function PortfolioMock() {
  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 shadow-2xl shadow-indigo-500/5 backdrop-blur">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
        <span className="ml-3 font-mono text-[10px] text-zinc-600">matchmaker.app/portfolio</span>
      </div>
      <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500">Team 14523</div>
            <div className="text-sm font-medium text-zinc-100">Circuit Breakers</div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/60 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Verified
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Story', 'Budget', 'Achievements'].map((s) => (
            <div key={s} className="rounded-md border border-zinc-900 bg-zinc-900/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">{s}</div>
              <div className="mt-2 h-1 rounded-full bg-zinc-800">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {[
            { k: 'Outreach, Q3 2025', v: '$2,400 / $5,000' },
            { k: 'Robot build', v: '$1,100 / $2,800' },
            { k: 'Travel to States', v: '$0 / $3,200' },
          ].map((r) => (
            <div key={r.k} className="flex items-center justify-between rounded-md border border-zinc-900 bg-zinc-950 px-3 py-2 text-xs">
              <span className="text-zinc-400">{r.k}</span>
              <span className="font-mono text-zinc-300 tabular-nums">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ModerationMock() {
  const rows = [
    { to: 'sponsorships@acme.io', team: 'Circuit Breakers', status: 'pending' },
    { to: 'gcrane@beacon.org', team: 'Iron Phalanx', status: 'approved' },
    { to: 'community@hertz.co', team: 'Quantum 7', status: 'pending' },
    { to: 'give@lockheed.com', team: 'Circuit Breakers', status: 'changes' },
  ] as const
  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 shadow-2xl shadow-emerald-500/5 backdrop-blur">
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-800" />
        </div>
        <span className="font-mono text-[10px] text-zinc-600">/moderation</span>
      </div>
      <div className="rounded-lg border border-zinc-900 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3">
          <div className="text-sm font-medium text-zinc-100">Moderation Queue</div>
          <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400">4 pending</span>
        </div>
        <div className="divide-y divide-zinc-900">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-xs">
              <div>
                <div className="font-mono text-zinc-300">{r.to}</div>
                <div className="text-zinc-500 mt-0.5">{r.team}</div>
              </div>
              <StatusPill status={r.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: 'pending' | 'approved' | 'changes' }) {
  const map = {
    pending: 'border-amber-900/60 bg-amber-500/5 text-amber-300',
    approved: 'border-emerald-900/60 bg-emerald-500/5 text-emerald-300',
    changes: 'border-rose-900/60 bg-rose-500/5 text-rose-300',
  } as const
  const label = { pending: 'Pending', approved: 'Approved', changes: 'Needs changes' }[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium', map[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'pending' ? 'bg-amber-400' : status === 'approved' ? 'bg-emerald-400' : 'bg-rose-400')} />
      {label}
    </span>
  )
}
