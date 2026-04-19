'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Smooth blur-morph word cycler.
 *
 * Each word transitions with combined opacity + vertical slide + CSS blur,
 * giving a crisp "gooey" morph without any SVG filter complexity.
 * The invisible ghost of the longest word reserves width so the surrounding
 * text never reflows.
 */
export function GooeyText({
  texts,
  interval = 2600,
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
    <span className={cn('relative inline-block', className)}>
      {/* ghost span reserves the max width — always invisible */}
      <span className="invisible whitespace-nowrap select-none" aria-hidden>
        {longest}
      </span>

      {texts.map((t, i) => (
        <span
          key={t}
          aria-hidden={i !== index}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'inline-block',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1), filter 0.55s cubic-bezier(0.22,1,0.36,1)',
            opacity: i === index ? 1 : 0,
            transform: i === index ? 'translateY(0)' : 'translateY(8px)',
            filter: i === index ? 'blur(0px)' : 'blur(6px)',
            pointerEvents: i === index ? 'auto' : 'none',
          }}
        >
          {t}
        </span>
      ))}

      {/* accessible live region */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {texts[index]}
      </span>
    </span>
  )
}
