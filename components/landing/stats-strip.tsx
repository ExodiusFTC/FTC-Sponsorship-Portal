'use client'

import { motion, useMotionValue, useReducedMotion, useTransform, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { StaggerContainer, StaggerItem } from '@/components/motion/stagger-container'
import { PLATFORM_STATS } from '@/lib/site-config'

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
        {PLATFORM_STATS.map((s) => (
          <StaggerItem
            key={s.label}
            className="rounded-xl border border-border/80 bg-background/60 p-5 backdrop-blur transition-colors hover:border-border"
          >
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  )
}
