'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Gauge, LineChart } from 'lucide-react'
import { FadeUp } from '@/components/motion/fade-up'
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container'

const SPONSOR_VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: 'Vetted teams only',
    body: 'Every team is led by an identity-verified adult coach. You review real portfolios — never anonymous asks.',
  },
  {
    icon: Gauge,
    title: 'You set the cap',
    body: 'Declare a funding cap up front. It is enforced at the database level, so you can never be over-committed.',
  },
  {
    icon: LineChart,
    title: 'Trackable impact',
    body: 'Each pitch is tied to a specific budget and team story, so you can see exactly where your dollars go.',
  },
]

export function SponsorsShowcase() {
  return (
    <section id="sponsors" className="mx-auto max-w-[1440px] px-6 py-24">
      <FadeUp className="max-w-2xl">
        <p className="text-xs font-mono uppercase tracking-[0.15em] text-indigo-300/70">For sponsors</p>
        <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Back a team in this season&apos;s founding cohort.
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          FTC Matchmaker is new — and so is our sponsor roster. That means your company can be one of the first
          names a team sees. No inflated logos, no made-up numbers; just verified FTC teams looking for real
          support.
        </p>
      </FadeUp>

      <StaggerContainer className="mt-12 grid gap-px bg-border rounded-xl border border-border overflow-hidden sm:grid-cols-3">
        {SPONSOR_VALUE_PROPS.map((f) => {
          const Icon = f.icon
          return (
            <StaggerItem key={f.title} className="bg-background p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-base font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </StaggerItem>
          )
        })}
      </StaggerContainer>

      <FadeUp delay={0.1} className="mt-10">
        <Link
          href="/sponsors/apply"
          className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          Become a sponsor
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
        </Link>
      </FadeUp>
    </section>
  )
}
