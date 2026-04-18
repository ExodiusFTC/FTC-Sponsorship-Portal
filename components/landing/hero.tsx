'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { GooeyText } from '@/components/ui/gooey-text'

export function Hero() {
  const reduce = useReducedMotion()
  const init = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
  const show = { opacity: 1, y: 0 }

  return (
    <section className="relative pt-40 pb-24 overflow-hidden">
      {/* grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(39 39 42 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 30%, #000 40%, transparent 100%)',
        }}
      />
      {/* glow */}
      <div aria-hidden className="absolute left-1/2 top-20 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={init}
          animate={show}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-400 backdrop-blur"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Season 2026 dispatch window open
        </motion.div>

        <motion.h1
          initial={init}
          animate={show}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-zinc-50 leading-[1.02]"
        >
          Every sponsor{' '}
          <GooeyText
            texts={['pitch', 'deck', 'email', 'ask']}
            className="text-indigo-300"
          />
          ,
          <br />
          reviewed before it ships.
        </motion.h1>

        <motion.p
          initial={init}
          animate={show}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-400"
        >
          Matchmaker is the moderated sponsorship pipeline for FIRST Tech Challenge coaches.
          Build one portfolio. Send tailored pitches. Ship nothing that hasn&apos;t been approved.
        </motion.p>

        <motion.div
          initial={init}
          animate={show}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white transition-colors active:scale-[0.98]"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
            <kbd className="ml-1 inline-flex items-center rounded bg-zinc-900/30 px-1.5 text-[10px] font-mono text-zinc-700 border border-zinc-900/20">⌘↵</kbd>
          </Link>
          <Link
            href="/sponsors/apply"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-900 hover:border-zinc-700 transition-colors backdrop-blur"
          >
            Sponsor a team
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
