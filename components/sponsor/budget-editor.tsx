'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateSponsorBudget } from '@/app/actions/sponsor'
import { cn } from '@/lib/utils'

export function BudgetEditor({ currentCapCents }: { currentCapCents: number }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(
    currentCapCents > 0 ? String(currentCapCents / 100) : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEdit() {
    setValue(currentCapCents > 0 ? String(currentCapCents / 100) : '')
    setError(null)
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
  }

  function handleSave() {
    const dollars = parseFloat(value)
    if (value !== '' && (isNaN(dollars) || dollars < 0)) {
      setError('Enter a valid dollar amount (e.g. 5000)')
      return
    }
    const cents = value === '' ? 0 : Math.round(dollars * 100)
    if (!Number.isInteger(cents)) {
      setError('Maximum two decimal places')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateSponsorBudget(cents)
      if (result?.error) {
        setError(result.error)
      } else {
        setEditing(false)
      }
    })
  }

  const hasNoBudget = currentCapCents === 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Total Budget
        </span>
        {!editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {hasNoBudget ? 'Set budget' : 'Edit'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
              placeholder="e.g. 5000"
              autoFocus
              className={cn(
                'w-full rounded-md border bg-background pl-7 pr-3 py-2 text-sm outline-none',
                'focus:ring-1 focus:ring-primary/50 transition-shadow',
                error ? 'border-destructive' : 'border-border'
              )}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Leave blank or enter 0 to remove the budget cap.
          </p>
        </div>
      ) : (
        <div>
          {hasNoBudget ? (
            <p className="text-2xl font-medium text-muted-foreground/50 italic">Not set</p>
          ) : (
            <p className="text-3xl font-bold">${(currentCapCents / 100).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  )
}
