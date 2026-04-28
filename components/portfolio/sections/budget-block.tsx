interface BudgetItem {
  label: string
  qty: number
  unit_cost_cents: number
  total_cents: number
}

interface Props {
  items: BudgetItem[]
  totalCents: number
}

export function BudgetBlock({ items, totalCents }: Props) {
  if (items.length === 0) return null
  const fmt = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <section className="grid gap-x-12 gap-y-6 md:grid-cols-12">
      <div className="md:col-span-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Budget</span>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{fmt(totalCents)}</p>
        <p className="text-xs text-muted-foreground">total request</p>
      </div>
      <div className="md:col-span-8 md:col-start-5">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-4 bg-card px-4 py-3 text-sm">
              <span className="text-foreground">{item.label}</span>
              <div className="flex items-center gap-4 shrink-0 text-muted-foreground">
                <span className="tabular-nums">{item.qty} × {fmt(item.unit_cost_cents)}</span>
                <span className="font-medium text-foreground tabular-nums w-20 text-right">{fmt(item.total_cents)}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between bg-accent/40 px-4 py-3 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{fmt(totalCents)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
