'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GooeyText } from '@/components/ui/gooey-text-morphing'

export function InitialLoader() {
  const [isLoading, setIsLoading] = useState(true)
  const loaderTexts = useMemo(() => ["FTC", "Sponsorships", "Simplified"], [])

  useEffect(() => {
    // Exactly 3 seconds total as requested
    const timer = setTimeout(() => {
      setIsLoading(false)
      // Signal to other components (like the Hero Globe) that they can now begin heavy rendering
      window.dispatchEvent(new CustomEvent('initial-loader-complete'))
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background pointer-events-none"
          style={{ willChange: "opacity" }}
        >
          <GooeyText 
            texts={loaderTexts}
            morphTime={0.6}
            cooldownTime={0.4}
            loop={false}
            className="w-full"
            textClassName="text-foreground font-bold tracking-tighter"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
