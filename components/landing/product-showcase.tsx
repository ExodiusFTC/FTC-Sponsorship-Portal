'use client'

import { Check } from 'lucide-react'
import { FadeUp } from '@/components/motion/fade-up'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { PORTFOLIO_MOCK, MODERATION_MOCK_ROWS } from '@/lib/site-config'

export function ProductShowcase({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  flipped = false,
}: {
  eyebrow?: string
  title: string
  body: string
  bullets: string[]
  visual: ReactNode
  flipped?: boolean
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-6 py-24">
      <div className={cn('grid gap-12 lg:grid-cols-2 lg:gap-16 items-center', flipped && 'lg:[&>*:first-child]:order-2')}>
        <FadeUp>
          {eyebrow && <p className="text-xs font-mono uppercase tracking-[0.15em] text-indigo-300/70">{eyebrow}</p>}
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{body}</p>
          <ul className="mt-8 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-border bg-accent">
                  <Check className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={2.5} />
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
  const { teamNumber, teamName, budgetItems } = PORTFOLIO_MOCK
  return (
    <div className="relative rounded-2xl border border-border bg-background/80 p-3 shadow-2xl shadow-indigo-500/5 backdrop-blur">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 font-mono text-[10px] text-muted-foreground">ftcmatchmaker.app/portfolio</span>
      </div>
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Team {teamNumber}</div>
            <div className="text-sm font-medium text-foreground">{teamName}</div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Verified
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Story', 'Budget', 'Achievements'].map((s) => (
            <div key={s} className="rounded-md border border-border bg-accent/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s}</div>
              <div className="mt-2 h-1 rounded-full bg-border">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {budgetItems.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-mono text-foreground tabular-nums">{r.funded} / {r.goal}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ModerationMock() {
  return (
    <div className="relative rounded-2xl border border-border bg-background/80 p-3 shadow-2xl shadow-emerald-500/5 backdrop-blur">
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-medium text-foreground">Review Queue</div>
          <span className="rounded-md border border-border bg-accent px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {MODERATION_MOCK_ROWS.length} pending
          </span>
        </div>
        <div className="divide-y divide-border">
          {MODERATION_MOCK_ROWS.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-xs">
              <div>
                <div className="font-mono text-foreground">{r.to}</div>
                <div className="text-muted-foreground mt-0.5">{r.team}</div>
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
    pending: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    approved: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    changes: 'border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400',
  } as const
  const dot = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    changes: 'bg-rose-500',
  } as const
  const label = { pending: 'Pending', approved: 'Approved', changes: 'Needs changes' }[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium', map[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot[status])} />
      {label}
    </span>
  )
}
