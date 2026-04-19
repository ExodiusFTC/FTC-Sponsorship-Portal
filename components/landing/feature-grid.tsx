'use client'

import { FileCog, ShieldCheck, Mailbox, GitBranch, Gauge, Lock } from 'lucide-react'
import { FadeUp } from '@/components/motion/fade-up'
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container'

const features = [
  {
    icon: FileCog,
    title: 'One portfolio, every pitch',
    body: 'Ship a single team portfolio and fork it per sponsor — budget, ask, and local angle stay custom without rewriting your story.',
  },
  {
    icon: ShieldCheck,
    title: 'Admin-gated dispatch',
    body: 'Every outbound email passes through a review queue. Nothing leaves the platform until it has been reviewed and approved.',
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
    <section id="product" className="mx-auto max-w-[1440px] px-6 py-24">
      <FadeUp className="max-w-2xl">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Built for coaches who don&apos;t have time to send dozens of cold emails.
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Matchmaker replaces the spray-and-pray sponsorship workflow with a single pipeline that
          your admins, your grantors, and your team lead can all trust.
        </p>
      </FadeUp>

      <StaggerContainer className="mt-12 grid gap-px bg-border rounded-xl border border-border overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <StaggerItem
              key={f.title}
              className="group relative bg-background p-6 transition-colors hover:bg-accent/40"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition-colors group-hover:border-border/80 group-hover:text-foreground">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-base font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </StaggerItem>
          )
        })}
      </StaggerContainer>
    </section>
  )
}
