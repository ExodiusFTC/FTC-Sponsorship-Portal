interface Props {
  mediaUrls: string[]
  youtubeUrl: string | null
  teamName: string
}

function isYouTubeUrl(u: string) {
  try {
    const h = new URL(u).hostname.toLowerCase()
    return h === 'youtu.be' || h.endsWith('youtube.com')
  } catch { return false }
}

export function MediaBlock({ mediaUrls, youtubeUrl, teamName }: Props) {
  const safeYoutube = youtubeUrl && isYouTubeUrl(youtubeUrl) ? youtubeUrl : null
  if (mediaUrls.length === 0 && !safeYoutube) return null

  return (
    <section className="space-y-6">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Media</span>
      {mediaUrls.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mediaUrls.map((url, i) => (
            <div key={i} className="aspect-video overflow-hidden rounded-xl border border-border bg-muted">
              <img
                src={url}
                alt={`${teamName} photo ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
      {safeYoutube && (
        <div className="flex items-center gap-2">
          <a
            href={safeYoutube}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            ▶ Watch on YouTube
          </a>
        </div>
      )}
    </section>
  )
}
