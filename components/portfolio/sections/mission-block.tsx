import { RichText } from '@/components/ui/rich-text'

interface Props {
  missionStatement: string | null
  communityInterestText: string | null
}

export function MissionBlock({ missionStatement, communityInterestText }: Props) {
  if (!missionStatement && !communityInterestText) return null
  return (
    <section className="grid gap-x-12 gap-y-6 md:grid-cols-12">
      <div className="md:col-span-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Mission</span>
      </div>
      <div className="md:col-span-8 md:col-start-5">
        {missionStatement && (
          <RichText html={missionStatement} className="text-xl font-medium leading-relaxed text-foreground" />
        )}
        {communityInterestText && (
          <p className="mt-4 text-base leading-relaxed text-foreground/70">{communityInterestText}</p>
        )}
      </div>
    </section>
  )
}
