'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, Activity, CheckCircle2 } from 'lucide-react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  DISPATCH_SEASON_LABEL,
  HERO_DESCRIPTION,
  HERO_MORPHING_WORDS
} from '@/lib/site-config'
import { StatCard } from '@/components/ui/stat-card'

function MorphingWord() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_MORPHING_WORDS.length)
    }, 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="relative text-left text-primary inline-flex justify-center" style={{ width: '280px' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
          transition={{ duration: 0.4 }}
          className="absolute"
        >
          {HERO_MORPHING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
      <span className="invisible">{HERO_MORPHING_WORDS[0]}</span>
    </span>
  )
}

function ProductHeroMock() {
  return (
    <div className="relative mx-auto mt-20 w-full max-w-5xl pb-10">
      <div 
        className="relative rounded-xl border border-border/80 bg-background/50 shadow-2xl backdrop-blur-md overflow-hidden"
        style={{ transform: 'perspective(1200px) rotateX(2deg)', transformOrigin: 'top center' }}
      >
        {/* Browser Chrome */}
        <div className="flex h-12 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur-sm">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#E7E1D6]" />
            <div className="h-3 w-3 rounded-full bg-[#E7E1D6]" />
            <div className="h-3 w-3 rounded-full bg-[#E7E1D6]" />
          </div>
        </div>
        {/* Mock Content */}
        <div className="p-6 md:p-10 bg-card text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              icon={Search}
              label="Potential Matches"
              value="12"
              description="3 high-confidence fits"
              className="bg-background shadow-none"
            />
            <StatCard 
              icon={Activity}
              label="Active Pitches"
              value="4"
              description="Awaiting response"
              progress={65}
              className="bg-background shadow-none"
            />
            <StatCard 
              icon={CheckCircle2}
              label="Funds Secured"
              value="$4,200"
              description="Goal: $5,000"
              progress={84}
              className="bg-background shadow-none"
            />
          </div>
          {/* Mock Submission Row */}
          <div className="mt-8 rounded-xl border border-border bg-background p-5 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-secondary border border-border flex items-center justify-center">
                  <div className="h-6 w-6 rounded bg-muted-foreground/20" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-40 rounded bg-foreground/10" />
                  <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                </div>
             </div>
             <div className="h-8 w-28 rounded-full bg-primary/10 flex items-center justify-center">
               <div className="h-2 w-16 bg-primary/40 rounded-full" />
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const [shouldShow, setShouldShow] = useState(false)
  const init = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
  const show = { opacity: 1, y: 0 }

  useEffect(() => {
    const handleComplete = () => setShouldShow(true)
    window.addEventListener('initial-loader-complete', handleComplete)
    const fallback = setTimeout(() => setShouldShow(true), 5000)
    return () => {
      window.removeEventListener('initial-loader-complete', handleComplete)
      clearTimeout(fallback)
    }
  }, [])

  return (
    <section className="relative pt-32 pb-10 lg:pt-40 lg:pb-16 flex flex-col items-center overflow-hidden">
      {/* dot-grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />
      {/* warm radial glow */}
      <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />

      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 w-full flex flex-col items-center text-center">
        {/* season pill */}
        <motion.div
          initial={init}
          animate={show}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground shadow-sm"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          {DISPATCH_SEASON_LABEL}
        </motion.div>

        {/* headline */}
        <motion.h1
          initial={init}
          animate={show}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-4xl text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-foreground leading-[1.1]"
        >
          Land your next{' '}
          <MorphingWord />
          {' '}and fuel your FTC journey.
        </motion.h1>

        <motion.p
          initial={init}
          animate={show}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-muted-foreground mx-auto"
        >
          {HERO_DESCRIPTION}
        </motion.p>

        {/* CTAs - Pill style */}
        <motion.div
          initial={init}
          animate={show}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-[#181818] px-7 py-3.5 text-sm font-medium text-white hover:bg-[#181818]/90 transition-colors active:scale-[0.98] shadow-sm"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
          </Link>
          <Link
            href="/sponsors/apply"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm"
          >
            Sponsor a team
          </Link>
        </motion.div>

        {/* Product UI Showcase */}
        <motion.div
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, y: 40 }}
          animate={shouldShow ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 1.0, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <ProductHeroMock />
        </motion.div>
      </div>
    </section>
  )
}
