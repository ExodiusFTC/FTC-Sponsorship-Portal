'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FadeUp } from '@/components/motion/fade-up'

export function CtaBand() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <FadeUp className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900/40 p-12 sm:p-16 text-center">
        <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[560px] rounded-full bg-indigo-500/10 blur-3xl" />
        <h2 className="relative text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-50">
          Stop spraying. Start pitching.
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-zinc-400">
          Build one portfolio, dispatch reviewed pitches, track every sponsor response. All from a
          single invite-only portal.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white transition-colors active:scale-[0.98]"
          >
            Get started as a coach
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
          </Link>
          <Link
            href="/sponsors/apply"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
          >
            Apply as a sponsor
          </Link>
        </div>
      </FadeUp>
    </section>
  )
}
