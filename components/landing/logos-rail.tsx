'use client'

import { FadeUp } from '@/components/motion/fade-up'

const logos = [
  'Lockheed', 'Boeing', 'Hertz', 'Acme Robotics', 'Beacon Foundation',
  'Quantum Labs', 'NorthStar', 'Helion', 'Meridian', 'Polaris',
]

export function LogosRail() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <FadeUp>
        <div className="text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
          Trusted by sponsors across robotics, aerospace, and local philanthropy
        </div>
      </FadeUp>
      <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex gap-12 animate-[marquee_40s_linear_infinite]">
          {[...logos, ...logos].map((name, i) => (
            <span
              key={i}
              className="shrink-0 font-serif text-xl tracking-widest text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
