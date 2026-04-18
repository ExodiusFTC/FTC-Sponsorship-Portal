'use client'

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type FadeUpProps = {
  children: ReactNode
  delay?: number
  y?: number
  duration?: number
  className?: string
  as?: 'div' | 'section' | 'header' | 'article'
} & Omit<HTMLMotionProps<'div'>, 'children'>

export function FadeUp({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  className,
  as = 'div',
  ...rest
}: FadeUpProps) {
  const reduce = useReducedMotion()
  const Tag = motion[as] as typeof motion.div

  return (
    <Tag
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}
