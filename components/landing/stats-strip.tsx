'use client'

import { motion, useMotionValue, useReducedMotion, useTransform, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container'

const stats = [
  { label: 'Teams onboarded', value: 214, suffix: '+' },
  { label: 'Sponsors active', value: 48, suffix: '' },
  { label: 'Avg. review time', value: 6, suffix: 'h' },
  { label: 'Emails dispatched', value: 1723, suffix: '' },
]

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? to : 0)
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString())
  const [display, setDisplay] = useState(reduce ? to.toLocaleString() : '0')
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => unsub()
  }, [rounded])

  useEffect(() => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          animate(mv, to, { duration: 1.2, ease: [0.22, 1, 0.36, 1] })
        }
      },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [mv, to, reduce])

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

export function StatsStrip() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((s) => (
          <StaggerItem
            key={s.label}
            className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5 backdrop-blur transition-colors hover:border-zinc-700"
          >
            <div className="text-3xl font-semibold tracking-tight text-zinc-50">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-zinc-500">{s.label}</div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  )
}
