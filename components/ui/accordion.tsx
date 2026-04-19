'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type AccordionItem = { q: string; a: string }

export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[]
  className?: string
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const reduce = useReducedMotion()

  return (
    <div className={cn('divide-y divide-border/80 border border-border/80 rounded-xl bg-background/40 backdrop-blur', className)}>
      {items.map((item, i) => {
        const isOpen = openIdx === i
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="group w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/40"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-foreground pr-6">{item.q}</span>
              <ChevronDown
                strokeWidth={1.5}
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-300',
                  isOpen && 'rotate-180 text-foreground'
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={reduce ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduce ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
