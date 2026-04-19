'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GooeyText } from '@/components/ui/gooey-text-morphing'

export function InitialLoader() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Exactly 3 seconds total (1s per word: FTC, Sponsorships, Simplified)
    const timer = setTimeout(() => {
      setIsLoading(false)
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950"
        >
          <GooeyText
            texts={["FTC", "Sponsorships", "Simplified"]}
            morphTime={1}
            cooldownTime={0.4}
            className="w-full"
            textClassName="text-zinc-50 font-bold tracking-tighter"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
