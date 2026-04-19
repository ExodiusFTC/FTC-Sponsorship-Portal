'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  DISPATCH_SEASON_LABEL,
  HERO_DESCRIPTION,
  ACCENT_BASE
} from '@/lib/site-config'

// Lazy-load the heavy canvas globe — no SSR
const HeroGlobe = dynamic(
  () => import('@/components/landing/hero-globe').then(mod => mod.HeroGlobe),
  { ssr: false }
)

export function Hero() {
  const reduce = useReducedMotion()
  const init = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
  const show = { opacity: 1, y: 0 }

  return (
    <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 overflow-hidden">
      {/* dot-grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 30%, #000 40%, transparent 100%)',
        }}
      />
      {/* ambient glow — shifted left to illuminate text side */}
      <div aria-hidden className="absolute left-1/3 top-16 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      {/* secondary glow on globe side */}
      <div aria-hidden className="absolute right-0 top-10 -z-10 h-[480px] w-[480px] rounded-full bg-indigo-500/8 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12">
          {/* ── Left: Text content ──────────────────────────────────────── */}
          <div className="text-center lg:text-left">
            {/* season pill */}
            <motion.div
              initial={init}
              animate={show}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {DISPATCH_SEASON_LABEL}
            </motion.div>

            {/* headline */}
            <motion.h1
              initial={init}
              animate={show}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight text-foreground leading-[1.1]"
            >
              Land your next{' '}
              <span className="text-accent-text">sponsorship</span>
              {' '}and fuel your FTC journey.
            </motion.h1>

            <motion.p
              initial={init}
              animate={show}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground mx-auto lg:mx-0"
            >
              {HERO_DESCRIPTION}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={init}
              animate={show}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-3"
            >
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
              </Link>
              <Link
                href="/sponsors/apply"
                className="inline-flex items-center gap-2 rounded-md bg-accent border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors active:scale-[0.98]"
              >
                Sponsor a team
              </Link>
            </motion.div>
          </div>

          {/* ── Right: 3D Globe ─────────────────────────────────────────── */}
          <motion.div
            initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[400px] sm:h-[480px] lg:h-[560px] xl:h-[620px] w-full"
          >
            <HeroGlobe className="w-full h-full" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
