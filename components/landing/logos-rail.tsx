'use client'

import { FadeUp } from '@/components/motion/fade-up'
import { SPONSORS_SHOWCASE } from '@/lib/site-config'

export function LogosRail() {
  // Duplicate once so the marquee loop is seamless
  const sponsorNames = SPONSORS_SHOWCASE.map(s => s.name)
  const items = [...sponsorNames, ...sponsorNames]

  return (
    <div className="mx-auto max-w-6xl px-6 pt-28 pb-20">
      <FadeUp>
        <div className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by industry leaders, organizations, and sponsors from all over the world
        </div>
      </FadeUp>

      <div
        className="relative mt-12 overflow-hidden"
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
              className="shrink-0 font-mono text-xl tracking-widest text-muted-foreground hover:text-foreground transition-colors select-none"
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
    </div>
  )
}
