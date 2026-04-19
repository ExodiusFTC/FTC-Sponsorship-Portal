'use client'

import { FadeUp } from '@/components/motion/fade-up'

const LOGO_CARDS = [
  'stripe',
  'OpenAI',
  'Linear',
  'DATADOG',
  'NVIDIA',
  'Figma',
  'ramp',
  'Adobe',
]

export function SponsorsShowcase() {
  return (
    <section id="sponsors" className="mx-auto max-w-5xl px-6 pb-24 pt-6">
      <FadeUp>
        <div className="text-center text-[13px] font-medium tracking-wide text-muted-foreground mb-8">

        </div>
      </FadeUp>

      <FadeUp delay={0.1} className="w-full">
        {/*
          Seamless infinite marquee scroll.
          Mask gradient applies a fade out at the edges.
        */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        >
          <div
            className="flex w-max"
            style={{ animation: 'sponsors-marquee 35s linear infinite' }}
          >
            {/* First sequence */}
            <div className="flex gap-4 pr-4">
              {LOGO_CARDS.map((name, i) => (
                <div
                  key={`a-${i}`}
                  className="group flex-none flex h-[72px] w-[150px] items-center justify-center rounded-xl bg-card border border-border transition-colors hover:bg-accent hover:border-border hover:text-foreground text-muted-foreground shadow-sm cursor-default"
                >
                  <div className="opacity-90 flex items-center justify-center select-none transition-opacity group-hover:opacity-100">
                    {name === 'stripe' ? (
                      <span className="font-bold tracking-tighter text-2xl lowercase">{name}</span>
                    ) : name === 'Linear' ? (
                      <span className="flex items-center gap-2.5 font-medium text-[20px] leading-none">
                        <span className="w-5 h-5 rounded-full overflow-hidden border-[1.5px] border-current opacity-80 flex items-center justify-center">
                          <span className="w-full h-0.5 bg-current transform rotate-45"></span>
                        </span>
                        {name}
                      </span>
                    ) : name === 'DATADOG' ? (
                      <span className="font-bold tracking-normal text-[15px] flex items-center gap-2">
                        <span className="text-xl">🐕</span>{name}
                      </span>
                    ) : name === 'ramp' ? (
                      <span className="font-medium text-[22px] leading-none flex items-center gap-1.5 lowercase">
                        {name}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 rotate-45">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    ) : name === 'OpenAI' ? (
                      <span className="font-semibold text-[20px]">{name}</span>
                    ) : name === 'NVIDIA' ? (
                      <span className="font-bold text-[18px] tracking-widest flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-current rounded-sm rotate-45 opacity-80"></span>
                        {name}
                      </span>
                    ) : name === 'Adobe' ? (
                      <span className="font-black text-[22px] tracking-tight flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-[#ff0000] flex items-center justify-center text-[10px] text-white">A</span>
                        {name}
                      </span>
                    ) : (
                      <span className="font-medium text-[20px]">{name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Seamless ghost wrapper */}
            <div className="flex gap-4 pr-4" aria-hidden>
              {LOGO_CARDS.map((name, i) => (
                <div
                  key={`b-${i}`}
                  className="group flex-none flex h-[72px] w-[150px] items-center justify-center rounded-xl bg-card border border-border transition-colors hover:bg-accent hover:border-border hover:text-foreground text-muted-foreground shadow-sm cursor-default"
                >
                  <div className="opacity-90 flex items-center justify-center select-none transition-opacity group-hover:opacity-100">
                    {name === 'stripe' ? (
                      <span className="font-bold tracking-tighter text-2xl lowercase">{name}</span>
                    ) : name === 'Linear' ? (
                      <span className="flex items-center gap-2.5 font-medium text-[20px] leading-none">
                        <span className="w-5 h-5 rounded-full overflow-hidden border-[1.5px] border-current opacity-80 flex items-center justify-center">
                          <span className="w-full h-0.5 bg-current transform rotate-45"></span>
                        </span>
                        {name}
                      </span>
                    ) : name === 'DATADOG' ? (
                      <span className="font-bold tracking-normal text-[15px] flex items-center gap-2">
                        <span className="text-xl">🐕</span>{name}
                      </span>
                    ) : name === 'ramp' ? (
                      <span className="font-medium text-[22px] leading-none flex items-center gap-1.5 lowercase">
                        {name}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 rotate-45">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    ) : name === 'OpenAI' ? (
                      <span className="font-semibold text-[20px]">{name}</span>
                    ) : name === 'NVIDIA' ? (
                      <span className="font-bold text-[18px] tracking-widest flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-current rounded-sm rotate-45 opacity-80"></span>
                        {name}
                      </span>
                    ) : name === 'Adobe' ? (
                      <span className="font-black text-[22px] tracking-tight flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-[#ff0000] flex items-center justify-center text-[10px] text-white">A</span>
                        {name}
                      </span>
                    ) : (
                      <span className="font-medium text-[20px]">{name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeUp>

      <style>{`
        @keyframes sponsors-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
