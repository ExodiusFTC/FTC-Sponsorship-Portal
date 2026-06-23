import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import React from 'react'

export interface StatCardProps {
  icon: LucideIcon
  value: React.ReactNode
  label: string
  description?: string
  progress?: number // 0-100
  className?: string
  iconContainerClassName?: string
}

export function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  description, 
  progress, 
  className,
  iconContainerClassName
}: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary", iconContainerClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      
      <div>
        <p className="text-3xl font-medium tracking-tight text-foreground">{value}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className="h-full bg-primary transition-all" 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
