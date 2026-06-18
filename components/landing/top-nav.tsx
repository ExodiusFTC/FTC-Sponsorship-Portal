'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

export function TopNav() {
  const [scrolled, setScrolled] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!mounted) return null

  const isLight = resolvedTheme === 'light'

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'backdrop-blur-xl bg-background/80 border-b border-border'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="text-foreground transition-transform group-hover:rotate-12"
          >
            <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-foreground">FTC Matchmaker</span>
        </Link>

        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 rounded-full border border-border/80 bg-background/40 p-1.5 backdrop-blur-md shadow-sm">
          <a href="#sponsors" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">Sponsors</a>
          <a href="#product" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">Product</a>
          <a href="#how" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">How it works</a>
          <a href="#faq" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">FAQ</a>
          <div className="w-px h-4 bg-border/80 mx-1" />
          <button
            onClick={toggleTheme}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {isLight ? <Moon className="w-4 h-4" strokeWidth={2} /> : <Sun className="w-4 h-4" strokeWidth={2} />}
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Open portal
          </Link>
        </div>
      </div>
    </header>
  )
}
