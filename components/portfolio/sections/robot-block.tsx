import { RichText } from '@/components/ui/rich-text'

interface Props {
  technicalSummary: string | null
  drivetrain: string | null
  buildSystem: string | null
  programming: string | null
  cadSoftware: string | null
  controlSystem: string | null
  githubLink: string | null
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-accent/60 px-2.5 py-0.5 text-xs font-medium text-foreground">
      {label}
    </span>
  )
}

export function RobotBlock({ technicalSummary, drivetrain, buildSystem, programming, cadSoftware, controlSystem, githubLink }: Props) {
  if (!technicalSummary) return null
  const chips = [drivetrain, buildSystem, programming, cadSoftware, controlSystem].filter(Boolean) as string[]

  return (
    <section className="grid gap-x-12 gap-y-6 md:grid-cols-12">
      <div className="md:col-span-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">The Robot</span>
      </div>
      <div className="md:col-span-8 md:col-start-5 space-y-4">
        <RichText html={technicalSummary} className="text-base leading-relaxed text-foreground/80" />
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => <Chip key={c} label={c} />)}
          </div>
        )}
        {githubLink && (
          <a
            href={githubLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            View on GitHub →
          </a>
        )}
      </div>
    </section>
  )
}
