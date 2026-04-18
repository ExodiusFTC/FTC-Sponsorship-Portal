'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Crisp word-morphing component.
 *
 * Blur fix: the original stacked two blur sources — a feGaussianBlur SVG filter
 * on the container AND Tailwind's blur-sm on each word — producing compound
 * blurriness that the feColorMatrix couldn't fully recover. Solution: drop the
 * SVG gooey filter entirely and drive the transition with opacity + translateY
 * only, which gives a clean "slot-machine" morph with zero blur artefacts.
 */
export function GooeyText({
  texts,
  interval = 2400,
  className,
}: {
  texts: readonly string[]
  interval?: number
  className?: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % texts.length), interval)
    return () => clearInterval(id)
  }, [texts.length, interval])

  const longest = [...texts].sort((a, b) => b.length - a.length)[0]

  return (
    <span className={cn('relative inline-block align-baseline', className)}>
      {/* width reserved by the longest word so the line never shifts */}
      <span className="invisible whitespace-nowrap" aria-hidden>{longest}</span>

      {texts.map((t, i) => (
        <span
          key={t}
          aria-hidden={i !== index}
          className={cn(
            'absolute inset-0 whitespace-nowrap transition-all duration-500',
            'ease-[cubic-bezier(0.22,1,0.36,1)]',
            i === index
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          )}
        >
          {t}
        </span>
      ))}

      {/* accessible live region announces word changes to screen readers */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {texts[index]}
      </span>
    </span>
  )
}
