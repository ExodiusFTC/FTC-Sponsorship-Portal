interface Props {
  mechanismName: string | null
  mechanismProblem: string | null
  mechanismSolution: string | null
  autonomousDescription: string | null
}

export function MechanismBlock({ mechanismName, mechanismProblem, mechanismSolution, autonomousDescription }: Props) {
  if (!mechanismName && !autonomousDescription) return null
  return (
    <section className="grid gap-x-12 gap-y-6 md:grid-cols-12">
      <div className="md:col-span-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Engineering</span>
      </div>
      <div className="md:col-span-8 md:col-start-5 space-y-5">
        {mechanismName && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Proudest Mechanism</h3>
            <p className="text-lg font-medium text-foreground">{mechanismName}</p>
            {mechanismProblem && (
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Problem</p>
                <p className="text-sm leading-relaxed text-foreground/80">{mechanismProblem}</p>
              </div>
            )}
            {mechanismSolution && (
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Solution</p>
                <p className="text-sm leading-relaxed text-foreground/80">{mechanismSolution}</p>
              </div>
            )}
          </div>
        )}
        {autonomousDescription && (
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Autonomous</p>
            <p className="text-sm leading-relaxed text-foreground/80">{autonomousDescription}</p>
          </div>
        )}
      </div>
    </section>
  )
}
