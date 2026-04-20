'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GooeyText } from '@/components/ui/gooey-text-morphing'

export function InitialLoader() {
  const [isLoading, setIsLoading] = useState(true)
  const loaderTexts = useMemo(() => ["FTC", "Sponsorships", "Simplified"], [])
  useEffect(() => {
    // Lock scroll on both body and html element for maximum compatibility
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    // 3.5 seconds total duration for a snappier feel
    const timer = setTimeout(() => {
      setIsLoading(false)
      // Unlock scroll
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      window.dispatchEvent(new CustomEvent('initial-loader-complete'))
    }, 3500)

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          style={{ willChange: "opacity" }}
        >
          <div className="flex flex-col items-center justify-center w-full max-w-sm h-full">
            <GooeyText 
              texts={loaderTexts}
              morphTime={0.8}
              cooldownTime={0.7}
              loop={false}
              className="w-full"
              textClassName="text-white dark:text-white font-bold tracking-tighter"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
