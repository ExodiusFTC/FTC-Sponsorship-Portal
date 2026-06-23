import { cn } from '@/lib/utils'
import React from 'react'

export function Section({ 
  children, 
  className, 
  id 
}: { 
  children: React.ReactNode
  className?: string
  id?: string 
}) {
  return (
    <section id={id} className={cn("py-20 md:py-32", className)}>
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        {children}
      </div>
    </section>
  )
}

export function SectionHeading({ 
  eyebrow, 
  title, 
  serifWord, 
  description,
  centered = false 
}: { 
  eyebrow?: string
  title: React.ReactNode
  serifWord?: string
  description?: string
  centered?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-4", centered && "items-center text-center mx-auto max-w-3xl")}>
      {eyebrow && (
        <span className="font-mono text-xs font-semibold tracking-wider text-primary uppercase">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-foreground">
        {title} {serifWord && <span className="font-serif italic text-muted-foreground">{serifWord}</span>}
      </h2>
      {description && (
        <p className="text-lg text-muted-foreground max-w-2xl mt-2">
          {description}
        </p>
      )}
    </div>
  )
}
