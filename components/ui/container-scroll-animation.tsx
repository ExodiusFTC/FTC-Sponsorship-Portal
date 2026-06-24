'use client'

import React, { useRef } from 'react'
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion'

/**
 * Wraps a single card/element and rotates it from a tilted 20° down to flat
 * (with a subtle scale) as it scrolls through the viewport. Adapted from
 * Aceternity's "Container Scroll Animation" for card-only use: no title and
 * no device bezel, so the child keeps its own frame/styling.
 */
export function ContainerScroll({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: containerRef,
    // 0 when the card's top enters the bottom of the viewport,
    // 1 when its bottom leaves the top — flattens around center.
    offset: ['start end', 'end start'],
  })

  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const scaleDimensions = (): [number, number] => (isMobile ? [0.9, 1] : [1.05, 1])

  // Reach flat (0°) / final scale by the time the card is centered, then hold.
  const rotate = useTransform(scrollYProgress, [0, 0.5], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], scaleDimensions())

  if (reduce) {
    return <div className="w-full">{children}</div>
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div style={{ perspective: '1000px' }}>
        <motion.div style={{ rotateX: rotate, scale }} className="w-full">
          {children}
        </motion.div>
      </div>
    </div>
  )
}
