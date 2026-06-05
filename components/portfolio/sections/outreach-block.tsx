import { RichText } from '@/components/ui/rich-text'

interface Props {
  outreachSummary: string | null
  studentInterestCount: number | null
}

export function OutreachBlock({ outreachSummary, studentInterestCount }: Props) {
  if (!outreachSummary) return null
  return (
    <section className="grid gap-x-12 gap-y-6 md:grid-cols-12">
      <div className="md:col-span-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Community Impact</span>
        {studentInterestCount && studentInterestCount > 0 ? (
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {studentInterestCount.toLocaleString()}
          </p>
        ) : null}
        {studentInterestCount && studentInterestCount > 0 ? (
          <p className="text-xs text-muted-foreground">students reached</p>
        ) : null}
      </div>
      <div className="md:col-span-8 md:col-start-5">
        <RichText html={outreachSummary} className="text-base leading-relaxed text-foreground/80" />
      </div>
    </section>
  )
}
