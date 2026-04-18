'use client'

import { FileCog, ShieldCheck, Mailbox, GitBranch, Gauge, Lock } from 'lucide-react'
import { FadeUp } from '@/components/motion/fade-up'
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container'

const features = [
  {
    icon: FileCog,
    title: 'One portfolio, every pitch',
    body: 'Ship a single Base Resume and fork it per sponsor — budget, ask, and local angle stay custom without rewriting your story.',
  },
  {
    icon: ShieldCheck,
    title: 'Admin-gated dispatch',
    body: 'Every outbound email passes through a moderation queue. Nothing leaves the platform until it has been reviewed and approved.',
  },
  {
    icon: Mailbox,
    title: 'Trackable deliveries',
    body: 'Each pitch gets a signed URL. Know when a sponsor opened it, returned to it, and converted — without a marketing stack.',
  },
  {
    icon: Lock,
    title: 'COPPA by default',
    body: 'Only verified adult coaches register. We never collect student PII and enforce that guarantee in the database, not a policy doc.',
  },
  {
    icon: Gauge,
    title: 'Capacity-aware matching',
    body: 'Funding caps are enforced at the row level. Sponsors cannot be over-committed, even under concurrent submissions.',
  },
  {
    icon: GitBranch,
    title: 'Audit log, not just a log',
    body: 'Every admin action is immutable and queryable. Your advisor, your school district, your grantor — all answerable.',
  },
]

export function FeatureGrid() {
  return (
    <section id="product" className="mx-auto max-w-6xl px-6 py-24">
      <FadeUp className="max-w-2xl">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">{'/// Platform'}</div>
        <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50">
          Built for coaches who don&apos;t have time to send 200 cold emails.
        </h2>
        <p className="mt-4 text-zinc-400 leading-relaxed">
          Matchmaker replaces the spray-and-pray sponsorship workflow with a single pipeline that
          your admins, your grantors, and your team lead can all trust.
        </p>
      </FadeUp>

      <StaggerContainer className="mt-12 grid gap-px bg-zinc-900/80 rounded-xl border border-zinc-900/80 overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <StaggerItem
              key={f.title}
              className="group relative bg-zinc-950 p-6 transition-colors hover:bg-zinc-900/60"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-300 transition-colors group-hover:border-zinc-700 group-hover:text-zinc-100">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-base font-medium text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
            </StaggerItem>
          )
        })}
      </StaggerContainer>
    </section>
  )
}
