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
        <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50">
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
            stroke="url(#line-grad)"
            strokeWidth="1"
            strokeDasharray="4 4"
            initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <defs>
            <linearGradient id="line-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="rgb(63 63 70)" />
              <stop offset="0.5" stopColor="rgb(113 113 122)" />
              <stop offset="1" stopColor="rgb(63 63 70)" />
            </linearGradient>
          </defs>
        </svg>

        <StaggerContainer className="grid gap-8 md:grid-cols-4">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <StaggerItem key={s.label}>
                <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur">
                  <Icon className="h-6 w-6 text-zinc-200" strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
                    {s.label}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-medium text-zinc-100">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}
