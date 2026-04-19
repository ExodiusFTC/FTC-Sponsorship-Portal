'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function TopNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'backdrop-blur-xl bg-zinc-950/70 border-b border-zinc-900'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="text-zinc-100 transition-transform group-hover:rotate-12"
          >
            <path d="M9 1L16.5 5.5V12.5L9 17L1.5 12.5V5.5L9 1Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 4L14 7V11.5L9 14.5L4 11.5V7L9 4Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">Matchmaker</span>
        </Link>

        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-950/40 p-1.5 backdrop-blur-md shadow-sm">
          <a href="#sponsors" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">Sponsors</a>
          <a href="#product" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">Product</a>
          <a href="#how" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">How it works</a>
          <a href="#faq" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-3.5 py-1.5 text-sm font-medium text-zinc-950 hover:bg-white transition-colors active:scale-[0.98]"
          >
            Open portal
          </Link>
        </div>
      </div>
    </header>
  )
}
