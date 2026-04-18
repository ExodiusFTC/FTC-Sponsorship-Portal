'use client'

import { FadeUp } from '@/components/motion/fade-up'
import { MARQUEE_SPONSORS } from '@/lib/site-config'

export function LogosRail() {
  // Duplicate once so the marquee loop is seamless
  const items = [...MARQUEE_SPONSORS, ...MARQUEE_SPONSORS]

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <FadeUp>
        <div className="text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
          Trusted by sponsors across robotics, aerospace, and local philanthropy
        </div>
      </FadeUp>

      <div
        className="relative mt-8 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div
          className="flex gap-12"
          style={{ animation: 'marquee 40s linear infinite' }}
        >
          {items.map((name, i) => (
            <span
              key={i}
              className="shrink-0 font-serif text-xl tracking-widest text-zinc-600 hover:text-zinc-300 transition-colors select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
