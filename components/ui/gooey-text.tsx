'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function GooeyText({
  texts,
  interval = 2400,
  className,
}: {
  texts: string[]
  interval?: number
  className?: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % texts.length), interval)
    return () => clearInterval(id)
  }, [texts.length, interval])

  return (
    <span className={cn('relative inline-block align-baseline', className)}>
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="gooey-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>
      <span
        className="relative inline-block"
        style={{ filter: 'url(#gooey-filter)' }}
      >
        {texts.map((t, i) => (
          <span
            key={t}
            aria-hidden={i !== index}
            className={cn(
              'absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              i === index
                ? 'opacity-100 translate-y-0 blur-0'
                : 'opacity-0 translate-y-4 blur-sm'
            )}
          >
            {t}
          </span>
        ))}
        {/* width reservation */}
        <span className="invisible whitespace-nowrap">
          {texts.reduce((a, b) => (a.length > b.length ? a : b))}
        </span>
      </span>
    </span>
  )
}
