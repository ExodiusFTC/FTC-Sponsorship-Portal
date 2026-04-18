'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  value: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              transition: 'background 100ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
