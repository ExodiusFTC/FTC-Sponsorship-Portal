import React from 'react'

interface Tab {
  label: string
  value: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (value: string) => void
}

export function PageHeader({ title, subtitle, action, tabs, activeTab, onTabChange }: PageHeaderProps) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                marginTop: '4px',
                marginBottom: 0,
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
          {tabs.map((tab) => {
            const isActive = tab.value === activeTab
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange?.(tab.value)}
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
      )}

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--border-color)',
          marginTop: '16px',
        }}
      />
    </div>
  )
}
