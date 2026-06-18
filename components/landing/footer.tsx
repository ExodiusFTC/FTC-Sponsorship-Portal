import Link from 'next/link'
import { Globe, Mail, AtSign } from 'lucide-react'
import { FOOTER_COLUMNS, FOOTER_SOCIALS, CURRENT_SEASON } from '@/lib/site-config'

const ICON_MAP = { Globe, Mail, AtSign } as const
type IconKey = keyof typeof ICON_MAP

export function LandingFooter() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="mx-auto max-w-[1440px] px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-foreground">
                <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              </svg>
              <span className="text-sm font-semibold text-foreground">FTC Matchmaker</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The moderated sponsorship pipeline for FIRST Tech Challenge. Built for coaches,
              enforced by row-level security.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {FOOTER_SOCIALS.map((s) => {
                const Icon = ICON_MAP[s.icon as IconKey]
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </a>
                )
              })}
            </div>
          </div>

          {/* link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
          <span suppressHydrationWarning>© {new Date().getFullYear()} FTC Matchmaker</span>
          <span className="font-mono">Built for Season {CURRENT_SEASON}</span>
        </div>
      </div>
    </footer>
  )
}
