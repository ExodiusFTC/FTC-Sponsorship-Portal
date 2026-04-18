import Link from 'next/link'
import { Globe, Mail, AtSign } from 'lucide-react'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'For coaches', href: '/signup' },
      { label: 'For sponsors', href: '/sponsors/apply' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-900 mt-12">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-zinc-100">
                <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              </svg>
              <span className="text-sm font-semibold text-zinc-100">Matchmaker</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              The moderated sponsorship pipeline for FIRST Tech Challenge. Built for coaches,
              enforced by row-level security.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[Globe, Mail, AtSign].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/60 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-100"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
          <span suppressHydrationWarning>© {new Date().getFullYear()} Matchmaker · FTC Sponsorship Portal</span>
          <span className="font-mono">Built for Season 2026</span>
        </div>
      </div>
    </footer>
  )
}
