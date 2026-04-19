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
        <div className="text-center text-[13px] font-medium tracking-wide text-zinc-300 mb-8">

        </div>
      </FadeUp>

      <FadeUp delay={0.1} className="w-full">
        {/*
          flex-nowrap prevents the cards from dropping to a second line.
          overflow-x-auto allows horizontal scrolling on smaller screens if they don't fit.
          scrollbar-hide keeps it looking clean.
        */}
        <div className="flex flex-nowrap items-center justify-start lg:justify-center gap-4 overflow-x-auto pb-4 pt-2 -mx-6 px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {LOGO_CARDS.map((name, i) => (
            <div
              key={i}
              className="group flex-none flex h-[72px] w-[150px] items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800/80 transition-colors hover:bg-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-200 shadow-sm cursor-default"
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
      </FadeUp>
    </section>
  )
}
