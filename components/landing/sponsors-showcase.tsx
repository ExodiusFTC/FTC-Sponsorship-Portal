'use client'

import { FadeUp } from '@/components/motion/fade-up'
import { ReactNode } from 'react'

interface SponsorLogo {
  name: string
  icon?: ReactNode
  color?: string
  website?: string
}

const SPONSORS_ROW_1: SponsorLogo[] = [
  { name: 'stripe', color: '#635bff', website: 'https://stripe.com' },
  { name: 'OpenAI', icon: <span className="text-2xl">🌀</span>, website: 'https://openai.com' },
  { name: 'Linear', icon: <span className="w-7 h-7 rounded-full border-[2.5px] border-current flex items-center justify-center"><span className="w-full h-0.5 bg-current transform rotate-45"></span></span>, website: 'https://linear.app' },
  { name: 'Apple', icon: <span className="text-3xl"></span>, website: 'https://apple.com' },
  { name: 'Google', icon: <span className="font-bold text-3xl"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>, website: 'https://google.com' },
  { name: 'SpaceX', icon: <span className="text-2xl">🚀</span>, website: 'https://spacex.com' },
  { name: 'NVIDIA', color: '#76b900', icon: <span className="w-6 h-6 bg-current rounded-sm rotate-45"></span>, website: 'https://nvidia.com' },
  { name: 'Vercel', icon: <span className="text-3xl">▲</span>, website: 'https://vercel.com' },
]

const SPONSORS_ROW_2: SponsorLogo[] = [
  { name: 'Microsoft', icon: <div className="grid grid-cols-2 gap-0.5 w-6 h-6"><div className="bg-[#f25022] w-full h-full"></div><div className="bg-[#7fba00] w-full h-full"></div><div className="bg-[#00a4ef] w-full h-full"></div><div className="bg-[#ffb900] w-full h-full"></div></div>, website: 'https://microsoft.com' },
  { name: 'Meta', icon: <span className="text-3xl font-bold text-[#0668E1]">∞</span>, website: 'https://meta.com' },
  { name: 'Amazon', icon: <span className="text-2xl font-bold">amazon<span className="text-[#ff9900]">.</span></span>, website: 'https://amazon.com' },
  { name: 'Tesla', icon: <span className="text-2xl font-black text-[#E31937]">T</span>, website: 'https://tesla.com' },
  { name: 'Netflix', icon: <span className="text-3xl font-black text-[#E50914]">N</span>, website: 'https://netflix.com' },
  { name: 'Discord', icon: <span className="text-3xl">🎮</span>, website: 'https://discord.com' },
  { name: 'Slack', icon: <span className="text-2xl">#️⃣</span>, website: 'https://slack.com' },
  { name: 'Supabase', icon: <span className="text-3xl text-[#3ecf8e]">⚡</span>, website: 'https://supabase.com' },
]

const SPONSORS_ROW_3: SponsorLogo[] = [
  { name: 'Adobe', color: '#ff0000', icon: <span className="w-7 h-7 bg-[#ff0000] flex items-center justify-center text-[14px] text-white rounded-sm font-bold">A</span>, website: 'https://adobe.com' },
  { name: 'Figma', icon: <div className="flex flex-col gap-0.5"><div className="flex gap-0.5"><div className="w-3 h-3 rounded-l-full bg-[#F24E1E]"></div><div className="w-3 h-3 rounded-full bg-[#FF7262]"></div></div><div className="flex gap-0.5"><div className="w-3 h-3 rounded-l-full bg-[#A259FF]"></div><div className="w-3 h-3 rounded-full bg-[#1ABCFE]"></div></div><div className="w-3 h-3 rounded-bl-full bg-[#0ACF83]"></div></div>, website: 'https://figma.com' },
  { name: 'DATADOG', icon: <span className="text-2xl">🐕</span>, website: 'https://datadoghq.com' },
  { name: 'ramp', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-45"><path d="M5 12h14M12 5l7 7-7 7" /></svg>, website: 'https://ramp.com' },
  { name: 'Docker', icon: <span className="text-3xl">🐋</span>, website: 'https://docker.com' },
  { name: 'Github', icon: <span className="text-3xl">🐱</span>, website: 'https://github.com' },
  { name: 'Notion', icon: <span className="text-3xl">📝</span>, website: 'https://notion.so' },
  { name: 'Spotify', icon: <span className="text-3xl text-[#1DB954]">🎧</span>, website: 'https://spotify.com' },
]

function SponsorCard({ sponsor }: { sponsor: SponsorLogo }) {
  return (
    <a
      href={sponsor.website}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-none flex h-[110px] w-[220px] items-center justify-center rounded-2xl bg-card border border-primary/20 transition-all duration-300 shadow-[0_0_15px_-5px_rgba(0,0,0,0.1)] text-foreground cursor-pointer mx-4 hover:brightness-95 dark:hover:brightness-125"
    >
      <div className="flex items-center justify-center select-none transition-all">
        <div className="flex items-center gap-3">
          {sponsor.icon && <span style={{ color: sponsor.color }}>{sponsor.icon}</span>}
          <span
            className="font-bold text-[24px] tracking-tight"
            style={{ color: sponsor.color }}
          >
            {sponsor.name === 'stripe' ? <span className="text-4xl lowercase">{sponsor.name}</span> : sponsor.name}
          </span>
        </div>
      </div>
    </a>
  )
}

export function SponsorsShowcase() {
  return (
    <section id="sponsors" className="w-full pb-24 pt-6 overflow-hidden">
      <FadeUp>
        <div className="text-center text-[13px] font-medium tracking-widest uppercase text-primary/60 mb-16">
          The Partners Powering Your Season
        </div>
      </FadeUp>

      <div className="mx-auto max-w-[1600px] px-6 lg:px-12 flex flex-col gap-8">
        {/* Row 1: Rotating Left */}
        <div className="relative flex overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
          <div className="flex animate-marquee-left whitespace-nowrap">
            {[...SPONSORS_ROW_1, ...SPONSORS_ROW_1, ...SPONSORS_ROW_1].map((s, i) => (
              <SponsorCard key={`r1-${i}`} sponsor={s} />
            ))}
          </div>
        </div>

        {/* Row 2: Rotating Right */}
        <div className="relative flex overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
          <div className="flex animate-marquee-right whitespace-nowrap">
            {[...SPONSORS_ROW_2, ...SPONSORS_ROW_2, ...SPONSORS_ROW_2].map((s, i) => (
              <SponsorCard key={`r2-${i}`} sponsor={s} />
            ))}
          </div>
        </div>

        {/* Row 3: Rotating Left */}
        <div className="relative flex overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
          <div className="flex animate-marquee-left whitespace-nowrap">
            {[...SPONSORS_ROW_3, ...SPONSORS_ROW_3, ...SPONSORS_ROW_3].map((s, i) => (
              <SponsorCard key={`r3-${i}`} sponsor={s} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-33.33%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marquee-left 40s linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right 40s linear infinite;
        }
      `}</style>
    </section>
  )
}

