'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CopyInput({
  value,
  className,
  label,
}: {
  value: string
  className?: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {}
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground transition-colors focus-within:border-border/80 hover:border-border',
        className
      )}
    >
      <input
        aria-label={label ?? 'Copy value'}
        readOnly
        value={value}
        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-accent/80 text-muted-foreground transition-all hover:border-border/80 hover:bg-accent hover:text-foreground active:scale-95"
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
      </button>
    </div>
  )
}
