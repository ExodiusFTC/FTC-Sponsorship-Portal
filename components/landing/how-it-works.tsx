'use client'

import { UserCheck, Wrench, Send, CheckCircle2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { FadeUp } from '@/components/motion/fade-up'
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container'

const steps = [
  { icon: UserCheck, label: '01', title: 'Apply & verify', body: 'Adult coaches upload credentials. Admin verifies. Student data never enters the system.' },
  { icon: Wrench, label: '02', title: 'Build your base', body: 'One canonical team portfolio — story, budget, achievements, links. Reused everywhere.' },
  { icon: Send, label: '03', title: 'Fork per sponsor', body: 'Customize the ask, local angle, and amount without rewriting your team story.' },
  { icon: CheckCircle2, label: '04', title: 'Dispatch, reviewed', body: 'Admin approves. Matchmaker sends. You get a trackable URL back within hours.' },
]

export function HowItWorks() {
  const reduce = useReducedMotion()
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <FadeUp className="max-w-2xl">
        <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Four steps between your team and a signed check.
        </h2>
      </FadeUp>

      <div className="relative mt-16">
        <svg
          aria-hidden
          className="absolute left-0 right-0 top-10 hidden md:block"
          height="2"
          width="100%"
          viewBox="0 0 1000 2"
          preserveAspectRatio="none"
        >
          <motion.line
            x1="0" x2="1000" y1="1" y2="1"
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth="2"
            strokeDasharray="6 6"
            initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-foreground"
          />
        </svg>

        <StaggerContainer className="grid gap-8 md:grid-cols-4">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <StaggerItem key={s.label}>
                <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background/80 backdrop-blur">
                  <Icon className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 rounded-md border border-border bg-accent px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {s.label}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-medium text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}
